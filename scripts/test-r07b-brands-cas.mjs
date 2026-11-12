import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readdir, readFile, unlink } from 'node:fs/promises';
import { unstable_splitSqlQuery } from 'wrangler';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

console.log('=== CITILAP ROUND 07B — BRANDS ATOMIC EDIT/ARCHIVE & CAS REGRESSION SUITE ===\n');

const BUNDLE_PATH = 'scripts/.r07b-brands-cas-bundle.mjs';

await build({
  stdin: {
    contents: `
      export { GET as listAdminBrandsRoute, POST as createAdminBrandRoute } from './src/app/api/admin/brands/route';
      export { GET as getAdminBrandRoute, PUT as updateAdminBrandRoute, DELETE as deleteAdminBrandRoute } from './src/app/api/admin/brands/[id]/route';
      export { loginAdmin } from './src/server/services/admin-identity.service';
      export { setD1Database } from './src/lib/prisma';
      export { listBrands, getBrandDetail, writeBrand, archiveBrand } from './src/server/services/brand.service';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
  external: ['cloudflare:workers', 'node:*', 'next/server', 'next/server.js'],
  plugins: [
    {
      name: 'wasm-and-next',
      setup(b) {
        b.onResolve({ filter: /\.wasm/ }, (a) => ({ path: a.path, external: true }));
        b.onResolve({ filter: /^next\/server$/ }, () => ({
          path: 'next/server.js',
          external: true,
        }));
        b.onResolve({ filter: /^server-only$/ }, (a) => ({
          path: a.path,
          namespace: 'so',
        }));
        b.onLoad({ filter: /.*/, namespace: 'so' }, () => ({ contents: '' }));
      },
    },
  ],
  outfile: BUNDLE_PATH,
});

const {
  listAdminBrandsRoute,
  createAdminBrandRoute,
  getAdminBrandRoute,
  updateAdminBrandRoute,
  deleteAdminBrandRoute,
  loginAdmin,
  setD1Database,
} = await import('./.r07b-brands-cas-bundle.mjs');

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("round07b-brands-test"); } }',
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

let passCount = 0;
let totalCount = 0;

async function test(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err);
    throw err;
  }
}

try {
  const db = await mf.getD1Database('DB');
  const r2 = await mf.getR2Bucket('PRODUCT_MEDIA');
  globalThis.env = { DB: db, PRODUCT_MEDIA: r2 };
  setD1Database(db);

  const migrationFiles = (await readdir('d1-migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of migrationFiles) {
    const sql = await readFile(`d1-migrations/${file}`, 'utf-8');
    for (const statement of unstable_splitSqlQuery(sql)) {
      if (statement.trim()) {
        await db.prepare(statement).run();
      }
    }
  }
  console.log(`Applied ${migrationFiles.length} D1 migrations to isolated Miniflare database.`);

  process.env.ADMIN_EMAIL = 'qa-brands-r07b@example.test';
  process.env.ADMIN_PASSWORD = 'TemporaryFixturePassword123!';
  process.env.ADMIN_SESSION_SECRET = 'test-admin-secret-32-chars-minimum-r07b!';

  const { token } = await loginAdmin(
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    db
  );
  assert.ok(token, 'loginAdmin fixture must return session token');
  const adminCookie = `admin_session=${token}`;

  function makeReq(urlPath, method, body, opts = {}) {
    const headers = {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.skipCookie ? {} : { cookie: adminCookie }),
      ...(method !== 'GET' && !opts.skipOrigin ? { origin: opts.origin ?? 'http://localhost' } : {}),
      ...(opts.headers || {}),
    };
    return new Request(`http://localhost${urlPath}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : typeof body === 'string'
          ? body
          : JSON.stringify(body),
    });
  }

  async function callList(query = '', opts = {}) {
    const res = await listAdminBrandsRoute(makeReq(`/api/admin/brands${query}`, 'GET', undefined, opts));
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function callCreate(body, opts = {}) {
    const res = await createAdminBrandRoute(makeReq('/api/admin/brands', 'POST', body, opts));
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function callGet(id, opts = {}) {
    const res = await getAdminBrandRoute(makeReq(`/api/admin/brands/${id}`, 'GET', undefined, opts), {
      params: Promise.resolve({ id }),
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function callUpdate(id, body, opts = {}) {
    const res = await updateAdminBrandRoute(makeReq(`/api/admin/brands/${id}`, 'PUT', body, opts), {
      params: Promise.resolve({ id }),
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function callDelete(id, body, opts = {}) {
    const query = opts.query ? `?${opts.query}` : '';
    const res = await deleteAdminBrandRoute(
      makeReq(`/api/admin/brands/${id}${query}`, 'DELETE', body, opts),
      { params: Promise.resolve({ id }) }
    );
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function auditCount(whereSql = '1=1', params = []) {
    const stmt = db.prepare(`SELECT count(*) AS cnt FROM AdminAudit WHERE ${whereSql}`);
    const row = await (params.length ? stmt.bind(...params) : stmt).first();
    return Number(row?.cnt ?? 0);
  }

  async function guardCount() {
    const row = await db.prepare('SELECT count(*) AS cnt FROM AdminMutationGuard').first();
    return Number(row?.cnt ?? 0);
  }

  // Seed base category and READY media assets
  await db
    .prepare(
      `INSERT INTO Category (id, name, slug, createdAt, updatedAt)
       VALUES ('cat-r07b', 'Laptops', 'laptops-r07b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run();

  const mediaAssets = [
    { id: '11111111-1111-4111-8111-111111111111', key: 'brand/logo-init.png', name: 'Logo Init' },
    { id: '22222222-2222-4222-8222-222222222222', key: 'brand/logo-w1.png', name: 'Logo Writer 1' },
    { id: '33333333-3333-4333-8333-333333333333', key: 'brand/logo-w2.png', name: 'Logo Writer 2' },
    { id: '44444444-4444-4444-8444-444444444444', key: 'brand/logo-arch.png', name: 'Logo Archive' },
    { id: '55555555-5555-4555-8555-555555555555', key: 'products/hist-rev.png', name: 'Historical Product Asset' },
  ];
  for (const a of mediaAssets) {
    await db
      .prepare(
        `INSERT INTO MediaAsset (id, kind, provider, storageKey, name, alt, mimeType, size, width, height, state)
         VALUES (?, 'IMAGE', 'R2', ?, ?, ?, 'image/png', 1024, 100, 100, 'READY')`
      )
      .bind(a.id, a.key, a.name, a.name)
      .run();
  }

  console.log('\n--- 1. Auth, CSRF, Malformed JSON (400) & Not Found (404) ---');

  await test('1.1 Admin auth and CSRF wrappers enforced on GET, POST, PUT, DELETE', async () => {
    assert.equal((await callList('', { skipCookie: true })).status, 401);
    assert.equal((await callGet('any-id', { skipCookie: true })).status, 401);
    assert.equal((await callCreate({ name: 'X', slug: 'x' }, { skipCookie: true })).status, 401);
    assert.equal(
      (await callUpdate('any-id', { name: 'X', slug: 'x', expectedUpdatedAt: 't' }, { skipCookie: true })).status,
      401
    );
    assert.equal((await callDelete('any-id', { expectedUpdatedAt: 't' }, { skipCookie: true })).status, 401);

    // CSRF checks (missing or evil Origin with valid session cookie)
    assert.equal((await callCreate({ name: 'X', slug: 'x' }, { skipOrigin: true })).status, 403);
    assert.equal(
      (await callCreate({ name: 'X', slug: 'x' }, { origin: 'https://attacker.example' })).status,
      403
    );
    assert.equal(
      (await callUpdate('any-id', { name: 'X', slug: 'x', expectedUpdatedAt: 't' }, { skipOrigin: true })).status,
      403
    );
    assert.equal((await callDelete('any-id', { expectedUpdatedAt: 't' }, { skipOrigin: true })).status, 403);
  });

  await test('1.2 Missing brand GET returns 404 (not generic 500/503)', async () => {
    const res = await callGet('brand-does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await test('1.3 Malformed or non-object JSON returns 400 across POST, PUT, DELETE (not 500/503)', async () => {
    for (const badBody of ['{malformed-json', '', 'null', '[]', '123', '"string"']) {
      const postRes = await callCreate(badBody);
      assert.equal(postRes.status, 400, `POST must return 400 for body=${badBody}`);

      const putRes = await callUpdate('brand-any', badBody);
      assert.equal(putRes.status, 400, `PUT must return 400 for body=${badBody}`);
    }

    for (const badDeleteBody of ['{malformed-json', 'null', '[]', '123', '"string"']) {
      const delRes = await callDelete('brand-any', badDeleteBody);
      assert.equal(delRes.status, 400, `DELETE must return 400 for body=${badDeleteBody}`);
    }
  });

  console.log('\n--- 2. Missing vs Stale Token & Raw Token Preservation + Same-Second Saves ---');

  // Seed a brand with SQLite CURRENT_TIMESTAMP raw format ('YYYY-MM-DD HH:MM:SS')
  const rawLegacyTimestamp = '2026-11-12 02:30:00';
  await db
    .prepare(
      `INSERT INTO Brand (id, name, slug, logo, description, status, createdAt, updatedAt)
       VALUES ('brand-legacy-ts', 'Lenovo', 'lenovo', ?, 'Legacy seeded brand', 'ACTIVE', ?, ?)`
    )
    .bind(`/api/library/${mediaAssets[0].id}`, rawLegacyTimestamp, rawLegacyTimestamp)
    .run();
  await db
    .prepare(
      `INSERT INTO MediaUsage (id, assetId, ownerType, ownerId, slot)
       VALUES ('mu-legacy-init', ?, 'BRAND', 'brand-legacy-ts', 'logo')`
    )
    .bind(mediaAssets[0].id)
    .run();
  await db
    .prepare(
      `INSERT INTO Product (id, name, slug, description, brand, brandId, categoryId, price, stock, status, createdAt, updatedAt)
       VALUES ('prod-lenovo-1', 'ThinkPad X1 Carbon', 'thinkpad-x1-carbon', 'Desc', 'Lenovo', 'brand-legacy-ts', 'cat-r07b', 32000000, 5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run();

  await test('2.1 Missing or empty expectedUpdatedAt on edit and archive returns 400 with zero side effects', async () => {
    const auditsBefore = await auditCount();

    for (const invalidToken of [undefined, null, '', '   ', 123, {}, []]) {
      const putRes = await callUpdate('brand-legacy-ts', {
        name: 'LenovoTampered',
        slug: 'lenovo-tampered',
        status: 'ACTIVE',
        expectedUpdatedAt: invalidToken,
      });
      assert.equal(putRes.status, 400, `PUT must return 400 for expectedUpdatedAt=${JSON.stringify(invalidToken)}`);

      const delRes = await callDelete('brand-legacy-ts', {
        expectedUpdatedAt: invalidToken,
      });
      assert.equal(delRes.status, 400, `DELETE must return 400 for expectedUpdatedAt=${JSON.stringify(invalidToken)}`);
    }

    // Empty body on DELETE with no query/header also returns 400
    const emptyDelRes = await callDelete('brand-legacy-ts', undefined);
    assert.equal(emptyDelRes.status, 400);

    const brandAfter = await db.prepare('SELECT name, slug, updatedAt, deletedAt FROM Brand WHERE id = ?').bind('brand-legacy-ts').first();
    assert.equal(brandAfter.name, 'Lenovo');
    assert.equal(brandAfter.slug, 'lenovo');
    assert.equal(brandAfter.updatedAt, rawLegacyTimestamp);
    assert.equal(brandAfter.deletedAt, null);

    const prodAfter = await db.prepare('SELECT brand FROM Product WHERE id = ?').bind('prod-lenovo-1').first();
    assert.equal(prodAfter.brand, 'Lenovo');
    assert.equal(await auditCount(), auditsBefore);
  });

  await test('2.2 Stale expectedUpdatedAt on edit and archive returns 409 and rolls back guard without side effects', async () => {
    const auditsBefore = await auditCount();

    const stalePut = await callUpdate('brand-legacy-ts', {
      name: 'LenovoStale',
      slug: 'lenovo-stale',
      logo: `/api/library/${mediaAssets[1].id}`,
      status: 'INACTIVE',
      expectedUpdatedAt: '2026-11-12 02:29:59',
    });
    assert.equal(stalePut.status, 409);

    const staleDel = await callDelete('brand-legacy-ts', {
      expectedUpdatedAt: '2026-11-12 02:29:59',
    });
    assert.equal(staleDel.status, 409);

    // Non-existent brand ID with valid-looking token also rolls back via AdminMutationGuard and returns 409
    const missingPut = await callUpdate('brand-missing-id', {
      name: 'GhostBrand',
      slug: 'ghost-brand',
      status: 'ACTIVE',
      expectedUpdatedAt: rawLegacyTimestamp,
    });
    assert.equal(missingPut.status, 409);

    const missingDel = await callDelete('brand-missing-id', {
      expectedUpdatedAt: rawLegacyTimestamp,
    });
    assert.equal(missingDel.status, 409);

    const brandRow = await db.prepare('SELECT name, slug, status, updatedAt, deletedAt FROM Brand WHERE id = ?').bind('brand-legacy-ts').first();
    assert.equal(brandRow.name, 'Lenovo');
    assert.equal(brandRow.status, 'ACTIVE');
    assert.equal(brandRow.updatedAt, rawLegacyTimestamp);
    assert.equal(brandRow.deletedAt, null);

    const prodRow = await db.prepare('SELECT brand FROM Product WHERE id = ?').bind('prod-lenovo-1').first();
    assert.equal(prodRow.brand, 'Lenovo');

    const usageRow = await db
      .prepare("SELECT assetId FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = 'brand-legacy-ts'")
      .all();
    assert.equal(usageRow.results.length, 1);
    assert.equal(usageRow.results[0].assetId, mediaAssets[0].id);

    assert.equal(await auditCount(), auditsBefore);
    assert.equal(await guardCount(), 0);
  });

  await test('2.3 Exact raw updatedAt token is preserved on GET/list and same-second successive writes strictly advance token at ms precision', async () => {
    const getBefore = await callGet('brand-legacy-ts');
    assert.equal(getBefore.status, 200);
    assert.equal(getBefore.body.data.updatedAt, rawLegacyTimestamp, 'Must preserve exact raw SQLite updatedAt string');

    const listBefore = await callList();
    assert.equal(listBefore.status, 200);
    const listed = listBefore.body.data.items.find((b) => b.id === 'brand-legacy-ts');
    assert.equal(listed.updatedAt, rawLegacyTimestamp);

    // Pin Date.now to a fixed millisecond within the same second to prove same-second / same-ms strict advancement
    const realDateNow = Date.now;
    const pinnedMs = Date.parse('2026-11-12T02:30:00.000Z');
    Date.now = () => pinnedMs;
    try {
      // Write 1 using raw SQLite token '2026-11-12 02:30:00'
      const w1 = await callUpdate('brand-legacy-ts', {
        name: 'Lenovo V1',
        slug: 'lenovo',
        logo: `/api/library/${mediaAssets[0].id}`,
        description: 'Step 1',
        status: 'ACTIVE',
        expectedUpdatedAt: rawLegacyTimestamp,
      });
      assert.equal(w1.status, 200);
      const t1 = w1.body.data.updatedAt;
      assert.notEqual(t1, rawLegacyTimestamp);
      assert.ok(Date.parse(t1) > pinnedMs, `t1 (${t1}) must be strictly greater than prior timestamp`);

      // Write 2 in the exact same millisecond using t1
      const w2 = await callUpdate('brand-legacy-ts', {
        name: 'Lenovo V2',
        slug: 'lenovo',
        logo: `/api/library/${mediaAssets[0].id}`,
        description: 'Step 2',
        status: 'ACTIVE',
        expectedUpdatedAt: t1,
      });
      assert.equal(w2.status, 200);
      const t2 = w2.body.data.updatedAt;
      assert.notEqual(t2, t1);
      assert.ok(Date.parse(t2) > Date.parse(t1), `t2 (${t2}) must be strictly greater than t1 (${t1})`);

      // Write 3 in the exact same millisecond using t2
      const w3 = await callUpdate('brand-legacy-ts', {
        name: 'Lenovo',
        slug: 'lenovo',
        logo: `/api/library/${mediaAssets[0].id}`,
        description: 'Step 3',
        status: 'ACTIVE',
        expectedUpdatedAt: t2,
      });
      assert.equal(w3.status, 200);
      const t3 = w3.body.data.updatedAt;
      assert.notEqual(t3, t2);
      assert.ok(Date.parse(t3) > Date.parse(t2), `t3 (${t3}) must be strictly greater than t2 (${t2})`);

      // Reusing t1 or t2 must now fail with 409
      const replayT1 = await callUpdate('brand-legacy-ts', {
        name: 'Lenovo Replay',
        slug: 'lenovo',
        status: 'ACTIVE',
        expectedUpdatedAt: t1,
      });
      assert.equal(replayT1.status, 409);
    } finally {
      Date.now = realDateNow;
    }
  });

  console.log('\n--- 3. Concurrent Edit CAS Race (Two Writers, Same Token) ---');

  await test('3.1 Two concurrent writers with the same expectedUpdatedAt: exactly one wins (200) and loser (409) changes no Brand, Product.brand, MediaUsage, or AdminAudit', async () => {
    const current = (await callGet('brand-legacy-ts')).body.data;
    const sharedToken = current.updatedAt;
    const auditsBefore = await auditCount("action = 'brand.update' AND entityId = 'brand-legacy-ts'");

    const payloadA = {
      name: 'Lenovo ThinkSystems A',
      slug: 'lenovo-thinksystems-a',
      logo: `/api/library/${mediaAssets[1].id}`,
      description: 'Winner candidate A',
      seoTitle: 'SEO A',
      seoDescription: 'SEO Desc A',
      status: 'ACTIVE',
      expectedUpdatedAt: sharedToken,
    };

    const payloadB = {
      name: 'Lenovo Legion B',
      slug: 'lenovo-legion-b',
      logo: `/api/library/${mediaAssets[2].id}`,
      description: 'Winner candidate B',
      seoTitle: 'SEO B',
      seoDescription: 'SEO Desc B',
      status: 'INACTIVE',
      expectedUpdatedAt: sharedToken,
    };

    const [resA, resB] = await Promise.all([
      callUpdate('brand-legacy-ts', payloadA),
      callUpdate('brand-legacy-ts', payloadB),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 409], `Expected [200, 409], got ${statuses.join(', ')}`);

    const winnerPayload = resA.status === 200 ? payloadA : payloadB;
    const winnerAssetId = resA.status === 200 ? mediaAssets[1].id : mediaAssets[2].id;

    // 1. Verify Brand row matches winner 100%
    const brandAfter = await db
      .prepare('SELECT name, slug, logo, description, seoTitle, seoDescription, status, updatedAt FROM Brand WHERE id = ?')
      .bind('brand-legacy-ts')
      .first();
    assert.equal(brandAfter.name, winnerPayload.name);
    assert.equal(brandAfter.slug, winnerPayload.slug);
    assert.equal(brandAfter.logo, winnerPayload.logo);
    assert.equal(brandAfter.description, winnerPayload.description);
    assert.equal(brandAfter.seoTitle, winnerPayload.seoTitle);
    assert.equal(brandAfter.seoDescription, winnerPayload.seoDescription);
    assert.equal(brandAfter.status, winnerPayload.status);
    assert.notEqual(brandAfter.updatedAt, sharedToken);

    // 2. Verify Product.brand matches winner's name (not overwritten by loser)
    const prodAfter = await db.prepare('SELECT brand FROM Product WHERE id = ?').bind('prod-lenovo-1').first();
    assert.equal(prodAfter.brand, winnerPayload.name);

    // 3. Verify MediaUsage has ONLY winner's asset
    const usages = await db
      .prepare("SELECT assetId, slot FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = 'brand-legacy-ts'")
      .all();
    assert.equal(usages.results.length, 1);
    assert.equal(usages.results[0].assetId, winnerAssetId);
    assert.equal(usages.results[0].slot, 'logo');

    // 4. Verify AdminAudit recorded exactly 1 brand.update event
    const auditsAfter = await auditCount("action = 'brand.update' AND entityId = 'brand-legacy-ts'");
    assert.equal(auditsAfter, auditsBefore + 1);
    assert.equal(await guardCount(), 0);
  });

  console.log('\n--- 4. Update-vs-Archive Race & Archive Audit EntityType ---');

  await test('4.1 Concurrent update vs archive with same token: one wins (200), one gets 409; archive audit has entityType="brand"', async () => {
    // Create brand-race-1 with logo
    const createdRes = await callCreate({
      name: 'Razer',
      slug: 'razer',
      logo: `/api/library/${mediaAssets[3].id}`,
      description: 'Razer Gaming',
      status: 'ACTIVE',
    });
    assert.equal(createdRes.status, 200);
    const brandRace1 = createdRes.body.data;
    const token0 = brandRace1.updatedAt;

    const auditsBefore = await auditCount('entityId = ?', [brandRace1.id]);

    const [updateRes, deleteRes] = await Promise.all([
      callUpdate(brandRace1.id, {
        name: 'Razer Updated',
        slug: 'razer-updated',
        logo: `/api/library/${mediaAssets[1].id}`,
        status: 'ACTIVE',
        expectedUpdatedAt: token0,
      }),
      callDelete(brandRace1.id, {
        expectedUpdatedAt: token0,
      }),
    ]);

    const statuses = [updateRes.status, deleteRes.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 409], `Expected [200, 409], got ${statuses.join(', ')}`);

    const auditsAfter = await auditCount('entityId = ?', [brandRace1.id]);
    assert.equal(auditsAfter, auditsBefore + 1, 'Only winning mutation may write AdminAudit');

    const brandRow = await db
      .prepare('SELECT name, slug, status, deletedAt, updatedAt FROM Brand WHERE id = ?')
      .bind(brandRace1.id)
      .first();
    const usages = await db
      .prepare("SELECT assetId FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = ?")
      .bind(brandRace1.id)
      .all();

    if (deleteRes.status === 200) {
      assert.ok(brandRow.deletedAt, 'Archive winner must set deletedAt');
      assert.equal(brandRow.status, 'INACTIVE');
      assert.equal(usages.results.length, 0, 'Archive winner must delete BRAND MediaUsage');
      const archiveAudit = await db
        .prepare("SELECT action, entityType FROM AdminAudit WHERE entityId = ? AND action = 'brand.archive'")
        .bind(brandRace1.id)
        .first();
      assert.ok(archiveAudit);
      assert.equal(archiveAudit.entityType, 'brand');
    } else {
      assert.equal(brandRow.deletedAt, null, 'Update winner must keep deletedAt NULL');
      assert.equal(brandRow.name, 'Razer Updated');
      assert.equal(usages.results.length, 1);
      assert.equal(usages.results[0].assetId, mediaAssets[1].id);
    }
  });

  await test('4.2 Deterministic update-then-stale-archive and archive-then-stale-update both reject loser with 409 and zero side effects', async () => {
    // Subcase A: Update wins, then Archive with stale token fails with 409
    const c1 = (
      await callCreate({
        name: 'MSI',
        slug: 'msi',
        logo: `/api/library/${mediaAssets[3].id}`,
        status: 'ACTIVE',
      })
    ).body.data;

    const u1 = await callUpdate(c1.id, {
      name: 'MSI Gaming',
      slug: 'msi-gaming',
      logo: `/api/library/${mediaAssets[3].id}`,
      status: 'ACTIVE',
      expectedUpdatedAt: c1.updatedAt,
    });
    assert.equal(u1.status, 200);

    const auditsBeforeStaleArchive = await auditCount('entityId = ?', [c1.id]);
    const staleArchive = await callDelete(c1.id, { expectedUpdatedAt: c1.updatedAt });
    assert.equal(staleArchive.status, 409);

    const c1Row = await db.prepare('SELECT name, deletedAt FROM Brand WHERE id = ?').bind(c1.id).first();
    assert.equal(c1Row.name, 'MSI Gaming');
    assert.equal(c1Row.deletedAt, null);
    const c1Usage = await db
      .prepare("SELECT count(*) AS cnt FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = ?")
      .bind(c1.id)
      .first();
    assert.equal(c1Usage.cnt, 1, 'Stale archive must not delete MediaUsage');
    assert.equal(await auditCount('entityId = ?', [c1.id]), auditsBeforeStaleArchive);

    // Subcase B: Archive wins with fresh token, then stale Update fails with 409
    const freshArchive = await callDelete(c1.id, { expectedUpdatedAt: u1.body.data.updatedAt });
    assert.equal(freshArchive.status, 200);

    const archiveAudit = await db
      .prepare("SELECT action, entityType FROM AdminAudit WHERE entityId = ? AND action = 'brand.archive'")
      .bind(c1.id)
      .first();
    assert.ok(archiveAudit);
    assert.equal(archiveAudit.entityType, 'brand');

    const auditsBeforeStaleUpdate = await auditCount('entityId = ?', [c1.id]);
    const staleUpdateAfterArchive = await callUpdate(c1.id, {
      name: 'MSI Resurrected',
      slug: 'msi-resurrected',
      logo: `/api/library/${mediaAssets[1].id}`,
      status: 'ACTIVE',
      expectedUpdatedAt: u1.body.data.updatedAt,
    });
    assert.equal(staleUpdateAfterArchive.status, 409);

    const c1After = await db.prepare('SELECT name, deletedAt FROM Brand WHERE id = ?').bind(c1.id).first();
    assert.equal(c1After.name, 'MSI Gaming');
    assert.ok(c1After.deletedAt, 'Archived brand must remain archived');
    const c1UsageAfter = await db
      .prepare("SELECT count(*) AS cnt FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = ?")
      .bind(c1.id)
      .first();
    assert.equal(c1UsageAfter.cnt, 0, 'Stale update on archived brand must not re-insert MediaUsage');
    assert.equal(await auditCount('entityId = ?', [c1.id]), auditsBeforeStaleUpdate);
  });

  console.log('\n--- 5. Product-Link Archive Rollback & MediaUsage / Historical Retention ---');

  await test('5.1 Newly-linked active product rolls back archive batch (409), preserving Brand, BRAND MediaUsage, and zero archive audit; unlinking allows archive and cleans up BRAND MediaUsage while keeping historical PRODUCT_REVISION usage', async () => {
    const created = (
      await callCreate({
        name: 'HP',
        slug: 'hp',
        logo: `/api/library/${mediaAssets[3].id}`,
        status: 'ACTIVE',
      })
    ).body.data;

    // Seed historical PRODUCT_REVISION MediaUsage to verify historical retention is untouched
    await db
      .prepare(
        `INSERT INTO MediaUsage (id, assetId, ownerType, ownerId, slot)
         VALUES ('mu-hist-prod-rev-1', ?, 'PRODUCT_REVISION', 'prod-lenovo-1', '1:gallery')`
      )
      .bind(mediaAssets[4].id)
      .run();

    // Link a newly created active Product to HP after admin captured created.updatedAt
    await db
      .prepare(
        `INSERT INTO Product (id, name, slug, description, brand, brandId, categoryId, price, stock, status, createdAt, updatedAt)
         VALUES ('prod-hp-1', 'HP EliteBook 840', 'hp-elitebook-840', 'Desc', 'HP', ?, 'cat-r07b', 22000000, 3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(created.id)
      .run();

    const auditsBefore = await auditCount('entityId = ?', [created.id]);

    const blockedArchive = await callDelete(created.id, {
      expectedUpdatedAt: created.updatedAt,
    });
    assert.equal(blockedArchive.status, 409);
    assert.ok(
      blockedArchive.body.error?.includes('sản phẩm liên kết'),
      `Expected linked product error message, got: ${blockedArchive.body.error}`
    );

    // Verify atomic rollback: Brand untouched, MediaUsage still exists, no AdminAudit written
    const hpRow = await db
      .prepare('SELECT status, updatedAt, deletedAt FROM Brand WHERE id = ?')
      .bind(created.id)
      .first();
    assert.equal(hpRow.status, 'ACTIVE');
    assert.equal(hpRow.updatedAt, created.updatedAt);
    assert.equal(hpRow.deletedAt, null);

    const hpUsage = await db
      .prepare("SELECT assetId FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = ?")
      .bind(created.id)
      .all();
    assert.equal(hpUsage.results.length, 1, 'Rollback must preserve BRAND MediaUsage');
    assert.equal(hpUsage.results[0].assetId, mediaAssets[3].id);

    assert.equal(await auditCount('entityId = ?', [created.id]), auditsBefore);
    assert.equal(await guardCount(), 0);

    // Soft-delete the linked product, then archive HP with the captured token
    await db.prepare('UPDATE Product SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?').bind('prod-hp-1').run();

    const okArchive = await callDelete(created.id, {
      expectedUpdatedAt: created.updatedAt,
    });
    assert.equal(okArchive.status, 200);
    assert.equal(okArchive.body.data.archived, true);

    const hpArchived = await db
      .prepare('SELECT status, updatedAt, deletedAt FROM Brand WHERE id = ?')
      .bind(created.id)
      .first();
    assert.equal(hpArchived.status, 'INACTIVE');
    assert.ok(hpArchived.deletedAt);
    assert.notEqual(hpArchived.updatedAt, created.updatedAt);

    const hpUsageAfter = await db
      .prepare("SELECT count(*) AS cnt FROM MediaUsage WHERE ownerType = 'BRAND' AND ownerId = ?")
      .bind(created.id)
      .first();
    assert.equal(hpUsageAfter.cnt, 0, 'Successful archive must delete BRAND MediaUsage');

    // Historical PRODUCT_REVISION usage must remain intact
    const histUsage = await db
      .prepare("SELECT count(*) AS cnt FROM MediaUsage WHERE id = 'mu-hist-prod-rev-1'")
      .first();
    assert.equal(histUsage.cnt, 1, 'Historical PRODUCT_REVISION MediaUsage must be retained');
  });

  console.log('\n--- 6. Concurrent Duplicate Create & Slug/Name Validation/Uniqueness (409 / 400) ---');

  await test('6.1 Concurrent duplicate creates (identical and case-insensitive name/slug) return one 200 and one 409', async () => {
    const auditsBefore = await auditCount("action = 'brand.create'");

    const [c1, c2] = await Promise.all([
      callCreate({ name: 'Gigabyte', slug: 'gigabyte', status: 'ACTIVE' }),
      callCreate({ name: 'Gigabyte', slug: 'gigabyte', status: 'ACTIVE' }),
    ]);
    assert.deepEqual([c1.status, c2.status].sort((a, b) => a - b), [200, 409]);

    // Case-insensitive name collision with distinct slugs in concurrent create
    const [c3, c4] = await Promise.all([
      callCreate({ name: 'SteelSeries', slug: 'steelseries-one', status: 'ACTIVE' }),
      callCreate({ name: 'STEELSERIES', slug: 'steelseries-two', status: 'ACTIVE' }),
    ]);
    assert.deepEqual([c3.status, c4.status].sort((a, b) => a - b), [200, 409]);

    const auditsAfter = await auditCount("action = 'brand.create'");
    assert.equal(auditsAfter, auditsBefore + 2, 'Only winning creates may write AdminAudit');
  });

  await test('6.2 Updating a brand to collide with another brand name or slug returns 409; invalid slug format returns 400', async () => {
    const acer = (await callCreate({ name: 'Acer', slug: 'acer', status: 'ACTIVE' })).body.data;

    // Collide name (case-insensitive) with Gigabyte
    const nameCollision = await callUpdate(acer.id, {
      name: 'GIGABYTE',
      slug: 'acer',
      status: 'ACTIVE',
      expectedUpdatedAt: acer.updatedAt,
    });
    assert.equal(nameCollision.status, 409);

    // Collide slug with gigabyte
    const slugCollision = await callUpdate(acer.id, {
      name: 'Acer Official',
      slug: 'gigabyte',
      status: 'ACTIVE',
      expectedUpdatedAt: acer.updatedAt,
    });
    assert.equal(slugCollision.status, 409);

    // Invalid slug formats must return 400
    for (const badSlug of ['Acer-Predator', 'acer predator', '-acer', 'acer-', 'acer--predator', '']) {
      const badRes = await callUpdate(acer.id, {
        name: 'Acer',
        slug: badSlug,
        status: 'ACTIVE',
        expectedUpdatedAt: acer.updatedAt,
      });
      assert.equal(badRes.status, 400, `Slug "${badSlug}" must be rejected with 400`);
    }
  });

  console.log(`\n========================================`);
  console.log(`ROUND 07B BRANDS CAS SUITE: ${passCount}/${totalCount} PASSED`);
  console.log(`========================================\n`);
} finally {
  await mf.dispose();
  await unlink(BUNDLE_PATH).catch(() => undefined);
}
