# Sổ Bộ Nguồn Dữ Liệu Chuẩn (Content Source Registry)

> **Dự án:** CitiLap CMS & Storefront  
> **Phiên bản:** V2 (Chuẩn hóa R03B)  
> **Ngày cập nhật:** 2026-10-15  

> **Nguyên tắc cốt lõi:** Mỗi thực thể dữ liệu có duy nhất 1 nguồn chuẩn (Single Source of Truth), 1 service ghi chuẩn (Canonical Writer), và mọi thay đổi giao diện/công cộng phải tuân thủ chu kỳ kiểm soát trạng thái.

---

## 1. Bảng Phân Định Nguồn Chuẩn (Canonical Source of Truth Matrix)

| Thực thể dữ liệu | Nguồn lưu trữ chuẩn | Service quản lý chuẩn | Tuyến API Admin | Tuyến API / Route Public | Quyền hạn ghi (Writers) |
|---|---|---|---|---|---|
| **Sản phẩm (Laptop & Phụ kiện)** | Bảng `ProductStudio` (JSON draft/published) + bảng `Product` & `ProductVariant` (chiếu tìm kiếm & Storefront) | `src/server/services/product-studio.service.ts` | `/api/admin/products` | `/api/products` (chỉ đọc), `/product/[id]` | **Chỉ có `writeStudio`** qua `/api/admin/products`. Khóa 409 toàn bộ 5 legacy writers. |
| **Lịch sử Phiên bản (Product Revisions)** | Bảng `ProductStudioRevision` (Append-only JSON snapshot, không sửa/xóa) | `src/server/services/product-studio.service.ts` | `/api/admin/products/[id]/revisions`, `/revisions/[rId]/restore` | Không công khai | **Tự động sinh bởi `writeStudio`** khi Lưu nháp hoặc Xuất bản. Khôi phục tạo revision mới `expectedRevision + 1`. |
| **Thương hiệu (Brands)** | Bảng `Brand` (D1 canonical: id, name, slug, logo, description, seoTitle, seoDescription, status) | `src/server/services/brand.service.ts` | `/api/admin/brands`, `/api/admin/brands/[id]` | `/api/brands`, `/brand/[slug]` | **Chỉ có `writeBrand`** qua `/api/admin/brands`. Có bảo vệ khóa ngoại (không xóa Brand khi còn sản phẩm liên kết). |
| **Bài viết & Đánh giá (Posts/Reviews)** | Bảng `PostStudio` (draft/published JSON snapshot) + bảng `Post` (chiếu công khai & tìm kiếm) | `src/server/services/post.service.ts` | `/api/admin/posts`, `/api/admin/posts/[id]` | `/api/news`, `/news/[slug]` | **Chỉ có `post.service.ts`**. Đảm bảo cô lập nháp 100%, slug redirect 301, và phân giải live catalog cho sản phẩm liên quan. |
| **Lịch sử Bài viết (Post Revisions)** | Bảng `PostStudioRevision` (Append-only JSON snapshot, không sửa/xóa) | `src/server/services/post.service.ts` | `/api/admin/posts/[id]/revisions`, `.../restore` | Không công khai | **Tự động sinh bởi `post.service.ts`** khi Lưu nháp hoặc Xuất bản. Khôi phục tạo revision mới `expectedRevision + 1`. |
| **Chuyên mục Tin tức (Post Categories)** | Bảng `PostCategory` (D1: id, name, slug, description, sortOrder) | `src/server/services/post.service.ts` | `/api/admin/post-categories`, `.../[id]` | `/news?category=[slug]` (301 từ `/news/category/[slug]`) | **Chỉ có `post.service.ts`**. Bảo vệ CAS `expectedRevision`, chặn xóa khi có bài viết đang liên kết (`POST_CATEGORY_IN_USE`). |
| **Trang Tĩnh & Chính sách (Pages/Policies)** | Bảng `PageStudio` (draft/published JSON snapshot) + bảng `Page` (chiếu công khai) | `src/server/services/page.service.ts` | `/api/admin/pages`, `/api/admin/pages/[id]` | Các route chính sách (`/chinh-sach-bao-hanh`, `/chinh-sach-doi-tra`, `/gioi-thieu`...) | **Chỉ có `page.service.ts`**. Partial unique index cho `pageType` hệ thống (`WARRANTY`, `RETURNS`, `SHIPPING`, `ABOUT`, `STORES`). |
| **Lịch sử Trang Tĩnh (Page Revisions)** | Bảng `PageStudioRevision` (Append-only JSON snapshot, không sửa/xóa) | `src/server/services/page.service.ts` | `/api/admin/pages/[id]/revisions`, `.../restore` | Không công khai | **Tự động sinh bởi `page.service.ts`** khi Lưu nháp hoặc Xuất bản. Khôi phục tạo revision mới `expectedRevision + 1`. |
| **Trình Dựng Trang Chủ & Landing Page (Site Builder)** | Bảng `LandingPage` (metadata, slug, status, isHome) + `LandingPageStudio` (draft/published JSON snapshot) | `src/server/services/site-builder.service.ts` | `/api/admin/builder`, `/api/admin/builder/[id]`, `/preview`, `/revisions`, `/restore` | `/` (Trang chủ StoreFront), `/landing/[slug]` | **Chỉ có `writeLandingPage`**. Kiểm soát CAS `expectedRevision`, DB trigger `landing_page_revision_guard`, cô lập nháp 100%. |
| **Lịch sử Site Builder (LandingPageRevision)** | Bảng `LandingPageRevision` (Append-only JSON snapshot) | `src/server/services/site-builder.service.ts` | `/api/admin/builder/[id]/revisions`, `.../restore` | Không công khai | **Tự động ghi lại** mọi thao tác lưu nháp/xuất bản/hủy xuất bản. Khôi phục tạo revision nháp mới. |
| **Bộ Sưu Tập Sản Phẩm (Collections)** | Bảng `NavigationStudio` (mảng `collections[]` chế độ `manual` / `rule`) | `src/server/services/navigation.service.ts` | `/api/admin/navigation` | `/collection`, `/collection/[slug]`, `/api/catalog/collections`, `.../[slug]` | **Chỉ có `navigation.service.ts`**. Lọc sản phẩm `ACTIVE` thời gian thực, cấm xuất bản bộ sưu tập thủ công chứa sản phẩm nháp. |
| **Tài nguyên Media (Hình ảnh, Video)** | Cloudflare R2 Bucket + Bảng `MediaAsset` (metadata, alt, sizes, sha256) | `src/server/services/media-library.service.ts` | `/api/admin/media` | CDN R2 Public URL | **Chỉ có Media Library**. Khi xóa kiểm tra tham chiếu `MediaUsage` trong Catalog và Post/Page revisions. |
| **Cài đặt Website & Nhận diện (Settings)** | Bảng `SiteSettings` (D1 canonical id='site', bảng lịch sử `SiteSettingsRevision`) | `src/server/services/settings.service.ts` | `/api/admin/settings` | Header, Footer, MobileBottomNav, `/lien-he`, `/he-thong-cua-hang` qua `getStorefrontSettings()` | **Chỉ có `writeSettings`**. Logo/motto/hotline/showroom/social đã nối StoreFront (R07A). |
| **Chiến Dịch Khuyến Mại & Unified Pricing (PROMO-01 / R07B.1 & R07B.2)** | Bảng `PromotionCampaign` + `PromotionCampaignItem` (D1 canonical) kết hợp `SiteSettings` (Flash sale fallback) + `Product.isFlashSale` | `src/server/services/pricing.service.ts` & `src/server/services/campaign.service.ts` | `/api/admin/campaigns`, `/api/admin/campaigns/[id]`, `/publish`, `/archive`, `/admin/campaigns`, `/api/admin/settings` | Storefront: Search (`search.service.ts`), Navigation collections (`navigation.service.ts`), Site Builder (`site-builder.service.ts`), Compare (`/api/compare`), PDP (`/product/[id]`), Revalidate (`/api/cart/revalidate`), Đặt hàng (`POST /api/orders`) | **Chỉ có `campaign.service.ts` ghi chiến dịch** (bảo vệ CAS `expectedRevision`, D1 atomic batch, chặn overlap trên cả Save PUBLISHED và Publish, validate target tồn tại/variant parentage/duplicate). **Chỉ có `pricing.service.ts` tính giá** (cách ly biến thể không mượn giá cha, campaign sản phẩm không tự áp biến thể, kiểm tra `[startAt, endAt)` trên item explicit, fail-closed DB). Đơn hàng snapshot bất biến: `regularPriceSnapshot`, `compareAtPriceSnapshot`, `campaignSnapshot`, `pricingEvaluatedAt`. |
| **Checkout settings (SET-02)** | Cùng `SiteSettings`: `shippingFee`, `freeShippingThreshold`, `codEnabled`, `bankTransferEnabled`, `bankAccountInfo` | `settings.service.ts` (ghi) + checkout/order services (đọc — **chờ R07C**) | `/api/admin/settings` | `/checkout`, `POST /api/orders`, (dự kiến) `POST /api/checkout/quote` | **Chưa nối StoreFront.** Admin đã lưu D1; `createOrder` đang hardcode `shippingFee = 0` và checkout hardcode `COD`. Thiết kế: [R07C-CHECKOUT-SETTINGS.md](./R07C-CHECKOUT-SETTINGS.md). Prompt: [prompts/PROMPT-R07C.md](./prompts/PROMPT-R07C.md). |
| **Checkout / đặt hàng (SF-03)** | Bảng `Order` + `OrderItem` (snapshot bất biến) | `order.service.ts` | `/api/admin/orders` | `/checkout`, `/checkout/success`, `POST /api/orders` | Writer chuẩn `createOrder` + idempotency (R06). Tiêu thụ pricing R07B (verify 0đ); R07C bổ sung verify ship/method; không cổng TT online. |
| **Hệ thống Điều hướng (Navigation)** | Bảng `NavigationMenu` & `NavigationItem` (D1) | `src/server/services/navigation.service.ts` | `/api/admin/navigation` | Gắn trực tiếp vào layout server-side | **Chỉ có Navigation Studio**. Có kiểm tra liên kết hợp lệ. |

