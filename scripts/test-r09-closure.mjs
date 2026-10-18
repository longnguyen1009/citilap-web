// Real Chrome, isolated profile, native CDP; no browser dependencies or app API mocks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
const base=process.argv[2];
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+$/);
const profile=await mkdtemp(resolve('.wrangler/r09-close-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','about:blank'],{windowsHide:true,stdio:'ignore'});
let passed=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<100;i++){const result=await fn();if(result)return result;await sleep(100);}throw Error('Timed out: '+label);}
async function control(input){const r=await fetch(base+'/__fixture/control',{method:'POST',body:JSON.stringify(input)});assert.equal(r.status,200);return r.text();}
async function check(name,fn){await fn();console.log('PASS '+(++passed)+': '+name);}
try {
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome');
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  async function page(target){
    const socket=new WebSocket(target.webSocketDebuggerUrl);await once(socket,'open');
    let n=0;const pending=new Map();
    socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
    const evalJs=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
    const navigate=async path=>{await evalJs('window.__previousDocument=true');await send('Page.navigate',{url:base+path});await until(()=>evalJs('!window.__previousDocument && location.pathname==='+JSON.stringify(path.split('?')[0])+" && document.readyState==='complete'"),'navigation '+path);};
    const click=async selector=>{await until(()=>evalJs('!!document.querySelector('+JSON.stringify(selector)+')'),'control '+selector);await evalJs('document.querySelector('+JSON.stringify(selector)+').click()');};
    return {socket,send,evalJs,navigate,click,body:()=>evalJs("document.body?.innerText || ''")};
  }
  const first=await page(targets.find(t=>t.type==='page'));
  const version=await fetch('http://127.0.0.1:'+port+'/json/version').then(r=>r.json());
  const browser=await pageBrowser(version.webSocketDebuggerUrl);
  async function pageBrowser(url){const socket=new WebSocket(url);await once(socket,'open');let seq=0;return {socket,send:(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>reject(Error(method+' timeout')),20000);const listener=e=>{const m=JSON.parse(e.data);if(m.id!==id)return;clearTimeout(timer);socket.removeEventListener('message',listener);m.error?reject(Error(m.error.message)):resolve(m.result);};socket.addEventListener('message',listener);socket.send(JSON.stringify({id,method,params}));})};}
  const pages=[first];
  for(let i=0;i<3;i++){const {targetId}=await browser.send('Target.createTarget',{url:'about:blank'});const all=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());pages.push(await page(all.find(t=>t.id===targetId)));}
  const [listing,pdp,compare,wish]=pages;
  await control({action:'archive-all'});await control({action:'available'});await control({action:'price',price:18000000});
  await control({action:'settings',patch:{flashSaleEnabled:true,flashSaleStartAt:new Date(Date.now()+25000).toISOString(),flashSaleEndAt:new Date(Date.now()+50000).toISOString(),codEnabled:true,bankTransferEnabled:true}});
  await check('Four public pages cross same real sale clock without manual refresh',async()=>{
    for(const p of pages)await p.send('Emulation.setFocusEmulationEnabled',{enabled:true});
    await Promise.all([listing.navigate('/search?q=Fixture'),pdp.navigate('/product/fixture-p'),compare.navigate('/search?q=Fixture'),wish.navigate('/wishlist')]);
    await wish.evalJs("localStorage.setItem('citilap-wishlist',JSON.stringify({version:1,ids:['fixture-p']}))");await wish.send('Page.reload');
    await compare.click('button[title="Thêm vào so sánh"]');
    await until(()=>compare.evalJs("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('So sánh ngay'))"),'compare tray');
    await compare.evalJs("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('So sánh ngay')).click()");
    const scope=p=>p===compare?"document.querySelector('dialog')?.innerText || ''":"document.body?.innerText || ''";
    const has=async value=>(await Promise.all(pages.map(p=>p.evalJs('('+scope(p)+').includes('+JSON.stringify(value)+')')))).every(Boolean);
    try {await until(()=>has('22.000.000'),'regular prices');}catch(error){console.log(await Promise.all(pages.map(p=>p.body())));throw error;}
    for(let i=0;i<70 && !(await has('18.000.000'));i++)await sleep(500);
    assert.ok(await has('18.000.000'),'all four show sale');
    const anySale=async()=>(await Promise.all(pages.map(p=>p.evalJs('('+scope(p)+').includes("18.000.000")')))).some(Boolean);
    for(let i=0;i<70 && (await anySale());i++)await sleep(500);
    await until(()=>has('22.000.000'),'all four return regular');
    for(const p of pages)assert.ok(!(await p.evalJs('('+scope(p)+').includes("18.000.000")')),'no expired sale price');
  });
  await check('Unpublish removes public product after reload, including related and APIs',async()=>{
    await control({action:'unavailable'});
    try {
      await listing.navigate('/search?q=Fixture');await until(async()=>!(await listing.body()).includes('Fixture Laptop Alpha'),'hidden search');
      await pdp.navigate('/product/fixture-q');assert.ok(!(await pdp.body()).includes('Fixture Laptop Alpha'));
      const r=await fetch(base+'/api/compare?ids=fixture-p');assert.equal((await r.json()).products.length,0);
      const w=await fetch(base+'/api/wishlist?ids=fixture-p').then(r=>r.json());assert.deepEqual(w.unavailableIds,['fixture-p']);
      assert.equal((await fetch(base+'/product/fixture-p')).status,404);
    } finally {await control({action:'available'});}
  });
  await check('Offline wishlist retains IDs, supports retry and recovers online',async()=>{
    await wish.navigate('/wishlist');await until(async()=>(await wish.body()).includes('Fixture Laptop Alpha'),'wishlist loaded');
    await wish.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    try {await wish.evalJs("window.dispatchEvent(new Event('focus'))");await until(async()=>(await wish.body()).includes('Thử lại'),'offline retry');assert.deepEqual(await wish.evalJs("JSON.parse(localStorage.getItem('citilap-wishlist')).ids"),['fixture-p']);await wish.evalJs("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Thử lại')).click()");await until(async()=>(await wish.body()).includes('Thử lại'),'retry remains usable offline');}
    finally {await wish.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:200000,uploadThroughput:200000});}
    await until(async()=>(await wish.body()).includes('Fixture Laptop Alpha'),'online recovery');
  });
  await check('CMS phone/address changes reach rendered footer and helper routes',async()=>{
    await control({action:'settings',patch:{storePhone:'0901234999',addressHanoi:'Synthetic CMS showroom 2026'}});
    for(const route of ['/','/profile','/order-tracking']){await listing.navigate(route);await until(async()=>(await listing.body()).includes('0901234999'),'CMS phone '+route);assert.ok((await listing.body()).includes('Synthetic CMS showroom 2026'));}
    for(const route of ['/search','/profile','/order-tracking']){await listing.navigate(route);assert.ok(await listing.evalJs("document.querySelector('meta[name=robots]')?.content.includes('noindex')"));}
  });
  await writeFile('docs/admin/evidence/r09-closure.json',JSON.stringify({recordedAt:new Date().toISOString(),passed,browser:version.Browser,environment:'Built local Worker + ephemeral D1/R2; four Chrome targets with focus emulation; no remote proof'},null,2));
  for(const p of pages)p.socket.close();await browser.send('Browser.close');browser.socket.close();
} finally {chrome.kill();await sleep(500);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
