# BÁO CÁO AUDIT TOÀN DIỆN CODEBASE: CITILAP-ECOMMERCE
**Phiên bản Audit:** 2026-10-06  
**Dự án:** `citilap-ecommerce` (`citilap-web2`)  
**Tài liệu đối chiếu gốc:** `CITILAP_PROJECT_CONTEXT.md` (2026-10-06)  
**Phạm vi:** UI-0 + Cloudflare Foundation & Codebase Audit  

---

## A. EXECUTIVE SUMMARY (TỔNG QUAN ĐIỀU HÀNH)

1. **Vị trí hiện tại của dự án:**  
   Codebase đang ở trạng thái **hybrid prototype / partial modular monolith**. Storefront đã có khung giao diện hoàn chỉnh về mặt thị giác (được xây dựng trên Next.js 16, React 19, Tailwind CSS v4), nhưng hơn **70% luồng dữ liệu đang chạy bằng mock data, fixture nội bộ hoặc fallback tự động**.
2. **Mức độ hoàn thiện:**  
   - **Storefront UI:** ~75% (giao diện đẹp, hiện đại, ProductCard đã được chuẩn hóa, nhưng nhiều tương tác còn là mock, chưa có routing slug chuẩn).  
   - **Admin UI:** ~40% (có dashboard, products, categories, orders nhưng chủ yếu nối API đơn giản, nhiều thư mục trống).  
   - **Data Layer:** ~25% (Prisma v7 với adapter LibSql/SQLite cục bộ, schema thiếu các model cốt lõi như Brand, SerialUnit, Warehouse, History, Promotion; tiền tệ đang dùng `Float`).  
   - **Cloudflare Readiness:** ~10% (chưa có `wrangler.jsonc`, chưa có binding D1/R2, upload ảnh vẫn ghi trực tiếp vào filesystem ổ đĩa bằng Node.js `fs/promises`).  
3. **Rủi ro kỹ thuật chính (P0):**  
   - **Silent Mock Fallback:** Nếu database/API mất kết nối hoặc query trả về rỗng, hệ thống tự động fallback sang mock data cứng.
   - **Lỗi định tuyến Product Detail:** `ProductCard` tạo link `/product/${slug}` nhưng trang `product/[id]/page.tsx` chỉ query Prisma theo `where: { id }` (cuid), dẫn đến lỗi 404 hoặc rơi vào mock data.
   - **Local Filesystem Upload:** Endpoint `/api/upload` dùng Node `fs/promises` để ghi vào `public/uploads/products`, sẽ crash ngay lập tức trên Cloudflare Workers.
   - **Chưa có tracking Serial / Multi-warehouse:** Không có model `SerialUnit`, rủi ro bán trùng physical unit là 100% nếu triển khai laptop like-new thực tế.
   - **Tiền tệ kiểu Float:** `price Float`, `totalAmount Float` tiềm ẩn sai số làm tròn tài chính.
4. **Hướng đi tiếp theo:**  
   Triển khai song song 2 track (UI & Cloudflare/D1/R2) theo **vertical slice**: Dựng nền tảng Workers + D1 + R2 trước, sau đó lần lượt nối Catalog (Category/Brand/Product/PDP) -> Cart & Server Revalidation -> Checkout & Concurrency-safe Order.

---

## B. KIẾN TRÚC HIỆN TẠI (CURRENT ARCHITECTURE)

```text
[ Browser / Client ]
       │
       ▼
[ Next.js 16 App Router (Local Node.js Runtime) ]
       │
       ├─► (Shop Pages) ───► Local State (Cart/Wishlist Context in localStorage)
       │         │
       │         ├──► getSectionProducts() ──► Check DATABASE_URL?
       │         │           ├─► Yes ──► Prisma (LibSql/SQLite dev.db)
       │         │           └─► No / Error ──► SILENT FALLBACK to home-mock-data.ts
       │         │
       │         └──► Category/PDP/HotSale ──► Hardcoded in-file mock arrays
       │
       ├─► (API Routes /api/*)
       │         ├──► /api/products, /api/orders ──► Check DATABASE_URL?
       │         │           ├─► Yes ──► Prisma LibSql Adapter ──► dev.db (SQLite)
       │         │           └─► No ──► mock-data.ts
       │         │
       │         ├──► /api/upload ──► Node.js fs.writeFile() ──► public/uploads/
       │         │
       │         └──► /api/auth/login ──► Check env ADMIN_EMAIL / ADMIN_PASSWORD
       │
       └─► (Admin Pages /admin/*) ──► Cookie admin_session (HMAC)
```

---

## C. KIẾN TRÚC MỤC TIÊU (TARGET CLOUDFLARE ARCHITECTURE)

```text
[ Browser (SEO-optimized, Mobile-first) ]
       │
       ▼
[ Cloudflare Global Edge Network (WAF + DNS + Turnstile) ]
       │
       ▼
[ Next.js on Cloudflare Workers Runtime (vinext / @opennextjs) ]
       │
       ├──► [ Domain / Application Services Layer ]
       │           │
       │           ├──► Catalog & Products Service
       │           ├──► Inventory & Concurrency State Machine
       │           ├──► Order & Payment Service (Idempotent)
       │           └──► Storage & Media Service
       │
       ├──► [ Cloudflare D1 ] (SQLite Relational DB, Zero-Float, Strict Constraints)
       │           ├── Categories, Brands, Products, Variants, Specs
       │           ├── SerialUnits (Physical Laptops), Warehouses, StockLedger
       │           ├── Orders, OrderItems (Snapshot), OrderStatusHistory
       │           └── Users, RBAC, AuditLogs
       │
       ├──► [ Cloudflare R2 ] (Object Storage for Images/Videos/Assets)
       │           └── products/{productId}/{uuid}.webp (served via CDN)
       │
       └──► [ Supporting Cloudflare Services ]
                   ├── KV: Config, Navigation Cache, Rate Limits
                   ├── Queues: Background Email, Sync, Image Processing
                   └── Cron Triggers: Expire Reservations, Cleanup
```

