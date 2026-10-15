/**
 * R07A lightweight HTTP smoke against a running Next/OpenNext dev server.
 * Skips cleanly when BASE_URL is unreachable (does not fail CI without a server).
 *
 * Usage:
 *   node scripts/test-r07a-smoke.mjs
 *   BASE_URL=http://127.0.0.1:3001 node scripts/test-r07a-smoke.mjs
 */
import assert from 'node:assert/strict';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

const ROUTES = [
  { path: '/', expect: 200, bodyIncludes: ['CitiLap'] },
  { path: '/lien-he', expect: 200, bodyIncludes: ['Liên hệ'] },
  { path: '/he-thong-cua-hang', expect: 200, bodyIncludes: ['Hà Nội', 'Bắc Ninh'] },
  { path: '/collection', expect: 200, bodyIncludes: ['Bộ sưu tập', 'bộ sưu tập', 'collection'] },
  { path: '/admin/builder', expect: [200, 302, 307, 401], bodyIncludes: [] },
  { path: '/admin/settings', expect: [200, 302, 307, 401], bodyIncludes: [] },
];

async function fetchStatus(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    headers: { Accept: 'text/html,application/json' },
  });
  const text = await res.text().catch(() => '');
  return { status: res.status, text };
}

console.log(`--- R07A SMOKE: ${BASE_URL} ---`);

let probe;
try {
  probe = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
} catch (err) {
  console.log(`SKIP: Dev server unreachable at ${BASE_URL} (${err?.cause?.code || err.message}).`);
  console.log('Start the app on port 3001 (or set BASE_URL) then re-run this script.');
  process.exit(0);
}

assert.ok(probe.status > 0, 'Probe returned no status');

let passed = 0;
for (const route of ROUTES) {
  const { status, text } = await fetchStatus(route.path);
  const expected = Array.isArray(route.expect) ? route.expect : [route.expect];
  assert.ok(
    expected.includes(status),
    `${route.path}: expected status ${expected.join('|')}, got ${status}`
  );

  if (route.bodyIncludes?.length && status === 200) {
    const hit = route.bodyIncludes.some((needle) => text.includes(needle));
    assert.ok(hit, `${route.path}: body missing one of ${route.bodyIncludes.join(' | ')}`);
  }

  console.log(`PASS: ${route.path} → ${status}`);
  passed += 1;
}

console.log(`\n========================================`);
console.log(`ALL R07A SMOKE CHECKS PASSED: ${passed}/${ROUTES.length}`);
console.log(`========================================`);
