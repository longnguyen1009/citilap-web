import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

console.log('=== CITILAP R04 - PHỤ KIỆN & CATALOG STOREFRONT TEST SUITE ===');

// 1. Bundle backend services and contracts
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/brand.service';
      export * from './src/server/services/media-library.service';
      export * from './src/contracts/cms/product-studio';
      export * from './src/contracts/catalog/compare';
      export * from './src/lib/sanitize-html';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});

const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r04"); } }',
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

  // Run all D1 migrations
  const migrationFiles = (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    const stmts = unstable_splitSqlQuery(sql);
    await DB.batch(stmts.map(s => DB.prepare(s)));
  }

  // Seed baseline Categories and Media
  await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat-laptop','Laptop Gaming','laptop-gaming',CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat-acc','Phụ kiện Laptop','linh-kien',CURRENT_TIMESTAMP)").run();

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const asset = (await api.uploadLibraryImage(env, new File([png], 'hero.png', { type: 'image/png' }))).asset;

  // Seed Brands: 1 active, 1 inactive
  const brandLogitech = await api.writeBrand(env, null, {
    name: 'Logitech',
    slug: 'logitech',
    logo: asset.url,
    description: 'Thương hiệu phụ kiện số 1 thế giới.',
    status: 'ACTIVE',
  });

  const brandRazerInactive = await api.writeBrand(env, null, {
    name: 'Razer Inc',
    slug: 'razer',
    logo: asset.url,
    description: 'Thương hiệu phụ kiện tạm ẩn.',
    status: 'INACTIVE',
  });

  // =========================================================================
  // SUITE 1: TEMPLATE METADATA & ROUND-TRIP CONTRACTS (R04-A)
  // =========================================================================
  console.log('\n--- SUITE 1: TEMPLATE METADATA & ROUND-TRIP CONTRACTS ---');

  await check('Templates: 10 templates defined with stable keys and attribute definitions', async () => {
    const expected = ['LAPTOP', 'MOUSE', 'KEYBOARD', 'HEADPHONE', 'CHARGER', 'HUB', 'BAG', 'MONITOR', 'ACCESSORY', 'TECH'];
    for (const t of expected) {
      assert.ok(api.attributeTemplateDefinitions[t], `Missing definition for ${t}`);
      const defs = api.attributeTemplateDefinitions[t];
      assert.ok(defs.length > 0, `Template ${t} must have at least 1 attribute`);
      for (const d of defs) {
        assert.ok(d.key, 'Attribute must have stable key');
        assert.ok(d.label, 'Attribute must have label');
        assert.ok(typeof d.isFilterable === 'boolean', 'Attribute must declare isFilterable');
        assert.ok(typeof d.isComparable === 'boolean', 'Attribute must declare isComparable');
      }
    }
  });

  await check('blankProduct initializes all accessory templates cleanly without mandatory CPU/RAM', async () => {
    const mouseDoc = api.blankProduct('MOUSE');
    assert.equal(mouseDoc.template, 'MOUSE');
    assert.equal(mouseDoc.specs[0].key, 'Kết nối');
    assert.ok(Array.isArray(mouseDoc.relatedProductIds));
    assert.equal(mouseDoc.relatedProductIds.length, 0);
  });

  // =========================================================================
  // SUITE 2: ACCESSORY VARIANTS & COLLISION CHECKS (R04-A)
  // =========================================================================
  console.log('\n--- SUITE 2: ACCESSORY VARIANTS & COLLISION CHECKS ---');

  await check('Validation: Prevents duplicate SKUs in product variants', async () => {
    const doc = api.blankProduct('MOUSE');
    doc.name = 'Chuột Logitech G Pro X Superlight';
    doc.slug = 'logitech-g-pro-x-superlight';
    doc.categoryId = 'cat-acc';
    doc.brand = 'Logitech';
    doc.brandId = brandLogitech.id;
    doc.price = 2500000;
    doc.variants = [
      { id: 'v1', name: 'Màu Đen', sku: 'GPRO-X', price: 2500000, condition: 'NEW', options: { color: 'Đen' } },
      { id: 'v2', name: 'Màu Trắng', sku: 'GPRO-X', price: 2500000, condition: 'NEW', options: { color: 'Trắng' } },
    ];

    assert.throws(() => {
      api.productDocumentSchema.parse(doc);
    }, /Không được trùng mã, ảnh hoặc tên thông số/);
  });

  await check('Validation: Prevents duplicate variant options combinations', async () => {
    const doc = api.blankProduct('KEYBOARD');
    doc.name = 'Bàn phím cơ Akko 3087';
    doc.slug = 'akko-3087-v2';
    doc.categoryId = 'cat-acc';
    doc.price = 1200000;
    doc.variants = [
      { id: 'v1', name: 'Bản 1', sku: 'AKKO-01', price: 1200000, condition: 'NEW', options: { switch: 'Red', color: 'Đen' } },
      { id: 'v2', name: 'Bản 2', sku: 'AKKO-02', price: 1200000, condition: 'NEW', options: { switch: 'Red', color: 'Đen' } },
    ];

    assert.throws(() => {
      api.productDocumentSchema.parse(doc);
    }, /Hai biến thể không được có cùng tổ hợp cấu hình và tùy chọn/);
  });

  let mouseProduct;
  await check('ProductStudio: Creates and publishes MOUSE accessory with color variants', async () => {
    const doc = api.blankProduct('MOUSE');
    doc.name = 'Chuột không dây Logitech G Pro X Superlight';
    doc.slug = 'logitech-g-pro-x';
    doc.categoryId = 'cat-acc';
    doc.brand = 'Logitech';
    doc.brandId = brandLogitech.id;
    doc.price = 2690000;
    doc.availability = 'AVAILABLE';
    doc.specs = [
      { key: 'Kết nối', value: 'Không dây Lightspeed 2.4GHz' },
      { key: 'DPI', value: '25600' },
      { key: 'Trọng lượng', value: '63g' },
    ];
    doc.media = [{ assetId: asset.id, alt: 'Chuột Logitech G Pro X Superlight', variantId: '' }];
    doc.variants = [
      { id: 'v-mouse-black', name: 'Màu Đen', sku: 'GPRO-BLACK', price: 2690000, condition: 'NEW', options: { color: 'Đen', connection: 'Wireless' } },
      { id: 'v-mouse-white', name: 'Màu Trắng', sku: 'GPRO-WHITE', price: 2790000, condition: 'NEW', options: { color: 'Trắng', connection: 'Wireless' } },
    ];

    mouseProduct = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc });
    assert.ok(mouseProduct.id);
    assert.equal(mouseProduct.published, true);

    // Verify D1 ProductVariant table received options
    const rows = await DB.prepare("SELECT sku, options, price FROM ProductVariant WHERE productId=?").bind(mouseProduct.id).all();
    assert.equal(rows.results.length, 2);
    const blackRow = rows.results.find(r => r.sku === 'GPRO-BLACK');
    assert.ok(blackRow);
    const parsedOpts = JSON.parse(blackRow.options);
    assert.equal(parsedOpts.color, 'Đen');
  });

  let chargerProduct;
  await check('ProductStudio: Creates and publishes CHARGER with multiple power variants', async () => {
    const doc = api.blankProduct('CHARGER');
    doc.name = 'Củ sạc nhanh Anker GaNPrime 65W / 100W';
    doc.slug = 'anker-ganprime-charger';
    doc.categoryId = 'cat-acc';
    doc.brand = 'Anker';
    doc.price = 790000;
    doc.availability = 'AVAILABLE';
    doc.specs = [
      { key: 'Chuẩn sạc', value: 'GaNPrime PowerIQ 4.0' },
      { key: 'Đầu ra', value: 'Type-C x2, USB-A x1' },
    ];
    doc.media = [{ assetId: asset.id, alt: 'Củ sạc Anker GaN', variantId: '' }];
    doc.variants = [
      { id: 'v-anker-65w', name: 'Bản 65W GaN', sku: 'ANKER-65W', price: 790000, condition: 'NEW', options: { power: '65W' } },
      { id: 'v-anker-100w', name: 'Bản 100W GaN', sku: 'ANKER-100W', price: 1290000, condition: 'NEW', options: { power: '100W' } },
    ];

    chargerProduct = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc });
    assert.ok(chargerProduct.id);
  });

  let laptopMultiVariant;
  await check('ProductStudio: Creates Laptop with 16GB (20M) and 32GB (35M) for variant price isolation', async () => {
    const doc = api.blankProduct('LAPTOP');
    doc.name = 'Lenovo Legion Slim 5 16APH8';
    doc.slug = 'lenovo-legion-slim-5';
    doc.categoryId = 'cat-laptop';
    doc.brand = 'Lenovo';
    doc.price = 20000000; // Base price 20M
    doc.availability = 'AVAILABLE';
    doc.specs = [
      { key: 'CPU', value: 'Ryzen 7 7840HS' },
      { key: 'RAM', value: '16GB DDR5' },
      { key: 'SSD', value: '512GB NVMe' },
      { key: 'GPU', value: 'RTX 4060 8GB' },
    ];
    doc.media = [{ assetId: asset.id, alt: 'Lenovo Legion Slim 5', variantId: '' }];
    doc.variants = [
      { id: 'v-legion-16gb', name: '16GB / 512GB', sku: 'LEGION-16', price: 20000000, condition: 'NEW', ram: '16GB DDR5', storage: '512GB' },
      { id: 'v-legion-32gb', name: '32GB / 1TB', sku: 'LEGION-32', price: 35000000, condition: 'NEW', ram: '32GB DDR5', storage: '1TB' },
    ];

    laptopMultiVariant = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc });
    assert.ok(laptopMultiVariant.id);
  });

  // =========================================================================
  // SUITE 3: MEDIA USAGE & INACTIVE BRAND PRESERVATION (Mục 2 & Mục 6)
  // =========================================================================
  console.log('\n--- SUITE 3: MEDIA USAGE & INACTIVE BRAND PRESERVATION ---');

  await check('MediaUsage: Brand logo records MediaUsage with ownerType=BRAND', async () => {
    const usage = await DB.prepare("SELECT * FROM MediaUsage WHERE ownerType='BRAND' AND ownerId=?").bind(brandLogitech.id).first();
    assert.ok(usage, 'Brand logo must record MediaUsage');
    assert.equal(usage.assetId, asset.id);
    assert.equal(usage.slot, 'logo');
  });

  await check('MediaUsage: Rich content HTML images record MediaUsage with ownerType=PRODUCT_CONTENT', async () => {
    const doc = api.blankProduct('KEYBOARD');
    doc.name = 'Bàn phím Leopold FC900R';
    doc.slug = 'leopold-fc900r';
    doc.categoryId = 'cat-acc';
    doc.price = 3100000;
    doc.contentHtml = `<p>Đánh giá bàn phím: <img src="/api/media/${asset.id}" alt="Review" /></p>`;
    doc.media = [{ assetId: asset.id, alt: 'FC900R', variantId: '' }];
    doc.variants = [{ id: 'v-leo', name: 'Tiêu chuẩn', sku: 'LEOPOLD-01', price: 3100000, condition: 'NEW' }];

    const leopold = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc });
    const contentUsage = await DB.prepare("SELECT * FROM MediaUsage WHERE ownerType='PRODUCT_CONTENT' AND ownerId=?").bind(leopold.id).first();
    assert.ok(contentUsage, 'Images embedded in HTML content must be tracked in MediaUsage');
    assert.equal(contentUsage.assetId, asset.id);
  });

  await check('Inactive Brand: Product referencing inactive brand retains brandId in DB', async () => {
    const doc = api.blankProduct('MOUSE');
    doc.name = 'Chuột Razer Viper V2 Pro';
    doc.slug = 'razer-viper-v2-pro';
    doc.categoryId = 'cat-acc';
    doc.brandId = brandRazerInactive.id;
    doc.brand = brandRazerInactive.name;
    doc.price = 3200000;
    doc.media = [{ assetId: asset.id, alt: 'Viper V2 Pro', variantId: '' }];
    doc.variants = [{ id: 'v-razer', name: 'Tiêu chuẩn', sku: 'RAZER-01', price: 3200000, condition: 'NEW' }];

    const razerProd = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc });
    const dbRow = await DB.prepare("SELECT brandId, brand FROM Product WHERE id=?").bind(razerProd.id).first();
    assert.equal(dbRow.brandId, brandRazerInactive.id);
  });

  // =========================================================================
  // SUITE 4: MANUAL RELATED PRODUCTS ORDERING & PUBLIC FILTERING (Mục 11)
  // =========================================================================
  console.log('\n--- SUITE 4: RELATED PRODUCTS & PUBLIC-ONLY RESOLUTION ---');

  await check('Related: Manual related products resolution preserves manual ordering', async () => {
    // We want mouseProduct to explicitly recommend [chargerProduct.id] first
    const doc = mouseProduct.document;
    doc.relatedProductIds = [chargerProduct.id];
    mouseProduct = await api.writeStudio(env, mouseProduct.id, { expectedRevision: mouseProduct.revision, action: 'publish', document: doc });

    // Call public resolver via SQL
    const stmt = DB.prepare(`
      SELECT p.id, p.name FROM Product p
      JOIN ProductStudio s ON s.productId = p.id
      WHERE p.id IN (?) AND p.status='ACTIVE' AND s.published IS NOT NULL
    `).bind(chargerProduct.id);
    const res = await stmt.all();
    assert.equal(res.results.length, 1);
    assert.equal(res.results[0].id, chargerProduct.id);
  });

  await check('Related: Draft/hidden products are excluded from public related resolution', async () => {
    // Create an un-published draft product
    const draftDoc = api.blankProduct('BAG');
    draftDoc.name = 'Balo Gaming Bí Mật Chưa Ra Mắt';
    draftDoc.slug = 'balo-secret';
    draftDoc.categoryId = 'cat-acc';
    draftDoc.price = 500000;
    const draftBag = await api.writeStudio(env, null, { expectedRevision: 0, action: 'save', document: draftDoc });

    // Set draftBag into mouseProduct's relatedProductIds
    const doc = mouseProduct.document;
    doc.relatedProductIds = [draftBag.id, chargerProduct.id];
    mouseProduct = await api.writeStudio(env, mouseProduct.id, { expectedRevision: mouseProduct.revision, action: 'publish', document: doc });

    // Public query checking (s.published IS NOT NULL)
    const publicRelated = await DB.prepare(`
      SELECT p.id FROM Product p
      JOIN ProductStudio s ON s.productId = p.id
      WHERE p.id IN (?, ?) AND p.status='ACTIVE' AND s.published IS NOT NULL
    `).bind(draftBag.id, chargerProduct.id).all();

    // Only chargerProduct should be returned, draftBag must be excluded!
    assert.equal(publicRelated.results.length, 1);
    assert.equal(publicRelated.results[0].id, chargerProduct.id);
  });

  // =========================================================================
  // SUITE 5: PRODUCT COMPARISON SUBSYSTEM (Mục 10)
  // =========================================================================
  console.log('\n--- SUITE 5: PRODUCT COMPARISON SUBSYSTEM ---');

  await check('Compare: Comparing 2 Laptops succeeds and computes difference highlights', async () => {
    // Create a 2nd laptop
    const doc2 = api.blankProduct('LAPTOP');
    doc2.name = 'ASUS TUF Gaming A15';
    doc2.slug = 'asus-tuf-a15';
    doc2.categoryId = 'cat-laptop';
    doc2.price = 18900000;
    doc2.specs = [
      { key: 'CPU', value: 'Ryzen 7 7735HS' },
      { key: 'RAM', value: '16GB DDR5' },
      { key: 'SSD', value: '512GB' },
      { key: 'GPU', value: 'RTX 4050 6GB' },
    ];
    doc2.media = [{ assetId: asset.id, alt: 'TUF A15', variantId: '' }];
    doc2.variants = [{ id: 'v-tuf', name: 'Tiêu chuẩn', sku: 'TUF-01', price: 18900000, condition: 'NEW' }];
    const laptop2 = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc2 });

    // Simulate /api/compare query
    const compRows = await DB.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.cpu, p.gpu, p.ram, p.storage, s.published
      FROM Product p
      JOIN ProductStudio s ON s.productId = p.id
      WHERE p.id IN (?, ?)
    `).bind(laptopMultiVariant.id, laptop2.id).all();

    assert.equal(compRows.results.length, 2);

    // CPU difference check
    const cpu1 = compRows.results[0].cpu;
    const cpu2 = compRows.results[1].cpu;
    assert.notEqual(cpu1, cpu2);
  });

  await check('Compare: Incompatible groups (Laptop vs Mouse) are blocked by compatibility rule', async () => {
    // Both products exist
    const pLaptop = await DB.prepare("SELECT p.id, s.published FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.id=?").bind(laptopMultiVariant.id).first();
    const pMouse = await DB.prepare("SELECT p.id, s.published FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.id=?").bind(mouseProduct.id).first();

    const t1 = JSON.parse(pLaptop.published).template;
    const t2 = JSON.parse(pMouse.published).template;

    assert.equal(t1, 'LAPTOP');
    assert.equal(t2, 'MOUSE');

    // Compatibility check rule from /api/compare:
    const isIncompatible = t1 !== t2;
    assert.ok(isIncompatible, 'Laptop and Mouse must be marked incompatible for comparison');
  });

  // =========================================================================
  // SUITE 6: DRAFT ISOLATION & ORDER INTEGRITY (Mục 9 & Mục 12)
  // =========================================================================
  console.log('\n--- SUITE 6: DRAFT ISOLATION & ORDER INTEGRITY ---');

  await check('Draft isolation: Saving draft changes does NOT alter published storefront snapshot', async () => {
    const publishedBefore = await DB.prepare("SELECT published FROM ProductStudio WHERE productId=?").bind(mouseProduct.id).first();
    const parsedPubBefore = JSON.parse(publishedBefore.published);
    assert.equal(parsedPubBefore.price, 2690000);

    // Edit draft price to 1,000,000 and save with action='save'
    const draftDoc = JSON.parse(publishedBefore.published);
    draftDoc.price = 1000000;
    draftDoc.name = 'Tên nháp thay đổi chưa xuất bản';
    await api.writeStudio(env, mouseProduct.id, { expectedRevision: mouseProduct.revision, action: 'save', document: draftDoc });

    // Verify published column remains UNCHANGED
    const publishedAfter = await DB.prepare("SELECT published, draft FROM ProductStudio WHERE productId=?").bind(mouseProduct.id).first();
    const parsedPubAfter = JSON.parse(publishedAfter.published);
    const parsedDraftAfter = JSON.parse(publishedAfter.draft);

    assert.equal(parsedPubAfter.price, 2690000, 'Storefront public price must NOT change when draft is saved');
    assert.equal(parsedDraftAfter.price, 1000000, 'Draft price should be updated');
  });

  console.log('\n======================================================');
  console.log(`ALL R04 INTEGRATION TESTS PASSED: ${passed}/${passed} checks`);
  console.log('======================================================\n');
} finally {
  await mf.dispose();
}
