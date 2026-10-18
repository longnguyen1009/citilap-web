import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { seedDemo } from './seed-storefront-demo.mjs';

const local = new DatabaseSync(':memory:');
const migrations = readdirSync('d1-migrations').filter(f => f.endsWith('.sql')).sort().map(f => readFileSync(`d1-migrations/${f}`, 'utf8'));
for (const sql of migrations) local.exec(sql);
assert.equal(seedDemo(local).addedLaptops, 12);
local.prepare("UPDATE Product SET price=12345678 WHERE id='demo-thinkpad-t14'").run();
assert.equal(seedDemo(local).addedLaptops, 0);
assert.equal(local.prepare("SELECT price FROM Product WHERE id='demo-thinkpad-t14'").get().price, 12345678);
assert.equal(local.prepare('SELECT count(*) AS n FROM Post').get().n, 3);
assert.deepEqual(local.prepare('PRAGMA foreign_key_check').all(), []);
console.log('PASS seed: fresh DB, repeat, edited data preserved, foreign keys');

await build({ stdin: { contents: `export * from './src/contracts/catalog/advisor'; export * from './src/contracts/catalog/search-intent'; export * from './src/server/services/search.service'; export * from './src/server/services/inspection.service'; export * from './src/server/services/contact.service'; export * from './src/lib/prisma'; export * from './src/server/services/advisor.service';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.storefront-improvements-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
const api = await import('./.storefront-improvements-bundle.mjs');
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], r2Buckets: ['PRODUCT_MEDIA'] }));
try {
  const DB = await mf.getD1Database('DB');
  globalThis.env = { DB, PRODUCT_MEDIA: await mf.getR2Bucket('PRODUCT_MEDIA') };
  api.setD1Database(DB);
  for (const migration of migrations) for (const sql of unstable_splitSqlQuery(migration)) if (sql.trim()) await DB.prepare(sql).run();
  for (const table of ['Category', 'Brand', 'Warehouse', 'Product', 'SerialUnit', 'ProductInspection']) {
    for (const row of local.prepare(`SELECT * FROM ${table}`).all()) await DB.prepare(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`).bind(...Object.values(row)).run();
  }
  const input = api.advisorSchema.parse({ budget: 20000000, need: 'office', portable: 'yes' });
  const recommended = await api.adviseLaptops(input);
  assert(recommended.length > 0);
  assert(recommended.every(item => item.product.price <= 20000000 && item.product.specs.ram.includes('16')));
  assert.equal(api.advisorSchema.safeParse({ budget: -1 }).success, false);
  assert.equal(api.matchLaptop(input, { price: 15000000, condition: 'NEW', availability: 'CONTACT', specs: { ram: '16GB' } }, { 'Trọng lượng': '1.3 kg' }), null);
  assert.equal(api.matchLaptop(input, { price: 15000000, condition: 'NEW', specs: { ram: '16GB' } }, {}), null);
  assert.equal(api.searchIntent('laptop gaming 20 triệu').maxPrice, 20000000);
  assert.equal(api.searchIntent('RTX4060').query, 'rtx 4060');
  const search = await api.searchProducts({query:'gaming 20 trieu'});
  assert(search.products.length > 0);
  assert(search.products.every(p => p.price <= 20000000));
  console.log('PASS search: natural budget and GPU normalization');
  console.log('PASS advisor: real catalog, budget, portable facts, contact-only exclusion');

  let reports = await api.publicInspections(DB, 'demo-thinkpad-t14', null);
  assert.equal(reports.length, 1);
  assert(!JSON.stringify(reports).includes('serialNumber'));
  assert(!JSON.stringify(reports).includes('costPrice'));
  await DB.prepare("UPDATE SerialUnit SET status='SOLD' WHERE id='demo-thinkpad-t14-unit'").run();
  assert.equal((await api.publicInspections(DB, 'demo-thinkpad-t14', null)).length, 0);
  await DB.prepare("UPDATE SerialUnit SET status='AVAILABLE' WHERE id='demo-thinkpad-t14-unit'").run();
  const old = await DB.prepare("SELECT updatedAt FROM ProductInspection WHERE serialUnitId='demo-thinkpad-t14-unit'").first();
  const payload = { ...reports[0], serialUnitId: 'demo-thinkpad-t14-unit', published: true, expectedUpdatedAt: old.updatedAt };
  await api.writeInspection(DB, 'demo-thinkpad-t14', payload);
  await assert.rejects(() => api.writeInspection(DB, 'demo-thinkpad-t14', payload), /đã thay đổi/);
  await assert.rejects(() => api.writeInspection(DB, 'demo-elitebook-840', payload), /không thuộc/);
  assert.equal((await api.publicInspections(DB, 'demo-thinkpad-t14', null))[0].isDemo, 1);
  console.log('PASS inspection: sold visibility, no private fields, ownership, concurrent edit, demo label');

  const appointment = { productId: 'demo-thinkpad-t14', unitCode: 'DEMO-THINKPAD-T14', locationId: 'hanoi', requestedAt: new Date(Date.now() + 86400000).toISOString() };
  const contact = { name: 'Khách kiểm thử', phone: '0900000000', message: 'Chạy test', appointment };
  assert.equal(api.ContactInputSchema.safeParse({ ...contact, appointment: { ...appointment, requestedAt: 'yesterday' } }).success, false);
  assert.equal((await api.submitContactMessage({ ...contact, appointment: { ...appointment, locationId: 'hcm' } }, '127.0.0.1', DB)).success, false);
  assert.equal((await api.submitContactMessage(contact, '127.0.0.1', DB)).success, true);
  const saved = await DB.prepare('SELECT message FROM ContactSubmission LIMIT 1').first();
  assert.match(saved.message, /CHỜ XÁC NHẬN/);
  assert.match(saved.message, /GMT\+7/);
  assert.equal((await DB.prepare('SELECT count(*) AS n FROM AdminNotification').first()).n, 1);
  console.log('PASS appointment: input/date/location checks, D1 persistence and admin notification');
} finally { await mf.dispose(); local.close(); }
