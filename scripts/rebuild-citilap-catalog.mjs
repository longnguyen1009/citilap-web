import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const CRAWL_DIR = '.wrangler/laptopnew-crawl';
const MEDIA_CACHE_DIR = `${CRAWL_DIR}/media-cache`;
const PREPARED_PATH = `${CRAWL_DIR}/citilap-prepared.json`;
const MODE = process.argv[2] || '--prepare';
assert(['--prepare', '--apply'].includes(MODE), 'Usage: node scripts/rebuild-citilap-catalog.mjs [--prepare|--apply]');

mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
mkdirSync('public/brands', { recursive: true });

// ---------------------------------------------------------------------------
// 1. HTML / Text Helpers
// ---------------------------------------------------------------------------
function decodeEntities(str) {
  return String(str || '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '...')
    .replace(/&trade;/gi, '™')
    .replace(/&reg;/gi, '®');
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(str) {
  return decodeEntities(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

// ---------------------------------------------------------------------------
// 2. Full Multi-Level Taxonomy & Category Hierarchy (CitiLap 2026)
//    Root -> Brand (Cấp 1) -> Series (Cấp 2) -> Model/Year (Cấp 3)
// ---------------------------------------------------------------------------
const CATEGORY_DEFS = [
  // Root categories (5)
  { id: 'cat-gaming', name: 'Laptop Gaming', slug: 'laptop-gaming', parentId: null, description: 'Laptop Gaming chính hãng đa dạng phân khúc từ Lenovo, ASUS, MSI, Acer, Gigabyte, Dell Alienware, HP Omen/Victus, Razer.', visible: true },
  { id: 'cat-van-phong', name: 'Laptop Văn Phòng', slug: 'laptop-van-phong', parentId: null, description: 'Laptop văn phòng, học tập, doanh nhân mỏng nhẹ chính hãng từ Lenovo, ASUS, Dell, HP, MSI, Acer, Surface, LG Gram.', visible: true },
  { id: 'cat-do-hoa', name: 'Laptop Đồ Họa & Workstation', slug: 'laptop-workstation', parentId: null, description: 'Máy trạm Mobile Workstation và Laptop Creator chuyên dụng đồ họa 3D, dựng phim, kỹ thuật CAD/CAM.', visible: true },
  { id: 'cat-macbook', name: 'Apple MacBook', slug: 'macbook', parentId: null, description: 'MacBook Air, MacBook Pro, Mac Mini, Mac Studio và iMac chính hãng Apple Silicon tại CitiLap.', visible: true },
  { id: 'cat-phu-kien', name: 'Phụ Kiện & Linh Kiện', slug: 'phu-kien', parentId: null, description: 'Chuột, bàn phím cơ, tai nghe, balo, túi chống sốc, củ sạc, hub Type-C, giá đỡ, đế tản nhiệt, RAM, SSD chính hãng.', visible: true },

  // =========================================================================
  // A. LAPTOP GAMING: Brand (Cấp 1) -> Series (Cấp 2) -> Model/Year (Cấp 3)
  // =========================================================================
  { id: 'tax-gaming-lenovo', name: 'Lenovo Gaming', slug: 'lenovo-gaming', parentId: 'cat-gaming', description: 'Laptop gaming Lenovo chính hãng gồm Lenovo Legion, Lenovo LOQ và Lenovo Lecoo Fighter.', visible: true },
  { id: 'tax-gaming-asus', name: 'ASUS Gaming', slug: 'asus-gaming', parentId: 'cat-gaming', description: 'Laptop gaming ASUS ROG (Strix, SCAR, Zephyrus, Flow) và ASUS TUF Gaming bền bỉ.', visible: true },
  { id: 'tax-gaming-msi', name: 'MSI Gaming', slug: 'msi-gaming', parentId: 'cat-gaming', description: 'Laptop gaming MSI đầy đủ các dòng Cyborg, Katana, Crosshair, Vector, Raider, Stealth, Titan, Thin, Sword.', visible: true },
  { id: 'tax-gaming-acer', name: 'Acer Gaming', slug: 'acer-gaming', parentId: 'cat-gaming', description: 'Laptop gaming Acer Nitro (Nitro V, Nitro 5, Nitro 16) và Acer Predator Helios cao cấp.', visible: true },
  { id: 'tax-gaming-gigabyte', name: 'Gigabyte Gaming', slug: 'gigabyte-gaming', parentId: 'cat-gaming', description: 'Laptop gaming Gigabyte G5/G6/A16 hiệu năng cao và Gigabyte AORUS cao cấp.', visible: true },
  { id: 'tax-gaming-dell', name: 'Dell Gaming', slug: 'dell-gaming', parentId: 'cat-gaming', description: 'Laptop gaming biểu tượng Dell Alienware và Dell Gaming G-Series bền bỉ.', visible: true },
  { id: 'tax-gaming-hp', name: 'HP Gaming', slug: 'hp-gaming', parentId: 'cat-gaming', description: 'Laptop gaming HP Omen cao cấp và HP Victus thanh lịch đa dụng.', visible: true },
  { id: 'tax-gaming-razer', name: 'Razer Gaming', slug: 'razer-gaming', parentId: 'cat-gaming', description: 'Laptop gaming CNC siêu mỏng cao cấp Razer Blade 14, 16, 18.', visible: true },

  // --- Cấp 2 & Cấp 3: Lenovo Gaming ---
  { id: 'taxonomy-lenovo-legion', name: 'Lenovo Legion', slug: 'lenovo-legion', parentId: 'tax-gaming-lenovo', description: 'Laptop gaming cao cấp Lenovo Legion 5, Legion Pro 5, Legion 7, R7000P hiệu năng tối đa.', visible: true },
  { id: 'tax-legion-5', name: 'Legion 5', slug: 'legion-5', parentId: 'taxonomy-lenovo-legion', description: 'Lenovo Legion 5 2024 / 2025 & Legion Y7000 cân bằng hiệu năng và tản nhiệt.', visible: true },
  { id: 'tax-legion-pro-5', name: 'Legion Pro 5 & R7000P', slug: 'legion-pro-5', parentId: 'taxonomy-lenovo-legion', description: 'Lenovo Legion Pro 5 / Legion R7000P cấu hình mạnh mẽ màn 240Hz chuẩn màu.', visible: true },
  { id: 'tax-legion-7', name: 'Legion 7 & Pro 7', slug: 'legion-7', parentId: 'taxonomy-lenovo-legion', description: 'Flagship Lenovo Legion 7i / Pro 7 vỏ kim loại cao cấp RTX 40/50 Series.', visible: true },
  { id: 'tax-legion-slim-5', name: 'Legion Slim 5', slug: 'legion-slim-5', parentId: 'taxonomy-lenovo-legion', description: 'Lenovo Legion Slim 5 gọn nhẹ linh hoạt cho game thủ và sáng tạo nội dung.', visible: true },

  { id: 'taxonomy-lenovo-loq', name: 'Lenovo LOQ', slug: 'lenovo-loq', parentId: 'tax-gaming-lenovo', description: 'Laptop gaming quốc dân Lenovo LOQ 15IRX, 15ARP, LOQ Essential màn chuẩn màu 100% sRGB.', visible: true },
  { id: 'tax-loq-15irx', name: 'LOQ 15IRX', slug: 'loq-15irx', parentId: 'taxonomy-lenovo-loq', description: 'Lenovo LOQ 15IRX9 / 15IRX10 chạy Intel Core HX hiệu năng cao.', visible: true },
  { id: 'tax-loq-15arp', name: 'LOQ 15ARP & 15APH', slug: 'loq-15arp', parentId: 'taxonomy-lenovo-loq', description: 'Lenovo LOQ chip AMD Ryzen 5 / Ryzen 7 tối ưu nhiệt độ và thời lượng pin.', visible: true },
  { id: 'tax-loq-essential', name: 'LOQ Essential', slug: 'loq-essential', parentId: 'taxonomy-lenovo-loq', description: 'Lenovo LOQ Essential mỏng nhẹ giá tốt cho sinh viên IT & game eSports.', visible: true },

  { id: 'taxonomy-lenovo-lecoo-gaming', name: 'Lenovo Lecoo Gaming', slug: 'lenovo-lecoo-gaming', parentId: 'tax-gaming-lenovo', description: 'Laptop gaming phổ thông Lenovo Lecoo Fighter cấu hình cao giá tốt.', visible: true },

  // --- Cấp 2 & Cấp 3: ASUS Gaming ---
  { id: 'taxonomy-asus-rog', name: 'ASUS ROG', slug: 'asus-rog', parentId: 'tax-gaming-asus', description: 'Laptop gaming đỉnh cao ASUS ROG Strix G16/G18, ROG Strix SCAR, ROG Zephyrus, ROG Flow.', visible: true },
  { id: 'tax-rog-strix-g', name: 'ROG Strix G16 / G18', slug: 'rog-strix-g', parentId: 'taxonomy-asus-rog', description: 'ASUS ROG Strix G16 & G18 tản nhiệt 3 quạt ROG Intelligent Cooling.', visible: true },
  { id: 'tax-rog-strix-scar', name: 'ROG Strix SCAR', slug: 'rog-strix-scar', parentId: 'taxonomy-asus-rog', description: 'ASUS ROG Strix SCAR 16 / 18 đầu bảng eSports màn Mini-LED Nebula HDR.', visible: true },
  { id: 'tax-rog-zephyrus', name: 'ROG Zephyrus', slug: 'rog-zephyrus', parentId: 'taxonomy-asus-rog', description: 'ASUS ROG Zephyrus G14 / G16 CNC siêu mỏng nhẹ màn ROG Nebula OLED.', visible: true },
  { id: 'tax-rog-flow', name: 'ROG Flow', slug: 'rog-flow', parentId: 'taxonomy-asus-rog', description: 'ASUS ROG Flow X13 / Z13 xoay gập đa năng siêu di động.', visible: true },

  { id: 'taxonomy-asus-tuf', name: 'ASUS TUF Gaming', slug: 'asus-tuf', parentId: 'tax-gaming-asus', description: 'Laptop gaming bền bỉ chuẩn quân đội ASUS TUF Gaming A14, A15, F15, F16.', visible: true },
  { id: 'tax-tuf-a14', name: 'TUF Gaming A14', slug: 'tuf-a14', parentId: 'taxonomy-asus-tuf', description: 'ASUS TUF Gaming A14 siêu gọn nhẹ 1.46kg chip Ryzen AI mới nhất.', visible: true },
  { id: 'tax-tuf-a15', name: 'TUF Gaming A15 / A16', slug: 'tuf-a15', parentId: 'taxonomy-asus-tuf', description: 'ASUS TUF Gaming A15 / A16 AMD Ryzen pin khỏe hiệu năng cao.', visible: true },
  { id: 'tax-tuf-f15-f16', name: 'TUF Gaming F15 / F16', slug: 'tuf-f15-f16', parentId: 'taxonomy-asus-tuf', description: 'ASUS TUF Gaming F15 / F16 Intel Core i5 / i7 / Core Ultra mạnh mẽ.', visible: true },

  // --- Cấp 2 & Cấp 3: MSI Gaming ---
  { id: 'taxonomy-msi-cyborg', name: 'MSI Cyborg', slug: 'msi-cyborg', parentId: 'tax-gaming-msi', description: 'Laptop gaming mỏng nhẹ thiết kế xuyên thấu MSI Cyborg 14 & Cyborg 15.', visible: true },
  { id: 'tax-cyborg-14', name: 'Cyborg 14', slug: 'cyborg-14', parentId: 'taxonomy-msi-cyborg', description: 'MSI Cyborg 14 gọn nhẹ 14 inch linh hoạt di chuyển.', visible: true },
  { id: 'tax-cyborg-15', name: 'Cyborg 15', slug: 'cyborg-15', parentId: 'taxonomy-msi-cyborg', description: 'MSI Cyborg 15 thiết kế xuyên thấu đậm chất Cyberpunk.', visible: true },

  { id: 'taxonomy-msi-katana', name: 'MSI Katana', slug: 'msi-katana', parentId: 'tax-gaming-msi', description: 'Laptop gaming tầm trung hiệu năng cao MSI Katana 15 & Katana A15.', visible: true },
  { id: 'tax-katana-15', name: 'Katana 15', slug: 'katana-15', parentId: 'taxonomy-msi-katana', description: 'MSI Katana 15 Intel Core i5 / i7 RTX 40/50 Series.', visible: true },
  { id: 'tax-katana-a15', name: 'Katana A15 / 17', slug: 'katana-a15', parentId: 'taxonomy-msi-katana', description: 'MSI Katana A15 AI / Katana 17 màn lớn hiệu năng mạnh mẽ.', visible: true },

  { id: 'taxonomy-msi-crosshair', name: 'MSI Crosshair', slug: 'msi-crosshair', parentId: 'tax-gaming-msi', description: 'Laptop gaming hiệu năng cao MSI Crosshair 16 HX & A16 HX.', visible: true },
  { id: 'tax-crosshair-16', name: 'Crosshair 16 HX', slug: 'crosshair-16-hx', parentId: 'taxonomy-msi-crosshair', description: 'MSI Crosshair 16 HX Intel Core HX màn 240Hz QHD+.', visible: true },
  { id: 'tax-crosshair-a16', name: 'Crosshair A16 / 17 HX', slug: 'crosshair-a16-hx', parentId: 'taxonomy-msi-crosshair', description: 'MSI Crosshair A16 / 17 HX cấu hình cao cho game AAA.', visible: true },

  { id: 'taxonomy-msi-vector', name: 'MSI Vector', slug: 'msi-vector', parentId: 'tax-gaming-msi', description: 'Laptop gaming hiệu suất tối đa MSI Vector 16 HX & GP series.', visible: true },
  { id: 'taxonomy-msi-raider', name: 'MSI Raider', slug: 'msi-raider', parentId: 'tax-gaming-msi', description: 'Laptop gaming flagship MSI Raider 16 & Raider 18 HX LED Mystic Light.', visible: true },
  { id: 'taxonomy-msi-stealth', name: 'MSI Stealth', slug: 'msi-stealth', parentId: 'tax-gaming-msi', description: 'Laptop gaming mỏng nhẹ cao cấp MSI Stealth 14, Stealth 16, Stealth 18 AI.', visible: true },
  { id: 'taxonomy-msi-titan', name: 'MSI Titan', slug: 'msi-titan', parentId: 'tax-gaming-msi', description: 'Laptop gaming quái vật hiệu năng đầu bảng MSI Titan 18 HX.', visible: true },
  { id: 'taxonomy-msi-thin', name: 'MSI Thin', slug: 'msi-thin', parentId: 'tax-gaming-msi', description: 'Laptop gaming gọn nhẹ giá tốt MSI Thin 15.', visible: true },
  { id: 'taxonomy-msi-sword', name: 'MSI Sword', slug: 'msi-sword', parentId: 'tax-gaming-msi', description: 'Laptop gaming thanh lịch MSI Sword 16 HX.', visible: true },

  // --- Cấp 2 & Cấp 3: Acer Gaming ---
  { id: 'taxonomy-acer-nitro', name: 'Acer Nitro', slug: 'acer-nitro', parentId: 'tax-gaming-acer', description: 'Laptop gaming quốc dân Acer Nitro V, Nitro 5 & Nitro 16.', visible: true },
  { id: 'tax-nitro-v', name: 'Nitro V 15 / 16', slug: 'nitro-v', parentId: 'taxonomy-acer-nitro', description: 'Acer Nitro V 15 & Nitro V 16 mỏng nhẹ giá hợp lý cho sinh viên.', visible: true },
  { id: 'tax-nitro-5', name: 'Nitro 5 Tiger', slug: 'nitro-5', parentId: 'taxonomy-acer-nitro', description: 'Acer Nitro 5 Tiger hiệu năng ổn định dễ nâng cấp RAM/SSD.', visible: true },
  { id: 'tax-nitro-16', name: 'Nitro 16 Phoenix', slug: 'nitro-16', parentId: 'taxonomy-acer-nitro', description: 'Acer Nitro 16 Phoenix tản nhiệt kim loại lỏng màn 100% sRGB.', visible: true },
  { id: 'taxonomy-acer-predator', name: 'Acer Predator', slug: 'acer-predator', parentId: 'tax-gaming-acer', description: 'Laptop gaming cao cấp Acer Predator Helios & Helios Neo.', visible: true },

  // --- Cấp 2: Gigabyte Gaming ---
  { id: 'taxonomy-gigabyte-gaming', name: 'Gigabyte G5 / G6 / A16', slug: 'gigabyte-g-series', parentId: 'tax-gaming-gigabyte', description: 'Laptop gaming Gigabyte G5, G6 và Gaming A16 chính hãng cấu hình cao.', visible: true },
  { id: 'tax-gigabyte-aorus', name: 'Gigabyte AORUS', slug: 'gigabyte-aorus', parentId: 'tax-gaming-gigabyte', description: 'Laptop gaming cao cấp Gigabyte AORUS 15 / 16X / 17X màn 240Hz.', visible: true },

  // --- Cấp 2 & Cấp 3: Dell Gaming ---
  { id: 'taxonomy-dell-alienware', name: 'Dell Alienware', slug: 'dell-alienware', parentId: 'tax-gaming-dell', description: 'Laptop gaming biểu tượng Dell Alienware Aurora & Area-51.', visible: true },
  { id: 'tax-alienware-aurora', name: 'Alienware Aurora', slug: 'alienware-aurora', parentId: 'taxonomy-dell-alienware', description: 'Dell Alienware 16 Aurora thiết kế mới tinh giản sang trọng.', visible: true },
  { id: 'tax-alienware-m', name: 'Alienware Area-51 / M16', slug: 'alienware-m16', parentId: 'taxonomy-dell-alienware', description: 'Dell Alienware Area-51 & M16/M18 hiệu suất đỉnh cao.', visible: true },
  { id: 'taxonomy-dell-gaming-g', name: 'Dell Gaming G-Series', slug: 'dell-g-series', parentId: 'tax-gaming-dell', description: 'Laptop gaming bền bỉ Dell Gaming G15 & G16.', visible: true },

  // --- Cấp 2: HP Gaming ---
  { id: 'taxonomy-hp-omen', name: 'HP Omen', slug: 'hp-omen', parentId: 'tax-gaming-hp', description: 'Laptop gaming cao cấp HP Omen 16 & Omen 17 tối ưu tản nhiệt.', visible: true },
  { id: 'taxonomy-hp-victus', name: 'HP Victus', slug: 'hp-victus', parentId: 'tax-gaming-hp', description: 'Laptop gaming thanh lịch HP Victus 15 & Victus 16.', visible: true },

  // --- Cấp 2: Razer Gaming ---
  { id: 'taxonomy-razer-blade', name: 'Razer Blade', slug: 'razer-blade', parentId: 'tax-gaming-razer', description: 'Laptop gaming CNC siêu mỏng cao cấp Razer Blade 14, 16, 18.', visible: true },

  // =========================================================================
  // B. LAPTOP VĂN PHÒNG: Brand (Cấp 1) -> Series (Cấp 2) -> Model (Cấp 3)
  // =========================================================================
  { id: 'tax-office-lenovo', name: 'Lenovo Văn Phòng', slug: 'lenovo-van-phong', parentId: 'cat-van-phong', description: 'Laptop văn phòng Lenovo IdeaPad, ThinkBook, ThinkPad và Lenovo Yoga.', visible: true },
  { id: 'tax-office-asus', name: 'ASUS Văn Phòng', slug: 'asus-van-phong', parentId: 'cat-van-phong', description: 'Laptop văn phòng ASUS Vivobook & ASUS Zenbook OLED cao cấp.', visible: true },
  { id: 'tax-office-dell', name: 'Dell Văn Phòng', slug: 'dell-van-phong', parentId: 'cat-van-phong', description: 'Laptop văn phòng Dell Inspiron, Dell XPS, Latitude, Dell Pro và Vostro.', visible: true },
  { id: 'tax-office-hp', name: 'HP Văn Phòng', slug: 'hp-van-phong', parentId: 'cat-van-phong', description: 'Laptop văn phòng HP OmniBook AI, HP EliteBook và HP 14/15.', visible: true },
  { id: 'tax-office-msi', name: 'MSI Văn Phòng', slug: 'msi-van-phong', parentId: 'cat-van-phong', description: 'Laptop văn phòng MSI Modern, MSI Prestige AI+ và MSI Venture.', visible: true },
  { id: 'tax-office-acer', name: 'Acer Văn Phòng', slug: 'acer-van-phong', parentId: 'cat-van-phong', description: 'Laptop văn phòng Acer Aspire mỏng nhẹ giá tốt và Acer Swift AI cao cấp.', visible: true },
  { id: 'taxonomy-microsoft-surface', name: 'Microsoft Surface', slug: 'microsoft-surface', parentId: 'cat-van-phong', description: 'Microsoft Surface Laptop & Surface Pro cảm ứng cao cấp.', visible: true },
  { id: 'taxonomy-lg-gram', name: 'LG Gram', slug: 'lg-gram', parentId: 'cat-van-phong', description: 'LG Gram siêu nhẹ dưới 1kg, pin bền bỉ cả ngày.', visible: true },

  // --- Cấp 2 & Cấp 3: Lenovo Văn Phòng ---
  { id: 'taxonomy-lenovo-ideapad', name: 'Lenovo IdeaPad', slug: 'lenovo-ideapad', parentId: 'tax-office-lenovo', description: 'Lenovo IdeaPad Slim 3, Slim 5 & Xiaoxin mỏng nhẹ pin bền.', visible: true },
  { id: 'tax-ideapad-slim-3', name: 'IdeaPad Slim 3', slug: 'ideapad-slim-3', parentId: 'taxonomy-lenovo-ideapad', description: 'Lenovo IdeaPad Slim 3 bền nhẹ giá hợp lý cho học sinh sinh viên.', visible: true },
  { id: 'tax-ideapad-slim-5', name: 'IdeaPad Slim 5 / Pro 5', slug: 'ideapad-slim-5', parentId: 'taxonomy-lenovo-ideapad', description: 'Lenovo IdeaPad Slim 5 & Pro 5 vỏ nhôm cao cấp màn OLED.', visible: true },

  { id: 'taxonomy-lenovo-thinkbook', name: 'Lenovo ThinkBook', slug: 'lenovo-thinkbook', parentId: 'tax-office-lenovo', description: 'Lenovo ThinkBook 14, ThinkBook 16, ThinkBook X vỏ kim loại sang trọng.', visible: true },
  { id: 'tax-thinkbook-14', name: 'ThinkBook 14', slug: 'thinkbook-14', parentId: 'taxonomy-lenovo-thinkbook', description: 'Lenovo ThinkBook 14 G6 / G7+ gọn nhẹ đa cổng kết nối.', visible: true },
  { id: 'tax-thinkbook-16', name: 'ThinkBook 16', slug: 'thinkbook-16', parentId: 'taxonomy-lenovo-thinkbook', description: 'Lenovo ThinkBook 16 G6 / G7+ màn hình lớn có phím số.', visible: true },

  { id: 'taxonomy-lenovo-thinkpad', name: 'Lenovo ThinkPad', slug: 'lenovo-thinkpad', parentId: 'tax-office-lenovo', description: 'Lenovo ThinkPad E-series, T-series, X1 Carbon bền bỉ chuẩn doanh nhân.', visible: true },
  { id: 'tax-thinkpad-e', name: 'ThinkPad E-Series', slug: 'thinkpad-e', parentId: 'taxonomy-lenovo-thinkpad', description: 'Lenovo ThinkPad E14 / E16 chuẩn doanh nhân giá tốt.', visible: true },
  { id: 'tax-thinkpad-t', name: 'ThinkPad T-Series', slug: 'thinkpad-t', parentId: 'taxonomy-lenovo-thinkpad', description: 'Lenovo ThinkPad T14 / T16 cao cấp siêu bền bỉ.', visible: true },
  { id: 'tax-thinkpad-x1', name: 'ThinkPad X1 Carbon', slug: 'thinkpad-x1-carbon', parentId: 'taxonomy-lenovo-thinkpad', description: 'Lenovo ThinkPad X1 Carbon flagship sợi carbon siêu nhẹ.', visible: true },

  { id: 'taxonomy-lenovo-yoga', name: 'Lenovo Yoga', slug: 'lenovo-yoga', parentId: 'tax-office-lenovo', description: 'Lenovo Yoga Slim, Yoga Pro & Yoga 2-in-1 xoay gập cảm ứng cao cấp.', visible: true },
  { id: 'tax-yoga-slim', name: 'Yoga Slim', slug: 'yoga-slim', parentId: 'taxonomy-lenovo-yoga', description: 'Lenovo Yoga Slim 7 siêu mỏng nhẹ màn OLED rực rỡ.', visible: true },
  { id: 'tax-yoga-2in1', name: 'Yoga 2-in-1 & Book', slug: 'yoga-2in1', parentId: 'taxonomy-lenovo-yoga', description: 'Lenovo Yoga 7 2-in-1 xoay gập 360 độ cảm ứng kèm bút.', visible: true },

  // --- Cấp 2 & Cấp 3: ASUS Văn Phòng ---
  { id: 'taxonomy-asus-vivobook', name: 'ASUS Vivobook', slug: 'asus-vivobook', parentId: 'tax-office-asus', description: 'ASUS Vivobook 14, 15, 16 & Vivobook S OLED thời trang, giá tốt.', visible: true },
  { id: 'tax-vivobook-14', name: 'Vivobook 14 / Go 14', slug: 'vivobook-14', parentId: 'taxonomy-asus-vivobook', description: 'ASUS Vivobook 14 & Vivobook Go 14 gọn nhẹ 14 inch.', visible: true },
  { id: 'tax-vivobook-15', name: 'Vivobook 15 / Go 15', slug: 'vivobook-15', parentId: 'taxonomy-asus-vivobook', description: 'ASUS Vivobook 15 & Vivobook Go 15 màn rộng làm việc thoải mái.', visible: true },
  { id: 'tax-vivobook-16', name: 'Vivobook 16', slug: 'vivobook-16', parentId: 'taxonomy-asus-vivobook', description: 'ASUS Vivobook 16 tỷ lệ 16:10 không gian hiển thị lớn.', visible: true },
  { id: 'tax-vivobook-s-oled', name: 'Vivobook S / OLED', slug: 'vivobook-s-oled', parentId: 'taxonomy-asus-vivobook', description: 'ASUS Vivobook S14/S16 OLED mỏng nhẹ vỏ kim loại Copilot+ PC.', visible: true },

  { id: 'taxonomy-asus-zenbook', name: 'ASUS Zenbook', slug: 'asus-zenbook', parentId: 'tax-office-asus', description: 'ASUS Zenbook 14 OLED, Zenbook S, Zenbook Duo siêu mỏng nhẹ cao cấp.', visible: true },
  { id: 'tax-zenbook-14', name: 'Zenbook 14 OLED', slug: 'zenbook-14-oled', parentId: 'taxonomy-asus-zenbook', description: 'ASUS Zenbook 14 OLED UX3405 / UM3406 cao cấp bán chạy nhất.', visible: true },
  { id: 'tax-zenbook-s', name: 'Zenbook S & A14', slug: 'zenbook-s', parentId: 'taxonomy-asus-zenbook', description: 'ASUS Zenbook S 14/16 Ceraluminum & Zenbook A14 siêu nhẹ dưới 1kg.', visible: true },
  { id: 'tax-zenbook-duo', name: 'Zenbook Duo', slug: 'zenbook-duo', parentId: 'taxonomy-asus-zenbook', description: 'ASUS Zenbook Duo hai màn hình cảm ứng OLED đột phá.', visible: true },

  // --- Cấp 2 & Cấp 3: Dell Văn Phòng ---
  { id: 'taxonomy-dell-inspiron', name: 'Dell Inspiron', slug: 'dell-inspiron', parentId: 'tax-office-dell', description: 'Dell Inspiron 14, Inspiron 15 & Inspiron 16 phổ thông bền bỉ.', visible: true },
  { id: 'tax-inspiron-14', name: 'Inspiron 14', slug: 'inspiron-14', parentId: 'taxonomy-dell-inspiron', description: 'Dell Inspiron 14 5440 / 7440 nhỏ gọn cao cấp.', visible: true },
  { id: 'tax-inspiron-15', name: 'Inspiron 15 / 16', slug: 'inspiron-15', parentId: 'taxonomy-dell-inspiron', description: 'Dell Inspiron 15 3530 / Inspiron 16 đa năng màn lớn.', visible: true },

  { id: 'taxonomy-dell-xps', name: 'Dell XPS', slug: 'dell-xps', parentId: 'tax-office-dell', description: 'Dell XPS 13, XPS 14, XPS 16 Ultrabook flagship viền siêu mỏng.', visible: true },
  { id: 'tax-xps-13', name: 'XPS 13', slug: 'xps-13', parentId: 'taxonomy-dell-xps', description: 'Dell XPS 13 siêu mỏng nhẹ CNC biểu tượng.', visible: true },
  { id: 'tax-xps-14-16', name: 'XPS 14 / XPS 16', slug: 'xps-14-16', parentId: 'taxonomy-dell-xps', description: 'Dell XPS 14 & XPS 16 OLED RTX Studio cao cấp.', visible: true },

  { id: 'taxonomy-dell-latitude', name: 'Dell Latitude', slug: 'dell-latitude', parentId: 'tax-office-dell', description: 'Dell Latitude bền bỉ chuẩn doanh nghiệp.', visible: true },
  { id: 'taxonomy-dell-pro', name: 'Dell Pro', slug: 'dell-pro', parentId: 'tax-office-dell', description: 'Thế hệ laptop doanh nhân mới Dell Pro 14 & Dell Pro 16.', visible: true },
  { id: 'taxonomy-dell-vostro', name: 'Dell Vostro', slug: 'dell-vostro', parentId: 'tax-office-dell', description: 'Dell Vostro văn phòng thực dụng, dễ nâng cấp.', visible: true },

  // --- Cấp 2 & Cấp 3: HP Văn Phòng ---
  { id: 'taxonomy-hp-omnibook', name: 'HP OmniBook', slug: 'hp-omnibook', parentId: 'tax-office-hp', description: 'HP OmniBook X, OmniBook 7 & OmniBook Flip AI thế hệ mới.', visible: true },
  { id: 'tax-omnibook-x', name: 'OmniBook X / 7', slug: 'omnibook-x', parentId: 'taxonomy-hp-omnibook', description: 'HP OmniBook X / 7 / Aero siêu nhẹ Copilot+ PC.', visible: true },
  { id: 'tax-omnibook-flip', name: 'OmniBook 5 / Flip', slug: 'omnibook-flip', parentId: 'taxonomy-hp-omnibook', description: 'HP OmniBook 5 & OmniBook Flip xoay gập 360 độ cảm ứng.', visible: true },
  { id: 'taxonomy-hp-elitebook', name: 'HP EliteBook', slug: 'hp-elitebook', parentId: 'tax-office-hp', description: 'HP EliteBook vỏ nhôm doanh nhân cao cấp.', visible: true },
  { id: 'taxonomy-hp-series', name: 'HP 14 & HP 15', slug: 'hp-14-15', parentId: 'tax-office-hp', description: 'HP 14, HP 15 & HP Pavilion cho sinh viên và văn phòng.', visible: true },

  // --- Cấp 2 & Cấp 3: MSI Văn Phòng ---
  { id: 'taxonomy-msi-modern', name: 'MSI Modern', slug: 'msi-modern', parentId: 'tax-office-msi', description: 'MSI Modern 14 & Modern 15 gọn nhẹ cho học tập, văn phòng.', visible: true },
  { id: 'tax-modern-14', name: 'Modern 14', slug: 'modern-14', parentId: 'taxonomy-msi-modern', description: 'MSI Modern 14 mỏng nhẹ dễ dàng mang theo.', visible: true },
  { id: 'tax-modern-15', name: 'Modern 15', slug: 'modern-15', parentId: 'taxonomy-msi-modern', description: 'MSI Modern 15 màn hình lớn tối ưu đa nhiệm.', visible: true },

  { id: 'taxonomy-msi-prestige', name: 'MSI Prestige', slug: 'msi-prestige', parentId: 'tax-office-msi', description: 'MSI Prestige 13, 14, 16 AI+ cao cấp siêu nhẹ pin trâu.', visible: true },
  { id: 'tax-prestige-13', name: 'Prestige 13 AI', slug: 'prestige-13', parentId: 'taxonomy-msi-prestige', description: 'MSI Prestige 13 AI Evo nặng 990g pin 15 giờ.', visible: true },
  { id: 'tax-prestige-14-16', name: 'Prestige 14 / 16 AI', slug: 'prestige-14-16', parentId: 'taxonomy-msi-prestige', description: 'MSI Prestige 14 & Prestige 16 AI Studio màn QHD+/UHD+.', visible: true },

  { id: 'taxonomy-msi-venture', name: 'MSI Venture', slug: 'msi-venture', parentId: 'tax-office-msi', description: 'MSI Venture 14 & Venture 16 màn hình OLED sắc nét.', visible: true },

  // --- Cấp 2 & Cấp 3: Acer Văn Phòng ---
  { id: 'taxonomy-acer-aspire', name: 'Acer Aspire', slug: 'acer-aspire', parentId: 'tax-office-acer', description: 'Acer Aspire Lite, Aspire Go & Aspire 5 giá tốt cho sinh viên.', visible: true },
  { id: 'tax-aspire-lite', name: 'Aspire Lite', slug: 'aspire-lite', parentId: 'taxonomy-acer-aspire', description: 'Acer Aspire Lite 14 / 15 / 16 gọn nhẹ kinh tế.', visible: true },
  { id: 'tax-aspire-go', name: 'Aspire Go / Vero', slug: 'aspire-go', parentId: 'taxonomy-acer-aspire', description: 'Acer Aspire Go & Aspire 5 / Vero cân bằng học tập làm việc.', visible: true },
  { id: 'taxonomy-acer-swift', name: 'Acer Swift', slug: 'acer-swift', parentId: 'tax-office-acer', description: 'Acer Swift Go & Swift Edge AI siêu mỏng nhẹ.', visible: true },

  // --- Cấp 2: Microsoft Surface & LG Gram ---
  { id: 'tax-surface-pro', name: 'Surface Pro', slug: 'surface-pro', parentId: 'taxonomy-microsoft-surface', description: 'Microsoft Surface Pro tablet lai laptop cao cấp.', visible: true },
  { id: 'tax-surface-laptop', name: 'Surface Laptop', slug: 'surface-laptop', parentId: 'taxonomy-microsoft-surface', description: 'Microsoft Surface Laptop Copilot+ PC màn PixelSense.', visible: true },
  { id: 'tax-lg-gram-14-16', name: 'LG Gram 14 / 16', slug: 'lg-gram-14-16', parentId: 'taxonomy-lg-gram', description: 'LG Gram 14 & 16 inch siêu nhẹ hợp kim Magie.', visible: true },

  // =========================================================================
  // C. LAPTOP ĐỒ HỌA & WORKSTATION: Brand (Cấp 1) -> Series (Cấp 2) -> Model (Cấp 3)
  // =========================================================================
  { id: 'tax-ws-dell', name: 'Dell Workstation', slug: 'dell-workstation', parentId: 'cat-do-hoa', description: 'Máy trạm Mobile Workstation Dell Precision chuẩn ISV.', visible: true },
  { id: 'tax-ws-lenovo', name: 'Lenovo Workstation', slug: 'lenovo-workstation', parentId: 'cat-do-hoa', description: 'Máy trạm Lenovo ThinkPad P-series hiệu năng cao.', visible: true },
  { id: 'tax-ws-hp', name: 'HP Workstation', slug: 'hp-workstation', parentId: 'cat-do-hoa', description: 'Máy trạm di động HP ZBook Studio, Fury, Firefly.', visible: true },
  { id: 'tax-ws-gigabyte', name: 'Gigabyte Workstation', slug: 'gigabyte-workstation', parentId: 'cat-do-hoa', description: 'Laptop đồ họa Gigabyte AERO màn hình chuẩn màu Pantone.', visible: true },
  { id: 'tax-ws-asus', name: 'ASUS Workstation', slug: 'asus-workstation', parentId: 'cat-do-hoa', description: 'Laptop sáng tạo nội dung ASUS ProArt Studio.', visible: true },
  { id: 'tax-ws-msi', name: 'MSI Workstation', slug: 'msi-workstation', parentId: 'cat-do-hoa', description: 'Laptop đồ họa kỹ thuật MSI Creator Studio.', visible: true },

  // --- Cấp 2 & Cấp 3: Workstation ---
  { id: 'taxonomy-dell-precision', name: 'Dell Precision', slug: 'dell-precision', parentId: 'tax-ws-dell', description: 'Máy trạm Dell Precision 3000, 5000, 7000 series VGA RTX A/Ada chuyên nghiệp.', visible: true },
  { id: 'tax-precision-3000', name: 'Precision 3000 Series', slug: 'precision-3000', parentId: 'taxonomy-dell-precision', description: 'Dell Precision 3580 / 3590 mỏng nhẹ giá tốt cho kỹ sư CAD.', visible: true },
  { id: 'tax-precision-5000', name: 'Precision 5000 Series', slug: 'precision-5000', parentId: 'taxonomy-dell-precision', description: 'Dell Precision 5480 / 5680 / 5690 thiết kế CNC viền siêu mỏng.', visible: true },
  { id: 'tax-precision-7000', name: 'Precision 7000 Series', slug: 'precision-7000', parentId: 'taxonomy-dell-precision', description: 'Dell Precision 7680 / 7780 hiệu suất tối đa cho 3D nặng & AI.', visible: true },

  { id: 'taxonomy-lenovo-thinkpad-p', name: 'Lenovo ThinkPad P', slug: 'lenovo-thinkpad-p', parentId: 'tax-ws-lenovo', description: 'Máy trạm Lenovo ThinkPad P1, P16 bền bỉ chuẩn ISV.', visible: true },
  { id: 'tax-thinkpad-p1', name: 'ThinkPad P1', slug: 'thinkpad-p1', parentId: 'taxonomy-lenovo-thinkpad-p', description: 'Lenovo ThinkPad P1 mỏng nhẹ chuẩn đồ họa di động.', visible: true },
  { id: 'tax-thinkpad-p16', name: 'ThinkPad P16 / P16s', slug: 'thinkpad-p16', parentId: 'taxonomy-lenovo-thinkpad-p', description: 'Lenovo ThinkPad P16 workstation hạng nặng RTX Ada.', visible: true },

  { id: 'taxonomy-hp-zbook', name: 'HP ZBook', slug: 'hp-zbook', parentId: 'tax-ws-hp', description: 'Máy trạm di động HP ZBook Studio, Firefly, Fury.', visible: true },
  { id: 'tax-zbook-studio', name: 'ZBook Studio', slug: 'zbook-studio', parentId: 'taxonomy-hp-zbook', description: 'HP ZBook Studio gọn nhẹ chuyên dựng phim & sáng tạo.', visible: true },
  { id: 'tax-zbook-fury', name: 'ZBook Fury', slug: 'zbook-fury', parentId: 'taxonomy-hp-zbook', description: 'HP ZBook Fury máy trạm 16 inch hiệu năng cao.', visible: true },
  { id: 'tax-zbook-firefly', name: 'ZBook Firefly', slug: 'zbook-firefly', parentId: 'taxonomy-hp-zbook', description: 'HP ZBook Firefly siêu di động cho kiến trúc sư, lập trình.', visible: true },

  { id: 'taxonomy-gigabyte-aero', name: 'Gigabyte AERO', slug: 'gigabyte-aero', parentId: 'tax-ws-gigabyte', description: 'Laptop Creator Gigabyte AERO 16 màn chuẩn màu Pantone Validated.', visible: true },

  { id: 'taxonomy-asus-proart', name: 'ASUS ProArt', slug: 'asus-proart', parentId: 'tax-ws-asus', description: 'Laptop đồ họa sáng tạo ASUS ProArt P16 & PX13.', visible: true },
  { id: 'tax-proart-p16', name: 'ProArt P16', slug: 'proart-p16', parentId: 'taxonomy-asus-proart', description: 'ASUS ProArt P16 OLED 4K DialPad chuyên dựng phim 8K.', visible: true },
  { id: 'tax-proart-px-pz', name: 'ProArt PX13 / PZ13', slug: 'proart-px-pz', parentId: 'taxonomy-asus-proart', description: 'ASUS ProArt PX13 & PZ13 sáng tạo mọi lúc mọi nơi.', visible: true },

  { id: 'taxonomy-msi-creator', name: 'MSI Creator', slug: 'msi-creator', parentId: 'tax-ws-msi', description: 'Laptop đồ họa MSI Creator M16, Creator 16 AI & Creator Z16.', visible: true },
  { id: 'tax-creator-z16', name: 'Creator Z16 / M16', slug: 'creator-z16', parentId: 'taxonomy-msi-creator', description: 'MSI Creator Z16 HX Studio & Creator M16 CNC chuẩn màu.', visible: true },
  { id: 'tax-creator-16-ai', name: 'Creator 16 AI', slug: 'creator-16-ai', parentId: 'taxonomy-msi-creator', description: 'MSI Creator 16 AI Studio màn MiniLED 4K+.', visible: true },

  // =========================================================================
  // D. APPLE MACBOOK (5 subcategories)
  // =========================================================================
  { id: 'taxonomy-macbook-air', name: 'MacBook Air', slug: 'macbook-air', parentId: 'cat-macbook', description: 'MacBook Air 13 inch & 15 inch chip Apple M2, M3, M4.', visible: true },
  { id: 'taxonomy-macbook-pro', name: 'MacBook Pro', slug: 'macbook-pro', parentId: 'cat-macbook', description: 'MacBook Pro 14 inch & 16 inch chip M3/M4/M4 Pro/M4 Max.', visible: true },
  { id: 'taxonomy-mac-mini', name: 'Mac Mini', slug: 'mac-mini', parentId: 'cat-macbook', description: 'Apple Mac Mini nhỏ gọn hiệu năng cao.', visible: true },
  { id: 'taxonomy-mac-studio', name: 'Mac Studio', slug: 'mac-studio', parentId: 'cat-macbook', description: 'Apple Mac Studio chuyên nghiệp cho studio & dựng phim.', visible: true },
  { id: 'taxonomy-imac', name: 'iMac', slug: 'imac', parentId: 'cat-macbook', description: 'Apple iMac All-in-One màn hình Retina 4.5K.', visible: true },

  // =========================================================================
  // E. PHỤ KIỆN & LINH KIỆN (16 subcategories)
  // =========================================================================
  { id: 'ref-accessory-mouse', name: 'Chuột máy tính', slug: 'chuot-may-tinh', parentId: 'cat-phu-kien', description: 'Chuột gaming và chuột không dây văn phòng Razer, ASUS ROG, Logitech, DareU.', visible: true },
  { id: 'ref-accessory-keyboard', name: 'Bàn phím cơ', slug: 'ban-phim-co', parentId: 'cat-phu-kien', description: 'Bàn phím cơ 3 mode không dây, LED RGB Aula, Akko, ASUS ROG, DareU.', visible: true },
  { id: 'ref-accessory-audio', name: 'Tai nghe', slug: 'tai-nghe', parentId: 'cat-phu-kien', description: 'Tai nghe gaming chụp tai, Bluetooth không dây từ ASUS ROG, Onikuma.', visible: true },
  { id: 'ref-accessory-bag', name: 'Balo laptop', slug: 'balo-laptop', parentId: 'cat-phu-kien', description: 'Balo gaming và balo chống sốc laptop Alienware, MSI.', visible: true },
  { id: 'ref-accessory-sleeve', name: 'Túi chống sốc', slug: 'tui-chong-soc', parentId: 'cat-phu-kien', description: 'Túi chống sốc bảo vệ laptop 13 – 16 inch.', visible: true },
  { id: 'ref-accessory-charger', name: 'Sạc & Cáp', slug: 'sac-cap', parentId: 'cat-phu-kien', description: 'Adapter sạc laptop chính hãng Lenovo, Dell, MSI và củ sạc nhanh GaN.', visible: true },
  { id: 'ref-accessory-hub', name: 'Hub USB-C', slug: 'hub-usb-c', parentId: 'cat-phu-kien', description: 'Hub chuyển đổi đa năng Type-C sang HDMI 4K, USB 3.0, LAN, PD 100W.', visible: true },
  { id: 'ref-accessory-stand', name: 'Giá đỡ laptop', slug: 'gia-do-laptop', parentId: 'cat-phu-kien', description: 'Giá đỡ hợp kim nhôm nâng tầm nhìn công thái học.', visible: true },
  { id: 'ref-accessory-cooler', name: 'Đế tản nhiệt', slug: 'de-tan-nhiet', parentId: 'cat-phu-kien', description: 'Đế quạt hút tản nhiệt chuyên dụng cho laptop gaming và đồ họa.', visible: true },
  { id: 'ref-accessory-ram', name: 'RAM Laptop', slug: 'ram-laptop', parentId: 'cat-phu-kien', description: 'RAM laptop DDR4 / DDR5 chính hãng TeamGroup, Lexar, Crucial.', visible: true },
  { id: 'ref-accessory-hardware', name: 'SSD Laptop', slug: 'ssd-laptop', parentId: 'cat-phu-kien', description: 'Ổ cứng SSD M.2 NVMe Gen3/Gen4/Gen5 & SATA III nâng cấp laptop.', visible: true },
  { id: 'ref-accessory-screenbar', name: 'Đèn màn hình', slug: 'den-man-hinh', parentId: 'cat-phu-kien', description: 'Đèn treo màn hình chống lóa bảo vệ mắt khi làm việc ban đêm.', visible: true },
  { id: 'ref-accessory-deskpad', name: 'Lót chuột & Deskpad', slug: 'deskpad-lot-chuot', parentId: 'cat-phu-kien', description: 'Thảm trải bàn deskpad da PU và lót chuột gaming khổ lớn.', visible: true },
  { id: 'ref-accessory-webcam', name: 'Webcam', slug: 'webcam', parentId: 'cat-phu-kien', description: 'Webcam Full HD / 4K họp trực tuyến và stream.', visible: true },
  { id: 'ref-accessory-speaker-mic', name: 'Loa & Micro', slug: 'loa-micro', parentId: 'cat-phu-kien', description: 'Micro thu âm, livestream AVerMedia và loa Bluetooth.', visible: true },
  { id: 'ref-accessory-controller', name: 'Tay cầm chơi game', slug: 'tay-cam-choi-game', parentId: 'cat-phu-kien', description: 'Tay cầm chơi game không dây/có dây cho PC & laptop.', visible: true },
];

function categoryPathById(categoryId) {
  const byId = new Map(CATEGORY_DEFS.map((c) => [c.id, c]));
  const chain = [];
  let cur = byId.get(categoryId);
  while (cur) {
    chain.unshift(cur.slug);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return '/' + chain.join('/');
}

function getRootCatId(categoryId) {
  const byId = new Map(CATEGORY_DEFS.map((c) => [c.id, c]));
  let cur = byId.get(categoryId);
  while (cur?.parentId) {
    cur = byId.get(cur.parentId);
  }
  return cur?.id || categoryId;
}

const INTERNAL_LINK_MAP = new Map([
  ['/', '/'],
  ['/laptop-gaming', '/laptop-gaming'],
  ['/laptop-gaming-ban-chay-nhat', '/laptop-gaming'],
  ['/laptop-gaming-basic', '/laptop-gaming'],
  ['/laptop-gaming-performance', '/laptop-gaming'],
  ['/laptop-gaming-hiend', '/laptop-gaming'],
  ['/laptop-gaming-rtx-40-series', '/laptop-gaming'],
  ['/laptop-gaming-vga-rtx-50-series', '/laptop-gaming'],
  ['/laptop-lenovo-gaming', categoryPathById('tax-gaming-lenovo')],
  ['/lenovo-gaming-loq', categoryPathById('taxonomy-lenovo-loq')],
  ['/laptop-lenovo-legion', categoryPathById('taxonomy-lenovo-legion')],
  ['/lenovo-legion-5', categoryPathById('tax-legion-5')],
  ['/lenovo-legion-pro-5', categoryPathById('tax-legion-pro-5')],
  ['/lenovo-legion-7', categoryPathById('tax-legion-7')],
  ['/lenovo-legion-pro-7', categoryPathById('tax-legion-7')],
  ['/lenovo-legion-r7000', categoryPathById('tax-legion-pro-5')],
  ['/lenovo-legion-y7000', categoryPathById('tax-legion-5')],
  ['/laptop-msi-gaming', categoryPathById('tax-gaming-msi')],
  ['/laptop-gaming-msi-vga-rtx-50-series', categoryPathById('taxonomy-msi-crosshair')],
  ['/msi-cyborg', categoryPathById('taxonomy-msi-cyborg')],
  ['/msi-cyborg-15', categoryPathById('tax-cyborg-15')],
  ['/msi-katana-15', categoryPathById('tax-katana-15')],
  ['/msi-thin-15', categoryPathById('taxonomy-msi-thin')],
  ['/laptop-msi-crosshair-16-hx', categoryPathById('tax-crosshair-16')],
  ['/msi-vector-16-hx', categoryPathById('taxonomy-msi-vector')],
  ['/msi-raider', categoryPathById('taxonomy-msi-raider')],
  ['/msi-stealth', categoryPathById('taxonomy-msi-stealth')],
  ['/laptop-msi-titan', categoryPathById('taxonomy-msi-titan')],
  ['/laptop-asus-gaming', categoryPathById('tax-gaming-asus')],
  ['/asus-tuf-gaming', categoryPathById('taxonomy-asus-tuf')],
  ['/asus-tuf-gaming-f15-fx507', categoryPathById('tax-tuf-f15-f16')],
  ['/asus-rog-strix', categoryPathById('tax-rog-strix-g')],
  ['/asus-rog-strix-scar', categoryPathById('tax-rog-strix-scar')],
  ['/laptop-asus-rog-zephyrus', categoryPathById('tax-rog-zephyrus')],
  ['/laptop-gigabyte-gaming', categoryPathById('tax-gaming-gigabyte')],
  ['/laptop-gigabyte-aorus', categoryPathById('tax-gigabyte-aorus')],
  ['/laptop-dell-gaming', categoryPathById('tax-gaming-dell')],
  ['/laptop-dell-alienware', categoryPathById('taxonomy-dell-alienware')],
  ['/laptop-hp-gaming', categoryPathById('tax-gaming-hp')],
  ['/hp-omen', categoryPathById('taxonomy-hp-omen')],
  ['/hp-victus', categoryPathById('taxonomy-hp-victus')],

  ['/laptop-van-phong', '/laptop-van-phong'],
  ['/laptop-van-phong-ban-chay-nhat', '/laptop-van-phong'],
  ['/laptop-van-phong-pho-thong', '/laptop-van-phong'],
  ['/laptop-van-phong-cao-cap', '/laptop-van-phong'],
  ['/laptop-marketing', '/laptop-van-phong'],
  ['/laptop-ai', '/laptop-van-phong'],
  ['/laptop-lenovo-van-phong', categoryPathById('tax-office-lenovo')],
  ['/laptop-lenovo', categoryPathById('tax-office-lenovo')],
  ['/lenovo-ideapad', categoryPathById('taxonomy-lenovo-ideapad')],
  ['/lenovo-yoga', categoryPathById('taxonomy-lenovo-yoga')],
  ['/laptop-lenovo-thinkbook', categoryPathById('taxonomy-lenovo-thinkbook')],
  ['/lenovo-thinkpad', categoryPathById('taxonomy-lenovo-thinkpad')],
  ['/thinkpad-e', categoryPathById('tax-thinkpad-e')],
  ['/thinkpad-t-series', categoryPathById('tax-thinkpad-t')],
  ['/thinkpad-x1-carbon', categoryPathById('tax-thinkpad-x1')],
  ['/laptop-asus-van-phong', categoryPathById('tax-office-asus')],
  ['/asus-vivobook-14', categoryPathById('tax-vivobook-14')],
  ['/asus-vivobook-15', categoryPathById('tax-vivobook-15')],
  ['/asus-vivobook-16', categoryPathById('tax-vivobook-16')],
  ['/asus-vivobook-oled', categoryPathById('tax-vivobook-s-oled')],
  ['/laptop-asus-vivobook-go-14-e1404', categoryPathById('tax-vivobook-14')],
  ['/laptop-asus-vivobook-go-15-e1504', categoryPathById('tax-vivobook-15')],
  ['/asus-zenbook', categoryPathById('taxonomy-asus-zenbook')],
  ['/asus-zenbook-14-oled', categoryPathById('tax-zenbook-14')],
  ['/laptop-asus-zenbook-14-oled-ux3405', categoryPathById('tax-zenbook-14')],
  ['/laptop-dell-van-phong', categoryPathById('tax-office-dell')],
  ['/dell-inspiron', categoryPathById('taxonomy-dell-inspiron')],
  ['/laptop-dell-inspiron-14-5440', categoryPathById('tax-inspiron-14')],
  ['/laptop-dell-inspiron-15-3530', categoryPathById('tax-inspiron-15')],
  ['/dell-xps', categoryPathById('taxonomy-dell-xps')],
  ['/dell-latitude', categoryPathById('taxonomy-dell-latitude')],
  ['/dell-pro', categoryPathById('taxonomy-dell-pro')],
  ['/laptop-hp-van-phong', categoryPathById('tax-office-hp')],
  ['/laptop-hp-omnibook', categoryPathById('taxonomy-hp-omnibook')],
  ['/laptop-hp-elitebook', categoryPathById('taxonomy-hp-elitebook')],
  ['/laptop-hp-14', categoryPathById('taxonomy-hp-series')],
  ['/laptop-hp-15', categoryPathById('taxonomy-hp-series')],
  ['/msi-van-phong', categoryPathById('tax-office-msi')],
  ['/msi-modern-14', categoryPathById('tax-modern-14')],
  ['/msi-modern-15', categoryPathById('tax-modern-15')],
  ['/msi-venture', categoryPathById('taxonomy-msi-venture')],
  ['/msi-prestige-13', categoryPathById('tax-prestige-13')],
  ['/msi-prestige-14', categoryPathById('tax-prestige-14-16')],
  ['/msi-prestige-16', categoryPathById('tax-prestige-14-16')],
  ['/laptop-acer-van-phong', categoryPathById('tax-office-acer')],
  ['/acer-aspire-lite', categoryPathById('tax-aspire-lite')],
  ['/acer-swift', categoryPathById('taxonomy-acer-swift')],

  ['/laptop-content-creator', '/laptop-workstation'],
  ['/mobile-workstation', '/laptop-workstation'],
  ['/laptop-ky-thuat-do-hoa', '/laptop-workstation'],
  ['/laptop-dell-precision', categoryPathById('taxonomy-dell-precision')],
  ['/thinkpad-workstation', categoryPathById('taxonomy-lenovo-thinkpad-p')],
  ['/laptop-gigabyte-aero', categoryPathById('taxonomy-gigabyte-aero')],
  ['/laptop-gigabyte-aero-16', categoryPathById('taxonomy-gigabyte-aero')],

  ['/apple', '/macbook'],
  ['/macbook', '/macbook'],
  ['/macbook-air-13', '/macbook/macbook-air'],
  ['/macbook-air-15', '/macbook/macbook-air'],
  ['/macbook-pro-14', '/macbook/macbook-pro'],
  ['/macbook-pro-16', '/macbook/macbook-pro'],
  ['/linh-kien-va-phu-kien', '/phu-kien'],
  ['/linh-phu-kien', '/phu-kien'],
  ['/mouse-chuot', '/phu-kien/chuot-may-tinh'],
  ['/mouse-asus', '/phu-kien/chuot-may-tinh'],
  ['/keyboard-ban-phim', '/phu-kien/ban-phim-co'],
  ['/keyboard-aula', '/phu-kien/ban-phim-co'],
  ['/keyboard-akko', '/phu-kien/ban-phim-co'],
  ['/keyboard-asus', '/phu-kien/ban-phim-co'],
  ['/headset-tai-nghe', '/phu-kien/tai-nghe'],
  ['/headset-onikuma', '/phu-kien/tai-nghe'],
  ['/headset-asus', '/phu-kien/tai-nghe'],
  ['/balo-gaming', '/phu-kien/balo-laptop'],
  ['/ram-for-laptop', '/phu-kien/ram-laptop'],
  ['/ssd-for-laptop', '/phu-kien/ssd-laptop'],
]);

function categoryNameById(categoryId) {
  return CATEGORY_DEFS.find((c) => c.id === categoryId)?.name || 'Laptop';
}

// ---------------------------------------------------------------------------
// 3. Name, Part Code & Specs Parsing
// ---------------------------------------------------------------------------
function normalizeBrand(rawVendor, name) {
  const combined = `${rawVendor || ''} ${name || ''}`.toLowerCase();
  if (/\bapple\b|\bmacbook\b/.test(combined)) return 'Apple';
  if (/\blenovo\b|\blegion\b|\bthinkpad\b|\bthinkbook\b|\bideapad\b|\bloq\b|\blecoo\b/.test(combined)) return 'Lenovo';
  if (/\basus\b|\brog\b|\btuf\b|\bzenbook\b|\bvivobook\b|\bproart\b/.test(combined)) return 'Asus';
  if (/\bdell\b|\balienware\b|\bxps\b|\bprecision\b|\blatitude\b|\binspiron\b|\bvostro\b/.test(combined)) return 'Dell';
  if (/\bhp\b|\bomnibook\b|\belitebook\b|\bvictus\b|\bomen\b|\bzbook\b/.test(combined)) return 'HP';
  if (/\bmsi\b|\bkatana\b|\bcyborg\b|\braider\b|\bstealth\b|\bprestige\b|\bcrosshair\b|\bvector\b|\btitan\b|\bventure\b/.test(combined)) return 'MSI';
  if (/\bacer\b|\bnitro\b|\bpredator\b|\baspire\b|\bswift\b/.test(combined)) return 'Acer';
  if (/\bgigabyte\b|\baorus\b|\baero\b/.test(combined)) return 'Gigabyte';
  if (/\brazer\b/.test(combined)) return 'Razer';
  if (/\baula\b/.test(combined)) return 'Aula';
  if (/\bakko\b/.test(combined)) return 'Akko';
  if (/\bonikuma\b/.test(combined)) return 'Onikuma';
  if (/\blogitech\b/.test(combined)) return 'Logitech';
  if (/\bteamgroup\b/.test(combined)) return 'TeamGroup';
  if (/\blexar\b/.test(combined)) return 'Lexar';
  if (/\bcrucial\b/.test(combined)) return 'Crucial';
  if (/\brapoo\b/.test(combined)) return 'Rapoo';
  if (/\bhyperwork\b/.test(combined)) return 'HyperWork';
  if (/\banker\b/.test(combined)) return 'Anker';
  if (/\bugreen\b/.test(combined)) return 'Ugreen';
  if (/\bavermedia\b/.test(combined)) return 'AVerMedia';
  if (/\bdareu\b/.test(combined)) return 'DareU';
  if (/\bsamsung\b/.test(combined)) return 'Samsung';
  if (/\blg\b/.test(combined)) return 'LG';
  if (/\bmicrosoft\b|\bsurface\b/.test(combined)) return 'Microsoft';
  return (rawVendor || '').trim() || 'CitiLap';
}

function cleanPartNumber(rawName) {
  const m = rawName.match(/(?:\.\s*|\|\s*)Part\s*:\s*([A-Za-z0-9._\-\s/]+)$/i);
  if (m) return m[1].trim();
  const codeMatch = rawName.match(/\b([A-Z0-9]{2,}[A-Z0-9-]*\d[A-Z0-9-]*)\b(?=\s*\||$)/);
  return codeMatch ? codeMatch[1] : '';
}

function shortCpu(raw) {
  return raw
    .replace(/^CPU\s+/i, '')
    .replace(/Intel\s+Core\s+/i, 'Core ')
    .replace(/AMD\s+Ryzen\s+/i, 'Ryzen ')
    .replace(/\bR([3579])\s+/i, 'Ryzen $1 ')
    .trim();
}

function shortGpu(raw) {
  return raw
    .replace(/^(?:VGA|GPU)\s+/i, '')
    .replace(/NVIDIA\s+GeForce\s+/i, '')
    .replace(/^\s*(3050|4050|4060|4070|4080|4090|5050|5060|5070|5080|5090)\b/i, 'RTX $1')
    .trim();
}

function smartCaseTitle(baseTitle) {
  const upperRatio = (baseTitle.match(/[A-Z]/g)?.length || 0) / Math.max(1, baseTitle.replace(/[^a-zA-Z]/g, '').length);
  if (upperRatio < 0.7) return baseTitle;
  const keepUpper = new Set(['HP', 'MSI', 'ASUS', 'LG', 'LOQ', 'ROG', 'TUF', 'XPS', 'OLED', 'IPS', 'RGB', 'AI', 'PRO', 'MAX', 'USB', 'SSD', 'RAM', 'NVME', 'FHD', 'QHD', 'UHD', 'WUXGA', 'WQXGA', 'AERO', 'AORUS', 'VN', 'HX', 'HS', 'SE']);
  return baseTitle.split(/\s+/).map((w) => {
    const clean = w.replace(/[^A-Za-z0-9]/g, '');
    if (keepUpper.has(w.toUpperCase()) || keepUpper.has(clean.toUpperCase())) return w.toUpperCase();
    if (/^[A-Z0-9-]{2,}\d+[A-Z0-9-]*$/i.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

function buildCleanLaptopName(rawName, parsedSpecs) {
  const cleanRaw = decodeEntities(rawName)
    .replace(/\s*(?:\.\s*|\|\s*)Part\s*:.*$/i, '')
    .trim();
  const baseTitleRaw = cleanRaw
    .split('|')[0]
    .replace(/^Laptop\s+(?:Gaming\s+|Workstation\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const baseTitle = smartCaseTitle(baseTitleRaw);

  const cpu = shortCpu(parsedSpecs.CPU || '');
  const ram = (parsedSpecs.RAM || '').match(/\d+\s*GB/i)?.[0] || '';
  const gpu = shortGpu(parsedSpecs.GPU || '');
  const isDiscreteGpu = gpu && !/onboard|iris|uhd|integrated|radeon\s*graphics/i.test(gpu);

  const summaryBits = [cpu, isDiscreteGpu ? gpu.replace(/\s*\d+GB$/i, '') : ram].filter(Boolean);
  const full = summaryBits.length ? `${baseTitle} (${summaryBits.join(' / ')})` : baseTitle;
  return full.slice(0, 120);
}

function cleanAccessoryName(rawName) {
  return decodeEntities(rawName)
    .replace(/\s+/g, ' ')
    .replace(/^Mouse\s+/i, 'Chuột ')
    .replace(/^Keyboard\s+/i, 'Bàn phím cơ ')
    .replace(/^Headset\s+/i, 'Tai nghe ')
    .replace(/for Laptop/gi, 'Laptop')
    .trim()
    .slice(0, 140);
}

function parsePipeSpecs(rawName) {
  const parts = decodeEntities(rawName).split('|').map((s) => s.trim());
  const out = {};
  for (const part of parts.slice(1)) {
    if (/^Part\s*:/i.test(part)) continue;
    if (/^CPU\b/i.test(part)) out.CPU = part.replace(/^CPU\s*/i, '').trim();
    else if (/^RAM\b/i.test(part)) out.RAM = part.replace(/^RAM\s*/i, '').trim();
    else if (/^(?:SSD|SDD)\b/i.test(part)) out.SSD = part.replace(/^(?:SSD|SDD)\s*/i, '').trim();
    else if (/^(?:VGA|GPU)\b/i.test(part)) out.GPU = part.replace(/^(?:VGA|GPU)\s*/i, '').trim();
    else if (/^Win|^MacOS|^Linux|^No OS/i.test(part)) out['Hệ điều hành'] = part.replace(/\.\s*Part:.*$/i, '').trim();
    else if (/inch|FHD|QHD|WUXGA|WQXGA|OLED|UHD|IPS/i.test(part)) out['Màn hình'] = part.replace(/\.\s*Part:.*$/i, '').trim();
  }
  return out;
}

function parseHtmlSpecTables(html) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html || '')) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]));
    if (cells.length >= 2) {
      const k = cells[0].replace(/:$/, '').trim();
      const v = cells.slice(1).join(' ').trim();
      if (!k || !v) continue;
      if (/^(cập nhật|đang cập nhật|-|—)$/i.test(v)) continue;
      if (/laptopnew|ltn/i.test(v) || /địa điểm\s*2/i.test(k)) continue;
      rows.push({ key: k, value: v });
    }
  }
  return rows;
}

function isMeaningfulSpec(val) {
  const t = String(val || '').trim();
  return t.length > 0 && !/^(cập nhật|đang cập nhật|chưa cập nhật|n\/a|null|undefined|-|—)$/i.test(t);
}

function buildLaptopSpecs(product, pipeSpecs, htmlSpecs, partCode) {
  const map = new Map();
  const findTable = (re) => htmlSpecs.find((r) => re.test(r.key))?.value || '';

  const cpuVal = pipeSpecs.CPU || [findTable(/^Model$/i), findTable(/CPU|Xung nhịp/i)].filter(Boolean).join(' ') || '';
  const gpuVal = (() => {
    const dedicated = findTable(/VGA chuyên dụng/i);
    const onboard = findTable(/VGA tích hợp/i);
    if (pipeSpecs.GPU && !/onboard/i.test(pipeSpecs.GPU)) return shortGpu(pipeSpecs.GPU);
    if (dedicated) return dedicated;
    if (pipeSpecs.GPU && /onboard/i.test(pipeSpecs.GPU)) return onboard || 'Card đồ họa tích hợp';
    return onboard || 'Card đồ họa tích hợp';
  })();

  const ramVal = pipeSpecs.RAM || [findTable(/^Dung lượng$/i), findTable(/^Công nghệ$/i)].filter(Boolean).join(' ') || '16GB DDR5';
  const ssdVal = pipeSpecs.SSD || [findTable(/Dung lượng SSD/i), findTable(/^Công nghệ$/i)].filter(Boolean).join(' ') || '512GB NVMe SSD';

  const screenSizeRaw = findTable(/^Kích thước$/i);
  const resRaw = findTable(/^Độ phân giải$/i);
  const panelRaw = findTable(/^tấm nền$/i);
  const colorRaw = findTable(/^Độ phủ màu$/i);
  const hzRaw = findTable(/^Tần số quét$/i);
  const tableScreen = [screenSizeRaw, resRaw, panelRaw, colorRaw, hzRaw].filter(Boolean).join(' · ');
  const displayVal = pipeSpecs['Màn hình'] || tableScreen || '15.6 inch FHD IPS';

  const hzVal = hzRaw || (displayVal.match(/(\d{2,3}\s*Hz)/i)?.[1] || '60Hz');
  const pinVal = findTable(/^Pin$/i);
  const weightVal = findTable(/^Trọng lượng$/i);
  const portsVal = htmlSpecs.filter((r) => /cổng|usb|hdmi|thunderbolt|jack|lan/i.test(r.key)).map((r) => r.value).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).join(', ');
  const osVal = pipeSpecs['Hệ điều hành'] || findTable(/^Hệ điều hành$/i) || 'Windows 11 bản quyền';
  const ramUpgrade = findTable(/^Số slot$/i);

  const setIf = (k, v) => {
    if (isMeaningfulSpec(v)) map.set(k, String(v).slice(0, 195));
  };

  setIf('CPU', cpuVal);
  setIf('GPU', gpuVal);
  setIf('RAM', ramVal);
  setIf('SSD', ssdVal);
  setIf('Màn hình', displayVal);
  setIf('Tần số quét', hzVal);
  setIf('Pin', pinVal);
  setIf('Trọng lượng', weightVal);
  setIf('Cổng kết nối', portsVal);
  setIf('Hệ điều hành', osVal);
  if (partCode) setIf('Mã sản phẩm (Part)', partCode);
  if (ramUpgrade) setIf('Khả năng nâng cấp', ramUpgrade);

  const yearMatch = (product.name + ' ' + (product.content || '')).match(/\b(202[3-6])\b/);
  setIf('Năm ra mắt', yearMatch ? yearMatch[1] : '2025');

  return [...map.entries()].map(([key, value]) => ({ key, value }));
}

function buildAccessorySpecs(template, htmlSpecs, rawName, brand) {
  const specs = [];
  const seen = new Set();
  const add = (key, value) => {
    const k = key.trim().slice(0, 100);
    const v = String(value || '').trim().slice(0, 195);
    if (!k || !isMeaningfulSpec(v) || seen.has(k.toLowerCase())) return;
    seen.add(k.toLowerCase());
    specs.push({ key: k, value: v });
  };

  for (const row of htmlSpecs) {
    if (/thông tin khác|xuất xứ|địa điểm|tình trạng|thời gian/i.test(row.key)) continue;
    add(row.key, row.value);
  }
  if (!seen.has('thương hiệu')) add('Thương hiệu', brand);

  if (template === 'KEYBOARD') {
    if (!seen.has('kết nối') && /3 mode/i.test(rawName)) add('Kết nối', '3 Mode (Bluetooth / 2.4GHz / Type-C)');
    if (!seen.has('đèn led') && /rgb/i.test(rawName)) add('Đèn LED', 'RGB nhiều chế độ');
  } else if (template === 'ACCESSORY' && /ssd/i.test(rawName)) {
    const rw = rawName.match(/Read\/Write:\s*([^)]+)/i)?.[1];
    if (rw) add('Tốc độ đọc / ghi', rw.trim());
    const gen = rawName.match(/PCIe\s*(Gen\s*\d[^-\s]*)|SATA\s*III/i)?.[0];
    if (gen) add('Chuẩn giao tiếp', gen.trim());
  }
  return specs.slice(0, 16);
}

// ---------------------------------------------------------------------------
// 4. CitiLap Editorial Content Rewriter
// ---------------------------------------------------------------------------
function rewriteInternalLink(rawHref) {
  if (!rawHref) return null;
  let pathOnly = rawHref.trim();
  if (/^https?:\/\/(?:www\.)?laptopnew\.vn/i.test(pathOnly)) {
    pathOnly = pathOnly.replace(/^https?:\/\/(?:www\.)?laptopnew\.vn/i, '') || '/';
  } else if (/^https?:\/\//i.test(pathOnly)) {
    return null;
  }
  pathOnly = pathOnly.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (INTERNAL_LINK_MAP.has(pathOnly)) return INTERNAL_LINK_MAP.get(pathOnly);
  for (const [k, v] of INTERNAL_LINK_MAP.entries()) {
    if (k !== '/' && pathOnly.includes(k.slice(1))) return v;
  }
  return null;
}

function cleanInlineAnchorsAndBrand(html) {
  let out = String(html || '');

  out = out.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const innerText = stripTags(inner);
    if (!innerText) return '';
    const mapped = rewriteInternalLink(href);
    if (mapped === '/') {
      const label = /laptopnew|ltn/i.test(innerText) ? 'CitiLap' : innerText;
      return `<a href="/">${escapeHtml(label)}</a>`;
    }
    if (mapped) {
      const cleanLabel = innerText.replace(/laptopnew\.vn|laptopnew|ltn/gi, 'CitiLap');
      return `<a href="${mapped}">${escapeHtml(cleanLabel)}</a>`;
    }
    return escapeHtml(innerText.replace(/laptopnew\.vn|laptopnew|ltn/gi, 'CitiLap'));
  });

  out = out
    .replace(/https?:\/\/(?:www\.)?laptopnew\.vn[^\s<"']*/gi, 'https://citilap.vn')
    .replace(/laptopnew\.vn/gi, 'citilap.vn')
    .replace(/\bLAPTOPNEW\b/g, 'CitiLap')
    .replace(/\bLaptopnew\b/g, 'CitiLap')
    .replace(/\bLTN\b/g, 'CitiLap')
    .replace(/1800\s*6800|0948\s*\d{3}\s*\d{3}|0838\s*\d{3}\s*\d{3}/g, '0899.188.186');

  return out;
}

function extractSectionsFromLaptopnewHtml(rawContent) {
  let html = String(rawContent || '');

  const specIdx = html.search(/<(?:h[1-6]|p|div|strong|b)[^>]*>[\s\S]{0,80}THÔNG SỐ KỸ THUẬT/i);
  if (specIdx > 200) {
    html = html.slice(0, specIdx);
  }
  html = html.replace(/<table[\s\S]*?<\/table>/gi, '');

  html = html
    .replace(/<p[^>]*>[\s\S]{0,220}?(?:GIỚI THIỆU VÀ ĐÁNH GIÁ|THÔNG TIN VÀ ĐÁNH GIÁ CHI TIẾT)[\s\S]*?<\/p>/gi, '')
    .replace(/<p[^>]*>[\s\S]{0,260}?Nội dung mô tả sản phẩm mang tính chất tham khảo[\s\S]*?<\/p>/gi, '')
    .replace(/<p[^>]*>(?:(?!(?:<\/p>)).)*BIÊN TẬP VIÊN\s*:[\s\S]*?<\/p>/gi, '')
    .replace(/<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');

  const imagePlaceholders = [];
  html = html.replace(
    /(?:<p[^>]*>\s*)?<img\b[^>]*src="([^"]+)"[^>]*>(?:\s*<\/p>)?(?:\s*<(?:h[3-6]|p)[^>]*>([\s\S]{0,220}?)<\/(?:h[3-6]|p)>)?/gi,
    (full, src, maybeCaption) => {
      if (!/^https?:\/\//i.test(src)) return '';
      const capText = stripTags(maybeCaption || '');
      const isCaption =
        capText &&
        capText.length <= 160 &&
        !/^\d+\.\s/.test(capText) &&
        (/ảnh minh họa|ảnh minh hoạ|thiết kế|màn hình|bàn phím|cổng kết nối|tản nhiệt|hiệu năng|âm thanh|ram |cận cảnh|mặt /i.test(capText) ||
          /<h[4-6]/i.test(full));
      const idx = imagePlaceholders.length;
      imagePlaceholders.push({ src, caption: isCaption ? capText.replace(/\(ảnh minh h[oọ]a\)/gi, '').trim() : '' });
      if (isCaption) {
        return `\n[[CITILAP_IMG_${idx}]]\n`;
      }
      return `\n[[CITILAP_IMG_${idx}]]\n${maybeCaption ? `<p>${maybeCaption}</p>` : ''}`;
    }
  );

  html = html
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    .replace(/\s+target="[^"]*"/gi, '')
    .replace(/\s+rel="[^"]*"/gi, '');

  return { cleanedHtml: html.trim(), imagePlaceholders };
}

function buildGeneratedCitiLapArticle({ cleanName, catName, catPath, brand, specs, isAccessory, specObj }) {
  if (isAccessory) {
    const specList = specs.slice(0, 8).map((s) => `<li><strong>${escapeHtml(s.key)}:</strong> ${escapeHtml(s.value)}</li>`).join('\n');
    return `
<h3>1. Thiết kế hoàn thiện & Độ bền sử dụng</h3>
<p><strong>${escapeHtml(cleanName)}</strong> đến từ thương hiệu <strong>${escapeHtml(brand)}</strong> được thiết kế tối ưu cho người dùng laptop thường xuyên làm việc, di chuyển hoặc setup góc làm việc gọn gàng. Các chi tiết hoàn thiện chắc chắn, độ bền cao và tương thích linh hoạt với nhiều dòng máy phổ biến hiện nay.</p>

<h3>2. Tính năng & Hiệu suất thực tế</h3>
<p>Thuộc nhóm <a href="${catPath}">${escapeHtml(catName)}</a>, sản phẩm đáp ứng ổn định các tiêu chí quan trọng về tốc độ, độ ổn định và tính tiện dụng hằng ngày. Người dùng có thể dễ dàng phối hợp cùng laptop văn phòng, laptop gaming hoặc MacBook để nâng cao trải nghiệm sử dụng.</p>
${specList ? `<ul>\n${specList}\n</ul>` : ''}

<h3>3. Đối tượng phù hợp</h3>
<ul>
  <li>Sinh viên, nhân viên văn phòng và kỹ sư cần phụ kiện chính hãng bền bỉ, giá hợp lý.</li>
  <li>Người dùng muốn nâng cấp hiệu suất làm việc, bảo vệ laptop hoặc tối ưu không gian bàn làm việc tại nhà và văn phòng.</li>
</ul>`;
  }

  return `
<h3>1. Thiết kế tinh tế & Độ hoàn thiện cao cấp</h3>
<p><strong>${escapeHtml(cleanName)}</strong> mang ngôn ngữ thiết kế đặc trưng của <strong>${escapeHtml(brand)}</strong> với thân máy chắc chắn, các đường nét hiện đại và tính cơ động cao. Trong phân khúc <a href="${catPath}">${escapeHtml(catName)}</a>, đây là lựa chọn cân bằng tốt giữa tính thẩm mỹ, độ bền và sự tiện lợi khi mang theo hằng ngày.</p>

<h3>2. Hiệu năng xử lý từ ${escapeHtml(specObj.CPU || 'vi xử lý thế hệ mới')}</h3>
<p>Trang bị bộ vi xử lý <strong>${escapeHtml(specObj.CPU || 'hiệu năng cao')}</strong> kết hợp cùng <strong>${escapeHtml(specObj.RAM || 'RAM dung lượng lớn')}</strong> và ổ cứng <strong>${escapeHtml(specObj.SSD || 'SSD NVMe tốc độ cao')}</strong>, máy đáp ứng trơn tru các tác vụ đa nhiệm, xử lý dữ liệu, lập trình, thiết kế đồ họa cũng như giải trí mượt mà. Card đồ họa <strong>${escapeHtml(specObj.GPU || 'tích hợp tối ưu')}</strong> giúp tối ưu khả năng xử lý hình ảnh và xuất màn hình độ phân giải cao.</p>

<h3>3. Màn hình sắc nét & Trải nghiệm hiển thị</h3>
<p>Màn hình <strong>${escapeHtml(specObj['Màn hình'] || 'độ phân giải cao, chuẩn màu tốt')}</strong> mang lại không gian hiển thị rộng rãi, chi tiết sắc nét và góc nhìn ổn định, phù hợp cho cả làm việc thời gian dài lẫn chỉnh sửa ảnh, video chuyên nghiệp.</p>

<h3>4. Bàn phím, cổng kết nối & Thời lượng pin</h3>
<p>Máy sở hữu bàn phím hành trình hợp lý cho cảm giác gõ êm ái, kết hợp hệ thống cổng giao tiếp đầy đủ (${escapeHtml(specObj['Cổng kết nối'] || 'USB-C / Thunderbolt, USB-A, HDMI, Jack 3.5mm')}) và chuẩn kết nối không dây tốc độ cao, giúp kết nối nhanh với màn hình rời, ổ cứng ngoài và mạng văn phòng.</p>

<h3>5. Đánh giá tổng kết: Ai nên chọn ${escapeHtml(cleanName)}?</h3>
<ul>
  <li><strong>Ưu điểm nổi bật:</strong> Hiệu năng ổn định, màn hình chất lượng cao, thiết kế sang trọng và khả năng vận hành bền bỉ lâu dài.</li>
  <li><strong>Phù hợp cho:</strong> Người dùng văn phòng chuyên nghiệp, lập trình viên, designer, content creator và khách hàng cần chiếc laptop tin cậy dài hạn tại <a href="/">CitiLap</a>.</li>
</ul>`;
}

function buildEditorialReviewHtml({
  cleanName,
  categoryId,
  brand,
  specs,
  rawContent,
  imgUrlMap,
  isAccessory,
}) {
  const catPath = categoryPathById(categoryId);
  const catName = categoryNameById(categoryId);
  const specObj = Object.fromEntries(specs.map((s) => [s.key, s.value]));

  const { cleanedHtml, imagePlaceholders } = extractSectionsFromLaptopnewHtml(rawContent);
  const plainLen = stripTags(cleanedHtml).replace(/\[\[CITILAP_IMG_\d+\]\]/g, '').length;
  const hasRealContent = plainLen >= 350 && !/^\s*CẬP NHẬT\s*$/i.test(stripTags(cleanedHtml));

  const quickHighlights = isAccessory
    ? [
        `<strong>Thương hiệu chính hãng:</strong> ${escapeHtml(brand)} — phân phối & kiểm tra chất lượng trực tiếp tại <a href="/">CitiLap</a>.`,
        ...specs.slice(0, 4).map((s) => `<strong>${escapeHtml(s.key)}:</strong> ${escapeHtml(s.value)}`),
        `<strong>Bảo hành uy tín:</strong> Bảo hành tiêu chuẩn 6 tháng tại CitiLap, lỗi 1 đổi 1 trong 7 ngày đầu tiên.`,
      ]
    : [
        specObj.CPU ? `<strong>Vi xử lý:</strong> ${escapeHtml(specObj.CPU)} xử lý mượt mà đa nhiệm và tác vụ chuyên sâu.` : null,
        specObj.GPU ? `<strong>Đồ họa:</strong> ${escapeHtml(specObj.GPU)} đáp ứng tốt công việc lẫn giải trí.` : null,
        specObj.RAM && specObj.SSD ? `<strong>Bộ nhớ & Lưu trữ:</strong> ${escapeHtml(specObj.RAM)} kết hợp ${escapeHtml(specObj.SSD)} tốc độ cao.` : null,
        specObj['Màn hình'] ? `<strong>Hiển thị:</strong> ${escapeHtml(specObj['Màn hình'])}${specObj['Tần số quét'] && !/\d+\s*Hz/i.test(specObj['Màn hình']) ? ` · ${escapeHtml(specObj['Tần số quét'])}` : ''}.` : null,
        `<strong>Cam kết CitiLap:</strong> Kiểm định kỹ thuật trước khi giao, hỗ trợ cài đặt phần mềm & bảo hành minh bạch.`,
      ].filter(Boolean);

  const highlightBox = `
<h2>Tổng quan nhanh ${escapeHtml(cleanName)}</h2>
<p><strong>${escapeHtml(cleanName)}</strong> là một trong những lựa chọn nổi bật thuộc danh mục <a href="${catPath}">${escapeHtml(catName)}</a> tại <a href="/">CitiLap</a>. Dưới đây là những điểm đáng chú ý nhất giúp bạn đánh giá nhanh trước khi lựa chọn:</p>
<ul>
${quickHighlights.map((item) => `  <li>${item}</li>`).join('\n')}
</ul>`;

  let bodyHtml = '';
  if (hasRealContent) {
    let rewritten = cleanInlineAnchorsAndBrand(cleanedHtml);

    rewritten = rewritten.replace(/\[\[CITILAP_IMG_(\d+)\]\]/g, (_, idxStr) => {
      const info = imagePlaceholders[Number(idxStr)];
      if (!info) return '';
      const mappedUrl = imgUrlMap.get(info.src);
      if (!mappedUrl) return '';
      const altText = info.caption ? `${cleanName} — ${info.caption}` : `${cleanName} tại CitiLap`;
      const cap = info.caption ? `<figcaption>${escapeHtml(info.caption)}</figcaption>` : '';
      return `<figure><img src="${mappedUrl}" alt="${escapeHtml(altText)}" />${cap}</figure>`;
    });

    rewritten = rewritten
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '<h2>$1</h2>')
      .replace(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi, (_, inner) => {
        const t = stripTags(inner);
        return t ? `<h3>${escapeHtml(t)}</h3>` : '';
      })
      .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_, inner) => {
        const t = stripTags(inner);
        if (!t) return '';
        return /^\d+\.\s/.test(t) ? `<h3>${escapeHtml(t)}</h3>` : `<p><strong>${escapeHtml(t)}</strong></p>`;
      })
      .replace(/<p>\s*(?:<strong[^>]*>|<b[^>]*>)\s*(\d+\.\s[^<]{3,100})\s*(?:<\/strong>|<\/b>)\s*<\/p>/gi, '<h3>$1</h3>')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    bodyHtml = rewritten;
  } else {
    bodyHtml = buildGeneratedCitiLapArticle({ cleanName, catName, catPath, brand, specs, isAccessory, specObj });
  }

  const footerBox = `
<h3>Trải nghiệm thực tế & Chính sách mua hàng tại CitiLap</h3>
<p>Khi lựa chọn <a href="${catPath}">${escapeHtml(cleanName)}</a> tại <a href="/">hệ thống CitiLap</a>, khách hàng được hỗ trợ kiểm tra ngoại hình, test hiệu năng trực tiếp và tư vấn tối ưu theo đúng nhu cầu học tập, làm việc hay chơi game.</p>
<ul>
  <li><strong>Chính sách bảo hành:</strong> Áp dụng <a href="/chinh-sach-bao-hanh">gói bảo hành tiêu chuẩn CitiLap</a> (6 tháng cho máy mới & linh kiện, 3 tháng cho máy Like New), lỗi 1 đổi 1 trong 7 ngày đầu nếu phát sinh lỗi phần cứng từ nhà sản xuất.</li>
  <li><strong>Giao hàng & Trải nghiệm trực tiếp:</strong> Miễn phí giao hàng bán kính 10 km quanh <a href="/he-thong-cua-hang">Showroom CitiLap Hà Nội (Số 23/40 Tạ Quang Bửu, Hai Bà Trưng)</a> hoặc <a href="/lien-he">liên hệ hotline 0899.188.186</a> để được chuyên viên tư vấn nhanh trong giờ làm việc.</li>
</ul>`;

  return `${highlightBox}\n${bodyHtml}\n${footerBox}`.trim();
}

