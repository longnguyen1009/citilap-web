import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { chromium } from 'file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';

console.log('=== CITILAP R1 AUDIT — DASHBOARD, CUSTOMERS, CONTACTS VERIFICATION ===\n');

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${passed}: ${name}`);
}

// ============================================================================
// PART 1: ISOLATED MINIFLARE D1/R2 FIXTURE TESTS (NO REAL DB MUTATION)
// ============================================================================
console.log('--- Part 1: Isolated Miniflare D1/R2 Service & Route Tests ---');

await build({
  stdin: {
    contents: `
      export * from './src/server/services/customer.service';
      export * from './src/server/services/contact.service';
      export { GET as getDashboard } from './src/app/api/dashboard/route';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['cloudflare:workers', 'node:*'],
  plugins: [
    {
      name: 'wasm-external',
      setup(b) {
        b.onResolve({ filter: /\.wasm/ }, (args) => ({ path: args.path, external: true }));
      },
    },
    {
      name: 'mock-server-only',
      setup(b) {
        b.onResolve({ filter: /^server-only$/ }, (args) => ({ path: args.path, namespace: 'server-only-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'server-only-ns' }, () => ({ contents: '' }));
      },
    },
  ],
  outfile: 'scripts/.r1-audit-bundle.mjs',
});

const bundle = await import('./.r1-audit-bundle.mjs');

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r1-fixture"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

try {
  const DB = await mf.getD1Database('DB');
  const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
  globalThis.env = { DB, PRODUCT_MEDIA };

  const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrationFiles) {
    const sql = await readFile(`d1-migrations/${f}`, 'utf8');
    await DB.batch(unstable_splitSqlQuery(sql).map((s) => DB.prepare(s)));
  }

  const { createHash, randomBytes } = await import('node:crypto');
  const fixtureToken = randomBytes(32).toString('hex');
  await DB.prepare("INSERT INTO User(id,email,password,name,phone,role,tier,updatedAt) VALUES('owner-1','owner@fixture.invalid','x','Admin Owner','0999999999','OWNER','Vàng',CURRENT_TIMESTAMP)").run();
  await DB.prepare('INSERT INTO AdminSession(tokenHash,userId,version,expiresAt) VALUES(?,?,0,?)')
    .bind(createHash('sha256').update(fixtureToken).digest('hex'), 'owner-1', Date.now() + 3600000)
    .run();
  const fixtureAuthHeaders = { cookie: `admin_session=${fixtureToken}` };

  // Seed isolated fixture records
  await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat-1','Laptop','laptop',CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES('p-pub','Published Laptop','pub-laptop','',20000000,'cat-1','ACTIVE',CURRENT_TIMESTAMP),('p-draft','Draft Laptop','draft-laptop','',15000000,'cat-1','ACTIVE',CURRENT_TIMESTAMP)").run();
  await DB.prepare("INSERT INTO ProductStudio(productId,draft,published) VALUES('p-pub','{}','{\"name\":\"Published Laptop\"}'),('p-draft','{\"name\":\"Draft Laptop\"}',NULL)").run();
  await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,state) VALUES('m-ready-1','IMAGE','R2','library/m1.png','Ready 1','READY'),('m-ready-2','IMAGE','R2','library/m2.png','Ready 2','READY'),('m-arch-1','IMAGE','R2','library/m3.png','Archived 1','ARCHIVED')").run();
  await DB.prepare("INSERT INTO [Order](id,orderNumber,status,totalAmount,customerName,customerPhone,paymentMethod,paymentStatus,updatedAt) VALUES('o-new-1','CTL-001','NEW',10000000,'Fixture Buyer 1','0900000001','COD','PENDING',CURRENT_TIMESTAMP),('o-new-2','CTL-002','NEW',15000000,'Fixture Buyer 2','0900000002','COD','PENDING',CURRENT_TIMESTAMP),('o-comp-1','CTL-003','COMPLETED',20000000,'Fixture Buyer 3','0900000003','COD','PAID',CURRENT_TIMESTAMP)").run();

  await check('Dashboard API counts canonical NEW orders, READY MediaAsset, and Studio states accurately', async () => {
    const req = new Request('http://localhost/api/dashboard', {
      headers: fixtureAuthHeaders,
    });
    const res = await bundle.getDashboard(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.summary.pendingOrders, 2);
    assert.equal(body.data.summary.totalOrders, 3);
    assert.equal(body.data.summary.publishedStudioCount, 1);
    assert.equal(body.data.summary.draftStudioCount, 1);
    assert.equal(body.data.summary.mediaCount, 2);
  });

  await check('Dashboard API surfaces D1 query errors as HTTP 500 instead of masking with 0', async () => {
    await DB.prepare('ALTER TABLE MediaAsset RENAME TO MediaAsset_Broken').run();
    try {
      const req = new Request('http://localhost/api/dashboard', {
        headers: fixtureAuthHeaders,
      });
      const res = await bundle.getDashboard(req);
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.error);
    } finally {
      await DB.prepare('ALTER TABLE MediaAsset_Broken RENAME TO MediaAsset').run();
    }
  });

  await check('Customers service paginates, computes full-filter summary, clamps page, and exports all matching rows excluding OWNER', async () => {
    for (let i = 1; i <= 30; i++) {
      const tier = i <= 10 ? 'Vàng' : i <= 20 ? 'Bạc' : 'Mới';
      await DB.prepare("INSERT INTO User(id,email,password,name,phone,role,tier,createdAt,updatedAt) VALUES(?,?,'x',?,?,'USER',?,datetime('now', ?),CURRENT_TIMESTAMP)")
        .bind(`u-${i}`, `user${i}@fixture.invalid`, `Member ${String(i).padStart(2, '0')}`, `09100000${String(i).padStart(2, '0')}`, tier, `-${i} minutes`)
        .run();
    }

    const page1 = await bundle.listCustomers({ page: 1, limit: 25 }, DB);
    // 30 registered USERs + 3 guest orders from earlier = 33 total (OWNER excluded)
    assert.equal(page1.pagination.total, 33);
    assert.equal(page1.pagination.totalPages, 2);
    assert.equal(page1.customers.length, 25);
    assert.equal(page1.summary.total, 33);
    assert.equal(page1.summary.registered, 30);
    assert.equal(page1.summary.guest, 3);
    assert.equal(page1.summary.totalNonCancelled, 45000000);

    const page2 = await bundle.listCustomers({ page: 2, limit: 25 }, DB);
    assert.equal(page2.pagination.page, 2);
    assert.equal(page2.customers.length, 8);

    // Out-of-range page clamps to last page
    const page99 = await bundle.listCustomers({ page: 99, limit: 25 }, DB);
    assert.equal(page99.pagination.page, 2);
    assert.equal(page99.customers.length, 8);

    // Export returns all 33 matching customers (not just 25, and never includes OWNER)
    const exportedAll = await bundle.getAllCustomersForExport({}, DB);
    assert.equal(exportedAll.length, 33);
    assert.ok(!exportedAll.some((c) => c.id === 'owner-1'));

    const exportedGold = await bundle.getAllCustomersForExport({ tier: 'Vàng' }, DB);
    assert.equal(exportedGold.length, 10);
  });

  await check('Contacts service paginates, tracks pendingCount across pages, clamps page, and exports all filtered rows', async () => {
    for (let i = 1; i <= 25; i++) {
      const st = i <= 18 ? 'PENDING' : i <= 22 ? 'PROCESSING' : 'HANDLED';
      await DB.prepare("INSERT INTO ContactSubmission(id,name,phone,email,message,status,revision,createdAt,updatedAt) VALUES(?,?,?,?,?,?,1,datetime('now', ?),CURRENT_TIMESTAMP)")
        .bind(`c-${i}`, `Contact ${String(i).padStart(2, '0')}`, `09800000${String(i).padStart(2, '0')}`, `c${i}@fixture.invalid`, `Msg ${i}`, st, `-${i} minutes`)
        .run();
    }

    const p1 = await bundle.listContactSubmissions({ page: 1, limit: 20 }, DB);
    assert.equal(p1.pagination.total, 25);
    assert.equal(p1.pagination.totalPages, 2);
    assert.equal(p1.pagination.pendingCount, 18);
    assert.equal(p1.contacts.length, 20);

    const p2 = await bundle.listContactSubmissions({ page: 2, limit: 20 }, DB);
    assert.equal(p2.pagination.page, 2);
    assert.equal(p2.contacts.length, 5);
    assert.equal(p2.pagination.pendingCount, 18);

    const p99 = await bundle.listContactSubmissions({ page: 99, limit: 20 }, DB);
    assert.equal(p99.pagination.page, 2);

    const exportedPending = await bundle.getAllContactsForExport({ status: 'PENDING' }, DB);
    assert.equal(exportedPending.length, 18);
  });
} finally {
  delete process.env.ADMIN_API_TOKEN;
  await mf.dispose();
}

