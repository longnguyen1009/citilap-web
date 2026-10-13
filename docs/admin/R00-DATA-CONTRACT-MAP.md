# R00 — Ma Trận Ánh Xạ Dữ Liệu & Quy Ước Hợp Đồng (Data Contract Map)

**Ngày thực hiện:** 2026-10-12  
**Mục tiêu:** Ánh xạ tường minh từ Giao diện Admin → Lưu trữ Chuẩn (Persistence) → DTO Công Khai → Component StoreFront tiêu thụ; xác lập các quy ước về ID, SKU, Slug, URL và trạng thái vòng đời dữ liệu để bảo đảm tương thích hệ thống.

---

## 1. Ma Trận Admin → Dữ Liệu → StoreFront (Field Mapping)

| Nhóm trường | Trường cụ thể | Nơi chỉnh sửa Admin | Nguồn lưu chuẩn (Canonical Source) | Validation | Public DTO | Component tiêu thụ StoreFront | Quản lý Draft / Publish | Khoảng thiếu hiện tại (Gaps) |
|---|---|---|---|---|---|---|---|---|
| **Định danh & Phân loại** | `name`, `slug`, `brand`, `categoryId`, `template` (kind) | Tab Thông tin chung trong Product Studio (`ProductStudio.tsx`) | `ProductStudio.draft` (JSON document), ánh xạ sang bảng `Product` khi xuất bản | Zod strict schema (`productStudioSchema`), slug regex không dấu, chặn slug trùng | `GET /api/catalog/studio/:slug` -> `{ name, slug, brand, categoryId, template }` | `PDP` (`ProductDetailPage`), `ProductCard`, `CategoryGridSection`, breadcrumb | Draft lưu trong `ProductStudio.draft`; public chỉ nhận khi `action='publish'` | Chưa có phân cấp Danh mục riêng biệt theo Laptop vs Phụ kiện; `brand` hiện là text tự do thay vì quan hệ với bảng `Brand`. |
| **Thông số kỹ thuật & Bộ lọc** | `specs[]` (cặp key-value: CPU, GPU, RAM, SSD, Màn hình, DPI...) | Tab Thông số kỹ thuật trong Product Studio | Mảng `specs: [{key, value}]` trong `ProductStudio.draft`, trích xuất các cột chuẩn `cpu`, `gpu`, `ram`, `storage`, `display` trên `Product` | Danh sách template theo loại hàng (LAPTOP, MOUSE, KEYBOARD...) | `specs: [{key, value}]` trên Studio DTO; các cột `Product.*` trên listing query | `ProductSpecsTable.tsx`, `SpecChip.tsx`, bảng thông số PDP, bộ lọc sidebar listing (`MobileFilterDrawer.tsx`) | Tách biệt hoàn toàn: draft không ảnh hưởng bảng thông số đang hiển thị | **Field chưa có consumer thật:** Các thông số phụ kiện (DPI, switch, layout...) đã nhập được trong Studio nhưng StoreFront filter listing chưa hỗ trợ filter theo các trường này; chỉ mới hỗ trợ filter theo danh mục slug. |
| **Giá bán, Cấu hình & Biến thể** | `price`, `originalPrice`, `variants[]` (`sku`, `name`, `condition`, `price`, `ram`, `storage`, `gpu`) | Tab Cấu hình & Giá trong Product Studio | `variants[]` trong `ProductStudio`, projection sang bảng `ProductVariant` khi publish | `price >= 0`, `originalPrice >= price`, SKU không được trùng nhau, kiểm tra kiểu số nguyên | Studio DTO: `price`, `originalPrice`, `variants[]` | `StudioPurchaseSection.tsx`, `ProductCard.tsx`, Giỏ hàng (`cart`), Đặt hàng (`checkout`) | Giá nháp lưu trong draft; public chỉ đổi giá khi xuất bản. Đơn hàng lưu snapshot giá bất biến. | Chưa hỗ trợ biến thể thuộc tính riêng của phụ kiện (như Màu sắc, Chuẩn kết nối, Công suất W); hiện tại form biến thể vẫn mang các trường RAM/Storage của laptop. |
| **Bảo hành & Trạng thái bán** | `warranties[]` (`name`, `description`, `adjustment`, `recommended`), `availability` (`AVAILABLE`, `PREORDER`, `CONTACT`, `UNAVAILABLE`) | Tab Bảo hành & Bán hàng trong Product Studio | Mảng `warranties[]` và chuỗi `availability` trong `ProductStudio` document | `adjustment` là số nguyên (VND), availability thuộc enum quy định | Studio DTO: `warranties[]`, `availability`, trường suy diễn `canOrder: boolean` | `StudioPurchaseSection.tsx` (nút Mua ngay / Đặt trước / Liên hệ), `storefront-order-guard.ts` | Quyết định trực tiếp hành vi nút mua hàng trên PDP và kiểm tra tính hợp lệ khi gửi đơn | Đã kết nối với `StudioPurchaseSection` và `storefront-order-guard`; hoàn toàn độc lập với trường `stock` vật lý. |
| **Media & Gallery** | `media[]` (`assetId`, `alt`, `variantId`), ảnh đại diện, video YouTube | Tab Hình ảnh & Video trong Product Studio (gọi `MediaDialog`) | `media[]` trong document trỏ tới `MediaAsset.id`; `MediaUsage` theo dõi; bảng `ProductImage` là projection | Bắt buộc có ALT text khi xuất bản; file ảnh phải tồn tại trên R2; video phải là link YouTube hợp lệ | `media: [{ url, kind: "IMAGE" \| "VIDEO", alt, variantId }]` | `ProductGallery.tsx`, thumbnail trên `ProductCard.tsx` | Không cho phép xuất bản nếu ảnh chưa sẵn sàng trên R2; ngăn xóa ảnh đang được dùng trong revision | **Đã hoàn thiện:** PDP đã ưu tiên render gallery từ Studio DTO; ảnh theo biến thể đã chuyển đổi khi khách click cấu hình tương ứng. |
| **Nội dung & SEO** | `description` (ngắn), `contentHtml` (chi tiết), `seoTitle`, `seoDescription`, `canonicalSlug` | Tab Giới thiệu & SEO trong Product Studio | `ProductStudio.draft`, sanitize phía server bằng `sanitizeHtml`, projection sang `Product` | Giới hạn ký tự, lọc bỏ script độc hại, iframe nguy hiểm | `description`, `contentHtml`, `seoTitle`, `seoDescription` | PDP (khối bài viết chi tiết, FAQ), `generateMetadata` (OpenGraph, Twitter card, Canonical) | Sanitize an toàn trước khi lưu; public chỉ nhận HTML đã xuất bản | Trình soạn thảo HTML hiện là textarea cơ bản, chưa có rich-text visual blocks (headings, callout, table styling) kiểu WordPress. |
| **Điều hướng & Danh mục** | Menu chính (`menus.main[]`), Menu chân trang (`menus.footer[]`), Danh mục (`categories[]`), Bộ sưu tập (`collections[]`) | `/admin/navigation` & `/admin/categories` (`NavigationStudio.tsx`) | Tài liệu duy nhất trong bảng `NavigationStudio` (`id='site'`); projection sang bảng `Category` | `navigationWriteSchema`, chặn link ngoài lề, chặn vòng lặp danh mục cha-con | `GET /api/catalog/navigation`, `GET /api/catalog/collections/:slug`, `GET /api/categories` | `Header.tsx`, `Footer.tsx`, `MobileBottomNav.tsx`, `CategoryGridSection.tsx`, `/collection/:slug/page.tsx` | Quản lý bản nháp chung một aggregate; xuất bản atomic commit toàn bộ menu và danh mục | Đã kết nối trên Storefront. Tuy nhiên `/admin/categories` và `/admin/navigation` đang dùng chung một view gây nhầm lẫn trên UI admin. |
| **Cấu hình Website & Banner** | Hotline, Zalo, địa chỉ, giờ mở cửa, flash sale, hero banner, sub-banners, cam kết dịch vụ | `/admin/settings` (`SettingsPage.tsx`) | **Hiện tại:** Biến in-memory `cachedSettings` (RAM) + `localStorage`. **Đích:** Bảng D1 `SiteSettings` | Hiện tại: không validate. **Đích:** Zod strict schema `siteSettingsSchema` | `GET /api/admin/settings` (tạm thời) | `HeroSection.tsx`, `ContactSection.tsx`, `FeatureStrip.tsx`, `BrandSection.tsx`, `Footer.tsx`, `hot-sale/page.tsx` | **Thiếu:** Chưa có cơ chế draft/publish cho settings; lưu thất bại báo thành công giả; không lưu được vào D1 | **Khoảng thiếu lớn nhất (P0):** Toàn bộ dữ liệu settings chưa được persist vào DB D1 thật; khi restart server là mất sạch cấu hình hotline/banner. |
| **Tin tức & Bài viết** | Tiêu đề, slug, tóm tắt, ảnh đại diện, nội dung bài viết, chuyên mục, tác giả, ngày đăng | *Chưa có màn hình Admin* | *Chưa có bảng trong cơ sở dữ liệu* | N/A | N/A | `/news/page.tsx` (đang hiển thị dữ liệu mẫu hard-code) | N/A | **Thiếu 100%:** Chưa có editor, chưa có model cơ sở dữ liệu, StoreFront hoàn toàn hiển thị nội dung mẫu cố định. |
| **Đơn hàng & Khách hàng** | Thông tin khách (`customerName`, `customerPhone`, `shippingAddress`, `note`), sản phẩm đặt mua, số lượng, phương thức nhận | Storefront Checkout form (`/checkout`); xem tại `/admin/orders/[id]` | Bảng `Order` và bảng `OrderItem` (có các cột snapshot) | Zod schema khi checkout; kiểm tra `assertPublishedStudioOrderable` | Chi tiết đơn trả về cho khách yêu cầu confirmation token hash | Trang `/checkout/success`, `/admin/orders`, `/admin/orders/[id]` | Không có draft (mỗi lượt đặt là một bản ghi bất biến; cập nhật trạng thái có lịch sử) | Chỉ có 2 trạng thái `PENDING` và `COMPLETED`; thiếu quy trình xử lý, thiếu ghi chú nội bộ, thiếu phân công nhân viên. |

