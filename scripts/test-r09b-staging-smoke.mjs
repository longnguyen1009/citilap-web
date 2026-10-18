import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const base = 'https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev';
const results = [];
for (const [path, status] of [['/', 200], ['/search', 200], ['/api/products', 200], ['/api/admin/settings', 401], ['/robots.txt', 200]]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  const body = await response.text();
  assert.equal(response.status, status, path);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/, path);
  if (path === '/robots.txt') {
    assert.match(body, /Disallow: \/\s*$/);
    assert.ok(!body.includes('Allow:') && !body.includes('Sitemap:'));
  }
  results.push({ path, status, noindex: true });
}
await writeFile('docs/admin/evidence/r09b-staging-smoke.json', JSON.stringify({ recordedAt: new Date().toISOString(), base, results, scope: 'Read-only HTTP smoke; no authenticated UAT or populated checkout proof' }, null, 2) + '\n');
console.log('Staging HTTP smoke: 5/5 PASS');
