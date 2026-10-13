# R00 — Báo Cáo Hiện Trạng & Xác Lập Baseline CMS Admin CitiLap

**Ngày thực hiện:** 2026-10-12  
**Giai đoạn:** R00 — Kiểm kê hiện trạng và xác lập baseline  
**Quy tắc:** Chỉ khảo sát, kiểm chứng và lập tài liệu. Không sửa code ứng dụng, không sửa schema, không migrate DB trong giai đoạn này.

---

## 1. Khảo Sát Workspace & Git History

### 1.1. So sánh hai Workspace

| Tiêu chí | `C:\Users\Admin\Desktop\citilap-web2` (StoreFront & Integrated) | `C:\Users\Admin\Desktop\citilap-web2-admin` (Admin worktree cũ) |
|---|---|---|
| **Branch hiện tại** | `master` | `feature/admin-cms-foundation` |
| **Commit HEAD** | `3694c01` (*"update UI storefront"*) | `fdf0b35` (*"feat(admin): add CMS foundation, media, product and navigation studios"*) |
| **Trạng thái Git** | Có file untracked: `?? .design/`, `?? docs/admin/ADMIN-CMS-MASTER-PLAN.md` | `working tree clean` |
| **Lịch sử tích hợp** | Nhận commit `fdf0b35` từ branch `feature/admin-cms-foundation` qua merge commit `5701993` (*"Merge admin CMS into storefront master for local testing"*). Sau đó có thêm 3 commit: `c550b08`, `0222154`, `3694c01`. | Dừng lại ở commit `fdf0b35` (chưa có các bản vá tích hợp sau merge). |
| **Dev server đang chạy** | Có tiến trình `npm run dev:cloudflare` đang chạy trên cổng 3001. | Không có tiến trình chạy. |

### 1.2. Quyết định Workspace làm việc
- **Workspace được chọn làm việc duy nhất:** `C:\Users\Admin\Desktop\citilap-web2` (branch `master`, HEAD `3694c01`).
- **Căn cứ kỹ thuật:** `citilap-web2` chứa toàn bộ mã nguồn Admin CMS foundation (`0009`–`0011` migrations, media library, product studio, navigation studio) đã được merge từ worktree admin, đồng thời chứa các bản vá tích hợp resolver URL ảnh sau merge (`c550b08`), hoàn thiện hệ sinh thái phụ kiện & route collection (`0222154`), và tinh chỉnh UI Storefront + Settings (`3694c01`).
- **Bảo toàn trạng thái:** Giữ nguyên các file untracked `.design/` và `docs/admin/ADMIN-CMS-MASTER-PLAN.md`. Không checkout, reset, stash hay clean working tree.

---

## 2. Tóm Tắt Hiện Trạng Kiến Trúc

