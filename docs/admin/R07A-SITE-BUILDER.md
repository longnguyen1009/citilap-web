# CitiLap CMS V2 — Kiến Trúc & Thiết Kế Kỹ Thuật R07A: Site Builder, Landing, Collection & StoreFront Sync

> **Dự án:** CitiLap Web (`citilap-web2`)  
> **Giai đoạn:** R07A — Trình dựng trang chủ/Landing, Collection và đồng bộ Menu/Footer/Settings với StoreFront  
> **Ngày lập:** 2026-10-14  
> **Căn cứ:** `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`, `AGENTS.md`, `CONTENT-SOURCE-REGISTRY.md`  
> **Ranh giới tuân thủ:**  
> - Branch hiện tại: `master` | HEAD: `085746d43b01d82ab45ca1802046fedc85d25670`.  
> - Bảo toàn toàn bộ uncommitted changes từ R03 đến R06.2. Không reset/clean/stash.  
> - Không sửa lại hay mở lại module đơn hàng R06.  
> - Dừng ngay sau R07A; không triển khai R07B (Hot Sale countdown), R07C (Checkout/payment settings) hay R08 (RBAC).  
> - Không commit/merge/push git; không deploy hay apply migration lên database remote/production.  
> - Bảo toàn port 3001, `.dev.vars` và dữ liệu thực tế của người dùng.

---

## 1. Kiểm Kê Hiện Trạng & Tái Sử Dụng Kiến Trúc

### 1.1. Bảng Đối Chiếu Thành Phần Hiện Có & Quyết Định R07A

| Thực thể / Hệ thống | Hiện trạng mã nguồn | Giải pháp R07A (Tái sử dụng - Không tạo hệ thống thứ 2) |
| :--- | :--- | :--- |
| **Trang chủ StoreFront** | Hard-coded trong `src/app/(shop)/page.tsx` qua 14 component con (`HeroSection`, `FeatureStrip`, `CategoryGridSection`, `ProductSection` x 6, `MediaSection`, `TestimonialSection`, `ContactSection`, `BrandSection`). | Chuyển đổi thành dynamic renderer đọc khối block từ `LandingPageStudio` (bản ghi `id = 'home'`). Giữ nguyên 100% giao diện và visual design đã tối ưu khi render các block tương ứng. |
| **Trang tĩnh R05** | Bảng `Page`, `PageStudio`, `PageStudioRevision` (`src/contracts/cms/page.ts`, `src/server/services/page.service.ts`). Route: `/chinh-sach-*`, `/gioi-thieu`, `/he-thong-cua-hang` và catch-all `/[slug]`. | **Giữ nguyên độc lập 100%**. Không sửa đổi model `Page` để tránh làm vỡ các trang chính sách đã có. Trang tĩnh R05 phục vụ tài liệu văn bản HTML dài (chính sách, giới thiệu); Page Builder phục vụ bố cục khối linh hoạt (sections/blocks). |
| **Landing Pages** | Chưa có route hay persistence riêng. Catch-all `src/app/(shop)/[slug]` đang dành cho R05 `Page`. | Tạo bảng `LandingPage`, `LandingPageStudio`, `LandingPageRevision`. Tuyến đường StoreFront canonical: `/landing/[slug]` nhằm triệt tiêu hoàn toàn nguy cơ xung đột (slug collision) với `/[slug]` (static pages), `/news`, `/category`, `/brand`, `/product`, `/collection`. |
| **Bộ sưu tập (Collections)** | Đang lưu trong `NavigationStudio.collections` (`src/contracts/cms/navigation.ts`, `src/components/admin/navigation/NavigationStudio.tsx`). Route: `/collection/[slug]`. Chưa có trang listing `/collection`. | **Tái sử dụng trực tiếp cấu trúc trong `NavigationStudio`**, mở rộng hỗ trợ 2 chế độ: **MANUAL** (chọn sản phẩm theo ID + thứ tự) và **RULE** (lọc theo danh mục, thương hiệu, loại sản phẩm, nhãn, tình trạng hàng). Bổ sung trang listing công khai `/collection`. Cả block builder, menu và trang `/collection/[slug]` đều dùng chung một resolver. |
| **Menu & Điều hướng** | `NavigationStudio` quản lý `menus.main` và `menus.footer`. | Hoàn thiện NavigationStudio: mở rộng target hỗ trợ brand, landing, page, collection, category, path và external URL an toàn. Desktop header, mobile bottom nav và footer đều tiêu thụ chung nguồn này. |
| **Cài đặt Website (Settings)** | Bảng `SiteSettings` (`src/server/services/settings.service.ts`, `src/contracts/cms/settings.ts`). Một số vị trí StoreFront vẫn đang import tĩnh từ `businessProfile.ts`. | Mở rộng contract `SiteSettings` (logo, favicon, hotline, email, giờ mở cửa, chi nhánh, mạng xã hội, copyright, SEO mặc định). Nối trực tiếp vào StoreFront layout và các trang `/lien-he`, `/he-thong-cua-hang`, `Header`, `Footer`. |
| **Media Library** | Cloudflare R2 + `MediaAsset` + `MediaUsage` (`src/server/services/media-library.service.ts`). | Tái sử dụng Media picker hiện có (`MediaDialog`), ALT text, R2 URL resolver. Theo dõi `MediaUsage` khi publish các block builder. |

