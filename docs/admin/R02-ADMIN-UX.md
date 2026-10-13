# R02 — Tổ Chức Admin và Chuẩn Hóa Trải Nghiệm Quản Trị

**Ngày thực hiện:** 2026-10-12  
**Mục tiêu:** Người vận hành hiểu ngay mình đang ở đâu, cần làm gì và dữ liệu đã lưu hay chưa. Xây dựng nền tảng giao diện quản trị nhất quán, trung thực và dễ sử dụng để phục vụ Laptop, Phụ kiện, Tin tức và Order ở các giai đoạn tiếp theo.

---

## 1. Baseline Trước Khi Triển Khai R02

- **Branch / Commit:** `master`, HEAD `3694c01`.
- **Hạ tầng / Môi trường:** Next.js 16 (Turbopack) & Vinext Cloudflare adapter (`@vinext/cloudflare`), Cloudflare D1 SQLite & R2 Storage.
- **Tiến trình dev:** Không có tiến trình lạ chiếm dụng trái phép; bảo toàn tuyệt đối `.dev.vars` và dữ liệu D1 local.
- **Hiện trạng UX khảo sát ban đầu:**
  - Sidebar lộn xộn, trộn lẫn thuật ngữ kỹ thuật ("Product Studio", "Navigation Studio") với nghiệp vụ thường ngày.
  - Chuông thông báo đỏ hardcode không có nguồn dữ liệu thật; avatar chữ "A" và email cố định trình bày như danh tính thật.
  - Hai trình soạn thảo sản phẩm (`/admin/products` và `/admin/product-studio`) tồn tại song song gây bối rối cho người dùng mới mà không có cầu nối giải thích.
  - Trình duyệt điều hướng (`NavigationStudio`) không cảnh báo người dùng rằng lưu Menu, Danh mục và Bộ sưu tập thực chất lưu chung trong cùng 1 snapshot.
  - Màn hình Cài đặt (`/admin/settings`) hiển thị thông báo chưa chuẩn mực ("đồng bộ Storefront"), dù 3 tab (Flash Sale, Banners, Shipping) chưa được kết nối D1 vào Storefront.
  - Dashboard quản trị dùng `Math.random()` sinh doanh thu và biểu đồ cột 12 tháng giả khi không có `process.env.DATABASE_URL`.

---

## 2. Menu Trước và Sau Khi Tái Cấu Trúc

### Bảng đối chiếu Menu

| Menu Trước R02 | Menu Sau R02 (Chuyển Tiếp Hợp Lý) | Nhóm Nghiệp Vụ | Đường Dẫn Thực Tế | Ghi Chú Hành Vi |
| :--- | :--- | :--- | :--- | :--- |
| Dashboard | **Tổng quan** | Tổng quan & Bán hàng | `/admin/dashboard` | Bảng điều khiển định hướng công việc với số liệu D1 thật |
| Đơn hàng | **Đơn hàng** | Tổng quan & Bán hàng | `/admin/orders` | Danh sách xử lý yêu cầu đặt mua của khách hàng |
| Liên hệ | **Hộp thư liên hệ** | Tổng quan & Bán hàng | `/admin/contacts` | Xem và phản hồi tin nhắn khách gửi |
| Khách hàng | **Khách hàng** | Tổng quan & Bán hàng | `/admin/customers` | Quản lý thông tin tài khoản khách hàng |
| Sản phẩm | **Danh sách sản phẩm** | Catalog & Biên tập | `/admin/products` | Quản lý kho sản phẩm nhanh (kèm link mở Biên tập Studio) |
| Product Studio | **Biên tập sản phẩm** | Catalog & Biên tập | `/admin/product-studio` | Soạn thảo chi tiết, cấu hình biến thể, thông số & xuất bản web |
| Media | **Thư viện Media** | Catalog & Biên tập | `/admin/media` | Quản lý tải lên, gắn thẻ và lưu trữ ảnh/video R2 |
| Danh mục | **Danh mục sản phẩm** | Nội dung & Hệ thống | `/admin/categories` | Quản lý cây danh mục sản phẩm |
| Navigation | **Menu & Bộ sưu tập** | Nội dung & Hệ thống | `/admin/navigation` | Biên tập thanh điều hướng, cây menu và bộ sưu tập trang chủ |
| Cài đặt | **Cài đặt hệ thống** | Nội dung & Hệ thống | `/admin/settings` | Cấu hình thương hiệu, hotline, chính sách, banner |

