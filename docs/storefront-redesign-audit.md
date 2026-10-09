# Báo Cáo Audit Toàn Diện Storefront Citilap.VN

> **Tài liệu:** Storefront Redesign Audit  
> **Thời điểm lập:** 2026-10-01  
> **Mục đích:** Đánh giá hiện trạng kiến trúc, design system, phụ thuộc dữ liệu, lỗi UX và rủi ro kỹ thuật trước khi bước vào chuỗi task Rebuild Storefront.  
> **Nguyên tắc:** Không refactor/sửa code storefront trong bước này; ghi lại hiện trạng trung thực làm baseline đối chiếu.

---

## 1. Current Architecture (Kiến Trúc & Route Storefront Hiện Tại)

### 1.1. Sơ đồ Route & Cấu trúc Phân nhánh

Storefront Citilap nằm trong route group `(shop)` kế thừa từ root layout:

```text
src/app/
├── layout.tsx                      (Root Layout: HTML, font Inter, CartProvider, WishlistProvider)
├── globals.css                     (Tailwind v4 base, shimmers, focus-ring, safe-area-bottom)
├── robots.ts & sitemap.ts          (SEO crawlers config)
└── (shop)/
    ├── layout.tsx                  (Shop Layout: Header, main container, Footer, MobileBottomNav)
    ├── loading.tsx                 (Skeleton loading cho toàn shop)
    ├── error.tsx                   (Error boundary cho storefront)
    ├── not-found.tsx               (Trang 404 tùy biến)
    ├── page.tsx                    (Homepage: Hero, Feature, FlashSale, ProductSections, Media, Brands)
    ├── category/[slug]/page.tsx    (PLP: Product Listing theo danh mục + Brand)
    ├── product/[id]/page.tsx       (PDP: Chi tiết sản phẩm, gallery, variants, review, specs)
    ├── search/page.tsx             (Trang kết quả tìm kiếm client-side fetch)
    ├── hot-sale/page.tsx           (Trang khuyến mãi hot sale)
    ├── cart/page.tsx               (Trang giỏ hàng client-side)
    ├── checkout/page.tsx           (Trang thanh toán 2 bước + tạo đơn)
    ├── checkout/success/page.tsx   (Xác nhận đặt hàng thành công)
    ├── profile/page.tsx            (Trang thông tin tài khoản, đơn hàng cá nhân)
    ├── wishlist/page.tsx           (Trang danh sách yêu thích local storage)
    ├── order-tracking/page.tsx     (Tra cứu đơn hàng public)
    ├── contact/page.tsx            (Trang liên hệ)
    ├── news/page.tsx               (Trang tin tức / bài viết)
    └── chinh-sach/[slug]/page.tsx  (Trang nội dung chính sách: bảo hành, đổi trả, v.v.)
```

### 1.2. Phân loại Server vs Client Components

| Route / Khu vực | Kiểu Rendering | Components chính | Vai trò & Đặc điểm |
|---|---|---|---|
| **Shop Layout** | Server Component | `ShopLayout` wraps `Header`, `Footer`, `MobileBottomNav` | Cung cấp khung bao bọc cố định cho tất cả trang mua sắm |
| **Header** | Client Component (`"use client"`) | `Header`, `CartIcon`, `VerticalMenu` | Quản lý state menu hover, tìm kiếm, mega-menu, hotline |
| **Footer** | Server Component | `Footer` | Hiển thị liên kết chính sách, địa chỉ, hotline, form newsletter |
| **Mobile Navigation** | Client Component (`"use client"`) | `MobileBottomNav` | Thanh 5 nút dưới đáy màn hình trên mobile |
| **Homepage** | Server Component (Streaming) | `HeroSection`, `FeatureStrip`, `FlashSaleSection`, `ProductSection`, `ProductCard`, `MediaSection`, `TestimonialSection`, `ContactSection`, `BrandSection` | Render server danh sách laptop theo section, stream fallback qua `Suspense` |
| **Category (PLP)** | Server Component + Client Filters | `CategoryPage` (RSC) -> `CategoryFilters` (Client) | RSC đọc database/fallback rồi truyền sản phẩm vào client filter |
| **Product Detail (PDP)** | Server Component + Client CTA | `ProductDetail` (RSC), `ProductGallery`, `ProductPriceOptions`, `ProductRecommendations`, `ProductMobileCTA`, `ReviewForm` | RSC nạp chi tiết máy, client component điều khiển chọn SKU/variant và thêm giỏ hàng |
| **Search Page** | Client Component (`"use client"`) | `SearchPageContent`, `ProductCard`, `Breadcrumb` | Lấy query `?q=` từ URL và fetch `/api/products?search=` qua browser |
| **Cart Page** | Client Component (`"use client"`) | `CartPage`, `Breadcrumb` | Đọc `CartContext` từ `localStorage`, tính tạm tính/phí ship/mã giảm giá |
| **Checkout Page** | Client Component (`"use client"`) | `CheckoutPage` | Quản lý form địa chỉ, chọn phương thức vận chuyển/thanh toán, gửi POST `/api/orders` |

