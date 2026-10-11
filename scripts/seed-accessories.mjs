import { DatabaseSync } from 'node:sqlite';

const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/b65da93ea2843a376d3060d680e68bc0241759acd637c928159fd6791d37ffe8.sqlite';
const db = new DatabaseSync(dbPath);

console.log('Seeding accessory brands and products into local D1 SQLite...');

// 1. Brands
const insertBrand = db.prepare(`
  INSERT OR REPLACE INTO Brand (id, name, slug, logo, description, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`);

const brands = [
  ['br-logitech', 'Logitech', 'logitech', 'brands/logitech.svg', 'Phụ kiện chuột, bàn phím số 1 thế giới'],
  ['br-anker', 'Anker', 'anker', 'brands/anker.svg', 'Củ sạc nhanh GaN, pin sạc dự phòng hàng đầu'],
  ['br-ugreen', 'Ugreen', 'ugreen', 'brands/ugreen.svg', 'Hub Type-C, cáp sạc và phụ kiện công nghệ'],
  ['br-tomtoc', 'Tomtoc', 'tomtoc', 'brands/tomtoc.svg', 'Balo và túi chống sốc laptop tiêu chuẩn quân đội'],
  ['br-hyperwork', 'HyperWork', 'hyperwork', 'brands/hyperwork.svg', 'Phụ kiện setup bàn làm việc công thái học'],
  ['br-baseus', 'Baseus', 'baseus', 'brands/baseus.svg', 'Đèn treo màn hình và phụ kiện thông minh'],
  ['br-dareu', 'DareU', 'dareu', 'brands/dareu.svg', 'Bàn phím cơ và chuột gaming quốc dân'],
  ['br-wiwu', 'WiWU', 'wiwu', 'brands/wiwu.svg', 'Túi chống sốc và phụ kiện tiện ích'],
];

for (const b of brands) {
  insertBrand.run(...b);
}

// 2. Products
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO Product (
    id, name, slug, description, shortDescription, brand, brandId,
    model, series, warranty, condition, origin,
    isFeatured, isNewArrival, isFlashSale, isBestSeller, allowBackorder, minOrderQty,
    price, originalPrice, images, stock, status,
    specs, tags, categoryId, createdAt, updatedAt, inventoryType
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, 0, 1,
    ?, ?, ?, ?, 'ACTIVE',
    ?, ?, 'cat-phu-kien', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'QUANTITY'
  )