---

## 3. Menu Chuyển Tiếp và Cấu Trúc Đích

### 3.1. Cấu trúc đích dài hạn (Master Plan R09):
- **Tổng quan**
- **Laptop** (Tất cả laptop, Thêm laptop, Danh mục laptop)
- **Phụ kiện** (Tất cả phụ kiện, Thêm phụ kiện, Danh mục phụ kiện)
- **Tin tức** (Bài viết, Thêm bài viết, Chuyên mục tin tức)
- **Đơn hàng**
- **Thư viện**
- **Nội dung website** (Banner, Menu, Trang tĩnh)
- **Cài đặt**

### 3.2. Cấu trúc chuyển tiếp tại R02:
- R02 **chưa có** catalog type/filter chuẩn hóa để tách biệt hoàn toàn Laptop và Phụ kiện (nằm trong phạm vi R03 và R04).
- R02 **chưa có** CMS module Tin tức (nằm trong phạm vi R05).
- **Quyết định trung thực:** 
  - Không tạo mục "Laptop" hay "Phụ kiện" giả tạo nếu chỉ hiển thị chung một danh sách toàn bộ sản phẩm.
  - Không tạo link chết hoặc trang rỗng "Tin tức" chỉ để cho đủ số lượng menu.
  - Phân chia sidebar thành **3 nhóm nghiệp vụ thực tế**:
    1. *Tổng quan & Bán hàng* (Tổng quan, Đơn hàng, Hộp thư liên hệ, Khách hàng)
    2. *Catalog & Biên tập* (Danh sách sản phẩm, Biên tập sản phẩm [Studio], Thư viện Media)
    3. *Nội dung & Hệ thống* (Danh mục sản phẩm, Menu & Bộ sưu tập, Cài đặt hệ thống)

---

## 4. Chức Năng Chưa Mở và Phase Phụ Trách

| Chức Năng / Module | Trạng Thái Tại R02 | Phase Phụ Trách Hoàn Thiện | Lý Do Chưa Bật Tại R02 |
| :--- | :--- | :--- | :--- |
| **Catalog Laptop chuyên biệt** | Chưa tách menu riêng | **R03** (Catalog & Laptop) | Chờ hợp nhất writer Product Studio và đóng ngõ ghi legacy |
| **Catalog Phụ kiện** | Chưa tách menu riêng | **R04** (Phụ kiện) | Chờ chuẩn hóa schema phụ kiện và bộ lọc tương thích |
| **Tin tức / Blog CMS** | Chưa mở menu | **R05** (Tin tức CMS) | Chưa có bảng D1 bài viết, authoring tool và route public |
| **Quy trình Order chi tiết & Timeline** | Đang giữ nguyên quy trình xử lý yêu cầu | **R06** (Order & Khách hàng) | Tránh tạo ra trạng thái ảo khi chưa có tracking vận chuyển |
| **Kết nối Banner / Flash Sale lên Storefront** | Lưu trữ an toàn tại D1 Settings; chưa sync Storefront | **R07** (Nội dung Storefront & Settings) | Consumer Storefront chưa đọc snapshot D1 SiteSettings |
| **Tự động tính phí vận chuyển tại Checkout** | Lưu cấu hình tại D1 Settings; chưa sync Checkout | **R08** (Hoàn thiện CMS & Quyền) | Phụ thuộc vào contract vận chuyển và địa chỉ hành chính |

---

## 5. Component Dùng Chung và Màn Hình Đã Áp Dụng

