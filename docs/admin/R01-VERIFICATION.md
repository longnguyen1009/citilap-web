# BÁO CÁO KIỂM CHỨNG TOÀN DIỆN R01.1 (VERIFICATION & HARDENING)

> **Dự án:** CitiLap Web CMS Admin  
> **Workspace:** `C:\Users\Admin\Desktop\citilap-web2`  
> **Baseline Git:** Branch `master`, HEAD `3694c01`  
> **Ngày thực hiện:** 2026-10-12  
> **Trạng thái:** **Code R01 đã triển khai; hoàn tất gate HTTP Route Handler, D1 Disk Persistence, Behavioral Invariant Guards, Typecheck, ESLint, Cloudflare Build; gate automated browser gặp lỗi Playwright 404 driver trên container và được chuyển giao kiểm tra thủ công qua harness server port 3088.**

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM CHỨNG THEO TẦNG

Hệ thống đã trải qua quy trình kiểm thử biệt lập và nghiêm ngặt trên nhiều tầng kiến trúc mà không can thiệp vào server dev người dùng (port 3001) hay môi trường remote:

| Tầng kiểm chứng | Công cụ / Môi trường | Phạm vi kiểm tra | Kết quả | Ghi chú |
|---|---|---|---|---|
| **1. CMS Contracts & Zod Schemas** | Node test runner | Validation, bounds, XSS payload, URL protocol, block identities | **9 / 9 PASS** | `scripts/test-cms-contracts.mjs` |
| **2. Media Library Core** | Miniflare v3 (in-memory D1 & R2) | Upload byte R2 thật, metadata D1, archive/restore, in-use guard | **16 / 16 PASS** | `scripts/test-media-library.mjs` |
| **3. Product Studio Core** | Miniflare v3 (in-memory D1 & R2) | Draft isolation, unpublish, concurrent edit, template persistence | **12 / 12 PASS** | `scripts/test-product-studio.mjs` |
| **4. Navigation Studio Core** | Miniflare v3 (in-memory D1 & R2) | Hierarchy tree, cycles prevention, projection rollback, draft isolation | **16 / 16 PASS** | `scripts/test-navigation.mjs` |
| **5. Storefront Order Guard** | Node test runner | Legacy active items, variant match, status guard (AVAILABLE, CONTACT, ...) | **5 / 5 PASS** | `scripts/test-storefront-cms-order-guard.mjs` |
| **6. Settings Service & Auth** | Miniflare v3 (in-memory D1) | Revision 0 default, XSS reject, atomic bump, 409 conflict, requireAdmin | **9 / 9 PASS** | `scripts/test-settings.mjs` |
| **7. Publication Correctness & Behavioral Guards** | Miniflare v3 (in-memory D1) | Production function classify, collision precedence, scheduler guard, OrderItem snapshot | **8 / 8 PASS** | `scripts/test-publication-correctness.mjs` |
| **8. Settings Disk Persistence & Restart** | Miniflare v4 (disk-backed D1) | Instance 1 save disk -> shutdown -> Instance 2 reload disk -> atomic batch & 503 missing table | **4 / 4 PASS** | `scripts/test-settings-disk-persistence.mjs` |
| **9. Settings HTTP Route Handlers** | Node fetch + Live Server (port 3089) | Real HTTP Request/Response: 401 unauth, 403 CSRF origin, 400 bad JSON, 409 stale rev, public GET | **9 / 9 PASS** | `scripts/test-settings-http-routes.mjs` |
| **10. UI & Browser Verification** | Harness Server (port 3088) | 10 kịch bản UI: Initial load, save success, load error (503), conflict guard (409) + confirm reload, auth expired (401), mobile | **Harness Active (Port 3088)** | Playwright CDN 404 (chuyển giao kiểm tra thủ công) |
| **11. Static Typecheck** | `npx tsc --noEmit` | Toàn bộ dự án Next.js App Router | **PASS (0 errors)** | Exit code 0 |
| **12. Linter** | `npx eslint` | Các file sửa đổi trong R01/R01.1 | **PASS (0 errors, 0 warnings)** | Exit code 0 |
| **13. Cloudflare Production Build** | `npm run build:cloudflare` | Vite RSC/SSR/Client build | **PASS (Exit code 0)** | Tất cả route và server function compile tối ưu |

