import assert from 'node:assert/strict';
const base=process.argv[2];
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base||''))throw Error('Explicit isolated localhost fixture URL required');
const session=await fetch(base+'/__fixture/session',{redirect:'manual'});
const cookie=session.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie,'Fixture session missing');
let passed=0;
const detail=await fetch(base+'/api/admin/navigation',{headers:{cookie}}).then(r=>r.json());
if(!detail.data.document.categories.length){
  detail.data.document.categories.push({id:'fixture-cat',name:'Fixture Laptops',slug:'fixture-laptops',description:'Fixture',parentId:null,visible:true,image:'',assetId:'',alt:'Fixture'});
  const r=await fetch(base+'/api/admin/navigation',{method:'PUT',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({expectedRevision:detail.data.revision,action:'publish',document:detail.data.document})});assert.equal(r.status,200,await r.text());
}
async function get(path){const r=await fetch(base+path,{headers:{cookie}});const text=await r.text();assert.equal(r.status,200,`${path}: ${r.status} ${text.slice(0,150)}`);return {text,json:()=>JSON.parse(text)};}
async function check(name,fn){await fn();console.log(`PASS ${++passed}: ${name}`);}
await check('Search and suggestions expose campaign price',async()=>{
  for(const path of ['/api/search?q=Fixture','/api/search/suggestions?q=Fixture']){const r=(await get(path)).json();const products=r.data.products;assert.equal(products.find(p=>p.id==='fixture-p').price,15000000);}
});
await check('Recommendations and compare expose campaign price',async()=>{
  const rec=(await get('/api/products/fixture-q/recommendations')).json();assert.equal(rec.data.related.find(p=>p.id==='fixture-p').price,15000000);
  const compare=(await get('/api/compare?ids=fixture-p,fixture-q')).json();assert.equal(compare.products.find(p=>p.id==='fixture-p').price,15000000);
});
await check('Rendered homepage/category/brand/collection/builder contain campaign card price',async()=>{
  for(const path of ['/','/category/fixture-laptops','/brand/fixture-brand','/collection/fixture-collection','/landing/fixture-builder']) {
    const {text}=await get(path);assert.match(text,/Fixture Laptop Alpha/,path);assert.match(text,/15[.,]000[.,]000/,path);
  }
});
await check('PDP rendered price and JSON-LD use campaign price',async()=>{
  const {text}=await get('/product/fixture-p');assert.match(text,/15[.,]000[.,]000/);
  const ld=[...text.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const product=ld.flatMap(x=>Array.isArray(x)?x:[x]).find(x=>x['@type']==='Product');assert.ok(product);assert.equal(Number(product.offers.price),15000000);
});
await check('Campaign stale revision returns real Worker 409 without data changes',async()=>{
  const list=(await get('/api/admin/campaigns')).json().data;const campaign=list.find(c=>c.name==='Fixture Active Campaign');assert.ok(campaign);
  const before=(await get('/api/admin/campaigns/'+campaign.id)).json().data;
  const r=await fetch(base+'/api/admin/campaigns/'+campaign.id,{method:'PUT',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({...before,expectedRevision:999})});
  assert.equal(r.status,409);assert.deepEqual((await get('/api/admin/campaigns/'+campaign.id)).json().data,before);
});
console.log(`Full-app HTTP/rendering: ${passed}/${passed} PASS (real Worker, isolated fixture).`);
