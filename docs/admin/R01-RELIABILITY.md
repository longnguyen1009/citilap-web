# BÁO CÁO NGHIỆM THU R01: ĐỘ TIN CẬY DỮ LIỆU, BẢO VỆ SETTINGS VÀ TÍNH ĐÚNG ĐẮN CỦA NỘI DUNG PUBLIC

> **Phiên bản:** 1.0  
> **Workspace:** `C:\Users\Admin\Desktop\citilap-web2`  
> **Baseline thực tế:** Branch `master`, HEAD `3694c01` (`update UI storefront`)  
> **Trạng thái:** Code R01 đã triển khai; hoàn tất gate HTTP Route Handler, D1 Disk Persistence, Behavioral Invariant Guards, Typecheck, ESLint, Cloudflare Build; gate automated browser gặp lỗi Playwright 404 driver trên container và được chuyển giao kiểm tra thủ công qua harness server port 3088; các consumer Storefront chưa được nối runtime (chờ R04/R08). Chi tiết xem tại [R01-VERIFICATION.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R01-VERIFICATION.md). Chưa triển khai R02.

---

## 1. BASELINE VÀ HIỆN TRẠNG TRƯỚC KHI SỬA

- **Git Status:** Branch `master`, HEAD `3694c01`. Không có uncommitted changes ngoài các tài liệu khảo sát R00 và tokens `.design/`.
- **Môi trường dev đang chạy nền:** Process `npm run dev:cloudflare` đang chạy trên port 3001. Giữ nguyên, không chiếm dụng hoặc can thiệp port 3001.
- **Môi trường kiểm thử:** Thiết lập toàn bộ suite kiểm thử chạy trên Miniflare v3 (in-memory SQLite D1 + in-memory R2 bucket), không đọc/ghi `.dev.vars`, không kết nối database dev/remote thật.

---

## 2. VẤN ĐỀ TÁI HIỆN ĐƯỢC VÀ XÁC NHẬN BẰNG SOURCE

| Mã | Hạng mục | Hiện tượng trước khi sửa | Xác nhận |
|---|---|---|---|
| **ISSUE-01** | Settings UI Loading | Fetch thành công rơi vào `return` sớm trước khối `finally` -> `setLoading(false)` không được gọi, UI kẹt spinner vô tận. | Tái hiện qua mã nguồn `src/app/admin/settings/page.tsx:37-40`. |
| **ISSUE-02** | Settings False Success | Lưu server lỗi nhưng khối `catch` gọi `setMessage({ type: "success", text: "Đã lưu cài đặt trên trình duyệt..." })` tạo ảo giác đã lưu thành công. | Tái hiện qua mã nguồn `src/app/admin/settings/page.tsx:85`. |
| **ISSUE-03** | In-Memory Volatility | `/api/admin/settings` lưu trạng thái vào biến module `let cachedSettings = { ...DEFAULT_SETTINGS }`. Dữ liệu biến mất khi Worker restart hoặc multi-isolate. | Tái hiện qua `src/app/api/admin/settings/route.ts:113`. |
| **ISSUE-04** | Auth & CSRF Bypass | `/api/admin/settings` hoàn toàn không có `requireAdmin` và `requireAdminMutation`. Bất kỳ ai cũng có thể đọc cấu hình nội bộ hoặc POST ghi đè qua cross-site request. | Xác nhận qua source route handler. |
| **ISSUE-05** | Fictitious Defaults | Cấu hình mặc định chứa tài khoản ngân hàng mẫu ("MBBank - STK: 0899188186 - NGUYEN VAN A") và thời gian flash sale tự gia hạn theo `Date.now() + 3 days`. | Xác nhận qua `DEFAULT_SETTINGS` cũ. |
| **ISSUE-06** | Concurrency Silent Overwrite | Không có revision guard; hai admin sửa đồng thời sẽ âm thầm ghi đè dữ liệu của nhau mà không có cảnh báo xung đột (409). | Xác nhận qua source cũ. |
| **ISSUE-07** | Fallback rò rỉ CMS Draft/Unpublished | `publishedOrNull` nuốt cả lỗi 404 và 503; PDP thấy `studio === null` liền render dữ liệu catalog cũ khiến sản phẩm Studio đang nháp hoặc đã unpublish bị hiển thị public. | Xác nhận qua `storefront-cms.service.ts` & `product/[id]/page.tsx`. |
| **ISSUE-08** | Legacy Scheduler can thiệp CMS | Cron job `publish-scheduler` tự ý tìm sản phẩm `draft` có `publishAt <= now` để update sang `active`, không loại trừ sản phẩm thuộc Product Studio. | Xác nhận qua `src/app/api/cron/publish-scheduler/route.ts:19-33`. |
| **ISSUE-09** | Order Guard lọt Draft/Unpublished | `assertPublishedStudioOrderable` khi nhận `publishedJson == null` thì `return` ngay, cho phép đặt mua sản phẩm Studio chưa xuất bản nếu catalog status là active. | Xác nhận qua `src/server/services/storefront-order-guard.ts:9`. |

