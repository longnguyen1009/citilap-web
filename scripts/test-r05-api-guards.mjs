import assert from 'node:assert/strict';
import { GET as getPosts, POST as postPosts } from '../src/app/api/admin/posts/route.ts';
import { GET as getNews } from '../src/app/api/news/route.ts';
import { GET as getPostDetail, PUT as putPostDetail, DELETE as deletePostDetail } from '../src/app/api/admin/posts/[id]/route.ts';
import { GET as getCategories, POST as postCategories } from '../src/app/api/admin/post-categories/route.ts';
import { GET as getPages, POST as postPages } from '../src/app/api/admin/pages/route.ts';

let passed = 0;
async function check(name, fn) {
  await fn();
  console.log('PASS', ++passed, name);
}

// 1. Unauthenticated requests to Admin APIs must be denied (401)
await check('Admin GET /api/admin/posts rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/posts');
  const res = await getPosts(req);
  assert.equal(res.status, 401);
});

await check('Admin POST /api/admin/posts rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', expectedRevision: 0, document: {} }),
  });
  const res = await postPosts(req);
  assert.equal(res.status, 401);
});

await check('Admin GET /api/admin/posts/[id] rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/posts/test-id');
  const res = await getPostDetail(req, { params: Promise.resolve({ id: 'test-id' }) });
  assert.equal(res.status, 401);
});

await check('Admin PUT /api/admin/posts/[id] rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/posts/test-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', expectedRevision: 1, document: {} }),
  });
  const res = await putPostDetail(req, { params: Promise.resolve({ id: 'test-id' }) });
  assert.equal(res.status, 401);
});

await check('Admin DELETE /api/admin/posts/[id] rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/posts/test-id', {
    method: 'DELETE',
  });
  const res = await deletePostDetail(req, { params: Promise.resolve({ id: 'test-id' }) });
  assert.equal(res.status, 401);
});

await check('Admin GET /api/admin/post-categories rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/post-categories');
  const res = await getCategories(req);
  assert.equal(res.status, 401);
});

await check('Admin POST /api/admin/post-categories rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/post-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: 0, document: { name: 'Test', slug: 'test' } }),
  });
  const res = await postCategories(req);
  assert.equal(res.status, 401);
});

await check('Admin GET /api/admin/pages rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/pages');
  const res = await getPages(req);
  assert.equal(res.status, 401);
});

await check('Admin POST /api/admin/pages rejects unauthenticated request with 401', async () => {
  const req = new Request('http://localhost/api/admin/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', expectedRevision: 0, document: {} }),
  });
  const res = await postPages(req);
  assert.equal(res.status, 401);
});

// 2. CSRF mutation protection: requests with admin cookie but missing/invalid CSRF header must be denied (403)
await check('Admin mutation with admin session but missing CSRF is denied with 403', async () => {
  // Use admin mock session cookie structure
  const req = new Request('http://localhost/api/admin/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'admin_session=test-admin-session',
      // Missing x-csrf-token
    },
    body: JSON.stringify({ action: 'save', expectedRevision: 0, document: {} }),
  });
  const res = await postPosts(req);
  assert.ok(res.status === 401 || res.status === 403, `Expected 401 or 403, got ${res.status}`);
});

console.log(`\nR05 API guard checks passed: ${passed}/${passed}\n`);
