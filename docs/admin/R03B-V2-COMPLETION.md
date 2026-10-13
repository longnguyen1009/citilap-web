# Báo Cáo Hoàn Tất R03B — Hoàn Thiện Catalog Theo Yêu Cầu V2

> **Giai đoạn:** R03B — Hoàn thiện Catalog theo yêu cầu V2  
> **Trạng thái:** HOÀN THÀNH TOÀN DIỆN (100% Gates Passed, Browser Verified, Cloudflare Production Build Verified)  
> **Thời gian:** 2026-10-13  
> **Workspace:** `c:\Users\Admin\Desktop\citilap-web2`  
> **Branch / HEAD:** `master` / `3694c0156c030307fcbf50e90a2668fe3383787d`  

---

## 1. Đọc và Xác Định Phạm Vi — Bảng Đối Chiếu Yêu Cầu V2

Dưới đây là bảng đối chiếu chi tiết giữa tài liệu V2 (`docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`, `docs/admin/prompts/PROMPT-R03-V2.md`), implementation R03 ban đầu, bằng chứng kiểm chứng và các hạng mục đã hoàn thiện trong R03B:

| Yêu cầu V2 | Implementation ban đầu (R03) | Bằng chứng thực tế | Phần thiếu đã bổ sung trong R03B |
|---|---|---|---|
| **Lịch sử & Khôi phục (History & Restore)** | Chỉ có bảng `ProductRevision` tự động ghi lịch sử trong DB; Editor chưa có giao diện xem snapshot và khôi phục. | `scripts/test-product-studio.mjs` kiểm tra revision D1 trigger; UI chưa có Tab/Modal Restore. | **Đã hoàn thiện:** Bổ sung Tab 7 "Lịch sử & Khôi phục" trong `ProductEditor.tsx`, Modal xem trước snapshot JSON/thuộc tính, API `/api/admin/products/[id]/revisions/[revisionId]/restore`, cơ chế khôi phục thành bản nháp (`expectedRevision + 1`), bảo toàn nguyên vẹn Storefront công cộng cho đến khi xuất bản, chống xung đột HTTP 409. |
| **Thương hiệu (Brand Subsystem)** | `Product.brand` chỉ là chuỗi text tự do, chưa chuẩn hóa bảng `Brand`; chưa có trang quản lý Brand riêng và trang Storefront. | `Brand` model có trong Prisma nhưng chưa có CRUD API, chưa có trang `/admin/brands`, Storefront chưa có `/brand/[slug]`. | **Đã hoàn thiện:** Migration `0013_brand_seo.sql`, service `src/server/services/brand.service.ts`, Admin CRUD `/admin/brands` với Media Library logo picker, Storefront route `/brand/[slug]`, Editor sản phẩm chọn Brand từ D1 database, khóa an toàn bảo vệ không cho xóa Brand đang có sản phẩm (HTTP 400). |
| **Phân định 3 trục trạng thái & Nhãn** | Chỉ có `ProductStudio.status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`); thiếu trường `condition` và các nhãn marketing độc lập. | `productDocumentSchema` thiếu `condition`, `isNewArrival`, `isBestSeller`, `isFeatured`. | **Đã hoàn thiện:** Bổ sung 3 trục độc lập: (1) Publication (`DRAFT` / `PUBLISHED` / `ARCHIVED`), (2) Condition (`NEW`, `LIKE_NEW`, `USED`, `REFURBISHED`, `LIQUIDATION`), (3) Availability (`AVAILABLE`, `PREORDER`, `CONTACT`, `UNAVAILABLE`) bảo toàn giá trị `PREORDER` không bị chuyển lén sang `AVAILABLE`, (4) Nhãn marketing (`isNewArrival`, `isBestSeller`, `isFeatured`). |
| **Trình soạn thảo nội dung (Rich-Text WYSIWYG)** | Tab 5 bài viết chỉ dùng `<textarea>` HTML thô; người vận hành phải tự gõ thẻ HTML. | `ProductEditor.tsx` Tab 5 chỉ có textarea `contentHtml`. | **Đã hoàn thiện:** Component `RichContentEditor.tsx` trực quan đầy đủ: Đoạn văn, Heading (H2, H3), In đậm, Nghiêng, Gạch chân, Gạch ngang, Danh sách có thứ tự / không thứ tự, Trích dẫn, Chèn bảng (Table), Chèn link an toàn, Chèn ảnh từ Media Library Cloudflare R2, nút chuyển đổi mã nguồn HTML nâng cao, và bộ lọc làm sạch HTML máy chủ `sanitizeHtml`. |
| **Khóa Writer & Bảo toàn chức năng** | Đã khóa 5 legacy writers (HTTP 409) nhưng chức năng restore legacy bị khóa mà chưa có restore chuẩn thay thế. | `scripts/test-legacy-writer-locks.mjs` trả về 409 trên các route cũ. | **Đã hoàn thiện:** Xây dựng luồng restore chuẩn qua `/api/admin/products/[id]/revisions/[revisionId]/restore` gọi `restoreProductRevision` service. Giữ nguyên 100% các endpoint đọc public (`GET /api/products`, `GET /api/products/[id]`, export `GET /api/products/metadata`). |
| **Bảo toàn sản phẩm Lưu trữ (Archive)** | `archiveProduct` gán `deletedAt = CURRENT_TIMESTAMP`, làm sản phẩm biến mất khỏi danh sách Admin vì `catalogList` lọc `p.deletedAt IS NULL`. | Không thể tìm lại sản phẩm lưu trữ trong Admin Catalog. | **Đã sửa đổi:** Cập nhật `archiveProduct` gán `status = 'ARCHIVED'`, `published = NULL`, và giữ `deletedAt = NULL`. Nhờ đó sản phẩm lưu trữ vẫn được tìm kiếm và quản lý bình thường qua bộ lọc `publicationStatus = 'ARCHIVED'` trong Admin Catalog. |
| **Publish Scheduler (Bảo toàn Invariant)** | Cron scheduler chỉ xử lý các sản phẩm legacy không có studio (`studioId IS NULL`), không can thiệp sản phẩm CMS-owned. | Code `publish-scheduler/route.ts` đúng logic nhưng tài liệu báo cáo trước đây mô tả ngược. | **Đã chuẩn hóa:** Ghi nhận chính xác logic: Scheduler chỉ áp dụng cho legacy items mồ côi; toàn bộ sản phẩm CMS-owned được điều khiển độc quyền qua `ProductStudio`. |