---

## 2. Quy Tắc 3 Trục Trạng Thái Sản Phẩm (3-Axis State Invariant)

Hệ thống CitiLap V2 phân định độc lập 3 trục trạng thái sản phẩm nhằm chấm dứt hoàn toàn sự nhầm lẫn giữa trạng thái hiển thị, kho hàng và tình trạng máy:

```
[ Trục 1: Publication ]   -> DRAFT (Nháp) | PUBLISHED (Đang hiển thị) | ARCHIVED (Lưu trữ)
[ Trục 2: Condition ]     -> NEW (Mới 100%) | LIKE_NEW (99%) | USED (Cũ) | REFURBISHED | LIQUIDATION
[ Trục 3: Availability ]  -> AVAILABLE (Còn hàng) | PREORDER (Đặt trước) | CONTACT (Liên hệ) | UNAVAILABLE (Hết hàng)
[ Trục 4: Marketing Tag ] -> isNewArrival (Hàng mới về) | isBestSeller (Bán chạy) | isFeatured (Nổi bật)
```

### Các bất biến nghiêm ngặt:
1. **Lưu nháp (Save Draft) độc lập hoàn toàn với Storefront:** Khi lưu nháp sản phẩm đang `PUBLISHED`, website công cộng vẫn giữ nguyên nội dung bản snapshot cũ cho tới khi quản trị viên thực hiện hành động **Xuất bản website**.
2. **Availability không đồng nhất với Publication Status:** Sản phẩm có thể `PUBLISHED` nhưng tình trạng hàng là `CONTACT` (Liên hệ) hoặc `PREORDER` (Đặt trước). Không được tự động chuyển `PREORDER` thành `AVAILABLE`.
3. **Condition không phải là trạng thái xuất bản:** Máy `LIKE_NEW` hay `USED` vẫn có chu kỳ xuất bản `DRAFT` -> `PUBLISHED` hoàn chỉnh.
4. **Nhãn marketing do người dùng quyết định:** Không tự động sinh giả nhãn `Bán chạy` hay `Hàng mới về` nếu chưa có nguồn chỉ số vận hành thực.

