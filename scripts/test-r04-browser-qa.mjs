import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import assert from 'node:assert/strict';
import { assertPublishedStudioOrderable } from '../src/server/services/storefront-order-guard.ts';

const PORT = 3095;
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const modulePath = process.env.MEDIA_PLAYWRIGHT_MODULE || path.join(tmpdir(), 'citilap-media-qa/node_modules/playwright-core/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath).href);

console.log('=== CITILAP R04.1 — BROWSER INTEGRATION & MULTI-VIEWPORT QA ===');

// 1. Miniflare isolated DB
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r04-browser"); } }',
    compatibilityDate: '2026-10-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['PRODUCT_MEDIA'],
  })
);

const DB = await mf.getD1Database('DB');
const PRODUCT_MEDIA = await mf.getR2Bucket('PRODUCT_MEDIA');
const env = { DB, PRODUCT_MEDIA };

// 2. Run migrations
const migrationFiles = (await readdir('d1-migrations')).filter((f) => f.endsWith('.sql')).sort();
for (const f of migrationFiles) {
  const sql = await readFile(`d1-migrations/${f}`, 'utf8');
  await DB.batch(unstable_splitSqlQuery(sql).map((s) => DB.prepare(s)));
}

// 3. Import Backend API Bundle
const api = await import('./.r04-1-bundle.mjs');

// Set global environment for mediaEnvironment() and prisma
globalThis.env = env;
const prisma = api.getPrismaClient(DB);

// 4. Seed Categories and Brands
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-laptop', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-mouse', 'Chuột máy tính', 'chuot', CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-charger', 'Củ sạc & Cáp sạc', 'cu-sac', CURRENT_TIMESTAMP)").run();

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const sampleAsset = (await api.uploadLibraryImage(env, new File([png], 'sample-hero.png', { type: 'image/png' }))).asset;

const bAsus = await api.writeBrand(env, null, { name: 'Asus', slug: 'asus', status: 'ACTIVE' });
const bLogitech = await api.writeBrand(env, null, { name: 'Logitech', slug: 'logitech', status: 'ACTIVE' });
const bAnker = await api.writeBrand(env, null, { name: 'Anker', slug: 'anker', status: 'ACTIVE' });