---

## 2. Ưu Tiên A — Lịch Sử Phiên Bản và Khôi Phục (History & Restore)

### 2.1. Kiến trúc & Dòng Dữ Liệu Khôi Phục (Restore Workflow)
1. **Danh sách phiên bản:** Tab 7 trong `ProductEditor.tsx` tải danh sách toàn bộ các phiên bản từ `/api/admin/products/[id]/revisions`:
   - Hiển thị số hiệu Revision (`#1`, `#2`...).
   - Hành động sinh ra phiên bản: `Tạo mới`, `Lưu nháp`, `Xuất bản`, `Thu hồi xuất bản`, `Khôi phục`.
   - Thời gian thực hiện định dạng ngày giờ Việt Nam.
   - Nhãn nhận diện: `Bản nháp hiện tại` hoặc `Bản đang hiển thị trên web`.
2. **Xem chi tiết phiên bản (Inspect Snapshot):** Bấm nút "Xem nội dung" mở modal chi tiết hiển thị toàn bộ snapshot: Giá, Tên, Biến thể, Thông số kỹ thuật và JSON thô của phiên bản.
3. **Nút "Khôi phục thành bản nháp":**
   - Người vận hành xác nhận trong modal cảnh báo: **"Website công cộng sẽ KHÔNG bị thay đổi cho đến khi bạn xuất bản bản nháp này."**
   - API `POST /api/admin/products/[id]/revisions/[revisionId]/restore`:
     - Kiểm tra quyền quản trị và CSRF token.
     - Xác thực revision thuộc đúng `productId`.
     - Gọi `writeStudio` với action `'save'`, tăng `revision = expectedRevision + 1`.
     - Snapshot của revision cũ được gán vào `ProductStudio.draft`.
     - Cột `ProductStudio.published` và bảng `Product` **hoàn toàn giữ nguyên**.