---

## D. STOREFRONT STATUS AUDIT (TRẠNG THÁI TOÀN BỘ ROUTES/PAGES)

| Route | File Đường dẫn | Status | Data Source | Server/Client | Vấn đề chính & Chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/(shop)/page.tsx` | **PARTIAL** | DB + Mock Fallback | Server (Suspense) | Nested `<main>`, fallback sang `home-mock-data.ts`, hero buttons không có link | P0 |
| `/category` | *Chưa có file* | **BROKEN** | Không có | Server | Link "Xem tất cả danh mục" trong Header trỏ về `/category` gây 404 | P0 |
| `/category/[slug]` | `src/app/(shop)/category/[slug]/page.tsx` | **PARTIAL** | DB + In-file Mock | Server + Client Filters | Khi DB rỗng tự động fallback 8 sản phẩm fake; filter và phân trang chỉ chạy client-side | P0 |
| `/product/[id]` | `src/app/(shop)/product/[id]/page.tsx` | **BROKEN / MOCK** | Prisma `id` query + In-file Mock | Server | **Bug định tuyến:** `ProductCard` link tới `/product/[slug]`, nhưng page chỉ tìm `where: { id: cuid }` -> 404 ở production; mock 4 review fake | P0 |
| `/cart` | `src/app/(shop)/cart/page.tsx` | **PARTIAL** | `localStorage` (`CartContext`) | Client Component | Lưu giá & tồn kho trên client; không có server revalidation; coupon mock | P1 |
| `/checkout` | `src/app/(shop)/checkout/page.tsx` | **PARTIAL** | `localStorage` -> `/api/orders` | Client Component | Idempotency-Key sinh ở client; text encoding bị lỗi dấu tiếng Việt; tạo fake guest user | P0 |
| `/checkout/success` | `src/app/(shop)/checkout/success/page.tsx` | **DONE** | Query param `orderId` | Client Component | Hiển thị thông báo đặt hàng thành công | P2 |
| `/search` | `src/app/(shop)/search/page.tsx` | **PARTIAL** | `/api/products?search` | Client Component | Capped ở 10 sản phẩm; không có filter/sort/pagination; không có autocomplete | P1 |
| `/hot-sale` | `src/app/(shop)/hot-sale/page.tsx` | **MOCK** | In-file array (100% fake) | Client Component | 100% dữ liệu cứng trong file; không nối API hay Database | P1 |
| `/profile` | `src/app/(shop)/profile/page.tsx` | **MOCK** | In-file static markup | Client Component | 100% mockup (Nguyễn Văn A, Hạng Vàng, đơn hàng giả); không có user auth | P2 |
| `/wishlist` | `src/app/(shop)/wishlist/page.tsx` | **PARTIAL** | `localStorage` (`WishlistContext`) | Client Component | **Lỗi a11y nghiêm trọng:** `<button>` nằm lồng bên trong thẻ `<a>`; không dùng `ProductCard` chuẩn | P1 |
| `/order-tracking` | `src/app/(shop)/order-tracking/page.tsx` | **MOCK** | Static HTML | Server Component | Nút "Tra cứu" không có event; kết quả đơn hàng #CTL123456 cố định | P2 |
| `/news` | `src/app/(shop)/news/page.tsx` | **MOCK** | In-file array | Server Component | Danh sách bài viết mock; không có trang chi tiết `/news/[slug]` | P2 |
| `/contact` | `src/app/(shop)/contact/page.tsx` | **PARTIAL** | Form -> `/api/contact` | Client Component | Form gửi POST nhưng `/api/contact` không lưu database hay gửi email | P2 |
| `/chinh-sach/[slug]` | `src/app/(shop)/chinh-sach/[slug]/page.tsx` | **DONE** | In-file policy text | Server Component | Hiển thị các chính sách mua hàng, bảo hành | P2 |
| `/login` | `src/app/login/page.tsx` | **BROKEN** | `/api/auth/login` | Client Component | Chỉ cho phép admin đăng nhập bằng `.env`; khách hàng đăng ký/đăng nhập đều trả về lỗi 401 | P1 |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | **PARTIAL** | `/api/dashboard` | Client Component | Doanh thu dùng số ngẫu nhiên `Math.random()`; số liệu cứng | P1 |
| `/admin/products` | `src/app/admin/products/page.tsx` | **PARTIAL** | `/api/products` | Client Component | Quản lý sản phẩm, bulk metadata, import/export CSV cơ bản | P1 |
| `/admin/products/new` | `src/app/admin/products/new/page.tsx` | **PARTIAL** | Form -> `/api/products` | Client Component | Tạo sản phẩm; upload ảnh ghi đĩa cục bộ | P1 |
| `/admin/products/[id]`| `src/app/admin/products/[id]/page.tsx` | **PARTIAL** | `/api/products/[id]` | Client Component | Chỉnh sửa sản phẩm, log phiên bản | P1 |
| `/admin/categories`| `src/app/admin/categories/page.tsx` | **PARTIAL** | `/api/categories` | Client Component | CRUD danh mục cơ bản | P1 |
| `/admin/orders` | `src/app/admin/orders/page.tsx` | **PARTIAL** | `/api/orders` | Client Component | Xem danh sách đơn hàng | P1 |
| `/admin/customers` | `src/app/admin/customers/page.tsx` | **PARTIAL** | `/api/customers` | Client Component | Danh sách user trong DB | P2 |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | **PARTIAL** | In-file mock | Client Component | Cài đặt cửa hàng chưa lưu DB thật | P2 |
| `/(dashboard)/*` | `src/app/(dashboard)/...` | **UNUSED** | Thư mục rỗng | N/A | Dead folders (`debt`, `inventory`, `orders`, `settings`, `warranty`) không chứa file | P2 |

---

## E. UI VÀ DESIGN SYSTEM PROBLEMS (VẤN ĐỀ GIAO DIỆN & TOKEN)

### 1. Phân tích hiện trạng Design System
- **CSS Variables:** Dự án đã định nghĩa semantic tokens trong `src/app/globals.css` (`--color-brand-primary`, `--color-price-current`, `--color-condition-like-new`, `--radius-card`, `--shadow-card`).
- **Tailwind v4 Integration Issue:** Các biến CSS được khai báo trong `:root`, nhưng block `@theme inline` chỉ map `--color-background`, `--color-foreground`, `--font-sans`. Vì thế, các class như `bg-brand-primary` hay `text-condition-like-new` không tự động sinh ra; lập trình viên phải dùng class Tailwind thô (`bg-blue-600`, `text-amber-800`).
- **Arbitrary Tailwind Values quá nhiều:** Rải rác khắp codebase là các arbitrary values: `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[13.5px]`, `max-w-[1370px]`, `bg-[#0b1221]`, `bg-[#f1f5f9]`, `h-[38px]`.

### 2. Đánh giá `ProductCard.tsx`
- **Điểm tốt (Nên giữ):**
  - Bố cục thông tin bán lẻ công nghệ rất chuẩn: Huy hiệu Condition -> Ảnh sản phẩm -> Thương hiệu/Dòng -> Tên model -> Giá bán (PriceTag) -> Ma trận cấu hình (SpecChip cho CPU, GPU, RAM, SSD, Màn hình) -> Thời hạn bảo hành & Tồn kho.
  - Xử lý a11y tốt: Nút Wishlist nằm độc lập, có `aria-label` và `aria-pressed`, không bị bọc trong link. Thẻ ảnh có `tabIndex={-1}` và `aria-hidden` để tránh lặp tabstop với tiêu đề.
- **Vấn đề cần chuẩn hóa:**
  - `inferCondition()`: Dùng logic suy đoán chuỗi tên (`lowerName.includes("like new")`, `includes("99%")`). Phải được thay bằng enum chuẩn từ database.
  - Kiểu dữ liệu giá: Nhận `price: string` định dạng sẵn thay vì `number` VND gốc.

### 3. Phân mảnh & Duplicate Components
- `SectionHeader`: Tồn tại 2 file riêng biệt: `src/components/ui/SectionHeader.tsx` và `src/components/home/SectionHeader.tsx`.
- Card sản phẩm ở Wishlist: Không tái sử dụng `ProductCard` mà viết markup card riêng.
- Header Navigation: Chứa hơn 120 dòng mảng danh mục hardcoded (`categoryMenu`, `navItems`).

---

## F. MOCK VÀ DATA FLOW ISSUES (VẤN ĐỀ DỮ LIỆU GIẢ & LUỒNG DỮ LIỆU)

### 1. Bảng thống kê toàn bộ Mock Data trong Codebase

| File / Vị trí | Loại Mock Data | Được dùng ở đâu | Có Production Fallback không? | Đề xuất giải pháp thay thế |
| :--- | :--- | :--- | :--- | :--- |
| `src/lib/home-mock-data.ts` (12KB) | Danh sách sản phẩm đầy đủ specs cho 7 sections | Trang chủ (`/`), `product-home.ts` | **CÓ (CỰC KỲ NGUY HIỂM)**: Nếu DB lỗi hoặc thiếu `DATABASE_URL`, code tự trả về mock này | Xóa hoàn toàn fallback ở production; nạp seed vào D1 và query trực tiếp |
| `src/lib/mock-data.ts` (6.3KB) | Categories, Products, Orders, Users | `/api/products`, `/api/orders`, `/api/dashboard`, `/api/customers` | **CÓ**: Nếu `!hasDatabase`, các API GET tự động trả về mảng mock này | Bắt buộc cấu hình D1 binding; nếu DB lỗi trả về structured error 500/503 |
| `src/app/(shop)/category/[slug]/page.tsx` | `allProductsByCategory` & `generateFallbackProducts` | Route `/category/[slug]` | **CÓ**: Nếu query DB trả về rỗng, tự sinh 8 sản phẩm fake | Query D1 với filter thật; nếu không có sản phẩm hiển thị EmptyState |
| `src/app/(shop)/hot-sale/page.tsx` | `gamingProducts`, `officeProducts` | Route `/hot-sale` | **100% Mock**: Trang không hề gọi API | Thay bằng query D1: `where: { isFlashSale: true }` |
| `src/app/(shop)/product/[id]/page.tsx` | Mock specs, variants và 4 reviews fake | Route `/product/[id]` | **CÓ**: Nếu không tìm thấy product trong DB (ở dev), hiển thị Legion 5 mock | Trả về 404 thật khi không tìm thấy; lấy specs/variants từ D1 |
| `src/app/(shop)/order-tracking/page.tsx` | Mock đơn hàng `#CTL123456` và tiến trình | Route `/order-tracking` | **100% Mock**: Render tĩnh | Form submit tra cứu thật theo `orderNumber` + `phone` qua API D1 |
| `src/app/(shop)/profile/page.tsx` | Mock user Nguyễn Văn A, địa chỉ, đơn hàng | Route `/profile` | **100% Mock**: Render tĩnh | Tích hợp Customer Auth Session thật; load profile từ D1 |
| `src/app/api/dashboard/route.ts` | Doanh thu ngẫu nhiên `Math.random()`, metrics fake | Admin Dashboard | **CÓ**: Trả về số liệu random khi thiếu DB | Aggregate query SQL trực tiếp trên D1 |

### 2. Luồng dữ liệu hiện tại theo từng Domain

| Domain | Luồng dữ liệu thực tế hiện tại | Đánh giá kiến trúc |
| :--- | :--- | :--- |
| **Catalog / Product** | `UI -> getSectionProducts() -> Prisma findMany -> SQLite dev.db (hoặc fallback mock)` | Chưa có Domain Service phân tầng; query trực tiếp Prisma trong UI service |
| **Category** | `Header/Filters -> Hardcoded arrays -> (Không đồng bộ với DB Category)` | Danh mục trên UI không khớp với database |
| **Search** | `SearchBar -> /api/products?search -> Prisma OR filter` | Chưa có index, giới hạn cứng 10 sản phẩm |
| **Cart** | `UI -> CartContext -> window.localStorage ("citilap_cart")` | Client-only, giá và tồn kho tin hoàn toàn từ client |
| **Wishlist** | `UI -> WishlistContext -> window.localStorage ("citilap-wishlist")` | Client-only, chưa đồng bộ tài khoản |
| **Order / Checkout** | `Checkout Form -> /api/orders (POST) -> Prisma $transaction -> dev.db` | Chưa hỗ trợ guest order chuẩn; sinh fake user; không có tracking serial |
| **Media / Upload** | `ImageUploader -> /api/upload -> fs.writeFile -> public/uploads/products/` | Local filesystem (Không tương thích Cloudflare Workers) |
| **Customer Auth** | `Login Form -> /api/auth/login -> So khớp ADMIN_EMAIL/PASSWORD trong .env` | Chưa có customer auth; chỉ có 1 tài khoản admin tĩnh |

---

## G. DATABASE VÀ CLOUDFLARE D1 READINESS

### 1. Đánh giá Prisma Schema hiện tại (`prisma/schema.prisma`)
- **Ưu điểm:**
  - Đã cấu hình `provider = "sqlite"`, tương thích trực tiếp cú pháp SQLite với D1.
  - Đã có các model cơ bản: `User`, `Category`, `Product`, `ProductVariant`, `ProductEditLog`, `ProductVersion`, `Order`, `OrderItem`.
  - Có các cờ sản phẩm: `isFeatured`, `isNewArrival`, `isFlashSale`, `isBestSeller`.
- **Nhược điểm nghiêm trọng & Thiếu sót so với Context:**
  1. **Kiểu tiền tệ Float:** Tất cả các trường tiền tệ (`price`, `originalPrice`, `totalAmount`, `shippingFee`, `discountAmount`, `lowestPrice30d`, `totalSpend`) đều dùng `Float`. Cần chuyển sang **`Int` (VND nguyên đồng)** theo quy định của context.
  2. **Thiếu model `Brand`:** Hiện chỉ có `brand String?` trên `Product`.
  3. **Thiếu model `SerialUnit`:** Không có bảng quản lý từng máy laptop vật lý (serial, mac, imei, cycle pin, ngoại hình, trạng thái AVAILABLE/RESERVED/SOLD).
  4. **Thiếu model `Warehouse` & `InventoryTransaction`:** Không quản lý đa kho, không ghi lịch sử biến động kho.
  5. **Thiếu model `OrderStatusHistory`:** Trạng thái đơn hàng chỉ là 1 cột string cập nhật đè (`Order.status`), không bảo toàn lịch sử append-only.
  6. **Thiếu model `AuditLog`:** Chưa có audit log cho các thao tác quản trị.
  7. **Ràng buộc `Order.userId`:** Bắt buộc phải có `User`, khiến code checkout phải "hack" bằng cách tự tạo user ảo `guest-xxx@guest.citilap.local`. Cần cho phép `userId String?` để hỗ trợ guest checkout sạch sẽ.
  8. **Enum dạng chuỗi tiếng Việt:** Dùng `"Chờ xác nhận"`, `"Chưa thanh toán"`, `"Mới"` thay vì mã uppercase chuẩn (`PENDING`, `UNPAID`, `NEW`).

### 2. Chiến lược chuyển đổi sang Cloudflare D1
- **Adapter:** Chuyển từ `@prisma/adapter-libsql` sang `@prisma/adapter-d1`.
- **Wrangler Binding:** Khai báo binding `DB` trong `wrangler.jsonc`.
- **Lộ trình migration schema (Step-by-step):**
  1. *Batch 1 (Catalog Foundation):* Chuẩn hóa `Category`, thêm `Brand`, sửa tiền tệ sang `Int`, thêm bảng `ProductImage` (R2 metadata), thiết lập index trên `[categoryId, status]`, `[slug]`.
  2. *Batch 2 (Customer & Guest Checkout):* Thêm `CustomerAddress`, cho phép nullable `userId` trên `Order`, lưu snapshot địa chỉ.
  3. *Batch 3 (Inventory & Concurrency):* Thêm `Warehouse`, `SerialUnit`, `InventoryTransaction`.
  4. *Batch 4 (Order & History):* Thêm `OrderStatusHistory`, `PaymentTransaction`.

---

## H. CLOUDFLARE R2 READINESS (MEDIA & STORAGE)

### 1. Hiện trạng Upload
- **Điểm nghẽn:** Endpoint `/api/upload/route.ts` sử dụng thư viện Node.js `fs/promises` (`writeFile`, `mkdir`) và `path` để lưu file vào thư mục cục bộ `public/uploads/products`.
- **Rủi ro:** Khi chạy trên Cloudflare Workers, filesystem là read-only (hoặc ephemeral in-memory). Việc gọi `fs.writeFile` sẽ gây lỗi server 500 ngay lập tức.
- **Image URLs:** Storefront hiện đang dùng 90% link ảnh Unsplash ngẫu nhiên, không ổn định.

### 2. Thiết kế chuyển sang Cloudflare R2
- **R2 Bucket Binding:** `PRODUCT_MEDIA`.
- **Cấu trúc Object Key:** `products/{productId}/{uuid}.webp` hoặc `uploads/{year}/{month}/{uuid}.{ext}`.
- **Pipeline Upload chuẩn:**
  1. Client/Admin upload file lên route API `/api/upload`.
  2. Worker validate MIME type (magic bytes - code hiện có đã có logic kiểm tra signature rất tốt, có thể tái sử dụng), kích thước file (<= 5MB).
  3. Ghi trực tiếp stream buffer vào binding R2: `await env.PRODUCT_MEDIA.put(key, buffer, { httpMetadata: { contentType } })`.
  4. Trả về public URL CDN hoặc Custom Domain (ví dụ `https://media.citilap.vn/{key}`).
  5. Lưu metadata vào D1: `key`, `url`, `width`, `height`, `size`, `mimeType`.

---

## I. CLOUDFLARE WORKERS READINESS (RUNTIME & COMPATIBILITY)

### 1. Phân loại tương thích

| Phân nhóm | Thành phần / Module | Đánh giá chi tiết |
| :--- | :--- | :--- |
| **Compatible (Tương thích tốt)** | React 19, Tailwind CSS v4, Web Crypto API, `NextResponse`, `fetch`, App Router pages | Chạy tốt trên edge runtime; không phụ thuộc OS |
| **Needs Change (Cần điều chỉnh)** | `src/middleware.ts` | Next.js 16 cảnh báo deprecation: `The "middleware" file convention is deprecated. Please use "proxy" instead.` Cần cập nhật |
| **Needs Change (Cần điều chỉnh)** | `src/lib/prisma.ts` | Hiện đang dùng `@prisma/adapter-libsql`. Cần thay thế bằng `@prisma/adapter-d1` khi chạy trên Worker |
| **Potential Blocker (Chặn hoàn toàn nếu không sửa)** | `src/app/api/upload/route.ts` | Dùng Node.js `fs/promises` và ghi ổ đĩa cục bộ |
| **Potential Blocker (Chặn hoàn toàn nếu không sửa)** | Thiếu Worker Configuration | Chưa có `wrangler.jsonc` / `wrangler.toml`, chưa cấu hình adapter build (`vinext` hoặc `@opennextjs/cloudflare`) |

---

## J. AUDIT CONCURRENCY & INVENTORY (NGHIỆP VỤ ĐẶT HÀNG ĐỒNG THỜI)

### Câu hỏi cốt lõi từ context:
> *"Nếu có đúng 1 serial AVAILABLE và 2 request checkout tới gần như đồng thời, code hiện tại có nguy cơ bán 2 lần hay không?"*

### Kết luận dựa trên code thực tế:
1. **Về mặt Serial Unit:**  
   Code hiện tại **CHƯA CÓ khái niệm Serial Unit**. Cả database schema lẫn `/api/orders` chỉ quản lý trường số lượng tồn kho tổng quát (`stock: Int`). Do đó, nếu là laptop Like-New cần định danh chính xác 1 máy vật lý, hệ thống hiện tại **hoàn toàn chưa có khả năng bảo vệ serial**.
2. **Về mặt số lượng (Quantity decrement):**  
   Trong `src/app/api/orders/route.ts` (dòng 144-147):
   ```typescript
   const updated = await tx.product.updateMany({
     where: { id: productId, status: 'active', stock: { gte: quantity } },
     data: { stock: { decrement: quantity } }
   });
   if (updated.count !== 1) throw new Error('OUT_OF_STOCK');
   ```
   Logic này sử dụng atomic conditional update (`stock: { gte: quantity }`). Nếu chạy trên RDBMS có interactive transaction đầy đủ, request thứ hai sẽ nhận `count === 0` và bị văng lỗi `OUT_OF_STOCK` (không bị âm kho).
3. **Lỗ hổng concurrency thực tế hiện tại:**  
   - **Lệch stock giữa Product và Variant:** Khi mua variant, code chỉ giảm `variant.stock` mà không giảm `product.stock` cha. Ngược lại, khi mua theo `productId`, `product.stock` giảm nhưng các variant không giảm.
   - **Idempotency Key Race Condition:** Kiểm tra `findUnique({ where: { idempotencyKey } })` được thực hiện **trước** `$transaction`. Hai request cùng idempotency key gửi đồng thời sẽ cùng vượt qua bước kiểm tra và gây lỗi xung đột unique constraint (trả về 409 lỗi thay vì trả về đơn hàng đã tạo thành công).
   - **Prisma Interactive Transaction trên D1:** Adapter `@prisma/adapter-d1` không hỗ trợ các interactive transaction dài hạn theo cách của PostgreSQL/MySQL truyền thống. Cần chuyển sang D1 Batch statements hoặc conditional execution để đảm bảo an toàn tuyệt đối.

---

## K. VERIFICATION SUMMARY (KẾT QUẢ KIỂM TRA LỆNH)

1. **TypeScript Check (`npx tsc --noEmit`):**  
   - **KẾT QUẢ: PASS (Code 0)**  
   - Không có lỗi typecheck nào trên toàn bộ 37 routes.
2. **ESLint (`npm run lint`):**  
   - **KẾT QUẢ: PASS with 5 warnings (Code 0)**  
   - 5 warnings về biến unused: `ChevronRight`, `ShoppingBag` trong `cart/page.tsx`; `CheckCircle2`, `ChevronRight` trong `checkout/page.tsx`; `useSearchParams` trong `CategoryFilters.tsx`.
3. **Automated Tests:**  
   - **KẾT QUẢ: NONE** (Không có test runner, không có file test nào trong dự án).
4. **Production Build (`next build`):**  
   - **KẾT QUẢ: PASS (Code 0)**  
   - Biên dịch thành công trong 7.4s với Turbopack. Tạo ra 37 routes tĩnh và động.  
   - *Cảnh báo:* `The "middleware" file convention is deprecated. Please use "proxy" instead.`  
   - *Lưu ý quan trọng:* Build pass do `DATABASE_URL` rỗng, Next.js prerender các trang tĩnh bằng mock data. Khi kết nối DB thật, cần đảm bảo các query server không bị crash lúc build.

---

## L. TOP 10 TASKS TIẾP THEO (THEO CHIẾN LƯỢC VERTICAL SLICE)

*Các task được sắp xếp theo thứ tự ưu tiên nhằm tạo ra tiến độ nhìn thấy được ngay, không rewrite toàn bộ, tuân thủ nguyên tắc Cloudflare-native và loại bỏ triệt để mock data.*

```text
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ TASK 01 │ ──► │ TASK 02 │ ──► │ TASK 03 │ ──► │ TASK 04 │ ──► ...
│ CF Base │     │ Catalog │     │ Listing │     │   PDP   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

---

### Task 01: Thiết lập Cloudflare Foundation (Wrangler + D1 Dev + R2 Binding)
- **ID:** `CF-01`
- **Mục tiêu:** Tạo nền tảng Cloudflare hoàn chỉnh chạy local để dev trực tiếp trên D1/R2 thay vì SQLite/disk.
- **Phạm vi:** 
  - Tạo cấu hình `wrangler.jsonc` (khai báo D1 database `citilap-db`, R2 bucket `citilap-media`, KV nếu cần).
  - Cài đặt `@prisma/adapter-d1` và `@cloudflare/workers-types`.
  - Cập nhật `src/lib/prisma.ts` để hỗ trợ D1 client đồng thời duy trì local dev an toàn.
  - Tạo script chạy migration và seed trên D1 local (`wrangler d1 migrations apply`).
- **Dependency:** Không có.
- **Acceptance Criteria:** Chạy được D1 cục bộ qua Wrangler; Prisma Client kết nối và thực hiện được query `SELECT 1` trên D1 dev.
- **Rủi ro:** Cấu hình adapter Next.js 16 trên Cloudflare Workers.
- **Độ khó:** `M`

---

### Task 02: D1 Catalog Schema & Migration (Category, Brand, Product, Int Money)
- **ID:** `DATA-02`
- **Mục tiêu:** Chuẩn hóa Schema sản phẩm theo đúng quy định Context (tiền tệ VND số nguyên `Int`, thêm Brand, bỏ Float).
- **Phạm vi:**
  - Cập nhật `prisma/schema.prisma`: Đổi tất cả `price`, `originalPrice`, `totalAmount` từ `Float` sang `Int`.
  - Thêm model `Brand` (`name`, `slug`, `logo`).
  - Thêm model `ProductImage` (lưu metadata ảnh R2: key, url, width, height, sortOrder).
  - Viết SQL migration đầu tiên cho D1.
  - Viết file seed D1 (`prisma/seed-d1.ts`) với đầy đủ danh mục, thương hiệu và sản phẩm laptop gaming / like-new thật.
- **Dependency:** `CF-01`.
- **Acceptance Criteria:** Chạy migration và seed thành công trên D1 local; kiểm tra D1 có ít nhất 8 category, 10 brand, 25 laptop mẫu có thông số CPU/GPU/RAM/SSD chuẩn.
- **Rủi ro:** Thay đổi kiểu dữ liệu `Float` sang `Int` làm ảnh hưởng đến các hàm format tiền tệ trên UI.
- **Độ khó:** `M`

---

### Task 03: Chuyển đổi Media Upload sang Cloudflare R2
- **ID:** `MEDIA-03`
- **Mục tiêu:** Xóa bỏ hoàn toàn code ghi file ổ đĩa (`fs/promises`), chuyển `/api/upload` sang lưu trữ R2.
- **Phạm vi:**
  - Viết `src/lib/storage.ts`: Service upload/delete file vào Cloudflare R2 binding.
  - Viết lại `src/app/api/upload/route.ts`: Tiếp nhận FormData, kiểm tra MIME/magic bytes, stream trực tiếp lên R2, trả về public URL.
  - Cập nhật `ImageUploader.tsx` phía Admin để hoạt động mượt mà với API mới.
- **Dependency:** `CF-01`.
- **Acceptance Criteria:** Admin upload ảnh thành công, file xuất hiện trong local R2 bucket; không còn bất kỳ dòng code `fs/promises` nào trong codebase; xóa thư mục `public/uploads`.
- **Rủi ro:** Cấu hình domain/URL cho R2 local vs production.
- **Độ khó:** `M`

---

### Task 04: Chuẩn hóa Design System & Sửa Token Tailwind v4
- **ID:** `UI-04`
- **Mục tiêu:** Khóa Design System cốt lõi, đồng bộ Tailwind v4 `@theme`, dọn dẹp các component trùng lặp.
- **Phạm vi:**
  - Cập nhật `src/app/globals.css`: Đưa các token màu brand, condition, stock, price vào `@theme` để sử dụng trực tiếp qua utility classes chuẩn.
  - Chuẩn hóa typography scale và spacing scale (loại bỏ các class arbitrary vô tội vạ).
  - Hợp nhất `SectionHeader.tsx` (xóa bản duplicate ở `src/components/home/`).
  - Chuẩn hóa `Badge`, `Button`, `PriceTag`, `EmptyState`, `Skeleton`.
  - Fix lỗi nested `<main>` trên trang chủ.
- **Dependency:** Không có.
- **Acceptance Criteria:** Không còn duplicate component; utility classes semantic hoạt động nhất quán; `npm run lint` 0 warnings.
- **Rủi ro:** Ảnh hưởng giao diện nếu đổi tên class không kiểm tra kỹ.
- **Độ khó:** `S`

---

### Task 05: Vertical Slice: Trang Chủ Thật (Homepage nối D1, Xóa Mock Fallback)
- **ID:** `STORE-05`
- **Mục tiêu:** Biến Homepage thành trang bán hàng thực thụ đọc 100% dữ liệu từ D1, loại bỏ hoàn toàn `home-mock-data.ts`.
- **Phạm vi:**
  - Viết Service `src/server/services/catalog.service.ts`: Query D1 lấy dữ liệu Flash Sale, Hàng mới về, Laptop Gaming, Ultrabook, Máy trạm.
  - Sửa `src/services/product-home.ts`: Xóa bỏ tham số `fallback` và logic trả về mock khi lỗi. Nếu lỗi trả về mảng rỗng và log kiểm soát.
  - Cập nhật `HeroSection.tsx`: Gắn link cho các nút bấm ("Khám Phá Ngay", "Xem Ưu Đãi", "Xem ngay", "Mua ngay").
  - Sửa lỗi Responsive Grid trên tablet (gộp 2 grid 5 cột thành 1 grid chuẩn flow).
- **Dependency:** `DATA-02`, `UI-04`.
- **Acceptance Criteria:** Trang chủ tải dữ liệu thật từ D1; tắt server DB thì trang hiển thị lỗi/trống có kiểm soát chứ không hiện dữ liệu fake; xóa hoàn toàn file `src/lib/home-mock-data.ts`.
- **Rủi ro:** Query N+1 nếu không include relation hợp lý.
- **Độ khó:** `M`

---

### Task 06: Vertical Slice: Header Navigation & Category Listing (`/category/[slug]`)
- **ID:** `STORE-06`
- **Mục tiêu:** Khắc phục lỗi 404 danh mục, nối Header và trang Listing với D1, hỗ trợ lọc URL state hoàn chỉnh.
- **Phạm vi:**
  - Tạo trang `/category/page.tsx` hiển thị tất cả danh mục (sửa lỗi 404 từ link Header).
  - Cập nhật `Header.tsx`: Lấy danh mục động từ D1 (hoặc cache KV), xóa mảng hardcoded.
  - Sửa `MobileBottomNav.tsx`: Nút "Danh mục" mở drawer danh mục thay vì nhảy cứng vào laptop-gaming.
  - Nâng cấp `CategoryFilters.tsx`: Đưa toàn bộ state bộ lọc (brand, price, RAM, CPU, condition) vào URL SearchParams; hỗ trợ Mobile Filter Drawer; query phân trang trực tiếp từ D1.
- **Dependency:** `DATA-02`, `UI-04`.
- **Acceptance Criteria:** Bấm "Danh mục" trên mobile mở drawer mượt mà; share link filter giữ nguyên kết quả; refresh trang không mất bộ lọc; không còn fallback 8 sản phẩm fake.
- **Rủi ro:** Xử lý state SSR và Hydration URL params trên Next.js 16.
- **Độ khó:** `L`

---

### Task 07: Vertical Slice: Product Detail Page (`/product/[slug]`) & Sửa Lỗi Định Tuyến
- **ID:** `STORE-07`
- **Mục tiêu:** Khắc phục triệt để lỗi routing giữa slug và ID, hiển thị PDP với dữ liệu thật từ D1 và media từ R2.
- **Phạm vi:**
  - Sửa routing: Cho phép route nhận cả slug hoặc ID (hoặc chuẩn hóa toàn bộ URL sang `/product/[slug]`).
  - Query D1: Lấy chi tiết sản phẩm, biến thể cấu hình (Variant), giá, tình trạng máy (Condition), thông số kỹ thuật (Specs), bảo hành.
  - Xóa bỏ dữ liệu mock Legion 5 và 4 reviews fake trong `product/[id]/page.tsx`.
  - Hiển thị đúng trạng thái còn hàng/hết hàng, thư viện ảnh `ProductGallery` với ảnh thật.
  - Bổ sung Breadcrumb schema và Product JSON-LD chuẩn SEO.
- **Dependency:** `DATA-02`, `STORE-06`.
- **Acceptance Criteria:** Bấm vào bất kỳ sản phẩm nào từ Trang chủ hoặc Danh mục đều vào đúng trang chi tiết của sản phẩm đó; hiển thị đúng biến thể; nếu sản phẩm không tồn tại trả về 404 chuẩn.
- **Rủi ro:** Xử lý backward compatibility nếu có link cũ dùng ID.
- **Độ khó:** `M`

---

### Task 08: Vertical Slice: Search Động & Gợi Ý Tìm Kiếm
- **ID:** `STORE-08`
- **Mục tiêu:** Nâng cấp tính năng tìm kiếm cốt lõi từ input đơn giản thành hệ thống tìm kiếm đa trường có lọc và phân trang.
- **Phạm vi:**
  - Cập nhật `/api/products` (hoặc `/api/search`): Hỗ trợ tìm kiếm theo tên, model, brand, CPU, GPU trên D1 với index phù hợp.
  - Cập nhật trang `/search/page.tsx`: Bổ sung bộ lọc nhanh, sắp xếp theo giá, phân trang kết quả (vượt qua giới hạn 10 sản phẩm hiện tại).
  - Bổ sung accessibility cho form tìm kiếm ở Header (label, focus ring).
- **Dependency:** `DATA-02`, `STORE-06`.
- **Acceptance Criteria:** Tìm kiếm trả về kết quả chính xác theo từ khóa cấu hình (ví dụ: "RTX 4060", "Legion"); có thông báo khi không tìm thấy kết quả kèm gợi ý.
- **Rủi ro:** Hiệu năng tìm kiếm `LIKE '%...%'` trên D1 khi tập dữ liệu lớn -> cần đánh giá Virtual Table FTS5 nếu cần.
- **Độ khó:** `M`

---

### Task 09: Vertical Slice: Giỏ Hàng & Server Price/Stock Validation
- **ID:** `STORE-09`
- **Mục tiêu:** Loại bỏ việc tin tưởng dữ liệu giá/tồn kho từ client; xây dựng endpoint thẩm định giỏ hàng server-side.
- **Phạm vi:**
  - Xây dựng API `/api/cart/validate`: Nhận danh sách `{ productId, variantId, quantity }`, query D1 để lấy giá hiện tại và số lượng khả dụng, trả về giỏ hàng đã được revalidate.
  - Cập nhật `CartContext.tsx`: Khi người dùng mở giỏ hàng hoặc bấm checkout, tự động gọi revalidate; thông báo nếu sản phẩm đổi giá hoặc hết hàng.
  - Cập nhật trang `/cart/page.tsx`: Hiển thị cảnh báo nếu có sự thay đổi giá/kho; chuẩn hóa tính toán giảm giá, phí ship.
- **Dependency:** `DATA-02`, `STORE-07`.
- **Acceptance Criteria:** Chỉnh sửa giá trong localStorage không thể qua mặt server; nếu sản phẩm hết hàng giỏ hàng hiển thị trạng thái disabled cho nút thanh toán.
- **Rủi ro:** Trải nghiệm người dùng khi giá thay đổi cần thông báo rõ ràng.
- **Độ khó:** `M`

---

### Task 10: Vertical Slice: Checkout, Concurrency Safe & D1 Order Persistence
- **ID:** `STORE-10`
- **Mục tiêu:** Hoàn thiện luồng thanh toán thực tế (COD + Chuyển khoản), an toàn concurrency trên D1, snapshot lịch sử đơn hàng.
- **Phạm vi:**
  - Cho phép Guest Checkout sạch sẽ: Sửa schema để `Order.userId` là nullable; không sinh fake user rác vào bảng User.
  - Cập nhật schema: Thêm bảng `OrderStatusHistory` (append-only history).
  - Cập nhật `/api/orders`:
    - Sử dụng conditional update an toàn trên D1 để trừ kho.
    - Snapshot toàn bộ thông tin sản phẩm, SKU, giá, cấu hình vào `OrderItem`.
    - Xử lý Idempotency Key đúng chuẩn: Nếu trùng key, trả về đơn hàng đã tạo thành công thay vì báo lỗi 409.
  - Sửa lỗi encoding ký tự tiếng Việt trong form checkout.
  - Hoàn thiện trang `/order-tracking`: Tra cứu đơn hàng thật theo mã đơn + số điện thoại từ D1.
- **Dependency:** `DATA-02`, `STORE-09`.
- **Acceptance Criteria:** Đặt hàng thành công tạo record trong D1; 2 request đồng thời cho sản phẩm còn 1 máy chỉ có 1 request thành công; tra cứu đơn hàng hiển thị đúng tiến trình thật; retry cùng Idempotency Key không tạo 2 đơn.
- **Rủi ro:** Cú pháp transaction/batching trên D1.
- **Độ khó:** `L`

---

## M. BẢNG TỔNG HỢP TOP 10 TASKS

| Thứ tự | Task ID | Tên Task | Phạm vi chính | Dependency | Độ khó |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | `CF-01` | Cloudflare Foundation (Wrangler + D1 + R2) | Infra local, Wrangler config, Prisma adapter | Không | **M** |
| **2** | `DATA-02` | D1 Catalog Schema & Migration | Schema Int Money, Brand, ProductImage, Seed D1 | `CF-01` | **M** |
| **3** | `MEDIA-03` | R2 Media Upload & Delete Storage Service | Xóa fs.writeFile, API upload stream R2 | `CF-01` | **M** |
| **4** | `UI-04` | Chuẩn hóa Design System & Sửa Token Tailwind | Sửa @theme Tailwind v4, gộp duplicate components | Không | **S** |
| **5** | `STORE-05` | Vertical Slice: Trang Chủ Thật (Xóa Mock Fallback) | Query D1 cho 7 sections, gắn link Hero, fix grid | `DATA-02`, `UI-04` | **M** |
| **6** | `STORE-06` | Vertical Slice: Category Listing & Dynamic Nav | Trang /category, URL filter state, Mobile drawer | `DATA-02`, `UI-04` | **L** |
| **7** | `STORE-07` | Vertical Slice: Product Detail Page & Fix Slug Bug | Fix routing slug vs id, PDP thật, R2 gallery | `DATA-02`, `STORE-06` | **M** |
| **8** | `STORE-08` | Vertical Slice: Search Động & Đa Tiêu Chí | Query tìm kiếm CPU/GPU/Brand, phân trang | `DATA-02`, `STORE-06` | **M** |
| **9** | `STORE-09` | Vertical Slice: Giỏ Hàng & Server Revalidation | API validate giá/kho, bảo vệ frontend tamper | `DATA-02`, `STORE-07` | **M** |
| **10** | `STORE-10` | Vertical Slice: Checkout & Concurrency-safe Order | Guest checkout, snapshot order, idempotent D1 | `DATA-02`, `STORE-09` | **L** |
