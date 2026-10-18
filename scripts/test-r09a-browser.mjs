// Real Chrome, isolated profile, native CDP; no browser dependencies or app API mocks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
const base=process.argv[2];
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+$/);
const profile=await mkdtemp(resolve('.wrangler/r09a-chrome-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,sequence=0,passed=0;const calls=new Map();let paused;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<100;i++){const result=await fn();if(result)return result;await sleep(100);}throw Error('Timed out: '+label);}
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{calls.delete(id);reject(Error('CDP timeout: '+method));},15000);calls.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
const text=()=>js('document.body?.innerText || ""');
async function waitText(value){return until(async()=>(await text()).includes(value),value);}
async function click(label,selector='button'){
  await until(()=>js(`[...document.querySelectorAll(${JSON.stringify(selector)})].some(e=>e.textContent.includes(${JSON.stringify(label)}) && Object.keys(e).some(k=>k.startsWith('__reactProps$')))`),'hydrated '+label);
  const point=await js(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.includes(${JSON.stringify(label)}));if(!e)throw Error('Missing control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function fill(name,value){await js(`document.querySelector('[name="${name}"]').focus()`);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cdp('Input.insertText',{text:value});}
async function control(input){const r=await fetch(base+'/__fixture/control',{method:'POST',body:JSON.stringify(input)});assert.equal(r.status,200);return r.text();}
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('docs/admin/evidence/r09a-'+name+'.png',Buffer.from(r.data,'base64'));}
async function check(name,fn){await fn();console.log('PASS '+(++passed)+': '+name);}
try {
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome startup');
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Fetch.requestPaused')paused=m.params;else if(m.method==='Page.javascriptDialogOpening')void cdp('Page.handleJavaScriptDialog',{accept:true});});
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
  await cdp('Network.setExtraHTTPHeaders',{headers:{'cf-connecting-ip':'198.51.100.'+(1+Math.floor(Math.random()*250))}});
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await mkdir('docs/admin/evidence',{recursive:true});

  async function input(selector,value){await js('document.querySelector('+JSON.stringify(selector)+').focus()');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cdp('Input.insertText',{text:value});}
  const api=expression=>js(expression);
  async function navigate(path) {
    await cdp('Page.navigate',{url:base+path});
    await until(()=>js('location.href==='+JSON.stringify(base+path)),'destination URL');
    await until(()=>js("document.readyState==='complete'"),'page ready');
  }
  await check('Wishlist migrates old payload to IDs; reload gets current public price',async()=>{
    await navigate('/wishlist');
    await js("localStorage.setItem('citilap-wishlist',JSON.stringify([{productId:'fixture-p',name:'OLD PRIVATE NAME',price:'1',image:''}]))");
    await cdp('Page.reload');await waitText('Fixture Laptop Alpha');
    await until(()=>js("JSON.parse(localStorage.getItem('citilap-wishlist'))?.version===1"),'IDs persisted');
    assert.deepEqual(await js("JSON.parse(localStorage.getItem('citilap-wishlist'))"),{version:1,ids:['fixture-p']});
    assert.ok(!(await text()).includes('OLD PRIVATE NAME'));
    await control({action:'archive-all'});await control({action:'settings',patch:{flashSaleEnabled:false}});
    await control({action:'price',price:23456000});await js("window.dispatchEvent(new Event('focus'))");await waitText('23.456.000');
    await shot('wishlist-desktop');
  });
  await check('Hidden wishlist item is unavailable; read fault shows retry and preserves IDs',async()=>{
    await control({action:'unavailable'});await js("window.dispatchEvent(new Event('focus'))");await waitText('không còn công khai');
    assert.ok(!(await text()).includes('Fixture Laptop Alpha'));
    await control({action:'available'});await control({action:'fault'});
    try {await js("window.dispatchEvent(new Event('focus'))");await waitText('Không thể tải giá');assert.deepEqual(await js("JSON.parse(localStorage.getItem('citilap-wishlist')).ids"),['fixture-p']);}
    finally {await control({action:'recover'});}
    await click('Thử lại');await waitText('Fixture Laptop Alpha');
  });
  await check('Blocked storage retains session interaction and reports persistence limit',async()=>{
    const script=await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError')};"});
    await cdp('Page.reload');await waitText('Trình duyệt không cho lưu');await waitText('Fixture Laptop Alpha');
    await js("document.querySelector('button[aria-label^=\"Bỏ lưu\"]').click()");await waitText('Chưa có sản phẩm yêu thích');
    await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
  });
  await check('Mobile filters apply once, trap focus, restore opener and keep URL state',async()=>{
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await navigate('/search?q=Fixture');await waitText('Fixture Laptop');await click('Bộ lọc');
    assert.equal(await js("document.querySelector('dialog')?.open"),true);
    const initial=await js('location.search');
    await js("[...document.querySelectorAll('dialog button')].find(e=>e.textContent.includes('Fixture Brand')).click()");
    assert.equal(await js('location.search'),initial);
    await js("[...document.querySelectorAll('dialog button')].at(-1).focus()");
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await js("document.activeElement===document.body || !!document.activeElement.closest('dialog')"),true);
    await click('Áp dụng bộ lọc');await until(()=>js("location.search.includes('brand=fixture-brand')"),'applied URL');
    await until(()=>js("!document.querySelector('dialog')"),'drawer closed');
    await shot('search-mobile');
    await cdp('Page.reload');await waitText('Fixture Laptop');assert.ok((await js('location.search')).includes('brand=fixture-brand'));
    await click('Bộ lọc');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await until(()=>js("!document.querySelector('dialog')"),'escape closed');
    assert.equal(await js("document.activeElement?.getAttribute('aria-label')"),'Mở bộ lọc tìm kiếm');
  });
  await check('Campaign boundary updates open wishlist without reload',async()=>{
    await navigate('/wishlist');await waitText('Fixture Laptop Alpha');
    await control({action:'price',price:20000000});
    await control({action:'settings',patch:{flashSaleEnabled:true,flashSaleStartAt:new Date(Date.now()+12000).toISOString(),flashSaleEndAt:new Date(Date.now()+22000).toISOString()}});
    await cdp('Page.reload');await waitText('22.000.000');
    await js("window.__priceEvents=[];window.addEventListener('citilap:price-refresh',()=>window.__priceEvents.push(Date.now()))");
    await until(async()=>{await sleep(250);return (await text()).includes('20.000.000');},'sale start');
    await until(async()=>{await sleep(250);return !(await text()).includes('20.000.000');},'sale end');
    await control({action:'settings',patch:{flashSaleEnabled:false}});
  });
  await check('Assistance pages expose no sample account or fake order search',async()=>{
    await navigate('/profile');await waitText('Website chưa cung cấp tài khoản');assert.ok(!(await text()).includes('Nguyễn Văn A'));
    await navigate('/order-tracking');await waitText('Tra cứu tự động');assert.equal(await js("document.querySelectorAll('input[type=tel]').length"),0);
    await cdp('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:false});await shot('support-tablet');
  });
  await check('Compare mobile uses native modal focus and returns focus on Escape',async()=>{
    await navigate('/search?q=Fixture');
    await click('', 'button[title="Thêm vào so sánh"]');
    await click('So sánh ngay');
    await until(()=>js("!!document.querySelector('dialog[open] a[href*=product]')"),'compare loaded');
    assert.equal(await js("document.querySelector('dialog').matches(':modal')"),true);
    assert.ok(await js("!!document.activeElement.closest('dialog')"));
    await shot('compare-mobile');
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await until(()=>js("!document.querySelector('dialog')"),'compare closed');
    assert.ok(await js("document.activeElement.textContent.includes('So sánh ngay')"));
  });
  const observations=[];
  const perf=await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"window.__metrics={lcp:null,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__metrics.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__metrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});"});
  for(const width of [1440,390])for(const path of ['/','/search','/product/fixture-p','/cart','/checkout','/news'])for(const cache of ['cold','warm']) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
    if(cache==='cold')await cdp('Network.clearBrowserCache');
    const response=await fetch(base+path);assert.equal(response.status,200,path);
    await navigate(path);await sleep(1500);
    observations.push({width,path,cache,...await js("({...window.__metrics,ttfb:performance.getEntriesByType('navigation')[0]?.responseStart,url:location.pathname})")});
  }
  await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:perf.identifier});
  await writeFile('docs/admin/evidence/r09a-performance.json',JSON.stringify({recordedAt:new Date().toISOString(),environment:'Local built Worker, ephemeral fixture, Chrome headless, no CPU/network throttle, one cold and one warm sample per route/width; lab only; INP not measured',observations},null,2));
  console.log('R09A browser: '+passed+'/'+passed+' PASS; performance baseline recorded. Native 200% browser zoom and field CWV not certified.');
} catch(error) {
  if(ws?.readyState===WebSocket.OPEN){console.log(await js("({visibility:document.visibilityState,events:window.__priceEvents,time:Date.now()})"));await writeFile('.wrangler/r09a-browser-failure.txt',await text()).catch(()=>{});await shot('browser-failure').catch(()=>{});}
  throw error;
} finally {
  if(ws?.readyState===WebSocket.OPEN){try{await cdp('Browser.close');}catch{}ws.close();}
  chrome.kill();await sleep(500);
  if(profile.startsWith(resolve('.wrangler')+'/') || profile.startsWith(resolve('.wrangler')+'\\'))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