---

## 3. Quản Trị Thương Hiệu (Brand Subsystem Rules)

### 3.1. Nguồn chuẩn duy nhất:
- Không tạo dataset thương hiệu riêng biệt hoặc hard-code mảng JS.
- Bảng `Brand` trong SQLite/D1 là nguồn chân lý duy nhất.
- Bảng `Product` liên kết với `Brand` qua cột `brandId` (khóa ngoại mềm) và cột `brand` (tên hiển thị phục vụ tìm kiếm).

### 3.2. Quy tắc Lưu & Hiển thị:
- Lưu Brand có hiệu lực ngay lập tức trên hệ thống (không qua chu kỳ xuất bản draft/published phức tạp, nhưng được phân tách bằng trạng thái `ACTIVE` / `INACTIVE`).
- Thương hiệu `INACTIVE` sẽ bị ẩn khỏi Storefront công cộng. Trong giao diện Admin / Product Editor, các thương hiệu `INACTIVE` vẫn được tải và hiển thị với nhãn `(Tạm ẩn)` để đảm bảo sản phẩm đã gán thương hiệu này không bị mất dữ liệu liên kết.

### 3.3. Bảo vệ dữ liệu tham chiếu (Referential Guard):
- Không thể xóa một Brand nếu còn bất kỳ sản phẩm nào (`Product.deletedAt IS NULL`) đang liên kết với nó.
- Endpoint trả về lỗi `HTTP 400 BRAND_IN_USE` kèm số lượng sản phẩm liên kết, hướng dẫn quản trị viên chuyển sang trạng thái `INACTIVE` thay vì xóa.

---

## 4. Cơ Chế Lịch Sử & Khôi Phục (History & Restore Invariants)

```
[Revision N (Published)] ---> [Sửa & Lưu nháp] ---> [Revision N+1 (Draft)]
                                                         |
                                                  (Khôi phục Rev N)
                                                         |
                                                         v
                                              [Revision N+2 (Draft mới)]
                                         * Website vẫn giữ nội dung cũ *
                                         * Chỉ thay đổi sau khi Xuất bản *
```

