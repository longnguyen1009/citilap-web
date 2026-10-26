import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { randomInt, createHash } from 'node:crypto';
import { readdirSync, realpathSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export function resetLocalCatalog(db) {
  const now = new Date().toISOString();
  const history = () => JSON.stringify(db.prepare('SELECT * FROM OrderItem ORDER BY id').all());
  const beforeOrders = history();
  const rows = db.prepare('SELECT p.*,s.draft,s.published,s.revision FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id ORDER BY p.id').all();
  const documents = new Map(rows.map(p => [p.id, JSON.parse(p.published || p.draft || '{}')]));
  const existingIds = new Set(rows.map(p => p.id));
  const keep = new Set(db.prepare('SELECT DISTINCT productId FROM OrderItem UNION SELECT productId FROM PromotionCampaignItem').all().map(p => p.productId));
  assert(keep.size <= 150, 'More than 150 products referenced by orders/campaigns; stop without deleting history.');
  function collect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, val] of Object.entries(value)) {
      if (['productIds', 'manualProductIds', 'relatedProductIds'].includes(key) && Array.isArray(val)) {
        for (const id of val) if (keep.size < 150 && existingIds.has(id)) keep.add(id);
      } else collect(val);
    }
  }
  for (const row of db.prepare('SELECT draft,published FROM LandingPageStudio').all()) {
    collect(JSON.parse(row.published || '{}')); collect(JSON.parse(row.draft || '{}'));
  }
  const groups = new Map();
  for (const p of rows) {
    const d = documents.get(p.id);
    if (d.template && d.template !== 'LAPTOP') continue;
    if (!d.template && !/laptop|macbook|thinkpad|legion/i.test(p.name)) continue;
    const group = d.categoryId || p.categoryId;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(p.id);
  }
  while (keep.size < 150) {
    const previous = keep.size;
    for (const ids of groups.values()) {
      while (ids.length && keep.has(ids[0])) ids.shift();
      if (ids.length && keep.size < 150) keep.add(ids.shift());
    }
    assert(keep.size > previous, 'Not enough laptop products to retain 150.');
  }
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TEMP TABLE catalog150_keep(id TEXT PRIMARY KEY)');
    for (const id of keep) db.prepare('INSERT INTO catalog150_keep VALUES(?)').run(id);
    const removed = 'SELECT id FROM Product WHERE id NOT IN (SELECT id FROM catalog150_keep)';
    db.exec(`DELETE FROM ProductInspection WHERE serialUnitId IN (SELECT id FROM SerialUnit WHERE productId IN (${removed}));
      DELETE FROM ProductStudioRevision WHERE productId IN (${removed});
      DELETE FROM ProductStudio WHERE productId IN (${removed});
      DELETE FROM Product WHERE id NOT IN (SELECT id FROM catalog150_keep);
      DELETE FROM MediaUsage WHERE ownerType IN ('PRODUCT_REVISION','PRODUCT_CONTENT') AND ownerId NOT IN (SELECT id FROM Product);`);
    const warehouse = db.prepare('SELECT id FROM Warehouse ORDER BY id LIMIT 1').get();
    assert(warehouse, 'Warehouse required for real stock availability.');
    let index = 0;
    for (const p of rows.filter(row => keep.has(row.id))) {
      const d = documents.get(p.id);
      const template = /balo|túi|chống sốc/i.test(p.name) ? 'BAG' : 'LAPTOP';
      const slug = p.slug;
      const name = p.name.split(' (')[0].replace(/\b(?:8|16|24|32|64)GB\b/g, '').replace(/\b(?:256|512)GB\b/g, '').replace(/\s{2,}/g, ' ').trim();
      const oldVariants = db.prepare('SELECT * FROM ProductVariant WHERE productId=? ORDER BY id').all(p.id);
      assert(oldVariants.length <= 3, 'Unexpected variant count; preserve existing IDs instead of dropping options.');
      const highestSale = db.prepare('SELECT max(salePrice) price FROM PromotionCampaignItem WHERE productId=?').get(p.id).price || 0;
      const base = randomInt(Math.max(155, Math.min(190, Math.ceil(highestSale / 100000) + 5)), 191) * 100000;
      const specs = new Map((d.specs || []).map(s => [s.key, s.value]));
      const cpu = p.cpu || specs.get('CPU') || 'Intel Core i5';
      const gpu = p.gpu || specs.get('GPU') || 'Intel Iris Xe';
      const display = p.display || specs.get('Màn hình') || '14 inch FHD';
      specs.set('CPU', cpu); specs.set('GPU', gpu); specs.set('RAM', '16GB'); specs.set('SSD', '512GB'); specs.set('Màn hình', display);
      const variants = [[16, 512], [16, 1024], [32, 1024]].map(([ram, storage], j) => ({
        id: oldVariants[j]?.id || `local150-${p.id}-v${j + 1}`,
        sku: oldVariants[j]?.sku || `LOCAL150-${index + 1}-${j + 1}`,
        name: `${ram}GB RAM / ${storage === 1024 ? '1TB' : storage + 'GB'} SSD`,
        condition: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'].includes(p.condition) ? p.condition : 'NEW',
        price: base + j * 500000, originalPrice: null, availability: 'AVAILABLE',
        ram: `${ram}GB`, storage: `${storage}GB`, gpu, options: { ram: `${ram}GB`, storage: `${storage}GB` },
      }));
      if (template === 'BAG') variants.forEach((v, j) => {
        v.name = ['14 inch · Đen', '15.6 inch · Xám', '16 inch · Xanh'][j];
        v.ram = ''; v.storage = ''; v.gpu = '';
        v.options = { size: ['14 inch', '15.6 inch', '16 inch'][j], color: ['Đen', 'Xám', 'Xanh'][j] };
      });
      for (const v of variants) {
        db.prepare(`INSERT INTO ProductVariant(id,productId,sku,name,options,price,originalPrice,stock,status,cpu,gpu,ram,storage,display,updatedAt)
          VALUES(?,?,?,?,?,?,NULL,10,'ACTIVE',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,options=excluded.options,price=excluded.price,originalPrice=NULL,stock=10,status='ACTIVE',cpu=excluded.cpu,gpu=excluded.gpu,ram=excluded.ram,storage=excluded.storage,display=excluded.display,updatedAt=excluded.updatedAt`)
          .run(v.id, p.id, v.sku, v.name, JSON.stringify(v.options), v.price, template === 'BAG' ? null : cpu, v.gpu || null, v.ram || null, v.storage || null, template === 'BAG' ? null : display, now);
        const balance = db.prepare('SELECT * FROM InventoryBalance WHERE variantId=? AND warehouseId=?').get(v.id, warehouse.id);
        const delta = Math.max(0, 10 - ((balance?.onHand || 0) - (balance?.reserved || 0)));
        if (balance) db.prepare('UPDATE InventoryBalance SET onHand=onHand+?,updatedAt=? WHERE id=?').run(delta, now, balance.id);
        else db.prepare('INSERT INTO InventoryBalance(id,warehouseId,productId,variantId,onHand,reserved,updatedAt) VALUES(?,?,?,?,10,0,?)').run(`local150-${v.id}`, warehouse.id, p.id, v.id, now);
        if (delta) db.prepare(`INSERT INTO InventoryTransaction(id,warehouseId,productId,variantId,transactionType,quantityDelta,referenceType,referenceId,reason,balanceBefore,balanceAfter) VALUES(?,?,?,?,'ADJUSTMENT',?,'LOCAL_DEMO',?,'Local sample catalog: 150 products',?,?)`)
          .run(`local150-${v.id}-${Date.now()}`, warehouse.id, p.id, v.id, delta, p.id, balance?.onHand || 0, (balance?.onHand || 0) + delta);
      }
      const description = template === 'BAG' ? 'Dữ liệu mẫu local. Có sẵn 3 lựa chọn kích thước và màu sắc, giá riêng từng lựa chọn.' : `Dữ liệu mẫu local. ${cpu}, ${gpu}. Có sẵn 3 lựa chọn RAM/SSD, giá riêng từng cấu hình.`;
      const categoryId = d.categoryId && db.prepare('SELECT id FROM Category WHERE id=?').get(d.categoryId) ? d.categoryId : p.categoryId;
      const doc = { ...d, schemaVersion: 1, name, slug, categoryId, brand: d.brand || p.brand || '', brandId: d.brandId || p.brandId || null,
        template, condition: variants[0].condition, description, contentHtml: `<p>${description.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`,
        price: base, originalPrice: null, availability: 'AVAILABLE', isFlashSale: false, isFeatured: true, isNewArrival: true, isBestSeller: index % 3 === 0,
        seoTitle: name, seoDescription: description.slice(0, 300), specs: [...specs].map(([key, value]) => ({ key, value })),
        media: (d.media || []).map(m => ({ ...m, variantId: variants.some(v => v.id === m.variantId) ? m.variantId : '' })), variants,
        warranties: d.warranties || [], relatedProductIds: (d.relatedProductIds || []).filter(id => keep.has(id)),
      };
      if (template === 'BAG') doc.specs = [{ key: 'Kích thước', value: '14 / 15.6 / 16 inch' }, { key: 'Màu sắc', value: 'Đen / Xám / Xanh' }];
      let tags;
      try { tags = JSON.parse(p.tags || '[]'); } catch { tags = (p.tags || '').split(','); }
      tags = [...new Set([...(Array.isArray(tags) ? tags : []), 'local150', 'demo'])];
      const document = JSON.stringify(doc), revision = (p.revision || 0) + 1;
      db.prepare('INSERT OR IGNORE INTO ProductStudio(productId,draft,revision) VALUES(?,?,0)').run(p.id, document);
      db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action) VALUES(?,?,?,'local-demo-publish')").run(p.id, revision, document);
      db.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=? WHERE productId=?').run(document, document, revision, revision, now, p.id);
      db.prepare(`UPDATE Product SET name=?,description=?,shortDescription=?,contentHtml=?,categoryId=?,price=?,originalPrice=NULL,status='ACTIVE',deletedAt=NULL,inventoryType='QUANTITY',stock=30,isFlashSale=0,isFeatured=1,isNewArrival=1,isBestSeller=?,cpu=?,gpu=?,ram='16GB',ramGb=16,storage='512GB',storageGb=512,display=?,specs=?,tags=?,updatedAt=? WHERE id=?`)
        .run(name, description, description, doc.contentHtml, categoryId, base, doc.isBestSeller ? 1 : 0, cpu, gpu, display, JSON.stringify(Object.fromEntries(specs)), JSON.stringify(tags), now, p.id);
      if (template === 'BAG') db.prepare("UPDATE Product SET cpu=NULL,gpu=NULL,ram=NULL,ramGb=NULL,storage=NULL,storageGb=NULL,display=NULL,specs=? WHERE id=?").run(JSON.stringify(Object.fromEntries(doc.specs.map(s => [s.key, s.value]))), p.id);
      const first = variants[0];
      for (const item of db.prepare('SELECT * FROM PromotionCampaignItem WHERE productId=?').all(p.id)) {
        const target = variants.find(v => v.id === item.variantId) || first;
        const sale = item.salePrice >= 15000000 && item.salePrice < target.price ? item.salePrice : Math.max(15000000, target.price - 500000);
        db.prepare('UPDATE PromotionCampaignItem SET variantId=?,salePrice=?,regularPrice=?,updatedAt=? WHERE id=?').run(target.id, sale, target.price, now, item.id);
      }
      index++;
    }
    assert.equal(history(), beforeOrders, 'Order history/snapshots changed');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'Foreign key violation');
    const stats = verifyCatalog150(db);
    db.exec('DROP TABLE catalog150_keep; COMMIT');
    return { ...stats, deleted: rows.length - 150, orderHistoryHash: createHash('sha256').update(beforeOrders).digest('hex') };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function verifyCatalog150(db) {
  const products = db.prepare('SELECT count(*) n,min(price) minPrice,max(price) maxPrice FROM Product').get();
  const variants = db.prepare('SELECT count(*) n,min(price) minPrice,max(price) maxPrice FROM ProductVariant').get();
  assert.equal(products.n, 150);
  assert.equal(variants.n, 450);
  assert(products.minPrice >= 15000000 && variants.minPrice >= 15000000 && products.maxPrice <= 20000000 && variants.maxPrice <= 20000000);
  assert.equal(db.prepare("SELECT count(*) n FROM Product WHERE status!='ACTIVE' OR deletedAt IS NOT NULL OR stock<1").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM ProductStudio WHERE published IS NULL OR json_extract(published,'$.availability')!='AVAILABLE' OR json_array_length(published,'$.variants')!=3 OR draft!=published").get().n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM ProductVariant v WHERE (SELECT COALESCE(sum(onHand-reserved),0) FROM InventoryBalance b WHERE b.variantId=v.id)<10').get().n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM (SELECT productId,count(DISTINCT price) n FROM ProductVariant GROUP BY productId HAVING n!=3)').get().n, 0);
  return { products: products.n, variants: variants.n, minPrice: Math.min(products.minPrice, variants.minPrice), maxPrice: Math.max(products.maxPrice, variants.maxPrice) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args[0] === '--local' && args.length <= 2 && (!args[1] || args[1] === '--preview'), 'Usage: node scripts/reset-local-catalog-150.mjs --local [--preview]; no remote mode');
  const root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const candidates = readdirSync(root).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite').filter(f => {
    const db = new DatabaseSync(resolve(root, f), { readOnly: true });
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE name='ProductInspection'").get(); } finally { db.close(); }
  });
  assert.equal(candidates.length, 1, 'Ambiguous local catalog');
  const path = realpathSync(resolve(root, candidates[0])), rel = relative(root, path);
  assert(!rel.startsWith('..') && !isAbsolute(rel), 'Path escapes local state');
  mkdirSync('.wrangler/backups', { recursive: true });
  const original = new DatabaseSync(path);
  let target = original;
  try {
    const destination = resolve('.wrangler/backups', `${args[1] ? 'preview' : 'before'}-catalog150-${Date.now()}.sqlite`);
    await backup(original, destination);
    console.log(args[1] ? 'Preview copy:' : 'Backup:', destination);
    if (args[1]) target = new DatabaseSync(destination);
    console.log(resetLocalCatalog(target));
  } finally { if (target !== original) target.close(); original.close(); }
}
