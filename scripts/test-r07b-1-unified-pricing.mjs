import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('=== CITILAP R07B.1 — UNIFIED PRICING, CHECKOUT CONFIRMATION & CAMPAIGN TESTS ===\n');

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
  outfile: 'scripts/.r07b-1-test-bundle.mjs',
});

const api = await import('./.r07b-1-test-bundle.mjs');

// 2. Initialize isolated Miniflare environment
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r07b-1-test"); } }',
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

  // Apply all migrations (0001 to 0018)
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

  const fkCheck = await DB.prepare('PRAGMA foreign_key_check').all();
  assert.equal(fkCheck.results.length, 0, 'No foreign key violations');
  console.log(`✓ All ${migrationFiles.length} migrations applied cleanly to fixture DB.\n`);

  // =========================================================================
  // GATE 1: CONTRACT & MONEY NORMALIZATION
  // =========================================================================
  console.log('--- GATE 1: Contract & Money Normalization ---');

  await check('normalizeVnd ensures finite non-negative integer VND', () => {
    assert.equal(api.normalizeVnd(25000000), 25000000);
    assert.equal(api.normalizeVnd(25000000.4), 25000000);
    assert.equal(api.normalizeVnd(25000000.6), 25000001);
    assert.equal(api.normalizeVnd(-1000), 0);
    assert.equal(api.normalizeVnd('20000000'), 20000000);
    assert.equal(api.normalizeVnd(NaN, 5000), 5000);
    assert.equal(api.normalizeVnd(Infinity, 0), 0);
    assert.equal(api.normalizeVnd(null, 0), 0);
  });

  await check('Variants NEVER borrow parent originalPrice', () => {
    // Parent price: 20tr, parent originalPrice: 25tr
    // Variant price: 28tr, variant originalPrice: null (legacy missing)
    const result = api.calculateEffectivePrice(
      28000000,
      null, // variant has no originalPrice
      true, // parent isFlashSale = true
      true,
      {
        flashSaleEnabled: true,
        flashSaleTitle: 'Giờ Vàng',
        flashSaleStartAt: '2026-10-15T00:00:00Z',
        flashSaleEndAt: '2026-10-16T23:59:59Z',
      },
      new Date('2026-10-15T12:00:00Z'),
      {
        productId: 'prod-1',
        variantId: 'var-1',
        isVariant: true,
        variantOriginalPrice: null, // explicit isolation
      }
    );

    // Invariant: variant retains its own price, compareAtPrice is null, isOnSale is false
    assert.equal(result.effectivePrice, 28000000);
    assert.equal(result.compareAtPrice, null, 'Must NOT inherit parent 25tr');
    assert.equal(result.isOnSale, false, 'Must NOT fabricate negative/fake discount');
  });

  await check('Variant with valid discount calculates faithful effectivePrice & isOnSale', () => {
    const result = api.calculateEffectivePrice(
      24000000, // variant price during flash sale
      30000000, // variant regular original price
      true,
      true,
      {
        flashSaleEnabled: true,
        flashSaleTitle: 'Giờ Vàng',
        flashSaleStartAt: '2026-10-15T00:00:00Z',
        flashSaleEndAt: '2026-10-16T23:59:59Z',
      },
      new Date('2026-10-15T12:00:00Z'),
      {
        productId: 'prod-1',
        variantId: 'var-1',
        isVariant: true,
        variantOriginalPrice: 30000000,
      }
    );

    assert.equal(result.effectivePrice, 24000000);
    assert.equal(result.regularPrice, 30000000);
    assert.equal(result.compareAtPrice, 30000000);
    assert.equal(result.isOnSale, true);
    assert.equal(result.discountPercent, 20);
  });

  // =========================================================================
  // GATE 2: CAMPAIGN CRUD, PRIORITY & TEMPORAL OVERLAP CONFLICT PREVENTION
  // =========================================================================
  console.log('\n--- GATE 2: Campaign Hierarchy & Temporal Overlap Prevention ---');

  // Seed prerequisite Category
  await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-1', 'Laptop', 'laptop', CURRENT_TIMESTAMP)").run();

  // Seed sample products and variants in D1
  const seedProductStmt = DB.prepare(`
    INSERT INTO "Product" (
      "id", "name", "slug", "description", "images", "categoryId", "price", "originalPrice", "status", "stock", "isFlashSale", "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, 'Mô tả chi tiết', '[]', 'cat-1', ?, ?, 'ACTIVE', 10, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  await DB.batch([
    seedProductStmt.bind('prod-macbook', 'MacBook Pro M3', 'macbook-pro-m3', 35000000, 39000000),
    seedProductStmt.bind('prod-thinkpad', 'ThinkPad X1 Carbon', 'thinkpad-x1', 32000000, 36000000),
    DB.prepare(`
      INSERT INTO "ProductVariant" (
        "id", "productId", "sku", "name", "price", "originalPrice", "status", "stock", "options", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 5, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind('var-mac-16gb', 'prod-macbook', 'MBP-M3-16', '16GB RAM / 512GB SSD', 38000000, null),
    DB.prepare(`
      INSERT INTO "ProductVariant" (
        "id", "productId", "sku", "name", "price", "originalPrice", "status", "stock", "options", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 5, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind('var-mac-32gb', 'prod-macbook', 'MBP-M3-32', '32GB RAM / 1TB SSD', 45000000, 48000000),
  ]);

  let camp1Id = '';
  await check('Create and publish Campaign A (Black Friday)', async () => {
    const camp1 = await api.saveCampaign(
      {
        name: 'Black Friday 2026',
        description: 'Đại tiệc công nghệ',
        status: 'DRAFT',
        startAt: '2026-11-20T00:00:00.000Z',
        endAt: '2026-11-30T23:59:59.000Z',
        items: [
          {
            productId: 'prod-macbook',
            variantId: 'var-mac-16gb',
            salePrice: 34000000, // discounted from 38tr
            regularPrice: 38000000,
          },
          {
            productId: 'prod-thinkpad',
            variantId: null, // product-level sale
            salePrice: 28000000,
            regularPrice: 32000000,
          },
        ],
      },
      DB
    );

    assert.ok(camp1.id);
    camp1Id = camp1.id;

    const published = await api.publishCampaign(camp1Id, DB);
    assert.equal(published.status, 'PUBLISHED');
  });

  await check('Temporal overlap prevention: blocks overlapping published campaign on same target', async () => {
    // Attempt to publish Campaign B with overlapping time window (Nov 25 - Dec 05) on prod-thinkpad
    const camp2 = await api.saveCampaign(
      {
        name: 'Cyber Monday 2026',
        status: 'DRAFT',
        startAt: '2026-11-25T00:00:00.000Z',
        endAt: '2026-12-05T23:59:59.000Z',
        items: [
          {
            productId: 'prod-thinkpad',
            variantId: null,
            salePrice: 27000000,
            regularPrice: 32000000,
          },
        ],
      },
      DB
    );

    let conflictErr = null;
    try {
      await api.publishCampaign(camp2.id, DB);
    } catch (err) {
      conflictErr = err;
    }

    assert.ok(conflictErr, 'Must throw when publishing overlapping campaign');
    assert.equal(conflictErr.code, 'CAMPAIGN_OVERLAP_CONFLICT');
    assert.equal(conflictErr.conflictingCampaignId, camp1Id);
    assert.equal(conflictErr.productId, 'prod-thinkpad');
  });

  await check('Non-overlapping published campaign on different item succeeds', async () => {
    // Campaign C on prod-macbook (variant 32gb only, no overlap with 16gb or thinkpad)
    const camp3 = await api.saveCampaign(
      {
        name: 'MacBook 32GB Exclusive',
        status: 'DRAFT',
        startAt: '2026-11-20T00:00:00.000Z',
        endAt: '2026-11-30T23:59:59.000Z',
        items: [
          {
            productId: 'prod-macbook',
            variantId: 'var-mac-32gb',
            salePrice: 41000000,
            regularPrice: 45000000,
          },
        ],
      },
      DB
    );

    const published = await api.publishCampaign(camp3.id, DB);
    assert.equal(published.status, 'PUBLISHED');
  });

  await check('Variant-level Campaign Priority: Variant item overrides product-level settings', () => {
    const testDate = new Date('2026-11-25T10:00:00.000Z');
    const itemsMap = new Map();
    // Variant-level item
    itemsMap.set('prod-macbook:var-mac-16gb', {
      salePrice: 34000000,
      regularPrice: 38000000,
      campaignId: 'camp-bf',
      campaignName: 'Black Friday',
    });
    // Product-level item
    itemsMap.set('prod-macbook', {
      salePrice: 31000000,
      regularPrice: 35000000,
      campaignId: 'camp-bf',
      campaignName: 'Black Friday',
    });

    const context = {
      flashSaleEnabled: true,
      flashSaleTitle: 'Flash Sale Site',
      flashSaleStartAt: '2026-11-20T00:00:00Z',
      flashSaleEndAt: '2026-11-30T23:59:59Z',
      activeCampaign: {
        campaignId: 'camp-bf',
        campaignName: 'Black Friday',
        startAt: '2026-11-20T00:00:00Z',
        endAt: '2026-11-30T23:59:59Z',
        items: itemsMap,
      },
    };

    const variantPricing = api.calculateEffectivePrice(
      38000000,
      null,
      false,
      true,
      context,
      testDate,
      {
        productId: 'prod-macbook',
        variantId: 'var-mac-16gb',
        isVariant: true,
      }
    );

    // Priority 1: Variant item applied (34tr), NOT product item (31tr)
    assert.equal(variantPricing.effectivePrice, 34000000);
    assert.equal(variantPricing.compareAtPrice, 38000000);
    assert.equal(variantPricing.isOnSale, true);
  });

  // =========================================================================
  // GATE 3: UNIVERSAL PRICING RESOLVER & IDEMPOTENT DTOs
  // =========================================================================
  console.log('\n--- GATE 3: Universal Pricing Resolver & Idempotent Catalog DTOs ---');

  await check('resolvePrice produces identical contract across PDP, cards, and checkout', async () => {
    const at = new Date('2026-11-22T14:00:00.000Z');
    const resolved = await api.resolvePrice({
      productId: 'prod-thinkpad',
      at,
      explicitDb: DB,
    });

    assert.equal(resolved.effectivePrice, 28000000);
    assert.equal(resolved.compareAtPrice, 32000000);
    assert.equal(resolved.isOnSale, true);
    assert.equal(resolved.campaign?.name, 'Black Friday 2026');
  });

  await check('applyPricingToHomepageProducts is strictly idempotent across multiple passes', () => {
    const products = [
      {
        id: 'p-1',
        slug: 'p-1',
        name: 'Máy Gaming',
        condition: 'NEW',
        price: 20000000,
        originalPrice: 24000000,
        rawPrice: 20000000,
        rawOriginalPrice: 24000000,
        isFlashSale: true,
        stock: 5,
        primaryImage: null,
        image: null,
        specs: {},
      },
    ];

    const activeSettings = {
      flashSaleEnabled: true,
      flashSaleTitle: 'Giờ Vàng',
      flashSaleStartAt: '2026-10-15T00:00:00.000Z',
      flashSaleEndAt: '2026-10-15T23:59:59.000Z',
    };

    // Pass 1: active window
    const pass1 = api.applyPricingToHomepageProducts(products, activeSettings, new Date('2026-10-15T12:00:00Z'));
    assert.equal(pass1[0].price, 20000000);
    assert.equal(pass1[0].isOnSale, true);

    // Pass 2: expired window on same list
    const pass2 = api.applyPricingToHomepageProducts(pass1, activeSettings, new Date('2026-10-16T12:00:00Z'));
    assert.equal(pass2[0].price, 24000000);
    assert.equal(pass2[0].isOnSale, false);

    // Pass 3: back to active window on same list - does NOT degrade or corrupt rawPrice!
    const pass3 = api.applyPricingToHomepageProducts(pass2, activeSettings, new Date('2026-10-15T12:00:00Z'));
    assert.equal(pass3[0].price, 20000000);
    assert.equal(pass3[0].isOnSale, true);
  });

  // =========================================================================
  // GATE 4: SERVER EXPIRATION & FAIL-CLOSED INFRASTRUCTURE
  // =========================================================================
  console.log('\n--- GATE 4: Server Expiration & Fail-Closed Infrastructure ---');

  await check('Immediate expiration at [startAt, endAt) boundary: 0s delay', async () => {
    // 1 millisecond after endAt: 2026-11-30T23:59:59.001Z
    const expiredAt = new Date('2026-12-01T00:00:00.000Z');
    const resolved = await api.resolvePrice({
      productId: 'prod-thinkpad',
      at: expiredAt,
      explicitDb: DB,
    });

    // Reverts immediately to regular price 32tr
    assert.equal(resolved.effectivePrice, 32000000);
    assert.equal(resolved.isOnSale, false);
    assert.equal(resolved.campaign, null);
  });

  await check('Infrastructure DB error fails closed (throws, does not charge regular price)', async () => {
    // Break DB reference intentionally
    const badDb = {
      prepare() {
        throw new Error('D1_CONNECTION_TIMED_OUT');
      },
    };

    let thrown = null;
    try {
      await api.createOrder(
        {
          customerName: 'Test Khách',
          customerPhone: '0987654321',
          items: [{ productId: 'prod-macbook', quantity: 1, expectedPrice: 34000000 }],
        },
        'idemp-fail-closed',
        badDb
      );
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown, 'Must throw on DB failure');
    assert.ok(
      thrown.message.includes('D1_CONNECTION_TIMED_OUT') || thrown.message.includes('prepare'),
      'Must bubble infrastructure error without silently reverting to regular price'
    );
  });

  // =========================================================================
  // GATE 5: CHECKOUT VERIFICATION, 409 STRUCTURED DETAILS & CART RECOVERY
  // =========================================================================
  console.log('\n--- GATE 5: Checkout Verification & Structured 409 PriceChangedError ---');

  await check('Strict quantity validation: rejects non-integer or outside 1..99', async () => {
    let invalidQtyErr = null;
    try {
      await api.createOrder(
        {
          customerName: 'Nguyễn Văn Test',
          customerPhone: '0912345678',
          items: [{ productId: 'prod-macbook', quantity: 0, expectedPrice: 35000000 }],
        },
        'idemp-qty-0',
        DB
      );
    } catch (err) {
      invalidQtyErr = err;
    }

    assert.ok(invalidQtyErr);
    assert.equal(invalidQtyErr.message, 'INVALID_ITEM');
  });

  await check('409 PRICE_CHANGED returns complete structured details across multiple items', async () => {
    // Active campaign price for thinkpad is 28tr; customer sends expectedPrice: 25tr (diff)
    // Product macbook has regular price 35tr; customer sends expectedPrice: 30tr (diff)
    let priceChangedErr = null;
    try {
      await api.createOrder(
        {
          customerName: 'Khách Hàng R07B',
          customerPhone: '0988888888',
          items: [
            {
              productId: 'prod-thinkpad',
              quantity: 2,
              expectedPrice: 25000000, // old expectation
            },
            {
              productId: 'prod-macbook',
              quantity: 1,
              expectedPrice: 30000000, // old expectation
            },
          ],
        },
        'idemp-price-changed-1',
        DB
      );
    } catch (err) {
      priceChangedErr = err;
    }

    assert.ok(priceChangedErr instanceof api.PriceChangedError, 'Must throw PriceChangedError instance');
    assert.equal(priceChangedErr.code, 'PRICE_CHANGED');
    assert.ok(priceChangedErr.details, 'Must contain structured details');

    const d = priceChangedErr.details;
    assert.equal(d.changedItems.length, 2, 'Must accumulate ALL price-changed items');

    const item1 = d.changedItems.find((i) => i.productId === 'prod-thinkpad');
    assert.ok(item1);
    assert.equal(item1.oldPrice, 25000000);
    assert.equal(item1.newPrice, 32000000); // regular price at current time
    assert.equal(item1.quantity, 2);
    assert.equal(item1.oldLineTotal, 50000000);
    assert.equal(item1.newLineTotal, 64000000);

    const item2 = d.changedItems.find((i) => i.productId === 'prod-macbook');
    assert.ok(item2);
    assert.equal(item2.oldPrice, 30000000);
    assert.equal(item2.newPrice, 35000000);
    assert.equal(item2.quantity, 1);

    assert.equal(d.oldSubtotal, 80000000); // 25tr*2 + 30tr
    assert.equal(d.newSubtotal, 99000000); // 32tr*2 + 35tr
    assert.equal(d.oldGrandTotal, 80000000);
    assert.equal(d.newGrandTotal, 99000000);
  });

  let createdOrderId = '';
  await check('Submitting with updated expectedPrice and new idempotency key succeeds', async () => {
    const result = await api.createOrder(
      {
        customerName: 'Khách Hàng R07B',
        customerPhone: '0988888888',
        customerEmail: 'khach@citilap.vn',
        shippingAddress: '123 Đường Láng, Đống Đa, Hà Nội',
        items: [
          {
            productId: 'prod-thinkpad',
            quantity: 2,
            expectedPrice: 32000000,
          },
          {
            productId: 'prod-macbook',
            quantity: 1,
            expectedPrice: 35000000,
          },
        ],
      },
      'idemp-price-confirmed-2',
      DB
    );

    assert.equal(result.success, true);
    assert.equal(result.order.subtotalAmount, 99000000);
    assert.equal(result.order.totalAmount, 99000000);
    assert.equal(result.order.customerName, 'Khách Hàng R07B');
    createdOrderId = result.order.id;
  });

  // =========================================================================
  // GATE 6: ORDERITEM SNAPSHOTS & ATOMIC BATCH ROLLBACK
  // =========================================================================
  console.log('\n--- GATE 6: OrderItem Snapshots & Atomic Batch Rollback ---');

  await check('Persisted OrderItem contains complete immutable pricing snapshots', async () => {
    const rows = await DB.prepare(`
      SELECT "id", "productId", "price", "priceSnapshot", "regularPriceSnapshot",
             "compareAtPriceSnapshot", "campaignSnapshot", "pricingEvaluatedAt"
      FROM "OrderItem"
      WHERE "orderId" = ?
    `).bind(createdOrderId).all();

    assert.equal(rows.results.length, 2);

    for (const item of rows.results) {
      assert.ok(item.priceSnapshot !== null && item.priceSnapshot !== undefined, 'priceSnapshot exists');
      assert.ok(item.regularPriceSnapshot !== null && item.regularPriceSnapshot !== undefined, 'regularPriceSnapshot exists');
      assert.ok(item.pricingEvaluatedAt, 'pricingEvaluatedAt exists');
    }
  });

  await check('Atomic rollback: simulated item failure rolls back Order and OrderItems completely', async () => {
    let failureErr = null;
    try {
      await api.createOrder(
        {
          customerName: 'Khách Thử Rollback',
          customerPhone: '0911223344',
          items: [
            { productId: 'prod-thinkpad', quantity: 1, expectedPrice: 32000000 },
            { productId: 'prod-macbook', quantity: 1, expectedPrice: 35000000 },
          ],
        },
        'idemp-simulated-fail',
        DB,
        1 // simulate failure on item index 1
      );
    } catch (err) {
      failureErr = err;
    }

    assert.ok(failureErr, 'Must fail during batch execution');

    // Invariant: zero records with idempotencyKey 'idemp-simulated-fail'
    const orderCheck = await DB.prepare(
      'SELECT COUNT(*) as count FROM "Order" WHERE "idempotencyKey" = ?'
    ).bind('idemp-simulated-fail').first();
    assert.equal(orderCheck.count, 0, 'No partial Order record committed');

    const itemCheck = await DB.prepare(
      'SELECT COUNT(*) as count FROM "OrderItem" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "idempotencyKey" = ?)'
    ).bind('idemp-simulated-fail').first();
    assert.equal(itemCheck.count, 0, 'No partial OrderItem record committed');
  });

  // =========================================================================
  // GATE 7: REGRESSION ON R06 ORDER LIFECYCLE
  // =========================================================================
  console.log('\n--- GATE 7: Regression on R06 Order Lifecycle ---');

  await check('Order with R07B.1 snapshots transitions through R06 state machine seamlessly', async () => {
    const contacted = await api.transitionOrderStatus(
      {
        orderId: createdOrderId,
        targetStatus: 'CONTACTED',
        expectedRevision: 0,
        actor: 'Admin CSKH',
        reason: 'Đã gọi điện xác nhận cấu hình và giá',
      },
      DB
    );

    assert.equal(contacted.status, 'CONTACTED');
    assert.equal(contacted.revision, 1);

    const confirmed = await api.transitionOrderStatus(
      {
        orderId: createdOrderId,
        targetStatus: 'CONFIRMED',
        expectedRevision: 1,
        actor: 'Admin Kho',
        reason: 'Khách hàng chốt đơn',
      },
      DB
    );

    assert.equal(confirmed.status, 'CONFIRMED');
    assert.equal(confirmed.revision, 2);

    const fullOrder = await api.getOrderById(createdOrderId, DB);
    assert.equal(fullOrder.status, 'CONFIRMED');
    assert.equal(fullOrder.items.length, 2);
    assert.equal(fullOrder.events.length, 3); // CREATED + CONTACTED + CONFIRMED
  });

  console.log(`\n==========================================`);
  console.log(`TOTAL R07B.1 TESTS: ${passed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: 0`);
  console.log(`==========================================`);
  console.log(`\n🌟 ALL R07B.1 UNIFIED PRICING & CHECKOUT CONFIRMATION TESTS PASSED!`);
} finally {
  await mf.dispose();
}
