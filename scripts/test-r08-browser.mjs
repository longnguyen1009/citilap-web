// Real Chrome, isolated profile, native CDP; no browser dependencies or app API mocks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
const base=process.argv[2];
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+$/);
const profile=await mkdtemp(resolve('.wrangler/r08-chrome-'));
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
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('docs/admin/evidence/r08-'+name+'.png',Buffer.from(r.data,'base64'));}
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
  let pageId;
  await check('Owner login form and menu hydrate',async()=>{
    await cdp('Page.navigate',{url:base+'/login'});await until(()=>js("!!document.querySelector('input[type=email]')"),'login');
    await until(()=>js("Object.keys(document.querySelector('input[type=email]')).some(k=>k.startsWith('__reactProps'))"),'login hydrated');
    await input('input[type=email]','fixture@example.invalid');await input('input[type=password]','FixtureOnlyPassword-2026');
    await js("document.querySelector('form').requestSubmit()");await until(()=>js("location.pathname.startsWith('/admin')"),'logged in');
    const data=await api("fetch('/api/admin/pages?q=fixture-scheduled').then(r=>r.json())");pageId=data.data.items[0].id;
    await cdp('Page.navigate',{url:base+'/admin/pages/'+pageId});await until(()=>js("!!document.querySelector('[name=title]')"),'editor');
  });
  await check('Autosave persists draft across reload without publishing',async()=>{
    await input('[name=title]','Browser autosave draft');
    await until(()=>api("fetch('/api/admin/pages/"+pageId+"').then(r=>r.json()).then(j=>j.data.document.title==='Browser autosave draft')"),'autosaved');
    assert.ok(!(await fetch(base+'/fixture-scheduled').then(r=>r.text())).includes('Browser autosave draft'));
    await cdp('Page.reload');await until(()=>js("document.querySelector('[name=title]')?.value==='Browser autosave draft'"),'reload draft');
    await shot('autosave-desktop');
  });
  await check('Late save response never overwrites newer typing',async()=>{
    paused=null;await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/admin/pages/'+pageId,requestStage:'Response'}]});
    await input('[name=title]','First slow save');await until(()=>paused,'save response paused');
    await input('[name=title]','Newer edit kept');await cdp('Fetch.continueResponse',{requestId:paused.requestId});await cdp('Fetch.disable');paused=null;
    await until(()=>api("fetch('/api/admin/pages/"+pageId+"').then(r=>r.json()).then(j=>j.data.document.title==='Newer edit kept')"),'queued new edit');
    assert.equal(await js("document.querySelector('[name=title]').value"),'Newer edit kept');
  });
  await check('History restore creates private draft and survives reload',async()=>{
    const publicContent=()=>api("fetch('/fixture-scheduled').then(r=>r.text()).then(html=>{const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script').forEach(n=>n.remove());return doc.querySelector('main')?.innerHTML;})");
    const publicBefore=await publicContent();
    assert.ok(publicBefore,'public main must exist');
    await click('Lịch sử');await click('Khôi phục thành nháp');
    await until(()=>js("document.body?.innerText.includes('Đã khôi phục phiên bản')"),'restore completed');
    const restored=await api("fetch('/api/admin/pages/"+pageId+"').then(r=>r.json()).then(j=>j.data.document.title)");
    assert.notEqual(restored,'Newer edit kept');
    await cdp('Page.reload');await until(()=>js("document.querySelector('[name=title]')?.value==="+JSON.stringify(restored)),'restored reload');
    assert.equal(await publicContent(),publicBefore);
  });
  await check('Concurrent editor conflict preserves local text and stops retry',async()=>{
    await api("(async()=>{const d=(await fetch('/api/admin/pages/"+pageId+"').then(r=>r.json())).data;return fetch('/api/admin/pages/"+pageId+"',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({expectedRevision:d.revision,action:'save',document:{...d.document,title:'Other editor winner'}})}).then(r=>r.status)})()");
    await input('[name=title]','Unsaved conflict text');await sleep(2500);
    assert.equal(await js("document.querySelector('[name=title]').value"),'Unsaved conflict text');
    assert.equal(await api("fetch('/api/admin/pages/"+pageId+"').then(r=>r.json()).then(j=>j.data.document.title)"),'Other editor winner');
    await shot('conflict');
  });
  await check('Redirect screen loads at mobile width and persists rule',async()=>{
    await cdp('Page.navigate',{url:base+'/admin/redirects'});await until(()=>js("document.querySelectorAll('form input').length>=3"),'redirect UI');
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await input('form input:nth-of-type(1)','/browser-old');
    await input('form label:nth-child(2) input','/news');
    await js("document.querySelector('form').requestSubmit()");await until(()=>api("fetch('/api/admin/redirects').then(r=>r.json()).then(j=>j.data.some(x=>x.source==='/browser-old'))"),'redirect persisted');
    await cdp('Page.reload');await until(()=>js("document.body?.innerText.includes('/browser-old')"),'redirect reload');await shot('redirect-mobile');
  });
  await check('Logout invalidates current cookie',async()=>{
    assert.equal(await api("fetch('/api/auth/logout',{method:'POST'}).then(r=>r.status)"),200);
    assert.equal(await api("fetch('/api/admin/users').then(r=>r.status)"),401);
    await cdp('Page.navigate',{url:base+'/admin/pages'});await until(()=>js("location.pathname==='/login'"),'expired session redirect');
  });
  console.log('R08 browser: '+passed+'/'+passed+' PASS');
} catch(error) {
  if(ws?.readyState===WebSocket.OPEN){await writeFile('.wrangler/r08-browser-failure.txt',await text()).catch(()=>{});await shot('browser-failure').catch(()=>{});}
  throw error;
} finally {
  if(ws?.readyState===WebSocket.OPEN){try{await cdp('Browser.close');}catch{}ws.close();}
  chrome.kill();await sleep(500);
  if(profile.startsWith(resolve('.wrangler')+'/') || profile.startsWith(resolve('.wrangler')+'\\'))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