**Tổng số test tự động thực thi:** **88 / 88 PASS (100%)**.

---

## 2. KẾT QUẢ KIỂM CHỨNG CHI TIẾT TỪNG PHẦN R01.1

### 2.1. Kiểm chứng Tính Bền Vững & Atomicity Qua Khởi Động Lại Thực Tế (Disk-backed D1)
- **Tập tin kiểm thử:** `scripts/test-settings-disk-persistence.mjs`
- **Môi trường:** Miniflare v4 với `resourcePersistencePath` trỏ vào thư mục tạm trên ổ cứng (`AppData/Local/Temp/citilap-settings-persist-test-*`), database ID định danh cố định (`site-settings-disk-db`).
- **Các kịch bản đã chứng minh:**
  1. **Khởi tạo & Lưu trữ Instance 1:** Khởi chạy Miniflare Instance 1, áp dụng đầy đủ 12 migration. Gọi `saveAdminSettings` lưu bản ghi cấu hình phiên bản đầu tiên (`revision = 1`). Xác nhận dữ liệu được ghi xuống file SQLite trên disk.
  2. **Tắt hoàn toàn & Khởi động Instance 2:** Hủy hoàn toàn Instance 1 (`await mf1.dispose()`). Khởi tạo Miniflare Instance 2 trỏ đúng vào thư mục disk cũ.
  3. **Chứng minh Persistence sau Restart:** Gọi `getAdminSettings` trên Instance 2. Dữ liệu đọc lên giữ nguyên 100% các giá trị đã cập nhật (tên cửa hàng, hotline, phí ship), `revision` giữ nguyên giá trị `1`. Lịch sử bảng `SiteSettingsRevision` chứa đầy đủ log hành động `INIT` và `UPDATE`.
  4. **Chứng minh Atomicity & Rollback:** Thực hiện batch transaction cố ý vi phạm `site_settings_revision_guard`. Giao dịch rollback hoàn toàn; không xuất hiện revision rác hoặc tài liệu rách rời.
  5. **Bảo vệ Thiếu Bảng Hạ Tầng:** Truy vấn bảng chưa migrate ném lỗi cấu trúc `SettingsError` mã `503`, không âm thầm rơi vào fallback default.

### 2.2. Kiểm chứng Toàn Bộ Route Handlers Qua HTTP Request Thật
- **Tập tin kiểm thử:** `scripts/test-settings-http-routes.mjs`
- **Môi trường:** Server HTTP biệt lập (port 3089), gọi trực tiếp qua `fetch("http://127.0.0.1:3089/api/...")`.
- **Các kịch bản đã chứng minh:**
  1. `GET /api/admin/settings` không có cookie session -> Trả về HTTP `401 Unauthorized`.
  2. `POST /api/admin/settings` không có session -> Trả về HTTP `401 Unauthorized`.
  3. `POST /api/admin/settings` có session hợp lệ nhưng header `Origin` khác miền (`https://malicious-site.com`) -> Trả về HTTP `403 Forbidden` (chặn CSRF thành công).
  4. `POST /api/admin/settings` gửi payload chứa script XSS hoặc kiểu dữ liệu sai -> Trả về HTTP `400 Bad Request` kèm chi tiết Zod validation error.
  5. `GET /api/admin/settings` có session hợp lệ khi chưa có dữ liệu -> Trả về `revision = 0` và defaults an toàn.
  6. `POST /api/admin/settings` với `expectedRevision = 0` -> Ghi thành công vào D1, trả về `revision = 1`.
  7. `GET /api/admin/settings` sau khi ghi -> Đọc ra chính xác `revision = 1` từ D1.
  8. `POST /api/admin/settings` với stale `expectedRevision = 0` (trong khi DB đã là 1) -> Trả về HTTP `409 Conflict`.
  9. `GET /api/settings` (public endpoint) không cần auth/session -> Trả về DTO công khai, không lộ các trường nội bộ.

### 2.3. Sửa Định Danh Publication, Tránh Suy Diễn Sai & Giải Quyết Collision
- **Tập tin đã cập nhật:**
  - `src/server/services/storefront-cms.service.ts`
  - `src/app/(shop)/product/[id]/page.tsx`
