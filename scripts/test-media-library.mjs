import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const bundle = await build({ stdin: { contents: `export * from './src/server/services/media-library.service'; export * from './src/server/media-http'; export * from './src/contracts/cms/media';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, external: ['cloudflare:workers'] });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("media-test"); } }', compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], r2Buckets: ['PRODUCT_MEDIA'] }));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const env = { DB, PRODUCT_MEDIA };
  globalThis.env=env;
  const files = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files.filter((f) => !f.startsWith('0009'))) {
    const statements = unstable_splitSqlQuery(await readFile(`d1-migrations/${file}`, 'utf8'));
    await DB.batch(statements.map((sql) => DB.prepare(sql)));
  }
  await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('test-category','Test','test',CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,updatedAt) VALUES('test-product','Test','test-product','',100,'test-category',CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO ProductImage(id,productId,r2Key) VALUES('old-image','test-product','products/test/old.png')").run();
  await DB.batch(unstable_splitSqlQuery(await readFile('d1-migrations/0009_cms_media_library.sql', 'utf8')).map((sql) => DB.prepare(sql)));
  await check('all nine migrations and legacy image backfill', async () => {
    const detail = await api.mediaDetail(DB, 'legacy-old-image'); assert.equal(detail.asset.usageCount, 1); assert.equal(detail.usages[0].ownerId, 'test-product');
  });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  let asset;
  await check('image upload writes real R2 bytes and D1 metadata', async () => {
    asset = (await api.uploadLibraryImage(env, new File([png], 'test.png', { type: 'image/png' }))).asset;
    assert.equal(asset.width, 1); assert.equal(asset.size, png.length);
    const row = await api.getAsset(DB, asset.id); assert.equal((await PRODUCT_MEDIA.get(row.storageKey)).size, png.length);
  });
  await check('independent read retains uploaded metadata', async () => { assert.equal((await api.mediaDetail(DB, asset.id)).asset.name, 'test.png'); });
  await check('search/type pagination and out-of-range clamping', async () => { const result = await api.listMedia(DB, { q: 'test.png', kind: 'IMAGE', page: 99 }); assert.equal(result.page, 1); assert.equal(result.total, 1); });
  const changes = { revision: 1, name: 'Ảnh mới', alt: 'Laptop CitiLap', caption: 'Ảnh sản phẩm', state: 'READY' };
  await check('metadata persists and stale edits are rejected', async () => {
    assert.equal((await api.editMedia(DB, asset.id, changes)).asset.revision, 2);
    await assert.rejects(() => api.editMedia(DB, asset.id, changes), (e) => e.status === 409);
    assert.equal((await api.mediaDetail(DB, asset.id)).asset.alt, 'Laptop CitiLap');
  });
  await check('archive and restore are reversible, retain R2', async () => {
    await api.editMedia(DB, asset.id, { ...changes, revision: 2, state: 'ARCHIVED' });
    assert.equal((await api.listMedia(DB, { state: 'ARCHIVED' })).total, 1);
    const response = await api.serveLibraryImage(env, asset.id, new Request('http://test/')); assert.equal(response.status, 200);
    await api.editMedia(DB, asset.id, { ...changes, revision: 3, state: 'READY' });
  });
  await check('attachment is idempotent and records product usage', async () => {
    await api.attachProductImage(env, asset.id, 'test-product'); await api.attachProductImage(env, asset.id, 'test-product');
    assert.equal((await api.mediaDetail(DB, asset.id)).asset.usageCount, 1);
  });
  await check('in-use archive rejected by database invariant', async () => {
    await assert.rejects(() => api.editMedia(DB, asset.id, { ...changes, revision: 4, state: 'ARCHIVED' }), (e) => e.status === 409);
  });
  await check('new product legacy gallery usage tracks update/removal', async () => {
    await DB.prepare('UPDATE Product SET images=? WHERE id=?').bind(JSON.stringify([asset.url]), 'test-product').run();
    assert.equal((await api.mediaDetail(DB, asset.id)).asset.usageCount, 2);
    await DB.prepare("UPDATE Product SET images='[]' WHERE id='test-product'").run();
    assert.equal((await api.mediaDetail(DB, asset.id)).asset.usageCount, 1);
  });
  await check('legacy image detach keeps asset and removes usage', async () => {
    await DB.prepare("DELETE FROM ProductImage WHERE id='old-image'").run();
    assert.equal((await api.mediaDetail(DB, 'legacy-old-image')).asset.usageCount, 0);
  });
  await check('empty/oversize/mime-spoofed/HTML upload rejected', async () => {
    for (const file of [new File([], 'a.png', { type: 'image/png' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }), new File([png], 'fake.jpg', { type: 'image/jpeg' }), new File(['<script>alert(1)</script>'], 'a.png', { type: 'image/png' })]) await assert.rejects(() => api.uploadLibraryImage(env, file), (e) => [400,413,415].includes(e.status));
  });
  await check('D1 failure compensates only the newly uploaded R2 object', async () => {
    const before = (await PRODUCT_MEDIA.list()).objects.length;
    await assert.rejects(() => api.uploadLibraryImage({ DB: { prepare() { throw new Error('injected db failure'); } }, PRODUCT_MEDIA }, new File([png], 'failure.png', { type: 'image/png' })));
    assert.equal((await PRODUCT_MEDIA.list()).objects.length, before);
  });
  await check('YouTube validation normalizes allowed hosts and deduplicates', async () => {
    const one = await api.addVideo(DB, { name: 'Review', url: 'https://youtu.be/abcdefghijk' });
    const two = await api.addVideo(DB, { name: 'Review again', url: 'https://www.youtube.com/watch?v=abcdefghijk' });
    assert.equal(one.asset.id, two.asset.id); assert.equal((await api.listMedia(DB, { kind: 'VIDEO' })).total, 1);
    for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://user:pass@youtube.com/watch?v=abcdefghijk', 'http://youtu.be/abcdefghijk']) assert.equal(api.youtubeId(url), null);
  });
  await check('SVG, PDF, MP4 video uploads and TikTok/Google Drive embeds work and filter properly', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" onclick="alert(1)"><script>alert(1)</script><rect width="120" height="60" fill="blue"/></svg>';
    const svgRes = await api.uploadLibraryImage(env, new File([svgContent], 'logo.svg', { type: 'image/svg+xml' }));
    assert.equal(svgRes.asset.assetType, 'SVG');
    assert.equal(svgRes.asset.width, 120);
    assert.equal(svgRes.asset.height, 60);
    const servedSvg = await api.serveLibraryImage(env, svgRes.asset.id, new Request('http://test/'));
    assert.equal(servedSvg.status, 200);
    assert.ok(servedSvg.headers.get('Content-Security-Policy')?.includes('sandbox'));
    const svgText = await servedSvg.text();
    assert.ok(!svgText.includes('<script'));
    assert.ok(!svgText.includes('onclick'));

    const pdfBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'utf8');
    const pdfRes = await api.uploadLibraryImage(env, new File([pdfBytes], 'catalogue.pdf', { type: 'application/pdf' }));
    assert.equal(pdfRes.asset.assetType, 'PDF');

    const mp4Bytes = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00]);
    const mp4Res = await api.uploadLibraryImage(env, new File([mp4Bytes], 'intro.mp4', { type: 'video/mp4' }));
    assert.equal(mp4Res.asset.assetType, 'VIDEO_FILE');

    const tiktokRes = await api.addVideo(DB, { name: 'TikTok Review', url: 'https://www.tiktok.com/@citilap/video/7350000000000000001' });
    assert.equal(tiktokRes.asset.assetType, 'TIKTOK');
    assert.ok(tiktokRes.asset.embedUrl?.includes('7350000000000000001'));

    const driveRes = await api.addVideo(DB, { name: 'Drive Media', url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing', mediaKind: 'GDRIVE_VIDEO' });
    assert.equal(driveRes.asset.assetType, 'GDRIVE');
    assert.ok(driveRes.asset.embedUrl?.includes('1AbCdEfGhIjKlMnOpQrStUvWxYz/preview'));

    assert.equal((await api.listMedia(DB, { kind: 'SVG' })).total, 1);
    assert.equal((await api.listMedia(DB, { kind: 'PDF' })).total, 1);
    assert.equal((await api.listMedia(DB, { kind: 'TIKTOK' })).total, 1);
    assert.equal((await api.listMedia(DB, { kind: 'GDRIVE' })).total, 1);
    assert.equal((await api.listMedia(DB, { kind: 'YOUTUBE' })).total, 1);
    assert.equal((await api.listMedia(DB, { kind: 'VIDEO' })).total, 4);
  });
  await check('missing asset and R2 objects yield 404', async () => {
    await assert.rejects(() => api.getAsset(DB, 'missing'), (e) => e.status === 404);
    const row = await api.getAsset(DB, asset.id); await PRODUCT_MEDIA.delete(row.storageKey);
    await assert.rejects(() => api.serveLibraryImage(env, asset.id, new Request('http://test/')), (e) => e.status === 404);
  });
  await check('admin list/mutation deny unauthenticated access', async () => {
    for (const mutation of [false, true]) assert.equal((await api.mediaAdmin(new Request('http://test/'), mutation, async () => { throw new Error('must not run'); }, async () => env)).status, 401);
  });
  await check('CSRF denied before storage access, authorized read no-store', async () => {
    const previous = process.env.ADMIN_API_TOKEN;
    try {
      const token = randomBytes(32).toString('hex');
      await DB.prepare("INSERT INTO User(id,email,password,role,updatedAt) VALUES('media-owner','media@fixture.invalid','unused','OWNER',CURRENT_TIMESTAMP)").run();
      await DB.prepare('INSERT INTO AdminSession(tokenHash,userId,version,expiresAt) VALUES(?,?,0,?)').bind(createHash('sha256').update(token).digest('hex'),'media-owner',Date.now()+3600000).run();
      const cookie = `admin_session=${token}`;
      const bad = new Request('http://test/', { headers: { cookie, 'sec-fetch-site': 'cross-site', origin: 'https://evil.test' } });
      assert.equal((await api.mediaAdmin(bad, true, async () => null, async () => env)).status, 403);
      const good = new Request('http://test/api/admin/media', { headers: { cookie } });
      const result = await api.mediaAdmin(good, false, (e) => api.listMedia(e.DB, {}), async () => env);
      assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'private, no-store');
    } finally { if (previous === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = previous; }
  });
  console.log(`Media library: ${passed}/${passed} PASS (isolated Miniflare D1/R2; no remote access)`);
} finally { await mf.dispose(); }