// ---------------------------------------------------------------------------
// 5. Curate Expanded Catalog (Gaming ~90 SKUs, Unmerged Categories)
// ---------------------------------------------------------------------------
function pickUnique(list, count, usedIds) {
  const out = [];
  for (const item of list) {
    if (usedIds.has(item.id)) continue;
    out.push(item);
    usedIds.add(item.id);
    if (out.length >= count) break;
  }
  return out;
}

function curateCatalog() {
  const products = JSON.parse(readFileSync(`${CRAWL_DIR}/products.json`, 'utf8'));
  const membership = JSON.parse(readFileSync(`${CRAWL_DIR}/collection-membership.json`, 'utf8'));
  const byId = new Map(products.map((p) => [p.id, p]));

  const fromCol = (alias, extraFilter = () => true) => {
    const ids = membership[alias] || [];
    return ids
      .map((id) => byId.get(id))
      .filter((p) => p && p.price > 0 && p.images?.length > 0 && extraFilter(p));
  };

  const usedIds = new Set();
  const curated = [];

  const pushBatch = (categoryId, template, items, override = {}) => {
    for (const p of items) {
      const targetCatId = typeof categoryId === 'function' ? categoryId(p) : categoryId;
      curated.push({ source: 'laptopnew', raw: p, categoryId: targetCatId, template, ...override });
    }
  };

  // --- A. LAPTOP GAMING (Target: ~90 SKUs split evenly across Cấp 2/3 subcategories!) ---
  const gamingPool = products.filter((p) => p.price > 0 && p.images?.length > 0 && !/claw/i.test(p.name));
  pushBatch((p) => {
    if (/slim/i.test(p.name)) return 'tax-legion-slim-5';
    if (/legion\s*(pro\s*)?7|y9000/i.test(p.name)) return 'tax-legion-7';
    if (/pro\s*5|r7000p|y7000p/i.test(p.name)) return 'tax-legion-pro-5';
    return 'tax-legion-5';
  }, 'LAPTOP', pickUnique(gamingPool.filter((p) => /legion/i.test(p.name)), 10, usedIds));

  pushBatch((p) => {
    if (/essential/i.test(p.name)) return 'tax-loq-essential';
    if (/15arp|15aph|ryzen/i.test(p.name)) return 'tax-loq-15arp';
    return 'tax-loq-15irx';
  }, 'LAPTOP', pickUnique(gamingPool.filter((p) => /\bloq\b/i.test(p.name)), 9, usedIds));

  pushBatch('taxonomy-lenovo-lecoo-gaming', 'LAPTOP', pickUnique(gamingPool.filter((p) => /lecoo fighter/i.test(p.name)), 2, usedIds));

  pushBatch((p) => {
    if (/scar/i.test(p.name)) return 'tax-rog-strix-scar';
    if (/zephyrus/i.test(p.name)) return 'tax-rog-zephyrus';
    if (/flow/i.test(p.name)) return 'tax-rog-flow';
    return 'tax-rog-strix-g';
  }, 'LAPTOP', pickUnique(gamingPool.filter((p) => /\brog\b/i.test(p.name) && !/mouse|keyboard|headset/i.test(p.name)), 9, usedIds));

  pushBatch((p) => {
    if (/a14|fa401/i.test(p.name)) return 'tax-tuf-a14';
    if (/f15|f16|fx50|fx60/i.test(p.name)) return 'tax-tuf-f15-f16';
    return 'tax-tuf-a15';
  }, 'LAPTOP', pickUnique(gamingPool.filter((p) => /\btuf\b/i.test(p.name)), 10, usedIds));

  pushBatch((p) => (/cyborg\s*14|a13u/i.test(p.name) && /14/i.test(p.name) ? 'tax-cyborg-14' : 'tax-cyborg-15'), 'LAPTOP', pickUnique(gamingPool.filter((p) => /cyborg/i.test(p.name)), 8, usedIds));
  pushBatch((p) => (/a15|a17|katana\s*17/i.test(p.name) ? 'tax-katana-a15' : 'tax-katana-15'), 'LAPTOP', pickUnique(gamingPool.filter((p) => /katana/i.test(p.name)), 8, usedIds));
  pushBatch((p) => (/a16|a17/i.test(p.name) ? 'tax-crosshair-a16' : 'tax-crosshair-16'), 'LAPTOP', pickUnique(gamingPool.filter((p) => /crosshair/i.test(p.name)), 8, usedIds));
  pushBatch('taxonomy-msi-vector', 'LAPTOP', pickUnique(gamingPool.filter((p) => /vector/i.test(p.name)), 2, usedIds));
  pushBatch('taxonomy-msi-raider', 'LAPTOP', pickUnique(gamingPool.filter((p) => /raider/i.test(p.name)), 5, usedIds));
  pushBatch('taxonomy-msi-stealth', 'LAPTOP', pickUnique(gamingPool.filter((p) => /stealth/i.test(p.name)), 5, usedIds));
  pushBatch('taxonomy-msi-titan', 'LAPTOP', pickUnique(gamingPool.filter((p) => /titan/i.test(p.name)), 3, usedIds));
  pushBatch((p) => (/aorus/i.test(p.name) ? 'tax-gigabyte-aorus' : 'taxonomy-gigabyte-gaming'), 'LAPTOP', pickUnique(fromCol('laptop-gigabyte-gaming'), 8, usedIds));
  pushBatch((p) => (/aurora/i.test(p.name) ? 'tax-alienware-aurora' : 'tax-alienware-m'), 'LAPTOP', pickUnique(gamingPool.filter((p) => /alienware/i.test(p.name) && !/balo/i.test(p.name)), 6, usedIds));
  pushBatch('taxonomy-hp-omen', 'LAPTOP', pickUnique(gamingPool.filter((p) => /\bomen\b/i.test(p.name)), 2, usedIds));
  pushBatch((p) => (/nitro\s*16|an16/i.test(p.name) ? 'tax-nitro-16' : /nitro\s*v|anv/i.test(p.name) ? 'tax-nitro-v' : 'tax-nitro-5'), 'LAPTOP', pickUnique(gamingPool.filter((p) => /\bnitro\b/i.test(p.name)), 1, usedIds));
  pushBatch('taxonomy-razer-blade', 'LAPTOP', pickUnique(gamingPool.filter((p) => /razer blade/i.test(p.name)), 3, usedIds));

  // --- B. LAPTOP VĂN PHÒNG (unmerged Brand -> Series -> Model!) ---
  const allPriced = products.filter((p) => p.price > 0 && p.images?.length > 0);
  pushBatch((p) => (/slim\s*5|pro\s*5|xiaoxin/i.test(p.name) ? 'tax-ideapad-slim-5' : 'tax-ideapad-slim-3'), 'LAPTOP', pickUnique(allPriced.filter((p) => /ideapad/i.test(p.name)), 10, usedIds));
  pushBatch((p) => (/16/i.test(p.name) ? 'tax-thinkbook-16' : 'tax-thinkbook-14'), 'LAPTOP', pickUnique(allPriced.filter((p) => /thinkbook/i.test(p.name)), 4, usedIds));
  pushBatch((p) => (/x1/i.test(p.name) ? 'tax-thinkpad-x1' : /\bt14|\bt16/i.test(p.name) ? 'tax-thinkpad-t' : 'tax-thinkpad-e'), 'LAPTOP', pickUnique(allPriced.filter((p) => /thinkpad(?!\s+p\d)/i.test(p.name)), 6, usedIds));
  pushBatch((p) => (/2-in-1|book|flip/i.test(p.name) ? 'tax-yoga-2in1' : 'tax-yoga-slim'), 'LAPTOP', pickUnique(allPriced.filter((p) => /\byoga\b/i.test(p.name)), 6, usedIds));
  pushBatch((p) => {
    if (/oled|\bs\s*14|\bs\s*16|m54|m56|s54|s56/i.test(p.name)) return 'tax-vivobook-s-oled';
    if (/16\b|x16|m16|k36/i.test(p.name)) return 'tax-vivobook-16';
    if (/14\b|e14|x14|a14/i.test(p.name)) return 'tax-vivobook-14';
    return 'tax-vivobook-15';
  }, 'LAPTOP', pickUnique(allPriced.filter((p) => /vivobook/i.test(p.name)), 12, usedIds));
  pushBatch((p) => {
    if (/duo|ux84/i.test(p.name)) return 'tax-zenbook-duo';
    if (/\bs\s*14|\bs\s*16|a14|ux54|ux56/i.test(p.name)) return 'tax-zenbook-s';
    return 'tax-zenbook-14';
  }, 'LAPTOP', pickUnique(allPriced.filter((p) => /zenbook/i.test(p.name)), 10, usedIds));
  pushBatch((p) => (/14|5440|7440/i.test(p.name) ? 'tax-inspiron-14' : 'tax-inspiron-15'), 'LAPTOP', pickUnique(allPriced.filter((p) => /inspiron/i.test(p.name)), 7, usedIds));
  pushBatch((p) => (/14|16|9440|9640/i.test(p.name) ? 'tax-xps-14-16' : 'tax-xps-13'), 'LAPTOP', pickUnique(allPriced.filter((p) => /\bxps\b/i.test(p.name)), 6, usedIds));
  pushBatch('taxonomy-dell-latitude', 'LAPTOP', pickUnique(allPriced.filter((p) => /latitude/i.test(p.name)), 4, usedIds));
  pushBatch('taxonomy-dell-pro', 'LAPTOP', pickUnique(allPriced.filter((p) => /dell pro\b/i.test(p.name)), 2, usedIds));
  pushBatch('taxonomy-dell-vostro', 'LAPTOP', pickUnique(allPriced.filter((p) => /vostro/i.test(p.name)), 1, usedIds));
  pushBatch((p) => (/flip/i.test(p.name) ? 'tax-omnibook-flip' : 'tax-omnibook-x'), 'LAPTOP', pickUnique(allPriced.filter((p) => /omnibook/i.test(p.name)), 10, usedIds));
  pushBatch('taxonomy-hp-series', 'LAPTOP', pickUnique(fromCol('laptop-hp-van-phong', (p) => !/omnibook/i.test(p.name)), 6, usedIds));
  pushBatch((p) => (/modern\s*15/i.test(p.name) ? 'tax-modern-15' : 'tax-modern-14'), 'LAPTOP', pickUnique(allPriced.filter((p) => /msi\s+modern/i.test(p.name)), 8, usedIds));
  pushBatch((p) => (/13/i.test(p.name) ? 'tax-prestige-13' : 'tax-prestige-14-16'), 'LAPTOP', pickUnique(allPriced.filter((p) => /msi\s+prestige/i.test(p.name) && !/^copy-of-/i.test(p.alias)), 8, usedIds));
  pushBatch('taxonomy-msi-venture', 'LAPTOP', pickUnique(allPriced.filter((p) => /msi\s+venture/i.test(p.name)), 3, usedIds));
  pushBatch((p) => (/lite/i.test(p.name) ? 'tax-aspire-lite' : 'tax-aspire-go'), 'LAPTOP', pickUnique(allPriced.filter((p) => /acer\s+aspire/i.test(p.name)), 8, usedIds));
  pushBatch('taxonomy-acer-swift', 'LAPTOP', pickUnique(allPriced.filter((p) => /acer\s+swift/i.test(p.name)), 2, usedIds));

  // --- C. LAPTOP ĐỒ HỌA & WORKSTATION (Brand -> Series -> Model!) ---
  const precPriced = fromCol('laptop-dell-precision');
  const precZero = (membership['laptop-dell-precision'] || []).map((id) => byId.get(id)).filter((p) => p && !usedIds.has(p.id));
  pushBatch((p) => (/3\d{3}/.test(p.name) ? 'tax-precision-3000' : /7\d{3}/.test(p.name) ? 'tax-precision-7000' : 'tax-precision-5000'), 'LAPTOP', pickUnique([...precPriced, ...precZero], 10, usedIds), { fallbackPrice: 36990000 });
  pushBatch((p) => (/\bp1\b/i.test(p.name) ? 'tax-thinkpad-p1' : 'tax-thinkpad-p16'), 'LAPTOP', pickUnique(allPriced.filter((p) => /thinkpad\s+p\d/i.test(p.name)), 1, usedIds));
  pushBatch((p) => (/fury/i.test(p.name) ? 'tax-zbook-fury' : /firefly/i.test(p.name) ? 'tax-zbook-firefly' : 'tax-zbook-studio'), 'LAPTOP', pickUnique(allPriced.filter((p) => /zbook/i.test(p.name)), 1, usedIds));
  pushBatch('taxonomy-gigabyte-aero', 'LAPTOP', pickUnique(fromCol('laptop-gigabyte-aero'), 2, usedIds));

  const syntheticWorkstations = [
    { categoryId: 'tax-thinkpad-p16', name: 'Lenovo ThinkPad P16 Gen 2 (i7-13850HX / RTX 2000 Ada)', slug: 'lenovo-thinkpad-p16-gen-2-i7', brand: 'Lenovo', model: 'ThinkPad P16 Gen 2', price: 52990000, originalPrice: 57990000, cpu: 'Intel Core i7-13850HX', gpu: 'NVIDIA RTX 2000 Ada 8GB', ram: '32GB DDR5', ssd: '1TB NVMe PCIe Gen4', display: '16.0 inch WUXGA IPS 100% sRGB', hz: '60Hz', r2AssetId: '2c109a04-e3f3-47c6-bf97-f53fa29f65f3' },
    { categoryId: 'tax-zbook-studio', name: 'HP ZBook Studio 16 G10 (i7-13800H / RTX A1000)', slug: 'hp-zbook-studio-16-g10-i7', brand: 'HP', model: 'ZBook Studio 16 G10', price: 42990000, originalPrice: 48990000, cpu: 'Intel Core i7-13800H', gpu: 'NVIDIA RTX A1000 6GB', ram: '32GB DDR5', ssd: '1TB NVMe PCIe Gen4', display: '16.0 inch WUXGA IPS 100% sRGB', hz: '120Hz', r2AssetId: '5ba044a8-6c25-4220-8f02-38f99d1372fc' },
    { categoryId: 'tax-zbook-studio', name: 'HP ZBook Studio 16 G9 (i7-12800H / RTX A2000)', slug: 'hp-zbook-studio-16-g9-i7', brand: 'HP', model: 'ZBook Studio 16 G9', price: 34990000, originalPrice: 39990000, cpu: 'Intel Core i7-12800H', gpu: 'NVIDIA RTX A2000 8GB', ram: '32GB DDR5', ssd: '1TB NVMe PCIe Gen4', display: '16.0 inch WUXGA DreamColor 100% DCI-P3', hz: '120Hz', r2AssetId: 'ffd89789-3c2f-4840-91ab-336013bf216c' },
    { categoryId: 'tax-zbook-fury', name: 'HP ZBook Fury 16 G10 (i9-13950HX / RTX 3500 Ada)', slug: 'hp-zbook-fury-16-g10-i9', brand: 'HP', model: 'ZBook Fury 16 G10', price: 58990000, originalPrice: 64990000, cpu: 'Intel Core i9-13950HX', gpu: 'NVIDIA RTX 3500 Ada 12GB', ram: '64GB DDR5', ssd: '2TB NVMe PCIe Gen4', display: '16.0 inch WQUXGA 4K IPS 100% DCI-P3', hz: '120Hz', r2AssetId: '46a9dc6b-df15-46ee-b946-7f9b3ba5e53c' },
    { categoryId: 'tax-proart-p16', name: 'ASUS ProArt P16 H7606 (Ryzen AI 9 HX 370 / RTX 4070)', slug: 'asus-proart-p16-h7606-r9', brand: 'Asus', model: 'H7606WI', price: 56990000, originalPrice: 61990000, cpu: 'AMD Ryzen AI 9 HX 370', gpu: 'NVIDIA GeForce RTX 4070 8GB', ram: '32GB LPDDR5X', ssd: '1TB NVMe PCIe Gen4', display: '16.0 inch 4K OLED Touch 100% DCI-P3', hz: '60Hz', r2AssetId: 'efcfaeb3-6a10-4152-addc-dd758c05a5d1' },
    { categoryId: 'tax-creator-z16', name: 'MSI Creator Z16 HX Studio (i9-13950HX / RTX 4060)', slug: 'msi-creator-z16-hx-studio-i9', brand: 'MSI', model: 'B13VFTO', price: 47990000, originalPrice: 52990000, cpu: 'Intel Core i9-13950HX', gpu: 'NVIDIA GeForce RTX 4060 8GB', ram: '32GB DDR5', ssd: '1TB NVMe PCIe Gen4', display: '16.0 inch QHD+ Touch 100% DCI-P3', hz: '120Hz', r2AssetId: 'e3a41c56-6163-4502-948e-67f52937fc64' },
  ];
  for (const s of syntheticWorkstations) {
    curated.push({ source: 'curated', categoryId: s.categoryId, template: 'LAPTOP', spec: s });
  }

  // --- D. APPLE MACBOOK ---
  pushBatch('taxonomy-macbook-air', 'LAPTOP', pickUnique(fromCol('macbook'), 1, usedIds));
  const airAssets = ['53dbf258-c0a8-470b-9d01-1bd77c2c94db', '36dc63eb-96a7-4ea4-b4b3-963bab474750', '8c2c9896-0e0f-422e-969f-abed76037940', '075df4da-e798-46b7-aa7b-f2ea368f2015', 'af715913-da01-467f-a49f-a21e54799d56'];
  const proAssets = ['a1ea5eea-fec5-4265-910f-b74992e72e65', '7c73f6e4-ca31-4a25-8a7f-4ab5464ee78c', 'cb12e144-87c6-401a-b1ed-1f05aef4eeb9', '506f4984-a983-430f-abb6-3670a47e3302', 'd6aee890-557d-496b-ac7b-86e129c6af52'];
  const syntheticMacs = [
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 13 inch M4 2025 (16GB / 512GB SSD)', slug: 'macbook-air-13-m4-16gb-512gb', model: 'MW123SA/A', price: 31990000, originalPrice: 33990000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '16GB Unified', ssd: '512GB SSD', display: '13.6 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 13 inch M4 2025 (24GB / 512GB SSD)', slug: 'macbook-air-13-m4-24gb-512gb', model: 'MC6U4SA/A', price: 36990000, originalPrice: 38990000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '24GB Unified', ssd: '512GB SSD', display: '13.6 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 15 inch M4 2025 (16GB / 256GB SSD)', slug: 'macbook-air-15-m4-16gb-256gb', model: 'MW1G3SA/A', price: 31490000, originalPrice: 33490000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '16GB Unified', ssd: '256GB SSD', display: '15.3 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 15 inch M4 2025 (16GB / 512GB SSD)', slug: 'macbook-air-15-m4-16gb-512gb', model: 'MW1H3SA/A', price: 36490000, originalPrice: 38490000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '16GB Unified', ssd: '512GB SSD', display: '15.3 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 13 inch M3 (16GB / 256GB SSD)', slug: 'macbook-air-13-m3-16gb-256gb', model: 'MXCR3SA/A', price: 24990000, originalPrice: 27990000, cpu: 'Apple M3 8-core', gpu: 'Apple M3 GPU 8-core', ram: '16GB Unified', ssd: '256GB SSD', display: '13.6 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 13 inch M3 (16GB / 512GB SSD)', slug: 'macbook-air-13-m3-16gb-512gb', model: 'MXCU3SA/A', price: 28990000, originalPrice: 31990000, cpu: 'Apple M3 8-core', gpu: 'Apple M3 GPU 10-core', ram: '16GB Unified', ssd: '512GB SSD', display: '13.6 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 15 inch M3 (16GB / 256GB SSD)', slug: 'macbook-air-15-m3-16gb-256gb', model: 'MC9D4SA/A', price: 29990000, originalPrice: 32990000, cpu: 'Apple M3 8-core', gpu: 'Apple M3 GPU 10-core', ram: '16GB Unified', ssd: '256GB SSD', display: '15.3 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 15 inch M3 (16GB / 512GB SSD)', slug: 'macbook-air-15-m3-16gb-512gb', model: 'MC9G4SA/A', price: 33990000, originalPrice: 36990000, cpu: 'Apple M3 8-core', gpu: 'Apple M3 GPU 10-core', ram: '16GB Unified', ssd: '512GB SSD', display: '15.3 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-air', name: 'MacBook Air 13 inch M2 (16GB / 256GB SSD)', slug: 'macbook-air-13-m2-16gb-256gb', model: 'MC7W4SA/A', price: 21490000, originalPrice: 24990000, cpu: 'Apple M2 8-core', gpu: 'Apple M2 GPU 8-core', ram: '16GB Unified', ssd: '256GB SSD', display: '13.6 inch Liquid Retina True Tone', hz: '60Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M4 (16GB / 512GB SSD)', slug: 'macbook-pro-14-m4-16gb-512gb', model: 'MW2U3SA/A', price: 39490000, originalPrice: 41990000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '16GB Unified', ssd: '512GB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M4 (16GB / 1TB SSD)', slug: 'macbook-pro-14-m4-16gb-1tb', model: 'MW2V3SA/A', price: 44490000, originalPrice: 46990000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '16GB Unified', ssd: '1TB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M4 (24GB / 1TB SSD)', slug: 'macbook-pro-14-m4-24gb-1tb', model: 'MCX04SA/A', price: 48990000, originalPrice: 51990000, cpu: 'Apple M4 10-core', gpu: 'Apple M4 GPU 10-core', ram: '24GB Unified', ssd: '1TB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M4 Pro (24GB / 512GB SSD)', slug: 'macbook-pro-14-m4-pro-24gb-512gb', model: 'MX2H3SA/A', price: 49990000, originalPrice: 52990000, cpu: 'Apple M4 Pro 12-core', gpu: 'Apple M4 Pro GPU 16-core', ram: '24GB Unified', ssd: '512GB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M4 Pro (24GB / 1TB SSD)', slug: 'macbook-pro-14-m4-pro-24gb-1tb', model: 'MX2J3SA/A', price: 58990000, originalPrice: 61990000, cpu: 'Apple M4 Pro 14-core', gpu: 'Apple M4 Pro GPU 20-core', ram: '24GB Unified', ssd: '1TB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M4 Max (36GB / 1TB SSD)', slug: 'macbook-pro-14-m4-max-36gb-1tb', model: 'MX2K3SA/A', price: 78990000, originalPrice: 82990000, cpu: 'Apple M4 Max 14-core', gpu: 'Apple M4 Max GPU 32-core', ram: '36GB Unified', ssd: '1TB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 16 inch M4 Pro (24GB / 512GB SSD)', slug: 'macbook-pro-16-m4-pro-24gb-512gb', model: 'MX2X3SA/A', price: 61990000, originalPrice: 64990000, cpu: 'Apple M4 Pro 14-core', gpu: 'Apple M4 Pro GPU 20-core', ram: '24GB Unified', ssd: '512GB SSD', display: '16.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 16 inch M4 Pro (48GB / 512GB SSD)', slug: 'macbook-pro-16-m4-pro-48gb-512gb', model: 'MX2Y3SA/A', price: 71990000, originalPrice: 74990000, cpu: 'Apple M4 Pro 14-core', gpu: 'Apple M4 Pro GPU 20-core', ram: '48GB Unified', ssd: '512GB SSD', display: '16.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 16 inch M4 Max (36GB / 1TB SSD)', slug: 'macbook-pro-16-m4-max-36gb-1tb', model: 'MX303SA/A', price: 86990000, originalPrice: 89990000, cpu: 'Apple M4 Max 14-core', gpu: 'Apple M4 Max GPU 32-core', ram: '36GB Unified', ssd: '1TB SSD', display: '16.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
    { categoryId: 'taxonomy-macbook-pro', name: 'MacBook Pro 14 inch M3 Pro (18GB / 512GB SSD)', slug: 'macbook-pro-14-m3-pro-18gb-512gb', model: 'MRX33SA/A', price: 42990000, originalPrice: 46990000, cpu: 'Apple M3 Pro 11-core', gpu: 'Apple M3 Pro GPU 14-core', ram: '18GB Unified', ssd: '512GB SSD', display: '14.2 inch Liquid Retina XDR 100% P3', hz: '120Hz' },
  ];
  for (const [idxMac, s] of syntheticMacs.entries()) {
    const pool = s.categoryId === 'taxonomy-macbook-air' ? airAssets : proAssets;
    curated.push({ source: 'curated', categoryId: s.categoryId, template: 'LAPTOP', spec: { ...s, brand: 'Apple', r2AssetId: pool[idxMac % pool.length] } });
  }

  // --- E. PHỤ KIỆN & LINH KIỆN (unmerged!) ---
  pushBatch('ref-accessory-mouse', 'MOUSE', pickUnique(allPriced.filter((p) => /mouse|chuột/i.test(p.name)), 3, usedIds));
  curated.push({
    source: 'curated', categoryId: 'ref-accessory-mouse', template: 'MOUSE',
    spec: { name: 'Chuột không dây DareU LM106G Silent', slug: 'chuot-khong-day-dareu-lm106g', brand: 'DareU', model: 'LM106G', price: 249000, originalPrice: 320000, r2AssetId: '97cc8af8-542f-44a4-ba7e-242b26e77958', specs: [{ key: 'Kết nối', value: 'Không dây 2.4GHz' }, { key: 'DPI', value: '1200 DPI' }, { key: 'Trọng lượng', value: '75g' }, { key: 'Thiết kế', value: 'Nút bấm Silent giảm ồn' }] }
  });

  const kbPool = fromCol('keyboard-ban-phim');
  pushBatch('ref-accessory-keyboard', 'KEYBOARD', pickUnique([
    ...kbPool.filter((p) => /f75/i.test(p.name)).slice(0, 2),
    ...kbPool.filter((p) => /au75|f87/i.test(p.name)).slice(0, 1),
    ...kbPool.filter((p) => /akko/i.test(p.name)).slice(0, 1),
    ...kbPool.filter((p) => /rog/i.test(p.name)).slice(0, 1),
    ...kbPool,
  ], 5, usedIds));

  pushBatch('ref-accessory-audio', 'HEADPHONE', pickUnique([
    ...fromCol('headset-tai-nghe').filter((p) => /rog/i.test(p.name)).slice(0, 1),
    ...fromCol('headset-tai-nghe').filter((p) => /b3|b90|k9|x25/i.test(p.name)).slice(0, 3),
    ...fromCol('headset-tai-nghe'),
  ], 4, usedIds));

  pushBatch('ref-accessory-speaker-mic', 'ACCESSORY', pickUnique(allPriced.filter((p) => /microphone.*avermedia/i.test(p.name)), 2, usedIds));
  pushBatch('ref-accessory-controller', 'ACCESSORY', pickUnique(allPriced.filter((p) => /controller/i.test(p.name)), 1, usedIds));
  pushBatch('ref-accessory-bag', 'BAG', pickUnique(fromCol('balo-gaming'), 4, usedIds));

  const ltnChargers = pickUnique(allPriced.filter((p) => /sạc\s*adapter/i.test(p.name)), 3, usedIds);
  pushBatch('ref-accessory-charger', 'CHARGER', ltnChargers);
  curated.push({
    source: 'curated', categoryId: 'ref-accessory-charger', template: 'CHARGER',
    spec: { name: 'Củ sạc nhanh Anker Nano II 65W GaN 3 cổng', slug: 'cu-sac-nhanh-anker-nano-ii-65w-gan', brand: 'Anker', model: 'A2668', price: 850000, originalPrice: 1100000, r2SourceUrl: ltnChargers[0]?.images?.[0], specs: [{ key: 'Công suất', value: '65W' }, { key: 'Chuẩn sạc', value: 'GaN (Gallium Nitride) · PD 3.0' }, { key: 'Cổng ra', value: '2 Type-C + 1 USB-A' }, { key: 'Tương thích', value: 'MacBook, Laptop Type-C, Tablet, Smartphone' }] }
  });

  const syntheticHubs = [
    { name: 'Hub chuyển đổi Type-C 7-in-1 Rapoo XD71 HDMI 4K', slug: 'hub-chuyen-doi-rapoo-xd71', brand: 'Rapoo', model: 'XD71', price: 690000, originalPrice: 890000, r2AssetId: 'b276d191-454c-4123-8bad-1444d30a0b32', specs: [{ key: 'Cổng vào', value: 'Type-C USB 3.2' }, { key: 'Cổng ra', value: 'HDMI 4K, 3x USB 3.0, SD/TF, RJ45 LAN, PD 100W' }, { key: 'Chất liệu', value: 'Hợp kim nhôm tản nhiệt' }] },
    { name: 'Hub chuyển đổi Type-C 6-in-1 Rapoo XD61 nhỏ gọn', slug: 'hub-chuyen-doi-rapoo-xd61', brand: 'Rapoo', model: 'XD61', price: 540000, originalPrice: 690000, r2AssetId: 'dd09210e-184d-4783-9690-cd09dda5d3e3', specs: [{ key: 'Cổng vào', value: 'Type-C USB 3.2' }, { key: 'Cổng ra', value: 'HDMI 4K, 2x USB 3.0, SD/TF, PD 100W' }, { key: 'Chất liệu', value: 'Hợp kim nhôm tản nhiệt' }] },
    { name: 'Hub chuyển đổi Type-C 8-in-1 Ugreen CM512 HDMI 4K@60Hz', slug: 'hub-chuyen-doi-ugreen-8in1-cm512', brand: 'Ugreen', model: 'CM512', price: 790000, originalPrice: 990000, r2AssetId: 'b276d191-454c-4123-8bad-1444d30a0b32', specs: [{ key: 'Cổng vào', value: 'Type-C USB 3.2' }, { key: 'Cổng ra', value: 'HDMI 4K@60Hz, LAN Gigabit, 3x USB 3.0, SD/TF, PD 100W' }, { key: 'Chất liệu', value: 'Hợp kim nhôm nguyên khối' }] },
  ];
  for (const s of syntheticHubs) curated.push({ source: 'curated', categoryId: 'ref-accessory-hub', template: 'HUB', spec: s });

  curated.push({
    source: 'curated', categoryId: 'ref-accessory-stand', template: 'ACCESSORY',
    spec: { name: 'Giá đỡ Laptop nhôm công thái học HyperWork L01', slug: 'gia-do-laptop-nhom-hyperwork-l01', brand: 'HyperWork', model: 'L01', price: 420000, originalPrice: 550000, r2AssetId: '3844fdc9-b4ff-444a-8dbc-92ce27c85956', specs: [{ key: 'Loại phụ kiện', value: 'Giá đỡ nâng laptop công thái học' }, { key: 'Chất liệu', value: 'Hợp kim nhôm CNC nguyên khối' }, { key: 'Tương thích', value: 'Laptop 11 – 17 inch, tải trọng tối đa 10kg' }] }
  });
  curated.push({
    source: 'curated', categoryId: 'ref-accessory-cooler', template: 'ACCESSORY',
    spec: { name: 'Đế tản nhiệt Laptop Rapoo CF300 quạt kép', slug: 'de-tan-nhiet-rapoo-cf300', brand: 'Rapoo', model: 'CF300', price: 490000, originalPrice: 650000, r2AssetId: 'f31d13a3-f05b-4d81-a785-b7ed878e4402', specs: [{ key: 'Loại phụ kiện', value: 'Đế tản nhiệt laptop gaming' }, { key: 'Kết nối', value: 'USB 5V' }, { key: 'Tương thích', value: 'Laptop 14 – 17.3 inch' }] }
  });
  curated.push({
    source: 'curated', categoryId: 'ref-accessory-cooler', template: 'ACCESSORY',
    spec: { name: 'Đế tản nhiệt Laptop Rapoo CF100 gọn nhẹ', slug: 'de-tan-nhiet-rapoo-cf100', brand: 'Rapoo', model: 'CF100', price: 320000, originalPrice: 450000, r2AssetId: '1f874b16-9efe-4b81-991d-a72a01bdfeb2', specs: [{ key: 'Loại phụ kiện', value: 'Đế tản nhiệt laptop văn phòng' }, { key: 'Kết nối', value: 'USB 5V' }, { key: 'Tương thích', value: 'Laptop 13 – 15.6 inch' }] }
  });

  pushBatch('ref-accessory-ram', 'ACCESSORY', pickUnique(fromCol('ram-for-laptop'), 4, usedIds));

  const ssdPool = fromCol('ssd-for-laptop');
  pushBatch('ref-accessory-hardware', 'ACCESSORY', pickUnique([
    ...ssdPool.filter((p) => /gen5/i.test(p.name)).slice(0, 1),
    ...ssdPool.filter((p) => /g70-pro|lnm790/i.test(p.alias)).slice(0, 2),
    ...ssdPool.filter((p) => /mp33|nm620/i.test(p.alias)).slice(0, 1),
    ...ssdPool.filter((p) => /sata/i.test(p.alias)).slice(0, 1),
    ...ssdPool,
  ], 5, usedIds));

  return curated;
}

