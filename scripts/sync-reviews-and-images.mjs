// Restore paraphrased CitiLap reviews with inline images, upgrade PDP detail images to high quality (q94)
// while keeping compressed thumbnails (480px q70), and delete all unused MediaAsset + R2 objects.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { buildEditorialReviewHtml, compressImage } from './rebuild-citilap-catalog.mjs';

const CRAWL_DIR = '.wrangler/laptopnew-crawl';
const MEDIA_CACHE_DIR = `${CRAWL_DIR}/media-cache`;
const PREPARED_PATH = `${CRAWL_DIR}/citilap-prepared.json`;
const MAP_PATH = `${CRAWL_DIR}/r2-url-map-webp.json`;

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
const backupPath = resolve('.wrangler/backups', `before-reviews-images-${Date.now()}.sqlite`);
await backup(db, backupPath);
console.log('Backup created:', backupPath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');

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
      if(r.method==='PUT'){await e.PRODUCT_MEDIA.put(key,r.body,{httpMetadata:{contentType:r.headers.get('Content-Type')}});return new Response(null,{status:204});}
      if(r.method==='DELETE'){await e.PRODUCT_MEDIA.delete(key);return new Response(null,{status:204});}
      if(r.method==='HEAD') return new Response(null,{status:await e.PRODUCT_MEDIA.head(key)?204:404});
      return new Response(null,{status:405});
    }}`,
    compatibilityDate: '2026-10-01',
    r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' },
  }),
  resourcePersistencePath: resolve('.wrangler/state/v3'),
});

const r2Put = async (key, body, type) => {
  const res = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), {
    method: 'PUT', body,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': type || 'image/webp' },
  });
  assert(res.ok, `R2 PUT ${key}: ${res.status}`);
};
const r2Del = async (key) => {
  await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  }).catch(() => {});
};

try {
  const { products: prepared } = JSON.parse(readFileSync(PREPARED_PATH, 'utf8'));
  const urlMap = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  const prepBySlug = new Map(prepared.map((p) => [p.slug, p]));

  // 1. Re-encode cached images: high-quality detail (q94) + compressed card thumb (480px q70)
  const assetRows = new Map(
    db.prepare("SELECT id, storageKey FROM MediaAsset WHERE kind='IMAGE' AND state='READY'").all().map((r) => [r.id, r.storageKey])
  );
  if (!process.argv.includes('--reviews-only')) {
    const urlEntries = Object.entries(urlMap).filter(([, info]) => assetRows.has(info.assetId));
    let upgraded = 0;
    for (let i = 0; i < urlEntries.length; i += 12) {
      const chunk = urlEntries.slice(i, i + 12);
      await Promise.all(chunk.map(async ([url, info]) => {
        const hash = createHash('sha256').update(url).digest('hex');
        const binPath = `${MEDIA_CACHE_DIR}/${hash}.bin`;
        if (!existsSync(binPath)) return;
        const storageKey = assetRows.get(info.assetId);
        if (!storageKey) return;
        const origBuf = readFileSync(binPath);
        const { detail, thumb } = await compressImage(origBuf);
        await r2Put(storageKey, detail, 'image/webp');
        await r2Put(`library/${info.assetId}_thumb-v2.webp`, thumb, 'image/webp');
        db.prepare('UPDATE MediaAsset SET size=? WHERE id=?').run(detail.length, info.assetId);
        upgraded++;
      }));
    }
    console.log(`Upgraded ${upgraded} images (detail q94 + thumb 480px q70)`);
  }

  // 2. Restore full paraphrased review articles + inline images + MediaUsage tracking
  const rows = db.prepare('SELECT p.id, p.slug, s.draft, s.published, s.revision FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL').all();
  let restoredReviews = 0;
  let totalContentImgsLinked = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of rows) {
      const doc = JSON.parse(r.published || r.draft);
      const prep = prepBySlug.get(r.slug) || prepBySlug.get(doc.slug);
      const imgUrlMap = new Map();
      if (prep?.contentImgUrls?.length) {
        for (const u of prep.contentImgUrls) {
          const info = urlMap[u];
          if (info && assetRows.has(info.assetId)) imgUrlMap.set(u, info.url);
        }
      }
      const html = buildEditorialReviewHtml({
        cleanName: doc.name,
        categoryId: doc.categoryId,
        brand: doc.brand,
        specs: doc.specs || [],
        rawContent: prep?.rawContent || '',
        imgUrlMap,
        isAccessory: doc.template !== 'LAPTOP',
      });
      if (prep?.rawContent && prep.rawContent.length > 350) restoredReviews++;

      doc.contentHtml = html;
      const json = JSON.stringify(doc);
      const nextRev = r.revision + 1;
      db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action,actor) VALUES(?,?,?,'publish','citilap-review-sync')").run(r.id, nextRev, json);
      db.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').run(json, json, nextRev, nextRev, r.id);
      db.prepare('UPDATE Product SET contentHtml=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?').run(html, r.id);

      // Track inline /api/library/<id> images in MediaUsage so they are not treated as unused
      const contentIds = [...new Set([...html.matchAll(/\/api\/library\/([a-f0-9-]{36})/gi)].map((m) => m[1]))];
      for (const assetId of contentIds) {
        if (!assetRows.has(assetId)) continue;
        db.prepare("INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'PRODUCT_REVISION',?,?)")
          .run(randomUUID(), assetId, r.id, `${nextRev}:content:${assetId}`);
        totalContentImgsLinked++;
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`Updated ${rows.length} products (${restoredReviews} full paraphrased reviews, ${totalContentImgsLinked} content image links)`);

  // 3. Delete ALL unused images from D1 + R2
  const unused = db.prepare(`
    SELECT id, folder, storageKey, size FROM MediaAsset
    WHERE kind='IMAGE'
      AND id NOT IN (SELECT assetId FROM MediaUsage)
  `).all();
  let deletedCount = 0;
  let freedBytes = 0;
  for (const a of unused) {
    try {
      db.prepare('DELETE FROM MediaAsset WHERE id=?').run(a.id);
      if (a.storageKey) await r2Del(a.storageKey);
      await r2Del(`library/${a.id}_thumb-v2.webp`);
      deletedCount++;
      freedBytes += a.size || 0;
    } catch (err) {
      console.warn('Could not delete asset', a.id, String(err));
    }
  }
  console.log(`Deleted ${deletedCount} unused images (${(freedBytes / 1048576).toFixed(2)} MB freed)`);
  console.log('Remaining MediaAsset:', db.prepare('SELECT folder, count(*) n, round(sum(size)/1048576.0, 2) mb FROM MediaAsset GROUP BY folder').all());
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'Foreign key check failed');
} finally {
  await mf.dispose();
  db.close();
}
