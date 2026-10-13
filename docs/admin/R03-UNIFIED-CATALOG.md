# R03 — Catalog Thống Nhất và Trình Biên Tập Laptop

> **Trạng thái:** HOÀN THÀNH TOÀN DIỆN (Bao gồm R03 và R03B — Chuẩn hóa V2 100% Gates Passed, Browser QA Verified, Cloudflare Build Verified)  
> **Thời gian hoàn thành:** 2026-10-13  
> **Phạm vi:** R03 & R03B (Catalog sản phẩm hợp nhất, Server Pagination, Single Writer Service, Trình biên tập Laptop 7 tabs có RichContentEditor, Lịch sử phiên bản & Khôi phục thành bản nháp, Quản trị Thương hiệu Brand D1, 3 trục trạng thái & Nhãn marketing, Khóa Legacy Writers 409, Bảo vệ Legacy & Order history). Chi tiết nghiệm thu V2 xem tại [R03B-V2-COMPLETION.md](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/R03B-V2-COMPLETION.md).

---

## 1. Mục tiêu & Vấn đề Cốt lõi Giải quyết trong R03

Trước R03, hệ thống tồn tại tình trạng phân mảnh nghiêm trọng:
1. **Song song 2 luồng quản lý và 2 màn hình riêng biệt:** `/admin/products` (Catalog truyền thống dạng bảng phẳng, giới hạn cứng 100 sản phẩm) và `/admin/product-studio` (Trình studio tài liệu JSON, danh sách rút gọn). Người vận hành bối rối không biết nên tạo và sửa ở đâu.
2. **Nguy cơ ghi đè và mất đồng bộ dữ liệu (Dual Writers):** Có tới 5 API routes legacy (`/api/products`, `/api/products/[id]`, `/api/products/metadata`, `/api/products/bulk-metadata`, `/api/products/[id]/versions/[versionId]`) cùng ghi vào bảng `Product`, trong khi `ProductStudio` ghi vào tài liệu JSON độc lập. Sửa ở Catalog cũ làm lệch dữ liệu Studio và ngược lại.
3. **Giới hạn cứng 100 sản phẩm:** `/api/products` và `/api/admin/product-studio` chỉ load tối đa 100 bản ghi (`LIMIT 100` hoặc hardcoded take: 100), không hỗ trợ server pagination khiến các sản phẩm thứ 101 trở đi bị "mất tích" trên giao diện quản trị.
4. **Rủi ro sản phẩm Legacy bị ẩn khỏi Storefront:** Khi nạp một sản phẩm cũ (chưa từng dùng Studio) vào trình biên tập mới, nếu lưu nháp (Save Draft), cơ chế cũ hoặc là không lưu được, hoặc sẽ ghi đè trạng thái khiến sản phẩm biến mất khỏi trang chủ và trang tìm kiếm của khách hàng.
5. **Rủi ro gãy lịch sử đơn hàng (`OrderItem`):** Thao tác xóa sản phẩm cũ có thể gây lỗi khóa ngoại hoặc xóa trắng dữ liệu liên kết với đơn hàng đã mua trong quá khứ.

---

## 2. Kiến trúc Catalog Hợp nhất (Unified Catalog Architecture)

### 2.1. Điểm vào duy nhất (Single Entry Point) & Điều hướng chuẩn hóa
- **Danh sách:** `/admin/products` — hiển thị toàn bộ Laptop và Phụ kiện với server-side pagination, bộ lọc phân loại nhanh (`Tất cả`, `Laptop`, `Phụ kiện`), bộ lọc nâng cao (Danh mục, Thương hiệu, Trạng thái xuất bản, Tình trạng kho hàng, Khoảng giá), tìm kiếm và sắp xếp có tie-breaker.
- **Thêm mới:** `/admin/products/new` — khởi tạo sản phẩm mới vào luồng Studio chuẩn.
- **Biên tập:** `/admin/products/[id]` — chỉnh sửa chi tiết với đầy đủ 6 tabs biên tập và snapshot history.
- **Xem trước:** `/admin/products/[id]/preview` — xem trước giao diện Storefront được bảo vệ bằng session admin, song song với Modal Preview tức thì ngay trong trang soạn thảo.
- **Deep-link Redirection:** `/admin/product-studio` và `/admin/product-studio?id=xyz` tự động chuyển hướng 307/client-redirect sang `/admin/products` và `/admin/products/[id]`, bảo toàn query param `id` nếu có.
- **Admin Sidebar:** Rút gọn còn 1 mục duy nhất "Sản phẩm" (`/admin/products`) dưới nhóm "Catalog & Sản phẩm", loại bỏ mục Studio trùng lặp.