1. **Bất biến Append-only:** Bảng `ProductStudioRevision` là bất biến. Không có API xóa, sửa hay ghi đè revision cũ.
2. **Khôi phục thành bản nháp (Restore as Draft):** Thao tác khôi phục một revision cũ sẽ tạo ra một revision mới (`expectedRevision + 1`) với `action = 'restore'` và ghi vào `ProductStudio.draft`.
3. **Bảo toàn Storefront:** Bản snapshot công khai `ProductStudio.published` và các cột tìm kiếm trên bảng `Product` tuyệt đối **không bị thay đổi** cho đến khi quản trị viên bấm nút Xuất bản.
4. **Chống xung đột ghi đè (Optimistic Concurrency 409):** Mọi thao tác lưu và khôi phục đều yêu cầu `expectedRevision`. Nếu hai quản trị viên cùng thao tác đồng thời, thao tác sau sẽ nhận `HTTP 409 Conflict`.

---

## 5. Quy Tắc Lọc & Khớp Biến Thể Chuẩn (Query & Variant Filter Invariants)

Nhằm đảm bảo người dùng Storefront không bao giờ nhận kết quả sai hoặc giá gây hiểu lầm:

1. **Atomic Variant Isolation:**
   - Sản phẩm có biến thể: Điều kiện lọc (RAM, SSD, GPU, Condition, Price) bắt buộc phải được thỏa mãn **đồng thời trên cùng một biến thể** (`variants: { some: variantMatch }`).
   - Mệnh đề `baseMatch` tuyệt đối không được phép làm lọt sản phẩm có biến thể nếu không có bất kỳ biến thể nào đáp ứng đủ điều kiện.
   - Sản phẩm legacy không biến thể: Lọc qua `baseMatch` với điều kiện cô lập `{ variants: { none: { status: "ACTIVE" } } }`.
2. **Chuẩn hóa Đơn vị & Ngăn va chạm Substring:**
   - Bộ lọc RAM 16GB dùng word boundary/equality clause, tuyệt đối không dùng substring lỏng lẻo gây khớp nhầm "116GB".
   - Bộ lọc dung lượng 1TB tự động mở rộng khớp cả `1024GB`, `1000GB`, `1TB`.
3. **Semantics Giá Card & Sort:**
   - Khi một biến thể đáp ứng bộ lọc (ví dụ lọc RAM 32GB trên laptop có bản 16GB giá 20tr và 32GB giá 35tr), thẻ card sản phẩm (`ProductCard`) bắt buộc hiển thị giá của biến thể 32GB (35 triệu), không hiển thị giá của bản 16GB gây hiểu lầm là cấu hình đang lọc rẻ hơn thực tế.
4. **Phụ kiện Facet thích ứng:**
   - Chỉ hiển thị các nhóm facet thực sự có dữ liệu (Chuột: Chuẩn kết nối `connection`; Sạc/Hub: Công suất `power`). Ẩn hoàn toàn facet CPU/RAM trên danh mục chuột, bàn phím, phụ kiện.

---

## 6. Phân Hệ So Sánh & Sản Phẩm Liên Quan (Compare & Related Invariants)

1. **So Sánh Công Cộng (Compare Endpoint `/api/compare`):**
   - Giới hạn tối đa 3 sản phẩm (`MAX_COMPARE_PRODUCTS = 3`). Yêu cầu vượt quá 3 ID trả về HTTP 400 rõ ràng.
   - Chỉ so sánh các sản phẩm đã xuất bản (`PUBLISHED`) và đang `ACTIVE`. Sản phẩm bị ẩn sau khi chọn sẽ tự động bị loại bỏ khỏi bảng so sánh.
   - Chặn so sánh giữa các nhóm sản phẩm không tương thích (ví dụ Laptop vs Chuột).
   - Chỉ hiển thị thuộc tính có cờ `isComparable = true`. Thuộc tính bị thiếu hiển thị `"Chưa cập nhật"`. Đánh dấu `isDifferent = true` chính xác khi có sự khác biệt giữa các sản phẩm.
2. **Sản Phẩm Liên Quan (Related Resolver `getRelatedProducts`):**
   - Danh sách thủ công do Admin cấu hình được ưu tiên hàng đầu theo đúng thứ tự mảng.
   - Luôn loại bỏ sản phẩm hiện tại (`self-reference`) và khử trùng lặp ID.
   - Tự động loại bỏ sản phẩm `DRAFT` hoặc `INACTIVE`.
   - Cơ chế Fallback: Tự động bổ sung sản phẩm cùng danh mục/thương hiệu cho đủ limit mà không bao giờ trùng với các sản phẩm đã có.

---

## 7. Phân Hệ CMS Tin Tức & Trang Tĩnh (Content CMS & Invariants)

