// Real local reads; intercept every product mutation. Never write product data during UI QA.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { parseEnv } from 'node:util';

const base = process.argv[2] || 'http://localhost:3001';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/, 'Local server required');
const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
assert(env.ADMIN_EMAIL && env.ADMIN_PASSWORD, 'Configure local ADMIN_EMAIL and ADMIN_PASSWORD');
let cookie = process.env.ADMIN_UI_COOKIE;
if (!cookie) {
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }), signal: AbortSignal.timeout(30000) });
  assert.equal(login.status, 200, 'Local admin login');
  cookie = login.headers.getSetCookie().find(value => value.startsWith('admin_session='))?.split(';')[0].slice('admin_session='.length);
}
assert(cookie, 'Session cookie required');
await mkdir('.wrangler/admin-ui-evidence', { recursive: true });
const profile = await mkdtemp(resolve('.wrangler/admin-products-qa-'));
const browser = spawn(env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) { for (const end = Date.now() + 45000; Date.now() < end;) { if (await fn()) return; await pause(100); } throw Error('Timed out: ' + label); }
let ws, sequence = 0, passed = 0, mutationMode = 'conflict', listError = false;
const pending = new Map(), mutations = [], exceptions = [];
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 45000); pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
async function js(expression) { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; }
async function key(key, code, windowsVirtualKeyCode, modifiers = 0) { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, modifiers, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, modifiers }); }
async function input(selector, value) { await js(`document.querySelector(${JSON.stringify(selector)}).focus()`); await key('a', 'KeyA', 65, 2); await cdp('Input.insertText', { text: value }); }
async function click(selector) { await js(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function navigate(path) {
  const navigation = await cdp('Page.navigate', { url: base + path });
  await until(async () => (await cdp('Page.getFrameTree')).frameTree.frame.loaderId === navigation.loaderId, 'navigation committed');
  await until(() => js(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(path.split('?')[0])} && !!document.querySelector('.admin-topbar')`), 'authenticated page');
}
async function reload() {
  const oldLoader = (await cdp('Page.getFrameTree')).frameTree.frame.loaderId;
  await cdp('Page.reload');
  await until(async () => (await cdp('Page.getFrameTree')).frameTree.frame.loaderId !== oldLoader, 'reload committed');
  await ready();
}
async function ready() { await pause(200); await until(() => js(`!!document.querySelector('.admin-table tbody tr') && !document.querySelector('[aria-busy=true]') && !document.querySelector('[role=status]')?.textContent.includes('Đang tải')`), 'catalog loaded'); }
async function shot(name) {
  await until(() => js(`[...document.querySelectorAll('main img')].filter(image => image.getBoundingClientRect().top < innerHeight).every(image => image.complete && image.naturalWidth > 0)`), 'visible product images loaded');
  await writeFile('.wrangler/admin-ui-evidence/' + name + '.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
}
async function check(name, fn) { await fn(); console.log('PASS ' + (++passed) + ': ' + name); }

try {
  let port;
  await until(async () => { try { port = (await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]; return port; } catch { return false; } }, 'Chrome');
  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(response => response.json());
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) { const call = pending.get(message.id); if (call) { pending.delete(message.id); message.error ? call.reject(Error(message.error.message)) : call.resolve(message.result); } }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.method === 'Page.javascriptDialogOpening') await cdp('Page.handleJavaScriptDialog', { accept: true });
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      if (request.method !== 'GET') {
        mutations.push(JSON.parse(request.postData));
        await cdp('Fetch.fulfillRequest', { requestId, responseCode: mutationMode === 'conflict' ? 409 : 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(mutationMode === 'conflict' ? { success: false, error: 'Sản phẩm đã được sửa ở nơi khác. Tải lại trước khi lưu.' } : { success: true })).toString('base64') });
      } else if (listError && new URL(request.url).pathname === '/api/admin/products') {
        await cdp('Fetch.fulfillRequest', { requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify({ success: false, error: 'Lỗi kết nối kiểm thử' })).toString('base64') });
      } else await cdp('Fetch.continueRequest', { requestId });
    }
  });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await cdp('Network.setCookie', { name: 'admin_session', value: cookie, url: base, httpOnly: true, sameSite: 'Lax' });
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/admin/products*', requestStage: 'Request' }] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/admin/products'); await ready();

  const id = await js(`document.querySelector('.admin-table tbody a').getAttribute('href').split('/').at(-1)`);
  const detail = await js(`fetch('/api/admin/products/${id}').then(response => response.json()).then(json => json.data)`);
  if (!process.argv.includes('--editor-only')) {
  await check('filters stay compact; applied filters remain visible and removable', async () => {
    assert.equal(await js(`document.querySelector('button[aria-controls="product-filters"]').getAttribute('aria-expanded')`), 'false');
    await click('button[aria-controls="product-filters"]');
    await js(`const select = document.getElementById('product-brand'); select.value = select.options[1].value; select.dispatchEvent(new Event('change', { bubbles: true }))`);
    await until(() => js(`!!new URLSearchParams(location.search).get('brand')`), 'brand URL'); await ready();
    await click('button[aria-controls="product-filters"]');
    assert(await js(`!!document.querySelector('button[aria-label^="Bỏ lọc Hãng:"]')`));
    await reload();
    assert(await js(`!!document.querySelector('button[aria-label^="Bỏ lọc Hãng:"]')`));
    await click('button[aria-label^="Bỏ lọc Hãng:"]');
    await until(() => js(`!new URLSearchParams(location.search).get('brand')`), 'remove brand'); await ready();
  });
  await check('secondary row actions open with keyboard and close with Escape', async () => {
    await js(`document.querySelector('.catalog-row-menu summary').focus()`);
    await key('Enter', 'Enter', 13);
    await until(() => js(`document.querySelector('.catalog-row-menu').open`), 'keyboard opens row actions');
    assert(await js(`document.querySelector('.catalog-row-menu-items a').getAttribute('href').startsWith('/admin/products/')`));
    await key('Tab', 'Tab', 9); await key('Escape', 'Escape', 27);
    assert(await js(`!document.querySelector('.catalog-row-menu').open && document.activeElement.matches('.catalog-row-menu summary')`));
  });
  for (const width of [1280, 1440, 1920]) await check('desktop ' + width + ': shell, table, no page overflow', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await pause(150);
    assert.equal(await js('innerWidth'), width);
    assert.equal(await js(`document.querySelector('.admin-sidebar').getBoundingClientRect().width`), 240);
    assert.equal(await js(`document.querySelector('.admin-topbar').getBoundingClientRect().height`), 44);
    assert(await js('document.documentElement.scrollWidth <= innerWidth + 1'));
    assert(await js(`document.querySelector('.admin-table thead tr').cells.length === document.querySelector('.admin-table tbody tr').cells.length`));
    assert(await js(`[...document.querySelectorAll('.admin-table tbody td:nth-child(4) > span')].every(badge => badge.getBoundingClientRect().height <= 28)`), 'Publication labels stay on one line');
    assert(await js(`getComputedStyle(document.querySelector('.admin-card > div')).paddingLeft === '0px'`));
    await shot('products-' + width);
  });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await check('publication and availability filters stay mutually clear', async () => {
    await js(`[...document.querySelectorAll('.admin-status-tabs button')].find(button => button.textContent.includes('Ngừng nhận đơn')).click()`);
    await until(() => js(`new URLSearchParams(location.search).get('availability') === 'UNAVAILABLE'`), 'availability URL');
    assert.equal(await js(`document.querySelectorAll('.admin-status-tabs button[aria-pressed=true]').length`), 1);
    await navigate('/admin/products'); await ready();
  });
  await check('page size and pagination persist after reload', async () => {
    await js(`const select = document.querySelector('select[aria-label="Số sản phẩm mỗi trang"]'); select.value = '50'; select.dispatchEvent(new Event('change', { bubbles: true }))`);
    await until(() => js(`document.querySelectorAll('tbody tr').length === 50`), '50 rows');
    await js(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Sau').click()`);
    await until(() => js(`new URLSearchParams(location.search).get('page') === '2'`), 'page 2');
    await reload();
    assert.equal(await js(`document.querySelector('select[aria-label="Số sản phẩm mỗi trang"]').value`), '50');
    assert.equal(await js(`document.querySelector('button[aria-current=page]').textContent.trim()`), '2');
    await navigate('/admin/products'); await ready();
  });
  await check('empty search can reset filters', async () => {
    await input('input[name=q]', 'ui-qa-no-product-' + Date.now());
    await js(`document.querySelector('form[role=search]').requestSubmit()`);
    await until(() => js(`document.querySelector('main').innerText.includes('Không tìm thấy sản phẩm nào')`), 'empty result');
    await js(`[...document.querySelectorAll('main button')].find(button => button.textContent === 'Xóa bộ lọc').click()`);
    await ready(); assert.equal(await js('location.search'), '');
  });
  await check('quick edit uses native modal, traps focus and restores opener', async () => {
    await js(`document.querySelector('button[aria-label^="Sửa nhanh"]').focus(); document.querySelector('button[aria-label^="Sửa nhanh"]').click()`);
    await until(() => js(`!!document.querySelector('dialog input')`), 'quick edit loaded');
    assert(await js(`document.querySelector('dialog').open`));
    await js(`document.querySelector('dialog button[value=publish]').focus()`); await key('Tab', 'Tab', 9);
    assert(await js(`document.activeElement === document.body || !!document.activeElement.closest('dialog')`), 'Native modal keeps background controls inert; Tab may enter browser chrome');
    await key('Tab', 'Tab', 9);
    assert(await js(`!!document.activeElement.closest('dialog')`));
    await shot('products-quick-edit'); await key('Escape', 'Escape', 27);
    await until(() => js(`!document.querySelector('dialog')`), 'Escape close');
    assert(await js(`document.activeElement.getAttribute('aria-label').startsWith('Sửa nhanh')`));
  });
  await check('quick edit validates price; conflict preserves entered fields', async () => {
    await click('button[aria-label^="Sửa nhanh"]'); await until(() => js(`!!document.querySelector('dialog input')`), 'drawer fields');
    await input('dialog input[type=number]', '-1'); await click('dialog button[value=save]'); await pause(150);
    assert.equal(mutations.length, 0, 'Native form blocks negative price');
    await input('dialog input[type=number]', String(detail.document.price + 1)); await click('dialog button[value=save]');
    await until(() => js(`document.querySelector('dialog')?.innerText.includes('đã được sửa ở nơi khác')`), 'revision conflict');
    assert.equal(await js(`document.querySelector('dialog input[type=number]').value`), String(detail.document.price + 1));
    assert.equal(mutations[0].expectedRevision, detail.revision); assert.equal(mutations[0].action, 'save');
    assert.deepEqual(mutations[0].document.variants, detail.document.variants); assert.deepEqual(mutations[0].document.media, detail.document.media);
  });
  await check('save and publish send canonical payload; actual product stays unchanged', async () => {
    mutationMode = 'success'; await click('dialog button[value=save]');
    await until(() => js(`!document.querySelector('dialog')`), 'saved'); await ready();
    await click('button[aria-label^="Sửa nhanh"]'); await until(() => js(`!!document.querySelector('dialog input')`), 'reopen');
    await click('dialog button[value=publish]'); await until(() => js(`!document.querySelector('dialog')`), 'published');
    assert.equal(mutations.at(-1).action, 'publish'); assert.equal(mutations.at(-1).expectedRevision, detail.revision);
    const unchanged = await js(`fetch('/api/admin/products/${id}').then(response => response.json()).then(json => json.data)`);
    assert.deepEqual(unchanged, detail, 'PUT interception preserves actual local data');
  });
  await check('list read failure shows retry and recovers', async () => {
    listError = true; await js(`[...document.querySelectorAll('main button')].find(button => button.textContent === 'Làm mới').click()`);
    await until(() => js(`document.querySelector('main').innerText.includes('Không thể tải dữ liệu')`), 'error panel');
    listError = false; await js(`[...document.querySelectorAll('main button')].find(button => button.textContent === 'Thử lại').click()`); await ready();
  });
  await check('command search survives zero results and finds real admin products', async () => {
    await click('button[title*="Ctrl + K"]'); await input('dialog input', 'ui-qa-no-command-' + Date.now());
    await until(() => js(`document.querySelector('dialog')?.innerText.includes('Không tìm thấy nội dung')`), 'zero search results');
    await key('ArrowDown', 'ArrowDown', 40); await key('ArrowUp', 'ArrowUp', 38);
    await input('dialog input', detail.document.name.slice(0, 12));
    await until(() => js(`document.querySelectorAll('[role=option]').length > 0`), 'admin product search');
    await key('ArrowDown', 'ArrowDown', 40);
    assert(await js(`!!document.getElementById(document.querySelector('[role=combobox]').getAttribute('aria-activedescendant'))`));
    await shot('products-command-search'); await key('Escape', 'Escape', 27);
  });
  }
  mutationMode = 'conflict';
  await navigate('/admin/products/' + id);
  await until(() => js(`!!document.getElementById('product-name')`), 'product editor ready');
  await check('editor desktop columns, tabs and keyboard navigation', async () => {
    for (const width of [1280, 1440, 1920]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await pause(150);
      assert.equal(await js('innerWidth'), width);
      assert(await js(`document.documentElement.scrollWidth <= innerWidth + 1`));
      assert(await js(`document.querySelector('.product-editor-sidebar').getBoundingClientRect().left >= document.querySelector('.product-editor-main').getBoundingClientRect().right`));
      await shot('product-editor-' + width);
    }
    await click('#product-tab-info'); await js(`document.getElementById('product-tab-info').focus()`); await key('ArrowRight', 'ArrowRight', 39);
    assert.equal(await js(`document.activeElement.id`), 'product-tab-specs');
    assert.equal(await js(`document.querySelector('[role=tab][aria-selected=true]').id`), 'product-tab-specs');
    await click('#product-tab-inspection');
    assert(await js(`document.querySelector('[role=tabpanel]').innerText.includes('Hồ sơ kiểm tra từng máy')`));
    await click('#product-tab-pricing');
    assert(await js(`document.getElementById('product-name').getBoundingClientRect().bottom < document.querySelector('.product-editor-tabs').getBoundingClientRect().top`));
    assert(await js(`!!document.querySelector('.product-editor-sidebar #product-price')`));
    assert(await js(`document.querySelector('.product-editor-tabs').scrollHeight <= document.querySelector('.product-editor-tabs').clientHeight + 1`));
    assert(await js(`document.querySelector('.product-editor-tabs').scrollWidth <= document.querySelector('.product-editor-tabs').clientWidth + 1`));
    assert(await js(`!!document.querySelector('.product-editor-sidebar .product-editor-actions')`));
    const values = await js(`Array.from(document.querySelectorAll('select[aria-label^="Nhận đơn cấu hình"] option')).map(option => option.value)`);
    assert(!values.includes('OUT_OF_STOCK'));assert(values.every(value=>['','AVAILABLE','PREORDER','CONTACT','UNAVAILABLE'].includes(value)));
  });
  await check('editor core fields precede optional settings; disclosures preserve edits', async () => {
    await click('#product-tab-info');
    assert(await js(`document.getElementById('product-category').getBoundingClientRect().top < document.querySelector('.product-editor-disclosure').getBoundingClientRect().top`));
    assert(await js(`[...document.querySelectorAll('.product-editor-panel details')].every(item => !item.open)`));
    const tags = await js(`document.getElementById('product-tags').value`);
    await click('.product-editor-panel details:has(#product-tags) summary');
    await input('#product-tags', tags + ', ui-disclosure-check');
    await click('.product-editor-panel details:has(#product-tags) summary');
    await click('.product-editor-panel details:has(#product-tags) summary');
    assert.equal(await js(`document.getElementById('product-tags').value`), tags + ', ui-disclosure-check');
    await input('#product-tags', tags);
    await click('.product-editor-panel details:has(#product-tags) summary');
  });
  await check('full editor keeps unsaved input on revision conflict and publishes complete document', async () => {
    const before = mutations.length;
    await click('#product-tab-info');
    await input('#product-name', detail.document.name + ' UI QA');
    await js(`[...document.querySelectorAll('.product-editor-actions button')].find(button => button.textContent.includes('Lưu nháp')).click()`);
    await until(() => js(`document.querySelector('main').innerText.includes('đã được sửa ở nơi khác')`), 'full editor conflict');
    assert.equal(await js(`document.getElementById('product-name').value`), detail.document.name + ' UI QA');
    assert.equal(mutations[before].expectedRevision, detail.revision);
    assert.deepEqual(mutations[before].document.media, detail.document.media);
    assert.deepEqual(mutations[before].document.variants, detail.document.variants);
    await js(`[...document.querySelectorAll('.product-editor-actions button')].find(button => button.textContent.includes('website')).click()`);
    await until(() => mutations.length > before + 1, 'full editor publish');
    assert.equal(mutations.at(-1).action, 'publish');
    const unchanged = await js(`fetch('/api/admin/products/${id}').then(response => response.json()).then(json => json.data)`);
    assert.deepEqual(unchanged, detail);
    await shot('product-editor-conflict');
  });
  await navigate('/admin/products/new');
  await until(() => js(`!!document.getElementById('product-name')`), 'new editor ready');
  await check('new product slug follows name until manually edited; required fields block writes', async () => {
    await input('#product-name', 'Máy tính CitiLap');
    assert.equal(await js(`document.getElementById('product-slug').value`), 'may-tinh-citilap');
    await input('#product-name', 'Máy tính CitiLap mới');
    assert.equal(await js(`document.getElementById('product-slug').value`), 'may-tinh-citilap-moi');
    await input('#product-slug', 'slug-tu-chon'); await input('#product-name', 'Tên khác');
    assert.equal(await js(`document.getElementById('product-slug').value`), 'slug-tu-chon');
    const before = mutations.length;
    await js(`[...document.querySelectorAll('.product-editor-actions button')].find(button => button.textContent.includes('Lưu nháp')).click()`);
    await until(() => js(`document.querySelector('main').innerText.includes('Danh mục:')`), 'required category');
    assert.equal(mutations.length, before);
  });
  await navigate('/admin/products/' + id + '/preview');
  await until(() => js(`!!document.querySelector('[inert]')`), 'saved draft storefront preview');
  await check('saved draft preview resolves API envelope and disables purchase controls', async () => {
    assert(await js(`document.querySelector('main').innerText.includes(${JSON.stringify(detail.document.name)})`));
    assert(await js(`document.querySelector('[inert]').innerText.includes('Đang chọn:')`));
    assert(await js(`![...document.images].some(image => image.src.includes('/api/media/file/'))`));
    await shot('product-draft-preview');
  });
  assert.deepEqual(exceptions, [], 'No browser runtime exceptions');
  console.log(`Admin Products UI: ${passed}/${passed} PASS. Reads real; all product writes intercepted.`);
} catch (error) {
  console.error(await js(`({url: location.href, body: document.body.innerText.slice(0, 1600)})`).catch(() => 'No page diagnostic'));
  if (ws) await writeFile('.wrangler/admin-ui-evidence/failure.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64')).catch(() => {});
  throw error;
} finally {
  ws?.close(); browser.kill();
  assert(profile.startsWith(resolve('.wrangler') + sep), 'Cleanup stays inside workspace');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
