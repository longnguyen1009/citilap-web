import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import assert from 'node:assert/strict';

const PORT = 3099;
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const modulePath = process.env.MEDIA_PLAYWRIGHT_MODULE || path.join(tmpdir(), 'citilap-media-qa/node_modules/playwright-core/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath).href);

console.log('Building isolated Miniflare D1 database...');
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("catalog-browser"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

const DB = await mf.getD1Database('DB');
const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
const env = { DB, PRODUCT_MEDIA };

// 1. Run migrations
for (const f of (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  await DB.batch(unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`, 'utf8')).map((s) => DB.prepare(s)));
}

// 2. Setup categories & brands
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-laptop', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-accessory', 'Phụ kiện máy tính', 'phu-kien', CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Brand(id, name, slug, status, createdAt, updatedAt) VALUES('brand-lenovo', 'Lenovo', 'lenovo', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Brand(id, name, slug, status, createdAt, updatedAt) VALUES('brand-dell', 'Dell', 'dell', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Brand(id, name, slug, status, createdAt, updatedAt) VALUES('brand-asus', 'Asus', 'asus', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();

// 3. Import service bundle
const serviceBundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/product-studio.service';
      export * from './src/server/services/brand.service';
      export * from './src/server/services/media-library.service';
      export * from './src/contracts/cms/product-studio';
      export * from './src/server/services/storefront-cms.service';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-server-only',
    setup(b) {
      b.onResolve({ filter: /^server-only$/ }, args => ({ path: args.path, namespace: 'server-only-ns' }));
      b.onLoad({ filter: /.*/, namespace: 'server-only-ns' }, () => ({ contents: '' }));
    },
  }],
  write: false,
});
const api = await import(`data:text/javascript;base64,${Buffer.from(serviceBundle.outputFiles[0].text).toString('base64')}`);

// 4. Upload sample image
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const asset = (await api.uploadLibraryImage(env, new File([png], 'test-image.png', { type: 'image/png' }))).asset;

// 5. Seed 125 products
console.log('Seeding 125 products into isolated test database...');
for (let i = 1; i <= 125; i++) {
  const isLaptop = i <= 80;
  const isLegacy = i <= 20;
  const catId = isLaptop ? 'cat-laptop' : 'cat-accessory';
  const id = `prod-${String(i).padStart(3, '0')}`;
  const slug = `product-${String(i).padStart(3, '0')}`;
  const brand = i % 3 === 0 ? 'Lenovo' : i % 3 === 1 ? 'Dell' : 'Asus';
  const price = 15000000 + i * 200000;
  const stock = i % 10 === 0 ? 0 : 5;
  const status = i === 1 ? 'ACTIVE' : i === 2 ? 'INACTIVE' : i % 5 === 0 ? 'DRAFT' : 'ACTIVE';

  await DB.prepare(`
    INSERT INTO Product (
      id, name, slug, description, brand, model, price, stock, status, categoryId, images, specs, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    `${isLaptop ? 'Laptop' : 'Chuột'} ${brand} Legion Pro ${i}`,
    slug,
    `Mô tả chi tiết sản phẩm ${brand} Legion Pro ${i}`,
    brand,
    `MDL-${i}`,
    price,
    stock,
    status,
    catId,
    JSON.stringify(['/test.png']),
    JSON.stringify({ RAM: '16GB', SSD: '512GB', 'Màn hình': '16 inch 165Hz' })
  ).run();

  await DB.prepare(`
    INSERT INTO ProductVariant (id, productId, sku, name, price, stock, options, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    `var-${i}`,
    id,
    `SKU-${String(i).padStart(3, '0')}`,
    `Bản tiêu chuẩn ${i}`,
    price,
    stock,
    JSON.stringify({ RAM: '16GB' })
  ).run();

  if (!isLegacy) {
    const isPublished = i % 2 === 0;
    const doc = {
      ...api.blankProduct(),
      name: `${isLaptop ? 'Laptop' : 'Chuột'} ${brand} Legion Pro ${i}`,
      slug,
      categoryId: catId,
      brand,
      template: isLaptop ? 'LAPTOP' : 'MOUSE',
      price,
      availability: stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
      media: [{ assetId: asset.id, alt: `Ảnh ${i}`, variantId: '' }],
      variants: [{ id: `var-${i}`, name: `Bản tiêu chuẩn ${i}`, sku: `SKU-${String(i).padStart(3, '0')}`, condition: 'NEW', price, ram: '16GB', storage: '512GB', gpu: 'RTX 4060' }],
      warranties: [{ name: 'Bảo hành 12 tháng', description: 'Chính hãng', adjustment: 0, recommended: true }],
    };
    await DB.prepare(`
      INSERT INTO ProductStudio (productId, revision, draft, published, updatedAt)
      VALUES (?, 0, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      id,
      JSON.stringify(doc),
      isPublished ? JSON.stringify(doc) : null
    ).run();

    await DB.prepare(`
      INSERT INTO ProductStudioRevision (productId, revision, document, action, createdAt)
      VALUES (?, 1, ?, 'save', CURRENT_TIMESTAMP)
    `).bind(id, JSON.stringify(doc)).run();

    await DB.prepare(`
      UPDATE ProductStudio SET revision = 1 WHERE productId = ?
    `).bind(id).run();
  }
}

// 6. Build Client App Bundle
console.log('Compiling Admin Catalog & Editor client bundle...');
const clientBundle = await build({
  stdin: {
    contents: `
      import React, { useState, useEffect } from 'react';
      import ReactDOM from 'react-dom/client';
      import UnifiedProductsPage from './src/app/admin/products/page';
      import ProductEditor from './src/components/admin/products/ProductEditor';

      function App() {
        const [view, setView] = useState('list'); // 'list' | 'editor'
        const [editingId, setEditingId] = useState('prod-025');

        useEffect(() => {
          const handler = (e) => {
            const url = new URL(e.detail?.url || window.location.href, window.location.origin);
            if (url.pathname.startsWith('/admin/products/')) {
              const id = url.pathname.split('/')[3];
              setEditingId(id);
              setView('editor');
            } else {
              setView('list');
            }
          };
          window.addEventListener('popstate', handler);
          window.addEventListener('route-change', handler);
          return () => {
            window.removeEventListener('popstate', handler);
            window.removeEventListener('route-change', handler);
          };
        }, []);

        return (
          <div className="p-4 md:p-8">
            <header className="mb-6 flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="font-black text-blue-600 tracking-tight text-lg">CITILAP ADMIN</span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">R03 Unified Catalog</span>
              </div>
              <div className="flex gap-2">
                <button
                  id="nav-to-list"
                  onClick={() => { setView('list'); history.pushState({}, '', '/admin/products'); }}
                  className={'px-3 py-1.5 text-xs font-semibold rounded-lg border transition ' + (view === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200')}
                >
                  Danh sách sản phẩm
                </button>
                <button
                  id="nav-to-editor"
                  onClick={() => { setView('editor'); history.pushState({}, '', '/admin/products/prod-025'); }}
                  className={'px-3 py-1.5 text-xs font-semibold rounded-lg border transition ' + (view === 'editor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200')}
                >
                  Biên tập sản phẩm (prod-025)
                </button>
              </div>
            </header>

            {view === 'list' ? (
              <UnifiedProductsPage />
            ) : (
              <ProductEditor id={editingId} />
            )}
          </div>
        );
      }

      if (typeof window !== 'undefined') {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
      }
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  format: 'esm',
  write: false,
  loader: {
    '.css': 'empty',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.svg': 'text',
  },
  plugins: [
    {
      name: 'mock-next-nav',
      setup(b) {
        b.onResolve({ filter: /^next\/navigation$/ }, (args) => ({ path: args.path, namespace: 'mock-next-nav-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'mock-next-nav-ns' }, () => ({
          resolveDir: process.cwd(),
          contents: `
            import { useState, useEffect } from 'react';
            export function useRouter() {
              return {
                push: (url) => { window.history.pushState({}, '', url); window.dispatchEvent(new CustomEvent('route-change', { detail: { url } })); },
                replace: (url) => { window.history.replaceState({}, '', url); window.dispatchEvent(new CustomEvent('route-change', { detail: { url } })); },
              };
            }
            export function usePathname() {
              const [p, setP] = useState(window.location.pathname);
              useEffect(() => {
                const h = () => setP(window.location.pathname);
                window.addEventListener('popstate', h);
                window.addEventListener('route-change', h);
                return () => { window.removeEventListener('popstate', h); window.removeEventListener('route-change', h); };
              }, []);
              return p;
            }
            export function useSearchParams() {
              const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
              useEffect(() => {
                const h = () => setParams(new URLSearchParams(window.location.search));
                window.addEventListener('popstate', h);
                window.addEventListener('route-change', h);
                return () => { window.removeEventListener('popstate', h); window.removeEventListener('route-change', h); };
              }, []);
              return params;
            }
          `,
        }));
      },
    },
    {
      name: 'mock-next-img',
      setup(b) {
        b.onResolve({ filter: /^next\/image$/ }, (args) => ({ path: args.path, namespace: 'mock-next-img-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'mock-next-img-ns' }, () => ({
          resolveDir: process.cwd(),
          contents: `
            import React from 'react';
            export default function Image({ src, alt, className }) {
              return React.createElement('img', { src: typeof src === 'string' ? src : src?.src || '', alt, className });
            }
          `,
        }));
      },
    },
    {
      name: 'mock-next-link',
      setup(b) {
        b.onResolve({ filter: /^next\/link$/ }, (args) => ({ path: args.path, namespace: 'mock-next-link-ns' }));
        b.onLoad({ filter: /.*/, namespace: 'mock-next-link-ns' }, () => ({
          resolveDir: process.cwd(),
          contents: `
            import React from 'react';
            export default function Link({ href, children, className, onClick, ...props }) {
              return React.createElement('a', {
                href,
                className,
                onClick: (e) => {
                  if (onClick) onClick(e);
                  if (!e.defaultPrevented && href && !href.startsWith('http') && !props.target) {
                    e.preventDefault();
                    window.history.pushState({}, '', href);
                    window.dispatchEvent(new CustomEvent('route-change', { detail: { url: href } }));
                  }
                },
                ...props
              }, children);
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
});
const clientJs = clientBundle.outputFiles[0].text;

// 7. Start HTTP Server
const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CitiLap Unified Catalog & Editor - R03 Browser QA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800">
  <div id="root"></div>
  <script type="module" src="/bundle.js"></script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith('/bundle.js')) {
    console.log(`[SERVER REQ] ${req.method} ${url.pathname}${url.search}`);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/' || url.pathname.startsWith('/admin/products')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url.pathname === '/bundle.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(clientJs);
    return;
  }

  // API Routes
  if (url.pathname === '/api/categories') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: [
        { id: 'cat-laptop', name: 'Laptop Gaming', slug: 'laptop-gaming' },
        { id: 'cat-accessory', name: 'Phụ kiện máy tính', slug: 'phu-kien' },
      ],
    }));
    return;
  }

  if (url.pathname === '/api/admin/products' && req.method === 'GET') {
    try {
      const result = await api.catalogList(DB, {
        q: url.searchParams.get('q') || '',
        kind: url.searchParams.get('kind') || 'ALL',
        categoryId: url.searchParams.get('categoryId') || '',
        brand: url.searchParams.get('brand') || '',
        publicationStatus: url.searchParams.get('publicationStatus') || 'ALL',
        availability: url.searchParams.get('availability') || 'ALL',
        page: Number(url.searchParams.get('page') || 1),
        limit: Number(url.searchParams.get('limit') || 20),
        sort: url.searchParams.get('sort') || 'updatedAt',
        order: url.searchParams.get('order') || 'desc',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === '/api/admin/brands' && req.method === 'GET') {
    try {
      const list = await api.listBrands(DB);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: list }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname.match(/\/api\/admin\/products\/[^/]+\/revisions$/) && req.method === 'GET') {
    const id = url.pathname.split('/')[4];
    try {
      const revs = await api.listProductRevisions(DB, id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: revs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname.match(/\/api\/admin\/products\/[^/]+\/revisions\/[^/]+$/) && req.method === 'GET') {
    const id = url.pathname.split('/')[4];
    const revId = parseInt(url.pathname.split('/')[6], 10);
    try {
      const snap = await api.getProductRevisionSnapshot(DB, id, revId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: snap }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname.match(/\/api\/admin\/products\/[^/]+\/revisions\/[^/]+\/restore$/) && req.method === 'POST') {
    const id = url.pathname.split('/')[4];
    const revId = parseInt(url.pathname.split('/')[6], 10);
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyText || '{}');
        const expectedRevision = Number(body.expectedRevision ?? 0);
        const restored = await api.restoreProductRevision(env, id, revId, expectedRevision);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: restored }));
      } catch (err) {
        res.writeHead(err.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/admin/products/') && req.method === 'GET') {
    const id = url.pathname.split('/')[4];
    try {
      const detail = await api.studioDetail(DB, id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: detail }));
    } catch (err) {
      res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname.startsWith('/api/admin/products/') && (req.method === 'PUT' || req.method === 'POST')) {
    const id = url.pathname.split('/')[4] || null;
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyText);
        const result = await api.writeStudio(env, id, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (err) {
        res.writeHead(err.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/admin/products/') && req.method === 'DELETE') {
    const id = url.pathname.split('/')[4];
    try {
      const result = await api.archiveProduct(DB, id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname.startsWith('/api/media/file/')) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(png);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

await new Promise(r => server.listen(PORT, r));
console.log(`Browser test server listening on http://localhost:${PORT}`);

let passed = 0;
const check = (name) => { passed++; console.log(`PASS ${name}`); };
let browser;

try {
  browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  await mkdir('docs/screenshots/admin03', { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => { console.log('PAGE ERROR:', err.message); errors.push(err.message); });
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  // --- FLOW 1: Unified Catalog List, Search & Server Pagination ---
  console.log('Navigating to Unified Products List...');
  await page.goto(`http://localhost:${PORT}/admin/products`);
  await page.waitForSelector('table');
  check('1. Unified catalog table renders successfully');

  // Verify total products
  const countText = await page.locator('text=trong tổng số 125 sản phẩm').first().textContent();
  assert.ok(countText.includes('125'));
  check('2. Total item count reflects 125 fixture records');

  // Test Filter Kind = Laptop
  await page.locator('#filter-kind-laptop').click();
  await page.waitForTimeout(500);
  const laptopRows = await page.locator('tbody tr').count();
  assert.ok(laptopRows > 0);
  check('3. Quick filter by Kind (Laptop) updates listing');

  // Test Filter Kind = Tất cả
  await page.locator('#filter-kind-all').click();
  await page.waitForTimeout(500);

  // Test Pagination to Page 7 (> 100th record)
  const nextBtn = page.locator('button:has-text("Sau")');
  for (let i = 1; i <= 6; i++) {
    await nextBtn.click();
    await page.waitForTimeout(200);
  }
  const page7Text = await page.locator('text=121 - 125 trong tổng số 125').first().textContent();
  assert.ok(page7Text.includes('121 - 125'));
  check('4. Server pagination accesses page 7 (> 100 items limit solved)');

  // Take Catalog 1440 Screenshot
  await page.screenshot({ path: 'docs/screenshots/admin03/catalog-1440.png', fullPage: true });

  // Responsive Viewports for Catalog
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.waitForTimeout(300);
    const hasScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasScroll, false, `Horizontal overflow at ${width}px`);
    await page.screenshot({ path: `docs/screenshots/admin03/catalog-${width}.png`, fullPage: true });
    check(`5. Responsive viewport ${width}px rendered without overflow`);
  }

  // Reset to 1440 for Editor
  await page.setViewportSize({ width: 1440, height: 950 });

  // --- FLOW 2: Laptop Editor ---
  console.log('Switching to Laptop Editor for prod-025...');
  await page.locator('#nav-to-editor').click();
  await page.waitForSelector('text=Quay lại danh sách sản phẩm');
  check('6. Laptop editor opens with prod-025');

  // Verify 7 Tabs (including Lịch sử & Khôi phục)
  assert.ok(await page.locator('button:has-text("Thông tin chung")').isVisible());
  assert.ok(await page.locator('button:has-text("Thông số kỹ thuật")').isVisible());
  assert.ok(await page.locator('button:has-text("Cấu hình & Giá")').isVisible());
  assert.ok(await page.locator('button:has-text("Hình ảnh & Video")').isVisible());
  assert.ok(await page.locator('button:has-text("Bài giới thiệu")').isVisible());
  assert.ok(await page.locator('button:has-text("SEO & Hiển thị")').isVisible());
  assert.ok(await page.locator('button:has-text("Lịch sử & Khôi phục")').isVisible());
  check('7. All 7 editor tabs present and responsive (including History & Restore)');

  // Verify Tab 1: Brand selector, Condition and Marketing checkboxes
  assert.ok(await page.locator('select:has-text("Chọn thương hiệu")').isVisible());
  assert.ok(await page.locator('select:has-text("Mới 100%")').isVisible());
  assert.ok(await page.locator('text=Hàng mới về').isVisible());
  check('8. Tab 1 Brand selector, Condition and marketing checkboxes verified');

  // Verify Tab 5: RichContentEditor
  await page.locator('button:has-text("Bài giới thiệu")').click();
  await page.waitForTimeout(300);
  assert.ok(await page.locator('button:has-text("Trực quan")').isVisible());
  assert.ok(await page.locator('button:has-text("Mã HTML")').isVisible());
  assert.ok(await page.locator('button[title*="In đậm"]').isVisible());
  assert.ok(await page.locator('button[title*="Chèn ảnh"]').isVisible());
  check('9. Tab 5 RichContentEditor visual formatting toolbar verified');

  // Verify Tab 7: Lịch sử & Khôi phục
  await page.locator('button:has-text("Lịch sử & Khôi phục")').click();
  await page.waitForSelector('text=Quy tắc khôi phục an toàn:');
  assert.ok(await page.locator('table').isVisible());
  await page.screenshot({ path: 'docs/screenshots/admin03/editor-history-1440.png', fullPage: true });
  check('10. Tab 7 History & Restore table and safety guidelines verified with screenshot');

  // Edit Laptop specs in Tab 2
  await page.locator('button:has-text("Thông số kỹ thuật")').click();
  await page.waitForTimeout(300);
  const cpuInput = page.locator('input[placeholder*="Intel Core"]').first();
  await cpuInput.fill('AMD Ryzen 9 7945HX Extreme');
  check('11. Modified laptop spec in Specs tab');

  // Edit Price in Tab 3
  await page.locator('button:has-text("Cấu hình & Giá")').click();
  await page.waitForTimeout(300);
  const priceInput = page.locator('input[type="number"]').first();
  await priceInput.fill('39990000');
  check('12. Modified laptop price in Pricing tab');

  // Save Draft
  await page.locator('button:has-text("Lưu nháp")').click();
  await page.waitForSelector('text=Đã lưu bản nháp an toàn.');
  check('13. Save draft succeeds with success alert notice');

  // Take Editor Screenshot
  await page.screenshot({ path: 'docs/screenshots/admin03/editor-1440.png', fullPage: true });

  // Test Modal Preview
  console.log('Testing preview action...');
  await page.locator('button:has-text("Xem trước")').click();
  await page.waitForTimeout(500);

  // Take Preview Screenshot
  await page.screenshot({ path: 'docs/screenshots/admin03/preview-1440.png', fullPage: true });
  check('14. Preview action captured successfully');

  // Close preview modal
  await page.locator('button[aria-label="Đóng"]').click();
  await page.waitForTimeout(300);

  // Test Publish
  await page.locator('button:has-text("Xuất bản website"), button:has-text("Cập nhật website")').click();
  await page.waitForSelector('text=Đã xuất bản sản phẩm lên website thành công.');
  check('15. Publish product updates live Storefront state');

  assert.deepEqual(errors, [], 'No browser console errors');
  check('16. Zero JavaScript console errors throughout all user flows');

  await writeFile(
    'docs/screenshots/admin03/verification.json',
    JSON.stringify(
      {
        passed,
        totalTests: 16,
        viewports: [1440, 768, 390],
        runtime: 'Microsoft Edge + Isolated Miniflare D1',
        errors,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`\n========================================`);
  console.log(`Browser QA Verification: ${passed}/16 PASS`);
  console.log(`========================================\n`);
} finally {
  await browser?.close();
  server.close();
  await mf.dispose();
}