1. **Bất biến Cô lập Bản nháp (Strict Draft Isolation):**
   - Lưu nháp bài viết (`Post`) hoặc trang tĩnh (`Page`) chỉ ghi vào bảng `PostStudio.draft` / `PageStudio.draft` và thêm bản ghi snapshot vào bảng lịch sử append-only `PostStudioRevision` / `PageStudioRevision`.
   - Tuyệt đối **không thay đổi** bảng công khai `Post` / `Page`, không thay đổi slug công khai và không ảnh hưởng đến bất kỳ trang người dùng nào trên Storefront.
   - Chỉ khi quản trị viên thực hiện hành động **Xuất bản (Publish)** thì hệ thống mới cập nhật bản ghi `Post` / `Page` công khai.

2. **Lịch sử Slug & Điều Hướng 301 (Slug History & 301 Redirects):**
   - Khi một bài viết hoặc trang đã xuất bản được đổi slug và tái xuất bản, slug cũ được tự động lưu vào mảng `slugHistory` trong `PostStudio.published` / `PageStudio.published`.
   - Khi người dùng hoặc bot tìm kiếm truy cập URL cũ (ví dụ `/news/slug-cu`), service `publicPostBySlug` / `publicPageBySlug` phát hiện slug nằm trong `slugHistory` và trả về cờ chuyển hướng 301 (`permanentRedirect('/news/slug-moi')`).

3. **Bảo Vệ Từ Khóa Cấm & Xung Đột Slug (Reserved Slugs & Guard):**
   - Hệ thống từ chối mọi bài viết hoặc trang tĩnh sử dụng slug trùng với các route cốt lõi của website (`RESERVED_SLUGS`: `api`, `admin`, `news`, `product`, `category`, `brand`, `cart`, `checkout`, `account`, `search`, `login`, `gioi-thieu`, `chinh-sach-bao-hanh`, `chinh-sach-doi-tra`, `chinh-sach-van-chuyen`, `he-thong-cua-hang`).
   - Ngăn chặn xóa danh mục bài viết (`PostCategory`) nếu đang có bài viết sử dụng (`POST_CATEGORY_IN_USE`), trả về HTTP 400 kèm hướng dẫn chuyển danh mục.

4. **Phân Giải Sản Phẩm Liên Quan Động (Live Catalog Related Products):**
   - Bài viết lưu danh sách `relatedProductIds` (thủ công, có thứ tự).
   - Khi hiển thị Storefront, service phân giải trực tiếp với catalog D1 (`catalogService.getProductSummaryByIds`).
   - Tự động loại bỏ sản phẩm nháp (`DRAFT`), ẩn (`ARCHIVED`), hoặc đã bị xóa mềm (`deletedAt IS NOT NULL`).
   - Bảo toàn chính xác thứ tự sắp xếp do người biên tập chỉ định.
   - Nguyên tắc Fail-Closed: Không bao giờ dùng mock hay đánh giá giả định khi kết nối DB lỗi.

5. **Theo Dõi Tài Nguyên Media (`MediaUsage`):**
   - Mọi ảnh đại diện (`coverImage`) và ảnh chèn trong nội dung HTML của Post/Page đều được ghi nhận vào bảng `MediaUsage` với `ownerType = 'POST_REVISION' | 'PAGE_REVISION'` và `slot = '${revision}:${assetId}'`.
   - Parser phân giải an toàn các đường dẫn tương đối `/api/media/:storageKey`, `/api/library/:id` và cùng tên miền.
   - Bỏ qua an toàn các CDN bên ngoài mà không làm crash luồng lưu/xuất bản.
   - Khi unpublish hoặc khôi phục, xử lý bao dung (tolerant) không làm gián đoạn hệ thống nếu tệp media vật lý đã bị xóa khỏi R2.

6. **Đơn Nhất Nguồn Dữ Liệu Chi Nhánh (Single Source of Truth for Store Locations):**
   - Trang tĩnh `/he-thong-cua-hang` (`STORES`) sử dụng CMS Page để quản lý nội dung giới thiệu, hình ảnh không gian cửa hàng và hướng dẫn khách mua.
   - Dữ liệu vận hành chi nhánh (địa chỉ Hà Nội, hotline, địa chỉ Bắc Ninh...) kế thừa trực tiếp từ `SiteSettings` trong D1 (`getAdminSettings`).
   - Ghi chú phân tách phạm vi: Hiện cấu trúc mảng đa chi nhánh động đầy đủ trong Settings thuộc phạm vi R07A. Trong R05/R05.1, trang cửa hàng lấy thông tin hotline/địa chỉ vận hành từ `SiteSettings` trong D1 hợp nhất với cấu trúc showroom, đảm bảo không lệch hotline giữa trang cửa hàng, footer và trang liên hệ.