---

## 2. Current Design System (Hiện Trạng Hệ Thống Thiết Kế)

Dự án hiện **chưa có một Design Token System độc lập hoặc Theme rõ ràng**. Phần lớn kiểu dáng được viết rải rác dưới dạng Tailwind CSS ad-hoc utilities.

### 2.1. Bảng màu (Colors)
- **Màu thương hiệu / Tương tác:** Sử dụng lộn xộn giữa nhiều sắc độ:
  - Header: Nền xanh đen sâu `#0b1221`, nút danh mục xanh dương đậm `#2563eb`.
  - Nút bấm & CTA: Dùng `bg-blue-600 hover:bg-blue-500`, `bg-red-600`, và gradient đỏ cam `bg-gradient-to-r from-red-600 to-orange-500`.
  - Thẻ FlashSale: Gradient viền đỏ `from-red-600 via-orange-600 to-red-600`.
- **Màu Neutral (Xám/Nền):**
  - Nền trang chung: Dùng `#f1f5f9` (Slate-100) hoặc `#f8fafc` (Slate-50) không nhất quán giữa các trang.
  - Border: Trộn lẫn giữa `border-gray-100`, `border-gray-200`, `border-gray-300` và `border-slate-200`.
  - Văn bản: `text-gray-900`, `text-slate-800`, `text-gray-600`, `text-gray-400`.
- **Màu trạng thái (Alerts / Badges):**
  - Giảm giá: `bg-red-600` hoặc gradient vàng cam `bg-gradient-to-r from-yellow-400 to-amber-500`.
  - Tình trạng máy: `bg-amber-50 text-amber-800` (Like New), `bg-blue-50 text-blue-700` (Mới).

### 2.2. Typography
- **Font-family:** Sử dụng `Inter` thông qua `next/font/google` (`subsets: ["latin", "vietnamese"]`), ánh xạ vào biến `--font-sans`.
- **Font-size scale:** Dùng trực tiếp kích thước Tailwind (`text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-5xl`). Chưa có quy ước typography hierarchy cụ thể cho Heading, Subheading, Body, Spec label, Price VND.

### 2.3. Spacing & Container Widths
- **Container tối đa:** Các trang và section đều hard-code `container mx-auto px-4 max-w-[1370px]`.
- **Grid Gaps:** Không đồng đều giữa các trang (Homepage dùng `gap-4 md:gap-6`, Category dùng `gap-4`, Search dùng `gap-4 xl:gap-5`).

### 2.4. Radius & Shadows
- **Radius:** Không đồng nhất: nút bấm dùng `rounded-full`, card dùng `rounded-xl` hoặc `rounded-2xl`, modal/box dùng `rounded-3xl` (`rounded-3xl` ở ContactSection).
- **Shadows:** Tồn tại nhiều shadow lớn và có màu sắc gắt: `shadow-[0_10px_30px_rgba(220,38,38,0.3)]`, `shadow-[0_0_20px_rgba(37,99,235,0.4)]`.

### 2.5. Breakpoints
Sử dụng breakpoints mặc định của Tailwind CSS:
- `sm`: 640px
- `md`: 768px (ngưỡng chuyển đổi desktop header và ẩn mobile bottom nav)
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 3. Reusable Components (Đánh Giá Thành Phần Tái Sử Dụng)