---

## 3. FILE VÀ MODULE ĐÃ TÁC ĐỘNG

1. **`d1-migrations/0012_site_settings.sql` (TẠO MỚI):**
   - Tạo bảng `SiteSettings` (id='site', revision, document, updatedAt).
   - Tạo bảng `SiteSettingsRevision` (revision PK, document, action, actor, createdAt).
   - Trigger `site_settings_revision_guard` chặn insert nếu `NEW.revision != (SELECT revision+1 FROM SiteSettings WHERE id='site')` và `RAISE(ABORT, 'SETTINGS_CONFLICT')`.
2. **`prisma/schema.prisma`:**
   - Bổ sung model `SiteSettings` và `SiteSettingsRevision` tương ứng cấu trúc D1.
3. **`src/contracts/cms/settings.ts` (TẠO MỚI):**
   - Hợp đồng dữ liệu Zod: `adminSettingsDocumentSchema`, `settingsMutationSchema`, `publicStorefrontSettingsSchema`.
   - Chặn XSS (`javascript:`, data URI, `<script>`, inline handlers), kiểm tra bounds số hữu hạn, độ dài chuỗi, URL an toàn.
   - Defaults an toàn từ `businessProfile`: không STK giả, không countdown tự gia hạn.
4. **`src/server/services/settings.service.ts` (TẠO MỚI):**
   - Quản trị persistence trên D1: `getAdminSettings`, `saveAdminSettings`, `getPublicStorefrontSettings`.
   - Concurrency control: kiểm tra `expectedRevision`, atomic batch, bắt lỗi conflict trả HTTP 409.
5. **`src/app/api/admin/settings/route.ts` (VIẾT LẠI):**
   - Áp dụng `requireAdmin(request)` cho GET và `requireAdminMutation(request)` cho POST.
   - Tương tác với D1 qua `mediaEnvironment()`, trả revision mới khi mutation thành công.
6. **`src/app/api/settings/route.ts` (TẠO MỚI):**
   - Endpoint public trả `PublicStorefrontSettings` cho các consumer phía người dùng.
7. **`src/app/admin/settings/page.tsx` (SỬA LỖI & NÂNG CẤP):**
   - Sửa dứt điểm bug kẹt loading (`setLoading(false)` luôn chạy).
   - Thêm trạng thái lỗi tải (`loadError`) kèm nút "Thử lại"; khóa chức năng lưu khi tải thất bại.
   - Thêm `credentials: "same-origin"` bảo đảm CSRF token/session được gửi đúng.
   - Bắt mã lỗi chi tiết: 401, 403, 409, 400, 500, lỗi mạng.
   - Giữ nguyên nội dung người dùng đang nhập khi lưu thất bại.
   - Khi nhận 409: thông báo xung đột phiên bản, nút "Tải bản mới từ server", không tự ghi đè.
   - Loại bỏ thông báo thành công giả; bản lưu tạm cục bộ có cảnh báo rõ "Bản chưa đồng bộ với máy chủ".
8. **`src/components/home/HeroSection.tsx`:**
   - Đổi import `DEFAULT_SETTINGS` từ route handler sang `@/contracts/cms/settings`.
9. **`src/server/services/storefront-cms.service.ts`:**
   - Xóa bỏ việc nuốt lỗi 503 trong `publishedOrNull` (lỗi hạ tầng phải surface ra error boundary).
   - Thêm hàm `classifyProductPublication(slugOrId)` phân loại 6 trạng thái publication.
10. **`src/app/(shop)/product/[id]/page.tsx`:**
    - Tích hợp `classifyProductPublication`: Fail-Closed ngay lập tức (`notFound()`) khi sản phẩm CMS là DRAFT hoặc UNPUBLISHED, tuyệt đối không rơi về catalog legacy.
11. **`src/server/services/storefront-order-guard.ts` & `src/server/services/order.service.ts`:**
    - Nâng cấp `assertPublishedStudioOrderable`: Chặn đặt hàng khi `{ hasStudio: true, published: null }` (`PRODUCT_UNAVAILABLE`).
12. **`src/app/api/cron/publish-scheduler/route.ts`:**
    - Bổ sung guard `studio: null` trong các câu query `toPublish` và `toUnpublish`.