7. **Quy Tắc 5 Trạng Thái Trang Chính Sách & Fail-Closed (5-State Policy Resolution):**
   - Toàn bộ 5 trang chính sách (`/chinh-sach-bao-hanh`, `/chinh-sach-doi-tra`, `/chinh-sach-van-chuyen`, `/gioi-thieu`, `/he-thong-cua-hang`) tuân thủ nghiêm ngặt 5 trạng thái thông qua `getSystemPageResolution`:
     - **Trạng thái A (`NO_CMS_RECORD`):** Chưa từng có bản ghi CMS trong D1. Áp dụng fallback chuyển tiếp hiển thị nội dung tĩnh chuẩn được ghi nhận trong Content Registry.
     - **Trạng thái B (`DRAFT_ONLY`):** Có bản nháp trong D1 nhưng chưa từng xuất bản (`publishedAt IS NULL`). Tiếp tục hiển thị fallback chuyển tiếp; tuyệt đối không để rò rỉ nội dung bản nháp ra Storefront công khai.
     - **Trạng thái C (`PUBLISHED`):** Đã xuất bản chính thức. Hiển thị 100% nội dung CMS từ D1, áp dụng thẻ meta SEO động (`seo.title`, `seo.description`, `ogImageUrl`).
     - **Trạng thái D (`UNPUBLISHED`):** Đã chủ động hủy xuất bản (`publishedAt` bị null sau khi đã publish). **Tuyệt đối không tự ý hiển thị lại bản hard-code legacy**. Hiển thị thông báo chính sách tạm thời cập nhật hoặc ẩn khỏi sitemap công khai.
     - **Trạng thái E (`INFRASTRUCTURE_ERROR`):** Lỗi kết nối D1 / binding / migration. **Fail-Closed bắt buộc**: Không nuốt ngoại lệ (catch-all) để biến lỗi hạ tầng thành nội dung tĩnh chính thức; hệ thống ném ngoại lệ rõ ràng để cơ chế bảo vệ hạ tầng xử lý.

8. **Phạm Vi Chính Sách Trên Trang Chi Tiết Sản Phẩm (PDP Policy Scope):**
   - PDP (`/product/[id]`) cung cấp liên kết chuẩn hóa trỏ trực tiếp đến trang chính sách bảo hành công khai `/chinh-sach-bao-hanh`.
   - Nội dung thông số thời hạn bảo hành hiển thị tại PDP (ví dụ "12 tháng", "24 tháng") lấy từ trường `Product.warranty` và `ProductStudio.warranties` của sản phẩm đó.
   - Ghi nhận rõ: PDP không phải là nơi render nhúng toàn văn CMS policy động; liên kết policy đảm bảo trỏ đúng trang CMS đã xuất bản.

9. **Giao Thức Điều Hướng Vĩnh Viễn Next.js App Router (HTTP 308 Permanent Redirect):**
   - Next.js App Router triển khai `permanentRedirect()` trả về mã trạng thái chuẩn **HTTP 308 (RFC 7538 Permanent Redirect)** nhằm bảo toàn phương thức HTTP của request ban đầu.
   - Mọi liên kết slug cũ của bài viết (`Post`), slug cũ của trang tĩnh (`Page`), và chuyên mục tin tức `/news/category/[slug]` chuyển hướng sang URL mới với mã HTTP 308, được kiểm chứng thực tế qua HTTP client với `redirect: 'manual'`.

