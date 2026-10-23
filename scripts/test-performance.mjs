import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';

await build({ stdin: { contents: `export * from './src/server/services/settings.service'; export * from './src/server/services/navigation.service'; export * from './src/server/services/page.service'; export * from './src/server/services/post.service'; export * from './src/server/services/search-read-model';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.performance-test-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
const api = await import('./.performance-test-bundle.mjs');
const sqlite = new DatabaseSync(':memory:');
for (const file of readdirSync('d1-migrations').filter(f => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`d1-migrations/${file}`, 'utf8'));
const reads = [];
let fail = false;
const db = { prepare(sql) {
  let args = [];
  return { bind(...values) { args = values; return this; }, async first() {
    if (fail) throw new Error('DB unavailable');
    const result = sqlite.prepare(sql).get(...args) ?? null;
    reads.push(result);
    return result;
  }, async all() { return { results: sqlite.prepare(sql).all(...args) }; } };
}, async batch(statements) {
  sqlite.exec('BEGIN');
  try { const result = []; for (const statement of statements) result.push(await statement.all()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
try {
  const defaults = await api.getPublicStorefrontSettings(db);
  sqlite.prepare("INSERT INTO SiteSettings(id,revision,document) VALUES('site',1,?)").run(JSON.stringify({ storeName: 'First' }));
  assert.equal((await api.getPublicStorefrontSettings(db)).storeName, 'First');
  const cached = await api.getPublicStorefrontSettings(db);
  assert.equal(reads.at(-1).document, null, 'cache hit must not transfer JSON');
  cached.storeName = 'mutated caller';
  assert.equal((await api.getPublicStorefrontSettings(db)).storeName, 'First');
  sqlite.prepare("UPDATE SiteSettings SET revision=2,document=?").run(JSON.stringify({ storeName: 'Second' }));
  assert.equal((await api.getPublicStorefrontSettings(db)).storeName, 'Second');
  fail = true;
  await assert.rejects(() => api.getPublicStorefrontSettings(db), /DB unavailable/);
  fail = false;
  sqlite.exec('DELETE FROM SiteSettings');
  assert.deepEqual(await api.getPublicStorefrontSettings(db), defaults);

  const navigation = { schemaVersion: 1, categories: [], collections: [], menus: { main: [{ id: 'home', label: 'First', target: { kind: 'path', path: '/' }, children: [] }], footer: [] } };
  sqlite.prepare("INSERT INTO NavigationStudio(id,revision,draft,published,publishedRevision) VALUES('site',1,?,?,1)").run(JSON.stringify(navigation), JSON.stringify(navigation));
  assert.equal((await api.publicNavigation(db)).menus.main[0].label, 'First');
  await api.publicNavigation(db);
  assert.equal(reads.at(-1).published, null);
  navigation.menus.main[0].label = 'Second';
  sqlite.prepare('UPDATE NavigationStudio SET publishedRevision=2,published=?').run(JSON.stringify(navigation));
  assert.equal((await api.publicNavigation(db)).menus.main[0].label, 'Second');
  navigation.menus.main.push({ id: 'product', label: 'Product', target: { kind: 'product', id: 'missing-product' }, children: [] });
  sqlite.prepare('UPDATE NavigationStudio SET publishedRevision=3,published=?').run(JSON.stringify(navigation));
  assert.equal((await api.publicNavigation(db)).menus.main.length, 1, 'missing products stay hidden on cached navigation');
  assert.equal((await api.publicNavigation(db)).menus.main.length, 1);
  fail = true;
  await assert.rejects(() => api.publicNavigation(db), /DB unavailable/);
  fail = false;
  sqlite.exec('UPDATE NavigationStudio SET published=NULL');
  await assert.rejects(() => api.publicNavigation(db), e => e.status === 404);
  console.log('PASS revision caches: cache-hit projection, revision update, caller isolation, deletion/unpublish, DB failure');
  for (const kind of ['Page', 'Post']) {
    const column = kind === 'Page' ? 'pageId' : 'postId';
    const document = { schemaVersion: 1, slug: 'published', title: 'Published', contentHtml: '<p>Public</p>', pageType: 'CUSTOM', seo: { title: '', description: '', ogImageAssetId: null }, relatedProductIds: [] };
    sqlite.prepare(`INSERT INTO ${kind}(id,slug) VALUES('content','published')`).run();
    sqlite.prepare(`INSERT INTO ${kind}Studio(${column},revision,draft,published,publishedRevision,publishedAt,publicUpdatedAt) VALUES('content',1,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
      .run(JSON.stringify({ ...document, title: 'Secret draft' }), JSON.stringify(document));
    const read = kind === 'Page' ? api.publicPageBySlug : api.publicPostBySlug;
    assert.equal((await read(db, 'published')).title, 'Published');
    const before = reads.length;
    assert.equal((await read(db, 'published')).title, 'Published');
    assert.equal(reads.length - before, 1, 'warm content needs metadata only');
    document.title = 'Revised';
    sqlite.prepare(`UPDATE ${kind}Studio SET publishedRevision=2,published=?`).run(JSON.stringify(document));
    assert.equal((await read(db, 'published')).title, 'Revised');
    fail = true;
    await assert.rejects(() => read(db, 'published'), /DB unavailable/);
    fail = false;
    sqlite.exec(`UPDATE ${kind} SET deletedAt=CURRENT_TIMESTAMP`);
    await assert.rejects(() => read(db, 'published'), e => e.status === 404);
    sqlite.exec(`UPDATE ${kind} SET deletedAt=NULL; UPDATE ${kind}Studio SET published=NULL`);
    await assert.rejects(() => read(db, 'published'), e => e.status === 404);
  }
  console.log('PASS page/post cache: no draft leak, revision refresh, one warm metadata read, soft deletion, unpublish, DB failure');

  let computes = 0;
  const at = new Date('2026-10-22T00:00:00Z');
  const compute = async () => {
    computes++;
    return { query: 'laptop', products: Array.from({ length: 5 }, (_, id) => ({ id: String(id) })), totalCount: 5, facets: {}, page: 1, pageSize: 2, totalPages: 3 };
  };
  const first = await api.readSearchPage(db, { query: 'laptop', limit: 2 }, at, compute);
  const second = await api.readSearchPage(db, { query: 'laptop', limit: 2, page: 2 }, at, compute);
  assert.deepEqual(first.products.map(p => p.id), ['0', '1']);
  assert.deepEqual(second.products.map(p => p.id), ['2', '3']);
  assert.equal(computes, 1, 'second page must use SQL, not catalog resolver');
  assert.deepEqual((await api.readSearchPage(db, { query: 'laptop', page: 99 }, at, compute)).products, []);
  sqlite.exec('UPDATE SearchCatalogRevision SET revision=revision+1');
  await api.readSearchPage(db, { query: 'laptop' }, at, compute);
  assert.equal(computes, 2);
  sqlite.prepare("INSERT INTO SiteSettings(id,revision,document) VALUES('site',1,?)")
    .run(JSON.stringify({ flashSaleStartAt: '2026-10-22T00:00:30Z' }));
  await api.readSearchPage(db, { query: 'laptop' }, at, compute);
  assert.equal(sqlite.prepare('SELECT validUntil FROM SearchResultSet').get().validUntil, at.getTime() + 30_000);
  await api.readSearchPage(db, { query: 'laptop' }, new Date(at.getTime() + 30_000), compute);
  assert.equal(computes, 4, 'promotion boundary must rebuild even without a write');
  let raced = false;
  await api.readSearchPage(db, { query: 'race' }, at, async () => {
    if (!raced) { sqlite.exec('UPDATE SearchCatalogRevision SET revision=revision+1'); raced = true; }
    return compute();
  });
  assert.equal(computes, 6, 'concurrent catalog mutation must discard obsolete build');
  let edits = 0;
  const busy = await api.readSearchPage(db, { query: 'bulk-edits', page: 2, limit: 2 }, at, async () => {
    sqlite.exec('UPDATE SearchCatalogRevision SET revision=revision+1');
    edits++;
    const result = await compute();
    return { ...result, products: result.products.map(p => ({ id: `${edits}-${p.id}` })) };
  });
  assert.equal(edits, 3, 'continuous writes use one fresh uncached fallback after two guarded attempts');
  assert.deepEqual(busy.products.map(p => p.id), ['3-2', '3-3']);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM SearchResultSet').get().n, 0, 'raced results must not be cached');
  const plan = sqlite.prepare('EXPLAIN QUERY PLAN SELECT document FROM SearchResultItem WHERE cacheKey=? AND position>=? AND position<? ORDER BY position LIMIT ?').all('key', 2, 4, 2);
  assert(plan.some(row => /PRIMARY KEY/.test(row.detail)));
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  console.log('PASS search read model: indexed SQL pages, empty pages, revision invalidation, promotion boundary, concurrent rebuild');
} finally { sqlite.close(); }