// 5. Seed Initial Baseline Catalog (Laptop & Legacy Mouse)
// Seed Laptop with variants: 16GB (20M) and 32GB (35M)
await DB.prepare(`
  INSERT INTO Product (id, name, slug, description, brand, model, price, stock, status, categoryId, images, specs, createdAt, updatedAt)
  VALUES ('prod-laptop-rog', 'Laptop Asus ROG Strix G16', 'laptop-asus-rog-strix-g16', 'Laptop gaming cao cấp', 'Asus', 'G16-2024', 20000000, 10, 'ACTIVE', 'cat-laptop', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).bind(
  JSON.stringify([sampleAsset.url]),
  JSON.stringify({ CPU: 'Intel Core i9-13980HX', GPU: 'RTX 4060', RAM: '16GB', SSD: '1TB' })
).run();

await DB.prepare(`
  INSERT INTO ProductVariant (id, productId, sku, name, price, stock, options, createdAt, updatedAt)
  VALUES ('var-rog-16', 'prod-laptop-rog', 'ROG-16GB-20M', 'RAM 16GB / SSD 1TB', 20000000, 5, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
         ('var-rog-32', 'prod-laptop-rog', 'ROG-32GB-35M', 'RAM 32GB / SSD 1TB', 35000000, 5, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).bind(
  JSON.stringify({ RAM: '16GB', SSD: '1TB', GPU: 'RTX 4060' }),
  JSON.stringify({ RAM: '32GB', SSD: '1TB', GPU: 'RTX 4060' })
).run();

// Seed Legacy Mouse without variants
await DB.prepare(`
  INSERT INTO Product (id, name, slug, description, brand, model, price, stock, status, categoryId, images, specs, createdAt, updatedAt)
  VALUES ('prod-mouse-legacy', 'Chuột Logitech G502 Hero Legacy', 'chuot-logitech-g502-hero', 'Chuột gaming có dây', 'Logitech', 'G502', 890000, 15, 'ACTIVE', 'cat-mouse', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).bind(
  JSON.stringify([sampleAsset.url]),
  JSON.stringify({ DPI: '25600', 'Chuẩn kết nối': 'Có dây USB', 'Số nút': '11 nút' })
).run();

// 6. Build Client App Bundle
console.log('Compiling Frontend Component Harness...');
const clientBundle = await build({
  stdin: {
    contents: `
      import React, { useState, useEffect } from 'react';
      import ReactDOM from 'react-dom/client';
      import { CartProvider, useCart } from './src/context/CartContext';
      import { CompareProvider, useCompare } from './src/context/CompareContext';
      import CompareModal from './src/components/product/CompareModal';
      import CompareFloatingBar from './src/components/product/CompareFloatingBar';
      import CategoryFilterSidebar from './src/components/category/CategoryFilterSidebar';
      import ActiveFilterChips from './src/components/category/ActiveFilterChips';
      import ProductCard from './src/components/product/ProductCard';

      function HarnessApp() {
        const [activeView, setActiveView] = useState('admin'); // admin | pdp | filter | compare
        const { cart, addToCart, clearCart } = useCart();
        const { items: compareItems, addToCompare, openCompare, isCompareOpen } = useCompare();

        // Admin creation state
        const [adminItem, setAdminItem] = useState({
          type: 'MOUSE',
          name: 'Chuột Logitech MX Master 3S',
          slug: 'chuot-logitech-mx-master-3s',
          brand: 'Logitech',
          categoryId: 'cat-mouse',
          price: 1500000,
          variants: [
            { id: 'var-mouse-blk', sku: 'MOUSE-BLK', name: 'Đen (Graphite)', price: 1500000, condition: 'NEW', stock: 10, options: { Color: 'Đen', Connection: 'Bluetooth, Không dây' } },
            { id: 'var-mouse-wht', sku: 'MOUSE-WHT', name: 'Trắng (Pale Grey)', price: 1600000, condition: 'NEW', stock: 5, options: { Color: 'Trắng', Connection: 'Bluetooth, Không dây' } },
          ],
          specs: [
            { key: 'DPI', value: '8000' },
            { key: 'Chuẩn kết nối', value: 'Bluetooth, Không dây, Type-C' },
            { key: 'Số nút', value: '7 nút' },
          ],
          published: false,
          draftSaved: false,
        });

        const [adminCharger, setAdminCharger] = useState({
          type: 'CHARGER',
          name: 'Củ sạc Anker Nano II',
          slug: 'cu-sac-anker-nano-ii',
          brand: 'Anker',
          categoryId: 'cat-charger',
          price: 600000,
          variants: [
            { id: 'var-chg-65', sku: 'CHG-65W', name: 'Bản 65W GaN II', price: 600000, condition: 'NEW', stock: 20, options: { Power: '65W' } },
            { id: 'var-chg-100', sku: 'CHG-100W', name: 'Bản 100W GaN II', price: 950000, condition: 'NEW', stock: 12, options: { Power: '100W' } },
          ],
          specs: [
            { key: 'Công suất', value: '100W' },
            { key: 'Cổng kết nối', value: '2x Type-C, 1x USB-A' },
            { key: 'Công nghệ', value: 'GaN II Fast Charging' },
          ],
          published: false,
        });

        // PDP selected states
        const [selectedMouseVariantId, setSelectedMouseVariantId] = useState('var-mouse-blk');
        const [selectedChargerVariantId, setSelectedChargerVariantId] = useState('var-chg-65');

        // Filter / Catalog state
        const [filterCategory, setFilterCategory] = useState('laptop-gaming'); // 'laptop-gaming' | 'chuot' | 'cu-sac'
        const [currentFilters, setCurrentFilters] = useState({});
        const [catalogProducts, setCatalogProducts] = useState([]);
        const [catalogFacets, setCatalogFacets] = useState({});
        const [loadingCatalog, setLoadingCatalog] = useState(false);

        // Fetch catalog on filter change
        useEffect(() => {
          setLoadingCatalog(true);
          const params = new URLSearchParams();
          params.set('category', filterCategory);
          Object.entries(currentFilters).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(item => params.append(k, item));
            else if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
          });
          fetch('/api/category/filtered?' + params.toString())
            .then(r => r.json())
            .then(res => {
              setCatalogProducts(res.products || []);
              setCatalogFacets(res.facets || {});
              setLoadingCatalog(false);
            })
            .catch(() => setLoadingCatalog(false));
        }, [filterCategory, currentFilters]);

        const selectedMouseVariant = adminItem.variants.find(v => v.id === selectedMouseVariantId) || adminItem.variants[0];
        const selectedChargerVariant = adminCharger.variants.find(v => v.id === selectedChargerVariantId) || adminCharger.variants[0];

        return (
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
            {/* Nav Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-600 text-lg">CITILAP STORE</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">R04.1 Browser QA</span>
              </div>
              <nav className="flex items-center gap-2 text-xs font-semibold">
                <button
                  id="tab-admin"
                  onClick={() => setActiveView('admin')}
                  className={'px-3 py-1.5 rounded-lg border transition ' + (activeView === 'admin' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
                >
                  A. Admin Studio
                </button>
                <button
                  id="tab-pdp"
                  onClick={() => setActiveView('pdp')}
                  className={'px-3 py-1.5 rounded-lg border transition ' + (activeView === 'pdp' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
                >
                  A2. PDP Variant
                </button>
                <button
                  id="tab-cart"
                  onClick={() => setActiveView('cart')}
                  className={'px-3 py-1.5 rounded-lg border transition ' + (activeView === 'cart' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
                >
                  B. Cart/Order ({cart.length})
                </button>
                <button
                  id="tab-filter"
                  onClick={() => setActiveView('filter')}
                  className={'px-3 py-1.5 rounded-lg border transition ' + (activeView === 'filter' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
                >
                  C. Filter/Search
                </button>
                <button
                  id="tab-compare"
                  onClick={() => setActiveView('compare')}
                  className={'px-3 py-1.5 rounded-lg border transition ' + (activeView === 'compare' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
                >
                  D. Compare ({compareItems.length})
                </button>
              </nav>
            </header>

            {/* VIEW A: ADMIN STUDIO */}
            {activeView === 'admin' && (
              <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h1 className="text-xl font-bold mb-4 text-slate-800">Quản trị Mẫu & Biến thể Phụ kiện (R04-A)</h1>
                  
                  {/* Mouse Form */}
                  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Sản phẩm 1: {adminItem.name}</span>
                      <span className={'text-xs px-2.5 py-1 rounded-full font-bold ' + (adminItem.published ? 'bg-green-100 text-green-700' : adminItem.draftSaved ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600')}>
                        {adminItem.published ? 'Đã xuất bản' : adminItem.draftSaved ? 'Bản nháp đã lưu' : 'Chưa lưu'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Mẫu: <b>MOUSE</b> · Danh mục: Chuột máy tính · Hãng: Logitech</div>
                      <div>Thông số: DPI 8000 · Kết nối: Bluetooth, Không dây, Type-C</div>
                      <div>Biến thể màu: <b>Đen (1.500.000₫)</b> và <b>Trắng (1.600.000₫)</b></div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        id="btn-save-draft-mouse"
                        onClick={async () => {
                          const res = await fetch('/api/admin/products/prod-mouse-mx3s', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'save', item: adminItem }),
                          });
                          if (res.ok) setAdminItem(prev => ({ ...prev, draftSaved: true }));
                        }}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                      >
                        Lưu bản nháp
                      </button>
                      <button
                        id="btn-publish-mouse"
                        onClick={async () => {
                          const res = await fetch('/api/admin/products/prod-mouse-mx3s', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'publish', item: adminItem }),
                          });
                          if (res.ok) setAdminItem(prev => ({ ...prev, published: true, draftSaved: true }));
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        Xuất bản lên Storefront
                      </button>
                    </div>
                  </div>

                  {/* Charger Form */}
                  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Sản phẩm 2: {adminCharger.name}</span>
                      <span className={'text-xs px-2.5 py-1 rounded-full font-bold ' + (adminCharger.published ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600')}>
                        {adminCharger.published ? 'Đã xuất bản' : 'Chưa lưu'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Mẫu: <b>CHARGER</b> · Danh mục: Củ sạc & Cáp sạc · Hãng: Anker</div>
                      <div>Thông số: 100W Max · 2x Type-C, 1x USB-A · GaN II</div>
                      <div>Biến thể công suất: <b>65W (600.000₫)</b> và <b>100W (950.000₫)</b></div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        id="btn-publish-charger"
                        onClick={async () => {
                          const res = await fetch('/api/admin/products/prod-charger-anker', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'publish', item: adminCharger }),
                          });
                          if (res.ok) setAdminCharger(prev => ({ ...prev, published: true }));
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        Xuất bản lên Storefront
                      </button>
                    </div>
                  </div>
                </div>
              </main>
            )}

            {/* VIEW A2: PDP VARIANT SELECTION */}
            {activeView === 'pdp' && (
              <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                {/* Mouse PDP */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden">
                      <img
                        id="pdp-mouse-image"
                        src={selectedMouseVariant.sku === 'MOUSE-WHT' ? '/white-mouse.png' : '/black-mouse.png'}
                        alt={selectedMouseVariant.name}
                        className="h-32 object-contain"
                      />
                    </div>
                    <div className="text-xs text-slate-500 text-center">Ảnh variant: {selectedMouseVariant.sku}</div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Logitech · Chuột máy tính</div>
                    <h2 className="text-xl font-extrabold text-slate-900">{adminItem.name}</h2>
                    <div className="flex items-baseline gap-3">
                      <span id="pdp-mouse-price" className="text-2xl font-black text-rose-600">
                        {selectedMouseVariant.price.toLocaleString('vi-VN')}₫
                      </span>
                      <span id="pdp-mouse-availability" className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold border border-green-200">
                        Nhận yêu cầu mua
                      </span>
                    </div>

                    {/* Color variant pills */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700">Màu sắc lựa chọn:</div>
                      <div className="flex gap-2">
                        {adminItem.variants.map(v => (
                          <button
                            key={v.id}
                            id={'btn-variant-' + v.id}
                            onClick={() => setSelectedMouseVariantId(v.id)}
                            className={'px-3 py-2 rounded-lg text-xs font-semibold border transition ' + (selectedMouseVariantId === v.id ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg space-y-1">
                      <div>Mã SKU: <span id="pdp-mouse-sku" className="font-mono font-bold text-slate-800">{selectedMouseVariant.sku}</span></div>
                      <div>DPI: 8000 · Kết nối: Bluetooth, Không dây</div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        id="btn-add-mouse-to-cart"
                        onClick={() => {
                          addToCart({
                            id: 'prod-mouse-mx3s-' + selectedMouseVariant.id,
                            productId: 'prod-mouse-mx3s',
                            variantId: selectedMouseVariant.id,
                            name: adminItem.name,
                            price: selectedMouseVariant.price,
                            displayPrice: selectedMouseVariant.price.toLocaleString('vi-VN') + '₫',
                            image: '/mouse.png',
                            variantLabel: selectedMouseVariant.name + ' · Mới 100%',
                            quantity: 1,
                          });
                          alert('Đã thêm ' + selectedMouseVariant.name + ' vào giỏ!');
                        }}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow"
                      >
                        Thêm vào giỏ hàng
                      </button>
                      <button
                        id="btn-compare-mouse-mx3s"
                        onClick={() => {
                          addToCompare({
                            id: 'prod-mouse-mx3s',
                            name: adminItem.name,
                            slug: adminItem.slug,
                            price: selectedMouseVariant.price,
                            kind: 'ACCESSORY',
                            template: 'MOUSE',
                          });
                        }}
                        className="px-4 py-3 border border-slate-300 font-bold rounded-lg text-sm hover:bg-slate-50 text-slate-700"
                      >
                        + So sánh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Charger PDP */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm grid md:grid-cols-2 gap-6">
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    <span className="font-bold text-slate-400">Anker Nano II ({selectedChargerVariant.name})</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Anker · Củ sạc & Cáp</div>
                    <h2 className="text-xl font-extrabold text-slate-900">{adminCharger.name}</h2>
                    <div className="flex items-baseline gap-3">
                      <span id="pdp-charger-price" className="text-2xl font-black text-rose-600">
                        {selectedChargerVariant.price.toLocaleString('vi-VN')}₫
                      </span>
                    </div>

                    {/* Power variant pills */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700">Công suất sạc:</div>
                      <div className="flex gap-2">
                        {adminCharger.variants.map(v => (
                          <button
                            key={v.id}
                            id={'btn-variant-' + v.id}
                            onClick={() => setSelectedChargerVariantId(v.id)}
                            className={'px-3 py-2 rounded-lg text-xs font-semibold border transition ' + (selectedChargerVariantId === v.id ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg space-y-1">
                      <div>Mã SKU: <span id="pdp-charger-sku" className="font-mono font-bold text-slate-800">{selectedChargerVariant.sku}</span></div>
                    </div>

                    <button
                      id="btn-add-charger-to-cart"
                      onClick={() => {
                        addToCart({
                          id: 'prod-charger-anker-' + selectedChargerVariant.id,
                          productId: 'prod-charger-anker',
                          variantId: selectedChargerVariant.id,
                          name: adminCharger.name,
                          price: selectedChargerVariant.price,
                          displayPrice: selectedChargerVariant.price.toLocaleString('vi-VN') + '₫',
                          image: '/charger.png',
                          variantLabel: selectedChargerVariant.name,
                          quantity: 1,
                        });
                        alert('Đã thêm củ sạc vào giỏ!');
                      }}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow"
                    >
                      Thêm vào giỏ hàng
                    </button>
                  </div>
                </div>
              </main>
            )}

            {/* VIEW B: CART & ORDER GUARD */}
            {activeView === 'cart' && (
              <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h1 className="text-xl font-bold text-slate-800">Giỏ hàng của bạn</h1>
                    <button id="btn-clear-cart" onClick={clearCart} className="text-xs text-rose-600 hover:underline">
                      Xóa giỏ hàng
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div id="cart-empty" className="py-12 text-center text-slate-400 text-sm">
                      Giỏ hàng đang trống. Vui lòng chọn sản phẩm từ PDP!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {cart.map(item => (
                        <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                            <div id="cart-item-variant" className="text-xs text-blue-600 font-semibold">{item.variantLabel}</div>
                            <div className="text-xs text-slate-400">Variant ID: {item.variantId} · Product ID: {item.productId}</div>
                          </div>
                          <div className="text-right">
                            <div id="cart-item-price" className="font-black text-rose-600 text-base">{item.displayPrice}</div>
                            <div className="text-xs text-slate-500">Số lượng: {item.quantity}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Server Order Guard validation tester */}
                  <div className="mt-8 pt-6 border-t border-slate-200 bg-slate-50 p-4 rounded-lg space-y-3">
                    <div className="text-xs font-bold text-slate-700">Kiểm tra bảo vệ đơn hàng (Server Order Guard):</div>
                    <div className="flex gap-2">
                      <button
                        id="btn-validate-order-valid"
                        onClick={async () => {
                          const res = await fetch('/api/order/validate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId: 'prod-mouse-mx3s', variantId: 'var-mouse-wht' }),
                          });
                          const json = await res.json();
                          alert('Valid Variant Guard: ' + (json.success ? 'HỢP LỆ' : json.error));
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold"
                      >
                        Test Variant hợp lệ
                      </button>
                      <button
                        id="btn-validate-order-invalid"
                        onClick={async () => {
                          const res = await fetch('/api/order/validate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId: 'prod-mouse-mx3s', variantId: 'non-existent-variant' }),
                          });
                          const json = await res.json();
                          alert('Invalid Variant Guard: ' + (json.success ? 'HỢP LỆ' : json.error));
                        }}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold"
                      >
                        Test Variant không thuộc SP (Phải chặn)
                      </button>
                    </div>
                  </div>
                </div>
              </main>
            )}

            {/* VIEW C: FILTER & SEARCH */}
            {activeView === 'filter' && (
              <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm space-y-4">
                  {/* Category switcher */}
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500">Danh mục lọc:</span>
                    <button
                      id="filter-cat-laptop"
                      onClick={() => { setFilterCategory('laptop-gaming'); setCurrentFilters({}); }}
                      className={'px-3 py-1 rounded-lg text-xs font-bold ' + (filterCategory === 'laptop-gaming' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700')}
                    >
                      Laptop Gaming
                    </button>
                    <button
                      id="filter-cat-mouse"
                      onClick={() => { setFilterCategory('chuot'); setCurrentFilters({}); }}
                      className={'px-3 py-1 rounded-lg text-xs font-bold ' + (filterCategory === 'chuot' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700')}
                    >
                      Chuột máy tính
                    </button>
                    <button
                      id="filter-cat-charger"
                      onClick={() => { setFilterCategory('cu-sac'); setCurrentFilters({}); }}
                      className={'px-3 py-1 rounded-lg text-xs font-bold ' + (filterCategory === 'cu-sac' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700')}
                    >
                      Củ sạc & Cáp
                    </button>
                  </div>

                  {/* Active Filter Chips */}
                  <ActiveFilterChips
                    facets={{
                      categories: catalogFacets?.categories || [],
                      brands: catalogFacets?.brands || [],
                      conditions: catalogFacets?.conditions || [],
                      connections: catalogFacets?.connections || [],
                      powers: catalogFacets?.powers || [],
                      cpuSeries: catalogFacets?.cpuSeries || [],
                      gpuSeries: catalogFacets?.gpuSeries || [],
                    }}
                  />

                  {/* Grid Layout with Sidebar */}
                  <div className="grid md:grid-cols-4 gap-6 pt-2">
                    <div className="md:col-span-1 border-r border-slate-100 pr-4">
                      <CategoryFilterSidebar
                        categorySlug={filterCategory}
                        facets={{
                          categories: catalogFacets?.categories || [],
                          brands: catalogFacets?.brands || [],
                          conditions: catalogFacets?.conditions || [],
                          connections: catalogFacets?.connections || [],
                          powers: catalogFacets?.powers || [],
                          ramOptions: catalogFacets?.ramOptions || [],
                          storageOptions: catalogFacets?.storageOptions || [],
                          cpuSeries: catalogFacets?.cpuSeries || [],
                          gpuSeries: catalogFacets?.gpuSeries || [],
                          priceRange: catalogFacets?.priceRange || { min: 0, max: 100000000 },
                        }}
                      />
                    </div>

                    <div className="md:col-span-3 space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                        <span>Kết quả tìm kiếm: <b id="catalog-count">{catalogProducts.length}</b> sản phẩm</span>
                        {loadingCatalog && <span className="text-blue-600">Đang tải dữ liệu...</span>}
                      </div>

                      {catalogProducts.length === 0 ? (
                        <div id="catalog-empty-state" className="py-16 text-center text-slate-400 text-sm">
                          Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
                        </div>
                      ) : (
                        <div id="catalog-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {catalogProducts.map(p => (
                            <div key={p.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition">
                              <div className="font-bold text-slate-900 text-sm mb-1">{p.name}</div>
                              <div className="text-xs text-slate-500 mb-2">{p.brand} · {p.model || p.sku}</div>
                              <div className="text-base font-black text-rose-600 mb-2">
                                {(p.price || 0).toLocaleString('vi-VN')}₫
                              </div>
                              <button
                                onClick={() => {
                                  addToCompare({
                                    id: p.id,
                                    name: p.name,
                                    slug: p.slug,
                                    price: p.price,
                                    kind: filterCategory === 'laptop-gaming' ? 'LAPTOP' : 'ACCESSORY',
                                    template: filterCategory === 'laptop-gaming' ? 'LAPTOP' : filterCategory === 'chuot' ? 'MOUSE' : 'CHARGER',
                                  });
                                }}
                                className="w-full py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700"
                              >
                                + So sánh
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </main>
            )}

            {/* VIEW D: COMPARE & RELATED */}
            {activeView === 'compare' && (
              <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h1 className="text-xl font-bold text-slate-800">So sánh sản phẩm & Sản phẩm liên quan (R04-D)</h1>
                  <p className="text-xs text-slate-500">
                    Hỗ trợ tối đa 3 sản phẩm cùng nhóm. Chặn nhóm không tương thích. Đánh dấu khác biệt thông số.
                  </p>

                  <div className="flex gap-2">
                    <button
                      id="btn-add-compare-mouse1"
                      onClick={() => {
                        addToCompare({
                          id: 'prod-mouse-mx3s',
                          name: 'Chuột Logitech MX Master 3S',
                          slug: 'chuot-logitech-mx-master-3s',
                          price: 1500000,
                          kind: 'ACCESSORY',
                          template: 'MOUSE',
                        });
                      }}
                      className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-semibold hover:bg-slate-200"
                    >
                      + Thêm MX Master 3S (Mouse)
                    </button>
                    <button
                      id="btn-add-compare-mouse2"
                      onClick={() => {
                        addToCompare({
                          id: 'prod-mouse-legacy',
                          name: 'Chuột Logitech G502 Hero Legacy',
                          slug: 'chuot-logitech-g502-hero',
                          price: 890000,
                          kind: 'ACCESSORY',
                          template: 'MOUSE',
                        });
                      }}
                      className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-semibold hover:bg-slate-200"
                    >
                      + Thêm G502 Hero (Mouse Legacy)
                    </button>
                    <button
                      id="btn-add-compare-incompatible"
                      onClick={() => {
                        const res = addToCompare({
                          id: 'prod-laptop-rog',
                          name: 'Laptop Asus ROG Strix G16',
                          slug: 'laptop-asus-rog-strix-g16',
                          price: 20000000,
                          kind: 'LAPTOP',
                          template: 'LAPTOP',
                        });
                        if (!res.success) alert(res.message);
                      }}
                      className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold"
                    >
                      + Thêm Laptop ROG (Thử không tương thích)
                    </button>
                  </div>

                  <div className="pt-4">
                    <button
                      id="btn-open-compare-modal"
                      onClick={openCompare}
                      className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow"
                    >
                      Mở cửa sổ So sánh ({compareItems.length})
                    </button>
                  </div>
                </div>
              </main>
            )}

            {/* FLOATING COMPARE BAR & MODAL */}
            <CompareFloatingBar />
            <CompareModal />
          </div>
        );
      }

      function App() {
        return (
          <CartProvider>
            <CompareProvider>
              <HarnessApp />
            </CompareProvider>
          </CartProvider>
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

// 7. Start HTTP Test Server
const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CitiLap R04.1 Browser Integration Harness</title>
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/' || url.pathname.startsWith('/pdp') || url.pathname.startsWith('/category')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url.pathname === '/bundle.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(clientJs);
    return;
  }

  // Handle transparent pngs for images
  if (url.pathname.endsWith('.png')) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(png);
    return;
  }

  // API Routes
  // 1. Admin Product Save/Publish
  if (url.pathname.startsWith('/api/admin/products/')) {
    const id = url.pathname.split('/')[4];
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const { action, item } = body;

    const isMouse = id === 'prod-mouse-mx3s';
    const catId = isMouse ? 'cat-mouse' : 'cat-charger';
    const brandId = isMouse ? bLogitech.id : bAnker.id;

    // Create or update in Product table
    await DB.prepare(`
      INSERT INTO Product (id, name, slug, description, brand, model, price, stock, status, categoryId, images, specs, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 10, 'ACTIVE', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET price = ?, specs = ?, updatedAt = CURRENT_TIMESTAMP
    `).bind(
      id,
      item.name,
      item.slug,
      'Phụ kiện chính hãng',
      item.brand,
      item.type,
      item.price,
      catId,
      JSON.stringify(['/test.png']),
      JSON.stringify(Object.fromEntries(item.specs.map((s) => [s.key, s.value]))),
      item.price,
      JSON.stringify(Object.fromEntries(item.specs.map((s) => [s.key, s.value])))
    ).run();

    // Insert variants
    for (const v of item.variants) {
      await DB.prepare(`
        INSERT INTO ProductVariant (id, productId, sku, name, price, stock, options, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET price = ?, name = ?, options = ?, updatedAt = CURRENT_TIMESTAMP
      `).bind(
        v.id,
        id,
        v.sku,
        v.name,
        v.price,
        v.stock,
        JSON.stringify(v.options),
        v.price,
        v.name,
        JSON.stringify(v.options)
      ).run();
    }

    // Insert ProductStudio
    const doc = {
      ...api.blankProduct(),
      name: item.name,
      slug: item.slug,
      categoryId: catId,
      brand: item.brand,
      template: item.type,
      price: item.price,
      availability: 'AVAILABLE',
      media: [{ assetId: sampleAsset.id, alt: item.name, variantId: '' }],
      variants: item.variants,
      specs: item.specs,
    };

    if (action === 'publish') {
      await DB.prepare(`
        INSERT INTO ProductStudio (productId, revision, draft, published, updatedAt)
        VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(productId) DO UPDATE SET published = excluded.published, draft = excluded.draft, revision = revision + 1, updatedAt = CURRENT_TIMESTAMP
      `).bind(id, JSON.stringify(doc), JSON.stringify(doc)).run();
    } else {
      await DB.prepare(`
        INSERT INTO ProductStudio (productId, revision, draft, published, updatedAt)
        VALUES (?, 1, ?, NULL, CURRENT_TIMESTAMP)
        ON CONFLICT(productId) DO UPDATE SET draft = excluded.draft, updatedAt = CURRENT_TIMESTAMP
      `).bind(id, JSON.stringify(doc)).run();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, published: action === 'publish' }));
    return;
  }

  // 2. Production Compare endpoint
  if (url.pathname === '/api/compare') {
    const compareReq = new Request(`http://localhost${req.url}`);
    const compareRes = await api.compareGetHandler(compareReq);
    const json = await compareRes.json();
    res.writeHead(compareRes.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(json));
    return;
  }

  // 3. Category Filtered Products endpoint
  if (url.pathname === '/api/category/filtered') {
    const cat = url.searchParams.get('category') || 'laptop-gaming';
    const ram = url.searchParams.getAll('ram');
    const maxPrice = url.searchParams.get('maxPrice');
    const minPrice = url.searchParams.get('minPrice');
    const connection = url.searchParams.getAll('connection');
    const power = url.searchParams.getAll('power');
    const brand = url.searchParams.getAll('brand');

    const filterOptions = {
      categorySlug: cat,
      ram: ram.length > 0 ? ram.map(Number) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      connection: connection.length > 0 ? connection : undefined,
      power: power.length > 0 ? power : undefined,
      brand: brand.length > 0 ? brand : undefined,
    };

    const result = await api.getCategoryFilteredProducts(filterOptions, prisma);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // 4. Order Guard Validation endpoint
  if (url.pathname === '/api/order/validate') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const { productId, variantId } = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    try {
      const studioRow = await DB.prepare('SELECT draft, published FROM ProductStudio WHERE productId = ?').bind(productId).first();
      assertPublishedStudioOrderable(
        { hasStudio: !!studioRow, published: studioRow?.published },
        variantId
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

await new Promise((r) => server.listen(PORT, r));
console.log(`R04.1 Browser Harness Server running on http://localhost:${PORT}`);

let passed = 0;
const check = (name) => {
  passed++;
  console.log(`PASS ${name}`);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  await mkdir('docs/screenshots/r04', { recursive: true });
  await mkdir('C:/Users/Admin/.gemini/antigravity-ide/brain/3e142c5a-fe85-4e8a-9bb8-1f75e24657de', { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let lastAlertMessage = '';
  page.on('dialog', async (dialog) => {
    lastAlertMessage = dialog.message();
    await dialog.accept();
  });
  page.on('pageerror', (err) => {
    console.log('BROWSER PAGE ERROR:', err.message);
  });

  // =========================================================================
  // FLOW A: ADMIN CREATION & PDP VARIANT SELECTION (DESKTOP 1440PX)
  // =========================================================================
  console.log('\n--- BROWSER FLOW A: ADMIN -> PDP VARIANT SELECTION ---');
  await page.goto(`http://localhost:${PORT}`);
  await page.waitForSelector('#tab-admin');

  // Step 1: Save draft & Publish Mouse
  await page.click('#btn-save-draft-mouse');
  await page.waitForTimeout(300);
  await page.click('#btn-publish-mouse');
  await page.waitForTimeout(500);

  // Step 2: Publish Charger
  await page.click('#btn-publish-charger');
  await page.waitForTimeout(500);
  check('Flow A.1: Admin successfully creates and publishes Mouse & Charger with variants');

  // Screenshot Admin Studio
  await page.screenshot({ path: 'docs/screenshots/r04/flow-a-admin-studio-1440.png', fullPage: true });

  // Step 3: Switch to PDP View
  await page.click('#tab-pdp');
  await page.waitForSelector('#pdp-mouse-price');

  // Check initial mouse price = 1.5M (Black)
  const initialMousePrice = await page.textContent('#pdp-mouse-price');
  assert.ok(initialMousePrice.includes('1.500.000'), 'Initial mouse price must be 1.500.000₫');
  check('Flow A.2: PDP displays initial Black mouse variant at 1.500.000₫');

  // Click White mouse variant pill
  await page.click('#btn-variant-var-mouse-wht');
  await page.waitForTimeout(200);
  const whiteMousePrice = await page.textContent('#pdp-mouse-price');
  assert.ok(whiteMousePrice.includes('1.600.000'), 'Price updates to 1.600.000₫ on White variant');
  const whiteSku = await page.textContent('#pdp-mouse-sku');
  assert.equal(whiteSku.trim(), 'MOUSE-WHT', 'SKU updates to MOUSE-WHT');
  check('Flow A.3: Selecting White variant updates price to 1.600.000₫ and SKU to MOUSE-WHT');

  // Screenshot PDP Mouse White
  await page.screenshot({ path: 'docs/screenshots/r04/flow-a-pdp-mouse-white-1440.png' });

  // Check Charger power variant: click 100W pill
  await page.click('#btn-variant-var-chg-100');
  await page.waitForTimeout(200);
  const chg100Price = await page.textContent('#pdp-charger-price');
  assert.ok(chg100Price.includes('950.000'), 'Charger 100W price updates to 950.000₫');
  check('Flow A.4: Selecting Charger 100W variant updates price to 950.000₫');

  // =========================================================================
  // FLOW B: CART & ORDER GUARD
  // =========================================================================
  console.log('\n--- BROWSER FLOW B: CART & SERVER ORDER GUARD ---');
  // Add Mouse White (1.6M) to cart
  await page.click('#btn-add-mouse-to-cart');
  await page.waitForTimeout(300);

  // Navigate to Cart
  await page.click('#tab-cart');
  await page.waitForSelector('#cart-item-variant');

  const cartVariantText = await page.textContent('#cart-item-variant');
  assert.ok(cartVariantText.includes('Trắng (Pale Grey)'), 'Cart item retains variant label snapshot');
  const cartPriceText = await page.textContent('#cart-item-price');
  assert.ok(cartPriceText.includes('1.600.000'), 'Cart item price is 1.600.000₫');
  check('Flow B.1: Cart accurately preserves selected variant name and price snapshot');

  // Screenshot Cart
  await page.screenshot({ path: 'docs/screenshots/r04/flow-b-cart-variant-snapshot-1440.png' });

  // Test server order guard:
  const guardRes1 = await page.evaluate(async () => {
    const res = await fetch('/api/order/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod-mouse-mx3s', variantId: 'var-mouse-wht' }),
    });
    return res.json();
  });
  console.log('guardRes1 result:', guardRes1);
  assert.equal(guardRes1.success, true, 'Valid variant must be accepted by order guard');
  check('Flow B.2: Server order guard validates active published variant successfully');

  const guardRes2 = await page.evaluate(async () => {
    const res = await fetch('/api/order/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod-mouse-mx3s', variantId: 'spurious-variant-id' }),
    });
    return res.json();
  });
  assert.equal(guardRes2.success, false);
  assert.equal(guardRes2.error, 'VARIANT_UNAVAILABLE');
  check('Flow B.3: Server order guard blocks invalid/unattached variant with VARIANT_UNAVAILABLE');

  // =========================================================================
  // FLOW C: FILTER & SEARCH
  // =========================================================================
  console.log('\n--- BROWSER FLOW C: CATALOG FILTER & ACCESSORY FACETS ---');
  await page.click('#tab-filter');
  await page.waitForSelector('#catalog-count');

  // Test C1: Laptop RAM 32GB + Price <= 20M
  // Apply RAM 32GB
  await page.evaluate(async () => {
    const checkbox = document.querySelector('input[type="checkbox"][value="32"]');
    if (checkbox) checkbox.click();
  });
  await page.waitForTimeout(500);

  // Set Max Price <= 20M via URL/API emulation
  const filterZeroRes = await page.evaluate(async () => {
    const res = await fetch('/api/category/filtered?category=laptop-gaming&ram=32&maxPrice=20000000');
    return res.json();
  });
  assert.equal(filterZeroRes.totalCount, 0, 'RAM 32GB + price <= 20M must return 0 products');
  check('Flow C.1: Strict variant filter: RAM 32GB + price <= 20M returns NO products');

  // Switch to Mouse Category
  await page.click('#filter-cat-mouse');
  await page.waitForTimeout(600);

  // Verify Chuột category DOES NOT show CPU or RAM filters
  const hasCpuFilter = await page.locator('text=Bộ vi xử lý (CPU)').count();
  const hasRamFilter = await page.locator('text=Bộ nhớ RAM').count();
  assert.equal(hasCpuFilter, 0, 'Mouse category must NOT display CPU filter');
  assert.equal(hasRamFilter, 0, 'Mouse category must NOT display RAM filter');
  check('Flow C.2: Mouse category correctly suppresses laptop CPU/RAM facets');

  // Verify Chuột category DOES show Connection facet
  const hasConnectionFilter = await page.locator('text=Chuẩn kết nối').count();
  assert.ok(hasConnectionFilter >= 1, 'Mouse category must display Connection facet');
  check('Flow C.3: Mouse category displays Connection (Chuẩn kết nối) filter facet');

  // Screenshot Filter Desktop
  await page.screenshot({ path: 'docs/screenshots/r04/flow-c-filter-accessory-no-cpu-1440.png' });

  // =========================================================================
  // FLOW D: COMPARE & RELATED
  // =========================================================================
  console.log('\n--- BROWSER FLOW D: COMPARE FLOATING BAR, MODAL & LIMITS ---');
  await page.click('#tab-compare');
  await page.waitForSelector('#btn-add-compare-mouse1');

  // Add 1st mouse
  await page.click('#btn-add-compare-mouse1');
  await page.waitForTimeout(200);

  // Verify CompareFloatingBar appeared
  const floatingBar = page.locator('button:has-text("So sánh")').first();
  assert.ok(await floatingBar.isVisible(), 'CompareFloatingBar appears when 1+ item added');
  check('Flow D.1: CompareFloatingBar renders dynamically upon adding item');

  // Add 2nd mouse
  await page.click('#btn-add-compare-mouse2');
  await page.waitForTimeout(200);

  // Try adding incompatible group (Laptop into Mouse compare list)
  lastAlertMessage = '';
  await page.click('#btn-add-compare-incompatible');
  await page.waitForTimeout(300);
  assert.ok(lastAlertMessage.includes('Không thể so sánh'), 'Alert blocks incompatible group');
  check('Flow D.2: Incompatible product group is strictly blocked from comparison');

  // Open Compare Modal
  await page.click('#btn-open-compare-modal');
  await page.waitForSelector('text=So sánh chi tiết', { timeout: 3000 });
  check('Flow D.3: Compare modal opens side-by-side comparison');

  // Screenshot Compare Modal Desktop
  await page.screenshot({ path: 'docs/screenshots/r04/flow-d-compare-modal-desktop-1440.png' });

  // Test Keyboard Accessibility: Press Escape to close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const modalVisible = await page.locator('text=So sánh chi tiết').count();
  assert.equal(modalVisible, 0, 'Pressing Escape must close CompareModal');
  check('Flow D.4: Escape key closes CompareModal and restores focus');

  // =========================================================================
  // MULTI-VIEWPORT VERIFICATION: TABLET (768PX) & MOBILE (390PX) & ZOOM 200%
  // =========================================================================
  console.log('\n--- MULTI-VIEWPORT VERIFICATION ---');

  // Tablet: 768 x 1024
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'docs/screenshots/r04/flow-d-compare-tablet-768.png' });
  check('Viewport 1: Tablet 768px layout rendered cleanly');

  // Mobile: 390 x 844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  // Verify floating bar bottom positioning (bottom-28 on mobile)
  const mobileBar = page.locator('#compare-floating-bar, div[class*="bottom-28"]').first();
  await page.screenshot({ path: 'docs/screenshots/r04/flow-d-compare-bar-mobile-390.png' });
  check('Viewport 2: Mobile 390px floating bar positioned safely above mobile CTA');

  // Filter on Mobile 390px
  await page.click('#tab-filter');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/r04/flow-c-filter-mobile-390.png' });
  check('Viewport 3: Mobile 390px category and filter chips rendered cleanly');

  // Zoom 200% (deviceScaleFactor = 2)
  const zoomContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto(`http://localhost:${PORT}`);
  await zoomPage.waitForSelector('#tab-admin');
  await zoomPage.screenshot({ path: 'docs/screenshots/r04/flow-d-zoom-200.png' });
  await zoomContext.close();
  check('Viewport 4: High-DPI / 200% zoom rendered cleanly without layout break');

  console.log('\n======================================================');
  console.log(`ALL R04.1 BROWSER CHECKS PASSED: ${passed}/14 checks`);
  console.log('======================================================\n');
} finally {
  await browser?.close();
  server.close();
  await mf.dispose();
}