1. **Stack & Runtime:**
   - Framework: Next.js 16 (App Router), React 19, TypeScript 5.
   - Deploy & Runner: Vite / Vinext trên Cloudflare Pages & Workers runtime.
   - Cơ sở dữ liệu: SQLite / Cloudflare D1 với Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-d1`).
   - Storage Media: Cloudflare R2 bucket (`PRODUCT_MEDIA`).
2. **Admin Shell:**
   - Component chính: `src/app/admin/layout.tsx`.
   - Sidebar hiện tại gồm 10 mục: Thư viện ảnh & video (`/admin/media`), Tổng quan (`/admin/dashboard`), Đơn hàng (`/admin/orders`), Quản lý sản phẩm (`/admin/products`), Product Studio (`/admin/product-studio`), Danh mục (`/admin/categories`), Menu & bộ sưu tập (`/admin/navigation`), Hộp thư liên hệ (`/admin/contacts`), Khách hàng (`/admin/customers`), Cấu hình & Giao diện (`/admin/settings`).
   - Tồn tại sự trùng lặp và phân mảnh điều hướng: người dùng phải chọn giữa "Quản lý sản phẩm" và "Product Studio"; `/admin/categories` thực chất là cùng một view với `/admin/navigation`.
3. **Bảo mật & Phân quyền:**
   - Middleware (`src/middleware.ts`): Chỉ guard route URL dạng `/admin/:path*` thông qua cookie `admin_session` có chữ ký HMAC-SHA256 (`ADMIN_API_TOKEN`).
   - **Lỗ hổng cốt lõi:** Middleware hoàn toàn KHÔNG match `/api/*`. Các API route phải tự gọi guard server-side. Trong khi các API CMS mới (`product-studio`, `navigation`, `media`) và legacy product CRUD đều gọi `requireAdminMutation(request)`, riêng endpoint `POST /api/admin/settings` hoàn toàn thiếu auth và CSRF guard.
4. **Trạng thái kết nối StoreFront:**
   - Storefront layout (`Header`, `Footer`, `MobileBottomNav`) và các trang (`PDP`, `Category`, `Collection`, `HotSale`) đã kết nối với service CMS qua `src/server/services/storefront-cms.service.ts`.
   - Tuy nhiên, cơ chế fallback đang nuốt cả lỗi 404 và 503, khiến sản phẩm đã ẩn có nguy cơ bị lộ lại thông qua catalog legacy.

---

## 3. Kiểm Kê Toàn Bộ Màn Hình & Route Admin (Route Inventory)

| URL | File / Component chính | Mục đích nghiệp vụ | API / Service sử dụng | Nguồn lưu dữ liệu | Nơi hiển thị StoreFront | Trạng thái kỹ thuật | Quyết định đề xuất | Bằng chứng file:dòng |
|---|---|---|---|---|---|---|---|---|
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | Xem thống kê doanh thu, đơn hàng, biểu đồ, trigger cron scheduler | `GET /api/dashboard`, `POST /api/cron/publish-scheduler` | Prisma `Order`, `Product`, `User` (hoặc mock nếu thiếu DATABASE_URL) | Không hiển thị trực tiếp | Hoạt động một phần; nếu không có DATABASE_URL trả mock ngẫu nhiên; đếm status lệch enum D1 (`'Chờ xác nhận'` vs `'PENDING'`) | **Hợp nhất**: Thay các chỉ số doanh thu giả bằng dashboard "Việc cần làm" (đơn mới, nháp cần duyệt, media thiếu) | [dashboard/page.tsx:54](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/dashboard/page.tsx#L54), [dashboard/route.ts:68](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/dashboard/route.ts#L68) |
| `/admin/products` | `src/app/admin/products/page.tsx` | Danh sách sản phẩm legacy, bộ lọc, bulk update metadata, import/export JSON | `GET /api/products`, `PATCH /api/products/bulk-metadata`, `GET/PATCH /api/products/metadata`, `DELETE /api/products/:id` | Bảng `Product`, `ProductImage` (Prisma/D1) | Listing `/category/:slug`, Homepage, PDP | Hoạt động độc lập nhưng xung đột với Product Studio (bị 409 nếu sửa SP đã vào Studio) | **Thay thế / Hợp nhất**: Hợp nhất vào màn hình Catalog thống nhất (`/admin/laptops` & `/admin/accessories`), chuyển writer sang Studio service | [products/page.tsx:55](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/products/page.tsx#L55), [bulk-metadata/route.ts:32](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/products/bulk-metadata/route.ts#L32) |
| `/admin/products/new` | `src/app/admin/products/new/page.tsx` | Form tạo sản phẩm legacy | `POST /api/products`, `GET /api/categories` | Bảng `Product`, `ProductImage` | Card sản phẩm, PDP | Hoạt động nhưng tạo sản phẩm không có `ProductStudio` document/revision | **Thay thế**: Đóng route, chuyển hướng sang form Studio tạo Laptop/Phụ kiện mới | [products/new/page.tsx:67](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/products/new/page.tsx#L67), [products/route.ts:115](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/products/route.ts#L115) |
| `/admin/products/[id]` | `src/app/admin/products/[id]/page.tsx` | Form sửa sản phẩm legacy, quản lý cấu hình, versions, lịch sử edit | `GET/PATCH /api/products/:id`, `GET/POST /api/products/:id/versions`, `PATCH /api/products/:id/versions/:vid` | Bảng `Product`, `ProductVariant`, `ProductVersion`, `ProductEditLog` | PDP `/product/:id` | Bị trả HTTP 409 nếu sản phẩm đã có bản ghi trong `ProductStudio` | **Thay thế**: Chuyển hướng sang Product Studio tương ứng theo ID sản phẩm | [products/[id]/page.tsx:67](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/products/%5Bid%5D/page.tsx#L67), [products/[id]/route.ts:117](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/products/%5Bid%5D/route.ts#L117) |
| `/admin/product-studio` | `src/app/admin/product-studio/page.tsx`, `ProductStudio.tsx` | Quản lý sản phẩm toàn diện: Laptop & Phụ kiện, cấu hình, media, bảo hành, trạng thái bán, nháp & xuất bản | `GET/POST /api/admin/product-studio`, `GET/PUT /api/admin/product-studio/:id` | Bảng `ProductStudio`, `ProductStudioRevision`, `MediaUsage`, `Product` projection (D1) | `/api/catalog/studio/:slug`, PDP `/product/:slug`, Card sản phẩm | Đã kết nối và kiểm chứng service (12/12 PASS); giới hạn 100 sản phẩm trong query list | **Giữ & Phát triển**: Làm nền tảng chuẩn duy nhất cho biên tập Laptop và Phụ kiện; bổ sung server-side pagination và mẫu phụ kiện | [ProductStudio.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/admin/products/ProductStudio.tsx), [product-studio.service.ts:8](file:///c:/Users/Admin/Desktop/citilap-web2/src/server/services/product-studio.service.ts#L8) |
| `/admin/categories` | `src/app/admin/categories/page.tsx` | Quản lý danh mục (mở tab Danh mục trong NavigationStudio) | `GET /api/admin/navigation`, `PUT /api/admin/navigation` | Bảng `NavigationStudio`, `NavigationRevision`, `Category` (D1) | Menu Header, drawer mobile, Category Showcase, Listing | Hoạt động; mutation cũ `/api/categories` đã chặn 409 | **Hợp nhất**: Tách thành màn hình chuyên biệt "Danh mục" nhưng dùng chung persistence với Navigation aggregate | [categories/page.tsx:2](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/categories/page.tsx#L2), [navigation.service.ts:58](file:///c:/Users/Admin/Desktop/citilap-web2/src/server/services/navigation.service.ts#L58) |
| `/admin/navigation` | `src/app/admin/navigation/page.tsx`, `NavigationStudio.tsx` | Quản lý Menu (chính, footer), Danh mục và Bộ sưu tập sản phẩm | `GET /api/admin/navigation`, `PUT /api/admin/navigation`, `GET /api/admin/navigation/products`, `POST /api/admin/navigation/preview` | Bảng `NavigationStudio`, `NavigationRevision`, `Category`, `MediaUsage` (D1) | Header, Footer, MobileNav, CategoryGrid, `/collection/:slug` | Đã kết nối và kiểm chứng service (16/16 PASS); lưu và xuất bản toàn bộ cấu trúc trong một aggregate | **Giữ & Phát triển**: Giữ atomic publication aggregate ở backend, tách các tab thành sub-pages rõ ràng trên sidebar | [NavigationStudio.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/admin/navigation/NavigationStudio.tsx), [navigation.service.ts:14](file:///c:/Users/Admin/Desktop/citilap-web2/src/server/services/navigation.service.ts#L14) |
| `/admin/media` | `src/app/admin/media/page.tsx`, `MediaBrowser.tsx`, `MediaEditor.tsx` | Thư viện media tập trung: tải ảnh lên R2, thêm link YouTube, xem nơi sử dụng, sửa alt/metadata, lưu trữ/phục hồi | `GET/POST /api/admin/media`, `PATCH /api/admin/media/:id`, `GET /api/library/:id` | Bảng `MediaAsset`, `MediaUsage`, Cloudflare R2 bucket `PRODUCT_MEDIA` | Mọi ảnh/video sản phẩm, danh mục, banner trên website | Đã kết nối và kiểm chứng service (16/16 PASS); ngăn archive asset đang được dùng | **Giữ & Phát triển**: Làm media picker dùng chung cho toàn bộ CMS (sản phẩm, tin tức, banner, layout) | [media/page.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/media/page.tsx), [media-library.service.ts:48](file:///c:/Users/Admin/Desktop/citilap-web2/src/server/services/media-library.service.ts#L48) |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | Cấu hình cửa hàng, hotline, flash sale, banner trang chủ, cam kết dịch vụ, thanh toán | `GET/POST /api/admin/settings` | Biến in-memory `cachedSettings` trong tiến trình + fallback `localStorage` | HeroSection, ContactSection, FeatureStrip, BrandSection, Footer, HotSale | **Nguy cơ cao**: API không lưu D1, không auth/CSRF; UI báo thành công khi lỗi server; bug return sớm khiến loading spinner kẹt vô tận | **Thay thế**: Tạo bảng `SiteSettings` trên D1 có revision/audit/CSRF; sửa triệt để loading bug và alert thành công giả | [settings/page.tsx:39](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/settings/page.tsx#L39), [settings/route.ts:113](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/admin/settings/route.ts#L113) |
| `/admin/orders` | `src/app/admin/orders/page.tsx` | Danh sách yêu cầu đặt hàng, lọc trạng thái, tìm kiếm, xuất CSV, đánh dấu hoàn thành | `GET /api/orders`, `PUT /api/orders/:id` | Bảng `Order`, `OrderItem` (Prisma/D1) | Không public (chỉ khách tra cứu đơn qua token) | Hoạt động; chỉ hỗ trợ 2 trạng thái PENDING và COMPLETED; xuất CSV client-side | **Giữ & Nâng cấp**: Giữ luồng tiếp nhận, mở rộng enum và quy trình xử lý đơn hàng, thêm ghi chú nội bộ | [orders/page.tsx:43](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/orders/page.tsx#L43), [orders/route.ts](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/orders/route.ts) |
| `/admin/orders/[id]` | `src/app/admin/orders/[id]/page.tsx` | Chi tiết yêu cầu đặt hàng: khách hàng, địa chỉ, sản phẩm snapshot, chuyển trạng thái | `GET /api/orders/:id`, `PUT /api/orders/:id` | Bảng `Order`, `OrderItem` snapshot | Không public (customer view cần token hash) | Hoạt động; hiển thị snapshot giá và thông tin SP chính xác lúc đặt | **Giữ & Nâng cấp**: Bổ sung lịch sử thay đổi (timeline), phân công người xử lý, ghi chú nội bộ | [orders/[id]/page.tsx:68](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/orders/%5Bid%5D/page.tsx#L68), [orders/[id]/route.ts:100](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/orders/%5Bid%5D/route.ts#L100) |
| `/admin/contacts` | `src/app/admin/contacts/page.tsx` | Danh sách hộp thư liên hệ tư vấn từ khách hàng | `GET /api/admin/contacts`, `PATCH /api/admin/contacts/:id` | Bảng `ContactSubmission` (D1) | Form liên hệ Storefront `/contact`, `/lien-he` | Hoạt động đã kết nối; có phân trang và đổi trạng thái PENDING/HANDLED | **Giữ**: Đặt liền kề module Đơn hàng trong nhóm "Tiếp nhận yêu cầu" | [contacts/page.tsx:30](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/contacts/page.tsx#L30), [contact.service.ts](file:///c:/Users/Admin/Desktop/citilap-web2/src/server/services/contact.service.ts) |
| `/admin/customers` | `src/app/admin/customers/page.tsx` | Danh sách tài khoản người dùng, phân hạng (Vàng/Bạc/Mới), tổng chi tiêu, xuất CSV | `GET /api/customers` | Bảng `User` (hoặc mock nếu thiếu DATABASE_URL) | Trang cá nhân `/profile` | Hoạt động mức tra cứu; nếu thiếu DB trả mock | **Hợp nhất**: Ẩn khỏi sidebar cấp 1 (thông tin khách đã nằm trong chi tiết đơn hàng); đưa vào Cài đặt / Quản trị tài khoản | [customers/page.tsx:38](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/admin/customers/page.tsx#L38), [customers/route.ts:21](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/api/customers/route.ts#L21) |
| Tin tức / Bài viết | Chưa có route Admin | Quản lý tin tức công nghệ, review, cẩm nang mua sắm | Chưa có API admin | Chưa có bảng lưu trữ (Storefront đang hardcode tĩnh) | `/news` (danh sách & featured) | **Thiếu hoàn toàn**: Cần xây dựng mới từ schema đến UI | **Bổ sung mới (R05)**: Tạo `ContentEntry` / `ContentRevision`, rich-text editor, danh mục bài viết và public renderer | [news/page.tsx:11-64](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/%28shop%29/news/page.tsx#L11-L64) |

---

## 4. Báo Cáo Kiểm Chứng 12 Nghi Vấn Kỹ Thuật

Dưới đây là kết quả đối soát trực tiếp trên HEAD `3694c01`:

| STT | Nghi vấn kỹ thuật | Kết luận | Bằng chứng source code | Chi tiết mô tả |
|---|---|---|---|---|
| 1 | **Hai luồng quản lý sản phẩm cũ và Product Studio** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/admin/layout.tsx:36-37`, `src/app/api/products/route.ts:115`, `src/app/api/admin/product-studio/route.ts` | Sidebar hiển thị cả "Quản lý sản phẩm" lẫn "Product Studio". Tạo mới ở `/admin/products/new` gọi `POST /api/products` (chỉ tạo `Product`, không tạo `ProductStudio` document). Khi vào Product Studio, SP cũ được tổng hợp dữ liệu tạm thời. Tồn tại hai luồng ghi song song với cơ chế dữ liệu khác nhau. |
| 2 | **Product Studio chỉ lấy 100 sản phẩm gần nhất** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/server/services/product-studio.service.ts:8` | Câu lệnh SQL lấy danh sách có mệnh đề cứng: `ORDER BY p.updatedAt DESC LIMIT 100`. Người dùng không thể tìm hoặc biên tập sản phẩm thứ 101 trở đi nếu tên không khớp query LIKE. |
| 3 | **Settings API dùng cachedSettings trong bộ nhớ tiến trình** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/api/admin/settings/route.ts:113, 126` | Khai báo `let cachedSettings: StorefrontSettings = { ...DEFAULT_SETTINGS };`. Mọi thay đổi qua `POST /api/admin/settings` chỉ gán vào biến RAM này. Dữ liệu mất sạch khi server restart hoặc desync trên kiến trúc đa instance / Cloudflare Workers edge. |
| 4 | **Settings UI fallback localStorage nhưng báo thành công** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/admin/settings/page.tsx:84-86` | Trong `handleSave`, nếu `fetch` bị lỗi (máy chủ sập hoặc mất mạng), khối `catch` gọi: `setMessage({ type: "success", text: "Đã lưu cài đặt trên trình duyệt (chế độ dự phòng)." })`. Giao diện hiện thông báo màu xanh `CheckCircle2` gây hiểu lầm cho người vận hành rằng dữ liệu đã được lưu thành công trên hệ thống. |
| 5 | **Nhánh tải settings thành công không reset loading** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/admin/settings/page.tsx:37-41, 53-55` | Trong `useEffect`, nếu `res.ok && json.success`, code thực hiện: `setSettings(...); return;`. Lệnh `return` này nhảy thoát khỏi hàm TRƯỚC KHI chạy khối try/catch thứ hai, nơi duy nhất có `finally { setLoading(false) }`. Khi API hoạt động bình thường, state `loading` giữ nguyên `true` và màn hình bị treo ở spinner "Đang tải cấu hình Storefront..."! |
| 6 | **Settings mutation thiếu auth/CSRF guard ở endpoint** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/api/admin/settings/route.ts:122-142` | Hàm `export async function POST(request: Request)` hoàn toàn không gọi `requireAdmin`, `requireAdminMutation` hoặc kiểm tra token/cookie nào. Bất kỳ ai gửi HTTP POST tới endpoint này đều có thể thay đổi cấu hình hotline, banner, tài khoản ngân hàng. |
| 7 | **Middleware bảo vệ trang Admin nhưng chưa chắc bảo vệ API** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/middleware.ts:38` | Biến `config.matcher = ["/admin/:path*"]`. Middleware chỉ chặn truy cập các trang UI trình duyệt, hoàn toàn bỏ qua toàn bộ các route `/api/*`. Các API endpoint bắt buộc phải tự triển khai guard; nếu endpoint nào quên (như Settings API nêu trên), nó sẽ bị mở công khai. |
| 8 | **News dùng nội dung hard-code** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/(shop)/news/page.tsx:11-64` | `featuredArticle` và mảng 6 bài viết `articles` được hardcode trực tiếp dưới dạng biến JavaScript trong file component. Hoàn toàn không có truy vấn cơ sở dữ liệu, không có trang chi tiết theo slug, không có màn hình quản trị bài viết. |
| 9 | **Navigation/menu/category/collection publish chung một aggregate** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/server/services/navigation.service.ts:14, 50-60` | Toàn bộ danh mục, bộ sưu tập và menu chính/footer được lưu trong một tài liệu JSON duy nhất tại bảng `NavigationStudio` với `id='site'`, có chung số `revision`. Khi nhấn xuất bản, toàn bộ thay đổi của cả 3 cấu trúc này được commit trong cùng 1 batch D1 transaction. |
| 10 | **StoreFront gộp lỗi 404 và 503 thành fallback** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/server/services/storefront-cms.service.ts:13` | Hàm `publishedOrNull` bắt lỗi: `if (error instanceof MediaError && (error.status === 404 \|\| error.status === 503)) return null;`. Cả trường hợp không tìm thấy bản xuất bản (404) lẫn lỗi sập hạ tầng/DB (503) đều bị nuốt và trả về `null`. |
| 11 | **Sản phẩm đã ẩn có khả năng bị đọc lại từ catalog legacy** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/(shop)/product/[id]/page.tsx:117-131` | Trên trang PDP, `getProductDetail(id)` truy vấn bảng `Product`. Sau đó `getPublishedStudio(product.slug)` được gọi. Nếu một sản phẩm bị ẩn hoặc gặp lỗi 503 khiến Studio trả về `null`, code rơi vào nhánh fallback: lấy ảnh từ `product.images`, giá từ `product.price`, tình trạng còn hàng từ `product.stock > 0`, hiển thị lại dữ liệu legacy thay vì trả về 404 Not Found (fail-closed). |
| 12 | **Order hiện chỉ có PENDING/COMPLETED** | **ĐÃ XÁC NHẬN BẰNG SOURCE** | `src/app/api/orders/[id]/route.ts:100-111` | Endpoint cập nhật trạng thái đơn chỉ chấp nhận 2 giá trị: `PENDING` ("Chờ xác nhận" / "Đang xử lý") và `COMPLETED` ("Đã hoàn thành"). Gửi bất kỳ trạng thái nào khác đều bị trả HTTP 400. Không có trạng thái Đang giao hàng, Đã hủy, Hoàn trả hay lý do từ chối. |

---

## 5. Đánh Giá Khả Năng Kế Thừa & Đề Xuất Kiến Trúc

### 5.1. Những gì đã có thể giữ lại
1. **Media Library (`MediaAsset`, `MediaUsage`, upload pipeline):**
   - Đã kiểm chứng 16/16 test PASS.
   - Quản lý R2, tracking usage theo từng revision, ngăn xóa ảnh đang dùng, hỗ trợ URL YouTube chuẩn hóa.
   - Sẵn sàng tái sử dụng làm Image/Video Picker cho toàn hệ thống CMS.
2. **Navigation Studio Aggregate (`NavigationStudio`, `NavigationRevision`):**
   - Đã kiểm chứng 16/16 test PASS.
   - Mô hình atomic aggregate cho điều hướng hoạt động tin cậy, ngăn chặn tình trạng menu trỏ tới danh mục chưa xuất bản.
   - Tương thích tốt với bảng `Category` hiện tại.
3. **Product Studio Core Service & Contracts (`src/contracts/cms/product-studio.ts`):**
   - Đã kiểm chứng 12/12 test PASS.
   - Hỗ trợ lưu nháp, xuất bản, ẩn khỏi web, quản lý gallery ảnh/video, thông số kỹ thuật và gói bảo hành.
4. **Order Snapshot & Idempotency Guard (`order.service.ts`, `storefront-order-guard.ts`):**
   - Lưu trữ bất biến snapshot tên, SKU, giá tại thời điểm đặt hàng.
   - Đã có CSPRNG confirmation token hash bảo mật dữ liệu khách hàng.

### 5.2. Những thành phần cần xử lý khẩn cấp (P0)
1. **Cứu hộ module Cài đặt (`/admin/settings`):**
   - Sửa ngay bug loading spinner treo vĩnh viễn trên UI.
   - Bỏ thông báo thành công giả khi lưu thất bại.
   - Thêm bảng D1 `SiteSettings` có version và audit log.
   - Thêm `requireAdminMutation` và CSRF protection cho `POST /api/admin/settings`.
2. **Bảo vệ toàn vẹn dữ liệu Catalog:**
   - Ngăn chặn lỗi 503 nuốt thành fallback catalog legacy trên Storefront. Triển khai nguyên tắc **Fail-Closed** cho sản phẩm đã ẩn.
   - Ngắt các ngõ ghi trực tiếp của editor cũ (`/admin/products/new`, `/admin/products/[id]`, bulk edit, import, version restore) bằng mã phản hồi HTTP 409 hướng dẫn chuyển sang Studio, tương tự như đã làm thành công với `legacyCategoryMutation`.
   - Vô hiệu hóa hoặc cập nhật `cron/publish-scheduler` để không ghi đè trạng thái `active` lên `Product` mà bỏ qua `ProductStudio`.
3. **Mở rộng Server Pagination cho Catalog:**
   - Xóa bỏ giới hạn cứng `LIMIT 100` trong `product-studio.service.ts`.
   - Cung cấp query phân trang `page`, `pageSize`, `search`, `category`, `status` đầy đủ từ server.
