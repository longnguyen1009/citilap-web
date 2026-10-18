import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const profile = await mkdtemp(resolve('.wrangler/improvements-chrome-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, sequence = 0;
const calls = new Map();
const errors = [];
const metricRequests = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) { for (let i = 0; i < 100; i++) { const value = await fn(); if (value) return value; await delay(200); } throw Error('Timed out: ' + label); }
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { calls.delete(id); reject(Error(method)); }, 20000); calls.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
async function js(expression) { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
async function navigate(path, expected) { await cdp('Page.navigate', { url: base + path }); await until(() => js(`document.body?.innerText.includes(${JSON.stringify(expected)})`), expected); }
try {
  const port = await until(async () => { try { return (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]; } catch { return null; } }, 'Chrome startup');
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', event => { const m = JSON.parse(event.data); if (m.id) { const call = calls.get(m.id); if (call) { calls.delete(m.id); m.error ? call.reject(Error(m.error.message)) : call.resolve(m.result); } } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); });
  ws.addEventListener('message', event => { const m = JSON.parse(event.data); if (m.method === 'Network.requestWillBeSent' && m.params.request.url.endsWith('/api/storefront-metrics')) metricRequests.push(m.params.request.postData); });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await mkdir('.wrangler/improvements-evidence', { recursive: true });
  for (const width of [1440, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate('/chon-laptop?budget=20000000&need=office&portable=yes', 'Vì sao có trong gợi ý?');
    assert(await js("document.querySelector('input[name=budget]').value === '20000000'"));
    assert(await js('document.documentElement.scrollWidth <= innerWidth + 1'));
    const shot = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(`.wrangler/improvements-evidence/advisor-${width}.png`, Buffer.from(shot.data, 'base64'));
    await navigate('/product/demo-thinkpad-t14', 'Hồ sơ kiểm tra từng máy');
    assert(await js("document.body.innerText.includes('Dữ liệu kiểm định mẫu')"));
    assert(await js('document.documentElement.scrollWidth <= innerWidth + 1'));
    await js("document.querySelector('a[href*=\"unit=DEMO-THINKPAD-T14\"]').click()");
    await until(() => js("!!document.querySelector('input[type=datetime-local]')"), 'appointment form');
    await until(() => js("document.body.innerText.includes('DEMO-THINKPAD-T14') && location.pathname === '/lien-he'"), 'appointment unit');
    assert(await js("document.querySelectorAll('input[type=datetime-local]').length === 1"));
    console.log(`PASS browser ${width}px: advisor, price filter reload, inspection, appointment link, overflow`);
  }
  await navigate('/search?q=gaming%2020%20trieu', 'Nitro');
  assert(await js("document.body.innerText.includes('Nitro')"));
  assert.equal(metricRequests.length, 0, 'Analytics must stay off before consent');
  await until(() => js("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Cho phép thống kê') && Object.keys(b).some(k => k.startsWith('__reactProps$')))"), 'consent hydration');
  await js("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Cho phép thống kê')).click()");
  await navigate('/product/demo-elitebook-840', 'Hồ sơ kiểm tra từng máy');
  await until(() => metricRequests.length > 0, 'consented metrics');
  assert(metricRequests.every(raw => Object.keys(JSON.parse(raw)).join(',') === 'event'));
  assert.equal(await js("fetch('/api/storefront-metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'view_item'})}).then(r=>r.status)"), 204);
  console.log('PASS analytics: off before consent, event-only payload, local D1 accepts event');
  const response = await fetch(base + '/api/admin/products/demo-thinkpad-t14/inspections');
  assert.equal(response.status, 401);
  assert.equal((await fetch(base + '/api/storefront-metrics', { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ event: 'page_view', email: 'must-not-store@example.invalid' }) })).status, 400);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS browser: natural search, admin auth, analytics rejects personal data, no JS exceptions');
} finally { ws?.close(); chrome.kill(); }
