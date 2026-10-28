// Local, read-only UI checks. Login creates a session; subsequent mutations are blocked.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { parseEnv } from 'node:util';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/);
const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
let cookie = process.env.ADMIN_UI_COOKIE;
if (!cookie) {
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }), signal: AbortSignal.timeout(30000) });
  assert.equal(login.status, 200, 'Local login');
  cookie = login.headers.getSetCookie().find(v => v.startsWith('admin_session='))?.split(';')[0].slice(14);
}
assert(cookie);
const directory = '.wrangler/admin-workspace-evidence';
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(resolve('.wrangler/admin-workspace-qa-'));
const browser = spawn(env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label) { for (const end = Date.now() + 45000; Date.now() < end;) { if (await fn()) return; await pause(150); } throw Error('Timeout: ' + label); }
let ws, serial = 0;
const calls = new Map(), errors = [], results = [], blocked = [], apiErrors = [];
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { calls.delete(id); reject(Error(method)); }, 45000); calls.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
async function js(expression) { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; }
try {
  let port;
  await until(async () => { try { port = (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]; return port; } catch { return false; } }, 'Chrome');
  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(r => r.json());
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', async event => {
    const m = JSON.parse(event.data);
    if (m.id) { const call = calls.get(m.id); if (call) { calls.delete(m.id); m.error ? call.reject(Error(m.error.message)) : call.resolve(m.result); } }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/api/') && m.params.response.status >= 400) apiErrors.push({ url: m.params.response.url, status: m.params.response.status });
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) { blocked.push(request.url); await cdp('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }); }
      else await cdp('Fetch.continueRequest', { requestId });
    }
  });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await cdp('Network.setCookie', { name: 'admin_session', value: cookie, url: base, httpOnly: true, sameSite: 'Lax' });
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const routes = ['dashboard', 'products', 'products/new', 'orders', 'customers', 'contacts', 'categories', 'brands', 'campaigns', 'media', 'posts', 'posts/new', 'post-categories', 'pages', 'pages/new', 'builder', 'builder/home', 'navigation', 'analytics', 'settings', 'users', 'audit', 'redirects'].map(s => '/admin/' + s);
  for (const route of routes) {
    const nav = await cdp('Page.navigate', { url: base + route });
    await until(async () => (await cdp('Page.getFrameTree')).frameTree.frame.loaderId === nav.loaderId, route);
    await until(() => js(`location.pathname === ${JSON.stringify(route)} && !!document.querySelector('#admin-content h1')`), route + ' content');
    await pause(700);
    // Discover existing records for detail screens without creating sample content.
    if (['/admin/products', '/admin/orders', '/admin/posts', '/admin/pages'].includes(route)) {
      const href = await js(`[...document.querySelectorAll('main a[href]')].map(a => a.getAttribute('href')).find(h => h.startsWith(${JSON.stringify(route + '/')}) && !h.endsWith('/new') && !h.includes('?'))`);
      if (href && !routes.includes(href)) routes.push(href);
    }
    for (const width of [1280, 1440, 1920]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      const metrics = await js(`(() => { const main = document.querySelector('#admin-content'); return { heading: main.querySelector('h1').textContent.trim(), overflow: main.scrollWidth > main.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, sidebar: document.querySelector('.admin-sidebar').getBoundingClientRect().width, bar: document.querySelector('.admin-topbar').getBoundingClientRect().height }; })()`);
      assert(!metrics.pageOverflow && !metrics.overflow, route + ' overflow at ' + width + ': ' + JSON.stringify(metrics));
      assert.equal(metrics.sidebar, 240); assert.equal(metrics.bar, 44);
      assert(!/[\p{L}]\?[\p{L}]/u.test(metrics.heading), route + ' heading encoding');
      results.push({ route, width, ...metrics });
      if (width === 1440) await writeFile(directory + '/' + route.slice(7).replaceAll('/', '-') + '.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    }
    if (route === '/admin/settings') {
      const count = await js(`document.querySelectorAll('.admin-settings-tabs button').length`);
      for (let i = 0; i < count; i++) {
        await js(`document.querySelectorAll('.admin-settings-tabs button')[${i}].click()`);
        assert.equal(await js(`document.querySelectorAll('.admin-settings-tabs button[aria-pressed=true]').length`), 1);
        assert(await js(`!!document.querySelector('.admin-settings form h2')`), 'Settings panel heading');
      }
    }
    if (await js(`!!document.querySelector('.admin-schedule')`)) {
      await js(`document.querySelector('.admin-schedule summary').focus()`);
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      assert(await js(`document.querySelector('.admin-schedule').open`), 'Schedule opens with keyboard');
      assert(await js(`!!document.querySelector('.admin-schedule input[type=datetime-local]')`));
    }
    console.log('PASS ' + route + ' at 1280/1440/1920');
  }
  assert.deepEqual(errors, [], 'Browser exceptions');
  assert.deepEqual(apiErrors, [], 'API reads');
  assert.deepEqual(blocked, [], 'No automatic writes');
  await writeFile(directory + '/results.json', JSON.stringify({ results, errors, apiErrors, blocked }, null, 2));
  console.log(`${routes.length} pages, ${results.length} viewport checks PASS; read-only local data.`);
} catch (error) {
  if (ws) {
    console.error(await js(`({url:location.href,text:document.body.innerText.slice(0,1200)})`).catch(() => 'No browser diagnostic'));
    await writeFile(directory + '/failure.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64')).catch(() => {});
  }
  throw error;
} finally {
  ws?.close(); browser.kill();
  assert(profile.startsWith(resolve('.wrangler') + sep));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