---

## 2. Thiết Kế Tuyến Đường (Router Inventory & Route Selection)

Nhằm đảm bảo không chiếm dụng hoặc xung đột bất kỳ tuyến đường hệ thống nào:

```
[StoreFront Routing]
├── /                          -> Trang chủ CMS (id='home') [Nếu chưa cấu hình CMS -> fallback component hiện tại]
├── /landing/[slug]            -> Landing Page công khai theo slug (Published-only)
├── /collection                -> Danh sách tất cả bộ sưu tập đang hiển thị (Published-only)
├── /collection/[slug]         -> Chi tiết bộ sưu tập (Sản phẩm lọc theo Manual hoặc Rule)
├── /chinh-sach-*              -> Trang chính sách tĩnh R05 (Giữ nguyên)
├── /[slug]                    -> Trang tĩnh tùy chỉnh R05 (Giữ nguyên, không va chạm với /landing)
└── /api/landing/[slug]        -> API dữ liệu landing public (Không rò rỉ nháp)

[Admin Routing]
├── /admin/builder             -> Danh sách trang chủ & landing pages (Tìm kiếm, phân trang, trạng thái)
├── /admin/builder/home        -> Biên tập trang chủ (Page Builder visual panel)
├── /admin/builder/[id]        -> Biên tập landing page theo ID
├── /admin/navigation          -> Navigation Studio (Menu chính, Menu Footer, Bộ sưu tập)
└── /admin/settings            -> Quản trị thông tin thương hiệu, liên hệ, chi nhánh, mạng xã hội

[Admin APIs & Guards]
├── GET/POST  /api/admin/builder               -> Danh sách & Tạo mới landing page
├── GET/PUT   /api/admin/builder/[id]          -> Lấy chi tiết draft/published & Lưu nháp/Publish (CAS expectedRevision)
├── POST      /api/admin/builder/[id]/preview  -> Preview resolver (Render draft an toàn, auth guard)
├── GET/POST  /api/admin/builder/[id]/revisions -> Xem lịch sử & Khôi phục (Restore tạo draft mới)
├── GET/PUT   /api/admin/navigation            -> Quản trị menu, footer và bộ sưu tập
└── GET/PUT   /api/admin/settings              -> Quản trị cấu hình website
```

---

## 3. Lược Đồ Dữ Liệu & Migration 0017 (`0017_site_builder.sql`)

Dựa trên cấu trúc chuẩn của dự án (`id` + `Studio` + `StudioRevision` + trigger guard):

```sql
-- Migration: 0017_site_builder.sql
-- Quản trị cấu trúc khối cho Trang chủ duy nhất và các Landing Pages

CREATE TABLE LandingPage (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  isHome INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

CREATE UNIQUE INDEX LandingPage_slug_idx ON LandingPage(slug) WHERE deletedAt IS NULL AND isHome = 0;
CREATE UNIQUE INDEX LandingPage_single_home_idx ON LandingPage(isHome) WHERE isHome = 1 AND deletedAt IS NULL;
CREATE INDEX LandingPage_status_idx ON LandingPage(status);

CREATE TABLE LandingPageStudio (
  pageId TEXT PRIMARY KEY NOT NULL REFERENCES LandingPage(id) ON DELETE RESTRICT,
  publishedRevision INTEGER,
  publishedAt TEXT,
  publicUpdatedAt TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  draft TEXT NOT NULL CHECK(json_valid(draft)),
  published TEXT CHECK(published IS NULL OR json_valid(published)),
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LandingPageRevision (
  pageId TEXT NOT NULL REFERENCES LandingPageStudio(pageId) ON DELETE RESTRICT,
  revision INTEGER NOT NULL,
  document TEXT NOT NULL CHECK(json_valid(document)),
  action TEXT NOT NULL CHECK(action IN ('init', 'save', 'publish', 'unpublish', 'restore')),
  actor TEXT NOT NULL DEFAULT 'admin',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(pageId, revision)
);

CREATE TRIGGER landing_page_revision_guard BEFORE INSERT ON LandingPageRevision
WHEN NEW.revision != (SELECT revision + 1 FROM LandingPageStudio WHERE pageId = NEW.pageId)
BEGIN SELECT RAISE(ABORT, 'LANDING_PAGE_CONFLICT'); END;
```