### 2.2. Service Canonical Writer & Khóa Legacy Writers (HTTP 409)

| Tuyến API | Phương thức | Trạng thái trước R03 | Trạng thái sau R03 | Xử lý |
|---|---|---|---|---|
| `/api/admin/products` | `GET` | Chưa có | **CANONICAL** | Danh sách phân trang máy chủ (`catalogList`) |
| `/api/admin/products` | `POST` | Chưa có | **CANONICAL** | Tạo mới sản phẩm qua `writeStudio` |
| `/api/admin/products/[id]` | `GET` | Chưa có | **CANONICAL** | Chi tiết sản phẩm với Legacy Adoption on-read |
| `/api/admin/products/[id]` | `PUT` | Chưa có | **CANONICAL** | Cập nhật / Xuất bản / Thu hồi qua `writeStudio` |
| `/api/admin/products/[id]` | `DELETE` | Chưa có | **CANONICAL** | Xóa an toàn / Lưu trữ (`archiveProduct`) |
| `/api/products` | `POST` | Ghi trực tiếp `Product` | **LOCKED (409)** | Trả HTTP 409 `LEGACY_WRITER_DISABLED` |
| `/api/products/[id]` | `PATCH` | Ghi trực tiếp `Product` | **LOCKED (409)** | Trả HTTP 409 `LEGACY_WRITER_DISABLED` |
| `/api/products/[id]` | `DELETE` | Xóa cứng `Product` | **LOCKED (409)** | Trả HTTP 409 `LEGACY_WRITER_DISABLED` |
| `/api/products/bulk-metadata` | `PATCH` | Bulk ghi đè metadata | **LOCKED (409)** | Trả HTTP 409 `LEGACY_WRITER_DISABLED` |
| `/api/products/metadata` | `PATCH` | Bulk ghi đè metadata | **LOCKED (409)** | Trả HTTP 409 `LEGACY_WRITER_DISABLED` |
| `/api/products/[id]/versions/[vId]` | `PATCH` | Revert version cũ | **LOCKED (409)** | Trả HTTP 409 `LEGACY_WRITER_DISABLED` |
| `/api/products` | `GET` | Đọc danh sách | **PRESERVED** | Bảo toàn 100% cho Storefront search page (`/search`) |
| `/api/products/[id]` | `GET` | Đọc chi tiết | **PRESERVED** | Bảo toàn 100% cho Storefront PDP legacy fallback |
| `/api/products/metadata` | `GET` | Xuất export metadata | **PRESERVED** | Giữ nguyên cho báo cáo thống kê |

> [!IMPORTANT]
> Khi bất kỳ công cụ hoặc client cũ nào gọi vào các endpoint ghi đã khóa, hệ thống trả về mã lỗi HTTP 409 với cấu trúc rõ ràng:
> ```json
> {
>   "error": "Tuyến ghi dữ liệu sản phẩm cũ đã được vô hiệu hóa để bảo đảm tính nhất quán của Catalog.",
>   "code": "LEGACY_WRITER_DISABLED",
>   "canonicalEndpoint": "/api/admin/products"
> }
> ```

---

## 3. Cơ chế Bảo toàn Dữ liệu Legacy & Lịch sử Đơn hàng

### 3.1. Legacy Adoption on-read (Chuyển đổi tức thì khi xem)
Hàm `studioDetail(db, id)` trong `src/server/services/product-studio.service.ts`:
- Kiểm tra bảng `ProductStudio`: nếu đã có bản ghi Studio, trả về tài liệu draft và trạng thái xuất bản hiện tại.
- Nếu **chưa có bản ghi Studio** (sản phẩm legacy): tự động trích xuất các trường từ bảng `Product` (`name`, `slug`, `price`, `originalPrice`, `categoryId`, `brand`, `specs`, `images`, `description`, `contentHtml`, `seoTitle`, `seoDescription`) và biến thể từ `ProductVariant`, định dạng thành một `ProductDocument` tiêu chuẩn với `revision = 0`.
- **Tuyệt đối không chạy mutation ngầm vào database khi chỉ đọc.** Database chỉ được ghi khi người vận hành thực hiện thao tác Lưu nháp hoặc Xuất bản.