### 3.1. Components nên GIỮ LẠI (Stable, hoạt động đúng logic)
1. **`CartContext.tsx` & `WishlistContext.tsx`:** Lưu trữ giỏ hàng, danh sách yêu thích client-side hoạt động ổn định, có dispatch event và tính tổng tiền.
2. **`CartIcon.tsx`:** Component icon giỏ hàng hiển thị badge số lượng phản ứng nhạy với context.
3. **`Breadcrumb.tsx`:** Hỗ trợ cả breadcrumb truyền props tĩnh lẫn tự động parse từ pathname URL, có schema breadcrumb thân thiện SEO.
4. **`ReviewForm.tsx`:** Form đánh giá sản phẩm có sao rating, upload hình ảnh, tương tác tốt.
5. **`ScrollToTop.tsx`:** Nút cuộn lên đầu trang nhẹ nhàng, tự ẩn hiện theo vị trí cuộn.

### 3.2. Components nên REFACTOR (Giữ logic/props, chuẩn hóa UI/UX & Responsive)
1. **`ProductCard.tsx`:** Đã được sửa ở Task 1 để hiển thị 11 thông số cốt lõi, loại bỏ viền cam, sửa lỗi thẻ button lồng link. Cần đưa vào sử dụng thống nhất trên toàn bộ Category, Search, Related products.
2. **`Header.tsx`:** Quá nặng (hơn 460 dòng), mega menu chỉ mở bằng hover chuột, thiếu keyboard accessibility (`aria-expanded`, Esc để đóng), responsive ở tablet (768px - 1024px) bị ép chật, hotline hiển thị không nhất quán.
3. **`CategoryFilters.tsx`:** Phân trang và bộ lọc đang làm hoàn toàn ở client memory; cần refactor để đồng bộ query params URL (`?brand=&price=&cpu=`), cho phép người dùng chia sẻ link đã lọc.
4. **`ProductGallery.tsx`:** Cần tối ưu responsive thumbnail trượt mượt trên mobile, xử lý fallback khi ảnh tải lỗi.
5. **`ProductPriceOptions.tsx` (PDP):** Xử lý chọn variant/SKU và tính toán giá chênh lệch, cần refactor để hiển thị rõ cấu hình từng SKU và trạng thái tồn kho thực tế.
6. **`Footer.tsx`:** Giữ nguyên cấu trúc thông tin nhưng chuẩn hóa lại khoảng cách, typography và xác nhận các cam kết chính sách với business.

### 3.3. Components nên THAY THẾ HOẶC XÓA BỎ
1. **`HeroSection.tsx`:** Banner quảng cáo gaming quá khổ (500px), chiếm toàn bộ viewport đầu trang khiến khách hàng không thấy sản phẩm; nút CTA không có liên kết điều hướng. Cần thay bằng Hero tinh gọn kết hợp lối tắt danh mục nhanh (Quick shortcuts).
2. **`SectionHeader.tsx`:** Các nút bấm lọc nhanh (ví dụ: "Dưới 20 Triệu", "MacBook") đang trỏ về link chung `/category/[slug]` mà không truyền tham số lọc. Cần thay bằng bộ tab lọc thực tế hoặc navigation link đúng nghĩa.
3. **`FlashSaleCountdown.tsx`:** Hiện đang có cơ chế endAt nhưng giao diện vẫn mang tính trang trí khẩn cấp giả nếu chưa cấu hình biến môi trường.

---

## 4. Data Dependencies (Phụ Thuộc Dữ Liệu Theo Từng Trang)

