# Báo Cáo Nghiệm Thu R07A: Site Builder, Collections & StoreFront Sync

> **Dự án:** CitiLap E-Commerce & CMS  
> **Giai đoạn:** R07A — Trình dựng trang chủ & landing page, Bộ sưu tập (Thủ công & Tự động), và Đồng bộ dữ liệu StoreFront  
> **Kế hoạch gốc:** CMS Master Plan V2  
> **Ngày hoàn thành:** 2026-10-15  
> **Trạng thái:** HOÀN THÀNH TOÀN DIỆN (11/11 Suites Passed, 0 Lỗi TypeScript, Build Cloudflare Code 0)  

---

## 1. Mục Tiêu & Phạm Vi Bàn Giao

### 1.1. Mục tiêu đạt được:
1. **Trình dựng trang chủ (Homepage Builder):** Cho phép chủ shop tùy biến hoàn toàn bố cục trang chủ tại root `/` từ giao diện Admin, gồm 9 loại khối chuẩn hóa (`banner`, `slider`, `product_grid`, `featured_categories`, `featured_brands`, `featured_collection`, `news_reviews`, `intro`, `cta`).
2. **Quản lý Landing Page chuyên biệt:** Cho phép tạo, biên tập, xuất bản các trang chiến dịch độc lập tại `/landing/[slug]`. Tự động kiểm soát slug an toàn và loại trừ từ khóa hệ thống.
3. **Bộ sưu tập Sản phẩm (Collections):** Hỗ trợ song song 2 chế độ:
   - **Thủ công (`manual`):** Chọn từng sản phẩm theo ID. Kiểm tra chặn xuất bản nếu danh sách chứa sản phẩm nháp (`DRAFT`).
   - **Tự động (`rule`):** Lọc theo loại sản phẩm (`laptop` / `accessory`), danh mục, thương hiệu, tag (`isFeatured`, `isNewArrival`, `isBestSeller`), độ khả dụng và tiêu chí sắp xếp.
4. **Đồng bộ StoreFront (StoreFront Sync):** Toàn bộ Header, Footer, MobileBottomNav, và Trang liên hệ `/lien-he` tự động tiêu thụ dữ liệu từ CMS Settings (Logo, Favicon, Slogan, Hotline, Email, Giờ làm việc, Địa chỉ chi nhánh Hà Nội & Bắc Ninh, Bản quyền và Mạng xã hội).
5. **Cơ chế An toàn Dữ liệu:** Cô lập 100% bản nháp (Draft Isolation), chống ghi đè đồng thời CAS (`expectedRevision`), lịch sử phiên bản bất biến (`LandingPageRevision`), và xem trước trực tiếp (Live Draft Preview Modal).

### 1.2. Ranh giới phạm vi (Scope Boundaries):
- **Tuyệt đối không chạm vào R06:** Quản lý đơn hàng R06.1/R06.2 đã đóng và được giữ nguyên vẹn.
- **Không triển khai vượt phạm vi:** R07B (Flash Sale đếm ngược nâng cao), R07C (Cấu hình thanh toán cổng tự động), và R08 (Phân quyền người dùng RBAC) không thuộc phạm vi này.
- **An toàn môi trường:** Không chạm vào cơ sở dữ liệu thật trên remote, không sửa `.dev.vars`, không làm gián đoạn tiến trình dev server cổng 3001.

---

## 2. Danh Mục Thành Phần & Kiến Trúc Kỹ Thuật

