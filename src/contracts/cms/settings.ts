import { z } from "zod";
import { businessProfile } from "@/config/business-profile";

const safeText = (maxLen: number) =>
  z
    .string()
    .max(maxLen)
    .refine((val) => !/javascript:|data:text\/html|<script|onload=|onerror=/i.test(val), {
      message: "Giá trị chứa nội dung không an toàn hoặc XSS.",
    });

const safeUrlOrPath = z
  .string()
  .max(1000)
  .refine(
    (val) =>
      !val ||
      val.startsWith("/") ||
      val.startsWith("https://") ||
      val.startsWith("http://"),
    { message: "Đường dẫn phải bắt đầu bằng '/', 'https://' hoặc 'http://'." }
  )
  .refine((val) => !/javascript:|data:/i.test(val), {
    message: "Giao thức URL không được phép.",
  });

const productBannerSchema = z.object({
  title: safeText(120).min(1), description: safeText(500),
  href: z.string().max(1000).refine(value => /^\/(?!\/)[^\\\s]*$/.test(value) || /^https:\/\/[^\s\\]+$/.test(value), 'Dùng đường dẫn nội bộ hoặc HTTPS.'),
});

export const adminSettingsDocumentSchema = z.object({
  productTrustItems: z.array(safeText(300).min(1)).max(8).default([]),
  productShippingItems: z.array(safeText(500).min(1)).max(8).default([]),
  productBanners: z.array(productBannerSchema).max(2).default([]),
  // Store info
  storeName: safeText(120).min(1, "Tên cửa hàng không được để trống"),
  storeEmail: z.string().email("Email không hợp lệ").max(120),
  storePhone: safeText(30).min(5, "Số điện thoại không hợp lệ"),
  storePhoneBacNinh: safeText(30),
  zaloUrl: safeUrlOrPath,
  addressHanoi: safeText(255),
  addressBacNinh: safeText(255),
  openingHours: safeText(120),

  // Brand visual identity & social
  logoUrl: safeUrlOrPath.default(""),
  faviconUrl: safeUrlOrPath.default(""),
  motto: safeText(200).default("Một chữ tín - Vạn niềm tin"),
  copyrightText: safeText(300).default(""),
  facebookUrl: safeUrlOrPath.default("https://facebook.com/citilapvn"),
  tiktokUrl: safeUrlOrPath.default("https://tiktok.com/@citilapvn"),
  youtubeUrl: safeUrlOrPath.default(""),

  // SEO defaults
  defaultSeoTitle: safeText(200).default("CitiLap - Laptop Gaming, Ultrabook & Like New Chính Hãng"),
  defaultSeoDescription: safeText(500).default("CitiLap chuyên cung cấp Laptop Gaming, Ultrabook, Máy Trạm và Like New chính hãng."),

  // Flash sale
  hotSaleBannerImage: safeUrlOrPath.default(""),
  hotSaleBannerLink: safeUrlOrPath.default("/hot-sale"),
  flashSaleEnabled: z.union([z.boolean(), z.number().transform((n) => n !== 0)]).default(false),
  flashSaleTitle: safeText(120),
  flashSaleStartAt: safeText(64).default(""), // Chuỗi ISO UTC cố định hoặc rỗng
  flashSaleEndAt: safeText(64), // Chuỗi ISO UTC cố định hoặc rỗng

  // Hero & Banners
  heroBadge: safeText(100),
  heroTitle: safeText(100),
  heroHighlight: safeText(100),
  heroSlogan: safeText(200),
  heroBgImage: safeUrlOrPath,
  heroCtaPrimaryText: safeText(50),
  heroCtaPrimaryLink: safeUrlOrPath,
  heroCtaSecondaryText: safeText(50),
  heroCtaSecondaryLink: safeUrlOrPath,

  subBanner1Title: safeText(100),
  subBanner1Subtitle: safeText(200),
  subBanner1Link: safeUrlOrPath,
  subBanner1Image: safeUrlOrPath,

  subBanner2Title: safeText(100),
  subBanner2Subtitle: safeText(200),
  subBanner2Link: safeUrlOrPath,
  subBanner2Image: safeUrlOrPath,

  // Feature strip
  feature1Title: safeText(100),
  feature1Desc: safeText(200),
  feature2Title: safeText(100),
  feature2Desc: safeText(200),
  feature3Title: safeText(100),
  feature3Desc: safeText(200),
  feature4Title: safeText(100),
  feature4Desc: safeText(200),

  // Shipping & Payment
  freeShippingThreshold: z.number().int().nonnegative().max(1_000_000_000),
  shippingFee: z.number().int().nonnegative().max(50_000_000),
  codEnabled: z.boolean(),
  bankTransferEnabled: z.boolean(),
  bankAccountInfo: safeText(500),
}).superRefine((data, ctx) => {
  if (data.flashSaleEnabled && data.flashSaleStartAt && data.flashSaleEndAt) {
    const start = new Date(data.flashSaleStartAt).getTime();
    const end = new Date(data.flashSaleEndAt).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời điểm bắt đầu Flash Sale phải trước thời điểm kết thúc.",
        path: ["flashSaleStartAt"],
      });
    }
  }
});