10. **Quy Tắc Kiến Trúc Site Builder & Bộ Sưu Tập (R07A Architecture Rules):**
    - **Phân định Trang chủ và Landing Page:** Trang chủ (`id = 'home'`) là duy nhất và đại diện cho root `/`. Các landing page tùy biến có `isHome = 0`, slug hợp lệ (không trùng `RESERVED_SLUGS`), phục vụ tại `/landing/[slug]`.
    - **9 Loại Khối Giao Diện Chuẩn Hóa:**
      1. `banner`: Hero banner hoặc sub-banner quảng bá.
      2. `intro`: Giới thiệu thương hiệu & dải cam kết giá trị.
      3. `featured_categories`: Hệ sinh thái danh mục sản phẩm.
      4. `product_grid`: Lưới sản phẩm động (hỗ trợ phân giải live catalog theo ID thủ công hoặc tiêu chí rule).
      5. `collection_slider`: Khối trình chiếu dựa trên bộ sưu tập CMS.
      6. `news_reviews`: Tin tức & đánh giá media mới nhất.
      7. `faq`: Câu hỏi thường gặp có hỗ trợ schema JSON-LD.
      8. `cta`: Khối kích thích chuyển đổi (Chat Zalo, Hotline, Đăng ký).
      9. `featured_brands`: Logo thương hiệu đối tác liên kết.
    - **Nguyên tắc Phân Giải Live Catalog & Cách Ly Bản Nháp:**
      - Chỉ những sản phẩm có `status = 'ACTIVE'` và `deletedAt IS NULL` mới được trả về trên StoreFront.
      - Sản phẩm bị chuyển sang `DRAFT` hoặc xóa mềm sẽ tự động biến mất khỏi các khối trên StoreFront mà không gây vỡ giao diện.
      - Tuyệt đối không để lộ dữ liệu bản nháp (draft) của Trang chủ hay Landing Page ra trang công khai trước khi quản trị viên thực hiện hành động **Xuất bản (Publish)**.
    - **Bộ Sưu Tập Thủ Công & Tự Động (Collections Manual vs Rule):**
      - **Thủ công (`manual`):** Admin chọn danh sách ID sản phẩm cụ thể. Kiểm tra nghiêm ngặt không cho phép xuất bản nếu danh sách chứa sản phẩm đang ở trạng thái `DRAFT`.
      - **Tự động (`rule`):** Lọc theo loại sản phẩm (`laptop` / `accessory`), danh mục, thương hiệu, tag (`isFeatured`, `isNewArrival`, `isBestSeller`), độ khả dụng và sắp xếp. Tự động cập nhật sản phẩm mới phù hợp tiêu chí.
    - **Đồng Bộ Dữ Liệu StoreFront Toàn Diện (StoreFront Sync):**
      - `Header.tsx`, `Footer.tsx`, `MobileBottomNav.tsx`, và `/lien-he` đều tiêu thụ dữ liệu tập trung qua facade `getStorefrontSettings()` trong `src/server/services/storefront-cms.service.ts`.
      - Mọi thay đổi về Logo, Favicon, Slogan/Motto, Hotline, Email, Giờ mở cửa, Địa chỉ chi nhánh Hà Nội & Bắc Ninh, Bản quyền và Mạng xã hội trong Admin Settings được phản ánh tức thì trên toàn bộ các thành phần StoreFront.

---

## 11. Quy Tắc Định Giá Hợp Nhất & Giờ Vàng (R07B Pricing Invariants)

1. **Đơn Nhất Động Cơ Tính Giá (Unified Pricing Engine):**
   - Mọi nơi hiển thị và xử lý giá (`ProductCard`, `/hot-sale`, trang chủ, PDP `/product/[id]`, biến thể, sản phẩm liên quan, giỏ hàng và tạo đơn hàng) đều bắt buộc tiêu thụ thông qua `src/server/services/pricing.service.ts`.
   - Tuyệt đối cấm tính giá ad-hoc hoặc tự suy diễn giá khuyến mãi trên UI client.

2. **Khung Giờ Chiến Dịch Thực Tế & Khoảng Thời Gian Nửa Mở `[startAt, endAt)`:**
   - Khung giờ Flash Sale được cấu hình tập trung trong `SiteSettings` (`flashSaleStartAt`, `flashSaleEndAt`, `flashSaleEnabled`, `flashSaleTitle`) và lưu trữ theo chuẩn UTC.
   - Trạng thái sale được xác định theo công thức nửa mở: `now >= startAt && now < endAt`.
   - Zod schema nghiêm ngặt: từ chối lưu cài đặt nếu `startAt >= endAt` khi bật chiến dịch.
   - Loại bỏ hoàn toàn sự phụ thuộc vào biến môi trường `NEXT_PUBLIC_FLASH_SALE_END_AT`.

3. **Hết Hạn Giá Tức Thì Phía Máy Chủ (Server-Enforced Immediate Expiration):**
   - Khi chiến dịch không hoạt động (`isFlashSaleActive === false`), sản phẩm có cờ `isFlashSale = true` và `originalPrice > price` tự động có giá hiệu lực (`effectivePrice`) khôi phục về `originalPrice`, và `compareAtPrice = null`.
   - Loại bỏ việc phải chờ cron/worker quét DB để phục hồi giá niêm yết.

4. **Xác Thực Giá Tạo Đơn Hàng Sai Số 0 Đồng (0đ Tolerance Price Verification):**
   - Luồng tạo đơn hàng (`order.service.ts`) tính lại `effectivePrice` trực tiếp trên server từ dữ liệu gốc trong D1.
   - Đối chiếu với `item.expectedPrice` do client gửi lên. Nếu có bất kỳ sự sai lệch nào (`expectedPrice !== effectivePrice`), server từ chối tạo đơn và trả mã lỗi **HTTP 409 Conflict** (`code: 'PRICE_CHANGED'`).
   - Đơn hàng snapshot bất biến: `OrderItem.price` lưu `effectivePrice`, `OrderItem.compareAtPrice` lưu giá so sánh (nếu có), và `OrderEvent` ghi nhận nhật ký chiến dịch ưu đãi.

