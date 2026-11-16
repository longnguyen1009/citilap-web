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
const jsBundle=(await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import HotSale from './src/components/home/HotSaleCampaigns'; import Admin from './src/app/admin/campaigns/page'; const params=new URLSearchParams(location.search); createRoot(document.getElementById('root')).render(params.has('admin')?<Admin/>:<HotSale campaignOrder={params.has('ordered')?[${JSON.stringify(fixture[1].name)},${JSON.stringify(fixture[0].name)}]:[]} preShowHours={params.has('boundary')?0:2} campaigns={params.has('boundary')?[{...${JSON.stringify(fixture[0])},startAt:new Date(Date.now()+1500).toISOString(),endAt:new Date(Date.now()+3500).toISOString()}]:params.has('single')?${JSON.stringify(fixture.filter(c=>c.name===fixture[0].name))}:${JSON.stringify(fixture)}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'next-fixture',setup(b){b.onResolve({filter:/^next\/(link|image|navigation)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='next/navigation'?'export const useRouter=()=>({refresh(){}});':a.path==='next/link'?`import React from 'react'; export default function Link({href,children,...p}){return <a href={href} {...p}>{children}</a>}`:`import React from 'react'; export default function Image({priority,fill,unoptimized,...p}){return <img {...p}/>}`,loader:'jsx',resolveDir:process.cwd()}));}}]})).outputFiles[0].text;
let lastSave;
const mutations = [];
let adminCampaigns = [];
let savedSettings = { revision: 0, document: { hotSaleCampaignOrder: [] } };
const product={id:'p',name:'Laptop thử nghiệm',publicName:'Laptop thử nghiệm',price:20000000,productStatus:'ACTIVE'};
const variants = [{ id: 'v1', name: '16GB / 512GB', price: 20000000, status: 'ACTIVE' }, { id: 'v2', name: '32GB / 1TB', price: 24000000, status: 'ACTIVE' }];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(jsBundle);return;}
 if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
 if(url.pathname==='/test-product.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect x="40" y="40" width="320" height="180" rx="12" fill="#182238"/><path d="M20 240h360l-20 20H40z" fill="#8492a9"/></svg>');return;}
 if(url.pathname.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if (url.pathname === '/api/admin/settings') {
    if (req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      assert.equal(input.expectedRevision, savedSettings.revision);
      savedSettings = { revision: savedSettings.revision + 1, document: input.document };
    }
    res.end(JSON.stringify({ success: true, data: savedSettings })); return;
  }
  if(req.method==='POST'||req.method==='PUT'){let body='';for await(const c of req)body+=c;lastSave=JSON.parse(body);mutations.push(lastSave);adminCampaigns=[{...lastSave,id:'test',revision:(lastSave.expectedRevision||0)+1,itemCount:lastSave.items.length}];res.end(JSON.stringify({success:true,data:adminCampaigns[0]}));return;}
  if (url.pathname === '/api/admin/campaigns/test') {
    res.end(JSON.stringify({ success: true, data: { ...adminCampaigns[0], items: adminCampaigns[0].items.map(it => ({ ...it, product: { ...product, variants }, variant: variants.find(v => v.id === it.variantId) })) } })); return;
  }
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
 await cdp('Emulation.setTimezoneOverride',{timezoneId:'America/Los_Angeles'});
 await cdp('Page.navigate',{url:origin});
 await until(()=>js("!!document.querySelector('[role=tab]')"),'storefront');
 for(const width of [1440,390,320]) {
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  await delay(250);
  assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'storefront overflow '+width);
  assert(await js("!!document.querySelector('[role=timer]')"),'countdown mounted');
  const shot=await cdp('Page.captureScreenshot',{format:'png'});
  await writeFile('.wrangler/hot-sale-test/schedule-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:origin+'/?ordered'});
 await until(()=>js("!!document.querySelector('[role=tab]')"),'ordered storefront');
 assert.match(await js("document.querySelector('[role=tab]').textContent"), /SALE MỪNG NHẬP HỌC/i, 'Saved order takes priority over currently running campaign');
 await cdp('Page.navigate',{url:origin+'/?boundary'});
 await until(()=>js("!!document.querySelector('section[aria-label=\"HOT SALE\"]')"),'automatic show at start');
 await until(()=>js("!document.querySelector('section[aria-label=\"HOT SALE\"]')"),'automatic hide at end');
 await cdp('Page.navigate',{url:origin+'/?admin'});
 await until(()=>js("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Tạo chiến dịch')"),'admin');
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Tạo chiến dịch').click()");
 await until(()=>js("!!document.querySelector('input[type=date]')"),'editor');
 assert.equal(await js("document.querySelectorAll('[role=dialog] input[type=date]').length"),2);
 assert.equal(await js(`document.querySelectorAll('[role=dialog] input[placeholder="HH:mm"]').length`),2);
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Thêm dòng')).click()");
 async function value(selector,v) {
  await js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 }
 await value('input[placeholder="VD: Flash Sale Cuối Tuần"]','SALE TEST');
 await value('input[aria-label="Từ ngày"]','2099-11-16');
 await value('input[aria-label="Giờ bắt đầu"]','10:00');
 await value('input[aria-label="Đến ngày"]','2099-11-16');
 await value('input[aria-label="Giờ kết thúc"]','16:00');
 await value('input[aria-label="Variant ID"]','v2');
 await value('input[aria-label="Product ID"]','p');
 await value('input[aria-label="Giá sale"]','15000000');
 await value('input[aria-label="Giá gốc"]','20000000');
 assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'admin overflow');
 const shot=await cdp('Page.captureScreenshot',{format:'png'});
 await writeFile('.wrangler/hot-sale-test/schedule-admin.png',Buffer.from(shot.data,'base64'));
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Lưu chiến dịch').click()");
 await until(()=>lastSave,'saved');
 assert.equal(lastSave.startAt,'2099-11-16T03:00:00.000Z');
 assert.equal(lastSave.endAt,'2099-11-16T09:00:00.000Z');
 assert.equal(lastSave.items[0].salePrice,15000000);
 await until(()=>js("!!document.querySelector('[role=switch]')"),'saved list');
 await js(`document.querySelector('button[title="Sửa chiến dịch"]').click()`);
 await until(()=>js("!!document.querySelector('[role=dialog] input[type=date]')"),'edit');
 assert.equal(await js(`document.querySelector('input[aria-label="Từ ngày"]').value`),'2099-11-16');
 assert.equal(await js(`document.querySelector('input[aria-label="Giờ bắt đầu"]').value`),'10:00');
 assert.equal(await js(`document.querySelector('input[aria-label="Giờ kết thúc"]').value`),'16:00');
 assert.equal(await js(`document.querySelectorAll('input[aria-label="Giá sale"]').length`),2,'Both discounted and non-discounted options restored');
 assert.deepEqual(await js(`[...document.querySelectorAll('input[aria-label="Giá sale"]')].map(i=>i.value)`),['','15000000']);
 assert(await js(`document.querySelector('[role=dialog]').textContent.includes('Không giảm giá')`));
 await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Theo khung giờ mỗi ngày').click()`);
 await value('input[aria-label="Đến ngày"]','2099-11-29');
 const dailyShot=await cdp('Page.captureScreenshot',{format:'png'});
 await writeFile('.wrangler/hot-sale-test/schedule-daily-edit.png',Buffer.from(dailyShot.data,'base64'));
 await js(`document.querySelector('input[aria-label="Giá sale"]').scrollIntoView({block:'center'})`);
 const optionsShot=await cdp('Page.captureScreenshot',{format:'png'});
 await writeFile('.wrangler/hot-sale-test/schedule-all-options.png',Buffer.from(optionsShot.data,'base64'));
 await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Lưu chiến dịch').click()`);
 await until(()=>mutations.length===2,'one recurring save');
 await until(()=>js("!document.querySelector('[role=dialog]')"),'daily modal closed');
 assert.equal(mutations.length,2,'14-day setup sends exactly one request');
 assert.equal(lastSave.schedule.mode,'daily_slots');
 assert.equal(lastSave.schedule.endDate,'2099-11-29');
 assert.equal(lastSave.items.length,1,'Blank option not persisted as sale target');
 assert.equal(lastSave.items[0].variantId,'v2');
 assert.equal(adminCampaigns.length,1);
 await js(`document.querySelector('button[title="Sửa chiến dịch"]').click()`);
 await until(()=>js(`document.querySelector('input[aria-label="Đến ngày"]')?.value==='2099-11-29'`),'reopen recurring schedule');
 assert(await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Theo khung giờ mỗi ngày').className.includes('bg-blue-600')`));
 assert.deepEqual(await js(`[...document.querySelectorAll('input[aria-label="Giá sale"]')].map(i=>i.value)`),['','15000000']);
 await js(`document.querySelector('button[aria-label="Đóng trình sửa chiến dịch"]').click()`);
 await until(()=>js("!document.querySelector('[role=dialog]')"),'detail editor closed');
 assert.equal(await js("[...document.querySelectorAll('button[aria-pressed]')].filter(b=>b.textContent.includes('SALE TEST')).length"),1,'One campaign card for saved detail');
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Thêm flashsale chi tiết').click()");
 await until(()=>js("!!document.querySelector('[role=dialog]')"),'new detail');
 assert.equal(await js(`document.querySelector('input[placeholder="VD: Flash Sale Cuối Tuần"]').value`),'SALE TEST','New detail inherits campaign name');
 assert.equal(await js(`document.querySelectorAll('input[aria-label="Giá sale"]').length`),0,'New detail starts with independent products');
 assert(await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Theo khung giờ mỗi ngày').className.includes('bg-blue-600')`),'New detail defaults to daily schedule');
 await js(`document.querySelector('button[aria-label="Đóng trình sửa chiến dịch"]').click()`);
 adminCampaigns.push({ ...adminCampaigns[0], id: 'second', name: 'SALE SECOND' });
 await js(`document.querySelector('button[aria-label="Làm mới"]').click()`);
 await until(()=>js(`!!document.querySelector('button[aria-label="Di chuyển SALE SECOND lên"]')`),'campaign list');
 await js(`document.querySelector('button[aria-label="Di chuyển SALE SECOND lên"]').click()`);
 await until(()=>savedSettings.document.hotSaleCampaignOrder[0]==='SALE SECOND','saved order');
 await until(()=>js(`[...document.querySelectorAll('button[aria-pressed]')].filter(b=>b.textContent.includes('flashsale chi tiết'))[0]?.textContent.includes('SALE SECOND')`),'reordered list');
 assert.deepEqual(savedSettings.document.hotSaleCampaignOrder, ['SALE SECOND', 'SALE TEST']);
 const orderShot = await cdp('Page.captureScreenshot',{format:'png'});
 await writeFile('.wrangler/hot-sale-test/campaign-order-admin.png',Buffer.from(orderShot.data,'base64'));
 assert.equal(errors.length,0,JSON.stringify(errors));
 console.log('PASS: desktop admin, Vietnam date/time saved correctly from Los Angeles timezone; storefront 1440/390/320, countdown, no browser exceptions.');
} finally {ws?.close();chrome.kill();server.closeAllConnections();await new Promise(r=>server.close(r));}