`);

const products = [
  // Chuột & Bàn phím (mouse-keyboard)
  [
    'p-acc-logitech-mx3s',
    'Chuột không dây Logitech MX Master 3S Ergonomic',
    'chuot-khong-day-logitech-mx-master-3s',
    'Chuột công thái học cao cấp cho dân văn phòng và lập trình viên. Cảm biến 8000 DPI Darkfield, cuộn MagSpeed siêu êm.',
    'Logitech MX Master 3S | 8000 DPI | Quiet Click | Bluetooth & Bolt',
    'Logitech', 'br-logitech', 'MX Master 3S', 'mouse-keyboard', 'BH 12T', 'NEW', 'Chính hãng',
    1, 1, 0, 1,
    1990000, 2490000,
    JSON.stringify(['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=800']),
    25,
    JSON.stringify({ type: 'mouse-keyboard', connection: 'Bluetooth & Logi Bolt', dpi: '8000 DPI', battery: '70 ngày' }),
    'mouse-keyboard,mouse,logitech,wireless,office,chuot'
  ],
  [
    'p-acc-dareu-ek87',
    'Bàn phím cơ DareU EK87 V2 RGB Red Switch',
    'ban-phim-co-dareu-ek87-v2-rgb-red-switch',
    'Bàn phím cơ quốc dân layout TKL 87 phím, switch D độc quyền gõ êm mượt, LED RGB nhiều chế độ.',
    'DareU EK87 V2 | TKL 87 phím | Red Switch | LED RGB',
    'DareU', 'br-dareu', 'EK87 V2', 'mouse-keyboard', 'BH 12T', 'NEW', 'Chính hãng',
    0, 1, 0, 0,
    590000, 750000,
    JSON.stringify(['https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=800']),
    30,
    JSON.stringify({ type: 'mouse-keyboard', layout: '87 Phím (TKL)', switch: 'D-Switch Red', led: 'RGB' }),
    'mouse-keyboard,keyboard,dareu,rgb,phim-co,ban-phim'
  ],

  // Balo & Túi chống sốc (bag)
  [
    'p-acc-tomtoc-navigator',
    'Balo Laptop Tomtoc Premium Navigator T66 15.6 inch',
    'balo-laptop-tomtoc-premium-navigator-t66-15-6-inch',
    'Balo công nghệ chống nước chuẩn quân đội Mỹ, đệm CornerArmor bảo vệ đáy máy, ngăn chứa thông minh cho laptop và phụ kiện.',
    'Tomtoc Navigator T66 | Đệm CornerArmor | Vải Cordura chống nước | 15.6 inch',
    'Tomtoc', 'br-tomtoc', 'T66', 'bag', 'BH 12T', 'NEW', 'Chính hãng',
    1, 0, 0, 1,
    1290000, 1590000,
    JSON.stringify(['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800']),
    15,
    JSON.stringify({ type: 'bag', size: '15.6 inch', material: 'Vải Cordura', waterproof: 'Có' }),
    'bag,balo,tomtoc,waterproof,laptop,tui'
  ],
  [
    'p-acc-wiwu-commuter',
    'Túi Chống Sốc WiWU City Commuter 14-16 inch',
    'tui-chong-soc-wiwu-city-commuter-14-16-inch',
    'Túi chống sốc cao cấp lót lông tuyết nhung siêu êm, có quai xách gấp gọn và ngăn phụ để sạc cáp chuột.',
    'WiWU City Commuter | Lót tuyết nhung | Chống thấm nước | 14-16 inch',
    'WiWU', 'br-wiwu', 'City Commuter', 'bag', 'BH 12T', 'NEW', 'Chính hãng',
    0, 0, 0, 0,
    390000, 490000,
    JSON.stringify(['https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800']),
    40,
    JSON.stringify({ type: 'bag', size: '14 - 16 inch', protection: 'Đệm bọt khí 360', waterproof: 'Có' }),
    'bag,tui,chongsoc,wiwu,sleeve'
  ],

  // Củ Sạc GaN & Cáp Sạc (charger)
  [
    'p-acc-anker-65w',
    'Củ Sạc Nhanh Anker 65W GaN Nano II 3 Cổng 2C1A',
    'cu-sac-nhanh-anker-65w-gan-nano-ii-3-cong-2c1a',
    'Công nghệ GaN II siêu nhỏ gọn, sạc cùng lúc Laptop MacBook, điện thoại và máy tính bảng với công suất tối đa 65W.',
    'Anker Nano II 65W | 2 cổng Type-C + 1 USB-A | GaN II siêu nhỏ gọn',
    'Anker', 'br-anker', 'A2668', 'charger', 'BH 18T', 'NEW', 'Chính hãng',
    1, 1, 1, 1,
    850000, 1100000,
    JSON.stringify(['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=800']),
    35,
    JSON.stringify({ type: 'charger', power: '65W Max', ports: '2x Type-C, 1x USB-A', tech: 'GaN II' }),
    'charger,gan,anker,sacnhanh,65w,cu-sac'
  ],
  [
    'p-acc-ugreen-c2c-100w',
    'Cáp Sạc Nhanh Type-C to Type-C 100W Ugreen Bọc Dù 1.5m',
    'cap-sac-nhanh-type-c-to-type-c-100w-ugreen-boc-du-1-5m',
    'Cáp sạc PD 100W bọc dù siêu bền, tích hợp chip E-marker thông minh điều áp an toàn cho laptop và điện thoại.',
    'Ugreen 100W | Bọc dù chống đứt | Chip E-marker | Dài 1.5m',
    'Ugreen', 'br-ugreen', 'US316', 'charger', 'BH 12T', 'NEW', 'Chính hãng',
    0, 0, 0, 0,
    160000, 220000,
    JSON.stringify(['https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?q=80&w=800']),
    50,
    JSON.stringify({ type: 'charger', power: '100W (20V/5A)', length: '1.5m', material: 'Bọc dù Nylon' }),
    'charger,cap,ugreen,100w,type-c,cable'
  ],

  // Hub Type-C (hub)
  [
    'p-acc-ugreen-hub-8in1',
    'Hub Chuyển Đổi Type-C 8 in 1 Ugreen HDMI 4K PD 100W',
    'hub-chuyen-doi-type-c-8-in-1-ugreen-hdmi-4k-pd-100w',
    'Bộ chia cổng đa năng vỏ nhôm tản nhiệt: HDMI 4K@60Hz, 3x USB 3.0 5Gbps, khe đọc thẻ SD/TF, cổng mạng LAN Gigabit và sạc PD 100W.',
    'Ugreen 8 in 1 | HDMI 4K 60Hz | LAN Gigabit | PD 100W | Vỏ nhôm nguyên khối',
    'Ugreen', 'br-ugreen', 'CM512', 'hub', 'BH 18T', 'NEW', 'Chính hãng',
    1, 0, 0, 1,
    790000, 990000,
    JSON.stringify(['https://images.unsplash.com/photo-1622445262464-84b1a0704553?q=80&w=800']),
    20,
    JSON.stringify({ type: 'hub', ports: 'HDMI 4K, 3x USB 3.0, SD, TF, RJ45, PD 100W', body: 'Hợp kim nhôm' }),
    'hub,dock,type-c,ugreen,adapter,chuyen-doi'
  ],

  // Giá đỡ & Đế tản nhiệt (stand)
  [
    'p-acc-hyperwork-l01',
    'Giá Đỡ Laptop Nhôm HyperWork L01 Công Thái Học',
    'gia-do-laptop-nhom-hyperwork-l01-cong-thai-hoc',
    'Giá đỡ laptop nhôm CNC cao cấp có thể điều chỉnh độ cao và góc nghiêng linh hoạt, đệm silicon chống trầy xước.',
    'HyperWork L01 | Nhôm CNC nguyên khối | Nâng góc 0-180 độ | Chịu tải 10kg',
    'HyperWork', 'br-hyperwork', 'L01', 'stand', 'BH 12T', 'NEW', 'Chính hãng',
    1, 1, 0, 0,
    420000, 550000,
    JSON.stringify(['https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=800']),
    25,
    JSON.stringify({ type: 'stand', material: 'Hợp kim nhôm', compatibility: 'Laptop 11-17 inch' }),
    'stand,giado,hyperwork,aluminum,tannhiet'
  ],

  // Đèn treo màn hình & Decor (screenbar)
  [
    'p-acc-baseus-iwok2',
    'Đèn Treo Màn Hình Baseus i-wok 2 Chống Lóa Cảm Ứng',
    'den-treo-man-hinh-baseus-i-wok-2-chong-loa-cam-ung',
    'Đèn thanh treo bảo vệ mắt với ánh sáng phi đối xứng không gây lóa màn hình, điều khiển cảm ứng vô cấp 3 chế độ màu.',
    'Baseus i-wok 2 | Ánh sáng phi đối xứng | Cảm ứng vô cấp | Nguồn Type-C',
    'Baseus', 'br-baseus', 'DGIWK-B01', 'screenbar', 'BH 12T', 'NEW', 'Chính hãng',
    0, 1, 0, 0,
    620000, 790000,
    JSON.stringify(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=800']),
    18,
    JSON.stringify({ type: 'screenbar', power: '5W Type-C', colorTemp: '2800K - 5500K' }),
    'screenbar,den,baseus,desksetup,decor'
  ],

  // Deskpad & Lót chuột (deskpad)
  [
    'p-acc-hyperwork-pad',
    'Deskpad Da PU 2 Mặt HyperWork 80x40cm Chống Nước',
    'deskpad-da-pu-2-mat-hyperwork-80x40cm-chong-nuoc',
    'Thảm trải bàn da PU cao cấp dùng được cả 2 mặt với 2 tông màu thời thượng, chống nước, chống trầy xước bàn làm việc.',
    'HyperWork Deskpad | Da PU 2 mặt | Chống nước | Kích thước 80x40cm',
    'HyperWork', 'br-hyperwork', 'DP-8040', 'deskpad', 'BH 12T', 'NEW', 'Chính hãng',
    0, 0, 0, 1,
    220000, 290000,
    JSON.stringify(['https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800']),
    45,
    JSON.stringify({ type: 'deskpad', size: '80 x 40 cm', material: 'Da PU nhân tạo' }),
    'deskpad,lotchuot,hyperwork,pad,setup'
  ]
];

for (const p of products) {
  insertProduct.run(...p);
}

console.log(`Successfully seeded ${brands.length} brands and ${products.length} accessories!`);