Đã tạo bộ UI primitives chuẩn tại `src/components/admin/ui/`:
1. `PageHeader` (`src/components/admin/ui/PageHeader.tsx`): Header chuẩn với H1, mô tả ngắn, badge trạng thái và action button chính.
2. `AdminCard` (`src/components/admin/ui/AdminCard.tsx`): Khối thẻ chứa nội dung phẳng, bo góc 12px, phân định header/body/footer rõ ràng.
3. `AdminButton` (`src/components/admin/ui/AdminButton.tsx`): Nút bấm có phân cấp rõ rệt: `primary` (xanh), `secondary` (trắng viền xám), `destructive` (đỏ), `ghost` (trong suốt) kèm spinner loading.
4. `StatusBadge` (`src/components/admin/ui/StatusBadge.tsx`): Huy hiệu trạng thái kết hợp màu sắc, nhãn tiếng Việt và chấm tròn nhận diện trạng thái.
5. `InlineAlert` (`src/components/admin/ui/InlineAlert.tsx`): Thông báo cố định trong giao diện (success, warning, error, info), không tự biến mất đối với lỗi quan trọng.
6. `AdminBreadcrumbs` (`src/components/admin/ui/AdminBreadcrumbs.tsx`): Đường dẫn phân cấp tự động bám theo URL.
7. `AdminLoadingState`, `AdminEmptyState`, `AdminErrorState` (`src/components/admin/ui/AdminState.tsx`): Trạng thái tải, trống và lỗi mạng thân thiện.

### Màn hình đã áp dụng:
- **Admin Layout / Shell (`src/app/admin/layout.tsx`)**: Topbar với breadcrumbs tự động, nút "Xem website", nút "Đăng xuất"; Mobile drawer quản lý phím Escape và focus; Sidebar 3 nhóm nghiệp vụ.
- **Dashboard (`src/app/admin/dashboard/page.tsx`)**: PageHeader, 4 thẻ thống kê công việc, 6 Quick Actions, 2 bảng chi tiết đơn hàng và sản phẩm Studio.
- **Đơn hàng (`src/app/admin/orders/page.tsx`)**: PageHeader, AdminCard, StatusBadge rõ ràng, nhãn giải thích xử lý đơn hàng, thay thế toàn bộ browser `alert()` bằng InlineAlert.
- **Cài đặt (`src/app/admin/settings/page.tsx`)**: PageHeader, InlineAlert "Đã lưu cấu hình thành công", Info Banners giải thích phạm vi chưa tác động Storefront tại 3 tab (Flash Sale, Banners, Shipping).
- **Danh sách sản phẩm (`src/app/admin/products/page.tsx`)**: PageHeader kèm cầu nối trực tiếp sang "Biên tập Studio".
- **Biên tập sản phẩm (`src/components/admin/products/ProductStudio.tsx`)**: Đổi tiêu đề thành "Biên tập sản phẩm", làm rõ vai trò soạn thảo nâng cao & xuất bản web.
- **Menu & Bộ sưu tập (`src/components/admin/navigation/NavigationStudio.tsx`)**: Bổ sung cảnh báo xuất bản chung snapshot (Menu + Danh mục + Bộ sưu tập).

---

## 6. Quy Tắc Trạng Thái, Nút Bấm và Thông Báo

### 6.1. Quy tắc trạng thái
- Không bao giờ dựa vào màu sắc đơn thuần để biểu đạt trạng thái.
- Luôn kết hợp nhãn văn bản tiếng Việt rõ ràng và chấm tròn hiển thị:
  - **Chờ xử lý / Nháp**: Màu Amber (`bg-amber-50 text-amber-700`).
  - **Đang xử lý**: Màu Blue (`bg-blue-50 text-blue-700`).
  - **Đã xuất bản / Hoàn thành**: Màu Emerald (`bg-emerald-50 text-emerald-700`).
  - **Đã hủy / Lỗi / Ngừng nhận đơn**: Màu Rose (`bg-rose-50 text-rose-700`).
  - **Đã ẩn / Chưa kích hoạt**: Màu Slate (`bg-slate-100 text-slate-600`).
- Chỉ hiển thị trạng thái mà hệ thống thực tế xác định được; không tự suy diễn trạng thái khi chưa có cơ chế so sánh dữ liệu.

