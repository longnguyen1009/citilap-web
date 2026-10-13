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

export const adminSettingsDocumentSchema = z.object({
  // Store info
  storeName: safeText(120).min(1, "Tên cửa hàng không được để trống"),
  storeEmail: z.string().email("Email không hợp lệ").max(120),
  storePhone: safeText(30).min(5, "Số điện thoại không hợp lệ"),
  storePhoneBacNinh: safeText(30),
  zaloUrl: safeUrlOrPath,
  addressHanoi: safeText(255),
  addressBacNinh: safeText(255),
  openingHours: safeText(120),

  // Flash sale
  flashSaleEnabled: z.boolean(),
  flashSaleTitle: safeText(120),
  flashSaleEndAt: safeText(64), // Chuỗi ISO cố định hoặc rỗng, không tự tạo Date.now()

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
// No fictitious bank accounts or auto-extending Date.now() countdowns.
export const DEFAULT_ADMIN_SETTINGS: AdminSettingsDocument = {
  storeName: businessProfile.brandName,
  storeEmail: businessProfile.email,
  storePhone: businessProfile.displayPhone,
  storePhoneBacNinh: bacNinh?.displayPhone || "0988.234.567",
  zaloUrl: businessProfile.socialProfiles.zalo,
  addressHanoi: hanoi?.address || "Hà Nội",
  addressBacNinh: bacNinh?.address || "Bắc Ninh",
  openingHours: "T2 - T7: 09:00 - 20:00 (CN hẹn trước)",

  flashSaleEnabled: true,
  flashSaleTitle: "Giá Sốc Giờ Vàng",
  flashSaleEndAt: process.env.NEXT_PUBLIC_FLASH_SALE_END_AT || "2026-12-31T23:59:59Z",

  heroBadge: "CitiLap Gaming Zone",
  heroTitle: "LAPTOP",
  heroHighlight: "GAMING",
  heroSlogan: "✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩",
  heroBgImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
  heroCtaPrimaryText: "Khám Phá Ngay",
  heroCtaPrimaryLink: "/category/laptop-gaming",
  heroCtaSecondaryText: "Xem Ưu Đãi",
  heroCtaSecondaryLink: "/hot-sale",

  subBanner1Title: "Ultrabook Cao Cấp",
  subBanner1Subtitle: "Sang trọng & Mỏng nhẹ",
  subBanner1Link: "/category/laptop-van-phong",
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
  bankAccountInfo: "", // Cần quản trị viên cấu hình thông tin thanh toán thật
};

// Backward-compatible alias for existing imports
export type StorefrontSettings = AdminSettingsDocument;
export const DEFAULT_SETTINGS = DEFAULT_ADMIN_SETTINGS;

// Public DTO: Only fields needed by the Storefront UI
export const publicStorefrontSettingsSchema = z.object({
  storeName: z.string(),
  storeEmail: z.string(),
  storePhone: z.string(),
  storePhoneBacNinh: z.string(),
  zaloUrl: z.string(),
  addressHanoi: z.string(),
  addressBacNinh: z.string(),
  openingHours: z.string(),
  flashSaleEnabled: z.boolean(),
  flashSaleTitle: z.string(),
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
