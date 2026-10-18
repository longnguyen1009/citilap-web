// Real Chrome, isolated profile, native CDP; no browser dependencies or app API mocks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
const base=process.argv[2];
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+$/);
const profile=await mkdtemp(resolve('.wrangler/r07c-chrome-'));
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
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('docs/admin/evidence/r07c-'+name+'.png',Buffer.from(r.data,'base64'));}
async function check(name,fn){await fn();console.log('PASS '+(++passed)+': '+name);}
try {
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome startup');
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Fetch.requestPaused')paused=m.params;});
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
  await cdp('Network.setExtraHTTPHeaders',{headers:{'cf-connecting-ip':'198.51.100.'+(1+Math.floor(Math.random()*250))}});
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await mkdir('docs/admin/evidence',{recursive:true});
  await control({action:'settings',patch:{codEnabled:true,bankTransferEnabled:true,bankAccountInfo:'Fixture Bank A - 000001',addressHanoi:'Fixture showroom A',shippingFee:30000,freeShippingThreshold:20000000}});
  await check('PDP to full checkout quote, bank instructions, desktop layout',async()=>{
    await cdp('Page.navigate',{url:base+'/product/fixture-p'});await waitText('Thêm vào giỏ');await click('Thêm vào giỏ');await waitText('Đã thêm');
    await cdp('Page.navigate',{url:base+'/checkout'});await waitText('Phương thức thanh toán');await waitText('Chuyển khoản ngân hàng');
    await click('Nhận tại cửa hàng');await click('Chuyển khoản ngân hàng','label');await waitText('Fixture Bank A');
    await fill('fullName','Fixture Browser Customer');await fill('phone','0900000000');await fill('email','browser@example.test');
    await until(()=>js("!document.querySelector('button[type=submit]').disabled"),'quote ready');
    assert.ok((await text()).includes('Miễn phí'));await shot('desktop-checkout');
  });
  await check('Reload preserves customer form and selected payment; mobile 390 has no overflow',async()=>{
    await cdp('Page.reload');await waitText('Fixture Bank A');await until(()=>js("document.querySelector('[name=fullName]')?.value==='Fixture Browser Customer'"),'draft restored');
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.ok(await js('document.documentElement.scrollWidth<=window.innerWidth'));await shot('mobile-checkout');
  });
  await check('Late delivery quote cannot replace newer pickup selection',async()=>{
    await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/checkout/quote',requestStage:'Response'}]});paused=null;
    await click('Giao hàng tận nơi');await until(()=>paused,'delayed delivery quote');const delivery=paused;paused=null;
    await click('Nhận tại cửa hàng');await until(()=>paused,'new pickup quote');const pickup=paused;
    await cdp('Fetch.continueRequest',{requestId:pickup.requestId});
    await until(()=>js("!document.querySelector('button[type=submit]').disabled"),'pickup quote ready');
    await cdp('Fetch.continueRequest',{requestId:delivery.requestId}).catch(()=>{});await cdp('Fetch.disable');
    assert.ok((await text()).includes('Miễn phí'));assert.ok((await text()).includes('Fixture showroom A'));
  });
  await check('Variant disabled after quote rejects submit and preserves customer context',async()=>{
    const before=JSON.parse(await control({action:'stats'})).orders;
    await control({action:'variant-unavailable'});
    try {
      paused=null;await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/orders',requestStage:'Response'}]});
      await click('Gửi Đơn Đặt Hàng');await until(()=>paused,'unavailable order response');
      assert.ok(paused.responseStatusCode>=400 && paused.responseStatusCode<500);
      await cdp('Fetch.continueResponse',{requestId:paused.requestId});await cdp('Fetch.disable');
      assert.equal(JSON.parse(await control({action:'stats'})).orders,before);
      assert.equal(await js("document.querySelector('[name=fullName]').value"),'Fixture Browser Customer');
      assert.equal(await js("JSON.parse(localStorage.getItem('citilap_cart'))[0].variantId"),'var-16');
    } finally {await cdp('Fetch.disable');await control({action:'variant-available'});}
    await cdp('Page.reload');await waitText('Fixture Bank A');
    await until(()=>js("!document.querySelector('button[type=submit]').disabled"),'variant recovered');
  });
  await check('Live price change requires customer review without creating an order',async()=>{
    const before=JSON.parse(await control({action:'stats'})).orders;
    await control({action:'price',price:23456000});
    await click('Gửi Đơn Đặt Hàng');await waitText('Thông tin đặt hàng đã thay đổi');await waitText('23.456.000');
    assert.equal(JSON.parse(await control({action:'stats'})).orders,before);
    assert.equal(await js("document.querySelector('[name=fullName]').value"),'Fixture Browser Customer');
    await click('Xác nhận thông tin mới');
    await until(()=>js("!document.querySelector('button[type=submit]').disabled"),'price acknowledged');
    assert.equal(JSON.parse(await control({action:'stats'})).orders,before,'acknowledgment must not submit');
  });
  await check('Bank text changed after quote: explicit review, form retained, no order before confirmation',async()=>{
    const before=JSON.parse(await control({action:'stats'})).orders;await control({action:'settings',patch:{bankAccountInfo:'Fixture Bank B - 000002'}});
    await click('Gửi Đơn Đặt Hàng');await waitText('Thông tin đặt hàng đã thay đổi');await waitText('Fixture Bank B');
    assert.equal(JSON.parse(await control({action:'stats'})).orders,before);assert.equal(await js("document.querySelector('[name=fullName]').value"),'Fixture Browser Customer');await shot('bank-conflict');
    await click('Xác nhận thông tin mới');await until(()=>js("!document.querySelector('button[type=submit]').disabled"),'review accepted');
  });
  await check('Lost create response then reload/retry yields same order and immutable confirmation',async()=>{
    const before=JSON.parse(await control({action:'stats'})).orders;
    await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/orders',requestStage:'Response'}]});paused=null;
    await click('Gửi Đơn Đặt Hàng');await until(()=>paused,'order response');assert.equal(paused.responseStatusCode,201);
    await cdp('Fetch.failRequest',{requestId:paused.requestId,errorReason:'ConnectionClosed'});await cdp('Fetch.disable');
    await waitText('Thử lại yêu cầu');assert.equal(JSON.parse(await control({action:'stats'})).orders,before+1);
    const savedAttempt=await js("sessionStorage.getItem('citilap-checkout-attempt-v1')");
    await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/orders',requestStage:'Request'}]});paused=null;
    await click('Thử lại yêu cầu');await until(()=>paused,'challenge rejection');
    await cdp('Fetch.fulfillRequest',{requestId:paused.requestId,responseCode:403,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({success:false,error:{code:'timeout-or-duplicate',message:'Challenge expired'}})).toString('base64')});
    await cdp('Fetch.disable');await waitText('Challenge expired');
    assert.equal(await js("sessionStorage.getItem('citilap-checkout-attempt-v1')"),savedAttempt,'challenge rejection must retain idempotency key and body');
    await control({action:'settings',patch:{bankTransferEnabled:false,codEnabled:false,bankAccountInfo:'Fixture Bank C',addressHanoi:'Fixture showroom C'}});
    await cdp('Page.reload');await waitText('Thử lại yêu cầu');await click('Thử lại yêu cầu');await waitText('Đã Tiếp Nhận Đơn Đặt Hàng!');await waitText('Fixture Bank B');
    assert.ok((await text()).includes('Fixture showroom A'));assert.ok(!(await text()).includes('Fixture Bank C'));assert.equal(JSON.parse(await control({action:'stats'})).orders,before+1);await shot('order-success');
  });
  console.log('R07C full-app browser: '+passed+'/'+passed+' PASS');
} catch(error) {
  if(ws?.readyState===WebSocket.OPEN){await writeFile('.wrangler/r07c-browser-failure.txt',await text()).catch(()=>{});await shot('browser-failure').catch(()=>{});}
  throw error;
} finally {
  if(ws?.readyState===WebSocket.OPEN){try{await cdp('Browser.close');}catch{}ws.close();}
  chrome.kill();await sleep(500);
  if(profile.startsWith(resolve('.wrangler')+'/') || profile.startsWith(resolve('.wrangler')+'\\'))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
