/**
 * Centralized Accessory & Tech Gadget Taxonomy for CitiLap
 */

export interface AccessoryTypeItem {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  keywords: string[];
}

export const ACCESSORY_TYPES: AccessoryTypeItem[] = [
  {
    slug: "mouse-keyboard",
    name: "Chuột & Bàn Phím",
    shortName: "Chuột & Phím",
    description: "Chuột không dây công thái học, chuột gaming và bàn phím cơ gõ êm",
    keywords: ["chuột", "bàn phím", "mouse", "keyboard", "phím cơ", "chuot", "ban-phim"],
  },
  {
    slug: "bag",
    name: "Balo & Túi Chống Sốc",
    shortName: "Balo & Túi",
    description: "Balo laptop du lịch, túi chống sốc chống thấm nước bảo vệ máy tối ưu",
    keywords: ["balo", "túi", "chống sốc", "backpack", "sleeve", "bag", "tui", "chong-soc"],
  },
  {
    slug: "charger",
    name: "Củ Sạc GaN & Cáp Sạc",
    shortName: "Sạc GaN & Cáp",
    description: "Củ sạc nhanh công nghệ GaN 65W - 140W nhỏ gọn và cáp sạc siêu bền",
    keywords: ["sạc", "củ sạc", "cáp", "charger", "gan", "cable", "sac", "cu-sac", "cap"],
  },
  {
    slug: "hub",
    name: "Hub Chuyển Đổi Type-C",
    shortName: "Hub Type-C",
    description: "Hub chia cổng Type-C sang HDMI 4K, USB 3.0, khe thẻ nhớ và cổng LAN",
    keywords: ["hub", "dock", "type-c", "chuyển đổi", "adapter", "chuyen-doi"],
  },
  {
    slug: "stand",
    name: "Đế Tản Nhiệt & Giá Đỡ",
    shortName: "Giá Đỡ & Kê",
    description: "Giá đỡ hợp kim nhôm công thái học và quạt hút tản nhiệt laptop",
    keywords: ["đế", "tản nhiệt", "giá đỡ", "kê", "stand", "cooling", "tan-nhiet", "gia-do"],
  },
  {
    slug: "screenbar",
    name: "Đèn Treo Màn Hình & Decor",
    shortName: "Đèn Màn Hình",
    description: "Đèn thanh treo bảo vệ mắt chống lóa và phụ kiện decor góc máy",
    keywords: ["đèn", "screenbar", "màn hình", "light", "den", "man-hinh"],
  },
  {
    slug: "audio",
    name: "Tai Nghe & Âm Thanh",
    shortName: "Tai Nghe",
    description: "Tai nghe gaming, tai nghe không dây chống ồn và loa Bluetooth",
    keywords: ["tai nghe", "headphone", "earphone", "loa", "soundbar", "audio", "tai-nghe"],
  },
  {
    slug: "deskpad",
    name: "Deskpad & Lót Chuột",
    shortName: "Deskpad",
    description: "Thảm trải bàn da PU 2 mặt cao cấp, lót chuột gaming kích thước lớn",
    keywords: ["deskpad", "lót chuột", "mousepad", "pad", "lot-chuot"],
  },
  {
    slug: "hardware",
    name: "Nâng Cấp RAM & SSD",
    shortName: "RAM & SSD",
    description: "RAM DDR4, DDR5 chính hãng và ổ cứng SSD NVMe tốc độ cao",
    keywords: ["ram", "ssd", "ổ cứng", "nvme", "o-cung", "hardware"],
  },
];

export const ACCESSORY_PRICE_PRESETS = [
  { value: "under-200k", label: "Dưới 200.000đ", min: 0, max: 200_000 },
  { value: "200k-500k", label: "200.000đ - 500.000đ", min: 200_000, max: 500_000 },
  { value: "500k-1m", label: "500.000đ - 1 triệu", min: 500_000, max: 1_000_000 },
  { value: "1m-2m", label: "1 - 2 triệu", min: 1_000_000, max: 2_000_000 },
  { value: "over-2m", label: "Trên 2 triệu", min: 2_000_000, max: 50_000_000 },
];

export function getAccessoryTypeBySlug(slug?: string | null): AccessoryTypeItem | undefined {
  if (!slug) return undefined;
  return ACCESSORY_TYPES.find((t) => t.slug === slug);
}