4. **Chống ghi đè đồng thời (Optimistic Concurrency 409):** Bắt buộc truyền `expectedRevision`. Nếu có người khác thao tác trước, hệ thống trả về mã lỗi HTTP 409 Conflict.

---

## 3. Ưu Tiên B — Quản Trị Thương Hiệu (Brand Subsystem)

### 3.1. Nguồn Chuẩn Duy Nhất (Single Source of Truth)
- Bảng D1 `Brand` là nguồn chuẩn duy nhất, được bổ sung các cột SEO qua migration `0013_brand_seo.sql`:
  ```sql
  ALTER TABLE Brand ADD COLUMN seoTitle TEXT;
  ALTER TABLE Brand ADD COLUMN seoDescription TEXT;
  ```
- **Không có dataset song song:** Loại bỏ việc hard-code mảng thương hiệu.
- **Product Mapping:** Cột `Product.brandId` liên kết khóa ngoại mềm với `Brand.id`, trong khi `Product.brand` lưu tên hiển thị phục vụ tìm kiếm.

### 3.2. Màn hình Quản trị Thương hiệu (`/admin/brands`)
- Danh sách thương hiệu phân trang, tìm kiếm và lọc trạng thái (`ACTIVE` / `INACTIVE`).
- Modal Thêm / Sửa:
  - Tên thương hiệu, slug tự động sinh tiếng Việt không dấu chuẩn SEO.
  - Chọn Logo trực tiếp từ Thư viện Media Cloudflare R2 qua `MediaDialog`.
  - Mô tả thương hiệu, Tiêu đề SEO (`seoTitle`), Mô tả SEO (`seoDescription`).
  - Trạng thái hiển thị (`ACTIVE` / `INACTIVE`).
- **Bảo vệ dữ liệu tham chiếu (Deletion Guard):**
  - Không thể xóa một Brand nếu còn sản phẩm trong Catalog liên kết với nó (`Product.brandId = ? AND deletedAt IS NULL`).
  - Hệ thống hiển thị modal cảnh báo HTTP 400 kèm số lượng sản phẩm liên kết, yêu cầu quản trị viên chuyển sang `INACTIVE` thay vì xóa.

### 3.3. Trang Thương Hiệu Public Storefront (`/brand/[slug]`)
- Route Server Component tại `src/app/(shop)/brand/[slug]/page.tsx`.
- Hiển thị thông tin Brand từ D1 (Logo, Mô tả, Banner).
- Lưới sản phẩm đã xuất bản (`Product.status = 'ACTIVE'`) thuộc thương hiệu.
- Thẻ SEO OpenGraph và metadata tự động sinh từ `seoTitle` và `seoDescription`.

---

## 4. Ưu Tiên C — Chuẩn Hóa 3 Trục Trạng Thái & Nhãn Marketing

Hệ thống phân định độc lập 4 nhóm thuộc tính trong `productDocumentSchema`:

```typescript
// 1. Publication Status (Trục xuất bản)
publicationStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

// 2. Condition (Trục tình trạng máy)
condition: 'NEW' | 'LIKE_NEW' | 'USED' | 'REFURBISHED' | 'LIQUIDATION'

// 3. Availability (Trục tình trạng kho hàng)
availability: 'AVAILABLE' | 'PREORDER' | 'CONTACT' | 'UNAVAILABLE'

// 4. Marketing Labels (Trục nhãn tiếp thị)
isNewArrival: boolean
isBestSeller: boolean
isFeatured: boolean
```