### 6.2. Quy tắc nút bấm
- Mỗi màn hình chỉ có **duy nhất một hành động chính (Primary Action)** ở góc trên bên phải (ví dụ: "Lưu cấu hình", "Thêm sản phẩm").
- Màn hình Cài đặt: Nút bấm ghi rõ **"Lưu cấu hình"**.
- Màn hình Soạn thảo nội dung: Nút bấm phân biệt rõ giữa **"Lưu nháp"**, **"Xem trước"** và **"Xuất bản website"**. Không đồng nhất mù quáng chữ "Lưu" thành "Xuất bản".

### 6.3. Quy tắc thông báo & phản hồi
- Thành công: Thông báo xanh với thông điệp nghiệp vụ cụ thể (ví dụ: "Đã lưu cấu hình thành công.").
- Tuyệt đối không đưa các thuật ngữ kỹ thuật hạ tầng (`D1`, `revision #`, `SQL trigger`, `API endpoint`) làm nội dung thông báo chính gửi cho người vận hành.
- Lỗi nghiêm trọng hoặc xung đột phiên bản (409 Conflict): Hiển thị `InlineAlert` cố định trong form, không dùng toast tự ẩn, kèm nút "Tải bản mới từ server" và bảo toàn nguyên vẹn dữ liệu đang nhập dở của người dùng.

---

## 7. Nguồn Dữ Liệu Dashboard Theo Công Việc

Tái cấu trúc toàn diện `src/app/api/dashboard/route.ts` để đọc dữ liệu thật từ Cloudflare D1:
- `pendingOrders`: Đếm số đơn hàng có trạng thái `pending` từ bảng `Order`.
- `draftStudioCount`: Đếm số bản ghi sản phẩm Studio đang ở trạng thái `draft` từ bảng `ProductDraft`.
- `publishedStudioCount`: Đếm số bản ghi sản phẩm Studio đang ở trạng thái `published` từ bảng `ProductPublication`.
- `mediaCount`: Đếm tổng số tệp ảnh và video đang hoạt động từ bảng `MediaAsset`.
- `recentOrders`: 6 đơn hàng tiếp nhận gần nhất với mã đơn, tên khách, tổng tiền và badge trạng thái.
- `recentStudioItems`: 5 sản phẩm Studio cập nhật gần nhất với tên, mã, giá bán và badge trạng thái.

**Cam kết trung thực:** Loại bỏ 100% việc sinh dữ liệu ngẫu nhiên `Math.random()`, loại bỏ biểu đồ doanh thu giả và số liệu hardcode.

---

## 8. Bằng Chứng Xác Minh Giao Diện

- **Screenshot lưu trữ:** `docs/admin/settings_browser_verification.png`
- **Nội dung kiểm chứng:**
  - Header chuẩn: Breadcrumbs `Admin > Hệ thống > Cài đặt hệ thống`, H1 "Cài đặt hệ thống", Bản ghi #1, nút "Lưu cấu hình".
  - Banner thông báo lưu thành công: "Đã lưu cấu hình thành công." (live="polite").
  - Xử lý xung đột 409: Bật cờ xung đột, nhấn Lưu -> Hiển thị cảnh báo trực tiếp "Xung đột phiên bản (409)...", xuất hiện nút "Tải bản mới từ server", giữ nguyên bản sửa của người dùng.
  - Info Banners tại các tab chưa nối Storefront: Hiển thị hướng dẫn rõ ràng cho người vận hành.

---

## 9. Kết Quả Kiểm Thử Từng Tầng

