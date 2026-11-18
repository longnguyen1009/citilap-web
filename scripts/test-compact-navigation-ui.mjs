// Run: node scripts/test-compact-navigation-ui.mjs
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
const route = await mkdtemp(resolve('.wrangler/navigation-ui-fixture-'));
const evidence = '.wrangler/compact-navigation-evidence';
let browser, server, ws, sequence = 0;
const calls = new Map(), errors = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, attempts = 60) { for (let i=0; i<attempts; i++) { if (await fn()) return; await pause(250); } throw Error('UI timed out'); }
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
  await writeFile(route+'/Preview.tsx', `import {useEffect} from 'react';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import {WishlistProvider} from '@/context/WishlistContext';
import {CartProvider} from '@/context/CartContext';
const names=['Lenovo','ASUS','MSI','Acer','Gigabyte','Dell','HP','Razer'];
const brands=names.map((name,i)=>({id:'b'+i,name:name+' Gaming',label:name+' Gaming',href:'/brand-'+i,parentId:'gaming',slug:'brand-'+i}));
const series=brands.flatMap((b,i)=>(i===0?['Legion','LOQ','Lecoo Gaming']:['Gaming Series']).map((name,j)=>({id:'s'+i+j,name:names[i]+' '+name,href:'/series-'+i+j,parentId:b.id,slug:'series-'+i+j})));
const navigation={categories:[{id:'gaming',name:'Laptop Gaming',href:'/gaming',slug:'laptop-gaming'},...brands,...series,{id:'model',name:'Legion Pro 5',href:'/model',parentId:'s00'}],collections:[],menus:{main:[{id:'gaming',label:'Laptop Gaming',href:'/gaming',children:brands.map(b=>({...b,children:[]}))},{id:'office',label:'Office',href:'/office',children:[{id:'office-child',label:'All Office',href:'/office-all'}]}]}};
export default function Preview(){useEffect(()=>{document.documentElement.dataset.navigationReady='true'},[]);return <CartProvider><WishlistProvider><div className="storefront-shell"><Header navigation={navigation}/><main style={{minHeight:1000,padding:24}}><button id="outside">Outside</button></main><MobileBottomNav navigation={navigation}/></div></WishlistProvider></CartProvider>}
`);
  await writeFile(route+'/main.tsx', `import React from 'react'; import {createRoot} from 'react-dom/client'; import './styles.css'; import Preview from './Preview'; createRoot(document.getElementById('root')!).render(<Preview/>);`);
  await writeFile(route+'/styles.css', '@import "../../src/app/globals.css"; @source "../../src";');
  await writeFile(route+'/index.html', '<html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
  const standIns = {
    './CartIcon': 'export default function CartIcon(){return null}',
    '@/components/search/SearchAutocomplete': 'import React from "react"; export default function Search(){return <input aria-label="Search" style={{width:"100%"}}/>}',
    'next/navigation': `export const usePathname=()=>'/'; export const useRouter=()=>({replace:url=>history.replaceState(null,'',url),push:url=>history.pushState(null,'',url)});`,
    'next/link': `import React from 'react'; export default function Link({prefetch,...props}){return React.createElement('a',props);}`,
    'next/image': `import React from 'react'; export default function Image({fill,priority,quality,unoptimized,loader,style,...props}){return React.createElement('img',{...props,style:fill?{position:'absolute',width:'100%',height:'100%',inset:0,...style}:style});}`,
  };
  for (const id of Object.keys(standIns)) {
    if (id.startsWith('@/')) standIns[resolve('src', id.slice(2)).replaceAll('\\', '/')] = standIns[id];
  }
  server = await createServer({
    root:route, publicDir:resolve('public'), cacheDir:resolve('.wrangler/navigation-ui-vite-cache'), configFile:false, define:{'process.env':'{}'},
    optimizeDeps:{entries:[route+'/main.tsx'],exclude:Object.keys(standIns)},
    resolve:{alias:{'@':resolve('src')}},
    plugins:[{name:'fixture-next',enforce:'pre',resolveId:id=>id in standIns?'\0'+id:undefined,load:id=>standIns[id.slice(1)]},react(),tailwindcss()],
    server:{port:Number(new URL(base).port),strictPort:true,fs:{allow:[resolve('.')]},watch:{ignored:['**/.wrangler/navigation-edge-*/**']}},
    logLevel:'error',
  });
  await server.listen();
  const profile = await mkdtemp(resolve('.wrangler/navigation-edge-'));
  await mkdir(evidence,{recursive:true});
  browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','about:blank'], {windowsHide:true,stdio:'ignore'});
  let port;
  await until(async()=>{try { port=(await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]; return port; } catch {return false;}});
  const tabs = await fetch('http://127.0.0.1:'+port+'/json').then(r=>r.json());
  ws = new WebSocket(tabs.find(tab => tab.type === 'page' && tab.url === 'about:blank').webSocketDebuggerUrl); await once(ws,'open');
  ws.onmessage = event => { const msg=JSON.parse(event.data); if(msg.id){const call=calls.get(msg.id);calls.delete(msg.id);if(msg.error)call?.reject(msg.error);else call?.resolve(msg.result);} if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text); };
  await cdp('Runtime.enable');
  await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
  await cdp('Page.navigate',{url:base});
  await until(()=>js("document.documentElement.dataset.navigationReady==='true'"));
  const opener = "document.querySelector('[data-nav-opener]')";
  const panel = "document.querySelector('[id^=header-submenu]')";
  for(const width of [1440,1024,768,390,320]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    await pause(300);
    assert(await js('document.documentElement.scrollWidth<=innerWidth'),'Overflow '+width);
    if(width>=768){
      await js(opener+'.click()'); await until(()=>js('!!'+panel));
      assert.equal(await js(panel+".innerText.includes('Legion Pro 5')"),false);
      assert.equal(await js(panel+".querySelector('[href=\"/series-00\"]').textContent.trim()"),'Legion');
      assert.equal(await js("document.querySelectorAll('[id^=header-submenu]').length"),1);
      assert(await js(panel+'.getBoundingClientRect().bottom<=innerHeight'));
      await writeFile(evidence+'/'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
      await js(opener+'.click()'); await until(()=>js('!'+panel));
    } else {
      await js("document.querySelector('[aria-haspopup=dialog]').click()");
      await until(()=>js("!!document.querySelector('dialog[open]')"));
      await js("document.querySelector('dialog [aria-expanded=false]').click()");
      await pause(100);
      await js("document.querySelector('dialog [aria-expanded=false]').click()");
      await until(()=>js("!!document.querySelector('dialog a[href=\"/series-00\"]')"));
      assert.equal(await js("document.querySelector('dialog a[href=\"/series-00\"]').textContent.trim()"),'Legion');
      assert.equal(await js("!!document.querySelector('dialog a[href=\"/model\"]')"),false);
      await writeFile(evidence+'/'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
      await js("document.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true}))");
      await until(()=>js("!document.querySelector('dialog[open]')"));
    }
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await pause(300);
  const point=await js(opener+'.getBoundingClientRect().toJSON()');
  await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+10,y:point.y+10});await pause(200);assert.equal(await js('!!'+panel),false);
  await js(opener+'.focus()');
  assert(await js('document.activeElement==='+opener));
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(()=>js('!!'+panel));
  await js(panel+".querySelector('a').focus()");
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await until(()=>js('!'+panel));assert(await js('document.activeElement==='+opener));
  await js(opener+'.click()');await until(()=>js('!!'+panel));
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:5,y:800,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:800,button:'left',clickCount:1});
  await until(()=>js('!'+panel));
  assert.deepEqual(errors,[]);
  console.log('PASS compact hierarchy, click toggle, no hover opening, Enter, Escape/focus, outside click, 1440/1024/768/390/320px. Screenshots: '+evidence);
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
