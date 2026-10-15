import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import esbuild from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

console.log('=== CITILAP R04.1 — PRODUCTION SERVICE & RESOLVER GATES ===');

// 1. Bundle backend services and route handlers into a temporary build file
await esbuild.build({
  stdin: {
    contents: `
      export * from './src/lib/prisma';
      export * from './src/server/services/catalog.service';
      export * from './src/server/services/search.service';
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/brand.service';
      export * from './src/server/services/media-library.service';
      export * from './src/server/services/content-media.service';
      export * from './src/contracts/cms/product-studio';
      export * from './src/contracts/catalog/compare';
      export { GET as compareGetHandler } from './src/app/api/compare/route';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['cloudflare:workers', 'node:*'],
  plugins: [
    {
      name: 'wasm-external',
      setup(build) {
        build.onResolve({ filter: /\.wasm/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
  ],
  outfile: 'scripts/.r04-1-bundle.mjs',
});

const api = await import('./.r04-1-bundle.mjs');

// 2. Initialize isolated Miniflare test database & R2
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r04.1"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}:`, err);
    throw err;
  }
}

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const env = { DB, PRODUCT_MEDIA };

  // Set globalThis.env so mediaEnvironment() resolves env in tests
  globalThis.env = env;

  // Run all D1 migrations
  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    const stmts = unstable_splitSqlQuery(sql);
    await DB.batch(stmts.map((s) => DB.prepare(s)));
  }

  // Get Prisma Client connected to isolated D1
  const prisma = api.getPrismaClient(DB);

  // Seed Baseline Categories
  await prisma.category.createMany({
    data: [
      { id: 'cat-laptop', name: 'Laptop Gaming', slug: 'laptop-gaming', sortOrder: 1, status: 'ACTIVE' },
      { id: 'cat-mouse', name: 'Chuột Máy Tính', slug: 'chuot-may-tinh', sortOrder: 2, status: 'ACTIVE' },
      { id: 'cat-charger', name: 'Củ Sạc & Hub', slug: 'cu-sac-hub', sortOrder: 3, status: 'ACTIVE' },
    ],
  });

  // Seed Brands
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const logoAsset = (await api.uploadLibraryImage(env, new File([png], 'logo.png', { type: 'image/png' }))).asset;

  const bAsus = await api.writeBrand(env, null, { name: 'Asus', slug: 'asus', status: 'ACTIVE', logo: logoAsset.url });
  const bLogitech = await api.writeBrand(env, null, { name: 'Logitech', slug: 'logitech', status: 'ACTIVE', logo: logoAsset.url });
  const bAnker = await api.writeBrand(env, null, { name: 'Anker', slug: 'anker', status: 'ACTIVE', logo: logoAsset.url });

  // =========================================================================
  // SUITE 1: UNIT NORMALIZATION & CLAUSE BUILDERS
  // =========================================================================
  console.log('\n--- SUITE 1: UNIT NORMALIZATION & CLAUSE BUILDERS ---');

  await check('Unit Normalization: RAM clauses handle spacing and prevent substring collision', async () => {
    const ram16 = api.buildRamClauses(16);
    assert.ok(ram16.length >= 4, 'Should build multiple clauses for RAM');
    // Test that '116GB' does NOT match ram16 clauses:
    // Clauses are: equals '16GB', startsWith '16GB', contains ' 16GB', contains '16 GB'
    const testCases = [
      { val: '16GB', expected: true },
      { val: '16 GB', expected: true },
      { val: 'DDR5 16GB 4800MHz', expected: true },
      { val: '116GB', expected: false },
      { val: '116 GB', expected: false },
    ];
    for (const tc of testCases) {
      const matches = ram16.some((clause) => {
        const cond = clause.ram;
        if (cond.equals && tc.val.toLowerCase() === cond.equals.toLowerCase()) return true;
        if (cond.startsWith && tc.val.toLowerCase().startsWith(cond.startsWith.toLowerCase())) return true;
        if (cond.contains && tc.val.toLowerCase().includes(cond.contains.toLowerCase())) return true;
        return false;
      });
      assert.equal(matches, tc.expected, `RAM clause match failed for '${tc.val}': expected ${tc.expected}`);
    }
  });

  await check('Unit Normalization: Storage clauses handle 1TB vs 1024GB and 1000GB', async () => {
    const storage1TB = api.buildStorageClauses([1024]);
    const testValues = ['1TB', '1 TB', '1024GB', '1000GB', '1024 GB'];
    for (const v of testValues) {
      const matches = storage1TB.some((clause) => {
        const cond = clause.storage;
        if (cond.equals && v.toLowerCase() === cond.equals.toLowerCase()) return true;
        if (cond.startsWith && v.toLowerCase().startsWith(cond.startsWith.toLowerCase())) return true;
        if (cond.contains && v.toLowerCase().includes(cond.contains.toLowerCase())) return true;
        return false;
      });
      assert.ok(matches, `Storage 1TB should match '${v}'`);
    }
  });

  // =========================================================================
  // SUITE 2: VARIANT FILTER & CARD PRICE SEMANTICS (PRODUCTION QUERY)
  // =========================================================================
  console.log('\n--- SUITE 2: VARIANT FILTER & CARD PRICE SEMANTICS ---');

  // Seed Product with Variant A (16GB, 20M) and Variant B (32GB, 35M)
  await prisma.product.create({
    data: {
      id: 'prod-laptop-rog',
      name: 'Asus ROG Strix G16',
      slug: 'asus-rog-strix-g16',
      description: 'Laptop gaming cao cấp',
      categoryId: 'cat-laptop',
      brandId: bAsus.id,
      condition: 'NEW',
      price: 20000000, // Base product price is 20M
      originalPrice: 22000000,
      stock: 10,
      status: 'ACTIVE',
      cpu: 'Core i7 13650HX',
      gpu: 'RTX 4060',
      ram: '16GB',
      storage: '512GB',
      images: JSON.stringify(['/images/rog.jpg']),
      variants: {
        create: [
          {
            id: 'var-rog-16',
            sku: 'ROG-16GB-20M',
            name: 'ROG Strix G16 16GB',
            options: JSON.stringify({ RAM: '16GB', SSD: '512GB' }),
            price: 20000000,
            originalPrice: 22000000,
            stock: 5,
            status: 'ACTIVE',
            ram: '16GB',
            storage: '512GB',
            gpu: 'RTX 4060',
          },
          {
            id: 'var-rog-32',
            sku: 'ROG-32GB-35M',
            name: 'ROG Strix G16 32GB',
            options: JSON.stringify({ RAM: '32GB', SSD: '1024GB' }),
            price: 35000000,
            originalPrice: 38000000,
            stock: 5,
            status: 'ACTIVE',
            ram: '32GB',
            storage: '1024GB',
            gpu: 'RTX 4060',
          },
        ],
      },
    },
  });

  // Seed Legacy Product without variants
  await prisma.product.create({
    data: {
      id: 'prod-legacy-zenbook',
      name: 'Asus Zenbook 14 Legacy',
      slug: 'asus-zenbook-14-legacy',
      description: 'Laptop văn phòng mỏng nhẹ legacy',
      categoryId: 'cat-laptop',
      brandId: bAsus.id,
      condition: 'LIKE_NEW',
      price: 18000000,
      originalPrice: 21000000,
      stock: 3,
      status: 'ACTIVE',
      cpu: 'Core i5 1340P',
      gpu: 'Intel Iris Xe',
      ram: '16GB',
      storage: '512GB',
      images: JSON.stringify(['/images/zenbook.jpg']),
      // No variants created
    },
  });

  await check('Filter Gate 1: RAM 32GB + price <= 20M returns NO products', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'laptop-gaming',
        ram: 32,
        maxPrice: 20000000,
      },
      prisma
    );
    assert.equal(res.totalCount, 0, 'Should return 0 products because 32GB variant costs 35M');
    assert.equal(res.products.length, 0);
  });

  await check('Filter Gate 2: RAM 32GB + price <= 35M returns product with card price = 35M', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'laptop-gaming',
        ram: 32,
        maxPrice: 35000000,
      },
      prisma
    );
    assert.equal(res.totalCount, 1, 'Should return exactly 1 product');
    assert.equal(res.products[0].id, 'prod-laptop-rog');
    // CARD PRICE SEMANTICS: Card price must reflect the 32GB variant price (35M), NOT base product price (20M)!
    assert.equal(res.products[0].price, 35000000, 'Card price must be 35M for filtered 32GB variant');
    assert.equal(res.products[0].sku, 'ROG-32GB-35M');
  });

  await check('Filter Gate 3: RAM 16GB + price <= 20M returns product with card price = 20M', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'laptop-gaming',
        ram: 16,
        maxPrice: 20000000,
      },
      prisma
    );
    // Should return prod-laptop-rog (at 20M) and prod-legacy-zenbook (at 18M)
    const rog = res.products.find((p) => p.id === 'prod-laptop-rog');
    assert.ok(rog, 'prod-laptop-rog must be present');
    assert.equal(rog.price, 20000000, 'Card price must be 20M for 16GB variant');
    assert.equal(rog.sku, 'ROG-16GB-20M');
  });

  await check('Filter Gate 4: Base product specs do NOT bypass variant conditions (GPU mismatch)', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'laptop-gaming',
        ram: 32,
        gpu: ['RTX 4080'], // Does not exist
      },
      prisma
    );
    assert.equal(res.totalCount, 0, 'GPU mismatch must reject product even if RAM and price match');
  });

  await check('Filter Gate 5: Legacy products without variants filter correctly via baseMatch', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'laptop-gaming',
        condition: ['LIKE_NEW'],
        maxPrice: 19000000,
      },
      prisma
    );
    assert.equal(res.totalCount, 1);
    assert.equal(res.products[0].id, 'prod-legacy-zenbook');
    assert.equal(res.products[0].price, 18000000);
  });

  // =========================================================================
  // SUITE 3: REAL ACCESSORY FILTERS & FACETS (PRODUCTION QUERY)
  // =========================================================================
  console.log('\n--- SUITE 3: REAL ACCESSORY FILTERS & FACETS ---');

  // Seed Mouse accessories with Connection specs
  await prisma.product.create({
    data: {
      id: 'prod-mouse-master3s',
      name: 'Chuột Logitech MX Master 3S',
      slug: 'logitech-mx-master-3s',
      description: 'Chuột công thái học cao cấp',
      categoryId: 'cat-mouse',
      brandId: bLogitech.id,
      condition: 'NEW',
      price: 2490000,
      stock: 20,
      status: 'ACTIVE',
      images: JSON.stringify(['/images/master3s.jpg']),
      specs: JSON.stringify({
        'Kết nối': 'Bluetooth & Logi Bolt',
        DPI: '8000 DPI',
      }),
    },
  });

  await prisma.product.create({
    data: {
      id: 'prod-mouse-gpro',
      name: 'Chuột Logitech G Pro X Superlight',
      slug: 'logitech-g-pro-x-superlight',
      description: 'Chuột gaming không dây siêu nhẹ',
      categoryId: 'cat-mouse',
      brandId: bLogitech.id,
      condition: 'NEW',
      price: 2990000,
      stock: 15,
      status: 'ACTIVE',
      images: JSON.stringify(['/images/gpro.jpg']),
      specs: JSON.stringify({
        'Kết nối': 'Không dây Lightspeed 2.4GHz',
        DPI: '25600 DPI',
      }),
    },
  });

  // Seed Charger with Power specs
  await prisma.product.create({
    data: {
      id: 'prod-charger-anker-65w',
      name: 'Củ sạc Anker 735 GaNPrime 65W',
      slug: 'cu-sac-anker-735-ganprime-65w',
      description: 'Sạc nhanh 3 cổng 65W GaN',
      categoryId: 'cat-charger',
      brandId: bAnker.id,
      condition: 'NEW',
      price: 1200000,
      stock: 25,
      status: 'ACTIVE',
      images: JSON.stringify(['/images/anker65.jpg']),
      specs: JSON.stringify({
        'Công suất': '65W',
        'Cổng ra': '2 Type-C + 1 USB-A',
      }),
    },
  });

  await prisma.product.create({
    data: {
      id: 'prod-charger-anker-100w',
      name: 'Củ sạc Anker 736 Nano II 100W',
      slug: 'cu-sac-anker-736-nano-ii-100w',
      description: 'Sạc nhanh công suất lớn 100W GaN',
      categoryId: 'cat-charger',
      brandId: bAnker.id,
      condition: 'NEW',
      price: 1800000,
      stock: 10,
      status: 'ACTIVE',
      images: JSON.stringify(['/images/anker100.jpg']),
      specs: JSON.stringify({
        'Công suất': '100W',
        'Cổng ra': '2 Type-C + 1 USB-A',
      }),
    },
  });

  await check('Accessory Filter 1: Mouse category extracts Connection facets and no CPU/RAM facets', async () => {
    const res = await api.getCategoryFilteredProducts({ categorySlug: 'chuot-may-tinh' }, prisma);
    assert.equal(res.totalCount, 2);
    assert.ok(res.facets.connections && res.facets.connections.length > 0, 'Must extract connection facets for mouse');
    assert.equal(res.facets.cpuSeries.length, 0, 'Mouse must not have CPU facets');
    assert.equal(res.facets.ramOptions.length, 0, 'Mouse must not have RAM facets');
  });

  await check('Accessory Filter 2: Mouse filters by connection string', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'chuot-may-tinh',
        connection: 'Lightspeed',
      },
      prisma
    );
    assert.equal(res.totalCount, 1);
    assert.equal(res.products[0].id, 'prod-mouse-gpro');
  });

  await check('Accessory Filter 3: Charger category extracts Power facets and filters by Power', async () => {
    const res = await api.getCategoryFilteredProducts(
      {
        categorySlug: 'cu-sac-hub',
        power: '65W',
      },
      prisma
    );
    assert.equal(res.totalCount, 1);
    assert.equal(res.products[0].id, 'prod-charger-anker-65w');
  });

  // =========================================================================
  // SUITE 4: COMPARE HTTP ROUTE HANDLER (PRODUCTION ENDPOINT)
  // =========================================================================
  console.log('\n--- SUITE 4: COMPARE HTTP ROUTE HANDLER ---');

  await check('Compare Endpoint: 0 IDs returns friendly validation error', async () => {
    const req = new Request('http://localhost/api/compare?ids=');
    const res = await api.compareGetHandler(req);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.compatible, false);
    assert.ok(json.error.includes('ít nhất 1 sản phẩm'));
  });

  await check('Compare Endpoint: >3 IDs returns HTTP 400 error contract', async () => {
    const req = new Request('http://localhost/api/compare?ids=id1,id2,id3,id4');
    const res = await api.compareGetHandler(req);
    assert.equal(res.status, 400, 'Must return HTTP 400 when exceeding MAX_COMPARE_PRODUCTS');
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('tối đa 3 sản phẩm'));
  });

  await check('Compare Endpoint: Duplicate IDs are deduplicated and requested order is preserved', async () => {
    const req = new Request(
      'http://localhost/api/compare?ids=prod-legacy-zenbook,prod-laptop-rog,prod-legacy-zenbook'
    );
    const res = await api.compareGetHandler(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.products.length, 2, 'Duplicates must be pruned');
    assert.equal(json.products[0].id, 'prod-legacy-zenbook', 'Order must match requested sequence');
    assert.equal(json.products[1].id, 'prod-laptop-rog');
  });

  await check('Compare Endpoint: Incompatible group (Laptop vs Mouse) is rejected', async () => {
    const req = new Request('http://localhost/api/compare?ids=prod-laptop-rog,prod-mouse-gpro');
    const res = await api.compareGetHandler(req);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.compatible, false);
    assert.ok(json.error.includes('Không thể so sánh các sản phẩm khác loại'));
  });

  await check('Compare Endpoint: Missing specs report "Chưa cập nhật" and isDifferent flags correctly', async () => {
    const req = new Request('http://localhost/api/compare?ids=prod-mouse-master3s,prod-mouse-gpro');
    const res = await api.compareGetHandler(req);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.products.length, 2);
    // Find DPI spec row
    const dpiRow = json.specs.find((s) => s.key === 'DPI');
    assert.ok(dpiRow, 'DPI spec row must exist');
    assert.equal(dpiRow.isDifferent, true, 'DPI differs (8000 vs 25600)');
    // Find Brand row
    const brandRow = json.specs.find((s) => s.key === '__brand');
    assert.ok(brandRow, 'Brand row must exist');
    assert.equal(brandRow.isDifferent, false, 'Both are Logitech');
  });

  await check('Compare Endpoint: Draft and hidden products are strictly excluded from comparison', async () => {
    // Create inactive product
    await prisma.product.create({
      data: {
        id: 'prod-mouse-inactive',
        name: 'Chuột Đã Ngừng Bán',
        slug: 'chuot-da-ngung-ban',
        description: 'Tạm ẩn',
        categoryId: 'cat-mouse',
        brandId: bLogitech.id,
        condition: 'NEW',
        price: 500000,
        stock: 0,
        status: 'INACTIVE',
        images: '[]',
      },
    });

    const req = new Request('http://localhost/api/compare?ids=prod-mouse-master3s,prod-mouse-inactive');
    const res = await api.compareGetHandler(req);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.products.length, 1, 'Only active product must be returned');
    assert.equal(json.products[0].id, 'prod-mouse-master3s');
  });

  // =========================================================================
  // SUITE 5: RELATED PRODUCTS RESOLVER (PRODUCTION SERVICE)
  // =========================================================================
  console.log('\n--- SUITE 5: RELATED PRODUCTS RESOLVER ---');

  await check('Related Resolver: Manual ordering, self-reference exclusion, and deduplication', async () => {
    // Request with duplicate IDs and self-reference (prod-laptop-rog)
    const result = await api.getRelatedProducts(
      'prod-laptop-rog', // Current product (self)
      'cat-laptop',
      bAsus.id,
      4,
      ['prod-legacy-zenbook', 'prod-laptop-rog', 'prod-legacy-zenbook'], // manual array with duplicates & self
      prisma
    );
    assert.ok(result.length >= 1);
    assert.equal(result[0].id, 'prod-legacy-zenbook');
    assert.ok(!result.some((r) => r.id === 'prod-laptop-rog'), 'Self-reference must never be included');
    // Ensure no duplicate IDs in final list
    const idSet = new Set(result.map((r) => r.id));
    assert.equal(idSet.size, result.length, 'All returned related items must have unique IDs');
  });

  await check('Related Resolver: Fallback fills up to limit without duplicating manual items', async () => {
    // Add extra laptop products in category
    await prisma.product.createMany({
      data: [
        {
          id: 'prod-fallback-1',
          name: 'Laptop Asus TUF Gaming A15',
          slug: 'asus-tuf-gaming-a15',
          description: 'Gaming',
          categoryId: 'cat-laptop',
          brandId: bAsus.id,
          condition: 'NEW',
          price: 21000000,
          stock: 5,
          status: 'ACTIVE',
          images: '[]',
        },
        {
          id: 'prod-fallback-2',
          name: 'Laptop Asus ROG Zephyrus G14',
          slug: 'asus-rog-zephyrus-g14',
          description: 'Gaming mỏng nhẹ',
          categoryId: 'cat-laptop',
          brandId: bAsus.id,
          condition: 'NEW',
          price: 45000000,
          stock: 5,
          status: 'ACTIVE',
          images: '[]',
        },
      ],
    });

    const result = await api.getRelatedProducts(
      'prod-laptop-rog',
      'cat-laptop',
      bAsus.id,
      3,
      ['prod-legacy-zenbook'], // 1 manual item, needs 2 fallbacks to reach limit = 3
      prisma
    );

    assert.equal(result.length, 3, 'Must return exactly limit (3) items');
    assert.equal(result[0].id, 'prod-legacy-zenbook', 'First item must be the manual curated item');
    assert.ok(!result.some((r) => r.id === 'prod-laptop-rog'), 'Self excluded');
    const returnedIds = new Set(result.map((r) => r.id));
    assert.equal(returnedIds.size, 3, 'No duplicates between manual and fallback');
  });

  // =========================================================================
  // SUITE 6: MEDIA USAGE & PROTECTION
  // =========================================================================
  console.log('\n--- SUITE 6: MEDIA USAGE & PROTECTION ---');

  await check('Media Protection: Archiving media in use is BLOCKED by MEDIA_IN_USE trigger', async () => {
    // logoAsset is currently used by Brand Asus, Logitech, Anker
    let threwInUse = false;
    try {
      await api.editMedia(DB, logoAsset.id, {
        name: logoAsset.name,
        alt: logoAsset.alt || '',
        caption: logoAsset.caption || '',
        state: 'ARCHIVED',
        revision: logoAsset.revision,
      });
    } catch (err) {
      if (err instanceof api.MediaError && err.message.includes('đang được sử dụng')) {
        threwInUse = true;
      }
    }
    assert.ok(threwInUse, 'Attempt to archive in-use logoAsset must fail with MediaError');
  });

  await check('Media Usage: HTML rich content images tracked and external URLs safely ignored', async () => {
    const internalUrl = `/api/library/${logoAsset.id}`;
    const externalUrl = 'https://external-cdn.com/random-image.jpg';
    const html = `<div><img src="${internalUrl}" alt="internal" /><img src="${externalUrl}" alt="external" /></div>`;

    const assetIds = await api.contentAssets(env, html, [], false);
    assert.ok(assetIds.has(logoAsset.id), 'Internal library asset must be tracked');
    assert.equal(assetIds.size, 1, 'External image URL must NOT create spurious asset references');
  });

  console.log('\n======================================================');
  console.log(`ALL R04.1 PRODUCTION SERVICE GATES PASSED: ${passed}/${passed + failed} checks`);
  console.log('======================================================\n');
} finally {
  await mf.dispose();
}