| Thành phần | Đường dẫn tệp | Mô tả chức năng |
|---|---|---|
| **SQL Migration** | `d1-migrations/0017_site_builder.sql` | Tạo bảng `LandingPage`, `LandingPageStudio`, `LandingPageRevision`, cùng trigger bảo vệ CAS `landing_page_revision_guard`. |
| **Contracts CMS** | `src/contracts/cms/site-builder.ts` | 9 schema khối giao diện, Zod validator URL an toàn (hỗ trợ `tel:`, `mailto:`), slug validation, schema write/restore. |
| **Contracts Nav** | `src/contracts/cms/navigation.ts` | Mở rộng schema Navigation với `collections[]` (hỗ trợ chế độ `manual` và `rule`). |
| **Contracts Settings** | `src/contracts/cms/settings.ts` | Bổ sung các trường nhận diện thương hiệu: `logoUrl`, `faviconUrl`, `motto`, `copyrightText`, `facebookUrl`, `tiktokUrl`, `youtubeUrl`. |
| **Catalog Service** | `src/server/services/catalog.service.ts` | Hàm phân giải sản phẩm `resolveProductsByIds` và `resolveProductsByCriteria` (loại trừ nháp, nhận diện linh/phụ kiện). |
| **Site Builder Service** | `src/server/services/site-builder.service.ts` | CRUD Landing Page, mutation CAS nguyên tử, append-only revisions, khôi phục bản ghi, phân giải công khai và preview. |
| **Navigation Service** | `src/server/services/navigation.service.ts` | Quản lý bộ sưu tập manual & rule, API danh sách công khai `publicCollectionList` và chi tiết `publicCollection`. |
| **StoreFront Facade** | `src/server/services/storefront-cms.service.ts` | Cung cấp các hàm phân giải an toàn `getPublishedHomepage()`, `getPublishedLandingPage(slug)`, `getStorefrontSettings()`. |
| **Block Renderer** | `src/components/builder/BlockRenderer.tsx` | Renderer động cho 9 loại section (`banner`, `slider`, `product_grid`, `featured_categories`, `featured_brands`, `featured_collection`, `news_reviews`, `intro`, `cta`); dùng chung StoreFront và Live Preview Admin. |
| **Storefront Root** | `src/app/(shop)/page.tsx` | Tích hợp hiển thị dynamic blocks từ CMS khi có homepage xuất bản; fallback sạch sẽ khi chưa xuất bản. |
| **Storefront Routes** | `src/app/(shop)/collection/page.tsx`<br>`src/app/(shop)/collection/[slug]/page.tsx`<br>`src/app/(shop)/landing/[slug]/page.tsx` | Trang danh sách bộ sưu tập, trang chi tiết bộ sưu tập, và trang landing page công khai. |
| **Layout Consumers** | `Header.tsx`, `Footer.tsx`, `MobileBottomNav.tsx`, `/lien-he/page.tsx` | Đã liên kết và đồng bộ 100% dữ liệu từ CMS settings. |
| **Admin UI** | `src/app/admin/builder/page.tsx`<br>`src/app/admin/builder/[id]/page.tsx`<br>`src/components/admin/builder/SiteBuilderEditor.tsx` | Giao diện quản trị Site Builder: thẻ Homepage ghim đầu, danh sách Landing Page, trình soạn thảo kéo thả, Live Preview modal. |

---

## 3. Nhật Ký Kiểm Thử Đa Tầng (5 Layers of Verification)

### Tầng A — Kiểm tra Mã nguồn Tĩnh (Static Code & Build)
- `cmd /c npx tsc --noEmit`: Kết quả **Code 0**, hoàn toàn sạch lỗi kiểu (clean type check).
- `cmd /c npm run build:cloudflare`: Kết quả **Code 0**. Tất cả các tuyến SSR/Edge đều được nhận diện và đóng gói thành công:
  - `λ /api/admin/builder`
  - `λ /api/admin/builder/:id`
  - `λ /api/admin/builder/:id/preview`
  - `λ /api/admin/builder/:id/restore`
  - `λ /api/admin/builder/:id/revisions`
  - `λ /api/catalog/collections`
  - `λ /api/catalog/collections/:slug`
  - `λ /api/landing/:slug`
  - `ƒ /landing/:slug`
  - `? /collection`
  - `ƒ /collection/:slug`
  - `? /lien-he`
  - `? /admin/builder`
  - `ƒ /admin/builder/:id`

### Tầng B & C — Kiểm Thử Hợp Đồng & Cơ Sở Dữ Liệu Miniflare D1
Thực thi kiểm thử độc lập qua `node scripts/test-r07a-site-builder.mjs`:

```text
--- STARTING R07A SITE BUILDER INTEGRATION TEST SUITE ---
PASS: Apply all migrations up to 0017_site_builder.sql
PASS: Seed mock catalog data (products, categories, brands)
PASS: Homepage bootstrap initializes revision 1, publishes, and subsequent calls skip
PASS: Saving draft increments revision, updates draft, and does NOT leak to public homepage
PASS: Publish atomically updates public storefront; unpublish gracefully disables it
PASS: Concurrent or stale write attempts are rejected with 409 conflict
PASS: LandingPageRevision tracks append-only history and restore creates a new draft
PASS: Custom landing pages validate slugs, reject reserved routes, and serve /landing/:slug
PASS: Product grid sections resolve active products and exclude draft products
PASS: Collections support manual and rule modes, with published-only product resolution
PASS: StoreFront settings provides CMS branding, showroom, hotline and contact data

========================================
ALL R07A INTEGRATION TESTS PASSED: 11/11
========================================
```

