/**
 * Bootstrap Site Builder: Idempotent initialization of default homepage.
 *
 * Rules:
 * - If `LandingPage WHERE id = 'home'` exists, it NEVER overwrites existing content.
 * - Idempotent, safe to run multiple times.
 * - Creates revision 1, publishes by default only if not previously configured.
 */

export const DEFAULT_HOMEPAGE_BOOTSTRAP = {
  schemaVersion: 1,
  internalName: 'Trang chủ chính thức',
  title: 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt',
  slug: '',
  seo: {
    title: 'CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt',
    description: 'CitiLap chuyên cung cấp Laptop Gaming, Ultrabook, Máy Trạm (Workstation) và Like New tuyển chọn kỹ lưỡng. Bảo hành 12 tháng, đổi mới 7 ngày.',
    ogImageAssetId: null,
  },
  sections: [
    {
      id: 'sec-hero',
      type: 'banner',
      name: '01 · Hero Banner & Điểm Nhấn',
      enabled: true,
      data: {
        type: 'banner',
        title: 'LAPTOP GAMING & ULTRABOOK',
        subtitle: '✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩',
        badge: 'CitiLap Gaming Zone',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        imageAssetId: null,
        link: '/category/laptop-gaming',
        buttonText: 'Khám Phá Ngay',
        secondaryLink: '/category/laptop-van-phong',
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
          { label: 'Gaming Mới', href: '/category/laptop-gaming?sort=newest' },
          { label: 'Ultrabook Mới', href: '/category/laptop-van-phong?sort=newest' },
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
        viewAllLink: '/category/laptop-gaming?sort=newest',
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
          { label: 'RTX 4060', href: '/category/laptop-gaming?gpu=RTX+4060' },
          { label: 'Legion', href: '/category/laptop-gaming?brand=lenovo' },
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
        viewAllLink: '/category/laptop-gaming',
      },
    },
    {
      id: 'sec-brands',
      type: 'featured_brands',
      name: '06 · Thương Hiệu Đối Tác',
      enabled: true,
      data: {
        type: 'featured_brands',
        title: 'Thương Hiệu Đối Tác Hàng Đầu',
        subtitle: 'Đối tác phân phối thiết bị công nghệ chính hãng',
        brandIds: [],
      },
    },
    {
      id: 'sec-cta',
      type: 'cta',
      name: '07 · Tư Vấn Cấu Hình',
      enabled: true,
      data: {
        type: 'cta',
        title: 'Bạn Cần Tư Vấn Cấu Hình Laptop Phù Hợp?',
        subtitle: 'Chuyên viên CitiLap sẵn sàng tư vấn trực tiếp 1-1 qua Zalo hoặc Hotline.',
        primaryText: 'Chat Zalo Ngay',
        primaryLink: 'https://zalo.me',
        phone: '0987654321',
        secondaryText: 'Gọi Hotline',
        secondaryLink: 'tel:0987654321',
        bgImageUrl: '',
      },
    },
  ],
};

/**
 * Executes idempotent bootstrap on a given D1 database instance.
 */
export async function bootstrapHomepage(db, options = { force: false }) {
  // 1. Check if homepage already exists
  const existing = await db
    .prepare('SELECT p.id, p.status, s.revision, s.publishedRevision FROM LandingPage p LEFT JOIN LandingPageStudio s ON s.pageId = p.id WHERE p.id = ?')
    .bind('home')
    .first();

  if (existing && !options.force) {
    return {
      status: 'SKIPPED',
      message: `Homepage already exists in LandingPage table (revision ${existing.revision}, status: ${existing.status}). Preserving authored content.`,
      revision: existing.revision,
      publishedRevision: existing.publishedRevision,
    };
  }

  const doc = DEFAULT_HOMEPAGE_BOOTSTRAP;
  const snapshot = JSON.stringify(doc);
  const now = new Date().toISOString();

  const statements = [
    // 1. LandingPage table
    db
      .prepare(`
        INSERT INTO LandingPage (id, slug, isHome, name, status, createdAt, updatedAt)
        VALUES ('home', '', 1, ?, 'PUBLISHED', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          status = 'PUBLISHED',
          updatedAt = excluded.updatedAt
      `)
      .bind(doc.internalName, now, now),

    // 2. LandingPageStudio initial row with revision = 0
    db
      .prepare(`
        INSERT OR IGNORE INTO LandingPageStudio (pageId, revision, draft, updatedAt)
        VALUES ('home', 0, ?, ?)
      `)
      .bind(snapshot, now),

    // 3. LandingPageRevision (revision 1)
    db
      .prepare(`
        INSERT INTO LandingPageRevision (pageId, revision, document, action, actor, createdAt)
        VALUES ('home', 1, ?, 'init', 'system', ?)
      `)
      .bind(snapshot, now),

    // 4. Update LandingPageStudio to published revision 1
    db
      .prepare(`
        UPDATE LandingPageStudio
        SET revision = 1,
            publishedRevision = 1,
            draft = ?,
            published = ?,
            publishedAt = ?,
            publicUpdatedAt = ?,
            updatedAt = ?
        WHERE pageId = 'home'
      `)
      .bind(snapshot, snapshot, now, now, now),
  ];

  await db.batch(statements);

  return {
    status: 'BOOTSTRAPPED',
    message: 'Default homepage successfully initialized and published as revision 1.',
    revision: 1,
    publishedRevision: 1,
    sectionCount: doc.sections.length,
  };
}
