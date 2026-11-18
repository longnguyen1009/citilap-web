// Run: node scripts/test-product-hero-ui.mjs
// Component fixture with navigation/image/link stand-ins; no app server or DB writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const base = process.argv[2] || 'http://localhost:3018';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const route = await mkdtemp(resolve('.wrangler/advisor-ui-fixture-'));
const evidence = '.wrangler/advisor-evidence';
let browser, server, ws, sequence = 0;
const calls = new Map(), errors = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, attempts = 160) { for (let i=0; i<attempts; i++) { if (await fn()) return; await pause(250); } throw Error('UI timed out'); }
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { calls.delete(id); reject(Error(method)); }, 30000);
    calls.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({id, method, params}));
  });
}
async function js(expression) {
  const result = await cdp('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
try {
  await writeFile(route+'/Preview.tsx', `import {useEffect} from 'react'; import LaptopAdvisorClient from '@/components/advisor/LaptopAdvisorClient'; import RecentlyViewedSection from '@/components/product/RecentlyViewedSection'; const products=Array.from({length:6},(_,i)=>({id:'qa'+i,name:'Laptop QA '+i,price:20000000,image:'/images/placeholder-laptop.svg',slug:'qa'+i})); localStorage.setItem('citilap_recently_viewed_v1',JSON.stringify(products)); export default function Preview(){useEffect(()=>{ document.documentElement.dataset.heroReady='true';},[]);return <><LaptopAdvisorClient initialInput={{budget:25000000,need:'office',condition:'any',portable:'any'}} initialResults={products.slice(0,3).map(product=>({product,reasons:['QA'],limitation:'QA'}))}/><div className="max-w-[1370px] mx-auto px-4"><RecentlyViewedSection maxDisplay={5}/></div></>;}`);
  await writeFile(route+'/main.tsx', `import React from 'react'; import {createRoot} from 'react-dom/client'; import './styles.css'; import Preview from './Preview'; createRoot(document.getElementById('root')!).render(<Preview/>);`);
  await writeFile(route+'/styles.css', '@import "../../src/app/globals.css"; @source "../../src";');
  await writeFile(route+'/index.html', '<html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
  const standIns = {
    'next/navigation': `export const usePathname=()=>'/chon-laptop'; export const useRouter=()=>({replace:url=>history.replaceState(null,'',url),push:url=>history.pushState(null,'',url)});`,
    'next/link': `import React from 'react'; export default function Link({prefetch,...props}){return React.createElement('a',props);}`,
    'next/image': `import React from 'react'; export default function Image({fill,priority,quality,unoptimized,loader,style,...props}){return React.createElement('img',{...props,style:fill?{position:'absolute',width:'100%',height:'100%',inset:0,...style}:style});}`,
  };
  server = await createServer({
    root:route, publicDir:resolve('public'), cacheDir:resolve('.wrangler/advisor-ui-vite-cache'), configFile:false, define:{'process.env':'{}'},
    optimizeDeps:{entries:[route+'/main.tsx'],exclude:Object.keys(standIns)},
    resolve:{alias:{'@':resolve('src')}},
    plugins:[{name:'fixture-next',enforce:'pre',resolveId:id=>id in standIns?'\0'+id:undefined,load:id=>standIns[id.slice(1)]},react(),tailwindcss()],
    server:{port:Number(new URL(base).port),strictPort:true,fs:{allow:[resolve('.')]},watch:{ignored:['**/.wrangler/advisor-edge-*/**']}},
    logLevel:'error',
  });
  await server.listen();
  const profile = await mkdtemp(resolve('.wrangler/advisor-edge-'));
  await mkdir(evidence,{recursive:true});
  browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','about:blank'], {windowsHide:true,stdio:'ignore'});
  let port;
  await until(async()=>{try { port=(await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]; return port; } catch {return false;}});
  const tabs = await fetch('http://127.0.0.1:'+port+'/json').then(r=>r.json());
  ws = new WebSocket(tabs.find(tab => tab.type === 'page' && tab.url === 'about:blank').webSocketDebuggerUrl); await once(ws,'open');
  ws.onmessage = event => { const msg=JSON.parse(event.data); if(msg.id){const call=calls.get(msg.id);calls.delete(msg.id);if(msg.error)call?.reject(msg.error);else call?.resolve(msg.result);} if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text); };
  await cdp('Runtime.enable');
  await cdp('Page.navigate',{url:base});
  await until(()=>js("document.documentElement.dataset.heroReady==='true'"));
  for(const width of [1440,1024,768,390,320]) { await cdp('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<768}); await pause(500); assert(await js('document.documentElement.scrollWidth<=innerWidth'),'Overflow '+width); assert.equal(await js("getComputedStyle(document.querySelector('input[type=range]').closest('form')).gridTemplateColumns.split(' ').length"),width>=1024?2:1); assert.equal(await js("getComputedStyle(document.querySelector('section[aria-label] > div.grid')).gridTemplateColumns.split(' ').length"),width>=1024?5:width>=768?3:2); await writeFile(evidence+'/'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64')); } console.log('PASS advisor and recently viewed: 1440/1024/768/390/320, no overflow, 5 product columns on desktop.');
} catch (error) {
  if (ws?.readyState === WebSocket.OPEN) {
    console.log(await js("JSON.stringify({url:location.href,state:document.readyState,text:document.body.innerText.slice(0,2000)})"),errors);
    await writeFile(evidence+'/failure.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  throw error;
} finally {
  ws?.close(); browser?.kill();
  await server?.close();
  for (const name of ['Preview.tsx','main.tsx','styles.css','index.html']) await unlink(route+'/'+name).catch(()=>{});
  await rmdir(route);
}
