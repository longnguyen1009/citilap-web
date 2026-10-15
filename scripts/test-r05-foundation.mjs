import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const bundle = await build({ stdin: { contents: `export * from './src/server/services/post.service'; export * from './src/server/services/page.service'; export * from './src/contracts/cms/page';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-10-01', d1Databases: ['DB'], r2Buckets: ['PRODUCT_MEDIA'] }));
let passed = 0;
async function check(name, fn) { await fn(); console.log('PASS', ++passed, name); }
const notFound = e => e.status === 404;
const conflict = e => e.status === 409;
try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const env = { DB, PRODUCT_MEDIA };
  for (const f of (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort()) {
    await DB.batch(unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`, 'utf8')).map(s => DB.prepare(s)));
  }
  const imageId = 'content-test-image';
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,state) VALUES(?,'IMAGE','R2','library/r05.png','test','test','image/png','READY')").bind(imageId).run();
  await PRODUCT_MEDIA.put('library/r05.png', 'fixture');
  const cat = await api.writePostCategory(DB, null, { expectedRevision: 0, document: { name: 'News', slug: 'news-category' } });
  const cat2 = await api.writePostCategory(DB, null, { expectedRevision: 0, document: { name: 'Review', slug: 'review-category' } });
  let post;
  const doc = { ...api.blankPost(), title: 'Original', slug: 'original', categoryId: cat.id, coverImage: { assetId: imageId, alt: 'Cover' }, contentHtml: `<p>Hello</p><img src="/api/library/${imageId}" alt="Body">` };
  await check('draft isolation and real library URL usage', async () => {
    post = await api.writePost(env, null, { expectedRevision: 0, action: 'save', document: doc });
    await assert.rejects(api.publicPostBySlug(DB, 'original'), notFound);
    const usage = await DB.prepare("SELECT count(*) AS n FROM MediaUsage WHERE ownerType='POST_REVISION' AND assetId=?").bind(imageId).first();
    assert.equal(usage.n, 1);
  });
  let published;
  await check('publish and public timestamps', async () => {
    post = await api.writePost(env, post.id, { expectedRevision: 1, action: 'publish', document: doc });
    published = await api.publicPostBySlug(DB, 'original');
    assert.equal(published.title, 'Original');
    assert.ok(published.publishedAt);
    // Make timestamp changes observable without sleeping.
    await DB.prepare("UPDATE PostStudio SET publicUpdatedAt='2000-01-01',publishedAt='1999-01-01' WHERE postId=?").bind(post.id).run();
  });
  await check('draft slug/category edits preserve public URL/filter/date/history', async () => {
    post = await api.writePost(env, post.id, { expectedRevision: 2, action: 'save', document: { ...doc, title: 'Draft', slug: 'draft-url', categoryId: cat2.id } });
    const old = await api.publicPostBySlug(DB, 'original');
    assert.equal(old.title, 'Original');
    assert.equal(old.updatedAt, '2000-01-01');
    assert.equal(old.publishedAt, '1999-01-01');
    await assert.rejects(api.publicPostBySlug(DB, 'draft-url'), notFound);
    assert.equal((await api.publicPostList(DB, { categoryId: cat.id })).total, 1);
    assert.equal((await api.publicPostList(DB, { categoryId: cat2.id })).total, 0);
    const history = await api.listPostRevisions(DB, post.id);
    assert.equal(history.revisions.find(r => r.isPublished).revision, 2);
  });
  await check('restore appends restore action, does not republish', async () => {
    await api.restorePostRevision(env, post.id, 1, 3);
    assert.equal((await api.publicPostBySlug(DB, 'original')).updatedAt, '2000-01-01');
    const history = await api.listPostRevisions(DB, post.id);
    assert.equal(history.revisions[0].action, 'restore');
    assert.equal(history.revisions[0].revision, 4);
  });
  await check('stale and concurrent saves are atomic', async () => {
    await assert.rejects(api.writePost(env, post.id, { expectedRevision: 3, action: 'save', document: doc }), conflict);
    const results = await Promise.allSettled([1, 2].map(() => api.writePost(env, post.id, { expectedRevision: 4, action: 'save', document: doc })));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
    assert.equal((await api.listPostRevisions(DB, post.id)).revisions.length, 5);
  });
  await check('archive requires current revision and appends audit', async () => {
    await assert.rejects(api.archivePost(env, post.id, 4), conflict);
    await api.archivePost(env, post.id, 5);
    await assert.rejects(api.publicPostBySlug(DB, 'original'), notFound);
    assert.equal((await api.listPostRevisions(DB, post.id)).revisions[0].action, 'unpublish');
  });
  await check('category writes use compare-and-swap and retained revisions protect deletion', async () => {
    await api.writePostCategory(DB, cat.id, { expectedRevision: 1, document: { name: 'Changed', slug: 'news-category' } });
    await assert.rejects(api.writePostCategory(DB, cat.id, { expectedRevision: 1, document: { name: 'Wrong', slug: 'news-category' } }), conflict);
    await assert.rejects(api.deletePostCategory(DB, cat.id), e => e.status === 400);
  });
  let page;
  const pageDoc = { ...api.blankPage(), title: 'Warranty', slug: 'warranty', pageType: 'WARRANTY', contentHtml: `<p>Terms</p><img src="/api/library/${imageId}" alt="Terms">` };
  await check('page draft slug and type do not redirect public policy', async () => {
    page = await api.writePage(env, null, { expectedRevision: 0, action: 'publish', document: pageDoc });
    page = await api.writePage(env, page.id, { expectedRevision: 1, action: 'save', document: { ...pageDoc, slug: 'draft-policy', pageType: 'RETURNS' } });
    assert.equal((await api.publicPageByType(DB, 'WARRANTY')).slug, 'warranty');
    assert.equal(await api.publicPageByType(DB, 'RETURNS'), null);
    assert.equal((await api.publicPageBySlug(DB, 'warranty')).title, 'Warranty');
    await assert.rejects(api.publicPageBySlug(DB, 'draft-policy'), notFound);
  });
  await check('unique published system slot rolls back new page completely', async () => {
    await assert.rejects(api.writePage(env, null, { expectedRevision: 0, action: 'publish', document: { ...pageDoc, slug: 'other-warranty' } }), conflict);
    assert.equal((await DB.prepare("SELECT count(*) AS n FROM Page WHERE slug='other-warranty'").first()).n, 0);
  });
  await check('page restore/history/public pointer', async () => {
    await api.restorePageRevision(env, page.id, 1, 2);
    const h = await api.listPageRevisions(DB, page.id);
    assert.equal(h.revisions[0].action, 'restore');
    assert.equal(h.revisions.find(r => r.isPublished).revision, 1);
  });
  await check('publishing missing R2 image rejected; unpublish still works', async () => {
    await PRODUCT_MEDIA.delete('library/r05.png');
    await assert.rejects(api.writePage(env, page.id, { expectedRevision: 3, action: 'publish', document: pageDoc }), e => e.status === 400);
    assert.equal((await api.pageDetail(DB, page.id)).revision, 3);
    await api.archivePage(env, page.id, 3);
    assert.equal(await api.publicPageByType(DB, 'WARRANTY'), null);
  });
  await check('missing ID never creates content; foreign keys remain valid', async () => {
    await assert.rejects(api.writePage(env, 'missing', { expectedRevision: 0, action: 'save', document: pageDoc }), notFound);
    assert.deepEqual((await DB.prepare('PRAGMA foreign_key_check').all()).results, []);
  });
  console.log(`R05 foundation: ${passed}/${passed} PASS`);
} catch (error) {
  console.error('FAIL', error.message.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '[bundled service]'));
  process.exitCode = 1;
} finally { await mf.dispose(); }