---

## 2. Quy Ước Định Danh, SKU, Slug & Khả Năng Tương Thích URL

### 2.1. Quy ước Định danh (Identities)
1. **Product ID:**
   - Sử dụng định dạng `cuid` hoặc UUID v4 cố định, sinh một lần khi tạo sản phẩm và **bất biến vĩnh viễn**.
   - Không đổi Product ID khi nhân bản, cập nhật cấu hình hoặc đổi tên sản phẩm.
2. **Product Variant ID & SKU:**
   - Mỗi biến thể có ID riêng biệt (`variantId`).
   - SKU được chuẩn hóa theo quy tắc: `[SLUG-NGẮN]-[CẤU HÌNH]` (Ví dụ: `LEGION5P-16-512`, `LOGI-G304-BLACK`).
   - SKU là duy nhất trên toàn hệ thống (enforced bởi UNIQUE constraint trong D1).
3. **Category ID & Slug:**
   - Giữ nguyên ID của các danh mục hiện có từ catalog ban đầu (Ví dụ: `cat-laptop-gaming`, `cat-phu-kien`).
   - Bất biến ID để bảo vệ toàn vẹn liên kết khóa ngoại với các sản phẩm cũ.
   - Slug được chuẩn hóa tiếng Việt không dấu, chữ thường, nối bằng dấu gạch ngang (Ví dụ: `laptop-gaming`, `chuot-ban-phim`).

