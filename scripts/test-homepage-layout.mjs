import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

// Run with local app on port 3001 and Chrome remote debugging on port 9223.
const target = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(t => t.type === 'page');
assert(target, 'Open Chrome with --remote-debugging-port=9223');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0, loaded; const pending = new Map(); const errors = [];
ws.onmessage = e => {
  const r = JSON.parse(e.data);
  if (r.method === 'Page.loadEventFired') loaded?.();
  if (r.method === 'Runtime.exceptionThrown') errors.push(r.params.exceptionDetails.text);
  if (r.id) { const p = pending.get(r.id); pending.delete(r.id); r.error ? p.reject(r.error) : p.resolve(r.result); }
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value; };
const wait = expression => evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+30000;function poll(){if(${expression})resolve(true);else if(Date.now()>end)reject(Error('Readiness timed out: '+${JSON.stringify(expression)}));else setTimeout(poll,100)}poll()})`);
const pause = ms => evaluate(`new Promise(r=>setTimeout(r,${ms}))`);
const origin = 'http://[::1]:3001';
async function navigate(path = '/') {
  let timer;
  try { await Promise.all([new Promise((resolve, reject) => { loaded = resolve; timer = setTimeout(() => reject(Error('Page load timed out')), 45000); }), send('Page.navigate', { url: origin + path })]); }
  finally { clearTimeout(timer); loaded = undefined; }
}
async function ready() {
  await wait(`document.querySelector('section[aria-label="Khám phá laptop"] [role="tab"]')`);
  await pause(1200);
  await wait(`document.querySelector('section[aria-label="Khám phá laptop"] [role="tab"]')`);
  await wait(`(()=>{const b=document.querySelector('#category-menu-button');return Object.keys(b||{}).some(k=>k.startsWith('__reactProps')&&typeof b[k].onClick==='function')})()`);
}
async function click(selector) {
  const point = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing '+${JSON.stringify(selector)});el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
const dir = '.wrangler/homepage-v2-evidence'; mkdirSync(dir, { recursive: true });
async function screenshot(name, selector) {
  const viewport = await evaluate('({width:innerWidth,height:innerHeight})');
  const clip = selector ? await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const header=document.querySelector('header').getBoundingClientRect().height;scrollTo({top:el.getBoundingClientRect().top+scrollY-header-12,behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`) : undefined;
  await pause(500);
  await evaluate(`Promise.race([Promise.all([...document.querySelectorAll(${JSON.stringify(selector ? selector + ' img' : 'header img')})].map(img=>img.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,4000))])`);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!clip, ...(clip ? { clip } : {}) });
  writeFileSync(`${dir}/${name}.png`, Buffer.from(r.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: viewport.width < 768 });
}
const report = { widths: [], checks: [] };
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(); await ready();
  const sections = await evaluate(`Array.from(document.querySelectorAll('.site-builder-content > section')).map(s=>s.getAttribute('aria-label'))`);
  const ordered = ['HOT SALE', 'Khám phá laptop', 'Laptop Gaming', 'Laptop Văn Phòng - Ultrabook Cao Cấp', 'Máy Trạm Workstation - Đồ Họa & Kỹ Thuật', 'Apple - MacBook', 'Phụ kiện Laptop', 'Phụ kiện cho góc làm việc', 'Video review sản phẩm', 'Tin tức công nghệ mới', 'Hình ảnh khách hàng tại CitiLap'];
  let previous = -1; for (const title of ordered) { const index = sections.indexOf(title); assert(index > previous, title); previous = index; }
  assert.equal(await evaluate(`document.querySelector('header ul a').textContent.trim()`), 'HOT SALE');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('section[aria-label=""] a')).filter(a=>a.querySelector('img')).length`), 10);
  assert.equal(await evaluate(`document.body.innerText.includes('Bạn cần laptop để làm gì?')`), false);
  assert.equal(await evaluate(`document.body.innerText.includes('Cùng chọn chiếc laptop phù hợp')`), false);
  assert(await evaluate(`document.querySelector('section[aria-label="HOT SALE"] a[href^="/product/"]') !== null`), 'HOT SALE has registered products');
  assert(await evaluate(`document.querySelector('.site-builder-content > section').getBoundingClientRect().height <= 300`), 'Compact hero');
  assert(await evaluate(`document.querySelector('.site-builder-content > section:nth-child(3)').getBoundingClientRect().top < innerHeight - 100`), 'Categories visible on first screen');
  await screenshot('top-homepage');
  const images = await evaluate(`Array.from(document.querySelectorAll('.site-builder-content > section')).find(s=>s.getAttribute('aria-label')==='').querySelectorAll('img').length`); assert.equal(images,10);
  await screenshot('categories', '.site-builder-content > section:nth-child(3)');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`scrollTo({top:0,behavior:'instant'})`); await pause(400);
  await click('#category-menu-button'); await wait(`document.querySelector('#category-dropdown-menu')`);
  assert.match(await evaluate(`getComputedStyle(document.querySelector('button[aria-label="Đóng danh mục"]')).backdropFilter`), /blur/);
  assert(await evaluate(`document.querySelector('#category-dropdown-menu').getBoundingClientRect().top >= document.querySelector('header').getBoundingClientRect().bottom`));
  assert.equal(await evaluate(`document.querySelector('#category-dropdown-menu').innerText.includes('Xem tất cả danh mục')`), false);
  for (const href of ['/hot-sale', '/news', '/gioi-thieu']) {
    assert.equal(await evaluate(`!!document.querySelector('#category-dropdown-menu a[href="${href}"]')`), false, `Category menu excludes ${href}`);
    assert(await evaluate(`!!document.querySelector('header ul a[href="${href}"]')`), `Header keeps ${href}`);
  }
  assert(await evaluate(`Array.from(document.querySelector('#category-dropdown-menu').firstElementChild.querySelectorAll('a')).every(a=>a.getAttribute('href').startsWith('/category/'))`), 'Category menu only contains product categories');
  assert(await evaluate(`document.querySelector('#category-dropdown-menu').innerText.includes('Lenovo Legion') && document.querySelector('#category-dropdown-menu').innerText.includes('Asus ROG')`), 'Model links preserved');
  assert.equal(await evaluate(`document.body.style.overflow`), 'hidden');
  const lockedY = await evaluate('scrollY');
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 1400, y: 900, deltaX: 0, deltaY: 600 });
  await pause(400);
  assert.equal(await evaluate('scrollY'), lockedY, 'Page locked while menu open');
  assert(await evaluate(`!!document.querySelector('#category-dropdown-menu')`), 'Wheel does not dismiss menu');
  await screenshot('category-overlay');
  await click('#category-menu-button');
  await wait(`!document.querySelector('#category-dropdown-menu') && document.body.style.overflow !== 'hidden'`);
  await click('#category-menu-button');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: 1430, y: 990 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: 1430, y: 990 });
  await wait(`!document.querySelector('#category-dropdown-menu') && document.body.style.overflow !== 'hidden'`);
  await click('#category-menu-button');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await wait(`!document.querySelector('#category-dropdown-menu')`);
  await click('#category-menu-button');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
  await wait(`!document.querySelector('#category-dropdown-menu') && document.body.style.overflow !== 'hidden'`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  report.checks.push('Section order, HOT SALE products, compact hero and visible categories', 'Separate category and header menus, locked page, toggle/backdrop/Escape dismissal');
  await click('section[aria-label="HOT SALE"] button[aria-label="Sản phẩm tiếp theo"]');
  await wait(`document.querySelector('[aria-label="Sản phẩm HOT SALE"]').scrollLeft > 0 && !document.querySelector('section[aria-label="HOT SALE"] button[aria-label="Sản phẩm trước"]').disabled`);
  await click('section[aria-label="HOT SALE"] button[aria-label="Sản phẩm trước"]');
  await wait(`document.querySelector('[aria-label="Sản phẩm HOT SALE"]').scrollLeft <= 1`);
  await screenshot('hot-sale', 'section[aria-label="HOT SALE"]');
  report.checks.push('HOT SALE single row, next and previous arrows');
  await click('section[aria-label="Khám phá laptop"] button[aria-label="Sản phẩm tiếp theo"]');
  await wait(`document.querySelector('section[aria-label="Khám phá laptop"] [aria-label="Sản phẩm Laptop mới về"]').scrollLeft>0`);
  await screenshot('product-tabs', 'section[aria-label="Khám phá laptop"]');
  await click('section[aria-label="Khám phá laptop"] [role="tab"]:nth-child(3)');
  await wait(`document.querySelector('section[aria-label="Khám phá laptop"] [role="tab"][aria-selected="true"]').textContent==='Laptop LikeNew'`);
  assert.equal(await evaluate(`document.querySelector('section[aria-label="Khám phá laptop"] [aria-label="Sản phẩm Laptop LikeNew"]').scrollLeft`), 0, 'Tab change resets carousel');
  assert(await evaluate(`document.querySelector('section[aria-label="Khám phá laptop"] button[aria-label="Sản phẩm trước"]').disabled`));
  await click('section[aria-label="Khám phá laptop"] [role="tab"]:nth-child(4)');
  await wait(`document.querySelector('section[aria-label="Khám phá laptop"]').textContent.includes('Chưa có sản phẩm xả hàng')`);
  report.checks.push('Carousel arrows and LikeNew/clearance tab switching');
  await click('section[aria-label="Video review sản phẩm"] .grid button');
  await wait(`document.querySelector('dialog[open] iframe')`);
  assert.match(await evaluate(`document.querySelector('dialog[open] iframe').src`), /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await wait(`!document.querySelector('dialog iframe')`);
  report.checks.push('YouTube player and Escape cleanup');
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await navigate(); await ready();
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false, `Page overflow ${width}`);
    assert(await evaluate(`(()=>{const rail=document.querySelector('[aria-label="Sản phẩm HOT SALE"]');return rail.children.length === 10 && rail.scrollWidth > rail.clientWidth && new Set([...rail.children].map(el=>el.offsetTop)).size === 1})()`), `HOT SALE single scrollable row ${width}`);
    assert(await evaluate(`document.querySelector('.site-builder-content > section:nth-child(3)').getBoundingClientRect().top < innerHeight - 100`), `Categories visible ${width}`);
    if (width === 390) {
      await click('button[aria-label="Mở danh mục sản phẩm"]');
      await wait(`document.querySelector('[role="dialog"] a[href="/hot-sale"]')`);
      await click('[role="dialog"] a[href="/hot-sale"]');
      await wait(`location.pathname==='/hot-sale' && document.querySelector('h1')?.textContent==='HOT SALE'`);
      await wait(`document.querySelectorAll('a[href^="/product/"]').length >= 10`);
      await navigate(); await ready();
      await screenshot('mobile-categories', '.site-builder-content > section:nth-child(3)');
      await screenshot('mobile-hot-sale', 'section[aria-label="HOT SALE"]');
      await screenshot('mobile-gallery', 'section[aria-label="Hình ảnh khách hàng tại CitiLap"]');
    }
    if (width === 1440) {
      await screenshot('video-review', 'section[aria-label="Video review sản phẩm"]');
      await screenshot('news', 'section[aria-label="Tin tức công nghệ mới"]');
      await screenshot('customers', 'section[aria-label="Hình ảnh khách hàng tại CitiLap"]');
    }
    report.widths.push({ width, overflow: false }); console.log('PASS viewport', width);
  }
  const policies = await evaluate(`Array.from(document.querySelectorAll('footer h3')).find(h=>h.textContent==='Chính sách khách hàng').parentElement.innerText`);
  const about = await evaluate(`Array.from(document.querySelectorAll('footer h3')).find(h=>h.textContent==='Về CitiLap').parentElement.innerText`);
  assert(policies.includes('Bảo vệ thông tin cá nhân')); assert(!about.includes('Chính sách bảo hành'));
  assert.deepEqual(errors, []); report.errors = errors;
  writeFileSync(`${dir}/browser.json`, JSON.stringify(report, null, 2));
  console.log('PASS homepage layout', report);
} finally { ws.close(); }