### 3.2. Legacy Adoption Guard khi Lưu nháp (Save Draft Invariant)
Khi một sản phẩm legacy đang kinh doanh (`status = 'ACTIVE'`) được mở ra và người vận hành bấm **Lưu nháp**:
- Tránh việc biến mất khỏi Storefront: `writeStudio` tự động lưu bản snapshot hiện tại của sản phẩm vào cột `published` của `ProductStudio` (thông qua `initialPublishedSnapshot`), trong khi bản sửa đổi mới được lưu vào `draft`.
- Kết quả: Khách hàng ngoài website tiếp tục thấy nội dung đang bán ổn định, còn quản trị viên có một bản nháp riêng biệt trong Admin để tiếp tục hoàn thiện.
- Khi người vận hành bấm **Xuất bản website**: bản `draft` mới được đồng bộ sang `published` và chiếu ngược (project) vào các cột tìm kiếm của bảng `Product`.

### 3.3. Tự động tính toán & Trích xuất Chỉ số Kỹ thuật (Spec Metrics Projection)
Hàm `parseSpecMetrics(specs)` tự động phân tích mảng thông số kỹ thuật (`CPU`, `RAM`, `SSD/Ổ cứng`, `Màn hình`, `Tần số quét`) và cập nhật đồng bộ các cột số liệu trên bảng `Product`:
- `ramGb`: Trích xuất số GB RAM (ví dụ: `16GB DDR5` -> `16`).
- `storageGb`: Trích xuất dung lượng ổ cứng (ví dụ: `512GB NVMe` -> `512`, `1TB` -> `1024`).
- `screenSize`: Kích thước màn hình tính theo inch (ví dụ: `16.0 inch WQXGA` -> `16.0`).
- `refreshRate`: Tần số quét màn hình (ví dụ: `165Hz` -> `165`).

### 3.4. Bảo vệ Lịch sử Đơn hàng (`archiveProduct`)
- Khi người quản trị chọn Xóa/Ẩn sản phẩm: hàm `archiveProduct(db, id)` kiểm tra sự tồn tại của sản phẩm trong bảng `OrderItem`.
- Nếu sản phẩm **đã từng phát sinh đơn hàng**: hệ thống tự động chuyển sang chế độ **Soft-delete** (`status = 'ARCHIVED'`, `deletedAt = CURRENT_TIMESTAMP`, `published = NULL`), không xóa cứng bản ghi để bảo đảm tính toàn vẹn của lịch sử mua hàng, hóa đơn và doanh thu.
- Ghi log hành động vào `ProductEditLog`.

---

## 4. Trình Biên Tập Laptop Chuẩn Hóa (Product Editor)

Được cấu trúc thành 6 tabs nghiệp vụ mạch lạc, áp dụng hoàn toàn hệ thống Design Tokens và Admin UX Primitives của R02:

1. **Tab 1 — Thông tin chung:** Tên sản phẩm, đường dẫn SEO (slug auto-generate tiếng Việt không dấu), danh mục, thương hiệu, tình trạng hàng (`Sẵn hàng`, `Đặt trước`, `Liên hệ`, `Hết hàng`).
2. **Tab 2 — Thông số kỹ thuật (Specs):** Phân loại template (`Laptop`, `Chuột Gaming`, `Phụ kiện`, `Công nghệ`). Hỗ trợ sẵn các trường thông số chính của Laptop (CPU, GPU, RAM, Ổ cứng SSD, Màn hình, Pin, Trọng lượng, Hệ điều hành...) với gợi ý placeholder chuẩn và nút thêm thông số tùy chỉnh.
3. **Tab 3 — Cấu hình & Giá (Variants & Pricing):** Giá niêm yết, giá hãng/gốc (tính % giảm giá tự động), quản lý danh sách cấu hình/biến thể (SKU, giá, chênh lệch giá, bảo hành, tình trạng NEW/LIKE NEW).
4. **Tab 4 — Hình ảnh & Video (Media Library Cloudflare R2):** Tích hợp trực tiếp Media Library của CitiLap. Thêm/gỡ ảnh bằng Media Picker, gắn ảnh đại diện, kiểm tra ảnh tồn tại trên R2 và bắt buộc có alt text khi xuất bản.
5. **Tab 5 — Bài giới thiệu (HTML Article):** Trình soạn thảo bài viết đánh giá chi tiết sản phẩm với tính năng làm sạch HTML an toàn (`sanitizeHtml`).
6. **Tab 6 — SEO & Hiển thị:** Tiêu đề SEO, mô tả Meta description, bộ đếm ký tự khuyến nghị và hộp xem trước giao diện hiển thị trên Google Search.

