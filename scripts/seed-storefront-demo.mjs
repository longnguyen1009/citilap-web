import { DatabaseSync, backup } from 'node:sqlite';
import { readdirSync, realpathSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export function seedDemo(db) {
  const now = '2026-10-18T03:00:00.000Z';
  const insert = (table, data) => db.prepare(`INSERT INTO "${table}" (${Object.keys(data).map(k => `"${k}"`).join(',')}) VALUES (${Object.keys(data).map(() => '?').join(',')}) ON CONFLICT DO NOTHING`).run(...Object.values(data));
  const products = [
    ['thinkpad-t14', 'Lenovo ThinkPad T14 Gen 3', 'Lenovo', 'office', 15900000, 'USED', 'Core i5-1235U', 'Intel Iris Xe', 16, 512, 14, '1.5 kg', 'Văn phòng, lập trình, học tập', 'Không dành cho render 3D nặng'],
    ['elitebook-840', 'HP EliteBook 840 G9', 'HP', 'office', 16900000, 'LIKE_NEW', 'Core i5-1235U', 'Intel Iris Xe', 16, 512, 14, '1.4 kg', 'Văn phòng, di chuyển thường xuyên', 'Không có GPU rời'],
    ['latitude-5440', 'Dell Latitude 5440', 'Dell', 'office', 18500000, 'NEW', 'Core i5-1335U', 'Intel Iris Xe', 16, 512, 14, '1.4 kg', 'Học tập, Excel, lập trình', 'Cần kiểm tra đúng phiên bản màn hình'],
    ['ideapad-slim-5', 'Lenovo IdeaPad Slim 5', 'Lenovo', 'office', 19900000, 'NEW', 'Ryzen 7 7730U', 'AMD Radeon', 16, 512, 14, '1.5 kg', 'Văn phòng, học tập, đa nhiệm', 'RAM hàn; chọn đủ dung lượng khi mua'],
    ['zenbook-14', 'ASUS Zenbook 14 OLED', 'ASUS', 'office', 24900000, 'NEW', 'Core Ultra 5 125H', 'Intel Arc', 16, 1024, 14, '1.3 kg', 'Di chuyển, chỉnh ảnh, văn phòng', 'RAM hàn; màn bóng dễ phản chiếu'],
    ['macbook-air-m2', 'Apple MacBook Air M2', 'Apple', 'office', 22900000, 'LIKE_NEW', 'Apple M2', 'Apple M2 GPU', 16, 256, 13.6, '1.24 kg', 'Văn phòng, lập trình trên macOS', 'RAM/SSD không nâng cấp; kiểm tra phần mềm Windows'],
    ['loq-15', 'Lenovo LOQ 15', 'Lenovo', 'gaming', 21900000, 'NEW', 'Core i5-12450HX', 'RTX 4050 6GB', 16, 512, 15.6, '2.4 kg', 'Gaming, học kỹ thuật', 'Nặng khi mang cả sạc; hiệu năng cao cần cắm điện'],
    ['tuf-a15', 'ASUS TUF Gaming A15', 'ASUS', 'gaming', 25900000, 'NEW', 'Ryzen 7 7735HS', 'RTX 4060 8GB', 16, 512, 15.6, '2.2 kg', 'Gaming, dựng video', 'Quạt có thể rõ tiếng khi tải nặng'],
    ['legion-5', 'Lenovo Legion 5', 'Lenovo', 'gaming', 27900000, 'LIKE_NEW', 'Ryzen 7 7840HS', 'RTX 4060 8GB', 32, 1024, 16, '2.4 kg', 'Gaming, đồ họa, đa nhiệm', 'Ưu tiên hiệu năng hơn trọng lượng'],
    ['nitro-v15', 'Acer Nitro V15', 'Acer', 'gaming', 18900000, 'USED', 'Core i5-13420H', 'RTX 4050 6GB', 16, 512, 15.6, '2.1 kg', 'Gaming trong ngân sách', 'Kiểm tra màn hình trước khi làm màu chuyên nghiệp'],
    ['proart-16', 'ASUS ProArt 16', 'ASUS', 'creator', 35900000, 'NEW', 'Ryzen 9 7940HS', 'RTX 4070 8GB', 32, 1024, 16, '2.0 kg', 'Đồ họa, dựng video, render', 'Cần đối chiếu yêu cầu từng phần mềm'],
    ['zbook-studio', 'HP ZBook Studio', 'HP', 'creator', 29500000, 'USED', 'Core i7-12700H', 'RTX A2000 8GB', 32, 1024, 16, '1.8 kg', 'CAD, đồ họa kỹ thuật', 'Cần thử dự án thực tế trước khi chọn'],
  ];
  db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
  try {
    for (const [key, name] of [['office', 'Laptop học tập & văn phòng'], ['gaming', 'Laptop gaming'], ['creator', 'Laptop đồ họa'], ['accessories', 'Phụ kiện']]) insert('Category', { id: `demo-cat-${key}`, name: `[Mẫu] ${name}`, slug: `demo-${key}`, status: 'ACTIVE', updatedAt: now });
    insert('Warehouse', { id: 'demo-warehouse', name: 'Kho dữ liệu mẫu (không bán)', code: 'DEMO', updatedAt: now });
    let added = 0;
    for (const [key, model, brand, category, price, condition, cpu, gpu, ram, ssd, screen, weight, audience, limitation] of products) {
      const id = `demo-${key}`;
      if (db.prepare('SELECT id FROM Product WHERE id=?').get(id)) continue;
      const brandId = `demo-brand-${brand.toLowerCase()}`;
      insert('Brand', { id: brandId, name: `${brand} (mẫu)`, slug: brandId, status: 'ACTIVE', updatedAt: now });
      const specs = { CPU: cpu, GPU: gpu, RAM: `${ram}GB`, SSD: `${ssd}GB`, 'Màn hình': `${screen} inch`, 'Trọng lượng': weight, 'Phù hợp': audience, 'Hạn chế': limitation, 'Nâng cấp RAM': /macbook|zenbook|slim/.test(key) ? 'RAM hàn, không nâng cấp' : 'Cần xác minh khe và dung lượng tối đa theo SKU', 'Nâng cấp SSD': key.includes('macbook') ? 'Không nâng cấp' : 'Cần xác minh chuẩn ổ và khe trống', 'Nguồn dữ liệu': 'Dữ liệu mẫu; không phải cam kết cấu hình hay kết quả đo thực tế' };
      insert('Product', { id, name: `[Mẫu] ${model}`, slug: id, description: `DỮ LIỆU MẪU. ${audience}. ${limitation}. Giá, thông số và tình trạng chỉ để thử website.`, shortDescription: `Mẫu thử giao diện | ${cpu} | ${ram}GB | ${gpu}`, contentHtml: `<p><strong>Dữ liệu mẫu, không phải hàng đang bán. Ảnh là hình minh họa.</strong></p><h2>Phù hợp với ai?</h2><p>${audience}.</p><h2>Điểm cần cân nhắc</h2><p>${limitation}.</p><h2>Trước khi mua</h2><p>Xác minh SKU, khả năng nâng cấp và thử phần mềm thực tế. Thông số trong bản mẫu chưa được kiểm chứng theo máy.</p>`, brand, brandId, model, categoryId: `demo-cat-${category}`, condition, price, originalPrice: null, images: JSON.stringify(['/demo/laptop.svg']), stock: 1, status: 'ACTIVE', inventoryType: 'SERIAL', isFeatured: 1, isNewArrival: 1, cpu, gpu, ram: `${ram}GB`, ramGb: ram, storage: `${ssd}GB SSD`, storageGb: ssd, display: `${screen} inch`, screenSize: screen, specs: JSON.stringify(specs), tags: `demo,${category},${category === 'office' ? 'van phong,sinh vien,hoc tap' : category === 'creator' ? 'do hoa,cad,render' : 'gaming,game'}`, warranty: 'Mẫu bảo hành 6 tháng; không phải chính sách bán hàng', updatedAt: now });
      insert('SerialUnit', { id: `${id}-unit`, productId: id, warehouseId: 'demo-warehouse', serialNumber: `DEMO-${key.toUpperCase()}`, condition, status: 'AVAILABLE', warrantyMonths: 6, updatedAt: now });
      if (condition !== 'NEW') insert('ProductInspection', { serialUnitId: `${id}-unit`, publicCode: `DEMO-${key.toUpperCase()}`, checkedAt: now, batteryHealth: 88 + (added % 10), appearance: 'Mẫu: xước nhẹ góc vỏ; ảnh minh họa không thể hiện ngoại hình máy thật.', checks: 'Mẫu: màn hình, bàn phím, touchpad, Wi-Fi và cổng USB đã kiểm tra.', limitations: limitation, warranty: 'Mẫu: 6 tháng; cần xác nhận chính sách trước khi mua.', published: 1, isDemo: 1 });
      added++;
    }
    for (const [key, name, price] of [['mouse', 'Chuột Bluetooth', 390000], ['sleeve', 'Túi chống sốc 14 inch', 290000]]) insert('Product', { id: `demo-${key}`, name: `[Mẫu] ${name}`, slug: `demo-${key}`, description: 'Dữ liệu mẫu; xác minh kích thước/kết nối trước khi mua.', categoryId: 'demo-cat-accessories', price, status: 'ACTIVE', inventoryType: 'QUANTITY', stock: 0, images: JSON.stringify(['/demo/accessory.svg']), specs: '{}', tags: 'demo,accessory', updatedAt: now });
    insert('PostCategory', { id: 'demo-guides', name: 'Cẩm nang mẫu', slug: 'demo-cam-nang' });
    const posts = [
      ['chon-laptop-20-trieu', 'Chọn laptop 20 triệu theo công việc', 'Bắt đầu từ phần mềm, ngân sách và nhu cầu mang đi.', '<h2>Liệt kê công việc</h2><p>Ghi tên phần mềm, dung lượng dự án và yêu cầu từ nhà phát triển. Ưu tiên RAM cho đa nhiệm; GPU rời khi phần mềm thực sự cần.</p><h2>Tính cả chi phí sử dụng</h2><p>Kiểm tra khả năng nâng cấp, bảo hành và trọng lượng cả sạc. Không chọn chỉ dựa vào tên Core i7 hay Ryzen 7.</p>'],
      ['kiem-tra-laptop-cu', 'Checklist xem laptop cũ trước khi mua', 'Ngoại hình, màn hình, pin và khả năng nâng cấp cần kiểm tra riêng.', '<h2>Kiểm tra đúng chiếc máy</h2><p>Đối chiếu mã máy, ảnh thực tế, các vết xước và kết quả kiểm tra. Thử bàn phím, touchpad, loa, Wi-Fi và các cổng bạn dùng.</p><h2>Đọc báo cáo pin</h2><p>So sánh dung lượng sạc đầy với dung lượng thiết kế. Tỷ lệ sức khỏe pin không đồng nghĩa thời gian sử dụng; ghi ngày đo và điều kiện thử.</p><h2>Xác nhận chính sách</h2><p>Yêu cầu phạm vi bảo hành, điều kiện đổi trả và phụ kiện kèm máy bằng văn bản.</p>'],
      ['ram-hay-gpu', 'Nâng RAM hay chọn GPU mạnh hơn?', 'Chọn theo tác vụ thay vì chỉ nhìn tên cấu hình.', '<h2>Khi RAM quan trọng</h2><p>Nhiều ứng dụng cùng lúc và dự án lớn cần đủ RAM. Kiểm tra RAM hàn và khe trống trước khi quyết định nâng cấp.</p><h2>Khi GPU quan trọng</h2><p>Đối chiếu yêu cầu game, phần mềm render và VRAM. Hiệu năng còn phụ thuộc công suất và tản nhiệt.</p><h2>Thử trước khi mua</h2><p>Dùng dự án của bạn hoặc bài đo có điều kiện rõ ràng. Không suy ra FPS từ tên GPU.</p>'],
    ];
    for (const [key, title, excerpt, body] of posts) {
      const id = `demo-${key}`;
      if (db.prepare('SELECT id FROM Post WHERE id=?').get(id)) continue;
      const doc = JSON.stringify({ schemaVersion: 1, title: `[Mẫu] ${title}`, slug: id, excerpt, contentHtml: `<p><strong>Bài mẫu để duyệt nội dung trước khi xuất bản chính thức.</strong></p>${body}`, categoryId: 'demo-guides', authorName: 'CitiLap — nội dung mẫu', coverImage: null, isFeatured: true, seo: { title, description: excerpt, ogImageAssetId: null }, relatedProductIds: ['demo-thinkpad-t14', 'demo-loq-15'] });
      insert('Post', { id, slug: id, categoryId: 'demo-guides' });
      insert('PostStudio', { postId: id, draft: doc, published: doc, revision: 0, publishedRevision: 1, publishedAt: now, publicUpdatedAt: now });
      insert('PostStudioRevision', { postId: id, revision: 1, document: doc, action: 'publish', actor: 'local-demo-seed' });
      db.prepare('UPDATE PostStudio SET revision=1 WHERE postId=?').run(id);
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Foreign key check failed');
    db.exec('COMMIT');
    return { addedLaptops: added, products: db.prepare("SELECT count(*) AS n FROM Product WHERE id LIKE 'demo-%'").get().n };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] !== '--local') throw Error('Usage: node scripts/seed-storefront-demo.mjs --local (no remote mode)');
  const root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const candidates = readdirSync(root).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite').filter(f => {
    const db = new DatabaseSync(resolve(root, f), { readOnly: true });
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE name='ProductInspection'").get(); } finally { db.close(); }
  });
  if (candidates.length !== 1) throw Error('Expected exactly one local catalog with migration 0026; refusing ambiguous database selection.');
  const target = realpathSync(resolve(root, candidates[0]));
  const rel = relative(root, target);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error('Database escapes local state directory');
  const db = new DatabaseSync(target);
  try {
    mkdirSync('.wrangler/backups', { recursive: true });
    const backupPath = resolve('.wrangler/backups', `before-demo-${Date.now()}.sqlite`);
    await backup(db, backupPath);
    console.log('Backup:', backupPath);
    console.log(seedDemo(db));
  } finally { db.close(); }
}
