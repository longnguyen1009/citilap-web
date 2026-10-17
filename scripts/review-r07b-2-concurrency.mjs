// Review repro only: isolated ephemeral D1, no local dev/remote DB or HTTP writes.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

await build({
  stdin: { contents: "export * from './src/server/services/campaign.service'; export * from './src/server/services/pricing.service';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', external: ['cloudflare:workers', 'node:*'],
  plugins: [{ name: 'review-externals', setup(b) {
    b.onResolve({ filter: /\.wasm/ }, args => ({ path: args.path, external: true }));
    b.onResolve({ filter: /^server-only$/ }, args => ({ path: args.path, namespace: 'review-empty' }));
    b.onLoad({ filter: /.*/, namespace: 'review-empty' }, () => ({ contents: '' }));
  } }], outfile: 'scripts/.review-r07b-2-bundle.mjs',
});
const api = await import('./.review-r07b-2-bundle.mjs');
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: 'export default {fetch(){return new Response("review");}}',
  compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'],
}));

try {
  const db = await mf.getD1Database('DB');
  for (const f of (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`, 'utf8'))) {
      if (sql.trim()) await db.prepare(sql).run();
    }
  }
  await db.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('review-cat','Review','review-cat',CURRENT_TIMESTAMP)").run();
  await db.prepare(`INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt)
    VALUES('review-p','Review product','review-p','Review',20000000,'review-cat','ACTIVE',CURRENT_TIMESTAMP)`).run();
  const doc = {
    name: 'Review campaign', status: 'DRAFT', startAt: '2030-01-01T00:00:00.000Z', endAt: '2030-02-01T00:00:00.000Z',
    items: [{ productId: 'review-p', variantId: null, salePrice: 15000000, regularPrice: 20000000 }],
  };

  // Deterministically interleave a winning revision change after the service precheck,
  // immediately before its batch. All actual SQL executes against real isolated D1.
  const c = await api.saveCampaign(doc, db);
  const interleavedDb = {
    prepare: db.prepare.bind(db),
    batch: async statements => {
      await db.prepare('UPDATE PromotionCampaign SET revision=revision+1 WHERE id=?').bind(c.id).run();
      return db.batch(statements);
    },
  };
  let conflict;
  try {
    await api.saveCampaign({ ...doc, id: c.id, expectedRevision: c.revision,
      items: [{ ...doc.items[0], salePrice: 12000000 }] }, interleavedDb);
  } catch (err) { conflict = err; }
  const savedItem = await db.prepare('SELECT salePrice FROM PromotionCampaignItem WHERE campaignId=?').bind(c.id).first();
  assert.equal(conflict?.code, 'CAMPAIGN_REVISION_CONFLICT');
  assert.equal(savedItem.salePrice, 15000000, 'CAS loser must NOT mutate items');
  console.log(JSON.stringify({
    regression: 'CAS loser causes zero side effects',
    code: conflict.code,
    beforeSalePrice: 15000000,
    afterSalePrice: savedItem.salePrice,
    defectReproduced: false,
    invariantHeld: true
  }));

  // Force both overlap reads to finish before either publication write.
  const a = await api.saveCampaign({ ...doc, name: 'Concurrent A' }, db);
  const b = await api.saveCampaign({ ...doc, name: 'Concurrent B' }, db);
  let arrivals = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const concurrentDb = {
    prepare(sql) {
      const statement = db.prepare(sql);
      if (!sql.includes('JOIN PromotionCampaignItem')) return statement;
      return { bind(...params) {
        const bound = statement.bind(...params);
        return { async all() {
          const rows = await bound.all();
          if (++arrivals === 2) release();
          await gate;
          return rows;
        } };
      } };
    },
    batch: db.batch.bind(db),
  };
  const results = await Promise.allSettled([
    api.publishCampaign(a.id, a.revision, concurrentDb),
    api.publishCampaign(b.id, b.revision, concurrentDb),
  ]);
  const count = await db.prepare("SELECT COUNT(*) AS n FROM PromotionCampaign WHERE status='PUBLISHED'").first();
  const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
  const rejectedCount = results.filter(r => r.status === 'rejected').length;
  assert.equal(fulfilledCount, 1, 'Exactly one concurrent publication must succeed');
  assert.equal(rejectedCount, 1, 'Exactly one concurrent publication must be rejected');
  assert.equal(count.n, 1, 'Exactly one campaign must be PUBLISHED in DB');
  console.log(JSON.stringify({
    regression: 'Concurrent overlapping publications guarded atomically',
    outcomes: results.map(r => r.status),
    publishedCount: count.n,
    defectReproduced: false,
    invariantHeld: true
  }));

  const settings = { flashSaleEnabled: false, flashSaleTitle: '', flashSaleStartAt: '', flashSaleEndAt: '' };
  let missingProductError = null;
  try {
    await api.resolvePrice({ productId: 'does-not-exist', settings, explicitDb: db });
  } catch (err) {
    missingProductError = err;
  }
  assert.equal(missingProductError?.code, 'PRODUCT_NOT_FOUND', 'Missing product must reject with PRODUCT_NOT_FOUND');
  assert.equal(missingProductError?.statusCode, 404);

  let missingVariantError = null;
  try {
    await api.resolvePrice({ productId: 'review-p', variantId: 'does-not-exist', settings, explicitDb: db });
  } catch (err) {
    missingVariantError = err;
  }
  assert.equal(missingVariantError?.code, 'VARIANT_NOT_FOUND', 'Missing variant must reject with VARIANT_NOT_FOUND');
  assert.equal(missingVariantError?.statusCode, 404);

  console.log(JSON.stringify({
    regression: 'Strict resolver rejects missing targets',
    missingProductCode: missingProductError.code,
    missingVariantCode: missingVariantError.code,
    defectReproduced: false,
    invariantHeld: true
  }));
} finally {
  await mf.dispose();
}