// ============================================================================
// PART 2: DESKTOP 1440px BROWSER VERIFICATION AGAINST RUNNING SERVER
// ============================================================================
console.log('\n--- Part 2: Desktop 1440px Browser Verification (Dashboard, Customers, Contacts) ---');

const base = process.argv[2] || 'http://localhost:3001';
const env = { ...parseEnv(await readFile('.env', 'utf8')), ...process.env };
const reviewData = JSON.parse(await readFile('.wrangler/review-data.json', 'utf8'));

const expectedNewOrders = reviewData.orderStatuses.find((s) => s.status === 'NEW')?.count ?? 0;
const expectedTotalOrders = reviewData.orderStatuses.reduce((sum, s) => sum + s.count, 0);
const expectedReadyMedia = reviewData.mediaStates.find((s) => s.state === 'READY')?.count ?? 0;

const evidenceDir = 'docs/admin/evidence';
await mkdir(evidenceDir, { recursive: true });
await mkdir('.wrangler/audit-public', { recursive: true });

const sessionCachePath = '.wrangler/audit-public/.admin-session-cache.json';
async function isSessionValid(token) {
  if (!token) return false;
  try {
    const res = await fetch(base + '/api/dashboard', {
      headers: { Cookie: `admin_session=${token}` },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

let cookie = env.ADMIN_SESSION_COOKIE?.replace(/^admin_session=/, '').trim() || '';
if (!(await isSessionValid(cookie))) {
  cookie = '';
  try {
    const cached = JSON.parse(await readFile(sessionCachePath, 'utf8'));
    if (cached?.cookie && (await isSessionValid(cached.cookie))) {
      cookie = cached.cookie;
      console.log('Reused valid cached admin session from ' + sessionCachePath);
    }
  } catch {}
}

if (!cookie) {
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
  });
  assert.equal(loginRes.status, 200, 'Admin login must succeed');
  cookie = loginRes.headers
    .getSetCookie()
    .find((v) => v.startsWith('admin_session='))
    ?.split(';')[0]
    .slice(14);
  assert.ok(cookie, 'Session cookie must be present');
  await writeFile(sessionCachePath, JSON.stringify({ cookie, savedAt: new Date().toISOString() }, null, 2));
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, timeoutMs = 30000) {
  for (const end = Date.now() + timeoutMs; Date.now() < end; ) {
    const val = await fn();
    if (val) return val;
    await pause(120);
  }
  throw new Error('Timeout waiting for: ' + label);
}

const browser = await chromium.launch({
  executablePath: env.ADMIN_UI_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'admin_session', value: cookie, url: base }]);
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const text = () => page.evaluate(() => document.body?.innerText || '');

  async function redactDomPii() {
    await page.evaluate(() => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) {
        let t = node.nodeValue || '';
        t = t.replace(/\b0\d{8,10}\b/g, '09•••REDACTED');
        t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'redacted@example.invalid');
        node.nodeValue = t;
      }
      document
        .querySelectorAll('.admin-contact-name, td .font-semibold.text-slate-900.truncate, td .font-medium.text-slate-900')
        .forEach((el, idx) => {
          el.textContent = 'Khách hàng #' + (idx + 1);
        });
    });
  }

  async function screenshot(filename) {
    await redactDomPii();
    await page.screenshot({ path: `${evidenceDir}/${filename}` });
  }

  // 1. Dashboard verification
  await check('Browser 1440px: Dashboard displays exact D1 canonical counts and handles error + retry', async () => {
    await page.goto(base + '/admin/dashboard', { waitUntil: 'networkidle' });
    await until(
      async () => {
        const t = await text();
        return t.includes('Đơn chờ xử lý') && t.includes(String(expectedNewOrders));
      },
      'Dashboard loaded with canonical NEW count'
    );
    const bodyText = await text();
    assert.ok(bodyText.includes(String(expectedNewOrders)), `Expected pendingOrders=${expectedNewOrders}`);
    assert.ok(bodyText.includes(String(expectedTotalOrders)), `Expected totalOrders=${expectedTotalOrders}`);
    assert.ok(bodyText.includes(String(expectedReadyMedia)), `Expected mediaCount=${expectedReadyMedia}`);
    await screenshot('r1-dashboard-1440.png');

    // Simulate /api/dashboard failure and verify error state + retry recovery
    await page.route('**/api/dashboard**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Lỗi D1 giả lập trên Dashboard.' }),
      });
    });

    await page.locator('button[aria-label="Làm mới"]').click();
    await until(
      async () => {
        const t = await text();
        return t.includes('Không thể tải tổng quan') && t.includes('Lỗi D1 giả lập trên Dashboard.');
      },
      'Dashboard error state shown'
    );
    await screenshot('r1-dashboard-error-1440.png');

    await page.unroute('**/api/dashboard**');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await until(
      async () => {
        const t = await text();
        return t.includes('Đơn chờ xử lý') && t.includes(String(expectedNewOrders));
      },
      'Dashboard recovered on retry'
    );
  });

  // 2. Customers verification
  await check('Browser 1440px: Customers pagination, reload persistence, filter reset, empty/error/retry, and stale response guard', async () => {
    await page.goto(base + '/admin/customers', { waitUntil: 'networkidle' });
    await until(
      async () => {
        const t = await text();
        return t.includes('Hiển thị 1–25 /') && t.includes('Trang 1 /');
      },
      'Customers page 1 loaded'
    );
    await screenshot('r1-customers-1440.png');

    // Click Next page -> Page 2
    await page.locator('button[aria-label="Trang sau"]').click();
    await until(
      async () => {
        const t = await text();
        return page.url().includes('page=2') && t.includes('Hiển thị 26–50 /') && t.includes('Trang 2 /');
      },
      'Customers page 2 loaded'
    );

    // Reload preserves page 2
    await page.reload({ waitUntil: 'networkidle' });
    await until(
      async () => {
        const t = await text();
        return page.url().includes('page=2') && t.includes('Hiển thị 26–50 /');
      },
      'Customers page 2 persisted after reload'
    );

    // Filter/search resets page to 1 and shows empty state for unmatched query
    await page.locator('input[aria-label="Tìm kiếm khách hàng"]').fill('__NO_CUSTOMER_MATCH_R1__');
    await until(
      async () => {
        const t = await text();
        return !page.url().includes('page=2') && t.includes('Không có khách hàng phù hợp.');
      },
      'Customers search reset page to 1 and rendered empty state'
    );

    // Clear filter recovers page 1
    await page.locator('button[aria-label="Xóa tìm kiếm"]').click();
    await until(async () => (await text()).includes('Hiển thị 1–25 /'), 'Customers cleared search back to page 1');

    // Stale response guard: hold page=2 response while user switches to "Thành viên" tab
    let releaseStaleCustomerRoute;
    const staleRoutePromise = new Promise((r) => {
      releaseStaleCustomerRoute = r;
    });
    let capturedStaleCustomer = false;

    await page.route('**/api/customers**', async (route) => {
      const url = route.request().url();
      if (url.includes('page=2') && !capturedStaleCustomer) {
        capturedStaleCustomer = true;
        await staleRoutePromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'stale-c1',
                name: 'Stale Page 2 Customer',
                email: null,
                phone: '0900000000',
                tier: 'Khách vãng lai',
                totalSpent: 1000000,
                ordersCount: 1,
                createdAt: new Date().toISOString(),
                source: 'GUEST',
              },
            ],
            pagination: { total: 50, page: 2, limit: 25, totalPages: 2 },
            summary: { total: 50, registered: 0, guest: 50, totalNonCancelled: 50000000 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.locator('button[aria-label="Trang sau"]').click();
    await until(() => capturedStaleCustomer, 'Captured in-flight page=2 customer request');

    // Switch to "Thành viên" tab (0 rows in real DB)
    await page.getByRole('tab', { name: /Thành viên/ }).click();
    await until(
      async () => {
        const t = await text();
        return page.url().includes('source=REGISTERED') && t.includes('Không có khách hàng phù hợp.');
      },
      'Newer REGISTERED tab settled'
    );

    // Release stale page=2 response and verify it does NOT overwrite REGISTERED tab
    releaseStaleCustomerRoute();
    await pause(350);
    assert.equal(
      (await text()).includes('Không có khách hàng phù hợp.'),
      true,
      'Stale page=2 response must not overwrite newer REGISTERED empty state'
    );
    await page.unroute('**/api/customers**');

    // Reset filter back to ALL
    await page.getByRole('tab', { name: /Tất cả/ }).click();
    await until(async () => (await text()).includes('Hiển thị 1–25 /'), 'Customers reset to ALL');

    // Error state + Retry
    await page.route('**/api/customers**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Lỗi tải khách hàng giả lập.' }),
      });
    });
    await page.locator('button[aria-label="Tải lại danh sách"]').click();
    await until(
      async () => {
        const t = await text();
        return t.includes('Lỗi tải khách hàng giả lập.');
      },
      'Customers error state + retry button shown'
    );
    await page.unroute('**/api/customers**');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await until(async () => (await text()).includes('Hiển thị 1–25 /'), 'Customers recovered after retry');
  });

  // 3. Contacts verification (real DB read-only pagination, reload, filter reset, stale guard, error/retry)
  await check('Browser 1440px: Contacts pagination, reload persistence, filter reset, empty/error/retry, and stale response guard', async () => {
    await page.goto(base + '/admin/contacts', { waitUntil: 'networkidle' });
    await until(
      async () => {
        const t = await text();
        return t.includes('Hiển thị 1–20 /') && t.includes('Trang 1 /');
      },
      'Contacts page 1 loaded'
    );
    await screenshot('r1-contacts-1440.png');

    // Click Next page -> Page 2
    await page.locator('button[aria-label="Trang sau"]').click();
    await until(
      async () => {
        const t = await text();
        return page.url().includes('page=2') && t.includes('Hiển thị 21–40 /') && t.includes('Trang 2 /');
      },
      'Contacts page 2 loaded'
    );

    // Reload preserves page 2
    await page.reload({ waitUntil: 'networkidle' });
    await until(
      async () => {
        const t = await text();
        return page.url().includes('page=2') && t.includes('Hiển thị 21–40 /');
      },
      'Contacts page 2 persisted after reload'
    );

    // Clicking "Đã xong" (HANDLED) tab resets page to 1
    await page.getByRole('tab', { name: /Đã xong/ }).click();
    await until(
      async () => {
        const t = await text();
        return page.url().includes('status=HANDLED') && !page.url().includes('page=2') && t.includes('Hiển thị 1–4 / 4 liên hệ');
      },
      'Contacts HANDLED filter reset page to 1'
    );

    // Stale response guard on Contacts
    let releaseStaleContactRoute;
    const staleContactPromise = new Promise((r) => {
      releaseStaleContactRoute = r;
    });
    let capturedStaleContact = false;

    await page.route('**/api/admin/contacts**', async (route) => {
      const url = route.request().url();
      if (url.includes('status=PENDING') && !capturedStaleContact) {
        capturedStaleContact = true;
        await staleContactPromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'stale-contact-1',
                name: 'Stale Contact Row',
                phone: '0900000000',
                email: null,
                message: 'Stale row',
                status: 'PENDING',
                revision: 1,
                internalNote: null,
                handledAt: null,
                handledBy: null,
                startedProcessingAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                events: [],
              },
            ],
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1, pendingCount: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('tab', { name: /Chưa xử lý/ }).click();
    await until(() => capturedStaleContact, 'Captured in-flight PENDING contacts request');

    // Switch to "Đang xử lý" (PROCESSING = 0 items in real DB)
    await page.getByRole('tab', { name: /Đang xử lý/ }).click();
    await until(
      async () => {
        const t = await text();
        return page.url().includes('status=PROCESSING') && t.includes('Không có yêu cầu liên hệ nào phù hợp.');
      },
      'Newer PROCESSING tab empty state settled'
    );

    // Release stale PENDING response and verify it does NOT overwrite PROCESSING empty state
    releaseStaleContactRoute();
    await pause(350);
    assert.equal(
      (await text()).includes('Không có yêu cầu liên hệ nào phù hợp.'),
      true,
      'Stale PENDING response must not overwrite newer PROCESSING state'
    );
    await page.unroute('**/api/admin/contacts**');

    // Error state + Retry
    await page.route('**/api/admin/contacts**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Lỗi tải liên hệ giả lập.' }),
      });
    });
    await page.getByRole('tab', { name: /Tất cả/ }).click();
    await until(
      async () => {
        const t = await text();
        return t.includes('Lỗi tải liên hệ giả lập.');
      },
      'Contacts error state + retry button shown'
    );
    await page.unroute('**/api/admin/contacts**');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await until(async () => (await text()).includes('Hiển thị 1–20 /'), 'Contacts recovered after retry');
  });

  // 4. Contacts status PATCH reconciliation + tab-switch during PATCH + 409 note draft preservation
  await check('Browser 1440px: Contacts PATCH reconciles list/total/page/pendingCount via refreshVersion, respects tab change during PATCH, and preserves noteDraft on 409', async () => {
    let fixtureStatus = 'PENDING';
    let force409 = false;
    let delayPatchMs = 0;

    const makeItem = () => ({
      id: 'review-filter-fixture',
      name: 'Review filter fixture',
      phone: '0900000000',
      email: null,
      message: 'Local intercepted fixture',
      status: fixtureStatus,
      revision: 1,
      internalNote: null,
      handledAt: null,
      handledBy: null,
      startedProcessingAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [],
    });

    await page.route('**/api/admin/contacts**', async (route) => {
      if (route.request().method() === 'PATCH') {
        if (delayPatchMs > 0) await pause(delayPatchMs);
        if (force409) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Xung đột phiên làm việc: Yêu cầu đã được cập nhật bởi phiên khác.',
            }),
          });
          return;
        }
        const reqBody = JSON.parse(route.request().postData() || '{}');
        fixtureStatus = reqBody.status || 'PROCESSING';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: makeItem() }),
        });
      } else {
        const query = new URL(route.request().url()).searchParams;
        const filterSt = query.get('status');
        const rows = filterSt && filterSt !== fixtureStatus ? [] : [makeItem()];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: rows,
            pagination: {
              total: rows.length,
              page: 1,
              limit: 20,
              totalPages: 1,
              pendingCount: fixtureStatus === 'PENDING' ? 1 : 0,
            },
          }),
        });
      }
    });

    await page.goto(base + '/admin/contacts?status=PENDING', { waitUntil: 'networkidle' });
    await page.locator('.admin-contact-name').waitFor();

    // 4a. Verify 409 preserves note draft
    force409 = true;
    await page.getByRole('button', { name: '+ Ghi chú', exact: true }).click();
    const noteBox = page.locator('textarea[placeholder="Ghi chú nội bộ..."]');
    await noteBox.fill('Bản nháp quan trọng không được mất khi 409');
    await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
    await until(
      async () => (await text()).includes('Xung đột phiên làm việc'),
      '409 conflict banner displayed'
    );
    assert.equal(await noteBox.isVisible(), true, 'Note textarea must remain open on 409');
    assert.equal(
      await noteBox.inputValue(),
      'Bản nháp quan trọng không được mất khi 409',
      'Note draft content must be preserved on 409'
    );
    force409 = false;

    // 4b. Verify PATCH PENDING -> PROCESSING while on status=PENDING reconciles list to 0 rows
    await page.getByRole('button', { name: 'Đang xử lý', exact: true }).click();
    await page.waitForTimeout(500);
    const reproResult = {
      statusFilter: new URL(page.url()).searchParams.get('status'),
      rowCount: await page.locator('.admin-contact-name').count(),
      newStatus: fixtureStatus,
    };
    await writeFile('.wrangler/audit-public/contact-filter-repro.json', JSON.stringify(reproResult, null, 2));
    assert.equal(reproResult.statusFilter, 'PENDING');
    assert.equal(reproResult.rowCount, 0, 'Row must leave status=PENDING filter after PATCH to PROCESSING');
    assert.equal(reproResult.newStatus, 'PROCESSING');
    assert.ok((await text()).includes('Hiển thị 0 / 0 liên hệ'), 'Total and range must reconcile to 0');

    // 4c. Verify tab change while PATCH is in-flight refetches with the NEW tab (no stale closure filter)
    fixtureStatus = 'PENDING';
    delayPatchMs = 250;
    await page.locator('button[aria-label="Tải lại danh sách"]').click();
    await page.locator('.admin-contact-name').waitFor();

    // Click "Đang xử lý" action button (starts 250ms PATCH to PROCESSING), then immediately switch tab to "Đang xử lý" (status=PROCESSING)
    await page.getByRole('button', { name: 'Đang xử lý', exact: true }).click();
    await page.getByRole('tab', { name: /Đang xử lý/ }).click();
    await until(
      async () => {
        const curStatus = new URL(page.url()).searchParams.get('status');
        const count = await page.locator('.admin-contact-name').count();
        return curStatus === 'PROCESSING' && count === 1;
      },
      'Tab switch during PATCH reconciled against new PROCESSING tab with rowCount=1'
    );

    await page.unroute('**/api/admin/contacts**');
  });

  assert.deepEqual(pageErrors, [], 'Zero unhandled browser runtime exceptions');
  console.log(`\nR1 Audit Verification: ${passed}/${passed} PASS`);
} finally {
  await browser.close();
  await rm('scripts/.r1-audit-bundle.mjs', { force: true }).catch(() => {});
}
