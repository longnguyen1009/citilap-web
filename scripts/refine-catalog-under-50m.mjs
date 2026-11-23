// Refine catalog:
// 1. Delete all products & variants priced > 50,000,000 VND + clean up all references & unused images (D1 + R2)
// 2. Rename all products to "[New 100%] Model | CPU | RAM | SSD | GPU | Screen Color" (or "[LikeNew] ...")
// 3. Simplify variant option names to clean config pairs (e.g. "16GB / 512GB", "64GB / 2TB")
// 4. Simplify warranty names ("Bảo hành 6 tháng" / "Bảo hành mở rộng 12 tháng" for New, "Bảo hành 3 tháng" / "Bảo hành mở rộng 6 tháng" for LikeNew)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const MAX_PRICE = 50_000_000;
const CRAWL_DIR = '.wrangler/laptopnew-crawl';

function decodeEntities(str) {
  return String(str || '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractColorFromHtml(html) {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html || '')) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]));
    if (cells.length >= 2 && /^(?:màu\s*sắc|màu|color)$/i.test(cells[0].replace(/:$/, '').trim())) {
      const raw = cells.slice(1).join(' ').trim();
      if (!raw || /^(?:cập nhật|đang cập nhật|none|n\/a|-|—)$/i.test(raw)) return '';
      return cleanColor(raw);
    }
  }
  return '';
}

function cleanColor(raw) {
  let c = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  // Strip leading "Màu "
  c = c.replace(/^Màu\s+/i, '').trim();
  // If format is "Xám (Grey)" or "Đen (Black)" -> extract English name in parentheses if clean
  const paren = c.match(/\(([A-Za-z][A-Za-z0-9\s-]{2,28})\)/);
  if (paren) return paren[1].trim();
  // If format is "Xám Mecha Gray" or "Trắng Glacier White" -> keep English marketing color
  const vnPrefixEn = c.match(/^(?:Xám|Đen|Trắng|Bạc|Xanh(?:\s+dương|\s+đen|\s+lá)?|Vàng|Hồng|Đỏ|Nâu)\s+([A-Z][A-Za-z0-9\s-]{2,28})$/);
  if (vnPrefixEn) return vnPrefixEn[1].trim();
  // Map simple Vietnamese color names cleanly
  const simpleMap = {
    'xám': 'Grey', 'đen': 'Black', 'trắng': 'White', 'bạc': 'Silver',
    'xanh': 'Blue', 'xanh dương': 'Blue', 'xanh đen': 'Dark Blue', 'vàng': 'Gold', 'hồng': 'Pink',
  };
  if (simpleMap[c.toLowerCase()]) return simpleMap[c.toLowerCase()];
  // Keep short clean color string (max 24 chars)
  return c.split(/[,/;]/)[0].trim().slice(0, 24);
}