---

## 4. Contract Khối Dựng Trang (Block Schema & Section Types)

Mỗi section có schema định kiểu chặt chẽ qua Zod, không chấp nhận trường JSON thô hay mã CSS/JS từ client:

```typescript
// Các loại section được hỗ trợ ban đầu:
export type SectionType =
  | 'banner'              // Hero banner hoặc banner quảng cáo đơn lẻ
  | 'slider'              // Slider nhiều slide chuyển động
  | 'product_grid'        // Lưới sản phẩm (Manual chọn tay hoặc Rule điều kiện)
  | 'featured_categories' // Lưới danh mục nổi bật kèm ảnh đại diện
  | 'featured_brands'     // Dải logo thương hiệu đối tác
  | 'featured_collection' // Nhúng trực tiếp một bộ sưu tập từ NavigationStudio
  | 'news_reviews'        // Danh sách bài viết tin tức / đánh giá công nghệ
  | 'intro'               // Khối nội dung giới thiệu, cam kết dịch vụ (Feature strip)
  | 'cta';                // Khối kêu gọi hành động tư vấn / hotline / Zalo
```

### Thuộc tính chuẩn của mỗi Section:
- `id`: Chuỗi UUID duy nhất, ổn định giữa các lần reorder.
- `type`: Thuộc danh sách `SectionType`.
- `name`: Tên định danh dễ hiểu trong editor (ví dụ: "Hero Banner mùa tựu trường").
- `enabled`: Boolean bật/tắt hiển thị mà không cần xóa block.
- `data`: Typed object theo từng loại section (chứa media URLs, links, text, criteria).

---

## 5. Quy Tắc Nguồn Sản Phẩm Dùng Chung (Product Resolver)

Bộ resolver dùng chung cho cả `product_grid` section trong Page Builder và `Collection`:
1. **Chỉ hiển thị sản phẩm `PUBLISHED` & `ACTIVE`:** Mọi đường đọc công khai đều lọc bỏ sản phẩm nháp (`DRAFT`), lưu trữ (`ARCHIVED`), hoặc xóa mềm (`deletedAt IS NOT NULL`).
2. **Chế độ MANUAL:** Nhận mảng `productIds` có thứ tự. Khử trùng lặp ID. Tra cứu qua `catalogService.getProductSummaryByIds`.
3. **Chế độ RULE:**
   - Allowlist filter: `productType` (`laptop` | `accessory` | `all`), `categoryId`, `brandId`, `tag` (`isFeatured`, `isNewArrival`, `isBestSeller`), `availability` (`AVAILABLE`, `PREORDER`, `CONTACT`).
   - Sắp xếp ổn định: `sort` (`newest`, `price-asc`, `price-desc`, `name-asc`, `best-selling`).
   - Giới hạn: `limit` (tối đa 48 sản phẩm).
   - Tuyệt đối không nhận câu lệnh SQL hay biểu thức suy diễn từ client.
4. **Không tính giá riêng:** Tái sử dụng `ProductCard` DTO và logic giá thống nhất hiện có (`price`, `originalPrice`, `lowestPrice30d`).
5. **Fail-Closed:** Nếu không tìm thấy sản phẩm hoặc lỗi kết nối, hiển thị empty state rõ ràng, không bao giờ dùng sản phẩm mẫu giả lập để che lỗi.

---

## 6. Sổ Bộ Nguồn Dữ Liệu Đồng Bộ StoreFront (Content Source Registry Sync)

