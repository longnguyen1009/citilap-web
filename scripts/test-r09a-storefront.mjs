import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {unstable_splitSqlQuery} from 'wrangler';

await build({stdin:{contents:`
export * from './src/lib/prisma';
export * from './src/server/services/catalog.service';
export * from './src/server/services/search.service';
export * from './src/server/services/pricing.service';
export * from './src/contracts/catalog/search';
export * from './src/contracts/catalog/wishlist';
export {GET as wishlistGET} from './src/app/api/wishlist/route';
export {GET as searchGET} from './src/app/api/search/route';
export {GET as compareGET} from './src/app/api/compare/route';
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',external:['node:*','cloudflare:workers'],outfile:'scripts/.r09a-bundle.mjs',
plugins:[{name:'wasm',setup(b){b.onResolve({filter:/\.wasm/},a=>({path:a.path,external:true}));}}]});
const api=await import('./.r09a-bundle.mjs');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['PRODUCT_MEDIA']}));
let passed=0;
const check=async(name,fn)=>{await fn();console.log(`PASS ${++passed}: ${name}`);};
try {
  const DB=await mf.getD1Database('DB');globalThis.env={DB,PRODUCT_MEDIA:await mf.getR2Bucket('PRODUCT_MEDIA')};api.setD1Database(DB);
  for(const f of (await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort())for(const sql of unstable_splitSqlQuery(await readFile('d1-migrations/'+f,'utf8')))if(sql.trim())await DB.prepare(sql).run();
  const client=api.getPrismaClient(DB);
  await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat','Laptop','laptop',CURRENT_TIMESTAMP)").run();
  for(const [id,price] of [['sale',20000000],['regular',15000000],['variant',30000000],['hidden',1000000],['contact',0]]) {
    await DB.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,stock,ramGb,ram,updatedAt) VALUES(?,?,?,'Fixture',?,'cat','ACTIVE',5,16,'16GB',CURRENT_TIMESTAMP)").bind(id,id,id,price).run();
  }
  await DB.prepare("INSERT INTO ProductStudio(productId,draft,published) VALUES('hidden','{}',NULL),('contact','{}',?)").bind(JSON.stringify({availability:'CONTACT',variants:[]})).run();
  for(const [id,ram,price] of [['v16','16GB',20000000],['v32','32GB',35000000]])await DB.prepare("INSERT INTO ProductVariant(id,productId,sku,name,price,ram,status,options,updatedAt) VALUES(?,'variant',?,?,?,?,'ACTIVE','{}',CURRENT_TIMESTAMP)").bind(id,id,id,price,ram).run();
  const start=new Date('2026-10-17T01:00:00Z'),end=new Date('2026-10-17T02:00:00Z');
  await DB.prepare("INSERT INTO PromotionCampaign(id,name,status,startAt,endAt) VALUES('campaign','Fixture','PUBLISHED',?,?)").bind(start.toISOString(),end.toISOString()).run();
  await DB.prepare("INSERT INTO PromotionCampaignItem(id,campaignId,productId,variantId,salePrice,regularPrice) VALUES('item','campaign','sale',NULL,10000000,20000000),('variant-item','campaign','variant','v32',12000000,35000000)").run();
  const context=await api.getStorefrontPricingContext(DB,start);
  await check('Shared query bounds, reversed ranges, repeated facets and page 101',()=>{
    for(const q of ['page=NaN','page=1.2','limit=100','minPrice=20&maxPrice=10','ram=NaN','page=Infinity'])assert.equal(api.parseSearchParams(new URLSearchParams(q)).success,false,q);
    const parsed=api.parseSearchParams(new URLSearchParams('ram=16&ram=32&page=101&pricePreset=20m-25m'));
    assert.equal(parsed.success,true);assert.deepEqual(parsed.data.ram,[16,32]);assert.equal(parsed.data.page,101);assert.equal(parsed.data.maxPrice,25000000);
  });
  await check('Wishlist migration keeps bounded IDs only, including malformed storage',()=>{
    assert.deepEqual(api.wishlistIds([{productId:'sale',price:'old',name:'private'},null,{productId:2},'sale','../bad']),['sale']);
    assert.deepEqual(api.wishlistIds({version:2,ids:['sale']}),[]);
    assert.equal(api.wishlistIds(Array.from({length:110},(_,i)=>'p'+i)).length,100);
  });
  await check('Search campaign price filters before sorting/pagination; contact is not zero-price inventory',async()=>{
    const r=await api.searchProducts({maxPrice:13000000,sort:'price-asc',limit:1},client,context,start);
    assert.equal(r.totalCount,2);assert.equal(r.products[0].id,'sale');assert.equal(r.products[0].price,10000000);
    const next=await api.searchProducts({maxPrice:13000000,sort:'price-asc',limit:1,page:2},client,context,start);
    assert.equal(next.products[0].variantId,'v32');assert.equal(next.products[0].price,12000000);
  });
  await check('Listing and search agree on same matching discounted variant at start/end',async()=>{
    for(const [at,total] of [[new Date(start.getTime()-1),0],[start,1],[end,0]]) {
      const ctx=await api.getStorefrontPricingContext(DB,at);
      const options={ram:[32],maxPrice:13000000,sort:'price-asc'};
      const search=await api.searchProducts(options,client,ctx,at),listing=await api.getCategoryFilteredProducts(options,client,ctx,at);
      assert.equal(search.totalCount,total);assert.equal(listing.totalCount,total);
      if(total){assert.equal(search.products[0].variantId,'v32');assert.equal(listing.products[0].variantId,'v32');}
    }
  });
  await check('Wishlist resolver hides unpublished products and rejects unsafe IDs',async()=>{
    const r=await api.wishlistGET(new Request('http://fixture/api/wishlist?ids=hidden,sale'));
    assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();assert.deepEqual(body.products.map(p=>p.id),['sale']);assert.deepEqual(body.unavailableIds,['hidden']);
    assert.equal((await api.wishlistGET(new Request('http://fixture/api/wishlist?ids=../bad'))).status,400);
  });
  await check('PDP rejects unknown requested variant instead of selecting another SKU',async()=>{
    assert.equal(await api.getProductDetail('variant','missing',client),null);
  });
  await check('Real pagination beyond page 100 and deterministic ID tie-break',async()=>{
    for(let offset=0;offset<1202;offset+=100)await DB.batch(Array.from({length:Math.min(100,1202-offset)},(_,i)=>{
      const id='paged-'+String(offset+i).padStart(4,'0');return DB.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt,createdAt) VALUES(?,?,?,'Fixture',5000000,'cat','ACTIVE',CURRENT_TIMESTAMP,'2026-01-01')").bind(id,id,id);
    }));
    const r=await api.searchProducts({query:'paged',page:101,limit:12,sort:'price-asc'},client,context,start);
    assert.equal(r.totalCount,1202);assert.deepEqual(r.products.map(p=>p.id),['paged-1200','paged-1201']);
    const ids=Array.from({length:100},(_,i)=>'paged-'+String(i).padStart(4,'0'));
    assert.equal((await api.resolveProductsByIds(ids,client,context,start)).length,100);
  });
  await check('Vietnamese accented/unaccented search resolves normalized public slug',async()=>{
    await DB.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES('accent','Máy Đồ Họa','may-do-hoa','Fixture',5000000,'cat','ACTIVE',CURRENT_TIMESTAMP)").run();
    for(const query of ['đồ họa','do hoa'])assert.deepEqual((await api.searchProducts({query},client,context,start)).products.map(p=>p.id),['accent']);
  });
  await check('Compare specs describe the same representative variant as its price',async()=>{
    const response=await api.compareGET(new Request('http://fixture/api/compare?ids=variant'));
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.products[0].price,20000000);
    assert.equal(body.specs.find(row=>row.key==='RAM').values.variant,'16GB');
  });
  await check('Read failures return errors, not empty catalog or successful compare',async()=>{
    await DB.prepare('ALTER TABLE Product RENAME TO FixtureProduct').run();
    try {
      assert.equal((await api.wishlistGET(new Request('http://fixture/api/wishlist?ids=sale'))).status,503);
      assert.equal((await api.compareGET(new Request('http://fixture/api/compare?ids=sale'))).status,503);
      assert.equal((await api.searchGET(new Request('http://fixture/api/search'))).status,500);
    } finally {await DB.prepare('ALTER TABLE FixtureProduct RENAME TO Product').run();}
  });
  console.log(`R09A service/handler: ${passed}/${passed} PASS; disposable D1/R2, not browser or production proof.`);
} finally {await mf.dispose();}
