import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

await build({stdin:{contents:`
export * from './src/server/services/pricing.service'; export * from './src/server/services/campaign.service';
export * from './src/server/services/catalog.service'; export * from './src/server/services/brand.service';
export * from './src/server/services/order.service'; export * from './src/lib/prisma'; export * from './src/lib/auth';
export * from './src/server/services/search.service';
export * from './src/server/services/checkout.service';
export {DEFAULT_ADMIN_SETTINGS} from './src/contracts/cms/settings';
export {POST as cartPOST} from './src/app/api/cart/revalidate/route';
export {PUT as campaignPUT,DELETE as campaignDELETE} from './src/app/api/admin/campaigns/[id]/route';
export {POST as publishPOST} from './src/app/api/admin/campaigns/[id]/publish/route';
export {POST as archivePOST} from './src/app/api/admin/campaigns/[id]/archive/route';`,resolveDir:process.cwd()},
bundle:true,platform:'node',format:'esm',external:['cloudflare:workers','node:*'],outfile:'scripts/.r07b-4-bundle.mjs',
plugins:[{name:'fixture',setup(b){b.onResolve({filter:/\.wasm/},a=>({path:a.path,external:true}));b.onResolve({filter:/^server-only$/},a=>({path:a.path,namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}));}}]});
const api=await import('./.r07b-4-bundle.mjs');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['PRODUCT_MEDIA']}));
let passed=0,server,fixtureMode='ready';
let browserBundle;
if(process.argv.includes('--serve')) {
  browserBundle=(await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {CartProvider,useCart} from './src/context/CartContext'; import Status from './src/components/cart/CartValidationStatus';
function App(){const c=useCart();return <><h1>R07B.4 component fixture</h1><input aria-label="Customer name" defaultValue="Saved customer"/><Status/><pre>{JSON.stringify(c.cart)}</pre><p>Quantity: {c.cartCount}</p><button disabled={!c.checkoutReady}>Checkout</button><button onClick={()=>c.addToCart({id:'p',productId:'p',name:'Fixture product',price:20000000,displayPrice:'20000000',image:'',quantity:1})}>Add item</button><button onClick={()=>c.updateQuantity('p',c.cartCount+1)}>Increase quantity</button><button onClick={()=>void c.revalidateCart()}>Retry</button>{['ready','unavailable','error','delay'].map(m=><button key={m} onClick={()=>fetch('/fixture/'+m,{method:'POST'}).then(()=>c.revalidateCart())}>{m}</button>)}</>};createRoot(document.getElementById('root')).render(<CartProvider><App/></CartProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'}})).outputFiles[0].text;
}
const check=async(name,fn)=>{await fn();console.log(`PASS ${++passed}: ${name}`);};
try {
  const db=await mf.getD1Database('DB');
  globalThis.env={DB:db,PRODUCT_MEDIA:await mf.getR2Bucket('PRODUCT_MEDIA')};api.setD1Database(db);
  for(const f of (await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort())for(const sql of unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`,'utf8')))if(sql.trim())await db.prepare(sql).run();
  await db.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat','Fixture','fixture',CURRENT_TIMESTAMP)").run();
  await db.prepare("INSERT INTO Brand(id,name,slug,updatedAt) VALUES('brand','Fixture Brand','fixture-brand',CURRENT_TIMESTAMP)").run();
  for(const id of ['p','q'])await db.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,brandId,status,isFeatured,updatedAt) VALUES(?,?,?,'Fixture',20000000,'cat','brand','ACTIVE',1,CURRENT_TIMESTAMP)").bind(id,id,id).run();
  const settings={flashSaleEnabled:false,flashSaleTitle:'',flashSaleStartAt:'',flashSaleEndAt:''};
  const resolve=(extra={})=>api.resolvePrice({productId:'p',settings,explicitDb:db,...extra});
  await check('Legacy without Studio remains orderable',async()=>assert.equal((await resolve()).effectivePrice,20000000));
  await db.prepare("INSERT INTO ProductStudio(productId,draft,published) VALUES('p','{}',NULL)").run();
  await check('Unpublished rejected through D1 and Prisma',async()=>{
    await assert.rejects(resolve(),e=>e.code==='PRODUCT_NOT_AVAILABLE');
    await assert.rejects(resolve({explicitDb:undefined,client:api.getPrismaClient(db)}),e=>e.code==='PRODUCT_NOT_AVAILABLE');
  });
  await check('CONTACT/UNAVAILABLE rejected; AVAILABLE/PREORDER accepted',async()=>{
    for(const availability of ['CONTACT','UNAVAILABLE','AVAILABLE','PREORDER']){
      await db.prepare('UPDATE ProductStudio SET published=?').bind(JSON.stringify({availability,variants:[]})).run();
      if(['AVAILABLE','PREORDER'].includes(availability))assert.equal((await resolve()).effectivePrice,20000000);
      else await assert.rejects(resolve(),e=>e.code==='PRODUCT_NOT_AVAILABLE');
    }
  });
  await check('Stale prefetched objects cannot override live inactive/deleted target or price',async()=>{
    const product={id:'q',price:1,status:'ACTIVE',isFlashSale:false};
    assert.equal((await resolve({product})).effectivePrice,20000000);
    await db.prepare("UPDATE Product SET status='INACTIVE' WHERE id='p'").run();
    await assert.rejects(resolve({product}),e=>e.code==='PRODUCT_NOT_AVAILABLE');
    await db.prepare("UPDATE Product SET status='ACTIVE',deletedAt=CURRENT_TIMESTAMP WHERE id='p'").run();
    await assert.rejects(resolve({product}),e=>e.code==='PRODUCT_NOT_FOUND');
    await db.prepare("UPDATE Product SET deletedAt=NULL WHERE id='p'").run();
  });
  const doc={name:'Fixture',status:'DRAFT',startAt:'2035-01-01T00:00:00.000Z',endAt:'2035-02-01T00:00:00.000Z',items:[{productId:'p',variantId:null,salePrice:15000000,regularPrice:20000000}]};
  const campaign=await api.saveCampaign(doc,db);
  const snapshot=()=>Promise.all([db.prepare('SELECT * FROM PromotionCampaign WHERE id=?').bind(campaign.id).first(),db.prepare('SELECT * FROM PromotionCampaignItem WHERE campaignId=? ORDER BY id').bind(campaign.id).all().then(r=>r.results)]);
  await check('CAS loser after read preserves all winner fields/items',async()=>{
    let winner;
    const raced={prepare:db.prepare.bind(db),batch:async statements=>{
      await api.saveCampaign({...doc,id:campaign.id,expectedRevision:0,name:'Winner',items:[{...doc.items[0],salePrice:16000000}]},db);
      winner=await snapshot();return db.batch(statements);
    }};
    await assert.rejects(api.saveCampaign({...doc,id:campaign.id,expectedRevision:0,name:'Loser'},raced),e=>e.code==='CAMPAIGN_REVISION_CONFLICT');
    assert.deepEqual(await snapshot(),winner);
  });
  await check('Real SQL item-insert failure rolls back deletion and metadata',async()=>{
    const before=await snapshot();
    await db.prepare("CREATE TRIGGER fixture_abort BEFORE INSERT ON PromotionCampaignItem WHEN NEW.salePrice=1234567 BEGIN SELECT RAISE(ABORT,'FIXTURE_INSERT_FAILURE'); END").run();
    await assert.rejects(api.saveCampaign({...doc,id:campaign.id,expectedRevision:1,name:'Failed',items:[{...doc.items[0],salePrice:1234567}]},db),/FIXTURE_INSERT_FAILURE/);
    assert.deepEqual(await snapshot(),before);await db.prepare('DROP TRIGGER fixture_abort').run();
  });
  await check('Concurrent create-PUBLISHED admits one overlapping winner',async()=>{
    const results=await Promise.allSettled([api.saveCampaign({...doc,status:'PUBLISHED'},db),api.saveCampaign({...doc,status:'PUBLISHED'},db)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const winner=results.find(r=>r.status==='fulfilled').value;
    await api.archiveCampaign(winner.id,winner.revision,db);
  });
  await check('Concurrent published updates and item-change versus publish keep one winner',async()=>{
    for(const publish of [false,true]) {
      const a=await api.saveCampaign({...doc,status:'PUBLISHED',items:[{...doc.items[0],productId:'q'}]},db);
      const b=await api.saveCampaign({...doc,status:publish?'DRAFT':'PUBLISHED',...(publish?{}:{startAt:'2036-01-01T00:00:00Z',endAt:'2036-02-01T00:00:00Z'})},db);
      const outcomes=await Promise.allSettled([
        api.saveCampaign({...doc,id:a.id,expectedRevision:a.revision,status:'PUBLISHED'},db),
        publish ? api.publishCampaign(b.id,b.revision,db) : api.saveCampaign({...doc,id:b.id,expectedRevision:b.revision,status:'PUBLISHED'},db)
      ]);
      assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
      for(const id of [a.id,b.id]) {const row=await db.prepare('SELECT revision FROM PromotionCampaign WHERE id=?').bind(id).first();await api.archiveCampaign(id,row.revision,db);}
    }
  });
  // Real TCP HTTP, exported handlers, isolated DB; never an existing dev server.
  process.env.ADMIN_API_TOKEN=crypto.randomUUID()+crypto.randomUUID();
  const session=api.createAdminSession();
  server=createServer(async(req,res)=>{try{
    if(browserBundle && req.method==='GET') {res.setHeader('content-type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?browserBundle:'<!doctype html><html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script></html>');return;}
    if(browserBundle && req.url.startsWith('/fixture/')){fixtureMode=req.url.split('/').pop();await db.prepare('UPDATE ProductStudio SET published=?').bind(fixtureMode==='unavailable'?null:JSON.stringify({availability:'AVAILABLE',variants:[]})).run();res.end('ok');return;}
    if(browserBundle && req.url==='/api/cart/revalidate') {if(fixtureMode==='error'){res.writeHead(500);res.end('fixture infrastructure failure');return;}if(fixtureMode==='delay')await new Promise(r=>setTimeout(r,1500));}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(['POST','PUT','DELETE'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const path=new URL(request.url).pathname;
    const handler=path==='/api/cart/revalidate'?api.cartPOST:path.endsWith('/publish')?api.publishPOST:path.endsWith('/archive')?api.archivePOST:req.method==='DELETE'?api.campaignDELETE:api.campaignPUT;
    const result=await handler(request,{params:Promise.resolve({id:campaign.id})});
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());
  }catch{res.writeHead(500);res.end('fixture failure');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const http=(path,method,body,headers={})=>fetch(base+path,{method,headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  const auth={cookie:`admin_session=${session}`,origin:base};
  await check('HTTP admin mutation 401 and cross-site cookie CSRF 403',async()=>{
    assert.equal((await http('/api/admin/campaigns/c','PUT',doc)).status,401);
    assert.equal((await http('/api/admin/campaigns/c','PUT',doc,{...auth,origin:'https://foreign.invalid','sec-fetch-site':'cross-site'})).status,403);
  });
  await check('HTTP all mutation aliases validate revision and stale 409 without changes',async()=>{
    const before=await snapshot();
    for(const [path,method] of [['/api/admin/campaigns/c','PUT'],['/api/admin/campaigns/c','DELETE'],['/api/admin/campaigns/c/publish','POST'],['/api/admin/campaigns/c/archive','POST']]){
      for(const expectedRevision of [undefined,-1,0.5,'1'])assert.equal((await http(path,method,{...doc,expectedRevision},auth)).status,400);
      assert.equal((await http(path,method,{...doc,expectedRevision:0},auth)).status,409);
    }
    for(const q of ['', '1e0','1.5','-1'])assert.equal((await http('/api/admin/campaigns/c?expectedRevision='+encodeURIComponent(q),'DELETE',{},auth)).status,400);
    assert.deepEqual(await snapshot(),before);
  });
  await check('HTTP cart malformed inputs are 400 before query',async()=>{
    for(const item of [{id:{},productId:'p'},{id:'r',productId:'p',variantId:42},{id:'r',productId:'p',variantId:''},{id:'r',productId:'p',expectedPrice:-1},{id:'r',productId:'p',expectedPrice:1.5},{id:'r',productId:'p',expectedPrice:'1'}])assert.equal((await http('/api/cart/revalidate','POST',{items:[item]})).status,400);
    assert.equal((await http('/api/cart/revalidate','POST',{items:Array.from({length:51},(_,i)=>({id:String(i),productId:'p'}))})).status,400);
  });
  await check('Missing/wrong-parent/inactive variants and hidden/deleted products reject through service and HTTP',async()=>{
    await db.prepare("INSERT INTO ProductVariant(id,productId,sku,name,options,price,status,updatedAt) VALUES('vq','q','vq','Variant','{}',21000000,'ACTIVE',CURRENT_TIMESTAMP)").run();
    for(const variantId of ['missing','vq']) {
      await assert.rejects(resolve({variantId}),e=>e instanceof api.PricingTargetError);
      const res=await http('/api/cart/revalidate','POST',{items:[{id:'r',productId:'p',variantId}]});assert.equal(res.status,200);assert.equal((await res.json()).items[0].available,false);
    }
    await db.prepare("UPDATE ProductVariant SET status='INACTIVE' WHERE id='vq'").run();
    await assert.rejects(resolve({productId:'q',variantId:'vq'}),e=>e instanceof api.PricingTargetError);
    for(const assignment of ["status='INACTIVE'","status='HIDDEN'","status='ACTIVE',deletedAt=CURRENT_TIMESTAMP"]) {
      await db.prepare('UPDATE Product SET '+assignment+" WHERE id='q'").run();
      const res=await http('/api/cart/revalidate','POST',{items:[{id:'r',productId:'q'}]});assert.equal(res.status,200);assert.equal((await res.json()).items[0].available,false);
      await assert.rejects(resolve({productId:'q'}),e=>e instanceof api.PricingTargetError);
    }
    await db.prepare("UPDATE Product SET status='ACTIVE',deletedAt=NULL WHERE id='q'").run();
    await db.prepare("DELETE FROM ProductVariant WHERE id='vq'").run();
  });
  await check('HTTP cart unpublished target unavailable; product query fault 500',async()=>{
    await db.prepare('UPDATE ProductStudio SET published=NULL').run();
    let res=await http('/api/cart/revalidate','POST',{items:[{id:'r',productId:'p'}]});assert.equal(res.status,200);assert.equal((await res.json()).items[0].available,false);
    globalThis.env.DB={prepare(sql){if(sql.includes('SELECT p.id, p.price'))throw Error('FIXTURE_QUERY_FAILURE');return db.prepare(sql);}};
    res=await http('/api/cart/revalidate','POST',{items:[{id:'r',productId:'p'}]});assert.equal(res.status,500);assert.equal((await res.json()).code,'INFRASTRUCTURE_ERROR');globalThis.env.DB=db;
  });
  await check('Catalog/home/category/brand share clock and published filtering at campaign boundaries',async()=>{
    await db.prepare('UPDATE ProductStudio SET published=?').bind(JSON.stringify({availability:'AVAILABLE',variants:[]})).run();
    const active=await api.saveCampaign({...doc,status:'PUBLISHED'},db);
    for(const [time,price] of [['2034-12-31T23:59:59Z',20000000],['2035-01-01T00:00:00Z',15000000],['2035-02-01T00:00:00Z',20000000]]){
      const at=new Date(time),ctx=await api.getStorefrontPricingContext(db,at),client=api.getPrismaClient(db);
      assert.equal((await api.resolvePrice({productId:'p',explicitDb:db,settings:ctx,at})).effectivePrice,price);
      assert.equal((await api.getFeaturedProducts(10,client,ctx,at)).find(p=>p.id==='p').price,price);
      assert.equal((await api.getCategoryProducts('fixture',10,client,ctx,at)).find(p=>p.id==='p').price,price);
      assert.equal((await api.publicBrandWithProducts(db,'fixture-brand',ctx,at)).products.find(p=>p.id==='p').price,price);
      assert.equal((await api.searchProducts({limit:10},client,ctx,at)).products.find(p=>p.id==='p').price,price);
    }
    await db.prepare('UPDATE ProductStudio SET published=NULL').run();
    const at=new Date('2035-01-15Z'),ctx=await api.getStorefrontPricingContext(db,at);
    assert.equal(api.calculateEffectivePrice(20000000,null,false,true,ctx,new Date(doc.endAt),{productId:'p',isVariant:false}).effectivePrice,20000000);
    assert.equal((await api.getFeaturedProducts(10,api.getPrismaClient(db),ctx,at)).some(p=>p.id==='p'),false);
    assert.equal((await api.searchProducts({limit:10},api.getPrismaClient(db),ctx,at)).products.some(p=>p.id==='p'),false);
    await api.archiveCampaign(active.id,active.revision,db);
  });
  await check('Collection availability reads published contract even when stock is zero',async()=>{
    const client=api.getPrismaClient(db);
    for(const availability of ['AVAILABLE','PREORDER','CONTACT']) {
      await db.prepare('UPDATE ProductStudio SET published=?').bind(JSON.stringify({availability,variants:[]})).run();
      const rows=await api.resolveProductsByCriteria({availability,limit:10},client,settings);
      assert.equal(rows.some(p=>p.id==='p'),true);
      const other=await api.resolveProductsByCriteria({availability:availability==='AVAILABLE'?'CONTACT':'AVAILABLE',limit:10},client,settings);
      assert.equal(other.some(p=>p.id==='p'),false);
    }
  });
  await check('Checkout PRICE_CHANGED, immutable snapshots after archive/edit/replay/transition',async()=>{
    await db.prepare("INSERT INTO SiteSettings(id,revision,document) VALUES('site',0,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document").bind(JSON.stringify({...api.DEFAULT_ADMIN_SETTINGS,shippingFee:0,codEnabled:true,bankTransferEnabled:false})).run();
    const now=Date.now();
    const active=await api.saveCampaign({...doc,status:'PUBLISHED',startAt:new Date(now-60000).toISOString(),endAt:new Date(now+3600000).toISOString(),items:[{...doc.items[0],productId:'q'}]},db);
    const selection={items:[{productId:'q',quantity:1}],shippingMethod:'standard',paymentMethod:'COD'};
    const {quote}=await api.calculateCheckout(selection,db);
    const payload={...selection,shippingAddress:'Fixture address',customerName:'Fixture Customer',customerPhone:'0900000000',items:[{productId:'q',quantity:1,expectedPrice:20000000}],checkoutAcknowledgment:{shippingFee:quote.shippingFee,totalAmount:20000000,termsVersion:quote.termsVersion}};
    await assert.rejects(api.createOrder(payload,'fixture-stale-price',db),e=>e.code==='PRICE_CHANGED');
    payload.items[0].expectedPrice=15000000;
    payload.checkoutAcknowledgment.totalAmount=quote.totalAmount;
    const created=await api.createOrder(payload,'fixture-snapshot',db);
    const snapshot=()=>db.prepare('SELECT priceSnapshot,regularPriceSnapshot,compareAtPriceSnapshot,campaignSnapshot,pricingEvaluatedAt,lineTotal FROM OrderItem WHERE orderId=?').bind(created.order.id).all().then(r=>r.results);
    const before=await snapshot();assert.equal(before[0].priceSnapshot,15000000);assert.ok(before[0].campaignSnapshot);
    await api.archiveCampaign(active.id,active.revision,db);
    await db.prepare("UPDATE Product SET price=22000000 WHERE id='q'").run();
    assert.equal((await api.createOrder(payload,'fixture-snapshot',db)).isIdempotentReplay,true);
    await api.transitionOrderStatus({orderId:created.order.id,targetStatus:'CONTACTED',expectedRevision:0,reason:'Fixture verification'},db);
    assert.deepEqual(await snapshot(),before);
  });
  console.log(`R07B.4: ${passed}/${passed} PASS; D1/service + handler HTTP fixture, not full-app/browser/staging.`);
  if(browserBundle){await db.prepare('UPDATE ProductStudio SET published=?').bind(JSON.stringify({availability:'AVAILABLE',variants:[]})).run();console.log('BROWSER_FIXTURE '+base);await new Promise(r=>process.once('SIGINT',r));}
} finally {if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}delete globalThis.env;delete process.env.ADMIN_API_TOKEN;await mf.dispose();}
