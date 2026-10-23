import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const origin = 'https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev';
const rows = [];
async function measure(path, accept, requestedWidth, attempt) {
  const started = performance.now();
  const response = await fetch(new URL(path, origin), { headers: { Accept: accept }, signal: AbortSignal.timeout(30_000) });
  const headersMs = performance.now() - started;
  const body = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(body).metadata().catch(() => ({}));
  rows.push({ path, accept, requestedWidth, attempt, status: response.status, redirected: response.redirected,
    finalUrl: response.url, bytes: body.length, width: metadata.width, height: metadata.height, format: metadata.format,
    headersMs: Math.round(headersMs), totalMs: Math.round(performance.now() - started),
    headers: Object.fromEntries(['content-type', 'cache-control', 'cf-cache-status', 'age', 'etag', 'vary', 'cf-ray'].map(name => [name, response.headers.get(name)])),
  });
}
const sources = ['/brand/citilap-logo.png'];
const catalog = await fetch(`${origin}/api/search?limit=1`, { signal: AbortSignal.timeout(30_000) }).then(r => r.json()).catch(() => null);
const productImage = catalog?.data?.products?.[0]?.primaryImage;
assert(productImage, 'Public catalog must return a product image to measure');
if (productImage && !sources.includes(productImage)) sources.push(productImage);
for (const source of sources) {
  await measure(source, 'image/*', null, 0);
  for (const accept of ['image/webp', 'image/avif']) for (const width of [384, 640, 1080]) {
    const path = `/_next/image?${new URLSearchParams({ url: source, w: String(width), q: '75' })}`;
    for (let attempt = 1; attempt <= 2; attempt++) await measure(path, accept, width, attempt);
  }
}
const report = { measuredAt: new Date().toISOString(), origin, note: 'Sequential GET from this workstation; not browser LCP or global CDN latency.', rows };
writeFileSync('.wrangler/staging-image-measurement.json', JSON.stringify(report, null, 2));
console.table(rows.map(({ requestedWidth, accept, attempt, status, redirected, bytes, width, format, totalMs, headers }) => ({ requestedWidth, accept, attempt, status, redirected, bytes, width, format, totalMs, cache: headers['cf-cache-status'] })));
for (const row of rows) {
  assert.equal(row.status, 200, row.path);
  assert.equal(row.redirected, false, row.path);
  if (row.requestedWidth) {
    const source = new URL(row.path, origin).searchParams.get('url');
    const original = rows.find(r => r.path === source && r.requestedWidth === null);
    assert.equal(row.width, Math.min(row.requestedWidth, original.width), row.path);
    assert.equal(row.headers['content-type'], row.accept, row.path);
  }
}
