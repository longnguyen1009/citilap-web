// Isolated D1 fixtures; never changes project data. Failures expose CMS contract gaps.
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import React from 'react';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';

await mkdir('.wrangler/audit-2026-10-29', { recursive: true });
await build({
  stdin: { contents: `
    export * from './src/server/services/site-builder.service';
    export { blankPost } from './src/contracts/cms/post';
    export { POST as subscribeNewsletter } from './src/app/api/newsletter/route';
    export { ProductReviewsSection } from './src/components/product/ProductReviewsSection';
    export { ProductGallery } from './src/components/product/ProductGallery';
    export { default as BlockRenderer } from './src/components/builder/BlockRenderer';
  `, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', packages: 'external',
  outfile: '.wrangler/audit-2026-10-29/contracts.mjs',
  plugins: [{ name: 'server-only-fixture', setup(b) {
    b.onResolve({ filter: /^file:/ }, a => ({ path: a.path, external: true }));
    // Next's CJS default export needs the same interop used by its bundler.
    b.onResolve({ filter: /^next\/(image|link)$/ }, a => ({ path: a.path, namespace: 'next-interop' }));
    b.onLoad({ filter: /.*/, namespace: 'next-interop' }, a => ({ contents: `import mod from ${JSON.stringify(pathToFileURL(createRequire(import.meta.url).resolve(a.path)).href)}; export default mod.default || mod;` }));
    b.onResolve({ filter: /^next\// }, a => ({ path: pathToFileURL(createRequire(import.meta.url).resolve(a.path)).href, external: true }));
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: 'empty', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: '' }));
    b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true }));
  } }],
});
const api = await import('../.wrangler/audit-2026-10-29/contracts.mjs');
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: 'export default {fetch(){return new Response("fixture")}}',
  compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'],
}));
let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log('PASS ' + name); }
  catch (error) { failures++; console.log('FAIL ' + name + ': ' + error.message); }
}
const section = (type, data, id = 'fixture') => ({ id, type, name: 'Fixture', enabled: true, data: { type, ...data } });
const html = sections => renderToStaticMarkup(React.createElement(api.BlockRenderer, { sections }));
try {
  const db = await mf.getD1Database('DB');
  for (const f of (await readdir('d1-migrations')).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of unstable_splitSqlQuery(await readFile('d1-migrations/' + f, 'utf8'))) {
      if (sql.trim()) await db.prepare(sql).run();
    }
  }
  const resolve = async s => (await api.resolveSectionsForStorefront(db, [s]))[0];
  await check('Gallery preserves six configured entries including duplicate URLs', async () => {
    const s = await resolve(section('customer_gallery', { title: 'Gallery', images: Array.from({ length: 6 }, (_, i) => ({ url: '/brand/store-photo-04.jpg', alt: 'Photo ' + i })) }));
    assert.equal(s.data.images.length, 6);
    assert.equal((html([s]).match(/aria-label="Phóng to ảnh /g) || []).length, 6);
  });
  await check('Featured brands render authored title and resolved brand', () => {
    const s = { ...section('featured_brands', { title: 'Authored brand heading', subtitle: '', brandIds: ['brand-fixture'] }), resolvedBrands: [{ id: 'brand-fixture', name: 'Fixture Brand', slug: 'fixture-brand' }] };
    const markup = html([s]);
    assert(markup.includes('Authored brand heading') && markup.includes('Fixture Brand'), 'Authored title/brand missing from HTML');
  });
  await check('Hot sale builder preview and storefront preserve the authored heading', () => {
    const s = section('product_grid', { title: 'Authored sale heading', links: [], sourceMode: 'manual', manualProductIds: [] }, 'sec-hot-sale');
    assert(html([s]).includes('Authored sale heading'), 'Preview control');
    const publicHtml = renderToStaticMarkup(React.createElement(api.BlockRenderer, { sections: [s], flashSale: React.createElement('div', null, 'Campaign content') }));
    assert(publicHtml.includes('Authored sale heading'), 'Public homepage replaces the complete authored block');
  });
  const nav = { schemaVersion: 1, categories: [], menus: [], collections: [{ id: 'collection-id', slug: 'collection-slug', name: 'Fixture collection', visible: true, mode: 'manual', productIds: [], description: '', image: '' }] };
  await db.prepare("INSERT INTO NavigationStudio(id,revision,draft,published,publishedRevision) VALUES('site',1,?,?,1)").bind(JSON.stringify(nav), JSON.stringify(nav)).run();
  await check('Collection ID accepted by builder resolves published collection', async () => {
    const s = await resolve(section('featured_collection', { title: '', subtitle: '', collectionId: 'collection-id', limit: 1 }));
    assert.equal(s.resolvedCollection?.id, 'collection-id');
  });
  await check('Collection slug resolves as control', async () => {
    const s = await resolve(section('featured_collection', { title: '', subtitle: '', collectionId: 'collection-slug', limit: 1 }));
    assert.equal(s.resolvedCollection?.id, 'collection-id');
  });
  for (let i = 0; i < 6; i++) {
    const id = 'post-' + i;
    const doc = { ...api.blankPost(), title: id, slug: id };
    await db.prepare("INSERT INTO Post(id,slug,updatedAt) VALUES(?,?,CURRENT_TIMESTAMP)").bind(id, id).run();
    await db.prepare('INSERT INTO PostStudio(postId,draft,published,publishedRevision) VALUES(?,?,?,1)').bind(id, JSON.stringify(doc), JSON.stringify(doc)).run();
  }
  await check('Automatic news respects admin limit=2', async () => {
    const s = await resolve(section('news_reviews', { title: 'News', subtitle: '', postIds: [], categoryId: null, limit: 2 }));
    assert.equal(s.resolvedPosts.length, 2);
  });
  await check('Featured collection renderer respects admin limit=1', () => {
    const s = { ...section('featured_collection', { title: '', subtitle: '', collectionId: 'collection-slug', limit: 1 }), resolvedCollection: { name: 'Collection', slug: 'collection-slug', products: [{ id: 'p1', name: 'Fixture One', slug: 'fixture-one', price: 1000000, image: '/brand/store-photo-04.jpg' }, { id: 'p2', name: 'Fixture Two', slug: 'fixture-two', price: 2000000, image: '/brand/store-photo-04.jpg' }] } };
    assert(!html([s]).includes('Fixture Two'), 'Second product renders despite limit=1');
  });
  await check('Builder list returns authored fields and filters before pagination, independently of homepage', async () => {
    for (let i = 0; i < 23; i++) {
      const id = 'audit-page-' + String(i).padStart(2, '0');
      const document = { title: 'Title ' + i, internalName: 'Internal ' + i, sections: [section('cta', { title: 'CTA' })] };
      await db.prepare("INSERT INTO LandingPage(id,slug,name,status) VALUES(?,?,?,?)").bind(id, id, document.internalName, i < 21 ? 'PUBLISHED' : 'DRAFT').run();
      await db.prepare('INSERT INTO LandingPageStudio(pageId,revision,draft) VALUES(?,1,?)').bind(id, JSON.stringify(document)).run();
    }
    const first = await api.getLandingPageList(db, { excludeHome: true, status: 'PUBLISHED', limit: 20 });
    const second = await api.getLandingPageList(db, { excludeHome: true, status: 'PUBLISHED', limit: 20, page: 2 });
    assert.equal(first.total, 21);
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 1);
    assert.equal(new Set([...first.items, ...second.items].map(p => p.id)).size, 21);
    for (const item of first.items) {
      assert.match(item.title, /^Title /);
      assert.match(item.internalName, /^Internal /);
      assert.equal(item.sectionCount, 1);
      assert.equal(item.isHome, false);
    }
    const drafts = await api.getLandingPageList(db, { excludeHome: true, status: 'DRAFT' });
    assert.equal(drafts.total, 2);
    const search = await api.getLandingPageList(db, { excludeHome: true, q: 'audit-page-22' });
    assert.equal(search.items[0].title, 'Title 22');
    const titleSearch = await api.getLandingPageList(db, { excludeHome: true, q: 'Title 22' });
    assert.equal(titleSearch.total, 1);
    assert.equal(titleSearch.items[0].internalName, 'Internal 22');
    assert.equal((await api.getLandingPageDetail(db, 'home')).isHome, true);
  });
  await check('Newsletter never acknowledges a subscription it did not persist', async () => {
    const send = email => api.subscribeNewsletter(new Request('http://localhost/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }));
    assert.equal((await send('invalid')).status, 400);
    const response = await send('fixture@example.invalid');
    assert.equal(response.status, 503);
    assert.equal((await response.json()).success, false);
  });
  await check('Product reviews render only approved data and calculate real ratings', () => {
    const render = approvedReviews => renderToStaticMarkup(React.createElement(api.ProductReviewsSection, { productName: 'Fixture', approvedReviews }));
    const empty = render([]);
    assert(!empty.includes('curated-review') && !empty.includes('Hoàng Tuấn Minh'));
    assert(empty.includes('Chưa có đánh giá'));
    const populated = render([{ id: 'review', reviewerName: 'Fixture Buyer', rating: 2, productName: 'Fixture', comment: 'Fixture feedback', createdAt: '2026-10-30' }]);
    assert(populated.includes('Fixture feedback') && populated.includes('2.0') && populated.includes('1 đánh giá đã duyệt'));
    assert(!populated.includes('Đã mua tại CitiLap'));
  });
  await check('Gallery initially displays selected variant image, including after reload', () => {
    const markup = renderToStaticMarkup(React.createElement(api.ProductGallery, { productName: 'Fixture', images: ['', '/first.jpg', '/selected.jpg'], selectedImage: '/selected.jpg' }));
    const firstImage = markup.match(/<img\b[^>]*>/)?.[0];
    assert(firstImage?.includes('src="/selected.jpg"'), firstImage);
  });
  console.log(`Audit assertions: ${failures} failure(s)`);
  process.exitCode = failures ? 1 : 0;
} finally { await mf.dispose(); }
