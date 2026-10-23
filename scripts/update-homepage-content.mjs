import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const mode = process.argv[2];
assert(['--local', '--check'].includes(mode), 'Use --local to update local CMS, or --check for read-only checks');
const registerHotSale = process.argv.includes('--register-hot-sale');
assert(!registerHotSale || mode === '--local', 'HOT SALE registration requires --local');
const root = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files = readdirSync(root).filter(f => f.endsWith('.sqlite')).filter(f => {
  const db = new DatabaseSync(`${root}/${f}`, { readOnly: true });
  try { return !!db.prepare("SELECT 1 FROM sqlite_master WHERE name='LandingPageStudio'").get(); } finally { db.close(); }
});
assert.equal(files.length, 1, 'Local CMS database ambiguous');
const sqlite = new DatabaseSync(`${root}/${files[0]}`, { readOnly: mode === '--check' });
sqlite.exec('PRAGMA busy_timeout=10000');
const DB = { prepare(sql) {
  let args = [];
  return { bind(...values) { args = values; return this; }, async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { const r = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; } };
}, async batch(statements) {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const result = []; for (const s of statements) result.push(await s.run()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} };
// ponytail: manual CMS collections cover current catalog; refresh with this script when models change.
const lines = [
  ['cat-gaming', 'lenovo-legion', 'Lenovo Legion', /legion/i, 'Gaming đa dụng, ưu tiên tản nhiệt và màn hình. Đối chiếu GPU, công suất và độ phân giải trên từng cấu hình.'],
  ['cat-gaming', 'lenovo-loq', 'Lenovo LOQ', /\bloq\b/i, 'Dòng gaming phổ thông cho học tập và chơi game. Kiểm tra RAM, GPU và khả năng nâng cấp trước khi chọn.'],
  ['cat-gaming', 'asus-rog', 'Asus ROG', /\brog\b/i, 'ROG Strix và Zephyrus dành cho gaming và sáng tạo. Khối lượng, GPU và màn hình khác nhau theo mã máy.'],
  ['cat-gaming', 'acer-nitro', 'Acer Nitro', /nitro/i, 'Laptop gaming phổ thông; đối chiếu GPU, màn hình và số khe RAM theo từng phiên bản.'],
  ['cat-gaming', 'acer-predator', 'Acer Predator', /predator/i, 'Dòng gaming hiệu năng cao; cân nhắc tản nhiệt, trọng lượng bộ sạc và nhu cầu di chuyển.'],
  ['cat-gaming', 'msi-gaming', 'MSI Gaming', /msi.*(katana|thin|gf63)/i, 'Katana và Thin/GF63 có thiết kế và giới hạn công suất khác nhau. Chọn theo game, màn hình và ngân sách.'],
  ['cat-gaming', 'hp-omen-victus', 'HP Omen & Victus', /\b(omen|victus)\b/i, 'Hai dòng gaming của HP; kiểm tra GPU, tần số quét, cổng kết nối và khả năng nâng cấp trên mã máy cụ thể.'],
  ['cat-gaming', 'dell-alienware', 'Dell Gaming & Alienware', /dell.*g15|alienware/i, 'Laptop gaming Dell và Alienware. So sánh cấu hình, kích thước, tản nhiệt và phụ kiện đi kèm.'],
  ['cat-gaming', 'gigabyte-gaming', 'Gigabyte Gaming & AERO', /gigabyte/i, 'Gaming A16 và AERO phục vụ chơi game, sáng tạo. Kiểm tra màu màn hình và GPU cho phần mềm đang dùng.'],
  ['cat-van-phong', 'dell-xps-latitude', 'Dell XPS & Latitude', /dell.*(xps|latitude)/i, 'XPS ưu tiên trải nghiệm màn hình, Latitude hướng đến công việc. Kiểm tra cổng, bàn phím và khả năng nâng cấp.'],
  ['cat-van-phong', 'lenovo-thinkpad-thinkbook', 'ThinkPad & ThinkBook', /thinkpad|thinkbook/i, 'Laptop làm việc, học tập và lập trình. Chọn theo bàn phím, kích thước, bộ nhớ và nhu cầu dùng màn hình ngoài.'],
  ['cat-van-phong', 'asus-zenbook-vivobook', 'Asus Zenbook & Vivobook', /zenbook|vivobook/i, 'Laptop cho học tập, văn phòng và di chuyển. Đối chiếu OLED/IPS, trọng lượng và RAM của từng máy.'],
  ['cat-van-phong', 'hp-elitebook-omnibook', 'HP EliteBook & OmniBook', /elitebook|omnibook/i, 'Các lựa chọn làm việc và xoay gập. Kiểm tra cảm ứng, bút, cổng kết nối và khả năng dùng phần mềm.'],
  ['cat-van-phong', 'acer-swift-aspire', 'Acer Swift & Aspire', /swift|aspire/i, 'Dòng mỏng nhẹ và phổ thông cho học tập, văn phòng. Cân nhắc RAM, SSD và kích thước màn hình.'],
  ['cat-van-phong', 'lg-gram', 'LG Gram', /\blg.*gram/i, 'Ưu tiên di chuyển và màn hình lớn. Kiểm tra trọng lượng, kích thước và tình trạng pin theo chiếc máy thực tế.'],
  ['cat-van-phong', 'samsung-galaxy-book', 'Samsung Galaxy Book', /galaxy.*book/i, 'Laptop Samsung cho công việc và di chuyển. Kiểm tra kiến trúc CPU, phần mềm tương thích và loại màn hình.'],
  ['cat-do-hoa', 'dell-precision', 'Dell Precision', /precision/i, 'Workstation cho CAD, dựng hình và công việc chuyên môn. Chọn CPU, VRAM và driver theo phần mềm cụ thể.'],
  ['cat-do-hoa', 'lenovo-thinkpad-p', 'Lenovo ThinkPad P', /thinkpad\s+p/i, 'Workstation ThinkPad P cho kỹ thuật, dựng hình. Đối chiếu GPU, RAM tối đa và số khe SSD.'],
  ['cat-do-hoa', 'hp-zbook', 'HP ZBook', /zbook/i, 'ZBook Studio và Fury cho sáng tạo, kỹ thuật. Kiểm tra GPU, độ phủ màu và khả năng nâng cấp từng cấu hình.'],
  ['cat-macbook', 'macbook-bac', 'MacBook màu bạc', /bạc/i, 'Các cấu hình MacBook màu bạc trong danh mục. Kiểm tra chip, RAM, SSD và phần mềm tương thích theo mã máy.'],
  ['cat-macbook', 'macbook-vang', 'MacBook vàng Citrus', /vàng/i, 'Các cấu hình MacBook vàng Citrus. Đối chiếu bộ nhớ, cổng kết nối và phụ kiện trước khi chọn.'],
  ['cat-macbook', 'macbook-hong', 'MacBook hồng', /hồng/i, 'Các cấu hình MacBook màu hồng. Chọn dung lượng bộ nhớ theo ứng dụng và dữ liệu cần lưu.'],
  ['cat-macbook', 'macbook-xanh', 'MacBook xanh Indigo', /xanh/i, 'Các cấu hình MacBook xanh Indigo. Xác nhận cấu hình, tình trạng và bảo hành khi tư vấn.'],
];
const products = sqlite.prepare("SELECT p.id,p.name,p.categoryId,s.published FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.status='ACTIVE' AND p.deletedAt IS NULL AND s.published IS NOT NULL ORDER BY p.createdAt DESC,p.id").all();
const collections = lines.map(([categoryId, slug, name, match, description]) => ({ id: `home-${slug}`, slug, name, description, visible: true, mode: 'manual', productIds: products.filter(p => p.categoryId === categoryId && match.test(p.name)).map(p => p.id), image: '', categoryId })).filter(c => c.productIds.length);
const navRow = () => sqlite.prepare("SELECT * FROM NavigationStudio WHERE id='site'").get();
const homeRow = () => sqlite.prepare("SELECT * FROM LandingPageStudio WHERE pageId='home'").get();
const history = () => JSON.stringify(['Order', 'OrderItem', 'SerialUnit', 'Product'].map(t => sqlite.prepare(`SELECT * FROM [${t}] ORDER BY id`).all().map(row => {
  if (registerHotSale && t === 'Product') { const { isFlashSale, updatedAt, ...rest } = row; return rest; }
  return row;
})));
const before = history();
const pricingBefore = JSON.stringify(sqlite.prepare('SELECT id,price,originalPrice,status FROM ProductVariant ORDER BY id').all());
let mf;
try {
  if (mode === '--local') {
    assert.equal(navRow().draft, navRow().published, 'Preserve unpublished navigation draft');
    assert.equal(homeRow().draft, homeRow().published, 'Preserve unpublished homepage draft');
    mkdirSync('.wrangler/backups', { recursive: true });
    const destination = `.wrangler/backups/before-homepage-${Date.now()}.sqlite`;
    await backup(sqlite, destination);
    console.log('Backup:', destination);
    await build({ stdin: { contents: `export * from './src/server/services/navigation.service'; export * from './src/server/services/site-builder.service'; export * from './src/server/services/post.service'; export { writeStudio } from './src/server/services/product-studio.service';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', external: ['node:*', 'cloudflare:workers'], outfile: 'scripts/.homepage-bundle.mjs', plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, a => ({ path: a.path, external: true })); } }] });
    const api = await import('./.homepage-bundle.mjs');
    mf = new Miniflare({ ...convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("local CMS")}}', compatibilityDate: '2026-10-01', r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' } }), resourcePersistencePath: resolve('.wrangler/state/v3') });
    const env = { DB, PRODUCT_MEDIA: await mf.getR2Bucket('PRODUCT_MEDIA') };
    if (registerHotSale) {
      const selected = ['cat-gaming', 'cat-van-phong', 'cat-do-hoa', 'cat-macbook'].flatMap(id => products.filter(p => p.categoryId === id).slice(0, id === 'cat-gaming' ? 4 : 2));
      assert.equal(selected.length, 10, 'Register ten laptops across four groups');
      const snapshots = selected.map(p => sqlite.prepare('SELECT * FROM ProductStudio WHERE productId=?').get(p.id));
      for (const row of snapshots) assert.equal(row.draft, row.published, 'Preserve unpublished product draft');
      for (const [i, row] of snapshots.entries()) {
        const document = JSON.parse(row.published);
        if (!document.isFlashSale) {
          await api.writeStudio(env, selected[i].id, { expectedRevision: row.revision, action: 'publish', document: { ...document, isFlashSale: true } });
          const published = sqlite.prepare('SELECT published FROM ProductStudio WHERE productId=?').get(selected[i].id).published;
          assert.deepEqual({ ...JSON.parse(published), isFlashSale: document.isFlashSale }, document, 'Only HOT SALE flag changes in published document');
          selected[i].published = published;
        }
        assert.equal(sqlite.prepare('SELECT isFlashSale FROM Product WHERE id=?').get(selected[i].id).isFlashSale, 1);
      }
      console.log('Registered HOT SALE:', selected.length, '(existing prices preserved)');
    }
    const nav = await api.navigationDetail(DB);
    nav.document.collections = [...nav.document.collections.filter(c => !c.id.startsWith('home-')), ...collections.map(({ categoryId, ...c }) => c)];
    const image = product => product ? '/api/library/' + JSON.parse(product.published).media[0].assetId : '';
    for (const c of nav.document.collections) c.image = image(products.find(p => c.productIds.includes(p.id)));
    for (const c of nav.document.categories.filter(c => c.visible)) {
      const children = nav.document.categories.filter(x => x.parentId === c.id).map(x => x.id);
      c.image = image(products.find(p => p.categoryId === c.id || children.includes(p.categoryId)));
    }
    const pathItem = (id, label, path) => ({ id, label, target: { kind: 'path', path } });
    nav.document.menus.main = [
      { ...pathItem('nav-hot-sale', 'HOT SALE', '/hot-sale'), children: [] },
      ...nav.document.menus.main.filter(i => i.target.kind !== 'path' || i.target.path !== '/hot-sale'),
    ];
    nav.document.menus.footer = [
      { ...pathItem('footer-policies', 'Chính sách khách hàng', '/chinh-sach-bao-hanh'), children: [
        ['warranty', 'Chính sách bảo hành', '/chinh-sach-bao-hanh'], ['returns', 'Đổi trả & hoàn tiền', '/chinh-sach-doi-tra'], ['shipping', 'Vận chuyển & giao nhận', '/chinh-sach-van-chuyen'], ['privacy', 'Bảo vệ thông tin cá nhân', '/chinh-sach-bao-mat'], ['terms', 'Điều khoản mua hàng', '/dieu-khoan-mua-hang'],
      ].map(([id, label, path]) => pathItem('footer-' + id, label, path)) },
      { ...pathItem('footer-about', 'Về CitiLap', '/gioi-thieu'), children: [
        ['intro', 'Giới thiệu CitiLap', '/gioi-thieu'], ['stores', 'Hệ thống cửa hàng', '/he-thong-cua-hang'], ['contact', 'Liên hệ CitiLap', '/lien-he'], ['guide', 'Hướng dẫn đặt hàng', '/huong-dan-mua-hang'], ['tracking', 'Tra cứu đơn hàng', '/order-tracking'], ['faq', 'Câu hỏi thường gặp', '/cau-hoi-thuong-gap'],
      ].map(([id, label, path]) => pathItem('footer-' + id, label, path)) },
    ];
    for (const item of nav.document.menus.main) {
      if (item.target.kind !== 'category') continue;
      const matched = collections.filter(c => c.categoryId === item.target.id);
      if (matched.length) item.children = matched.map(c => ({ id: `menu-${c.slug}`, label: c.name, target: { kind: 'collection', id: c.id } }));
    }
    if (JSON.stringify(nav.document) !== navRow().published) await api.writeNavigation(env, { expectedRevision: nav.revision, action: 'publish', document: nav.document });

    const existingPosts = sqlite.prepare('SELECT p.id,p.slug,s.published FROM Post p JOIN PostStudio s ON s.postId=p.id WHERE p.deletedAt IS NULL AND s.published IS NOT NULL').all();
    const editorial = [
      ['legion-hay-rog-chon-theo-nhu-cau', 'Lenovo Legion hay Asus ROG: chọn theo game và cách sử dụng', 'cat-gaming', /legion/i, [
        ['Bắt đầu từ trò chơi và nơi sử dụng', 'Legion và ROG là hai họ sản phẩm, không phải hai cấu hình cố định. Ghi lại game thường chơi, độ phân giải mong muốn và nhu cầu mang máy đi học, đi làm. ROG Zephyrus, ROG Strix và Legion có thiết kế khác nhau; không suy ra hiệu năng chỉ từ tên dòng.'],
        ['So sánh đúng GPU và công suất', 'Cùng tên GPU vẫn có thể khác công suất, tản nhiệt và chế độ vận hành. Đối chiếu mã GPU, VRAM, công suất do nhà sản xuất công bố và bộ sạc. Nếu cần FPS hay nhiệt độ, yêu cầu phép đo trên đúng mã máy, cùng game và thiết lập; bài này không đưa số đo benchmark.'],
        ['Màn hình, RAM và chi phí sử dụng', 'Chơi game cạnh tranh nên cân nhắc tần số quét và thời gian phản hồi. Làm ảnh hoặc video cần kiểm tra độ phủ màu. Kiểm tra RAM hàn hay có khe, số khe SSD, cổng xuất hình và trọng lượng cả bộ sạc.'],
        ['Chọn chiếc máy cụ thể', 'Gửi CitiLap tên game, phần mềm, ngân sách và nhu cầu di chuyển. Đối chiếu cấu hình, tình trạng, bảo hành và báo giá của từng máy trước khi đặt mua.'],
      ]],
      ['thinkpad-xps-zenbook-lam-viec', 'ThinkPad, Dell XPS hay Zenbook cho công việc hằng ngày?', 'cat-van-phong', /thinkpad|xps|zenbook/i, [
        ['Chọn bằng công việc thực tế', 'Với bảng tính, trình duyệt và họp trực tuyến, hãy tính số ứng dụng chạy cùng lúc, màn hình ngoài và nhu cầu di chuyển. Với lập trình, kiểm tra môi trường phát triển, máy ảo và khả năng nâng cấp RAM trước khi chọn CPU.'],
        ['Ba dòng máy, nhiều phiên bản', 'ThinkPad có nhiều phân khúc và thiết kế bàn phím; XPS có nhiều kích thước, thế hệ cổng kết nối; Zenbook có nhiều lựa chọn màn hình. Đánh giá theo mã cụ thể, tránh áp dụng ưu điểm của một đời cho cả dòng.'],
        ['RAM, màn hình và kết nối', '16 GB là điểm khởi đầu cho nhiều công việc; máy ảo, dữ liệu lớn hoặc đa nhiệm nặng có thể cần 32 GB trở lên. Kiểm tra RAM hàn, độ phân giải, tỷ lệ màn hình, cổng HDMI/USB-C và khả năng sạc qua cổng.'],
        ['Thử trước khi quyết định', 'Thử gõ văn bản, gọi video và kết nối màn hình đang dùng. Với máy đã qua sử dụng, đối chiếu tình trạng màn hình, bàn phím, pin, sạc và điều kiện bảo hành của đúng chiếc máy.'],
      ]],
      ['precision-thinkpad-p-zbook-cad', 'Precision, ThinkPad P và ZBook: checklist chọn máy chạy CAD, 3D', 'cat-do-hoa', /precision/i, [
        ['Liệt kê phần mềm và dự án', 'Ghi rõ phiên bản AutoCAD, SolidWorks, Revit, Blender hoặc phần mềm dựng phim đang dùng. Tác vụ dựng hình, render, mô phỏng và dựng phim có giới hạn khác nhau; cần đối chiếu yêu cầu của phần mềm thay vì chỉ chọn nhãn workstation.'],
        ['GPU và driver', 'Một số phần mềm kỹ thuật ưu tiên GPU và driver được chứng nhận; một số tác vụ render dùng CUDA hoặc dung lượng VRAM lớn. Kiểm tra danh sách tương thích của hãng phần mềm cho đúng phiên bản, GPU và driver.'],
        ['RAM, SSD và màn hình', 'Dự án lớn có thể cần RAM 32 GB trở lên, nhưng hãy đo nhu cầu từ tệp đang làm. Kiểm tra số khe RAM, dung lượng tối đa, số khe SSD và khả năng nâng cấp. Công việc màu sắc cần thông tin độ phủ màu, không chỉ độ phân giải.'],
        ['Kiểm tra máy thực tế', 'Nếu có thể, mang tệp dự án mẫu đã bỏ dữ liệu nhạy cảm để thử. Kiểm tra nhiệt độ, độ ổn định, cổng kết nối và bộ sạc. Hiệu năng cần phép thử trên cấu hình cụ thể; tên Precision, ThinkPad P hay ZBook không thay thế phép đo.'],
      ]],
    ];
    const ids = [];
    for (const [slug, title, categoryId, match, sections] of editorial) {
      const existing = existingPosts.find(p => p.slug === slug);
      if (existing) { ids.push(existing.id); continue; }
      const related = products.filter(p => p.categoryId === categoryId && match.test(p.name)).slice(0, 4);
      assert(related.length, title);
      const product = JSON.parse(related[0].published);
      const sourcePost = JSON.parse(existingPosts[0].published);
      const esc = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      const document = { schemaVersion: 1, slug, title, excerpt: sections[0][1], contentHtml: sections.map(([h, p]) => `<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join(''), categoryId: sourcePost.categoryId, authorName: 'Biên tập CitiLap', coverImage: { assetId: product.media[0].assetId, alt: title }, isFeatured: true, relatedProductIds: related.map(p => p.id), seo: { title: title.slice(0, 70), description: sections[0][1].slice(0, 160), ogImageAssetId: null } };
      const created = await api.writePost(env, null, { expectedRevision: 0, action: 'publish', document });
      ids.push(created.id);
    }
    ids.push(existingPosts.find(p => p.slug === 'kiem-tra-laptop-da-qua-su-dung').id);
    const homepage = await api.getLandingPageDetail(DB, 'home');
    const home = homepage.document;
    if (!home.sections.some(s => s.id === 'sec-macbook')) {
      const section = structuredClone(home.sections.find(s => s.type === 'product_grid'));
      section.id = 'sec-macbook'; section.name = 'Apple MacBook';
      Object.assign(section.data, { title: 'Apple MacBook', colorTheme: 'gray', viewAllLink: '/category/macbook', manualProductIds: products.filter(p => p.categoryId === 'cat-macbook').map(p => p.id) });
      home.sections.splice(home.sections.findIndex(s => s.type === 'news_reviews'), 0, section);
    }
    for (const section of home.sections) {
      const d = section.data;
      if (section.type === 'intro' && section.id === 'sec-features') { d.title = ''; d.subtitle = ''; }
      if (section.type === 'news_reviews') { d.title = 'CitiLap Media & Review'; d.subtitle = ''; d.postIds = ids; d.limit = 4; d.categoryId = ''; }
      if (section.type === 'product_grid') {
        d.badge = ''; d.subtitle = '';
        const category = nav.document.categories.find(c => '/category/' + c.slug === d.viewAllLink);
        const selected = collections.filter(c => c.categoryId === category?.id).slice(0, 5);
        d.links = selected.map(c => ({ label: c.name, href: '/collection/' + c.slug }));
        if (category?.id === 'cat-phu-kien') d.links = nav.document.categories.filter(c => c.parentId === category.id && c.visible).map(c => ({ label: c.name, href: '/category/' + c.slug }));
        d.links.push({ label: 'Xem tất cả', href: d.viewAllLink });
        if (section.id === 'sec-ultrabook') {
          const ids = collections.filter(c => ['dell-xps-latitude', 'asus-zenbook-vivobook', 'lg-gram'].includes(c.slug)).flatMap(c => c.productIds);
          d.title = 'Laptop mỏng nhẹ & cao cấp'; d.manualProductIds = [...new Set(ids)].slice(0, 10);
        }
      }
    }
    const base = structuredClone(home.sections.find(s => s.type === 'product_grid'));
    const productSection = (id, title, categoryId, colorTheme) => {
      const original = home.sections.find(s => s.type === 'product_grid' && s.data.viewAllLink === '/category/' + nav.document.categories.find(c => c.id === categoryId)?.slug);
      const section = structuredClone(original || base);
      section.id = id; section.name = title; delete section.data.tabs;
      Object.assign(section.data, { title, colorTheme, manualProductIds: products.filter(p => p.categoryId === categoryId).slice(0, 10).map(p => p.id) });
      return section;
    };
    const doc = p => JSON.parse(p.published);
    const laptops = products.filter(p => doc(p).template === 'LAPTOP');
    const sale = laptops.filter(p => { const d = doc(p); return d.isFlashSale || (d.price > 0 && d.originalPrice > d.price); });
    const clearance = laptops.filter(p => { const d = doc(p); return d.price > 0 && d.originalPrice > d.price; });
    const hot = structuredClone(base); hot.id = 'sec-hot-sale'; hot.name = 'HOT SALE'; delete hot.data.tabs;
    Object.assign(hot.data, { title: 'HOT SALE', colorTheme: 'red', manualProductIds: sale.slice(0, 10).map(p => p.id), links: [{ label: 'Tất cả ưu đãi', href: '/hot-sale' }], viewAllLink: '/hot-sale' });
    const combined = structuredClone(base); combined.id = 'sec-discover'; combined.name = 'Khám phá laptop';
    Object.assign(combined.data, { title: 'Khám phá laptop', manualProductIds: [], links: [], viewAllLink: '/search', tabs: [
      { id: 'new-arrivals', label: 'Laptop mới về', productIds: laptops.slice(0, 15).map(p => p.id), href: '/search?sort=newest' },
      { id: 'new', label: 'Laptop Mới', productIds: laptops.filter(p => doc(p).condition === 'NEW').slice(0, 15).map(p => p.id), href: '/search?condition=NEW' },
      { id: 'like-new', label: 'Laptop LikeNew', productIds: laptops.filter(p => ['LIKE_NEW', 'USED'].includes(doc(p).condition)).slice(0, 15).map(p => p.id), href: '/search?condition=LIKE_NEW' },
      { id: 'clearance', label: 'Xả hàng giá sốc', productIds: clearance.slice(0, 15).map(p => p.id), href: '/hot-sale' },
    ] });
    const categories = home.sections.find(s => s.id === 'sec-cats');
    const topCategories = ['cat-gaming', 'cat-van-phong', 'cat-do-hoa', 'cat-macbook', 'cat-phu-kien', 'ref-accessory-mouse-keyboard', 'ref-accessory-bag', 'ref-accessory-hub', 'ref-accessory-stand', 'ref-accessory-hardware'];
    Object.assign(categories.data, { title: '', subtitle: '', layout: 'cards', categoryIds: topCategories, items: topCategories.map(id => { const c = nav.document.categories.find(c => c.id === id); return { categoryId: id, customName: c.name, customImage: c.image, href: '/category/' + c.slug }; }) });
    const accessories = structuredClone(categories); accessories.id = 'sec-accessory-categories'; accessories.name = 'Phân loại phụ kiện';
    Object.assign(accessories.data, { title: 'Phụ kiện cho góc làm việc', layout: 'board', items: [
      ['ref-accessory-mouse-keyboard', 'Chuột không dây', /chuột/i, 'Chuột'], ['ref-accessory-mouse-keyboard', 'Bàn phím cơ', /bàn phím/i, 'Bàn phím'],
      ['ref-accessory-hardware', 'RAM laptop', /ram/i, 'RAM'], ['ref-accessory-hardware', 'Nâng cấp bộ nhớ', /ram/i, 'RAM'],
      ['ref-accessory-hub', 'Hub USB-C', /xd71/i, 'XD71'], ['ref-accessory-hub', 'Bộ chuyển đổi', /xd61/i, 'XD61'],
      ['ref-accessory-stand', 'Đế tản nhiệt', /cf300/i, 'CF300'], ['ref-accessory-stand', 'Tản nhiệt di động', /cf100/i, 'CF100'],
      ['ref-accessory-bag', 'Balo laptop Legion', /legion/i, 'Legion'], ['ref-accessory-bag', 'Balo laptop Acer', /acer/i, 'Acer'],
    ].map(([id, label, match, q]) => { const c = nav.document.categories.find(c => c.id === id); return { categoryId: id, customName: label, customImage: image(products.find(p => p.categoryId === id && match.test(p.name))), href: '/search?' + new URLSearchParams({ q }) }; }) });
    const media = home.sections.find(s => s.type === 'news_reviews');
    Object.assign(media.data, { title: 'Tin tức công nghệ mới', layout: 'grid', limit: 5, postIds: [...ids, existingPosts.find(p => p.slug === 'chon-laptop-gaming-gpu-tan-nhiet').id] });
    // Public examples read from https://www.youtube.com/@CellphoneSOfficial/videos on 2026-10-22.
    const videos = [
      ['4cg72WCwy6A', 'Đây là 3 laptop 10-15 Triệu nên mua khi giá Ram đang tăng'],
      ['2EVsSUdKn0c', '16 triệu mua Macbook Neo hay Laptop Windows hay cố lên Macbook Air M2? | CellphoneS'],
      ['wY-snKlVgyY', 'TOP 4 PHỤ KIỆN "KÈO QUỶ" GIÁ RẺ ĐÁNG MUA NHẤT 2026'],
      ['lYewv0OggGg', 'Xiaomi Pad 8 và iPad Gen 11: Đâu là lựa chọn TỐT NHẤT 2026? | CellphoneS'],
      ['MlDqfEnRyBg', 'DJI Pocket 4 Pro vs Insta360 Luna Ultra vs iPhone 17 Pro Max: Xem trước khi mua'],
    ].map(([id, title]) => ({ title, url: 'https://www.youtube.com/watch?v=' + id, thumbnail: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' }));
    const review = { id: 'sec-video-reviews', type: 'video_reviews', name: 'Video review', enabled: true, data: { type: 'video_reviews', title: 'Video review sản phẩm', videos } };
    const gallery = { id: 'sec-customers', type: 'customer_gallery', name: 'Hình ảnh khách hàng', enabled: true, data: { type: 'customer_gallery', title: 'Hình ảnh khách hàng tại CitiLap', images: ['02', '03', '04'].map((n, i) => ({ url: '/brand/store-photo-' + n + '.jpg', alt: ['Khách hàng trải nghiệm laptop tại CitiLap Hà Nội', 'Tư vấn và đối chiếu cấu hình tại cửa hàng Hà Nội', 'Không gian khách hàng xem và thử máy tại CitiLap Hà Nội'][i] })) } };
    home.sections = [
      ...home.sections.filter(s => ['sec-hero', 'sec-features'].includes(s.id)), categories, hot, combined,
      productSection('sec-gaming', 'Laptop Gaming', 'cat-gaming', 'red'),
      productSection('sec-office', 'Laptop Văn Phòng - Ultrabook Cao Cấp', 'cat-van-phong', 'blue'),
      productSection('sec-workstation', 'Máy Trạm Workstation - Đồ Họa & Kỹ Thuật', 'cat-do-hoa', 'gray'),
      productSection('sec-macbook', 'Apple - MacBook', 'cat-macbook', 'indigo'),
      ...home.sections.filter(s => s.type === 'product_grid' && s.data.viewAllLink === '/category/linh-kien').slice(0, 1).map(s => ({ ...s, data: { ...s.data, title: 'Phụ kiện Laptop' } })),
      accessories, review, media, gallery,
    ];
    if (JSON.stringify(home) !== homeRow().published) await api.writeLandingPage(env, 'home', { expectedRevision: homepage.revision, action: 'publish', document: home });
  }
  const nav = JSON.parse(navRow().published);
  const home = JSON.parse(homeRow().published);
  for (const c of collections) {
    const stored = nav.collections.find(x => x.id === c.id);
    assert(stored?.visible && stored.productIds.length, c.slug);
    assert.deepEqual(stored.productIds, c.productIds);
  }
  for (const id of ['cat-gaming', 'cat-van-phong', 'cat-do-hoa']) assert(nav.menus.main.find(i => i.target.id === id).children.length >= 3);
  for (const section of home.sections.filter(s => s.type === 'product_grid')) { assert.equal(section.data.badge, ''); assert.equal(section.data.subtitle, ''); }
  assert.equal(nav.menus.main[0].target.path, '/hot-sale');
  assert.deepEqual(home.sections.filter(s => s.type === 'product_grid').map(s => s.id), ['sec-hot-sale', 'sec-discover', 'sec-gaming', 'sec-office', 'sec-workstation', 'sec-macbook', 'sec-accessories']);
  assert.equal(home.sections.find(s => s.id === 'sec-cats').data.items.length, 10);
  for (const section of home.sections.filter(s => s.type === 'featured_categories')) for (const item of section.data.items) assert(item.customImage, item.customName);
  assert.equal(home.sections.find(s => s.id === 'sec-discover').data.tabs.length, 4);
  const tabs = home.sections.find(s => s.id === 'sec-discover').data.tabs;
  const byId = new Map(products.map(p => [p.id, JSON.parse(p.published)]));
  for (const tab of tabs) for (const id of tab.productIds) {
    const p = byId.get(id); assert(p, 'Only published products in tabs');
    if (tab.id === 'new') assert.equal(p.condition, 'NEW');
    if (tab.id === 'like-new') assert(['LIKE_NEW', 'USED'].includes(p.condition));
    if (tab.id === 'clearance') assert(p.price > 0 && p.originalPrice > p.price);
  }
  assert.equal(new Set(home.sections.map(s => s.id)).size, home.sections.length);
  assert.equal(home.sections.at(-1).type, 'customer_gallery');
  assert.equal(home.sections.at(-1).data.images.length, 3);
  assert.equal(home.sections.find(s => s.type === 'video_reviews').data.videos.length, 5);
  assert(!home.sections.some(s => ['cta', 'featured_brands'].includes(s.type)));
  const intro = home.sections.find(s => s.id === 'sec-features'); assert.equal(intro.data.title, ''); assert.equal(intro.data.subtitle, '');
  const media = home.sections.find(s => s.type === 'news_reviews'); assert.equal(media.data.postIds.length, 5);
  for (const id of media.data.postIds) assert(sqlite.prepare('SELECT 1 FROM PostStudio WHERE postId=? AND published IS NOT NULL').get(id));
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(history(), before, 'Commerce history and products unchanged');
  assert.equal(JSON.stringify(sqlite.prepare('SELECT id,price,originalPrice,status FROM ProductVariant ORDER BY id').all()), pricingBefore, 'Variant pricing unchanged');
  console.log('PASS homepage CMS:', { collections: collections.length, editorialCards: 5, productBlocks: home.sections.filter(s => s.type === 'product_grid').length, history: 'unchanged', foreignKeys: 'PASS' });
} finally { if (mf) await mf.dispose(); sqlite.close(); }
