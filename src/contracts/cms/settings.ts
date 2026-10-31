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

// Allows "#" as a temporary placeholder (e.g. MOIT badge link before registration completes).
const safeLinkOrHash = z.union([z.literal("#"), safeUrlOrPath]);

const testimonialSchema = z.preprocess(
  (val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      if (typeof obj.text !== "string" && typeof obj.quote === "string") {
        return { ...obj, text: obj.quote };
      }
    }
    return val;
  },
  z.object({
    name: safeText(80).min(1),
    role: safeText(120).default(""),
    product: safeText(160).default(""),
    text: safeText(800).min(1),
    rating: z.number().int().min(1).max(5).default(5),
  })
);

export const reviewVideoSchema = z.object({
  title: safeText(200).min(1),
  url: safeUrlOrPath,
  thumbnail: safeUrlOrPath.default(""),
  platform: z.enum(["youtube", "tiktok"]).optional(),
});

export type ReviewVideoItem = z.infer<typeof reviewVideoSchema>;

export const DEFAULT_REVIEW_VIDEOS: ReviewVideoItem[] = [
  {
    title: "10 Bước Setup Laptop Gaming Mới - Tránh Những Sai Lầm Này!",
    url: "https://www.youtube.com/watch?v=KsQTEyLOC6M",
    thumbnail: "https://i.ytimg.com/vi/KsQTEyLOC6M/hqdefault.jpg",
    platform: "youtube",
  },
  {
    title: "Top 3 Laptop Lenovo: Trùm Cuối Cao Cấp Bậc Nhất!",
    url: "https://www.youtube.com/watch?v=yuo-RIQeWeI",
    thumbnail: "https://i.ytimg.com/vi/yuo-RIQeWeI/hqdefault.jpg",
    platform: "youtube",
  },
  {
    title: "Lenovo LOQ 2026: Mát Không Tưởng, Có Đáng 40 Triệu?",
    url: "https://www.youtube.com/watch?v=P4rViOxqk8U",
    thumbnail: "https://i.ytimg.com/vi/P4rViOxqk8U/hqdefault.jpg",
    platform: "youtube",
  },
  {
    title: "ThinkPad Chip ARM: Hiện Tại Đã Đáng Mua?",
    url: "https://www.youtube.com/watch?v=TggjUtq3lfc",
    thumbnail: "https://i.ytimg.com/vi/TggjUtq3lfc/hqdefault.jpg",
    platform: "youtube",
  },
  {
    title: "Đánh Giá ASUS Zenbook 14: Đẹp Thì Rõ Rồi Nhưng... Dùng Có Sướng?",
    url: "https://www.youtube.com/watch?v=74SBcwfANGc",
    thumbnail: "https://i.ytimg.com/vi/74SBcwfANGc/hqdefault.jpg",
    platform: "youtube",
  },
  {
    title: "Trải nghiệm thực tế Laptop Gaming & Ultrabook tại Showroom CitiLap",
    url: "https://www.tiktok.com/@citilapvn/video/7420000000000000001",
    thumbnail: "/brand/store-photo-01.jpg",
    platform: "tiktok",
  },
  {
    title: "Quy trình kiểm định Laptop Like New 99% nguyên zin tại CitiLap",
    url: "https://www.tiktok.com/@citilapvn/video/7420000000000000002",
    thumbnail: "/brand/store-photo-02.jpg",
    platform: "tiktok",
  },
];

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
  messengerUrl: safeUrlOrPath.default(""),
  floatingContactEnabled: z.boolean().default(true),
  addressHanoi: safeText(255),
  addressBacNinh: safeText(255),
  openingHours: safeText(120),

  // Brand visual identity & social
  logoUrl: safeUrlOrPath.default(""),
  faviconUrl: safeUrlOrPath.default(""),
  motto: safeText(200).default("Một chữ tín - Vạn niềm tin"),
  copyrightText: safeText(300).default(""),
  facebookUrl: safeUrlOrPath.default("https://www.facebook.com/citilap"),
  tiktokUrl: safeUrlOrPath.default("https://www.tiktok.com/@citilapvn"),
  youtubeUrl: safeUrlOrPath.default("https://www.youtube.com/@thinkview/videos"),
  reviewVideos: z.array(reviewVideoSchema).max(12).default(DEFAULT_REVIEW_VIDEOS),

  // Legal entity (Nghị định 52/2013 & 85/2021) shown in footer
  legalBusinessName: safeText(200).default(""),
  businessRegistrationNumber: safeText(50).default(""),
  businessRegistrationIssuer: safeText(200).default(""),
  businessRegistrationDate: safeText(50).default(""),
  legalRepresentative: safeText(120).default(""),
  legalAddress: safeText(255).default(""),
  moitBadgeEnabled: z.boolean().default(true),
  moitBadgeUrl: safeLinkOrHash.default("https://online.gov.vn/nen-tang/9e483b5c-7da9-4159-bd80-2caab3d942e4"),
  moitBadgeImage: safeUrlOrPath.default("https://bizweb.dktcdn.net/thumb/medium/100/372/934/themes/892516/assets/logo_bct.png"),

  // Homepage testimonials (only real, admin-entered reviews are shown)
  testimonials: z.array(testimonialSchema).max(6).default([]),
  testimonialsSourceUrl: safeUrlOrPath.default(""),

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
  bankBin: safeText(30).default(""),
  bankAccountNumber: safeText(50).default(""),
  bankAccountName: safeText(120).default(""),
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
  messengerUrl: "",
  floatingContactEnabled: true,
  addressHanoi: hanoi?.address || "Số 23/40 Tạ Quang Bửu, P. Bách Khoa, Q. Hai Bà Trưng, Hà Nội",
  addressBacNinh: bacNinh?.address || "Số 40 Trần Hưng Đạo, P. Đại Phúc, TP. Bắc Ninh",
  openingHours: "T2 - T7: 09:00 - 20:00 (CN hẹn trước)",

  logoUrl: "/brand/citilap-logo.svg",
  faviconUrl: "/brand/citilap-mark.svg",
  motto: "Một chữ tín - Vạn niềm tin",
  copyrightText: "© 2024 - 2026 CitiLap. Tất cả quyền được bảo lưu.",
  facebookUrl: businessProfile.socialProfiles.facebook || "https://www.facebook.com/citilap",
  tiktokUrl: businessProfile.socialProfiles.tiktok || "https://www.tiktok.com/@citilapvn",
  youtubeUrl: businessProfile.socialProfiles.youtube || "https://www.youtube.com/@thinkview/videos",
  reviewVideos: DEFAULT_REVIEW_VIDEOS,

  legalBusinessName: "HỘ KINH DOANH CITI LAP",
  businessRegistrationNumber: "01D8053589",
  businessRegistrationIssuer: "",
  businessRegistrationDate: "",
  legalRepresentative: "",
  legalAddress: "",
  moitBadgeEnabled: true,
  moitBadgeUrl: businessProfile.moitVerificationUrl || "https://online.gov.vn/nen-tang/9e483b5c-7da9-4159-bd80-2caab3d942e4",
  moitBadgeImage: "https://bizweb.dktcdn.net/thumb/medium/100/372/934/themes/892516/assets/logo_bct.png",

  testimonials: [],
  testimonialsSourceUrl: "",

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
  heroBgImage: "/brand/marketing-banner.webp",
  heroCtaPrimaryText: "Khám Phá Ngay",
  heroCtaPrimaryLink: "/laptop-gaming",
  heroCtaSecondaryText: "Xem Ưu Đãi",
  heroCtaSecondaryLink: "/hot-sale",

  subBanner1Title: "Ultrabook Cao Cấp",
  subBanner1Subtitle: "Sang trọng & Mỏng nhẹ",
  subBanner1Link: "/laptop-van-phong",
  subBanner1Image: "/brand/store-photo-01.webp",

  subBanner2Title: "Ưu đãi cực khủng",
  subBanner2Subtitle: "Tặng chuột Gaming & Balo",
  subBanner2Link: "/hot-sale",
  subBanner2Image: "/brand/store-photo-02.webp",

  feature1Title: "Máy lướt, giá tốt",
  feature1Desc: "Đối chiếu cấu hình và tình trạng từng máy",
  feature2Title: "Thông tin rõ ràng",
  feature2Desc: "Kiểm tra hồ sơ máy và phụ kiện trước khi mua",
  feature3Title: "Dịch vụ vượt trội",
  feature3Desc: "Bảo hành theo gói, lỗi 1 đổi 1 trong 7 ngày đầu tiên",
  feature4Title: "Giao hàng toàn quốc",
  feature4Desc: "Xác nhận phí giao và phương án đồng kiểm",

  freeShippingThreshold: 5000000,
  shippingFee: 30000,
  codEnabled: true,
  bankTransferEnabled: true,
  bankAccountInfo: "",
  bankBin: "",
  bankAccountNumber: "",
  bankAccountName: "",
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
  messengerUrl: z.string().default(""),
  floatingContactEnabled: z.boolean().default(true),
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
  reviewVideos: z.array(reviewVideoSchema).default(DEFAULT_REVIEW_VIDEOS),

  legalBusinessName: z.string().default(""),
  businessRegistrationNumber: z.string().default(""),
  businessRegistrationIssuer: z.string().default(""),
  businessRegistrationDate: z.string().default(""),
  legalRepresentative: z.string().default(""),
  legalAddress: z.string().default(""),
  moitBadgeEnabled: z.boolean().default(true),
  moitBadgeUrl: z.string().default("https://online.gov.vn/nen-tang/9e483b5c-7da9-4159-bd80-2caab3d942e4"),
  moitBadgeImage: z.string().default(""),
  testimonials: z.array(testimonialSchema).default([]),
  testimonialsSourceUrl: z.string().default(""),

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
  bankBin: z.string().default(""),
  bankAccountNumber: z.string().default(""),
  bankAccountName: z.string().default(""),
});

export type PublicStorefrontSettings = z.infer<typeof publicStorefrontSettingsSchema>;
