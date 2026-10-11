-- ==============================================================================
-- CITILAP E-COMMERCE: DETERMINISTIC DEVELOPMENT SEED (NOT PRODUCTION DATA)
-- Designed for Cloudflare D1 local/dev catalog testing
-- Idempotent using INSERT OR REPLACE
-- ==============================================================================

-- 1. SEED BRANDS
INSERT OR IGNORE INTO "Brand" ("id", "name", "slug", "logo", "description", "status", "createdAt", "updatedAt") VALUES
('br-dell', 'Dell', 'dell', 'brands/dell.svg', 'Laptop Dell bền bỉ, hiệu năng cao từ văn phòng đến gaming Alienware', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-asus', 'Asus', 'asus', 'brands/asus.svg', 'Thương hiệu tiên phong với dòng ROG Gaming và ZenBook cao cấp', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-lenovo', 'Lenovo', 'lenovo', 'brands/lenovo.svg', 'Huyền thoại bàn phím ThinkPad và chiến binh Legion Gaming', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-hp', 'HP', 'hp', 'brands/hp.svg', 'Laptop HP thanh lịch từ Pavilion đến dòng máy trạm ZBook', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-apple', 'Apple', 'apple', 'brands/apple.svg', 'Hệ sinh thái MacBook sang trọng với chip Apple Silicon đỉnh cao', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-acer', 'Acer', 'acer', 'brands/acer.svg', 'Chiến binh gaming Predator & Nitro với tản nhiệt vượt trội', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-msi', 'MSI', 'msi', 'brands/msi.svg', 'Chuyên gia laptop gaming và đồ họa hàng đầu thế giới', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-logitech', 'Logitech', 'logitech', 'brands/logitech.svg', 'Phụ kiện chuột, bàn phím số 1 thế giới', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-anker', 'Anker', 'anker', 'brands/anker.svg', 'Củ sạc nhanh GaN, pin sạc dự phòng hàng đầu', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-ugreen', 'Ugreen', 'ugreen', 'brands/ugreen.svg', 'Hub Type-C, cáp sạc và phụ kiện công nghệ', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-tomtoc', 'Tomtoc', 'tomtoc', 'brands/tomtoc.svg', 'Balo và túi chống sốc laptop tiêu chuẩn quân đội', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-hyperwork', 'HyperWork', 'hyperwork', 'brands/hyperwork.svg', 'Phụ kiện setup bàn làm việc công thái học', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-baseus', 'Baseus', 'baseus', 'brands/baseus.svg', 'Đèn treo màn hình và phụ kiện thông minh', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-dareu', 'DareU', 'dareu', 'brands/dareu.svg', 'Bàn phím cơ và chuột gaming quốc dân', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('br-wiwu', 'WiWU', 'wiwu', 'brands/wiwu.svg', 'Túi chống sốc và phụ kiện tiện ích', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. SEED CATEGORIES
INSERT OR IGNORE INTO "Category" ("id", "name", "slug", "description", "image", "parentId", "sortOrder", "status", "createdAt", "updatedAt") VALUES
('cat-gaming', 'Laptop Gaming', 'laptop-gaming', 'Chiến mọi tựa game AAA và eSports với cấu hình đồ họa rời mạnh mẽ', 'categories/gaming.webp', NULL, 1, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-van-phong', 'Laptop Văn Phòng', 'laptop-van-phong', 'Thiết kế mỏng nhẹ, pin trâu, bàn phím gõ êm cho công việc và học tập', 'categories/office.webp', NULL, 2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-do-hoa', 'Laptop Đồ Hoạ', 'laptop-do-hoa', 'Màn hình chuẩn màu, cấu hình máy trạm tối ưu Render 3D và dựng phim', 'categories/creator.webp', NULL, 3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-macbook', 'Apple - MacBook', 'macbook', 'MacBook Air và MacBook Pro chính hãng với thời lượng pin ấn tượng', 'categories/macbook.webp', NULL, 4, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-like-new', 'Laptop Like New', 'laptop-cu', 'Máy lướt tuyển chọn 99%, cam kết nguyên zin, bảo hành uy tín', 'categories/likenew.webp', NULL, 5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat-phu-kien', 'Linh Kiện - Phụ Kiện', 'linh-kien', 'Balo, chuột gaming, bàn phím cơ, ram, ổ cứng ssd nâng cấp', 'categories/accessories.webp', NULL, 6, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. SEED PRODUCTS
INSERT OR IGNORE INTO "Product" (
  "id", "name", "slug", "description", "shortDescription", "contentHtml", "brand", "brandId",
  "model", "series", "warranty", "condition", "origin", "seoTitle", "seoDescription", "canonicalSlug",
  "isFeatured", "isNewArrival", "isFlashSale", "isBestSeller", "allowBackorder", "minOrderQty", "maxOrderQty",
  "lowestPrice30d", "price", "originalPrice", "images", "stock", "status",
  "cpu", "cpuSeries", "gpu", "gpuSeries", "ram", "ramGb", "storage", "storageGb", "display", "screenSize", "refreshRate",
  "specs", "tags", "categoryId", "createdAt", "updatedAt"
) VALUES
-- Product 1: Lenovo Legion 5 Pro (Gaming)
(
  'p-legion-5-pro', 'Lenovo Legion 5 Pro 16ARX8 R7 7845HX RTX 4060', 'lenovo-legion-5-pro-16arx8',
  'Laptop Gaming Lenovo Legion 5 Pro 16ARX8 trang bị vi xử lý AMD Ryzen 7 7845HX kết hợp cùng card đồ họa NVIDIA GeForce RTX 4060 8GB mang lại hiệu năng gaming đỉnh cao.',
  'AMD R7-7845HX | 16GB DDR5 | 512GB SSD | RTX 4060 8GB | 16 inch 2.5K 165Hz',
  '<p>Lenovo Legion 5 Pro 16ARX8 là sự lựa chọn số 1 cho game thủ và đồ họa chuyên nghiệp.</p>',
  'Lenovo', 'br-lenovo', '16ARX8', 'Legion 5 Pro', 'Bảo hành 12 tháng', 'NEW', 'Chính hãng',
  'Lenovo Legion 5 Pro 16ARX8 | Citilap Store', 'Mua laptop Lenovo Legion 5 Pro giá tốt nhất tại Citilap', 'lenovo-legion-5-pro-16arx8',
  1, 1, 0, 1, 0, 1, 3,
  31990000, 32990000, 37990000,
  '["https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800"]',
  12, 'ACTIVE',
  'AMD Ryzen 7 7845HX', 'Ryzen 7', 'NVIDIA GeForce RTX 4060 8GB', 'RTX 4060', '16GB DDR5', 16, '512GB NVMe SSD', 512, '16.0 inch WQXGA 165Hz 100% sRGB', 16.0, 165,
  '{"cpu":"Ryzen 7 7845HX","ram":"16GB DDR5","ssd":"512GB NVMe","gpu":"RTX 4060 8GB","display":"16 WQXGA 165Hz 100% sRGB","weight":"2.5kg"}',
  'gaming,lenovo,legion,rtx4060', 'cat-gaming', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 2: Asus ROG Strix G16 (Gaming Flagship)
(
  'p-rog-strix-g16', 'Asus ROG Strix G16 G614JI i9 13980HX RTX 4070', 'asus-rog-strix-g16-g614ji',
  'Asus ROG Strix G16 sức mạnh không thỏa hiệp với Intel Core i9 thế hệ 13 và card đồ họa RTX 4070 8GB 140W TGP.',
  'i9-13980HX | 32GB DDR5 | 1TB SSD | RTX 4070 8GB | 16 inch QHD+ 240Hz Nebula',
  '<p>Màn hình ROG Nebula Display 240Hz siêu mượt cùng hệ thống tản nhiệt 3 quạt Tri-Fan.</p>',
  'Asus', 'br-asus', 'G614JI', 'ROG Strix', 'Bảo hành 24 tháng', 'NEW', 'Chính hãng',
  'Asus ROG Strix G16 G614JI | Citilap', 'Asus ROG Strix G16 chính hãng giá tốt tại Citilap', 'asus-rog-strix-g16-g614ji',
  1, 0, 1, 1, 0, 1, 2,
  38990000, 39990000, 44990000,
  '["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800"]',
  8, 'ACTIVE',
  'Intel Core i9-13980HX', 'Core i9', 'NVIDIA GeForce RTX 4070 8GB', 'RTX 4070', '32GB DDR5', 32, '1TB NVMe SSD', 1024, '16.0 inch QHD+ 240Hz Nebula', 16.0, 240,
  '{"cpu":"Intel Core i9-13980HX","ram":"32GB DDR5","ssd":"1TB NVMe","gpu":"RTX 4070 8GB","display":"16 QHD+ 240Hz","weight":"2.5kg"}',
  'gaming,asus,rog,strix,rtx4070', 'cat-gaming', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 3: Acer Predator Helios 16 (Gaming)
(
  'p-predator-helios-16', 'Acer Predator Helios 16 PH16-71 i7 13700HX RTX 4060', 'acer-predator-helios-16-ph16',
  'Acer Predator Helios 16 sở hữu thiết kế hầm hố cùng quạt kim loại AeroBlade 3D thế hệ 5 độc quyền.',
  'i7-13700HX | 16GB DDR5 | 512GB SSD | RTX 4060 8GB | 16 inch 165Hz',
  '<p>Hệ thống tản nhiệt kim loại lỏng Liquid Metal dẫn nhiệt siêu nhanh.</p>',
  'Acer', 'br-acer', 'PH16-71', 'Predator Helios', 'Bảo hành 24 tháng 3S1', 'NEW', 'Chính hãng',
  'Acer Predator Helios 16 PH16-71 | Citilap', 'Laptop Acer Predator Helios 16 cấu hình cao', 'acer-predator-helios-16-ph16',
  0, 1, 0, 0, 0, 1, 5,
  34990000, 35990000, 39990000,
  '["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800"]',
  6, 'ACTIVE',
  'Intel Core i7-13700HX', 'Core i7', 'NVIDIA GeForce RTX 4060 8GB', 'RTX 4060', '16GB DDR5', 16, '512GB NVMe SSD', 512, '16.0 inch WQXGA 165Hz', 16.0, 165,
  '{"cpu":"i7 13700HX","ram":"16GB DDR5","ssd":"512GB NVMe","gpu":"RTX 4060 8GB","display":"16 WQXGA 165Hz","weight":"2.6kg"}',
  'gaming,acer,predator,helios', 'cat-gaming', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 4: Dell XPS 15 9530 (Văn Phòng Cao Cấp)
(
  'p-dell-xps-15', 'Dell XPS 15 9530 i7 13700H 16GB 512GB FHD+', 'dell-xps-15-9530',
  'Tuyệt tác thiết kế từ nhôm nguyên khối và sợi carbon cao cấp, màn hình InfinityEdge tràn viền sắc nét.',
  'i7-13700H | 16GB DDR5 | 512GB SSD | Intel Iris Xe | 15.6 inch FHD+ InfinityEdge',
  '<p>Chuẩn mực laptop doanh nhân cao cấp với âm thanh Waves MaxxAudio sống động.</p>',
  'Dell', 'br-dell', '9530', 'XPS 15', 'Bảo hành 12 tháng', 'NEW', 'Chính hãng',
  'Dell XPS 15 9530 Chính Hãng | Citilap', 'Dell XPS 15 cao cấp cho doanh nhân', 'dell-xps-15-9530',
  1, 0, 0, 1, 0, 1, 3,
  41990000, 42990000, 47990000,
  '["https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800"]',
  10, 'ACTIVE',
  'Intel Core i7-13700H', 'Core i7', 'Intel Iris Xe Graphics', 'Onboard', '16GB DDR5', 16, '512GB NVMe SSD', 512, '15.6 inch FHD+ 500 nits', 15.6, 60,
  '{"cpu":"i7 13700H","ram":"16GB DDR5","ssd":"512GB","gpu":"Intel Iris Xe","display":"15.6 FHD+ 500 nits","weight":"1.86kg"}',
  'vanphong,dell,xps,doanhnhan', 'cat-van-phong', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 5: Lenovo ThinkPad X1 Carbon Gen 11 (Văn Phòng Doanh Nhân)
(
  'p-thinkpad-x1-gen11', 'Lenovo ThinkPad X1 Carbon Gen 11 i7 1365U 16GB 512GB', 'lenovo-thinkpad-x1-carbon-gen-11',
  'Siêu phẩm doanh nhân siêu nhẹ chỉ 1.12kg đạt chuẩn độ bền quân đội Mỹ MIL-STD-810H.',
  'i7-1365U | 16GB LPDDR5 | 512GB SSD | 14 inch WUXGA 100% sRGB | 1.12kg',
  '<p>Bàn phím ThinkPad trứ danh mang lại cảm giác gõ êm ái hàng đầu thế giới.</p>',
  'Lenovo', 'br-lenovo', 'Gen 11', 'ThinkPad X1 Carbon', 'Bảo hành 12 tháng', 'NEW', 'Chính hãng',
  'Lenovo ThinkPad X1 Carbon Gen 11 | Citilap', 'ThinkPad X1 Carbon mỏng nhẹ cao cấp', 'lenovo-thinkpad-x1-carbon-gen-11',
  0, 1, 0, 0, 0, 1, 5,
  34990000, 35990000, 39990000,
  '["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800"]',
  14, 'ACTIVE',
  'Intel Core i7-1365U', 'Core i7', 'Intel Iris Xe Graphics', 'Onboard', '16GB LPDDR5', 16, '512GB NVMe SSD', 512, '14.0 inch WUXGA 400 nits', 14.0, 60,
  '{"cpu":"i7 1365U","ram":"16GB LPDDR5","ssd":"512GB","gpu":"Intel Iris Xe","display":"14 WUXGA","weight":"1.12kg"}',
  'vanphong,lenovo,thinkpad,doanhnhan', 'cat-van-phong', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 6: MacBook Air 15 inch M3 (Apple)
(
  'p-macbook-air-m3-15', 'Apple MacBook Air 15 inch M3 8GB 256GB Midnight', 'macbook-air-15-inch-m3',
  'MacBook Air 15 inch với sức mạnh đột phá từ chip Apple M3, thời lượng pin lên đến 18 giờ liên tục.',
  'Apple M3 8-Core | 8GB Unified | 256GB SSD | 15.3 inch Liquid Retina 500 nits',
  '<p>Thiết kế không quạt hoàn toàn yên tĩnh, khung nhôm tái chế thân thiện môi trường.</p>',
  'Apple', 'br-apple', 'A3114', 'MacBook Air', 'Bảo hành 12 tháng Apple Care', 'NEW', 'Chính hãng',
  'MacBook Air 15 M3 Chính Hãng | Citilap', 'MacBook Air M3 giá rẻ nhất tại Citilap', 'macbook-air-15-inch-m3',
  1, 1, 0, 1, 0, 1, 2,
  36990000, 37990000, NULL,
  '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800"]',
  20, 'ACTIVE',
  'Apple M3 8-Core', 'Apple M3', 'Apple 10-Core GPU', 'Apple Silicon', '8GB Unified', 8, '256GB SSD', 256, '15.3 inch Liquid Retina', 15.3, 60,
  '{"cpu":"Apple M3 8-core","ram":"8GB Unified","ssd":"256GB","gpu":"10-core GPU","display":"15.3 Liquid Retina","weight":"1.51kg"}',
  'apple,macbook,air,m3', 'cat-macbook', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 7: MacBook Pro 14 M3 Pro (Đồ Họa & Code)
(
  'p-macbook-pro-m3-14', 'Apple MacBook Pro 14 inch M3 Pro 18GB 512GB Space Black', 'macbook-pro-14-m3-pro',
  'MacBook Pro 14 inch đỉnh cao đồ họa chuyên nghiệp với chip M3 Pro 11-core CPU và 14-core GPU.',
  'Apple M3 Pro | 18GB Unified | 512GB SSD | 14.2 inch Liquid Retina XDR 120Hz ProMotion',
  '<p>Màn hình Liquid Retina XDR độ sáng 1600 nits, màu sắc Space Black sang trọng chống bám vân tay.</p>',
  'Apple', 'br-apple', 'A2992', 'MacBook Pro', 'Bảo hành 12 tháng Apple Care', 'NEW', 'Chính hãng',
  'MacBook Pro 14 M3 Pro | Citilap', 'MacBook Pro 14 M3 Pro giá tốt nhất', 'macbook-pro-14-m3-pro',
  1, 0, 0, 1, 0, 1, 2,
  48990000, 49990000, 52990000,
  '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800"]',
  10, 'ACTIVE',
  'Apple M3 Pro 11-Core', 'Apple M3', 'Apple 14-Core GPU', 'Apple Silicon', '18GB Unified', 18, '512GB SSD', 512, '14.2 inch Liquid Retina XDR 120Hz', 14.2, 120,
  '{"cpu":"Apple M3 Pro","ram":"18GB Unified","ssd":"512GB","gpu":"14-core GPU","display":"14.2 Liquid Retina XDR 120Hz","weight":"1.61kg"}',
  'apple,macbook,pro,m3pro,dohoa', 'cat-macbook', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 8: Dell Precision 5570 (Đồ Họa Máy Trạm)
(
  'p-dell-precision-5570', 'Dell Precision 5570 Workstation i7 12800H RTX A1000 4K Touch (Like New 99%)', 'dell-precision-5570-workstation',
  'Máy trạm đồ họa mỏng nhẹ hiệu năng vượt trội với màn hình 4K cảm ứng chuẩn màu 100% AdobeRGB.',
  'i7-12800H | 32GB DDR5 | 1TB SSD | RTX A1000 4GB | 15.6 inch UHD+ Touch 100% AdobeRGB',
  '<p>Chứng chỉ ISV độc quyền tối ưu các phần mềm AutoCAD, SolidWorks, Premiere Pro.</p>',
  'Dell', 'br-dell', '5570', 'Precision', 'Bảo hành 12 tháng tại Citilap', 'LIKE_NEW', 'Nhập khẩu Mỹ',
  'Dell Precision 5570 Like New | Citilap', 'Máy trạm Dell Precision 5570 đồ họa 3D', 'dell-precision-5570-workstation',
  0, 0, 1, 0, 0, 1, 2,
  35990000, 36990000, 42990000,
  '["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800"]',
  5, 'ACTIVE',
  'Intel Core i7-12800H', 'Core i7', 'NVIDIA RTX A1000 4GB', 'RTX Workstation', '32GB DDR5', 32, '1TB NVMe SSD', 1024, '15.6 inch UHD+ Touch 500 nits', 15.6, 60,
  '{"cpu":"i7 12800H","ram":"32GB DDR5","ssd":"1TB","gpu":"RTX A1000 4GB","display":"15.6 UHD+ Touch","weight":"1.95kg"}',
  'dohoa,workstation,dell,precision,likenew', 'cat-do-hoa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 9: Dell Latitude 7420 (Like New Văn Phòng Giá Rẻ)
(
  'p-dell-latitude-7420', 'Dell Latitude 7420 i5 1145G7 16GB 256GB FHD (Like New 99%)', 'dell-latitude-7420-cu-likenew',
  'Dòng laptop văn phòng siêu bền bỉ với vỏ carbon cao cấp, máy nguyên zin tuyển chọn loại A cực đẹp.',
  'i5-1145G7 | 16GB RAM | 256GB SSD | 14 inch FHD IPS chống chói | Pin trâu 6-8h',
  '<p>Sản phẩm đã qua kiểm định 20 bước nghiêm ngặt tại Citilap.</p>',
  'Dell', 'br-dell', '7420', 'Latitude', 'Bảo hành 12 tháng 1 đổi 1', 'LIKE_NEW', 'Nhập khẩu Mỹ',
  'Dell Latitude 7420 Cũ Like New 99% | Citilap', 'Dell Latitude 7420 giá rẻ nguyên zin', 'dell-latitude-7420-cu-likenew',
  1, 0, 1, 1, 0, 1, 5,
  11990000, 12990000, 16990000,
  '["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800"]',
  15, 'ACTIVE',
  'Intel Core i5-1145G7', 'Core i5', 'Intel Iris Xe Graphics', 'Onboard', '16GB DDR4', 16, '256GB NVMe SSD', 256, '14.0 inch FHD IPS', 14.0, 60,
  '{"cpu":"i5 1145G7","ram":"16GB","ssd":"256GB","gpu":"Intel Iris Xe","display":"14 FHD IPS","weight":"1.3kg"}',
  'vanphong,dell,latitude,cu,likenew', 'cat-like-new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 10: Asus TUF Gaming A15 (Like New Gaming)
(
  'p-asus-tuf-a15', 'Asus TUF Gaming A15 FA507 R7 6800H RTX 3050Ti 144Hz (Like New 99%)', 'asus-tuf-gaming-a15-fa507',
  'Laptop gaming giá rẻ quốc dân bền chuẩn quân đội, bàn phím RGB và hệ thống âm thanh Dolby Atmos.',
  'R7-6800H | 16GB DDR5 | 512GB SSD | RTX 3050Ti 4GB | 15.6 inch 144Hz',
  '<p>Chiến mượt các tựa game FO4, Valorant, CS2, GTA V ở mức đồ họa cao.</p>',
  'Asus', 'br-asus', 'FA507', 'TUF Gaming', 'Bảo hành 12 tháng tại Citilap', 'LIKE_NEW', 'Chính hãng VN',
  'Asus TUF Gaming A15 Like New 99% | Citilap', 'Asus TUF Gaming A15 thanh lý giá rẻ', 'asus-tuf-gaming-a15-fa507',
  0, 1, 0, 1, 0, 1, 3,
  18990000, 19490000, 23990000,
  '["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800"]',
  7, 'ACTIVE',
  'AMD Ryzen 7 6800H', 'Ryzen 7', 'NVIDIA GeForce RTX 3050Ti 4GB', 'RTX 3050Ti', '16GB DDR5', 16, '512GB NVMe SSD', 512, '15.6 inch FHD 144Hz', 15.6, 144,
  '{"cpu":"Ryzen 7 6800H","ram":"16GB DDR5","ssd":"512GB","gpu":"RTX 3050Ti 4GB","display":"15.6 FHD 144Hz","weight":"2.2kg"}',
  'gaming,asus,tuf,likenew', 'cat-like-new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 11: MSI Katana 15 B13VFK (Gaming)
(
  'p-msi-katana-15', 'MSI Katana 15 B13VFK i7 13620H RTX 4060 144Hz', 'msi-katana-15-b13vfk',
  'Lưỡi kiếm sắc bén cho game thủ, trang bị card đồ họa RTX 4060 kiến trúc Ada Lovelace mới nhất.',
  'i7-13620H | 16GB DDR5 | 512GB SSD | RTX 4060 8GB | 15.6 inch 144Hz',
  '<p>Bàn phím RGB 4 vùng cực chất với cụm phím WASD nổi bật.</p>',
  'MSI', 'br-msi', 'B13VFK', 'Katana', 'Bảo hành 24 tháng chính hãng', 'NEW', 'Chính hãng',
  'MSI Katana 15 B13VFK RTX 4060 | Citilap', 'Laptop MSI Katana 15 giá tốt nhất', 'msi-katana-15-b13vfk',
  0, 0, 1, 0, 0, 1, 4,
  25990000, 26990000, 30990000,
  '["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800"]',
  9, 'ACTIVE',
  'Intel Core i7-13620H', 'Core i7', 'NVIDIA GeForce RTX 4060 8GB', 'RTX 4060', '16GB DDR5', 16, '512GB NVMe SSD', 512, '15.6 inch FHD 144Hz', 15.6, 144,
  '{"cpu":"i7 13620H","ram":"16GB DDR5","ssd":"512GB","gpu":"RTX 4060 8GB","display":"15.6 FHD 144Hz","weight":"2.25kg"}',
  'gaming,msi,katana,rtx4060', 'cat-gaming', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Product 12: HP Pavilion 15 (Like New Sinh Viên)
(
  'p-hp-pavilion-15', 'HP Pavilion 15-eg2000 i5 1240P 8GB 256GB FHD (Đã qua sử dụng 98%)', 'hp-pavilion-15-eg2000-cu',
  'Lựa chọn hoàn hảo cho sinh viên và văn phòng với thiết kế nắp nhôm sang trọng màu bạc ánh kim.',
  'i5-1240P 12 nhân 16 luồng | 8GB RAM | 256GB SSD | 15.6 inch FHD IPS | Bàn phím số',
  '<p>Máy tuyển chọn nguyên bản chưa qua sửa chữa, pin trên 4 tiếng liên tục.</p>',
  'HP', 'br-hp', '15-eg2000', 'Pavilion', 'Bảo hành 6 tháng tại Citilap', 'USED', 'Chính hãng VN',
  'HP Pavilion 15 Cũ 98% Giá Rẻ | Citilap', 'HP Pavilion 15 học tập văn phòng giá rẻ', 'hp-pavilion-15-eg2000-cu',
  0, 0, 0, 1, 0, 1, 5,
  10990000, 11490000, 14990000,
  '["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800"]',
  8, 'ACTIVE',
  'Intel Core i5-1240P', 'Core i5', 'Intel Iris Xe Graphics', 'Onboard', '8GB DDR4', 8, '256GB NVMe SSD', 256, '15.6 inch FHD IPS', 15.6, 60,
  '{"cpu":"i5 1240P","ram":"8GB","ssd":"256GB","gpu":"Intel Iris Xe","display":"15.6 FHD IPS","weight":"1.75kg"}',
  'vanphong,hp,pavilion,cu,sinhvien', 'cat-like-new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 4. SEED PRODUCT VARIANTS
INSERT OR IGNORE INTO "ProductVariant" ("id", "productId", "sku", "name", "options", "price", "originalPrice", "stock", "image", "status", "cpu", "gpu", "ram", "storage", "display", "createdAt", "updatedAt") VALUES
('var-legion-1', 'p-legion-5-pro', 'SKU-LEGION-16-512', '16GB RAM / 512GB SSD', '{"RAM":"16GB","SSD":"512GB"}', 32990000, 37990000, 7, NULL, 'ACTIVE', 'AMD Ryzen 7 7845HX', 'RTX 4060 8GB', '16GB DDR5', '512GB SSD', '16.0 165Hz', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('var-legion-2', 'p-legion-5-pro', 'SKU-LEGION-32-1TB', '32GB RAM / 1TB SSD', '{"RAM":"32GB","SSD":"1TB"}', 35990000, 40990000, 5, NULL, 'ACTIVE', 'AMD Ryzen 7 7845HX', 'RTX 4060 8GB', '32GB DDR5', '1TB SSD', '16.0 165Hz', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('var-rog-1', 'p-rog-strix-g16', 'SKU-ROG-32-1TB', '32GB RAM / 1TB SSD', '{"RAM":"32GB","SSD":"1TB"}', 39990000, 44990000, 8, NULL, 'ACTIVE', 'Intel Core i9-13980HX', 'RTX 4070 8GB', '32GB DDR5', '1TB SSD', '16.0 240Hz', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('var-xps-1', 'p-dell-xps-15', 'SKU-XPS-16-512', '16GB RAM / 512GB SSD', '{"RAM":"16GB","SSD":"512GB"}', 42990000, 47990000, 6, NULL, 'ACTIVE', 'Intel Core i7-13700H', 'Intel Iris Xe', '16GB DDR5', '512GB SSD', '15.6 FHD+', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('var-xps-2', 'p-dell-xps-15', 'SKU-XPS-32-1TB', '32GB RAM / 1TB SSD', '{"RAM":"32GB","SSD":"1TB"}', 47990000, 52990000, 4, NULL, 'ACTIVE', 'Intel Core i7-13700H', 'Intel Iris Xe', '32GB DDR5', '1TB SSD', '15.6 FHD+', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('var-mac-air-1', 'p-macbook-air-m3-15', 'SKU-MBA15-8-256', '8GB Unified / 256GB SSD', '{"RAM":"8GB","SSD":"256GB"}', 37990000, NULL, 12, NULL, 'ACTIVE', 'Apple M3', '10-Core GPU', '8GB Unified', '256GB SSD', '15.3 Liquid Retina', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('var-mac-air-2', 'p-macbook-air-m3-15', 'SKU-MBA15-16-512', '16GB Unified / 512GB SSD', '{"RAM":"16GB","SSD":"512GB"}', 43990000, NULL, 8, NULL, 'ACTIVE', 'Apple M3', '10-Core GPU', '16GB Unified', '512GB SSD', '15.3 Liquid Retina', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. SEED PRODUCT IMAGES (METADATA FOR R2 BUCKET)
INSERT OR IGNORE INTO "ProductImage" ("id", "productId", "variantId", "r2Key", "url", "mimeType", "width", "height", "size", "alt", "sortOrder", "isPrimary", "createdAt") VALUES
('img-legion-1', 'p-legion-5-pro', NULL, 'products/lenovo-legion-5-pro-front.webp', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800', 'image/webp', 800, 600, 102400, 'Lenovo Legion 5 Pro mặt trước', 1, 1, CURRENT_TIMESTAMP),
('img-legion-2', 'p-legion-5-pro', NULL, 'products/lenovo-legion-5-pro-keyboard.webp', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800', 'image/webp', 800, 600, 98400, 'Bàn phím RGB Lenovo Legion 5 Pro', 2, 0, CURRENT_TIMESTAMP),

('img-rog-1', 'p-rog-strix-g16', NULL, 'products/asus-rog-strix-g16-main.webp', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800', 'image/webp', 800, 600, 120500, 'Asus ROG Strix G16 chính diện', 1, 1, CURRENT_TIMESTAMP),

('img-xps-1', 'p-dell-xps-15', NULL, 'products/dell-xps-15-angle.webp', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800', 'image/webp', 800, 600, 115000, 'Dell XPS 15 góc nghiêng viền mỏng', 1, 1, CURRENT_TIMESTAMP),

('img-mac-1', 'p-macbook-air-m3-15', NULL, 'products/macbook-air-15-midnight.webp', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800', 'image/webp', 800, 600, 89200, 'MacBook Air 15 M3 Midnight sắc sảo', 1, 1, CURRENT_TIMESTAMP);

-- 6. SEED WAREHOUSES
INSERT OR IGNORE INTO "Warehouse" ("id", "code", "name", "status", "address", "sortOrder", "createdAt", "updatedAt") VALUES
('wh-hanoi', 'WH-HN-01', 'Kho Hà Nội - Cầu Giấy', 'ACTIVE', '123 Cầu Giấy, Cầu Giấy, Hà Nội', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('wh-bacninh', 'WH-BN-01', 'Kho Bắc Ninh - Trung Tâm', 'ACTIVE', '45 Trần Hưng Đạo, TP Bắc Ninh', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('wh-hcm', 'WH-HCM-01', 'Kho TP.HCM - Quận 10', 'ACTIVE', '789 Ba Tháng Hai, Quận 10, TP.HCM', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. SEED SERIAL UNITS (PHYSICAL LAPTOPS - TEST PREFIXED ONLY)
INSERT OR IGNORE INTO "SerialUnit" (
  "id", "productId", "variantId", "warehouseId", "serialNumber", "condition", "status",
  "costPrice", "warrantyMonths", "notes", "receivedAt", "createdAt", "updatedAt"
) VALUES
('sn-legion-001', 'p-legion-5-pro', 'var-legion-1', 'wh-hanoi', 'TEST-LEGION-0001', 'NEW', 'AVAILABLE', 27000000, 12, 'Hàng mới nguyên seal hộp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sn-legion-002', 'p-legion-5-pro', 'var-legion-1', 'wh-bacninh', 'TEST-LEGION-0002', 'NEW', 'AVAILABLE', 27000000, 12, 'Hàng mới nguyên seal hộp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sn-legion-003', 'p-legion-5-pro', 'var-legion-2', 'wh-hanoi', 'TEST-LEGION-0003', 'NEW', 'AVAILABLE', 29500000, 12, 'Bản 32GB/1TB nguyên seal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sn-rog-001', 'p-rog-strix-g16', 'var-rog-1', 'wh-hanoi', 'TEST-ROG-0001', 'NEW', 'AVAILABLE', 33000000, 24, 'Chính hãng Asus VN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sn-dell-prec-001', 'p-dell-precision-5570', NULL, 'wh-hanoi', 'TEST-DELL-PREC-0001', 'LIKE_NEW', 'AVAILABLE', 29000000, 12, 'Ngoại hình 99%, pin 94%, cycle 28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 8. SEED INVENTORY BALANCES (NON-SERIALIZED QUANTITY GOODS)
INSERT OR REPLACE INTO "InventoryBalance" ("id", "warehouseId", "productId", "variantId", "onHand", "reserved", "createdAt", "updatedAt") VALUES
('ib-legion-1-hn', 'wh-hanoi', 'p-legion-5-pro', 'var-legion-1', 10, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ib-legion-1-bn', 'wh-bacninh', 'p-legion-5-pro', 'var-legion-1', 5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ib-rog-1-hn', 'wh-hanoi', 'p-rog-strix-g16', 'var-rog-1', 8, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

