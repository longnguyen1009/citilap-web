// Focused runnable browser/CDP check for Round 07D:
// - Real /admin/media page on isolated runtime 3012 with existing QA session (token never printed).
// - Delayed initial detail GET (/api/admin/media/:id): selecting a new folder before initial detail resolves
//   preserves the user-selected folder while updating canonical baseline/usages; untouched folder still syncs.
// - Dirty close confirmation (Escape / Đóng) & cancelling discard ("Tiếp tục chỉnh sửa") retains all dirty edits.
// - Clipboard async handling: unavailable API and rejected writeText show visible [role="alert"] error inside
//   the dialog, pending promise does not mark success early, retry succeeds, and stale 2s timer does not clear
//   a newer copy of the SAME key.
// - Preserves usage archive guard, original media retention notice, and native <dialog> focus/Escape.
// - Blocks all non-GET/HEAD/OPTIONS requests (zero real mutations).

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

const evidenceDir = '.wrangler/admin-review-20261112/browser-evidence';
await mkdir(evidenceDir, { recursive: true });

let devServer = null;
async function isServerUp() {
  try {
    const res = await fetch(base + '/admin/login', {
      signal: AbortSignal.timeout(2500),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

if (!(await isServerUp())) {
  devServer = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'dev',
      '--config',
      '.wrangler/admin-review-20261112/browser.vite.config.ts',
      '--port',
      '3012',
      '--strictPort',
    ],
    { windowsHide: true, stdio: 'ignore' }
  );
}

const profile = await mkdtemp(resolve('.wrangler/admin-workspace-qa-07d-'));
const browser = spawn(
  env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=0',
    '--user-data-dir=' + profile,
    '--no-first-run',
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' }
);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, timeoutMs = 45000) {
  for (const end = Date.now() + timeoutMs; Date.now() < end; ) {
    if (await fn()) return;
    await pause(100);
  }
  throw new Error('Timeout: ' + label);
}

let ws;
let serial = 0;
const calls = new Map();
const runtimeErrors = [];
const blockedMutations = [];

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
      reject: (e) => {
        clearTimeout(timer);
        rejectPromise(e);
      },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function js(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}

function jsonHeaders() {
  return [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }];
}

async function fulfillJson(requestId, status, bodyObj) {
  await cdp('Fetch.fulfillRequest', {
    requestId,
    responseCode: status,
    responseHeaders: jsonHeaders(),
    body: Buffer.from(JSON.stringify(bodyObj), 'utf8').toString('base64'),
  }).catch(() => {});
}

const mockFolders = [
  { slug: 'general', name: 'Chung / Chưa phân loại', isSystem: true, count: 1 },
  { slug: 'products', name: 'Ảnh sản phẩm', isSystem: true, count: 1 },
  { slug: 'banners', name: 'Banner & Chiến dịch', isSystem: true, count: 0 },
  { slug: 'videos-docs', name: 'Video & Tài liệu', isSystem: true, count: 0 },
];

const mockAssets = [
  {
    id: 'qa-media-1',
    kind: 'IMAGE',
    assetType: 'IMAGE',
    provider: 'R2',
    folder: 'general',
    name: 'ThinkPad X1 Carbon Gen 12',
    alt: 'Ảnh góc nghiêng ThinkPad X1',
    caption: 'Bản mẫu QA 07D',
    mimeType: 'image/webp',
    size: 184320,
    width: 1600,
    height: 1000,
    state: 'READY',
    revision: 4,
    usageCount: 2,
    url: 'https://example.com/media/thinkpad-x1.webp',
    embedUrl: 'https://example.com/embed/thinkpad-x1',
    thumbnailUrl: null,
    createdAt: '2026-11-12T01:00:00.000Z',
    updatedAt: '2026-11-12T01:00:00.000Z',
  },
  {
    id: 'qa-media-2',
    kind: 'IMAGE',
    assetType: 'IMAGE',
    provider: 'R2',
    folder: 'general',
    name: 'Dell XPS 14 QA Untouched',
    alt: 'Alt XPS',
    caption: '',
    mimeType: 'image/webp',
    size: 98304,
    width: 1200,
    height: 800,
    state: 'READY',
    revision: 1,
    usageCount: 0,
    url: 'https://example.com/media/dell-xps-14.webp',
    embedUrl: null,
    thumbnailUrl: null,
    createdAt: '2026-11-12T01:05:00.000Z',
    updatedAt: '2026-11-12T01:05:00.000Z',
  },
];