| Vị trí StoreFront | Nguồn dữ liệu CMS | Schema Field | Public DTO | Hành vi khi thiếu / ẩn |
| :--- | :--- | :--- | :--- | :--- |
| **Header Logo** | `SiteSettings` (D1) | `logoUrl`, `storeName` | `storeName`, `logoUrl` | Fallback về ảnh logo mặc định trong `businessProfile` |
| **Header Hotline & Giờ làm việc** | `SiteSettings` (D1) | `storePhone`, `openingHours` | `storePhone`, `openingHours` | Fallback về hotline mặc định |
| **Header Menu Danh mục** | `NavigationStudio` | `categories` (visible=true) | `categories` | Chỉ hiển thị danh mục đang active |
| **Header Nav Items & Dropdowns** | `NavigationStudio` | `menus.main` | `menus.main` | Bỏ qua các liên kết trỏ tới danh mục/collection bị ẩn |
| **Footer Showrooms / Chi nhánh** | `SiteSettings` (D1) | `addressHanoi`, `addressBacNinh`, `storePhone`, `storePhoneBacNinh` | `addressHanoi`, `addressBacNinh`, `storePhone`... | Đồng bộ địa chỉ và SĐT hotline trên cả Hà Nội & Bắc Ninh |
| **Footer Links & Groups** | `NavigationStudio` | `menus.footer` | `menus.footer` | Một nơi quản trị duy nhất cho footer links |
| **Footer Social Links** | `SiteSettings` (D1) | `zaloUrl`, `facebookUrl`, `tiktokUrl` | `zaloUrl`, `facebookUrl`, `tiktokUrl` | Ẩn icon nếu đường dẫn để trống |
| **Trang `/lien-he`** | `SiteSettings` (D1) | Thông tin cửa hàng, hotline, địa chỉ | `PublicStorefrontSettings` | Đồng bộ 100% với Header & Footer |
| **Trang `/he-thong-cua-hang`** | `PageStudio` (`STORES`) + `SiteSettings` | Nội dung trang CMS + địa chỉ chi nhánh D1 | `PublicPage` + `PublicStorefrontSettings` | Kế thừa hotline/địa chỉ từ D1, nội dung từ CMS |

---

## 7. Quy Trình Draft / Preview / Publish & Quản Trị Phiên Bản (CAS)

```
[Biên tập viên chỉnh sửa]
        │
        ├──> [Lưu nháp (Save Draft)] ──> Ghi vào LandingPageStudio.draft
        │                               Tạo LandingPageRevision (action='save')
        │                               Website công cộng KHÔNG THAY ĐỔI
        │
        ├──> [Xem trước (Preview)]  ──> Render draft bằng Component Renderer thật
        │                               Cảnh báo banner: "Đang xem bản nháp"
        │                               Header: X-Robots-Tag: noindex, nofollow
        │                               Không cache public, yêu cầu Admin auth / Preview token
        │
        └──> [Xuất bản (Publish)]   ──> D1 Batch Transaction:
                                        • Kiểm tra CAS: revision === expectedRevision
                                        • Cập nhật LandingPageStudio.published = draft
                                        • Cập nhật LandingPage.status = 'PUBLISHED'
                                        • Ghi LandingPageRevision (action='publish')
                                        • Ghi nhận MediaUsage cho các ảnh sử dụng
                                        • Revalidate cache StoreFront
```

---

## 8. Ma Trận Quyền Hạn (Permission Boundaries)

- **Chủ cửa hàng (Owner):** Toàn quyền tạo, sửa, xóa, xuất bản, khôi phục trang chủ, landing, menu, footer, settings.
- **Biên tập viên (Editor):** Được quyền sửa draft, xem preview, và xuất bản trang chủ/landing/menu/footer. Không có quyền sửa settings thanh toán hay tài khoản.
- **Bán hàng (Sales):** Chỉ đọc nội dung hỗ trợ bán hàng, không truy cập giao diện editor builder.

Mọi mutation endpoint (`PUT /api/admin/builder/[id]`, `PUT /api/admin/navigation`, `PUT /api/admin/settings`) đều có middleware kiểm tra token Admin Bearer hợp lệ.

---

## 9. Chiến Lược Bootstrap & Chuyển Đổi An Toàn (Migration & Rollback)

1. **Bootstrap có kiểm soát:**
   - Cung cấp script bootstrap `bootstrap-site-builder.mjs` chuyển toàn bộ 14 khối hiện có của trang chủ thành bản ghi `LandingPage` đầu tiên (`id = 'home'`).
   - Cơ chế Idempotent: Kiểm tra nếu `LandingPage WHERE id = 'home'` đã tồn tại thì KHÔNG ghi đè, bảo vệ tuyệt đối các sửa đổi do người dùng đã thực hiện trên CMS.
2. **Cơ chế Chuyển tiếp An toàn (Zero Downtime Fallback):**
   - Storefront `src/app/(shop)/page.tsx` kiểm tra: nếu tìm thấy `LandingPageStudio` published hợp lệ thì render bằng CMS Block Renderer.
   - Nếu chưa có hoặc lỗi dữ liệu CMS, hiển thị giao diện fallback nguyên bản với trải nghiệm người dùng không đổi.
3. **Rollback an toàn:**
   - Trong Admin có nút "Khôi phục bản nháp" (Restore Revision) và "Hủy xuất bản" (Unpublish).
   - Nếu hủy xuất bản trang chủ, hệ thống quay về hiển thị fallback ban đầu mà không gây crash trang.
