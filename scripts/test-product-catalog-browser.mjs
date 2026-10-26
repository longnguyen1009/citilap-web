import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const profile = await mkdtemp(resolve('.wrangler/product-catalog-chrome-'));
const chrome = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws, sequence=0;
const calls=new Map(), errors=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<120;i++){const value=await fn();if(value)return value;await delay(250);}throw Error('Timed out: '+label);}
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{calls.delete(id);reject(Error(method));},45000);calls.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const categoryPath = '/laptop-gaming';
async function navigate(path) {
  await cdp('Page.navigate',{url:base+path});
  await until(()=>js(`location.pathname===${JSON.stringify(path.split('?')[0])} && location.search===${JSON.stringify(path.includes('?') ? path.slice(path.indexOf('?')) : '')} && document.readyState==='complete' && !!document.querySelector('main')`),path);
}
async function shot(name){
  await delay(400);
  const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile('.wrangler/product-catalog-evidence/'+name+'.png',Buffer.from(r.data,'base64'));
}
async function clickAndWait(selector, expected) {
  await js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await until(()=>js(`location.pathname+location.search===${JSON.stringify(expected)} && document.readyState==='complete'`),'Navigate '+expected);
  await until(()=>js("!!document.querySelector('main h1')"),'Rendered results');
}
try {
  for(const [path,target] of [['/category','/phan-loai'],['/phan-loai/laptop-gaming',categoryPath],['/category/laptop-gaming',categoryPath],['/phan-loai/laptop-gaming/lenovo-legion',categoryPath+'/lenovo-legion']]){
    const r=await fetch(base+path+'?brand=lenovo&tag=gaming',{redirect:'manual'});
    assert([301,308].includes(r.status),path+' status '+r.status);
    const url=new URL(r.headers.get('location'),base);
    assert.equal(url.pathname,target);assert.equal(url.searchParams.get('brand'),'lenovo');assert.equal(url.searchParams.get('tag'),'gaming');
  }
  assert.equal((await fetch(base+'/laptop-gaming/not-a-category')).status,404);
  const navigation=await fetch(base+'/api/catalog/navigation').then(r=>r.json());
  const nav=navigation.data || navigation;
  const sitemap=await fetch(base+'/sitemap.xml').then(r=>r.text());
  assert(sitemap.includes('/laptop-gaming/lenovo-legion'));
  assert(!sitemap.includes('<loc>https://citilap.vn/category'));
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome');
  const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
  await cdp('Page.enable');await cdp('Runtime.enable');
  await mkdir('.wrangler/product-catalog-evidence',{recursive:true});
  await navigate('/phan-loai');
  assert.equal(await js("document.querySelectorAll('main article').length"),0,'Index lists categories, not products');
  assert(await js("!!document.querySelector('main a[href=\"/laptop-gaming\"]')"));
  if(!process.argv.includes('--interactions-only')) await shot('category-index');
  for(const width of process.argv.includes('--interactions-only') ? [] : [1440,768,390,320]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await navigate(categoryPath);
    assert(await js("document.querySelectorAll('main article').length>0"),'Product list');
    assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'No overflow '+width);
    assert(await js("document.querySelector('form[role=search]')?.method==='get'"),'GET search');
    assert(await js("document.querySelector('link[rel=canonical]')?.href.endsWith('/laptop-gaming')"),'Canonical');
    await shot('category-gaming-'+width);
    assert(await js("!document.querySelector('[aria-label=Breadcrumb]').textContent.includes('Phân loại')"),'No directory in category breadcrumb');
    assert(await js("[...document.querySelectorAll('[aria-label=\"Chọn thương hiệu\"] a')].every(a=>/\\d+ máy/.test(a.textContent))"),'Real brand counts');
    assert(await js("!!document.querySelector('[aria-label=\"Chọn nhu cầu\"] a svg')"),'Need icons');
    if(width===1440) {
      const height=await js("document.querySelector('[aria-label=\"Bộ lọc tiêu chí\"]').getBoundingClientRect().bottom-document.querySelector('[aria-label=\"Đầu trang phân loại\"]').getBoundingClientRect().top");
      console.log('Catalog controls height',height);
      assert(height<=280,'Compact controls on desktop');
      assert(await js("document.querySelector('main article').getBoundingClientRect().top<600"),'Products visible without scroll');
    }
    await js("document.querySelector('#category-cards').closest('details').open=true");
    await until(()=>js("document.querySelector('#category-cards img')?.naturalWidth>0"),'Category image loaded');
    await js("document.querySelector('main input[name=ram]:not([type=hidden])').closest('details').open=true");
    assert(await js("(()=>{const r=document.querySelector('main input[name=ram]:not([type=hidden])').closest('fieldset').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>0})()"),'Filter panel fits '+width);
    await shot('category-filter-'+width);
    await js("document.querySelector('main input[name=ram]:not([type=hidden])').closest('details').open=false");
    await js("document.querySelector('#category-cards').closest('details').open=false");
    await js("document.querySelector('[aria-label=\"Kết quả sản phẩm\"]').scrollIntoView({block:'start'})");
    await shot('category-products-'+width);
    console.log('PASS viewport',width);
    await navigate('/phu-kien');
    assert(await js("!!document.querySelector('[data-catalog-kind=accessory]')"),'Accessory layout');
    assert(await js("!document.querySelector('main input[name=cpu],main input[name=gpu]:not([type=hidden]),main input[name=ram]:not([type=hidden])')"),'Accessory filters exclude laptop specs');
    assert(await js("!!document.querySelector('main input[name=type]')"),'Accessory-specific type options');
    assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'Accessory no overflow '+width);
    await shot('category-accessories-'+width);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  // Core discovery must work with JavaScript disabled: real links and native GET forms.
  await cdp('Emulation.setScriptExecutionDisabled',{value:true});
  await navigate(categoryPath);
  assert(await js("document.querySelector('main h1').checkVisibility()"),'Category visible without JS');
  const baseCount=await js("Number(document.querySelector('main [role=status] strong').textContent)");
  assert(baseCount>24,'Pagination fixture');
  const baseBrandCounts=await js("[...document.querySelectorAll('[aria-label=\"Chọn thương hiệu\"] a')].map(a=>[new URL(a.href).searchParams.get('brand'),a.textContent])");
  const brandSelector='[aria-label="Chọn thương hiệu"] a[href*="brand=lenovo"]';
  await js(`document.querySelector(${JSON.stringify(brandSelector)}).click()`);
  await until(()=>js("new URLSearchParams(location.search).get('brand')==='lenovo' && document.readyState==='complete' && !!document.querySelector('[aria-label=\"Bộ lọc đang áp dụng\"]')"),'Brand GET');
  assert(await js("document.querySelector('[aria-label=\"Bộ lọc đang áp dụng\"]').textContent.includes('Lenovo')"),'Brand chip');
  assert(await js("document.querySelector('meta[name=robots]').content.includes('noindex')"),'Filtered noindex');
  assert.deepEqual(await js("[...document.querySelectorAll('[aria-label=\"Chọn thương hiệu\"] a')].map(a=>[new URL(a.href).searchParams.getAll('brand').at(-1)||'lenovo',a.textContent])"),baseBrandCounts,'Brand counts exclude selected brand constraint');
  await navigate(categoryPath+'?brand=lenovo&brand=asus&tag=gaming&tag=mong-nhe&pricePreset=20-30&gpu=RTX+4060&ram=16&ram=32&sort=price-asc');
  assert(await js("(()=>{const text=document.querySelector('[aria-label=\"Bộ lọc đang áp dụng\"]').textContent;return text.includes('Lenovo')&&text.includes('Asus')&&text.includes('Gaming')&&text.includes('Mỏng nhẹ')&&text.includes('20 – 30 triệu')&&text.includes('RTX 4060')})()"),'Grouped summary labels');
  assert(await js("document.querySelector('main input[name=gpu]:not([type=hidden])').closest('details').querySelector('summary').textContent.includes('RTX 4060')"),'GPU caption shows choice');
  assert(await js("document.querySelector('main input[name=minPrice]').closest('details').querySelector('summary').textContent.includes('20 – 30 triệu')"),'Price caption shows choice');
  assert(await js("document.querySelector('main input[name=ram]:not([type=hidden])').closest('details').querySelector('summary').textContent.includes('16')"),'RAM caption shows choices');
  assert(await js("[...document.querySelectorAll('[aria-label=\"Chọn nhu cầu\"] a[aria-current=true]')].some(a=>a.textContent.includes('Mỏng nhẹ'))"),'Selected need remains visible when no matching products');
  await shot('category-active-summary');
  const removeBrand='[aria-label="Bộ lọc đang áp dụng"] a[aria-label^="Xóa tiêu chí Hãng:"]';
  const withoutBrand=await js(`document.querySelector(${JSON.stringify(removeBrand)}).getAttribute('href')`);
  await clickAndWait(removeBrand,withoutBrand);
  assert(!await js("new URLSearchParams(location.search).has('brand')"),'Remove entire brand group');
  assert.equal(await js("new URLSearchParams(location.search).get('gpu')"),'RTX 4060');
  assert.equal(await js("new URLSearchParams(location.search).getAll('tag').length"),2);
  assert.equal(await js("new URLSearchParams(location.search).get('sort')"),'price-asc');
  await navigate(categoryPath+'?minPrice=10000000&maxPrice=20000000&brand=lenovo');
  const removePrice='[aria-label="Bộ lọc đang áp dụng"] a[aria-label^="Xóa tiêu chí Giá:"]';
  const withoutPrice=await js(`document.querySelector(${JSON.stringify(removePrice)}).getAttribute('href')`);
  await clickAndWait(removePrice,withoutPrice);
  assert(await js("!new URLSearchParams(location.search).has('minPrice')&&!new URLSearchParams(location.search).has('maxPrice')&&new URLSearchParams(location.search).get('brand')==='lenovo'"),'Remove custom range atomically');
  await navigate(categoryPath+'?brand=lenovo');
  await js("document.querySelector('#category-search').value='Legion';document.querySelector('#category-search').form.requestSubmit()");
  await until(()=>js("new URLSearchParams(location.search).get('q')==='Legion' && document.readyState==='complete' && document.querySelector('main [role=status]')?.textContent.includes('Legion')"),'Search without JS');
  assert.equal(await js("new URLSearchParams(location.search).get('brand')"),'lenovo');
  assert(await js("document.querySelectorAll('main article').length>0"),'Combined search results');
  const combined=await js('location.pathname+location.search');await navigate(combined);
  assert.equal(await js("document.querySelector('#category-search').value"),'Legion');
  await navigate(categoryPath+'?pricePreset=20-30');
  await js("(()=>{const input=document.querySelector('main input[name=ram]:not([type=hidden])');input.checked=true;input.form.requestSubmit()})()");
  await until(()=>js("new URLSearchParams(location.search).has('ram') && document.readyState==='complete'"),'Native specs form');
  assert.equal(await js("new URLSearchParams(location.search).get('pricePreset')"),'20-30','Specs preserve budget');
  await navigate(categoryPath);
  await js("(()=>{const input=document.querySelector('main input[name=minPrice]');input.value='10000000';input.form.querySelector('[name=maxPrice]').value='';input.form.requestSubmit()})()");
  await until(()=>js("new URLSearchParams(location.search).get('minPrice')==='10000000' && document.readyState==='complete'"),'Open-ended price');
  assert(await js("!document.querySelector('[role=alert]') && document.querySelectorAll('main article').length>0"),'Blank maximum stays unbounded');
  const sortSelector='[aria-label="Sắp xếp sản phẩm"] a[href*="sort=price-asc"]';
  const sortUrl=await js(`document.querySelector(${JSON.stringify(sortSelector)}).getAttribute('href')`);
  await clickAndWait(sortSelector,sortUrl);
  assert.equal(await js("new URLSearchParams(location.search).get('minPrice')"),'10000000');
  await navigate(categoryPath+'?page=2');
  assert(await js("document.querySelector('link[rel=canonical]')?.href.endsWith('?page=2')"),'Pagination self canonical');
  assert(!await js("document.querySelector('meta[name=robots]')?.content.includes('noindex')"),'Unfiltered page indexable');
  await navigate(categoryPath+'?category=macbook');
  assert.equal(await js("Number(document.querySelector('main [role=status] strong').textContent)"),baseCount,'Query cannot override route category');
  await navigate(categoryPath+'/lenovo-legion');
  assert.equal(await js("document.querySelector('h1').textContent"),'Lenovo Legion');
  assert(await js("document.querySelectorAll('main article').length>0"),'Nested category products');
  const schema=await js("[...document.querySelectorAll('main script[type=\"application/ld+json\"]')].flatMap(s=>JSON.parse(s.textContent))");
  assert(schema.some(s=>s['@type']==='BreadcrumbList'));assert(schema.some(s=>s['@type']==='ItemList'));
  assert.deepEqual(schema.find(s=>s['@type']==='BreadcrumbList').itemListElement.map(i=>i.name),['Trang chủ','Laptop Gaming','Lenovo Legion']);
  await navigate(categoryPath+'?tag=missing-need');
  assert(await js("document.querySelector('main h1').checkVisibility()"),'Empty state visible without JS');
  assert(await js("document.querySelector('main').textContent.includes('Không tìm thấy sản phẩm phù hợp')"),'Empty result retains controls');
  await navigate(categoryPath+'?minPrice=30000000&maxPrice=100');
  assert(await js("document.querySelector('[role=alert]')?.textContent.includes('không hợp lệ')"));
  await navigate('/phu-kien');
  assert(await js("document.querySelector('main h1').checkVisibility()"),'Accessories visible without JS');
  const accessoryChild=nav.categories.find(c=>c.parentId===nav.categories.find(c=>c.href==='/phu-kien').id);
  await navigate(accessoryChild.href);
  assert(await js("!!document.querySelector('[data-catalog-kind=accessory]')"),'Nested accessory category overrides product route');
  await navigate('/phu-kien');
  await js("(()=>{const input=document.querySelector('main input[name=type][value=bag]');input.checked=true;input.form.requestSubmit()})()");
  await until(()=>js("new URLSearchParams(location.search).get('type')==='bag' && document.readyState==='complete' && !!document.querySelector('[aria-label=\"Bộ lọc đang áp dụng\"]')"),'Accessory GET type');
  assert(await js("document.querySelectorAll('main article').length>0"),'Accessory type results');
  await cdp('Emulation.setScriptExecutionDisabled',{value:false});
  await navigate(categoryPath);
  await until(()=>js("(()=>{const b=document.querySelector('main article button');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$'))})()"),'Product interaction hydration');
  await until(()=>js("(()=>{const saved=JSON.parse(localStorage.getItem('citilap-wishlist')||'{}');return saved.version===1&&Array.isArray(saved.ids)})()"),'Wishlist storage initialized');
  const favoritePoint=await js("(()=>{const b=document.querySelector('main article button[aria-label^=\"Lưu \"]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...favoritePoint,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...favoritePoint,button:'left',clickCount:1});
  await until(()=>js("JSON.parse(localStorage.getItem('citilap-wishlist')||'{}').ids?.length>0"),'Favorite saved');
  await navigate(categoryPath);
  await until(()=>js("!!document.querySelector('main article button[aria-label^=\"Bỏ lưu \"]')"),'Favorite persists');
  await js("document.querySelector('main input[name=ram]:not([type=hidden])').closest('details').querySelector('summary').click()");
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await js("!document.querySelector('details[data-category-filter][open]') && document.activeElement.tagName==='SUMMARY'"),'Escape closes filter and restores focus');
  await js("document.querySelector('main input[name=ram]:not([type=hidden])').closest('details').querySelector('summary').click()");
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:20,y:180,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:20,y:180,button:'left',clickCount:1});
  assert(await js("!document.querySelector('details[data-category-filter][open]')"),'Outside click closes filter');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
  await js("document.querySelector('#category-cards').closest('details').open=true");
  await js("document.querySelector('button[data-category-scroll=\"1\"][aria-controls=\"category-cards\"]').click()");
  await until(()=>js("document.querySelector('#category-cards').scrollLeft>0"),'Category rail arrows');
  await js("document.querySelector('button[data-category-scroll=\"1\"][aria-controls=\"category-filters\"]').click()");
  await until(()=>js("document.querySelector('#category-filters').scrollLeft>0"),'Filter rail arrows');
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(nav.categories.every(c=>!c.href.startsWith('/phan-loai/')));
  console.log('PASS category index/detail, root nested routes, 301 query preservation, sitemap, canonical/noindex/JSON-LD, no-JS laptop/accessory filters and pagination, wishlist reload, Escape/focus/outside dismissal, mobile rail arrows, no runtime errors');
} catch(error) {
  if(ws?.readyState===WebSocket.OPEN) {
    console.log('FAILURE PAGE',await js("JSON.stringify({url:location.href,main:document.querySelector('main')?.innerText,errors:document.querySelector('[role=alert]')?.textContent})"));
    await shot('category-failure');
  }
  throw error;
} finally { ws?.close();chrome.kill(); }