**Các quy tắc đã kiểm chứng thực tế:**
- Lưu nháp không bao giờ thay đổi trạng thái public.
- Giá trị `PREORDER` (Đặt trước) được bảo toàn nguyên vẹn, không bị chuyển đổi ngầm thành `AVAILABLE`.
- Condition và nhãn marketing được lưu trữ bền vững trong snapshot JSON của `ProductStudio` và chiếu sang bảng `Product` khi xuất bản.

---

## 5. Ưu Tiên D — Trình Biên Tập Nội Dung Trực Quan (Rich-Text Editor)

Component `src/components/admin/products/RichContentEditor.tsx`:
- **Thanh công cụ trực quan:**
  - Định dạng văn bản: Đậm (`Bold`), Nghiêng (`Italic`), Gạch chân (`Underline`), Gạch ngang (`Strike`).
  - Tiêu đề: Đoạn văn thường (`<p>`), Tiêu đề 2 (`<h2>`), Tiêu đề 3 (`<h3>`).
  - Danh sách: Danh sách không thứ tự (`<ul>`), Danh sách có thứ tự (`<ol>`).
  - Trích dẫn (`<blockquote>`), Phân cách dòng (`<hr>`).
  - Chèn bảng (`<table>`): Tự động tạo bảng 3x3 với thead và tbody.
  - Chèn liên kết an toàn (`<a>`) với kiểm tra giao thức hợp lệ (`http://`, `https://`).
  - Chèn ảnh minh họa từ Thư viện Media Cloudflare R2 qua `MediaDialog`.
- **Chế độ HTML nâng cao:** Nút chuyển đổi xem và sửa mã nguồn HTML trực tiếp phía dưới editor trực quan, cho phép xử lý các đoạn mã phức tạp nếu cần.
- **Bảo mật & Làm sạch dữ liệu (`sanitizeHtml`):**
  - Loại bỏ hoàn toàn thẻ `<script>`, `<iframe>`, `object`, `embed`, thuộc tính sự kiện inline (`onclick`, `onload`...), và liên kết `javascript:`.
  - Giữ lại 100% các thẻ cấu trúc nội dung hợp lệ: `h1`-`h6`, `p`, `b`, `i`, `u`, `s`, `ul`, `ol`, `li`, `a`, `img`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `blockquote`, `hr`, kèm các thuộc tính bố cục (`colspan`, `rowspan`, `src`, `alt`, `href`, `title`).

---

## 6. Bảng Tổng Hợp Kết Quả Kiểm Chứng & Bằng Chứng Tự Động

| Tầng kiểm thử | Bộ kịch bản | Lệnh thực thi chính xác | Số lượng test | Kết quả | Bằng chứng |
|---|---|---|---|---|---|
| **Static Analysis** | TypeScript Compiler | `npx.cmd tsc --noEmit` | Toàn bộ dự án | **PASS (Code 0)** | 0 type errors |
| **Linter** | ESLint | `npx.cmd eslint ...` trên các file sửa | 4 file sửa đổi | **PASS (Code 0)** | 0 warnings, 0 errors |
| **V2 Completion Suite** | R03B Priority Test | `node scripts/test-r03b-v2.mjs` | 15 tests | **15/15 PASS** | Revisions, restore invariant, 409 conflict, Brand CRUD & protection guard, HTML sanitize |
| **Unified Catalog Service** | R03 Catalog Logic | `node scripts/test-unified-catalog.mjs` | 12 tests | **12/12 PASS** | Pagination > 100, filters, legacy adoption on-read & save draft, spec metrics, archive OrderItem guard |
| **Legacy Writer Locks** | Security & Lock Guard | `node scripts/test-legacy-writer-locks.mjs` | 8 tests | **8/8 PASS** | Khóa 409 các route ghi cũ, bảo toàn route đọc công cộng |
| **Product Studio Core** | Studio Revision Engine | `node scripts/test-product-studio.mjs` | 12 tests | **12/12 PASS** | D1 conflict triggers, stale revision guard, atomic publish, R2 asset guards |
| **Brand Browser QA** | Microsoft Edge Headless | `node scripts/test-brand-browser.mjs` | 9 flows | **9/9 PASS** | Bảng Brand, auto-slugify, modal thêm thương hiệu, logo picker, delete guard modal chặn xóa SP |
| **Catalog Browser QA** | Microsoft Edge Headless | `node scripts/test-unified-catalog-browser.mjs` | 17 flows | **17/17 PASS** | 1440px/768px/390px, 7 editor tabs, Brand dropdown, Rich-text toolbar, History timeline, modal preview, publish |
| **Cloudflare Production Build** | Vite & Vinext Cloudflare | `npm.cmd run build:cloudflare` | Toàn bộ app routes | **PASS (Code 0)** | Đã build thành công toàn bộ bundle SSR và client chunk, bao gồm `/admin/brands`, `/brand/:slug`, `/api/admin/products/:id/revisions` |
| **TỔNG CỘNG** | **8 bộ kiểm chứng** | — | **73 tests/flows** | **100% HOÀN TOÀN ĐẠT** | Không lỗi, không gãy hồi quy |

