import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const root = '.wrangler/competitor-research';
const origin = 'https://thegioiso365.vn';
const mode = process.argv[2];
assert(['--download', '--local', '--check'].includes(mode), 'Use --download, --local or --check; no remote database mode');
mkdirSync(root + '/images', { recursive: true });
const decode = s => String(s).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n))).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&ndash;/g, '-').replace(/&hellip;/g, '...');
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function sourceUrl(value, image = false) {
  const u = new URL(value);
  assert(u.origin === origin && !u.username && !u.password && (!image || u.pathname.startsWith('/wp-content/uploads/')), 'Unexpected source URL');
  return u.href;
}
async function download(url) {
  const r = await fetch(sourceUrl(url), { redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert(r.ok, `HTTP ${r.status}: ${url}`);
  const body = Buffer.from(await r.arrayBuffer());
  assert(body.length <= 25 * 1024 * 1024, 'Response too large');
  return body;
}
if (mode === '--download') {
  for (let page = 1; page <= 20; page++) {
    const path = `${root}/products-${page}.json`;
    if (!existsSync(path)) writeFileSync(path, await download(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`));
  }
}
const source = Array.from({ length: 20 }, (_, i) => JSON.parse(readFileSync(`${root}/products-${i + 1}.json`, 'utf8'))).flat();
assert.equal(new Set(source.map(p => p.id)).size, source.length, 'Duplicate source IDs; refresh snapshot before import');
const accessoryGroups = [
  ['mouse-keyboard', 'Chuột & Bàn phím', /chuot|ban-phim/],
  ['bag', 'Balo & Túi chống sốc', /balo|ba-lo|tui/],
  ['charger', 'Sạc & Cáp sạc', /sac|cap-sac/],
  ['hub', 'Hub chuyển đổi Type-C', /hub|chuyen-doi/],
  ['stand', 'Đế tản nhiệt & Giá đỡ', /tan-nhiet|gia-do/],
  ['screenbar', 'Đèn màn hình & Desk Setup', /den-man-hinh|screenbar/],
  ['audio', 'Tai nghe & Âm thanh', /tai-nghe|loa/],
  ['hardware', 'Nâng cấp RAM & SSD', /ram|ssd|o-cung/],
];
function category(p) {
  const slugs = p.categories.map(c => c.slug);
  if (slugs.some(s => /macbook/.test(s))) return 'cat-macbook';
  if (slugs.includes('laptop-gaming')) return 'cat-gaming';
  if (slugs.includes('laptop-do-hoa') || slugs.includes('may-tram-workstation')) return 'cat-do-hoa';
  if (slugs.includes('laptop-van-phong')) return 'cat-van-phong';
  if (slugs.some(s => /^(laptop|.*-like-new)/.test(s))) return slugs.includes('laptop-like-new') ? 'cat-like-new' : 'cat-van-phong';
  if (slugs.includes('linh-kien-phu-kien')) {
    const group = accessoryGroups.find(([, , re]) => re.test(p.slug));
    return group ? 'ref-accessory-' + group[0] : 'cat-phu-kien';
  }
  return null;
}
const selected = source.filter(p => category(p));
const manifestPath = root + '/manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { capturedAt: new Date().toISOString(), source: origin, sourceCount: source.length, products: {} };
if (mode === '--download') {
  let done = 0;
  // ponytail: cache one cover per product; all gallery URLs retained for a later full-media import.
  for (let i = 0; i < selected.length; i += 3) {
    const outcomes = await Promise.allSettled(selected.slice(i, i + 3).map(async p => {
      sourceUrl(p.permalink);
      const images = p.images.map(im => sourceUrl(im.src, true));
      const record = manifest.products[p.id] ||= { sourceUrl: p.permalink, categories: p.categories, imageUrls: images, rights: 'REVIEW_REQUIRED', referencePrice: p.prices, sourceStock: p.is_in_stock };
      if (images.length && !record.coverFile) {
        const body = await download(images[0]);
        assert(body.length <= 5 * 1024 * 1024, 'Cover exceeds CMS 5MB limit');
        record.coverFile = `images/${p.id}.bin`;
        writeFileSync(`${root}/${record.coverFile}`, body);
        delete record.imageError;
      }
    }));
    outcomes.forEach((r, j) => { if (r.status === 'rejected') { const p = selected[i + j]; (manifest.products[p.id] ||= { sourceUrl: p.permalink }).imageError = String(r.reason); } });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    done += outcomes.length;
    if (done % 60 === 0 || done === selected.length) console.log(`Covers ${done}/${selected.length}`);
  }
  console.log({ source: source.length, selected: selected.length, covers: Object.values(manifest.products).filter(p => p.coverFile).length });
  process.exit(0);
}

await build({ stdin: { contents: `export * from './src/server/services/navigation.service'; export * from './src/server/services/product-studio.service'; export * from './src/server/services/media-library.service'; export * from './src/contracts/cms/product-studio';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.reference-catalog-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
const api = await import('./.reference-catalog-bundle.mjs');
const state = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates = readdirSync(state).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite').filter(f => {
  const db = new DatabaseSync(resolve(state, f), { readOnly: true });
  try { return !!db.prepare("SELECT name FROM sqlite_master WHERE name='ProductInspection'").get(); } finally { db.close(); }
});
assert.equal(candidates.length, 1, 'Ambiguous local catalog');
const db = new DatabaseSync(resolve(state, candidates[0]));
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
// D1 service contract over local SQLite; batch keeps CMS revision guards atomic.
const DB = {
  prepare(sql) {
    let values = [];
    const statement = { bind(...args) { values = args; return statement; },
      async first() { return db.prepare(sql).get(...values) || null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { const r = db.prepare(sql).run(...values); return { success: true, meta: { changes: Number(r.changes) } }; } };
    return statement;
  },
  async batch(statements) { db.exec('BEGIN IMMEDIATE'); try { const out = []; for (const s of statements) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
};
let mf;
try {
  if (mode === '--local') {
    mkdirSync('.wrangler/backups', { recursive: true });
    await backup(db, resolve('.wrangler/backups', `before-reference-${Date.now()}.sqlite`));
    const token = crypto.randomUUID();
    mf = new Miniflare({ ...convertV4MiniflareOptions({ host: '127.0.0.1', modules: true, bindings: { IMPORT_TOKEN: token }, script: String.raw`export default {async fetch(r,e){
      if(r.headers.get('Authorization') !== 'Bearer '+e.IMPORT_TOKEN) return new Response(null,{status:403});
      const key=new URL(r.url).searchParams.get('key');
      if(!/^library\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/.test(key || '')) return new Response(null,{status:400});
      if(r.method==='PUT'){await e.PRODUCT_MEDIA.put(key,r.body,{httpMetadata:{contentType:r.headers.get('Content-Type')}});return new Response(null,{status:204});}
      if(r.method==='DELETE'){await e.PRODUCT_MEDIA.delete(key);return new Response(null,{status:204});}
      if(r.method==='HEAD') return new Response(null,{status:await e.PRODUCT_MEDIA.head(key)?204:404});
      return new Response(null,{status:405});
    }}`, compatibilityDate: '2026-10-01', r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' } }), resourcePersistencePath: resolve('.wrangler/state/v3') });
    const mediaRequest = async (method, key, body, type) => {
      const response = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), { method, body, headers: { Authorization: 'Bearer ' + token, 'Content-Type': type || 'application/octet-stream' } });
      assert(response.ok, `Local R2 ${method}: ${response.status}`);
      return { key };
    };
    const mediaExists = async key => {
      const r = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), { method: 'HEAD', headers: { Authorization: 'Bearer ' + token } });
      assert(r.ok || r.status === 404, `Local R2 HEAD: ${r.status}`);
      return r.ok;
    };
    const env = { DB, PRODUCT_MEDIA: { put: (key, body, options) => mediaRequest('PUT', key, body, options.httpMetadata.contentType), delete: key => mediaRequest('DELETE', key) } };
    const current = await api.navigationDetail(DB);
    const doc = current.document;
    for (const [key, name] of accessoryGroups) if (!doc.categories.some(c => c.id === 'ref-accessory-' + key)) doc.categories.push({ id: 'ref-accessory-' + key, name, slug: 'phu-kien-' + key, description: '', parentId: 'cat-phu-kien', visible: true, image: '', assetId: '', alt: name });
    const item = (id, label, target, children = []) => ({ id, label, target, children });
    const path = value => ({ kind: 'path', path: value });
    const cat = id => ({ kind: 'category', id });
    const menu = [item('nav-hot-sale', 'HOT SALE', path('/hot-sale')),
      ...[['gaming', 'LAPTOP GAMING'], ['van-phong', 'LAPTOP VĂN PHÒNG'], ['do-hoa', 'LAPTOP ĐỒ HỌA'], ['macbook', 'APPLE - MACBOOK']].map(([key, name]) => item('nav-' + key, name, cat('cat-' + key))),
      item('nav-accessories', 'PHỤ KIỆN LAPTOP', cat('cat-phu-kien'), accessoryGroups.map(([key, name]) => ({ id: 'nav-accessory-' + key, label: name, target: cat('ref-accessory-' + key) }))),
      item('nav-about', 'VỀ CITILAP', path('/gioi-thieu'), [['about-overview', 'Giới thiệu CitiLap', '/gioi-thieu'], ['stores', 'Hệ thống cửa hàng', '/he-thong-cua-hang'], ['contact', 'Liên hệ', '/lien-he'], ['warranty', 'Chính sách bảo hành', '/chinh-sach-bao-hanh'], ['returns', 'Chính sách đổi trả', '/chinh-sach-doi-tra']].map(([id, label, href]) => ({ id: 'nav-' + id, label, target: path(href) }))),
      item('nav-news', 'TIN TỨC', path('/news'))];
    if (doc.menus.main.length && JSON.stringify(doc.menus.main) !== JSON.stringify(menu)) throw Error('Existing CMS menu differs; review before replacing');
    if (!doc.menus.main.length) { doc.menus.main = menu; await api.writeNavigation(env, { expectedRevision: current.revision, action: 'publish', document: doc }); }
    let added = 0;
    for (const p of selected) {
      const slug = `ref-tgs-${p.id}`;
      const record = manifest.products[p.id];
      assert(record, `Download manifest missing ${p.id}`);
      if (db.prepare('SELECT id FROM Product WHERE slug=?').get(slug)) {
        const asset = record.assetId && db.prepare('SELECT storageKey,mimeType FROM MediaAsset WHERE id=?').get(record.assetId);
        if (asset && record.coverFile && !await mediaExists(asset.storageKey)) await mediaRequest('PUT', asset.storageKey, readFileSync(root + '/' + record.coverFile), asset.mimeType);
        continue;
      }
      const title = decode(p.name).replace(/<[^>]*>/g, '').trim();
      const d = api.blankProduct(category(p).startsWith('ref-accessory') || category(p) === 'cat-phu-kien' ? 'ACCESSORY' : 'LAPTOP');
      Object.assign(d, { name: `[Tham khảo] ${title}`.slice(0, 200), slug, categoryId: category(p), availability: 'CONTACT', price: 0, originalPrice: null,
        condition: /like new/i.test(title) ? 'LIKE_NEW' : /used|đã qua sử dụng/i.test(title) ? 'USED' : 'NEW',
        brand: title.match(/\b(Lenovo|Dell|HP|Asus|Acer|MSI|Apple|LG|Samsung|Microsoft|Gigabyte|Razer|Logitech)\b/i)?.[0] || '',
        description: 'Bản nháp tham khảo cấu hình. Chưa xác nhận giá bán, tình trạng máy, tồn kho và bảo hành tại CitiLap.' });
      const parts = title.match(/\(([^)]+)\)/)?.[1]?.split(',').map(s => s.trim()) || [];
      const specs = [];
      for (const value of parts) {
        const key = /^(core|intel|ryzen|amd|apple m|ultra|i[3579]-)/i.test(value) ? 'CPU' : /^(rtx|gtx|intel iris|intel uhd|radeon|quadro)/i.test(value) ? 'GPU' : /^(4|8|12|16|24|32|48|64|96|128)\s*GB$/i.test(value) ? 'RAM' : /^(128|256|512)\s*GB$|^[1248]\s*TB$/i.test(value) ? 'SSD' : /^\d{2}(\.\d)?\s/.test(value) ? 'Màn hình' : null;
        if (key && !specs.some(s => s.key === key)) specs.push({ key, value: value.slice(0, 200) });
      }
      d.specs = specs;
      const referencePrice = Number(p.prices.price) / 10 ** p.prices.currency_minor_unit;
      assert(p.prices.currency_code === 'VND' && Number.isFinite(referencePrice) && referencePrice >= 0, 'Invalid source price');
      d.contentHtml = `<h2>${escape(title)}</h2><p>${escape(d.description)}</p><p>Mẫu này được xếp trong nhóm ${escape(p.categories.map(c => decode(c.name)).join(', '))} tại nguồn tham khảo. Hãy đối chiếu phần mềm sử dụng và cấu hình thực tế trước khi chọn máy.</p><h3>Cấu hình ghi trong tên sản phẩm nguồn</h3><ul>${specs.map(s => `<li>${escape(s.key)}: ${escape(s.value)}</li>`).join('')}</ul><h3>Điểm cần xác nhận</h3><p>Kiểm tra đúng phiên bản, khả năng nâng cấp, phụ kiện kèm theo và tình trạng thực tế. Với máy đã qua sử dụng, cần hồ sơ kiểm tra riêng cho pin, màn hình và ngoại hình. Chưa có dữ liệu đo hiệu năng hoặc thời lượng pin độc lập.</p><p>Giá tham khảo tại nguồn: ${referencePrice.toLocaleString('vi-VN')} VND. Đây không phải báo giá CitiLap. Ảnh nguồn cần duyệt quyền sử dụng trước khi xuất bản.</p><p>Nguồn cấu hình và ảnh: <a href="${escape(sourceUrl(p.permalink))}">Thế Giới Số 365</a>. Thời điểm thu thập: ${escape(manifest.capturedAt)}.</p>`;
      if (record.coverFile) {
        try {
          let assetId = record.assetId;
          if (!assetId || !db.prepare('SELECT id FROM MediaAsset WHERE id=?').get(assetId)) {
            const media = await api.uploadLibraryImage(env, new File([readFileSync(root + '/' + record.coverFile)], `ref-tgs-${p.id}`));
            assetId = media.asset.id;
            await api.editMedia(DB, assetId, { revision: media.asset.revision, name: `Tham khảo TGS ${p.id}`, alt: title.slice(0, 300), caption: `REVIEW_REQUIRED | ${p.images[0].src}`.slice(0, 1000), state: 'READY' });
            record.assetId = assetId;
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          }
          d.media = [{ assetId, alt: title.slice(0, 300), variantId: '' }];
        } catch (e) { record.imageError = String(e); }
      }
      const result = await api.writeStudio(env, null, { expectedRevision: 0, action: 'save', document: d });
      record.localProductId = result.id;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      if (++added % 100 === 0) console.log('Drafts added:', added);
    }
    console.log({ added });
  }
  const nav = await api.publicNavigation(DB);
  assert.equal(nav.menus.main.length, 8);
  const drafts = db.prepare("SELECT p.id,p.stock,p.status,p.price,s.published,s.draft FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.slug LIKE 'ref-tgs-%'").all();
  assert.equal(drafts.length, selected.length);
  assert(drafts.every(p => p.stock === 0 && p.price === 0 && p.status === 'DRAFT' && p.published === null));
  assert(drafts.every(p => JSON.parse(p.draft).availability === 'CONTACT'));
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  const counts = db.prepare("SELECT c.name,count(*) n FROM Product p JOIN Category c ON c.id=p.categoryId WHERE p.slug LIKE 'ref-tgs-%' GROUP BY c.id").all();
  console.log(JSON.stringify({ navigationRevision: nav.revision, drafts: drafts.length, withCover: drafts.filter(p => JSON.parse(p.draft).media.length).length, categories: counts }, null, 2));
  writeFileSync(root + '/import-result.json', JSON.stringify({ checkedAt: new Date().toISOString(), navigation: nav, drafts: drafts.length, withCover: drafts.filter(p => JSON.parse(p.draft).media.length).length, categories: counts }, null, 2));
} finally { if (mf) await mf.dispose(); db.close(); }

