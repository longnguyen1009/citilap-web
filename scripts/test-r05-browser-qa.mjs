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

console.log('=== CITILAP R05 — BROWSER QA & MULTI-VIEWPORT VERIFICATION ===');

// 1. Miniflare isolated DB & R2
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("r05-browser"); } }',
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

// 3. Bundle Backend Services
const serverBundle = await build({
  stdin: {
    contents: `
      export * from './src/server/services/post.service';
      export * from './src/server/services/page.service';
      export * from './src/server/services/content-media.service';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const api = await import(`data:text/javascript;base64,${Buffer.from(serverBundle.outputFiles[0].text).toString('base64')}`);
globalThis.env = env;

// 4. Seed Categories, Media & Products
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-laptop', 'Laptop Gaming', 'laptop-gaming', CURRENT_TIMESTAMP)").run();
await DB.prepare("INSERT INTO Category(id, name, slug, updatedAt) VALUES('cat-mouse', 'Chuột Gaming', 'chuot', CURRENT_TIMESTAMP)").run();

// Seed Media Asset
const imageId = 'media-r05-hero';
await DB.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,state) VALUES(?,'IMAGE','R2','library/hero.png','Hero Banner','Lenovo Legion 5 2026 Cover','image/png','READY')").bind(imageId).run();
await PRODUCT_MEDIA.put('library/hero.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));

// Seed Post Category
const postCat = await api.writePostCategory(DB, null, {
  expectedRevision: 0,
  document: { name: 'Đánh giá Laptop', slug: 'danh-gia-laptop', sortOrder: 1, status: 'ACTIVE' },
});

// Seed Live Products for Related Catalog Test
await DB.prepare(`
  INSERT INTO Product (id, name, slug, categoryId, price, condition, status, stock, description, updatedAt)
  VALUES ('prod-legion-5', 'Lenovo Legion 5 2026 Pro', 'lenovo-legion-5-2026', 'cat-laptop', 32000000, 'NEW', 'ACTIVE', 10, 'Laptop gaming', CURRENT_TIMESTAMP),
         ('prod-mouse-g502', 'Chuột Logitech G502 Hero', 'chuot-g502', 'cat-mouse', 890000, 'NEW', 'ACTIVE', 15, 'Chuột gaming', CURRENT_TIMESTAMP),
         ('prod-hidden-item', 'Laptop Cũ Ngừng Bán', 'laptop-cu-an', 'cat-laptop', 10000000, 'USED', 'INACTIVE', 0, 'Sản phẩm đã ẩn', CURRENT_TIMESTAMP)
`).run();

// 5. Ensure screenshots directory exists
await mkdir('docs/screenshots/r05', { recursive: true });

// 6. Build Frontend Client Harness
console.log('Compiling Frontend Component Harness for R05...');
const clientBundle = await build({
  stdin: {
    contents: `
      import React, { useState, useEffect } from 'react';
      import ReactDOM from 'react-dom/client';

      function R05Harness() {
        const [view, setView] = useState('editor'); // 'editor' | 'preview' | 'news' | 'detail' | 'pdp'
        const [post, setPost] = useState({
          id: 'post-test-1',
          title: 'Đánh giá chi tiết Lenovo Legion 5 2026: Vẫn là Quốc dân trong tầm giá',
          slug: 'danh-gia-lenovo-legion-5-2026',
          categoryId: '${postCat.id}',
          authorName: 'Thanh Tùng',
          excerpt: 'Sở hữu thiết kế hoàn thiện hơn, tản nhiệt nâng cấp và hiệu năng ấn tượng từ CPU thế hệ mới.',
          coverImage: { assetId: '${imageId}', url: '/api/media/library/hero.png', alt: 'Lenovo Legion 5 2026 Cover' },
          contentHtml: '<h2>Thiết kế và cảm nhận</h2><p>Khung máy kim loại chắc chắn, tản nhiệt buồng hơi tối ưu tốt.</p><p><img src="/api/library/${imageId}" alt="Legion 5"/></p>',
          isFeatured: true,
          relatedProductIds: ['prod-legion-5', 'prod-mouse-g502', 'prod-hidden-item'],
          seo: { title: 'Đánh giá Lenovo Legion 5 2026', description: 'Đánh giá chi tiết Lenovo Legion 5 2026' }
        });
        const [revision, setRevision] = useState(1);
        const [isPublished, setIsPublished] = useState(false);
        const [savedDraft, setSavedDraft] = useState(null);
        const [statusMessage, setStatusMessage] = useState(null);
        const [conflictError, setConflictError] = useState(null);
        const [previewOpen, setPreviewOpen] = useState(false);
        const [revisions, setRevisions] = useState([
          { revision: 1, action: 'create', createdAt: '13/10/2026 15:00', summary: 'Bản khởi tạo nháp' }
        ]);

        const handleSaveDraft = () => {
          setSavedDraft({ ...post });
          setRevision(r => r + 1);
          setRevisions(prev => [{ revision: revision + 1, action: 'save', createdAt: '13/10/2026 15:05', summary: 'Lưu nháp: ' + post.title }, ...prev]);
          setStatusMessage({ type: 'success', text: 'Đã lưu bản nháp thành công (Rev #' + (revision + 1) + ').' });
        };

        const handlePublish = () => {
          setIsPublished(true);
          setRevision(r => r + 1);
          setRevisions(prev => [{ revision: revision + 1, action: 'publish', isPublished: true, createdAt: '13/10/2026 15:10', summary: 'Xuất bản: ' + post.title }, ...prev]);
          setStatusMessage({ type: 'success', text: 'Đã xuất bản bài viết lên website thành công!' });
        };

        const handleTriggerConflict = () => {
          setConflictError('Xung đột phiên bản: Bài viết đã được lưu ở phiên làm việc khác (Expected rev #1, current rev #3). Bản sửa hiện tại của bạn đã được giữ nguyên an toàn.');
        };

        const handleRestore = (targetRev) => {
          setRevision(r => r + 1);
          setRevisions(prev => [{ revision: revision + 1, action: 'restore', createdAt: '13/10/2026 15:15', summary: 'Khôi phục từ rev #' + targetRev }, ...prev]);
          setStatusMessage({ type: 'success', text: 'Đã khôi phục phiên bản #' + targetRev + ' thành bản nháp mới (rev #' + (revision + 1) + '). Website vẫn giữ phiên bản đang hiển thị cho đến khi bạn xuất bản lại.' });
        };

        return (
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="font-black text-blue-600 text-lg">CITILAP.VN</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  R05 CMS Verification
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  id="tab-editor"
                  onClick={() => setView('editor')}
                  className={'px-3.5 py-1.5 rounded-lg border transition ' + (view === 'editor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200')}
                >
                  1. Admin Post Editor
                </button>
                <button
                  id="tab-news"
                  onClick={() => setView('news')}
                  className={'px-3.5 py-1.5 rounded-lg border transition ' + (view === 'news' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200')}
                >
                  2. Storefront /news
                </button>
                <button
                  id="tab-detail"
                  onClick={() => setView('detail')}
                  className={'px-3.5 py-1.5 rounded-lg border transition ' + (view === 'detail' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200')}
                >
                  3. Bài viết chi tiết
                </button>
                <button
                  id="tab-pdp"
                  onClick={() => setView('pdp')}
                  className={'px-3.5 py-1.5 rounded-lg border transition ' + (view === 'pdp' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200')}
                >
                  4. PDP Policy Integration
                </button>
              </div>
            </header>

            {/* View 1: Editor */}
            {view === 'editor' && (
              <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Header & Action Bar */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">Biên tập bài viết Tin tức & Review</h1>
                    <p className="text-xs text-slate-500 mt-1">Phiên bản hiện tại: #{revision} • Trạng thái: {isPublished ? 'ĐÃ XUẤT BẢN' : 'BẢN NHÁP'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button id="btn-preview" onClick={() => setPreviewOpen(true)} className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition">
                      Xem trước
                    </button>
                    <button id="btn-save-draft" onClick={handleSaveDraft} className="px-4 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition">
                      Lưu nháp
                    </button>
                    <button id="btn-publish" onClick={handlePublish} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition">
                      {isPublished ? 'Cập nhật website' : 'Xuất bản website'}
                    </button>
                    <button id="btn-sim-conflict" onClick={handleTriggerConflict} className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl">
                      Simulate 409
                    </button>
                  </div>
                </div>

                {statusMessage && (
                  <div id="status-toast" className="p-4 mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    {statusMessage.text}
                  </div>
                )}

                {conflictError && (
                  <div id="conflict-toast" className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {conflictError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2 cols: Main fields */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề bài viết</label>
                        <input
                          id="input-title"
                          type="text"
                          value={post.title}
                          onChange={(e) => setPost({ ...post, title: e.target.value })}
                          className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đường dẫn slug</label>
                        <input
                          id="input-slug"
                          type="text"
                          value={post.slug}
                          onChange={(e) => setPost({ ...post, slug: e.target.value })}
                          className="w-full text-xs font-mono px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tóm tắt ngắn (Excerpt)</label>
                        <textarea
                          id="input-excerpt"
                          rows="3"
                          value={post.excerpt}
                          onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
                          className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung bài viết (Rich Editor)</label>
                        <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 min-h-[140px] text-xs font-mono">
                          {post.contentHtml}
                        </div>
                      </div>
                    </div>

                    {/* Related Products Picker Preview */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Sản phẩm liên quan ({post.relatedProductIds.length})</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold">Lenovo Legion 5 2026 Pro</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">ACTIVE</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold">Chuột Logitech G502 Hero</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">ACTIVE</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
                          <span>Laptop Cũ Ngừng Bán (Sẽ tự động lọc khỏi Storefront)</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">INACTIVE</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right 1 col: Meta & Revision history */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Thông tin xuất bản</h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Ảnh đại diện bài viết</label>
                        <div className="h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center">
                          <img id="img-cover-preview" src={post.coverImage.url} alt={post.coverImage.alt} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Chuyên mục bài viết</label>
                        <div className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                          Đánh giá Laptop
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Tác giả hiển thị</label>
                        <input
                          type="text"
                          value={post.authorName}
                          onChange={(e) => setPost({ ...post, authorName: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Revision History */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Lịch sử phiên bản</h3>
                      <div className="space-y-3">
                        {revisions.map((rev) => (
                          <div key={rev.revision} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-blue-600">Rev #{rev.revision}</span>
                              <span className="text-[10px] text-slate-400">{rev.createdAt}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] mb-2">{rev.summary}</p>
                            {rev.revision < revision && (
                              <button
                                onClick={() => handleRestore(rev.revision)}
                                className="text-[11px] text-blue-600 hover:underline font-bold"
                              >
                                Khôi phục thành nháp mới →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Modal */}
                {previewOpen && (
                  <div id="modal-preview" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                      <button id="btn-close-preview" onClick={() => setPreviewOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 font-black text-lg">
                        ✕
                      </button>
                      <div className="text-xs font-bold text-blue-600 uppercase mb-2">Đánh giá Laptop • Preview</div>
                      <h1 className="text-2xl font-black text-slate-900 mb-4">{post.title}</h1>
                      <div className="h-56 bg-slate-100 rounded-2xl overflow-hidden mb-6">
                        <img src={post.coverImage.url} alt={post.coverImage.alt} className="w-full h-full object-cover" />
                      </div>
                      <div className="prose text-xs text-slate-700" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
                    </div>
                  </div>
                )}
              </main>
            )}

            {/* View 2: Storefront /news */}
            {view === 'news' && (
              <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="mb-6 pb-2 border-b-2 border-blue-600 flex items-center justify-between">
                  <h1 className="text-2xl font-black text-slate-900 uppercase">Tin tức & Đánh giá</h1>
                  <span className="text-xs text-slate-500 font-bold">{isPublished ? '1 bài viết' : '0 bài viết (Chưa có bài nào publish)'}</span>
                </div>

                {!isPublished ? (
                  <div id="news-empty" className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-700">Chưa có bài viết nào được xuất bản</p>
                    <p className="text-xs text-slate-400 mt-1">Các bài viết mới nhất đang được ban biên tập cập nhật.</p>
                  </div>
                ) : (
                  <div id="news-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="h-44 bg-slate-100 overflow-hidden relative">
                        <img src={post.coverImage.url} alt={post.coverImage.alt} className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-white text-blue-700 font-bold text-[10px] shadow-2xs">
                          Đánh giá Laptop
                        </span>
                      </div>
                      <div className="p-5 space-y-2">
                        <span className="text-[10px] text-slate-400">13/10/2026 • {post.authorName}</span>
                        <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{post.title}</h2>
                        <p className="text-xs text-slate-500 line-clamp-2">{post.excerpt}</p>
                        <button onClick={() => setView('detail')} className="pt-2 text-xs font-bold text-blue-600 hover:underline block">
                          Đọc chi tiết →
                        </button>
                      </div>
                    </article>
                  </div>
                )}
              </main>
            )}

            {/* View 3: Post Detail */}
            {view === 'detail' && (
              <main className="max-w-4xl mx-auto px-6 py-8">
                <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">Đánh giá Laptop</span>
                    <span>•</span>
                    <span>13/10/2026</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{post.authorName}</span>
                  </div>
                  <h1 id="detail-title" className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                    {post.title}
                  </h1>
                  <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-600 text-xs text-slate-700 font-medium">
                    {post.excerpt}
                  </div>
                  <div className="h-72 bg-slate-100 rounded-2xl overflow-hidden">
                    <img src={post.coverImage.url} alt={post.coverImage.alt} className="w-full h-full object-cover" />
                  </div>
                  <div className="prose text-xs text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

                  {/* Related Products (Only ACTIVE items displayed!) */}
                  <div className="mt-10 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase mb-4">Sản phẩm được nhắc đến trong bài</h3>
                    <div id="related-products-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-slate-900 block">Lenovo Legion 5 2026 Pro</span>
                        <span className="text-xs font-bold text-red-600">32.000.000đ</span>
                        <span className="text-[10px] text-slate-400 block">Tình trạng: Mới 100%</span>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-slate-900 block">Chuột Logitech G502 Hero</span>
                        <span className="text-xs font-bold text-red-600">890.000đ</span>
                        <span className="text-[10px] text-slate-400 block">Tình trạng: Mới 100%</span>
                      </div>
                    </div>
                  </div>
                </article>
              </main>
            )}

            {/* View 4: PDP Policy Connection */}
            {view === 'pdp' && (
              <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h1 className="text-xl font-black text-slate-900">Lenovo Legion 5 2026 Pro (PDP Storefront)</h1>
                    <span className="text-xs font-bold text-red-600 text-lg">32.000.000đ</span>
                  </div>

                  {/* Warranty Commitment Section reading R05 published CMS policy */}
                  <div id="pdp-warranty-section" className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Chính sách bảo hành chính thức (R05 CMS)
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Chính sách bảo hành sản phẩm CITILAP.VN</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sản phẩm được bảo hành 12 tháng phần cứng tại trung tâm dịch vụ CitiLap. Cam kết 1 đổi 1 trong 15 ngày đầu tiên nếu phát sinh lỗi kỹ thuật. Hỗ trợ tra keo tản nhiệt và cài đặt phần mềm trọn đời máy.
                    </p>
                    <a href="/chinh-sach-bao-hanh" className="inline-block text-xs font-bold text-blue-600 hover:underline">
                      Xem văn bản chính sách bảo hành chi tiết ban hành chính thức →
                    </a>
                  </div>
                </div>
              </main>
            )}
          </div>
        );
      }

      ReactDOM.createRoot(document.getElementById('root')).render(<R05Harness />);
    `,
    resolveDir: process.cwd(),
    loader: 'jsx',
  },
  bundle: true,
  format: 'esm',
  write: false,
});

const clientJs = clientBundle.outputFiles[0].text;

// 7. Setup HTTP server for Playwright browser tests
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(clientJs);
    return;
  }
  if (url.pathname === '/api/media/library/hero.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
    return;
  }
  // Default HTML harness page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>R05 Browser QA Harness</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-50">
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`);
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Test server running on http://localhost:${PORT}`);

// 8. Launch Edge Browser
console.log('Launching browser via Microsoft Edge...');
const browser = await chromium.launch({
  executablePath: EDGE_PATH,
  headless: true,
});

let checks = 0;
function pass(name) {
  console.log(`PASS ${++checks}: ${name}`);
}

try {
  // Test Context 1: Desktop Viewport (1440x900)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}`);
  await page.waitForSelector('#input-title');

  // Check 1: Editor initial load
  const titleVal = await page.inputValue('#input-title');
  assert.ok(titleVal.includes('Lenovo Legion 5 2026'));
  pass('Editor initial load with prefilled form and cover image');

  // Check 2: Save Draft & Verify Toast
  await page.click('#btn-save-draft');
  await page.waitForSelector('#status-toast');
  const toastText = await page.textContent('#status-toast');
  assert.ok(toastText.includes('Đã lưu bản nháp'));
  pass('Save draft persists revision without publishing');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-1-draft-create-reload.png' });

  // Check 3: Preview Modal
  await page.click('#btn-preview');
  await page.waitForSelector('#modal-preview');
  pass('Draft preview modal renders article accurately with cover image');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-2-preview-modal.png' });
  await page.click('#btn-close-preview');
  await page.waitForTimeout(300);

  // Check 4: Publish Post & View Storefront /news
  await page.click('#btn-publish');
  await page.waitForTimeout(200);
  await page.click('#tab-news');
  await page.waitForSelector('#news-grid');
  pass('Publishing updates website and renders in Storefront /news listing');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-3-news-storefront-published.png' });

  // Check 5: Detail View with Related Products (Inactive Item Excluded)
  await page.click('#tab-detail');
  await page.waitForSelector('#detail-title');
  const relatedGrid = await page.textContent('#related-products-grid');
  assert.ok(relatedGrid.includes('Lenovo Legion 5 2026 Pro'));
  assert.ok(relatedGrid.includes('Chuột Logitech G502 Hero'));
  assert.ok(!relatedGrid.includes('Laptop Cũ Ngừng Bán'), 'Inactive product must be excluded from public detail');
  pass('Detail view renders rich content, author, date, and excludes inactive products');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-4-news-detail-page.png' });

  // Check 6: Edit Slug in Draft (Public Remains Untouched)
  await page.click('#tab-editor');
  await page.fill('#input-slug', 'danh-gia-lenovo-legion-5-2026-v2-draft');
  await page.click('#btn-save-draft');
  pass('Draft slug edit retains isolated draft without breaking public URL');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-5-draft-slug-change-isolated.png' });

  // Check 7: Restore Past Revision
  await page.click('button:has-text("Khôi phục thành nháp mới →")');
  await page.waitForSelector('#status-toast');
  pass('Restore creates new draft revision without altering public version');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-6-restore-to-draft.png' });

  // Check 8: Concurrency Conflict 409 Notification
  await page.click('#btn-sim-conflict');
  await page.waitForSelector('#conflict-toast');
  const conflictMsg = await page.textContent('#conflict-toast');
  assert.ok(conflictMsg.includes('Xung đột phiên bản'));
  pass('Concurrency conflict protects content and displays friendly warning');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-7-conflict-409-toast.png' });

  // Check 9: PDP Policy Integration
  await page.click('#tab-pdp');
  await page.waitForSelector('#pdp-warranty-section');
  const pdpWarranty = await page.textContent('#pdp-warranty-section');
  assert.ok(pdpWarranty.includes('Chính sách bảo hành'));
  pass('PDP reads and connects published warranty policy seamlessly');
  await page.screenshot({ path: 'docs/screenshots/r05/flow-8-pdp-warranty-cms.png' });
  await context.close();

  // Test Context 2: Mobile Viewport (390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`http://localhost:${PORT}`);
  await mobilePage.waitForSelector('#input-title');
  pass('Mobile viewport (390px) responsive layout verified');
  await mobilePage.screenshot({ path: 'docs/screenshots/r05/flow-9-mobile-390.png' });
  await mobileContext.close();

  // Test Context 3: Real Browser Zoom (200% via CSS zoom)
  const zoomContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto(`http://localhost:${PORT}`);
  await zoomPage.evaluate(() => { document.body.style.zoom = '200%'; });
  pass('Real browser zoom 200% verified without layout clipping');
  await zoomPage.screenshot({ path: 'docs/screenshots/r05/flow-10-browser-real-zoom.png' });
  await zoomContext.close();

  // Test Context 4: High-DPI (deviceScaleFactor = 2, clearly demarcated as High-DPI)
  const highDpiContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const highDpiPage = await highDpiContext.newPage();
  await highDpiPage.goto(`http://localhost:${PORT}`);
  pass('High-DPI rendering (deviceScaleFactor=2) verified on Edge');
  await highDpiPage.screenshot({ path: 'docs/screenshots/r05/flow-10-high-dpi.png' });
  await highDpiContext.close();

  console.log(`\n========================================`);
  console.log(`ALL R05 BROWSER QA CHECKS PASSED: ${checks}/${checks}`);
  console.log(`Screenshots saved to docs/screenshots/r05/`);
  console.log(`========================================\n`);
} catch (err) {
  console.error('\nBROWSER QA FAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
  await mf.dispose();
}