---

## 5. Kết Quả Kiểm Chứng & Bằng Chứng Tự Động (Verification Gates)

### 5.1. Bảng Tổng hợp Kết quả Kiểm thử

| Bộ kiểm thử | File kịch bản | Số lượng test | Kết quả | Ghi chú |
|---|---|---|---|---|
| **TypeScript Typecheck** | `npx.cmd tsc --noEmit` | Toàn bộ dự án | **PASS (Code 0)** | 0 lỗi kiểu dữ liệu |
| **Cloudflare Build Bundle** | `scripts/build-verify.mjs` | Bundle worker | **PASS (Code 0)** | ESBuild bundle hợp lệ |
| **Catalog Thống Nhất & Nghiệp vụ** | `scripts/test-unified-catalog.mjs` | 12 tests | **12/12 PASS** | Pagination > 100, filters, legacy guard, metrics |
| **Khóa Tuyến Legacy Writer** | `scripts/test-legacy-writer-locks.mjs` | 8 tests | **8/8 PASS** | Khóa 409 POST, PATCH, DELETE, bulk, versions |
| **Browser QA Verification (Edge)** | `scripts/test-unified-catalog-browser.mjs` | 13 flows | **13/13 PASS** | 1440px, 768px, 390px, 0 JS errors, 5 screenshots |
| **Hồi quy Product Studio** | `scripts/test-product-studio.mjs` | 12 tests | **12/12 PASS** | Concurrency, revisions, R2 asset guards |
| **Hồi quy CMS Contracts** | `scripts/test-cms-contracts.mjs` | 9 tests | **9/9 PASS** | Dynamic storefront CMS contracts |
| **Hồi quy Publication Correctness** | `scripts/test-publication-correctness.mjs` | 8 tests | **8/8 PASS** | Draft isolation & published immutability |
| **Hồi quy Navigation** | `scripts/test-navigation.mjs` | 16 tests | **16/16 PASS** | Deep links & header/footer navigation |
| **Hồi quy Media Library** | `scripts/test-media-library.mjs` | 16 tests | **16/16 PASS** | R2 bucket operations & quota |
| **Hồi quy Storefront Order Guard** | `scripts/test-storefront-cms-order-guard.mjs` | 5 tests | **5/5 PASS** | Anti-drift order safeguards |
| **Hồi quy Settings & Reliability** | `scripts/test-settings*.mjs` | 22 tests | **22/22 PASS** | Disk persistence, HTTP routes, schema validation |
| **TỔNG CỘNG TẤT CẢ** | **13 test suites** | **121 tests** | **121/121 PASS** | **100% Hoàn hảo** |

### 5.2. Danh sách Ảnh chụp Browser QA Đã Lưu

Toàn bộ ảnh chụp màn hình được lưu trữ tại `docs/screenshots/admin03/`:
- `catalog-1440.png`: Bảng danh mục sản phẩm trên Desktop 1440px với thanh tìm kiếm, bộ lọc phân loại, phân trang máy chủ và các chỉ số trạng thái.
- `catalog-768.png`: Bảng danh mục hiển thị trên máy tính bảng Tablet 768px (không bị tràn ngang `scrollWidth <= innerWidth`).
- `catalog-390.png`: Giao diện danh mục trên Mobile 390px (co giãn hoàn hảo, hỗ trợ cuộn bảng an toàn).
- `editor-1440.png`: Trình biên tập Laptop với 6 tabs nghiệp vụ, nhập thông số kỹ thuật, giá và thông báo thành công khi lưu nháp.
- `preview-1440.png`: Hộp thoại xem trước sản phẩm (Draft Preview Modal) hiển thị bố cục chuẩn của Storefront.
- `verification.json`: Báo cáo dữ liệu chứng thực tự động từ Microsoft Edge headless.

---

## 6. Hướng Dẫn Chuyển Tiếp Sang R04 (Phụ Kiện & Linh Kiện)

Với nền tảng vững chắc của R03, toàn bộ hạ tầng Catalog và Service đã sẵn sàng cho R04:
1. `kind = 'ACCESSORY'` đã được kích hoạt trong service `catalogList` và bộ lọc nhanh.
2. Template `MOUSE`, `ACCESSORY`, `TECH` đã được tích hợp trong contract `attributeTemplates`.
3. R04 chỉ cần bổ sung bộ thông số đặc thù cho phụ kiện (chuột, bàn phím, tai nghe, màn hình rời) và hoàn thiện giao diện biến thể màu sắc/kết nối.
