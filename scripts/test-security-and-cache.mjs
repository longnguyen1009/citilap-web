// Security & cache-correctness checks: JSON-LD escaping, atomic D1 rate limiting under
// concurrency, and the catalog version token used by advisor cache / storefront refresh.
// Runs fully isolated (Miniflare D1, no remote access).
import assert from 'node:assert/strict';
import { readFile, readdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const outfile = 'scripts/.security-and-cache-bundle.mjs';
await build({
  stdin: {
    contents: `export * from './src/lib/seo-helpers'; export * from './src/lib/rate-limiter'; export * from './src/server/services/catalog-state';`,
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', outfile,
  external: ['node:*', 'cloudflare:workers'],
  plugins: [{
    // The limiter always receives an explicit D1 here; avoid bundling Prisma / Next runtimes.
    name: 'stub-runtime',
    setup(b) {
      b.onResolve({ filter: /^(@\/lib\/prisma|next\/server)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
        contents: a.path === 'next/server'
          ? 'export const NextResponse = { json: (body, init) => Response.json(body, init) };'
          : 'export function getD1Database() { return undefined; }',
        loader: 'js',
      }));
    },
  }],
});
const api = await import(`./.security-and-cache-bundle.mjs?${Date.now()}`);

let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n`, error); }
}

// ---------- JSON-LD ----------
await check('JSON-LD: CMS strings cannot close the <script> element', async () => {
  const hostile = { name: '</script><script>alert(1)</script>', note: '<!-- & -->' };
  const out = api.serializeJsonLd(hostile);
  assert.ok(!/[<>&]/.test(out), 'serialized JSON-LD must not contain raw <, > or &');
  assert.deepEqual(JSON.parse(out), hostile, 'escaping must round-trip to identical data');
});

await check('JSON-LD: every ld+json <script> in src uses serializeJsonLd', async () => {
  const offenders = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(tsx|ts)$/.test(entry.name)) {
        const source = await readFile(path, 'utf8');
        for (const match of source.matchAll(/application\/ld\+json[\s\S]{0,200}?__html:\s*([A-Za-z_.]+)\(/g)) {
          if (match[1] !== 'serializeJsonLd') offenders.push(`${path}: ${match[1]}`);
        }
        const structured = source.match(/structuredDataString\s*=\s*([A-Za-z_.]+)\(/);
        if (structured && structured[1] !== 'serializeJsonLd') offenders.push(`${path}: ${structured[1]}`);
      }
    }
  }
  await walk('src');
  assert.deepEqual(offenders, []);
});

// ---------- D1-backed checks ----------
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  script: 'export default { fetch() { return new Response("ok"); } }',
  compatibilityDate: '2026-10-01',
  compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'],
}));

try {
  const DB = await mf.getD1Database('DB');
  for (const file of (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    for (const sql of unstable_splitSqlQuery(await readFile(`d1-migrations/${file}`, 'utf8'))) {
      if (sql.trim()) await DB.prepare(sql).run();
    }
  }
  const req = (ip) => new Request('https://shop.test/api', { headers: { 'cf-connecting-ip': ip } });

  for (const [action, limit, windowSeconds] of [['login', 5, 900], ['contact', 3, 600], ['order', 5, 600]]) {
    await check(`rate limit (${action}): ${limit} slots under 25 concurrent requests`, async () => {
      const ip = `203.0.113.${limit}${action.length}`;
      const results = await Promise.all(Array.from({ length: 25 }, () => api.checkRateLimit(action, req(ip), limit, windowSeconds, DB)));
      assert.equal(results.filter((r) => r.allowed).length, limit, 'exactly `limit` requests may pass');
      for (const denied of results.filter((r) => !r.allowed)) {
        assert.equal(denied.remaining, 0);
        assert.ok(denied.retryAfter > 0 && denied.retryAfter <= windowSeconds);
      }
      const other = await api.checkRateLimit(action, req('198.51.100.1'), limit, windowSeconds, DB);
      assert.equal(other.allowed, true, 'limits are per client');
    });
  }

  await check('rate limit: expired window resets, including legacy ISO expiresAt rows', async () => {
    const ip = '192.0.2.77';
    for (let i = 0; i < 3; i++) await api.checkRateLimit('contact', req(ip), 3, 600, DB);
    assert.equal((await api.checkRateLimit('contact', req(ip), 3, 600, DB)).allowed, false);
    // Simulate a row written by the previous Prisma implementation (ISO DATETIME), already expired.
    await DB.prepare("UPDATE RateLimitRecord SET expiresAt=? WHERE key LIKE 'rl:contact:%' AND count>=3")
      .bind(new Date(Date.now() - 1000).toISOString()).run();
    const after = await api.checkRateLimit('contact', req(ip), 3, 600, DB);
    assert.equal(after.allowed, true);
    assert.equal(after.remaining, 2);
  });

  await check('rate limit: fails closed when the shared store is unavailable', async () => {
    const broken = { prepare() { throw new Error('D1 down'); } };
    const result = await api.checkRateLimit('login', req('192.0.2.1'), 5, 900, broken);
    assert.equal(result.allowed, false);
  });

  await check('catalog token: changes on catalog writes via triggers and at campaign boundaries', async () => {
    const t0 = Date.now();
    const base = await api.catalogState(DB, t0);
    assert.equal(base.nextChange, null);

    const start = new Date(t0 + 60_000).toISOString(), end = new Date(t0 + 120_000).toISOString();
    await DB.prepare(`INSERT INTO SiteSettings(id,revision,document) VALUES('site',1,?)
      ON CONFLICT(id) DO UPDATE SET document=excluded.document, revision=revision+1`)
      .bind(JSON.stringify({ flashSaleEnabled: true, flashSaleStartAt: start, flashSaleEndAt: end })).run();
    const afterWrite = await api.catalogState(DB, t0);
    assert.notEqual(afterWrite.token, base.token, 'SiteSettings trigger must bump the revision');
    assert.equal(afterWrite.nextChange, Date.parse(start), 'next boundary = flash sale start');

    const duringSale = await api.catalogState(DB, Date.parse(start) + 1);
    assert.notEqual(duringSale.token, afterWrite.token, 'token changes when a boundary passes without any write');
    assert.equal(duringSale.nextChange, Date.parse(end));

    const afterSale = await api.catalogState(DB, Date.parse(end) + 1);
    assert.notEqual(afterSale.token, duringSale.token);
    assert.equal(afterSale.nextChange, null);

    const triggers = await DB.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'search_revision_%'").all();
    for (const table of ['Product', 'ProductVariant', 'ProductStudio', 'PromotionCampaign', 'PromotionCampaignItem', 'SiteSettings']) {
      for (const op of ['insert', 'update', 'delete']) {
        assert.ok(triggers.results.some((t) => t.name === `search_revision_${table}_${op}`), `missing trigger ${table}_${op} (unpublish/price changes would be missed)`);
      }
    }
  });
} finally {
  await mf.dispose();
  await rm(outfile, { force: true });
}

if (failures) { console.error(`Security & cache: ${failures} failure(s)`); process.exit(1); }
console.log('Security & cache: ALL PASS (isolated Miniflare D1; no remote access)');