let pendingDetailRequestId = null;

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
      runtimeErrors.push(m.params.exceptionDetails.text);
    }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      const url = new URL(request.url);

      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        blockedMutations.push(`${request.method} ${url.pathname}`);
        await cdp('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        return;
      }

      if (url.pathname === '/api/admin/media') {
        await fulfillJson(requestId, 200, {
          success: true,
          data: {
            items: mockAssets,
            total: mockAssets.length,
            page: 1,
            pageSize: 24,
            folders: mockFolders,
            totalAllFolders: mockAssets.length,
          },
        });
        return;
      }

      if (url.pathname === '/api/admin/media/folders') {
        await fulfillJson(requestId, 200, {
          success: true,
          data: {
            folders: mockFolders,
            totalAllFolders: mockAssets.length,
          },
        });
        return;
      }

      if (url.pathname === '/api/admin/media/qa-media-1/optimize' || url.pathname === '/api/admin/media/qa-media-2/optimize') {
        await fulfillJson(requestId, 200, {
          success: true,
          data: {
            status: 'PENDING',
            bytes: null,
          },
        });
        return;
      }

      if (url.pathname === '/api/admin/media/qa-media-1') {
        // Hold initial detail GET so test can change folder while request is in-flight
        pendingDetailRequestId = requestId;
        return;
      }

      if (url.pathname === '/api/admin/media/qa-media-2') {
        await pause(300);
        await fulfillJson(requestId, 200, {
          success: true,
          data: {
            asset: { ...mockAssets[1], folder: 'products' },
            usages: [],
          },
        });
        return;
      }

      await cdp('Fetch.continueRequest', { requestId }).catch(() => {});
    }
  });

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Network.setCookie', {
    name: 'admin_session',
    value: cookie,
    url: base,
    httpOnly: true,
    sameSite: 'Lax',
  });
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await until(() => isServerUp(), 'Runtime 3012 ready', 60000);

  // 1. Navigate to real /admin/media page
  await cdp('Page.navigate', { url: base + '/admin/media' });
  await until(
    () => js(`!!document.body && document.body.innerText.includes('ThinkPad X1 Carbon Gen 12')`),
    'Media library grid rendered on /admin/media'
  );

  // 2. Open first asset ("ThinkPad X1 Carbon Gen 12"); initial detail GET is held pending
  await js(`(() => {
    const card = Array.from(document.querySelectorAll('.media-card')).find(el => el.textContent.includes('ThinkPad X1 Carbon Gen 12'));
    card.focus();
    card.click();
  })()`);

  await until(
    () => js(`Boolean(document.querySelector('dialog.media-dialog')?.matches(':modal'))`),
    'Native modal <dialog> opened for qa-media-1'
  );
  await until(() => pendingDetailRequestId !== null, 'Initial detail GET /api/admin/media/qa-media-1 is in-flight');

  // 3. While initial detail GET is still pending, select a new folder ('banners') and edit text fields
  await js(`(() => {
    const dialog = document.querySelector('dialog.media-dialog');
    const setVal = (el, val) => {
      const proto = el.tagName === 'SELECT'
        ? HTMLSelectElement.prototype
        : el.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(dialog.querySelector('select'), 'banners');
    const inputs = dialog.querySelectorAll('input');
    setVal(inputs[0], 'ThinkPad X1 Carbon Gen 12 (Edited)');
    setVal(inputs[1], 'Alt đã chỉnh sửa');
    setVal(dialog.querySelector('textarea'), 'Chú thích đã chỉnh sửa');
  })()`);

  assert.equal(
    await js(`document.querySelector('dialog.media-dialog select').value`),
    'banners',
    'Folder selected as banners before detail GET resolves'
  );

  // 4. Now resolve the delayed initial detail GET with canonical folder 'general' and usage records
  const reqToFulfill = pendingDetailRequestId;
  pendingDetailRequestId = null;
  await fulfillJson(reqToFulfill, 200, {
    success: true,
    data: {
      asset: { ...mockAssets[0], folder: 'general' },
      usages: [
        { ownerType: 'PRODUCT', ownerId: 'prod-thinkpad-x1', slot: 'gallery' },
        { ownerType: 'POST', ownerId: 'post-review-x1', slot: 'cover' },
      ],
    },
  });

  // Wait until usages from the detail response render in DOM
  await until(
    () => js(`document.querySelector('dialog.media-dialog')?.innerText.includes('prod-thinkpad-x1')`),
    'Delayed detail GET resolved and updated usages in DOM'
  );

  // Verify the user-selected folder ('banners') and dirty state survived the late detail response!
  const afterLateDetail = await js(`(() => {
    const dialog = document.querySelector('dialog.media-dialog');
    const inputs = dialog.querySelectorAll('input');
    const saveBtn = dialog.querySelector('button[type="submit"]');
    const archiveBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.includes('Ẩn khỏi thư viện'));
    return {
      folder: dialog.querySelector('select').value,
      name: inputs[0].value,
      alt: inputs[1].value,
      caption: dialog.querySelector('textarea').value,
      saveDisabled: saveBtn.disabled,
      archiveDisabled: archiveBtn?.disabled ?? false,
      hasOriginalRetentionText: dialog.innerText.includes('Ảnh thu nhỏ chưa tối ưu. Có thể tạo lại mà không thay ảnh gốc.'),
    };
  })()`);

  assert.equal(afterLateDetail.folder, 'banners', 'Touched folder must survive late initial detail GET');
  assert.equal(afterLateDetail.name, 'ThinkPad X1 Carbon Gen 12 (Edited)', 'Edited name preserved');
  assert.equal(afterLateDetail.alt, 'Alt đã chỉnh sửa', 'Edited alt preserved');
  assert.equal(afterLateDetail.caption, 'Chú thích đã chỉnh sửa', 'Edited caption preserved');
  assert.equal(afterLateDetail.saveDisabled, false, 'Dirty state preserved so Save button remains enabled');
  assert.equal(afterLateDetail.archiveDisabled, true, 'Usage archive guard disables archiving when usageCount > 0');
  assert.equal(afterLateDetail.hasOriginalRetentionText, true, 'Original media retention notice is displayed');

  // 5. Dirty close confirmation (via Escape cancel event & Close button) and cancelling discard retains edits
  await js(`(() => {
    const dialog = document.querySelector('dialog.media-dialog');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  })()`);
  await until(
    () => js(`document.querySelector('dialog.media-dialog')?.innerText.includes('Thay đổi chưa được lưu. Bạn muốn tiếp tục chỉnh sửa hay bỏ thay đổi?')`),
    'Dirty close confirmation shown on Escape/cancel'
  );

  // Click "Tiếp tục chỉnh sửa" (cancel discard)
  await js(`(() => {
    const keepEditingBtn = Array.from(document.querySelectorAll('dialog.media-dialog button')).find(b => b.textContent.includes('Tiếp tục chỉnh sửa'));
    keepEditingBtn.click();
  })()`);

  await until(
    () => js(`Boolean(document.querySelector('dialog.media-dialog select'))`),
    'Form restored after cancelling discard'
  );

  const afterCancelDiscard = await js(`(() => {
    const dialog = document.querySelector('dialog.media-dialog');
    const inputs = dialog.querySelectorAll('input');
    return {
      folder: dialog.querySelector('select').value,
      name: inputs[0].value,
      alt: inputs[1].value,
      caption: dialog.querySelector('textarea').value,
      saveDisabled: dialog.querySelector('button[type="submit"]').disabled,
    };
  })()`);

  assert.equal(afterCancelDiscard.folder, 'banners', 'Selected folder retained after cancelling discard');
  assert.equal(afterCancelDiscard.name, 'ThinkPad X1 Carbon Gen 12 (Edited)', 'Edited name retained after cancelling discard');
  assert.equal(afterCancelDiscard.alt, 'Alt đã chỉnh sửa', 'Edited alt retained after cancelling discard');
  assert.equal(afterCancelDiscard.caption, 'Chú thích đã chỉnh sửa', 'Edited caption retained after cancelling discard');
  assert.equal(afterCancelDiscard.saveDisabled, false, 'Form remains dirty after cancelling discard');

  // 6. Clipboard checks inside MediaEditor:
  // 6a. Missing/unavailable navigator.clipboard shows visible [role="alert"] error and does not mark copied
  await js(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })`);
  await js(`(() => {
    const btn = Array.from(document.querySelectorAll('dialog.media-dialog button')).find(b => b.textContent.includes('Sao chép URL'));
    btn.click();
  })()`);

  await until(
    () => js(`Boolean(document.querySelector('dialog.media-dialog [role="alert"]')) && document.querySelector('dialog.media-dialog [role="alert"]').innerText.includes('Không thể sao chép')`),
    'Missing clipboard API shows visible error alert inside dialog'
  );
  assert.equal(
    await js(`document.querySelector('dialog.media-dialog').innerText.includes('Đã chép URL')`),
    false,
    'Missing clipboard API must not show copied state'
  );

  // 6b. Deferred clipboard writeText: pending does not mark success; rejection shows visible error; retry works
  await js(`(() => {
    window.__clipCalls = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text) => new Promise((resolve, reject) => {
          window.__clipCalls.push({ text, resolve, reject });
        }),
      },
    });
  })()`);

  await js(`(() => {
    const btn = Array.from(document.querySelectorAll('dialog.media-dialog button')).find(b => b.textContent.includes('Sao chép URL'));
    btn.click();
  })()`);
  await pause(120);
  assert.equal(
    await js(`document.querySelector('dialog.media-dialog').innerText.includes('Đã chép URL')`),
    false,
    'Pending clipboard promise must not mark copy success before resolving'
  );

  // Reject first deferred writeText
  await js(`window.__clipCalls[0].reject(new Error('Clipboard permission denied'))`);
  await until(
    () => js(`Boolean(document.querySelector('dialog.media-dialog [role="alert"]')) && document.querySelector('dialog.media-dialog [role="alert"]').innerText.includes('Không thể sao chép')`),
    'Rejected clipboard promise shows visible error alert'
  );
  assert.equal(
    await js(`document.querySelector('dialog.media-dialog').innerText.includes('Đã chép URL')`),
    false,
    'Rejected clipboard promise must not mark copy success'
  );

  // 6c. Retry on the same button -> resolve -> error cleared & "Đã chép URL" shown
  await js(`(() => {
    const btn = Array.from(document.querySelectorAll('dialog.media-dialog button')).find(b => b.textContent.includes('Sao chép URL'));
    btn.click();
  })()`);
  await js(`window.__clipCalls[1].resolve()`);
  await until(
    () => js(`document.querySelector('dialog.media-dialog').innerText.includes('Đã chép URL') && !document.querySelector('dialog.media-dialog [role="alert"]')`),
    'Retry clipboard copy resolves, clears error alert, and shows Đã chép URL'
  );

  // 6d. Same-key stale 2-second timer check:
  // First copy resolved at t=0. Wait 1200ms, then click same URL copy button again and resolve.
  await pause(1200);
  await js(`(() => {
    const btn = Array.from(document.querySelectorAll('dialog.media-dialog button')).find(b => b.textContent.includes('Đã chép URL') || b.textContent.includes('Sao chép URL'));
    btn.click();
  })()`);
  await js(`window.__clipCalls[2].resolve()`);
  await until(
    () => js(`document.querySelector('dialog.media-dialog').innerText.includes('Đã chép URL')`),
    'Second copy of same key resolved'
  );

  // Wait 1100ms (2300ms since first copy, 1100ms since second copy of same key 'url')
  await pause(1100);
  assert.equal(
    await js(`document.querySelector('dialog.media-dialog').innerText.includes('Đã chép URL')`),
    true,
    'Stale 2s timer from first copy must not clear newer copy of the SAME key'
  );

  // Wait another 1100ms (2200ms since second copy) -> timer expires cleanly
  await pause(1100);
  await until(
    () => js(`document.querySelector('dialog.media-dialog').innerText.includes('Sao chép URL')`),
    'Second copy timer expires cleanly after full 2s window'
  );

  // 7. Discard changes via "Bỏ thay đổi" and verify untouched folder sync on qa-media-2
  await js(`document.querySelector('dialog.media-dialog button[aria-label="Đóng"]').click()`);
  await until(
    () => js(`document.querySelector('dialog.media-dialog')?.innerText.includes('Bỏ thay đổi')`),
    'Discard confirmation opened via Đóng button'
  );
  await js(`(() => {
    const discardBtn = Array.from(document.querySelectorAll('dialog.media-dialog button')).find(b => b.textContent.includes('Bỏ thay đổi'));
    discardBtn.click();
  })()`);
  await until(() => js(`!document.querySelector('dialog.media-dialog')`), 'Dialog closed after confirming discard');

  // Open second asset without touching folder -> delayed detail returns folder='products' -> untouched folder syncs
  await js(`(() => {
    const card = Array.from(document.querySelectorAll('.media-card')).find(el => el.textContent.includes('Dell XPS 14 QA Untouched'));
    card.click();
  })()`);
  await until(
    () => js(`document.querySelector('dialog.media-dialog select')?.value === 'products'`),
    'Untouched folder syncs to canonical folder from detail GET'
  );
  assert.equal(
    await js(`document.querySelector('dialog.media-dialog button[type="submit"]').disabled`),
    true,
    'Untouched folder sync updates baseline so form remains clean (not dirty)'
  );

  assert.deepEqual(runtimeErrors, [], 'Zero uncaught runtime errors');
  assert.deepEqual(blockedMutations, [], 'Zero real mutations attempted during check');
  console.log('PASS Round 07D focused browser check: delayed detail folder race, discard retention, and clipboard async/timer guards verified');
} finally {
  ws?.close();
  browser.kill();
  devServer?.kill();
  assert(profile.startsWith(resolve('.wrangler') + sep));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
