export interface ProductDemoColor {
  id: string;
  name: string;
  hex: string;
  priceDiff: number;
  previewImg?: string;
}

export interface ProductDemoWarranty {
  id: string;
  name: string;
  desc: string;
  priceDiff: number;
  tag?: string;
  isDefault?: boolean;
}

export interface ProductDemoVariant {
  id: string;
  sku: string;
  name: string;
  subSpecs: string;
  price: number;
  originalPrice: number;
  condition: "NEW" | "LIKE_NEW" | "USED";
  tag?: string;
  isDefault?: boolean;
  ram?: string;
  storage?: string;
  gpu?: string;
}

export interface ProductDemoData {
  id: string;
  slug: string;
  name: string;
  fullTitle: string;
  modelCode: string;
  brand: string;
  category: string;
  categorySlug: string;
  series: string;
  conditionLabel: string;
  images: Array<{ url: string; alt?: string; label?: string }>;
  variants: ProductDemoVariant[];
  colors: ProductDemoColor[];
  warranties: ProductDemoWarranty[];
  specs: Array<[string, string]>;
  reviewHtml: string;
  faqs: Array<{ q: string; a: string }>;
}

export const DEMO_LENOVO_LOQ: ProductDemoData = {
  id: "demo-lenovo-loq",
  slug: "demo-lenovo-loq",
  name: "Lenovo LOQ 15IRH11E 83Y9003YVN",
  fullTitle: "[New 100%] Lenovo LOQ 15IRH11E 83Y9003YVN (Core 7 230H, 8GB, 512GB, RTX 3050 6GB, 15.3 FHD+ 165Hz)",
  modelCode: "83Y9003YVN",
  brand: "Lenovo",
  category: "Laptop Gaming",
  categorySlug: "laptop-gaming",
  series: "Lenovo LOQ Series",
  conditionLabel: "Mới 100% Fullbox",
  images: [
    { url: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-ct1-03.webp", alt: "Lenovo LOQ 15IRH11E Mặt trước", label: "Mặt trước & Bàn phím" },
    { url: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-83y9003vvn-2.webp", alt: "Lenovo LOQ 15IRH11E Góc mở máy", label: "Góc mở máy 135 độ" },
    { url: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-83y9003vvn-5.webp", alt: "Lenovo LOQ 15IRH11E Bàn phím", label: "Cận cảnh bàn phím TrueStrike" },
    { url: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-83y9003vvn-6.webp", alt: "Lenovo LOQ 15IRH11E Cổng kết nối", label: "Cổng kết nối phía sau" },
    { url: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-83y9003vvn-4.webp", alt: "Lenovo LOQ 15IRH11E Mặt lưng", label: "Mặt lưng nhám thanh lịch" }
  ],
  variants: [
    {
      id: "cfg-1",
      sku: "LOQ-I5-8-512-3050",
      name: "Core 5 205H · 8GB RAM · 512GB SSD",
      subSpecs: "Core 5 205H | 8GB DDR5 | 512GB NVMe | RTX 3050 6GB | 15.3\" 165Hz",
      price: 25690000,
      originalPrice: 30990000,
      condition: "NEW",
      tag: "Giá tốt nhất",
      ram: "8GB",
      storage: "512GB",
      gpu: "RTX 3050 6GB"
    },
    {
      id: "cfg-2",
      sku: "LOQ-I7-8-512-3050",
      name: "Core 7 230H · 8GB RAM · 512GB SSD",
      subSpecs: "Core 7 230H | 8GB DDR5 | 512GB NVMe | RTX 3050 6GB | 15.3\" 165Hz",
      price: 27390000,
      originalPrice: 32990000,
      condition: "NEW",
      tag: "Bán chạy nhất ⭐",
      isDefault: true,
      ram: "8GB",
      storage: "512GB",
      gpu: "RTX 3050 6GB"
    },
    {
      id: "cfg-3",
      sku: "LOQ-I7-16-512-3050",
      name: "Core 7 230H · 16GB RAM · 512GB SSD",
      subSpecs: "Core 7 230H | 16GB DDR5 | 512GB NVMe | RTX 3050 6GB | 15.3\" 165Hz",
      price: 30390000,
      originalPrice: 35990000,
      condition: "NEW",
      tag: "Đa nhiệm mượt",
      ram: "16GB",
      storage: "512GB",
      gpu: "RTX 3050 6GB"
    },
    {
      id: "cfg-4",
      sku: "LOQ-R7-16-512-5050",
      name: "Ryzen 7 250 · 16GB RAM · 512GB SSD",
      subSpecs: "Ryzen 7 250 | 16GB DDR5 | 512GB NVMe | RTX 5050 8GB | 15.3\" 165Hz",
      price: 46990000,
      originalPrice: 50990000,
      condition: "NEW",
      tag: "Đồ họa đỉnh",
      ram: "16GB",
      storage: "512GB",
      gpu: "RTX 5050 8GB"
    }
  ],
  colors: [
    { id: "c-grey", name: "Xám Bão (Storm Grey)", hex: "#64748b", priceDiff: 0, previewImg: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-ct1-03.webp" },
    { id: "c-black", name: "Đen Huyền Bí (Phantom Black)", hex: "#1e293b", priceDiff: 0, previewImg: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-83y9003vvn-2.webp" },
    { id: "c-white", name: "Trắng Băng Tuyết (Glacier White)", hex: "#f8fafc", priceDiff: 300000, previewImg: "https://thegioiso365.vn/wp-content/uploads/2026/09/loq-15irh11e-83y9003vvn-4.webp" }
  ],
  warranties: [
    { id: "w-std", name: "Bảo hành Tiêu Chuẩn 12 Tháng", desc: "12 tháng phần cứng tại CitiLap, 1 đổi 1 trong 15 ngày", priceDiff: 0, isDefault: true },
    { id: "w-gold", name: "Bảo hành Vàng 24 Tháng", desc: "24 tháng chính hãng, 1 đổi 1 trong 30 ngày, bảo hành toàn diện nguồn & màn hình", priceDiff: 890000, tag: "Khuyên dùng ⭐" },
    { id: "w-diamond", name: "Bảo hành Kim Cương 36 Tháng", desc: "36 tháng VIP, bảo hiểm rơi vỡ ngấm nước năm 1, mượn máy tương đương tận nơi", priceDiff: 1690000, tag: "VIP Cao Cấp" }
  ],
  specs: [
    ["Bộ vi xử lý (CPU)", "Intel® Core™ 7 230H (2.50GHz up to 5.20GHz, 24MB Cache, 10 nhân 16 luồng)"],
    ["Bộ nhớ trong (RAM)", "8GB SODIMM DDR5-4800MHz (Hỗ trợ 2 khe cắm, nâng cấp tối đa 64GB)"],
    ["Ổ cứng lưu trữ (SSD)", "512GB SSD M.2 2242 PCIe® 4.0x4 NVMe® (Có thêm 1 khe M.2 trống nâng cấp)"],
    ["Card đồ họa (VGA)", "NVIDIA GeForce RTX™ 3050 6GB GDDR6, Boost Clock 1732MHz, TGP 75W, 142 AI TOPS"],
    ["Màn hình (Display)", "15.3\" WUXGA (1920x1200) IPS 300nits Anti-glare, 100% sRGB, 165Hz, G-SYNC®"],
    ["Hệ điều hành", "Windows® 11 Home Single Language bản quyền theo máy"],
    ["Bàn phím & Touchpad", "Bàn phím Full-size TrueStrike hành trình 1.5mm, đèn nền phím màu trắng chống mỏi"],
    ["Cổng kết nối", "1x USB-C (USB 5Gbps, PD 65-100W), 3x USB-A 3.2, 1x HDMI 2.1 (4K/60Hz), RJ-45, Jack 3.5mm"],
    ["Pin & Nguồn", "Pin 3 Cell 60 Wh, Sạc nhanh Super Rapid Charge (nạp 80% trong 60 phút)"],
    ["Trọng lượng", "Khoảng 2.1 kg (Vỏ máy hoàn thiện tông màu tối sang trọng, tản nhiệt Coldfront Hyper)"]
  ],
  reviewHtml: `
    <h3 class="text-sm sm:text-base font-bold text-slate-900 mt-2 mb-1">1. Thiết kế hầm hố nhưng tinh tế, tản nhiệt Coldfront Hyper đột phá</h3>
    <p>Lenovo LOQ 15IRH11E sở hữu ngôn ngữ thiết kế thừa hưởng trọn vẹn từ dòng đàn anh cao cấp Legion. Các góc cạnh được vát vuông vức, khe tản nhiệt bố trí thông minh đẩy luồng gió nóng ra phía sau, giúp tay cầm chuột của game thủ luôn mát mẻ trong các phiên chiến game kéo dài.</p>
    
    <h3 class="text-sm sm:text-base font-bold text-slate-900 mt-4 mb-1">2. Hiệu năng vượt trội với Core 7 230H & RTX 3050 6GB</h3>
    <p>Trang bị vi xử lý Intel Core 7 thế hệ mới cùng card đồ họa rời NVIDIA RTX 3050 6GB VRAM, máy sẵn sàng cân tốt các tựa game Esport (Valorant, CS2 > 200 FPS) cũng như các tựa game AAA hạng nặng ở thiết lập đồ họa hợp lý. Công nghệ DLSS 3.5 và Frame Generation giúp tăng tốc khung hình mượt mà.</p>

    <h3 class="text-sm sm:text-base font-bold text-slate-900 mt-4 mb-1">3. Màn hình 15.3 inch 165Hz, chuẩn màu 100% sRGB</h3>
    <p>Điểm cộng lớn của phiên bản 2026 là tấm nền chuẩn màu 100% sRGB, độ phân giải WUXGA tỉ lệ 16:10 hiển thị nhiều thông tin hơn. Đây là lợi thế rất lớn cho các bạn sinh viên kiến trúc, đồ họa hay dựng video trên Premiere/Photoshop.</p>
  `,
  faqs: [
    { q: "Lenovo LOQ 15IRH11E có nâng cấp thêm RAM và ổ cứng SSD được không?", a: "Hoàn toàn được! Máy có sẵn 2 khe RAM DDR5 (hỗ trợ nâng cấp tối đa 64GB) và có 2 khe cắm SSD M.2 NVMe PCIe Gen 4, cho phép gắn thêm ổ cứng thứ 2 dễ dàng." },
    { q: "Máy bán ra là mới 100% nguyên seal hay đã qua sử dụng?", a: "Sản phẩm tại CitiLap là máy New 100% Fullbox nguyên hộp, nguyên tem niêm phong của nhà sản xuất. Khách hàng được tự tay bóc seal khi nhận máy." },
    { q: "Chính sách đổi trả trong 30 ngày áp dụng thế nào?", a: "Nếu máy gặp lỗi phần cứng do nhà sản xuất trong vòng 30 ngày đầu, CitiLap cam kết 1 đổi 1 ngay lập tức sang máy mới nguyên hộp mà không tính thêm bất kỳ khoản phí nào." },
    { q: "Khách hàng ở tỉnh xa nhận hàng có được kiểm tra trước khi trả tiền không?", a: "CitiLap hỗ trợ giao hàng COD toàn quốc. Quý khách được quyền bóc hộp kiểm tra máy, phụ kiện sạc đúng với đơn đặt hàng mới phải thanh toán tiền cho nhân viên giao vận." }
  ]
};
