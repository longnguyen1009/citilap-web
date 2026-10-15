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

  console.log(`\n========================================`);
  console.log(`ALL R07A INTEGRATION TESTS PASSED: ${passed}/${passed}`);
  console.log(`========================================\n`);
} finally {
  await mf.dispose();
}
