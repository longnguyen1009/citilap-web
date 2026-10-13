import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

// Bundle backend services
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/brand.service';
      export * from './src/server/services/media-library.service';
      export * from './src/contracts/cms/product-studio';
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
    script: 'export default { fetch() { return new Response("r03b"); } }',
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

  // 1. Run all D1 migrations
  const migrationFiles = (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    const stmts = unstable_splitSqlQuery(sql);
    await DB.batch(stmts.map(s => DB.prepare(s)));
  }

  // Seed baseline Category and Media Image
  await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat-laptop','Laptop Gaming','laptop-gaming',CURRENT_TIMESTAMP)").run();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const asset = (await api.uploadLibraryImage(env, new File([png], 'hero.png', { type: 'image/png' }))).asset;

  // ==========================================
  // SECTION 1: PRIORITY B - BRAND MANAGEMENT
  // ==========================================
  console.log('\n--- TESTING PRIORITY B: BRAND MANAGEMENT ---');

  let brandAsus;
  await check('Brand: create Asus brand with logo and SEO', async () => {
    brandAsus = await api.writeBrand(env, null, {
      name: 'ASUS ROG',
      slug: 'asus-rog',
      logo: asset.url,
      description: 'Dòng laptop gaming đỉnh cao từ ASUS.',
      seoTitle: 'Laptop ASUS ROG Gaming Chính Hãng | CitiLap',
      seoDescription: 'Mua laptop ASUS ROG cấu hình khủng, giá ưu đãi tại CitiLap.',
      status: 'ACTIVE',
    });
    assert.ok(brandAsus.id);
    assert.equal(brandAsus.name, 'ASUS ROG');
    assert.equal(brandAsus.slug, 'asus-rog');
    assert.equal(brandAsus.status, 'ACTIVE');
  });

  await check('Brand: listBrands returns created brand with productCount=0', async () => {
    const list = await api.listBrands(DB);
    assert.ok(list.items.length >= 1);
    const found = list.items.find(b => b.id === brandAsus.id);
    assert.ok(found);
    assert.equal(found.productCount, 0);
  });

  // ==========================================
  // SECTION 2: PRODUCT STUDIO & 3 TRỤC TRẠNG THÁI
  // ==========================================
  console.log('\n--- TESTING PRIORITY C: CONDITION, AVAILABILITY, LABELS & BRAND LINK ---');

  const docA = {
    ...api.blankProduct(),
    name: 'ASUS ROG Zephyrus G16 (Bản A)',
    slug: 'asus-rog-zephyrus-g16',
    categoryId: 'cat-laptop',
    brand: 'ASUS ROG',
    brandId: brandAsus.id,
    condition: 'LIKE_NEW',
    availability: 'PREORDER',
    isNewArrival: true,
    isBestSeller: true,
    isFeatured: true,
    price: 35000000,
    originalPrice: 40000000,
    description: 'Laptop gaming cao cấp siêu mỏng nhẹ.',
    contentHtml: '<h2>Đánh giá ASUS ROG G16</h2><p>Màn hình OLED 240Hz sắc nét.</p>',
    media: [{ assetId: asset.id, alt: 'ASUS ROG G16 mặt trước', variantId: '' }],
    variants: [{
      id: 'var-g16-01',
      name: 'Ultra 9 / 32GB / 1TB / RTX 4070',
      sku: 'G16-U9-4070',
      condition: 'LIKE_NEW',
      price: 35000000,
      ram: '32GB',
      storage: '1TB',
      gpu: 'RTX 4070',
    }],
    warranties: [{ name: 'Bảo hành 12 tháng', description: 'Gói vàng', adjustment: 0, recommended: true }],
  };

  let prodId;
  await check('Studio: create and save draft preserves condition, availability PREORDER and marketing labels', async () => {
    const res = await api.writeStudio(env, null, {
      expectedRevision: 0,
      action: 'save',
      document: docA,
    });
    prodId = res.id;
    assert.equal(res.revision, 1);

    // Verify draft stored in ProductStudio
    const detail = await api.studioDetail(DB, prodId);
    assert.equal(detail.document.condition, 'LIKE_NEW');
    assert.equal(detail.document.availability, 'PREORDER');
    assert.equal(detail.document.isNewArrival, true);
    assert.equal(detail.document.isBestSeller, true);
    assert.equal(detail.document.brandId, brandAsus.id);

    // Verify public does NOT have it yet
    await assert.rejects(() => api.publicStudio(DB, docA.slug), err => err.status === 404);
  });

  await check('Studio: publish version A updates Product table and storefront resolver', async () => {
    const res = await api.writeStudio(env, prodId, {
      expectedRevision: 1,
      action: 'publish',
      document: docA,
    });
    assert.equal(res.revision, 2);

    // Verify public resolver
    const pub = await api.publicStudio(DB, docA.slug);
    assert.equal(pub.name, 'ASUS ROG Zephyrus G16 (Bản A)');
    assert.equal(pub.canOrder, true); // PREORDER is orderable!
    assert.equal(pub.condition, 'LIKE_NEW');

    // Verify Product projection in database
    const row = await DB.prepare('SELECT brandId, condition, isNewArrival, isBestSeller, status FROM Product WHERE id=?').bind(prodId).first();
    assert.equal(row.brandId, brandAsus.id);
    assert.equal(row.condition, 'LIKE_NEW');
    assert.equal(row.isNewArrival, 1);
    assert.equal(row.isBestSeller, 1);
    assert.equal(row.status, 'ACTIVE');
  });

  await check('Brand: product count incremented and publicBrandWithProducts returns product', async () => {
    const list = await api.listBrands(DB);
    const found = list.items.find(b => b.id === brandAsus.id);
    assert.equal(found.productCount, 1);

    const brandPage = await api.publicBrandWithProducts(DB, brandAsus.slug);
    assert.equal(brandPage.brand.name, 'ASUS ROG');
    assert.equal(brandPage.products.length, 1);
    assert.equal(brandPage.products[0].id, prodId);
    assert.equal(brandPage.products[0].condition, 'LIKE_NEW');
  });

  await check('Brand: archiveBrand is BLOCKED by product reference safety guard (returns 400)', async () => {
    await assert.rejects(
      () => api.archiveBrand(DB, brandAsus.id),
      err => {
        assert.equal(err.status, 400);
        assert.ok(err.message.includes('sản phẩm liên kết'));
        return true;
      }
    );
  });

  // ==========================================
  // SECTION 3: PRIORITY A - REVISION HISTORY & RESTORE INVARIANT
  // ==========================================
  console.log('\n--- TESTING PRIORITY A: REVISIONS & RESTORE INVARIANT ---');

  const docB = {
    ...docA,
    name: 'ASUS ROG Zephyrus G16 (Bản B Đã Sửa)',
    price: 38000000,
    condition: 'NEW',
  };

  await check('History: edit product to version B and save draft', async () => {
    const res = await api.writeStudio(env, prodId, {
      expectedRevision: 2,
      action: 'save',
      document: docB,
    });
    assert.equal(res.revision, 3);

    // Invariant: Website STILL displays version A!
    const pub = await api.publicStudio(DB, docA.slug);
    assert.equal(pub.name, 'ASUS ROG Zephyrus G16 (Bản A)');
    assert.equal(pub.price, 35000000);
  });

  await check('History: publish version B', async () => {
    const res = await api.writeStudio(env, prodId, {
      expectedRevision: 3,
      action: 'publish',
      document: docB,
    });
    assert.equal(res.revision, 4);

    // Now website displays version B
    const pub = await api.publicStudio(DB, docA.slug);
    assert.equal(pub.name, 'ASUS ROG Zephyrus G16 (Bản B Đã Sửa)');
    assert.equal(pub.price, 38000000);
  });

  await check('History: listProductRevisions returns all revisions with audit metadata', async () => {
    const revData = await api.listProductRevisions(DB, prodId);
    assert.equal(revData.productId, prodId);
    assert.equal(revData.currentRevision, 4);
    assert.equal(revData.revisions.length, 4);

    // Check revision 2 was publish of A
    const rev2 = revData.revisions.find(r => r.revision === 2);
    assert.ok(rev2);
    assert.equal(rev2.action, 'publish');
    assert.ok(rev2.summary.includes('Bản A'));

    // Check revision 4 is current published B
    const rev4 = revData.revisions.find(r => r.revision === 4);
    assert.ok(rev4);
    assert.equal(rev4.isCurrent, true);
    assert.equal(rev4.isPublished, true);
  });

  await check('History: getProductRevisionSnapshot returns full document of revision 2', async () => {
    const snap = await api.getProductRevisionSnapshot(DB, prodId, 2);
    assert.equal(snap.revision, 2);
    assert.equal(snap.document.name, 'ASUS ROG Zephyrus G16 (Bản A)');
    assert.equal(snap.document.price, 35000000);
  });

  await check('History: RESTORE revision 2 (A) creates revision 5 as DRAFT without altering public website', async () => {
    // Current website is B (price 38,000,000)
    // We restore revision 2 (price 35,000,000)
    const restoreRes = await api.restoreProductRevision(env, prodId, 2, 4);
    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.newRevision, 5);
    assert.equal(restoreRes.document.name, 'ASUS ROG Zephyrus G16 (Bản A)');

    // INVARIANT VERIFICATION 1: Public website STILL shows Version B!
    const pub = await api.publicStudio(DB, docA.slug);
    assert.equal(pub.name, 'ASUS ROG Zephyrus G16 (Bản B Đã Sửa)');
    assert.equal(pub.price, 38000000);

    // INVARIANT VERIFICATION 2: Studio draft has restored Version A!
    const draft = await api.studioDetail(DB, prodId);
    assert.equal(draft.revision, 5);
    assert.equal(draft.document.name, 'ASUS ROG Zephyrus G16 (Bản A)');
    assert.equal(draft.document.price, 35000000);
  });

  await check('History: publishing revision 5 updates website to restored Version A', async () => {
    const draft = await api.studioDetail(DB, prodId);
    const pubRes = await api.writeStudio(env, prodId, {
      expectedRevision: 5,
      action: 'publish',
      document: draft.document,
    });
    assert.equal(pubRes.revision, 6);

    // Now website shows Version A!
    const pub = await api.publicStudio(DB, docA.slug);
    assert.equal(pub.name, 'ASUS ROG Zephyrus G16 (Bản A)');
    assert.equal(pub.price, 35000000);
  });

  await check('History: concurrent restore with stale expectedRevision returns 409 Conflict', async () => {
    await assert.rejects(
      () => api.restoreProductRevision(env, prodId, 2, 3), // Stale revision 3 (current is 6)
      err => {
        assert.equal(err.status, 409);
        return true;
      }
    );
  });

  // ==========================================
  // SECTION 4: PRIORITY D - HTML SANITIZATION & ROUND-TRIP
  // ==========================================
  console.log('\n--- TESTING PRIORITY D: HTML SANITIZATION & ROUND-TRIP ---');

  await check('Sanitizer: strips scripts, event handlers and dangerous pseudo-protocols', async () => {
    const malicious = `
      <h2>Tiêu đề an toàn</h2>
      <script>alert("hack")</script>
      <img src="https://example.com/pic.jpg" alt="Ảnh test" onerror="alert('xss')" />
      <a href="javascript:alert(1)">Click me</a>
      <a href="https://citilap.vn">CitiLap</a>
      <iframe src="https://evil.com"></iframe>
    `;
    const clean = api.sanitizeHtml(malicious);
    assert.ok(!clean.includes('<script>'));
    assert.ok(!clean.includes('onerror'));
    assert.ok(!clean.includes('javascript:'));
    assert.ok(!clean.includes('<iframe'));
    assert.ok(clean.includes('<h2>Tiêu đề an toàn</h2>'));
    assert.ok(clean.includes('https://example.com/pic.jpg'));
    assert.ok(clean.includes('href="https://citilap.vn"'));
  });

  await check('Sanitizer: preserves tables, lists, formatting, blockquotes, and images', async () => {
    const richContent = `
      <h2>Thông số mở rộng</h2>
      <p>Đoạn văn <strong>in đậm</strong> và <em>in nghiêng</em>.</p>
      <ul><li>Mục 1</li><li>Mục 2</li></ul>
      <table class="specs-table">
        <thead>
          <tr><th colspan="2">Cấu hình chi tiết</th></tr>
        </thead>
        <tbody>
          <tr><td>CPU</td><td>Intel Core Ultra 9 185H</td></tr>
        </tbody>
      </table>
      <hr />
      <img src="/media/pic.jpg" alt="Ảnh nội dung" />
    `;
    const sanitized = api.sanitizeHtml(richContent);
    assert.ok(sanitized.includes('<h2>Thông số mở rộng</h2>'));
    assert.ok(sanitized.includes('<strong>in đậm</strong>'));
    assert.ok(sanitized.includes('<ul><li>Mục 1</li><li>Mục 2</li></ul>'));
    assert.ok(sanitized.includes('<table>') || sanitized.includes('<table class="specs-table">'));
    assert.ok(sanitized.includes('colspan="2"'));
    assert.ok(sanitized.includes('<hr />'));
    assert.ok(sanitized.includes('alt="Ảnh nội dung"'));
  });

  console.log(`\n========================================`);
  console.log(`R03B V2 Completion Suite: ${passed}/${passed} PASS`);
  console.log(`========================================\n`);
} finally {
  await mf.dispose();
}
