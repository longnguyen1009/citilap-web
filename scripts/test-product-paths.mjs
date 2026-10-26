import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const base = process.argv[2] || 'http://localhost:3001';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const root = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates = readdirSync(root).filter(f=>f.endsWith('.sqlite')).filter(f=>{const db=new DatabaseSync(resolve(root,f),{readOnly:true});try{return !!db.prepare("SELECT name FROM sqlite_master WHERE name='ProductInspection'").get();}finally{db.close();}});
assert.equal(candidates.length,1);
const db = new DatabaseSync(resolve(root,candidates[0]),{readOnly:true});
try {
  const targets = ['LAPTOP','BAG'].map(template=>db.prepare("SELECT p.id,p.slug,p.tags,(SELECT sku FROM ProductVariant v WHERE v.productId=p.id ORDER BY v.price LIMIT 1) sku FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE json_extract(s.published,'$.template')=? AND p.status='ACTIVE' ORDER BY p.id LIMIT 1").get(template));
  for(const [index,product] of targets.entries()){
    assert(product);
    const path=`/${index?'phu-kien':'laptop'}/${product.slug}`;
    const response=await fetch(base+path);assert.equal(response.status,200,path);
    const html=await response.text();assert(html.includes(`https://citilap.vn${path}`),'Canonical '+path);
    for(const legacy of [`/san-pham/${product.slug}`,`/product/${product.id}`,`/${index?'laptop':'phu-kien'}/${product.slug}`]){
      const r=await fetch(base+legacy+'?sku='+encodeURIComponent(product.sku)+'&source=legacy',{redirect:'manual'});
      assert([301,308].includes(r.status),legacy+' '+r.status);
      const target=new URL(r.headers.get('location'),base);assert.equal(target.pathname,path);assert.equal(target.searchParams.get('source'),'legacy');assert.equal(target.searchParams.get('sku'),product.sku);
    }
  }
  for(const path of ['/laptop-gaming','/laptop-gaming/lenovo','/laptop-gaming/lenovo-legion','/laptop-gaming/lenovo-legion/legion-5-2023','/phu-kien/ram-ssd','/news','/gioi-thieu']){
    const response=await fetch(base+path);assert.equal(response.status,200,path+' '+response.status);
  }
  const old=await fetch(base+'/laptop-gaming/lenovo/lenovo-legion',{redirect:'manual'});assert([301,308].includes(old.status));assert.equal(new URL(old.headers.get('location'),base).pathname,'/laptop-gaming/lenovo-legion');
  const sitemap=await fetch(base+'/sitemap.xml').then(r=>r.text());assert(sitemap.includes('/laptop/'));assert(sitemap.includes('/phu-kien/'));assert(!sitemap.includes('/san-pham/'));
  const invalid=await fetch(base+'/api/search?tag='+encodeURIComponent('x'.repeat(61)));assert.equal(invalid.status,400);
  const absent=await fetch(base+'/api/search?tag=tag-does-not-exist-qa').then(r=>r.json());assert.equal(absent.data.totalCount,0);
  const tag=JSON.parse(targets[0].tags)[0];
  const filtered=await fetch(base+'/api/search?tag='+encodeURIComponent(tag)).then(r=>r.json());assert(filtered.success);assert(filtered.data.totalCount>0);assert(filtered.data.products.every(p=>p.href?.startsWith('/laptop/')||p.href?.startsWith('/phu-kien/')));
  console.log('PASS local HTTP: laptop/accessory canonical and legacy/wrong-prefix redirects preserve query; 1–4 category levels; accessory category; news/pages; sitemap; validated exact tag filter.');
}finally{db.close();}