### 2.2. Bảo toàn Tương thích URL StoreFront (URL Compatibility)

| Tuyến đường (Route) | URL hiện tại | Quy tắc điều hướng & Tương thích ngược |
|---|---|---|
| **Chi tiết sản phẩm** | `/product/:id` hoặc `/product/:slug` | **Canonical URL:** `/product/:slug`. Nếu người dùng hoặc liên kết cũ truy cập bằng ID hệ thống (Ví dụ `/product/p-legion-5-pro`), server thực hiện **HTTP 308 Permanent Redirect** sang `/product/:slug` và bảo lưu toàn bộ query string (`?sku=...`). Đã kiểm chứng tại `src/app/(shop)/product/[id]/page.tsx:112-115`. |
| **Danh mục sản phẩm** | `/category/:slug` | Giữ nguyên 100% route `/category/:slug`. Không thay đổi cấu trúc URL để bảo toàn SEO. |
| **Bộ sưu tập** | `/collection/:slug` | Tuyến đường mới đã được bổ sung tại `src/app/(shop)/collection/[slug]/page.tsx`. Trả 404 nếu collection ẩn hoặc chưa xuất bản. |
| **Tin tức** | `/news` (danh sách) | Khi triển khai module Tin tức (R05), bổ sung tuyến đường `/news/:slug` cho bài viết chi tiết; `/news` giữ làm trang listing. |
| **Chính sách & Trang tĩnh** | `/chinh-sach/:slug`, `/gioi-thieu`, `/lien-he` | Giữ nguyên các route tĩnh hiện hữu; dữ liệu nội dung chuyển dần sang CMS quản lý. |