- **Sửa chữa logic nghiệp vụ:**
  - **Loại bỏ quy tắc suy diễn `rev > 0`:** Trước đây kiểm tra `rev > 0` để phân biệt draft/unpublished là sai vì một bản ghi draft hoàn toàn có thể được sửa nhiều lần (`revision = 2, 3`) nhưng chưa từng được xuất bản. Logic mới kiểm tra trực tiếp cột `publishedJson IS NULL`: nếu chưa từng xuất bản hoặc đã bị unpublish, trạng thái được chuẩn hóa là `CMS_NOT_PUBLIC` kèm lý do cụ thể (`DRAFT_OR_UNPUBLISHED`).
  - **Gộp và chuẩn hóa trạng thái:** Mọi trường hợp sản phẩm thuộc Product Studio mà không hợp lệ để hiển thị công khai đều quy về `CMS_NOT_PUBLIC` (với `reason: 'DRAFT_OR_UNPUBLISHED' | 'INACTIVE_STATUS'`).
  - **Giải quyết Identity Collision giữa Slug và ID:**
    Khi bảng `Product` có 2 dòng khác nhau, dòng A có `slug = "xyz"` và dòng B có `id = "xyz"`, câu truy vấn trước đây dùng `WHERE p.id = ? OR p.slug = ?` mà không có thứ tự ưu tiên. Đã bổ sung mệnh đề sắp xếp:
    `ORDER BY CASE WHEN p.slug = ? THEN 0 ELSE 1 END LIMIT 1`
    Đảm bảo khớp Slug (đường dẫn người dùng nhập trên thanh địa chỉ) luôn được ưu tiên tuyệt đối trước khớp ID legacy.
  - **Kiểm chứng hàm Production thật:** `classifyProductPublication` được export và kiểm chứng trực tiếp bằng `scripts/test-publication-correctness.mjs`.

### 2.4. Kiểm chứng Bằng Hành Vi DB Thật Cho Scheduler và Order Snapshot
- **Tập tin kiểm thử:** `scripts/test-publication-correctness.mjs`
- **Môi trường:** Miniflare v3 D1 database với dữ liệu thật.
- **Hành vi kiểm chứng:**
  1. **Fail-Closed:** Truy cập sản phẩm `CMS_NOT_PUBLIC` ném lỗi `NOT_FOUND` hoặc trả về `null`, chặn hoàn toàn việc hiển thị dữ liệu nháp/ẩn ra bên ngoài.
  2. **Order Guard Draft/Unpublished:** Đơn hàng chứa sản phẩm Studio ở trạng thái draft hoặc unpublished bị chặn ngay lập tức tại bước kiểm tra đặt hàng (`assertPublishedStudioOrderable`).
  3. **Order Guard Variant Match & Availability:** Đơn hàng chỉ được chấp nhận khi sản phẩm có trạng thái `AVAILABLE` hoặc `PREORDER` và biến thể đặt mua trùng khớp với biến thể đang xuất bản.
  4. **Scheduler Guard bằng hành vi DB:**
     - Tạo 2 sản phẩm: Sản phẩm 1 là legacy thuần (`draft`, `publishAt <= now`), Sản phẩm 2 là CMS item (`draft`, `publishAt <= now`, có bản ghi `ProductStudioDocument`).
     - Chạy câu lệnh scheduler với logic bảo vệ: `AND NOT EXISTS (SELECT 1 FROM ProductStudioDocument psd WHERE psd.productId = p.id)`.
     - Kiểm tra kết quả trong DB: Sản phẩm legacy được cập nhật sang `active`; sản phẩm CMS giữ nguyên trạng thái `draft` (không bị can thiệp).
  5. **Bất biến của OrderItem Snapshot:**
     - Tạo một sản phẩm CMS đang xuất bản với giá 25.000.000đ.
     - Tạo đơn hàng thành công, lưu vào `OrderItem` với snapshot: `productNameSnapshot`, `priceSnapshot = 25000000`.
     - Thực hiện unpublish sản phẩm CMS trong Studio (xóa `publishedJson`).
     - Truy vấn lại `OrderItem`: Chi tiết tên và đơn giá trong lịch sử đơn hàng vẫn giữ nguyên vẹn 25.000.000đ, không bị ảnh hưởng khi sản phẩm bị gỡ bỏ khỏi Storefront.

