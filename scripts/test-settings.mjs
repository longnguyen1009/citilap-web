import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

// Bundle settings service and contracts
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/settings.service';
      export * from './src/contracts/cms/settings';
      export * from './src/lib/auth';
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
    script: 'export default { fetch() { return new Response("settings-test"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
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

  // Run all migrations including 0012_site_settings.sql
  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    for (const stmt of unstable_splitSqlQuery(sql)) {
      await DB.prepare(stmt).run();
    }
  }

  // TEST 1: Initial read without record returns revision 0 and confirmed defaults
  await check('initial read returns revision 0 and defaults without DB mutation', async () => {
    const res = await api.getAdminSettings(DB);
    assert.equal(res.revision, 0);
    assert.equal(res.document.storeName, 'CitiLap');
    assert.equal(res.document.bankAccountInfo, '');
    const count = await DB.prepare("SELECT COUNT(*) as c FROM SiteSettings").first();
    assert.equal(count.c, 0);
  });

  // TEST 2: Validation rejects XSS, malicious protocols and negative numbers
  await check('validation rejects XSS payloads and malicious URLs', async () => {
    const invalidInputs = [
      { storeName: 'CitiLap <script>alert(1)</script>' },
      { zaloUrl: 'javascript:alert(1)' },
      { heroBgImage: 'data:text/html;base64,PHNjcmlwdD4=' },
      { freeShippingThreshold: -5000 },
      { shippingFee: -100 },
      { storeEmail: 'invalid-email' },
    ];

    for (const patch of invalidInputs) {
      assert.throws(
        () => api.settingsMutationSchema.parse({
          expectedRevision: 0,
          document: { ...api.DEFAULT_ADMIN_SETTINGS, ...patch },
        })
      );
    }
  });

  // TEST 3: First save with expectedRevision 0 creates revision 1 atomically
  let savedDoc;
  await check('first mutation with expectedRevision 0 creates revision 1 atomically', async () => {
    const input = {
      expectedRevision: 0,
      document: {
        ...api.DEFAULT_ADMIN_SETTINGS,
        storeName: 'CitiLap Store Official',
        shippingFee: 35000,
        freeShippingThreshold: 6000000,
      },
    };
    const res = await api.saveAdminSettings(DB, input, 'admin-tester');
    assert.equal(res.revision, 1);
    assert.equal(res.document.storeName, 'CitiLap Store Official');
    savedDoc = res.document;

    // Verify D1 records
    const row = await DB.prepare("SELECT * FROM SiteSettings WHERE id='site'").first();
    assert.equal(row.revision, 1);
    const revRow = await DB.prepare("SELECT * FROM SiteSettingsRevision WHERE revision=1").first();
    assert.equal(revRow.actor, 'admin-tester');
    assert.equal(revRow.action, 'save');
  });

  // TEST 4: Read returns saved settings and matches D1 persisted state
  await check('getAdminSettings returns persisted D1 state after reload', async () => {
    const res = await api.getAdminSettings(DB);
    assert.equal(res.revision, 1);
    assert.equal(res.document.storeName, 'CitiLap Store Official');
    assert.equal(res.document.shippingFee, 35000);
  });

  // TEST 5: Stale revision is rejected with 409 without changing DB
  await check('stale expectedRevision rejected with 409 without mutating D1', async () => {
    await assert.rejects(
      () =>
        api.saveAdminSettings(DB, {
          expectedRevision: 0, // stale, DB is at revision 1
          document: { ...savedDoc, storeName: 'Overwritten Name' },
        }),
      (err) => err.status === 409
    );

    const current = await api.getAdminSettings(DB);
    assert.equal(current.revision, 1);
    assert.equal(current.document.storeName, 'CitiLap Store Official');
  });

  // TEST 6: Concurrent mutations with same expectedRevision have exactly one winner
  await check('concurrent mutations have exactly one winner and one 409 conflict', async () => {
    const results = await Promise.allSettled([
      api.saveAdminSettings(DB, {
        expectedRevision: 1,
        document: { ...savedDoc, storeName: 'Winner A' },
      }, 'actor-a'),
      api.saveAdminSettings(DB, {
        expectedRevision: 1,
        document: { ...savedDoc, storeName: 'Winner B' },
      }, 'actor-b'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.status, 409);

    const current = await api.getAdminSettings(DB);
    assert.equal(current.revision, 2);
    // History table must only have exactly revisions 1 and 2
    const revs = await DB.prepare("SELECT revision FROM SiteSettingsRevision ORDER BY revision").all();
    assert.deepEqual(revs.results.map((r) => r.revision), [1, 2]);
  });

  // TEST 7: Public Storefront DTO only resolves public fields
  await check('public DTO resolver extracts valid storefront structure', async () => {
    const pub = await api.getPublicStorefrontSettings(DB);
    assert.ok(pub.storeName);
    assert.ok(pub.storeEmail);
    assert.ok(pub.heroTitle);
    assert.equal(typeof pub.freeShippingThreshold, 'number');
    assert.equal('revision' in pub, false);
    assert.equal('expectedRevision' in pub, false);
  });

  // TEST 8: Auth checks: requireAdmin rejects unauthenticated requests
  await check('auth guard: requireAdmin blocks unauthorized requests with 401', async () => {
    process.env.ADMIN_API_TOKEN = 'test-token-at-least-32-characters-long-12345';
    const noAuthReq = new Request('http://localhost:3000/api/admin/settings');
    const denied = api.requireAdmin(noAuthReq);
    assert.ok(denied);
    assert.equal(denied.status, 401);

    const wrongTokenReq = new Request('http://localhost:3000/api/admin/settings', {
      headers: { authorization: 'Bearer wrong-token-wrong-token-wrong-token-32' },
    });
    const deniedWrong = api.requireAdmin(wrongTokenReq);
    assert.ok(deniedWrong);
    assert.equal(deniedWrong.status, 401);

    const validReq = new Request('http://localhost:3000/api/admin/settings', {
      headers: { authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` },
    });
    const allowed = api.requireAdmin(validReq);
    assert.equal(allowed, null);
  });

  // TEST 9: CSRF protection: requireAdminMutation blocks cross-site mutations
  await check('CSRF guard: requireAdminMutation blocks cross-origin mutations with 403', async () => {
    process.env.ADMIN_API_TOKEN = 'test-token-at-least-32-characters-long-12345';
    const validSession = api.createAdminSession(process.env.ADMIN_API_TOKEN);

    // Cross-site request with cookie session
    const crossSiteReq = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        cookie: `admin_session=${validSession}`,
        origin: 'https://evil-attacker.com',
      },
    });
    const csrfDenied = api.requireAdminMutation(crossSiteReq);
    assert.ok(csrfDenied);
    assert.equal(csrfDenied.status, 403);

    // Same-origin request with cookie session
    const sameOriginReq = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        cookie: `admin_session=${validSession}`,
        origin: 'http://localhost:3000',
      },
    });
    const csrfAllowed = api.requireAdminMutation(sameOriginReq);
    assert.equal(csrfAllowed, null);
  });

  console.log(`Settings Service & Auth: ${passed}/${passed} PASS`);
} finally {
  await mf.dispose();
}
