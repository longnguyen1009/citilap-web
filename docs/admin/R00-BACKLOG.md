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

## 5. Các Quyết Định Nghiệp Vụ Còn Mở (Cần Xác Nhận Trước R04–R06)

1. **Thuộc tính Phụ kiện (R04):**
   - Cần xác nhận danh mục các mẫu thông số phụ kiện ưu tiên (Chuột, Bàn phím, Tai nghe, Sạc, Cáp/Hub, Balo).
   - Biến thể phụ kiện chủ yếu dựa trên: Màu sắc, Loại switch, hay Độ dài dây/Công suất sạc?
2. **Quy trình Biên tập Tin tức (R05):**
   - Xác nhận có cần phân quyền Tác giả / Người duyệt bài ngay từ đầu hay giai đoạn đầu toàn bộ biên tập viên đều có quyền xuất bản bài viết?
   - Cần xác nhận bộ block soạn thảo bài viết tối thiểu: Heading, Đoạn văn, Ảnh có chú thích, Bảng so sánh, Khối sản phẩm liên quan.
3. **Quy trình Xử lý Đơn hàng (R06):**
   - Xác nhận các bước trạng thái chính thức: Mới -> Đang xử lý -> Đã xác nhận -> Đã xử lý (hoặc Hủy kèm lý do).
   - Có cần tích hợp thông báo âm thanh hoặc email/Zalo webhook khi có đơn mới hay không?
