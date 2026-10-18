// Real Chrome, isolated profile, native CDP; no browser dependencies or app API mocks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
const base=process.argv[2];
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+$/);
const profile=await mkdtemp(resolve('.wrangler/r09a-chrome-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--window-size=1440,1000','--force-device-scale-factor=1','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,sequence=0;const calls=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<100;i++){const result=await fn();if(result)return result;await sleep(100);}throw Error('Timed out: '+label);}
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{calls.delete(id);reject(Error('CDP timeout: '+method));},15000);calls.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('docs/admin/evidence/r09a-'+name+'.png',Buffer.from(r.data,'base64'));}
try {
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome');
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=calls.get(m.id);if(!p)return;calls.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);});
  await cdp('Page.enable');await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:'chrome://settings/appearance'});
  await until(()=>js("typeof chrome.settingsPrivate?.setDefaultZoom==='function'"),'Chrome zoom API');
  await js('new Promise(resolve=>chrome.settingsPrivate.setDefaultZoom(2,resolve))');
  const observations=[];
  for(const path of ['/','/search','/product/fixture-p','/checkout']){
    if(path==='/checkout')await js(`localStorage.setItem('citilap_cart',JSON.stringify([{id:'fixture-p',productId:'fixture-p',name:'Fixture Laptop Alpha',price:20000000,displayPrice:'20.000.000',image:'',quantity:1,maxQuantity:10,available:true}]))`);
    await cdp('Page.navigate',{url:base+path});await until(()=>js('location.pathname==='+JSON.stringify(path)+" && document.readyState==='complete'"),'route');
    await sleep(1000);
    if(path==='/checkout')await until(()=>js("!!document.querySelector('input[name=fullName]')"),'populated checkout');
    const metrics=await js('({dpr:devicePixelRatio,innerWidth,outerWidth,scale:visualViewport.scale,scrollWidth:document.documentElement.scrollWidth,cssZoom:getComputedStyle(document.documentElement).zoom})');
    console.log(path,metrics);
    assert.equal(metrics.dpr,2,'native zoom doubles DPR at OS scale 1');assert.equal(metrics.scale,1,'not pinch');assert.equal(metrics.cssZoom,'1','not CSS zoom');
    assert.ok(Math.abs(metrics.innerWidth*2-metrics.outerWidth)<=40,'native zoom halves viewport accounting for browser frame');
    assert.ok(metrics.scrollWidth<=metrics.innerWidth,'no horizontal document overflow');
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.ok(await js('document.activeElement!==document.body'),'keyboard control');
    await shot('native-zoom-'+(path==='/'?'home':path.split('/')[1]));observations.push({path,...metrics});
  }
  await writeFile('docs/admin/evidence/r09-native-zoom.json',JSON.stringify({recordedAt:new Date().toISOString(),method:'chrome.settingsPrivate.setDefaultZoom(2) in isolated profile; OS scale 1; no CDP metrics override, pinch or CSS zoom',observations},null,2));
  console.log('Native browser zoom 200%: 4/4 PASS');
} finally {if(ws?.readyState===WebSocket.OPEN){await cdp('Browser.close').catch(()=>{});ws.close();}chrome.kill();await sleep(500);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
