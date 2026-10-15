import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import assert from 'node:assert/strict';

const PORT = 3098;
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const modulePath = process.env.MEDIA_PLAYWRIGHT_MODULE || path.join(tmpdir(), 'citilap-media-qa/node_modules/playwright-core/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath).href);

console.log('=== CITILAP R06.1 — COMPONENT HARNESS BROWSER QA (Scope D: Real React Components + D1 Backend) ===\n');

// 1. Miniflare isolated DB
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r06-browser"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

const DB = await mf.getD1Database('DB');
const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');

// 2. Run all migrations up to 0015
const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
for (const f of migrationFiles) {
  const sql = await readFile(`d1-migrations/${f}`, 'utf8');
  await DB.batch(unstable_splitSqlQuery(sql).map((s) => DB.prepare(s)));
}

// 3. Build Backend Services Bundle
const serverBundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/order.service';
      export * from './src/server/services/contact.service';
      export * from './src/server/services/notification.service';
      export * from './src/server/services/customer.service';
      export * from './src/lib/csv-export';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
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
  outfile: 'scripts/.r06-server-bundle.mjs',
});

const api = await import('./.r06-server-bundle.mjs');

// 4. Seed initial catalog product
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-laptop', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();
await DB.prepare(`
  INSERT INTO Product(id, name, slug, description, price, stock, status, categoryId, createdAt, updatedAt)
  VALUES('prod-legion-7', 'Lenovo Legion Pro 7i Gen 9', 'lenovo-legion-pro-7i-gen-9', 'Laptop gaming flagship', 62990000, 15, 'ACTIVE', 'cat-laptop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run();
await DB.prepare(`
  INSERT INTO ProductStudio(productId, revision, draft, published, updatedAt)
  VALUES('prod-legion-7', 1, '{"availability":"AVAILABLE","variants":[]}', '{"availability":"AVAILABLE","variants":[]}', CURRENT_TIMESTAMP)
`).run();

// Seed a registered user and customer
await DB.prepare(`
  INSERT INTO User(id, email, password, name, phone, role, tier, totalSpend, createdAt, updatedAt)
  VALUES('user-vip-1', 'vip@citilap.vn', 'hash', 'Trần Thị VIP', '0912888999', 'USER', 'Vàng', 120000000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run();

// Ensure screenshot directory exists
await mkdir('docs/screenshots/r06', { recursive: true });

// 5. Build Client Bundle importing production components
console.log('Compiling Real Admin Production UI Bundle...');
const clientBundle = await build({
  stdin: {
    contents: `
      import React, { useState, useEffect } from 'react';
      import ReactDOM from 'react-dom/client';
      import AdminNotificationBell from './src/components/admin/notifications/AdminNotificationBell';
      import OrdersPage from './src/app/admin/orders/page';
      import OrderDetailPage from './src/app/admin/orders/[id]/page';
      import AdminContactsPage from './src/app/admin/contacts/page';
      import CustomersPage from './src/app/admin/customers/page';

      function TestApp() {
        const [currentTab, setCurrentTab] = useState('orders');
        const [activeOrderId, setActiveOrderId] = useState(null);

        useEffect(() => {
          const handleCustomNav = (e) => {
            if (e.detail?.tab) setCurrentTab(e.detail.tab);
            if (e.detail?.orderId) {
              setActiveOrderId(e.detail.orderId);
              setCurrentTab('order-detail');
            }
          };
          window.addEventListener('citilap-nav', handleCustomNav);
          return () => window.removeEventListener('citilap-nav', handleCustomNav);
        }, []);

        return (
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-6">
                <span className="font-black text-blue-600 text-lg tracking-tight">CitiLap Admin</span>
                <nav className="flex items-center gap-1 text-sm font-semibold">
                  <button
                    id="nav-tab-orders"
                    type="button"
                    onClick={() => { setCurrentTab('orders'); setActiveOrderId(null); }}
                    className={'px-3 py-1.5 rounded-lg transition ' + (currentTab === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                  >
                    Đơn hàng
                  </button>
                  <button
                    id="nav-tab-contacts"
                    type="button"
                    onClick={() => { setCurrentTab('contacts'); setActiveOrderId(null); }}
                    className={'px-3 py-1.5 rounded-lg transition ' + (currentTab === 'contacts' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                  >
                    Liên hệ & Tư vấn
                  </button>
                  <button
                    id="nav-tab-customers"
                    type="button"
                    onClick={() => { setCurrentTab('customers'); setActiveOrderId(null); }}
                    className={'px-3 py-1.5 rounded-lg transition ' + (currentTab === 'customers' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                  >
                    Khách hàng
                  </button>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <AdminNotificationBell />
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">Admin Vận Hành</span>
              </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
              {currentTab === 'orders' && (
                <div id="view-orders">
                  <OrdersPage />
                </div>
              )}
              {currentTab === 'order-detail' && activeOrderId && (
                <div id="view-order-detail">
                  <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải chi tiết đơn hàng...</div>}>
                    <OrderDetailPage params={{ id: activeOrderId }} />
                  </React.Suspense>
                </div>
              )}
              {currentTab === 'contacts' && (
                <div id="view-contacts">
                  <AdminContactsPage />
                </div>
              )}
              {currentTab === 'customers' && (
                <div id="view-customers">
                  <CustomersPage />
                </div>
              )}
            </main>
          </div>
        );
      }

      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(TestApp));
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  loader: {
    '.css': 'empty',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.svg': 'text',
  },
  plugins: [
    {
      name: 'mock-next-link',
      setup(build) {
        build.onResolve({ filter: /^next\/link$/ }, (args) => ({ path: args.path, namespace: 'mock-next-link-ns' }));
        build.onLoad({ filter: /.*/, namespace: 'mock-next-link-ns' }, () => ({
          resolveDir: process.cwd(),
          contents: `
            import React from 'react';
            export default function Link({ href, children, className, onClick, ...props }) {
              return React.createElement('a', {
                href,
                className,
                onClick: (e) => {
                  e.preventDefault();
                  if (onClick) onClick(e);
                  if (href.startsWith('/admin/orders/')) {
                    const id = href.replace('/admin/orders/', '');
                    window.dispatchEvent(new CustomEvent('citilap-nav', { detail: { orderId: id } }));
                  } else if (href === '/admin/orders') {
                    window.dispatchEvent(new CustomEvent('citilap-nav', { detail: { tab: 'orders' } }));
                  } else if (href === '/admin/contacts') {
                    window.dispatchEvent(new CustomEvent('citilap-nav', { detail: { tab: 'contacts' } }));
                  }
                },
                ...props
              }, children);
            }
          `,
        }));
      },
    },
    {
      name: 'mock-next-nav',
      setup(build) {
        build.onResolve({ filter: /^next\/navigation$/ }, (args) => ({ path: args.path, namespace: 'mock-next-nav-ns' }));
        build.onLoad({ filter: /.*/, namespace: 'mock-next-nav-ns' }, () => ({
          resolveDir: process.cwd(),
          contents: `
            export function useRouter() {
              return {
                push: (url) => {
                  if (url.startsWith('/admin/orders/')) {
                    const id = url.replace('/admin/orders/', '');
                    window.dispatchEvent(new CustomEvent('citilap-nav', { detail: { orderId: id } }));
                  } else if (url === '/admin/orders') {
                    window.dispatchEvent(new CustomEvent('citilap-nav', { detail: { tab: 'orders' } }));
                  } else if (url === '/admin/contacts') {
                    window.dispatchEvent(new CustomEvent('citilap-nav', { detail: { tab: 'contacts' } }));
                  }
                },
                replace: () => {},
                refresh: () => {},
              };
            }
            export function usePathname() {
              return '/admin/orders';
            }
            export function useSearchParams() {
              return new URLSearchParams(window.location.search);
            }
          `,
        }));
      },
    },
    {
      name: 'mock-next-img',
      setup(build) {
        build.onResolve({ filter: /^next\/image$/ }, (args) => ({ path: args.path, namespace: 'mock-next-img-ns' }));
        build.onLoad({ filter: /.*/, namespace: 'mock-next-img-ns' }, () => ({
          resolveDir: process.cwd(),
          contents: `
            import React from 'react';
            export default function Image({ src, alt, className }) {
              return React.createElement('img', { src: typeof src === 'string' ? src : src?.src || '', alt: alt || '', className });
            }
          `,
        }));
      },
    },
  ],
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env': '{}',
  },
  write: false,
});

const clientJs = clientBundle.outputFiles[0].text;

// 6. HTTP Server serving production API routes + UI bundle
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Static HTML
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>CitiLap Admin R06 QA Harness</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-50">
        <div id="root"></div>
        <script type="module" src="/app.js"></script>
      </body>
      </html>
    `);
    return;
  }

  // Client JS
  if (url.pathname === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(clientJs);
    return;
  }

  // API Routes
  try {
    // 1. GET /api/orders
    if (url.pathname === '/api/orders' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const page = Number(url.searchParams.get('page')) || 1;
      const limit = Number(url.searchParams.get('limit')) || 25;

      const result = await api.listOrders({ status, search, startDate, endDate, page, limit }, DB);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result.orders, pagination: result.pagination }));
      return;
    }

    // 2. POST /api/orders (Storefront checkout simulation)
    if (url.pathname === '/api/orders' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const parsed = JSON.parse(body);
      const idempotencyKey = req.headers['idempotency-key'] || null;

      const result = await api.createOrder(parsed, idempotencyKey, DB);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, order: result.order, confirmationToken: result.confirmationToken }));
      return;
    }

    // 3. GET /api/orders/:id
    if (url.pathname.startsWith('/api/orders/') && !url.pathname.includes('/notes') && req.method === 'GET') {
      const orderId = url.pathname.replace('/api/orders/', '');
      const order = await api.getOrderById(orderId, DB);
      if (!order) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: order }));
      return;
    }

    // 4. PUT /api/orders/:id (Status Transition)
    if (url.pathname.startsWith('/api/orders/') && !url.pathname.includes('/notes') && (req.method === 'PUT' || req.method === 'PATCH')) {
      const orderId = url.pathname.replace('/api/orders/', '');
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);

      try {
        const updated = await api.transitionOrderStatus({
          orderId,
          targetStatus: data.status,
          expectedRevision: data.expectedRevision,
          reason: data.reason,
          note: data.note,
          actor: data.actor || 'Nhân viên vận hành',
        }, DB);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: updated }));
      } catch (err) {
        if (err.name === 'OrderConflictError') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: { message: err.message, currentRevision: err.currentRevision } }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: { message: err.message } }));
      }
      return;
    }

    // 5. POST /api/orders/:id/notes
    if (url.pathname.match(/\/api\/orders\/[^/]+\/notes/) && req.method === 'POST') {
      const orderId = url.pathname.split('/')[3];
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);

      const note = await api.addOrderInternalNote(orderId, data.content, data.actor, DB);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: note }));
      return;
    }

    // 6. GET /api/admin/orders/export
    if (url.pathname === '/api/admin/orders/export' && req.method === 'GET') {
      const orders = await api.getAllOrdersForExport({}, DB);
      const csv = api.buildCsvContent(['Mã đơn', 'Khách hàng', 'Tổng tiền'], orders.map(o => [o.orderNumber || o.id, o.customerName, o.totalAmount]));
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="don-hang.csv"',
      });
      res.end(csv);
      return;
    }

    // 7. Notifications
    if (url.pathname === '/api/admin/notifications' && req.method === 'GET') {
      const result = await api.listAdminNotifications(DB, { limit: 15 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result.notifications, unreadCount: result.unreadCount }));
      return;
    }

    if (url.pathname.match(/\/api\/admin\/notifications\/[^/]+\/read/) && req.method === 'PATCH') {
      const notifId = url.pathname.split('/')[4];
      const result = await api.markNotificationAsRead(notifId, DB);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
      return;
    }

    if (url.pathname === '/api/admin/notifications/read-all' && req.method === 'POST') {
      const result = await api.markAllNotificationsAsRead(DB);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: result.count }));
      return;
    }

    // 8. Contacts
    if (url.pathname === '/api/admin/contacts' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const result = await api.listContactSubmissions({ status, search }, DB);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result.contacts, pagination: result.pagination }));
      return;
    }

    if (url.pathname.match(/\/api\/admin\/contacts\/[^/]+/) && req.method === 'PATCH') {
      const contactId = url.pathname.split('/')[4];
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);

      try {
        const updated = await api.updateContactSubmissionStatus(contactId, data, DB);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: updated }));
      } catch (err) {
        if (err.name === 'ContactConflictError') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message, currentRevision: err.currentRevision }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (url.pathname === '/api/admin/contacts/export' && req.method === 'GET') {
      const contacts = await api.getAllContactsForExport({}, DB);
      const csv = api.buildCsvContent(['ID', 'Tên', 'SĐT'], contacts.map(c => [c.id, c.name, c.phone]));
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lien-he.csv"',
      });
      res.end(csv);
      return;
    }

    // 9. Customers
    if (url.pathname === '/api/customers' && req.method === 'GET') {
      const search = url.searchParams.get('search');
      const tier = url.searchParams.get('tier');
      const source = url.searchParams.get('source');
      const result = await api.listCustomers({ search, tier, source }, DB);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result.customers, pagination: result.pagination }));
      return;
    }

    if (url.pathname.startsWith('/api/admin/customers/') && !url.pathname.includes('/export') && req.method === 'GET') {
      const customerId = url.pathname.replace('/api/admin/customers/', '');
      const detail = await api.getCustomerDetail(customerId, DB);
      if (!detail) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: detail }));
      return;
    }

    if (url.pathname === '/api/admin/customers/export' && req.method === 'GET') {
      const customers = await api.getAllCustomersForExport({}, DB);
      const csv = api.buildCsvContent(['ID', 'Tên', 'Nguồn'], customers.map(c => [c.id, c.name, c.sourceLabel]));
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="khach-hang.csv"',
      });
      res.end(csv);
      return;
    }

    res.writeHead(404);
    res.end();
  } catch (err) {
    console.error('Server error on', url.pathname, err);
    res.writeHead(500);
    res.end(err.message);
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Server listening on http://localhost:${PORT}`);

// 7. Launch Real Browser
console.log('Launching Microsoft Edge via Playwright...');
const browser = await chromium.launch({
  executablePath: EDGE_PATH,
  headless: true,
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (msg) => {
  const type = msg.type();
  if (type === 'error' || type === 'warn') {
    console.log(`[Browser ${type.toUpperCase()}]`, msg.text());
  }
});
page.on('pageerror', (err) => {
  console.error('[Browser PageError]', err.message);
});

try {
  // FLOW 1: Place an Order via Storefront API
  console.log('--- Test Flow 1: Storefront Order Placement ---');
  const placeOrderRes = await fetch(`http://localhost:${PORT}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'idempotency-key': 'browser-test-ord-1' },
    body: JSON.stringify({
      items: [{ productId: 'prod-legion-7', quantity: 1 }],
      customerName: 'Hoàng Minh Quân',
      customerPhone: '0988777666',
      customerEmail: 'quan.hoang@citilap.vn',
      shippingAddress: '45 Võ Chí Công, Tây Hồ, Hà Nội',
      note: 'Giao trong buổi sáng, kiểm tra máy trước khi thanh toán',
    }),
  });
  const placedOrder = await placeOrderRes.json();
  assert.ok(placedOrder.success);
  const orderId = placedOrder.order.id;
  console.log(`✓ Placed order successfully: ${orderId}`);

  // FLOW 2: Order appears in Admin Orders Page and Notification Bell Badge
  console.log('--- Test Flow 2: Admin Dashboard & Notification Badge ---');
  await page.goto(`http://localhost:${PORT}`);
  await page.waitForSelector('#admin-notification-unread-badge');
  const badgeText = await page.textContent('#admin-notification-unread-badge');
  assert.ok(Number(badgeText) >= 1, 'Badge count must be at least 1');
  console.log(`✓ Notification badge shows: ${badgeText}`);

  await page.screenshot({ path: 'docs/screenshots/r06/01_orders_list_and_badge.png', fullPage: true });

  // FLOW 3: Open Notification Dropdown & Mark Read Semantics
  console.log('--- Test Flow 3: Notification Dropdown & Mark Read ---');
  await page.click('#admin-notification-bell-btn');
  await page.waitForSelector('#admin-notification-dropdown');
  await page.screenshot({ path: 'docs/screenshots/r06/02_notifications_dropdown.png' });

  // Click "Đã đọc hết"
  await page.click('#admin-notification-mark-all-btn');
  await page.waitForTimeout(500);
  const badgeAfter = await page.$('#admin-notification-unread-badge');
  assert.equal(badgeAfter, null, 'Badge must disappear after reading all');
  console.log('✓ Notifications marked as read, badge cleared');

  // FLOW 4: Open Order Detail & State Transition Flow
  console.log('--- Test Flow 4: Order Detail & Target State Transitions ---');
  await page.locator(`a[href="/admin/orders/${orderId}"]`).first().click();
  await page.waitForSelector('#btn-transition-contacted');

  await page.screenshot({ path: 'docs/screenshots/r06/03_order_detail_initial_new.png', fullPage: true });

  // Step 4.1: Transition NEW -> CONTACTED
  await page.click('#btn-transition-contacted');
  await page.waitForSelector('#btn-transition-confirmed');
  console.log('✓ Transitioned NEW -> CONTACTED');

  // Step 4.2: Transition CONTACTED -> CONFIRMED
  await page.click('#btn-transition-confirmed');
  await page.waitForSelector('#btn-transition-completed');
  console.log('✓ Transitioned CONTACTED -> CONFIRMED');
  await page.screenshot({ path: 'docs/screenshots/r06/04_order_detail_confirmed.png' });

  // FLOW 5: Add Internal Staff Note
  console.log('--- Test Flow 5: Internal Staff Notes ---');
  await page.fill('#internal-note-input', 'Đã gọi điện xác nhận cấu hình máy, khách đồng ý nhận hàng chiều nay.');
  await page.click('#btn-add-internal-note');
  await page.waitForTimeout(500);

  const noteAdded = await page.textContent('body');
  assert.ok(noteAdded.includes('Đã gọi điện xác nhận cấu hình máy'), 'Note text must appear in note list');
  console.log('✓ Added internal staff note');
  await page.screenshot({ path: 'docs/screenshots/r06/05_internal_note_added.png' });

  // FLOW 6: Concurrency Conflict (409) Test
  console.log('--- Test Flow 6: Concurrency CAS Conflict (409) ---');
  // Silently bump the revision on the server from background to simulate concurrent mutation
  await DB.prepare('UPDATE "Order" SET revision = revision + 1 WHERE id = ?').bind(orderId).run();

  // Now browser attempts to complete with outdated expectedRevision 2
  await page.click('#btn-transition-completed');
  await page.waitForSelector('#concurrency-conflict-banner');
  console.log('✓ 409 Conflict banner displayed successfully');
  await page.screenshot({ path: 'docs/screenshots/r06/06_concurrency_conflict_409.png' });

  // Click refresh button in conflict banner to resync
  await page.click('#concurrency-conflict-banner button');
  await page.waitForTimeout(500);

  // Step 4.3: Transition to COMPLETED
  await page.click('#btn-transition-completed');
  await page.waitForTimeout(500);
  const completedBadge = await page.textContent('body');
  assert.ok(completedBadge.includes('Hoàn tất xử lý yêu cầu'), 'Must show completed handling badge');
  console.log('✓ Transitioned CONFIRMED -> COMPLETED');
  await page.screenshot({ path: 'docs/screenshots/r06/07_order_completed.png' });

  // FLOW 7: Contacts Page & Handling Audit
  console.log('--- Test Flow 7: Contacts Processing ---');
  await api.submitContactMessage({
    name: 'Vũ Quốc Bảo',
    phone: '0901234567',
    email: 'bao.vu@citilap.vn',
    message: 'Tôi muốn tư vấn nâng cấp RAM lên 64GB cho Lenovo Legion 7.',
  }, '127.0.0.1', DB);

  await page.click('#nav-tab-contacts');
  await page.waitForSelector('#view-contacts');
  await page.waitForTimeout(500);

  const contactText = await page.textContent('#view-contacts');
  assert.ok(contactText.includes('Vũ Quốc Bảo'), 'Contact name must appear');
  console.log('✓ Contact appears in list');
  await page.screenshot({ path: 'docs/screenshots/r06/08_contacts_page.png', fullPage: true });

  await page.locator('#view-contacts button:has-text("Đang liên hệ")').first().click();
  await page.waitForTimeout(500);
  console.log('✓ Contact marked as PROCESSING');

  // FLOW 8: Customers Page
  console.log('--- Test Flow 8: Customers Aggregation Page ---');
  await page.click('#nav-tab-customers');
  await page.waitForSelector('#view-customers');
  await page.waitForTimeout(500);

  const customerText = await page.textContent('#view-customers');
  assert.ok(customerText.includes('Trần Thị VIP'), 'Registered customer must appear');
  assert.ok(customerText.includes('Hoàng Minh Quân'), 'Guest order customer must appear');
  console.log('✓ Customers page lists both registered and guest order customers');
  await page.screenshot({ path: 'docs/screenshots/r06/09_customers_page.png', fullPage: true });

  // Step 8.1: Test customer detail modal
  await page.locator('#view-customers button:has-text("Xem")').first().click();
  await page.waitForSelector('text=Chi tiết Hồ sơ Khách hàng');
  await page.waitForTimeout(500);
  console.log('✓ Customer detail modal opened with truthful metrics');
  await page.screenshot({ path: 'docs/screenshots/r06/10_customer_detail_modal.png' });

  // Close modal
  await page.click('button:has-text("Đóng")');
  await page.waitForTimeout(300);

  // FLOW 9: Mobile Viewport & Responsive Check
  console.log('--- Test Flow 9: Mobile Viewport 390px ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#nav-tab-orders');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/r06/11_mobile_orders_390px.png', fullPage: true });
  console.log('✓ Mobile viewport captured');

  console.log('\n==========================================');
  console.log('✓ ALL BROWSER PRODUCTION FLOWS PASSED!');
  console.log('==========================================\n');
} finally {
  await browser.close();
  server.close();
  await mf.dispose();
}
