import assert from 'node:assert/strict';
import { build } from 'esbuild';

const TEST_ADMIN_TOKEN = 'test-token-citilap-admin-secret-at-least-32-chars-long';
process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;

// Bundle legacy routes with mocked next/server and auth
const bundle = await build({
  stdin: {
    contents: `
      export { createAdminSession } from './src/lib/auth';
      export { POST as postProduct, GET as getProducts } from './src/app/api/products/route';
      export { PATCH as patchProduct, DELETE as deleteProduct, GET as getProductDetail } from './src/app/api/products/[id]/route';
      export { PATCH as patchBulkMetadata } from './src/app/api/products/bulk-metadata/route';
      export { PATCH as patchMetadata, GET as getMetadata } from './src/app/api/products/metadata/route';
      export { PATCH as patchVersion } from './src/app/api/products/[id]/versions/[versionId]/route';
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
      name: 'mock-prisma',
      setup(b) {
        b.onResolve({ filter: /@\/lib\/prisma/ }, (args) => ({
          path: args.path,
          namespace: 'mock-prisma-ns',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock-prisma-ns' }, () => ({
          contents: `
            export const prisma = {
              product: {
                findMany: async () => [{ id: 'p1', name: 'Test Product', price: 10000000 }],
                findUnique: async () => ({ id: 'p1', name: 'Test Product', price: 10000000, variants: [] }),
              },
            };
            export function createPrismaD1Client() {
              return prisma;
            }
          `,
        }));
      },
    },
    {
      name: 'mock-media-http',
      setup(b) {
        b.onResolve({ filter: /@\/server\/media-http/ }, (args) => ({
          path: args.path,
          namespace: 'mock-media-http-ns',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock-media-http-ns' }, () => ({
          contents: `
            export async function mediaEnvironment() {
              return { DB: {} };
            }
          `,
        }));
      },
    },
  ],
  write: false,
});

const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const adminSession = api.createAdminSession(TEST_ADMIN_TOKEN);
const authHeaders = {
  Cookie: `admin_session=${adminSession}`,
  Origin: 'http://localhost:3000',
  'Content-Type': 'application/json',
};

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

// 1. POST /api/products returns 409
await check('POST /api/products returns 409 Conflict with canonical guidance', async () => {
  const req = new Request('http://localhost:3000/api/products', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Old Product' }),
  });
  const res = await api.postProduct(req);
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'LEGACY_WRITER_DISABLED');
  assert.ok(data.error.includes('/admin/products'));
});

// 2. PATCH /api/products/:id returns 409
await check('PATCH /api/products/:id returns 409 Conflict', async () => {
  const req = new Request('http://localhost:3000/api/products/p1', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ price: 20000000 }),
  });
  const res = await api.patchProduct(req, { params: Promise.resolve({ id: 'p1' }) });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'LEGACY_WRITER_DISABLED');
});

// 3. DELETE /api/products/:id returns 409
await check('DELETE /api/products/:id returns 409 Conflict', async () => {
  const req = new Request('http://localhost:3000/api/products/p1', {
    method: 'DELETE',
    headers: authHeaders,
  });
  const res = await api.deleteProduct(req, { params: Promise.resolve({ id: 'p1' }) });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'LEGACY_WRITER_DISABLED');
});

// 4. PATCH /api/products/bulk-metadata returns 409
await check('PATCH /api/products/bulk-metadata returns 409 Conflict', async () => {
  const req = new Request('http://localhost:3000/api/products/bulk-metadata', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ ids: ['p1'] }),
  });
  const res = await api.patchBulkMetadata(req);
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'LEGACY_WRITER_DISABLED');
});

// 5. PATCH /api/products/metadata returns 409
await check('PATCH /api/products/metadata returns 409 Conflict', async () => {
  const req = new Request('http://localhost:3000/api/products/metadata', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ rows: [] }),
  });
  const res = await api.patchMetadata(req);
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'LEGACY_WRITER_DISABLED');
});

// 6. PATCH /api/products/:id/versions/:vId returns 409
await check('PATCH /api/products/:id/versions/:vId returns 409 Conflict', async () => {
  const req = new Request('http://localhost:3000/api/products/p1/versions/v1', {
    method: 'PATCH',
    headers: authHeaders,
  });
  const res = await api.patchVersion(req, { params: Promise.resolve({ id: 'p1', versionId: 'v1' }) });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, 'LEGACY_WRITER_DISABLED');
});

// 7. GET /api/products remains functional for Storefront search
await check('GET /api/products remains 200 OK for Storefront consumer', async () => {
  const req = new Request('http://localhost:3000/api/products?search=test');
  const res = await api.getProducts(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
});

// 8. Auth check: unauthenticated POST /api/products returns 401, not 409
await check('Unauthenticated POST /api/products checks auth first (401)', async () => {
  const req = new Request('http://localhost:3000/api/products', {
    method: 'POST',
    body: JSON.stringify({ name: 'Hacker' }),
  });
  const res = await api.postProduct(req);
  assert.equal(res.status, 401);
});

console.log(`\n========================================`);
console.log(`Legacy Writer 409 Locks: ${passed}/${passed} PASS`);
console.log(`========================================\n`);