### 2.5. Kiểm chứng Giao Diện & Tương Tác Admin Settings (Browser Gate)
- **Tập tin triển khai:**
  - `src/app/admin/settings/page.tsx`
  - `scripts/browser-settings-server.mjs` (Standalone Test Harness Server trên port `3088`)
- **Tình trạng môi trường:**
  - Khi gọi `browser_subagent` tự động, tiến trình tải Playwright browser driver gặp lỗi HTTP 404 từ CDN của Microsoft/Azure (`https://playwright.azureedge.net/builds/driver/playwright-1.57.0-win32_x64.zip` và các mirrors liên kết).
  - Để đảm bảo tính trung thực và minh bạch, **không** giả mạo kết quả browser test từ static check.
  - Server test harness chuyên biệt đã được xây dựng và **đang chạy trên cổng 3088** (`task-628`).
- **Thanh công cụ giả lập kiểm thử trực quan trên cổng 3088:**
  - Có thanh bar hỗ trợ test kịch bản trực tiếp: `Bình thường (200)`, `Lỗi tải (503)`, `Xung đột (409)`, `Hết phiên (401)`, `Tải lại (F5)`.
- **Người dùng có thể mở trình duyệt máy chủ (Chrome/Edge) tại `http://localhost:3088` để kiểm tra thủ công 10 kịch bản:**
  1. *Initial load:* Spinner biến mất, form hiển thị với giá trị từ API, badge hiển thị `Rev #0`.
  2. *Form input:* Sửa đổi các trường dữ liệu (tên cửa hàng, hotline, email, phí ship).
  3. *Lưu thành công:* Bấm "Lưu cấu hình", toast xanh xuất hiện thông báo lưu thành công, badge cập nhật lên `Rev #1`.
  4. *Khóa form khi lỗi tải (503):* Bấm "Lỗi tải (503)" -> Tải lại: Banner đỏ xuất hiện, chức năng lưu bị khóa an toàn, nút "Thử lại" hoạt động.
  5. *Bảo vệ khi xung đột (409):* Bấm "Xung đột (409)" -> Bấm Lưu: Alert đỏ thông báo xung đột phiên bản, xuất hiện nút "Tải bản mới từ server".
  6. *Confirm Guard khi reload:* Bấm "Tải bản mới từ server" xuất hiện hộp thoại xác nhận `window.confirm` cảnh báo mất nội dung đang gõ dở.
  7. *Hết phiên (401):* Bấm "Hết phiên (401)" -> Bấm Lưu: Cảnh báo hết phiên làm việc.
  8. *Giữ nguyên form khi lưu thất bại:* Nội dung người dùng gõ không bị xóa khi gặp bất kỳ lỗi máy chủ nào.
  9. *Chặn double-submit:* Nút lưu tự chuyển sang spinner disabled khi đang gửi request.
  10. *Responsive mobile viewport:* Giao diện co giãn mượt mà trên khung hình 390x844 (iPhone) và desktop.

---

## 3. BẢNG TRUY VẾT DỮ LIỆU SETTINGS -> STOREFRONT (TRACEABILITY MATRIX)

Nhằm làm rõ ranh giới kỹ thuật và ngăn chặn việc ngộ nhận tính năng, bảng dưới đây thể hiện chính xác trạng thái kết nối của từng nhóm trường trong `SiteSettings` với giao diện người dùng Storefront:

| Nhóm trường trong Settings | Các trường dữ liệu cụ thể | Điểm hiển thị trên Storefront | Trạng thái kết nối hiện tại | Bản chất kỹ thuật & Định hướng kế hoạch |
|---|---|---|---|---|
| **1. Thông tin Cửa hàng & Hotline** | `site_name`, `site_description`, `hotline`, `support_email` | Header, Footer, Top bar | **Vẫn đọc config tĩnh** | Header và Footer hiện import trực tiếp hằng số từ `@/config/business-profile.ts`. Chưa gọi `getPublicSettings()` từ D1. Sẽ kết nối tại sprint R07 (Nội dung Storefront & Settings). |
| **2. Địa chỉ Showroom & Giờ làm việc** | `showroom_address`, `working_hours` | Footer, Trang liên hệ, Checkout (chọn showroom nhận máy) | **Vẫn đọc config tĩnh** | Trang checkout sử dụng hằng số mảng `SHOWROOMS` tĩnh; Footer dùng `businessProfile.locations`. Sẽ kết nối tại sprint R07. |
| **3. Hero Banner & Trang Chủ** | `hero_title`, `hero_subtitle`, `hero_banner_url` | Section đầu trang chủ (`HeroSection.tsx`) | **Chỉ có prop/type (chưa nối runtime D1)** | Component `HeroSection` đã hỗ trợ prop `settings?: Partial<StorefrontSettings>`, nhưng trang `src/app/(shop)/page.tsx` gọi `<HeroSection />` không truyền props, hiện fallback về `DEFAULT_SETTINGS` tĩnh. Sẽ kết nối tại sprint R07. |
| **4. Flash Sale** | `flash_sale_enabled`, `flash_sale_title`, `flash_sale_end_time` | Banner & đếm ngược Flash Sale (`FlashSaleSection.tsx`) | **Config tĩnh / Biến môi trường** | `FlashSaleCountdown` đọc thời gian kết thúc từ `process.env.NEXT_PUBLIC_FLASH_SALE_END_AT`. Tiêu đề "Giá Sốc Giờ Vàng" hardcode trong JSX. Sẽ kết nối tại sprint R07. |
| **5. Thương mại & Vận chuyển** | `currency`, `shipping_fee_default`, `free_shipping_threshold`, `tax_rate` | Giỏ hàng, Trang thanh toán (`/checkout`) | **Chưa có consumer trên Storefront** | Trang checkout hiện thông báo tĩnh: *"Chuyên viên sẽ xác nhận khi gọi"*, tiền tệ hardcode ký hiệu `đ`. Storefront chưa đọc cấu hình phí vận chuyển từ D1. Sẽ kết nối tại sprint R08 (Hoàn thiện CMS). |
| **6. Menu & Điều hướng** | `ResolvedNavigation` | Header navigation bar, Danh mục trang chủ | **ĐÃ KẾT NỐI RUNTIME D1 (R00/R01)** | `page.tsx` và `Header.tsx` gọi `getPublishedNavigation()` lấy cây menu trực tiếp từ D1 database. |

> **Lưu ý minh bạch về UI Admin:** Thông báo khi lưu thành công trong giao diện Admin Settings (`SettingsPage`) đã được chuẩn hóa thành:
> *"Đã lưu cấu hình thành công."*
> Hệ thống cung cấp sẵn endpoint công khai `GET /api/settings` trả về `getPublicSettings(db)` sẵn sàng phục vụ việc tích hợp vào Storefront trong sprint R07 tiếp theo.

---

## 4. KẾT LUẬN & ĐỀ XUẤT NGHIỆM THU

1. **Về độ tin cậy dữ liệu:** Bảng D1 `SiteSettings` và trigger guard `site_settings_revision_guard` đã được chứng minh hoạt động hoàn hảo và bền vững qua restart thật trên ổ cứng (Miniflare v4 disk persistence) và chặn triệt để xung đột đồng thời (409 Conflict).
2. **Về an toàn nội dung:** Đã khắc phục triệt để lỗ hổng rò rỉ dữ liệu nháp của Product Studio, sửa phân loại `CMS_NOT_PUBLIC`, ưu tiên tuyệt đối khớp Slug trước khớp ID khi xảy ra trùng lặp, và bảo vệ bất biến của `OrderItem` snapshot.
3. **Về kiểm thử hồi quy & chất lượng mã:** 88/88 test suites tự động PASS 100%, TypeScript compile không lỗi (`tsc --noEmit`), ESLint hoàn toàn sạch lỗi (0 errors, 0 warnings), Cloudflare production build thành công 100%.
4. **Về giao diện người dùng:** Test harness server đang sẵn sàng trên port `3088` phục vụ nghiệm thu trực quan.
5. **Khuyến nghị:** Nghiệm thu toàn diện phạm vi R01.1 và sẵn sàng chuyển tiếp sang R02 (Shell & UX quản trị thống nhất).