---

## 3. Quy Ước Trạng Thái & Vòng Đời Nội Dung (Lifecycle Policy)

### 3.1. Phân biệt rõ Publication Status vs Availability vs Stock

```
┌────────────────────────────────────────────────────────┐
│ 1. PUBLICATION STATUS (Quyết định nội dung có trên Web) │
│    - DRAFT: Đang biên tập, cách ly 100% khỏi Public   │
│    - PUBLISHED / ACTIVE: Đã duyệt và xuất bản ra ngoài │
│    - HIDDEN / UNPUBLISHED: Đã ẩn, fail-closed (404)    │
│    - TRASH: Đã chuyển vào thùng rác                    │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ (Chỉ khi PUBLISHED mới xét tiếp)
┌────────────────────────────────────────────────────────┐
│ 2. WEB AVAILABILITY (Trạng thái tiếp nhận đơn hàng)    │
│    - AVAILABLE: Mua ngay (hiện nút Thêm vào giỏ)       │
│    - PREORDER: Đặt trước (hiện nút Đặt hàng trước)     │
│    - CONTACT: Liên hệ giá/tình trạng (nút Gọi hotline) │
│    - UNAVAILABLE: Tạm hết hàng (chặn đặt mua)          │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ (Độc lập hoàn toàn)
┌────────────────────────────────────────────────────────┐
│ 3. PHYSICAL STOCK (Kho vật lý - Nằm ngoài phạm vi CMS) │
│    - Không suy diễn "còn N máy" từ website             │
│    - Không trừ kho hay giữ kho khi khách gửi yêu cầu   │
└────────────────────────────────────────────────────────┘
```

### 3.2. Chính sách Fail-Closed cho Nội dung Ẩn
- Khi một sản phẩm hoặc danh mục bị **ẨN** trong CMS:
  - API công khai trả về HTTP 404 Not Found.
  - Renderer Storefront **BẮT BUỘC** hiển thị trang 404 (Không tìm thấy sản phẩm).
  - **TUYỆT ĐỐI KHÔNG** fallback sang dữ liệu `Product` cũ trong database.

### 3.3. Quy ước Trạng thái Tiếp Nhận Đơn Hàng (Order Scope Reset)
- Phạm vi Order được xác lập rõ: **Tiếp nhận và xử lý yêu cầu mua hàng từ website**.
- Không coi "COMPLETED" đồng nghĩa với "Đã giao hàng thành công" hay "Đã thu tiền kế toán".
- Đề xuất mở rộng chuỗi trạng thái ở R06:
  1. `NEW` (Yêu cầu mới tiếp nhận - tương ứng với `PENDING` cũ).
  2. `PROCESSING` (Đang liên hệ / Tư vấn / Chuẩn bị máy).
  3. `CONFIRMED` (Khách đã xác nhận yêu cầu).
  4. `COMPLETED` (Đã xử lý xong yêu cầu - tương ứng với `COMPLETED` cũ).
  5. `CANCELLED` (Khách hủy yêu cầu hoặc spam, bắt buộc nhập lý do).
- Toàn bộ đơn hàng cũ lưu `PENDING` tự động ánh xạ sang `NEW`; đơn lưu `COMPLETED` tự động ánh xạ sang `COMPLETED` mà không làm thay đổi giá trị hoặc snapshot lịch sử.
