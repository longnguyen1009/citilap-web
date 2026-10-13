# R00 — Báo Cáo Kiểm Chứng & Xác Lập Baseline (Verification Report)

**Ngày thực hiện:** 2026-10-12  
**Môi trường thử nghiệm:**
- Hệ điều hành: Windows 11 (PowerShell & CMD).
- Node.js: v22+ / v26.
- Workspace: `C:\Users\Admin\Desktop\citilap-web2` (Branch `master`, HEAD `3694c01`).
- Môi trường dữ liệu test: **Miniflare D1 & R2 cô lập trong bộ nhớ** (không ghi đè DB dev local, không chạm DB remote).
- Cam kết bảo mật: Báo cáo không chứa token, session cookie, secret key hoặc dữ liệu cá nhân (PII).

---

## 1. Tổng Hợp Kết Quả Baseline Kiểm Thử

| Phân loại kiểm tra | Lệnh thực thi | Mục tiêu kiểm chứng | Trạng thái | Chi tiết kết quả | Bằng chứng thực thi |
|---|---|---|---|---|---|
| **Tĩnh (Static): TypeScript** | `cmd /c npx tsc --noEmit` | Kiểm tra toàn bộ type TypeScript toàn dự án | **PASS** | 0 lỗi kiểu dữ liệu (0 errors) | `task-188`: Exited with code 0 |
| **Tĩnh (Static): ESLint** | `cmd /c npx eslint src/app/admin src/components/admin src/server/services src/contracts/cms` | Kiểm tra cú pháp, convention, hook rules phạm vi Admin & CMS | **PASS** | 0 errors, 0 warnings | `task-205`: Exited with code 0 |
| **Tĩnh (Static): Production Build** | `cmd /c npm run build:cloudflare` | Build thử nghiệm với Vite & Vinext trên Cloudflare Worker target | **PASS** | Hoàn thành 5 giai đoạn build: Client, RSC, SSR, Server Functions, Route classification | `task-236`: Exited with code 0; `Build complete.` |
| **Service / Data: CMS Contracts** | `node --test scripts/test-cms-contracts.mjs` | Kiểm tra Zod schema, block types, concurrency metadata, bound payload | **PASS (9/9)** | 9 test suites đạt 100% | Thời gian chạy: 3672ms; stdout chi tiết |
| **Service / Data: Media Library** | `node scripts/test-media-library.mjs` | Upload R2, D1 metadata, media detail, pagination, invariant MediaUsage, YouTube | **PASS (16/16)** | 16/16 assertions đạt trên Miniflare độc lập | `task-175`: Exited with code 0; 16 PASS |
| **Service / Data: Product Studio** | `node scripts/test-product-studio.mjs` | Lưu nháp, xuất bản, ẩn khỏi web, cách ly draft, xung đột 409, mẫu chuột, R2 head | **PASS (12/12)** | 12/12 assertions đạt trên Miniflare độc lập | Exited with code 0; 12 PASS |
| **Service / Data: Điều hướng** | `node scripts/test-navigation.mjs` | Atomic publication cho Menu/Category/Collection, ngăn vòng lặp, phân trang selector SP | **PASS (16/16)** | 16/16 assertions đạt trên Miniflare độc lập | Exited with code 0; 16 PASS |
| **Service / Data: Order Guard** | `node --test scripts/test-storefront-cms-order-guard.mjs` | Bảo vệ giỏ hàng/thanh toán: chặn SP nháp/ẩn/hết hàng từ Studio publication | **PASS (5/5)** | 5/5 assertions đạt | Exited with code 0; duration: 159ms |
| **API Endpoints Live** | Gọi API test trực tiếp trên runtime live | Xác minh response HTTP thực tế qua mạng | **SKIP** | Đã được bao phủ trong isolated Miniflare service suites; dev server đang phục vụ dev session | Không chạy call độc lập để tránh làm phiền tiến trình dev đang chạy |
| **Browser Admin (Playwright)** | `scripts/test-product-browser.mjs`, `scripts/test-navigation-browser.mjs` | Chạy trình duyệt tự động Edge tương tác giao diện Admin | **SKIP / BLOCKED** | **Lý do an toàn:** Script browser cố gắng spawn Vite trên cổng 3013/3014, yêu cầu ghi đè file `.dev.vars` tạm thời và chèn dữ liệu test trực tiếp vào database local `citilap-db-dev`. Quy tắc an toàn R00 cấm ghi đè DB local đang dùng. | Đã ghi nhận trong tài liệu ADMIN-03/04 là từng pass trước merge; hoãn chạy lại đến phase staging/isolated fixture. |
| **Browser StoreFront E2E** | Test giỏ hàng & PDP trên Storefront thật | Kiểm thử tương tác mua hàng từ Storefront | **SKIP / BLOCKED** | Chưa có bộ script Playwright chuyên biệt cho Storefront PDP end-to-end trên bản merge này. | Chuyển vào gate nghiệm thu G5 tại R03/R04. |

