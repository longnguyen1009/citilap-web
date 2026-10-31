import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const profile = await mkdtemp(resolve('.wrangler/compare-chrome-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, sequence = 0;
const calls = new Map();
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) {
  for (let i = 0; i < 150; i++) { const value = await fn(); if (value) return value; await delay(200); }
  throw Error('Timed out: ' + label);
}
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { calls.delete(id); reject(Error(method)); }, 30000);
    calls.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const removeButtons = '[...document.querySelectorAll("main button[title]")].filter(b=>b.title.startsWith("Bỏ "))';
try {
  const search = await fetch(base + '/api/search?limit=48').then(r => r.json());
  const candidates = search.data.products.filter(p => p.variantId && p.price > 0 && p.availability === 'AVAILABLE');
  const pair = candidates.filter(p => p.template === candidates[0]?.template).slice(0, 2);
  assert.equal(pair.length, 2, 'Local fixture needs two available products of the same template');
  const ids = pair.map(p => p.id);
  const compared = await fetch(base + '/api/compare?ids=' + ids.join(',')).then(r => r.json());
  assert(compared.success && compared.compatible);
  assert.equal(compared.products[0].variantId, pair[0].variantId, 'API preserves selected variant');
  const port = await until(async () => { try { return (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]; } catch { return null; } }, 'Chrome');
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id) { const call = calls.get(m.id); if (call) { calls.delete(m.id); m.error ? call.reject(Error(m.error.message)) : call.resolve(m.result); } }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error(m.params.args.map(a=>a.value || a.description).join(' '));
  });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('citilap_compare_items_v2',JSON.stringify([{id:'stale-session-product',name:'Stale session'}]));` });
  for (const width of [1440, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await cdp('Page.navigate', { url: base + '/so-sanh?ids=' + ids.join(',') });
    await until(() => js(`${removeButtons}.length === 2`), 'shared products override session');
    await until(() => js(`${removeButtons}.every(b=>Object.keys(b).some(k=>k.startsWith('__reactProps$')))`), 'hydration');
    assert.equal(await js(`${removeButtons}.map(b=>b.title).join('|')`), compared.products.map(p => `Bỏ ${p.name}`).join('|'));
    assert(await js('document.documentElement.scrollWidth <= innerWidth + 1'), 'No page overflow');
    await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Thêm giỏ hàng').click()`);
    await until(() => js(`JSON.parse(localStorage.getItem('citilap_cart')||'[]').some(p=>p.productId===${JSON.stringify(ids[0])} && p.variantId===${JSON.stringify(pair[0].variantId)})`), 'variant saved in cart');
    await js(`${removeButtons}[0].click()`);
    await until(() => js(`${removeButtons}.length === 1`), 'remove first');
    await js(`${removeButtons}[0].click()`);
    await until(() => js(`document.body.innerText.includes('Chưa có sản phẩm nào trong bảng so sánh')`), 'remove last');
    await delay(400);
    assert.equal(await js(`${removeButtons}.length`), 0, 'URL must not resurrect removed items');
    await cdp('Page.navigate', { url: base + '/so-sanh?ids=' + ids.join(',') });
    await until(() => js(`${removeButtons}.length === 2`), 'reload restores shared URL');
    await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Xóa tất cả').click()`);
    await until(() => js(`document.body.innerText.includes('Chưa có sản phẩm nào trong bảng so sánh')`), 'clear all');
    console.log(`PASS ${width}px: shared URL, variant cart, remove last, clear all, reload, overflow`);
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
} catch (error) {
  if (ws?.readyState === WebSocket.OPEN) console.error(await js('({url:location.href,body:document.body.innerText.slice(0,1800)})'), errors);
  throw error;
} finally { ws?.close(); chrome.kill(); }
