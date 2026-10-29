import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = process.cwd();
const D1_DIR = path.join(ROOT, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const REVIEW_DATA_PATH = path.join(ROOT, '.wrangler/review-data.json');

function findSqlitePath() {
  const files = fs.readdirSync(D1_DIR).filter((f) => f.endsWith('.sqlite'));
  if (files.length === 0) {
    throw new Error(`No .sqlite file found in ${D1_DIR}`);
  }
  // Pick the largest sqlite file (main D1 database)
  files.sort(
    (a, b) =>
      fs.statSync(path.join(D1_DIR, b)).size - fs.statSync(path.join(D1_DIR, a)).size
  );
  return path.join(D1_DIR, files[0]);
}

const REVIEW_VIDEOS = [
  {
    id: 'vid-yt-1',
    title: '10 Bước Setup Laptop Gaming Mới - Tránh Những Sai Lầm Này!',
    thumbnail: 'https://i.ytimg.com/vi/KsQTEyLOC6M/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=KsQTEyLOC6M',
    platform: 'youtube',
  },
  {
    id: 'vid-yt-2',
    title: 'Top 3 Laptop Lenovo: Trùm Cuối Cao Cấp Bậc Nhất!',
    thumbnail: 'https://i.ytimg.com/vi/yuo-RIQeWeI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=yuo-RIQeWeI',
    platform: 'youtube',
  },
  {
    id: 'vid-yt-3',
    title: 'Đánh Giá ASUS Zenbook 14 OLED: Mỏng Nhẹ, Pin Trâu, Màn Hình Xuất Sắc',
    thumbnail: 'https://i.ytimg.com/vi/0U86x0l2j1E/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=0U86x0l2j1E',
    platform: 'youtube',
  },
  {
    id: 'vid-yt-4',
    title: 'Đánh Giá Lenovo Legion Slim 5: Chiếc Laptop Gaming Toàn Diện Nhất Tầm Giá',
    thumbnail: 'https://i.ytimg.com/vi/y6d99X9gP9s/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=y6d99X9gP9s',
    platform: 'youtube',
  },
  {
    id: 'vid-yt-5',
    title: 'ThinkPad X1 Carbon Gen 11: Chuẩn Mực Laptop Doanh Nhân Bền Bỉ',
    thumbnail: 'https://i.ytimg.com/vi/nU_S2h0uA58/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=nU_S2h0uA58',
    platform: 'youtube',
  },
  {
    id: 'vid-tt-1',
    title: 'CitiLap.vn — Kiểm định thực tế 12 bước trước khi bàn giao máy tại Showroom',
    thumbnail: '/brand/store-photo-01.jpg',
    url: 'https://www.tiktok.com/@citilapvn',
    platform: 'tiktok',
  },
  {
    id: 'vid-tt-2',
    title: 'CitiLap.vn — Tư vấn chọn laptop sinh viên & văn phòng chuẩn nhu cầu, lỗi 1 đổi 1 7 ngày',
    thumbnail: '/brand/store-photo-02.jpg',
    url: 'https://www.tiktok.com/@citilapvn',
    platform: 'tiktok',
  },
];

const TESTIMONIALS = [
  {
    name: 'Anh Minh Hoàng',
    role: 'Kỹ sư Phần mềm — Hà Nội',
    product: 'Lenovo ThinkPad X1 Carbon Gen 11',
    text: 'Mình lấy chiếc ThinkPad X1 Carbon Gen 11 tại showroom Tạ Quang Bửu. Máy đẹp đúng chuẩn kiểm định, pin 98%, nhân viên cho kiểm tra mainboard tại chỗ và bảo hành lỗi 1 đổi 1 trong 7 ngày đầu tiên rất yên tâm.',
    rating: 5,
  },
  {
    name: 'Chị Thu Trang',
    role: 'Chuyên viên Marketing — Bắc Ninh',
    product: 'Apple MacBook Air M3',
    text: 'Mua MacBook Air tại cơ sở Trần Hưng Đạo - Bắc Ninh được hỗ trợ cài full bộ phần mềm thiết kế miễn phí. Rất ưng dịch vụ hậu mãi và vệ sinh máy trọn đời của CitiLap.',
    rating: 5,
  },
  {
    name: 'Bạn Đức Anh',
    role: 'Sinh viên ĐH Bách Khoa Hà Nội',
    product: 'Lenovo Legion 5',
    text: 'Đặt chiếc Lenovo Legion 5 để học lập trình và đồ họa. Giá tại CitiLap cực tốt, có sẵn mã kiểm định Public Code tra cứu trực tuyến minh bạch từ tình trạng pin tới màn hình.',
    rating: 5,
  },
  {
    name: 'Anh Quốc Khánh',
    role: 'Quản lý Dự án — Cầu Giấy, Hà Nội',
    product: 'Dell XPS 13 Plus',
    text: 'Giao hàng nội thành Hà Nội siêu tốc trong chưa đầy 2 tiếng, được đồng kiểm test máy kỹ càng trước khi thanh toán VietQR. Sẽ tiếp tục ủng hộ CitiLap cho văn phòng công ty.',
    rating: 5,
  },
];

const ACCESSORY_FIXES = [
  {
    matchSlug: 'chuot-khong-day-dareu-lm106g',
    template: 'MOUSE',
    price: 165000,
    originalPrice: 220000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      connection: 'Wireless 2.4GHz (USB Receiver)',
      dpi: '1200 DPI Optical',
      battery: '1 viên pin AA (4-6 tháng)',
      compatibility: 'Windows, macOS, ChromeOS',
      weight: '65g nhỏ gọn công thái học',
    },
  },
  {
    matchSlug: 'ban-phim-co-dareu-ek75',
    template: 'KEYBOARD',
    price: 690000,
    originalPrice: 850000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      layout: '75% (80 phím) có núm xoay âm lượng',
      switchType: 'DareU Dream Switch (Linear êm ái)',
      connection: 'USB Type-C tháo rời',
      backlight: 'LED Rainbow nhiều chế độ',
      keycap: 'ABS Double-shot siêu bền',
    },
  },
  {
    matchSlug: 'ram-laptop-sk-hynix-8gb-ddr5-5600mhz',
    template: 'HARDWARE',
    price: 680000,
    originalPrice: 820000,
    warranty: '36 tháng 1 đổi 1, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      capacity: '8GB DDR5 SO-DIMM',
      busSpeed: '5600MHz (PC5-44800)',
      voltage: '1.1V tiết kiệm điện',
      compatibility: 'Laptop Intel Gen 12/13/14 & AMD Ryzen 6000/7000/8000',
    },
  },
  {
    matchSlug: 'ram-laptop-samsung-16gb-ddr5-5600mhz',
    template: 'HARDWARE',
    price: 1350000,
    originalPrice: 1590000,
    warranty: '36 tháng 1 đổi 1, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      capacity: '16GB DDR5 SO-DIMM',
      busSpeed: '5600MHz (PC5-44800)',
      voltage: '1.1V chuẩn JEDEC',
      compatibility: 'Laptop Gaming & Đồ họa đời mới hỗ trợ DDR5',
    },
  },
  {
    matchSlug: 'cong-chuyen-doi-rapoo-xd61',
    template: 'HUB',
    price: 450000,
    originalPrice: 590000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      ports: '5-in-1: HDMI 4K@30Hz, 3x USB-A 3.0, USB-C PD 100W',
      material: 'Vỏ hợp kim nhôm tản nhiệt',
      connector: 'USB Type-C (MacBook, ThinkPad, Zenbook, XPS)',
    },
  },
  {
    matchSlug: 'cong-chuyen-doi-rapoo-xd71',
    template: 'HUB',
    price: 690000,
    originalPrice: 890000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      ports: '7-in-1: HDMI 4K, LAN RJ45 Gigabit, SD/TF, 2x USB 3.0, PD 100W',
      material: 'Hợp kim nhôm nguyên khối CNC',
      connector: 'USB Type-C chuẩn Plug & Play',
    },
  },
  {
    matchSlug: 'de-tan-nhiet-laptop-rapoo-cf100',
    template: 'STAND',
    price: 290000,
    originalPrice: 390000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      cooling: '2 quạt lớn 140mm siêu êm kèm LED xanh',
      adjustment: '4 nấc điều chỉnh góc nghiêng công thái học',
      compatibility: 'Laptop từ 13 inch đến 17.3 inch',
    },
  },
  {
    matchSlug: 'de-tan-nhiet-laptop-rapoo-cf300',
    template: 'STAND',
    price: 490000,
    originalPrice: 650000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      cooling: '6 quạt tốc độ cao làm mát toàn diện cho Laptop Gaming',
      adjustment: '5 góc nâng + màn hình điều tốc quạt',
      compatibility: 'Laptop từ 14 inch đến 18 inch',
    },
  },
  {
    matchSlug: 'gia-do-laptop-nhom-hyperwork-l01',
    template: 'STAND',
    price: 390000,
    originalPrice: 490000,
    warranty: '12 tháng chính hãng, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
    specs: {
      material: 'Hợp kim nhôm hàng không + đệm Silicon chống trượt',
      loadCapacity: 'Chịu tải tới 10kg, gấp gọn tiện lợi',
      compatibility: 'MacBook & Laptop 11 – 17.3 inch',
    },
  },
];