export type AdminSettingsDocument = z.infer<typeof adminSettingsDocumentSchema>;

export const settingsMutationSchema = z.object({
  expectedRevision: z.number().int().nonnegative("expectedRevision phải là số nguyên không âm"),
  document: adminSettingsDocumentSchema,
});

export type SettingsMutationInput = z.infer<typeof settingsMutationSchema>;

const hanoi = businessProfile.locations.find((l) => l.id === "hanoi");
const bacNinh = businessProfile.locations.find((l) => l.id === "bac-ninh");

// Default settings based on confirmed businessProfile.
export const DEFAULT_ADMIN_SETTINGS: AdminSettingsDocument = {
  productTrustItems: [],
  productShippingItems: [],
  productBanners: [],
  storeName: businessProfile.brandName,
  storeEmail: businessProfile.email,
  storePhone: businessProfile.displayPhone,
  storePhoneBacNinh: bacNinh?.displayPhone || "0988.234.567",
  zaloUrl: businessProfile.socialProfiles.zalo,
  addressHanoi: hanoi?.address || "Số 23/40 Tạ Quang Bửu, P. Bách Khoa, Q. Hai Bà Trưng, Hà Nội",
  addressBacNinh: bacNinh?.address || "Số 40 Trần Hưng Đạo, P. Đại Phúc, TP. Bắc Ninh",
  openingHours: "T2 - T7: 09:00 - 20:00 (CN hẹn trước)",

  logoUrl: "/brand/citilap-logo.svg",
  faviconUrl: "/brand/citilap-mark.svg",
  motto: "Một chữ tín - Vạn niềm tin",
  copyrightText: "© 2024 - 2026 CitiLap. Tất cả quyền được bảo lưu.",
  facebookUrl: businessProfile.socialProfiles.facebook || "https://facebook.com/citilapvn",
  tiktokUrl: businessProfile.socialProfiles.tiktok || "https://tiktok.com/@citilapvn",
  youtubeUrl: "",

  defaultSeoTitle: "CitiLap - Laptop Gaming, Ultrabook & Like New Chính Hãng",
  defaultSeoDescription: "CitiLap chuyên cung cấp các dòng Laptop Gaming, Ultrabook, Máy Trạm (Workstation) và Laptop Like New chính hãng.",

  flashSaleEnabled: true,
  hotSaleBannerImage: "",
  hotSaleBannerLink: "/hot-sale",
  flashSaleTitle: "Giá Sốc Giờ Vàng",
  flashSaleStartAt: "",
  flashSaleEndAt: "2026-12-31T23:59:59Z",

  heroBadge: "CitiLap Gaming Zone",
  heroTitle: "LAPTOP",
  heroHighlight: "GAMING",
  heroSlogan: "✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩",
  heroBgImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
  heroCtaPrimaryText: "Khám Phá Ngay",
  heroCtaPrimaryLink: "/laptop-gaming",
  heroCtaSecondaryText: "Xem Ưu Đãi",
  heroCtaSecondaryLink: "/hot-sale",

  subBanner1Title: "Ultrabook Cao Cấp",
  subBanner1Subtitle: "Sang trọng & Mỏng nhẹ",
  subBanner1Link: "/laptop-van-phong",
  subBanner1Image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop",

  subBanner2Title: "Ưu đãi cực khủng",
  subBanner2Subtitle: "Tặng chuột Gaming & Balo",
  subBanner2Link: "/hot-sale",
  subBanner2Image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",

  feature1Title: "Máy lướt, giá tốt",
  feature1Desc: "Like-new 99%, tiết kiệm 30 - 50%",
  feature2Title: "Cam kết nguyên zin",
  feature2Desc: "100% linh kiện chuẩn, chưa sửa chữa",
  feature3Title: "Dịch vụ vượt trội",
  feature3Desc: "Bảo hành 12 tháng, 1 đổi 1 trong 7 ngày",
  feature4Title: "Giao hàng hỏa tốc",
  feature4Desc: "Đồng kiểm máy trước khi thanh toán",

  freeShippingThreshold: 5000000,
  shippingFee: 30000,
  codEnabled: true,
  bankTransferEnabled: true,
  bankAccountInfo: "",
};