| Tầng Kiểm Thử | Công Cụ / Môi Trường | Số Lượng Tests | Kết Quả | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- |
| **Static Typecheck** | TypeScript 5.8 (`tsc --noEmit`) | Toàn bộ dự án | **PASS (0 errors)** | Hợp lệ toàn bộ props, models và contracts |
| **Linting** | ESLint 9 | File sửa đổi | **PASS (0 errors, 0 warnings)** | Không vi phạm rule styling hay syntax |
| **Cloudflare Build** | `@vinext/cloudflare` (`vite build`) | Toàn bộ dự án | **PASS (Exit code 0)** | Build bundle production Cloudflare thành công |
| **Publication & Identity** | `test-publication-correctness.mjs` | 8/8 tests | **PASS** | Kiểm chứng explicit `byId` / `bySlug` và collision regression |
| **Media Library** | `test-media-library.mjs` | 16/16 tests | **PASS** | Miniflare D1 & R2 cô lập |
| **Product Studio** | `test-product-studio.mjs` | 12/12 tests | **PASS** | Quản lý bản nháp, revision và xuất bản D1 |
| **Navigation Studio** | `test-navigation.mjs` | 16/16 tests | **PASS** | Quản lý menu, danh mục và snapshot D1 |
| **Storefront Order Guard** | `test-storefront-cms-order-guard.mjs` | 5/5 tests | **PASS** | Chặn mua hàng với sản phẩm CMS chưa xuất bản |
| **Settings Service & Auth** | `test-settings.mjs` | 9/9 tests | **PASS** | CRUD, revision guard, CSRF & auth |
| **Settings Disk Persistence** | `test-settings-disk-persistence.mjs` | 4/4 tests | **PASS** | D1 persistence & restart survival |
| **Settings HTTP Routes** | `test-settings-http-routes.mjs` | 9/9 tests | **PASS** | Route Handlers Next.js chạy trên Miniflare D1 thật |
| **Browser Component QA** | Chrome DevTools MCP & `browser-settings-server.mjs` | Interactive QA | **PASS** | Render component production thật, kiểm tra save, info banners, 409 conflict |

**Tổng cộng kiểm thử tự động:** **79 / 79 PASS**.

---

## 10. Các Sai Lệch R01 Đã Đóng Trong R02

1. **Thông báo Settings:**
   - Đã đổi thành "Đã lưu cấu hình thành công."
   - Loại bỏ hoàn toàn thông điệp "đồng bộ Storefront" và các thuật ngữ "D1/revision".
   - Thêm Info Banners hướng dẫn tại 3 tab: Flash Sale (chờ R07), Banners (chờ R07), Shipping (chờ R08).
2. **Chuẩn hóa Roadmap:**
   - R04: Phụ kiện.
   - R07: Nội dung Storefront, banner/menu/footer và kết nối settings.
   - R08: Hoàn thiện CMS, quyền, lịch xuất bản, khôi phục.
   - Đồng bộ hóa tài liệu kiểm chứng `docs/admin/R01-VERIFICATION.md` khớp chuẩn roadmap.
3. **Identity Lookup & Collision Regression:**
   - Nâng cấp `classifyProductPublication` trong `src/server/services/storefront-cms.service.ts` hỗ trợ rõ ràng `lookupType: 'auto' | 'id' | 'slug'`.
   - Export 2 helper phân biệt dứt khoát: `classifyProductPublicationById` và `classifyProductPublicationBySlug`.
   - Bổ sung TEST 2 trong `scripts/test-publication-correctness.mjs`: kiểm chứng kịch bản Product A có slug trùng với ID của Product B. Cả 2 sản phẩm được định danh chính xác 100%, không bị nhầm lẫn.
4. **Phân loại bằng chứng trung thực:**
   - Ghi nhận chính xác: `browser-settings-server.mjs` bundle component production thật (`src/app/admin/settings/page.tsx`) qua `esbuild`, phục vụ trên môi trường harness với mock endpoints để test edge-case UI.
   - Các Route Handlers production thật được kiểm chứng qua `test-settings-http-routes.mjs`.

---

## 11. Các Hạng Mục Chuẩn Bị Cho R03

1. **Khóa triệt để các luồng ghi legacy (`legacy write gates`):**
   - Chặn `POST /api/products` và `PATCH/DELETE /api/products/[id]` bằng HTTP 409, yêu cầu người dùng chuyển sang sử dụng CMS Studio.
   - Ngăn chặn cron scheduler desync trạng thái giữa bảng legacy và Studio.
2. **Hợp nhất giao diện quản lý catalog:**
   - Hợp nhất màn hình danh sách sản phẩm `/admin/products` và `/admin/product-studio` thành một giao diện Catalog duy nhất theo trải nghiệm WordPress.
   - Mở rộng phân trang server (Server Pagination) để xóa bỏ giới hạn cứng `LIMIT 100`.
3. **Trình biên tập Laptop chuyên biệt:**
   - Tối ưu hóa form biên tập cấu hình Laptop (CPU, RAM, Ổ cứng, Card đồ họa, Màn hình, Tình trạng máy).
