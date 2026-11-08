import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { bootstrapHomepage } from './bootstrap-site-builder.mjs';

console.log('--- STARTING R07A SITE BUILDER INTEGRATION TEST SUITE ---');

// 1. Bundle server services with esbuild
await build({
  stdin: {
    contents: `
      export * from './src/server/services/site-builder.service';
      export * from './src/server/services/navigation.service';
      export * from './src/server/services/catalog.service';
      export * from './src/server/services/pricing.service';
      export * from './src/server/services/media-library.service';
      export * from './src/server/services/settings.service';
      export * from './src/server/services/storefront-cms.service';
      export * from './src/contracts/cms/site-builder';
      export * from './src/contracts/cms/navigation';
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
  outfile: 'scripts/.r07a-test-bundle.mjs',
});

const api = await import('./.r07a-test-bundle.mjs');

// 2. Initialize isolated Miniflare environment
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r07a-test"); } }',
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

  // Apply all migrations 0001 -> 0017
  await check('Apply all migrations up to 0017_site_builder.sql', async () => {
    const migrationFiles = (await readdir('d1-migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    
    assert(migrationFiles.includes('0017_site_builder.sql'), 'Migration 0017 must be present');

    for (const f of migrationFiles) {
      const sql = await readFile(`d1-migrations/${f}`, 'utf8');
      const statements = unstable_splitSqlQuery(sql);
      await DB.batch(statements.map((s) => DB.prepare(s)));
    }

    const fkCheck = await DB.prepare('PRAGMA foreign_key_check').all();
    assert.equal(fkCheck.results.length, 0, 'Foreign key check must have 0 violations');
  });

  // Seed sample products & categories for testing
  await check('Seed mock catalog data (products, categories, brands)', async () => {
    await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('laptop-gaming', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();
    await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('phu-kien', 'Phụ kiện', 'phu-kien', CURRENT_TIMESTAMP)").run();

    await DB.prepare("INSERT INTO Brand(id, name, slug, updatedAt) VALUES('lenovo', 'Lenovo', 'lenovo', CURRENT_TIMESTAMP)").run();
    await DB.prepare("INSERT INTO Brand(id, name, slug, updatedAt) VALUES('asus', 'Asus', 'asus', CURRENT_TIMESTAMP)").run();

    // Laptop products
    await DB.prepare(`
      INSERT INTO Product(id, name, slug, description, price, categoryId, brandId, status, updatedAt, isFeatured, isNewArrival, isBestSeller)
      VALUES('p-legion', 'Lenovo Legion 5 Pro', 'lenovo-legion-5-pro', 'RTX 4060', 30000000, 'laptop-gaming', 'lenovo', 'ACTIVE', CURRENT_TIMESTAMP, 1, 1, 0)
    `).run();

    await DB.prepare(`
      INSERT INTO Product(id, name, slug, description, price, categoryId, brandId, status, updatedAt, isFeatured, isNewArrival, isBestSeller)
      VALUES('p-rog', 'Asus ROG Strix G16', 'asus-rog-strix-g16', 'RTX 4070', 42000000, 'laptop-gaming', 'asus', 'ACTIVE', CURRENT_TIMESTAMP, 1, 0, 1)
    `).run();

    // Draft laptop - MUST NEVER leak to storefront
    await DB.prepare(`
      INSERT INTO Product(id, name, slug, description, price, categoryId, brandId, status, updatedAt, isFeatured, isNewArrival, isBestSeller)
      VALUES('p-draft-laptop', 'Secret Prototype Laptop', 'secret-prototype', '', 99000000, 'laptop-gaming', 'asus', 'DRAFT', CURRENT_TIMESTAMP, 0, 1, 0)
    `).run();

    // Accessory product
    await DB.prepare(`
      INSERT INTO Product(id, name, slug, description, price, categoryId, brandId, status, updatedAt, isFeatured, isNewArrival, isBestSeller)
      VALUES('p-mouse', 'Chuột Gaming Không Dây', 'chuot-gaming-khong-day', '', 1500000, 'phu-kien', 'asus', 'ACTIVE', CURRENT_TIMESTAMP, 0, 1, 0)
    `).run();
  });

  // Test 1: Bootstrap Homepage Idempotency
  await check('Homepage bootstrap initializes revision 1, publishes, and subsequent calls skip', async () => {
    const res1 = await bootstrapHomepage(DB);
    assert.equal(res1.status, 'BOOTSTRAPPED');
    assert.equal(res1.revision, 1);
    assert.equal(res1.publishedRevision, 1);

    const res2 = await bootstrapHomepage(DB);
    assert.equal(res2.status, 'SKIPPED');

    const publicHome = await api.getPublicHomepage(DB);
    assert.ok(publicHome, 'Public homepage must be returned');
    assert.equal(publicHome.isHome, true);
    assert.equal(publicHome.slug, '');
    assert.ok(publicHome.sections.length > 0);
  });

  // Test 2: Draft Save Isolation
  let homeDetail = await api.getLandingPageDetail(DB, 'home');
  await check('Saving draft increments revision, updates draft, and does NOT leak to public homepage', async () => {
    const nextDoc = structuredClone(homeDetail.document);
    nextDoc.title = 'Tiêu đề bản nháp mới';
    nextDoc.sections[0].data.title = 'Banner Nháp Mới Chưa Public';

    const saveRes = await api.writeLandingPage(env, 'home', {
      expectedRevision: homeDetail.revision,
      action: 'save',
      document: nextDoc,
    });

    assert.equal(saveRes.revision, 2);
    assert.equal(saveRes.publishedRevision, 1);
    assert.equal(saveRes.hasUnpublishedDraft, true);

    // Verify public homepage still serves published revision 1
    const publicHome = await api.getPublicHomepage(DB);
    assert.equal(publicHome.title, 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt');
    assert.notEqual(publicHome.sections[0].data.title, 'Banner Nháp Mới Chưa Public');

    homeDetail = saveRes;
  });

  // Test 3: Publish & Unpublish Lifecycle
  await check('Publish atomically updates public storefront; unpublish gracefully disables it', async () => {
    const pubDoc = structuredClone(homeDetail.document);
    pubDoc.title = 'CitiLap - Phiên Bản Đã Xuất Bản V3';
    pubDoc.sections[0].data.title = 'Banner V3 Công Khai';

    const pubRes = await api.writeLandingPage(env, 'home', {
      expectedRevision: homeDetail.revision,
      action: 'publish',
      document: pubDoc,
    });

    assert.equal(pubRes.revision, 3);
    assert.equal(pubRes.publishedRevision, 3);
    assert.equal(pubRes.status, 'PUBLISHED');

    const publicHome = await api.getPublicHomepage(DB);
    assert.equal(publicHome.title, 'CitiLap - Phiên Bản Đã Xuất Bản V3');
    assert.equal(publicHome.sections[0].data.title, 'Banner V3 Công Khai');

    // Unpublish
    const unpubRes = await api.writeLandingPage(env, 'home', {
      expectedRevision: pubRes.revision,
      action: 'unpublish',
      document: pubDoc,
    });

    assert.equal(unpubRes.revision, 4);
    assert.equal(unpubRes.publishedRevision, null);
    assert.equal(unpubRes.status, 'DRAFT');

    const publicHomeAfterUnpub = await api.getPublicHomepage(DB);
    assert.equal(publicHomeAfterUnpub, null, 'Public homepage must be null when unpublished');

    // Re-publish to keep homepage active for further tests
    const repubRes = await api.writeLandingPage(env, 'home', {
      expectedRevision: unpubRes.revision,
      action: 'publish',
      document: pubDoc,
    });
    assert.equal(repubRes.status, 'PUBLISHED');
    homeDetail = repubRes;
  });

  // Test 4: Concurrency & CAS Conflict Protection (409)
  await check('Concurrent or stale write attempts are rejected with 409 conflict', async () => {
    const doc = structuredClone(homeDetail.document);

    // Attempt with stale revision (e.g. revision 1 when current is 5)
    await assert.rejects(
      () =>
        api.writeLandingPage(env, 'home', {
          expectedRevision: 1,
          action: 'save',
          document: doc,
        }),
      (err) => err.status === 409
    );

    // Concurrent race condition: 2 writes with expectedRevision = current
    const currentRev = homeDetail.revision;
    const [w1, w2] = await Promise.allSettled([
      api.writeLandingPage(env, 'home', { expectedRevision: currentRev, action: 'save', document: doc }),
      api.writeLandingPage(env, 'home', { expectedRevision: currentRev, action: 'save', document: doc }),
    ]);

    const successes = [w1, w2].filter((r) => r.status === 'fulfilled');
    const rejects = [w1, w2].filter((r) => r.status === 'rejected');

    assert.equal(successes.length, 1, 'Exactly one concurrent write must succeed');
    assert.equal(rejects.length, 1, 'Exactly one concurrent write must be rejected with conflict');
    assert.equal(rejects[0].reason.status, 409);

    homeDetail = await api.getLandingPageDetail(DB, 'home');
  });

  // Test 5: Revision Log & Restore
  await check('LandingPageRevision tracks append-only history and restore creates a new draft', async () => {
    const revs = await api.getLandingPageRevisions(DB, 'home');
    assert.ok(revs.length >= 3, 'Must have at least 3 revisions');
    assert.equal(revs[0].action, 'save'); // Most recent

    // Restore revision 1 (the initial bootstrap)
    const restoreRes = await api.restoreLandingPageRevision(env, 'home', 1, homeDetail.revision);
    assert.equal(restoreRes.revision, homeDetail.revision + 1);
    assert.equal(restoreRes.document.title, 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt');
    homeDetail = restoreRes;
  });

  // Test 6: Custom Landing Page Lifecycle & Slug Validations
  await check('Custom landing pages validate slugs, reject reserved routes, and serve /landing/:slug', async () => {
    const newLandingDoc = api.blankLandingPage(false);
    newLandingDoc.slug = 'sieu-sale-laptop-2026';
    newLandingDoc.title = 'Đại Tiệc Siêu Sale Laptop 2026';
    newLandingDoc.internalName = 'Landing Sale 2026';

    // 1. Reserved slug check
    for (const badSlug of ['admin', 'landing', 'cart', 'checkout', 'product', 'category', 'news', 'lien-he']) {
      const badDoc = structuredClone(newLandingDoc);
      badDoc.slug = badSlug;
      await assert.rejects(
        () => api.writeLandingPage(env, null, { expectedRevision: 0, action: 'save', document: badDoc }),
        /dành riêng|không hợp lệ|safeParse/
      );
    }

    // 2. Create as draft
    const createdLanding = await api.writeLandingPage(env, null, {
      expectedRevision: 0,
      action: 'save',
      document: newLandingDoc,
    });
    assert.equal(createdLanding.status, 'DRAFT');
    assert.equal(createdLanding.slug, 'sieu-sale-laptop-2026');

    // Un-published landing page returns null to public
    const publicBefore = await api.getPublicLandingPage(DB, 'sieu-sale-laptop-2026');
    assert.equal(publicBefore, null);

    // 3. Publish landing page
    const publishedLanding = await api.writeLandingPage(env, createdLanding.id, {
      expectedRevision: createdLanding.revision,
      action: 'publish',
      document: newLandingDoc,
    });
    assert.equal(publishedLanding.status, 'PUBLISHED');

    const publicAfter = await api.getPublicLandingPage(DB, 'sieu-sale-laptop-2026');
    assert.ok(publicAfter);
    assert.equal(publicAfter.title, 'Đại Tiệc Siêu Sale Laptop 2026');
    assert.equal(publicAfter.slug, 'sieu-sale-laptop-2026');

    // 4. Duplicate slug rejection
    const dupDoc = structuredClone(newLandingDoc);
    await assert.rejects(
      () => api.writeLandingPage(env, null, { expectedRevision: 0, action: 'save', document: dupDoc }),
      (err) => err.status === 409
    );
  });

  // Test 7: Catalog Resolution in Site Builder Sections (Rule & Manual)
  await check('Product grid sections resolve active products and exclude draft products', async () => {
    const testSections = [
      {
        id: 'sec-rule-test',
        type: 'product_grid',
        name: 'Lưới theo rule',
        enabled: true,
        data: {
          type: 'product_grid',
          title: 'Laptop Gaming Mới',
          subtitle: '',
          badge: '',
          badgeColor: '',
          colorTheme: 'blue',
          links: [],
          sourceMode: 'rule',
          manualProductIds: [],
          ruleCriteria: {
            productType: 'laptop',
            categoryId: null,
            brandId: null,
            tag: 'all',
            availability: 'all',
            sort: 'price-desc',
            limit: 10,
          },
          rankNumbering: false,
          viewAllLink: '',
        },
      },
      {
        id: 'sec-manual-test',
        type: 'product_grid',
        name: 'Lưới thủ công',
        enabled: true,
        data: {
          type: 'product_grid',
          title: 'Chọn thủ công',
          subtitle: '',
          badge: '',
          badgeColor: '',
          colorTheme: 'blue',
          links: [],
          sourceMode: 'manual',
          manualProductIds: ['p-rog', 'p-draft-laptop', 'p-non-existent'],
          ruleCriteria: {
            productType: 'all',
            categoryId: null,
            brandId: null,
            tag: 'all',
            availability: 'all',
            sort: 'newest',
            limit: 10,
          },
          rankNumbering: false,
          viewAllLink: '',
        },
      },
    ];

    const resolved = await api.resolveSectionsForStorefront(DB, testSections);
    assert.equal(resolved.length, 2);

    // Section 1: Rule-based
    const sec1Products = resolved[0].resolvedProducts;
    assert.ok(sec1Products, 'Must have resolved products');
    // Must contain active laptops, ordered price desc (Asus ROG 42M, Lenovo Legion 30M)
    assert.equal(sec1Products.length, 2);
    assert.equal(sec1Products[0].id, 'p-rog');
    assert.equal(sec1Products[1].id, 'p-legion');
    // Draft laptop (p-draft-laptop) must be absent!
    assert.equal(sec1Products.some((p) => p.id === 'p-draft-laptop'), false);

    // Section 2: Manual
    const sec2Products = resolved[1].resolvedProducts;
    assert.ok(sec2Products);
    // Only p-rog is active and exists; p-draft-laptop and p-non-existent must be filtered out
    assert.equal(sec2Products.length, 1);
    assert.equal(sec2Products[0].id, 'p-rog');
  });

  // Test 8: Manual & Rule-based Collections in Navigation Service
  await check('Collections support manual and rule modes, with published-only product resolution', async () => {
    let navDetail = await api.navigationDetail(DB);
    const navDoc = structuredClone(navDetail.document);

    navDoc.collections = [
      {
        id: 'col-manual',
        name: 'Bộ Sưu Tập Thủ Công',
        slug: 'bo-suu-tap-thu-cong',
        description: 'Mô tả manual',
        visible: true,
        mode: 'manual',
        productIds: ['p-legion', 'p-rog'],
      },
      {
        id: 'col-rule',
        name: 'Bộ Sưu Tập Phụ Kiện',
        slug: 'bo-suu-tap-phu-kien',
        description: 'Mô tả rule',
        visible: true,
        mode: 'rule',
        rule: {
          productType: 'accessory',
          categoryId: null,
          brandId: null,
          tag: 'all',
          availability: 'all',
          sort: 'newest',
          limit: 12,
        },
      },
    ];

    await api.writeNavigation(env, {
      expectedRevision: navDetail.revision,
      action: 'publish',
      document: navDoc,
    });

    // Test publicCollection for manual
    const colManual = await api.publicCollection(DB, 'bo-suu-tap-thu-cong');
    assert.equal(colManual.name, 'Bộ Sưu Tập Thủ Công');
    assert.equal(colManual.mode, 'manual');
    assert.deepEqual(colManual.products.map((p) => p.id), ['p-legion', 'p-rog']);

    // Dynamically unpublished product is excluded from collection
    await DB.prepare("UPDATE Product SET status='DRAFT' WHERE id='p-rog'").run();
    const colManualAfterUnpub = await api.publicCollection(DB, 'bo-suu-tap-thu-cong');
    assert.deepEqual(colManualAfterUnpub.products.map((p) => p.id), ['p-legion']);
    await DB.prepare("UPDATE Product SET status='ACTIVE' WHERE id='p-rog'").run();

    // Test publicCollection for rule
    const colRule = await api.publicCollection(DB, 'bo-suu-tap-phu-kien');
    assert.equal(colRule.name, 'Bộ Sưu Tập Phụ Kiện');
    assert.equal(colRule.mode, 'rule');
    assert.deepEqual(colRule.products.map((p) => p.id), ['p-mouse']); // Accessory matched

    // Test publicCollectionList
    const colList = await api.publicCollectionList(DB);
    assert.equal(colList.length, 2);
    assert.equal(colList.find((c) => c.slug === 'bo-suu-tap-thu-cong').productCount, 2);
    assert.equal(colList.find((c) => c.slug === 'bo-suu-tap-phu-kien').productCount, 1);
  });

  // Test 9: StoreFront Settings Integration
  await check('StoreFront settings provides CMS branding, showroom, hotline and contact data', async () => {
    const current = await api.getAdminSettings(DB);
    const settingsDoc = {
      ...current.document,
      storeName: 'CitiLap Tech & Gaming',
      motto: 'Đẳng Cấp Công Nghệ - Giá Trị Vượt Trội',
      logoUrl: 'https://images.unsplash.com/logo.png',
      storePhone: '0987654321',
      storeEmail: 'contact@citilap.vn',
      openingHours: '8:00 - 21:00 Hàng ngày',
      copyrightText: '© 2026 CitiLap. Bản quyền đã đăng ký.',
      facebookUrl: 'https://facebook.com/citilap',
      zaloUrl: 'https://zalo.me/citilap',
      tiktokUrl: 'https://tiktok.com/@citilap',
      addressHanoi: '123 Đường Công Nghệ, Quận 1, TP. HCM',
      addressBacNinh: '456 Phố Mới, Bắc Ninh',
      storePhoneBacNinh: '0987654322',
    };

    await api.saveAdminSettings(DB, {
      expectedRevision: current.revision,
      document: settingsDoc,
    });

    const storefrontSettings = await api.getPublicStorefrontSettings(DB);
    assert.equal(storefrontSettings.storeName, 'CitiLap Tech & Gaming');
    assert.equal(storefrontSettings.motto, 'Đẳng Cấp Công Nghệ - Giá Trị Vượt Trội');
    assert.equal(storefrontSettings.logoUrl, 'https://images.unsplash.com/logo.png');
    assert.equal(storefrontSettings.storePhone, '0987654321');
    assert.equal(storefrontSettings.storeEmail, 'contact@citilap.vn');
    assert.equal(storefrontSettings.openingHours, '8:00 - 21:00 Hàng ngày');
    assert.equal(storefrontSettings.copyrightText, '© 2026 CitiLap. Bản quyền đã đăng ký.');
    assert.equal(storefrontSettings.facebookUrl, 'https://facebook.com/citilap');
    assert.equal(storefrontSettings.addressHanoi, '123 Đường Công Nghệ, Quận 1, TP. HCM');
  });

  // Test 10: Conditional ProductStudio Preload in resolveSectionsForStorefront
  await check('resolveSectionsForStorefront skips ProductStudio scan unless an enabled rule needs availability filtering, while preserving outputs/order/prices', async () => {
    // Seed CMS Studio products with AVAILABLE, PREORDER, CONTACT, and an unpublished Studio draft
    for (const [id, name, slug, price, availability] of [
      ['p-studio-avail', 'Laptop Studio Available', 'laptop-studio-available', 28000000, 'AVAILABLE'],
      ['p-studio-preorder', 'Laptop Studio Preorder', 'laptop-studio-preorder', 35000000, 'PREORDER'],
      ['p-studio-contact', 'Laptop Studio Contact', 'laptop-studio-contact', 45000000, 'CONTACT'],
    ]) {
      await DB.prepare(
        `INSERT INTO Product(id, name, slug, description, price, categoryId, brandId, status, updatedAt, isFeatured, isNewArrival, isBestSeller)
         VALUES(?, ?, ?, 'Studio Desc', ?, 'laptop-gaming', 'lenovo', 'ACTIVE', CURRENT_TIMESTAMP, 1, 1, 0)`
      ).bind(id, name, slug, price).run();
      const doc = JSON.stringify({
        schemaVersion: 1,
        name,
        slug,
        categoryId: 'laptop-gaming',
        price,
        availability,
        variants: [],
        media: [],
      });
      await DB.prepare(
        `INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
         VALUES(?, 1, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(id, doc, doc).run();
    }

    // Unpublished studio product (published IS NULL) - must remain excluded even though Product.status is ACTIVE
    await DB.prepare(
      `INSERT INTO Product(id, name, slug, description, price, categoryId, brandId, status, updatedAt, isFeatured, isNewArrival, isBestSeller)
       VALUES('p-studio-unpub', 'Laptop Studio Unpub', 'laptop-studio-unpub', '', 19000000, 'laptop-gaming', 'lenovo', 'ACTIVE', CURRENT_TIMESTAMP, 1, 1, 1)`
    ).run();
    await DB.prepare(
      `INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
       VALUES('p-studio-unpub', 1, '{"name":"Unpub"}', NULL, CURRENT_TIMESTAMP)`
    ).run();

    // Active promotion campaign on p-legion to verify price/originalPrice/discount fields
    const startAt = new Date(Date.now() - 60_000).toISOString();
    const endAt = new Date(Date.now() + 3_600_000).toISOString();
    await DB.prepare(
      `INSERT INTO PromotionCampaign(id, name, status, startAt, endAt)
       VALUES('camp-r8', 'Round 8 Sale', 'PUBLISHED', ?, ?)`
    ).bind(startAt, endAt).run();
    await DB.prepare(
      `INSERT INTO PromotionCampaignItem(id, campaignId, productId, salePrice, regularPrice)
       VALUES('camp-r8-item', 'camp-r8', 'p-legion', 25990000, 30000000)`
    ).run();

    let studioFindManyCalls = 0;
    const prismaClient = api.getPrismaClient(DB);
    const origFindMany = prismaClient.productStudio.findMany.bind(prismaClient.productStudio);
    prismaClient.productStudio.findMany = async (...args) => {
      studioFindManyCalls++;
      return origFindMany(...args);
    };

    const runAndCount = async (sections) => {
      studioFindManyCalls = 0;
      const result = await api.resolveSectionsForStorefront(DB, sections);
      return { result, studioFindManyCalls };
    };

    const makeCriteria = (overrides = {}) => ({
      productType: 'laptop',
      categoryId: null,
      brandId: null,
      tag: 'all',
      availability: 'all',
      sort: 'price-asc',
      limit: 10,
      ...overrides,
    });

    const makeTab = (id, overrides = {}) => {
      const tab = {
        id,
        label: overrides.label ?? id,
        productIds: overrides.productIds ?? [],
        href: overrides.href ?? '/search',
        ...(overrides.enabled !== undefined ? { enabled: overrides.enabled } : {}),
        ...(overrides.sourceMode !== undefined ? { sourceMode: overrides.sourceMode } : {}),
        ...(overrides.ruleCriteria !== undefined ? { ruleCriteria: overrides.ruleCriteria } : {}),
      };
      return tab;
    };

    const makeGridSection = (id, overrides = {}) => ({
      id,
      type: 'product_grid',
      name: id,
      enabled: overrides.enabled ?? true,
      data: {
        type: 'product_grid',
        title: `Grid ${id}`,
        subtitle: '',
        badge: '',
        badgeColor: '',
        colorTheme: 'blue',
        links: [],
        sourceMode: overrides.sourceMode ?? 'rule',
        manualProductIds: overrides.manualProductIds ?? [],
        ruleCriteria: overrides.ruleCriteria ?? makeCriteria({ limit: 12 }),
        tabs: overrides.tabs,
        rankNumbering: false,
        viewAllLink: '',
      },
    });

    try {
      // 1. No product sections
      const noProductRes = await runAndCount([
        {
          id: 'sec-banner-only',
          type: 'banner',
          name: 'Banner',
          enabled: true,
          data: {
            type: 'banner',
            title: 'Hero',
            subtitle: '',
            badge: '',
            imageUrl: '',
            imageAssetId: null,
            link: '/product/lenovo-legion-5-pro',
            buttonText: 'Xem ngay',
            secondaryLink: '',
            secondaryButtonText: '',
            layout: 'hero',
          },
        },
        {
          id: 'sec-cats-only',
          type: 'featured_categories',
          name: 'Categories',
          enabled: true,
          data: {
            type: 'featured_categories',
            title: 'Danh mục',
            subtitle: '',
            categoryIds: ['laptop-gaming'],
            items: [],
          },
        },
      ]);
      assert.equal(noProductRes.studioFindManyCalls, 0);
      assert.equal(noProductRes.result[0].data.link, '/san-pham/lenovo-legion-5-pro');
      assert.equal(noProductRes.result[1].resolvedCategories.length, 1);

      // 2. Enabled product_grid with availability='all' or omitted on main and rule tabs
      const omittedAvailCriteria = makeCriteria();
      delete omittedAvailCriteria.availability;
      const allAvailabilitySections = [
        makeGridSection('sec-all-avail', {
          ruleCriteria: makeCriteria(),
          tabs: [
            makeTab('tab-all-desc', {
              label: 'Laptop Giá Cao',
              href: '/search?sort=newest',
              enabled: true,
              sourceMode: 'rule',
              ruleCriteria: makeCriteria({ sort: 'price-desc' }),
            }),
            makeTab('tab-omitted-avail', {
              label: 'Laptop Mặc Định',
              sourceMode: 'rule',
              ruleCriteria: omittedAvailCriteria,
            }),
          ],
        }),
      ];
      const noAvailRes = await runAndCount(allAvailabilitySections);
      assert.equal(noAvailRes.studioFindManyCalls, 0, 'Must skip ProductStudio scan when availability is all/omitted');

      const mainAscIds = noAvailRes.result[0].resolvedProducts.map((p) => p.id);
      assert.deepEqual(mainAscIds, ['p-studio-avail', 'p-legion', 'p-studio-preorder', 'p-rog', 'p-studio-contact']);
      assert.equal(noAvailRes.result[0].resolvedProducts.some((p) => p.id === 'p-draft-laptop' || p.id === 'p-studio-unpub'), false);

      const legionCard = noAvailRes.result[0].resolvedProducts.find((p) => p.id === 'p-legion');
      assert.equal(legionCard.price, 25990000, 'Campaign sale price must be preserved');
      assert.equal(legionCard.originalPrice, 30000000, 'Campaign regular price must be preserved');
      assert.equal(legionCard.oldPrice, 30000000);
      assert.equal(legionCard.isOnSale, true);
      assert.equal(legionCard.isFlashSale, false);
      assert.equal(legionCard.discount, '-13%');

      const tabDescIds = noAvailRes.result[0].resolvedTabs[0].products.map((p) => p.id);
      assert.deepEqual(tabDescIds, ['p-studio-contact', 'p-rog', 'p-studio-preorder', 'p-legion', 'p-studio-avail']);
      assert.equal(noAvailRes.result[0].resolvedTabs[0].href, '/search?category=laptop&sort=newest');
      assert.deepEqual(noAvailRes.result[0].resolvedTabs[1].products.map((p) => p.id), mainAscIds);

      // Verify exact output/order/price parity against forced-preload execution
      const evalAt = new Date();
      const [forcedPricingCtx, preloadedStudios, activeCategories] = await Promise.all([
        api.getStorefrontPricingContext(DB, evalAt),
        origFindMany({ select: { productId: true, published: true } }),
        api.getActiveCategories(prismaClient),
      ]);
      const directMain = await api.resolveProductsByCriteria(
        allAvailabilitySections[0].data.ruleCriteria,
        prismaClient,
        forcedPricingCtx,
        evalAt,
        { categories: activeCategories, studios: preloadedStudios }
      );
      assert.deepEqual(
        noAvailRes.result[0].resolvedProducts,
        directMain,
        'Resolved products with skipped studio scan must be deep-equal to forced-preload resolution'
      );

      // 3. Enabled main rule with AVAILABLE, PREORDER, CONTACT
      for (const [avail, expectedIds] of [
        ['AVAILABLE', ['p-studio-avail', 'p-legion', 'p-rog']],
        ['PREORDER', ['p-studio-preorder']],
        ['CONTACT', ['p-studio-contact']],
      ]) {
        const res = await runAndCount([
          makeGridSection(`sec-main-${avail}`, {
            ruleCriteria: makeCriteria({ availability: avail }),
          }),
        ]);
        assert.equal(res.studioFindManyCalls, 1, `Main rule availability=${avail} must preload ProductStudio once`);
        assert.deepEqual(res.result[0].resolvedProducts.map((p) => p.id), expectedIds);
      }

      // 4. Enabled rule tab needing availability while main rule has availability='all'
      const ruleTabRes = await runAndCount([
        makeGridSection('sec-tab-avail', {
          ruleCriteria: makeCriteria(),
          tabs: [
            makeTab('tab-preorder', {
              label: 'Đặt trước',
              enabled: true,
              sourceMode: 'rule',
              ruleCriteria: makeCriteria({ availability: 'PREORDER' }),
            }),
          ],
        }),
      ]);
      assert.equal(ruleTabRes.studioFindManyCalls, 1, 'Enabled rule tab with availability!=all must trigger preload once');
      assert.deepEqual(ruleTabRes.result[0].resolvedTabs[0].products.map((p) => p.id), ['p-studio-preorder']);

      // 5. Disabled section and disabled tab with availability!=all must be ignored
      const disabledRes = await runAndCount([
        makeGridSection('sec-disabled-avail', {
          enabled: false,
          ruleCriteria: makeCriteria({ availability: 'AVAILABLE' }),
        }),
        makeGridSection('sec-enabled-with-disabled-tab', {
          ruleCriteria: makeCriteria(),
          tabs: [
            makeTab('tab-disabled-contact', {
              label: 'Disabled Contact Tab',
              enabled: false,
              sourceMode: 'rule',
              ruleCriteria: makeCriteria({ availability: 'CONTACT' }),
            }),
          ],
        }),
      ]);
      assert.equal(disabledRes.studioFindManyCalls, 0, 'Disabled section and disabled tab must not trigger ProductStudio preload');
      assert.equal(disabledRes.result.length, 1);
      assert.equal(disabledRes.result[0].resolvedTabs, undefined);

      // 6. Manual main and manual tab ignore leftover ruleCriteria.availability
      const manualRes = await runAndCount([
        makeGridSection('sec-manual-with-leftover-criteria', {
          sourceMode: 'manual',
          manualProductIds: ['p-legion', 'p-rog', 'p-studio-unpub'],
          ruleCriteria: makeCriteria({ availability: 'AVAILABLE' }),
          tabs: [
            makeTab('tab-manual-leftover', {
              label: 'Tab Manual',
              productIds: ['p-rog', 'p-legion'],
              enabled: true,
              sourceMode: 'manual',
              ruleCriteria: makeCriteria({ availability: 'PREORDER' }),
            }),
            makeTab('tab-implicit-manual-leftover', {
              label: 'Tab Implicit Manual',
              productIds: ['p-legion'],
              enabled: true,
              ruleCriteria: makeCriteria({ availability: 'CONTACT' }),
            }),
          ],
        }),
      ]);
      assert.equal(manualRes.studioFindManyCalls, 0, 'Manual main/tabs must ignore leftover ruleCriteria.availability');
      assert.deepEqual(manualRes.result[0].resolvedProducts.map((p) => p.id), ['p-legion', 'p-rog']);
      assert.equal(manualRes.result[0].resolvedProducts[0].price, 25990000);
      assert.deepEqual(manualRes.result[0].resolvedTabs[0].products.map((p) => p.id), ['p-rog', 'p-legion']);
      assert.deepEqual(manualRes.result[0].resolvedTabs[1].products.map((p) => p.id), ['p-legion']);

      // 7. Mixed sections share exactly ONE preload across multiple main grids and rule tabs
      const mixedRes = await runAndCount([
        makeGridSection('sec-mixed-1', {
          ruleCriteria: makeCriteria({ availability: 'AVAILABLE' }),
          tabs: [
            makeTab('tab-mixed-preorder', {
              label: 'Preorder',
              enabled: true,
              sourceMode: 'rule',
              ruleCriteria: makeCriteria({ availability: 'PREORDER' }),
            }),
            makeTab('tab-mixed-contact', {
              label: 'Contact',
              enabled: true,
              sourceMode: 'rule',
              ruleCriteria: makeCriteria({ availability: 'CONTACT' }),
            }),
          ],
        }),
        makeGridSection('sec-mixed-2', {
          ruleCriteria: makeCriteria({ sort: 'price-desc' }),
          tabs: [
            makeTab('tab-mixed-avail-2', {
              label: 'Available 2',
              enabled: true,
              sourceMode: 'rule',
              ruleCriteria: makeCriteria({ availability: 'AVAILABLE', sort: 'price-desc' }),
            }),
          ],
        }),
      ]);
      assert.equal(mixedRes.studioFindManyCalls, 1, 'Mixed sections must share a single ProductStudio preload');
      assert.deepEqual(mixedRes.result[0].resolvedProducts.map((p) => p.id), ['p-studio-avail', 'p-legion', 'p-rog']);
      assert.deepEqual(mixedRes.result[0].resolvedTabs[0].products.map((p) => p.id), ['p-studio-preorder']);
      assert.deepEqual(mixedRes.result[0].resolvedTabs[1].products.map((p) => p.id), ['p-studio-contact']);
      assert.deepEqual(mixedRes.result[1].resolvedProducts.map((p) => p.id), ['p-studio-contact', 'p-rog', 'p-studio-preorder', 'p-legion', 'p-studio-avail']);
      assert.deepEqual(mixedRes.result[1].resolvedTabs[0].products.map((p) => p.id), ['p-rog', 'p-legion', 'p-studio-avail']);
    } finally {
      prismaClient.productStudio.findMany = origFindMany;
    }
  });

  console.log(`\n========================================`);
  console.log(`ALL R07A INTEGRATION TESTS PASSED: ${passed}/${passed}`);
  console.log(`========================================\n`);
} finally {
  await mf.dispose();
}
