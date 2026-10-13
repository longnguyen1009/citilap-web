import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const TEST_ADMIN_TOKEN = 'test-token-citilap-admin-secret-at-least-32-chars-long';
process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;

// Build bundle containing route handlers and mocking next/server & cloudflare:workers
const bundle = await build({
  stdin: {
    contents: `
      export { createAdminSession } from './src/lib/auth';
      export { GET as adminGet, POST as adminPost } from './src/app/api/admin/settings/route';
      export { GET as publicGet } from './src/app/api/settings/route';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [
    {
      name: 'mock-next-server',
      setup(b) {
        b.onResolve({ filter: /^next\/server$/ }, (args) => ({
          path: args.path,
          namespace: 'mock-next-ns',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock-next-ns' }, () => ({
          contents: `
            export class NextResponse extends Response {
              static json(data, init) {
                return Response.json(data, init);
              }
            }
          `,
        }));
      },
    },
    {
      name: 'mock-cf-workers',
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, (args) => ({
          path: args.path,
          namespace: 'mock-cf-ns',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock-cf-ns' }, () => ({
          contents: `
            export const env = globalThis.__TEST_WORKERS_ENV;
          `,
        }));
      },
    },
  ],
  write: false,
});

const api = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("route-test"); } }',
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

  // Inject Miniflare env for mediaEnvironment() in route handlers
  globalThis.__TEST_WORKERS_ENV = { DB, PRODUCT_MEDIA };

  // Apply migrations 0001 to 0012
  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    for (const stmt of unstable_splitSqlQuery(sql)) {
      await DB.prepare(stmt).run();
    }
  }

  const adminSessionCookie = `admin_session=${api.createAdminSession(TEST_ADMIN_TOKEN)}`;

  // TEST 1: GET /api/admin/settings without auth returns 401
  await check('Route: GET /api/admin/settings without auth returns 401', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings');
    const res = await api.adminGet(req);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
  });

  // TEST 2: POST /api/admin/settings without auth returns 401
  await check('Route: POST /api/admin/settings without auth returns 401', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 0, document: {} }),
    });
    const res = await api.adminPost(req);
    assert.equal(res.status, 401);
  });

  // TEST 3: POST /api/admin/settings with cookie session but cross-origin Origin returns 403
  await check('Route: POST with valid session but cross-origin Origin returns 403 CSRF rejected', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: adminSessionCookie,
        origin: 'https://attacker.evil.com',
      },
      body: JSON.stringify({ expectedRevision: 0, document: {} }),
    });
    const res = await api.adminPost(req);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.ok(json.error.includes('CSRF'));
  });

  // TEST 4: POST with valid session and same-origin but malformed/XSS payload returns 400
  await check('Route: POST with malformed/XSS payload returns 400 Bad Request', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: adminSessionCookie,
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        expectedRevision: 0,
        document: {
          storeName: 'Test <script>alert(1)</script>', // XSS
          freeShippingThreshold: -100, // Negative number
        },
      }),
    });
    const res = await api.adminPost(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
  });

  // TEST 5: Authenticated GET /api/admin/settings returns initial revision 0 and defaults
  let currentDoc;
  await check('Route: GET /api/admin/settings returns revision 0 and confirmed defaults', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      headers: { cookie: adminSessionCookie },
    });
    const res = await api.adminGet(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.revision, 0);
    assert.equal(json.data.document.storeName, 'CitiLap');
    currentDoc = json.data.document;
  });

  // TEST 6: Authenticated POST saves valid document to D1 and returns revision 1
  await check('Route: POST valid payload persists to D1 and returns revision 1', async () => {
    const docToSave = {
      ...currentDoc,
      storeName: 'CitiLap Real Route Handler Test',
      shippingFee: 32000,
    };
    const req = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: adminSessionCookie,
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        expectedRevision: 0,
        document: docToSave,
      }),
    });
    const res = await api.adminPost(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.revision, 1);
    assert.equal(json.data.document.storeName, 'CitiLap Real Route Handler Test');
  });

  // TEST 7: Authenticated GET reads back revision 1 from D1
  await check('Route: GET reads back updated revision 1 from D1', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      headers: { cookie: adminSessionCookie },
    });
    const res = await api.adminGet(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.revision, 1);
    assert.equal(json.data.document.storeName, 'CitiLap Real Route Handler Test');
    assert.equal(json.data.document.shippingFee, 32000);
  });

  // TEST 8: POST with stale revision 0 returns 409 Conflict without modifying D1
  await check('Route: POST with stale revision 0 returns 409 Conflict', async () => {
    const req = new Request('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: adminSessionCookie,
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        expectedRevision: 0, // Stale! DB is at revision 1
        document: {
          ...currentDoc,
          storeName: 'Should Conflict',
        },
      }),
    });
    const res = await api.adminPost(req);
    assert.equal(res.status, 409);
    const json = await res.json();
    assert.ok(json.error.includes('Xung đột phiên bản'));

    // Verify D1 state is untouched
    const row = await DB.prepare("SELECT revision, document FROM SiteSettings WHERE id='site'").first();
    assert.equal(row.revision, 1);
    assert.ok(row.document.includes('CitiLap Real Route Handler Test'));
  });

  // TEST 9: Public GET /api/settings requires no auth and returns ONLY public DTO
  await check('Route: GET /api/settings returns public DTO without requiring session', async () => {
    const res = await api.publicGet();
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.storeName, 'CitiLap Real Route Handler Test');
    assert.equal(json.data.shippingFee, 32000);
    assert.equal('revision' in json.data, false);
    assert.equal('expectedRevision' in json.data, false);
  });

  console.log(`Settings Route Handlers (HTTP): ${passed}/${passed} PASS`);
} finally {
  await mf.dispose();
}