---

## 2. Chi Tiết Các Bộ Test Dịch Vụ & Cơ Sở Dữ Liệu (Isolated Suites)

### 2.1. CMS Contract Validation (`test-cms-contracts.mjs`)
- Lệnh: `node --test scripts/test-cms-contracts.mjs`
- Kết quả: `9/9 PASS`
  1. `round-trip editor payload preserves the three supported block types` (PASS)
  2. `reject unsupported versions and blocks instead of silently discarding content` (PASS)
  3. `reject duplicate block identities that would break reorder and edit` (PASS)
  4. `reject arbitrary CSS, HTML and fields outside the renderer contract` (PASS)
  5. `require alt text except explicitly decorative images` (PASS)
  6. `block executable, protocol-relative and encoded navigation targets` (PASS)
  7. `write requests require concurrency metadata` (PASS)
  8. `menu has bounded depth and unique item identities` (PASS)
  9. `bound payload growth and reject duplicate product/category references` (PASS)

### 2.2. Media Library Service (`test-media-library.mjs`)
- Lệnh: `node scripts/test-media-library.mjs`
- Kết quả: `16/16 PASS`
  1. `all nine migrations and legacy image backfill` (PASS)
  2. `image upload writes real R2 bytes and D1 metadata` (PASS)
  3. `independent read retains uploaded metadata` (PASS)
  4. `search/type pagination and out-of-range clamping` (PASS)
  5. `metadata persists and stale edits are rejected` (PASS)
  6. `archive and restore are reversible, retain R2` (PASS)
  7. `attachment is idempotent and records product usage` (PASS)
  8. `in-use archive rejected by database invariant` (PASS)
  9. `new product legacy gallery usage tracks update/removal` (PASS)
  10. `legacy image detach keeps asset and removes usage` (PASS)
  11. `empty/oversize/mime-spoofed/HTML upload rejected` (PASS)
  12. `D1 failure compensates only the newly uploaded R2 object` (PASS)
  13. `YouTube validation normalizes allowed hosts and deduplicates` (PASS)
  14. `missing asset and R2 objects yield 404` (PASS)
  15. `admin list/mutation deny unauthenticated access` (PASS)
  16. `CSRF denied before storage access, authorized read no-store` (PASS)

### 2.3. Product Studio Service (`test-product-studio.mjs`)
- Lệnh: `node scripts/test-product-studio.mjs`
- Kết quả: `12/12 PASS`
  1. `all migrations; laptop draft creates existing Product identity` (PASS)
  2. `draft never visible to public resolver` (PASS)
  3. `publish resolves media, variants, warranty and web status` (PASS)
  4. `editing published price does not change public price` (PASS)
  5. `stale revision rejected without audit or data changes` (PASS)
  6. `concurrent editors have exactly one winner` (PASS)
  7. `media archive blocked by retained draft and published revisions` (PASS)
  8. `publish updated price and unavailable independent of stock` (PASS)
  9. `unpublish excludes public; draft stays editable` (PASS)
  10. `mouse template, video and reload persistence` (PASS)
  11. `missing R2 prevents publish and preserves revision` (PASS)
  12. `invalid slug, duplicate variants, negative warranty and missing category rejected` (PASS)

### 2.4. Navigation Studio Service (`test-navigation.mjs`)
- Lệnh: `node scripts/test-navigation.mjs`
- Kết quả: `16/16 PASS`
  1. `legacy category R2 keys normalize to editable public URLs` (PASS)
  2. `legacy categories imported with stable IDs; draft invisible to public and Category projection` (PASS)
  3. `publish category order, main menu and collection atomically with resolved media` (PASS)
  4. `draft edits leave public labels and collection order unchanged` (PASS)
  5. `stale writes rejected without revision or history changes` (PASS)
  6. `two concurrent edits have exactly one winner` (PASS)
  7. `cycles, missing parents, duplicate slugs and unsafe links rejected` (PASS)
  8. `category identity deletion blocked; no orphan product references` (PASS)
  9. `missing product or draft product blocks publication` (PASS)
  10. `retained draft and published category images block archive` (PASS)
  11. `hidden category and collection remove menu targets; collection returns 404` (PASS)
  12. `product unpublished after collection publish is excluded dynamically` (PASS)
  13. `missing R2 fails publication without partial category changes` (PASS)
  14. `SQL projection failure rolls back snapshot, revision history and categories` (PASS)
  15. `product selector is paginated and searchable beyond first 25` (PASS)
  16. `foreign keys remain valid after all writes` (PASS)