| Trang | Nguồn dữ liệu | API / Query liên quan | Dữ liệu Mock / Fallback | Client vs Server | Trạng thái Loading / Error hiện tại |
|---|---|---|---|---|---|
| **Home (`/`)** | Database Prisma + Fallback tĩnh | Direct Prisma trong `getSectionProducts` (`product-home.ts`) | `src/lib/home-mock-data.ts` (nếu không có DATABASE_URL) | Server Component (Streaming qua `Suspense`) | Có `<ProductSectionSkeleton>` dạng pulse khi đang stream dữ liệu. |
| **Category (`/category/[slug]`)** | Database Prisma + Fallback tĩnh | `prisma.product.findMany({ where: { category: { slug } } })` | `allProductsByCategory` và `generateFallbackProducts` trong file | Server Component fetch, đẩy danh sách xuống `CategoryFilters` (Client) | Chưa có skeleton riêng cho grid; nếu rỗng có Empty state cơ bản. |
| **PDP (`/product/[id]`)** | Database Prisma + Mock object fallback | `prisma.product.findUnique({ where: { id }, include: { category, variants } })` | Object `product` mock tĩnh 80 dòng trong file | Server Component | Production gọi `notFound()` nếu không có DB row; chưa có skeleton khi chuyển trang. |
| **Search (`/search`)** | REST API `/api/products` | `fetch(/api/products?search=...)` | Không có mock, phụ thuộc kết quả trả về từ API | Client Component (chạy `useEffect` theo query URL) | Có spinner xoay `RefreshCw` khi loading; có empty state khi 0 kết quả; chưa phân biệt lỗi mạng. |
| **Cart (`/cart`)** | Client LocalStorage | Thông qua `CartContext` (`localStorage.getItem("citilap_cart")`) | Mock mã giảm giá `"CITILAP100"` / `"WELCOME50"` hardcode trong file | Client Component | Xử lý tốt Empty state giỏ hàng rỗng với nút "Tiếp tục mua sắm". |
| **Checkout (`/checkout`)** | Giỏ hàng từ LocalStorage + API POST `/api/orders` | `POST /api/orders` với `idempotencyKey` | Dữ liệu tỉnh thành hardcode (`PROVINCES`), mã giảm giá mock | Client Component | Có trạng thái `isSubmitting` disable nút bấm; form validation báo lỗi rõ ràng. |

---

## 5. UX Problems (Đánh Giá Trải Nghiệm Người Dùng Chi Tiết)

1. **Hierarchy & First Impression:**
   - Homepage bị banner hero 500px chiếm trọn màn hình đầu tiên. Người dùng phải cuộn qua 2-3 màn hình mới tiếp cận được các dòng laptop cốt lõi.
   - Các khối sản phẩm lặp đi lặp lại một kiểu giao diện (header gradient màu sắc sặc sỡ -> 10 thẻ sản phẩm), làm giảm khả năng scan nhanh danh mục máy.
2. **Product Scanning & Density:**
   - Trước khi sửa `ProductCard`, các thẻ sản phẩm có viền cam dày khiến mắt người dùng bị phân tán. Bảng thông số cũ 5 dòng chiếm diện tích lớn nhưng hầu hết giá trị bị cắt cụt (`i7 1365...`, `RTX 40...`).
   - Khách hàng không phân biệt được đâu là laptop Mới 100% và đâu là laptop Like New 99% / Used nếu không bấm vào chi tiết từng sản phẩm.
3. **Navigation & Menu Discovery:**
   - Menu danh mục chính ở Header phụ thuộc hoàn toàn vào sự kiện di chuột (`hover`). Người dùng bàn phím (Tab/Enter) hoặc thiết bị màn hình cảm ứng không thể mở được menu con.
   - Nhãn danh mục ở thanh menu trên cùng dồn ép quá nhiều chữ viết hoa (`HOT SALE`, `LAPTOP GAMING`, `LAPTOP VĂN PHÒNG`, `LAPTOP ĐỒ HOẠ - KỸ THUẬT`, `APPLE - MACBOOK`, `LINH KIỆN - PHỤ KIỆN`, `TIN TỨC - REVIEW`) gây rối mắt trên màn hình dưới 1440px.
4. **Search Experience:**
   - Thanh tìm kiếm ở Header là một input cơ bản, chưa có autocomplete/gợi ý nhanh khi gõ phím.
   - Trang `/search` fetch lại toàn bộ danh sách ở client mỗi lần URL đổi, chưa có bộ lọc cấu hình (CPU, GPU, Giá) trên trang kết quả tìm kiếm.
5. **Trust & Business Transparency:**
   - Chưa làm bật được chính sách đổi trả, bảo hành và kiểm tra ngoại hình đối với laptop cũ/like-new – yếu tố sống còn để khách hàng ra quyết định mua laptop qua mạng.
   - Các liên kết thương hiệu ở chân trang chủ (`BrandSection`) trỏ về danh mục chung không kèm filter thương hiệu (bấm Dell lại ra trang văn phòng chung).
