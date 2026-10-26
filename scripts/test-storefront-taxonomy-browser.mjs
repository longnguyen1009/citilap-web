import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const profile = await mkdtemp(resolve('.wrangler/taxonomy-chrome-'));
const chrome = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws, sequence=0;
const calls=new Map(), errors=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<120;i++){const value=await fn();if(value)return value;await delay(250);}throw Error('Timed out: '+label);}
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{calls.delete(id);reject(Error(method));},45000);calls.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function navigate(path){
  await cdp('Page.navigate',{url:base+path});
  await until(()=>js(`location.pathname === ${JSON.stringify(path.split('?')[0])} && document.readyState === 'complete' && !!document.querySelector('h1')`),path);
  await until(()=>js("!!document.querySelector('#category-menu-button') && Object.keys(document.querySelector('#category-menu-button')).some(k=>k.startsWith('__reactProps$'))"),'hydration '+path);
}
async function shot(name){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('.wrangler/taxonomy-evidence/'+name+'.png',Buffer.from(r.data,'base64'));}
try {
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome');
  const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
  await cdp('Page.enable');await cdp('Runtime.enable');
  await mkdir('.wrangler/taxonomy-evidence',{recursive:true});
  const navigation=await fetch(base+'/api/catalog/navigation').then(r=>r.json());
  const nav=navigation.data || navigation;
  assert(nav.categories.some(c=>c.href==='/laptop-gaming/lenovo-legion/legion-5-2023'));
  assert.equal(nav.menus.main.length,8, 'Preserve original eight menu entries');
  assert(!nav.menus.main.some(i=>['/laptop-moi','/laptop-likenew','/laptop-ultrabook'].includes(i.href)));
  assert.equal(nav.menus.main.find(i=>i.href==='/laptop-gaming').children.length,9);
  for (const menu of nav.menus.main.filter(m=>nav.categories.some(c=>c.href===m.href))) for (const child of menu.children) {
    const category = nav.categories.find(c=>c.href===child.href);
    assert(category, 'Menu child must resolve to a category: '+child.label);
    assert.equal(category.parentId,nav.categories.find(c=>c.href===menu.href).id);
  }
  const sitemap=await fetch(base+'/sitemap.xml').then(r=>r.text());
  assert(sitemap.includes('/laptop-gaming/lenovo-legion/legion-5-2023'));
  assert(!/\/(product|category)\//.test(sitemap));
  const homepage=await fetch(base).then(r=>r.text());
  assert(!/href="\/(product|category)\//.test(homepage),'Homepage links use canonical paths');
  const productHtml=await fetch(base+'/laptop-gaming/lenovo-legion').then(r=>r.text());
  const productPath=productHtml.match(/href="(\/laptop\/[^"?]+)/)?.[1];assert(productPath,'Published Legion product');
  const old=await fetch(base+'/product/'+productPath.split('/').at(-1)+'?sku=keep-me',{redirect:'manual'});
  assert.equal(old.status,301);assert.equal(new URL(old.headers.get('location'),base).pathname,productPath);assert.equal(new URL(old.headers.get('location'),base).search,'?sku=keep-me');
  assert.equal((await fetch(base+'/laptop-ultrabook/lenovo-legion/legion-5-2023')).status,404);
  console.log('PASS HTTP: product 301 keeps query; wrong category ancestry returns 404');
  const pages=process.argv.includes('--menu-only')?[]:['chinh-sach-bao-hanh','chinh-sach-doi-tra','chinh-sach-van-chuyen','chinh-sach-bao-mat','huong-dan-mua-hang','dieu-khoan-mua-hang','cau-hoi-thuong-gap','gioi-thieu','he-thong-cua-hang'];
  for(const width of [1440,768,390,320]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await navigate('/laptop-gaming/lenovo-legion/legion-5-2023');
    assert(await js("document.querySelector('link[rel=canonical]')?.href.endsWith('/laptop-gaming/lenovo-legion/legion-5-2023')"));
    assert(await js("[...document.querySelectorAll('nav a')].some(a=>a.getAttribute('href')==='/laptop-gaming/lenovo-legion')"));
    assert(await js('document.documentElement.scrollWidth <= innerWidth+1'));
    if(width===1440){
      await until(()=>js("!!document.querySelector('#category-menu-button') && Object.keys(document.querySelector('#category-menu-button')).some(k=>k.startsWith('__reactProps$'))"),'header hydration');
      await js("document.querySelector('#category-menu-button').click()");
      await until(()=>js("!!document.querySelector('#category-dropdown-menu')"),'desktop menu');
      await js("document.querySelector('#category-dropdown-menu a[href=\"/laptop-gaming\"]').focus()");
      await until(()=>js("!!document.querySelector('#category-dropdown-menu a[href=\"/laptop-gaming/lenovo-legion\"]')"),'curated menu');
      assert(await js("document.querySelectorAll('#category-dropdown-menu > div:first-child > a').length===5"));
      await shot('desktop-tree');
      await js("document.querySelector('#category-dropdown-menu a[href=\"/laptop-gaming/lenovo-legion\"]').click()");
      await until(()=>js("location.pathname==='/laptop-gaming/lenovo-legion' && !document.querySelector('#category-dropdown-menu')"),'desktop category click');
    }
    if(width===390){
      await until(()=>js("[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')?.includes('danh mục') && b.getBoundingClientRect().width>0 && Object.keys(b).some(k=>k.startsWith('__reactProps$')))"),'mobile category hydration');
      await js("[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.includes('danh mục') && b.getBoundingClientRect().width>0).click()");
      await until(()=>js("!!document.querySelector('[role=dialog][aria-modal=true]')"),'mobile drawer open');
      await until(()=>js("[...document.querySelectorAll('a[href=\"/laptop-gaming/lenovo-legion\"]')].some(a=>a.getBoundingClientRect().width>0)"),'mobile curated group');
      await shot('mobile-tree');
      await js("[...document.querySelectorAll('a[href=\"/laptop-gaming/lenovo-legion\"]')].find(a=>a.getBoundingClientRect().width>0).click()");
      await until(()=>js("!document.querySelector('[role=dialog]') && location.pathname==='/laptop-gaming/lenovo-legion'"),'mobile category click');
    }
    await navigate(productPath);
    assert(await js(`document.querySelector('link[rel=canonical]')?.href.endsWith(${JSON.stringify(productPath)})`));
    assert(await js('document.documentElement.scrollWidth <= innerWidth+1'));
    for(const slug of pages){
      await navigate('/'+slug);
      const style=await js("(()=>{const article=document.querySelector('.prose');const h=article?.querySelector('h2,h3');const p=article?.querySelector('p');return {article:!!article,heading:h&&getComputedStyle(h).fontSize,body:p&&getComputedStyle(p).fontSize,margin:p&&getComputedStyle(p).marginTop,overflow:document.documentElement.scrollWidth>innerWidth+1,list:article?.querySelector('ul')&&getComputedStyle(article.querySelector('ul')).listStyleType};})()");
      assert(style.article,slug);assert(!style.overflow,`${slug} overflow at ${width}`);
      if(style.heading&&style.body)assert(parseFloat(style.heading)>parseFloat(style.body),slug+' heading hierarchy');
      if(style.margin)assert(parseFloat(style.margin)>0,slug+' paragraph spacing');
      if(style.list)assert.equal(style.list,'disc');
      if(slug==='chinh-sach-bao-hanh')await shot('policy-'+width);
    }
    await navigate('/lien-he');
    assert(await js('document.documentElement.scrollWidth <= innerWidth+1'));
    assert(await js("!!document.querySelector('form input')"));
    console.log(`PASS browser ${width}px: curated menu, category/product canonical and overflow`);
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS no uncaught browser exceptions');
}finally{ws?.close();chrome.kill();}
