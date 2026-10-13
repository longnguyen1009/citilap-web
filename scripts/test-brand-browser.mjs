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

console.log('Building isolated Miniflare D1 database for Brand QA...');
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("brand-browser"); } }',
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

// 2. Setup Category and Media
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-laptop', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();

// 3. Import service bundle
const serviceBundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/brand.service';
      export * from './src/server/services/media-library.service';
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

// 4. Seed initial brands
await DB.prepare(`
  INSERT INTO Brand(id, name, slug, logo, description, status, createdAt, updatedAt)
  VALUES ('brand-lenovo', 'Lenovo', 'lenovo', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100', 'Thương hiệu máy tính Lenovo toàn cầu', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run();
await DB.prepare(`
  INSERT INTO Brand(id, name, slug, logo, description, status, createdAt, updatedAt)
  VALUES ('brand-asus', 'Asus', 'asus', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100', 'Dòng máy tính Asus ROG, Zenbook', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run();

// Seed a product linked to brand-lenovo to test protection guard
await DB.prepare(`
  INSERT INTO Product(id, name, slug, description, brand, brandId, categoryId, price, status, createdAt, updatedAt)
  VALUES ('prod-lenovo-1', 'Lenovo Legion 5 Pro', 'lenovo-legion-5-pro', 'Mô tả', 'Lenovo', 'brand-lenovo', 'cat-laptop', 30000000, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run();

// 5. Build Client App Bundle for Brands Page
console.log('Compiling Admin Brands client bundle...');
const clientBundle = await build({
  stdin: {
    contents: `
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import AdminBrandsPage from './src/app/admin/brands/page';

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(AdminBrandsPage));
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'browser',
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
            export function useRouter() { return { push: () => {}, replace: () => {} }; }
            export function usePathname() { return '/admin/brands'; }
            export function useSearchParams() { return new URLSearchParams(); }
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
            export default function Link({ href, children, className }) {
              return React.createElement('a', { href, className }, children);
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

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quản lý Thương hiệu - CitiLap Admin QA</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 p-6">
  <div id="root"></div>
  <script type="module" src="/bundle.js"></script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/' || url.pathname === '/admin/brands') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url.pathname === '/bundle.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(clientJs);
    return;
  }

  if (url.pathname === '/api/admin/brands' && req.method === 'GET') {
    const list = await api.listBrands(DB, {
      q: url.searchParams.get('q') || '',
      status: url.searchParams.get('status') || 'ALL',
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: list }));
    return;
  }

  if (url.pathname === '/api/admin/brands' && req.method === 'POST') {
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyText);
        const created = await api.writeBrand(env, null, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: created }));
      } catch (err) {
        res.writeHead(err.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/admin/brands/') && req.method === 'PUT') {
    const id = url.pathname.split('/')[4];
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyText);
        const updated = await api.writeBrand(env, id, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: updated }));
      } catch (err) {
        res.writeHead(err.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/admin/brands/') && req.method === 'DELETE') {
    const id = url.pathname.split('/')[4];
    try {
      const result = await api.archiveBrand(DB, id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      res.writeHead(err.status || 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

await new Promise(r => server.listen(PORT, r));
console.log(`Brand browser test server listening on http://localhost:${PORT}`);

let passed = 0;
const check = (name) => { passed++; console.log(`PASS ${name}`); };
let browser;

try {
  browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  await mkdir('docs/screenshots/admin03', { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => { console.log('PAGE ERROR:', err.message); errors.push(err.message); });

  console.log('Navigating to Admin Brands Page...');
  await page.goto(`http://localhost:${PORT}/admin/brands`);
  await page.waitForSelector('table');
  check('1. Brand admin table renders successfully');

  // Verify seeded brands present
  assert.ok(await page.locator('text=Lenovo').first().isVisible());
  assert.ok(await page.locator('text=Asus').first().isVisible());
  assert.ok(await page.locator('text=1 sản phẩm').first().isVisible()); // Linked product count
  check('2. Seeded brands and product count displayed');

  // Take Brands Admin Screenshot
  await page.screenshot({ path: 'docs/screenshots/admin03/brands-1440.png', fullPage: true });
  check('3. Brand admin screenshot captured at 1440px');

  // Open Create Modal
  console.log('Testing create brand modal...');
  await page.locator('button:has-text("Thêm thương hiệu mới")').click();
  await page.waitForSelector('text=Tên thương hiệu');
  check('4. Create brand modal opens');

  // Fill Create Form with auto-slugify
  const nameInput = page.locator('input[placeholder*="Lenovo, Dell"]').first();
  await nameInput.fill('Apple');
  const slugInput = page.locator('input[placeholder="lenovo"]').first();
  const slugVal = await slugInput.inputValue();
  assert.equal(slugVal, 'apple');
  check('5. Auto-slugify produces "apple" from "Apple"');

  // Save Brand
  await page.locator('button:has-text("Tạo thương hiệu")').click();
  await page.waitForSelector('text=Đã tạo mới thương hiệu "Apple" thành công.');
  check('6. Brand created successfully with alert feedback');

  // Verify Apple is in table
  await page.waitForSelector('text=Apple');
  assert.ok(await page.locator('a[href="/brand/apple"]').isVisible());
  check('7. Newly created brand appears in table with /brand/apple link');

  // Test Delete Protection Modal for Lenovo (productCount > 0)
  console.log('Testing delete protection guard for brand with products...');
  // Find delete button for Lenovo row
  const lenovoRow = page.locator('tr:has-text("Lenovo")').first();
  await lenovoRow.locator('button[title*="Lưu trữ"]').click();
  await page.waitForSelector('text=Cảnh báo bảo vệ dữ liệu sản phẩm');
  assert.ok(await page.locator('text=hiện đang được liên kết với 1 sản phẩm').isVisible());
  check('8. Delete guard modal prevents deleting brand with active products');

  // Close modal
  await page.locator('button:has-text("Đóng")').click();
  await page.waitForTimeout(300);

  assert.deepEqual(errors, [], 'No browser console errors');
  check('9. Zero console errors throughout Brand admin interactions');

  console.log(`\n========================================`);
  console.log(`Brand Browser QA Verification: ${passed}/9 PASS`);
  console.log(`========================================\n`);
} finally {
  await browser?.close();
  server.close();
  await mf.dispose();
}
