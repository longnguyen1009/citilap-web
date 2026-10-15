import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

// Bundle the R05 CMS services, contracts, and media services into an in-memory ESM module
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/post.service';
      export * from './src/server/services/page.service';
      export * from './src/server/services/content-media.service';
      export * from './src/contracts/cms/post';
      export * from './src/contracts/cms/page';
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
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-10-01',
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

let passed = 0;
async function check(name, fn) {
  await fn();
  console.log('PASS', ++passed, name);
}

const notFound = (e) => e && (e.status === 404 || e.message?.includes('404'));
const badRequest = (e) => e && (e.status === 400 || e.message?.includes('400') || e.name === 'ZodError');
const conflict = (e) => e && (e.status === 409 || e.message?.includes('409'));

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  const env = { DB, PRODUCT_MEDIA };

  // 1. Run all migrations in order
  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    const statements = unstable_splitSqlQuery(sql);
    await DB.batch(statements.map((s) => DB.prepare(s)));
  }

  // Set up test assets & categories
  const imageId1 = 'img-full-1';
  const imageId2 = 'img-full-2';
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,state) VALUES(?,'IMAGE','R2','library/img1.png','Img 1','Alt 1','image/png','READY')").bind(imageId1).run();
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,state) VALUES(?,'IMAGE','R2','library/img2.png','Img 2','Alt 2','image/png','READY')").bind(imageId2).run();
  await PRODUCT_MEDIA.put('library/img1.png', 'binary-data-1');
  await PRODUCT_MEDIA.put('library/img2.png', 'binary-data-2');

  const catA = await api.writePostCategory(DB, null, { expectedRevision: 0, document: { name: 'Tech', slug: 'tech-news', sortOrder: 1, status: 'ACTIVE' } });
  const catB = await api.writePostCategory(DB, null, { expectedRevision: 0, document: { name: 'Reviews', slug: 'reviews', sortOrder: 2, status: 'ACTIVE' } });

  // Test: Reserved slug rejection
  await check('RESERVED_SLUGS are strictly rejected on write', async () => {
    for (const reserved of ['admin', 'api', 'news', 'category', 'cart', 'checkout', 'login']) {
      await assert.rejects(
        api.writePost(env, null, {
          expectedRevision: 0,
          action: 'save',
          document: { ...api.blankPost(), title: 'Test Reserved', slug: reserved },
        }),
        badRequest,
        `Expected slug '${reserved}' to be rejected as reserved`
      );
    }
  });

  // Test: Post creation, draft saving, and initial draft isolation
  let post1;
  await check('Post creation and draft isolation from public search and category list', async () => {
    post1 = await api.writePost(env, null, {
      expectedRevision: 0,
      action: 'save',
      document: {
        ...api.blankPost(),
        title: 'Review Asus ROG 2026',
        slug: 'review-asus-rog-2026',
        categoryId: catB.id,
        contentHtml: `<p>Awesome machine</p><img src="/api/library/${imageId1}">`,
      },
    });

    assert.equal(post1.revision, 1);
    assert.equal(post1.published, false);

    // Public detail cannot find draft
    await assert.rejects(api.publicPostBySlug(DB, 'review-asus-rog-2026'), notFound);

    // Public list returns 0
    const listRes = await api.publicPostList(DB, { categoryId: catB.id });
    assert.equal(listRes.total, 0);
    assert.equal(listRes.items.length, 0);

    // Admin post list sees draft
    const adminList = await api.postList(DB, { q: 'Asus' });
    assert.equal(adminList.total, 1);
    assert.equal(adminList.items[0].id, post1.id);
    assert.equal(adminList.items[0].isPublished, false);
    assert.equal(adminList.items[0].hasUnpublishedDraft, false); // No published record yet
  });

  // Test: First publication sets publishedRevision, publishedAt, publicUpdatedAt
  await check('Publishing creates public row, timestamps and media usages', async () => {
    post1 = await api.writePost(env, post1.id, {
      expectedRevision: 1,
      action: 'publish',
      document: {
        ...api.blankPost(),
        title: 'Review Asus ROG 2026 Official',
        slug: 'review-asus-rog-2026',
        categoryId: catB.id,
        isFeatured: true,
        coverImage: { assetId: imageId1, alt: 'Asus ROG Cover' },
        contentHtml: `<p>Awesome machine</p><img src="/api/library/${imageId2}">`,
      },
    });

    assert.equal(post1.revision, 2);
    assert.equal(post1.published, true);

    const pub = await api.publicPostBySlug(DB, 'review-asus-rog-2026');
    assert.equal(pub.title, 'Review Asus ROG 2026 Official');
    assert.ok(pub.publishedAt);
    assert.ok(pub.updatedAt);
    assert.equal(pub.isFeatured, true);
    assert.equal(pub.coverImage.url, `/api/library/${imageId1}`);

    // Check media usage records for cover and body
    const usages = await DB.prepare(
      "SELECT assetId, slot FROM MediaUsage WHERE ownerType='POST_REVISION' AND ownerId=?"
    ).bind(post1.id).all();
    assert.ok(usages.results.some((u) => u.assetId === imageId1 && u.slot === '2:img-full-1'));
    assert.ok(usages.results.some((u) => u.assetId === imageId2 && u.slot === '2:img-full-2'));
  });

  // Test: Slug transition alias and 301 alias lookup
  await check('Publishing new slug creates historical alias lookup for old slug', async () => {
    // Edit draft with new slug
    post1 = await api.writePost(env, post1.id, {
      expectedRevision: 2,
      action: 'save',
      document: {
        ...api.blankPost(),
        title: 'Review Asus ROG 2026 Updated',
        slug: 'review-asus-rog-2026-v2',
        categoryId: catB.id,
      },
    });

    // Public still sees old slug
    const oldPublic = await api.publicPostBySlug(DB, 'review-asus-rog-2026');
    assert.equal(oldPublic.slug, 'review-asus-rog-2026');

    // Now publish the new slug
    post1 = await api.writePost(env, post1.id, {
      expectedRevision: 3,
      action: 'publish',
      document: {
        ...api.blankPost(),
        title: 'Review Asus ROG 2026 Updated',
        slug: 'review-asus-rog-2026-v2',
        categoryId: catB.id,
        coverImage: { assetId: imageId1, alt: 'Cover' },
        contentHtml: '<p>Updated content</p>',
      },
    });

    // Public lookup by new slug succeeds
    const newPublic = await api.publicPostBySlug(DB, 'review-asus-rog-2026-v2');
    assert.equal(newPublic.slug, 'review-asus-rog-2026-v2');

    // Public lookup by OLD slug resolves to current post (caller can 301 redirect!)
    const aliasResolved = await api.publicPostBySlug(DB, 'review-asus-rog-2026');
    assert.equal(aliasResolved.id, post1.id);
    assert.equal(aliasResolved.slug, 'review-asus-rog-2026-v2');
  });

  // Test: Inactive category handling
  await check('Inactive category preserves existing drafts without error, protects deletion', async () => {
    // Set category B to INACTIVE
    await api.writePostCategory(DB, catB.id, {
      expectedRevision: 1,
      document: { name: 'Reviews', slug: 'reviews', sortOrder: 2, status: 'INACTIVE' },
    });

    // Editor can still save draft with inactive category
    const draftUpdate = await api.writePost(env, post1.id, {
      expectedRevision: 4,
      action: 'save',
      document: {
        ...api.blankPost(),
        title: 'Review Asus ROG Still Inactive Cat',
        slug: 'review-asus-rog-2026-v2',
        categoryId: catB.id,
      },
    });
    assert.equal(draftUpdate.revision, 5);

    // Deletion of category B is rejected because posts reference it
    await assert.rejects(api.deletePostCategory(DB, catB.id), badRequest);

    // Set back to ACTIVE for subsequent tests
    await api.writePostCategory(DB, catB.id, {
      expectedRevision: 2,
      document: { name: 'Reviews', slug: 'reviews', sortOrder: 2, status: 'ACTIVE' },
    });
  });

  // Test: Related products resolver
  await check('Related products preserves valid IDs and ignores inactive/deleted products', async () => {
    // Insert dummy product in Product table
    const prodCatId = 'prod-cat-1';
    await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES(?,'Laptop','laptop',CURRENT_TIMESTAMP)").bind(prodCatId).run();
    const prodActive = 'prod-active-1';
    const prodInactive = 'prod-inactive-2';
    await DB.prepare("INSERT INTO Product(id,name,slug,categoryId,price,condition,status,stock,description,updatedAt) VALUES(?,'Active Lap','active-lap',?,20000000,'NEW','ACTIVE',5,'Description',CURRENT_TIMESTAMP)").bind(prodActive, prodCatId).run();
    await DB.prepare("INSERT INTO Product(id,name,slug,categoryId,price,condition,status,stock,description,updatedAt) VALUES(?,'Inactive Lap','inactive-lap',?,15000000,'USED','INACTIVE',0,'Description',CURRENT_TIMESTAMP)").bind(prodInactive, prodCatId).run();

    post1 = await api.writePost(env, post1.id, {
      expectedRevision: 5,
      action: 'publish',
      document: {
        ...api.blankPost(),
        title: 'Review with Products',
        slug: 'review-asus-rog-2026-v2',
        categoryId: catB.id,
        coverImage: { assetId: imageId1, alt: 'Cover' },
        contentHtml: '<p>Products review content</p>',
        relatedProductIds: [prodActive, prodInactive, 'non-existent-prod'],
      },
    });

    const pubWithProds = await api.publicPostBySlug(DB, 'review-asus-rog-2026-v2');
    // Inactive and non-existent IDs are filtered out
    assert.deepEqual(pubWithProds.relatedProductIds, [prodActive]);
  });

  // Test: Static page draft isolation, policy slots, and concurrency
  let page1;
  await check('Static page policy slots enforce unique published slot and draft isolation', async () => {
    // Publish Warranty page
    page1 = await api.writePage(env, null, {
      expectedRevision: 0,
      action: 'publish',
      document: {
        ...api.blankPage(),
        title: 'Chính sách bảo hành',
        slug: 'chinh-sach-bao-hanh',
        pageType: 'WARRANTY',
        contentHtml: '<p>Bảo hành 12 tháng</p>',
      },
    });

    assert.equal(page1.published, true);
    assert.equal((await api.publicPageByType(DB, 'WARRANTY')).title, 'Chính sách bảo hành');

    // Another page cannot be published with same system pageType WARRANTY
    await assert.rejects(
      api.writePage(env, null, {
        expectedRevision: 0,
        action: 'publish',
        document: {
          ...api.blankPage(),
          title: 'Bảo hành thứ 2',
          slug: 'bao-hanh-2',
          pageType: 'WARRANTY',
          contentHtml: '<p>Second warranty</p>',
        },
      }),
      conflict
    );

    // But another page CAN save as DRAFT with WARRANTY without collision
    const page2Draft = await api.writePage(env, null, {
      expectedRevision: 0,
      action: 'save',
      document: {
        ...api.blankPage(),
        title: 'Bảo hành dự thảo',
        slug: 'bao-hanh-du-thao',
        pageType: 'WARRANTY',
      },
    });
    assert.equal(page2Draft.published, false);

    // Public WARRANTY lookup still resolves original page1
    assert.equal((await api.publicPageByType(DB, 'WARRANTY')).id, page1.id);
  });

  // Test: Unpublish concurrency guard and clean public removal
  await check('Unpublish cleans public lookup, retains history, and prevents concurrent stale unpublish', async () => {
    // Unpublishing with stale revision fails
    await assert.rejects(api.archivePost(env, post1.id, 5), conflict);

    // Unpublishing with correct revision 6 succeeds
    await api.archivePost(env, post1.id, 6);

    // Public lookup now throws 404
    await assert.rejects(api.publicPostBySlug(DB, 'review-asus-rog-2026-v2'), notFound);

    // History contains 'unpublish' action
    const revs = await api.listPostRevisions(DB, post1.id);
    assert.equal(revs.revisions[0].action, 'unpublish');
  });

  // Test: Restore appends new revision as draft and does not alter public
  await check('Restore past revision creates new draft revision without publishing', async () => {
    await api.restorePostRevision(env, post1.id, 2, 7);
    const detail = await api.postDetail(DB, post1.id);
    assert.equal(detail.revision, 8);
    assert.equal(detail.published, false);

    // Public is still unpublished
    await assert.rejects(api.publicPostBySlug(DB, 'review-asus-rog-2026-v2'), notFound);
  });

  // Test: Foreign key integrity check
  await check('Foreign key integrity verified across all R05 tables', async () => {
    const fkErrors = await DB.prepare('PRAGMA foreign_key_check').all();
    assert.deepEqual(fkErrors.results, []);
  });

  console.log(`\n========================================`);
  console.log(`ALL R05 FULL INTEGRATION TESTS PASSED: ${passed}/${passed}`);
  console.log(`========================================\n`);
} catch (err) {
  console.error('\nTEST FAILED:', err);
  process.exitCode = 1;
} finally {
  await mf.dispose();
}