6. **Mobile Experience:**
   - Giá gạch ngang của sản phẩm từng bị tràn ra ngoài viền thẻ card trên màn hình 375px.
   - Nút bottom navigation có mục "Danh mục" nhưng lại trỏ cứng tới `/category/laptop-gaming` thay vì mở ngăn kéo (drawer) tất cả danh mục.

---

## 6. Technical Risks (Rủi Ro Kỹ Thuật Khi Redesign)

1. **API Contracts:**
   - API `/api/products` và `/api/orders` đang phục vụ cả storefront lẫn admin. Khi tối ưu hóa DTO hoặc thay đổi trường dữ liệu hiển thị, không được phá vỡ cấu trúc payload mà admin đang sử dụng.
2. **Cart & Inventory Logic:**
   - Giỏ hàng client không được tự ý tính lại đơn giá hoặc áp đặt khuyến mãi mà không thông qua kiểm tra tồn kho và định giá từ server khi vào checkout.
3. **Product Variants / SKU Structure:**
   - Mỗi laptop có nhiều SKU (RAM 8GB vs 16GB, SSD 512GB vs 1TB) và số serial riêng cho máy cũ. Redesign PDP phải đảm bảo khi khách hàng chọn variant, giá và tình trạng tồn kho của SKU đó phản ánh tức thì và thêm đúng SKU vào đơn hàng.
4. **SEO & Routing Stability:**
   - Toàn bộ URL hiện có (`/category/[slug]`, `/product/[id]`, `/chinh-sach/[slug]`) cùng metadata SEO canonical không được đổi đường dẫn để tránh gãy link index của Google.
5. **Hydration & React 19:**
   - Dự án chạy Next.js 16 (Turbopack) và React 19. Việc đọc `localStorage` (giỏ hàng, wishlist, theme) ngay khi mount component dễ gây lỗi Hydration Mismatch nếu không bọc trong `useEffect` hoặc kiểm tra `mounted` an toàn.

---

## 7. Recommended Component Architecture (Cây Component Đề Xuất Cho Storefront)

```text
src/
├── components/
│   ├── ui/                         [Design System Primitives]
│   │   ├── Container.tsx           (Khung giới hạn chiều rộng chuẩn hóa: 1280px / 1370px)
│   │   ├── Button.tsx              (Nút bấm đồng nhất: primary, secondary, outline, ghost)
│   │   ├── Badge.tsx               (Huy hiệu: condition, discount, stock status)
│   │   ├── PriceTag.tsx            (Format chuẩn giá VND hiện tại & giá cũ gạch ngang)
│   │   ├── SpecChip.tsx            (Chip cấu hình laptop CPU, GPU, RAM, SSD, Màn hình)
│   │   ├── Skeleton.tsx            (Shimmer loading chuẩn)
│   │   └── EmptyState.tsx          (Trạng thái không có dữ liệu kèm nút hành động)
│   ├── layout/                     [Site Chrome]
│   │   ├── Header/
│   │   │   ├── Header.tsx          (Khung Header chính, sticky header tinh giản)
│   │   │   ├── TopAnnouncement.tsx (Thanh cam kết ngắn gọn: giao hàng, hotline)
│   │   │   ├── SearchBar.tsx       (Thanh tìm kiếm nổi bật có phím tắt & suggestions)
│   │   │   ├── NavMenu.tsx         (Thanh điều hướng danh mục hỗ trợ bàn phím + click)
│   │   │   └── MobileNavDrawer.tsx (Ngăn kéo menu mobile phân cấp mượt mà)
│   │   ├── Footer/
│   │   │   └── Footer.tsx          (Chân trang chuẩn thông tin Citilap, chính sách)
│   │   └── MobileBottomNav.tsx     (Thanh điều hướng 5 tab chuẩn cho mobile)
│   ├── product/                    [Product Domain Components]
│   │   ├── ProductCard.tsx         (Card chuẩn hóa 11 thông số, hỗ trợ grid & list)
│   │   ├── ProductGrid.tsx         (Lưới hiển thị card responsive 2-3-4-5 cột)
│   │   ├── ProductGallery.tsx      (Thư viện ảnh chi tiết máy)
│   │   ├── ProductPriceOptions.tsx (Chọn cấu hình CPU/RAM/SSD/VGA & SKU)
│   │   └── ProductSpecsTable.tsx   (Bảng thông số kỹ thuật chi tiết)
│   ├── home/                       [Homepage Domain Sections]
│   │   ├── HomeHero.tsx            (Hero hiện đại kết hợp banner ngắn + cam kết)
│   │   ├── QuickShortcuts.tsx      (Lối tắt tìm máy: Gaming, Like-New, Văn phòng, Giá)
│   │   ├── HomeProductSection.tsx  (Khối laptop theo nhu cầu: Grid trực quan)
│   │   ├── HomeFlashSale.tsx       (Khối deal giảm giá giờ vàng tinh gọn)
│   │   └── TrustSignals.tsx        (Khối chính sách cam kết chất lượng máy lướt)
│   └── category/                   [PLP Domain Components]
│       ├── FilterSidebar.tsx       (Thanh lọc laptop theo cấu hình & tầm giá)
│       ├── FilterDrawer.tsx        (Bản lọc dạng drawer cho mobile)
│       └── ActiveFilters.tsx       (Danh sách chip filter đang chọn + nút Xóa tất cả)
```