// ---------------------------------------------------------------------------
// 6. Build Prepared Dataset
// ---------------------------------------------------------------------------
function prepareAll() {
  const curated = curateCatalog();
  const slugCounts = new Map();

  const preparedProducts = curated.map((entry, idx) => {
    const isAccessory = entry.template !== 'LAPTOP';
    if (entry.source === 'curated') {
      const s = entry.spec;
      const baseSlug = slugify(s.slug || s.name);
      const n = (slugCounts.get(baseSlug) || 0) + 1;
      slugCounts.set(baseSlug, n);
      const slug = n === 1 ? baseSlug : `${baseSlug}-${n}`;
      const id = `ct-${slug}`.slice(0, 64);
      const specs = s.specs || [
        { key: 'CPU', value: s.cpu },
        { key: 'GPU', value: s.gpu },
        { key: 'RAM', value: s.ram },
        { key: 'SSD', value: s.ssd },
        { key: 'Màn hình', value: s.display },
        { key: 'Tần số quét', value: s.hz || '60Hz' },
        { key: 'Mã sản phẩm (Part)', value: s.model },
        { key: 'Năm ra mắt', value: s.brand === 'Apple' && /M4/i.test(s.name) ? '2025' : '2024' },
      ];
      const specObj = Object.fromEntries(specs.map((x) => [x.key, x.value]));
      const description = isAccessory
        ? `${s.name} chính hãng ${s.brand}, bảo hành 6 tháng tại CitiLap, lỗi 1 đổi 1 trong 7 ngày.`
        : `${s.name} chính hãng ${s.brand}${specObj.CPU ? `, ${specObj.CPU}` : ''}${specObj.RAM ? `, ${specObj.RAM}` : ''}${specObj.SSD ? `, ${specObj.SSD}` : ''}. Bảo hành tiêu chuẩn CitiLap 6 tháng, lỗi 1 đổi 1 trong 7 ngày.`;
      const sku = `CTL-${s.brand.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}-${String(idx + 1).padStart(3, '0')}`;
      const variant = {
        id: `${id}-v1`,
        name: isAccessory ? 'Tiêu chuẩn' : `${specObj.RAM || '16GB'} / ${specObj.SSD || '512GB'}`,
        sku,
        condition: 'NEW',
        price: s.price,
        originalPrice: s.originalPrice && s.originalPrice >= s.price ? s.originalPrice : null,
        stock: 10,
        availability: 'AVAILABLE',
        ram: specObj.RAM || undefined,
        storage: specObj.SSD || undefined,
        gpu: specObj.GPU || undefined,
        options: isAccessory ? { 'Phiên bản': 'Chính hãng' } : { ram: specObj.RAM || '16GB', storage: specObj.SSD || '512GB' },
      };
      const contentHtml = buildEditorialReviewHtml({
        cleanName: s.name,
        categoryId: entry.categoryId,
        brand: s.brand,
        specs,
        rawContent: '',
        imgUrlMap: new Map(),
        isAccessory,
      });
      return {
        id,
        name: s.name,
        slug,
        model: s.model || '',
        brand: s.brand,
        categoryId: entry.categoryId,
        template: entry.template,
        price: s.price,
        originalPrice: variant.originalPrice,
        description,
        seoTitle: `${s.name} chính hãng giá tốt | CitiLap.vn`.slice(0, 120),
        seoDescription: description.slice(0, 280),
        specs,
        variants: [variant],
        tags: [s.brand.toLowerCase(), categoryNameById(entry.categoryId).toLowerCase()],
        galleryUrls: s.r2SourceUrl ? [s.r2SourceUrl] : [],
        contentImgUrls: [],
        r2AssetId: s.r2AssetId || null,
        r2Hint: s.r2Hint || s.brand.toLowerCase(),
        rawContent: '',
        contentHtml,
        isFeatured: idx % 5 === 0,
        isNewArrival: idx % 3 === 0,
        isBestSeller: idx % 4 === 0,
        isFlashSale: false,
      };
    }

    const p = entry.raw;
    const brand = normalizeBrand(p.vendor, p.name);
    const partCode = cleanPartNumber(p.name);
    const pipeSpecs = parsePipeSpecs(p.name);
    const htmlSpecs = parseHtmlSpecTables(p.content || '');
    const specs = isAccessory
      ? buildAccessorySpecs(entry.template, htmlSpecs, p.name, brand)
      : buildLaptopSpecs(p, pipeSpecs, htmlSpecs, partCode);

    const cleanName = isAccessory ? cleanAccessoryName(p.name) : buildCleanLaptopName(p.name, pipeSpecs);
    let baseSlug = slugify(p.alias.replace(/^copy-of-/i, ''));
    if (!baseSlug) baseSlug = slugify(cleanName);
    const n = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, n);
    const slug = n === 1 ? baseSlug : `${baseSlug}-${n}`;
    const id = `ct-${slug}`.slice(0, 64);

    const specObj = Object.fromEntries(specs.map((x) => [x.key, x.value]));
    const fallbackPrice = entry.fallbackPrice || 24990000;

    const rawVars = (p.variants || []).filter((v) => v.price > 0 || fallbackPrice > 0);
    const hasHardwareVariants = rawVars.some((v) => /RAM\s*\d+|SSD\s*\d+|Đen|Trắng|Hồng|Bạc|Xanh/i.test(v.title));
    let variants = [];
    if (hasHardwareVariants) {
      const seenCombo = new Set();
      rawVars.forEach((v, vi) => {
        const cleanVarTitle = decodeEntities(v.title)
          .replace(/Newseal\s*-\s*BH\s*\d+\s*THÁNG\s*-\s*Test\s*\d+\s*ngày\s*\/?/gi, '')
          .replace(/Openbox\s*-\s*BH\s*\d+\s*THÁNG\s*-\s*Test\s*\d+\s*ngày\s*\/?/gi, '')
          .replace(/BH\s*\d+\s*THÁNG\s*-\s*1\s*Đổi\s*1[^/]*/gi, '')
          .replace(/THÀNH VIÊN LTN|HS-SV[^/]*|Tất cả khách hàng|KHÁCH HÀNG KHÁC/gi, '')
          .replace(/^[\s/]+|[\s/]+$/g, '')
          .trim() || `Phiên bản ${vi + 1}`;
        const vRam = cleanVarTitle.match(/RAM\s*(\d+\s*GB)/i)?.[1] || specObj.RAM;
        const vSsd = cleanVarTitle.match(/SSD\s*(\d+\s*(?:GB|TB))/i)?.[1] || specObj.SSD;
        const comboKey = `${cleanVarTitle.toLowerCase()}_${vRam || ''}_${vSsd || ''}`;
        if (seenCombo.has(comboKey)) return;
        seenCombo.add(comboKey);
        const price = v.price > 0 ? Math.round(v.price) : fallbackPrice;
        const orig = v.compare_at_price && v.compare_at_price >= price ? Math.round(v.compare_at_price) : null;
        variants.push({
          id: `${id}-v${variants.length + 1}`,
          name: cleanVarTitle.slice(0, 120),
          sku: `CTL-${slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)}-${variants.length + 1}`,
          condition: 'NEW',
          price,
          originalPrice: orig,
          stock: 10,
          availability: 'AVAILABLE',
          ram: vRam || undefined,
          storage: vSsd || undefined,
          gpu: specObj.GPU || undefined,
          options: { 'Phiên bản': cleanVarTitle.slice(0, 80) },
        });
      });
    }
    if (variants.length === 0) {
      const baseV = rawVars[0] || {};
      const price = baseV.price > 0 ? baseV.price : p.price > 0 ? p.price : fallbackPrice;
      const origRaw = baseV.compare_at_price || p.compare_at_price_max || null;
      const orig = origRaw && origRaw >= price ? Math.round(origRaw) : null;
      variants.push({
        id: `${id}-v1`,
        name: isAccessory ? 'Chính hãng' : [specObj.RAM, specObj.SSD].filter(Boolean).join(' / ') || 'Tiêu chuẩn',
        sku: partCode
          ? `CTL-${partCode.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()}-${idx + 1}`.slice(0, 48)
          : `CTL-${slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)}-${idx + 1}`,
        condition: 'NEW',
        price: Math.round(price),
        originalPrice: orig,
        stock: 10,
        availability: 'AVAILABLE',
        ram: specObj.RAM || undefined,
        storage: specObj.SSD || undefined,
        gpu: specObj.GPU || undefined,
        options: isAccessory
          ? { 'Phiên bản': 'Chính hãng' }
          : { ram: specObj.RAM || '16GB', storage: specObj.SSD || '512GB' },
      });
    }

    const minPrice = Math.min(...variants.map((v) => v.price));
    const maxOrig = variants.find((v) => v.price === minPrice)?.originalPrice ?? null;

    const galleryUrls = [...new Set((p.images || []).filter((u) => /^https?:\/\//i.test(u)))].slice(0, 5);
    const contentImgUrls = [...new Set([...(p.content || '').matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]).filter((u) => /^https?:\/\//i.test(u)))].slice(0, 8);

    const description = isAccessory
      ? `${cleanName} chính hãng ${brand} tại CitiLap. Bảo hành 6 tháng, lỗi 1 đổi 1 trong 7 ngày.`
      : `${cleanName}${specObj.RAM ? `, RAM ${specObj.RAM}` : ''}${specObj.SSD ? `, ${specObj.SSD}` : ''}${specObj['Màn hình'] ? `, màn ${specObj['Màn hình']}` : ''}. Chính hãng tại CitiLap, bảo hành 6 tháng.`;

    const tags = [brand.toLowerCase(), categoryNameById(entry.categoryId).toLowerCase()];
    if (!isAccessory) {
      const rootId = getRootCatId(entry.categoryId);
      if (rootId === 'cat-gaming') {
        tags.push('gaming');
      } else if (rootId === 'cat-do-hoa') {
        tags.push('do-hoa');
      } else {
        tags.push('van-phong');
      }
      if (/oled|100%\s*srgb|100%\s*dci-p3/i.test(specObj['Màn hình'] || '')) tags.push('do-hoa');
      if (/ai\b|ultra|ryzen ai/i.test(specObj.CPU || '')) tags.push('laptop-ai');
      if (/touch|flip|x360|yoga/i.test(cleanName)) tags.push('cam-ung');
    } else {
      if (entry.categoryId === 'ref-accessory-mouse' || entry.categoryId === 'ref-accessory-keyboard') tags.push('mouse-keyboard');
      if (entry.categoryId === 'ref-accessory-ram' || entry.categoryId === 'ref-accessory-hardware') tags.push('hardware');
      if (entry.categoryId === 'ref-accessory-audio' || entry.categoryId === 'ref-accessory-speaker-mic') tags.push('audio');
      if (entry.categoryId === 'ref-accessory-stand' || entry.categoryId === 'ref-accessory-cooler') tags.push('stand');
    }

    return {
      id,
      name: cleanName,
      slug,
      model: partCode,
      brand,
      categoryId: entry.categoryId,
      template: entry.template,
      price: minPrice,
      originalPrice: maxOrig,
      description: description.slice(0, 400),
      seoTitle: `${cleanName} | CitiLap.vn`.slice(0, 120),
      seoDescription: description.slice(0, 280),
      specs,
      variants,
      tags: [...new Set(tags)],
      galleryUrls,
      contentImgUrls,
      rawContent: p.content || '',
      isFeatured: idx % 5 === 0,
      isNewArrival: idx % 3 === 0,
      isBestSeller: idx % 4 === 0,
      isFlashSale: false,
    };
  });

  // Ensure unique SKUs across all products
  const seenSku = new Set();
  for (const prod of preparedProducts) {
    for (const v of prod.variants) {
      let s = v.sku;
      let k = 2;
      while (seenSku.has(s)) {
        s = `${v.sku.slice(0, 40)}-${k++}`;
      }
      v.sku = s;
      seenSku.add(s);
    }
  }

  for (const prod of preparedProducts) {
    if (!prod.contentHtml) {
      const dummyMap = new Map(prod.contentImgUrls.map((u) => [u, u]));
      prod.contentHtml = buildEditorialReviewHtml({
        cleanName: prod.name,
        categoryId: prod.categoryId,
        brand: prod.brand,
        specs: prod.specs,
        rawContent: prod.rawContent,
        imgUrlMap: dummyMap,
        isAccessory: prod.template !== 'LAPTOP',
      });
    }
  }

  const summaryByCat = {};
  let gamingCount = 0;
  for (const p of preparedProducts) {
    summaryByCat[p.categoryId] = (summaryByCat[p.categoryId] || 0) + 1;
    if (p.tags.includes('gaming')) gamingCount++;
  }

  writeFileSync(PREPARED_PATH, JSON.stringify({ preparedAt: new Date().toISOString(), count: preparedProducts.length, gamingCount, summaryByCat, products: preparedProducts }, null, 2));
  console.log('Prepared CitiLap catalog:', { total: preparedProducts.length, gamingCount, categoryCount: CATEGORY_DEFS.length, summaryByCat });
}

// ---------------------------------------------------------------------------
// 7. Brand SVG Icons Fetcher (SimpleIcons / Iconify + Clean Brand Marks)
// ---------------------------------------------------------------------------
async function syncBrandIcons() {
  const remoteSources = {
    lenovo: 'https://cdn.simpleicons.org/lenovo/E2231A',
    asus: 'https://cdn.simpleicons.org/asus/00539B',
    dell: 'https://cdn.simpleicons.org/dell/007DB8',
    hp: 'https://cdn.simpleicons.org/hp/0096D6',
    msi: 'https://cdn.simpleicons.org/msi/D80027',
    acer: 'https://cdn.simpleicons.org/acer/83B81A',
    apple: 'https://cdn.simpleicons.org/apple/111827',
    razer: 'https://cdn.simpleicons.org/razer/44D62C',
    logitech: 'https://api.iconify.design/simple-icons/logitech.svg?color=%2300B8FC',
    samsung: 'https://cdn.simpleicons.org/samsung/1428A0',
    lg: 'https://cdn.simpleicons.org/lg/A50034',
    microsoft: 'https://api.iconify.design/logos/microsoft-icon.svg',
    huawei: 'https://cdn.simpleicons.org/huawei/FF0000',
    corsair: 'https://cdn.simpleicons.org/corsair/111827',
  };

  const fallbackBadgeSvg = (label, bg) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 36" width="120" height="36"><rect width="120" height="36" rx="6" fill="${bg}"/><text x="60" y="23" fill="#FFFFFF" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="14" letter-spacing="0.6" text-anchor="middle">${escapeHtml(label)}</text></svg>`;

  const customBadges = {
    gigabyte: ['GIGABYTE', '#0066CC'],
    aula: ['AULA', '#7C3AED'],
    akko: ['AKKO', '#EC4899'],
    onikuma: ['ONIKUMA', '#F97316'],
    teamgroup: ['TEAMGROUP', '#DC2626'],
    lexar: ['LEXAR', '#0F172A'],
    crucial: ['CRUCIAL', '#1D4ED8'],
    rapoo: ['RAPOO', '#0EA5E9'],
    hyperwork: ['HYPERWORK', '#334155'],
    anker: ['ANKER', '#00A8E8'],
    ugreen: ['UGREEN', '#16A34A'],
    dareu: ['DAREU', '#EA580C'],
    avermedia: ['AVerMedia', '#B91C1C'],
    lecoo: ['Lecoo', '#0D9488'],
  };

  for (const [slug, url] of Object.entries(remoteSources)) {
    const outPath = `public/brands/${slug}.svg`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const svg = await r.text();
        if (svg.includes('<svg')) {
          writeFileSync(outPath, svg, 'utf8');
        }
      }
    } catch {
      // Keep existing file if network fetch blips
    }
  }
  for (const [slug, [label, bg]] of Object.entries(customBadges)) {
    const outPath = `public/brands/${slug}.svg`;
    writeFileSync(outPath, fallbackBadgeSvg(label, bg), 'utf8');
  }
  console.log('Synced brand SVG icons to public/brands/');
}

// ---------------------------------------------------------------------------
// 8. Flash Sale Schedule Helpers (2 Exact Campaigns)
// ---------------------------------------------------------------------------
function buildDailyFlashSaleWindows(startDate = '2026-11-17', endDate = '2026-12-30') {
  const windows = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayKey = d.toISOString().slice(0, 10);
    // 09:00 - 15:00 GMT+7 == 02:00:00.000Z - 08:00:00.000Z
    windows.push({
      startAt: `${dayKey}T02:00:00.000Z`,
      endAt: `${dayKey}T08:00:00.000Z`,
    });
  }
  return windows;
}

function buildWeekendHotSaleWindows(startDate = '2026-11-17', endDate = '2026-12-30') {
  const windows = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) {
      const dayKey = d.toISOString().slice(0, 10);
      // 09:00 - 22:00 GMT+7 == 02:00:00.000Z - 15:00:00.000Z
      windows.push({
        startAt: `${dayKey}T02:00:00.000Z`,
        endAt: `${dayKey}T15:00:00.000Z`,
      });
    }
  }
  return windows;
}

