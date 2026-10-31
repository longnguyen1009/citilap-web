import { z } from 'zod';
import { RESERVED_SLUGS, seoSchema } from './post';
import { youtubeId } from './media';

const text = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .refine((val) => !/javascript:|data:text\/html|<script|onload=|onerror=/i.test(val), {
      message: 'Giá trị chứa ký tự không an toàn hoặc XSS.',
    });

const safeUrlOrPath = z
  .string()
  .max(1000)
  .refine(
    (val) =>
      !val ||
      val.startsWith('/') ||
      val.startsWith('https://') ||
      val.startsWith('http://') ||
      val.startsWith('tel:') ||
      val.startsWith('mailto:'),
    { message: "Đường dẫn phải bắt đầu bằng '/', 'https://', 'http://', 'tel:' hoặc 'mailto:'." }
  )
  .refine((val) => !/javascript:|data:/i.test(val), {
    message: 'Giao thức URL không được phép.',
  });

export const landingSlugSchema = z
  .string()
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối (-).')
  .refine((val) => !(RESERVED_SLUGS as readonly string[]).includes(val) && val !== 'landing', {
    message: 'Đường dẫn này được hệ thống dành riêng, vui lòng chọn đường dẫn khác.',
  });

// --- Product Rule Criteria (shared between ProductGridSection and Collection) ---
export const productRuleCriteriaSchema = z.object({
  productType: z.enum(['all', 'laptop', 'accessory']).default('all'),
  categoryId: z.string().max(128).nullable().default(null),
  brandId: z.string().max(128).nullable().default(null),
  tag: z.enum(['all', 'isFeatured', 'isNewArrival', 'isBestSeller']).default('all'),
  availability: z.enum(['all', 'AVAILABLE', 'PREORDER', 'CONTACT']).default('all'),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'name-asc', 'best-selling']).default('newest'),
  limit: z.number().int().min(1).max(48).default(12),
});

export type ProductRuleCriteria = z.infer<typeof productRuleCriteriaSchema>;

// --- Section Schemas ---

// 1. Banner Section (Single Hero or Promotional Banner)
export const bannerSectionDataSchema = z.object({
  title: text(200).default(''),
  subtitle: text(300).default(''),
  badge: text(100).default(''),
  imageUrl: safeUrlOrPath.default(''),
  imageAssetId: z.string().max(128).nullable().default(null),
  link: safeUrlOrPath.default(''),
  buttonText: text(60).default(''),
  secondaryLink: safeUrlOrPath.default(''),
  secondaryButtonText: text(60).default(''),
  layout: z.enum(['hero', 'split', 'fullwidth']).default('hero'),
});

// 2. Slider Section (Multiple Banner Slides)
export const slideItemSchema = z.object({
  id: z.string().max(128),
  title: text(200).default(''),
  subtitle: text(300).default(''),
  badge: text(100).default(''),
  imageUrl: safeUrlOrPath.default(''),
  imageAssetId: z.string().max(128).nullable().default(null),
  link: safeUrlOrPath.default(''),
  buttonText: text(60).default(''),
});

export const sliderSectionDataSchema = z.object({
  autoplay: z.boolean().default(true),
  intervalSec: z.number().int().min(2).max(20).default(5),
  slides: z.array(slideItemSchema).min(1).max(10),
});

// 3. Product Grid Section
export const sectionLinkItemSchema = z.object({
  label: text(100),
  href: safeUrlOrPath,
});

export const productGridSectionDataSchema = z.object({
  tabs: z.array(z.object({ id: text(60).min(1), label: text(100).min(1), productIds: z.array(z.string().max(128)).max(48), href: safeUrlOrPath })).max(6).optional(),
  title: text(200).min(1, 'Tiêu đề lưới sản phẩm không được để trống'),
  subtitle: text(300).default(''),
  badge: text(100).default(''),
  badgeColor: text(60).default(''),
  colorTheme: text(60).default('blue'), // blue, red, indigo, gray, emerald, orange
  links: z.array(sectionLinkItemSchema).max(8).default([]),
  sourceMode: z.enum(['manual', 'rule']).default('rule'),
  manualProductIds: z.array(z.string().max(128)).max(48).default([]),
  ruleCriteria: productRuleCriteriaSchema.default({
    productType: 'all',
    categoryId: null,
    brandId: null,
    tag: 'all',
    availability: 'all',
    sort: 'newest',
    limit: 12,
  }),
  rankNumbering: z.boolean().default(false), // Cho khối Bán chạy nhất
  viewAllLink: safeUrlOrPath.default(''),
});

