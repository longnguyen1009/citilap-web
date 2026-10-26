import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const profile = await mkdtemp(resolve('.wrangler/homepage-cards-chrome-'));
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
async function shot(name){
  await js(`Promise.race([Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0}).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,15000))])`);
  const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('.wrangler/homepage-cards-evidence/'+name+'.png',Buffer.from(r.data,'base64'));
}
try {
  const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Chrome');
  const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
  await cdp('Page.enable');await cdp('Runtime.enable');
  await mkdir('.wrangler/homepage-cards-evidence',{recursive:true});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('/');
  console.log('SECTIONS', await js("[...document.querySelectorAll('main h2')].map(e=>e.textContent)"));
  for(const width of [1440,768,390,320]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await delay(400);
    assert(await js('document.documentElement.scrollWidth <= innerWidth+1'),'Page overflow '+width);
    const rails=await js("[...document.querySelectorAll('[role=region]')].map(e=>({label:e.getAttribute('aria-label'),width:e.clientWidth,scroll:e.scrollWidth}))");
    console.log('RAILS',width,JSON.stringify(rails));
    const products=await js(`(() => {
      const rails=[...document.querySelectorAll('[role=region]')].filter(e=>e.getAttribute('aria-label')?.startsWith('Sản phẩm '));
      return rails.map(rail=>{ const card=rail.querySelector('article');const r=rail.getBoundingClientRect(),c=card.getBoundingClientRect();return {label:rail.getAttribute('aria-label'),top:c.top-r.top,border:getComputedStyle(card).borderTopWidth};});
    })()`);
    assert(products.length>=2,'Product carousels present');
    for(const card of products){assert(card.top>=6,'Hover headroom '+card.label);assert.equal(card.border,'1px');}
    for(const label of ['Tin tức tiếp theo','Cuộn ảnh tiếp theo']){
      const result=await js(`(() => {
        const button=document.querySelector('button[aria-label=${JSON.stringify(label)}]');
        if(!button)return null;
        const rail=button.parentElement.querySelector('[role=region]');
        rail.scrollLeft=0;return {width:rail.clientWidth,scroll:rail.scrollWidth,hidden:getComputedStyle(rail).scrollbarWidth,buttonWidth:button.getBoundingClientRect().width};
      })()`);
      assert(result,'Arrow present '+label);assert.equal(result.hidden,'none');assert(result.buttonWidth>=44);
      if(result.scroll>result.width+2){
        await delay(100);
        await js(`document.querySelector('button[aria-label=${JSON.stringify(label)}]').click()`);
        await until(()=>js(`document.querySelector('button[aria-label=${JSON.stringify(label)}]').parentElement.querySelector('[role=region]').scrollLeft>10`),'Slide '+label);
        await delay(600);
        const previous=label==='Tin tức tiếp theo'?'Tin tức trước':'Cuộn ảnh về trước';
        await js(`document.querySelector('button[aria-label=${JSON.stringify(previous)}]').click()`);
        await until(()=>js(`document.querySelector('button[aria-label=${JSON.stringify(label)}]').parentElement.querySelector('[role=region]').scrollLeft<2`),'Return '+label);
      }
    }
    assert(await js("[...document.querySelectorAll('a[href^=\"/news/\"]')].filter(e=>e.closest('[role=region]')).every(e=>getComputedStyle(e).borderTopWidth==='1px')"),'News card borders');
    await js("document.querySelector('button[aria-label^=\"Phóng to ảnh\"]').click()");
    await until(()=>js("!!document.querySelector('dialog[open]')"),'Gallery zoom');
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await until(()=>js("!document.querySelector('dialog[open]')"),'Close gallery');
    assert(await js("document.activeElement?.getAttribute('aria-label')?.startsWith('Phóng to ảnh')"),'Gallery focus restored');
    await js("scrollTo(0,0)");await shot('home-'+width);
    if(width===1440){
      await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
      await js("document.querySelector('article').scrollIntoView({block:'center'})");
      const point=await js("(()=>{const r=document.querySelector('article').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+20}})()");
      await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(250);
      assert(await js("document.querySelector('article').matches(':hover')"),'Real product hover');
      assert(await js("(()=>{const c=document.querySelector('article'),r=c.closest('[role=region]');return c.getBoundingClientRect().top>=r.getBoundingClientRect().top+4})()"),'Hover border inside rail');
      await shot('product-hover');
      assert(await js("getComputedStyle(document.querySelector('article')).translate === '0px -2px'"),'Hover lift active');
      await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      for(const [name,label] of [['news','Tin tức tiếp theo'],['gallery','Cuộn ảnh tiếp theo']]){
        await js(`document.querySelector('button[aria-label=${JSON.stringify(label)}]').closest('section').scrollIntoView({block:'center'})`);await delay(300);await shot(name);
      }
    }
    console.log('PASS',width,'overflow, card headroom, news/gallery arrows, dialog Escape/focus');
  }
  await js("[...document.querySelectorAll('[role=tab]')].find(e=>e.textContent.trim().toLocaleLowerCase('vi')==='laptop mới').click()");
  await until(()=>js("[...document.querySelectorAll('[role=region]')].some(e=>e.getAttribute('aria-label')?.toLocaleLowerCase('vi')==='sản phẩm laptop mới'&&e.querySelector('article'))"),'New laptop tab');
  assert(await js('document.documentElement.scrollWidth <= innerWidth+1'),'New laptop tab overflow');
  console.log('PASS Laptop mới tab');
  console.log('BROKEN_IMAGES',await js("[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>({alt:i.alt,src:i.getAttribute('src')}))"));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS no uncaught browser exceptions');
}finally{ws?.close();chrome.kill();}
