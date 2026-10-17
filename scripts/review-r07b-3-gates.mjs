// Independent review: ephemeral D1, route handler only; no dev server or real DB.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

await build({stdin:{contents:`export * from './src/server/services/pricing.service'; export * from './src/server/services/campaign.service'; export {POST as cartPOST} from './src/app/api/cart/revalidate/route';`,resolveDir:process.cwd()},
  bundle:true,platform:'node',format:'esm',external:['cloudflare:workers','node:*'],outfile:'scripts/.review-r07b-3-bundle.mjs',
  plugins:[{name:'review-externals',setup(b){
    b.onResolve({filter:/\.wasm/},a=>({path:a.path,external:true}));
    b.onResolve({filter:/^server-only$/},a=>({path:a.path,namespace:'empty'}));
    b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}));
  }}]});
const api=await import('./.review-r07b-3-bundle.mjs');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("review")}}',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']}));
const findings=[];
const report=(name,actual,defectReproduced)=>{findings.push({name,actual,defectReproduced});console.log(JSON.stringify(findings.at(-1)));assert.equal(defectReproduced,false,name);};
try {
  const db=await mf.getD1Database('DB');
  for(const f of (await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort())
    for(const sql of unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`,'utf8')))if(sql.trim())await db.prepare(sql).run();
  await db.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('review-cat','Review','review-cat',CURRENT_TIMESTAMP)").run();
  await db.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES('review-p','Review','review-p','Review',20000000,'review-cat','ACTIVE',CURRENT_TIMESTAMP)").run();
  await db.prepare("INSERT INTO ProductStudio(productId,draft,published) VALUES('review-p','{}',NULL)").run();
  globalThis.env={DB:db,PRODUCT_MEDIA:{}};
  const settings={flashSaleEnabled:false,flashSaleTitle:'',flashSaleStartAt:'',flashSaleEndAt:''};
  let resolved,error;
  try{resolved=await api.resolvePrice({productId:'review-p',settings,explicitDb:db});}catch(e){error=e;}
  report('Active identity with Studio published=NULL must not expose/order private draft',error?.code || resolved?.effectivePrice,!error);
  await db.prepare("UPDATE Product SET status='INACTIVE' WHERE id='review-p'").run();
  resolved=error=undefined;
  try{resolved=await api.resolvePrice({productId:'review-p',settings,explicitDb:db,product:{id:'review-p',price:20000000,originalPrice:null,status:'ACTIVE',isFlashSale:false,variants:[]}});}catch(e){error=e;}
  report('Stale prefetched ACTIVE product must not authorize now-INACTIVE target',error?.code || resolved?.effectivePrice,!error);
  const post=items=>api.cartPOST(new Request('http://fixture.invalid/api/cart/revalidate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items})}));
  const invalid=await post([{id:'row',productId:'review-p',variantId:42}]);
  report('Wrong variantId type must be validation 400, not infrastructure 500',invalid.status,invalid.status!==400);
  const idInvalid=await post([{id:{bad:true},productId:'review-p'}]);
  report('Non-string cart item ID must be validation 400',idInvalid.status,idInvalid.status!==400);
  // Fault only product query while settings/campaign queries retain real DB behavior.
  globalThis.env.DB={prepare(sql){if(sql.includes('SELECT p.id, p.price'))throw new Error('FIXTURE_PRODUCT_QUERY_FAILURE');return db.prepare(sql);}};
  const fault=await post([{id:'row',productId:'review-p'}]);
  assert.equal(fault.status,500);
  assert.equal((await fault.json()).code,'INFRASTRUCTURE_ERROR');
  report('Product-only query failure remains infrastructure error',500,false);
  await db.prepare("UPDATE Product SET status='ACTIVE' WHERE id='review-p'").run();
  await db.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES('review-p2','Review 2','review-p2','Review',20000000,'review-cat','ACTIVE',CURRENT_TIMESTAMP)").run();
  const doc={name:'Review A',status:'PUBLISHED',startAt:'2031-01-01T00:00:00.000Z',endAt:'2031-01-05T00:00:00.000Z',items:[{productId:'review-p',variantId:null,salePrice:15000000,regularPrice:20000000}]};
  const a=await api.saveCampaign(doc,db);
  const b=await api.saveCampaign({...doc,name:'Review B',startAt:'2031-01-10T00:00:00.000Z',endAt:'2031-01-15T00:00:00.000Z'},db);
  error=undefined;
  try{await api.saveCampaign({...doc,id:a.id,expectedRevision:a.revision,startAt:b.startAt,endAt:b.endAt,items:[{...doc.items[0],productId:'review-p2'}]},db);}catch(e){error=e;}
  report('Published update moving both target/time to non-overlapping final state must succeed',error?.code || 'success',Boolean(error));
  process.exitCode=findings.some(f=>f.defectReproduced)?1:0;
}finally{delete globalThis.env;await mf.dispose();}
