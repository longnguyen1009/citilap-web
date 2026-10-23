import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const mode = process.argv[2];
assert(['--local', '--staging'].includes(mode), 'Use --local or --staging');
const plan = JSON.parse(readFileSync('.wrangler/release/manifest.json', 'utf8'));
const expectedSlugs = plan.products.map(p => p.document.slug).sort();
const report = { checkedAt: new Date().toISOString(), mode };
if (mode === '--local') {
  const root = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
  const candidates = readdirSync(root).filter(f => f.endsWith('.sqlite')).filter(f => {
    const db = new DatabaseSync(`${root}/${f}`, { readOnly: true });
    try { return !!db.prepare("SELECT 1 FROM sqlite_master WHERE name='ProductStudio'").get(); } finally { db.close(); }
  });
  assert.equal(candidates.length, 1);
  const db = new DatabaseSync(`${root}/${candidates[0]}`, { readOnly: true });
  try {
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    const products = db.prepare("SELECT p.id,p.slug,s.published FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.status='ACTIVE' AND p.deletedAt IS NULL AND s.published IS NOT NULL").all();
    assert.deepEqual(products.map(p => p.slug).sort(), expectedSlugs);
    const ids = new Set(products.map(p => p.id));
    const counts = {};
    for (const row of products) {
      const d = JSON.parse(row.published);
      assert.equal(d.availability, 'CONTACT');
      assert.equal(d.price, 0);
      assert(d.specs.length && d.media.length, d.slug);
      assert(!/\[Tham khảo\]|demo|chưa chốt/i.test(d.name));
      for (const media of d.media) assert(db.prepare("SELECT 1 FROM MediaAsset WHERE id=? AND state='READY' AND kind='IMAGE'").get(media.assetId), d.slug);
      counts[d.categoryId] = (counts[d.categoryId] || 0) + 1;
    }
    const expectedCounts = {};
    for (const { document: d } of plan.products) expectedCounts[d.categoryId] = (expectedCounts[d.categoryId] || 0) + 1;
    assert.deepEqual(counts, expectedCounts);
    const posts = db.prepare('SELECT s.published FROM PostStudio s JOIN Post p ON p.id=s.postId WHERE p.deletedAt IS NULL AND s.published IS NOT NULL').all().map(r => JSON.parse(r.published));
    assert.deepEqual(posts.map(p => p.slug).sort(), plan.articles.map(p => p.slug).sort());
    for (const p of posts) for (const id of p.relatedProductIds) assert(ids.has(id));
    const pages = db.prepare('SELECT s.published FROM PageStudio s JOIN Page p ON p.id=s.pageId WHERE p.deletedAt IS NULL AND s.published IS NOT NULL').all().map(r => JSON.parse(r.published));
    assert.deepEqual(pages.map(p => p.slug).sort(), plan.pages.map(p => p.slug).sort());
    const home = JSON.parse(db.prepare("SELECT published FROM LandingPageStudio WHERE pageId='home'").get().published);
    for (const section of home.sections) for (const id of section.data.manualProductIds || []) assert(ids.has(id), 'Old homepage product reference');
    const settings = JSON.parse(db.prepare("SELECT document FROM SiteSettings WHERE id='site'").get().document);
    assert.equal(settings.bankTransferEnabled, false);
    assert.equal(settings.flashSaleEnabled, false);
    report.history = {};
    for (const [table, count] of [['Order', 671], ['OrderItem', 834], ['SerialUnit', 3049]]) {
      const rows = db.prepare(`SELECT * FROM [${table}] ORDER BY id`).all();
      assert.equal(rows.length, count, table);
      report.history[table] = { count, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
    }
    Object.assign(report, { products: products.length, posts: posts.length, pages: pages.length, categoryCounts: counts, foreignKeys: 'PASS' });
  } finally { db.close(); }
} else {
  const base = 'https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev';
  const get = async path => {
    const r = await fetch(base + path, { signal: AbortSignal.timeout(60_000) });
    assert.equal(r.status, 200, path);
    return r;
  };
  const products = [];
  for (let page = 1; page <= 3; page++) {
    const { data } = await (await get(`/api/search?limit=48&page=${page}`)).json();
    assert.equal(data.totalCount, 100);
    products.push(...data.products);
  }
  assert.deepEqual(products.map(p => p.slug).sort(), expectedSlugs);
  const { data: nav } = await (await get('/api/catalog/navigation')).json();
  const { data: settings } = await (await get('/api/settings')).json();
  assert.equal(settings.bankTransferEnabled, false);
  const paths = new Set(['/', '/search', '/news', '/lien-he', settings.subBanner1Link, settings.subBanner2Link,
    ...plan.pages.map(p => '/' + p.slug), ...plan.articles.map(p => '/news/' + p.slug),
    ...nav.categories.map(c => c.href), ...products.map(p => '/product/' + p.slug)]);
  for (const path of paths) await (await get(path)).arrayBuffer();
  const images = [...new Set(products.map(p => p.primaryImage))];
  for (const image of images) {
    assert(image && image.startsWith('/api/library/'), 'Public library URL');
    const r = await get(image);
    assert.match(r.headers.get('content-type'), /^image\//);
    assert((await r.arrayBuffer()).byteLength > 100);
  }
  for (const [url, width, status] of [[images[0], '13', 400], ['/api/library/missing-release-image', '384', 404], ['https://example.com/image.jpg', '384', 400]]) {
    const r = await fetch(base + '/_next/image?' + new URLSearchParams({ url, w: width, q: '75' }), { signal: AbortSignal.timeout(30_000) });
    assert.equal(r.status, status, 'Image source/width validation');
    await r.arrayBuffer();
  }
  Object.assign(report, { products: products.length, pagesChecked: paths.size, imagesChecked: images.length });
}
writeFileSync(`.wrangler/release/${mode.slice(2)}-checks.json`, JSON.stringify(report, null, 2));
console.log('PASS release content', report);
