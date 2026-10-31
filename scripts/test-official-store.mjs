import assert from 'node:assert/strict';
import { matchLaptop, advisorSchema } from '../src/contracts/catalog/advisor.ts';
import { sanitizeHtml } from '../src/lib/sanitize-html.ts';

const base = 'http://localhost:3001';
const home = await fetch(base).then(r => { assert.equal(r.status,200); return r.text(); });
assert(!home.includes('Bản demo CitiLap'));
assert(!home.includes('aria-label="Hỗ trợ chọn máy"'));
assert(home.includes('/brand/citilap-logo.svg'));
assert(/Hộ kinh doanh Citi\s*Lap/i.test(home));
for(const slug of ['chinh-sach-bao-hanh','chinh-sach-doi-tra','chinh-sach-van-chuyen','chinh-sach-bao-mat','huong-dan-mua-hang','dieu-khoan-mua-hang','gioi-thieu','he-thong-cua-hang','cau-hoi-thuong-gap']) {
  const r=await fetch(`${base}/${slug}`); assert.equal(r.status,200,slug);
  const html=await r.text();
  assert(!html.includes('Dự thảo') && !html.includes('Bản dự thảo'),slug);
  assert(/Hộ kinh doanh Citi\s*Lap/i.test(html),slug);
  if(slug==='cau-hoi-thuong-gap')assert.equal((html.match(/<details\b/g)||[]).length,8);
  console.log('PASS published content',slug);
}
for(const path of ['/brand/citilap-logo.svg','/brand/citilap-mark.svg','/brand/citilap-mark.png','/favicon.ico'])assert.equal((await fetch(base+path)).status,200,path);
const product=await fetch(base+'/product/ref-tgs-31242').then(r=>r.text());
assert(product.includes('Giá tham khảo'));
assert(!product.includes('Thêm vào giỏ yêu cầu'));
assert(!product.includes('Gói trải nghiệm local'));
const response=await fetch(base+'/api/checkout/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{productId:'946358af-d257-44bf-807a-d50d4085d4a5',variantId:'local-demo-variant-31242',quantity:1}],shippingMethod:'standard',paymentMethod:'COD'})});
assert.equal(response.status,409,'Reference catalog cannot be purchased as verified stock');
const input=advisorSchema.parse({budget:20000000});
const ref={price:15000000,condition:'NEW',availability:'CONTACT',specs:{ram:'16GB'}};
assert.match(matchLaptop(input,ref,{}).reasons[0],/Giá tham khảo/);
for(const variant of [{price:0},{price:21000000},{availability:'UNAVAILABLE'},{availability:'PREORDER'}])assert.equal(matchLaptop(input,{...ref,...variant},{}),null);
const advisor=await fetch(base+'/chon-laptop?budget=20000000').then(r=>r.text());
assert(advisor.includes('Giá tham khảo'));
assert.equal(sanitizeHtml('<details onclick="bad()"><summary onmouseover="bad()">Q</summary><p>A</p></details>'),'<details><summary>Q</summary><p>A</p></details>');
console.log('PASS branding, removed strips, reference purchase guard, advisor and safe FAQ');