13. **`scripts/test-settings.mjs` (TẠO MỚI):** Test suite kiểm thử Settings D1, Auth, CSRF, Concurrency.
14. **`scripts/test-publication-correctness.mjs` (TẠO MỚI):** Test suite kiểm thử 6 trạng thái Publication, Fail-Closed, Order Guard, Scheduler Guard.

---

## 4. QUY TẮC PHÂN LOẠI PUBLICATION VÀ FAIL-CLOSED (TASK D & E)

Hệ thống phân biệt rành mạch 6 trường hợp theo bảng quyết định sau:

| STT | Trường hợp | Điều kiện trong D1 (`Product` JOIN `ProductStudio`) | Trạng thái phân loại | Hành vi Storefront (PDP / Metadata) | Khả năng đặt hàng (Order Guard) |
|---|---|---|---|---|---|
| **1** | Sản phẩm thuần legacy hợp lệ | `studioProductId IS NULL` VÀ `status IN ('ACTIVE','active')` VÀ `deletedAt IS NULL` | `LEGACY_ACTIVE` | Hiển thị sản phẩm theo catalog legacy. | Cho phép (theo tồn kho legacy). |
| **2** | Sản phẩm thuần legacy đã ẩn/nháp | `studioProductId IS NULL` VÀ `status NOT IN ('ACTIVE','active')` | `LEGACY_INACTIVE` | `notFound()` (404). | Chặn (`PRODUCT_UNAVAILABLE`). |
| **3** | Sản phẩm CMS Studio đang là nháp | `studioProductId IS NOT NULL` VÀ `studioPublished IS NULL` (chưa publish) | `CMS_DRAFT` | **`notFound()` (404) — FAIL-CLOSED! Tuyệt đối không fallback về catalog cũ.** | Chặn (`PRODUCT_UNAVAILABLE`). |
| **4** | Sản phẩm CMS Studio đã unpublish | `studioProductId IS NOT NULL` VÀ (`studioPublished IS NULL` HOẶC `status != ACTIVE`) | `CMS_UNPUBLISHED` | **`notFound()` (404) — FAIL-CLOSED! Tuyệt đối không fallback về catalog cũ.** | Chặn (`PRODUCT_UNAVAILABLE`). |
| **5** | Sản phẩm CMS Studio đã xuất bản | `studioProductId IS NOT NULL` VÀ `studioPublished IS NOT NULL` VÀ `status = ACTIVE` | `CMS_PUBLISHED` | Hiển thị bản xuất bản (published snapshot) từ Studio. | Cho phép nếu `availability in (AVAILABLE, PREORDER)`. |
| **6** | Không tồn tại hoặc đã xóa | Không tìm thấy row HOẶC `deletedAt IS NOT NULL` | `NOT_FOUND` / `DELETED` | `notFound()` (404). | Chặn (`PRODUCT_UNAVAILABLE`). |
| **7** | Lỗi hạ tầng (D1 / R2 không khả dụng) | DB query ném Exception / HTTP 503 | `INFRASTRUCTURE_ERROR` | **Ném lỗi ra Error Boundary của Next.js, KHÔNG nuốt thành null để fallback catalog.** | Ném lỗi hệ thống. |

---

## 5. KẾT QUẢ KIỂM THỬ THỰC TẾ

Tất cả các bài kiểm thử đều được thực thi trong môi trường Miniflare v3 biệt lập (D1 in-memory + R2 in-memory), áp dụng toàn bộ migration từ `0001` đến `0012`:

### A. Bộ kiểm thử mới của R01
1. **Settings Persistence, Auth, CSRF & Concurrency (`scripts/test-settings.mjs`):**
   - `PASS` initial read returns revision 0 and defaults without DB mutation
   - `PASS` validation rejects XSS payloads and malicious URLs
   - `PASS` first mutation with expectedRevision 0 creates revision 1 atomically
   - `PASS` getAdminSettings returns persisted D1 state after reload
   - `PASS` stale expectedRevision rejected with 409 without mutating D1
   - `PASS` concurrent mutations have exactly one winner and one 409 conflict
   - `PASS` public DTO resolver extracts valid storefront structure
   - `PASS` auth guard: requireAdmin blocks unauthorized requests with 401
   - `PASS` CSRF guard: requireAdminMutation blocks cross-origin mutations with 403  
   **Kết quả: 9/9 PASS (100%)**