5. **Đồng Hồ Đếm Ngược Theo Mốc Thực Tế (Milestone Countdown Invariant):**
   - `FlashSaleCountdown.tsx` chỉ hiển thị 3 mốc thực tế: Sắp diễn ra (`Bắt đầu trong:`), Đang diễn ra (`Kết thúc trong:`), Đã kết thúc (`Flash sale đã kết thúc`).
   - Tuyệt đối không tự động cuộn thêm giờ (artificial reset) khi hết hạn.

6. **Cách Ly Biến Thể Tuyệt Đối (Variant Price Isolation — R07B.2):**
   - Biến thể (`ProductVariant`) tuyệt đối không mượn `originalPrice` của sản phẩm cha (`Product`), kể cả khi `variant.originalPrice` là `null`.
   - `effectiveOriginal` của biến thể luôn bằng `variant.originalPrice`. Nếu biến thể không có `originalPrice` riêng, `compareAtPrice` là `null` và `isOnSale = false` (trừ khi có chiến dịch sale chỉ định riêng biến thể với `salePrice < variant.price`).
   - Cấm mọi biểu thức fallback `variant.originalPrice ?? product.originalPrice` trên toàn bộ hệ thống (PDP, Card, Order, JSON-LD, Pricing Engine).

7. **Phạm Vi Chiến Dịch An Toàn (Safe Campaign Scope — R07B.2):**
   - Khuyến mại ở cấp độ sản phẩm (`PromotionCampaignItem` chỉ có `productId`, không có `variantId`) **chỉ áp dụng cho sản phẩm base không biến thể**.
   - Tuyệt đối không tự ý áp đặt mức giá sale của sản phẩm cha vào các biến thể cấu hình khác nhau. Mỗi biến thể muốn có giá ưu đãi bắt buộc phải có bản ghi item explicit (`productId` + `variantId`).
   - Rào chắn kiểm thực (`assertValidCampaignTargets`): từ chối xuất bản hoặc lưu chiến dịch nếu `variantId` không thuộc `productId`, nếu target không tồn tại trong DB, nếu trùng lặp target trong cùng chiến dịch, hoặc nếu `salePrice >= regularPrice`.

8. **Đồng Bộ Ngữ Cảnh Chiến Dịch Toàn Bộ Consumer (Universal Storefront Context):**
   - Mọi consumer công khai đều lấy chung ngữ cảnh định giá tại cùng một thời điểm đánh giá `evaluatedAt` qua `getStorefrontPricingContext(db, at)`.
   - Các consumer đã được tích hợp chuẩn:
     - `search.service.ts`: `searchProducts(options, client, pricingContext)`
     - `navigation.service.ts`: `publicCollection(db, slug)` tự động lấy context và định giá sản phẩm
     - `site-builder.service.ts`: `resolveSectionsForStorefront(db, sections)` định giá toàn bộ khối `product_grid`
     - `/api/compare`: định giá cho danh sách sản phẩm so sánh
     - `/product/[id]`: PDP nạp context định giá, truyền `pricingTarget` chính xác cho biến thể được chọn
     - `/api/cart/revalidate`: endpoint tái thẩm định giỏ hàng từ server, phát hiện sai lệch giá thời gian thực.

9. **Bảo Vệ Bất Biến & Chống Xung Đột CAS Quản Trị Chiến Dịch (CAS Concurrency & Atomic D1 Batch):**
   - Bảng `PromotionCampaign` quản lý phiên bản với cột `revision INTEGER DEFAULT 1`.
   - Mọi thao tác cập nhật (`saveCampaign`), xuất bản (`publishCampaign`) và lưu trữ (`archiveCampaign`) đều yêu cầu `expectedRevision`. Nếu phiên bản bị lệch do ghi đồng thời, trả về HTTP 409 `CAMPAIGN_REVISION_CONFLICT`.
   - Kiểm tra trùng lịch (`assertNoPublishedOverlap`) được thực thi trên cả `publishCampaign` và `saveCampaign` (khi `status === 'PUBLISHED'`), ngăn chặn hoàn toàn việc bypass overlap check bằng API lưu cập nhật.
   - Batch D1 nguyên tử: cập nhật chiến dịch, xóa items cũ, chèn items mới nằm trọn trong 1 lệnh `db.batch([...])`, tự động rollback toàn bộ nếu có lỗi.

10. **Tái Thẩm Định Giỏ Hàng Máy Chủ (Server-Side Cart Revalidation):**
    - Trình duyệt/client chỉ lưu `productId`, `variantId`, `quantity`. Không tin cậy bất kỳ giá nào do client lưu trữ cục bộ (localStorage).
    - Endpoint `POST /api/cart/revalidate` tính toán lại giá chuẩn từ server theo context thời gian thực, trả về danh sách sản phẩm thay đổi giá (`hasPriceChanges`, `changedItems`) để giao diện cập nhật cảnh báo minh bạch cho người dùng.

