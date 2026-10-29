import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { chromium } from 'file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';

await mkdir('.wrangler/audit-public', { recursive: true });
const testLogStream = createWriteStream('.wrangler/audit-public/r2-test.log', { flags: 'w' });
const sanitizeLog = (str) =>
  String(str).replace(/admin_session=[^;\s&]+/gi, 'admin_session=[REDACTED]');
const origStdout = process.stdout.write.bind(process.stdout);
const origStderr = process.stderr.write.bind(process.stderr);
process.stdout.write = (chunk, enc, cb) => {
  testLogStream.write(sanitizeLog(chunk));
  return origStdout(chunk, enc, cb);
};
process.stderr.write = (chunk, enc, cb) => {
  testLogStream.write(sanitizeLog(chunk));
  return origStderr(chunk, enc, cb);
};

const parseEnv = (s) =>
  Object.fromEntries(
    s
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
      })
  );

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log('PASS: ' + name);
}

// ============================================================================
// PART 1: ISOLATED MINIFLARE SERVICE & CONTRACT VERIFICATION
// ============================================================================
console.log('--- Part 1: Isolated Miniflare Service & Contract Verification ---');

const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/media-library.service';
      export * from './src/contracts/cms/product-studio';
      export * from './src/server/services/storefront-cms.service';
      export * from './src/server/services/catalog.service';
      export * from './src/server/services/search.service';
      export * from './src/server/services/pricing.service';
      export * from './src/server/services/order.service';
      export * from './src/lib/prisma';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['node:*', 'cloudflare:workers', '*.wasm?module'],
  plugins: [
    {
      name: 'mock-server-only',
      setup(b) {
        b.onResolve({ filter: /^server-only$/ }, (args) => ({ path: args.path, namespace: 'server-only-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'server-only-ns' }, () => ({ contents: '' }));
      },
    },
  ],
  write: false,
});

const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r2-audit"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const mfEnv = { DB, PRODUCT_MEDIA };
  const prisma = api.getPrismaClient(DB);
  const pricingCtx = { flashSaleEnabled: false, flashSaleTitle: '', flashSaleStartAt: '', flashSaleEndAt: '' };

  for (const f of (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await DB.batch(unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`, 'utf8')).map((s) => DB.prepare(s)));
  }

  await DB.prepare(
    "INSERT INTO Category(id, name, slug, status, updatedAt) VALUES('cat-gaming', 'Laptop Gaming', 'laptop-gaming', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run();
  await DB.prepare(
    "INSERT INTO Brand(id, name, slug, status, updatedAt) VALUES('brand-asus', 'ASUS', 'asus', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run();

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64'
  );
  const asset = (await api.uploadLibraryImage(mfEnv, new File([png], 'laptop.png', { type: 'image/png' }))).asset;

  await check('Shared parser & storage bucket normalization (1TB / 1024GB / 1000GB -> 1024, never 2048)', async () => {
    assert.equal(api.parseStorageGb('1TB'), 1024);
    assert.equal(api.parseStorageGb('1 TB NVMe'), 1024);
    assert.equal(api.parseStorageGb('1024GB SSD'), 1024);
    assert.equal(api.parseStorageGb('1000GB'), 1024);
    assert.equal(api.parseStorageGb('2TB'), 2048);
    assert.equal(api.parseStorageGb('2048GB'), 2048);
    assert.equal(api.parseStorageGb('2000GB'), 2048);

    const row1000 = {
      id: 'storage-review',
      name: 'Capacity Test',
      slug: 'capacity-test',
      description: '',
      price: 15000000,
      images: '[]',
      condition: 'NEW',
      stock: 5,
      variants: [
        {
          id: 'v-1000',
          price: 15000000,
          originalPrice: null,
          sku: 'SKU-1000',
          name: '16GB / 1000GB',
          stock: 5,
          ram: '16GB',
          storage: '1000GB',
        },
      ],
    };
    assert.equal(api.mapD1ProductToHomepageProduct(row1000, { storage: [2048] }, pricingCtx).matchesFilter, false);
    assert.equal(api.mapD1ProductToHomepageProduct(row1000, { storage: [1024] }, pricingCtx).matchesFilter, true);
  });

  await check('Publish updates Product cpuSeries/gpuSeries/ramGb/storageGb/condition and clears stale series', async () => {
    const createRes = await api.writeStudio(mfEnv, null, {
      expectedRevision: 0,
      action: 'publish',
      document: {
        ...api.blankProduct(),
        name: 'AUDIT R2 Asus Nitro 5',
        slug: 'audit-r2-asus-nitro-5',
        categoryId: 'cat-gaming',
        brand: 'ASUS',
        brandId: 'brand-asus',
        template: 'LAPTOP',
        condition: 'NEW',
        price: 18500000,
        availability: 'AVAILABLE',
        media: [{ assetId: asset.id, alt: 'Laptop R2', variantId: '' }],
        specs: [
          { key: 'CPU', value: 'Intel Core i5-12500H' },
          { key: 'GPU', value: 'GTX 1650' },
          { key: 'RAM', value: '16GB' },
          { key: 'SSD', value: '512GB' },
          { key: 'Màn hình', value: '15.6 inch 144Hz' },
        ],
        variants: [
          {
            id: 'var-init',
            name: '16GB / 512GB',
            sku: 'INIT-SKU',
            condition: 'NEW',
            price: 18500000,
            originalPrice: null,
            availability: 'AVAILABLE',
            ram: '16GB',
            storage: '512GB',
            gpu: 'GTX 1650',
            options: {},
          },
        ],
        warranties: [{ name: '12T', description: 'BH', adjustment: 0, recommended: true }],
      },
    });

    const prodId = createRes.id;
    await DB.prepare("UPDATE Product SET cpuSeries='Core i5', gpuSeries='GTX 1650' WHERE id=?").bind(prodId).run();

    const doc = structuredClone(createRes.document);
    doc.condition = 'NEW';
    doc.specs = [
      { key: 'CPU', value: 'AMD Ryzen 7 8845HS' },
      { key: 'GPU', value: 'RTX 4070' },
      { key: 'RAM', value: '16GB' },
      { key: 'SSD', value: '512GB' },
      { key: 'Màn hình', value: '15.6 inch 144Hz' },
    ];
    doc.variants = [
      {
        id: 'review-variant',
        name: 'Used 32GB / 2TB',
        sku: 'REVIEW-SKU',
        condition: 'USED',
        price: 12000000,
        originalPrice: 15000000,
        availability: 'AVAILABLE',
        ram: '32GB',
        storage: '2048GB',
        gpu: 'RTX 4070',
        options: {},
      },
    ];

    await api.writeStudio(mfEnv, prodId, {
      action: 'publish',
      expectedRevision: createRes.revision,
      document: doc,
    });

    const projected = await DB.prepare(
      'SELECT cpu, cpuSeries, gpu, gpuSeries, ram, ramGb, storage, storageGb, condition FROM Product WHERE id=?'
    )
      .bind(prodId)
      .first();
    assert.equal(projected.cpu, 'AMD Ryzen 7 8845HS');
    assert.equal(projected.cpuSeries, 'Ryzen 7');
    assert.equal(projected.gpu, 'RTX 4070');
    assert.equal(projected.gpuSeries, 'RTX 4070');
    assert.equal(projected.ram, '32GB');
    assert.equal(projected.ramGb, 32);
    assert.equal(projected.storage, '2048GB');
    assert.equal(projected.storageGb, 2048);
    assert.equal(projected.condition, 'USED');

    const search = await api.searchProducts({ query: 'REVIEW-SKU' }, prisma, pricingCtx);
    assert.equal(search.totalCount, 1);
    assert.equal(search.products[0].specs.ram, '32GB');
    assert.equal(search.products[0].specs.ssd, '2048GB');
    assert.equal(search.products[0].condition, 'USED');
    assert.deepEqual(search.facets.ramOptions, [{ value: 32, label: '32GB', count: 1 }]);
    assert.deepEqual(search.facets.storageOptions, [{ value: 2048, label: '2TB', count: 1 }]);

    const staleCpuSearch = await api.searchProducts({ query: 'REVIEW-SKU', cpu: 'Core i5' }, prisma, pricingCtx);
    assert.equal(staleCpuSearch.totalCount, 0);

    const validCpuSearch = await api.searchProducts({ query: 'REVIEW-SKU', cpu: 'Ryzen 7' }, prisma, pricingCtx);
    assert.equal(validCpuSearch.totalCount, 1);
  });

  await check('Multi-variant product enforces single-variant atomic matching, excludes unpublished variants, and counts facets once per product', async () => {
    const createMulti = await api.writeStudio(mfEnv, null, {
      expectedRevision: 0,
      action: 'publish',
      document: {
        ...api.blankProduct(),
        name: 'AUDIT R2 Multi Variant Laptop',
        slug: 'audit-r2-multi-variant-laptop',
        categoryId: 'cat-gaming',
        brand: 'ASUS',
        brandId: 'brand-asus',
        template: 'LAPTOP',
        condition: 'NEW',
        price: 15500000,
        availability: 'AVAILABLE',
        media: [{ assetId: asset.id, alt: 'Laptop R2 Multi', variantId: '' }],
        specs: [
          { key: 'CPU', value: 'AMD Ryzen 7 8845HS' },
          { key: 'RAM', value: '16GB' },
          { key: 'SSD', value: '512GB' },
          { key: 'GPU', value: 'RTX 3050' },
          { key: 'Màn hình', value: '16 inch 165Hz' },
        ],
        variants: [
          {
            id: 'var-a-16-512-new',
            sku: 'R2-MULTI-A',
            name: '16GB / 512GB / Mới',
            condition: 'NEW',
            price: 15500000,
            originalPrice: 17500000,
            availability: 'AVAILABLE',
            ram: '16GB',
            storage: '512GB',
            gpu: 'RTX 3050',
            options: { CPU: 'Intel Core i5-13420H', 'Màu sắc': 'Đen' },
          },
          {
            id: 'var-a2-16-512-new',
            sku: 'R2-MULTI-A2',
            name: '16GB / 512GB / Bạc',
            condition: 'NEW',
            price: 15800000,
            originalPrice: 17500000,
            availability: 'AVAILABLE',
            ram: '16GB',
            storage: '512GB',
            gpu: 'RTX 3050',
            options: { CPU: 'Intel Core i5-13420H', 'Màu sắc': 'Bạc' },
          },
          {
            id: 'var-b-32-1tb-used',
            sku: 'R2-MULTI-B',
            name: '32GB / 1TB / Cũ',
            condition: 'USED',
            price: 22500000,
            originalPrice: 25900000,
            availability: 'AVAILABLE',
            ram: '32GB',
            storage: '1000GB',
            gpu: 'RTX 4070',
            options: { CPU: 'AMD Ryzen 7 8845HS', 'Màu sắc': 'Đen' },
          },
          {
            id: 'var-c-64-2tb-unpub',
            sku: 'R2-MULTI-C-UNPUB',
            name: '64GB / 2TB / Hết hàng',
            condition: 'LIKE_NEW',
            price: 35000000,
            originalPrice: 39000000,
            availability: 'UNAVAILABLE',
            ram: '64GB',
            storage: '2048GB',
            gpu: 'RTX 4090',
            options: { CPU: 'Intel Core i9-14900HX' },
          },
        ],
        warranties: [{ name: '12T', description: 'BH', adjustment: 0, recommended: true }],
      },
    });

    const multiId = createMulti.id;
    const multiSlug = createMulti.document.slug;

    // 1. Negative combined filter: RAM 16GB (Variant A) + Storage 1024GB/1TB (Variant B) must NOT match!
    const crossRamStorage = await api.searchProducts(
      { query: 'AUDIT R2 Multi Variant', ram: [16], storage: [1024] },
      prisma,
      pricingCtx
    );
    assert.equal(crossRamStorage.products.some((p) => p.id === multiId), false);

    // 2. Negative combined filter: RAM 32GB (Variant B) + Condition NEW (Variant A) must NOT match!
    const crossRamCond = await api.searchProducts(
      { query: 'AUDIT R2 Multi Variant', ram: [32], condition: ['NEW'] },
      prisma,
      pricingCtx
    );
    assert.equal(crossRamCond.products.some((p) => p.id === multiId), false);

    // 3. Negative combined filter: CPU Ryzen 7 (Variant B) + GPU RTX 3050 (Variant A) must NOT match!
    const crossCpuGpu = await api.searchProducts(
      { query: 'AUDIT R2 Multi Variant', cpu: ['Ryzen 7'], gpu: ['RTX 3050'] },
      prisma,
      pricingCtx
    );
    assert.equal(crossCpuGpu.products.some((p) => p.id === multiId), false);

    // 4. Negative filter on unavailable/unpublished Variant C (64GB / 2TB / RTX 4090 / R2-MULTI-C-UNPUB)
    const unpubSku = await api.searchProducts({ query: 'R2-MULTI-C-UNPUB' }, prisma, pricingCtx);
    assert.equal(unpubSku.totalCount, 0);
    const unpubRam = await api.searchProducts({ query: 'AUDIT R2 Multi Variant', ram: [64] }, prisma, pricingCtx);
    assert.equal(unpubRam.products.some((p) => p.id === multiId), false);

    // 5. Positive combined filter on Variant B: 32GB + 1024GB (1000GB) + USED + RTX 4070 + Ryzen 7
    const matchVarB = await api.searchProducts(
      {
        query: 'AUDIT R2 Multi Variant',
        ram: [32],
        storage: [1024],
        condition: ['USED'],
        gpu: ['RTX 4070'],
        cpu: ['Ryzen 7'],
      },
      prisma,
      pricingCtx
    );
    const hitB = matchVarB.products.find((p) => p.id === multiId);
    assert.ok(hitB, 'Variant B must match when all its attributes are selected');
    assert.equal(hitB.variantId, 'var-b-32-1tb-used');
    assert.equal(hitB.sku, 'R2-MULTI-B');
    assert.equal(hitB.condition, 'USED');
    assert.equal(hitB.specs.ram, '32GB');
    assert.equal(hitB.specs.ssd, '1000GB');
    assert.equal(hitB.specs.gpu, 'RTX 4070');
    assert.equal(hitB.specs.cpu, 'AMD Ryzen 7 8845HS');

    // 6. Facet counts per product (no double-counting even though Variant A and Variant A2 both have 16GB/512GB/NEW/Core i5/RTX 3050)
    const allForProd = await api.searchProducts({ query: 'R2-MULTI' }, prisma, pricingCtx);
    assert.equal(allForProd.totalCount, 1);
    assert.deepEqual(allForProd.facets.ramOptions, [
      { value: 16, label: '16GB', count: 1 },
      { value: 32, label: '32GB', count: 1 },
    ]);
    assert.deepEqual(allForProd.facets.storageOptions, [
      { value: 512, label: '512GB', count: 1 },
      { value: 1024, label: '1TB', count: 1 },
    ]);
    assert.equal(allForProd.facets.conditions.find((c) => c.value === 'NEW')?.count, 1);
    assert.equal(allForProd.facets.conditions.find((c) => c.value === 'USED')?.count, 1);
    assert.equal(allForProd.facets.conditions.find((c) => c.value === 'LIKE_NEW'), undefined);

    // 7. PDP getProductDetail reflects selected variant (by SKU or ID) including condition, fullSpecs, and rejects unavailable variant
    const detailA = await api.getProductDetail(multiSlug, 'R2-MULTI-A', prisma, pricingCtx);
    assert.ok(detailA);
    assert.equal(detailA.selectedSku, 'R2-MULTI-A');
    assert.equal(detailA.condition, 'NEW');
    assert.equal(detailA.specs.ram, '16GB');
    assert.equal(detailA.specs.ssd, '512GB');
    assert.equal(detailA.specs.gpu, 'RTX 3050');
    assert.equal(detailA.specs.cpu, 'Intel Core i5-13420H');

    const detailB = await api.getProductDetail(multiSlug, 'R2-MULTI-B', prisma, pricingCtx);
    assert.ok(detailB);
    assert.equal(detailB.selectedSku, 'R2-MULTI-B');
    assert.equal(detailB.condition, 'USED');
    assert.equal(detailB.conditionLabel, 'Đã qua sử dụng');
    assert.equal(detailB.specs.ram, '32GB');
    assert.equal(detailB.specs.ssd, '1000GB');
    assert.equal(detailB.specs.gpu, 'RTX 4070');
    assert.equal(detailB.specs.cpu, 'AMD Ryzen 7 8845HS');

    const detailUnpub = await api.getProductDetail(multiSlug, 'R2-MULTI-C-UNPUB', prisma, pricingCtx);
    assert.equal(detailUnpub, null);
  });

  await check('Category filtering & pagination work without arbitrary limit*2 truncation and active/expired campaign pricing stays consistent', async () => {
    for (let i = 1; i <= 30; i++) {
      const id = `r2-page-prod-${String(i).padStart(2, '0')}`;
      const slug = `r2-page-prod-${String(i).padStart(2, '0')}`;
      const isTarget = i > 25;
      const cond = isTarget ? 'USED' : 'NEW';
      const ram = isTarget ? '32GB' : '16GB';
      const storage = isTarget ? '1000GB' : '512GB';
      const pubDoc = {
        ...api.blankProduct(),
        name: `R2 Page Laptop ${i}`,
        slug,
        template: 'LAPTOP',
        categoryId: 'cat-gaming',
        brand: 'ASUS',
        condition: 'NEW',
        availability: 'AVAILABLE',
        price: isTarget ? 21000000 : 14000000,
        originalPrice: null,
        media: [{ assetId: asset.id, alt: `Img ${i}`, variantId: '' }],
        specs: [
          { key: 'CPU', value: isTarget ? 'AMD Ryzen 7 8845HS' : 'Intel Core i5-12450H' },
          { key: 'RAM', value: ram },
          { key: 'SSD', value: storage },
          { key: 'GPU', value: isTarget ? 'RTX 4060' : 'GTX 1650' },
        ],
        variants: [
          {
            id: `v-${id}`,
            sku: `SKU-${id}`,
            name: `${ram} / ${storage}`,
            condition: cond,
            price: isTarget ? 21000000 : 14000000,
            originalPrice: null,
            availability: 'AVAILABLE',
            ram,
            storage,
            gpu: isTarget ? 'RTX 4060' : 'GTX 1650',
            options: {},
          },
        ],
      };
      await DB.prepare(
        "INSERT INTO Product(id,name,slug,description,price,categoryId,condition,cpu,cpuSeries,gpu,gpuSeries,ram,ramGb,storage,storageGb,status,createdAt,updatedAt) VALUES(?,?,?,'',?,'cat-gaming','NEW',?,?,?,?,?,?,?,?,'ACTIVE',datetime('now', ?),CURRENT_TIMESTAMP)"
      )
        .bind(
          id,
          pubDoc.name,
          slug,
          pubDoc.price,
          isTarget ? 'AMD Ryzen 7 8845HS' : 'Intel Core i5-12450H',
          isTarget ? 'Ryzen 7' : 'Core i5',
          isTarget ? 'RTX 4060' : 'GTX 1650',
          isTarget ? 'RTX 4060' : 'GTX 1650',
          ram,
          isTarget ? 32 : 16,
          storage,
          isTarget ? 1024 : 512,
          `-${i} minutes`
        )
        .run();
      await DB.prepare('INSERT INTO ProductStudio(productId,revision,publishedRevision,draft,published) VALUES(?,1,1,?,?)')
        .bind(id, JSON.stringify(pubDoc), JSON.stringify(pubDoc))
        .run();
      await DB.prepare(
        "INSERT INTO ProductVariant(id,productId,sku,name,options,price,status,cpu,ram,storage,gpu,updatedAt) VALUES(?,?,?,?,?,?,'ACTIVE',?,?,?,?,CURRENT_TIMESTAMP)"
      )
        .bind(
          `v-${id}`,
          id,
          `SKU-${id}`,
          `${ram} / ${storage}`,
          JSON.stringify({ condition: cond }),
          pubDoc.price,
          isTarget ? 'AMD Ryzen 7 8845HS' : 'Intel Core i5-12450H',
          ram,
          storage,
          isTarget ? 'RTX 4060' : 'GTX 1650'
        )
        .run();
    }

    const likeNew = await api.getLikeNewProducts(5, prisma, pricingCtx);
    assert.equal(likeNew.length, 5, 'getLikeNewProducts must not truncate at limit*2 when >2*limit newer products do not match');

    const catFilteredP1 = await api.getCategoryFilteredProducts(
      { categorySlug: 'laptop-gaming', ram: [32], storage: [1024], condition: ['USED'], page: 1, limit: 3 },
      prisma,
      pricingCtx
    );
    assert.ok(catFilteredP1.totalCount >= 5);
    assert.equal(catFilteredP1.products.length, 3);
    assert.ok(catFilteredP1.totalPages >= 2);

    const catFilteredP2 = await api.getCategoryFilteredProducts(
      { categorySlug: 'laptop-gaming', ram: [32], storage: [1024], condition: ['USED'], page: 2, limit: 3 },
      prisma,
      pricingCtx
    );
    assert.ok(catFilteredP2.products.length >= 2);
  });
} finally {
  await mf.dispose();
}

// ============================================================================
// PART 2: BROWSER VERIFICATION USING UNIQUE "AUDIT" DEMO PRODUCT + ARCHIVE API
// ============================================================================
console.log('\n--- Part 2: Browser Verification (Unique AUDIT Demo Product via API -> PDP RSC Variant Sync -> Search/Category/Compare/Cart/Quote -> Archive API) ---');

const base = process.argv[2] || 'http://localhost:3001';
const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
const evidenceDir = 'docs/admin/evidence';
await mkdir(evidenceDir, { recursive: true });
await mkdir('.wrangler/audit-public', { recursive: true });

const sessionCachePath = '.wrangler/audit-public/.admin-session-cache.json';
async function isSessionValid(token) {
  if (!token) return false;
  try {
    const res = await fetch(base + '/api/dashboard', {
      headers: { Cookie: `admin_session=${token}` },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

let cookie = env.ADMIN_SESSION_COOKIE?.replace(/^admin_session=/, '').trim() || '';
if (!(await isSessionValid(cookie))) {
  cookie = '';
  try {
    const cached = JSON.parse(await readFile(sessionCachePath, 'utf8'));
    if (cached?.cookie && (await isSessionValid(cached.cookie))) {
      cookie = cached.cookie;
      console.log('Reused valid cached admin session from ' + sessionCachePath);
    }
  } catch {}
}

if (!cookie) {
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
  });
  assert.equal(loginRes.status, 200, 'Admin login must succeed');
  cookie = loginRes.headers
    .getSetCookie()
    .find((v) => v.startsWith('admin_session='))
    ?.split(';')[0]
    .slice(14);
  assert.ok(cookie, 'Session cookie must be present');
  await writeFile(sessionCachePath, JSON.stringify({ cookie, savedAt: new Date().toISOString() }, null, 2));
}

// Read an existing published product via real Admin Studio API (read-only) to reuse its verified READY media assetId
const refProdRes = await fetch(base + '/api/admin/product-studio/p-macbook-pro-m3-14', {
  headers: { Cookie: `admin_session=${cookie}` },
});
assert.equal(refProdRes.status, 200, 'Must read reference product studio detail');
const refProdJson = await refProdRes.json();
const refDetail = refProdJson.data || refProdJson;
const readyAssetId = refDetail.document?.media?.[0]?.assetId;
assert.ok(readyAssetId, 'Reference product must have a READY media assetId');

const runTag = Date.now().toString(36);
const AUDIT_SLUG = `audit-r2-laptop-sync-${runTag}`;
const SKU_1 = `AUDIT-R2-16-512-${runTag.toUpperCase()}`;
const SKU_2 = `AUDIT-R2-32-1TB-${runTag.toUpperCase()}`;
const SKU_3_UNPUB = `AUDIT-R2-64-2TB-UNPUB-${runTag.toUpperCase()}`;
const VAR_1_ID = `audit-r2-v1-${runTag}`;
const VAR_2_ID = `audit-r2-v2-${runTag}`;
const VAR_3_ID = `audit-r2-v3-${runTag}`;

let auditProductId = '';
let zoomMetrics = null;

const browser = await chromium.launch({
  executablePath: env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

try {
  const auditDoc = {
    ...api.blankProduct(),
    name: `AUDIT R2 Laptop Gaming ${runTag}`,
    slug: AUDIT_SLUG,
    categoryId: 'cat-gaming',
    brand: 'Lenovo',
    brandId: 'br-lenovo',
    template: 'LAPTOP',
    condition: 'NEW',
    price: 16490000,
    originalPrice: 18990000,
    availability: 'AVAILABLE',
    description: 'AUDIT R2 multi-variant test product.',
    contentHtml: '<p>AUDIT R2 multi-variant test product.</p>',
    specs: [
      { key: 'CPU', value: 'AMD Ryzen 7 8845HS' },
      { key: 'RAM', value: '16GB DDR5' },
      { key: 'SSD', value: '512GB NVMe' },
      { key: 'GPU', value: 'RTX 4050 6GB' },
      { key: 'Màn hình', value: '15.6 inch FHD 144Hz' },
    ],
    media: [{ assetId: readyAssetId, alt: 'AUDIT R2 Laptop Image', variantId: '' }],
    variants: [
      {
        id: VAR_1_ID,
        sku: SKU_1,
        name: '16GB / 512GB / Mới',
        condition: 'NEW',
        price: 16490000,
        originalPrice: 18990000,
        availability: 'AVAILABLE',
        ram: '16GB DDR5',
        storage: '512GB NVMe',
        gpu: 'RTX 4050 6GB',
        options: { CPU: 'Intel Core i5-12450H', 'Màu sắc': 'Đen Obsidian' },
      },
      {
        id: VAR_2_ID,
        sku: SKU_2,
        name: '32GB / 1TB / Đã qua sử dụng',
        condition: 'USED',
        price: 21490000,
        originalPrice: 24990000,
        availability: 'AVAILABLE',
        ram: '32GB DDR5',
        storage: '1000GB NVMe',
        gpu: 'RTX 4070 8GB',
        options: { CPU: 'AMD Ryzen 7 8845HS', 'Màu sắc': 'Đen Obsidian' },
      },
      {
        id: VAR_3_ID,
        sku: SKU_3_UNPUB,
        name: '64GB / 2TB / Ngừng bán',
        condition: 'LIKE_NEW',
        price: 34990000,
        originalPrice: 38990000,
        availability: 'UNAVAILABLE',
        ram: '64GB DDR5',
        storage: '2048GB NVMe',
        gpu: 'RTX 4090 16GB',
        options: { CPU: 'Intel Core i9-14900HX' },
      },
    ],
    warranties: [{ name: 'Bảo hành 12 tháng', description: 'Bảo hành tiêu chuẩn', adjustment: 0, recommended: true }],
  };

  const pubRes = await fetch(base + '/api/admin/product-studio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `admin_session=${cookie}`,
      Origin: base,
    },
    body: JSON.stringify({
      action: 'publish',
      expectedRevision: 0,
      document: auditDoc,
    }),
  });
  assert.equal(pubRes.status, 200, 'Admin POST /api/admin/product-studio publish of AUDIT product must succeed');
  const pubJson = await pubRes.json();
  auditProductId = (pubJson.data || pubJson).id;
  assert.ok(auditProductId, 'Created AUDIT product must return an id');

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'admin_session', value: cookie, url: base }]);
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const serverErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const text = m.text();
      if (!text.includes('Content Security Policy directive') && !text.includes('caret-color')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(base) && r.status() >= 500) {
      serverErrors.push({ url: r.url(), status: r.status() });
    }
  });

  await check('Browser PDP (/laptop/<slug>) default variant vs clicked 2nd variant updates URL ?sku via RSC, hero price, condition, #thong-so-ky-thuat, JSON-LD, recentlyViewed, compare, cart/quote + persists on reload', async () => {
    const pdpUrl = `${base}/laptop/${AUDIT_SLUG}`;
    const res = await page.goto(pdpUrl, { waitUntil: 'networkidle', timeout: 30000 });
    assert.equal(res?.status(), 200);

    await page.waitForSelector('#thong-so-ky-thuat [data-spec-key="RAM"]', { timeout: 15000 });

    const initialSpecs = await page.evaluate(() => {
      const getVal = (key) => document.querySelector(`#thong-so-ky-thuat [data-spec-key="${key}"]`)?.textContent?.trim() || '';
      const condHero = document.querySelector('[data-testid="hero-condition-label"]')?.textContent?.trim() || '';
      const galleryBadge = document.querySelector('[data-testid="gallery-condition-badge"]')?.textContent?.trim() || '';
      return {
        ram: getVal('RAM'),
        ssd: getVal('SSD'),
        gpu: getVal('GPU'),
        cpu: getVal('CPU'),
        sku: getVal('SKU'),
        condSpec: getVal('Tình trạng'),
        condHero,
        galleryBadge,
      };
    });

    assert.equal(initialSpecs.ram, '16GB DDR5');
    assert.equal(initialSpecs.ssd, '512GB NVMe');
    assert.equal(initialSpecs.gpu, 'RTX 4050 6GB');
    assert.equal(initialSpecs.cpu, 'Intel Core i5-12450H');
    assert.equal(initialSpecs.sku, SKU_1);
    assert.ok(initialSpecs.condHero.includes('Mới 100%'));
    assert.ok(initialSpecs.galleryBadge.includes('Mới 100%'), 'Initial gallery badge must show NEW condition');

    // Click the 2nd variant card ('32GB / 1TB / Đã qua sử dụng')
    const var2Btn = page.locator('button', { hasText: '32GB / 1TB' }).first();
    await var2Btn.click();
    await page.waitForTimeout(500);
    if (!(await page.evaluate((sku) => window.location.search.includes(`sku=${sku}`), SKU_2))) {
      await var2Btn.click();
    }

    // Wait for Next/RSC router.replace({ scroll: false }) to re-render with ?sku=SKU_2
    await page.waitForFunction(
      (expectedSku) =>
        window.location.search.includes(`sku=${expectedSku}`) &&
        document.querySelector('#thong-so-ky-thuat [data-spec-key="SKU"]')?.textContent?.trim() === expectedSku,
      SKU_2,
      { timeout: 15000 }
    );

    const switchedSpecs = await page.evaluate(() => {
      const getVal = (key) => document.querySelector(`#thong-so-ky-thuat [data-spec-key="${key}"]`)?.textContent?.trim() || '';
      const condHero = document.querySelector('[data-testid="hero-condition-label"]')?.textContent?.trim() || '';
      const galleryBadge = document.querySelector('[data-testid="gallery-condition-badge"]')?.textContent?.trim() || '';
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
        (s) => s.textContent || ''
      );
      const recentRaw = localStorage.getItem('citilap_recently_viewed_v1') || '[]';
      return {
        href: window.location.href,
        ram: getVal('RAM'),
        ssd: getVal('SSD'),
        gpu: getVal('GPU'),
        cpu: getVal('CPU'),
        sku: getVal('SKU'),
        condSpec: getVal('Tình trạng'),
        condHero,
        galleryBadge,
        jsonLdText: jsonLdScripts.join('\n'),
        recent: JSON.parse(recentRaw),
      };
    });

    assert.ok(switchedSpecs.href.includes(`sku=${SKU_2}`), `URL must update ?sku=${SKU_2}`);
    assert.equal(switchedSpecs.ram, '32GB DDR5');
    assert.equal(switchedSpecs.ssd, '1000GB NVMe');
    assert.equal(switchedSpecs.gpu, 'RTX 4070 8GB');
    assert.equal(switchedSpecs.cpu, 'AMD Ryzen 7 8845HS');
    assert.equal(switchedSpecs.sku, SKU_2);
    assert.equal(switchedSpecs.condSpec, 'Đã qua sử dụng');
    assert.ok(switchedSpecs.condHero.includes('Đã qua sử dụng'));
    assert.ok(switchedSpecs.galleryBadge.includes('Đã qua sử dụng'), 'Gallery badge must update to USED condition on variant switch');
    assert.ok(switchedSpecs.jsonLdText.includes(SKU_2), 'JSON-LD must update to selected variant SKU');
    assert.ok(switchedSpecs.jsonLdText.includes('21490000'), 'JSON-LD must update to selected variant price');

    const recentProd = switchedSpecs.recent.find((item) => item.id === auditProductId);
    assert.ok(recentProd, 'Recently viewed localStorage must include auditProductId');
    assert.equal(recentProd.sku, SKU_2);
    assert.equal(recentProd.condition, 'USED');
    assert.equal(recentProd.price, 21490000);
    assert.equal(recentProd.specs?.ram, '32GB DDR5');
    assert.equal(recentProd.specs?.ssd, '1000GB NVMe');

    const compareRes = await fetch(`${base}/api/compare?ids=${auditProductId}`);
    assert.equal(compareRes.status, 200);
    const compareJson = await compareRes.json();
    assert.equal(compareJson.products?.length, 1);
    assert.equal(compareJson.products[0].id, auditProductId);
    assert.equal(compareJson.products[0].condition, 'NEW');
    assert.equal(compareJson.products[0].conditionLabel, 'Mới 100%');
    assert.equal(compareJson.products[0].price, 16490000);
    const ramSpec = compareJson.specs?.find((s) => s.label === 'RAM');
    assert.ok(ramSpec?.values?.[auditProductId]?.includes('16GB'));

    await page.screenshot({ path: `${evidenceDir}/r2-pdp-variant-switched.png` });

    // Reload page with ?sku=SKU_2 and verify SSR renders Variant 2's specs directly
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#thong-so-ky-thuat [data-spec-key="RAM"]', { timeout: 15000 });
    const reloadedRam = await page.locator('#thong-so-ky-thuat [data-spec-key="RAM"]').textContent();
    const reloadedSsd = await page.locator('#thong-so-ky-thuat [data-spec-key="SSD"]').textContent();
    const reloadedCond = await page.locator('#thong-so-ky-thuat [data-spec-key="Tình trạng"]').textContent();
    assert.equal(reloadedRam?.trim(), '32GB DDR5');
    assert.equal(reloadedSsd?.trim(), '1000GB NVMe');
    assert.equal(reloadedCond?.trim(), 'Đã qua sử dụng');

    // Add selected Variant 2 to cart and verify /api/orders/quote matches Variant 2's price (21,490,000)
    const addCartBtn = page.locator('button', { hasText: /Thêm vào giỏ/i }).first();
    await addCartBtn.click();
    const cartStorage = await page.evaluate(() => JSON.parse(localStorage.getItem('citilap_cart') || '[]'));
    const addedItem = cartStorage.find((i) => i.productId === auditProductId && i.variantId === VAR_2_ID);
    assert.ok(addedItem, 'Selected variant must be added to cart');
    assert.equal(addedItem.price, 21490000);

    const quoteRes = await fetch(base + '/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({
        items: [{ productId: auditProductId, variantId: VAR_2_ID, quantity: 1 }],
        shippingMethod: 'standard',
      }),
    });
    assert.equal(quoteRes.status, 200);
    const quoteJson = await quoteRes.json();
    assert.equal(quoteJson.data?.subtotal, 21490000);
  });

  await check('Browser Search (/search) & Category (/laptop-gaming) reflect published variant facets, single-variant filtering, and responsive viewports (1440/768/390/320)', async () => {
    const searchUrl = `${base}/search?q=${encodeURIComponent(SKU_2)}&ram=32&storage=1024&condition=USED`;
    const sRes = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(sRes?.status(), 200);
    await page.waitForSelector('main', { timeout: 15000 });
    await page.waitForFunction(
      (expectedName) => document.querySelector('main')?.innerText?.includes(expectedName),
      auditDoc.name,
      { timeout: 15000 }
    );
    await page.screenshot({ path: `${evidenceDir}/r2-search-filtered.png` });

    // Negative cross-variant search via API & UI: 16GB (Variant 1) + 1TB (Variant 2)
    const negApiRes = await fetch(
      `${base}/api/search?q=${encodeURIComponent(auditDoc.name)}&ram=16&storage=1024`
    );
    assert.equal(negApiRes.status, 200);
    const negApiJson = await negApiRes.json();
    assert.equal(
      negApiJson.data?.products?.some((p) => p.id === auditProductId),
      false,
      'Cross-variant filter 16GB + 1TB must not return AUDIT product'
    );

    for (const vp of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(vp);
      const cRes = await page.goto(`${base}/laptop-gaming?ram=32&storage=1024`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      assert.equal(cRes?.status(), 200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert.ok(overflow <= 2, `Category page horizontal overflow at ${vp.width}px must be <= 2px (got ${overflow})`);
    }
  });

  await check('Native browser zoom 200% (chrome.settingsPrivate.setDefaultZoom(2)) on PDP & Search records outerWidth/innerWidth/devicePixelRatio without horizontal overflow', async () => {
    const profileDir = await mkdtemp('.wrangler/audit-r2-zoom-profile-');
    const zoomCtx = await chromium.launchPersistentContext(profileDir, {
      executablePath: env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      viewport: null,
      args: ['--window-size=1440,1000', '--force-device-scale-factor=1'],
    });
    try {
      const zPage = zoomCtx.pages()[0];
      const cdp = await zoomCtx.newCDPSession(zPage);
      await zPage.goto('chrome://settings/appearance');
      await zPage.waitForFunction(() => typeof chrome.settingsPrivate?.setDefaultZoom === 'function');
      await zPage.evaluate(() => new Promise((resolve) => chrome.settingsPrivate.setDefaultZoom(2, resolve)));

      const pdpZoomRoute = `/laptop/${AUDIT_SLUG}?sku=${SKU_2}`;
      await zPage.goto(base + pdpZoomRoute, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await zPage.waitForSelector('#thong-so-ky-thuat [data-spec-key="RAM"]', { timeout: 15000 });
      const pdpMetrics = await zPage.evaluate(() => ({
        innerWidth: window.innerWidth,
        outerWidth: window.outerWidth,
        devicePixelRatio: window.devicePixelRatio,
        ram: document.querySelector('#thong-so-ky-thuat [data-spec-key="RAM"]')?.textContent?.trim(),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      }));
      assert.equal(pdpMetrics.devicePixelRatio, 2, 'Native zoom 200% must set devicePixelRatio=2');
      assert.equal(pdpMetrics.ram, '32GB DDR5');
      assert.equal(pdpMetrics.overflow, false, 'PDP at 200% native zoom must not overflow horizontally');

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(`${evidenceDir}/r2-pdp-zoom-200.png`, Buffer.from(shot.data, 'base64'));
      zoomMetrics = pdpMetrics;
      console.log('Native 200% zoom metrics:', JSON.stringify(pdpMetrics));
    } finally {
      await zoomCtx.close();
      await rm(profileDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  assert.equal(consoleErrors.length, 0, `Console errors must be 0: ${JSON.stringify(consoleErrors)}`);
  assert.equal(pageErrors.length, 0, `Page errors must be 0: ${JSON.stringify(pageErrors)}`);
  assert.equal(serverErrors.length, 0, `Server 5xx errors must be 0: ${JSON.stringify(serverErrors)}`);
} finally {
  if (auditProductId) {
    try {
      const archRes = await fetch(`${base}/api/admin/products/${auditProductId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Cookie: `admin_session=${cookie}`,
          Origin: base,
        },
      });
      const archJson = await archRes.json().catch(() => ({}));
      console.log(`Archived AUDIT product ${auditProductId} via DELETE /api/admin/products/${auditProductId}:`, archRes.status, archJson?.data?.archived);
    } catch (err) {
      console.error('Warning: failed to archive AUDIT product:', err);
    }
  }
  await browser.close();
}

await writeFile(
  '.wrangler/audit-public/r2-audit-summary.json',
  JSON.stringify(
    {
      status: 'PASS',
      totalChecksPassed: passed,
      auditProductId,
      auditSlug: AUDIT_SLUG,
      zoomMetrics,
      verifiedAt: new Date().toISOString(),
    },
    null,
    2
  )
);

console.log(`\nALL ${passed} R2 AUDIT CHECKS PASSED!`);