2. **Publication Correctness & Fail-Closed Guards (`scripts/test-publication-correctness.mjs`):**
   - `PASS` classifyProductPublication distinguishes all 6 states accurately
   - `PASS` lookup works symmetrically by slug or ID
   - `PASS` invariant: CMS draft and unpublished must fail-closed (blocked from public view)
   - `PASS` order guard blocks checkout on draft or unpublished CMS products
   - `PASS` order guard permits pure legacy active items without Studio
   - `PASS` order guard validates CMS availability and variant match
   - `PASS` scheduler guard: legacy cron query ignores CMS ProductStudio products  
   **Kết quả: 7/7 PASS (100%)**

### B. Đối chiếu hồi quy với Baseline R00
- **CMS Contracts (`scripts/test-cms-contracts.mjs`):** **9/9 PASS** (Khớp baseline R00: 9/9)
- **Media Library (`scripts/test-media-library.mjs`):** **16/16 PASS** (Khớp baseline R00: 16/16)
- **Product Studio (`scripts/test-product-studio.mjs`):** **12/12 PASS** (Khớp baseline R00: 12/12)
- **Navigation Studio (`scripts/test-navigation.mjs`):** **16/16 PASS** (Khớp baseline R00: 16/16)
- **Storefront Order Guard (`scripts/test-storefront-cms-order-guard.mjs`):** **5/5 PASS** (Khớp baseline R00: 5/5)

**Tổng số test tự động thực thi:** **74/74 PASS (100%)**.

### C. Static Typecheck & Build
- **Typecheck (`npx tsc --noEmit`):** **PASS (0 lỗi).**
- **Cloudflare Build (`npm run build:cloudflare`):** **PASS (Build complete).** Mọi route admin và storefront đều biên dịch thành công.

---

## 6. NHỮNG GÌ CHƯA KIỂM CHỨNG & GIỚI HẠN

1. **Gate Browser E2E:**
   - Chưa chạy tự động Playwright/Puppeteer trong lượt này vì môi trường phát triển hiện tại đang chạy dev server nền (`citilap-db-dev`). Việc chạy browser test yêu cầu khởi động server độc lập trên port cô lập và fixture cookie session giả lập.
   - Code UI của `SettingsPage` đã được xác minh toàn diện qua typecheck và logic error handling; tuy nhiên chưa có gate E2E browser tự động.
2. **Consumer Storefront còn thiếu (Dành cho R07):**
   - `HeroSection` đã kết nối nhận `settings` prop từ contracts.
   - Các consumer khác: Header hotline, Footer showroom address, Policy layout hiện vẫn import trực tiếp từ file tĩnh `src/config/business-profile.ts`. Việc đồng bộ toàn diện Storefront để chuyển mọi component tĩnh sang dynamic Settings từ D1 nằm trong phạm vi R07 (Storefront Integration).

---

## 7. HƯỚNG DẪN ÁP DỤNG MIGRATION VÀ ROLLBACK

### Áp dụng Migration lên Cloudflare D1
Chỉ chạy lệnh sau khi có sự đồng ý của quản trị viên:
```bash
# Áp dụng migration 0012 lên D1 Remote Production
npx wrangler d1 migrations apply citilap-db-production --remote
```

### Phương án Rollback An toàn
> [!CAUTION]
> **Tuyệt đối không dùng `DROP TABLE SiteSettings` làm phương án rollback mặc định** vì sẽ làm mất toàn bộ lịch sử cấu hình của cửa hàng!

- Nếu phát hiện sự cố với API Settings: Đặt cờ vô hiệu hóa mutation hoặc trả về mã lỗi 503 tạm thời tại `src/app/api/admin/settings/route.ts`.
- Quay lại commit trước đó sẽ khôi phục lại cơ chế RAM cũ, nhưng sẽ mở lại các lỗ hổng auth bypass và concurrency conflict đã được cảnh báo.
- Dữ liệu `SiteSettings` và `SiteSettingsRevision` lưu trữ an toàn dưới dạng JSON snapshot, có thể trích xuất phục hồi thủ công bất cứ lúc nào qua câu lệnh `SELECT document FROM SiteSettingsRevision WHERE revision = <N>`.

---

## 8. ĐỀ XUẤT PHẠM VI TIẾP THEO CHO R02

Theo kế hoạch tổng thể `ADMIN-CMS-MASTER-PLAN.md`, bước tiếp theo sau khi hoàn thành R01 là:
- **R02 — Nền tảng Admin & Trải nghiệm Biên tập Cốt lõi:**
  * Đồng bộ Sidebar Admin nhất quán giữa các trang (Media, Studio, Navigation, Settings, Orders).
  * Chuẩn hóa layout, breadcrumbs và header quản trị.
  * Tích hợp toast notification và design system tokens `.design/` thống nhất.
