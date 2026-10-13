import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/media-library.service';
      export * from './src/contracts/cms/product-studio';
      export * from './src/server/services/storefront-cms.service';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-server-only',
    setup(b) {
      b.onResolve({ filter: /^server-only$/ }, args => ({ path: args.path, namespace: 'server-only-ns' }));
      b.onLoad({ filter: /.*/, namespace: 'server-only-ns' }, () => ({ contents: '' }));
    },
  }],
  write: false,
});

const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("unified-catalog"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const env = { DB, PRODUCT_MEDIA };

  // 1. Run migrations
  for (const f of (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await DB.batch(unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`, 'utf8')).map((s) => DB.prepare(s)));
  }

  // 2. Setup categories
  await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-laptop', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-accessory', 'Phụ kiện máy tính', 'phu-kien', CURRENT_TIMESTAMP)").run();

  // 3. Upload a sample image
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const asset = (await api.uploadLibraryImage(env, new File([png], 'laptop.png', { type: 'image/png' }))).asset;

  // 4. Seed 125 products to thoroughly test pagination beyond 100 items
  console.log('Seeding 125 fixture products into isolated test database...');
  for (let i = 1; i <= 125; i++) {
    const isLaptop = i <= 80;
    const isLegacy = i <= 20;
    const catId = isLaptop ? 'cat-laptop' : 'cat-accessory';
    const kind = isLaptop ? 'LAPTOP' : 'ACCESSORY';
    const id = `prod-${String(i).padStart(3, '0')}`;
    const slug = `product-${String(i).padStart(3, '0')}`;
    const brand = i % 3 === 0 ? 'Lenovo' : i % 3 === 1 ? 'Dell' : 'Asus';
    const price = 10000000 + i * 100000;
    const stock = i % 10 === 0 ? 0 : 5;
    const status = i === 1 ? 'ACTIVE' : i === 2 ? 'INACTIVE' : i % 5 === 0 ? 'DRAFT' : 'ACTIVE';

    await DB.prepare(`
      INSERT INTO Product (
        id, name, slug, description, brand, model, price, stock, status, categoryId, images, specs, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      `${isLaptop ? 'Laptop' : 'Chuột'} ${brand} Model-${i}`,
      slug,
      `Mô tả chi tiết sản phẩm ${brand} Model-${i}`,
      brand,
      `MDL-${i}`,
      price,
      stock,
      status,
      catId,
      JSON.stringify(['/test.png']),
      JSON.stringify({ RAM: '16GB', SSD: '512GB', 'Màn hình': '15.6 inch 144Hz' })
    ).run();

    // Create variants
    await DB.prepare(`
      INSERT INTO ProductVariant (id, productId, sku, name, price, stock, options, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      `var-${i}`,
      id,
      `SKU-${String(i).padStart(3, '0')}`,
      `Config ${i}`,
      price,
      stock,
      JSON.stringify({ RAM: '16GB' })
    ).run();

    // For products > 20, create Studio records (non-legacy)
    if (!isLegacy) {
      const isPublished = i % 2 === 0;
      const doc = {
        ...api.blankProduct(),
        name: `${isLaptop ? 'Laptop' : 'Chuột'} ${brand} Model-${i}`,
        slug,
        categoryId: catId,
        brand,
        template: isLaptop ? 'LAPTOP' : 'MOUSE',
        price,
        availability: stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
        media: [{ assetId: asset.id, alt: `Img ${i}`, variantId: '' }],
        variants: [{ id: `var-${i}`, name: `Config ${i}`, sku: `SKU-${String(i).padStart(3, '0')}`, condition: 'NEW', price, ram: '16GB', storage: '512GB', gpu: 'RTX' }],
        warranties: [{ name: '12T', description: 'BH', adjustment: 0, recommended: true }],
      };
      await DB.prepare(`
        INSERT INTO ProductStudio (productId, revision, draft, published, updatedAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        id,
        1,
        JSON.stringify(doc),
        isPublished ? JSON.stringify(doc) : null
      ).run();
    }
  }

  // TEST 1: Server Pagination beyond 100 items
  await check('catalogList page 1 returns 20 items, total 125, totalPages 7', async () => {
    const res = await api.catalogList(DB, { page: 1, limit: 20 });
    assert.equal(res.total, 125);
    assert.equal(res.totalPages, 7);
    assert.equal(res.items.length, 20);
    assert.equal(res.page, 1);
  });

  await check('catalogList page 7 accesses items beyond 100 (> 120th record)', async () => {
    const res = await api.catalogList(DB, { page: 7, limit: 20 });
    assert.equal(res.items.length, 5); // 125 - 120 = 5 items
    assert.equal(res.page, 7);
  });

  // TEST 2: Multi-criteria Filters
  await check('filter kind=LAPTOP returns only laptops (80 items)', async () => {
    const res = await api.catalogList(DB, { kind: 'LAPTOP', limit: 100 });
    assert.equal(res.total, 80);
    for (const item of res.items) {
      assert.equal(item.kind, 'LAPTOP');
    }
  });

  await check('filter kind=ACCESSORY returns only accessories (45 items)', async () => {
    const res = await api.catalogList(DB, { kind: 'ACCESSORY', limit: 100 });
    assert.equal(res.total, 45);
    for (const item of res.items) {
      assert.equal(item.kind, 'ACCESSORY');
    }
  });

  await check('filter brand=Lenovo returns matching products', async () => {
    const res = await api.catalogList(DB, { brand: 'Lenovo', limit: 50 });
    assert.ok(res.total > 0);
    for (const item of res.items) {
      assert.equal(item.brand.toLowerCase(), 'lenovo');
    }
  });

  await check('search q finds by SKU, ID and name', async () => {
    const bySku = await api.catalogList(DB, { q: 'SKU-005' });
    assert.equal(bySku.total, 1);
    assert.equal(bySku.items[0].id, 'prod-005');

    const byId = await api.catalogList(DB, { q: 'prod-042' });
    assert.equal(byId.total, 1);
    assert.equal(byId.items[0].id, 'prod-042');
  });

  // TEST 3: LEGACY ADOPTION GUARD
  await check('legacy ACTIVE product opens in editor without auto-writing DB', async () => {
    // prod-001 has no ProductStudio row
    const countBefore = (await DB.prepare("SELECT COUNT(*) as c FROM ProductStudio WHERE productId = 'prod-001'").first()).c;
    assert.equal(countBefore, 0);

    const detail = await api.studioDetail(DB, 'prod-001');
    assert.equal(detail.id, 'prod-001');
    assert.equal(detail.revision, 0);
    assert.equal(detail.published, true); // Active legacy is currently published on web

    const countAfter = (await DB.prepare("SELECT COUNT(*) as c FROM ProductStudio WHERE productId = 'prod-001'").first()).c;
    assert.equal(countAfter, 0); // GET MUST NOT write to DB!
  });

  await check('legacy adoption: save draft KEEPS old content public on web, NOT 404', async () => {
    const detail = await api.studioDetail(DB, 'prod-001');
    const modifiedDoc = {
      ...detail.document,
      name: 'Laptop Dell Model-1 NEW DRAFT NAME',
      price: 99999999,
    };

    // Operator saves draft
    const saved = await api.writeStudio(env, 'prod-001', {
      expectedRevision: 0,
      action: 'save',
      document: modifiedDoc,
    });

    assert.equal(saved.revision, 1);
    assert.equal(saved.published, true); // Still public on web!

    // Verify classification on Storefront: MUST BE CMS_PUBLISHED
    const pub = await api.classifyProductPublication(detail.document.slug, DB);
    assert.equal(pub.kind, 'CMS_PUBLISHED');

    // Public Studio MUST return OLD published content, NOT the new draft!
    const publicData = await api.publicStudio(DB, detail.document.slug);
    assert.notEqual(publicData.name, 'Laptop Dell Model-1 NEW DRAFT NAME');
    assert.equal(publicData.name, 'Laptop Dell Model-1'); // Preserved original public content!
    assert.notEqual(publicData.price, 99999999);
  });

  await check('legacy adoption: publish updates web content to new document', async () => {
    const detail = await api.studioDetail(DB, 'prod-001');
    const published = await api.writeStudio(env, 'prod-001', {
      expectedRevision: detail.revision,
      action: 'publish',
      document: {
        ...detail.document,
        media: [{ assetId: asset.id, alt: 'Ảnh laptop Dell', variantId: '' }],
        specs: [
          { key: 'RAM', value: '16GB' },
          { key: 'SSD', value: '512GB' },
          { key: 'Màn hình', value: '15.6 inch 144Hz' },
        ],
      },
    });

    assert.equal(published.revision, 2);
    const publicData = await api.publicStudio(DB, detail.document.slug);
    assert.equal(publicData.name, 'Laptop Dell Model-1 NEW DRAFT NAME');
    assert.equal(publicData.price, 99999999);
  });

  // TEST 4: Laptop Spec Metrics Extraction
  await check('parseSpecMetrics updates ramGb, storageGb, screenSize, refreshRate in Product table', async () => {
    const row = await DB.prepare('SELECT ramGb, storageGb, screenSize, refreshRate FROM Product WHERE id = ?').bind('prod-001').first();
    assert.equal(row.ramGb, 16);
    assert.equal(row.storageGb, 512);
    assert.equal(row.screenSize, 15.6);
    assert.equal(row.refreshRate, 144);
  });

  // TEST 5: Order History Protection on Archive
  await check('archiveProduct guards OrderItem: soft-deletes and unpublishes without hard delete', async () => {
    // Insert an Order and OrderItem referencing prod-002
    await DB.prepare("INSERT INTO \"Order\" (id, orderNumber, customerName, customerPhone, totalAmount, status, createdAt, updatedAt) VALUES ('order-1', 'ORD-001', 'Test', '0901234567', 15000000, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();
    await DB.prepare("INSERT INTO OrderItem (id, orderId, productId, productName, quantity, price, createdAt, updatedAt) VALUES ('item-1', 'order-1', 'prod-002', 'Laptop Dell Model-2', 1, 15000000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();

    const archiveResult = await api.archiveProduct(DB, 'prod-002');
    assert.equal(archiveResult.archived, true);

    // Verify Product record still exists with ARCHIVED status and deletedAt IS NULL so catalog can retrieve it
    const prodRow = await DB.prepare('SELECT status, deletedAt FROM Product WHERE id = ?').bind('prod-002').first();
    assert.equal(prodRow.status, 'ARCHIVED');
    assert.equal(prodRow.deletedAt, null);

    // Verify catalogList can find the archived product when filtering by publicationStatus = 'ARCHIVED'
    const archivedList = await api.catalogList(DB, { publicationStatus: 'ARCHIVED' });
    assert.ok(archivedList.items.some(it => it.id === 'prod-002'));

    // OrderItem is intact!
    const orderItemRow = await DB.prepare('SELECT id FROM OrderItem WHERE productId = ?').bind('prod-002').first();
    assert.equal(orderItemRow.id, 'item-1');
  });

  // TEST 6: Revision Conflict (409 Conflict)
  await check('concurrent editor revision mismatch returns 409 Conflict', async () => {
    const detail = await api.studioDetail(DB, 'prod-003');
    await assert.rejects(
      () =>
        api.writeStudio(env, 'prod-003', {
          expectedRevision: 999, // Stale revision
          action: 'save',
          document: detail.document,
        }),
      (err) => err.status === 409
    );
  });

  console.log(`\n========================================`);
  console.log(`Unified Catalog: ${passed}/${passed} PASS`);
  console.log(`========================================\n`);
} finally {
  await mf.dispose();
}