// Backward-compatible alias
export type StorefrontSettings = AdminSettingsDocument;
export const DEFAULT_SETTINGS = DEFAULT_ADMIN_SETTINGS;

// Public DTO: Whitelist fields needed by Storefront UI (No admin secrets or billing accounts)
export const publicStorefrontSettingsSchema = z.object({
  productTrustItems: z.array(z.string()).default([]),
  productShippingItems: z.array(z.string()).default([]),
  productBanners: z.array(productBannerSchema).default([]),
  hotSaleBannerImage: z.string().default(""),
  hotSaleBannerLink: z.string().default("/hot-sale"),
  storeName: z.string(),
  storeEmail: z.string(),
  storePhone: z.string(),
  storePhoneBacNinh: z.string(),
  zaloUrl: z.string(),
  addressHanoi: z.string(),
  addressBacNinh: z.string(),
  openingHours: z.string(),

  logoUrl: z.string(),
  faviconUrl: z.string(),
  motto: z.string(),
  copyrightText: z.string(),
  facebookUrl: z.string(),
  tiktokUrl: z.string(),
  youtubeUrl: z.string(),
  defaultSeoTitle: z.string(),
  defaultSeoDescription: z.string(),

  flashSaleEnabled: z.boolean(),
  flashSaleTitle: z.string(),
  flashSaleStartAt: z.string().default(""),
  flashSaleEndAt: z.string(),

  heroBadge: z.string(),
  heroTitle: z.string(),
  heroHighlight: z.string(),
  heroSlogan: z.string(),
  heroBgImage: z.string(),
  heroCtaPrimaryText: z.string(),
  heroCtaPrimaryLink: z.string(),
  heroCtaSecondaryText: z.string(),
  heroCtaSecondaryLink: z.string(),

  subBanner1Title: z.string(),
  subBanner1Subtitle: z.string(),
  subBanner1Link: z.string(),
  subBanner1Image: z.string(),
  subBanner2Title: z.string(),
  subBanner2Subtitle: z.string(),
  subBanner2Link: z.string(),
  subBanner2Image: z.string(),

  feature1Title: z.string(),
  feature1Desc: z.string(),
  feature2Title: z.string(),
  feature2Desc: z.string(),
  feature3Title: z.string(),
  feature3Desc: z.string(),
  feature4Title: z.string(),
  feature4Desc: z.string(),

  freeShippingThreshold: z.number(),
  shippingFee: z.number(),
  codEnabled: z.boolean(),
  bankTransferEnabled: z.boolean(),
  bankAccountInfo: z.string(),
});

export type PublicStorefrontSettings = z.infer<typeof publicStorefrontSettingsSchema>;