// ---------------------------------------------------------------------------
// 9. Download Images & Apply Full Local D1 + R2 Rebuild
// ---------------------------------------------------------------------------
async function downloadCachedImage(url) {
  const hash = createHash('sha256').update(url).digest('hex');
  const binPath = `${MEDIA_CACHE_DIR}/${hash}.bin`;
  if (existsSync(binPath)) return readFileSync(binPath);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  assert(buf.length > 0 && buf.length <= 5 * 1024 * 1024, `Invalid image size: ${buf.length}`);
  writeFileSync(binPath, buf);
  return buf;
}

async function applyToLocal() {
  prepareAll();
  await syncBrandIcons();
  const { products: prepared } = JSON.parse(readFileSync(PREPARED_PATH, 'utf8'));

  const d1Root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const candidates = readdirSync(d1Root)
    .filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
    .filter((f) => {
      const testDb = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
      try { return !!testDb.prepare("SELECT name FROM sqlite_master WHERE name='ProductStudio'").get(); }
      finally { testDb.close(); }
    });
  assert.equal(candidates.length, 1, 'Expected exactly 1 local ProductStudio database');
  const dbPath = resolve(d1Root, candidates[0]);

  mkdirSync('.wrangler/backups', { recursive: true });
  const backupPath = resolve('.wrangler/backups', `before-citilap-rebuild-${Date.now()}.sqlite`);
  const db = new DatabaseSync(dbPath);
  await backup(db, backupPath);
  console.log('Backup created:', backupPath);

  await build({
    stdin: {
      contents: `
        export * from './src/server/services/navigation.service';
        export * from './src/server/services/product-studio.service';
        export * from './src/server/services/media-library.service';
      `,
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['node:*', 'cloudflare:workers'],
    outfile: 'scripts/.rebuild-bundle.mjs',
    plugins: [{ name: 'wasm', setup(b) { b.onResolve({ filter: /\.wasm/ }, (a) => ({ path: a.path, external: true })); } }],
  });
  const api = await import('./.rebuild-bundle.mjs');

  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');
  const DB = {
    prepare(sql) {
      let values = [];
      const stmt = {
        bind(...args) { values = args; return stmt; },
        async first() { return db.prepare(sql).get(...values) || null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() { const r = db.prepare(sql).run(...values); return { success: true, meta: { changes: Number(r.changes) } }; },
      };
      return stmt;
    },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };

  const token = randomUUID();
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      host: '127.0.0.1',
      modules: true,
      bindings: { IMPORT_TOKEN: token },
      script: String.raw`export default {async fetch(r,e){
        if(r.headers.get('Authorization') !== 'Bearer '+e.IMPORT_TOKEN) return new Response(null,{status:403});
        const key=new URL(r.url).searchParams.get('key');
        if(!/^(?:library|products|brand)\//.test(key || '')) return new Response(null,{status:400});
        if(r.method==='PUT'){await e.PRODUCT_MEDIA.put(key,r.body,{httpMetadata:{contentType:r.headers.get('Content-Type')}});return new Response(null,{status:204});}
        if(r.method==='DELETE'){await e.PRODUCT_MEDIA.delete(key);return new Response(null,{status:204});}
        if(r.method==='HEAD') return new Response(null,{status:await e.PRODUCT_MEDIA.head(key)?204:404});
        return new Response(null,{status:405});
      }}`,
      compatibilityDate: '2026-10-01',
      r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' },
    }),
    resourcePersistencePath: resolve('.wrangler/state/v3'),
  });

  const mediaReq = async (method, key, body, type) => {
    const res = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), {
      method, body,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': type || 'application/octet-stream' },
    });
    assert(res.ok, `Local R2 ${method} ${key}: ${res.status}`);
    return method === 'HEAD' ? res.ok : { key };
  };
  const env = {
    DB,
    PRODUCT_MEDIA: {
      put: (key, body, options) => mediaReq('PUT', key, body, options?.httpMetadata?.contentType),
      delete: (key) => mediaReq('DELETE', key),
      head: async (key) => {
        const res = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), {
          method: 'HEAD',
          headers: { Authorization: 'Bearer ' + token },
        });
        return res.ok ? { key } : null;
      },
    },
  };

  try {
    // 1. Download & upload all unique remote images into R2 MediaAsset
    const allRemoteUrls = [...new Set(prepared.flatMap((p) => [...p.galleryUrls, ...p.contentImgUrls]))];
    console.log(`Downloading & uploading ${allRemoteUrls.length} unique images to local R2...`);
    const urlToAsset = new Map();
    const mapCachePath = `${CRAWL_DIR}/r2-url-map.json`;
    const savedMap = existsSync(mapCachePath) ? JSON.parse(readFileSync(mapCachePath, 'utf8')) : {};

    for (const [u, info] of Object.entries(savedMap)) {
      const row = db.prepare("SELECT id, storageKey FROM MediaAsset WHERE id=? AND state='READY'").get(info.assetId);
      if (row && row.storageKey && await env.PRODUCT_MEDIA.head(row.storageKey)) {
        urlToAsset.set(u, info);
      }
    }

    const pendingUrls = allRemoteUrls.filter((u) => !urlToAsset.has(u));
    console.log(`Already in R2: ${urlToAsset.size}, remaining to upload: ${pendingUrls.length}`);

    for (let i = 0; i < pendingUrls.length; i += 8) {
      const chunk = pendingUrls.slice(i, i + 8);
      await Promise.all(chunk.map(async (u) => {
        try {
          const buf = await downloadCachedImage(u);
          const rawName = u.split('/').pop()?.split('?')[0] || 'image.jpg';
          const cleanFileName = rawName.replace(/laptopnew/gi, 'citilap');
          const res = await api.uploadLibraryImage(env, new File([buf], cleanFileName), {
            folder: 'products',
            originalName: cleanFileName,
          });
          const info = { assetId: res.asset.id, url: res.asset.url };
          urlToAsset.set(u, info);
          savedMap[u] = info;
        } catch (err) {
          console.warn('Image upload failed:', u, String(err));
        }
      }));
      if ((i + chunk.length) % 80 === 0 || i + chunk.length >= pendingUrls.length) {
        writeFileSync(mapCachePath, JSON.stringify(savedMap, null, 2));
        console.log(`Uploaded ${Math.min(i + chunk.length, pendingUrls.length)}/${pendingUrls.length}`);
      }
    }
    writeFileSync(mapCachePath, JSON.stringify(savedMap, null, 2));

    // 2. Clear all old Orders, Reviews, Campaigns, Inventory, Old Products
    console.log('Clearing old orders, reviews, campaigns, inventory, and old products...');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        DELETE FROM AdminNotification WHERE type IN ('NEW_ORDER', 'ORDER_STATUS_CHANGED');
        DELETE FROM ContactEvent WHERE contactId IN (SELECT id FROM ContactSubmission WHERE message LIKE '[Đánh giá%');
        DELETE FROM ContactSubmission WHERE message LIKE '[Đánh giá%';
        DELETE FROM OrderNote;
        DELETE FROM OrderEvent;
        DELETE FROM OrderItem;
        DELETE FROM "Order";
        DELETE FROM InventoryReservation;
        DELETE FROM InventoryTransaction;
        DELETE FROM InventoryBalance;
        DELETE FROM ProductInspection;
        DELETE FROM SerialUnit;
        DELETE FROM PromotionCampaignItem;
        DELETE FROM PromotionCampaign;
        DELETE FROM ProductEditLog;
        DELETE FROM ProductVersion;
        DELETE FROM ProductStudioRevision;
        DELETE FROM ProductStudio;
        DELETE FROM ProductImage;
        DELETE FROM ProductVariant;
        DELETE FROM Product;
        DELETE FROM MediaUsage WHERE ownerType IN ('PRODUCT', 'PRODUCT_REVISION', 'PRODUCT_CONTENT', 'NAVIGATION_REVISION');
        DELETE FROM SearchResultItem;
        DELETE FROM SearchResultSet;
        UPDATE SearchCatalogRevision SET revision = revision + 1 WHERE id = 1;
      `);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    // 3. Sync Brands with Icon paths
    console.log('Syncing brands & SVG icons...');
    const brandMap = new Map();
    for (const row of db.prepare('SELECT id, name, slug FROM Brand').all()) {
      brandMap.set(row.name.toLowerCase(), row.id);
      brandMap.set(row.slug.toLowerCase(), row.id);
    }
    const ensureBrands = [
      ['Asus', 'asus'], ['Lenovo', 'lenovo'], ['Dell', 'dell'], ['HP', 'hp'],
      ['MSI', 'msi'], ['Acer', 'acer'], ['Gigabyte', 'gigabyte'], ['Apple', 'apple'],
      ['Razer', 'razer'], ['Logitech', 'logitech'], ['Aula', 'aula'], ['Akko', 'akko'],
      ['Onikuma', 'onikuma'], ['TeamGroup', 'teamgroup'], ['Lexar', 'lexar'],
      ['Crucial', 'crucial'], ['Rapoo', 'rapoo'], ['HyperWork', 'hyperwork'],
      ['Anker', 'anker'], ['Ugreen', 'ugreen'], ['DareU', 'dareu'], ['AVerMedia', 'avermedia'],
      ['Samsung', 'samsung'], ['LG', 'lg'], ['Microsoft', 'microsoft'], ['Corsair', 'corsair'],
      ['Huawei', 'huawei'],
    ];
    for (const [bName, bSlug] of ensureBrands) {
      const logoPath = existsSync(`public/brands/${bSlug}.svg`) ? `/brands/${bSlug}.svg` : null;
      const existingId = brandMap.get(bName.toLowerCase()) || brandMap.get(bSlug);
      if (existingId) {
        db.prepare("UPDATE Brand SET name=?, slug=?, logo=?, status='ACTIVE', deletedAt=NULL, updatedAt=CURRENT_TIMESTAMP WHERE id=?")
          .run(bName, bSlug, logoPath, existingId);
        brandMap.set(bName.toLowerCase(), existingId);
      } else {
        const newId = `br-${bSlug}`;
        db.prepare("INSERT INTO Brand(id, name, slug, logo, status, createdAt, updatedAt) VALUES(?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
          .run(newId, bName, bSlug, logoPath);
        brandMap.set(bName.toLowerCase(), newId);
      }
    }

    // 4. First remove unreferenced legacy categories so total categories stays clean (<= 200),
    //    then create Categories temporarily (without images) so Products can reference them,
    //    then publish all Products, then attach real Product R2 assetIds to EVERY Category & NavigationStudio!
    console.log('Publishing initial NavigationStudio & Categories...');
    const newCatIds = new Set(CATEGORY_DEFS.map((c) => c.id));
    db.exec("DELETE FROM CmsRedirect WHERE note IN ('Category path changed', 'Category legacy URL')");
    db.exec('UPDATE Category SET parentId = NULL');
    for (const row of db.prepare('SELECT id FROM Category').all()) {
      if (!newCatIds.has(row.id)) {
        db.prepare('DELETE FROM Category WHERE id=?').run(row.id);
      } else {
        db.prepare("UPDATE Category SET name=?, slug=? WHERE id=?").run(`__tmp_${row.id}`, `__tmp_${row.id}`, row.id);
      }
    }
    const prevNavRaw = db.prepare("SELECT published FROM NavigationStudio WHERE id='site'").get()?.published;
    let prevFooter = [];
    try {
      const parsedPrev = prevNavRaw ? JSON.parse(prevNavRaw) : null;
      if (Array.isArray(parsedPrev?.menus?.footer) && parsedPrev.menus.footer.length > 0) {
        prevFooter = parsedPrev.menus.footer;
      } else {
        const revRow = db.prepare("SELECT document FROM NavigationRevision WHERE document LIKE '%footer%' ORDER BY revision DESC LIMIT 1").all().find((r) => {
          try { return (JSON.parse(r.document)?.menus?.footer || []).length > 0; } catch { return false; }
        });
        if (revRow) prevFooter = JSON.parse(revRow.document).menus.footer || [];
      }
    } catch {}
    const emptyNav = JSON.stringify({ schemaVersion: 1, categories: [], collections: [], menus: { main: [], footer: prevFooter } });
    db.prepare("UPDATE NavigationStudio SET draft=?, published=? WHERE id='site'").run(emptyNav, emptyNav);
    const navDetail = await api.navigationDetail(DB);
    const oldCategories = db.prepare('SELECT id, name, slug, description, parentId FROM Category').all();
    const navCategories = CATEGORY_DEFS.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      visible: true,
      image: '',
      assetId: '',
      alt: c.name,
    }));
    const usedSlugs = new Set(navCategories.map((c) => c.slug));
    const usedNames = new Set(navCategories.map((c) => c.name));
    for (const old of oldCategories) {
      if (newCatIds.has(old.id)) continue;
      let s = old.slug;
      if (usedSlugs.has(s)) s = `legacy-${old.slug}-${old.id.slice(-4)}`;
      usedSlugs.add(s);
      let n = old.name;
      if (usedNames.has(n)) n = `[Lưu trữ] ${old.name}`;
      usedNames.add(n);
      navCategories.push({
        id: old.id,
        name: n,
        slug: s,
        description: old.description || '',
        parentId: null,
        visible: false,
        image: '',
        assetId: '',
        alt: n,
      });
    }

    const menuItem = (id, label, target, children = []) => ({ id, label, target, children });
    const catTarget = (id) => ({ kind: 'category', id });
    const pathTarget = (path) => ({ kind: 'path', path });

    const mainMenu = [
      menuItem('nav-hot-sale', 'HOT SALE', pathTarget('/hot-sale')),
      menuItem('nav-cat-gaming', 'Laptop Gaming', catTarget('cat-gaming'), [
        menuItem('menu-gaming-lenovo', 'Lenovo Gaming', catTarget('tax-gaming-lenovo')),
        menuItem('menu-gaming-asus', 'ASUS Gaming', catTarget('tax-gaming-asus')),
        menuItem('menu-gaming-msi', 'MSI Gaming', catTarget('tax-gaming-msi')),
        menuItem('menu-gaming-acer', 'Acer Gaming', catTarget('tax-gaming-acer')),
        menuItem('menu-gaming-gigabyte', 'Gigabyte Gaming', catTarget('tax-gaming-gigabyte')),
        menuItem('menu-gaming-dell', 'Dell Gaming', catTarget('tax-gaming-dell')),
        menuItem('menu-gaming-hp', 'HP Gaming', catTarget('tax-gaming-hp')),
        menuItem('menu-gaming-razer', 'Razer Gaming', catTarget('tax-gaming-razer')),
      ]),
      menuItem('nav-cat-van-phong', 'Laptop Văn Phòng', catTarget('cat-van-phong'), [
        menuItem('menu-office-lenovo', 'Lenovo Văn Phòng', catTarget('tax-office-lenovo')),
        menuItem('menu-office-asus', 'ASUS Văn Phòng', catTarget('tax-office-asus')),
        menuItem('menu-office-dell', 'Dell Văn Phòng', catTarget('tax-office-dell')),
        menuItem('menu-office-hp', 'HP Văn Phòng', catTarget('tax-office-hp')),
        menuItem('menu-office-msi', 'MSI Văn Phòng', catTarget('tax-office-msi')),
        menuItem('menu-office-acer', 'Acer Văn Phòng', catTarget('tax-office-acer')),
        menuItem('menu-office-surface', 'Microsoft Surface', catTarget('taxonomy-microsoft-surface')),
        menuItem('menu-office-lg', 'LG Gram', catTarget('taxonomy-lg-gram')),
      ]),
      menuItem('nav-cat-do-hoa', 'Laptop Đồ Họa', catTarget('cat-do-hoa'), [
        menuItem('menu-ws-dell', 'Dell Workstation', catTarget('tax-ws-dell')),
        menuItem('menu-ws-lenovo', 'Lenovo Workstation', catTarget('tax-ws-lenovo')),
        menuItem('menu-ws-hp', 'HP Workstation', catTarget('tax-ws-hp')),
        menuItem('menu-ws-gigabyte', 'Gigabyte Workstation', catTarget('tax-ws-gigabyte')),
        menuItem('menu-ws-asus', 'ASUS Workstation', catTarget('tax-ws-asus')),
        menuItem('menu-ws-msi', 'MSI Workstation', catTarget('tax-ws-msi')),
      ]),
      menuItem('nav-cat-macbook', 'Apple MacBook', catTarget('cat-macbook'), [
        menuItem('menu-macbook-air', 'MacBook Air', catTarget('taxonomy-macbook-air')),
        menuItem('menu-macbook-pro', 'MacBook Pro', catTarget('taxonomy-macbook-pro')),
        menuItem('menu-mac-mini', 'Mac Mini', catTarget('taxonomy-mac-mini')),
        menuItem('menu-mac-studio', 'Mac Studio', catTarget('taxonomy-mac-studio')),
        menuItem('menu-imac', 'iMac', catTarget('taxonomy-imac')),
      ]),
      menuItem('nav-accessories', 'Phụ Kiện', catTarget('cat-phu-kien'), [
        menuItem('menu-acc-mouse', 'Chuột máy tính', catTarget('ref-accessory-mouse')),
        menuItem('menu-acc-keyboard', 'Bàn phím cơ', catTarget('ref-accessory-keyboard')),
        menuItem('menu-acc-audio', 'Tai nghe', catTarget('ref-accessory-audio')),
        menuItem('menu-acc-bag', 'Balo laptop', catTarget('ref-accessory-bag')),
        menuItem('menu-acc-sleeve', 'Túi chống sốc', catTarget('ref-accessory-sleeve')),
        menuItem('menu-acc-charger', 'Sạc & Cáp', catTarget('ref-accessory-charger')),
        menuItem('menu-acc-hub', 'Hub USB-C', catTarget('ref-accessory-hub')),
        menuItem('menu-acc-stand', 'Giá đỡ laptop', catTarget('ref-accessory-stand')),
        menuItem('menu-acc-cooler', 'Đế tản nhiệt', catTarget('ref-accessory-cooler')),
        menuItem('menu-acc-ram', 'RAM Laptop', catTarget('ref-accessory-ram')),
        menuItem('menu-acc-ssd', 'SSD Laptop', catTarget('ref-accessory-hardware')),
        menuItem('menu-acc-screenbar', 'Đèn màn hình', catTarget('ref-accessory-screenbar')),
        menuItem('menu-acc-deskpad', 'Lót chuột & Deskpad', catTarget('ref-accessory-deskpad')),
        menuItem('menu-acc-webcam', 'Webcam', catTarget('ref-accessory-webcam')),
        menuItem('menu-acc-mic', 'Loa & Micro', catTarget('ref-accessory-speaker-mic')),
        menuItem('menu-acc-controller', 'Tay cầm chơi game', catTarget('ref-accessory-controller')),
      ]),
      menuItem('nav-news', 'Tin tức & Tư vấn', pathTarget('/news')),
      menuItem('nav-about', 'Về CitiLap', pathTarget('/gioi-thieu'), [
        menuItem('nav-stores', 'Hệ thống cửa hàng', pathTarget('/he-thong-cua-hang')),
        menuItem('nav-warranty', 'Chính sách bảo hành', pathTarget('/chinh-sach-bao-hanh')),
        menuItem('nav-contact', 'Liên hệ', pathTarget('/lien-he')),
      ]),
    ];

    const initialNavDoc = {
      schemaVersion: 1,
      categories: navCategories,
      collections: [],
      menus: {
        main: mainMenu,
        footer: prevFooter,
      },
    };
    const navStep1 = await api.writeNavigation(env, { expectedRevision: navDetail.revision, action: 'publish', document: initialNavDoc });

    // 5. Publish all products via ProductStudio service
    const warehouse = db.prepare("SELECT id FROM Warehouse WHERE status='ACTIVE' ORDER BY id LIMIT 1").get();
    assert(warehouse, 'Need at least 1 ACTIVE warehouse');

    const publishedIds = [];
    const catPrimaryAsset = new Map();

    for (let i = 0; i < prepared.length; i++) {
      const prod = prepared[i];
      const imgUrlMap = new Map();
      for (const u of prod.contentImgUrls) {
        if (urlToAsset.has(u)) imgUrlMap.set(u, urlToAsset.get(u).url);
      }

      const media = [];
      for (const u of prod.galleryUrls) {
        const info = urlToAsset.get(u);
        if (info && !media.some((m) => m.assetId === info.assetId)) {
          media.push({ assetId: info.assetId, alt: prod.name.slice(0, 280), variantId: '' });
        }
      }
      if (media.length === 0 && prod.r2AssetId) {
        const assetRow = db.prepare("SELECT id, storageKey FROM MediaAsset WHERE id=? AND state='READY'").get(prod.r2AssetId);
        if (assetRow?.storageKey && await env.PRODUCT_MEDIA.head(assetRow.storageKey)) {
          media.push({ assetId: assetRow.id, alt: prod.name.slice(0, 280), variantId: '' });
        }
      }
      assert(media.length > 0, `No R2 image found for product ${prod.slug}`);

      // Track first real product image per category
      if (!catPrimaryAsset.has(prod.categoryId)) {
        catPrimaryAsset.set(prod.categoryId, media[0].assetId);
      }

      const finalContentHtml = prod.rawContent
        ? buildEditorialReviewHtml({
            cleanName: prod.name,
            categoryId: prod.categoryId,
            brand: prod.brand,
            specs: prod.specs,
            rawContent: prod.rawContent,
            imgUrlMap,
            isAccessory: prod.template !== 'LAPTOP',
          })
        : prod.contentHtml;

      const brandId = brandMap.get(prod.brand.toLowerCase()) || null;
      const isAcc = prod.template !== 'LAPTOP';

      const doc = {
        schemaVersion: 1,
        name: prod.name,
        slug: prod.slug,
        categoryId: prod.categoryId,
        brand: prod.brand,
        brandId,
        template: prod.template,
        condition: 'NEW',
        warrantyType: 'SHOP',
        warrantyMonths: 6,
        stock: prod.variants.reduce((sum, v) => sum + (v.stock || 0), 0),
        isNewArrival: Boolean(prod.isNewArrival),
        isBestSeller: Boolean(prod.isBestSeller),
        isFeatured: Boolean(prod.isFeatured),
        isFlashSale: false,
        tags: prod.tags,
        description: prod.description,
        contentHtml: finalContentHtml,
        price: prod.price,
        originalPrice: prod.originalPrice,
        availability: 'AVAILABLE',
        seoTitle: prod.seoTitle,
        seoDescription: prod.seoDescription,
        specs: prod.specs,
        media,
        variants: prod.variants,
        warranties: [
          { name: 'Bảo hành tiêu chuẩn CitiLap 6 tháng', description: 'Bảo hành phần cứng 6 tháng tại CitiLap · Lỗi 1 đổi 1 trong 7 ngày đầu tiên.', adjustment: 0, recommended: true, type: 'SHOP', months: 6 },
          { name: 'Gói bảo hành mở rộng 12 tháng', description: 'Mở rộng bảo hành phần cứng 12 tháng toàn diện tại CitiLap.', adjustment: isAcc ? 100000 : 500000, recommended: false, type: 'SHOP', months: 12 },
        ],
        faqs: [],
        gifts: isAcc ? [] : ['Tặng túi chống sốc CitiLap & chuột không dây', 'Hỗ trợ cài đặt phần mềm & vệ sinh máy trọn đời'],
        accessoryProductIds: [],
        relatedProductIds: [],
      };

      const res = await api.writeStudio(env, null, { expectedRevision: 0, action: 'publish', document: doc });
      if (prod.model) {
        db.prepare('UPDATE Product SET model=? WHERE id=?').run(prod.model.slice(0, 120), res.id);
      }
      for (const v of prod.variants) {
        db.prepare(`
          INSERT INTO InventoryBalance(id, warehouseId, productId, variantId, onHand, reserved, updatedAt)
          VALUES(?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `).run(`inv-${v.id}`, warehouse.id, res.id, v.id, v.stock || 10);
      }
      publishedIds.push({ ...prod, id: res.id, primaryAssetId: media[0].assetId });
      if ((i + 1) % 30 === 0 || i + 1 === prepared.length) {
        console.log(`Published ${i + 1}/${prepared.length} products`);
      }
    }

    // 6. Attach REAL R2 product images to EVERY visible category in NavigationStudio (no icons!)
    //    Ensure library/ storageKey so /api/library/<id> works cleanly
    const anyLibraryAsset = db.prepare("SELECT id FROM MediaAsset WHERE storageKey LIKE 'library/%' AND state='READY' LIMIT 1").get()?.id;
    const isLibraryAsset = (aid) => {
      if (!aid) return false;
      const row = db.prepare("SELECT storageKey FROM MediaAsset WHERE id=?").get(aid);
      return Boolean(row?.storageKey?.startsWith('library/'));
    };
    const findDescendantAssetId = (catId, visited = new Set()) => {
      if (visited.has(catId)) return null;
      visited.add(catId);
      if (catPrimaryAsset.has(catId)) {
        const aid = catPrimaryAsset.get(catId);
        if (isLibraryAsset(aid)) return aid;
      }
      for (const ch of CATEGORY_DEFS) {
        if (ch.parentId === catId) {
          const found = findDescendantAssetId(ch.id, visited);
          if (found) return found;
        }
      }
      return null;
    };
    const resolveCatAsset = (c) => {
      const ownOrDesc = findDescendantAssetId(c.id);
      if (ownOrDesc) return ownOrDesc;
      // Walk up ancestors' subtrees for brand/family consistency before global fallback
      let parentId = c.parentId;
      while (parentId) {
        const parentAsset = findDescendantAssetId(parentId);
        if (parentAsset) return parentAsset;
        parentId = CATEGORY_DEFS.find((x) => x.id === parentId)?.parentId || null;
      }
      return anyLibraryAsset || '';
    };

    const updatedNavCategories = navCategories.map((c) => {
      if (!c.visible) return c;
      const assetId = resolveCatAsset(c);
      return {
        ...c,
        assetId,
        image: assetId ? `/api/library/${assetId}` : '',
        alt: c.name,
      };
    });
    const navDocWithImages = { ...initialNavDoc, categories: updatedNavCategories };
    await api.writeNavigation(env, { expectedRevision: navStep1.revision, action: 'publish', document: navDocWithImages });
    console.log('Updated NavigationStudio with real product images for all categories!');

    const catImgMap = new Map(updatedNavCategories.filter((c) => c.visible).map((c) => [c.id, c.image]));

    // 7. Create the EXACT 2 Flash Sale Campaigns requested:
    //    (1) FLASHSALE: daily 09h-15h, 10 random products, -5%
    //    (2) HOT SALE CUỐI TUẦN: Sat & Sun 09h-22h from 2026-11-17 to 2026-12-30, random laptops & accessories, -8%
    const shuffled = [...publishedIds].sort((a, b) => {
      const ha = createHash('md5').update(a.slug).digest('hex');
      const hb = createHash('md5').update(b.slug).digest('hex');
      return ha.localeCompare(hb);
    });

    const flash1Items = shuffled.slice(0, 10);
    const flash2Items = [
      ...shuffled.slice(10).filter((p) => p.template === 'LAPTOP').slice(0, 8),
      ...shuffled.slice(10).filter((p) => p.template !== 'LAPTOP').slice(0, 4),
    ];

    const dailyWindows = buildDailyFlashSaleWindows('2026-11-17', '2026-12-30');
    const weekendWindows = buildWeekendHotSaleWindows('2026-11-17', '2026-12-30');

    const camp1Id = 'camp_flashsale_daily';
    db.prepare(`
      INSERT INTO PromotionCampaign(id, name, description, status, revision, scheduleJson, startAt, endAt, createdAt, updatedAt)
      VALUES(?, 'FLASHSALE', 'Flash Sale hàng ngày khung giờ 09:00 – 15:00 · Giảm ngay 5% cho 10 sản phẩm chọn lọc.', 'PUBLISHED', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(camp1Id, JSON.stringify(dailyWindows), dailyWindows[0].startAt, dailyWindows.at(-1).endAt);

    for (const p of flash1Items) {
      const v = p.variants[0];
      const salePrice = Math.max(10000, Math.round((v.price * 0.95) / 1000) * 1000);
      db.prepare(`
        INSERT INTO PromotionCampaignItem(id, campaignId, productId, variantId, salePrice, regularPrice, soldCount, createdAt, updatedAt)
        VALUES(?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(`citem_fs_${p.id}`.slice(0, 64), camp1Id, p.id, v.id, salePrice, v.price);
    }

    const camp2Id = 'camp_hotsale_weekend';
    db.prepare(`
      INSERT INTO PromotionCampaign(id, name, description, status, revision, scheduleJson, startAt, endAt, createdAt, updatedAt)
      VALUES(?, 'HOT SALE CUỐI TUẦN', 'Hot Sale Cuối Tuần Thứ 7 & Chủ Nhật (09:00 – 22:00) từ 17/11 đến 30/12 · Giảm 8% laptop & phụ kiện.', 'PUBLISHED', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(camp2Id, JSON.stringify(weekendWindows), weekendWindows[0].startAt, weekendWindows.at(-1).endAt);

    for (const p of flash2Items) {
      const v = p.variants[0];
      const salePrice = Math.max(10000, Math.round((v.price * 0.92) / 1000) * 1000);
      db.prepare(`
        INSERT INTO PromotionCampaignItem(id, campaignId, productId, variantId, salePrice, regularPrice, soldCount, createdAt, updatedAt)
        VALUES(?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(`citem_wk_${p.id}`.slice(0, 64), camp2Id, p.id, v.id, salePrice, v.price);
    }

    console.log(`Created 2 campaigns: FLASHSALE (${flash1Items.length} items, -5%) & HOT SALE CUỐI TUẦN (${flash2Items.length} items, -8%)`);

    // 8. Update LandingPageStudio with real category images, new products, and updated links
    const lpRow = db.prepare('SELECT pageId, revision, published FROM LandingPageStudio LIMIT 1').get();
    if (lpRow?.published) {
      const lpDoc = JSON.parse(lpRow.published);
      const gamingIds = publishedIds.filter((p) => getRootCatId(p.categoryId) === 'cat-gaming').map((p) => p.id);
      const officeIds = publishedIds.filter((p) => getRootCatId(p.categoryId) === 'cat-van-phong').map((p) => p.id);
      const wsIds = publishedIds.filter((p) => getRootCatId(p.categoryId) === 'cat-do-hoa').map((p) => p.id);
      const macIds = publishedIds.filter((p) => getRootCatId(p.categoryId) === 'cat-macbook').map((p) => p.id);
      const accIds = publishedIds.filter((p) => p.template !== 'LAPTOP').map((p) => p.id);

      for (const sec of lpDoc.sections || []) {
        if (sec.id === 'sec-hot-sale' && sec.data) {
          sec.data.manualProductIds = [...flash1Items, ...flash2Items].map((p) => p.id);
          sec.data.links = [{ label: 'Tất cả ưu đãi', href: '/hot-sale' }];
        } else if (sec.id === 'sec-discover' && sec.data?.tabs) {
          const tabsData = [
            publishedIds.filter((p) => p.isNewArrival && p.template === 'LAPTOP').slice(0, 12).map((p) => p.id),
            publishedIds.filter((p) => p.isBestSeller && p.template === 'LAPTOP').slice(0, 12).map((p) => p.id),
            publishedIds.filter((p) => p.isFeatured && p.template === 'LAPTOP').slice(0, 12).map((p) => p.id),
          ];
          sec.data.tabs.forEach((tab, idx) => {
            tab.productIds = tabsData[idx] || gamingIds.slice(0, 10);
          });
        } else if (sec.id === 'sec-gaming' && sec.data) {
          sec.data.manualProductIds = gamingIds.slice(0, 12);
          sec.data.links = [
            { label: 'Lenovo Gaming', href: categoryPathById('tax-gaming-lenovo') },
            { label: 'ASUS Gaming', href: categoryPathById('tax-gaming-asus') },
            { label: 'MSI Gaming', href: categoryPathById('tax-gaming-msi') },
            { label: 'Acer Gaming', href: categoryPathById('tax-gaming-acer') },
            { label: 'Dell Gaming', href: categoryPathById('tax-gaming-dell') },
            { label: 'Xem tất cả', href: '/laptop-gaming' },
          ];
        } else if (sec.id === 'sec-office' && sec.data) {
          sec.data.manualProductIds = officeIds.slice(0, 12);
          sec.data.links = [
            { label: 'Lenovo Văn Phòng', href: categoryPathById('tax-office-lenovo') },
            { label: 'ASUS Văn Phòng', href: categoryPathById('tax-office-asus') },
            { label: 'Dell Văn Phòng', href: categoryPathById('tax-office-dell') },
            { label: 'HP Văn Phòng', href: categoryPathById('tax-office-hp') },
            { label: 'MSI Văn Phòng', href: categoryPathById('tax-office-msi') },
          ];
        } else if (sec.id === 'sec-workstation' && sec.data) {
          sec.data.manualProductIds = wsIds.slice(0, 12);
          sec.data.links = [
            { label: 'Dell Precision', href: categoryPathById('taxonomy-dell-precision') },
            { label: 'Lenovo ThinkPad P', href: categoryPathById('taxonomy-lenovo-thinkpad-p') },
            { label: 'HP ZBook', href: categoryPathById('taxonomy-hp-zbook') },
            { label: 'Gigabyte AERO', href: categoryPathById('taxonomy-gigabyte-aero') },
            { label: 'ASUS ProArt', href: categoryPathById('taxonomy-asus-proart') },
          ];
        } else if (sec.id === 'sec-macbook' && sec.data) {
          sec.data.manualProductIds = macIds.slice(0, 12);
          sec.data.links = [
            { label: 'MacBook Air', href: '/macbook/macbook-air' },
            { label: 'MacBook Pro', href: '/macbook/macbook-pro' },
            { label: 'Mac Mini', href: '/macbook/mac-mini' },
            { label: 'Xem tất cả', href: '/macbook' },
          ];
        } else if (sec.id === 'sec-accessories' && sec.data) {
          sec.data.manualProductIds = accIds.slice(0, 12);
          sec.data.links = [
            { label: 'Chuột máy tính', href: '/phu-kien/chuot-may-tinh' },
            { label: 'Bàn phím cơ', href: '/phu-kien/ban-phim-co' },
            { label: 'Tai nghe', href: '/phu-kien/tai-nghe' },
            { label: 'Balo laptop', href: '/phu-kien/balo-laptop' },
            { label: 'RAM & SSD', href: '/phu-kien/ssd-laptop' },
          ];
        } else if (sec.id === 'sec-cats' && sec.data) {
          const catList = [
            { categoryId: 'cat-gaming', customName: 'Laptop Gaming', href: '/laptop-gaming' },
            { categoryId: 'cat-van-phong', customName: 'Laptop Văn Phòng', href: '/laptop-van-phong' },
            { categoryId: 'cat-do-hoa', customName: 'Laptop Đồ Họa', href: '/laptop-workstation' },
            { categoryId: 'cat-macbook', customName: 'Apple MacBook', href: '/macbook' },
            { categoryId: 'taxonomy-lenovo-legion', customName: 'Lenovo Legion', href: categoryPathById('taxonomy-lenovo-legion') },
            { categoryId: 'taxonomy-asus-rog', customName: 'ASUS ROG', href: categoryPathById('taxonomy-asus-rog') },
            { categoryId: 'ref-accessory-mouse', customName: 'Chuột máy tính', href: '/phu-kien/chuot-may-tinh' },
            { categoryId: 'ref-accessory-keyboard', customName: 'Bàn phím cơ', href: '/phu-kien/ban-phim-co' },
            { categoryId: 'ref-accessory-audio', customName: 'Tai nghe', href: '/phu-kien/tai-nghe' },
            { categoryId: 'ref-accessory-bag', customName: 'Balo laptop', href: '/phu-kien/balo-laptop' },
            { categoryId: 'ref-accessory-hub', customName: 'Hub USB-C', href: '/phu-kien/hub-usb-c' },
            { categoryId: 'ref-accessory-hardware', customName: 'SSD & RAM', href: '/phu-kien/ssd-laptop' },
          ];
          sec.data.categoryIds = catList.map((x) => x.categoryId);
          sec.data.items = catList.map((x) => ({
            ...x,
            customImage: catImgMap.get(x.categoryId) || '',
          }));
        } else if (sec.id === 'sec-accessory-categories' && sec.data) {
          const accCats = [
            { categoryId: 'ref-accessory-mouse', customName: 'Chuột máy tính', href: '/phu-kien/chuot-may-tinh' },
            { categoryId: 'ref-accessory-keyboard', customName: 'Bàn phím cơ', href: '/phu-kien/ban-phim-co' },
            { categoryId: 'ref-accessory-audio', customName: 'Tai nghe', href: '/phu-kien/tai-nghe' },
            { categoryId: 'ref-accessory-bag', customName: 'Balo laptop', href: '/phu-kien/balo-laptop' },
            { categoryId: 'ref-accessory-charger', customName: 'Sạc & Cáp', href: '/phu-kien/sac-cap' },
            { categoryId: 'ref-accessory-hub', customName: 'Hub USB-C', href: '/phu-kien/hub-usb-c' },
            { categoryId: 'ref-accessory-stand', customName: 'Giá đỡ laptop', href: '/phu-kien/gia-do-laptop' },
            { categoryId: 'ref-accessory-cooler', customName: 'Đế tản nhiệt', href: '/phu-kien/de-tan-nhiet' },
            { categoryId: 'ref-accessory-ram', customName: 'RAM Laptop', href: '/phu-kien/ram-laptop' },
            { categoryId: 'ref-accessory-hardware', customName: 'SSD Laptop', href: '/phu-kien/ssd-laptop' },
            { categoryId: 'ref-accessory-speaker-mic', customName: 'Loa & Micro', href: '/phu-kien/loa-micro' },
            { categoryId: 'ref-accessory-controller', customName: 'Tay cầm game', href: '/phu-kien/tay-cam-choi-game' },
          ];
          sec.data.categoryIds = accCats.map((x) => x.categoryId);
          sec.data.items = accCats.map((x) => ({
            ...x,
            customImage: catImgMap.get(x.categoryId) || '',
          }));
        }
      }

      const nextLpRev = lpRow.revision + 1;
      const lpSnapshot = JSON.stringify(lpDoc);
      db.prepare("INSERT INTO LandingPageRevision(pageId, revision, document, action, actor) VALUES(?, ?, ?, 'publish', 'rebuild-script')").run(lpRow.pageId, nextLpRev, lpSnapshot);
      db.prepare("UPDATE LandingPageStudio SET draft=?, published=?, revision=?, publishedRevision=?, updatedAt=CURRENT_TIMESTAMP WHERE pageId=?").run(lpSnapshot, lpSnapshot, nextLpRev, nextLpRev, lpRow.pageId);
      console.log('Updated LandingPageStudio revision ->', nextLpRev);
    }

    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'Foreign key check failed');
    const finalCounts = {
      products: db.prepare("SELECT count(*) n FROM Product WHERE deletedAt IS NULL AND status='ACTIVE'").get().n,
      gaming: publishedIds.filter((p) => p.tags.includes('gaming')).length,
      variants: db.prepare("SELECT count(*) n FROM ProductVariant WHERE status='ACTIVE'").get().n,
      campaigns: db.prepare("SELECT count(*) n FROM PromotionCampaign WHERE status='PUBLISHED'").get().n,
      activeCats: db.prepare("SELECT count(*) n FROM Category WHERE status='ACTIVE'").get().n,
      catsWithImage: db.prepare("SELECT count(*) n FROM Category WHERE status='ACTIVE' AND image IS NOT NULL AND image != ''").get().n,
      brandsWithLogo: db.prepare("SELECT count(*) n FROM Brand WHERE status='ACTIVE' AND logo IS NOT NULL AND logo != ''").get().n,
    };
    console.log('=== REBUILD COMPLETE ===', finalCounts);
  } finally {
    await mf.dispose();
    db.close();
  }
}

if (MODE === '--prepare') {
  prepareAll();
} else {
  await applyToLocal();
}
