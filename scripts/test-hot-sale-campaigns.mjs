import assert from 'node:assert/strict';
import { readFile, readdir, rm, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

await mkdir('.wrangler/hot-sale-test', { recursive: true });
const bundle = '.wrangler/hot-sale-test/service.mjs';
await build({ stdin: { contents: `export * from './src/server/services/hot-sale.service'; export * from './src/server/services/campaign.service'; export * from './src/server/services/pricing.service'; export * from './src/server/services/catalog-state'; export * from './src/lib/prisma';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['cloudflare:workers', 'node:*', '*.wasm?module'], outfile: bundle });
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
  assert.equal(tabs[1].products[0].price, 15000000, 'Upcoming slot previews configured sale price');
  assert.equal(tabs[1].products[0].originalPrice, 20000000);
  assert.equal(tabs[1].products[0].isOnSale, true);
  assert.equal((await context(at)).activeCampaign.items.has('q'), false, 'Preview does not enable early checkout discounts');
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
  const guarded={...doc,status:'DRAFT',items:[{...item('q'),regularPrice:999999999,soldCount:99}]};
  for (const field of ['quantityLimit', 'perCustomerLimit']) {
    await assert.rejects(
      api.saveCampaign({...guarded, items:[{...item('q'), [field]: 1}]}, db),
      e => e.issues?.some(issue => issue.path.join('.') === `items.0.${field}`),
      `Block ${field} until atomic quota enforcement is accepted`
    );
  }
  const counter=await api.saveCampaign(guarded,db);
  assert.equal(counter.items[0].soldCount,0,'Client cannot set sold counter');
  assert.equal(counter.items[0].regularPrice,25000000,'Regular price bounded by canonical selling/original price');
  await assert.rejects(api.saveCampaign({...guarded,items:[{...item('q'),salePrice:20000000,regularPrice:999999999}]},db),e=>e.code==='INVALID_SALE_PRICE');
  await assert.rejects(api.saveCampaign({...guarded,status:'PUBLISHED',items:[]},db));
  await api.archiveCampaign(counter.id,counter.revision,db);
  await assert.rejects(api.saveCampaign({...guarded,id:counter.id,expectedRevision:counter.revision+1,status:'PUBLISHED'},db),e=>e.code==='CAMPAIGN_ARCHIVED_CONFLICT');
  await assert.rejects(api.saveCampaign({...doc,items:[{...item('v')}]},db),e=>e.code==='CAMPAIGN_OVERLAP_CONFLICT');
  const beforeCount = (await api.listCampaigns(db)).length;
  const recurring = await api.saveCampaign({ ...doc, name: 'Daily 14 days',
    startAt: '2099-11-16T03:00:00Z', endAt: '2099-11-29T05:00:00Z',
    schedule: { mode: 'daily_slots', startDate: '2099-11-16', endDate: '2099-11-29', slots: [{ startTime: '10:00', endTime: '12:00' }] },
    items: [{ ...item('v'), variantId: 'v2' }],
  }, db);
  assert.equal((await api.listCampaigns(db)).length, beforeCount + 1, 'Daily schedule is ONE campaign record');
  assert.equal(recurring.items.length, 1, 'Items are not duplicated for each day');
  assert.equal(recurring.schedule.slots[0].startTime, '10:00');
  assert.equal(recurring.schedule.endDate, '2099-11-29');
  assert.equal(recurring.items[0].product.variants.length, 2, 'Edit detail includes non-discounted options');
  const inWindow = new Date('2099-11-16T03:00:00Z');
  assert.equal((await context(inWindow)).activeCampaign.items.get('v:v2').campaignId, recurring.id);
  assert.equal((await context(new Date('2099-11-16T02:59:59Z'))).activeCampaign, null);
  assert.equal((await context(new Date('2099-11-16T05:00:00Z'))).activeCampaign, null, 'No sale between daily windows');
  assert.equal((await context(new Date('2099-11-17T03:00:00Z'))).activeCampaign.items.get('v:v2').campaignId, recurring.id);
  const recurringTabs = await api.getHotSaleCampaigns(await context(inWindow), inWindow);
  assert.equal(recurringTabs.length, 14, 'Homepage receives windows, admin receives one campaign');
  assert.equal(recurringTabs[0].products[0].price, 15000000);
  await assert.rejects(api.saveCampaign({ ...doc, startAt: '2099-11-20T04:00:00Z', endAt: '2099-11-20T06:00:00Z', items: [{ ...item('v'), variantId: 'v2' }] }, db), e => e.code === 'CAMPAIGN_OVERLAP_CONFLICT');
  await api.saveCampaign({ ...doc, startAt: '2099-11-20T05:00:00Z', endAt: '2099-11-20T06:00:00Z', items: [{ ...item('v'), variantId: 'v2' }] }, db);
  const updatedDaily = await api.saveCampaign({ ...recurring, expectedRevision: recurring.revision, schedule: { ...recurring.schedule, endDate: '2099-11-30' } }, db);
  assert.equal(updatedDaily.id, recurring.id);
  assert.equal(updatedDaily.endAt, '2099-11-30T05:00:00.000Z');
  assert.equal(updatedDaily.revision, recurring.revision + 1);
  assert.equal((await api.catalogState(db, inWindow.getTime())).nextChange, Date.parse('2099-11-16T05:00:00Z'), 'Catalog refresh follows each occurrence, not overall range');
  const rawConflict = await api.saveCampaign({ ...doc, status: 'DRAFT', startAt: '2099-11-19T04:00:00Z', endAt: '2099-11-19T06:00:00Z', items: [{ ...item('v'), variantId: 'v2' }] }, db);
  await assert.rejects(db.prepare("UPDATE PromotionCampaign SET status='PUBLISHED',revision=revision+1 WHERE id=?").bind(rawConflict.id).run(), /CAMPAIGN_OVERLAP_CONFLICT/, 'Database trigger also checks recurring windows');
  const weekend = { ...doc, name: 'HOTSALE CUỐI TUẦN' };
  await api.saveCampaign({ ...weekend, startAt: '2098-11-16T03:00:00Z', endAt: '2098-11-18T05:00:00Z',
    schedule: { mode: 'daily_slots', startDate: '2098-11-16', endDate: '2098-11-18', slots: [{ startTime: '10:00', endTime: '12:00' }] }, items: [item('p')] }, db);
  await api.saveCampaign({ ...weekend, startAt: '2098-11-16T11:00:00Z', endAt: '2098-11-20T13:00:00Z',
    schedule: { mode: 'daily_slots', startDate: '2098-11-16', endDate: '2098-11-20', slots: [{ startTime: '18:00', endTime: '20:00' }] }, items: [item('q')] }, db);
  const morningAt = new Date('2098-11-16T04:00:00Z');
  const weekendTabs = (await api.getHotSaleCampaigns(await context(morningAt), morningAt)).filter(c => c.name === weekend.name);
  assert.equal(weekendTabs.length, 8, 'One campaign name groups 3 morning and 5 evening occurrences');
  assert.deepEqual(weekendTabs.filter(c => c.startAt.includes('T03:')).map(c => c.products.map(p => p.id)), [['p'], ['p'], ['p']]);
  assert.deepEqual(weekendTabs.filter(c => c.startAt.includes('T11:')).map(c => c.products.map(p => p.id)), [['q'], ['q'], ['q'], ['q'], ['q']]);
  assert.equal((await context(morningAt)).activeCampaign.items.has('q'), false, 'Evening product not discounted in morning');
  assert.equal((await context(new Date('2098-11-16T12:00:00Z'))).activeCampaign.items.has('p'), false, 'Morning product not discounted in evening');
  await db.prepare("UPDATE ProductVariant SET price=28900000 WHERE id='v1'").run();
  await db.prepare("UPDATE ProductVariant SET price=32900000 WHERE id='v2'").run();
  const honor = await api.saveCampaign({ ...doc, name: 'HONOR preview', startAt: '2097-11-16T03:00:00Z', endAt: '2097-11-16T05:00:00Z',
    items: [{ productId: 'v', variantId: 'v1', salePrice: 27000000, regularPrice: 28900000 },
      { productId: 'v', variantId: 'v2', salePrice: 30000000, regularPrice: 32900000 }] }, db);
  const honorLater = await api.saveCampaign({ ...doc, name: 'HONOR preview', startAt: '2097-11-16T11:00:00Z', endAt: '2097-11-16T13:00:00Z',
    items: [{ productId: 'v', variantId: 'v1', salePrice: 26000000, regularPrice: 28900000 }] }, db);
  const previewAt = new Date('2097-11-16T01:00:00Z');
  const previews = await api.getHotSaleCampaigns(await context(previewAt), previewAt);
  const honorCard = previews.find(c => c.id === honor.id).products[0];
  assert.equal(honorCard.variantId, 'v1', 'First discounted option in Studio order');
  assert.equal(honorCard.price, 27000000, 'Configured 27M displayed before sale starts');
  assert.equal(honorCard.originalPrice, 28900000);
  assert.equal(previews.find(c => c.id === honorLater.id).products[0].price, 26000000, 'Each slot previews its own price for same product');
  assert.equal((await context(previewAt)).activeCampaign, null, 'Preview leaves live pricing inactive');
  console.log('PASS: configured variant prices preview independently per slot; checkout remains time gated.');
  console.log('PASS: weekend campaign, independent date ranges and product lists per detail.');
  console.log('PASS: one recurring campaign, 14 homepage windows, no discounts between windows, complete edit options, overlap and adjacent slots, edit preserves identity.');
  console.log('PASS: isolated D1; campaigns, canonical prices/counters, archived/empty guards, overlap, exact variants, expiry and legacy offers.');
} finally { delete globalThis.env; await mf.dispose(); await rm(bundle, { force: true }); }
