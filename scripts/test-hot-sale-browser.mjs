import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
const base = process.argv[2] || 'http://localhost:3001';
assert.match(base,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const css = await fetch(base+'/src/app/globals.css',{headers:{Accept:'text/css'}}).then(r=>r.text());
const fixture = JSON.parse(await readFile('.wrangler/hot-sale-test/campaigns.json','utf8'));
const at = Date.now();
for (const [index,c] of fixture.entries()) {
 c.startAt=new Date(at+(index?3600000:-3600000)).toISOString(); c.endAt=new Date(at+7200000+index*3600000).toISOString();
 c.products=Array.from({length:index?3:9},(_,i)=>({...c.products[i%c.products.length],id:'fixture-'+index+'-'+i,name:'Laptop CitiLap '+(i+1),image:'/test-product.svg',availability:'AVAILABLE'}));
}
fixture.push({...fixture[0],id:'later-slot',startAt:new Date(at+3*3600000).toISOString(),endAt:new Date(at+5*3600000).toISOString()},{...fixture[0],id:'tomorrow-slot',startAt:new Date(at+24*3600000).toISOString(),endAt:new Date(at+26*3600000).toISOString()});
const jsBundle=(await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import HotSale from './src/components/home/HotSaleCampaigns'; import Admin from './src/app/admin/campaigns/page'; const params=new URLSearchParams(location.search); createRoot(document.getElementById('root')).render(params.has('admin')?<Admin/>:<HotSale campaigns={params.has('single')?${JSON.stringify(fixture.filter(c=>c.name===fixture[0].name))}:${JSON.stringify(fixture)}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'next-fixture',setup(b){b.onResolve({filter:/^next\/(link|image|navigation)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='next/navigation'?'export const useRouter=()=>({refresh(){}});':a.path==='next/link'?`import React from 'react'; export default function Link({href,children,...p}){return <a href={href} {...p}>{children}</a>}`:`import React from 'react'; export default function Image({priority,fill,unoptimized,...p}){return <img {...p}/>}`,loader:'jsx',resolveDir:process.cwd()}));}}]})).outputFiles[0].text;
let lastSave;
let adminCampaigns = [];
const product={id:'p',name:'Laptop thử nghiệm',publicName:'Laptop thử nghiệm',price:20000000,productStatus:'ACTIVE'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(jsBundle);return;}
 if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
 if(url.pathname==='/test-product.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect x="40" y="40" width="320" height="180" rx="12" fill="#182238"/><path d="M20 240h360l-20 20H40z" fill="#8492a9"/></svg>');return;}
 if(url.pathname.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if(req.method==='POST'||req.method==='PUT'){let body='';for await(const c of req)body+=c;lastSave=JSON.parse(body);adminCampaigns=[{...lastSave,id:'test',revision:(lastSave.expectedRevision||0)+1,itemCount:lastSave.items.length}];res.end(JSON.stringify({success:true,data:adminCampaigns[0]}));return;}
  res.end(JSON.stringify({success:true,data:url.pathname==='/api/admin/campaigns'?adminCampaigns:url.pathname==='/api/admin/campaigns/test'?adminCampaigns[0]:url.pathname==='/api/admin/products/p'?{document:{price:20000000,variants:[{id:'v1',name:'16GB / 512GB',sku:'TEST',price:20000000}]}}:{items:[product]}}));return;
 }
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const profile=await mkdtemp(resolve('.wrangler/hot-sale-test/chrome-'));
const chrome=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,seq=0;const calls=new Map(),errors=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<100;i++){const result=await fn();if(result)return result;await delay(100);}throw Error('Timeout '+label);}
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>reject(Error(method)),20000);calls.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
try{
 const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome');
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await cdp('Page.navigate',{url:origin});await until(()=>js("!!document.querySelector('[role=tab]')"),'render');
 await js(`document.querySelector('section[aria-label="HOT SALE"] [role=tab]').click()`);
 for(const width of [1440,768,390,320]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await delay(200);
  assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'Overflow '+width);
  await js("document.querySelector('[role=tab]').click()");
  const before=await js("(()=>{const r=document.querySelector('[role=region]');r.scrollLeft=0;return r.firstElementChild.getBoundingClientRect().width+12})()");
  await js("document.querySelector('button[aria-label=\"Sản phẩm tiếp theo\"]').click()");await until(()=>js('document.querySelector(\'[role=region]\').scrollLeft>5'),'arrow');const left=await js("document.querySelector('[role=region]').scrollLeft");assert(Math.abs(left-before)<3,'Exactly one card '+width);
  await js("document.querySelector('[role=tab]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  assert.equal(await js("document.querySelector('[role=tab][aria-selected=true]').textContent"),'Sale mừng nhập học');
  assert.equal(await js("document.querySelectorAll('[role=region] article').length"),3);
  await until(()=>js("document.querySelector('[role=tabpanel]').textContent.includes('Bắt đầu sau:')"),'upcoming timer');
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('.wrangler/hot-sale-test/'+width+'.png',Buffer.from(shot.data,'base64'));
  console.log('PASS responsive, keyboard tabs, countdown; width '+width);
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:origin+'/?single'});
 await until(()=>js(`!!document.querySelector('section[aria-label="HOT SALE"] h2')`),'Single campaign layout');
 assert.equal(await js('document.querySelectorAll("[role=tab]").length'),0,'Single campaign has no campaign tab strip');
 assert.equal(await js(`document.querySelectorAll('[aria-label="Ngày sale (GMT+7)"] button').length`),2,'Two sale days grouped');
 await js(`document.querySelector('[aria-label="Ngày sale (GMT+7)"] button').click()`);
 assert.equal(await js(`document.querySelectorAll('[aria-label="Khung giờ sale (GMT+7)"] button').length`),2,'Two time slots on first day');
 await js(`document.querySelectorAll('[aria-label="Khung giờ sale (GMT+7)"] button')[1].click()`);
 await until(()=>js(`document.querySelector('[role=timer]')?.textContent.includes('Bắt đầu sau:')`),'Upcoming slot countdown');
 await js(`document.querySelector('[aria-label="Ngày sale (GMT+7)"] button').click()`);
 await until(()=>js(`document.querySelector('[role=timer]')?.textContent.includes('Kết thúc trong:')`),'Active slot countdown');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
 await js(`document.activeElement?.blur();document.querySelector('[aria-label^="Sản phẩm "][role=region]').scrollLeft=0`);
 await until(()=>js(`document.querySelector('[aria-label^="Sản phẩm "][role=region]').scrollLeft>5`),'Automatic one-product scroll after five seconds');
 await until(()=>js(`(()=>{const r=document.querySelector('[aria-label^="Sản phẩm "][role=region]');return Math.abs(r.scrollLeft-r.firstElementChild.getBoundingClientRect().width-12)<3})()`),'Automatic scroll settles at one card');
 const automaticStep=await js(`(()=>{const r=document.querySelector('[aria-label^="Sản phẩm "][role=region]');return [r.scrollLeft,r.firstElementChild.getBoundingClientRect().width+12]})()`);
 assert(Math.abs(automaticStep[0]-automaticStep[1])<3,'Autoplay moves exactly one product');
 const arrow=await js(`(()=>{const b=document.querySelector('button[aria-label="Sản phẩm tiếp theo"]'),r=b.getBoundingClientRect(),rail=document.querySelector('[aria-label^="Sản phẩm "][role=region]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,outside:r.left>=rail.right}})()`);
 assert(arrow.outside,'Arrow stays outside product rail');
 await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:arrow.x,y:arrow.y});
 const hovered=await js(`document.querySelector('[aria-label^="Sản phẩm "][role=region]').scrollLeft`);
 await delay(5400);
 assert.equal(await js(`document.querySelector('[aria-label^="Sản phẩm "][role=region]').scrollLeft`),hovered,'Arrow hover pauses autoplay');
 assert(await js(`[...document.querySelectorAll('article')].every(a=>!a.matches(':hover'))`),'Arrow hover does not hover product cards');
 await js(`document.querySelector('button[aria-label="Tạm dừng tự cuộn sản phẩm"]').click()`);
 assert.equal(await js(`document.querySelector('button[aria-label="Bật tự cuộn sản phẩm"]').getAttribute('aria-pressed')`),'true');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [1440,390,320]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await delay(100);
  assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'Single campaign overflow '+width);
  const screenshot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('.wrangler/hot-sale-test/single-'+width+'.png',Buffer.from(screenshot.data,'base64'));
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 console.log('PASS grouped dates/time slots, single-campaign layout, countdowns, one-card autoplay, arrows outside cards, hover pause, explicit pause.');
 await cdp('Page.navigate',{url:origin+'/?admin'});await until(()=>js("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Tạo chiến dịch mới'))"),'admin');
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Tạo chiến dịch mới')).click()");
 await until(()=>js("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('+ Thêm'))"),'picker');
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('+ Thêm')).click()");
 await until(()=>js("document.body.textContent.includes('16GB / 512GB')"),'variant row');
 await js(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;function value(el,v){set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));}value(document.querySelector('input[placeholder="VD: Black Friday Siêu Giảm Giá"]'),'SALE 10/10');value(document.querySelector('input[placeholder="Ví dụ: 2, 6, 24"]'),'6');value(document.querySelector('input[placeholder="VD: 15000000"]'),'15000000');})()`);
 assert(await js("document.querySelector('[role=dialog] input[type=checkbox]').checked"),'New campaign enabled by default');
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Lưu chiến dịch')).click()");
 await until(()=>lastSave,'save');assert.equal(lastSave.name,'SALE 10/10');assert.equal(lastSave.items[0].variantId,'v1');assert.equal(lastSave.items[0].salePrice,15000000);assert.equal(Date.parse(lastSave.endAt)-Date.parse(lastSave.startAt),6*3600000);
 await until(()=>js("document.querySelector('[role=switch]')?.getAttribute('aria-checked')==='true'"),'enabled campaign');
 await js("document.querySelector('[role=switch]').click()");
 await until(()=>js("document.querySelector('[role=switch]')?.getAttribute('aria-checked')==='false'"),'disabled campaign');
 assert.equal(lastSave.status,'DRAFT');
 await js("document.querySelector('[role=switch]').click()");
 await until(()=>js("document.querySelector('[role=switch]')?.getAttribute('aria-checked')==='true'"),'enabled again');
 assert.equal(lastSave.status,'PUBLISHED');
 console.log('PASS admin default enabled, switch off/on, product picker, exact variant and 6-hour schedule.');
 await cdp('Page.navigate',{url:base});
 await until(()=>js(`document.querySelectorAll('section[aria-label="HOT SALE"] [role=tab]').length>=2`),'Live homepage campaign tabs');
 await until(()=>js(`Object.keys(document.querySelector('section[aria-label="HOT SALE"] [role=tab]')).some(k=>k.startsWith('__reactProps$'))`),'Live homepage hydration');
 const liveTabCount=await js(`document.querySelectorAll('section[aria-label="HOT SALE"] [role=tab]').length`);
 for(let index=0;index<liveTabCount;index++){
  await js(`document.querySelectorAll('section[aria-label="HOT SALE"] [role=tab]')[${index}].click()`);
  await until(()=>js(`document.querySelectorAll('section[aria-label="HOT SALE"] [role=region] article').length===10`),'Live campaign products');
  assert.equal(await js(`document.querySelectorAll('section[aria-label="HOT SALE"] [role=tab]')[${index}].getAttribute('aria-selected')`),'true');
  assert(await js(`!!document.querySelector('section[aria-label="HOT SALE"] time[datetime]')`),'Actual schedule visible');
 }
 await js(`document.querySelector('section[aria-label="HOT SALE"] [role=tab]').click()`);
 for(const width of [1440,768,390,320]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  await js(`window.scrollTo(0,document.querySelector('section[aria-label="HOT SALE"]').getBoundingClientRect().top+scrollY-(innerWidth<768?66:130))`);await delay(300);
  await until(()=>js(`[...document.querySelectorAll('section[aria-label="HOT SALE"] img')].filter(img=>{const r=img.getBoundingClientRect();return r.left<innerWidth&&r.right>0&&r.top<innerHeight&&r.bottom>0}).every(img=>img.complete&&img.naturalWidth>0)`),'Visible campaign images '+width);
  assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'Live homepage overflow '+width);
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('.wrangler/hot-sale-test/homepage-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 console.log('PASS actual local homepage: enabled campaigns, 10 products per tab, real schedules, four viewport screenshots.');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:base+'/hot-sale'});
 await until(()=>js(`!!document.querySelector('section[aria-label="HOT SALE"] article')`),'Live HOT SALE');
 const href=await js(`document.querySelector('section[aria-label="HOT SALE"] article a[href^="/laptop/"]').getAttribute('href')`);
 await cdp('Page.navigate',{url:base+href});
 await until(()=>js(`document.querySelectorAll('section[aria-label="Chọn cấu hình"] button[aria-pressed]').length===3`),'Live product variants');
 assert(await js(`Array.from(document.querySelectorAll('section[aria-label="Chọn cấu hình"] button[aria-pressed]')).every(b=>!b.disabled)`),'All live options in stock');
 await until(()=>js(`Object.keys(document.querySelector('section[aria-label="Chọn cấu hình"] button[aria-pressed]')).some(k=>k.startsWith('__reactProps$'))`),'Live hydration');
 await js(`document.querySelectorAll('section[aria-label="Chọn cấu hình"] button[aria-pressed]')[2].click()`);
 await until(()=>js(`document.querySelectorAll('section[aria-label="Chọn cấu hình"] button[aria-pressed]')[2].getAttribute('aria-pressed')==='true' && location.search.includes('sku=')`),'Live variant change');
 await cdp('Page.reload');
 await until(()=>js(`document.querySelectorAll('section[aria-label="Chọn cấu hình"] button[aria-pressed]')[2]?.getAttribute('aria-pressed')==='true'`),'Live variant persists on reload');
 assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS actual local HOT SALE, 3 stocked product options, variant switch and reload; no browser exceptions. Browser uses no DB writes.');
}finally{ws?.close();chrome.kill();server.closeAllConnections();await new Promise(r=>server.close(r));}
