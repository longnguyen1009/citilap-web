// Focused runnable browser/CDP check for Round 07A:
// 1. /admin/audit manual refresh ("Làm mới") aborts older in-flight request and preserves loading/latest rows.
// 2. /admin/audit & /admin/redirects clipboard async pending/rejected/unavailable/retry + stale 2s timer guard.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const base = process.argv[2] || 'http://localhost:3012';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/);
const env = { ...process.env };
const cookie = JSON.parse(await readFile('.wrangler/admin-review-20261112/browser-session.json', 'utf8')).token;
assert(cookie, 'Session token required from browser-session.json');

const directory = '.wrangler/admin-review-20261112/browser-evidence';
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(resolve('.wrangler/admin-workspace-qa-07a-'));
const browser = spawn(
  env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', 'about:blank'],
  { windowsHide: true, stdio: 'ignore' }
);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (const end = Date.now() + 45000; Date.now() < end; ) {
    if (await fn()) return;
    await pause(100);
  }
  throw new Error('Timeout: ' + label);
}

let ws;
let serial = 0;
let auditLoadCount = 0;
const calls = new Map();
const errors = [];
const blocked = [];

function cdp(method, params = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const id = ++serial;
    const timer = setTimeout(() => {
      calls.delete(id);
      rejectPromise(new Error(method));
    }, 45000);
    calls.set(id, {
      resolve: (r) => {
        clearTimeout(timer);
        resolvePromise(r);
      },
      reject: rejectPromise,
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function js(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}

try {
  let port;
  await until(async () => {
    try {
      port = (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0];
      return port;
    } catch {
      return false;
    }
  }, 'Chrome DevToolsActivePort');

  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then((r) => r.json());
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');

  ws.addEventListener('message', async (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const call = calls.get(m.id);
      if (call) {
        calls.delete(m.id);
        m.error ? call.reject(new Error(m.error.message)) : call.resolve(m.result);
      }
    }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails.text);
    }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      if (request.method === 'GET' && request.url.includes('/api/admin/audit?')) {
        const currentCount = ++auditLoadCount;
        // Request 1: immediate so UI renders; Request 2: slow (900ms); Request 3 (manual refresh): slower (1900ms)
        const delay = currentCount === 1 ? 0 : currentCount === 2 ? 900 : 1900;
        await pause(delay);
        await cdp('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          body: Buffer.from(
            JSON.stringify({
              data: [
                {
                  id: 'audit-row-' + currentCount,
                  actorId: 'qa',
                  actorName: 'QA Admin',
                  action: 'product.save',
                  entityId: 'ent-' + currentCount,
                  summary: 'Audit load #' + currentCount,
                  occurredAt: new Date().toISOString(),
                  requestId: 'req-id-' + currentCount,
                },
              ],
              total: 1,
            })
          ).toString('base64'),
        }).catch(() => {});
        return;
      }
      if (request.method === 'GET' && request.url.endsWith('/api/admin/redirects')) {
        await cdp('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          body: Buffer.from(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'redir-1',
                  source: '/old-laptop',
                  target: '/new-laptop',
                  enabled: true,
                  note: 'QA rule',
                  revision: 1,
                },
              ],
            })
          ).toString('base64'),
        }).catch(() => {});
        return;
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        blocked.push(request.url);
        await cdp('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
      } else {
        await cdp('Fetch.continueRequest', { requestId });
      }
    }
  });

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Network.setCookie', { name: 'admin_session', value: cookie, url: base, httpOnly: true, sameSite: 'Lax' });
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  // Part 1: Audit manual refresh ownership & stale 2-second copy timer guard
  await cdp('Page.navigate', { url: base + '/admin/audit' });
  await until(() => js("!!document.body && document.body.innerText.includes('Audit load #1')"), 'Initial audit load');

  // Trigger manual refresh #2 (900ms), then while #2 is in-flight trigger filter change #3 (1900ms)
  await js("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Làm mới')).click()");
  await until(() => Promise.resolve(auditLoadCount === 2), 'Manual refresh #2 started');
  await pause(200);
  await js("Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sản phẩm').click()");
  await until(() => Promise.resolve(auditLoadCount === 3), 'Filter load #3 started while refresh #2 was in-flight');
  await pause(900); // Past 900ms when #2 finishes on server; aborted #2 must NOT hide loading or show #2
  assert.equal(
    await js("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Làm mới')).disabled"),
    true,
    'Aborted manual refresh #2 must not clear loading state of request #3'
  );
  await until(() => js("!!document.body && document.body.innerText.includes('Audit load #3')"), 'Latest load #3 rendered');

  // Test stale 2s timer on /admin/audit:
  // Copy at t=0, then copy again at t=1200ms; at t=2300ms (after first 2s timer expires), copied indicator must STILL be active!
  await js(
    "Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } })"
  );
  const auditCopyBtn = 'button[title^="Sao chép Request ID:"]';
  await js(`document.querySelector(${JSON.stringify(auditCopyBtn)}).click()`);
  await until(() => js(`!!document.querySelector(${JSON.stringify(auditCopyBtn + ' .lucide-check')})`), 'First copy check visible');
  await pause(1200);
  await js(`document.querySelector(${JSON.stringify(auditCopyBtn)}).click()`);
  await until(() => js(`!!document.querySelector(${JSON.stringify(auditCopyBtn + ' .lucide-check')})`), 'Second copy check visible');
  await pause(1100); // Total 2300ms since first copy, 1100ms since second copy
  assert.equal(
    await js(`!!document.querySelector(${JSON.stringify(auditCopyBtn + ' .lucide-check')})`),
    true,
    'Stale 2s timer from first copy must not clear newer copied indicator on /admin/audit'
  );

  // Part 2: /admin/redirects clipboard pending, unavailable API, rejection, retry on same button, and stale 2s timer guard
  await cdp('Page.navigate', { url: base + '/admin/redirects' });
  const redirSrcBtn = 'button[title="Sao chép link nguồn"]';
  await until(() => js(`!!document.body && !!document.querySelector(${JSON.stringify(redirSrcBtn)})`), 'Redirects page ready');

  // 2a. Unavailable clipboard API shows Vietnamese error alert
  await js("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })");
  await js(`document.querySelector(${JSON.stringify(redirSrcBtn)}).click()`);
  await until(
    () => js("!!document.body && document.body.innerText.includes('sao chép') && !!document.querySelector('[role=alert]')"),
    'Unavailable clipboard error visible on /admin/redirects'
  );
  assert.equal(
    await js(`!!document.querySelector(${JSON.stringify(redirSrcBtn + ' .lucide-check')})`),
    false,
    'Unavailable clipboard must not show success icon'
  );

  // 2b. Deferred promise: pending -> reject -> retry on same button -> resolve
  await js(
    "Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise((resolve, reject) => { window.redirCopyResolve = resolve; window.redirCopyReject = reject; }) } })"
  );
  await js(`document.querySelector(${JSON.stringify(redirSrcBtn)}).click()`);
  await pause(150);
  assert.equal(
    await js(`!!document.querySelector(${JSON.stringify(redirSrcBtn + ' .lucide-check')})`),
    false,
    'Redirects pending clipboard write must not report success'
  );
  await js('window.redirCopyReject(new Error("Denied"))');
  await until(
    () => js("!!document.body && document.body.innerText.includes('sao chép') && !!document.querySelector('[role=alert]')"),
    'Redirects rejected clipboard error visible'
  );
  // Retry through the exact same button
  await js(`document.querySelector(${JSON.stringify(redirSrcBtn)}).click()`);
  await js('window.redirCopyResolve()');
  await until(
    () => js(`!!document.querySelector(${JSON.stringify(redirSrcBtn + ' .lucide-check')})`),
    'Redirects retry on same button succeeds after resolve'
  );

  // 2c. Stale 2s timer on /admin/redirects
  await pause(1200);
  await js(`document.querySelector(${JSON.stringify(redirSrcBtn)}).click()`);
  await js('window.redirCopyResolve()');
  await pause(1100); // 2300ms after first resolve, 1100ms after second resolve
  assert.equal(
    await js(`!!document.querySelector(${JSON.stringify(redirSrcBtn + ' .lucide-check')})`),
    true,
    'Stale 2s timer must not clear newer copied indicator on /admin/redirects'
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  console.log('PASS Round 07A focused check: audit + redirects clipboard async feedback, retry, and timer guards verified');
} finally {
  ws?.close();
  browser.kill();
  assert(profile.startsWith(resolve('.wrangler') + sep));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
