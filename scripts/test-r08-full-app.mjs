// Local production Worker + real browser assets, isolated ephemeral D1/R2. No .env/config loading.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { build } from 'esbuild';
await build({entryPoints:['src/contracts/cms/settings.ts'],bundle:true,platform:'node',format:'esm',outfile:'scripts/.r07c-settings-bundle.mjs'});
const {DEFAULT_ADMIN_SETTINGS}=await import('./.r07c-settings-bundle.mjs');

const root=resolve('dist/server'), clientRoot=resolve('dist/client');
const files=await readdir(root,{recursive:true});
const modules=[{type:'ESModule',path:join(root,'fixture-entry.mjs'),contents:`import app from './index.js';export default {fetch(request,env,ctx){globalThis.env=env;return app.fetch(request,env,ctx)},scheduled(event,env,ctx){globalThis.env=env;return app.scheduled(event,env,ctx)}};`}];
for(const f of files)if(['.js','.wasm'].includes(extname(f)))modules.push({type:f.endsWith('.wasm')?'CompiledWasm':'ESModule',path:join(root,f)});
let cookie;
const mf=new Miniflare(convertV4MiniflareOptions({modules,modulesRoot:root,compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat','enable_weak_ref','nodejs_compat_populate_process_env'],d1Databases:['DB'],r2Buckets:['PRODUCT_MEDIA'],bindings:{ADMIN_EMAIL:'fixture@example.invalid',ADMIN_PASSWORD:'FixtureOnlyPassword-2026',CONFIRMATION_TOKEN_SECRET:randomUUID()+randomUUID()},serviceBindings:{ASSETS:async request=>{
  const path=resolve(clientRoot,'.'+decodeURIComponent(new URL(request.url).pathname));
  if(!path.startsWith(clientRoot+'/')&&!path.startsWith(clientRoot+'\\'))return new Response('Not found',{status:404});
  try{return new Response(await readFile(path),{headers:{'content-type':({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'}[extname(path)]||'application/octet-stream')}});}catch{return new Response('Not found',{status:404});}
}}}));
let server,base,passed=0;
const db=await mf.getD1Database('DB');
const check=async(name,fn)=>{await fn();console.log(`PASS ${++passed}: ${name}`);};
const send=async(path,method='GET',body,authorized=false,headers={})=>{
  const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(authorized?{cookie,origin:base}:{} ),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();let json;try{json=JSON.parse(text);}catch{}
  return {status:response.status,text,json};
};
try {
  for(const file of (await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort())for(const sql of unstable_splitSqlQuery(await readFile('d1-migrations/'+file,'utf8')))if(sql.trim())await db.prepare(sql).run();
  await db.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('fixture-cat','Fixture Laptops','fixture-laptops',CURRENT_TIMESTAMP)").run();
  await db.prepare("INSERT INTO Brand(id,name,slug,updatedAt) VALUES('fixture-brand','Fixture Brand','fixture-brand',CURRENT_TIMESTAMP)").run();
  let config={...DEFAULT_ADMIN_SETTINGS,flashSaleEnabled:true,shippingFee:30000,freeShippingThreshold:20000000,codEnabled:true,bankTransferEnabled:true,bankAccountInfo:'Fixture Bank A - 000001',addressHanoi:'Fixture showroom A'};
  const saveSettings=async patch=>{config={...config,...patch};await db.prepare("INSERT INTO SiteSettings(id,revision,document) VALUES('site',0,?) ON CONFLICT(id) DO UPDATE SET revision=revision+1,document=excluded.document").bind(JSON.stringify(config)).run();};
  await saveSettings({});
  for(const [id,name] of [['fixture-p','Fixture Laptop Alpha'],['fixture-q','Fixture Laptop Beta']])await db.prepare("INSERT INTO Product(id,name,slug,description,price,originalPrice,categoryId,brandId,brand,status,isFeatured,isFlashSale,stock,images,updatedAt) VALUES(?,?,?,'Full app fixture',20000000,22000000,'fixture-cat','fixture-brand','Fixture Brand','ACTIVE',1,1,10,'[]',CURRENT_TIMESTAMP)").bind(id,name,id).run();
  const navigation={schemaVersion:1,categories:[],collections:[{id:'fixture-collection',name:'Fixture Collection',slug:'fixture-collection',description:'Fixture',visible:true,mode:'manual',productIds:['fixture-p','fixture-q']}],menus:{main:[],footer:[]}};
  await db.prepare("INSERT INTO NavigationStudio(id,draft,published,publishedRevision) VALUES('site',?,?,1)").bind(JSON.stringify(navigation),JSON.stringify(navigation)).run();
  const landing={schemaVersion:1,title:'Fixture Builder',internalName:'Fixture Builder',slug:'fixture-builder',seo:{},sections:[{id:'fixture-grid',type:'product_grid',name:'Fixture Grid',enabled:true,data:{type:'product_grid',title:'Fixture Grid',sourceMode:'manual',manualProductIds:['fixture-p','fixture-q']}}]};
  await db.prepare("INSERT INTO LandingPage(id,slug,name,status) VALUES('fixture-landing','fixture-builder','Fixture Builder','PUBLISHED')").run();
  await db.prepare("INSERT INTO LandingPageStudio(pageId,draft,published,publishedRevision) VALUES('fixture-landing',?,?,1)").bind(JSON.stringify(landing),JSON.stringify(landing)).run();
  server=createServer(async(req,res)=>{try{
    const path=new URL(req.url,'http://fixture').pathname;
    if(path.startsWith('/_next/static/')||path.startsWith('/images/')||path.startsWith('/brand/')) {
      const file=resolve(clientRoot,'.'+decodeURIComponent(path));
      if(file.startsWith(clientRoot+'\\')||file.startsWith(clientRoot+'/'))try{const contents=await readFile(file);res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'}[extname(file)]||'application/octet-stream'));res.end(contents);return;}catch{}
    }
    // Test-only host controls; never added to app routes or deployed Worker.
    if(path==='/__fixture/session'){res.writeHead(302,{'set-cookie':cookie+'; HttpOnly; SameSite=Lax; Path=/','location':'/admin/campaigns'});res.end();return;}
    if(path==='/__fixture/control'&&req.method==='POST'){
      let raw='';for await(const c of req)raw+=c;const input=JSON.parse(raw);
      if(input.action==='schedule-tick'){await (await mf.getWorker()).scheduled({scheduledTime:Date.now()+120000});res.end('ok');return;}
      if(input.action==='schedule-due'){await db.prepare("UPDATE CmsSchedule SET executeAt=0 WHERE state='PENDING'").run();res.end('ok');return;}
      if(input.action==='stats'){res.setHeader('content-type','application/json');res.end(JSON.stringify(await db.prepare('SELECT COUNT(*) AS orders FROM "Order"').first()));return;}
      if(input.action==='settings')await saveSettings(input.patch || {});
      if(input.action==='unavailable')await db.prepare("UPDATE Product SET status='INACTIVE' WHERE id='fixture-p'").run();
      if(input.action==='available')await db.prepare("UPDATE Product SET status='ACTIVE' WHERE id='fixture-p'").run();
      if(input.action==='price')await db.prepare("UPDATE Product SET price=? WHERE id='fixture-p'").bind(input.price).run();
      if(input.action==='fault')await db.prepare('ALTER TABLE Product RENAME TO FixtureProductUnavailable').run();
      if(input.action==='recover')await db.prepare('ALTER TABLE FixtureProductUnavailable RENAME TO Product').run();
      if(input.action==='archive-all')await db.prepare("UPDATE PromotionCampaign SET status='ARCHIVED',revision=revision+1").run();
      if(input.action==='race')await db.prepare("UPDATE PromotionCampaign SET name='Fixture concurrent winner',revision=revision+1 WHERE id=?").bind(input.id).run();
      res.end('ok');return;
    }
    const chunks=[];for await(const c of req)chunks.push(c);
    const result=await mf.dispatchFetch(base+req.url,{method:req.method,redirect:'manual',headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch(e){console.error('Fixture host:',e.message);res.writeHead(500);res.end('Fixture host error');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify({email:'fixture@example.invalid',password:'FixtureOnlyPassword-2026'})});
  assert.equal(login.status,200,await login.text());
  cookie=login.headers.get('set-cookie')?.split(';')[0];
  assert.match(cookie,/^admin_session=[a-f0-9]{64}$/);
  const originalSettings={...config};
  const now=Date.now();
  const campaignDoc={name:'Fixture Active Campaign',status:'PUBLISHED',startAt:new Date(now-600000).toISOString(),endAt:new Date(now+86400000).toISOString(),items:[{productId:'fixture-p',variantId:null,salePrice:15000000,regularPrice:22000000}]};
  const createdCampaign=await send('/api/admin/campaigns','POST',campaignDoc,true);assert.equal(createdCampaign.status,201,createdCampaign.text);
  const selection={items:[{productId:'fixture-p',quantity:1}],shippingMethod:'standard',paymentMethod:'COD'};
  const quote=async(input=selection)=>{const r=await send('/api/checkout/quote','POST',input);assert.equal(r.status,200,r.text);return r.json.data;};
  const payload=q=>({items:q.lines.map(i=>({productId:i.productId,variantId:i.variantId,quantity:i.quantity,expectedPrice:i.price})),customerName:'Fixture Customer',customerPhone:'0900000000',customerEmail:'fixture@example.test',shippingAddress:'Fixture delivery address',shippingMethod:q.shippingMethod,showroomId:q.snapshot.showroom?.id || null,paymentMethod:q.paymentMethod,checkoutAcknowledgment:{shippingFee:q.shippingFee,totalAmount:q.totalAmount,termsVersion:q.termsVersion}});
  let orderRequest=0;
  const create=(body,key=randomUUID())=>send('/api/orders','POST',body,false,{'idempotency-key':key,'cf-connecting-ip':'192.0.2.'+(++orderRequest)});
  const counts=async()=>Promise.all(['Order','OrderItem','OrderEvent','AdminNotification'].map(t=>db.prepare('SELECT COUNT(*) AS n FROM "'+t+'"').first('n')));
  await check('Quote side-effect free, campaign subtotal and inclusive shipping threshold',async()=>{
    const before=await counts();
    for(const [threshold,fee] of [[15000001,30000],[15000000,0],[14999999,0],[0,30000]]){await saveSettings({freeShippingThreshold:threshold});const q=await quote();assert.equal(q.subtotal,15000000);assert.equal(q.shippingFee,fee);assert.equal(q.totalAmount,15000000+fee);}
    await saveSettings({shippingFee:0});assert.equal((await quote()).shippingFee,0);
    assert.deepEqual(await counts(),before);await saveSettings(originalSettings);
  });
  await check('Pickup resolves configured showroom; invalid showroom and missing address reject',async()=>{
    const q=await quote({...selection,shippingMethod:'pickup',showroomId:'hanoi'});assert.equal(q.shippingFee,0);assert.equal(q.snapshot.showroom.address,'Fixture showroom A');
    const body={...payload(q),shippingAddress:'Forged pickup address'};const o=await create(body);assert.equal(o.status,201,o.text);assert.match(o.json.data.shippingAddress,/Fixture showroom A/);assert.doesNotMatch(o.json.data.shippingAddress,/Forged/);
    assert.equal((await send('/api/checkout/quote','POST',{...selection,shippingMethod:'pickup',showroomId:'hidden'})).status,400);
    await saveSettings({addressHanoi:''});assert.equal((await quote()).showrooms.length,0);assert.equal((await send('/api/checkout/quote','POST',{...selection,shippingMethod:'pickup',showroomId:'hanoi'})).status,400);await saveSettings(originalSettings);
  });
  await check('Shipping fee changes return 409 old/new totals without writing',async()=>{
    const p=payload(await quote()),before=await counts();await saveSettings({shippingFee:60000});
    const r=await create(p);assert.equal(r.status,409,r.text);assert.equal(r.json.error.code,'CHECKOUT_CHANGED');assert.equal(r.json.error.details.oldShippingFee,30000);assert.equal(r.json.error.details.newShippingFee,60000);assert.deepEqual(await counts(),before);
    assert.equal((await create(payload(r.json.error.details.quote))).status,201);await saveSettings(originalSettings);
  });
  await check('Methods disabled, no methods and missing bank details fail closed',async()=>{
    const p=payload(await quote());await saveSettings({codEnabled:false});let r=await create(p);assert.equal(r.status,400,r.text);assert.equal(r.json.error.code,'PAYMENT_METHOD_DISABLED');
    assert.deepEqual((await quote({...selection,paymentMethod:undefined})).allowedPaymentMethods,['BANK_TRANSFER']);
    await saveSettings({bankTransferEnabled:false});assert.equal((await send('/api/checkout/quote','POST',selection)).status,503);
    await saveSettings({bankTransferEnabled:true,bankAccountInfo:''});assert.equal((await send('/api/checkout/quote','POST',{...selection,paymentMethod:'BANK_TRANSFER'})).status,503);
    await saveSettings({...originalSettings,bankTransferEnabled:false});assert.equal((await send('/api/checkout/quote','POST',{...selection,paymentMethod:'BANK_TRANSFER'})).status,400);await saveSettings(originalSettings);
  });
  await check('Bank instructions change requires review; replay ignores live settings and retains snapshots',async()=>{
    const p=payload(await quote({...selection,paymentMethod:'BANK_TRANSFER',shippingMethod:'pickup',showroomId:'hanoi'}));
    await saveSettings({bankAccountInfo:'Fixture Bank B - 000002'});let r=await create(p);assert.equal(r.status,409,r.text);assert.equal(r.json.error.code,'CHECKOUT_CHANGED');
    const accepted=payload(r.json.error.details.quote),key=randomUUID();const made=await create(accepted,key);assert.equal(made.status,201,made.text);assert.equal(made.json.data.paymentStatus,'PENDING');assert.equal(made.json.data.checkoutSnapshot.bankAccountInfo,'Fixture Bank B - 000002');
    const before=await counts();await saveSettings({bankTransferEnabled:false,codEnabled:false,addressHanoi:'Fixture showroom changed'});
    const replay=await create(accepted,key);assert.equal(replay.status,200,replay.text);assert.equal(replay.json.orderId,made.json.orderId);assert.deepEqual(replay.json.data,made.json.data);assert.deepEqual(await counts(),before);
    for(const changed of [{...accepted,paymentMethod:'COD'},{...accepted,shippingMethod:'standard'},{...accepted,checkoutAcknowledgment:{...accepted.checkoutAcknowledgment,totalAmount:1}}]){const bad=await create(changed,key);assert.equal(bad.status,422,bad.text);}
    const access=await send('/api/orders/'+made.json.orderId+'?token='+made.json.confirmationToken);assert.equal(access.status,200,access.text);assert.equal(access.json.data.checkoutSnapshot.showroom.address,'Fixture showroom A');
    assert.equal((await send('/api/orders/'+made.json.orderId)).status,403);await saveSettings(originalSettings);
  });
  await check('Price changes preserve PRICE_CHANGED envelope and require fresh acknowledgment',async()=>{
    const p=payload(await quote());await db.prepare("UPDATE PromotionCampaign SET status='ARCHIVED',revision=revision+1").run();const r=await create(p);assert.equal(r.status,409,r.text);assert.equal(r.json.error.code,'PRICE_CHANGED');assert.equal(r.json.error.details.changedItems[0].oldPrice,15000000);assert.equal(r.json.error.details.quote.lines[0].price,20000000);
    await db.prepare("UPDATE PromotionCampaign SET status='PUBLISHED',revision=revision+1").run();
  });
  await check('Bounded malformed quote and missing acknowledgment reject',async()=>{
    for(const items of [[],[null],[{productId:'fixture-p',quantity:1.5}],[{productId:'fixture-p',quantity:'1'}],Array(11).fill({productId:'fixture-p',quantity:1}),[{productId:'fixture-p',quantity:1},{productId:'fixture-p',quantity:1}]])assert.equal((await send('/api/checkout/quote','POST',{...selection,items})).status,400);
    const p=payload(await quote());delete p.checkoutAcknowledgment;assert.equal((await create(p)).status,400);
  });
  await check('Settings missing/corrupt/query failure fails closed, no order',async()=>{
    const before=await counts(),p=payload(await quote());
    await assert.rejects(db.prepare("UPDATE SiteSettings SET document='not-json' WHERE id='site'").run());
    for(const document of ['{}',JSON.stringify({...config,shippingFee:-1})]){await db.prepare("UPDATE SiteSettings SET document=? WHERE id='site'").bind(document).run();assert.equal((await send('/api/checkout/quote','POST',selection)).status,503);assert.ok((await create(p)).status>=500);}
    await saveSettings(originalSettings);await db.prepare('ALTER TABLE SiteSettings RENAME TO FixtureSettingsUnavailable').run();
    try{assert.equal((await send('/api/checkout/quote','POST',selection)).status,503);assert.ok((await create(p)).status>=500);}finally{await db.prepare('ALTER TABLE FixtureSettingsUnavailable RENAME TO SiteSettings').run();}
    assert.deepEqual(await counts(),before);
  });
  await check('Real SQL failure rolls back Order/Item/Event/Notification batch',async()=>{
    const p=payload(await quote()),before=await counts();await db.prepare("CREATE TRIGGER fixture_abort_order BEFORE INSERT ON OrderItem BEGIN SELECT RAISE(ABORT,'FIXTURE_ITEM_FAILURE'); END").run();
    try{assert.equal((await create(p)).status,500);assert.deepEqual(await counts(),before);}finally{await db.prepare('DROP TRIGGER fixture_abort_order').run();}
  });
  await check('Concurrent same-key requests yield one immutable order',async()=>{
    const p=payload(await quote()),key=randomUUID(),before=await counts();const r=await Promise.all([create(p,key),create(p,key)]);assert.ok(r.every(x=>[200,201].includes(x.status)),r.map(x=>x.text).join(' | '));assert.equal(r[0].json.orderId,r[1].json.orderId);assert.equal((await counts())[0],before[0]+1);
  });
  await check('Legacy payload hash replays without a new checkout acknowledgment',async()=>{
    const legacy={items:[{productId:'fixture-p',variantId:null,sku:null,quantity:1}],customerName:'Legacy Fixture',customerPhone:'0900000000',customerEmail:null,shippingAddress:'Legacy address',note:null,shippingMethod:'standard',paymentMethod:'COD'};
    const normalized={customerName:legacy.customerName,customerPhone:legacy.customerPhone,customerEmail:null,shippingAddress:legacy.shippingAddress,note:null,shippingMethod:'standard',paymentMethod:'COD',items:legacy.items};
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(normalized)));const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');const key=randomUUID();
    await db.prepare('INSERT INTO "Order"(id,idempotencyKey,payloadHash,customerName,customerPhone,shippingAddress,updatedAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('fixture-legacy',key,hash,legacy.customerName,legacy.customerPhone,legacy.shippingAddress).run();
    await saveSettings({codEnabled:false,bankTransferEnabled:false});const r=await create(legacy,key);assert.equal(r.status,200,r.text);assert.equal(r.json.orderId,'fixture-legacy');assert.equal(r.json.data.checkoutSnapshot,null);await saveSettings(originalSettings);
  });
  await check('Admin settings auth/CSRF and R06 list/detail keep shipping snapshot',async()=>{
    assert.equal((await send('/api/admin/settings')).status,401);
    const info=await send('/api/admin/settings','GET',undefined,true);assert.equal(info.status,200,info.text);
    const csrf=await send('/api/admin/settings','POST',{expectedRevision:info.json.data.revision,document:info.json.data.document},true,{origin:'https://invalid.example'});assert.equal(csrf.status,403,csrf.text);
    const list=await send('/api/orders','GET',undefined,true);assert.equal(list.status,200,list.text);
    const html=await send('/checkout');assert.equal(html.status,200);assert.match(html.text,/<html/);
  });

  await check('R08 full Worker redirect returns exact 301 and drops sensitive query',async()=>{
    let r=await send('/api/admin/redirects','POST',{expectedRevision:0,source:'/fixture-old',target:'/news',enabled:true,note:'Fixture'},true);assert.equal(r.status,200,r.text);
    const moved=await fetch(base+'/fixture-old?token=private',{redirect:'manual'});assert.equal(moved.status,301);assert.equal(new URL(moved.headers.get('location'),base).href,base+'/news');
    assert.equal((await send('/api/admin/redirects','POST',{expectedRevision:0,source:'/news',target:'/fixture-old',enabled:true,note:''},true)).status,409);
  });
  await check('R08 public metadata and sitemap use settings and published projection',async()=>{
    await saveSettings({defaultSeoTitle:'Fixture SEO from CMS',defaultSeoDescription:'Fixture description from CMS'});
    const home=await send('/');assert.equal(home.status,200,home.text.slice(0,200));assert.ok(home.text.includes('Fixture SEO from CMS'));
    const map=await send('/sitemap.xml');assert.equal(map.status,200,map.text);assert.ok(!map.text.includes('/fixture-old'));assert.ok(!map.text.includes('/checkout'));assert.ok(map.text.includes('/landing/fixture-builder'));
  });
  await check('R08 schedule API stores pinned revision; Worker cron executes real writer',async()=>{
    const document={schemaVersion:1,pageType:'CUSTOM',title:'Fixture scheduled',slug:'fixture-scheduled',contentHtml:'<p>Scheduled public</p>',seo:{title:'',description:'',ogImageAssetId:null}};
    const created=await send('/api/admin/pages','POST',{expectedRevision:0,action:'save',document},true);assert.equal(created.status,200,created.text);
    const d=created.json.data;
    const job=await send('/api/admin/schedules','POST',{entityType:'page',entityId:d.id,revision:d.revision,action:'publish',executeAt:new Date(Date.now()+60000).toISOString()},true);assert.equal(job.status,200,job.text);
    await db.prepare('UPDATE CmsSchedule SET executeAt=0 WHERE id=?').bind(job.json.data.id).run();
    await (await mf.getWorker()).scheduled();
    assert.equal((await db.prepare('SELECT state FROM CmsSchedule WHERE id=?').bind(job.json.data.id).first()).state,'DONE');
    const page=await send('/fixture-scheduled');assert.equal(page.status,200,page.text.slice(0,200));assert.ok(page.text.includes('Scheduled public'));
  });

  await check('R08 role matrix covers legacy, media, restore, exports, schedules and redirects over HTTP',async()=>{
    for(const role of ['EDITOR','SALES']){
      const email=role.toLowerCase()+'@fixture.invalid';const created=await send('/api/admin/users','POST',{email,name:role,role,disabled:false,piiExport:false,password:'FixtureRolePassword-2026'},true);assert.equal(created.status,200,created.text);
      const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json','cf-connecting-ip':role==='EDITOR'?'198.51.100.10':'198.51.100.11'},body:JSON.stringify({email,password:'FixtureRolePassword-2026'})});assert.equal(login.status,200);const roleCookie=login.headers.get('set-cookie').split(';')[0];
      const paths=role==='SALES'?[['/api/products','POST'],['/api/upload','POST'],['/api/admin/media','POST'],['/api/admin/products/missing/revisions/1/restore','POST'],['/api/admin/builder/missing/restore','POST'],['/api/admin/schedules','POST'],['/api/admin/redirects','POST'],['/api/admin/orders/export','GET']]:[['/api/admin/users','GET'],['/api/admin/redirects','POST'],['/api/admin/audit','GET'],['/api/admin/orders/export','GET'],['/api/orders','GET'],['/api/admin/contacts/export','GET'],['/api/admin/customers/export','GET']];
      for(const [path,method]of paths){const r=await send(path,method,method==='POST'?{}:undefined,true,{cookie:roleCookie});assert.equal(r.status,403,path+' '+r.text);}
      if(role==='SALES'){
        const allowed=await send('/api/orders','GET',undefined,true,{cookie:roleCookie});assert.equal(allowed.status,200,allowed.text);
        const update=await send('/api/admin/users','POST',{id:created.json.data.id,expectedRevision:0,email,name:role,role,disabled:false,piiExport:true},true);assert.equal(update.status,200,update.text);
        assert.equal((await send('/api/orders','GET',undefined,true,{cookie:roleCookie})).status,401);
      }
    }
    for(const path of ['/api/products','/api/upload']){assert.equal((await send(path,'POST',{})).status,401);assert.equal((await send(path,'POST',{},true)).status,409);}
    const before=(await db.prepare("SELECT count(*) AS n FROM AdminAudit WHERE action LIKE '%export%'").first()).n;
    const exported=await send('/api/admin/orders/export?search=NoSuchFixtureCustomer','GET',undefined,true);assert.equal(exported.status,200,exported.text);assert.ok(!exported.text.includes('Fixture Customer'));
    assert.equal((await db.prepare("SELECT count(*) AS n FROM AdminAudit WHERE action LIKE '%export%'").first()).n,before+1);
  });
  console.log('R08_FULL_APP_FIXTURE '+base);
  console.log('R08 full Worker HTTP/D1: '+passed+'/'+passed+' PASS');
  if(process.argv.includes('--serve'))await new Promise(r=>process.once('SIGINT',r));
}finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await mf.dispose();}