// 4. Featured Categories Section
export const featuredCategoryItemSchema = z.object({
  href: safeUrlOrPath.optional(),
  categoryId: z.string().max(128),
  customName: text(100).default(''),
  customImage: safeUrlOrPath.default(''),
});

export const featuredCategoriesSectionDataSchema = z.object({
  layout: z.enum(['cards', 'board']).optional(),
  title: text(200).default('Khám Phá Hệ Sinh Thái Danh Mục'),
  subtitle: text(300).default(''),
  categoryIds: z.array(z.string().max(128)).max(16).default([]),
  items: z.array(featuredCategoryItemSchema).max(16).default([]),
});

// 5. Featured Brands Section
export const featuredBrandsSectionDataSchema = z.object({
  title: text(200).default('Khám Phá Theo Thương Hiệu'),
  subtitle: text(300).default(''),
  brandIds: z.array(z.string().max(128)).max(20).default([]),
});

// 6. Featured Collection Section
export const featuredCollectionSectionDataSchema = z.object({
  title: text(200).default(''),
  subtitle: text(300).default(''),
  collectionId: z.string().max(128),
  limit: z.number().int().min(1).max(48).default(12),
});

// 7. News & Reviews Section
export const newsReviewsSectionDataSchema = z.object({
  layout: z.enum(['featured', 'grid']).optional(),
  title: text(200).default('Góc CitiLap Media & Đánh Giá'),
  subtitle: text(300).default(''),
  postIds: z.array(z.string().max(128)).max(10).default([]),
  limit: z.number().int().min(1).max(20).default(10),
  categoryId: z.string().max(128).nullable().default(null),
});

// 8. Intro & Feature Strip Section (Cam kết thương hiệu)
export const featureCardItemSchema = z.object({
  id: z.string().max(128),
  icon: text(50).default('shield'), // shield, truck, refresh, store, zap, star
  title: text(120),
  description: text(300),
});

export const introSectionDataSchema = z.object({
  title: text(200).default(''),
  subtitle: text(300).default(''),
  contentHtml: z.string().max(50_000).default(''),
  features: z.array(featureCardItemSchema).max(6).default([]),
});

// 9. Call-To-Action (CTA) Section
export const ctaSectionDataSchema = z.object({
  title: text(200).default('Bạn Cần Tư Vấn Cấu Hình Laptop Phù Hợp?'),
  subtitle: text(300).default('Chuyên viên CitiLap sẵn sàng tư vấn trực tiếp 1-1 qua Zalo hoặc Hotline.'),
  primaryText: text(60).default('Chat Zalo Ngay'),
  primaryLink: safeUrlOrPath.default(''),
  phone: text(30).default(''),
  secondaryText: text(60).default('Gọi Hotline'),
  secondaryLink: safeUrlOrPath.default(''),
  bgImageUrl: safeUrlOrPath.default(''),
});

export const videoReviewsSectionDataSchema = z.object({
  title: text(200).default('Video review sản phẩm'),
  videos: z.array(z.object({
    title: text(200).min(1),
    url: z.string().max(1000).refine(v => {
      if (youtubeId(v)) return true;
      try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password && !u.port && ['www.tiktok.com', 'tiktok.com'].includes(u.hostname) && /^\/@[^/]+\/video\/\d+$/.test(u.pathname); } catch { return false; }
    }, 'Dùng URL video YouTube hoặc TikTok.'),
    thumbnail: safeUrlOrPath.default(''),
  })).max(12).default([]),
});

export const customerGallerySectionDataSchema = z.object({
  title: text(200).default('Hình ảnh khách hàng tại CitiLap'),
  images: z.array(z.object({ url: safeUrlOrPath, alt: text(300).min(1) })).max(20).default([]),
});

// --- Generic Section Union ---
export const SECTION_TYPES = [
  'banner',
  'slider',
  'product_grid',
  'featured_categories',
  'featured_brands',
  'featured_collection',
  'news_reviews',
  'intro',
  'cta',
  'video_reviews',
  'customer_gallery',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const sectionItemSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(SECTION_TYPES),
  name: text(120).min(1, 'Tên khối không được để trống'),
  enabled: z.boolean().default(true),
  data: z.discriminatedUnion('type', [
    z.object({ type: z.literal('banner'), ...bannerSectionDataSchema.shape }),
    z.object({ type: z.literal('slider'), ...sliderSectionDataSchema.shape }),
    z.object({ type: z.literal('product_grid'), ...productGridSectionDataSchema.shape }),
    z.object({ type: z.literal('featured_categories'), ...featuredCategoriesSectionDataSchema.shape }),
    z.object({ type: z.literal('featured_brands'), ...featuredBrandsSectionDataSchema.shape }),
    z.object({ type: z.literal('featured_collection'), ...featuredCollectionSectionDataSchema.shape }),
    z.object({ type: z.literal('news_reviews'), ...newsReviewsSectionDataSchema.shape }),
    z.object({ type: z.literal('intro'), ...introSectionDataSchema.shape }),
    z.object({ type: z.literal('cta'), ...ctaSectionDataSchema.shape }),
    z.object({ type: z.literal('video_reviews'), ...videoReviewsSectionDataSchema.shape }),
    z.object({ type: z.literal('customer_gallery'), ...customerGallerySectionDataSchema.shape }),
  ]),
});

