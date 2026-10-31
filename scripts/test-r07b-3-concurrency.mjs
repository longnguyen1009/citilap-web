import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('=== CITILAP R07B.3 — CONCURRENCY, ATOMIC OVERLAP & STRICT RESOLVER SUITE ===\n');

// 1. Build bundle for service testing on isolated D1
await build({
  stdin: {
    contents: `
      export * from './src/server/services/pricing.service';
      export * from './src/server/services/campaign.service';
      export * from './src/server/services/settings.service';
      export * from './src/server/services/catalog.service';
      export * from './src/server/services/order.service';
      export * from './src/server/services/product-studio.service';
      export * from './src/contracts/cms/campaign';
      export * from './src/contracts/cms/settings';
      export * from './src/lib/prisma';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['cloudflare:workers', 'node:*'],
  plugins: [
    {
      name: 'wasm-external',
      setup(b) {
        b.onResolve({ filter: /\.wasm/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
    {
      name: 'mock-server-only',
      setup(b) {
        b.onResolve({ filter: /^server-only$/ }, (args) => ({ path: args.path, namespace: 'server-only-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'server-only-ns' }, () => ({ contents: '' }));
      },
    },
  ],
  outfile: 'scripts/.r07b-3-test-bundle.mjs',
});

const api = await import('./.r07b-3-test-bundle.mjs');

// 2. Initialize isolated Miniflare environment
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r07b-3-test"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

let passed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    throw err;
  }
};

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  api.setD1Database(DB);

  // Apply all 20 migrations cleanly
  const migrationFiles = (await readdir('d1-migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    const statements = unstable_splitSqlQuery(sql);
    for (const statement of statements) {
      if (statement.trim()) {
        await DB.prepare(statement).run();
      }
    }
  }

  // Seed core fixtures
  await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-1', 'Laptops', 'laptops', CURRENT_TIMESTAMP)").run();
  
  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, isFeatured, updatedAt)
    VALUES('prod-active-1', 'Active Laptop 1', 'active-laptop-1', 'Desc', 20000000, 25000000, 'cat-1', 'ACTIVE', 1, CURRENT_TIMESTAMP)
  `).run();

  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, updatedAt)
    VALUES('prod-inactive', 'Inactive Laptop', 'inactive-laptop', 'Desc', 18000000, 20000000, 'cat-1', 'INACTIVE', CURRENT_TIMESTAMP)
  `).run();

  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, updatedAt)
    VALUES('prod-active-2', 'Active Laptop 2', 'active-laptop-2', 'Desc', 30000000, 35000000, 'cat-1', 'ACTIVE', CURRENT_TIMESTAMP)
  `).run();

  // Seed active variant for prod-active-1
  await DB.prepare(`
    INSERT INTO ProductVariant(id, productId, name, sku, price, originalPrice, stock, status, options, updatedAt)
    VALUES('var-active-1', 'prod-active-1', '16GB RAM', 'SKU-ACT-1', 22000000, 26000000, 10, 'ACTIVE', '{}', CURRENT_TIMESTAMP)
  `).run();

  // Seed inactive variant for prod-active-1
  await DB.prepare(`
    INSERT INTO ProductVariant(id, productId, name, sku, price, originalPrice, stock, status, options, updatedAt)
    VALUES('var-inactive-1', 'prod-active-1', '32GB RAM Inactive', 'SKU-INACT-1', 25000000, 29000000, 0, 'INACTIVE', '{}', CURRENT_TIMESTAMP)
  `).run();

  // Seed variant for prod-active-2
  await DB.prepare(`
    INSERT INTO ProductVariant(id, productId, name, sku, price, originalPrice, stock, status, options, updatedAt)
    VALUES('var-prod2', 'prod-active-2', 'Prod2 Variant', 'SKU-P2', 32000000, 37000000, 5, 'ACTIVE', '{}', CURRENT_TIMESTAMP)
  `).run();

  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, isFeatured, updatedAt)
    VALUES('prod-featured-solo', 'Solo Laptop', 'solo-laptop', 'Desc', 20000000, 25000000, 'cat-1', 'ACTIVE', 1, CURRENT_TIMESTAMP)
  `).run();

  // Seed product studio docs
  await DB.prepare(`
    INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
    VALUES('prod-active-1', 1, '{}', '{"availability":"AVAILABLE"}', CURRENT_TIMESTAMP)
  `).run();

  await DB.prepare(`
    INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
    VALUES('prod-featured-solo', 1, '{}', '{"availability":"AVAILABLE"}', CURRENT_TIMESTAMP)
  `).run();

  await DB.prepare(`
    INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
    VALUES('prod-active-2', 1, '{}', '{"availability":"AVAILABLE"}', CURRENT_TIMESTAMP)
  `).run();

  await DB.prepare(`
    INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
    VALUES('prod-inactive', 1, '{}', '{"availability":"CONTACT"}', CURRENT_TIMESTAMP)
  `).run();

  // =========================================================================
  // TEST SECTION 1: DETERMINISTIC CAS CONCURRENCY & ZERO SIDE EFFECTS
  // =========================================================================
  console.log('--- SECTION 1: Deterministic CAS Concurrency & Zero Side Effects ---');

  await check('CAS loser request throws 409 CAMPAIGN_REVISION_CONFLICT and leaves DB completely unchanged', async () => {
    const initialDoc = {
      name: 'Original Campaign',
      status: 'DRAFT',
      startAt: '2030-01-01T00:00:00.000Z',
      endAt: '2030-01-10T00:00:00.000Z',
      items: [
        { productId: 'prod-active-1', variantId: null, salePrice: 15000000, regularPrice: 20000000 },
      ],
    };

    const campaign = await api.saveCampaign(initialDoc, DB);
    assert.equal(campaign.revision, 0);

    // Simulate concurrent writer incrementing revision right before batch execution
    const interleavedDb = {
      prepare: DB.prepare.bind(DB),
      batch: async (statements) => {
        // Interleaved writer updates campaign name and increments revision to 1
        await DB.prepare("UPDATE PromotionCampaign SET name = 'Winner Edit', revision = revision + 1 WHERE id = ?")
          .bind(campaign.id)
          .run();
        return DB.batch(statements);
      },
    };

    let loserConflict = null;
    try {
      await api.saveCampaign(
        {
          ...initialDoc,
          id: campaign.id,
          expectedRevision: 0,
          name: 'Loser Overwrite Title',
          items: [
            { productId: 'prod-active-1', variantId: null, salePrice: 12000000, regularPrice: 20000000 },
          ],
        },
        interleavedDb
      );
    } catch (err) {
      loserConflict = err;
    }

    assert.ok(loserConflict, 'Loser must throw error');
    assert.equal(loserConflict.code, 'CAMPAIGN_REVISION_CONFLICT', 'Must throw CAMPAIGN_REVISION_CONFLICT');
    assert.equal(loserConflict.statusCode, 409);

    // Verify ZERO side effects on DB
    const currentCampaign = await api.getCampaignById(campaign.id, DB);
    assert.equal(currentCampaign.name, 'Winner Edit', 'Campaign title must belong to winner, NOT loser');
    assert.equal(currentCampaign.revision, 1, 'Revision must be 1');

    const items = await DB.prepare('SELECT * FROM PromotionCampaignItem WHERE campaignId = ?').bind(campaign.id).all();
    assert.equal(items.results.length, 1);
    assert.equal(items.results[0].salePrice, 15000000, 'salePrice must remain 15tr, NOT mutated to 12tr by loser');
  });

  // =========================================================================
  // TEST SECTION 2: ATOMIC OVERLAP PREVENTION (PUBLISH & CREATE-PUBLISHED)
  // =========================================================================
  console.log('--- SECTION 2: Atomic Overlap Prevention Across All Paths ---');

  await check('Concurrent publish of overlapping campaigns: exactly 1 succeeds, 1 gets 409, DB has 1 PUBLISHED', async () => {
    const docA = {
      name: 'Overlapping Camp A',
      status: 'DRAFT',
      startAt: '2030-05-01T00:00:00.000Z',
      endAt: '2030-05-15T00:00:00.000Z',
      items: [{ productId: 'prod-active-1', variantId: null, salePrice: 16000000, regularPrice: 20000000 }],
    };
    const docB = {
      name: 'Overlapping Camp B',
      status: 'DRAFT',
      startAt: '2030-05-10T00:00:00.000Z',
      endAt: '2030-05-20T00:00:00.000Z',
      items: [{ productId: 'prod-active-1', variantId: null, salePrice: 17000000, regularPrice: 20000000 }],
    };

    const campA = await api.saveCampaign(docA, DB);
    const campB = await api.saveCampaign(docB, DB);

    // Simulate concurrent publish reads before either writes
    let arrivals = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });

    const concurrentDb = {
      prepare(sql) {
        const stmt = DB.prepare(sql);
        if (!sql.includes('JOIN PromotionCampaignItem')) return stmt;
        return {
          bind(...params) {
            const bound = stmt.bind(...params);
            return {
              async all() {
                const rows = await bound.all();
                if (++arrivals === 2) release();
                await gate;
                return rows;
              },
            };
          },
        };
      },
      batch: DB.batch.bind(DB),
    };

    const results = await Promise.allSettled([
      api.publishCampaign(campA.id, campA.revision, concurrentDb),
      api.publishCampaign(campB.id, campB.revision, concurrentDb),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one concurrent publish must succeed');
    assert.equal(rejected.length, 1, 'Exactly one concurrent publish must fail');
    assert.equal(rejected[0].reason.code, 'CAMPAIGN_OVERLAP_CONFLICT', 'Loser must fail with CAMPAIGN_OVERLAP_CONFLICT');

    // DB invariant
    const publishedCount = await DB.prepare("SELECT COUNT(*) AS count FROM PromotionCampaign WHERE status = 'PUBLISHED' AND id IN (?, ?)")
      .bind(campA.id, campB.id)
      .first();
    assert.equal(publishedCount.count, 1, 'Exactly one campaign must be PUBLISHED in DB');
  });

  await check('Creating a campaign directly with status=PUBLISHED that overlaps existing published campaign is blocked', async () => {
    let overlapError = null;
    try {
      await api.saveCampaign(
        {
          name: 'Directly Published Overlap',
          status: 'PUBLISHED',
          startAt: '2030-05-02T00:00:00.000Z',
          endAt: '2030-05-12T00:00:00.000Z',
          items: [{ productId: 'prod-active-1', variantId: null, salePrice: 14000000, regularPrice: 20000000 }],
        },
        DB
      );
    } catch (err) {
      overlapError = err;
    }

    assert.ok(overlapError, 'Must reject directly published overlapping campaign');
    assert.equal(overlapError.code, 'CAMPAIGN_OVERLAP_CONFLICT');
  });

  // =========================================================================
  // TEST SECTION 3: REAL SQL FAILURE INSIDE BATCH ROLLS BACK ENTIRELY
  // =========================================================================
  console.log('--- SECTION 3: Real SQL Failure Inside Batch Aborts Atomically ---');

  await check('Intentional SQL trigger abort inside batch causes complete rollback of campaign & items', async () => {
    // Install a deliberate trigger on PromotionCampaignItem
    await DB.prepare(`
      CREATE TRIGGER IF NOT EXISTS test_deliberate_abort
      BEFORE INSERT ON PromotionCampaignItem
      WHEN NEW.salePrice = 9999999
      BEGIN
        SELECT RAISE(ABORT, 'DELIBERATE_TRIGGER_ABORT');
      END;
    `).run();

    const initialDoc = {
      name: 'Safe Rollback Campaign',
      status: 'DRAFT',
      startAt: '2030-06-01T00:00:00.000Z',
      endAt: '2030-06-15T00:00:00.000Z',
      items: [
        { productId: 'prod-active-1', variantId: null, salePrice: 18000000, regularPrice: 20000000 },
      ],
    };

    const campaign = await api.saveCampaign(initialDoc, DB);
    assert.equal(campaign.revision, 0);

    // Attempt update that alters title AND attempts to insert an item triggering the abort
    let batchError = null;
    try {
      await api.saveCampaign(
        {
          ...initialDoc,
          id: campaign.id,
          expectedRevision: 0,
          name: 'Mutated Title Before Abort',
          items: [
            { productId: 'prod-active-1', variantId: null, salePrice: 9999999, regularPrice: 20000000 },
          ],
        },
        DB
      );
    } catch (err) {
      batchError = err;
    }

    assert.ok(batchError, 'Batch must fail and throw error');

    // Verify complete rollback: title must NOT have changed, revision must NOT have incremented, existing items intact
    const afterCampaign = await api.getCampaignById(campaign.id, DB);
    assert.equal(afterCampaign.name, 'Safe Rollback Campaign', 'Campaign title must roll back');
    assert.equal(afterCampaign.revision, 0, 'Campaign revision must roll back');

    const items = await DB.prepare('SELECT * FROM PromotionCampaignItem WHERE campaignId = ?').bind(campaign.id).all();
    assert.equal(items.results.length, 1);
    assert.equal(items.results[0].salePrice, 18000000, 'Original item must remain intact');

    // Clean up test trigger
    await DB.prepare('DROP TRIGGER IF EXISTS test_deliberate_abort').run();
  });

  // =========================================================================
  // TEST SECTION 4: STRICT RESOLVER TARGET VALIDATION
  // =========================================================================
  console.log('--- SECTION 4: Strict Resolver Target Validation ---');

  const emptySettings = { flashSaleEnabled: false, flashSaleTitle: '', flashSaleStartAt: '', flashSaleEndAt: '' };

  await check('resolvePrice throws PRODUCT_NOT_FOUND (404) on non-existent product', async () => {
    let err = null;
    try {
      await api.resolvePrice({ productId: 'prod-non-existent', settings: emptySettings, explicitDb: DB });
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Must throw error');
    assert.equal(err.code, 'PRODUCT_NOT_FOUND');
    assert.equal(err.statusCode, 404);
  });

  await check('resolvePrice throws VARIANT_NOT_FOUND (404) on non-existent variant', async () => {
    let err = null;
    try {
      await api.resolvePrice({ productId: 'prod-active-1', variantId: 'var-non-existent', settings: emptySettings, explicitDb: DB });
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Must throw error');
    assert.equal(err.code, 'VARIANT_NOT_FOUND');
    assert.equal(err.statusCode, 404);
  });

  await check('resolvePrice throws VARIANT_NOT_FOUND (404) when variant belongs to different product', async () => {
    let err = null;
    try {
      // var-prod2 belongs to prod-active-2, NOT prod-active-1
      await api.resolvePrice({ productId: 'prod-active-1', variantId: 'var-prod2', settings: emptySettings, explicitDb: DB });
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Must throw error');
    assert.equal(err.code, 'VARIANT_NOT_FOUND');
    assert.equal(err.statusCode, 404);
  });

  await check('resolvePrice throws PRODUCT_NOT_AVAILABLE (400) on inactive/draft product', async () => {
    let err = null;
    try {
      await api.resolvePrice({ productId: 'prod-inactive', settings: emptySettings, explicitDb: DB });
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Must throw error');
    assert.equal(err.code, 'PRODUCT_NOT_AVAILABLE');
    assert.equal(err.statusCode, 400);
  });

  await check('resolvePrice throws VARIANT_NOT_AVAILABLE (400) on inactive variant', async () => {
    let err = null;
    try {
      await api.resolvePrice({ productId: 'prod-active-1', variantId: 'var-inactive-1', settings: emptySettings, explicitDb: DB });
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Must throw error');
    assert.equal(err.code, 'VARIANT_NOT_AVAILABLE');
    assert.equal(err.statusCode, 400);
  });

  // =========================================================================
  // TEST SECTION 5: MANDATORY expectedRevision VALIDATION
  // =========================================================================
  console.log('--- SECTION 5: Mandatory expectedRevision Validation ---');

  await check('saveCampaign on existing campaign rejects missing expectedRevision with MISSING_EXPECTED_REVISION', async () => {
    const existing = await api.saveCampaign({
      name: 'Rev Test Camp',
      status: 'DRAFT',
      startAt: '2030-07-01T00:00:00.000Z',
      endAt: '2030-07-10T00:00:00.000Z',
      items: [{ productId: 'prod-active-1', variantId: null, salePrice: 15000000, regularPrice: 20000000 }],
    }, DB);

    let err = null;
    try {
      await api.saveCampaign({
        id: existing.id,
        name: 'Updated Name Without expectedRevision',
        status: 'DRAFT',
        startAt: '2030-07-01T00:00:00.000Z',
        endAt: '2030-07-10T00:00:00.000Z',
        items: [{ productId: 'prod-active-1', variantId: null, salePrice: 15000000, regularPrice: 20000000 }],
      }, DB);
    } catch (e) {
      err = e;
    }
    assert.ok(err);
    assert.equal(err.code, 'MISSING_EXPECTED_REVISION');
  });

  await check('saveCampaign rejects negative or fractional expectedRevision with INVALID_EXPECTED_REVISION', async () => {
    const existing = await api.listCampaigns(DB);
    const id = existing[0].id;

    for (const badRev of [-1, 1.5, '0', NaN]) {
      let err = null;
      try {
        await api.saveCampaign({
          id,
          expectedRevision: badRev,
          name: 'Bad Rev Update',
          status: 'DRAFT',
          startAt: '2030-07-01T00:00:00.000Z',
          endAt: '2030-07-10T00:00:00.000Z',
          items: [{ productId: 'prod-active-1', variantId: null, salePrice: 15000000, regularPrice: 20000000 }],
        }, DB);
      } catch (e) {
        err = e;
      }
      assert.ok(err, `Must reject bad revision: ${badRev}`);
      assert.equal(err.code, 'INVALID_EXPECTED_REVISION');
    }
  });

  await check('publishCampaign and archiveCampaign reject invalid or missing expectedRevision', async () => {
    const existing = await api.listCampaigns(DB);
    const id = existing[0].id;

    let pubErr = null;
    try {
      await api.publishCampaign(id, -1, DB);
    } catch (e) {
      pubErr = e;
    }
    assert.equal(pubErr?.code, 'INVALID_EXPECTED_REVISION');

    let archErr = null;
    try {
      await api.archiveCampaign(id, 2.7, DB);
    } catch (e) {
      archErr = e;
    }
    assert.equal(archErr?.code, 'INVALID_EXPECTED_REVISION');
  });

  // =========================================================================
  // TEST SECTION 6: UNIFIED PRICING WITH INJECTED FIXED CLOCKS
  // =========================================================================
  console.log('--- SECTION 6: Unified Pricing Across Readers With Fixed Clock ---');

  await check('Catalog reader resolves single pricingContext at fixed clock boundaries correctly', async () => {
    // Create and publish a campaign active from 2026-11-01 to 2026-11-10
    const camp = await api.saveCampaign({
      name: 'November Super Sale',
      status: 'DRAFT',
      startAt: '2026-11-01T00:00:00.000Z',
      endAt: '2026-11-10T00:00:00.000Z',
      items: [
        { productId: 'prod-featured-solo', variantId: null, salePrice: 14500000, regularPrice: 20000000 },
      ],
    }, DB);
    await api.publishCampaign(camp.id, camp.revision, DB);

    // 1. Before campaign start (2026-10-31T23:59:59Z) -> regular price 20tr
    const beforeDate = new Date('2026-10-31T23:59:59.000Z');
    const ctxBefore = await api.getStorefrontPricingContext(DB, beforeDate);
    const prodBefore = await api.getFeaturedProducts(10, ctxBefore, beforeDate);
    const itemBefore = prodBefore.find((p) => p.id === 'prod-featured-solo');
    assert.ok(itemBefore);
    assert.equal(itemBefore.price, 20000000);
    assert.equal(itemBefore.isOnSale, false);

    // 2. During campaign (2026-11-05T12:00:00Z) -> salePrice 14.5tr
    const duringDate = new Date('2026-11-05T12:00:00.000Z');
    const ctxDuring = await api.getStorefrontPricingContext(DB, duringDate);
    const prodDuring = await api.getFeaturedProducts(10, ctxDuring, duringDate);
    const itemDuring = prodDuring.find((p) => p.id === 'prod-featured-solo');
    assert.ok(itemDuring);
    assert.equal(itemDuring.price, 14500000);
    assert.equal(itemDuring.isOnSale, true);

    // 3. Exact end boundary (2026-11-10T00:00:00Z) -> regular price 20tr (half-open [startAt, endAt))
    const endDate = new Date('2026-11-10T00:00:00.000Z');
    const ctxEnd = await api.getStorefrontPricingContext(DB, endDate);
    const prodEnd = await api.getFeaturedProducts(10, ctxEnd, endDate);
    const itemEnd = prodEnd.find((p) => p.id === 'prod-featured-solo');
    assert.ok(itemEnd);
    assert.equal(itemEnd.price, 20000000);
    assert.equal(itemEnd.isOnSale, false);
  });

  // =========================================================================
  // TEST SECTION 7: HTTP REVALIDATION BOUNDING & AVAILABILITY CONTRACTS
  // =========================================================================
  console.log('--- SECTION 7: HTTP Cart Revalidation Bounding & Availability ---');

  await check('POST /api/cart/revalidate rejects > 50 items with 400 TOO_MANY_ITEMS', async () => {
    const tooManyItems = Array.from({ length: 51 }, (_, i) => ({
      id: `item-${i}`,
      productId: 'prod-active-1',
    }));
    const res = await fetch('http://localhost:3001/api/cart/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: tooManyItems }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'TOO_MANY_ITEMS');
  });

  await check('POST /api/cart/revalidate rejects invalid item shape with 400 INVALID_CART_ITEM', async () => {
    const res = await fetch('http://localhost:3001/api/cart/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 'item-1', productId: '   ' }] }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'INVALID_CART_ITEM');
  });

  await check('POST /api/cart/revalidate marks non-existent product as available: false with PRODUCT_NOT_FOUND', async () => {
    const res = await fetch('http://localhost:3001/api/cart/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'missing-item-1', productId: 'non-existent-product-id' }],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].available, false);
    assert.equal(data.items[0].unavailableReason, 'PRODUCT_NOT_FOUND');
  });

  console.log('\n==========================================');
  console.log(`TOTAL R07B.3 TESTS: ${passed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: 0`);
  console.log('==========================================\n');
  console.log('🌟 ALL R07B.3 CONCURRENCY & STRICT RESOLVER TESTS PASSED!\n');

} finally {
  await mf.dispose();
}
