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

const base = process.argv[2] || 'http://localhost:3017';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const route = await mkdtemp(resolve('.wrangler/hero-ui-fixture-'));
const evidence = '.wrangler/product-hero-evidence';
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
  await writeFile(route+'/Preview.tsx', `"use client";
import { useEffect, useState } from 'react';
import { CartProvider } from '@/context/CartContext';
import ProductHeroSection from '@/components/product/ProductHeroSection';
import ProductTrustBadges from '@/components/product/ProductTrustBadges';
const variants = Array.from({length:8}, (_, i) => ({id:'v'+i, sku:'QA-'+i, name:i === 7 ? 'Core Ultra 7 255H phiên bản cấu hình tên dài' : 'Core Ultra '+(i+1)+' 225H', subSpecs:'32GB · 1TB · Intel Arc 140T', price:32900000+i*1000000, tag:i === 5 ? 'Bán chạy' : undefined, isFlashSale:i === 6}));
export default function Preview() {
 const [count,setCount] = useState(8);
 useEffect(()=>{document.documentElement.dataset.heroReady='true';},[]);
 return <CartProvider><main className="max-w-[1370px] mx-auto p-3">
 <div className="flex gap-3 py-2">{[1,2,8].map(n=><button key={n} onClick={()=>setCount(n)}>Mẫu {n}</button>)}</div>
 <ProductHeroSection key={count} productId="qa-local" productSlug="qa-product-hero-local" productName={'[Like New] HONOR MagicBook Art 14 (2025) - Intel Core Ultra 7 255H | 32GB | 1TB | 14.6 inch 3.1K OLED 120Hz Cảm Ứng'} modelCode="" productionYear="2025" brandName="HUAWEI" images={[]} coverImage="/images/placeholder-laptop.svg" basePrice={32900000} variants={variants.slice(0,count)} warranties={[{id:'w1',name:'Bảo hành 6 tháng',priceDiff:500000},{id:'w2',name:'Bảo hành 12 tháng',priceDiff:1000000,isDefault:true}]} gifts={['Balo Gaming CitiLap cỡ lớn chống nước','Chuột Gaming LED RGB 6 nút bấm','Bàn di chuột Gaming khổ lớn','Gói cân màu màn hình & vệ sinh tra keo trọn đời']} />
 <div id="custom-trust"><ProductTrustBadges items={['Chính sách riêng từ admin: bảo hành 24 tháng','Nội dung tùy chỉnh giữ nguyên']} /></div>
 </main></CartProvider>;
}`);
  await writeFile(route+'/main.tsx', `import React from 'react'; import {createRoot} from 'react-dom/client'; import './styles.css'; import Preview from './Preview'; createRoot(document.getElementById('root')!).render(<Preview/>);`);
  await writeFile(route+'/styles.css', '@import "../../src/app/globals.css"; @source "../../src";');
  await writeFile(route+'/index.html', '<html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
  const standIns = {
    'next/navigation': `export const useRouter=()=>({replace:url=>history.replaceState(null,'',url),push:url=>history.pushState(null,'',url)});`,
    'next/link': `import React from 'react'; export default function Link(props){return React.createElement('a',props);}`,
    'next/image': `import React from 'react'; export default function Image({fill,priority,quality,unoptimized,loader,style,...props}){return React.createElement('img',{...props,style:fill?{position:'absolute',width:'100%',height:'100%',inset:0,...style}:style});}`,
  };
  server = await createServer({
    root:route, publicDir:resolve('public'), cacheDir:resolve('.wrangler/hero-ui-vite-cache'), configFile:false, define:{'process.env':'{}'},
    optimizeDeps:{entries:[route+'/main.tsx'],exclude:Object.keys(standIns)},
    resolve:{alias:{'@':resolve('src')}},
    plugins:[{name:'fixture-next',enforce:'pre',resolveId:id=>id in standIns?'\0'+id:undefined,load:id=>standIns[id.slice(1)]},react(),tailwindcss()],
    server:{port:Number(new URL(base).port),strictPort:true,fs:{allow:[resolve('.')]},watch:{ignored:['**/.wrangler/hero-edge-*/**']}},
    logLevel:'error',
  });
  await server.listen();
  const profile = await mkdtemp(resolve('.wrangler/hero-edge-'));
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
  const visible = "[...document.querySelectorAll('#product-variant-options button')].filter(b=>b.getBoundingClientRect().height>0)";
  assert.equal(await js(visible+'.length'),4);
  await js("document.querySelector('[aria-controls=product-variant-options]').click()");
  await until(()=>js(visible+'.length===8'));
  await js("document.querySelectorAll('#product-variant-options button')[7].click()");
  await until(()=>js("document.querySelectorAll('#product-variant-options button')[7].getAttribute('aria-pressed')==='true'"));
  await until(()=>js("location.search.includes('sku=QA-7')"));
  await js("document.querySelector('[aria-controls=product-variant-options]').click()");
  await until(()=>js(visible+'.length===5'));
  assert.equal(await js("document.querySelectorAll('#product-variant-options button')[7].getBoundingClientRect().height>0"),true);
  assert.match(await js("document.querySelector('main').innerText"),/40\.900\.000₫/);
  await js("document.querySelector('[aria-label=\"Chọn bảo hành\"] button').click()");
  await until(()=>js("document.querySelector('main').innerText.includes('40.400.000₫')"));
  for (const width of [1440,1024,768,390,320]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await pause(300);
    assert(await js('document.documentElement.scrollWidth<=innerWidth'), 'Overflow at '+width);
    assert(await js(visible+'.every(b=>b.getBoundingClientRect().height>=44)'), 'Touch targets at '+width);
    assert.equal(await js("document.querySelector('#custom-trust').innerText.includes('Chính sách riêng từ admin: bảo hành 24 tháng')"),true);
    await writeFile(evidence+'/'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
    if (width===390) {
      await js("document.querySelector('[aria-label=\"Đặc quyền mua hàng\"]').scrollIntoView({block:'center'})");
      await writeFile(evidence+'/390-trust.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
      await js('scrollTo(0,0)');
    }
  }
  for (const count of [2,1]) {
    await js(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Mẫu ${count}').click()`);
    await until(()=>js(count===1 ? "!document.querySelector('#product-variant-options')" : "document.querySelectorAll('#product-variant-options button').length===2"));
    assert.equal(await js("!!document.querySelector('[aria-controls=product-variant-options]')"),false);
    if (count===2) {
      await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
      await pause(300);
      await writeFile(evidence+'/two-variants-desktop.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 1/2/8 variants; expand/collapse; selected option stays visible; SKU and price update; warranty; custom trust; 1440/1024/768/390/320px; no runtime errors. Screenshots: '+evidence);
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