function shortCpu(raw) {
  let c = String(raw || '').trim();
  if (!c || /^(?:none|n\/a|-|—)$/i.test(c)) return '';
  c = c
    .replace(/^CPU\s+/i, '')
    .replace(/\s*tốc\s*độ.*$/i, '')
    .replace(/Intel®?\s*Core™?\s*/i, '')
    .replace(/AMD\s*Ryzen™?\s*/i, 'R')
    .replace(/^R\s*(?:AI\s*)?([3579])\s+/i, (_, num) => (/\bAI\b/i.test(c) ? `Ryzen AI ${num} ` : `R${num}-`))
    .replace(/\bRyzen\s+AI\s+([3579])\s+AI\b/i, 'Ryzen AI $1')
    .replace(/\b(Ryzen\s+AI\s+[3579]\s+\S+)\s+AI\b/i, '$1')
    .replace(/^Ryzen\s+([3579])\s+/i, 'R$1-')
    .replace(/^R([3579])-/i, 'R$1-')
    .replace(/Apple\s+/i, '')
    .replace(/\s*\d+-core.*$/i, '')
    .replace(/\s*Gen\s*\d+\w*/i, '')
    .replace(/\s*Processor.*$/i, '')
    .replace(/--+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  // Ensure Intel Core 5/7 without Ultra/i keeps "Core 5-..."
  if (/^[3579]-\d/i.test(c)) c = `Core ${c}`;
  return c.slice(0, 28);
}

function shortRam(raw) {
  const m = String(raw || '').match(/(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : '';
}

function shortSsd(raw) {
  const m = String(raw || '').match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);
  if (!m) return '';
  const unit = m[2].toUpperCase();
  const num = Number(m[1]);
  if (unit === 'GB' && num === 1024) return '1TB';
  if (unit === 'GB' && num === 2048) return '2TB';
  return `${m[1]}${unit}`;
}

function shortDiscreteGpu(raw) {
  const g = String(raw || '').trim();
  if (!g || /onboard|iris|uhd|integrated|tích hợp|none|apple|radeon\s*graphics|intel\s*graphics|intel\s*arc|adreno|mali/i.test(g)) return '';
  const rtx = g.match(/\b(RTX\s*(?:[A-Z]?\d{3,4}(?:\s*(?:Ti|Super|Ada))?))/i);
  if (rtx) return rtx[1].replace(/\s+/g, ' ').toUpperCase().replace(/\bADA\b/g, 'Ada').replace(/\bTI\b/g, 'Ti').replace(/\bSUPER\b/g, 'Super');
  const gtx = g.match(/\b(GTX\s*\d{3,4}(?:\s*Ti)?)/i);
  if (gtx) return gtx[1].replace(/\s+/g, ' ').toUpperCase();
  const rx = g.match(/\b(RX\s*\d{3,4}[A-Z]*)/i);
  if (rx) return rx[1].replace(/\s+/g, ' ').toUpperCase();
  const quadro = g.match(/\b(Quadro\s*[A-Z0-9]+)/i);
  if (quadro) return quadro[1];
  return '';
}

function shortScreen(displayRaw, hzRaw) {
  const d = String(displayRaw || '').trim();
  const combined = `${d} ${hzRaw || ''}`;
  let res = '';
  if (/\b4K\b|UHD|WQUXGA|3840/i.test(d)) res = '4K';
  else if (/\b3\.2K\b/i.test(d)) res = '3.2K';
  else if (/\b3K\b/i.test(d)) res = '3K';
  else if (/\b2\.8K\b|2880/i.test(d)) res = '2.8K';
  else if (/\b2\.5K\b|WQXGA|2560/i.test(d)) res = '2.5K';
  else if (/QHD\+/i.test(d)) res = 'QHD+';
  else if (/\bQHD\b|\b2K\b/i.test(d)) res = '2K';
  else if (/Liquid\s*Retina\s*XDR/i.test(d)) res = 'Retina XDR';
  else if (/Liquid\s*Retina|Retina/i.test(d)) res = 'Retina';
  else if (/WUXGA|FHD\+|1920\s*[*x]\s*1200/i.test(d)) res = 'FHD+';
  else if (/FHD|1920\s*[*x]\s*1080/i.test(d)) res = 'FHD';
  else if (/\bHD\b/i.test(d)) res = 'HD';
  else res = 'FHD';

  const isOled = /\bOLED\b/i.test(d);
  const hzMatch = combined.match(/\b(90|120|144|165|180|240|300|360)\s*Hz/i);
  const hz = hzMatch ? `${hzMatch[1]}Hz` : '';

  return [res, isOled ? 'OLED' : '', hz].filter(Boolean).join(' ');
}

function cleanBaseModelName(currentName) {
  return String(currentName || '')
    .replace(/^\[(?:New\s*100%|LikeNew|Like\s*New)\]\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/^Laptop\s+(?:Gaming\s+|Workstation\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFormattedLaptopName({ conditionTag, baseModel, cpu, ram, ssd, gpu, screen, color }) {
  const screenWithColor = [screen, color].filter(Boolean).join(' ');
  const segments = [
    `${conditionTag} ${baseModel}`,
    cpu,
    ram,
    ssd,
    gpu,
    screenWithColor,
  ].filter(Boolean);
  return segments.join(' | ').slice(0, 160);
}

function cleanVariantOptionName(v, specObj, isAccessory) {
  if (isAccessory) {
    return String(v.name || 'Chính hãng').replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  const ram = shortRam(v.ram || v.name || specObj.RAM) || '16GB';
  const ssd = shortSsd(v.storage || v.name || specObj.SSD) || '512GB';
  const colorMatch = String(v.name || '').match(/·\s*(.+)$/);
  const suffix = colorMatch ? ` · ${colorMatch[1].trim()}` : '';
  return `${ram} / ${ssd}${suffix}`.slice(0, 60);
}

function buildWarranties(condition, isAccessory) {
  if (condition === 'LIKE_NEW') {
    return [
      { name: 'Bảo hành 3 tháng', description: '', adjustment: 0, recommended: true, type: 'SHOP', months: 3 },
      { name: 'Bảo hành mở rộng 6 tháng', description: '', adjustment: 300000, recommended: false, type: 'SHOP', months: 6 },
    ];
  }
  return [
    { name: 'Bảo hành 6 tháng', description: '', adjustment: 0, recommended: true, type: 'SHOP', months: 6 },
    { name: 'Bảo hành mở rộng 12 tháng', description: '', adjustment: isAccessory ? 100000 : 500000, recommended: false, type: 'SHOP', months: 12 },
  ];
}

// ---------------------------------------------------------------------------
// Main Execution
// ---------------------------------------------------------------------------
const d1Root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates = readdirSync(d1Root)
  .filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
  .filter((f) => {
    const t = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
    try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='ProductStudio'").get(); } finally { t.close(); }
  });
assert.equal(candidates.length, 1, 'Expected exactly 1 local ProductStudio database');

const dbPath = resolve(d1Root, candidates[0]);
mkdirSync('.wrangler/backups', { recursive: true });
const db = new DatabaseSync(dbPath);
const backupPath = resolve('.wrangler/backups', `before-refine-50m-${Date.now()}.sqlite`);
await backup(db, backupPath);
console.log('Backup created:', backupPath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');

const rawAll = JSON.parse(readFileSync(`${CRAWL_DIR}/products-all.json`, 'utf8'));
const rawByAlias = new Map(rawAll.map((p) => [p.alias.replace(/^copy-of-/i, ''), p]));
const prep = JSON.parse(readFileSync(`${CRAWL_DIR}/citilap-prepared.json`, 'utf8'));
const prepBySlug = new Map(prep.products.map((p) => [p.slug, p]));

const token = randomUUID();
const mf = new Miniflare({
  ...convertV4MiniflareOptions({
    host: '127.0.0.1',
    modules: true,
    bindings: { IMPORT_TOKEN: token },
    script: String.raw`export default {async fetch(r,e){
      if(r.headers.get('Authorization') !== 'Bearer '+e.IMPORT_TOKEN) return new Response(null,{status:403});
      const key=new URL(r.url).searchParams.get('key');
      if(!key) return new Response(null,{status:400});
      if(r.method==='DELETE'){await e.PRODUCT_MEDIA.delete(key);return new Response(null,{status:204});}
      return new Response(null,{status:405});
    }}`,
    compatibilityDate: '2026-10-01',
    r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' },
  }),
  resourcePersistencePath: resolve('.wrangler/state/v3'),
});

const r2Del = async (key) => {
  await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  }).catch(() => {});
};

try {
  const allProducts = db.prepare(`
    SELECT p.id, p.slug, p.name, p.price, p.categoryId, s.draft, s.published, s.revision
    FROM Product p JOIN ProductStudio s ON s.productId=p.id
    WHERE p.deletedAt IS NULL
  `).all();

  const toDeleteProductIds = new Set();
  const keptProducts = [];

  for (const row of allProducts) {
    const doc = JSON.parse(row.published || row.draft);
    const validVariants = (doc.variants || []).filter((v) => Number(v.price) > 0 && Number(v.price) <= MAX_PRICE);
    if (validVariants.length === 0 || Number(row.price) > MAX_PRICE) {
      toDeleteProductIds.add(row.id);
    } else {
      keptProducts.push({ row, doc, validVariants });
    }
  }

  console.log(`Products to delete (> 50M): ${toDeleteProductIds.size}, remaining: ${keptProducts.length}`);

  const categories = db.prepare('SELECT id, parentId, slug, name FROM Category').all();
  const catById = new Map(categories.map((c) => [c.id, c]));
  const getRootCatId = (catId) => {
    let cur = catById.get(catId);
    while (cur?.parentId) cur = catById.get(cur.parentId);
    return cur?.id || catId;
  };

  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Delete all products > 50M and their dependent rows
    for (const pid of toDeleteProductIds) {
      db.prepare('DELETE FROM PromotionCampaignItem WHERE productId=?').run(pid);
      db.prepare('DELETE FROM InventoryReservation WHERE productId=?').run(pid);
      db.prepare('DELETE FROM InventoryTransaction WHERE productId=?').run(pid);
      db.prepare('DELETE FROM InventoryBalance WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductInspection WHERE serialUnitId IN (SELECT id FROM SerialUnit WHERE productId=?)').run(pid);
      db.prepare('DELETE FROM SerialUnit WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductEditLog WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductVersion WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductStudioRevision WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductStudio WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductImage WHERE productId=?').run(pid);
      db.prepare('DELETE FROM ProductVariant WHERE productId=?').run(pid);
      db.prepare("DELETE FROM MediaUsage WHERE ownerType IN ('PRODUCT','PRODUCT_REVISION','PRODUCT_CONTENT') AND ownerId=?").run(pid);
      db.prepare('DELETE FROM Product WHERE id=?').run(pid);
    }

    // 2. Rename, refine variants, set condition & simplified warranties for all kept products
    const catPrimaryAsset = new Map();
    const keptMeta = [];
    let likeNewCount = 0;

    for (const { row, doc, validVariants } of keptProducts) {
      const isAccessory = doc.template !== 'LAPTOP';
      const raw = rawByAlias.get(row.slug) || rawByAlias.get(doc.slug);
      const prepEntry = prepBySlug.get(row.slug) || prepBySlug.get(doc.slug);
      const vTitles = (raw?.variants || []).map((v) => v.title || '');
      const hasOpenbox = vTitles.some((t) => /openbox|likenew|like new/i.test(t));
      const hasNewseal = vTitles.some((t) => /newseal|new\s*100/i.test(t));
      const condition = !isAccessory && hasOpenbox && !hasNewseal ? 'LIKE_NEW' : 'NEW';
      if (condition === 'LIKE_NEW') likeNewCount++;
      const conditionTag = condition === 'LIKE_NEW' ? '[LikeNew]' : '[New 100%]';

      const specObj = Object.fromEntries((doc.specs || []).map((s) => [s.key, s.value]));
      const color = !isAccessory ? extractColorFromHtml(raw?.content || prepEntry?.rawContent || '') : '';

      const baseModel = cleanBaseModelName(doc.name);
      const newName = isAccessory
        ? `${conditionTag} ${baseModel}`.slice(0, 160)
        : buildFormattedLaptopName({
            conditionTag,
            baseModel,
            cpu: shortCpu(specObj.CPU),
            ram: shortRam(validVariants[0]?.ram || specObj.RAM),
            ssd: shortSsd(validVariants[0]?.storage || specObj.SSD),
            gpu: shortDiscreteGpu(specObj.GPU),
            screen: shortScreen(specObj['Màn hình'], specObj['Tần số quét']),
            color,
          });

      // Remove any variants > 50M from DB for this product
      const keepVarIds = new Set(validVariants.map((v) => v.id));
      for (const oldV of db.prepare('SELECT id FROM ProductVariant WHERE productId=?').all(row.id)) {
        if (!keepVarIds.has(oldV.id)) {
          db.prepare('DELETE FROM PromotionCampaignItem WHERE variantId=?').run(oldV.id);
          db.prepare('DELETE FROM InventoryReservation WHERE variantId=?').run(oldV.id);
          db.prepare('DELETE FROM InventoryTransaction WHERE variantId=?').run(oldV.id);
          db.prepare('DELETE FROM InventoryBalance WHERE variantId=?').run(oldV.id);
          db.prepare('DELETE FROM ProductVariant WHERE id=?').run(oldV.id);
        }
      }

      // Deduplicate & clean variant names
      const usedOptNames = new Set();
      const updatedVariants = validVariants.map((v, idx) => {
        let optName = cleanVariantOptionName(v, specObj, isAccessory);
        if (usedOptNames.has(optName.toLowerCase())) optName = `${optName} #${idx + 1}`;
        usedOptNames.add(optName.toLowerCase());
        return {
          ...v,
          name: optName,
          condition,
          options: { 'Cấu hình': optName },
        };
      });

      const minPrice = Math.min(...updatedVariants.map((v) => Number(v.price)));
      const origPrice = updatedVariants.find((v) => Number(v.price) === minPrice)?.originalPrice ?? null;
      const warranties = buildWarranties(condition, isAccessory);
      const warrantyMonths = condition === 'LIKE_NEW' ? 3 : 6;

      const nextDoc = {
        ...doc,
        name: newName,
        condition,
        warrantyMonths,
        price: minPrice,
        originalPrice: origPrice,
        seoTitle: `${newName} | CitiLap.vn`.slice(0, 120),
        variants: updatedVariants,
        warranties,
      };
      const json = JSON.stringify(nextDoc);
      const nextRev = row.revision + 1;

      db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action,actor) VALUES(?,?,?,'publish','refine-50m')").run(row.id, nextRev, json);
      db.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').run(json, json, nextRev, nextRev, row.id);
      db.prepare('UPDATE Product SET name=?,condition=?,price=?,originalPrice=?,seoTitle=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?')
        .run(newName, condition, minPrice, origPrice, nextDoc.seoTitle, row.id);

      for (const v of updatedVariants) {
        db.prepare('UPDATE ProductVariant SET name=?,options=?,price=?,originalPrice=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?')
          .run(v.name, JSON.stringify(v.options), v.price, v.originalPrice ?? null, v.id);
      }

      const primaryAssetId = doc.media?.[0]?.assetId || null;
      if (primaryAssetId && !catPrimaryAsset.has(doc.categoryId)) {
        catPrimaryAsset.set(doc.categoryId, primaryAssetId);
      }
      keptMeta.push({ id: row.id, slug: row.slug, name: newName, categoryId: doc.categoryId, template: doc.template, variants: updatedVariants, primaryAssetId, isNewArrival: doc.isNewArrival, isBestSeller: doc.isBestSeller, isFeatured: doc.isFeatured });
    }

    const activeAssetSet = new Set(
      db.prepare("SELECT DISTINCT assetId FROM MediaUsage WHERE ownerType IN ('PRODUCT','PRODUCT_REVISION','PRODUCT_CONTENT')").all().map((r) => r.assetId)
    );
    const fallbackAssetId = keptMeta.find((p) => p.primaryAssetId)?.primaryAssetId || '';

    // 3. Re-balance PromotionCampaignItem if any >50M products were removed
    const campaigns = [
      { id: 'camp_flashsale_daily', targetCount: 10, discount: 0.95, prefix: 'citem_fs_' },
      { id: 'camp_hotsale_weekend', targetCount: 12, discount: 0.92, prefix: 'citem_wk_' },
    ];
    const usedCampProductIds = new Set(
      db.prepare('SELECT productId FROM PromotionCampaignItem').all().map((r) => r.productId)
    );
    for (const camp of campaigns) {
      if (!db.prepare('SELECT 1 FROM PromotionCampaign WHERE id=?').get(camp.id)) continue;
      let curCount = db.prepare('SELECT count(*) n FROM PromotionCampaignItem WHERE campaignId=?').get(camp.id).n;
      for (const p of keptMeta) {
        if (curCount >= camp.targetCount) break;
        if (usedCampProductIds.has(p.id)) continue;
        const v = p.variants[0];
        if (!v) continue;
        const salePrice = Math.max(10000, Math.round((v.price * camp.discount) / 1000) * 1000);
        db.prepare('INSERT INTO PromotionCampaignItem(id,campaignId,productId,variantId,salePrice,regularPrice,soldCount,createdAt,updatedAt) VALUES(?,?,?,?,?,?,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
          .run(`${camp.prefix}${p.id}`.slice(0, 64), camp.id, p.id, v.id, salePrice, v.price);
        usedCampProductIds.add(p.id);
        curCount++;
      }
    }

    // 4. Update NavigationStudio & Category images if any pointed to a deleted >50M product's image
    const navRow = db.prepare("SELECT draft, published, revision FROM NavigationStudio WHERE id='site'").get();
    if (navRow?.published) {
      const navDoc = JSON.parse(navRow.published);
      const findDescAsset = (catId, seen = new Set()) => {
        if (seen.has(catId)) return null;
        seen.add(catId);
        if (catPrimaryAsset.has(catId)) return catPrimaryAsset.get(catId);
        for (const ch of categories) {
          if (ch.parentId === catId) {
            const f = findDescAsset(ch.id, seen);
            if (f) return f;
          }
        }
        return null;
      };
      const resolveCatAsset = (c) => {
        if (c.assetId && activeAssetSet.has(c.assetId)) return c.assetId;
        const desc = findDescAsset(c.id);
        if (desc) return desc;
        let pid = c.parentId;
        while (pid) {
          const p = findDescAsset(pid);
          if (p) return p;
          pid = catById.get(pid)?.parentId || null;
        }
        return fallbackAssetId;
      };
      let navChanged = false;
      for (const c of navDoc.categories || []) {
        if (!c.visible) continue;
        const nextAsset = resolveCatAsset(c);
        if (nextAsset && nextAsset !== c.assetId) {
          c.assetId = nextAsset;
          c.image = `/api/library/${nextAsset}`;
          db.prepare('UPDATE Category SET image=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?').run(c.image, c.id);
          navChanged = true;
        }
      }
      if (navChanged) {
        const nextNavRev = navRow.revision + 1;
        const navJson = JSON.stringify(navDoc);
        db.prepare("INSERT INTO NavigationRevision(revision,document,action,actor) VALUES(?,?,'publish','refine-50m')").run(nextNavRev, navJson);
        db.prepare("UPDATE NavigationStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE id='site'").run(navJson, navJson, nextNavRev, nextNavRev);
        db.prepare("DELETE FROM MediaUsage WHERE ownerType='NAVIGATION_REVISION'").run();
        for (const aid of new Set((navDoc.categories || []).map((c) => c.assetId).filter(Boolean))) {
          db.prepare("INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'NAVIGATION_REVISION','site',?)")
            .run(randomUUID(), aid, `${nextNavRev}:${aid}`);
        }
      }
    }

    // 5. Update LandingPageStudio manualProductIds / tabs[].productIds
    const keptIdSet = new Set(keptMeta.map((p) => p.id));
    const lpRow = db.prepare('SELECT pageId, revision, published FROM LandingPageStudio LIMIT 1').get();
    if (lpRow?.published) {
      const lpDoc = JSON.parse(lpRow.published);
      const byRoot = (rootId) => keptMeta.filter((p) => getRootCatId(p.categoryId) === rootId).map((p) => p.id);
      const campaignPids = db.prepare('SELECT DISTINCT productId FROM PromotionCampaignItem').all().map((r) => r.productId);
      const refill = (arr, pool, count = 12) => {
        const clean = (arr || []).filter((id) => keptIdSet.has(id));
        for (const id of pool) {
          if (clean.length >= count) break;
          if (!clean.includes(id)) clean.push(id);
        }
        return clean.slice(0, count);
      };
      for (const sec of lpDoc.sections || []) {
        if (sec.id === 'sec-hot-sale' && sec.data) sec.data.manualProductIds = campaignPids;
        else if (sec.id === 'sec-gaming' && sec.data) sec.data.manualProductIds = refill(sec.data.manualProductIds, byRoot('cat-gaming'));
        else if (sec.id === 'sec-office' && sec.data) sec.data.manualProductIds = refill(sec.data.manualProductIds, byRoot('cat-van-phong'));
        else if (sec.id === 'sec-workstation' && sec.data) sec.data.manualProductIds = refill(sec.data.manualProductIds, byRoot('cat-do-hoa'));
        else if (sec.id === 'sec-macbook' && sec.data) sec.data.manualProductIds = refill(sec.data.manualProductIds, byRoot('cat-macbook'));
        else if (sec.id === 'sec-accessories' && sec.data) sec.data.manualProductIds = refill(sec.data.manualProductIds, keptMeta.filter((p) => p.template !== 'LAPTOP').map((p) => p.id));
        else if (sec.id === 'sec-discover' && sec.data?.tabs) {
          const pools = [
            keptMeta.filter((p) => p.isNewArrival && p.template === 'LAPTOP').map((p) => p.id),
            keptMeta.filter((p) => p.isBestSeller && p.template === 'LAPTOP').map((p) => p.id),
            keptMeta.filter((p) => p.isFeatured && p.template === 'LAPTOP').map((p) => p.id),
          ];
          sec.data.tabs.forEach((tab, idx) => { tab.productIds = refill(tab.productIds, pools[idx] || byRoot('cat-gaming')); });
        }
        // Also fix category customImage if it pointed to a deleted asset
        if (Array.isArray(sec.data?.items)) {
          for (const item of sec.data.items) {
            const m = String(item.customImage || '').match(/\/api\/library\/([a-f0-9-]{36})/i);
            if (m && !activeAssetSet.has(m[1])) {
              const catRow = db.prepare('SELECT image FROM Category WHERE id=?').get(item.categoryId);
              if (catRow?.image) item.customImage = catRow.image;
            }
          }
        }
      }
      const nextLpRev = lpRow.revision + 1;
      const lpJson = JSON.stringify(lpDoc);
      db.prepare("INSERT INTO LandingPageRevision(pageId,revision,document,action,actor) VALUES(?,?,?,'publish','refine-50m')").run(lpRow.pageId, nextLpRev, lpJson);
      db.prepare('UPDATE LandingPageStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE pageId=?').run(lpJson, lpJson, nextLpRev, nextLpRev, lpRow.pageId);
    }

    // 6. Update PostStudio relatedProductIds & coverImage if pointing to deleted >50M product/asset
    const posts = db.prepare('SELECT p.id, s.draft, s.published, s.revision FROM Post p JOIN PostStudio s ON s.postId=p.id WHERE p.deletedAt IS NULL').all();
    let updatedPosts = 0;
    for (const [idx, post] of posts.entries()) {
      const doc = JSON.parse(post.published || post.draft);
      let changed = false;
      if (Array.isArray(doc.relatedProductIds)) {
        const filtered = doc.relatedProductIds.filter((id) => keptIdSet.has(id));
        if (filtered.length !== doc.relatedProductIds.length) {
          doc.relatedProductIds = filtered.length ? filtered : keptMeta.slice(idx % Math.max(1, keptMeta.length - 3), (idx % Math.max(1, keptMeta.length - 3)) + 3).map((p) => p.id);
          changed = true;
        }
      }
      const coverId = doc.coverImage?.assetId;
      if (coverId && !activeAssetSet.has(coverId)) {
        // Check if this coverId was only used by deleted products (folder='products')
        const assetRow = db.prepare('SELECT folder FROM MediaAsset WHERE id=?').get(coverId);
        if (assetRow?.folder === 'products') {
          const replacement = keptMeta[idx % keptMeta.length]?.primaryAssetId || fallbackAssetId;
          if (replacement) {
            doc.coverImage = { ...doc.coverImage, assetId: replacement };
            if (doc.seo) doc.seo.ogImageAssetId = replacement;
            db.prepare("DELETE FROM MediaUsage WHERE ownerType='POST_REVISION' AND ownerId=?").run(post.id);
            db.prepare("INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'POST_REVISION',?,?)")
              .run(randomUUID(), replacement, post.id, `${post.revision + 1}:${replacement}`);
            changed = true;
          }
        }
      }
      if (changed) {
        const nextRev = post.revision + 1;
        const json = JSON.stringify(doc);
        db.prepare("INSERT INTO PostStudioRevision(postId,revision,document,action,actor) VALUES(?,?,?,'publish','refine-50m')").run(post.id, nextRev, json);
        db.prepare('UPDATE PostStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE postId=?').run(json, json, nextRev, nextRev, post.id);
        updatedPosts++;
      }
    }

    // 7. Clear Search cache & bump revision
    db.exec('DELETE FROM SearchResultItem; DELETE FROM SearchResultSet; UPDATE SearchCatalogRevision SET revision = revision + 1 WHERE id = 1;');
    db.exec('COMMIT');
    console.log(`Refined ${keptMeta.length} products (${likeNewCount} LikeNew, ${keptMeta.length - likeNewCount} New 100%), updated ${updatedPosts} posts`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  // 8. Delete ALL unused images from D1 + R2
  const unused = db.prepare("SELECT id, storageKey, size FROM MediaAsset WHERE kind='IMAGE' AND id NOT IN (SELECT assetId FROM MediaUsage)").all();
  let deletedImgs = 0, freedBytes = 0;
  for (const a of unused) {
    try {
      db.prepare('DELETE FROM MediaAsset WHERE id=?').run(a.id);
      if (a.storageKey) await r2Del(a.storageKey);
      await r2Del(`library/${a.id}_thumb-v2.webp`);
      deletedImgs++;
      freedBytes += a.size || 0;
    } catch (err) {
      console.warn('Keep asset', a.id, String(err));
    }
  }
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'Foreign key violation');
  console.log(`Deleted ${deletedImgs} unused images (${(freedBytes / 1048576).toFixed(2)} MB freed)`);
  console.log('Sample renamed laptops:');
  for (const s of db.prepare("SELECT name, price, condition FROM Product WHERE deletedAt IS NULL AND price >= 10000000 ORDER BY condition DESC, price DESC LIMIT 12").all()) {
    console.log(' -', s.condition, s.price.toLocaleString('vi-VN'), s.name);
  }
  console.log('Remaining stats:', {
    products: db.prepare('SELECT count(*) n FROM Product WHERE deletedAt IS NULL').get().n,
    maxPrice: db.prepare('SELECT max(price) m FROM Product WHERE deletedAt IS NULL').get().m,
    variants: db.prepare('SELECT count(*) n FROM ProductVariant').get().n,
    media: db.prepare('SELECT count(*) n FROM MediaAsset').get().n,
    unusedMedia: db.prepare('SELECT count(*) n FROM MediaAsset WHERE id NOT IN (SELECT assetId FROM MediaUsage)').get().n,
  });
} finally {
  await mf.dispose();
  db.close();
}
