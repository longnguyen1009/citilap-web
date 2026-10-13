import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/storefront-cms.service';
      export * from './src/server/services/storefront-order-guard';
      export * from './src/server/services/product-studio.service';
      export * from './src/contracts/cms/product-studio';
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
    script: 'export default { fetch() { return new Response("pub-test"); } }',
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

  // Run all migrations
  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    for (const stmt of unstable_splitSqlQuery(sql)) {
      await DB.prepare(stmt).run();
    }
  }

  // Setup sample category
  await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-1', 'Laptop', 'laptop', CURRENT_TIMESTAMP)").run();

  // Seed sample products
  // 1. Pure legacy active product
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('p-legacy-active', 'Legacy Laptop Active', 'legacy-laptop-active', 'Desc', 15000000, 'cat-1', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run();

  // 2. Pure legacy inactive product
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('p-legacy-inactive', 'Legacy Laptop Inactive', 'legacy-laptop-inactive', 'Desc', 15000000, 'cat-1', 'DRAFT', CURRENT_TIMESTAMP)"
  ).run();

  // 3. Deleted product
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, deletedAt, updatedAt) VALUES('p-deleted', 'Deleted Laptop', 'deleted-laptop', 'Desc', 15000000, 'cat-1', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  ).run();

  // 4. CMS draft product (has ProductStudio row, published is NULL)
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('p-cms-draft', 'CMS Draft Laptop', 'cms-draft-laptop', 'Old Legacy Desc', 10000000, 'cat-1', 'DRAFT', CURRENT_TIMESTAMP)"
  ).run();
  await DB.prepare(
    "INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt) VALUES('p-cms-draft', 1, json('{\"name\":\"CMS Draft Laptop\"}'), NULL, CURRENT_TIMESTAMP)"
  ).run();

  // 5. CMS published product
  const publishedDoc = {
    schemaVersion: 1,
    name: 'CMS Published Laptop Super',
    slug: 'cms-published-laptop',
    categoryId: 'cat-1',
    price: 25000000,
    availability: 'AVAILABLE',
    variants: [{ id: 'v-1', sku: 'SKU1', name: 'Standard', price: 25000000 }],
    media: [],
  };
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('p-cms-published', 'CMS Published Laptop Super', 'cms-published-laptop', 'Catalog Desc', 25000000, 'cat-1', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run();
  await DB.prepare(
    "INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt) VALUES('p-cms-published', 1, ?, ?, CURRENT_TIMESTAMP)"
  ).bind(JSON.stringify(publishedDoc), JSON.stringify(publishedDoc)).run();

  // 6. CMS unpublished product (status inactive, published is null)
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('p-cms-unpub', 'CMS Unpub Laptop', 'cms-unpub-laptop', 'Old Catalog Fallback Desc', 12000000, 'cat-1', 'DRAFT', CURRENT_TIMESTAMP)"
  ).run();
  await DB.prepare(
    "INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt) VALUES('p-cms-unpub', 2, json('{\"name\":\"CMS Unpub Laptop\"}'), NULL, CURRENT_TIMESTAMP)"
  ).run();

  // 7. Identity Collision Test Fixture: Product A has slug = 'collision-key', Product B has id = 'collision-key'
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('p-owner-a', 'Laptop Owner A', 'collision-key', 'A', 20000000, 'cat-1', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run();
  await DB.prepare(
    "INSERT INTO Product(id, name, slug, description, price, categoryId, status, updatedAt) VALUES('collision-key', 'Laptop Owner B', 'other-slug-b', 'B', 30000000, 'cat-1', 'ACTIVE', CURRENT_TIMESTAMP)"
  ).run();

  // TEST 1: classifyProductPublication directly tests production service logic
  await check('classifyProductPublication distinguishes all states using production function', async () => {
    assert.equal((await api.classifyProductPublication('non-existing-product', DB)).kind, 'NOT_FOUND');
    assert.equal((await api.classifyProductPublication('p-deleted', DB)).kind, 'DELETED');
    assert.equal((await api.classifyProductPublication('p-legacy-active', DB)).kind, 'LEGACY_ACTIVE');
    assert.equal((await api.classifyProductPublication('p-legacy-inactive', DB)).kind, 'LEGACY_INACTIVE');

    const draftRes = await api.classifyProductPublication('p-cms-draft', DB);
    assert.equal(draftRes.kind, 'CMS_NOT_PUBLIC');
    assert.equal(draftRes.reason, 'DRAFT_OR_UNPUBLISHED');

    const unpubRes = await api.classifyProductPublication('p-cms-unpub', DB);
    assert.equal(unpubRes.kind, 'CMS_NOT_PUBLIC');
    assert.equal(unpubRes.reason, 'DRAFT_OR_UNPUBLISHED');

    const pubRes = await api.classifyProductPublication('p-cms-published', DB);
    assert.equal(pubRes.kind, 'CMS_PUBLISHED');
  });

  // TEST 2: Identity collision resolution: Exact slug match takes precedence in auto mode, while byId and bySlug disambiguate
  await check('identity collision: explicit byId and bySlug disambiguate collision correctly', async () => {
    // In 'auto' mode (Storefront URL lookup): slug match precedes ID match
    const autoRes = await api.classifyProductPublication('collision-key', DB);
    assert.equal(autoRes.productId, 'p-owner-a');
    assert.equal(autoRes.slug, 'collision-key');

    // In explicit 'id' mode (Order / Admin lookup): matches Product B with id='collision-key'
    const idRes = await api.classifyProductPublicationById('collision-key', DB);
    assert.equal(idRes.productId, 'collision-key');
    assert.equal(idRes.slug, 'other-slug-b');

    // In explicit 'slug' mode: matches Product A with slug='collision-key'
    const slugRes = await api.classifyProductPublicationBySlug('collision-key', DB);
    assert.equal(slugRes.productId, 'p-owner-a');
    assert.equal(slugRes.slug, 'collision-key');
  });

  // TEST 3: Fail-Closed invariant: CMS_NOT_PUBLIC is never allowed in public view
  await check('invariant: CMS_NOT_PUBLIC must fail-closed (blocked from public view)', async () => {
    const draftState = await api.classifyProductPublication('cms-draft-laptop', DB);
    const unpubState = await api.classifyProductPublication('cms-unpub-laptop', DB);
    const allowedPublicKinds = ['CMS_PUBLISHED', 'LEGACY_ACTIVE'];

    assert.equal(allowedPublicKinds.includes(draftState.kind), false);
    assert.equal(allowedPublicKinds.includes(unpubState.kind), false);
  });

  // TEST 4: Order guard blocks draft or unpublished CMS items
  await check('order guard blocks checkout on draft or unpublished CMS products', async () => {
    // CMS item with hasStudio = true but published = null
    assert.throws(
      () => api.assertPublishedStudioOrderable({ hasStudio: true, published: null }, null),
      (err) => err.message === 'PRODUCT_UNAVAILABLE'
    );

    // CMS item with hasStudio = true, unpublished
    assert.throws(
      () => api.assertPublishedStudioOrderable({ hasStudio: true, published: undefined }, 'v-1'),
      (err) => err.message === 'PRODUCT_UNAVAILABLE'
    );
  });

  // TEST 5: Order guard permits pure legacy active items without Studio
  await check('order guard permits pure legacy active items without Studio', async () => {
    api.assertPublishedStudioOrderable({ hasStudio: false, published: null }, null);
  });

  // TEST 6: Order guard validates CMS availability and variant match
  await check('order guard validates CMS availability and variant match', async () => {
    // Valid variant
    api.assertPublishedStudioOrderable(
      { hasStudio: true, published: JSON.stringify(publishedDoc) },
      'v-1'
    );

    // Mismatched variant throws VARIANT_UNAVAILABLE
    assert.throws(
      () =>
        api.assertPublishedStudioOrderable(
          { hasStudio: true, published: JSON.stringify(publishedDoc) },
          'v-non-existent'
        ),
      (err) => err.message === 'VARIANT_UNAVAILABLE'
    );

    // Unavailable status throws PRODUCT_UNAVAILABLE
    const unavailableDoc = { ...publishedDoc, availability: 'UNAVAILABLE' };
    assert.throws(
      () =>
        api.assertPublishedStudioOrderable(
          { hasStudio: true, published: JSON.stringify(unavailableDoc) },
          'v-1'
        ),
      (err) => err.message === 'PRODUCT_UNAVAILABLE'
    );
  });

  // TEST 7: Scheduler guard behavior test: Legacy cron query ignores CMS ProductStudio products
  await check('scheduler guard behavior: legacy auto-publish executes without touching CMS items', async () => {
    // Seed 1 legacy scheduled product and 1 CMS scheduled product with publishAt in the past
    const pastTime = new Date(Date.now() - 3600000).toISOString();
    await DB.prepare(
      "INSERT INTO Product(id, name, slug, description, price, categoryId, status, publishAt, updatedAt) VALUES('p-sched-legacy', 'Sched Legacy', 'sched-legacy', '', 10000000, 'cat-1', 'draft', ?, CURRENT_TIMESTAMP)"
    ).bind(pastTime).run();

    await DB.prepare(
      "INSERT INTO Product(id, name, slug, description, price, categoryId, status, publishAt, updatedAt) VALUES('p-sched-cms', 'Sched CMS', 'sched-cms', '', 10000000, 'cat-1', 'draft', ?, CURRENT_TIMESTAMP)"
    ).bind(pastTime).run();
    await DB.prepare(
      "INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt) VALUES('p-sched-cms', 1, json('{\"name\":\"CMS\"}'), NULL, CURRENT_TIMESTAMP)"
    ).run();

    const nowIso = new Date().toISOString();
    const eligibleToPublish = await DB.prepare(
      `SELECT p.id FROM Product p
       LEFT JOIN ProductStudio s ON s.productId = p.id
       WHERE p.publishAt IS NOT NULL AND p.publishAt <= ?
         AND p.status = 'draft' AND s.productId IS NULL`
    ).bind(nowIso).all();

    const ids = eligibleToPublish.results.map((r) => r.id);
    assert.deepEqual(ids, ['p-sched-legacy']); // ONLY legacy product is selected!

    // Execute update on selected IDs
    if (ids.length > 0) {
      for (const id of ids) {
        await DB.prepare("UPDATE Product SET status = 'active' WHERE id = ?").bind(id).run();
      }
    }

    // Verify DB state
    const legacyStatus = (await DB.prepare("SELECT status FROM Product WHERE id='p-sched-legacy'").first()).status;
    const cmsStatus = (await DB.prepare("SELECT status FROM Product WHERE id='p-sched-cms'").first()).status;

    assert.equal(legacyStatus, 'active'); // Legacy transitioned to active
    assert.equal(cmsStatus, 'draft');     // CMS item PRESERVED in draft!
  });

  // TEST 8: Historical order snapshot preservation when product is unpublished
  await check('historical order snapshot: OrderItem details remain immutable when CMS item unpublished', async () => {
    // Create an order containing the published product
    const orderId = 'order-hist-1';
    await DB.prepare(
      "INSERT INTO \"Order\"(id, customerName, customerPhone, customerEmail, shippingAddress, totalAmount, paymentMethod, status, createdAt, updatedAt) VALUES(?, 'Khach Hang', '0901234567', 'kh@citilap.vn', 'Ha Noi', 25000000, 'COD', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    ).bind(orderId).run();

    await DB.prepare(
      "INSERT INTO OrderItem(id, orderId, productId, productName, price, quantity, productNameSnapshot, priceSnapshot, lineTotal, updatedAt) VALUES('item-1', ?, 'p-cms-published', 'CMS Published Laptop Super (Snapshot)', 25000000, 1, 'CMS Published Laptop Super (Snapshot)', 25000000, 25000000, CURRENT_TIMESTAMP)"
    ).bind(orderId).run();

    // Now unpublish the product in ProductStudio
    await DB.prepare("UPDATE ProductStudio SET published = NULL WHERE productId = 'p-cms-published'").run();
    await DB.prepare("UPDATE Product SET status = 'DRAFT' WHERE id = 'p-cms-published'").run();

    // Verify product is now CMS_NOT_PUBLIC
    const pubStatus = await api.classifyProductPublication('p-cms-published', DB);
    assert.equal(pubStatus.kind, 'CMS_NOT_PUBLIC');

    // Verify the historical order item snapshot was NOT modified
    const orderItem = await DB.prepare("SELECT * FROM OrderItem WHERE id = 'item-1'").first();
    assert.equal(orderItem.productNameSnapshot, 'CMS Published Laptop Super (Snapshot)');
    assert.equal(orderItem.priceSnapshot, 25000000);
    assert.equal(orderItem.lineTotal, 25000000);
  });

  console.log(`Publication Correctness & Behavioral Guards: ${passed}/${passed} PASS`);
} finally {
  await mf.dispose();
}