### 2.5. Storefront CMS Order Guard (`test-storefront-cms-order-guard.mjs`)
- Lệnh: `node --test scripts/test-storefront-cms-order-guard.mjs`
- Kết quả: `5/5 PASS`
  1. `legacy product without a published Studio remains orderable` (PASS)
  2. `published AVAILABLE and PREORDER remain orderable` (PASS)
  3. `CONTACT and UNAVAILABLE reject stale cart items` (PASS)
  4. `removed or unselected published variant is rejected` (PASS)
  5. `corrupted published payload rejects purchase rather than throwing an unrelated 500` (PASS)

---

## 3. Thiết Kế Fixtures Chuẩn Hóa Phục Vụ R01–R03

Nhằm phục vụ kiểm thử dữ liệu biệt lập trong các gói tiếp theo mà không chạm vào dữ liệu thực, các fixture sau đây được thiết kế sẵn:

1. **Fixture Laptop 2 Cấu hình (`fixture-laptop-dual-config`):**
   - Tên: *"Lenovo Legion 5 Pro QA"* (Slug: `lenovo-legion-5-pro-qa`).
   - Cấu hình 1: 16GB RAM / 512GB SSD / RTX 4060 — Giá: 32.990.000đ.
   - Cấu hình 2: 32GB RAM / 1TB SSD / RTX 4070 — Giá: 38.990.000đ.
   - Gói bảo hành: Mặc định 12 tháng (0đ); Nâng cấp 24 tháng (+1.500.000đ).
   - Mong đợi: Khách chọn cấu hình nào, PDP render đúng ảnh, giá và khi gửi đơn thì snapshot lưu đúng cấu hình đó.
2. **Fixture Phụ kiện 2 Biến thể (`fixture-mouse-dual-variant`):**
   - Tên: *"Chuột Gaming CitiLap G304 QA"* (Slug: `chuot-citilap-g304-qa`).
   - Loại: `MOUSE` (Thông số: Kết nối 2.4GHz, DPI 12.000, Trọng lượng 99g).
   - Biến thể 1: Màu Đen — Giá: 790.000đ.
   - Biến thể 2: Màu Trắng — Giá: 850.000đ.
   - Mong đợi: Không chứa các trường RAM/SSD của Laptop; hiển thị đúng lựa chọn biến thể màu sắc.
3. **Fixture Sản phẩm Legacy Chưa Có Studio (`fixture-legacy-product-no-studio`):**
   - Chỉ có bản ghi trong bảng `Product` (`id='p-legacy-test'`), hoàn toàn không có dòng trong `ProductStudio`.
   - Mong đợi: Mở trong Studio detail thì tổng hợp dữ liệu thành công; mở API legacy thì bị 409 sau khi khóa.
4. **Fixture Sản phẩm Nháp (`fixture-product-draft`):**
   - Có bản ghi `ProductStudio` với `revision=1`, nhưng `published=NULL`.
   - Bảng `Product` có `status='DRAFT'`.
   - Mong đợi: `GET /api/catalog/studio/:slug` trả HTTP 404; tìm kiếm StoreFront không ra; không đặt mua được.
5. **Fixture Sản phẩm Đã Ẩn (`fixture-product-hidden`):**
   - Sản phẩm từng xuất bản, sau đó được Unpublish (`published=NULL`, `Product.status='DRAFT'`).
   - Mong đợi: Fail-closed 100%, StoreFront trả trang 404 Not Found, không fallback lộ lại thông tin cũ.
6. **Fixture Collection & Menu Có Tham Chiếu Sản Phẩm (`fixture-navigation-refs`):**
   - Menu chính: *Laptop Gaming* -> Trỏ tới Danh mục `cat-laptop-gaming`.
   - Collection: *Top Laptop Bán Chạy* -> Chứa 2 sản phẩm public.
   - Mong đợi: Khi 1 trong 2 sản phẩm bị ẩn, collection public tự động loại trừ sản phẩm đó khỏi danh sách.
7. **Fixture Đơn Hàng Có Snapshot Giá (`fixture-order-snapshot`):**
   - 1 đơn hàng chứa 1 Laptop giá 30.000.000đ lúc đặt.
   - Sau đó sản phẩm tăng giá lên 35.000.000đ trên Studio.
   - Mong đợi: Mở chi tiết đơn hàng trong Admin vẫn giữ nguyên giá snapshot 30.000.000đ, không bị đổi theo giá mới.
