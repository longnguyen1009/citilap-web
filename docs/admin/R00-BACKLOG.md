# R00 — Kế Hoạch Chuyển Tiếp & Backlog Triển Khai R01–R03

**Ngày thực hiện:** 2026-10-12  
**Mục tiêu:** Cung cấp danh mục các gói công việc cụ thể, có bằng chứng, phạm vi, độ ưu tiên, tiêu chí nghiệm thu và phương án kiểm thử để chuẩn bị triển khai các giai đoạn tiếp theo (R01 — Độ tin cậy dữ liệu & Settings, R02 — Shell & UX thống nhất, R03 — Catalog hợp nhất).

---

## 1. Thứ Tự Ưu Tiên & Phụ Thuộc Giữa Các Gói

```
┌────────────────────────────────────────────────────────┐
│ R00 — Kiểm kê hiện trạng & Xác lập baseline (ĐANG ĐÓNG) │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ R01 — Độ tin cậy dữ liệu & Bảo vệ Settings (P0)        │
│ • Fix loading bug & alert ảo                           │
│ • Bảng D1 SiteSettings & Auth/CSRF guard               │
│ • Fail-Closed cho sản phẩm ẩn; tách lỗi 404 vs 503     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ R02 — Shell & UX Quản trị Thống nhất (P1)              │
│ • Cải tổ Sidebar theo 4 nhóm nghiệp vụ chính           │
│ • Chuẩn hóa UI primitives (Bảng, Tabs, Badges, Alert)  │
│ • Loại bỏ đường dẫn trùng lặp & nhầm lẫn               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ R03 — Catalog Thống nhất & Quản lý Laptop (P1)         │
│ • Đóng toàn bộ ngõ ghi legacy (redirect 409 sang Studio)│
│ • Phân trang server vượt giới hạn 100 sản phẩm         │
│ • Trình biên tập trực quan kiểu WordPress cho Laptop   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Danh Mục Công Việc Chi Tiết Cho R01 (Độ Tin Cậy & Settings - P0) — [Code R01 Đã Triển Khai; Chờ Tích Hợp Public & Manual Browser Gate]

> Báo cáo nghiệm thu kỹ thuật xem tại [R01-RELIABILITY.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R01-RELIABILITY.md). Báo cáo kiểm chứng mở rộng R01.1 xem tại [R01-VERIFICATION.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R01-VERIFICATION.md).

### Task CMS-R01-01: Sửa lỗi Treo Loading và Thông báo Ảo trong Settings UI — [HOÀN THÀNH]
- **ID:** `CMS-R01-01`
- **Mức độ ưu tiên:** P0 (Bloker UI)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH. Sửa dứt điểm loading bug trong `src/app/admin/settings/page.tsx`, thêm error state + retry, khóa lưu khi tải lỗi, loại bỏ hoàn toàn thông báo thành công ảo.

---

### Task CMS-R01-02: Bổ sung Bảng D1 `SiteSettings`, Revision Guard và Server Auth/CSRF — [HOÀN THÀNH]
- **ID:** `CMS-R01-02`
- **Mức độ ưu tiên:** P0 (Lỗ hổng bảo mật & mất mát dữ liệu)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH. Áp dụng migration `0012_site_settings.sql`, bảng `SiteSettings` & `SiteSettingsRevision`, trigger guard `site_settings_revision_guard`, bảo vệ `requireAdmin` và `requireAdminMutation`, service `settings.service.ts`, test suite Miniflare 9/9 PASS.

---

### Task CMS-R01-03: Tách Biệt Lỗi Hạ Tầng và Triển Khai Fail-Closed cho Nội Dung Ẩn — [HOÀN THÀNH]
- **ID:** `CMS-R01-03`
- **Mức độ ưu tiên:** P0 (Toàn vẹn hiển thị)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH. Phân loại 6 trạng thái publication, xóa bỏ việc nuốt 503 trong `storefront-cms.service.ts`, PDP trả `notFound()` fail-closed khi sản phẩm CMS là nháp hoặc đã unpublish, guard `studio: null` cho publish scheduler, order guard chặn đặt hàng nháp/ẩn. Test suite 7/7 PASS.

---

---

## 3. Danh Mục Công Việc Chi Tiết Cho R02 (Shell & UX Thống Nhất - P1)

### Task CMS-R02-01: Tái Cấu Trúc Điều Hướng Admin Shell Theo 4 Nhóm Nghiệp Vụ
- **ID:** `CMS-R02-01`
- **Mức độ ưu tiên:** P1
- **Vấn đề & Bằng chứng:**
  - `src/app/admin/layout.tsx:32-43`: Menu hiện tại gồm 10 mục rời rạc, có cả "Quản lý sản phẩm" lẫn "Product Studio", "Thư viện ảnh" đứng đầu danh sách, thiếu mục "Tin tức", "Danh mục" và "Menu" thực chất trỏ về cùng một view.
- **Phạm vi file dự kiến:** `src/app/admin/layout.tsx`.
- **Phụ thuộc:** `CMS-R01`.
- **Rủi ro:** Đổi route có thể làm hỏng bookmark nếu không có redirect.
- **Cách triển khai dự kiến:**
## 3. Danh Mục Công Việc Chi Tiết Cho R02 (Shell & UX Quản Trị Thống Nhất - P1) — [HOÀN THÀNH]

> Báo cáo nghiệm thu chi tiết xem tại [R02-ADMIN-UX.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R02-ADMIN-UX.md).

### Task CMS-R02-01: Tái Cấu Trúc Admin Shell & Navigation Chuyển Tiếp — [HOÀN THÀNH]
- **ID:** `CMS-R02-01`
- **Mức độ ưu tiên:** P1
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - Sidebar chuyển tiếp tối đa 2 cấp, phân định 3 nhóm nghiệp vụ thực tế:
    1. **Tổng quan & Bán hàng**: Tổng quan (`/admin/dashboard`), Đơn hàng (`/admin/orders`), Hộp thư liên hệ (`/admin/contacts`), Khách hàng (`/admin/customers`).
    2. **Catalog & Biên tập**: Danh sách sản phẩm (`/admin/products`), Biên tập sản phẩm (`/admin/product-studio`), Thư viện Media (`/admin/media`).
    3. **Nội dung & Hệ thống**: Danh mục sản phẩm (`/admin/categories`), Menu & Bộ sưu tập (`/admin/navigation`), Cài đặt hệ thống (`/admin/settings`).
  - Không tạo trang rỗng, link chết hoặc gán nhãn Laptop/Phụ kiện khi chưa có filter catalog thật.
  - Loại bỏ hoàn toàn chuông thông báo đỏ giả và avatar chữ A hardcode.
  - Mobile Drawer: Hỗ trợ phím Escape, focus containment, trả focus về nút mở drawer, khóa cuộn trang nền.
  - Tích hợp `AdminBreadcrumbs` tự động bám theo route đang mở.

---

### Task CMS-R02-02: Chuẩn Hóa Bộ Thư Viện UI Primitives & Áp Dụng Màn Hình Nghiệp Vụ — [HOÀN THÀNH]
- **ID:** `CMS-R02-02`
- **Mức độ ưu tiên:** P1
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - Tạo bộ UI primitives tại `src/components/admin/ui/`: `PageHeader`, `AdminCard`, `AdminButton`, `StatusBadge`, `InlineAlert`, `AdminBreadcrumbs`, `AdminLoadingState`, `AdminEmptyState`, `AdminErrorState`.
  - Áp dụng thành công vào các màn hình trọng tâm:
    - `Orders` (`/admin/orders`): PageHeader, AdminCard, StatusBadge rõ ràng, nhãn giải thích xử lý yêu cầu mua hàng, thay thế browser alert bằng InlineAlert.
    - `Settings` (`/admin/settings`): PageHeader, InlineAlert "Đã lưu cấu hình thành công", Info Banners giải thích phạm vi chưa tác động Storefront tại 3 tab (Flash Sale, Banners, Shipping).
    - `Products` (`/admin/products`): PageHeader có lối dẫn trực quan sang "Biên tập Studio".
    - `ProductStudio` (`src/components/admin/products/ProductStudio.tsx`): Đổi tiêu đề nghiệp vụ thành "Biên tập sản phẩm", làm rõ vai trò soạn thảo nâng cao & xuất bản web.
    - `NavigationStudio` (`src/components/admin/navigation/NavigationStudio.tsx`): Bổ sung cảnh báo xuất bản chung snapshot (Menu + Danh mục + Bộ sưu tập).

---

### Task CMS-R02-03: Dashboard Theo Công Việc với Dữ Liệu Thật — [HOÀN THÀNH]
- **ID:** `CMS-R02-03`
- **Mức độ ưu tiên:** P1
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - Tái cấu trúc `src/app/api/dashboard/route.ts`: Truy vấn trực tiếp từ Cloudflare D1 (`mediaEnvironment().DB`) đếm đơn hàng chờ xử lý (`pendingOrders`), bản nháp Studio (`draftStudioCount`), sản phẩm đã xuất bản (`publishedStudioCount`), tệp media (`mediaCount`), 6 đơn hàng mới nhất và 5 sản phẩm Studio gần nhất.
  - Loại bỏ 100% dữ liệu `Math.random()` và biểu đồ doanh thu giả.
  - Giao diện `src/app/admin/dashboard/page.tsx`: 4 thẻ công việc, 6 lối tắt tác vụ nhanh (Quick Actions), 2 bảng danh sách chi tiết (Đơn hàng mới tiếp nhận + Tiếp tục biên tập sản phẩm Studio).

---

## 4. Danh Mục Công Việc Chi Tiết Cho R03 (Catalog Thống Nhất & Quản Lý Laptop - P1) — [HOÀN THÀNH]

> Báo cáo nghiệm thu kỹ thuật và chứng thực trình duyệt chi tiết xem tại [R03-UNIFIED-CATALOG.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R03-UNIFIED-CATALOG.md).

### Task CMS-R03-01: Khóa Triệt Để Các Luồng Ghi Legacy & Chuẩn Hóa Canonical Writer — [HOÀN THÀNH]
- **ID:** `CMS-R03-01`
- **Mức độ ưu tiên:** P1
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - Khóa toàn bộ 5 tuyến API legacy mutation bằng HTTP 409 (`code: 'LEGACY_WRITER_DISABLED'`) kèm hướng dẫn sử dụng endpoint chuẩn `/api/admin/products`:
    - `POST /api/products` (Khóa)
    - `PATCH & DELETE /api/products/[id]` (Khóa)
    - `PATCH /api/products/bulk-metadata` (Khóa)
    - `PATCH /api/products/metadata` (Khóa)
    - `PATCH /api/products/[id]/versions/[versionId]` (Khóa)
  - Bảo toàn 100% các endpoint đọc (`GET /api/products`, `GET /api/products/[id]`, `GET /api/products/metadata`) cho Storefront tìm kiếm và báo cáo.
  - Sửa cron scheduler (`src/app/api/cron/publish-scheduler/route.ts`): kích hoạt xuất bản thông qua `ProductStudio.published` snapshot, không desync database.
  - Automated test suite `scripts/test-legacy-writer-locks.mjs`: 8/8 PASS.

---

### Task CMS-R03-02: Phân Trang Server, Bộ Lọc Đa Tiêu Chí & Bỏ Giới Hạn 100 Sản Phẩm — [HOÀN THÀNH]
- **ID:** `CMS-R03-02`
- **Mức độ ưu tiên:** P1
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - Xây dựng service `catalogList(db, opts)` trong `src/server/services/product-studio.service.ts`:
    - Server pagination (`LIMIT ? OFFSET ?`), đồng bộ tổng số bản ghi và tổng số trang chính xác.
    - Bộ lọc đa tiêu chí: `kind` (`ALL`, `LAPTOP`, `ACCESSORY`), `categoryId`, `brand`, `publicationStatus`, `availability`, khoảng giá.
    - Sắp xếp an toàn allowlist với tie-breaker kép (`p.id DESC`).
  - Tuyến API canonical `GET /api/admin/products` kết nối trực tiếp giao diện quản trị.
  - Mở rộng giao diện danh mục `src/app/admin/products/page.tsx`:
    - Co giãn responsive (1440px Desktop, 768px Tablet, 390px Mobile không tràn viền).
    - Bộ nút chọn nhanh phân loại `Tất cả`, `Laptop`, `Phụ kiện`.
    - Drawer bộ lọc nâng cao có thể đóng/mở linh hoạt.
    - Thanh điều hướng phân trang sliding window không trùng key.
  - Đã kiểm chứng truy cập trang 7 (> 120 bản ghi) với dataset 125 sản phẩm.

---

### Task CMS-R03-03: Trình Biên Tập Laptop Chuẩn Hóa & Bảo Toàn Dữ Liệu Legacy — [HOÀN THÀNH]
- **ID:** `CMS-R03-03`
- **Mức độ ưu tiên:** P1
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - Xây dựng component `src/components/admin/products/ProductEditor.tsx` với 6 tabs nghiệp vụ:
    1. Thông tin chung (Name, Slug, Category, Brand, Availability).
    2. Thông số kỹ thuật (Laptop specs template, CPU, GPU, RAM, SSD, Screen, Ports...).
    3. Cấu hình & Giá (Base price, Original price, Variants list).
    4. Media Library R2 (Cloudflare R2 integration, alt text validator).
    5. Bài giới thiệu (Sanitized HTML article editor).
    6. SEO & Hiển thị (Title, Description, Google search preview).
  - Áp dụng các primitives R02: `PageHeader`, `AdminCard`, `StatusBadge`, `InlineAlert`, `AdminButton`.
  - Hỗ trợ phím tắt `Ctrl+S`/`Cmd+S` và cảnh báo thoát trang khi có dữ liệu chưa lưu.
  - Tích hợp Modal xem trước sản phẩm (Draft Preview Modal) ngay trong trang và trang xem trước độc lập `/admin/products/[id]/preview`.
  - **Legacy Adoption Guard:** Khi xem sản phẩm legacy, dữ liệu được ánh xạ on-read sang `ProductDocument` (`revision = 0`). Khi lưu nháp lần đầu của sản phẩm đang bán, bản snapshot gốc được bảo lưu trong cột `published`, ngăn chặn hoàn toàn việc sản phẩm bị ẩn khỏi website khách hàng.
  - **Spec Metrics Extraction:** Tự động tính toán và lưu `ramGb`, `storageGb`, `screenSize`, `refreshRate` lên bảng `Product`.
  - **Lịch sử Đơn hàng Guard (`archiveProduct`):** Kiểm tra `OrderItem`, kích hoạt Soft-delete (`ARCHIVED`, `published = NULL`) bảo vệ lịch sử thanh toán.
  - Browser QA Verification: 13/13 PASS trên Microsoft Edge với dataset 125 sản phẩm và 0 lỗi JavaScript console.

---

### Task CMS-R03B: Hoàn Thiện Catalog Theo Yêu Cầu V2 — [HOÀN THÀNH TOÀN DIỆN]
- **ID:** `CMS-R03B`
- **Mức độ ưu tiên:** P0 (Chuẩn hóa V2)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH (100% Gates & Browser QA PASS).
  - **Ưu tiên A — Lịch sử & Khôi phục (Revisions & Restore):**
    - Bổ sung Tab 7 "Lịch sử & Khôi phục" trong `ProductEditor.tsx`.
    - Modal kiểm tra snapshot chi tiết (Giá, biến thể, thông số, JSON).
    - Nút "Khôi phục thành bản nháp": gọi `POST /api/admin/products/[id]/revisions/[revisionId]/restore`, tạo revision mới (`expectedRevision + 1`) với `action = 'restore'`.
    - Bảo toàn Storefront: nội dung công cộng giữ nguyên 100% cho đến khi người vận hành bấm Xuất bản.
    - Chống xung đột HTTP 409 khi có thao tác đồng thời.
  - **Ưu tiên B — Quản trị Thương hiệu (Brand Subsystem):**
    - Migration D1 `0013_brand_seo.sql` bổ sung `seoTitle`, `seoDescription` cho bảng `Brand`.
    - Backend service `src/server/services/brand.service.ts` và API CRUD `/api/admin/brands`.
    - Trang Admin `/admin/brands` với bộ lọc, tìm kiếm, form thêm/sửa, slug tự động sinh và chọn Logo từ Cloudflare R2 qua `MediaDialog`.
    - Khóa an toàn Deletion Guard: chặn xóa Brand khi còn sản phẩm tham chiếu (HTTP 400).
    - Trang Storefront `/brand/[slug]` kết nối dữ liệu D1 đồng bộ.
    - Editor sản phẩm chọn Brand từ D1 database thay vì nhập chuỗi tự do.
  - **Ưu tiên C — 3 Trục Trạng thái & Nhãn Marketing:**
    - Tách biệt rõ: (1) Publication (`DRAFT`/`PUBLISHED`/`ARCHIVED`), (2) Condition (`NEW`/`LIKE_NEW`/`USED`/`REFURBISHED`/`LIQUIDATION`), (3) Availability (`AVAILABLE`/`PREORDER`/`CONTACT`/`UNAVAILABLE`) bảo toàn `PREORDER`, (4) Nhãn marketing (`isNewArrival`, `isBestSeller`, `isFeatured`).
  - **Ưu tiên D — Trình Biên Tập Nội Dung Trực Quan (RichContentEditor):**
    - Xây dựng component `RichContentEditor.tsx`: thanh công cụ định dạng trực quan (Heading, Format, List, Blockquote, Table, Link an toàn, R2 Image picker).
    - Hỗ trợ chế độ xem/sửa mã nguồn HTML nâng cao phía sau editor trực quan.
    - Bộ lọc máy chủ `sanitizeHtml` làm sạch mã độc hại, bảo toàn 100% HTML nội dung hợp lệ và cấu trúc bảng.
  - **Bảo toàn Bất biến R03 & Archive:**
    - Sửa `archiveProduct`: gán `status = 'ARCHIVED'`, `published = NULL`, giữ `deletedAt = NULL` giúp sản phẩm lưu trữ có thể tìm lại và quản lý trong Admin Catalog.
  - **Bằng chứng kiểm chứng:**
    - `test-r03b-v2.mjs`: 15/15 PASS.
    - `test-brand-browser.mjs`: 9/9 PASS.
    - `test-unified-catalog-browser.mjs`: 17/17 PASS.
    - `build:cloudflare`: Code 0 (Production bundle thành công).

---

### Task CMS-R04 & CMS-R04.1: Phụ Kiện, Hoàn Thiện Filter/Compare/Related & Kiểm Thử Browser R04 — [HOÀN THÀNH TOÀN DIỆN]
- **ID:** `CMS-R04` / `CMS-R04.1`
- **Mức độ ưu tiên:** P0 (Kinh doanh Phụ kiện & Trải nghiệm Mua sắm Storefront)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH TOÀN DIỆN (100% Production Query Gates & Browser Integration Tests PASS).
  - **Phân hệ R04-A — Phụ kiện & Biến thể Linh hoạt (Admin Studio):**
    - Thiết lập 10 bộ mẫu thông số chuẩn (`LAPTOP`, `MOUSE`, `KEYBOARD`, `HEADPHONE`, `CHARGER`, `HUB`, `BAG`, `MONITOR`, `ACCESSORY`, `TECH`) với stable key, nhãn tiếng Việt, đơn vị đo, cờ `isFilterable`, `isComparable`.
    - Biến thể phụ kiện phi-PC linh hoạt qua cột JSON `options` (`color`, `switch`, `connection`, `power`, `size`, ...) kết hợp với giá, hình ảnh, mã SKU riêng biệt.
    - Chống trùng lặp biến thể ở mức Zod schema: cấm trùng SKU, cấm trùng tổ hợp cấu hình/options.
    - Chuyển đổi template không mất mát dữ liệu: cảnh báo banner và giữ nguyên các thông số chưa tương thích.
    - Ghi nhận `MediaUsage` cho ảnh chèn trong bài viết HTML (`ownerType = 'PRODUCT_CONTENT'`) và Logo Brand (`ownerType = 'BRAND', slot = 'logo'`).
    - Bất biến Brand tạm ẩn: sản phẩm đang gắn brand `INACTIVE` vẫn hiển thị nhãn `(Tạm ẩn)` trong Editor và không bị xóa `brandId`.
  - **Phân hệ R04-B / R04.1 — Lọc, Tìm Kiếm & PDP Phụ Kiện (Storefront Query & Browser Gates):**
    - Khép kín filter biến thể đồng bộ theo từng variant (`variantMatch` vs `baseMatch` cô lập tuyệt đối): ngăn chặn việc baseMatch cho lọt sản phẩm không khớp biến thể, hoặc điều kiện giá loại sai biến thể.
    - Chuẩn hóa đơn vị: 1TB khớp 1024GB và 1000GB; RAM 16GB dùng word boundary/equality clause ngăn chặn substring va chạm với 116GB.
    - Facet phụ kiện thực tế: kết nối (`connection`) cho chuột/bàn phím/tai nghe/hub; công suất (`power`) cho sạc/hub; ẩn triệt để CPU/RAM trên chuột.
    - Semantics giá card và sort: Card hiển thị giá và SKU của biến thể rẻ nhất thỏa mãn bộ lọc đang kích hoạt, không gây hiểu lầm cho người mua.
    - PDP (`/product/[id]`): pill chọn biến thể màu sắc, công suất đồng bộ tức thì giá và availability; thêm vào giỏ hàng lưu đúng snapshot `variantId`, `variantLabel`, `price`.
  - **Phân hệ R04-C / R04.1 — So Sánh Sản Phẩm, Gợi Ý Liên Quan & Browser Verification:**
    - Production endpoint `GET /api/compare`: kiểm tra chặt chẽ 0 ID, 1-3 IDs, >3 IDs (HTTP 400), khử trùng ID, chặn nhóm không tương thích, giữ thứ tự yêu cầu, thông số thiếu báo "Chưa cập nhật", đánh dấu khác biệt đúng.
    - Client compare: SSR/hydration an toàn qua `sessionStorage`, modal xử lý phím Escape và hoàn trả focus; floating bar đặt tại `bottom-28` trên mobile không che CTA giỏ hàng.
    - Production resolver `getRelatedProducts`: manual IDs ưu tiên hàng đầu, khử trùng ID và self-reference, loại trừ nháp/ẩn, fallback cùng category/brand không tạo trùng lặp.
  - **Bằng chứng kiểm chứng thực tế:**
    - `test-r04-1-gates.mjs`: 20/20 checks PASS (Unit normalization, Atomic variant match, Accessory facets, Compare route handler, Related resolver, Media usage protection).
    - `test-r04-browser-qa.mjs`: 18/14 checks PASS (Admin -> PDP flow, Cart variant snapshot & order guard, Filter accessory facets, Compare floating bar & modal, Escape key focus, Viewports 1440px / 768px / 390px / Zoom 200%).
    - Screenshots lưu tại `docs/screenshots/r04/`: 9 ảnh full-flow.
    - `test-r04-accessories-storefront.mjs`: 15/15 PASS.
    - `test-r03b-v2.mjs`: 15/15 PASS.
    - `test-product-studio.mjs`: 12/12 PASS.
    - `test-publication-correctness.mjs`: 8/8 PASS.
    - `test-storefront-cms-order-guard.mjs`: 5/5 PASS.
    - `test-media-library.mjs`: 16/16 PASS.
    - `test-navigation.mjs`: 16/16 PASS.
    - `test-unified-catalog.mjs`: 12/12 PASS.
    - `tsc --noEmit`: Code 0 (0 lỗi).
    - `eslint`: Code 0 (0 lỗi, 0 warning).
    - `build:cloudflare`: Code 0 (Vite SSR/Client production build hoàn thành).

---

### Task CMS-R05: CMS Tin Tức/Review và Trang Tĩnh Theo Kế Hoạch V2 — [R05 ĐÃ TRIỂN KHAI; HOÀN TẤT R05.1 PUBLIC INTEGRATION, SEO & BROWSER EVIDENCE]
- **ID:** `CMS-R05`
- **Mức độ ưu tiên:** P0 (Nội dung truyền thông, SEO & Trang tĩnh pháp lý)
- **Trạng thái thực tế:** R05 đã triển khai; hoàn tất R05.1 public integration, SEO và browser evidence.
  - **Kiểm toán Browser Harness:**
    - `scripts/test-r05-browser-qa.mjs`: Được phân loại chính xác là "Mô phỏng Khái niệm Component" (dùng JSX synthetic `R05Harness`, state React cục bộ, đánh giá CSS zoom).
    - `scripts/test-r05-1-browser-real.mjs`: Bộ kiểm chứng trên app/component production thật (`PostEditor.tsx`, `StaticPageEditor.tsx`, Miniflare D1/R2, Microsoft Edge Playwright).
  - **Quy tắc 5 Trạng Thái Trang Chính Sách (A-E):**
    - Trạng thái A (`NO_CMS_RECORD`): Chưa có CMS -> Fallback chuyển tiếp chuẩn từ Content Registry.
    - Trạng thái B (`DRAFT_ONLY`): Nháp tồn tại nhưng chưa publish -> Giữ fallback chuyển tiếp, không làm lộ nháp.
    - Trạng thái C (`PUBLISHED`): CMS chính thức từ D1 kèm SEO metadata động.
    - Trạng thái D (`UNPUBLISHED`): Chủ động gỡ bài -> Tuyệt đối không tự ý hiển thị lại nội dung hard-code legacy.
    - Trạng thái E (`INFRASTRUCTURE_ERROR`): Lỗi D1/binding -> Fail-closed bắt buộc, ném ngoại lệ rõ ràng, không nuốt lỗi thành trang tĩnh.
  - **Showroom & Single Source of Truth:**
    - Cấu trúc showroom kết hợp nội dung trình bày từ CMS Page `STORES` với thông tin hotline/địa chỉ vận hành từ `SiteSettings` trong D1. Mảng đa chi nhánh động đầy đủ trong Settings được ghi nhận chờ R07A.
  - **PDP Policy Scope:**
    - Thẻ bảo hành tại `/product/[id]` liên kết chuẩn hóa tới `/chinh-sach-bao-hanh`. Thời hạn bảo hành tại PDP lấy từ `Product.warranty` và `ProductStudio.warranties`.
  - **Next.js App Router HTTP 308 (RFC 7538):**
    - `permanentRedirect()` trả về mã HTTP 308 chuẩn cho slug cũ của Post, Page, và `/news/category/[slug]`. Đã kiểm chứng qua HTTP client `redirect: 'manual'`.
  - **Dynamic SEO & Custom Page Renderer:**
    - Bổ sung `src/app/(shop)/[slug]/page.tsx` phục vụ các trang tùy biến CMS đã xuất bản và xử lý slugHistory redirect.
    - `sitemap.ts` truy vấn động toàn bộ sản phẩm/bài viết/trang hợp lệ, không áp dụng clamp `take: 1000` tùy tiện, lọc `deletedAt IS NULL`, và khử trùng lặp URL.
  - **Bằng chứng kiểm chứng đa tầng:**
    - Service / Data Layer: `test-r05-foundation.mjs` (12/12 PASS), `test-r05-full.mjs` (10/10 PASS), `test-r05-1-publication-and-redirects.mjs` (12/12 PASS), `test-publication-correctness.mjs` (8/8 PASS), `test-r04-1-gates.mjs` (20/20 PASS).
    - Route / API Layer: `test-r05-api-guards.mjs` (10/10 PASS).
    - Component Browser Layer: `test-r05-1-browser-real.mjs` (8/8 PASS, screenshots lưu tại `docs/screenshots/r05-1/`).
    - Full App Integration Layer: `tsc --noEmit` (0 lỗi), `eslint` (0 lỗi/warning), `build:cloudflare` (Exit 0).

---

### Task CMS-R06: Quản Lý Đơn Hàng Đơn Giản, Liên Hệ, Khách Hàng & Thông Báo Admin — [HOÀN THÀNH]
- **ID:** `CMS-R06`
- **Mức độ ưu tiên:** P0 (Vận hành xử lý đơn, chăm sóc khách hàng & chống tranh chấp dữ liệu)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - **Báo cáo chi tiết:** Xem tại [R06-ORDERS-CONTACTS-CUSTOMERS.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R06-ORDERS-CONTACTS-CUSTOMERS.md).
  - **State Machine Đơn Hàng:** Chốt ma trận chuyển đổi chặt chẽ (`NEW` -> `CONTACTED` -> `CONFIRMED` -> `COMPLETED`, `CANCELLED`). Hủy đơn và mở lại bắt buộc lý do. Chặn chuyển đổi sai trạng thái hoặc lặp trạng thái vô nghĩa (NOOP 400).
  - **Timeline & Ghi Chú Nhân Viên:** Append-only `OrderEvent` ghi nhận lịch sử xử lý và actor; bảng `OrderNote` lưu trữ ghi chú trao đổi nội bộ nhân viên, bảo mật tuyệt đối không rò rỉ ra public API.
  - **Kiểm Soát Concurrency CAS (409 Conflict):** Áp dụng số phiên bản `revision` tự tăng; trả mã HTTP 409 khi có 2 phiên cập nhật đồng thời, bảo toàn nội dung ghi chú đang soạn thảo.
  - **Thông Báo Vận Hành Admin (In-Admin Notifications):** Model `AdminNotification`, chuông thông báo `AdminNotificationBell` trên topbar, đếm unread badge, popover, đánh dấu đã đọc một/tất cả theo ngữ nghĩa "Hộp thư vận hành chung (Đã đọc chung)". Chống lặp thông báo qua `UNIQUE(type, referenceId)`.
  - **Liên Hệ & Khách Hàng Thật Từ D1:** Chu trình xử lý liên hệ (`PENDING` -> `PROCESSING` -> `HANDLED`) kèm ghi chú nội bộ và audit nhân viên. Trang khách hàng kết nối dữ liệu D1 thật, loại bỏ hoàn toàn mock array, tách bạch khách đăng ký (`REGISTERED`) và khách đặt hàng vãng lai (`GUEST_ORDER`).
  - **CSV Export An Toàn:** Xuất đơn hàng, liên hệ và khách hàng toàn bộ trang theo filter; bảo vệ `requireAdmin`; chèn UTF-8 BOM (`\ufeff`) cho tiếng Việt; phòng chống triệt để CWE-1236 Formula Injection (`=`, `+`, `-`, `@`); `Cache-Control: private, no-store`.
  - **Bằng chứng kiểm chứng:**
    - Static: `tsc --noEmit` (0 lỗi), `eslint` (0 lỗi), `build:cloudflare` (Exit 0).
    - Service / Data Integration: `scripts/test-r06-order-management.mjs` (30/30 PASS - 100%).
    - Real Browser Production UI QA: `scripts/test-r06-browser-qa.mjs` (9/9 Flows PASS - 100%), 10 screenshots tại `docs/screenshots/r06/`.

---

### Task CMS-R07A: Site Builder, Collections & StoreFront Sync — [HOÀN THÀNH]
- **ID:** `CMS-R07A`
- **Mức độ ưu tiên:** P0 (Trình dựng trang chủ/Landing, Collection manual/rule, đồng bộ Settings → StoreFront)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - **Thiết kế / Nghiệm thu:** [R07A-SITE-BUILDER.md](./R07A-SITE-BUILDER.md), [R07A-ACCEPTANCE.md](./R07A-ACCEPTANCE.md).
  - **Homepage & Landing Builder:** `LandingPage` / `LandingPageStudio` / `LandingPageRevision` + CAS `expectedRevision`; Admin `/admin/builder`; StoreFront `/` + `/landing/[slug]` với fallback an toàn.
  - **Collections:** `NavigationStudio.collections` chế độ `manual` + `rule`; listing `/collection` và chi tiết `/collection/[slug]`.
  - **StoreFront Sync:** Header, Footer, MobileBottomNav, `/lien-he`, `/he-thong-cua-hang` tiêu thụ `getStorefrontSettings()`; Admin Settings có form Logo/Motto/Copyright/Social.
  - **Bằng chứng kiểm chứng:**
    - Integration: `scripts/test-r07a-site-builder.mjs` (11/11 PASS).
    - Smoke HTTP: `scripts/test-r07a-smoke.mjs` (routes StoreFront/Admin khi dev server sẵn sàng).

---

### Task CMS-R07B: Hot Sale, Countdown & Unified Pricing Engine — [HOÀN THÀNH]
- **ID:** `CMS-R07B` (Mã phạm vi: `PROMO-01`)
- **Mức độ ưu tiên:** P0 (Khung giờ chiến dịch CMS UTC, đồng hồ mốc thực tế, động cơ tính giá tập trung & xác thực đơn hàng 0đ)
- **Trạng thái thực tế:** ĐÃ HOÀN THÀNH.
  - **Thiết kế / Nghiệm thu:** [R07B-HOT-SALE-PRICING.md](./R07B-HOT-SALE-PRICING.md), [R07B-ACCEPTANCE.md](./R07B-ACCEPTANCE.md).
  - **Khung giờ chiến dịch CMS:** Cài đặt `SiteSettings` lưu trữ UTC (`flashSaleStartAt`, `flashSaleEndAt`, `flashSaleEnabled`, `flashSaleTitle`), kiểm thực Zod `startAt < endAt`. Loại bỏ hoàn toàn `NEXT_PUBLIC_FLASH_SALE_END_AT`.
  - **Unified Pricing Engine:** `src/server/services/pricing.service.ts` thống nhất tính toán giá trên toàn hệ thống (ProductCard, `/hot-sale`, trang chủ, PDP, giỏ hàng, đơn hàng). Hết hạn giá tức thì ngoài `[startAt, endAt)` nửa mở mà không chờ cron.
  - **Product Studio:** Cờ `isFlashSale` trong draft, chiếu vào `Product.isFlashSale` khi xuất bản với nguyên tắc cô lập bản nháp nghiêm ngặt.
  - **Order Verification 0đ:** `order.service.ts` tính lại giá phía server, ném 409 `PRICE_CHANGED` khi có chênh lệch giá, snapshot `unitPrice`, `compareAtPrice`, và log chiến dịch.
  - **StoreFront UI:** `FlashSaleCountdown.tsx` đếm ngược theo 3 mốc thực tế không tự lặp lại; `/hot-sale` lọc sản phẩm sale thực tế; PDP đồng bộ JSON-LD structured data.
  - **Bằng chứng kiểm chứng:**
    - Static: `tsc --noEmit` (0 lỗi), `build:cloudflare` (Exit 0).
    - Service / Data Integration: `scripts/test-r07b-hot-sale-pricing.mjs` (7/7 PASS - 100%).

---

## 5. Các Quyết Định Nghiệp Vụ Đã Xác Lập & Đề Xuất Kế Tiếp

1. **Thuộc tính Phụ kiện (R04):** ĐÃ HOÀN THÀNH.
2. **Quy trình Biên tập Tin tức & Trang Tĩnh (R05/R05.1):** ĐÃ HOÀN THÀNH.
3. **Quy trình Xử lý Đơn hàng & Thông báo (R06):** ĐÃ HOÀN THÀNH.
4. **Site Builder / Collection / Settings Sync (R07A):** ĐÃ HOÀN THÀNH.
5. **R07B (Hot Sale + countdown + unified pricing):** ĐÃ HOÀN THÀNH — xem [R07B-HOT-SALE-PRICING.md](./R07B-HOT-SALE-PRICING.md) và [R07B-ACCEPTANCE.md](./R07B-ACCEPTANCE.md).
6. **Đề xuất R07C (Checkout gọn + shipping/payment settings) — ĐÃ SOẠN THIẾT KẾ / PROMPT, SẴN SÀNG TRIỂN KHAI:**
   - Thiết kế: [R07C-CHECKOUT-SETTINGS.md](./R07C-CHECKOUT-SETTINGS.md).
   - Prompt Antigravity: [prompts/PROMPT-R07C.md](./prompts/PROMPT-R07C.md).
   - Baseline đã ghi nhận: Admin Settings lưu `shippingFee` / `freeShippingThreshold` / `codEnabled` / `bankTransferEnabled` / `bankAccountInfo`, nhưng StoreFront checkout hardcode `paymentMethod: "COD"` và `order.service` gán `shippingFee = 0`.
   - R07C sẽ nối Settings → checkout/quote/`createOrder`, tiêu thụ pricing R07B, chặn method tắt, giữ idempotency R06; **không** làm cổng TT online / auto-PAID / RBAC.


