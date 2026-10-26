import assert from 'node:assert/strict';
import { readFile, readdir, rm, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

await mkdir('.wrangler/hot-sale-test', { recursive: true });
const bundle = '.wrangler/hot-sale-test/service.mjs';
await build({ stdin: { contents: `export * from './src/server/services/hot-sale.service'; export * from './src/server/services/campaign.service'; export * from './src/server/services/pricing.service'; export * from './src/lib/prisma';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['cloudflare:workers', 'node:*', '*.wasm?module'], outfile: bundle });
const api = await import('../' + bundle);
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("fixture")}}', compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], r2Buckets: ['PRODUCT_MEDIA'] }));
try {
  const db = await mf.getD1Database('DB');
  globalThis.env = { DB: db, PRODUCT_MEDIA: await mf.getR2Bucket('PRODUCT_MEDIA') }; api.setD1Database(db);
  for (const file of (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of unstable_splitSqlQuery(await readFile('d1-migrations/' + file, 'utf8'))) if (sql.trim()) await db.prepare(sql).run();
  }
  await db.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat','Laptop','laptop',CURRENT_TIMESTAMP)").run();
  for (const id of ['p', 'q', 'v', 'hidden']) {
    await db.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES(?,?,?,'Fixture',20000000,'cat','ACTIVE',CURRENT_TIMESTAMP)").bind(id, 'Laptop ' + id, id).run();
    await db.prepare('INSERT INTO ProductStudio(productId,draft,published) VALUES(?,?,?)').bind(id, '{}', id === 'hidden' ? null : JSON.stringify({ availability: 'AVAILABLE', variants: id === 'v' ? [{ id: 'v1' }, { id: 'v2' }] : [] })).run();
  }
  for (const id of ['v1', 'v2']) await db.prepare("INSERT INTO ProductVariant(id,productId,name,sku,options,price,status,updatedAt) VALUES(?,'v',?,?,'{}',20000000,'ACTIVE',CURRENT_TIMESTAMP)").bind(id, id, id).run();
  const at = new Date('2026-10-24T10:00:00Z');
  const item = productId => ({ productId, salePrice: 15000000, regularPrice: 20000000 });
  const doc = { name: 'FLASH SALE', status: 'PUBLISHED', startAt: '2026-10-24T09:00:00Z', endAt: '2026-10-24T11:00:00Z', items: [item('p'), { ...item('v'), variantId: 'v2' }] };
  const active = await api.saveCampaign(doc, db);
  await api.saveCampaign({ ...doc, name: 'Sale mừng nhập học', startAt: '2026-10-25T09:00:00Z', endAt: '2026-10-25T11:00:00Z', items: [item('q')] }, db);
  await api.saveCampaign({ ...doc, name: 'Draft', status: 'DRAFT', items: [item('q')] }, db);
  const settings = { flashSaleEnabled: false, flashSaleTitle: '', flashSaleStartAt: '', flashSaleEndAt: '' };
  const context = async time => ({ ...settings, activeCampaign: await api.resolveActiveCampaigns(time, db) });
  const tabs = await api.getHotSaleCampaigns(await context(at), at);
  assert.equal(tabs.length, 2, 'Active and upcoming campaigns; drafts hidden');
  assert.equal(tabs[0].id, active.id);
  assert.equal(tabs[0].products.length, 2);
  assert.equal(tabs[0].products.find(p => p.id === 'p').price, 15000000);
  assert.equal(tabs[0].products.find(p => p.id === 'v').variantId, 'v2', 'Exact campaign variant, even with cheaper/equal sibling');
  assert.equal(tabs[0].products.find(p => p.id === 'v').price, 15000000);
  assert.equal(tabs[1].products[0].price, 20000000, 'Upcoming campaign retains current regular price');
  const disabled = await api.saveCampaign({ ...doc, id: active.id, expectedRevision: active.revision, status: 'DRAFT' }, db);
  assert.equal((await api.getHotSaleCampaigns(await context(at), at)).length, 1, 'Turning campaign off hides it');
  assert.equal((await context(at)).activeCampaign, null, 'Turning campaign off removes sale pricing');
  await api.saveCampaign({ ...doc, id: active.id, expectedRevision: disabled.revision, status: 'PUBLISHED' }, db);
  assert.equal((await api.getHotSaleCampaigns(await context(at), at)).length, 2, 'Turning campaign on restores it');
  const end = new Date(doc.endAt);
  assert.equal((await api.getHotSaleCampaigns(await context(end), end)).length, 1, 'Expired campaign removed at exact end');
  await db.prepare("UPDATE ProductStudio SET published=NULL WHERE productId='p'").run();
  assert.equal((await api.getHotSaleCampaigns(await context(at), at))[0].products.length, 1, 'Unpublished product excluded');
  await assert.rejects(api.saveCampaign({ ...doc, name: 'Overlap' }, db), e => e.code === 'CAMPAIGN_OVERLAP_CONFLICT');
  await db.prepare("UPDATE Product SET isFlashSale=1,originalPrice=25000000 WHERE id='q'").run();
  const legacyContext = { ...await context(at), flashSaleEnabled: true, flashSaleTitle: 'Giờ vàng', flashSaleStartAt: doc.startAt, flashSaleEndAt: doc.endAt };
  assert.ok((await api.getHotSaleCampaigns(legacyContext, at)).some(c => c.id === 'site-flash-sale'), 'Legacy offers remain available');
  await db.prepare("UPDATE ProductStudio SET published=? WHERE productId='p'").bind(JSON.stringify({ availability: 'AVAILABLE', variants: [] })).run();
  const nextSlot = await api.saveCampaign({ ...doc, startAt: doc.endAt, endAt: '2026-10-24T13:00:00Z' }, db);
  assert.ok((await api.getHotSaleCampaigns(await context(at), at)).some(c => c.id === nextSlot.id), 'Next same-day slot remains selectable before start');
  assert.equal((await context(new Date(doc.endAt))).activeCampaign.items.get('p').campaignId, nextSlot.id, 'Adjacent slot takes over exact start without overlap');
  await (await import('node:fs/promises')).writeFile('.wrangler/hot-sale-test/campaigns.json', JSON.stringify(tabs));
  console.log('PASS: real isolated D1; multiple campaigns, draft/expiry, exact variant price, unpublished exclusion, overlap guard, legacy offers.');
} finally { delete globalThis.env; await mf.dispose(); await rm(bundle, { force: true }); }