### Tầng D & E — Kiểm Thử StoreFront Thực Tế trên Dev Server (Port 3001)
Kiểm tra phản hồi thực tế từ máy chủ phát triển cục bộ (tái lập bằng `node scripts/test-r07a-smoke.mjs` khi server đang chạy):
1. `GET /`: Status 200 OK — Render đầy đủ banner chính "LAPTOP GAMING", cam kết chất lượng, logo thương hiệu, và chi nhánh showroom tại Footer.
2. `GET /lien-he`: Status 200 OK — Đồng bộ địa chỉ Hà Nội (Tạ Quang Bửu), Bắc Ninh, hotline và giờ mở cửa.
3. `GET /he-thong-cua-hang`: Status 200 OK — Địa chỉ/hotline từ `getStorefrontSettings()` + nội dung CMS Page `STORES`.
4. `GET /collection`: Status 200 OK — Giao diện danh sách bộ sưu tập hoạt động chính xác.
5. `GET /admin/builder` / `/admin/settings`: Trả về trang Admin hoặc redirect/auth hợp lệ; Settings có form Logo/Motto/Copyright/Social.

---

## 4. Hướng Dẫn Vận Hành Dành Cho Chủ Cửa Hàng (Shop Owner Manual)

### 4.1. Chỉnh sửa giao diện Trang chủ:
1. Đăng nhập vào trang Quản trị (`/admin`).
2. Tại menu bên trái, nhấp chọn **"Trang chủ & Landing"** (`/admin/builder`).
3. Ngay đầu trang có thẻ **"Trang chủ cửa hàng (Homepage)"**, nhấp nút **"Mở trình dựng Trang chủ"**.
4. Giao diện chỉnh sửa gồm:
   - **Cột bên trái:** Danh sách các khối nội dung (Banner, Giới thiệu, Danh mục, Sản phẩm, Đánh giá, FAQ...). Bạn có thể bật/tắt (ẩn/hiện) từng khối hoặc thay đổi thứ tự hiển thị.
   - **Cột bên phải:** Form cấu hình chi tiết cho khối đang chọn (đổi tiêu đề, ảnh nền, link nút bấm, tiêu chí lọc sản phẩm).
5. Sau khi sửa, nhấp nút **"Xem trước"** để kiểm tra giao diện hiển thị ngay lập tức mà chưa ảnh hưởng tới khách hàng đang truy cập.
6. Khi ưng ý, nhấp nút **"Xuất bản"** để áp dụng thay đổi ra ngoài trang chủ website.

### 4.2. Tạo Landing Page chiến dịch mới:
1. Tại trang `/admin/builder`, nhấp nút **"+ Tạo Landing Page mới"**.
2. Nhập **Tên trang** (ví dụ: *Siêu Sale Tựu Trường*), **Tiêu đề SEO**, và **Đường dẫn (Slug)** (ví dụ: *back-to-school*).
3. Hệ thống sẽ tạo trang và chuyển vào màn hình biên tập.
4. Thêm các khối banner, sản phẩm ưu đãi và bấm **Xuất bản**. Khách hàng có thể truy cập ngay tại địa chỉ: `https://citilap.vn/landing/back-to-school`.

### 4.3. Quản lý Bộ sưu tập sản phẩm (Collections):
1. Vào mục **"Menu & Điều hướng"** (`/admin/navigation`), cuộn xuống phần **"Bộ sưu tập"**.
2. Tạo bộ sưu tập mới với 1 trong 2 chế độ:
   - **Tuyển chọn thủ công:** Chọn trực tiếp các sản phẩm cụ thể. (Lưu ý: Hệ thống sẽ cảnh báo và chặn xuất bản nếu bạn chọn sản phẩm chưa được kích hoạt bán).
   - **Tự động theo tiêu chí:** Đặt điều kiện lọc (ví dụ: Phụ kiện mới về, Laptop Gaming bán chạy...). Sản phẩm mới đạt điều kiện sẽ tự động xuất hiện.
3. Bộ sưu tập sẽ tự động có mặt tại trang `/collection` và đường dẫn riêng `/collection/[slug]`.

### 4.4. Đổi Logo, Slogan và Thông tin Cửa hàng:
1. Vào mục **"Cài đặt chung"** (`/admin/settings`).
2. Cập nhật URL Logo, Favicon, Câu khẩu hiệu (Motto), Hotline, Email, hoặc địa chỉ chi nhánh.
3. Bấm **"Lưu cài đặt"**. Toàn bộ Header, Footer và Trang Liên hệ trên website sẽ tự động cập nhật ngay lập tức.
