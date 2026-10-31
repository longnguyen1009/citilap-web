import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('--- Starting Image Compression & 60s Cache Verification ---');

// 1. Verify Homepage Cache Configuration
const pageSource = await readFile('src/app/(shop)/page.tsx', 'utf8');
assert.match(pageSource, /export\s+const\s+revalidate\s*=\s*60\s*;/, 'Homepage must export revalidate = 60');
console.log('PASS Homepage exports revalidate = 60');

// 2. Worker must not override Vinext's HTML/RSC cache policy (private/no-store must survive)
const workerSource = await readFile('src/worker.ts', 'utf8');
assert.doesNotMatch(workerSource, /s-maxage/, 'Worker must not force a shared cache header on every GET /');
assert.match(workerSource, /return await app\.fetch\(request, env, ctx\)/, 'Worker must pass HTML/RSC responses through unchanged');
console.log('PASS Worker preserves Vinext HTML/RSC cache headers');

// 3. Test Worker Image Compression Pipeline
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/media-library.service';
      export * from './src/contracts/cms/media';
      export * from './src/contracts/cms/post';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  external: ['cloudflare:workers'],
});

const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');

  // Initialize DB migrations
  const files = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const statements = unstable_splitSqlQuery(await readFile(`d1-migrations/${file}`, 'utf8'));
    for (const sql of statements) {
      if (sql.trim()) await DB.prepare(sql).run();
    }
  }

  // Track IMAGES transformation calls
  const transformCalls = [];
  const mockImagesBinding = {
    input(source) {
      assert(source instanceof ReadableStream, 'Images binding requires a fresh byte stream');
      let transformOptions = {};
      return {
        transform(opts) {
          transformOptions = opts;
          return {
            async output(outOpts) {
              assert((await new Response(source).arrayBuffer()).byteLength > 0);
              transformCalls.push({ transform: transformOptions, output: outOpts });
              return {
                response() {
                  // Simulate compressed WebP payload
                  const fakeWebp = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8X\x0a\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00', 'binary');
                  return new Response(fakeWebp, { headers: { 'Content-Type': 'image/webp' } });
                },
              };
            },
          };
        },
      };
    },
  };

  const envWithImages = {
    DB,
    PRODUCT_MEDIA,
    IMAGES: mockImagesBinding,
  };

  // Valid 1x1 PNG fixture
  const pngFixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const file = new File([pngFixture], 'laptop-product.png', { type: 'image/png' });

  const uploadResult = await api.uploadLibraryImage(envWithImages, file);
  const asset = uploadResult.asset;

  // Verify transform calls:
  // 1) Detail: max width 1600, quality 90, webp
  // 2) Thumbnail: width 480, quality 75, webp
  assert.equal(transformCalls.length, 2, 'Should execute 2 transformations (detail + thumb)');
  assert.deepEqual(transformCalls[0].transform, { width: 1600, fit: 'scale-down' });
  assert.equal(transformCalls[0].output.quality, 90);
  assert.equal(transformCalls[0].output.format, 'image/webp');

  assert.deepEqual(transformCalls[1].transform, { width: 480, fit: 'scale-down' });
  assert.equal(transformCalls[1].output.quality, 75);
  assert.equal(transformCalls[1].output.format, 'image/webp');
  console.log('PASS Dual-variant compression: detail (1600px @ 90%) and thumb (480px @ 75%)');

  // Verify R2 contains both detail and thumbnail
  const row = await api.getAsset(DB, asset.id);
  assert.equal(row.storageKey, `library/${asset.id}.webp`);
  assert.equal(row.mimeType, 'image/webp');

  const detailR2 = await PRODUCT_MEDIA.get(`library/${asset.id}.webp`);
  assert(detailR2 !== null, 'Detail R2 object must exist');

  const thumbR2 = await PRODUCT_MEDIA.get(`library/${asset.id}_thumb-v2.webp`);
  assert(thumbR2 !== null, 'Thumbnail R2 object must exist');
  console.log('PASS Both detail and thumbnail objects stored in R2');

  // Verify URLs from presentation resolver
  assert.equal(asset.url, `/api/library/${asset.id}`);
  assert.equal(asset.thumbnailUrl, `/api/library/${asset.id}?size=thumb&v=2`);
  console.log('PASS resolveMediaPresentation returns detail url and ?size=thumb&v=2 thumbnail');

  // Verify serveLibraryImage serving
  const detailRes = await api.serveLibraryImage(envWithImages, asset.id, new Request(`http://localhost/api/library/${asset.id}`));
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.headers.get('Content-Type'), 'image/webp');
  assert.match(detailRes.headers.get('Cache-Control'), /max-age=31536000.*immutable/);

  const thumbRes = await api.serveLibraryImage(envWithImages, asset.id, new Request(`http://localhost/api/library/${asset.id}?size=thumb&v=2`));
  assert.equal(thumbRes.status, 200);
  assert.equal(thumbRes.headers.get('Content-Type'), 'image/webp');
  assert.match(thumbRes.headers.get('Cache-Control'), /max-age=31536000.*immutable/);
  console.log('PASS serveLibraryImage correctly serves detail and thumbnail with 1-year immutable cache');

  // Legacy image without a v2 thumbnail: generated lazily on first request, original untouched.
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,mimeType,size) VALUES('legacy-test','IMAGE','R2','library/legacy-test.jpg','legacy.jpg','image/jpeg',100)").run();
  await PRODUCT_MEDIA.put('library/legacy-test.jpg', pngFixture, { httpMetadata: { contentType: 'image/jpeg' } });

  const lazyRes = await api.serveLibraryImage(envWithImages, 'legacy-test', new Request('http://localhost/api/library/legacy-test?size=thumb&v=2'));
  assert.equal(lazyRes.status, 200);
  assert.equal(lazyRes.headers.get('Content-Type'), 'image/webp');
  assert.match(lazyRes.headers.get('Cache-Control'), /immutable/);
  assert(await PRODUCT_MEDIA.head('library/legacy-test_thumb-v2.webp'), 'lazy thumbnail persisted to R2');
  assert.equal((await PRODUCT_MEDIA.get('library/legacy-test.jpg')).size, pngFixture.length, 'original is not modified');
  console.log('PASS legacy image gets a v2 thumbnail lazily; original kept');

  // Without the Images binding: serve the original but never cache that fallback as immutable.
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,mimeType,size) VALUES('legacy-noimg','IMAGE','R2','library/legacy-noimg.jpg','x.jpg','image/jpeg',100)").run();
  await PRODUCT_MEDIA.put('library/legacy-noimg.jpg', pngFixture, { httpMetadata: { contentType: 'image/jpeg' } });
  const fallbackRes = await api.serveLibraryImage({ DB, PRODUCT_MEDIA }, 'legacy-noimg', new Request('http://localhost/api/library/legacy-noimg?size=thumb&v=2'));
  assert.equal(fallbackRes.status, 200);
  assert.equal(fallbackRes.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(fallbackRes.headers.get('Cache-Control'), 'no-store');
  console.log('PASS fallback to original is no-store (retried later, never pinned for a year)');

  // PDFs never enter the thumbnail path.
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,mimeType,size) VALUES('doc-pdf','IMAGE','R2','library/doc-pdf.pdf','a.pdf','application/pdf',5)").run();
  await PRODUCT_MEDIA.put('library/doc-pdf.pdf', Buffer.from('%PDF-1.4'), { httpMetadata: { contentType: 'application/pdf' } });
  const pdfRes = await api.serveLibraryImage(envWithImages, 'doc-pdf', new Request('http://localhost/api/library/doc-pdf?size=thumb&v=2'));
  assert.equal(pdfRes.headers.get('Content-Type'), 'application/pdf');
  assert.match(pdfRes.headers.get('Cache-Control'), /immutable/);
  console.log('PASS PDF thumbnail request serves the PDF without optimization attempts');

  // Upload reports optimization status instead of silently succeeding.
  assert.equal(uploadResult.optimization.status, 'READY');
  const failingImages = { input: () => ({ transform: () => ({ output: async () => ({ response: () => new Response('boom', { status: 500 }) }) }) }) };
  const failed = await api.uploadLibraryImage({ DB, PRODUCT_MEDIA, IMAGES: failingImages }, new File([pngFixture], 'x.png', { type: 'image/png' }));
  assert.equal(failed.optimization.status, 'PENDING');
  assert.ok(failed.optimization.error);
  assert.equal(failed.asset.mimeType, 'image/png', 'failed transform must not store an error body as WebP');
  assert.equal(await PRODUCT_MEDIA.head(`library/${failed.asset.id}_thumb.png`), null, 'no full-size copy stored as thumbnail');
  const failingPut = { ...PRODUCT_MEDIA, head: PRODUCT_MEDIA.head.bind(PRODUCT_MEDIA), delete: PRODUCT_MEDIA.delete.bind(PRODUCT_MEDIA),
    get: PRODUCT_MEDIA.get.bind(PRODUCT_MEDIA),
    put: (key, ...rest) => key.includes('_thumb') ? Promise.reject(new Error('R2 down')) : PRODUCT_MEDIA.put(key, ...rest) };
  const r2fail = await api.uploadLibraryImage({ DB, PRODUCT_MEDIA: failingPut, IMAGES: mockImagesBinding }, new File([pngFixture], 'y.png', { type: 'image/png' }));
  assert.equal(r2fail.optimization.status, 'PENDING');
  assert.match(r2fail.optimization.error, /lưu/);
  console.log('PASS upload reports transform failure and R2 thumbnail write failure separately');

  // Backfill: in-use assets first, bounded batches, cursor loop until done.
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,mimeType,size) VALUES('zz-used','IMAGE','R2','library/zz-used.jpg','u.jpg','image/jpeg',100)").run();
  await PRODUCT_MEDIA.put('library/zz-used.jpg', pngFixture, { httpMetadata: { contentType: 'image/jpeg' } });
  await DB.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES('u1','zz-used','POST','p1','cover')").run();
  const first = await api.backfillThumbnails(envWithImages, { limit: 1 });
  assert.equal(first.processed, 1);
  assert.equal(first.created, 1);
  assert(await PRODUCT_MEDIA.head('library/zz-used_thumb-v2.webp'), 'in-use asset processed first');
  let cursor = first.nextCursor, rounds = 0;
  while (cursor && rounds++ < 50) cursor = (await api.backfillThumbnails(envWithImages, { cursor, limit: 2 })).nextCursor;
  assert(await PRODUCT_MEDIA.head('library/legacy-noimg_thumb-v2.webp'), 'unused legacy asset processed later');
  const again = await api.backfillThumbnails(envWithImages, { limit: 25 });
  assert.equal(again.created, 0, 'idempotent: second run creates nothing');
  assert.equal(await PRODUCT_MEDIA.head('library/doc-pdf_thumb-v2.webp'), null, 'PDF skipped');
  console.log('PASS backfill: in-use first, cursor batches, idempotent, raster-only');

  console.log('ALL VERIFICATIONS PASSED (100%): HTML cache passthrough + Worker image compression (1600px 90% detail + 480px 75% thumb) + legacy thumbnail backfill');
} finally {
  await mf.dispose();
}

