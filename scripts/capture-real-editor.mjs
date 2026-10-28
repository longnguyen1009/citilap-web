import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const base = 'http://localhost:3001';
const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
let cookie = process.env.ADMIN_UI_COOKIE;
if (!cookie) {
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
    signal: AbortSignal.timeout(30000)
  });
  cookie = login.headers.getSetCookie().find(value => value.startsWith('admin_session='))?.split(';')[0].slice('admin_session='.length);
}

const profile = await mkdtemp(resolve('.wrangler/admin-screenshot-'));
const browser = spawn(env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profile,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { windowsHide: true, stdio: 'ignore' });

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) {
  for (const end = Date.now() + 30000; Date.now() < end;) {
    if (await fn()) return;
    await pause(100);
  }
  throw Error('Timed out: ' + label);
}

let ws, sequence = 0;
const pending = new Map();
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Error('CDP timeout: ' + method));
    }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
  return result.result.value;
}

try {
  let port;
  await until(async () => {
    try {
      port = (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0];
      return port;
    } catch { return false; }
  }, 'Chrome');

  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(r => r.json());
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const call = pending.get(message.id);
      if (call) {
        pending.delete(message.id);
        message.error ? call.reject(Error(message.error.message)) : call.resolve(message.result);
      }
    }
  });

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Network.setCookie', { name: 'admin_session', value: cookie, url: base, httpOnly: true, sameSite: 'Lax' });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await cdp('Page.navigate', { url: base + '/admin/products' });
  await until(() => js(`!!document.querySelector('.admin-table tbody a')`), 'catalog ready');

  const id = await js(`document.querySelector('.admin-table tbody a').getAttribute('href').split('/').at(-1)`);
  await cdp('Page.navigate', { url: base + '/admin/products/' + id });
  await until(() => js(`!!document.getElementById('product-tab-pricing')`), 'editor ready');

  // Switch to Pricing tab
  await js(`document.getElementById('product-tab-pricing').click()`);
  await pause(300);

  // Scroll down to show table and quick add row
  await js(`document.querySelector('.compact-matrix-table').scrollIntoView({ behavior: 'instant', block: 'center' })`);
  await pause(200);

  const shot = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile('.wrangler/admin-ui-evidence/real-editor-table-scrolled.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved real-editor-table-scrolled.png');

} catch (err) {
  console.error('Error:', err);
} finally {
  ws?.close();
  browser.kill();
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