export type SectionItem = z.infer<typeof sectionItemSchema>;

// --- Document Schema ---
export const landingPageDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  title: text(200).min(1, 'Tiêu đề trang không được để trống'),
  slug: z.string().max(140).refine((val) => val === '' || landingSlugSchema.safeParse(val).success, {
    message: 'Slug không hợp lệ hoặc trùng route hệ thống.',
  }),
  internalName: text(200).min(1, 'Tên quản trị nội bộ không được để trống'),
  seo: seoSchema,
  sections: z.array(sectionItemSchema).max(40, 'Mỗi trang tối đa 40 khối'),
});

export type LandingPageDocument = z.infer<typeof landingPageDocumentSchema>;

// --- Write Mutation Schema ---
export const landingPageStudioWriteSchema = z.object({
  expectedRevision: z.number().int().nonnegative('expectedRevision phải là số nguyên không âm'),
  action: z.enum(['save', 'publish', 'unpublish', 'restore']),
  document: landingPageDocumentSchema,
});

export type LandingPageStudioWriteInput = z.infer<typeof landingPageStudioWriteSchema>;

// --- Blank initial template helper ---
export function blankLandingPage(isHome = false): LandingPageDocument {
  return {
    schemaVersion: 1,
    title: isHome ? 'CitiLap - Laptop Gaming, Ultrabook & Like New Chính Hãng' : 'Trang Landing Mới',
    slug: isHome ? '' : 'landing-moi',
    internalName: isHome ? 'Trang chủ chính thức' : 'Trang Landing Mới',
    seo: {
      title: isHome ? 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt' : 'Trang Landing | CitiLap',
      description: isHome
        ? 'CitiLap chuyên cung cấp Laptop Gaming, Ultrabook, Máy Trạm và Like New chính hãng.'
        : 'Khám phá ưu đãi công nghệ tại CitiLap.',
      ogImageAssetId: null,
    },
    sections: isHome ? defaultHomepageSections() : [defaultHeroSection()],
  };
}

function defaultHeroSection(): SectionItem {
  return {
    id: crypto.randomUUID(),
    type: 'banner',
    name: 'Hero Banner',
    enabled: true,
    data: {
      type: 'banner',
      title: 'LAPTOP GAMING & ULTRABOOK',
      subtitle: 'Hiệu Năng Mạnh Mẽ - Giá Tốt Nhất',
      badge: 'ƯU ĐÃI ĐẶC BIỆT',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
      imageAssetId: null,
      link: '/laptop-gaming',
      buttonText: 'Khám Phá Ngay',
      secondaryLink: '/laptop-van-phong',
      secondaryButtonText: 'Ultrabook Cao Cấp',
      layout: 'hero',
    },
  };
}

