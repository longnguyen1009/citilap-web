import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('--- STARTING R07B HOT SALE & UNIFIED PRICING TEST SUITE ---');

// 1. Bundle server services with esbuild
await build({
  stdin: {
    contents: `
      export * from './src/server/services/pricing.service';
      export * from './src/server/services/settings.service';
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/media-library.service';
      export * from './src/server/services/catalog.service';
      export * from './src/server/services/order.service';
      export * from './src/server/services/storefront-cms.service';
      export * from './src/contracts/cms/settings';
      export * from './src/contracts/cms/product-studio';
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
  outfile: 'scripts/.r07b-test-bundle.mjs',
});

const api = await import('./.r07b-test-bundle.mjs');

// 2. Initialize isolated Miniflare environment
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r07b-test"); } }',
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
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    throw err;
  }
};

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const env = { DB, PRODUCT_MEDIA };
  globalThis.DB = DB;
  api.setD1Database(DB);

  // Apply all migrations
  await check('Apply database schema up to 0017', async () => {
    const migrationFiles = (await readdir('d1-migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const f of migrationFiles) {
      const sql = await readFile(`d1-migrations/${f}`, 'utf8');
      const statements = unstable_splitSqlQuery(sql);
      await DB.batch(statements.map((s) => DB.prepare(s)));
    }

    const fkCheck = await DB.prepare('PRAGMA foreign_key_check').all();
    assert.equal(fkCheck.results.length, 0, 'No foreign key violations');
  });

  // Test Gate 1: Pure Pricing Engine & Strict Half-Open Time Window [startAt, endAt)
  await check('Gate 1: isFlashSaleActive evaluated strictly on [startAt, endAt) server interval', async () => {
    const startStr = '2026-10-15T10:00:00.000Z';
    const endStr = '2026-10-15T14:00:00.000Z';

    const campaign = {
      flashSaleEnabled: true,
      flashSaleTitle: 'Xả kho siêu bão',
      flashSaleStartAt: startStr,
      flashSaleEndAt: endStr,
    };

    // Before start
    assert.equal(
      api.isFlashSaleActive(campaign, new Date('2026-10-15T09:59:59.999Z')),
      false,
      'Must be inactive before start'
    );

    // Exactly at start (inclusive start [startAt)
    assert.equal(
      api.isFlashSaleActive(campaign, new Date('2026-10-15T10:00:00.000Z')),
      true,
      'Must be active exactly at start'
    );

    // Inside window
    assert.equal(
      api.isFlashSaleActive(campaign, new Date('2026-10-15T12:00:00.000Z')),
      true,
      'Must be active inside window'
    );

    // Exactly at end (exclusive end endAt))
    assert.equal(
      api.isFlashSaleActive(campaign, new Date('2026-10-15T14:00:00.000Z')),
      false,
      'Must be inactive at endAt (half-open boundary)'
    );

    // After end
    assert.equal(
      api.isFlashSaleActive(campaign, new Date('2026-10-15T14:00:01.000Z')),
      false,
      'Must be inactive after end'
    );

    // When disabled
    assert.equal(
      api.isFlashSaleActive({ ...campaign, flashSaleEnabled: false }, new Date('2026-10-15T12:00:00.000Z')),
      false,
      'Must be inactive when enabled is false'
    );

    // Open start (startAt is empty)
    assert.equal(
      api.isFlashSaleActive({ ...campaign, flashSaleStartAt: '' }, new Date('2026-10-15T09:00:00.000Z')),
      true,
      'Must be active if startAt is empty and now < endAt'
    );
  });

  // Test Gate 2: Server-enforced immediate expiration in calculateEffectivePrice
  await check('Gate 2: calculateEffectivePrice expires sale prices to originalPrice immediately', async () => {
    const campaign = {
      flashSaleEnabled: true,
      flashSaleTitle: 'Flash Sale Tháng 10',
      flashSaleStartAt: '2026-10-15T10:00:00.000Z',
      flashSaleEndAt: '2026-10-15T14:00:00.000Z',
    };

    // Product on sale: price 18tr, originalPrice 22tr, isFlashSale = true
    const activePricing = api.calculateEffectivePrice(
      18000000,
      22000000,
      true,
      true,
      campaign,
      new Date('2026-10-15T12:00:00.000Z')
    );

    assert.equal(activePricing.effectivePrice, 18000000, 'Effective price is sale price during campaign');
    assert.equal(activePricing.compareAtPrice, 22000000, 'Compare-at price is regular price');
    assert.equal(activePricing.isOnSale, true);
    assert.equal(activePricing.discountPercent, 18);
    assert.equal(activePricing.campaign?.title, 'Flash Sale Tháng 10');

    // After campaign ends: exact same product reverts to 22tr with 0s delay
    const expiredPricing = api.calculateEffectivePrice(
      18000000,
      22000000,
      true,
      true,
      campaign,
      new Date('2026-10-15T14:00:01.000Z')
    );

    assert.equal(expiredPricing.effectivePrice, 22000000, 'Reverts to originalPrice immediately when expired');
    assert.equal(expiredPricing.compareAtPrice, null, 'No compareAt price after campaign expires');
    assert.equal(expiredPricing.isOnSale, false, 'isOnSale is false after expiration');
    assert.equal(expiredPricing.discountPercent, null, 'No discount badge after expiration');
    assert.equal(expiredPricing.campaign, null);

    // Non-sale product (isFlashSale = false): remains at 15tr regardless of campaign
    const regularPricing = api.calculateEffectivePrice(
      15000000,
      17000000,
      false,
      true,
      campaign,
      new Date('2026-10-15T12:00:00.000Z')
    );
    assert.equal(regularPricing.effectivePrice, 15000000);
    assert.equal(regularPricing.isOnSale, false);

    // Product without originalPrice (or originalPrice <= price): no artificial discount fabricated
    const noOrigPricing = api.calculateEffectivePrice(
      18000000,
      null,
      true,
      true,
      campaign,
      new Date('2026-10-15T12:00:00.000Z')
    );
    assert.equal(noOrigPricing.effectivePrice, 18000000);
    assert.equal(noOrigPricing.compareAtPrice, null);
    assert.equal(noOrigPricing.discountPercent, null);
  });

  // Test Gate 3: CMS Settings Contract & startAt < endAt Validation
  await check('Gate 3: Settings contract stores UTC and rejects startAt >= endAt when enabled', async () => {
    // Valid settings with startAt < endAt
    const valid = api.settingsMutationSchema.parse({
      expectedRevision: 0,
      document: {
        ...api.DEFAULT_ADMIN_SETTINGS,
        flashSaleEnabled: true,
        flashSaleTitle: 'Giờ Vàng Giá Rẻ',
        flashSaleStartAt: '2026-10-15T08:00:00.000Z',
        flashSaleEndAt: '2026-10-15T12:00:00.000Z',
      },
    });

    const saved = await api.saveAdminSettings(DB, valid, 'admin-tester');
    assert.equal(saved.revision, 1);
    assert.equal(saved.document.flashSaleTitle, 'Giờ Vàng Giá Rẻ');
    assert.equal(saved.document.flashSaleStartAt, '2026-10-15T08:00:00.000Z');
    assert.equal(saved.document.flashSaleEndAt, '2026-10-15T12:00:00.000Z');

    // Invalid: startAt >= endAt when enabled must throw validation error
    assert.throws(
      () => {
        api.settingsMutationSchema.parse({
          expectedRevision: 1,
          document: {
            ...api.DEFAULT_ADMIN_SETTINGS,
            flashSaleEnabled: true,
            flashSaleStartAt: '2026-10-15T12:00:00.000Z',
            flashSaleEndAt: '2026-10-15T08:00:00.000Z',
          },
        });
      },
      /Thời điểm bắt đầu Flash Sale phải trước thời điểm kết thúc/,
      'Must reject startAt >= endAt when flashSaleEnabled is true'
    );
  });

  // Test Gate 4: Product Studio isFlashSale authoring & publication draft isolation
  await check('Gate 4: Product Studio isFlashSale flag and publish projection with draft isolation', async () => {
    // Insert prerequisite Category and Brand
    await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-1', 'Laptop', 'laptop', CURRENT_TIMESTAMP)").run();
    await DB.prepare("INSERT INTO Brand(id, name, slug, updatedAt) VALUES('br-1', 'Dell', 'dell', CURRENT_TIMESTAMP)").run();

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const asset = (await api.uploadLibraryImage(env, new File([png], 'studio.png', { type: 'image/png' }))).asset;

    // Create a new product in Product Studio with isFlashSale: true
    const createDoc = {
      ...api.blankProduct('cat-1'),
      name: 'Dell XPS 13 Flash Sale Edition',
      slug: 'dell-xps-13-fs',
      categoryId: 'cat-1',
      template: 'LAPTOP',
      price: 24000000,
      originalPrice: 28000000,
      availability: 'AVAILABLE',
      isFlashSale: true,
      media: [{ assetId: asset.id, alt: 'Dell XPS 13', variantId: '' }],
      variants: [
        {
          id: 'v-fs-1',
          sku: 'DELL-XPS-FS-1',
          name: 'Core i7 / 16GB / 512GB',
          price: 24000000,
          originalPrice: 28000000,
          condition: 'NEW',
          options: {},
          stock: 10,
        },
      ],
    };

    const created = await api.writeStudio(env, null, {
      expectedRevision: 0,
      action: 'save', // Save as DRAFT only!
      document: createDoc,
    });

    const productId = created.id;
    assert.ok(productId, 'Product created');

    // Verify DRAFT isolation: In Product table, status is DRAFT and isFlashSale has not leaked
    const draftRow = await DB.prepare('SELECT status, isFlashSale FROM Product WHERE id = ?')
      .bind(productId)
      .first();
    assert.equal(draftRow.status, 'DRAFT', 'Product remains DRAFT');

    // Now publish the draft
    const published = await api.writeStudio(env, productId, {
      expectedRevision: created.revision,
      action: 'publish',
      document: {
        ...created.document,
        isFlashSale: true,
      },
    });

    assert.equal(published.revision, created.revision + 1);

    // Verify projection: Product.isFlashSale is now 1 (true) and status is ACTIVE
    const activeRow = await DB.prepare('SELECT status, isFlashSale, price, originalPrice FROM Product WHERE id = ?')
      .bind(productId)
      .first();
    assert.equal(activeRow.status, 'ACTIVE');
    assert.equal(Boolean(activeRow.isFlashSale), true, 'Product.isFlashSale projected to true');
    assert.equal(activeRow.price, 24000000);
    assert.equal(activeRow.originalPrice, 28000000);
  });

  // Test Gate 5: Order Creation Authoritative Pricing & Strict 0đ Price Change Rejection
  await check('Gate 5: Order creation verifies price with 0đ tolerance and snapshots campaign', async () => {
    // Configure an active Flash Sale around current time
    const now = new Date();
    const activeStart = new Date(now.getTime() - 3600000).toISOString();
    const activeEnd = new Date(now.getTime() + 3600000).toISOString();
    const pastEnd = new Date(now.getTime() - 1000).toISOString();

    await DB.prepare(`
      UPDATE SiteSettings
      SET document = json_set(document, '$.flashSaleEnabled', true, '$.flashSaleStartAt', ?, '$.flashSaleEndAt', ?, '$.flashSaleTitle', 'Giá Sốc Giờ Vàng R07B')
      WHERE id = 'site'
    `).bind(activeStart, activeEnd).run();

    // Query published product
    const p = await DB.prepare("SELECT id FROM Product WHERE slug = 'dell-xps-13-fs'").first();
    assert.ok(p, 'Product found');

    // 1. Order placed DURING active flash sale: expectedPrice 24tr matches server effective price 24tr
    const validOrder = await api.createOrder(
      {
        customerName: 'Nguyễn Văn Test',
        customerPhone: '0988776655',
        items: [
          {
            productId: p.id,
            variantId: 'v-fs-1',
            quantity: 1,
            expectedPrice: 24000000,
          },
        ],
      },
      'idemp-r07b-1',
      DB
    );

    assert.equal(validOrder.success, true);
    assert.equal(validOrder.order.subtotalAmount, 24000000);
    assert.equal(validOrder.order.items[0].priceSnapshot, 24000000);

    // 2. Expire the flash sale window by updating SiteSettings endAt to the past
    await DB.prepare(`
      UPDATE SiteSettings
      SET document = json_set(document, '$.flashSaleEndAt', ?)
      WHERE id = 'site'
    `).bind(pastEnd).run();

    // 3. Client attempts to submit order with stale expectedPrice 24tr (0đ tolerance test)
    let priceChangedError = null;
    try {
      await api.createOrder(
        {
          customerName: 'Trần Văn Mua Muộn',
          customerPhone: '0912345678',
          items: [
            {
              productId: p.id,
              variantId: 'v-fs-1',
              quantity: 1,
              expectedPrice: 24000000, // Client still expects 24tr, but campaign expired and server evaluated 28tr!
            },
          ],
        },
        'idemp-r07b-2',
        DB
      );
    } catch (err) {
      priceChangedError = err;
    }

    assert.ok(priceChangedError, 'Must reject order when expected price does not match effective price');
    assert.equal(priceChangedError.code, 'PRICE_CHANGED', 'Error code must be PRICE_CHANGED');
    assert.equal(priceChangedError.effectivePrice, 28000000, 'Effective price returned is 28tr (original price)');

    // 4. Order submitted with updated expectedPrice 28tr succeeds
    const updatedOrder = await api.createOrder(
      {
        customerName: 'Trần Văn Mua Muộn',
        customerPhone: '0912345678',
        items: [
          {
            productId: p.id,
            variantId: 'v-fs-1',
            quantity: 1,
            expectedPrice: 28000000,
          },
        ],
      },
      'idemp-r07b-3',
      DB
    );

    assert.equal(updatedOrder.success, true);
    assert.equal(updatedOrder.order.subtotalAmount, 28000000);
    assert.equal(updatedOrder.order.items[0].priceSnapshot, 28000000);
  });

  // Test Gate 6: applyPricingToHomepageProducts on catalog listings
  await check('Gate 6: applyPricingToHomepageProducts handles active and inactive transitions cleanly', async () => {
    const rawList = [
      {
        id: 'p-1',
        slug: 'p-1',
        name: 'Item Flash Sale',
        condition: 'NEW',
        price: 10000000,
        originalPrice: 12000000,
        isFlashSale: true,
        stock: 5,
        primaryImage: null,
        image: null,
        specs: {},
      },
      {
        id: 'p-2',
        slug: 'p-2',
        name: 'Item Regular',
        condition: 'NEW',
        price: 8000000,
        originalPrice: null,
        isFlashSale: false,
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

    const activeMapped = api.applyPricingToHomepageProducts(rawList, activeSettings, new Date('2026-10-15T12:00:00.000Z'));
    assert.equal(activeMapped[0].price, 10000000);
    assert.equal(activeMapped[0].isOnSale, true);
    assert.equal(activeMapped[0].discount, '-17%');
    assert.equal(activeMapped[1].isOnSale, false);
    assert.equal(activeMapped[1].discount, undefined);

    const expiredSettings = {
      ...activeSettings,
      flashSaleEndAt: '2026-10-15T01:00:00.000Z',
    };

    const expiredMapped = api.applyPricingToHomepageProducts(rawList, expiredSettings, new Date('2026-10-15T12:00:00.000Z'));
    assert.equal(expiredMapped[0].price, 12000000, 'Reverts to originalPrice when expired');
    assert.equal(expiredMapped[0].isOnSale, false);
    assert.equal(expiredMapped[0].discount, undefined);
  });

  console.log(`\nALL ${passed} CHECKS PASSED SUCCESSFULLY! R07B INTEGRATION VERIFIED.`);
} finally {
  await mf.dispose();
  try {
    fs.unlinkSync(path.join(process.cwd(), 'scripts/.r07b-test-bundle.mjs'));
  } catch {}
}
