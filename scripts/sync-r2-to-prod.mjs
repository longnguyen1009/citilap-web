// Sync local R2 objects to production R2 bucket (citilap-media-prod) and optionally prune unused remote objects.
// Usage:
//   node scripts/sync-r2-to-prod.mjs --upload
//   node scripts/sync-r2-to-prod.mjs --prune
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const mode = process.argv[2];
assert(['--upload', '--prune'].includes(mode), 'Usage: node scripts/sync-r2-to-prod.mjs --upload|--prune');

const toml = fs.readFileSync(process.env.USERPROFILE + '/.wrangler/config/default.toml', 'utf8');
const tokenMatch = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
assert(tokenMatch, 'Wrangler OAuth token not found');
const cfToken = tokenMatch[1];
const ACCOUNT_ID = '8952957f4eed25a74e19a3e273c4a589';
const BUCKET = 'citilap-media-prod';
const R2_API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects`;

const d1Root = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const dbFile = fs.readdirSync(d1Root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='MediaAsset'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(d1Root, dbFile), { readOnly: true });
const assets = db.prepare("SELECT id, storageKey, mimeType FROM MediaAsset WHERE state='READY' AND storageKey IS NOT NULL").all();
db.close();

// Build active key list from local R2
const localKeys = [];
const activeSet = new Set();

const mf = new Miniflare({
  ...convertV4MiniflareOptions({
    host: '127.0.0.1',
    modules: true,
    script: `export default { async fetch(r, e) {
      const k = new URL(r.url).searchParams.get('key');
      const obj = await e.PRODUCT_MEDIA.get(k);
      if (!obj) return new Response(null, { status: 404 });
      return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream' } });
    }}`,
    compatibilityDate: '2026-10-01',
    r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' },
  }),
  resourcePersistencePath: resolve('.wrangler/state/v3'),
});

try {
  if (mode === '--upload') {
    for (const a of assets) {
      localKeys.push({ key: a.storageKey, mime: a.mimeType || 'image/webp' });
      localKeys.push({ key: `library/${a.id}_thumb-v2.webp`, mime: 'image/webp', optional: true });
    }
    let uploaded = 0, skippedMissing = 0, failed = 0;
    const CONCURRENCY = 16;
    for (let i = 0; i < localKeys.length; i += CONCURRENCY) {
      const chunk = localKeys.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (item) => {
        const res = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(item.key));
        if (!res.ok) {
          if (item.optional) { skippedMissing++; return; }
          failed++; console.warn('Missing local R2 key:', item.key); return;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const mime = res.headers.get('Content-Type') || item.mime;
        for (let attempt = 0; attempt < 3; attempt++) {
          const put = await fetch(`${R2_API}/${item.key}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': mime },
            body: buf,
          });
          if (put.ok) { uploaded++; return; }
          if (attempt === 2) { failed++; console.warn('Failed R2 PUT', item.key, put.status); }
        }
      }));
      if ((i + chunk.length) % 320 === 0 || i + chunk.length >= localKeys.length) {
        console.log(`Uploaded ${uploaded} objects (${Math.min(i + chunk.length, localKeys.length)}/${localKeys.length}), missing optional: ${skippedMissing}, failed: ${failed}`);
      }
    }
    assert.equal(failed, 0, `${failed} R2 uploads failed`);
    console.log('R2 upload complete:', { uploaded, skippedMissing });
  } else {
    for (const a of assets) {
      activeSet.add(a.storageKey);
      activeSet.add(`library/${a.id}_thumb-v2.webp`);
    }
    const toDelete = [];
    let cursor = '';
    let totalRemote = 0;
    while (true) {
      const url = `${R2_API}?per_page=1000${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${cfToken}` } });
      assert(res.ok, `R2 list failed: ${res.status}`);
      const json = await res.json();
      assert(json.success, `R2 list error: ${JSON.stringify(json.errors)}`);
      const items = json.result || [];
      totalRemote += items.length;
      for (const obj of items) {
        if (!activeSet.has(obj.key)) toDelete.push(obj.key);
      }
      cursor = json.result_info?.cursor || '';
      if (!cursor || !items.length) break;
    }
    console.log(`Remote R2 total objects: ${totalRemote}, unused to delete: ${toDelete.length}`);
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 16) {
      const chunk = toDelete.slice(i, i + 16);
      await Promise.all(chunk.map(async (key) => {
        const res = await fetch(`${R2_API}/${key}`, { method: 'DELETE', headers: { Authorization: `Bearer ${cfToken}` } });
        if (res.ok) deleted++;
      }));
    }
    console.log(`Pruned ${deleted}/${toDelete.length} unused objects from ${BUCKET}`);
  }
} finally {
  await mf.dispose();
}
