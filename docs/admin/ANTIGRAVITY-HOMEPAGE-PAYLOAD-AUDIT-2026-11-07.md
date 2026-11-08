# Báo Cáo Kiểm Toán Payload Trang Chủ (Read-Only) — `ROUND9`

- **Ngày thực hiện**: `2026-11-07`
- **Trạng thái**: `ROUND9 AUDIT DONE (READ-ONLY — CHỜ CODEX REVIEW)`
- **Phạm vi**: Phân tích tĩnh (static field map) ranh giới tuần tự hóa Server-to-Client (`RSC` → `'use client'`) tại `BlockRenderer` → `ProductTabs` / `ProductCarousel` → `ProductCard` và các thành phần con. Không sửa mã nguồn sản phẩm, không chạy lệnh shell, không thêm dependency/cache/API, không cắt giảm số lượng tab hay sản phẩm đã xuất bản.

---

## 1. Hiện trạng Bằng chứng Runtime & Giới hạn Đo đạc

1. **Số liệu Baseline đã có**:
   - File bằng chứng [`.wrangler/ui-overnight-20261107/performance-round8/results.json`](file:///C:/Users/Admin/Desktop/citilap-web2/.wrangler/ui-overnight-20261107/performance-round8/results.json) (và `performance-production-preview/results.json`) ghi nhận tổng dung lượng tài liệu HTML/RSC giải mã của trang chủ `/` (`navigationDecodedBytes`) là **`1,195,969` bytes**.
2. **Bằng chứng Runtime còn thiếu (Missing Runtime Evidence)**:
   - Con số `1,195,969` bytes là kích thước **toàn bộ tài liệu (whole-document decoded bytes)** bao gồm HTML SSR của toàn trang, inline Flight/RSC chunks, header/footer/navigation, settings và tất cả các section.
   - **Hiện chưa có số đo runtime tách riêng (actual resolved DTO byte size)** cho phần payload JSON của `resolvedTabs` / `HomepageProduct[]` truyền qua ranh giới `'use client'` tại `ProductTabs`, cũng như chưa có số đo byte đóng góp của từng trường riêng lẻ trên dữ liệu trang chủ đã xuất bản.
   - Do đó, báo cáo này **chỉ cung cấp bản đồ trường tĩnh (static field map)** dựa trên mã nguồn thực tế, **tuyệt đối không đưa ra tuyên bố hay ước lượng số học (no numeric byte/LCP claims)** về dung lượng tiết kiệm được.

---

## 2. Chuỗi Truyền Dữ Liệu tại Ranh Giới `BlockRenderer` → `ProductTabs`

1. **Nguồn tạo DTO phía Server**:
   - [`mapD1ProductToHomepageProduct`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts#L660-L872) trong [`src/server/services/catalog.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts#L16-L51) trả về đối tượng `HomepageProduct & { matchesFilter: boolean }`.
   - [`resolveSectionsForStorefront`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts#L492-L648) trong [`src/server/services/site-builder.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts#L568-L607) gán danh sách tab vào `section.resolvedTabs` bằng cách spread toàn bộ cấu hình tab (`...t`) kèm `href: normalizedHref` và `products: filtered.slice(0, tabLimit)`.
2. **Ranh giới Server Component → Client Component**:
   - Trong [`src/components/builder/BlockRenderer.tsx`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/builder/BlockRenderer.tsx#L297-L308) (`ProductGridBlock`, dòng `307`):
     ```tsx
     if (section.resolvedTabs?.length) return <ProductTabs title={data.title} subtitle={data.subtitle} tabs={section.resolvedTabs} />;
     ```
   - Ngoài ra, tại dòng `354` của [`BlockRenderer.tsx`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/builder/BlockRenderer.tsx#L354), nếu `section.id === 'sec-hot-sale'` (khi không có prop `flashSale` thay thế), `BlockRenderer` truyền `products` vào `<ProductCarousel products={products} label={data.title} />`, và ở dòng `357` render `<ProductCard product={p} />` (tương tự `FeaturedCollectionBlock` ở dòng `536`).
   - [`ProductTabs`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/home/ProductTabs.tsx#L1-L211) (`'use client'`) và [`ProductCard`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/product/ProductCard.tsx#L1-L465) (`'use client'`) đều là Client Components, nên toàn bộ props truyền vào chúng được React tuần tự hóa vào RSC Flight payload của tài liệu trả về.

---

## 3. Bản Đồ Trường Tĩnh (Static Field Map)

### 3.1. Các trường cấp Tab (`section.resolvedTabs[i]`)

Nguồn tạo: [`resolveSectionsForStorefront`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts#L600-L604) (`return { ...t, href: normalizedHref, products: filtered.slice(0, tabLimit) }`) dựa trên [`productGridTabItemSchema`](file:///C:/Users/Admin/Desktop/citilap-web2/src/contracts/cms/site-builder.ts#L93-L102).

| Trường trên `resolvedTabs[i]` | Nguồn tạo | Nơi tiêu thụ ở Client (`ProductTabs.tsx`) | Trạng thái tiêu thụ | Phân loại (Keep / Drop Candidate) |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `productGridTabItemSchema` | `ProductTabs.tsx` (dòng `39`, `52`, `68`, `69`, `90`, `106`, `111`, `114`): nhận diện laptop tab, DOM id, ARIA, React `key`, thông báo tab `clearance` | **Có tiêu thụ** | **KEEP** |
| `label` | `productGridTabItemSchema` | `ProductTabs.tsx` (dòng `40`, `99`, `111`, `116`, `126`): regex `/laptop/i`, tên nút tab, `aria-label` carousel, empty state, nút "Xem {label}" | **Có tiêu thụ** | **KEEP** |
| `href` | `productGridTabItemSchema` + `normalizedHref` | `ProductTabs.tsx` (dòng `16-21`, `46`, `120`, `123`): `normalizeTabHref(rawTab)` và `<Link href={tab.href}>` | **Có tiêu thụ** | **KEEP** |
| `limit` | `productGridTabItemSchema` | `ProductTabs.tsx` (dòng `47`): `rawTab.limit && rawTab.limit > 0 ? filteredProducts.slice(0, rawTab.limit) : filteredProducts` | **Có tiêu thụ** | **KEEP** |
| `enabled` | `productGridTabItemSchema` | `ProductTabs.tsx` (dòng `32`): `rawTabs.filter((t) => t.enabled !== false)` | **Có tiêu thụ** | **KEEP** |
| `products` | `resolveSectionsForStorefront` | `ProductTabs.tsx` (dòng `41-48`, `110-111`) → `ProductCarousel` → `ProductCard` | **Có tiêu thụ** | **KEEP** (xem bảng 3.2 cho từng trường con) |
| `productIds` | `...t` từ `productGridTabItemSchema` (`string[]`, tối đa 48 ID) | Không có component client nào đọc sau khi server đã phân giải sang `products` | **Không tiêu thụ ở Client** | **DROP CANDIDATE** (chỉ tại ranh giới prop truyền xuống `ProductTabs`) |
| `sourceMode` | `...t` từ `productGridTabItemSchema` (`'manual' \| 'rule'`) | Không có component client nào đọc | **Không tiêu thụ ở Client** | **DROP CANDIDATE** (chỉ tại ranh giới prop truyền xuống `ProductTabs`) |
| `ruleCriteria` | `...t` từ `productGridTabItemSchema` (object cấu hình rule) | Không có component client nào đọc | **Không tiêu thụ ở Client** | **DROP CANDIDATE** (chỉ tại ranh giới prop truyền xuống `ProductTabs`) |

---

### 3.2. Các trường cấp Sản phẩm (`HomepageProduct` / `ProductCardProduct`)

Nguồn tạo: [`mapD1ProductToHomepageProduct`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts#L832-L871).
Chuỗi tiêu thụ: [`ProductTabs.tsx`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/home/ProductTabs.tsx) → [`ProductCarousel`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/home/ProductTabs.tsx#L138-L211) → [`ProductCard.tsx`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/product/ProductCard.tsx) → [`productHref`](file:///C:/Users/Admin/Desktop/citilap-web2/src/lib/product-paths.ts), [`detectBrandName` / `BrandLogo`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/ui/BrandLogo.tsx), [`ConditionBadge`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/ui/ConditionBadge.tsx), [`StockBadge`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/ui/StockBadge.tsx), [`SpecChip`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/ui/SpecChip.tsx), [`WishlistContext`](file:///C:/Users/Admin/Desktop/citilap-web2/src/context/WishlistContext.tsx), [`CompareContext`](file:///C:/Users/Admin/Desktop/citilap-web2/src/context/CompareContext.tsx).

| Trường trên Product DTO | Kiểu dữ liệu (`catalog.service.ts`) | Chi tiết tiêu thụ tại `ProductTabs` / `ProductCard` & Component con | Trạng thái tiêu thụ | Phân loại (Keep / Drop Candidate) |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | - `ProductCarousel` (dòng `187`): `key={`${p.id}:${p.variantId \|\| ''}`}`<br>- `ProductCard` (dòng `165-166`, `174-178`, `187-192`): kiểm tra & thêm/xóa `WishlistContext` (`productId: product.id`) và `CompareContext` (`id: product.id`, fallback `slug: product.slug \|\| product.id`)<br>- `productHref` (`product-paths.ts` dòng `4`): fallback URL khi thiếu `href` và `slug` | **Có tiêu thụ** (Wishlist, Compare, Link fallback, React key) | **KEEP** |
| `variantId` | `string \| undefined` | - `ProductCarousel` (dòng `187`): `key={`${p.id}:${p.variantId \|\| ''}`}`<br>- `ProductCard` (dòng `200`): tạo query `?variant=${encodeURIComponent(product.variantId)}` khi không có `sku` | **Có tiêu thụ** (Variant link & React key) | **KEEP** |
| `sku` | `string \| undefined` | - `ProductCard` (dòng `200`): ưu tiên tạo query `?sku=${encodeURIComponent(product.sku)}` nối vào `productHref` | **Có tiêu thụ** (Variant SKU link) | **KEEP** |
| `slug` | `string` | - `ProductCard` (dòng `192`): truyền vào `compareCtx.addToCompare({ ..., slug: product.slug \|\| product.id })`<br>- `detectBrandName` (`BrandLogo.tsx` dòng `28`): ghép `${product.name} ${product.slug}` để nhận diện thương hiệu khi `brand` trống<br>- `productHref` (`product-paths.ts` dòng `4`): tạo đường dẫn `/laptop/${slug}` hoặc `/phu-kien/${slug}` nếu `href` không có | **Có tiêu thụ** (Compare, Brand detection fallback, Link fallback) | **KEEP** |
| `href` | `string \| undefined` | - `ProductTabs` (dòng `42`): lọc phụ kiện khỏi tab laptop (`!p.href?.startsWith('/phu-kien/')`)<br>- `ProductCard` (dòng `201`, `226`): `getProductHref(product)` trả về trực tiếp `product.href` nếu có; kiểm tra `isAccessory` (`product.href.startsWith("/phu-kien/")`) để ẩn specs | **Có tiêu thụ** (Tab filter, Card link, Accessory check) | **KEEP** |
| `template` | `string \| undefined` | - `ProductTabs` (dòng `42`): lọc phụ kiện (`p.template !== 'ACCESSORY'`)<br>- `ProductCard` (dòng `195`, `225`): truyền `template: product.template` vào `compareCtx.addToCompare` (để `CompareContext` phân nhóm sản phẩm so sánh) và kiểm tra `isAccessory` (`product.template !== "LAPTOP"`), cũng như fallback trong `productHref` | **Có tiêu thụ** (Tab filter, Compare group, Accessory check, Link fallback) | **KEEP** |
| `name` | `string` | - `ProductCard` (dòng `191`, `212`, `249`, `259`, `277`, `299`, `355`, `358`): tên hiển thị (`formatProductTitle`), `alt` ảnh, `title` link, `aria-label` nút Compare/Wishlist, truyền vào `CompareContext.addToCompare`, truyền làm `fallbackName` cho `ConditionBadge` (`ConditionBadge.tsx` dòng `96`) và `detectBrandName` (`BrandLogo.tsx` dòng `28`) | **Có tiêu thụ** (Title, A11y, Compare, Brand/Condition fallback) | **KEEP** |
| `brand` | `string \| undefined` | - `ProductCard` (dòng `209`, `333`) → `detectBrandName(product)` (`BrandLogo.tsx` dòng `25`): ưu tiên trả về `product.brand.trim()`, quyết định màu nền/viền thẻ (`getBrandCardTheme`) và logo thương hiệu (`BrandLogo`) | **Có tiêu thụ** (Brand theme & BrandLogo) | **KEEP** |
| `series` | `string \| undefined` | - `ProductCard` (dòng `333`) → `<BrandLogo brand={detectedBrand} series={product.series} />` (`BrandLogo.tsx` dòng `349-353`): hiển thị nhãn `• {series}` cạnh logo thương hiệu | **Có tiêu thụ** (Series label) | **KEEP** |
| `condition` | `string` | - `ProductCard` (dòng `249`) → `<ConditionBadge condition={product.condition} fallbackName={product.name} />` (`ConditionBadge.tsx` dòng `69-112`): hiển thị nhãn tình trạng (`Mới 100%`, `LikeNew 99%`, ...) | **Có tiêu thụ** (Condition badge) | **KEEP** |
| `price` | `number` | - `ProductCard` (dòng `193`, `217-220`, `337`, `366`): hiển thị giá bán chính (`formatVnd(product.price)`), so sánh với giá cũ để tính phần trăm giảm giá và điều kiện hiển thị giá gạch ngang, truyền `Number(product.price) \|\| 0` vào `CompareContext.addToCompare` | **Có tiêu thụ** (Pricing & Compare) | **KEEP** |
| `originalPrice` | `number \| null \| undefined` | - `ProductCard` (dòng `211`, `217-218`): `effectiveOldPrice = product.originalPrice ?? product.oldPrice`; tính `discountPercent` khi `isOnSale` và hiển thị giá gạch ngang | **Có tiêu thụ** (Struck-through price & Discount fallback) | **KEEP** |
| `oldPrice` | `number \| null \| undefined` | - `ProductCard` (dòng `211`): fallback trong `effectiveOldPrice = product.originalPrice ?? product.oldPrice`. Tuy nhiên trong `mapD1ProductToHomepageProduct` (dòng `851-852`), server luôn gán cả `originalPrice: resolved.compareAtPrice` và `oldPrice: resolved.compareAtPrice` cùng một giá trị | **Trùng lặp 100% với `originalPrice`** khi tạo từ `mapD1ProductToHomepageProduct` | **DROP CANDIDATE** (nếu giữ `originalPrice` thì `effectiveOldPrice` vẫn nhận đúng `product.originalPrice`) |
| `discount` | `string \| undefined` | - `ProductCard` (dòng `215-216`, `342-346`): ưu tiên hiển thị nhãn phần trăm giảm giá (`-13%`) trước khi tính fallback | **Có tiêu thụ** (Discount badge) | **KEEP** |
| `isOnSale` | `boolean \| undefined` | - `ProductCard` (dòng `217`): dùng trong nhánh fallback tính `discountPercent` khi `product.discount` không có sẵn | **Có tiêu thụ** (Discount fallback logic) | **KEEP** |
| `image` | `string \| null` | - `ProductCard` (dòng `194`, `294`): truyền vào `CompareContext.addToCompare({ ..., image: product.image })` và hiển thị ảnh thẻ (`product.thumbnailUrl \|\| product.image \|\| product.primaryImage`) | **Có tiêu thụ** (Card image & Compare item image) | **KEEP** |
| `primaryImage` | `string \| null` | - `ProductCard` (dòng `294`): chỉ được đọc làm fallback thứ 3 (`product.thumbnailUrl \|\| product.image \|\| (product as { primaryImage?: string }).primaryImage`). Trong `mapD1ProductToHomepageProduct` (dòng `862-863`), cả `primaryImage` và `image` đều được gán cùng chuỗi `resolvedImage` (thường là URL `/api/library/<uuid>`). *Lưu ý*: `CompareContext` đọc `product.image` chứ không đọc `primaryImage`. | **Trùng lặp 100% với `image`** (chỉ là fallback khi `image` vắng mặt) | **DROP CANDIDATE** (giữ `image`; chỉ giữ `primaryImage` nếu `image` bị rỗng, hoặc chuẩn hóa vào `image`) |
| `thumbnailUrl` | `string \| null \| undefined` | - `ProductCard` (dòng `294-295`): `ProductCardProduct` khai báo optional, nhưng `mapD1ProductToHomepageProduct` hiện không gán trường này (không xuất hiện trong payload). | **Có đọc nếu tồn tại** (nhưng server không phát sinh) | **KEEP** (nếu có) / Không tốn byte hiện tại |
| `availability` | `string \| undefined` | - `ProductCard` (dòng `202`, `366`, `427-449`): quyết định trạng thái hết hàng (`isOutOfStock` khi `UNAVAILABLE`), hiển thị giá `'Liên hệ'` khi `CONTACT`, và hiển thị nhãn chân thẻ (`Sẵn hàng`, `Đặt trước`, `Liên hệ`, `Tạm hết hàng`) | **Có tiêu thụ** (Stock/Availability UI & Price Contact state) | **KEEP** |
| `stock` | `number` | - `ProductCard` (dòng `202`, `430`, `439`, `443`, `451`) → `<StockBadge stock={product.stock} />`: quyết định `isOutOfStock` và trạng thái kho (`Sẵn hàng` vs `Tạm hết hàng` / `Còn N máy`) | **Có tiêu thụ** (Stock state & StockBadge) | **KEEP** |
| `warranty` | `string \| undefined` | - `ProductCard` (dòng `203-206`, `420`, `423`): định dạng qua `formatWarranty(product.warranty, "BH 12 tháng")` và hiển thị ở chân thẻ | **Có tiêu thụ** (Warranty footer) | **KEEP** |
| `specs` (`cpu`, `ram`, `ssd`, `gpu`, `display`) | `{ cpu?: string; ram?: string; ssd?: string; gpu?: string; display?: string }` | - `ProductCard` (dòng `227-232`, `375-413`): định dạng qua `formatCpuSpec`, `formatGpuSpec`, `formatRamSpec`, `formatStorageSpec`, `formatDisplaySpec` và hiển thị 4 `SpecChip` cùng `title` gốc | **Có tiêu thụ** (4 SpecChips & tooltips) | **KEEP** |
| `matchesFilter` | `boolean` | - Được gắn vào đối tượng trả về của `mapD1ProductToHomepageProduct` (dòng `834`) để lọc nội bộ phía server (`catalog.service.ts` dòng `1074`, `1126`). Không có trong interface `ProductCardProduct` và không được bất kỳ component client nào đọc. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `rawPrice` | `number \| undefined` | - Giá gốc chưa qua chiến dịch khuyến mãi (`catalog.service.ts` dòng `848`). Không được `ProductTabs`, `ProductCard` hay context nào đọc. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `rawOriginalPrice` | `number \| null \| undefined` | - Giá niêm yết gốc trước khi tính khuyến mãi (`catalog.service.ts` dòng `849`). Không được `ProductTabs`, `ProductCard` hay context nào đọc. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `category` | `string \| undefined` | - Tên danh mục (`catalog.service.ts` dòng `842`). Không được `ProductTabs`, `ProductCard` hay context nào đọc. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `categorySlug` | `string \| undefined` | - Slug danh mục (`catalog.service.ts` dòng `843`). Dùng ở server khi tạo `href` (dòng `836`), nhưng không được `ProductTabs`, `ProductCard` hay context nào đọc. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `model` | `string \| undefined` | - Mã model (`catalog.service.ts` dòng `844`). Khai báo trong `ProductCardProduct` (dòng `33`) nhưng `ProductCard`, `detectBrandName`, `BrandLogo` đều **không đọc** `product.model`. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `isFlashSale` | `boolean \| undefined` | - Cờ flash sale (`catalog.service.ts` dòng `854`). Dùng ở server khi lọc `ON_SALE` (dòng `2326`), nhưng trong `ProductCard.tsx` (dòng `28`) dù có khai báo kiểu vẫn **không được đọc** ở bất kỳ biểu thức render nào. | **Không tiêu thụ ở Client** | **DROP CANDIDATE** |
| `badge` | `string \| undefined` | - Khai báo trong `ProductCardProduct` (dòng `39`), nhưng `mapD1ProductToHomepageProduct` không gán và `ProductCard.tsx` cũng không đọc `product.badge`. | **Không tiêu thụ ở Client** (và server không phát sinh) | **DROP CANDIDATE** |

> **Ghi chú về Analytics / Cart Links trên `ProductCard`**:
> - `ProductCard` **không** có nút "Thêm vào giỏ" trực tiếp (chỉ có slot `footerAction?: React.ReactNode`, không được truyền từ `ProductTabs` hay `BlockRenderer`).
> - `ProductCard` **không** gọi hàm analytics trực tiếp; sự kiện `trackStorefront('compare')` trong [`CompareContext.tsx`](file:///C:/Users/Admin/Desktop/citilap-web2/src/context/CompareContext.tsx#L121) chỉ gửi tên sự kiện `'compare'` khi người dùng mở bảng so sánh (`openCompare`), không phụ thuộc vào các trường dư thừa của sản phẩm.

---

## 4. Đề Xuất Duy Nhất: Phép Chiếu Nhỏ Nhất An Toàn tại Ranh Giới `BlockRenderer` (Smallest Safe Server-to-Client Projection)

### 4.1. Khuyến nghị điều phối: Chưa thực thi cho đến khi đo được DTO Bytes thực tế
- **Khuyến nghị**: **KHÔNG triển khai (NO implementation)** phép chiếu này cho đến khi đo được dung lượng byte thực tế của `resolvedTabs` / `HomepageProduct` trên trang chủ đã xuất bản (ví dụ qua script read-only đo `Buffer.byteLength(JSON.stringify(...))`).
- **Lý do**: Tổng dung lượng tài liệu `1,195,969` bytes bao gồm toàn bộ SSR HTML markup, CSS classes và các thành phần khác của trang. Các trường dư thừa trên mỗi sản phẩm (`matchesFilter`, `rawPrice`, `rawOriginalPrice`, `oldPrice`, `primaryImage`, `category`, `categorySlug`, `model`, `isFlashSale`) và trên mỗi tab (`productIds`, `sourceMode`, `ruleCriteria`) có thể chỉ chiếm một phần nhỏ trong tổng tài liệu. Việc sửa đổi code khi chưa có số đo byte thực tế của DTO là tối ưu hóa mù (premature optimization).

### 4.2. Thiết kế Phép Chiếu Tối Thiểu (Nếu được Codex chấp thuận sau khi đo DTO)
Nếu kết quả đo DTO thực tế cho thấy việc rút gọn prop tại ranh giới Client Component mang lại lợi ích đáng kể, chỉ thực hiện **một phép chiếu cục bộ (local projection helper)** ngay trong Server Component [`src/components/builder/BlockRenderer.tsx`](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/builder/BlockRenderer.tsx) trước khi truyền props sang `<ProductTabs>`, `<ProductCarousel>` hoặc `<ProductCard>`:

1. **Giữ nguyên hoàn toàn hợp đồng `HomepageProduct` và logic Server**:
   - **Không** sửa kiểu `HomepageProduct` trong [`src/server/services/catalog.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts) hay `ResolvedSectionItem` trong [`src/server/services/site-builder.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts), vì các bài kiểm thử tích hợp (`scripts/test-r07a-site-builder.mjs` dòng `685-688`, `709-713`) và các service khác đang kiểm tra trực tiếp `oldPrice`, `isFlashSale`, `deepEqual` trên kết quả của `resolveSectionsForStorefront`.
   - **Không** thêm API mới, **không** tải tab động (dynamic tab loading), **không** thêm tầng cache mới, và **không** cắt giảm số lượng tab/sản phẩm đã xuất bản.

2. **Danh sách trường giữ lại chính xác (Exact Keep Fields)**:
   - **Trên mỗi Tab truyền vào `<ProductTabs>`**:
     - Giữ: `id`, `label`, `href`, `limit`, `enabled`, `products` (đã qua chiếu).
     - Loại bỏ khỏi prop client: `productIds`, `sourceMode`, `ruleCriteria`.
   - **Trên mỗi Product truyền vào `ProductTabs` / `ProductCarousel` / `ProductCard`**:
     - Giữ:
       - Định danh & Liên kết: `id`, `slug`, `href`, `sku`, `variantId`, `template`
       - Hiển thị & Thương hiệu: `name`, `brand`, `series`, `condition`, `image` (với fallback `product.image ?? product.primaryImage ?? null`), `thumbnailUrl` (nếu có)
       - Giá & Khuyến mãi: `price`, `originalPrice` (với fallback `product.originalPrice ?? product.oldPrice ?? null`), `discount`, `isOnSale`
       - Kho & Bảo hành: `availability`, `stock`, `warranty`
       - Cấu hình: `specs` (`cpu`, `ram`, `ssd`, `gpu`, `display`)
     - Loại bỏ khỏi prop client: `matchesFilter`, `rawPrice`, `rawOriginalPrice`, `oldPrice` (đã gộp vào `originalPrice`), `primaryImage` (đã gộp vào `image`), `category`, `categorySlug`, `model`, `isFlashSale`, `badge`.

### 4.3. Bất biến đầu ra (Output Invariants) & Đánh giá Rủi ro
- **Bất biến đầu ra (Invariants)**:
  1. Số lượng section, số lượng tab, thứ tự tab, giới hạn `limit` của tab và số lượng/thứ tự sản phẩm hiển thị trong từng tab/grid **giữ nguyên 100%**.
  2. Đường dẫn sản phẩm (`productHref` + `?sku=` / `?variant=`), màu sắc/logo thương hiệu (`detectBrandName` / `BrandLogo`), nhãn tình trạng (`ConditionBadge`), giá bán/giá gạch ngang/phần trăm giảm giá, trạng thái kho (`availability` / `StockBadge`), thông số kỹ thuật (`SpecChip`), bảo hành (`formatWarranty`), chức năng Yêu thích (`WishlistContext`) và So sánh (`CompareContext`) **cho kết quả DOM và hành vi tương tác giống hệt 100%**.
  3. Đối với `SiteBuilderEditor.tsx` (Admin Preview là `'use client'` gọi trực tiếp `BlockRenderer`), phép chiếu trong `BlockRenderer` hoàn toàn tương thích ngược vì chỉ đọc đúng các trường `ProductCardProduct` cần dùng.
- **Rủi ro**:
  - Nếu một sản phẩm thiếu `image` nhưng có `primaryImage` (hoặc thiếu `originalPrice` nhưng có `oldPrice`), việc bỏ `primaryImage` / `oldPrice` mà không chuẩn hóa sẽ làm mất ảnh hoặc giá cũ. **Cách phòng ngừa**: Luôn gán `image: p.image ?? p.primaryImage ?? null` và `originalPrice: p.originalPrice ?? p.oldPrice ?? undefined` khi tạo object chiếu.

---

## 5. Kế Hoạch Xác Thực Khả Thi (Runnable Validation Plan)

Khi Codex yêu cầu đo đạc và/hoặc cho phép triển khai ở vòng tiếp theo, quy trình kiểm증 gồm:

1. **Bước 1 — Đo đạc DTO thực tế (Read-Only) trước khi quyết định code**:
   - Chạy script Node/Miniflare độc lập (tương tự môi trường cô lập của `scripts/test-r07a-site-builder.mjs` hoặc đọc bản snapshot `published` của trang chủ trên D1 local ở chế độ read-only) để gọi `getPublicHomepage(DB)`.
   - Tính chính xác `Buffer.byteLength(JSON.stringify(section.resolvedTabs))` và `Buffer.byteLength(JSON.stringify(section.resolvedProducts))` trước và sau khi áp dụng hàm chiếu `projectProductForCard`.
   - Chỉ tiến hành Bước 2 nếu mức giảm byte được Codex đánh giá là đáng giá.
2. **Bước 2 — Kiểm tra tĩnh & Hợp đồng Service**:
   - `npx tsc --noEmit` (Exit code `0`).
   - `npx eslint src/components/builder/BlockRenderer.tsx` (Exit code `0`).
   - `node scripts/test-r07a-site-builder.mjs` (Đảm bảo `12/12` bài kiểm tra tích hợp dịch vụ `site-builder.service.ts` và `catalog.service.ts` vẫn `PASS` 100%).
3. **Bước 3 — Kiểm tra bất biến giao diện & HTML/RSC Payload**:
   - Chạy `npm run build:cloudflare` và kiểm tra trên bản local production preview:
     - So sánh DOM chụp từ các thẻ `ProductCard` trong `ProductTabs` (tiêu đề, `href`, ảnh `src`, giá bán, giá gạch ngang, nhãn giảm giá, 4 chip cấu hình, bảo hành, tình trạng kho, nút Compare/Wishlist) đảm bảo **không có bất kỳ sai khác nào**.
     - Đo lại `navigationDecodedBytes` của `/` trong cùng điều kiện chuẩn để ghi nhận chênh lệch thực tế.

## Codex review - static audit accepted, projection not approved

Static field map accepted as candidate inventory only. No actual resolved DTO byte measurement, so no payload reduction or latency claim. No product source changed in ROUND9. Earlier audit discovery did run read-only shell searches before narrowed continuation; opening scope wording should not be read as zero shell use throughout ROUND9.

Reject fallback normalization as currently proposed: ProductCard image uses thumbnailUrl || image || primaryImage || null; image ?? primaryImage changes empty-string behavior. CompareContext also receives original product.image directly, so merging primaryImage into image can change comparison state even when rendered card looks identical. Safest initial projection must keep image, primaryImage, thumbnailUrl and oldPrice independently with original values, then omit only proven unused fields. Same consideration applies to Admin preview import boundary: local projection there does not establish reduced server-to-client payload for that path.

Next task: measure exact resolved published DTO bytes on read-only snapshot with existing Miniflare tooling; account per tab, per product field, repeated products and actual rendered client boundaries. Plain JSON byte counts are diagnostic estimates, not encoded React Flight savings. Preserve authored counts/order/prices and leave product code unchanged until measured benefit and parity checks justify smallest diff.
