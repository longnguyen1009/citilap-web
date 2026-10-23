import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const target = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(t => t.type === 'page');
assert(target, 'Chrome remote debugging required on port 9223');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = event => {
  const m = JSON.parse(event.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
};
const wait = condition => evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+20000;function poll(){if(${condition})resolve(true);else if(Date.now()>end)reject(Error('Timed out'));else setTimeout(poll,100)}poll()})`);
const section = `Array.from(document.querySelectorAll('section')).find(s=>s.querySelector('[aria-label="Ảnh khách hàng, cuộn ngang để xem thêm"]'))`;
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://[::1]:3001/' });
  await wait(`document.querySelector('[aria-label="Ảnh khách hàng, cuộn ngang để xem thêm"] button')`);
  await wait(`(()=>{const b=(${section}).querySelector('button');return Object.keys(b).some(k=>k.startsWith('__reactProps')&&typeof b[k].onClick==='function')})()`);
  for (const width of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    const metrics = await evaluate(`(()=>{const s=${section};s.scrollIntoView({block:'center'});const r=s.querySelector('[role="region"]');return {count:r.children.length,overflow:r.scrollWidth>r.clientWidth,rows:new Set([...r.children].map(b=>b.offsetTop)).size,pageOverflow:document.documentElement.scrollWidth>innerWidth}})()`);
    assert(metrics.count > 1); assert(metrics.overflow); assert.equal(metrics.rows, 1); assert.equal(metrics.pageOverflow, false);
    await evaluate(`(${section}).querySelector('[aria-label="Cuộn ảnh tiếp theo"]').click()`);
    await wait(`(${section}).querySelector('[role="region"]').scrollLeft>0`);
    await evaluate(`(()=>{const b=(${section}).querySelector('[role="region"] button');b.focus();b.click()})()`);
    await wait(`(${section}).querySelector('dialog').open && (${section}).querySelector('dialog img')?.naturalWidth>0`);
    assert(await evaluate(`(${section}).querySelector('dialog').contains(document.activeElement)`));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await wait(`!(${section}).querySelector('dialog').open`);
    assert(await evaluate(`document.activeElement===(${section}).querySelector('[role="region"] button')`));
    await evaluate(`(${section}).querySelector('[role="region"] button').click()`);
    await wait(`(${section}).querySelector('dialog').open`);
    await evaluate(`(${section}).querySelector('[aria-label="Đóng ảnh"]').click()`);
    await wait(`!(${section}).querySelector('dialog').open`);
    mkdirSync('.wrangler/customer-gallery-evidence', { recursive: true });
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`.wrangler/customer-gallery-evidence/${width}.png`, Buffer.from(shot.data, 'base64'));
    console.log('PASS', width, metrics, 'scroll, enlarge, Escape, close, focus restoration');
  }
  assert.deepEqual(errors, []);
} finally { ws.close(); }
