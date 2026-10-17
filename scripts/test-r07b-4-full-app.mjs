// Local production Worker + real browser assets, isolated ephemeral D1/R2. No .env/config loading.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const root=resolve('dist/server'), clientRoot=resolve('dist/client');
const files=await readdir(root,{recursive:true});
const modules=[{type:'ESModule',path:join(root,'fixture-entry.mjs'),contents:`import app from './index.js';export default {fetch(request,env,ctx){globalThis.env=env;return app.fetch(request,env,ctx)}};`}];
for(const f of files)if(['.js','.wasm'].includes(extname(f)))modules.push({type:f.endsWith('.wasm')?'CompiledWasm':'ESModule',path:join(root,f)});
const token=randomUUID()+randomUUID();
const cookieExpires=Math.floor(Date.now()/1000)+28800;
const cookie=`admin_session=${cookieExpires}.${createHmac('sha256',token).update(String(cookieExpires)).digest('base64url')}`;
const mf=new Miniflare(convertV4MiniflareOptions({modules,modulesRoot:root,compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat','enable_weak_ref','nodejs_compat_populate_process_env'],d1Databases:['DB'],r2Buckets:['PRODUCT_MEDIA'],bindings:{ADMIN_API_TOKEN:token,ADMIN_EMAIL:'fixture@example.invalid',ADMIN_PASSWORD:'FixtureOnlyPassword-2026',CONFIRMATION_TOKEN_SECRET:randomUUID()+randomUUID()},serviceBindings:{ASSETS:async request=>{
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
    const result=await mf.dispatchFetch(base+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch(e){console.error('Fixture host:',e.message);res.writeHead(500);res.end('Fixture host error');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
  await check('Worker renders full cart document and real JS assets',async()=>{const r=await send('/cart');assert.equal(r.status,200);assert.match(r.text,/<html/);assert.match(r.text,/<script/);});
  const now=Date.now();const doc={name:'Fixture Active Campaign',status:'PUBLISHED',startAt:new Date(now-600000).toISOString(),endAt:new Date(now+86400000).toISOString(),items:[{productId:'fixture-p',variantId:null,salePrice:15000000,regularPrice:22000000}]};
  let campaign;
  await check('Full Worker auth and campaign create',async()=>{assert.equal((await send('/api/admin/campaigns','POST',doc)).status,401);const r=await send('/api/admin/campaigns','POST',doc,true);assert.equal(r.status,201,r.text);campaign=r.json.data;});
  await check('Full Worker cart campaign pricing and infrastructure semantics',async()=>{const r=await send('/api/cart/revalidate','POST',{items:[{id:'fixture-p',productId:'fixture-p',expectedPrice:20000000}]});assert.equal(r.status,200,r.text);assert.equal(r.json.items[0].price,15000000);});
  const cart={items:[{id:'fixture-p',productId:'fixture-p',expectedPrice:15000000}]};
  const order={items:[{productId:'fixture-p',quantity:1,expectedPrice:15000000}],customerName:'Fixture HTTP Customer',customerPhone:'0900000000',shippingMethod:'pickup',paymentMethod:'COD'};
  await check('Full Worker unavailable target blocks cart and returns order 409',async()=>{
    await db.prepare("UPDATE Product SET status='INACTIVE' WHERE id='fixture-p'").run();
    try {
      const r=await send('/api/cart/revalidate','POST',cart);assert.equal(r.status,200);assert.equal(r.json.items[0].available,false);
      const o=await send('/api/orders','POST',order,false,{'cf-connecting-ip':'192.0.2.10'});assert.equal(o.status,409,o.text);assert.equal(o.json.error.code,'PRODUCT_UNAVAILABLE');
    }finally{await db.prepare("UPDATE Product SET status='ACTIVE' WHERE id='fixture-p'").run();}
  });
  await check('Full Worker product query failure stays infrastructure error; retry recovers',async()=>{
    await db.prepare('ALTER TABLE Product RENAME TO FixtureProductUnavailable').run();
    try {
      assert.equal((await send('/api/cart/revalidate','POST',cart)).status,500);
      const o=await send('/api/orders','POST',order,false,{'cf-connecting-ip':'192.0.2.11'});assert.equal(o.status,500);assert.equal(o.json.error.code,'ORDER_CREATE_FAILED');
    }finally{await db.prepare('ALTER TABLE FixtureProductUnavailable RENAME TO Product').run();}
    const recovered=await send('/api/cart/revalidate','POST',cart);assert.equal(recovered.status,200);assert.equal(recovered.json.items[0].price,15000000);
  });
  await check('Full Worker PRICE_CHANGED, confirmed order and immutable idempotent snapshots',async()=>{
    const headers={'cf-connecting-ip':'192.0.2.12','idempotency-key':randomUUID()};
    const stale={...order,items:[{...order.items[0],expectedPrice:20000000}]};
    const conflict=await send('/api/orders','POST',stale,false,headers);assert.equal(conflict.status,409,conflict.text);assert.equal(conflict.json.error.code,'PRICE_CHANGED');
    const created=await send('/api/orders','POST',order,false,headers);assert.equal(created.status,201,created.text);
    const id=created.json.orderId;const before=await db.prepare('SELECT * FROM OrderItem WHERE orderId=? ORDER BY id').bind(id).all();assert.equal(before.results[0].price,15000000);
    await db.prepare("UPDATE PromotionCampaign SET status='ARCHIVED',revision=revision+1 WHERE id=?").bind(campaign.id).run();
    await db.prepare("UPDATE Product SET price=23000000 WHERE id='fixture-p'").run();
    const replay=await send('/api/orders','POST',order,false,headers);assert.equal(replay.status,200,replay.text);assert.equal(replay.json.isIdempotentReplay,true);assert.equal(replay.json.orderId,id);
    assert.deepEqual((await db.prepare('SELECT * FROM OrderItem WHERE orderId=? ORDER BY id').bind(id).all()).results,before.results);
    await db.prepare("UPDATE Product SET price=20000000 WHERE id='fixture-p'").run();
    await db.prepare("UPDATE PromotionCampaign SET status='PUBLISHED',revision=revision+1 WHERE id=?").bind(campaign.id).run();
  });
  console.log('FULL_APP_FIXTURE '+base);
  console.log(`Full-app HTTP initial: ${passed}/${passed} PASS. Browser pending.`);
  if(process.argv.includes('--serve'))await new Promise(r=>process.once('SIGINT',r));
}finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await mf.dispose();}