export function defaultHomepageSections(): SectionItem[] {
  return [
    {
      id: 'sec-hero',
      type: 'banner',
      name: '01 · Hero Banner & Điểm Nhấn',
      enabled: true,
      data: {
        type: 'banner',
        title: 'LAPTOP GAMING',
        subtitle: '✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩',
        badge: 'CitiLap Gaming Zone',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        imageAssetId: null,
        link: '/laptop-gaming',
        buttonText: 'Khám Phá Ngay',
        secondaryLink: '/laptop-van-phong',
        secondaryButtonText: 'Xem Ultrabook',
        layout: 'hero',
      },
    },
    {
      id: 'sec-features',
      type: 'intro',
      name: '02 · Cam Kết Dịch Vụ & Lợi Thế',
      enabled: true,
      data: {
        type: 'intro',
        title: 'Cam Kết Chất Lượng CitiLap',
        subtitle: '4 tiêu chuẩn dịch vụ vượt trội dành cho khách hàng',
        contentHtml: '',
        features: [
          { id: 'f1', icon: 'star', title: 'Máy lướt, giá tốt', description: 'Like-new 99%, tiết kiệm 30 - 50%' },
          { id: 'f2', icon: 'shield', title: 'Cam kết nguyên zin', description: '100% linh kiện chuẩn, chưa sửa chữa' },
          { id: 'f3', icon: 'refresh', title: 'Dịch vụ vượt trội', description: 'Bảo hành chu đáo, 1 đổi 1 linh hoạt' },
          { id: 'f4', icon: 'truck', title: 'Giao hàng hỏa tốc', description: 'Đồng kiểm máy trước khi thanh toán' },
        ],
      },
    },
    {
      id: 'sec-cats',
      type: 'featured_categories',
      name: '03 · Hệ Sinh Thái Danh Mục',
      enabled: true,
      data: {
        type: 'featured_categories',
        title: 'Khám Phá Hệ Sinh Thái Danh Mục & Phụ Kiện Tech',
        subtitle: 'Lựa chọn dòng máy phù hợp nhất theo nhu cầu công việc và giải trí',
        categoryIds: [],
        items: [],
      },
    },
    {
      id: 'sec-new',
      type: 'product_grid',
      name: '04 · Hàng Mới Về',
      enabled: true,
      data: {
        type: 'product_grid',
        title: 'Hàng Mới Về - Bắt Trend Công Nghệ',
        subtitle: 'Những mẫu laptop vừa cập bến CitiLap với cấu hình mới nhất',
        badge: 'Mới Nhất',
        badgeColor: 'bg-indigo-600 text-white',
        colorTheme: 'indigo',
        links: [
          { label: 'Gaming Mới', href: '/laptop-gaming?sort=newest' },
          { label: 'Ultrabook Mới', href: '/laptop-van-phong?sort=newest' },
          { label: 'Apple M3', href: '/macbook' },
        ],
        sourceMode: 'rule',
        manualProductIds: [],
        ruleCriteria: {
          productType: 'all',
          categoryId: null,
          brandId: null,
          tag: 'isNewArrival',
          availability: 'all',
          sort: 'newest',
          limit: 10,
        },
        rankNumbering: false,
        viewAllLink: '/laptop-gaming?sort=newest',
      },
    },
    {
      id: 'sec-gaming',
      type: 'product_grid',
      name: '05 · Laptop Gaming',
      enabled: true,
      data: {
        type: 'product_grid',
        title: 'Laptop Gaming - Chiến Thần Đồ Hoạ',
        subtitle: 'Trang bị GPU RTX 4000 series mạnh mẽ, màn hình tần số quét cao',
        badge: 'Gaming',
        badgeColor: 'bg-red-600 text-white',
        colorTheme: 'red',
        links: [
          { label: 'RTX 4060', href: '/laptop-gaming?gpu=RTX+4060' },
          { label: 'RTX 4070', href: '/laptop-gaming?gpu=RTX+4070' },
          { label: 'Legion', href: '/laptop-gaming?brand=lenovo' },
          { label: 'ROG Strix', href: '/laptop-gaming?brand=asus' },
        ],
        sourceMode: 'rule',
        manualProductIds: [],
        ruleCriteria: {
          productType: 'laptop',
          categoryId: null,
          brandId: null,
          tag: 'all',
          availability: 'all',
          sort: 'newest',
          limit: 10,
        },
        rankNumbering: false,
        viewAllLink: '/laptop-gaming',
      },
    },
    {
      id: 'sec-ultrabook',
      type: 'product_grid',
      name: '06 · Ultrabook Cao Cấp',
      enabled: true,
      data: {
        type: 'product_grid',
        title: 'Ultrabook Cao Cấp - Doanh Nhân',
        subtitle: 'Thiết kế mỏng nhẹ, pin cả ngày, màn hình sắc nét chuẩn đồ họa',
        badge: 'Doanh Nhân',
        badgeColor: 'bg-blue-600 text-white',
        colorTheme: 'blue',
        links: [
          { label: 'MacBook Air', href: '/macbook' },
          { label: 'Dell XPS', href: '/laptop-van-phong?brand=dell' },
          { label: 'ThinkPad X1', href: '/laptop-van-phong?brand=lenovo' },
        ],
        sourceMode: 'rule',
        manualProductIds: [],
        ruleCriteria: {
          productType: 'laptop',
          categoryId: null,
          brandId: null,
          tag: 'all',
          availability: 'all',
          sort: 'newest',
          limit: 10,
        },
        rankNumbering: false,
        viewAllLink: '/laptop-van-phong',
      },
    },
    {
      id: 'sec-accessories',
      type: 'product_grid',
      name: '07 · Phụ Kiện Laptop & Setup Tech',
      enabled: true,
      data: {
        type: 'product_grid',
        title: 'Phụ Kiện Laptop & Đồ Chơi Công Nghệ',
        subtitle: 'Chuột gaming, bàn phím cơ, củ sạc GaN và túi chống sốc cao cấp',
        badge: 'Phụ Kiện',
        badgeColor: 'bg-emerald-600 text-white',
        colorTheme: 'emerald',
        links: [
          { label: 'Chuột & Bàn Phím', href: '/phu-kien?type=mouse-keyboard' },
          { label: 'Củ Sạc GaN', href: '/phu-kien?type=charger' },
          { label: 'Hub Type-C', href: '/phu-kien?type=hub' },
        ],
        sourceMode: 'rule',
        manualProductIds: [],
        ruleCriteria: {
          productType: 'accessory',
          categoryId: null,
          brandId: null,
          tag: 'all',
          availability: 'all',
          sort: 'newest',
          limit: 10,
        },
        rankNumbering: false,
        viewAllLink: '/phu-kien',
      },
    },
    {
      id: 'sec-best-selling',
      type: 'product_grid',
      name: '08 · Bán Chạy Nhất',
      enabled: true,
      data: {
        type: 'product_grid',
        title: 'Bán Chạy Nhất - Được Yêu Thích',
        subtitle: 'Top sản phẩm được khách hàng CitiLap tin tưởng lựa chọn nhiều nhất',
        badge: 'Best Seller',
        badgeColor: 'bg-orange-600 text-white',
        colorTheme: 'orange',
        links: [
          { label: 'Top Gaming', href: '/laptop-gaming?sort=best-selling' },
          { label: 'Top Mỏng Nhẹ', href: '/laptop-van-phong?sort=best-selling' },
        ],
        sourceMode: 'rule',
        manualProductIds: [],
        ruleCriteria: {
          productType: 'all',
          categoryId: null,
          brandId: null,
          tag: 'isBestSeller',
          availability: 'all',
          sort: 'best-selling',
          limit: 10,
        },
        rankNumbering: true,
        viewAllLink: '/laptop-gaming?sort=best-selling',
      },
    },
    {
      id: 'sec-media',
      type: 'news_reviews',
      name: '09 · Tin Tức & Đánh Giá Media',
      enabled: true,
      data: {
        type: 'news_reviews',
        title: 'Góc CitiLap Media - Video & Đánh Giá Chuyên Sâu',
        subtitle: 'Cập nhật tin công nghệ, thủ thuật sử dụng và đánh giá chi tiết',
        postIds: [],
        limit: 10,
        categoryId: null,
      },
    },
    {
      id: 'sec-cta',
      type: 'cta',
      name: '10 · Kêu Gọi Hành Động & Tư Vấn',
      enabled: true,
      data: {
        type: 'cta',
        title: 'Bạn Cần Tư Vấn Chọn Máy Chuẩn Nhu Cầu?',
        subtitle: 'Đội ngũ kỹ thuật viên CitiLap sẵn sàng hỗ trợ trực tiếp để bạn chọn được chiếc laptop ưng ý nhất.',
        primaryText: 'Chat Zalo Tư Vấn',
        primaryLink: 'https://zalo.me/0988234567',
        phone: '0988.234.567',
        secondaryText: 'Gọi Hotline Ngay',
        secondaryLink: 'tel:0988234567',
        bgImageUrl: '',
      },
    },
    {
      id: 'sec-brands',
      type: 'featured_brands',
      name: '11 · Thương Hiệu Đối Tác',
      enabled: true,
      data: {
        type: 'featured_brands',
        title: 'Khám Phá Theo Thương Hiệu',
        subtitle: 'Phân phối chính hãng các dòng máy hàng đầu thế giới',
        brandIds: [],
      },
    },
  ];
}

export interface LandingPageListItem {
  id: string;
  slug: string;
  name: string;
  isHome: boolean;
  hasUnpublishedDraft: boolean;
  internalName: string;
  title: string;
  status: string;
  revision: number;
  publishedRevision: number | null;
  sectionCount: number;
  updatedAt: string;
}

export interface LandingPageStudioResponse {
  id: string;
  slug: string;
  name: string;
  isHome: boolean;
  status: string;
  revision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  isPublished: boolean;
  hasUnpublishedDraft: boolean;
  document: LandingPageDocument;
}

export type SiteBuilderSection = SectionItem;