---

## 8. Recommended Execution Order (Thứ Tự Thực Thi & Phụ Thuộc Kỹ Thuật)

```text
[Step 0: Audit Baseline] (HIỆN TẠI)
         │
         ▼
[Step 1: Design System Foundation]
(Tạo design tokens, palette, spacing, typography scale, primitives UI: Button, Badge, Price, Container)
         │
         ├────────────────────────────────────────┐
         ▼                                        ▼
[Step 2: Header, Navigation & Search Shell]   [Step 3: Product Card System]
(Thanh tìm kiếm, mega menu, mobile drawer)    (Chuẩn hóa 11 specs, grid/compact, a11y)
         │                                        │
         └──────────────────┬─────────────────────┘
                            ▼
               [Step 4: Redesign Homepage]
               (Hero tinh gọn, Quick shortcuts, các section laptop thật)
                            │
                            ▼
               [Step 5: Category & Product Listing Page (PLP)]
               (Bộ lọc CPU/GPU/RAM/Giá, sync URL params, sort, mobile filter drawer)
                            │
                            ▼
               [Step 6: Product Detail Page (PDP)]
               (Cấu hình SKU, thư viện ảnh, thông số đầy đủ, trust block)
                            │
                            ▼
               [Step 7: Search, Cart & Checkout UI Polishing]
               (Hoàn thiện luồng mua hàng và kết thúc storefront)
```

---

## 9. Baseline Quality Gates Verification (Kiểm Tra Hiện Trạng Repo)

Các lệnh kiểm tra được thực hiện độc lập tại thư mục gốc dự án:

1. **TypeScript Check (`npx tsc --noEmit`):**
   ```text
   > npm notice run citilap-web2@0.1.0 npx
   > npm notice run tsc --noEmit
   Kết quả: EXIT CODE 0 (0 lỗi).
   ```
2. **ESLint (`npm run lint`):**
   ```text
   > npm notice run citilap-web2@0.1.0 lint
   > npm notice run eslint

   C:\Users\Admin\Desktop\citilap-web2\src\app\(shop)\cart\page.tsx
     4:94   warning  'ChevronRight' is defined but never used
     4:108  warning  'ShoppingBag' is defined but never used

   C:\Users\Admin\Desktop\citilap-web2\src\app\(shop)\checkout\page.tsx
     5:116  warning  'CheckCircle2' is defined but never used
     5:130  warning  'ChevronRight' is defined but never used

   C:\Users\Admin\Desktop\citilap-web2\src\components\category\CategoryFilters.tsx
     5:21   warning  'useSearchParams' is defined but never used

   ✖ 5 problems (0 errors, 5 warnings)
   Kết quả: EXIT CODE 0 (Không có lỗi error, chỉ có 5 warning baseline cũ).
   ```
3. **Production Build (`npm run build`):**
   ```text
   > npm notice run citilap-web2@0.1.0 build
   > npm notice run next build
   ▲ Next.js 16.3.1 (Turbopack)
   ✓ Compiled successfully in 16.6s
   ✓ Generating static pages using 7 workers (37/37) in 584ms
   Kết quả: EXIT CODE 0 (Tất cả 37 routes build thành công).
   ```

Tất cả các lỗi/warning trên là baseline có sẵn từ trước, không can thiệp sửa đổi trong Step 0 theo đúng quy định.