---

## 7. Danh Sách Ảnh Chụp Màn Hình Browser QA Đã Lưu

Toàn bộ ảnh chụp thực tế từ Microsoft Edge headless được lưu tại `docs/screenshots/admin03/`:
1. `brands-1440.png`: Trang quản trị Thương hiệu (`/admin/brands`) với danh sách thương hiệu, số lượng sản phẩm liên kết, trạng thái và nút tạo mới.
2. `editor-history-1440.png`: Tab 7 "Lịch sử & Khôi phục" trong Laptop Editor, hiển thị bảng danh sách phiên bản, thông tin người thao tác, thời gian, nút xem snapshot và nút khôi phục an toàn.
3. `editor-1440.png`: Laptop Editor hoàn chỉnh với dropdown chọn Thương hiệu từ D1, phân loại Tình trạng máy, nhãn marketing và trình soạn thảo bài viết Rich-text.
4. `catalog-1440.png`: Danh mục sản phẩm thống nhất trên màn hình Desktop 1440px với phân trang máy chủ vượt giới hạn 100 sản phẩm.
5. `catalog-768.png`: Danh mục co giãn trên máy tính bảng Tablet 768px không tràn khung (`scrollWidth <= innerWidth`).
6. `catalog-390.png`: Danh mục hiển thị trên thiết bị di động Mobile 390px.
7. `preview-1440.png`: Modal xem trước giao diện Storefront trực tiếp trong trình biên tập.
8. `verification.json`: File dữ liệu chứng thực tự động từ browser automation.

---

## 8. Kết Luận & Đánh Giá Đóng R03B

- **R03 theo yêu cầu V2 đã đủ điều kiện đóng hoàn toàn:**
  - Toàn bộ 4 ưu tiên cốt lõi (A: Lịch sử & Khôi phục, B: Thương hiệu, C: 3 trục trạng thái & Nhãn, D: Editor nội dung) đã được triển khai đầy đủ cả Frontend, Backend và Database.
  - Toàn bộ bất biến kiến trúc R03 được bảo toàn nghiêm ngặt (Single Source of Truth, Single Writer, Khóa Legacy Writer 409, Khôi phục tạo revision mới thành draft, Bảo vệ OrderItem).
  - Không có mã lỗi TypeScript, không có lỗi ESLint, build Cloudflare production hoàn tất 100%.

---

## 9. Đề Xuất Phạm Vi Cho Giai Đoạn Tiếp Theo (R04 — Phụ Kiện & Linh Kiện)

1. Mở rộng Template thông số kỹ thuật đặc thù cho các nhóm Phụ kiện & Linh kiện (`MOUSE`, `KEYBOARD`, `HEADPHONE`, `MONITOR`, `RAM_SSD`, `ACCESSORY`).
2. Tối ưu hóa giao diện chọn biến thể Màu sắc, Cổng kết nối và Quy cách đóng gói cho phụ kiện.
3. Tích hợp bộ lọc phân loại linh hoạt trên Storefront cho từng nhóm phụ kiện dựa trên các thông số đã chuẩn hóa.
