import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { pages, articles, escapeHtml as esc } from './release-content.mjs';

const mode = process.argv[2] || '--plan';
assert(['--plan', '--local', '--staging', '--check-staging'].includes(mode), 'Use --plan, --local, --staging or --check-staging');
const origin = 'https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev';
const output = '.wrangler/release';
mkdirSync(output, { recursive: true });
await build({ stdin: { contents: `export * from './src/server/services/product-studio.service'; export * from './src/server/services/navigation.service'; export * from './src/server/services/page.service'; export * from './src/server/services/post.service'; export * from './src/server/services/settings.service'; export * from './src/server/services/brand.service'; export * from './src/server/services/site-builder.service'; export * from './src/contracts/cms/product-studio'; export * from './src/contracts/cms/page'; export * from './src/contracts/cms/post'; export { businessProfile } from './src/config/business-profile';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.release-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
const api = await import('./.release-bundle.mjs');
const root = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const candidates = readdirSync(root).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite').filter(f => {
  const db = new DatabaseSync(`${root}/${f}`, { readOnly: true });
  try { return !!db.prepare("SELECT 1 FROM sqlite_master WHERE name='ProductStudio'").get(); } finally { db.close(); }
});
assert.equal(candidates.length, 1, 'Local database is ambiguous');
const sqlite = new DatabaseSync(`${root}/${candidates[0]}`, { readOnly: mode !== '--local' });
const DB = { prepare(sql) {
  let args = [];
  return { bind(...values) { args = values; return this; }, async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { const r = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; } };
}, async batch(statements) {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec('COMMIT'); return results; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
let mf;
const groups = [
  ['cat-gaming', 30, 'Laptop Gaming', 'LAPTOP'], ['cat-van-phong', 35, 'Laptop Văn Phòng', 'LAPTOP'],
  ['cat-do-hoa', 20, 'Laptop Đồ Họa', 'LAPTOP'], ['cat-macbook', 5, 'Apple MacBook', 'LAPTOP'],
  ['ref-accessory-hardware', 2, 'RAM & SSD', 'ACCESSORY'], ['ref-accessory-hub', 2, 'Hub USB-C', 'HUB'],
  ['ref-accessory-stand', 2, 'Giá đỡ & Tản nhiệt', 'ACCESSORY'], ['ref-accessory-mouse-keyboard', 2, 'Chuột & Bàn phím', 'MOUSE'],
  ['ref-accessory-bag', 2, 'Balo & Túi laptop', 'BAG'],
];
const slug = value => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

try {
  if (mode === '--plan') {
    const source = sqlite.prepare("SELECT p.id,p.categoryId,s.draft FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.slug LIKE 'ref-tgs-%' ORDER BY p.id").all().map(r => ({ ...r, document: JSON.parse(r.draft) }));
    const brands = sqlite.prepare('SELECT id,name FROM Brand').all();
    const usedNames = new Set();
    const products = [];
    for (const [categoryId, count, label, template] of groups) {
      const eligible = source.filter(r => r.categoryId === categoryId && r.document.media.length && (template !== 'LAPTOP' || r.document.specs.filter(s => s.value).length >= 3));
      // Round-robin brands, then models, to avoid filling a section with one brand.
      const buckets = Map.groupBy(eligible, r => r.document.brand.toLowerCase());
      const ordered = []; let more = true;
      while (more) { more = false; for (const bucket of buckets.values()) { if (bucket.length) { ordered.push(bucket.shift()); more = true; } } }
      let added = 0;
      for (const row of ordered) {
        const original = row.document;
        const name = original.name.replace(/^\[Tham khảo\]\s*/i, '').replace(/\s+/g, ' ').trim();
        if (usedNames.has(name.toLowerCase())) continue;
        const media = original.media.filter(m => sqlite.prepare("SELECT 1 FROM MediaAsset WHERE id=? AND state='READY' AND kind='IMAGE'").get(m.assetId)).slice(0, 5);
        if (!media.length) continue;
        const actualTemplate = template === 'MOUSE' && /bàn phím|keyboard/i.test(name) ? 'KEYBOARD' : template;
        const d = api.blankProduct(actualTemplate);
        const matchingBrand = brands.find(b => b.name.toLowerCase() === original.brand.toLowerCase());
        const months = template === 'LAPTOP' && original.condition === 'NEW' ? 12 : 6;
        Object.assign(d, { name, slug: `${slug(name).slice(0, 190)}-citilap`, categoryId, brand: matchingBrand?.name || original.brand, brandId: matchingBrand?.id || null,
          condition: original.condition, availability: 'CONTACT', price: 0, originalPrice: null, specs: original.specs.filter(s => s.value),
          media: media.map(m => ({ assetId: m.assetId, alt: name, variantId: '' })), isFeatured: added < 3,
          description: `${name}. Thuộc nhóm ${label.toLowerCase()}; liên hệ CitiLap để nhận báo giá theo cấu hình và tình trạng máy có thể cung cấp.`,
          warranties: [{ name: `Bảo hành CitiLap ${months} tháng`, description: 'Bảo hành lỗi kỹ thuật phần cứng theo chính sách công khai. Chi tiết gói được ghi trên xác nhận mua hàng.', adjustment: 0, recommended: true }],
          seoTitle: name.slice(0, 180), seoDescription: `${name}. Tư vấn cấu hình, tình trạng và báo giá tại CitiLap. Hotline 0899.188.186.`.slice(0, 280),
        });
        d.contentHtml = `<h2>${esc(name)}</h2><p>${esc(d.description)}</p><h2>Cấu hình lựa chọn</h2><ul>${d.specs.map(s => `<li>${esc(s.key)}: ${esc(s.value)}</li>`).join('')}</ul><h2>Tư vấn trước khi mua</h2><p>Gửi nhu cầu sử dụng và ngân sách để được đối chiếu cấu hình phù hợp. Giá, tình trạng máy, pin và phụ kiện của sản phẩm giao thực tế được ghi trong xác nhận mua hàng; liên hệ hotline 0899.188.186 để nhận thông tin.</p><h2>Bảo hành và giao nhận</h2><p>Gói tiêu chuẩn ${months} tháng theo chính sách bảo hành CitiLap. Có thể xem máy tại Hà Nội hoặc Bắc Ninh theo lịch hẹn; nhận đơn online tại quầy Hà Nội hoặc giao hàng theo thỏa thuận.</p>`;
        api.productDocumentSchema.parse(d);
        products.push({ sourceId: row.id, document: d }); usedNames.add(name.toLowerCase()); added++;
        if (added === count) break;
      }
      assert.equal(added, count, `Not enough source data for ${label}`);
    }
    assert.equal(products.length, 100);
    assert.equal(new Set(products.map(p => p.document.slug)).size, 100);
    for (const p of pages) api.pageDocumentSchema.parse(p);
    for (const a of articles) api.postDocumentSchema.parse(a);
    const plan = { createdAt: new Date().toISOString(), source: 'Existing local catalog; reference imports are not proof of CitiLap stock or price.', products, pages, articles };
    writeFileSync(`${output}/manifest.json`, JSON.stringify(plan, null, 2));
    console.log({ products: products.length, articles: articles.length, pages: pages.length, groups: groups.map(([id, count]) => ({ id, count })) });
    process.exitCode = 0;
  } else {
    const plan = JSON.parse(readFileSync(`${output}/manifest.json`, 'utf8'));
    let cookie = '';
    if (mode !== '--local') {
      const secrets = parseEnv(readFileSync('.env', 'utf8'));
      assert(secrets.ADMIN_EMAIL && secrets.ADMIN_PASSWORD, 'Admin login credentials missing');
      const response = await fetch(origin + '/api/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: secrets.ADMIN_EMAIL, password: secrets.ADMIN_PASSWORD }), signal: AbortSignal.timeout(30_000) });
      assert(response.ok, `Staging admin login failed: HTTP ${response.status}`);
      cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      assert(cookie, 'Admin session missing');
    } else {
      mf = new Miniflare({ ...convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("release")}}', compatibilityDate: '2026-10-01', r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' } }), resourcePersistencePath: resolve('.wrangler/state/v3') });
    }
    const env = mode === '--local' ? { DB, PRODUCT_MEDIA: await mf.getR2Bucket('PRODUCT_MEDIA') } : null;
    async function request(path, method = 'GET', input) {
      if (mode !== '--local') {
        const r = await fetch(origin + '/api/admin/' + path, { method, headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: input === undefined ? undefined : JSON.stringify(input), signal: AbortSignal.timeout(60_000) });
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(`${method} ${path}: HTTP ${r.status} ${data.error || 'request failed'}`);
        return data.data;
      }
      const url = new URL('http://local/' + path); const [kind, id] = url.pathname.slice(1).split('/'); const opts = Object.fromEntries(url.searchParams);
      if (kind === 'products') return method === 'GET' ? id ? api.studioDetail(DB, id) : api.catalogList(DB, opts) : method === 'DELETE' ? api.archiveProduct(DB, id) : api.writeStudio(env, id || null, input);
      if (kind === 'posts') return method === 'GET' ? id ? api.postDetail(DB, id) : api.postList(DB, opts) : method === 'DELETE' ? api.archivePost(env, id, input.expectedRevision) : api.writePost(env, id || null, input);
      if (kind === 'pages') return method === 'GET' ? id ? api.pageDetail(DB, id) : api.pageList(DB, opts) : api.writePage(env, id || null, input);
      if (kind === 'navigation') return method === 'GET' ? api.navigationDetail(DB) : api.writeNavigation(env, input);
      if (kind === 'settings') return method === 'GET' ? api.getAdminSettings(DB) : api.saveAdminSettings(DB, input);
      if (kind === 'post-categories') return method === 'GET' ? api.listPostCategories(DB) : api.writePostCategory(DB, id || null, input);
      if (kind === 'brands') return method === 'GET' ? api.listBrands(DB, opts) : api.writeBrand(env, id, input);
      if (kind === 'builder') return method === 'GET' ? api.getLandingPageDetail(DB, id) : api.writeLandingPage(env, id, input);
      throw new Error(`Unsupported release operation: ${method} ${path}`);
    }
    async function list(kind) {
      const rows = [];
      for (let page = 1;; page++) { const r = await request(`${kind}?page=${page}&limit=100`); rows.push(...r.items); if (rows.length >= r.total || !r.items.length) return rows; }
    }
    const previousProducts = await list('products');
    if (mode === '--check-staging') {
      const posts = await list('posts'); const nav = await request('navigation');
      console.log({ products: previousProducts.length, publicProducts: previousProducts.filter(p => p.isPublished).length, posts: posts.length, categories: nav.document.categories.filter(c => c.visible).length });
    } else {
      const nav = await request('navigation'); const d = nav.document;
      const visible = new Set([...groups.map(g => g[0]), 'cat-phu-kien']);
      d.categories = d.categories.map(c => ({ ...c, visible: visible.has(c.id), assetId: '', image: '', alt: c.name }));
      d.collections = [];
      const item = (id, label, target, children = []) => ({ id, label, target, children });
      const path = path => ({ kind: 'path', path });
      d.menus.main = groups.slice(0, 4).map(([id, , label]) => item(`nav-${id}`, label, { kind: 'category', id }));
      d.menus.main.push(item('nav-accessories', 'Phụ kiện', { kind: 'category', id: 'cat-phu-kien' }, groups.slice(4).map(([id, , label]) => ({ id: `nav-${id}`, label, target: { kind: 'category', id } }))), item('nav-news', 'Tin tức & Tư vấn', path('/news')), item('nav-about', 'Về CitiLap', path('/gioi-thieu'), [{ id: 'nav-stores', label: 'Hệ thống cửa hàng', target: path('/he-thong-cua-hang') }, { id: 'nav-contact', label: 'Liên hệ', target: path('/lien-he') }]));
      d.menus.footer = plan.pages.map(p => item(`footer-${p.slug}`, p.title, path('/' + p.slug)));
      await request('navigation', 'PUT', { expectedRevision: nav.revision, action: 'publish', document: d });
      const created = [];
      for (const [index, product] of plan.products.entries()) {
        const existing = previousProducts.find(p => p.slug === product.document.slug);
        const result = await request(existing ? `products/${existing.id}` : 'products', existing ? 'PUT' : 'POST', { expectedRevision: existing?.revision || 0, action: 'publish', document: product.document });
        created.push({ id: result.id, ...product.document });
        if ((index + 1) % 10 === 0) console.log(`Published products ${index + 1}/100`);
      }
      const keep = new Set(created.map(p => p.id));
      const old = previousProducts.filter(p => !keep.has(p.id) && p.productStatus !== 'ARCHIVED');
      const concurrency = mode === '--local' ? 1 : 4;
      for (let index = 0; index < old.length; index += concurrency) {
        const results = await Promise.allSettled(old.slice(index, index + concurrency).map(p => request(`products/${p.id}`, 'DELETE')));
        for (const result of results) if (result.status === 'rejected') throw result.reason;
        if (index % 100 === 0) console.log(`Archived old catalog ${Math.min(index + concurrency, old.length)}/${old.length}`);
      }
      const oldPosts = await list('posts');
      const categories = await request('post-categories');
      const newsCategory = categories.find(c => c.slug === 'tu-van-cong-nghe') || await request('post-categories', 'POST', { expectedRevision: 0, document: { name: 'Tư vấn công nghệ', slug: 'tu-van-cong-nghe', status: 'ACTIVE', sortOrder: 0 } });
      for (const article of plan.articles) {
        const { sourceCategory, ...document } = article;
        const related = created.filter(p => p.categoryId === sourceCategory).slice(0, 3);
        assert(related.length, `Article category empty: ${sourceCategory}`);
        document.coverImage = { assetId: related[0].media[0].assetId, alt: document.title };
        document.relatedProductIds = related.map(p => p.id); document.categoryId = newsCategory.id;
        const existing = oldPosts.find(p => p.slug === document.slug);
        await request(existing ? `posts/${existing.id}` : 'posts', existing ? 'PUT' : 'POST', { expectedRevision: existing?.revision || 0, action: 'publish', document });
      }
      for (const post of oldPosts.filter(p => !plan.articles.some(a => a.slug === p.slug))) await request(`posts/${post.id}`, 'DELETE', { expectedRevision: post.revision });
      for (const category of categories.filter(c => c.id !== newsCategory.id && c.status === 'ACTIVE')) {
        await request(`post-categories/${category.id}`, 'PUT', { expectedRevision: category.revision, document: { ...category, status: 'INACTIVE' } });
      }
      const oldPages = await list('pages');
      for (const document of plan.pages) {
        const existing = oldPages.find(p => p.slug === document.slug || document.pageType !== 'CUSTOM' && p.pageType === document.pageType);
        await request(existing ? `pages/${existing.id}` : 'pages', existing ? 'PUT' : 'POST', { expectedRevision: existing?.revision || 0, action: 'publish', document });
      }
      const settings = await request('settings');
      const profile = api.businessProfile;
      Object.assign(settings.document, { storeName: 'CitiLap', storeEmail: profile.email, storePhone: profile.phone, storePhoneBacNinh: '0842044999', addressHanoi: profile.locations[0].address, addressBacNinh: profile.locations[1].address,
        openingHours: profile.supportHours, logoUrl: '/brand/citilap-logo.svg', faviconUrl: '/brand/citilap-mark.svg', motto: profile.traditionalMotto,
        facebookUrl: profile.socialProfiles.facebook, tiktokUrl: profile.socialProfiles.tiktok, zaloUrl: profile.socialProfiles.zalo,
        defaultSeoTitle: 'CitiLap - Laptop Gaming, Văn Phòng, Đồ Họa & Phụ Kiện', defaultSeoDescription: 'Tư vấn laptop theo nhu cầu tại CitiLap. Xem cấu hình, so sánh sản phẩm, liên hệ báo giá và hỗ trợ bảo hành tại Hà Nội, Bắc Ninh.',
        flashSaleEnabled: false, flashSaleTitle: 'Sản phẩm nổi bật', heroBadge: 'Tư vấn theo nhu cầu thực tế', heroTitle: 'Chọn đúng laptop', heroHighlight: 'cho công việc của bạn', heroSlogan: profile.traditionalMotto,
        heroCtaPrimaryText: 'Khám phá sản phẩm', heroCtaPrimaryLink: '/search', heroCtaSecondaryText: 'Nhận tư vấn', heroCtaSecondaryLink: '/lien-he',
        subBanner1Title: 'Laptop văn phòng', subBanner1Subtitle: 'Chọn cấu hình theo công việc', subBanner1Link: '/category/laptop-van-phong',
        subBanner2Title: 'Phụ kiện laptop', subBanner2Subtitle: 'Hoàn thiện góc làm việc', subBanner2Link: '/category/' + d.categories.find(c => c.id === 'cat-phu-kien').slug,
        feature1Title: 'Tư vấn cấu hình', feature1Desc: 'Theo nhu cầu và ngân sách', feature2Title: 'Thông tin rõ ràng', feature2Desc: 'Cấu hình, tình trạng và bảo hành', feature3Title: 'Giao hàng toàn quốc', feature3Desc: 'Báo phí trước khi xác nhận', feature4Title: 'Hỗ trợ sau mua', feature4Desc: 'Qua hotline và tại cửa hàng',
        bankTransferEnabled: false, codEnabled: true,
      });
      await request('settings', 'POST', { expectedRevision: settings.revision, document: settings.document });
      const currentProducts = await list('products'); const currentPosts = await list('posts');
      assert.equal(currentProducts.filter(p => p.isPublished).length, 100);
      assert.equal(currentPosts.filter(p => p.isPublished).length, 10);
      const brands = await list('brands');
      const brandIds = new Set(created.map(p => p.brandId).filter(Boolean));
      for (const brand of brands) {
        const status = brandIds.has(brand.id) ? 'ACTIVE' : 'INACTIVE';
        if (brand.status !== status) await request(`brands/${brand.id}`, 'PUT', { ...brand, status });
      }
      const homepage = await request('builder/home');
      const home = homepage.document;
      home.title = 'CitiLap - Chọn laptop đúng nhu cầu';
      home.seo.title = home.title;
      home.seo.description = settings.document.defaultSeoDescription;
      for (const section of home.sections) {
        const data = section.data;
        if (section.type === 'banner') { data.link = '/search'; data.buttonText = 'Khám phá sản phẩm'; }
        if (section.type === 'featured_categories') data.categoryIds = [...groups.slice(0, 4).map(g => g[0]), 'cat-phu-kien'];
        if (section.type === 'featured_brands') data.brandIds = [...brandIds];
        if (section.type === 'news_reviews') { data.postIds = currentPosts.filter(p => p.isPublished).slice(0, 4).map(p => p.id); data.categoryId = newsCategory.id; }
        if (section.type === 'product_grid') {
          const accessory = /accessor|phụ kiện/i.test(section.id + section.name);
          const categoryId = accessory ? 'cat-phu-kien' : /gaming/i.test(section.id + section.name) ? 'cat-gaming' : /best/i.test(section.id) ? 'cat-do-hoa' : 'cat-van-phong';
          data.sourceMode = 'manual';
          data.manualProductIds = created.filter(p => accessory ? p.template !== 'LAPTOP' : p.categoryId === categoryId).slice(0, 8).map(p => p.id);
          data.title = accessory ? 'Phụ kiện cho góc làm việc' : groups.find(g => g[0] === categoryId)[2];
          data.subtitle = 'Xem cấu hình và liên hệ để nhận báo giá phù hợp';
          data.badge = 'CitiLap chọn lọc'; data.rankNumbering = false;
          const href = '/category/' + d.categories.find(c => c.id === categoryId).slug;
          data.viewAllLink = href; data.links = [{ label: 'Xem tất cả', href }];
        }
      }
      await request('builder/home', 'PUT', { expectedRevision: homepage.revision, action: 'publish', document: home });
      writeFileSync(`${output}/${mode.slice(2)}-result.json`, JSON.stringify({ completedAt: new Date().toISOString(), products: created.map(p => ({ id: p.id, slug: p.slug, categoryId: p.categoryId })), posts: currentPosts.filter(p => p.isPublished).map(p => ({ id: p.id, slug: p.slug })), archivedProducts: old.length, backupCreated: false }, null, 2));
      console.log('PASS release content: 100 published products, 10 posts, policies, menu and settings');
    }
  }
} finally { if (mf) await mf.dispose(); sqlite.close(); }
