import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.argv[2];
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+$/);

const profile = await mkdtemp(resolve('.wrangler/cls-bench-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profile,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-sync',
  'about:blank'
], { windowsHide: true, stdio: 'ignore' });

let ws, sequence = 0;
const calls = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 150; i++) {
    const result = await fn();
    if (result) return result;
    await sleep(100);
  }
  throw Error('Timed out: ' + label);
}
function cdp(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++sequence;
    const timer = setTimeout(() => { calls.delete(id); rej(Error('CDP timeout: ' + method)); }, 15000);
    calls.set(id, { resolve: r => { clearTimeout(timer); res(r); }, reject: e => { clearTimeout(timer); rej(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
  return r.result.value;
}

try {
  const port = await until(async () => {
    try { return (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]; }
    catch { return null; }
  }, 'Chrome startup');
  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(r => r.json());
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const call = calls.get(m.id);
      if (call) {
        calls.delete(m.id);
        m.error ? call.reject(Error(m.error.message)) : call.resolve(m.result);
      }
    }
  });

  const versionInfo = await cdp('Browser.getVersion');
  const browserVersion = versionInfo.product || 'Chrome Headless';

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');

  const metricScript = `
    window.__clsRuns = [];
    window.__currentRun = { lcp: null, cls: 0, shifts: [] };
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        window.__currentRun.lcp = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__currentRun.cls += entry.value;
          window.__currentRun.shifts.push({
            value: entry.value,
            time: entry.startTime,
            sources: (entry.sources || []).map(s => ({
              node: s.node ? s.node.nodeName : 'unknown',
              text: s.node ? (s.node.innerText || s.node.textContent || '').slice(0, 40).replace(/\\n/g, ' ') : '',
              prev: s.previousRect ? { y: s.previousRect.y, h: s.previousRect.height } : null,
              curr: s.currentRect ? { y: s.currentRect.y, h: s.currentRect.height } : null
            }))
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  `;

  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: metricScript });

  const fixtureCart = [{
    id: 'fixture-p',
    productId: 'fixture-p',
    name: 'Fixture Laptop Alpha',
    price: 15000000,
    displayPrice: '15.000.000₫',
    image: '',
    quantity: 1,
    maxQuantity: 10,
    available: true
  }];

  const fixtureAttempt = {
    key: 'test-retry-key',
    body: JSON.stringify({
      items: [{ productId: 'fixture-p', quantity: 1, expectedPrice: 15000000 }],
      customerName: 'Fixture Customer',
      customerPhone: '0900000000',
      paymentMethod: 'COD'
    })
  };

  const scenarios = [
    { name: 'EMPTY_CART_DESKTOP', width: 1440, mobile: false, cart: null, attempt: null },
    { name: 'EMPTY_CART_MOBILE', width: 390, mobile: true, cart: null, attempt: null },
    { name: 'POPULATED_CART_DESKTOP', width: 1440, mobile: false, cart: fixtureCart, attempt: null },
    { name: 'POPULATED_CART_MOBILE', width: 390, mobile: true, cart: fixtureCart, attempt: null },
    { name: 'PENDING_RETRY_DESKTOP', width: 1440, mobile: false, cart: fixtureCart, attempt: fixtureAttempt },
    { name: 'PENDING_RETRY_MOBILE', width: 390, mobile: true, cart: fixtureCart, attempt: fixtureAttempt },
  ];

  const results = [];

  for (const sc of scenarios) {
    for (const cache of ['cold', 'warm']) {
      const runs = [];
      for (let runIndex = 1; runIndex <= 3; runIndex++) {
        const height=sc.mobile ? 844 : 900;
        await cdp('Emulation.setDeviceMetricsOverride', { width: sc.width, height, deviceScaleFactor: 1, mobile: sc.mobile });

        // Preload state on same-origin page
        await cdp('Page.navigate', { url: base + '/lien-he' });
        await until(() => js("location.pathname==='/lien-he' && document.readyState === 'complete'"), 'pre-state page');

        if (sc.cart) {
          await js(`localStorage.setItem('citilap_cart', ${JSON.stringify(JSON.stringify(sc.cart))})`);
        } else {
          await js(`localStorage.removeItem('citilap_cart')`);
        }
        if (sc.attempt) {
          await js(`sessionStorage.setItem('citilap-checkout-attempt-v1', ${JSON.stringify(JSON.stringify(sc.attempt))})`);
        } else {
          await js(`sessionStorage.removeItem('citilap-checkout-attempt-v1')`);
        }

        // Navigate to checkout
        if(cache==='cold')await cdp('Network.clearBrowserCache');
        await cdp('Page.navigate', { url: base + '/checkout' });
        await until(() => js("location.pathname==='/checkout' && document.readyState === 'complete'"), 'checkout complete');
        const expected=sc.attempt?'Thử lại yêu cầu':sc.cart?'Fixture Laptop Alpha':'Giỏ hàng của bạn đang trống';
        await until(()=>js('document.body.innerText.includes('+JSON.stringify(expected)+')'),'scenario '+sc.name);
        if(sc.cart && !sc.attempt)await until(()=>js("!document.body.innerText.includes('Đang tính tổng tiền')"),'quote settled');
        await sleep(3000);

        const data = await js(`({
          cls: window.__currentRun.cls,
          lcp: window.__currentRun.lcp,
          shifts: window.__currentRun.shifts,
          ttfb: performance.getEntriesByType('navigation')[0]?.responseStart || 0
        })`);

        assert.ok(data.cls <= 0.1, `CLS exceeded 0.1 in ${sc.name} (${cache} run ${runIndex}): ${data.cls}`);
        assert.ok(data.lcp>0 && data.ttfb>0,'valid navigation metrics');
        runs.push({ run: runIndex, cls: Number(data.cls.toFixed(6)), lcp: Math.round(data.lcp), ttfb: Math.round(data.ttfb), shifts: data.shifts });
      }

      const avgCls = Number((runs.reduce((acc, r) => acc + r.cls, 0) / runs.length).toFixed(6));
      const maxCls = Math.max(...runs.map(r => r.cls));
      const avgLcp = Math.round(runs.reduce((acc, r) => acc + r.lcp, 0) / runs.length);
      const avgTtfb = Math.round(runs.reduce((acc, r) => acc + r.ttfb, 0) / runs.length);

      console.log(`BENCHMARK [${sc.name} | ${cache}]: avgCLS=${avgCls}, maxCLS=${maxCls}, avgLCP=${avgLcp}ms, avgTTFB=${avgTtfb}ms (3 runs <= 0.1 PASS)`);
      results.push({
        scenario: sc.name,
        width: sc.width,
        height: sc.mobile ? 844 : 900,
        mobile: sc.mobile,
        cache,
        runs,
        avgCls,
        maxCls,
        avgLcp,
        avgTtfb
      });
    }
  }

  // Also record standard 24 routes for r09a-performance.json
  const standardObservations = [];
  for (const width of [1440, 390]) {
    for (const path of ['/', '/search', '/product/fixture-p', '/cart', '/checkout', '/news']) {
      for (const cache of ['cold', 'warm']) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
        if (cache === 'cold') await cdp('Network.clearBrowserCache');
        await cdp('Page.navigate', { url: base + path });
        await until(() => js('location.pathname==='+JSON.stringify(path)+" && document.readyState === 'complete'"), 'ready');
        await sleep(1500);
        const metrics = await js(`({
          cls: Number(window.__currentRun.cls.toFixed(6)),
          lcp: Math.round(window.__currentRun.lcp || 0),
          ttfb: Math.round(performance.getEntriesByType('navigation')[0]?.responseStart || 0),
          url: location.pathname
        })`);
        standardObservations.push({ width, path, cache, ...metrics });
      }
    }
  }

  const performanceReport = {
    recordedAt: new Date().toISOString(),
    browser: browserVersion,
    environment: 'Local built Worker, ephemeral fixture, Chrome headless, no CPU/network throttle; lab only; INP not measured',
    clsTarget: '<= 0.1',
    checkoutBenchmarkSummary: results,
    observations: standardObservations
  };

  await writeFile('docs/admin/evidence/r09a-performance-reviewed.json', JSON.stringify(performanceReport, null, 2));
  console.log('CHECKOUT_BENCHMARK_COMPLETE: All checkout CLS scenarios <= 0.1 PASS. Written to docs/admin/evidence/r09a-performance-reviewed.json');
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    try { await cdp('Browser.close'); } catch {}
    ws.close();
  }
  chrome.kill();
  await sleep(500);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
