import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('=== CITILAP R07B.2 — PRICING & CAMPAIGN REGRESSION & VERIFICATION SUITE ===\n');

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
      export * from './src/server/services/search.service';
      export * from './src/server/services/navigation.service';
      export * from './src/server/services/site-builder.service';
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
  outfile: 'scripts/.r07b-2-test-bundle.mjs',
});

const api = await import('./.r07b-2-test-bundle.mjs');

// 2. Initialize isolated Miniflare environment
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r07b-2-test"); } }',
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

  // Apply all 19 migrations cleanly
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

  // Seed baseline data
  await DB.prepare("INSERT INTO Category(id, name, slug, status, sortOrder, updatedAt) VALUES ('cat-laptops', 'Laptop', 'laptop', 'ACTIVE', 1, CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO SiteSettings(id, document) VALUES ('site', '{\"schemaVersion\":1,\"storeName\":\"Citilap\",\"brandName\":\"Citilap\",\"flashSaleEnabled\":false}')").run();
  const navDoc = JSON.stringify({
    schemaVersion: 1,
    categories: [{ id: 'cat-laptops', name: 'Laptop', slug: 'laptop', description: '', parentId: null, image: '', sortOrder: 1, badge: 'HOT', isFeatured: true, subcategories: [] }],
    collections: [{ id: 'col-laptop', name: 'Laptop Collection', slug: 'laptop-collection', description: 'Laptop sinh viên', visible: true, mode: 'manual', productIds: ['p-laptop-1'] }],
    menus: { main: [], footer: [] }
  });
  await DB.prepare("INSERT INTO NavigationStudio(id, draft, revision, published, publishedRevision) VALUES ('site', ?, 1, ?, 1)").bind(navDoc, navDoc).run();

  // Seed products
  // Product 1: Base laptop (no variants), price 20tr, originalPrice 25tr
  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, brand, isFlashSale, createdAt, updatedAt)
    VALUES ('p-laptop-1', 'Laptop Dell Inspiron 15', 'laptop-dell-inspiron-15', 'Dell laptop desc', 20000000, 25000000, 'cat-laptops', 'ACTIVE', 'Dell', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();

  // Product 2: ThinkPad with 2 variants
  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, brand, isFlashSale, createdAt, updatedAt)
    VALUES ('p-laptop-2', 'ThinkPad T14 Gen 4', 'thinkpad-t14-gen-4', 'ThinkPad desc', 30000000, 35000000, 'cat-laptops', 'ACTIVE', 'Lenovo', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  await DB.prepare(`
    INSERT INTO ProductVariant(id, productId, sku, name, options, price, originalPrice, status, ram, storage, gpu, updatedAt)
    VALUES
      ('var-t14-1', 'p-laptop-2', 'TP-T14-16', '16GB RAM / 512GB SSD', '{}', 32000000, 38000000, 'ACTIVE', '16GB', '512GB', null, CURRENT_TIMESTAMP),
      ('var-t14-2', 'p-laptop-2', 'TP-T14-32', '32GB RAM / 1TB SSD', '{}', 42000000, 48000000, 'ACTIVE', '32GB', '1TB', null, CURRENT_TIMESTAMP)
  `).run();

  // Product 3: Variant with NULL originalPrice (to test variant isolation)
  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, brand, isFlashSale, createdAt, updatedAt)
    VALUES ('p-laptop-3', 'MacBook Air M2', 'macbook-air-m2', 'MacBook desc', 24000000, 30000000, 'cat-laptops', 'ACTIVE', 'Apple', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  await DB.prepare(`
    INSERT INTO ProductVariant(id, productId, sku, name, options, price, originalPrice, status, updatedAt)
    VALUES ('var-mba-null-orig', 'p-laptop-3', 'MBA-M2-8-256', '8GB / 256GB', '{}', 22000000, null, 'ACTIVE', CURRENT_TIMESTAMP)
  `).run();

  // Product 4: Product campaign scope isolation (base price 20tr, variant price 40tr)
  await DB.prepare(`
    INSERT INTO Product(id, name, slug, description, price, originalPrice, categoryId, status, brand, isFlashSale, createdAt, updatedAt)
    VALUES ('p-laptop-4', 'Asus ROG Zephyrus G14', 'asus-rog-g14', 'Asus desc', 20000000, 25000000, 'cat-laptops', 'ACTIVE', 'Asus', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  await DB.prepare(`
    INSERT INTO ProductVariant(id, productId, sku, name, options, price, originalPrice, status, updatedAt)
    VALUES
      ('var-rog-no-item', 'p-laptop-4', 'ROG-G14-RTX4050', 'RTX 4050 Base', '{}', 40000000, 45000000, 'ACTIVE', CURRENT_TIMESTAMP),
      ('var-rog-with-item', 'p-laptop-4', 'ROG-G14-RTX4080', 'RTX 4080 High-End', '{}', 50000000, 55000000, 'ACTIVE', CURRENT_TIMESTAMP)
  `).run();

  // Create an active campaign C1 covering:
  // - p-laptop-1 at 15tr (regular 20tr)
  // - var-t14-1 at 28tr (regular 32tr)
  // - p-laptop-4 at 16tr (product level, should NOT apply to var-rog-no-item!)
  // - var-rog-with-item at 44tr (explicit variant level item)
  const now = new Date('2026-10-16T10:00:00.000Z');
  const campaignStart = new Date('2026-10-15T00:00:00.000Z').toISOString();
  const campaignEnd = new Date('2026-10-20T00:00:00.000Z').toISOString();

  const c1 = await api.saveCampaign(
    {
      name: 'Mùa Tựu Trường R07B.2',
      description: 'Giảm giá laptop sinh viên',
      startAt: campaignStart,
      endAt: campaignEnd,
      status: 'PUBLISHED',
      items: [
        {
          productId: 'p-laptop-1',
          variantId: null,
          salePrice: 15000000,
          regularPrice: 20000000,
        },
        {
          productId: 'p-laptop-2',
          variantId: 'var-t14-1',
          salePrice: 28000000,
          regularPrice: 32000000,
        },
        {
          productId: 'p-laptop-4',
          variantId: null,
          salePrice: 16000000,
          regularPrice: 20000000,
        },
        {
          productId: 'p-laptop-4',
          variantId: 'var-rog-with-item',
          salePrice: 44000000,
          regularPrice: 50000000,
        },
      ],
    },
    null,
    0,
    DB
  );

  assert.ok(c1.id, 'Campaign C1 created and published');

  // =========================================================================
  // GATE 1: ACTIVE CAMPAIGN PASSED TO PUBLIC CONSUMERS
  // =========================================================================
  console.log('--- GATE 1: Active Campaign Passed to Public Consumers ---');

  await check('getStorefrontPricingContext loads active campaign without leaking Map objects in public DTO', async () => {
    const ctx = await api.getStorefrontPricingContext(DB, now);
    assert.ok(ctx.activeCampaign, 'Active campaign resolved in storefront context');
    assert.equal(ctx.activeCampaign.campaignId, c1.id);
    assert.equal(ctx.activeCampaign.campaignName, 'Mùa Tựu Trường R07B.2');
    assert.ok(ctx.activeCampaign.items instanceof Map, 'Internal items is Map for fast resolution');

    const publicDto = api.toPublicCampaignDto(ctx.activeCampaign);
    assert.ok(publicDto, 'Public DTO generated');
    assert.equal(typeof publicDto.items, 'object', 'Public DTO items must be plain object');
    assert.equal(publicDto.items instanceof Map, false, 'Public DTO must not leak Map instances');
    assert.ok(JSON.stringify(publicDto), 'Public DTO is strictly JSON serializable');
  });

  await check('Catalog Search reflects active campaign discounts', async () => {
    const ctx = await api.getStorefrontPricingContext(DB, now);
    const searchRes = await api.searchProducts({ query: 'Dell', limit: 10 }, api.prisma, ctx);
    assert.ok(searchRes.products.length >= 1, 'Found Dell laptop');
    const dell = searchRes.products.find(p => p.id === 'p-laptop-1');
    assert.ok(dell, 'p-laptop-1 present in search results');
    assert.equal(dell.price, 15000000, 'Search price shows active campaign salePrice 15tr');
    assert.equal(dell.originalPrice, 20000000, 'Search compareAtPrice shows regular 20tr');
    assert.equal(dell.isOnSale, true, 'isOnSale flag is true in search result');
  });

  await check('Navigation publicCollection reflects active campaign discounts', async () => {
    const collection = await api.publicCollection(DB, 'laptop-collection');
    assert.ok(collection, 'Collection returned');
    const dell = collection.products.find(p => p.id === 'p-laptop-1');
    assert.ok(dell, 'p-laptop-1 present in collection');
    assert.equal(dell.price, 15000000, 'Collection price shows campaign 15tr');
    assert.equal(dell.originalPrice, 20000000, 'Collection originalPrice shows 20tr');
    assert.equal(dell.isOnSale, true, 'Collection isOnSale is true');
  });

  await check('SiteBuilder resolveSectionsForStorefront reflects active campaign discounts', async () => {
    const sectionsInput = [
      {
        id: 'sec-1',
        enabled: true,
        data: {
          type: 'product_grid',
          title: 'Sản phẩm nổi bật',
          sourceMode: 'manual',
          manualProductIds: ['p-laptop-1'],
        },
      },
    ];

    const sections = await api.resolveSectionsForStorefront(DB, sectionsInput);
    assert.ok(sections && sections.length > 0, 'Sections resolved');
    const grid = sections[0];
    assert.ok(grid && grid.resolvedProducts && grid.resolvedProducts.length > 0, 'Product grid contains products');
    const dell = grid.resolvedProducts.find(p => p.id === 'p-laptop-1');
    assert.ok(dell, 'p-laptop-1 in landing section');
    assert.equal(dell.price, 15000000, 'Landing section reflects campaign 15tr');
    assert.equal(dell.isOnSale, true, 'Landing section reflects isOnSale');
  });

  await check('PDP resolver calculates consistent price for product and variants', async () => {
    const ctx = await api.getStorefrontPricingContext(DB, now);

    // Product 1 (base product campaign)
    const p1Price = await api.resolvePrice({
      productId: 'p-laptop-1',
      variantId: null,
      settings: ctx,
      at: now,
      explicitDb: DB,
    });
    assert.equal(p1Price.effectivePrice, 15000000);
    assert.equal(p1Price.compareAtPrice, 20000000);
    assert.equal(p1Price.isOnSale, true);
    assert.equal(p1Price.campaign?.title, 'Mùa Tựu Trường R07B.2');

    // Product 2, Variant 1 (explicit variant campaign)
    const varT14Price = await api.resolvePrice({
      productId: 'p-laptop-2',
      variantId: 'var-t14-1',
      settings: ctx,
      at: now,
      explicitDb: DB,
    });
    assert.equal(varT14Price.effectivePrice, 28000000);
    assert.equal(varT14Price.compareAtPrice, 32000000);
    assert.equal(varT14Price.isOnSale, true);
    assert.equal(varT14Price.campaign?.title, 'Mùa Tựu Trường R07B.2');

    // Product 2, Variant 2 (NO campaign item)
    const varT14_2Price = await api.resolvePrice({
      productId: 'p-laptop-2',
      variantId: 'var-t14-2',
      settings: ctx,
      at: now,
      explicitDb: DB,
    });
    assert.equal(varT14_2Price.effectivePrice, 42000000, 'Uncovered variant retains its regular price 42tr');
    assert.equal(varT14_2Price.compareAtPrice, 48000000, 'Retains its own variant originalPrice 48tr');
  });

  // =========================================================================
  // GATE 2: VARIANT ORIGINALPRICE BORROWING PREVENTED
  // =========================================================================
  console.log('--- GATE 2: Variant originalPrice Borrowing Prevented ---');

  await check('Variant with NULL originalPrice NEVER inherits parent originalPrice', async () => {
    const ctx = await api.getStorefrontPricingContext(DB, now);

    // 1. Calculator test
    const calculated = api.calculateEffectivePrice(
      22000000,
      null, // variant originalPrice
      false,
      true,
      ctx,
      now,
      {
        productId: 'p-laptop-3',
        variantId: 'var-mba-null-orig',
        isVariant: true,
        variantOriginalPrice: null, // explicit isolation
      }
    );
    assert.equal(calculated.effectivePrice, 22000000);
    assert.equal(calculated.compareAtPrice, null, 'Must NOT borrow parent 30tr');
    assert.equal(calculated.isOnSale, false, 'Must NOT fabricate fake sale');

    // 2. Order creation test: client submits expectedPrice 22tr
    const createRes = await api.createOrder(
      {
        customerName: 'Lê Văn An',
        customerPhone: '0901234567',
        items: [
          {
            productId: 'p-laptop-3',
            variantId: 'var-mba-null-orig',
            quantity: 1,
            expectedPrice: 22000000,
          },
        ],
      },
      'idemp-v-null-orig-1',
      DB
    );
    const order = createRes.order;
    assert.ok(order.id, 'Order created with correct variant price');
    assert.equal(order.items[0].price, 22000000);
    assert.equal(order.items[0].priceSnapshot, 22000000);
    assert.equal(order.items[0].regularPriceSnapshot, 22000000);
    assert.equal(order.items[0].compareAtPriceSnapshot, null, 'OrderItem compareAtPriceSnapshot is null, not parent 30tr');

    // 3. Client submitting stale/wrong parent price 30tr is strictly rejected with PRICE_CHANGED
    let rejection = null;
    try {
      await api.createOrder(
        {
          customerName: 'Lê Văn An',
          customerPhone: '0901234567',
          items: [
            {
              productId: 'p-laptop-3',
              variantId: 'var-mba-null-orig',
              quantity: 1,
              expectedPrice: 30000000, // Attempting to use parent originalPrice
            },
          ],
        },
        'idemp-v-null-orig-2',
        DB
      );
    } catch (err) {
      rejection = err;
    }
    assert.ok(rejection, 'Must reject order with mismatched expectedPrice');
    assert.equal(rejection.code, 'PRICE_CHANGED');
    assert.equal(rejection.effectivePrice, 22000000, 'Server evaluated price is 22tr, NOT parent 30tr');
  });

  // =========================================================================
  // GATE 3: SAFE VARIANT CAMPAIGN SCOPE & RELATION VALIDATION
  // =========================================================================
  console.log('--- GATE 3: Safe Variant Campaign Scope & Relation Validation ---');

  await check('Product-level campaign item does NOT spill over into variants', async () => {
    const ctx = await api.getStorefrontPricingContext(DB, now);

    // Variant WITHOUT campaign item
    const varNoItem = await api.resolvePrice({
      productId: 'p-laptop-4',
      variantId: 'var-rog-no-item',
      settings: ctx,
      at: now,
      explicitDb: DB,
    });
    assert.equal(varNoItem.effectivePrice, 40000000, 'Uncovered variant must retain 40tr, NOT 16tr!');
    assert.equal(varNoItem.isOnSale, false);

    // Variant WITH explicit campaign item
    const varWithItem = await api.resolvePrice({
      productId: 'p-laptop-4',
      variantId: 'var-rog-with-item',
      settings: ctx,
      at: now,
      explicitDb: DB,
    });
    assert.equal(varWithItem.effectivePrice, 44000000, 'Covered variant receives explicit 44tr');
    assert.equal(varWithItem.isOnSale, true);
    assert.equal(varWithItem.campaign?.title, 'Mùa Tựu Trường R07B.2');
  });

  await check('Campaign target validation rejects non-existent product', async () => {
    let error = null;
    try {
      await api.assertValidCampaignTargets(
        [
          {
            productId: 'non-existent-product-id',
            variantId: null,
            salePrice: 10000000,
            regularPrice: 20000000,
          },
        ],
        DB
      );
    } catch (err) {
      error = err;
    }
    assert.ok(error instanceof api.CampaignValidationError, 'Throws CampaignValidationError for non-existent product');
    assert.match(error.message, /không tồn tại/);
  });

  await check('Campaign target validation rejects non-existent variant', async () => {
    let error = null;
    try {
      await api.assertValidCampaignTargets(
        [
          {
            productId: 'p-laptop-2',
            variantId: 'non-existent-var-id',
            salePrice: 25000000,
            regularPrice: 32000000,
          },
        ],
        DB
      );
    } catch (err) {
      error = err;
    }
    assert.ok(error instanceof api.CampaignValidationError, 'Throws CampaignValidationError for non-existent variant');
    assert.match(error.message, /không tồn tại/);
  });

  await check('Campaign target validation rejects variant belonging to different product', async () => {
    let error = null;
    try {
      // var-t14-1 belongs to p-laptop-2, NOT p-laptop-1!
      await api.assertValidCampaignTargets(
        [
          {
            productId: 'p-laptop-1',
            variantId: 'var-t14-1',
            salePrice: 25000000,
            regularPrice: 32000000,
          },
        ],
        DB
      );
    } catch (err) {
      error = err;
    }
    assert.ok(error instanceof api.CampaignValidationError, 'Throws CampaignValidationError for wrong variant parentage');
    assert.match(error.message, /không thuộc sản phẩm/);
  });

  await check('Campaign contract schema rejects duplicate targets within same campaign', () => {
    assert.throws(
      () => {
        api.campaignDocumentSchema.parse({
          name: 'Duplicate Test',
          startAt: '2026-10-15T00:00:00.000Z',
          endAt: '2026-10-20T00:00:00.000Z',
          items: [
            {
              productId: 'p-laptop-1',
              variantId: null,
              salePrice: 15000000,
              regularPrice: 20000000,
            },
            {
              productId: 'p-laptop-1',
              variantId: null,
              salePrice: 14000000,
              regularPrice: 20000000,
            },
          ],
        });
      },
      (err) => {
        return /Mục khuyến mại trùng lặp/.test(err.message);
      }
    );
  });

  await check('Campaign contract schema rejects salePrice >= regularPrice', () => {
    assert.throws(
      () => {
        api.campaignDocumentSchema.parse({
          name: 'Invalid Sale Price Test',
          startAt: '2026-10-15T00:00:00.000Z',
          endAt: '2026-10-20T00:00:00.000Z',
          items: [
            {
              productId: 'p-laptop-1',
              variantId: null,
              salePrice: 25000000, // Higher than regularPrice 20tr!
              regularPrice: 20000000,
            },
          ],
        });
      },
      (err) => {
        return /Giá khuyến mại phải nhỏ hơn giá bán thường/.test(err.message);
      }
    );
  });

  // =========================================================================
  // GATE 4: TEMPORAL BOUNDS & FAIL-CLOSED PRICING
  // =========================================================================
  console.log('--- GATE 4: Temporal Bounds & Fail-Closed Pricing ---');

  await check('Exact half-open boundary [startAt, endAt) verified with fixed clock', () => {
    const fixedCampaign = {
      campaignId: 'c-fixed',
      campaignName: 'Fixed Clock Campaign',
      startAt: '2026-10-16T12:00:00.000Z',
      endAt: '2026-10-16T18:00:00.000Z',
      items: new Map([
        [
          'p-fixed',
          {
            salePrice: 8000000,
            regularPrice: 10000000,
            startAt: '2026-10-16T12:00:00.000Z',
            endAt: '2026-10-16T18:00:00.000Z',
            campaignId: 'c-fixed',
            campaignName: 'Fixed Clock Campaign',
          },
        ],
      ]),
    };

    const ctx = { activeCampaign: fixedCampaign };

    // 1ms before start: INACTIVE
    const beforeStart = api.calculateEffectivePrice(
      10000000,
      12000000,
      false,
      true,
      ctx,
      new Date('2026-10-16T11:59:59.999Z'),
      { productId: 'p-fixed', variantId: null, isVariant: false }
    );
    assert.equal(beforeStart.effectivePrice, 10000000, 'Must be regular price 1ms before start');
    assert.equal(beforeStart.isOnSale, false);

    // Exactly at start: ACTIVE
    const atStart = api.calculateEffectivePrice(
      10000000,
      12000000,
      false,
      true,
      ctx,
      new Date('2026-10-16T12:00:00.000Z'),
      { productId: 'p-fixed', variantId: null, isVariant: false }
    );
    assert.equal(atStart.effectivePrice, 8000000, 'Must be sale price exactly at start');
    assert.equal(atStart.isOnSale, true);

    // 1ms before end: ACTIVE
    const beforeEnd = api.calculateEffectivePrice(
      10000000,
      12000000,
      false,
      true,
      ctx,
      new Date('2026-10-16T17:59:59.999Z'),
      { productId: 'p-fixed', variantId: null, isVariant: false }
    );
    assert.equal(beforeEnd.effectivePrice, 8000000, 'Must be sale price 1ms before end');
    assert.equal(beforeEnd.isOnSale, true);

    // Exactly at end: INACTIVE (half-open)
    const atEnd = api.calculateEffectivePrice(
      10000000,
      12000000,
      false,
      true,
      ctx,
      new Date('2026-10-16T18:00:00.000Z'),
      { productId: 'p-fixed', variantId: null, isVariant: false }
    );
    assert.equal(atEnd.effectivePrice, 10000000, 'Must expire to regular price exactly at endAt');
    assert.equal(atEnd.isOnSale, false);
  });

  await check('Stale pre-cached context drops expired campaign item at evaluatedAt', () => {
    const staleContext = {
      activeCampaign: {
        campaignId: 'c-stale',
        campaignName: 'Stale Campaign',
        startAt: '2026-10-01T00:00:00.000Z',
        endAt: '2026-10-02T00:00:00.000Z',
        items: new Map([
          [
            'p-laptop-1',
            {
              salePrice: 10000000,
              regularPrice: 20000000,
              startAt: '2026-10-01T00:00:00.000Z',
              endAt: '2026-10-02T00:00:00.000Z',
              campaignId: 'c-stale',
              campaignName: 'Stale Campaign',
            },
          ],
        ]),
      },
    };

    const result = api.calculateEffectivePrice(
      20000000,
      25000000,
      false,
      true,
      staleContext,
      new Date('2026-10-16T12:00:00.000Z'),
      { productId: 'p-laptop-1', variantId: null, isVariant: false }
    );
    assert.equal(result.effectivePrice, 20000000, 'Must drop stale campaign and return regular 20tr');
    assert.equal(result.isOnSale, false);
  });

  await check('Infrastructure DB error in getStorefrontPricingContext fails closed (throws)', async () => {
    const brokenDb = {
      prepare() {
        throw new Error('D1_CLUSTER_UNAVAILABLE');
      },
      batch() {
        throw new Error('D1_CLUSTER_UNAVAILABLE');
      },
    };

    let caught = null;
    try {
      await api.getStorefrontPricingContext(brokenDb, now);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'Must throw error on DB failure');
    assert.match(caught.message, /D1_CLUSTER_UNAVAILABLE/, 'Does NOT swallow error silently');
  });

  // =========================================================================
  // GATE 5: SAVE STATUS=PUBLISHED BYPASS, CAS CONCURRENCY & D1 ATOMIC ROLLBACK
  // =========================================================================
  console.log('--- GATE 5: Save Bypass Prevention, CAS Concurrency & Atomic Rollback ---');

  await check('saveCampaign with status=PUBLISHED cannot bypass published overlap check', async () => {
    let conflict = null;
    try {
      await api.saveCampaign(
        {
          name: 'Overlapping Campaign',
          startAt: campaignStart,
          endAt: campaignEnd,
          status: 'PUBLISHED', // Direct PUBLISHED status in saveCampaign!
          items: [
            {
              productId: 'p-laptop-1',
              variantId: null,
              salePrice: 14000000,
              regularPrice: 20000000,
            },
          ],
        },
        null,
        0,
        DB
      );
    } catch (err) {
      conflict = err;
    }
    assert.ok(conflict instanceof api.CampaignConflictError, 'Throws CampaignConflictError');
    assert.match(conflict.message, /đã được áp dụng trong chiến dịch đang xuất bản/, 'Proper overlap message');
  });

  await check('CAS revision guard detects concurrent edit conflict and throws 409', async () => {
    const row = await DB.prepare('SELECT revision FROM PromotionCampaign WHERE id = ?').bind(c1.id).first();
    const currentRev = row.revision;

    // First save with correct revision succeeds
    const updated = await api.saveCampaign(
      {
        ...c1,
        name: 'Mùa Tựu Trường R07B.2 (Updated Title)',
      },
      c1.id,
      currentRev,
      DB
    );
    assert.equal(updated.revision, currentRev + 1, 'Revision incremented by 1');

    // Concurrent save attempting with stale revision throws CampaignRevisionConflictError
    let casError = null;
    try {
      await api.saveCampaign(
        {
          ...c1,
          name: 'Concurrent Stale Title Update',
        },
        c1.id,
        currentRev, // Outdated revision!
        DB
      );
    } catch (err) {
      casError = err;
    }
    assert.ok(casError instanceof api.CampaignRevisionConflictError, 'Throws CampaignRevisionConflictError');
    assert.equal(casError.code, 'CAMPAIGN_REVISION_CONFLICT');
    assert.equal(casError.statusCode, 409);
  });

  await check('D1 batch atomic rollback preserves existing campaign items on failure', async () => {
    const beforeItems = await DB.prepare('SELECT * FROM PromotionCampaignItem WHERE campaignId = ?').bind(c1.id).all();
    assert.equal(beforeItems.results.length, 4, 'C1 currently has 4 items');

    const currentRev = (await DB.prepare('SELECT revision FROM PromotionCampaign WHERE id = ?').bind(c1.id).first()).revision;

    let failError = null;
    try {
      await api.saveCampaign(
        {
          ...c1,
          name: 'Failing Items Campaign Update',
          items: [
            {
              productId: 'p-laptop-1',
              variantId: null,
              salePrice: 12000000,
              regularPrice: 20000000,
            },
            {
              productId: 'invalid-non-existent-product',
              variantId: null,
              salePrice: 10000000,
              regularPrice: 20000000,
            },
          ],
        },
        c1.id,
        currentRev,
        DB
      );
    } catch (err) {
      failError = err;
    }
    assert.ok(failError, 'Save campaign failed due to invalid item');

    const afterItems = await DB.prepare('SELECT * FROM PromotionCampaignItem WHERE campaignId = ?').bind(c1.id).all();
    assert.equal(afterItems.results.length, 4, 'Existing 4 items preserved completely (no partial loss)');
  });

  // =========================================================================
  // GATE 6: SNAPSHOT IMMUTABILITY ACROSS LIFECYCLE
  // =========================================================================
  console.log('--- GATE 6: Order Item Snapshot Immutability ---');

  await check('Order snapshots remain completely immutable after campaign archive & price change', async () => {
    // 1. Create order during active campaign for p-laptop-1 (campaign price 15tr, regular 20tr, original 25tr)
    const createRes = await api.createOrder(
      {
        customerName: 'Hoàng Minh Snapshot',
        customerPhone: '0933221100',
        items: [
          {
            productId: 'p-laptop-1',
            variantId: null,
            quantity: 1,
            expectedPrice: 15000000,
          },
        ],
      },
      'idemp-snapshot-test-1',
      DB
    );
    const order = createRes.order;

    assert.ok(order.id, 'Order created successfully');
    const item1 = order.items[0];
    assert.equal(item1.price, 15000000, 'Order price is 15tr');
    assert.equal(item1.priceSnapshot, 15000000);
    assert.equal(item1.regularPriceSnapshot, 20000000);
    assert.equal(item1.compareAtPriceSnapshot, 20000000);
    assert.ok(item1.campaignSnapshot, 'Campaign snapshot JSON exists');
    const campSnap = JSON.parse(item1.campaignSnapshot);
    assert.equal(campSnap.id, c1.id);
    assert.equal(campSnap.title, 'Mùa Tựu Trường R07B.2 (Updated Title)');

    // 2. Archive campaign
    const c1Latest = await api.getCampaignById(c1.id, DB);
    await api.archiveCampaign(c1.id, c1Latest.revision, DB);
    const c1Status = (await DB.prepare('SELECT status FROM PromotionCampaign WHERE id = ?').bind(c1.id).first()).status;
    assert.equal(c1Status, 'ARCHIVED', 'Campaign C1 archived');

    // 3. Alter product price in DB drastically (to 50tr)
    await DB.prepare('UPDATE Product SET price = 50000000, originalPrice = 60000000 WHERE id = ?').bind('p-laptop-1').run();

    // 4. Re-read order from DB and verify snapshots are unchanged
    const fetchedOrder = await api.getOrderById(order.id, DB);
    assert.ok(fetchedOrder, 'Order fetched');
    const fetchedItem = fetchedOrder.items[0];

    assert.equal(fetchedItem.price, 15000000, 'Price remains 15tr snapshot');
    assert.equal(fetchedItem.priceSnapshot, 15000000);
    assert.equal(fetchedItem.regularPriceSnapshot, 20000000);
    assert.equal(fetchedItem.compareAtPriceSnapshot, 20000000);
    const fetchedCampSnap = JSON.parse(fetchedItem.campaignSnapshot);
    assert.equal(fetchedCampSnap.id, c1.id);
    assert.equal(fetchedCampSnap.title, 'Mùa Tựu Trường R07B.2 (Updated Title)');

    // 5. Transition order to CONFIRMED and PROCESSING
    const row = await DB.prepare('SELECT revision FROM "Order" WHERE id = ?').bind(order.id).first();
    const confirmed = await api.transitionOrderStatus(
      {
        orderId: order.id,
        targetStatus: 'CONFIRMED',
        expectedRevision: row.revision,
        reason: 'Xác nhận đơn',
      },
      DB
    );
    assert.equal(confirmed.status, 'CONFIRMED');

    const confirmedOrder = await api.getOrderById(order.id, DB);
    const confirmedItem = confirmedOrder.items[0];
    assert.equal(confirmedItem.price, 15000000, 'Price remains 15tr after status transition');
    assert.equal(confirmedItem.priceSnapshot, 15000000);
    assert.equal(confirmedItem.regularPriceSnapshot, 20000000);
    assert.equal(confirmedItem.compareAtPriceSnapshot, 20000000);
    const confirmedCampSnap = JSON.parse(confirmedItem.campaignSnapshot);
    assert.equal(confirmedCampSnap.id, c1.id);
  });

  // =========================================================================
  // GATE 7: HTTP ROUTE CONTRACTS & ENVELOPE VERIFICATION
  // =========================================================================
  console.log('--- GATE 7: HTTP Route Contracts & Envelope Verification ---');

  await check('HTTP POST /api/cart/revalidate returns structured prices and flags changes', async () => {
    const res = await fetch('http://localhost:3001/api/cart/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            id: 'cart-item-1',
            productId: 'p-legion-5-pro',
            variantId: null,
            expectedPrice: 20000000, // Stale expected price
          },
        ],
      }),
    });

    assert.equal(res.status, 200, 'Revalidate endpoint returns 200');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.evaluatedAt);
    assert.equal(data.items.length, 1);
    const revalItem = data.items[0];
    assert.equal(revalItem.productId, 'p-legion-5-pro');
    assert.ok(typeof revalItem.price === 'number', 'Server evaluated price returned');
    assert.equal(revalItem.priceChanged, true, 'Flags price changed from stale 20tr');
  });

  await check('HTTP Admin Campaigns endpoints enforce authentication', async () => {
    // Unauthenticated GET /api/admin/campaigns
    const resGet = await fetch('http://localhost:3001/api/admin/campaigns');
    assert.equal(resGet.status, 401);
    const dataGet = await resGet.json();
    assert.equal(dataGet.success, false);
    assert.equal(dataGet.error, 'Unauthorized');

    // Unauthenticated POST /api/admin/campaigns
    const resPost = await fetch('http://localhost:3001/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(resPost.status, 401);
  });

  await check('HTTP POST /api/orders returns structured 409 PRICE_CHANGED envelope', async () => {
    const res = await fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-http-checkout-stale',
      },
      body: JSON.stringify({
        customerName: 'Trần Văn Stale',
        customerPhone: '0944556677',
        items: [
          {
            productId: 'p-legion-5-pro',
            variantId: null,
            quantity: 1,
            expectedPrice: 10000000, // Stale: server is 32.990.000
          },
        ],
      }),
    });

    assert.equal(res.status, 409, 'Orders returns 409 Conflict');
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'PRICE_CHANGED');
    assert.ok(body.error.details, 'details in error envelope');
    assert.ok(Array.isArray(body.error.details.changedItems), 'changedItems array in error details');
    const errItem = body.error.details.changedItems[0];
    assert.equal(errItem.productId, 'p-legion-5-pro');
    assert.equal(errItem.oldPrice, 10000000);
    assert.ok(typeof errItem.newPrice === 'number');
  });

  console.log('\n==========================================');
  console.log(`TOTAL R07B.2 TESTS: ${passed}`);
  console.log(`PASSED: ${passed}`);
  console.log('FAILED: 0');
  console.log('==========================================\n');
  console.log('🌟 ALL R07B.2 PRICING & CAMPAIGN REGRESSION TESTS PASSED!');

} finally {
  await mf.dispose();
}