function main() {
  const sqlitePath = findSqlitePath();
  const backupDir = path.join(ROOT, '.wrangler/backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'citilap-pre-seed.sqlite');
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(sqlitePath, backupPath);
    console.log(`Backed up SQLite DB to ${backupPath}`);
  }

  const db = new DatabaseSync(sqlitePath);
  const nowIso = new Date().toISOString();

  // 1. Update SiteSettings
  const siteRow = db.prepare(`SELECT revision, document FROM SiteSettings WHERE id = 'site'`).get();
  if (siteRow) {
    const doc = JSON.parse(siteRow.document || '{}');
    doc.youtubeUrl = 'https://www.youtube.com/@thinkview/videos';
    doc.tiktokUrl = 'https://www.tiktok.com/@citilapvn';
    doc.moitBadgeEnabled = true;
    doc.moitBadgeUrl = 'https://online.gov.vn/nen-tang/9e483b5c-7da9-4159-bd80-2caab3d942e4';
    doc.feature3Desc = 'Bảo hành theo gói, lỗi 1 đổi 1 trong 7 ngày đầu tiên';
    doc.reviewVideos = REVIEW_VIDEOS;
    doc.testimonials = TESTIMONIALS;
    db.prepare(`UPDATE SiteSettings SET document = ?, updatedAt = ? WHERE id = 'site'`).run(
      JSON.stringify(doc),
      nowIso
    );
    console.log('✓ Updated SiteSettings (MOIT URL, ThinkView YouTube, @citilapvn TikTok, 7-day exchange, testimonials)');
  }

  // 2. Update LandingPageStudio (pageId = 'home')
  const homeStudio = db
    .prepare(`SELECT draft, published FROM LandingPageStudio WHERE pageId = 'home'`)
    .get();
  if (homeStudio) {
    const updateHomeDoc = (rawStr) => {
      if (!rawStr) return rawStr;
      const doc = JSON.parse(rawStr);
      if (Array.isArray(doc.sections)) {
        for (const sec of doc.sections) {
          if (sec.type === 'video_reviews') {
            sec.title = 'Góc Review & Trải Nghiệm Thực Tế';
            sec.subtitle = 'Tổng hợp video đánh giá chuyên sâu và kiểm định máy thực tế tại CitiLap';
            sec.videos = REVIEW_VIDEOS;
          }
          if (sec.type === 'customer_gallery' && Array.isArray(sec.images)) {
            const seen = new Set();
            sec.images = sec.images.filter((img) => {
              if (!img?.url || seen.has(img.url)) return false;
              seen.add(img.url);
              return true;
            });
          }
        }
      }
      return JSON.stringify(doc);
    };
    db.prepare(`UPDATE LandingPageStudio SET draft = ?, published = ?, updatedAt = ? WHERE pageId = 'home'`).run(
      updateHomeDoc(homeStudio.draft),
      updateHomeDoc(homeStudio.published),
      nowIso
    );
    console.log('✓ Updated LandingPageStudio home (video_reviews & deduplicated customer_gallery)');
  }

  // 3. Fix NavigationStudio Apple MacBook children & Category rows
  const navRow = db.prepare(`SELECT draft, published FROM NavigationStudio WHERE id = 'main'`).get();
  if (navRow) {
    const fixNavDoc = (rawStr) => {
      if (!rawStr) return rawStr;
      let fixed = rawStr
        .replace(/MacBook vàng Citrus/g, 'MacBook Air')
        .replace(/macbook-vang-citrus/g, 'macbook-air')
        .replace(/MacBook xanh Indigo/g, 'MacBook Pro')
        .replace(/macbook-xanh-indigo/g, 'macbook-pro');
      return fixed;
    };
    db.prepare(`UPDATE NavigationStudio SET draft = ?, published = ?, updatedAt = ? WHERE id = 'main'`).run(
      fixNavDoc(navRow.draft),
      fixNavDoc(navRow.published),
      nowIso
    );
    db.prepare(`UPDATE Category SET name = 'MacBook Air', slug = 'macbook-air' WHERE slug = 'macbook-vang-citrus'`).run();
    db.prepare(`UPDATE Category SET name = 'MacBook Pro', slug = 'macbook-pro' WHERE slug = 'macbook-xanh-indigo'`).run();
    console.log('✓ Fixed Apple MacBook subcategories in NavigationStudio & Category');
  }

  // 4. Normalize Brand logos
  const brands = db.prepare(`SELECT id, logo FROM Brand WHERE logo IS NOT NULL`).all();
  for (const b of brands) {
    if (b.logo && !b.logo.startsWith('/') && !b.logo.startsWith('http')) {
      db.prepare(`UPDATE Brand SET logo = ? WHERE id = ?`).run('/' + b.logo, b.id);
    }
  }
  console.log('✓ Normalized Brand logo paths');

  // 5. Fix p-thinkpad-x1-gen11 draft template & Normalize all Accessory products
  const x1Studio = db
    .prepare(`SELECT draft, published FROM ProductStudio WHERE productId = 'p-thinkpad-x1-gen11'`)
    .get();
  if (x1Studio) {
    const fixX1 = (rawStr) => {
      if (!rawStr) return rawStr;
      const doc = JSON.parse(rawStr);
      doc.template = 'LAPTOP';
      return JSON.stringify(doc);
    };
    db.prepare(`UPDATE ProductStudio SET draft = ?, published = ? WHERE productId = 'p-thinkpad-x1-gen11'`).run(
      fixX1(x1Studio.draft),
      fixX1(x1Studio.published)
    );
  }

  for (const acc of ACCESSORY_FIXES) {
    const prod = db
      .prepare(`SELECT id, name, slug FROM Product WHERE slug LIKE ? LIMIT 1`)
      .get(`%${acc.matchSlug}%`);
    if (!prod) continue;

    db.prepare(
      `UPDATE Product
       SET price = ?, originalPrice = ?, stock = 25, warranty = ?, inventoryType = 'QUANTITY',
           cpu = NULL, cpuSeries = NULL, gpu = NULL, gpuSeries = NULL,
           ram = NULL, ramGb = NULL, storage = NULL, storageGb = NULL,
           display = NULL, screenSize = NULL, refreshRate = NULL,
           specs = ?, updatedAt = ?
       WHERE id = ?`
    ).run(acc.price, acc.originalPrice, acc.warranty, JSON.stringify(acc.specs), nowIso, prod.id);

    db.prepare(
      `UPDATE ProductVariant
       SET price = ?, originalPrice = ?, stock = 25,
           cpu = NULL, gpu = NULL, ram = NULL, storage = NULL, display = NULL,
           updatedAt = ?
       WHERE productId = ?`
    ).run(acc.price, acc.originalPrice, nowIso, prod.id);

    const studio = db
      .prepare(`SELECT draft, published FROM ProductStudio WHERE productId = ?`)
      .get(prod.id);
    if (studio) {
      const fixAccStudio = (rawStr) => {
        if (!rawStr) return rawStr;
        const doc = JSON.parse(rawStr);
        doc.template = ['STAND', 'HARDWARE'].includes(acc.template) ? 'ACCESSORY' : acc.template;
        doc.price = acc.price;
        doc.originalPrice = acc.originalPrice;
        doc.stock = 25;
        doc.availability = 'AVAILABLE';
        doc.warranty = acc.warranty;
        doc.specs = Object.entries(acc.specs).map(([key, value]) => ({ key, value: String(value) }));
        if (Array.isArray(doc.variants)) {
          doc.variants = doc.variants.map((v) => ({
            ...v,
            price: acc.price,
            originalPrice: acc.originalPrice,
            stock: 25,
            availability: 'AVAILABLE',
          }));
        }
        return JSON.stringify(doc);
      };
      db.prepare(`UPDATE ProductStudio SET draft = ?, published = ?, updatedAt = ? WHERE productId = ?`).run(
        fixAccStudio(studio.draft),
        fixAccStudio(studio.published),
        nowIso,
        prod.id
      );
    }
  }
  console.log('✓ Normalized accessory products (templates, VND prices, specs, stock)');

  // 6. Unify 7-day 1-for-1 exchange in PageStudio static pages
  const pages = db.prepare(`SELECT pageId, draft, published FROM PageStudio`).all();
  for (const p of pages) {
    const unifyPolicyText = (rawStr) => {
      if (!rawStr) return rawStr;
      return rawStr
        .replace(/1 đổi 1 trong 15 ngày/gi, '1 đổi 1 trong 7 ngày đầu tiên')
        .replace(/15 ngày đổi trả/gi, '7 ngày đầu tiên lỗi 1 đổi 1');
    };
    db.prepare(`UPDATE PageStudio SET draft = ?, published = ? WHERE pageId = ?`).run(
      unifyPolicyText(p.draft),
      unifyPolicyText(p.published),
      p.pageId
    );
  }
  console.log('✓ Unified 7-day 1-for-1 return policy across PageStudio documents');

  // 7. Normalize Warehouses & Seed SerialUnits + ProductInspections + InventoryBalances
  const whRows = db.prepare(`SELECT id, code FROM Warehouse ORDER BY id ASC`).all();
  let whHnId = 'wh-hn';
  let whBnId = 'wh-bn';

  if (whRows.length >= 1) {
    whHnId = whRows[0].id;
    db.prepare(
      `UPDATE Warehouse SET name = 'Showroom Hà Nội (Tạ Quang Bửu)', status = 'ACTIVE', address = 'Số 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội', sortOrder = 1, updatedAt = ? WHERE id = ?`
    ).run(nowIso, whHnId);
  } else {
    db.prepare(
      `INSERT INTO Warehouse (id, code, name, status, address, sortOrder, createdAt, updatedAt)
       VALUES (?, 'HN-TQB', 'Showroom Hà Nội (Tạ Quang Bửu)', 'ACTIVE', 'Số 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội', 1, ?, ?)`
    ).run(whHnId, nowIso, nowIso);
  }

  if (whRows.length >= 2) {
    whBnId = whRows[1].id;
    db.prepare(
      `UPDATE Warehouse SET name = 'Showroom Bắc Ninh (Trần Hưng Đạo)', status = 'ACTIVE', address = 'Số 40 Trần Hưng Đạo, Phường Võ Cường, TP. Bắc Ninh', sortOrder = 2, updatedAt = ? WHERE id = ?`
    ).run(nowIso, whBnId);
  } else {
    db.prepare(
      `INSERT INTO Warehouse (id, code, name, status, address, sortOrder, createdAt, updatedAt)
       VALUES (?, 'BN-THD', 'Showroom Bắc Ninh (Trần Hưng Đạo)', 'ACTIVE', 'Số 40 Trần Hưng Đạo, Phường Võ Cường, TP. Bắc Ninh', 2, ?, ?)`
    ).run(whBnId, nowIso, nowIso);
  }

  if (whRows.length >= 3) {
    db.prepare(
      `UPDATE Warehouse SET name = 'Kho trung chuyển phía Nam', status = 'INACTIVE', address = 'Số 552 Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh', sortOrder = 3, updatedAt = ? WHERE id = ?`
    ).run(nowIso, whRows[2].id);
  }

  // Seed SerialUnits & ProductInspections for top laptops
  const laptops = db
    .prepare(
      `SELECT p.id, p.name, p.slug, p.condition,
              (SELECT v.id FROM ProductVariant v WHERE v.productId = p.id ORDER BY v.createdAt ASC LIMIT 1) as variantId
       FROM Product p
       WHERE p.deletedAt IS NULL AND p.status = 'ACTIVE' AND p.cpu IS NOT NULL
       ORDER BY p.createdAt ASC
       LIMIT 8`
    )
    .all();

  const SEED_SERIALS = [
    { suffix: '01', serial: 'PF4X1G11A', code: 'CTL-X1G11-01', pin: 98, wh: 'HN' },
    { suffix: '02', serial: 'PF4X1G11B', code: 'CTL-X1G11-02', pin: 96, wh: 'BN' },
    { suffix: '03', serial: 'MP2LEG501', code: 'CTL-LEGION-01', pin: 97, wh: 'HN' },
    { suffix: '04', serial: 'C02MACM3A', code: 'CTL-MACM3-01', pin: 100, wh: 'HN' },
    { suffix: '05', serial: 'R90ZEN14A', code: 'CTL-ZEN14-01', pin: 99, wh: 'BN' },
    { suffix: '06', serial: '5CGXPS13A', code: 'CTL-XPS13-01', pin: 95, wh: 'HN' },
    { suffix: '07', serial: 'PF3T14G4A', code: 'CTL-T14G4-01', pin: 97, wh: 'BN' },
    { suffix: '08', serial: 'NX8LOQ15A', code: 'CTL-LOQ15-01', pin: 99, wh: 'HN' },
  ];

  for (let i = 0; i < Math.min(laptops.length, SEED_SERIALS.length); i++) {
    const lap = laptops[i];
    const cfg = SEED_SERIALS[i];
    const targetWh = cfg.wh === 'BN' ? whBnId : whHnId;
    const suId = `su-seed-${cfg.suffix}`;

    db.prepare(
      `INSERT INTO SerialUnit (id, productId, variantId, warehouseId, serialNumber, condition, status, warrantyMonths, notes, receivedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', 12, 'Máy tuyển chọn đã qua 12 bước QC CitiLap', ?, ?, ?)
       ON CONFLICT(serialNumber) DO UPDATE SET
         productId = excluded.productId,
         variantId = excluded.variantId,
         warehouseId = excluded.warehouseId,
         status = 'AVAILABLE',
         updatedAt = excluded.updatedAt`
    ).run(
      suId,
      lap.id,
      lap.variantId || null,
      targetWh,
      cfg.serial,
      lap.condition || 'LIKE_NEW',
      nowIso,
      nowIso,
      nowIso
    );

    const actualSu = db
      .prepare(`SELECT id FROM SerialUnit WHERE serialNumber = ?`)
      .get(cfg.serial);

    if (actualSu) {
      db.prepare(
        `INSERT INTO ProductInspection (serialUnitId, publicCode, checkedAt, batteryHealth, appearance, checks, limitations, warranty, published, isDemo, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
         ON CONFLICT(serialUnitId) DO UPDATE SET
           publicCode = excluded.publicCode,
           batteryHealth = excluded.batteryHealth,
           appearance = excluded.appearance,
           checks = excluded.checks,
           warranty = excluded.warranty,
           published = 1,
           updatedAt = excluded.updatedAt`
      ).run(
        actualSu.id,
        cfg.code,
        '2026-10-25T09:00:00.000Z',
        cfg.pin,
        'Ngoại hình 99% tuyển chọn, bản lề chắc chắn, màn hình sáng đẹp không điểm chết.',
        'Đạt 12/12 hạng mục kiểm định phần cứng CitiLap: Mainboard nguyên bản, CPU/GPU stress test ổn định, SSD Good 100%, Bàn phím, Trackpad, Wifi 6E, Webcam, Loa, Cổng Type-C/HDMI, Sạc zin chính hãng.',
        'Không có lỗi kỹ thuật; xước lông mèo cực nhẹ dưới đáy máy không đáng kể.',
        'Bảo hành 12 tháng tại CitiLap, lỗi 1 đổi 1 trong 7 ngày đầu tiên',
        nowIso
      );
    }
  }

  // Ensure InventoryBalance rows exist for active variants
  const activeVariants = db
    .prepare(
      `SELECT v.id as variantId, v.productId, v.stock
       FROM ProductVariant v
       JOIN Product p ON p.id = v.productId
       WHERE p.deletedAt IS NULL AND p.status = 'ACTIVE'`
    )
    .all();

  for (const v of activeVariants) {
    const hnQty = Math.max(2, Math.ceil((v.stock || 5) * 0.6));
    const bnQty = Math.max(1, Math.floor((v.stock || 5) * 0.4));
    db.prepare(
      `INSERT INTO InventoryBalance (id, warehouseId, productId, variantId, onHand, reserved, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(warehouseId, variantId) DO UPDATE SET onHand = excluded.onHand, updatedAt = excluded.updatedAt`
    ).run(`ib-hn-${v.variantId}`, whHnId, v.productId, v.variantId, hnQty, nowIso, nowIso);

    db.prepare(
      `INSERT INTO InventoryBalance (id, warehouseId, productId, variantId, onHand, reserved, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(warehouseId, variantId) DO UPDATE SET onHand = excluded.onHand, updatedAt = excluded.updatedAt`
    ).run(`ib-bn-${v.variantId}`, whBnId, v.productId, v.variantId, bnQty, nowIso, nowIso);
  }
  console.log('✓ Seeded Warehouses, SerialUnits, ProductInspections, and InventoryBalances');

  // 8. Refresh PromotionCampaign dates so Flash Sales are live over Oct–Dec 2026
  const campaigns = db.prepare(`SELECT id, name, status FROM PromotionCampaign ORDER BY createdAt ASC`).all();
  if (campaigns.length > 0) {
    for (let i = 0; i < Math.min(2, campaigns.length); i++) {
      db.prepare(
        `UPDATE PromotionCampaign
         SET status = 'PUBLISHED',
             startAt = '2026-10-01T00:00:00.000Z',
             endAt = '2026-12-31T23:59:59.000Z',
             updatedAt = ?
         WHERE id = ?`
      ).run(nowIso, campaigns[i].id);
    }
    console.log('✓ Activated PromotionCampaigns for Oct–Dec 2026');
  }

  // 9. Sanitize XSS test strings in ContactSubmission while keeping status counts intact
  db.prepare(
    `UPDATE ContactSubmission
     SET name = 'Nguyễn Hoàng Nam (Khách hẹn xem máy tại Showroom)',
         message = 'Mình muốn đặt lịch qua showroom 23/40 Tạ Quang Bửu xem thực tế chiếc ThinkPad X1 Carbon và tư vấn nâng cấp RAM.'
     WHERE name LIKE '%<script%' OR name LIKE '%alert(%'`
  ).run();
  console.log('✓ Sanitized ContactSubmission names while preserving R1 status counts');

  // 10. Seed realistic Orders across statuses (CONTACTED, CONFIRMED, CANCELLED) if missing
  const sampleProduct = laptops[0];
  if (sampleProduct) {
    const SEED_ORDERS = [
      {
        id: 'ord-seed-contacted-01',
        orderNumber: 'CTL-20261028-CT01',
        status: 'CONTACTED',
        customerName: 'Trần Minh Quân',
        customerPhone: '0912345678',
        customerEmail: 'minhquan.tran@gmail.com',
        shippingAddress: 'Số 18 Hoàng Quốc Việt, Quận Cầu Giấy, Hà Nội',
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PENDING',
        subtotal: 24990000,
        shippingFee: 0,
        note: 'Giao giờ hành chính, hỗ trợ cài sẵn Office và AutoCAD',
        eventAction: 'STATUS_CHANGE',
        eventFrom: 'NEW',
        eventTo: 'CONTACTED',
        eventNote: 'Đã gọi xác nhận cấu hình và hẹn giờ giao chiều nay',
        staffNote: 'Khách yêu cầu xuất phiếu bảo hành 12 tháng kèm tem 1 đổi 1 7 ngày.',
      },
      {
        id: 'ord-seed-confirmed-01',
        orderNumber: 'CTL-20261028-CF02',
        status: 'CONFIRMED',
        customerName: 'Lê Thu Hà',
        customerPhone: '0987654321',
        customerEmail: 'thuha.le@company.vn',
        shippingAddress: 'Nhận tại showroom: Showroom Bắc Ninh (Số 40 Trần Hưng Đạo, TP. Bắc Ninh)',
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PAID',
        subtotal: 19990000,
        shippingFee: 0,
        note: 'Giữ máy tại Showroom Bắc Ninh, 17h30 mình ghé lấy',
        eventAction: 'STATUS_CHANGE',
        eventFrom: 'CONTACTED',
        eventTo: 'CONFIRMED',
        eventNote: 'Khách đã chuyển khoản cọc VietQR, đã giữ Serial tại Showroom Bắc Ninh',
        staffNote: 'Đã vệ sinh máy, sạc đầy pin 100% và chuẩn bị túi chống sốc tặng kèm.',
      },
      {
        id: 'ord-seed-cancelled-01',
        orderNumber: 'CTL-20261027-CC03',
        status: 'CANCELLED',
        customerName: 'Phạm Quốc Đạt',
        customerPhone: '0934567890',
        customerEmail: null,
        shippingAddress: 'Khu đô thị Ecopark, Văn Giang, Hưng Yên',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        subtotal: 16490000,
        shippingFee: 45000,
        note: 'Tư vấn nâng cấp lên bản 32GB RAM',
        eventAction: 'CANCELLED',
        eventFrom: 'NEW',
        eventTo: 'CANCELLED',
        eventNote: 'Khách đổi sang đặt mẫu Lenovo Legion 5 Pro bản 32GB RAM',
        staffNote: 'Đã tạo đơn mới cho khách sang dòng Legion 5 Pro.',
      },
    ];

    for (const o of SEED_ORDERS) {
      const exists = db.prepare(`SELECT id FROM "Order" WHERE id = ?`).get(o.id);
      if (!exists) {
        const total = o.subtotal + o.shippingFee;
        db.prepare(
          `INSERT INTO "Order" (
            id, orderNumber, status, revision, subtotalAmount, shippingFee, discountAmount, totalAmount,
            shippingAddress, customerName, customerPhone, customerEmail, shippingMethod, note,
            paymentMethod, paymentStatus, createdAt, updatedAt
          ) VALUES (?, ?, ?, 1, ?, ?, 0, ?, ?, ?, ?, ?, 'standard', ?, ?, ?, ?, ?)`
        ).run(
          o.id,
          o.orderNumber,
          o.status,
          o.subtotal,
          o.shippingFee,
          total,
          o.shippingAddress,
          o.customerName,
          o.customerPhone,
          o.customerEmail,
          o.note,
          o.paymentMethod,
          o.paymentStatus,
          nowIso,
          nowIso
        );

        db.prepare(
          `INSERT INTO "OrderItem" (
            id, orderId, productId, variantId, productName, sku,
            productNameSnapshot, skuSnapshot, price, priceSnapshot, quantity, lineTotal, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, 'CTL-LAP-01', ?, 'CTL-LAP-01', ?, ?, 1, ?, ?, ?)`
        ).run(
          `oi-${o.id}`,
          o.id,
          sampleProduct.id,
          sampleProduct.variantId || null,
          sampleProduct.name,
          sampleProduct.name,
          o.subtotal,
          o.subtotal,
          o.subtotal,
          nowIso,
          nowIso
        );

        db.prepare(
          `INSERT INTO "OrderEvent" (
            id, orderId, action, fromStatus, toStatus, reason, note, actor, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Admin vận hành (Phiên dùng chung)', ?)`
        ).run(
          `oev-${o.id}`,
          o.id,
          o.eventAction,
          o.eventFrom,
          o.eventTo,
          o.eventNote,
          o.eventNote,
          nowIso
        );

        db.prepare(
          `INSERT INTO "OrderNote" (id, orderId, content, actor, createdAt)
           VALUES (?, ?, ?, 'Admin vận hành (Phiên dùng chung)', ?)`
        ).run(`onote-${o.id}`, o.id, o.staffNote, nowIso);
      }
    }
    console.log('✓ Seeded realistic Orders across CONTACTED, CONFIRMED, CANCELLED statuses');
  }

  // 10.5. Assign a real SerialUnit to ord-seed-confirmed-01 and seed 30 days of StorefrontMetric data
  const sampleSerial = db
    .prepare(`SELECT id, productId FROM SerialUnit WHERE serialNumber = 'PF4X1G11B' LIMIT 1`)
    .get();
  if (sampleSerial) {
    db.prepare(`UPDATE "OrderItem" SET serialUnitId = ? WHERE orderId = 'ord-seed-confirmed-01'`).run(
      sampleSerial.id
    );
    db.prepare(`UPDATE SerialUnit SET status = 'RESERVED' WHERE id = ?`).run(sampleSerial.id);
  }

  const metricEvents = [
    { event: 'page_view', base: 140 },
    { event: 'view_item', base: 68 },
    { event: 'search', base: 24 },
    { event: 'search_empty', base: 2 },
    { event: 'compare', base: 11 },
    { event: 'add_to_cart', base: 9 },
    { event: 'begin_checkout', base: 6 },
    { event: 'order_requested', base: 3 },
    { event: 'contact_click', base: 8 },
    { event: 'appointment_requested', base: 2 },
  ];
  const baseDate = new Date('2026-10-29T00:00:00.000Z');
  for (let d = 0; d < 30; d++) {
    const dt = new Date(baseDate.getTime() - d * 86400000);
    const dayStr = dt.toISOString().slice(0, 10);
    for (let eIdx = 0; eIdx < metricEvents.length; eIdx++) {
      const m = metricEvents[eIdx];
      const wave = ((d * 7 + eIdx * 3) % 9) - 3;
      const count = Math.max(1, m.base + wave);
      db.prepare(
        `INSERT INTO StorefrontMetric (day, event, count)
         VALUES (?, ?, ?)
         ON CONFLICT(day, event) DO UPDATE SET count = MAX(StorefrontMetric.count, excluded.count)`
      ).run(dayStr, m.event, count);
    }
  }
  console.log('✓ Seeded 30 days of StorefrontMetric funnel data & linked SerialUnit to confirmed order');

  // 11. Sync .wrangler/review-data.json orderStatuses and mediaStates with exact D1 counts
  if (fs.existsSync(REVIEW_DATA_PATH)) {
    const reviewData = JSON.parse(fs.readFileSync(REVIEW_DATA_PATH, 'utf8'));
    reviewData.orderStatuses = db
      .prepare(`SELECT status, COUNT(*) as c FROM "Order" GROUP BY status`)
      .all();
    reviewData.mediaStates = db
      .prepare(`SELECT state, COUNT(*) as c FROM MediaAsset GROUP BY state`)
      .all();
    fs.writeFileSync(REVIEW_DATA_PATH, JSON.stringify(reviewData, null, 2), 'utf8');
    console.log('✓ Synchronized .wrangler/review-data.json with exact D1 orderStatuses & mediaStates');
  }

  db.close();
  console.log('🎉 All CitiLap business seed data & normalizations completed successfully!');
}

main();
