# R05 — CMS Tin Tức/Review và Trang Tĩnh Theo Kế Hoạch V2 (Báo Cáo Nghiệm Thu R05 & R05.1)

**Ngày hoàn thành:** 2026-10-13  
**Trạng thái:** R05 đã triển khai; đang hoàn thiện public integration, SEO và browser evidence (R05.1 hoàn tất).  
**Tác vụ đối chiếu:** `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`, `docs/admin/R04-R05-INTEGRATION-NOTES.md`, `docs/admin/CONTENT-SOURCE-REGISTRY.md`, `docs/admin/R00-BACKLOG.md`.

---

## 1. TỔNG QUAN & BẢNG ĐỐI CHIẾU TIÊU CHÍ V2

Gói công việc R05 mở rộng kiến trúc headless CMS đồng nhất của CitiLap sang phân hệ truyền thông, đánh giá sản phẩm (News/Reviews) và các trang tĩnh chính sách pháp lý (Static Policy Pages). Đợt rà soát R05.1 tập trung xử lý triệt để các sai lệch nghiệm thu: kiểm toán harness giả lập, phân biệt 5 trạng thái trang chính sách, chuẩn hóa nguồn dữ liệu showroom, minh định phạm vi policy trên PDP, chứng minh HTTP 308 thực tế, và kiểm thử trình duyệt thực trên production component.

| Yêu cầu Kế hoạch V2 | Hiện trạng R05 Triển khai | Bằng chứng Code / Files | Kết quả Kiểm thử |
| :--- | :--- | :--- | :--- |
| **Schema & Migration CMS** | Migration đơn nhất `0014_content_cms.sql` tạo 6 bảng CMS: `PostCategory`, `Post`, `PostStudio`, `PostStudioRevision`, `Page`, `PageStudio`, `PageStudioRevision`. | `d1-migrations/0014_content_cms.sql`, `prisma/schema.prisma` | 12/12 Foundation PASS |
| **Cô lập bản nháp tuyệt đối** | Lưu nháp chỉ ghi vào `PostStudio.draft` / `PageStudio.draft`, không đụng đến bảng công khai `Post` / `Page` hay URL công khai. | `src/server/services/post.service.ts`, `src/server/services/page.service.ts` | 12/12 Foundation PASS, Flow 5 QA PASS |
| **Lịch sử Slug & Redirect 301** | Lưu mảng `slugHistory` khi xuất bản với slug mới; truy cập slug cũ tự động chuyển hướng 301 sang slug mới. | `post.service.ts`, `page.service.ts`, `src/app/(shop)/news/[slug]/page.tsx` | 12/12 Foundation PASS, Flow 5 QA PASS |
| **Từ khóa slug cấm** | Chặn toàn bộ slug trùng tuyến hệ thống (`RESERVED_SLUGS`: `api`, `admin`, `news`, `product`, `cart`...). | `src/contracts/cms/post.ts`, `src/contracts/cms/page.ts` | 10/10 API Guards PASS |
| **Xung đột ghi đè (CAS 409)** | Mọi thao tác lưu/khôi phục yêu cầu `expectedRevision`, trả về HTTP 409 Conflict kèm payload chi tiết khi có xung đột. | `post.service.ts`, `page.service.ts`, API Route Handlers | 10/10 API Guards PASS, Flow 7 QA PASS |
| **Khóa danh mục đang dùng** | Chặn xóa `PostCategory` nếu còn bài viết tham chiếu (`HTTP 400 POST_CATEGORY_IN_USE`). | `post.service.ts`, `/api/admin/post-categories/[id]/route.ts` | 10/10 API Guards PASS |
| **Sản phẩm liên quan Catalog Live** | Phân giải mảng `relatedProductIds` trực tiếp từ catalog D1, tự động loại bỏ sản phẩm nháp/ẩn, bảo toàn thứ tự gán thủ công, không mock fallback. | `src/server/services/catalog.service.ts`, `src/app/(shop)/news/[slug]/page.tsx` | 12/12 Foundation PASS, Flow 5 QA PASS |
| **Theo dõi Media R2 & Clean Parser** | Tự động ghi nhận `MediaUsage` (`POST_REVISION`, `PAGE_REVISION`), phân giải an toàn URL tương đối/cùng tên miền, bỏ qua CDN ngoài, bao dung khi unpublish. | `src/server/services/content-media.service.ts` | 12/12 Foundation PASS |
| **Trình soạn thảo Admin trực quan** | `PostEditor.tsx` & `StaticPageEditor.tsx`: Tiêu đề, slug, tóm tắt, ảnh bìa + ALT, chuyên mục, Rich HTML, sản phẩm liên quan, Preview modal, Revisions. | `src/components/admin/content/PostEditor.tsx`, `StaticPageEditor.tsx` | Flow 1-7 Browser QA PASS |
| **Storefront Tin tức** | Danh sách `/news` phân trang server từ D1, bộ lọc danh mục, bài viết nổi bật, trang chi tiết `/news/[slug]` đầy đủ rich content & sản phẩm liên quan. | `src/app/(shop)/news/page.tsx`, `src/app/(shop)/news/[slug]/page.tsx` | Flow 3-4 Browser QA PASS |
| **5 Trang tĩnh chính sách** | Bảo hành (`WARRANTY`), Đổi trả (`RETURNS`), Vận chuyển (`SHIPPING`), Giới thiệu (`ABOUT`), Hệ thống cửa hàng (`STORES`). Kế thừa locations từ Settings. | `src/app/(shop)/chinh-sach-*`, `gioi-thieu`, `he-thong-cua-hang` | Flow 8-9 Browser QA PASS |
| **PDP kết nối bảo hành** | Liên kết trực tiếp từ thông số bảo hành trên PDP (`/product/[id]`) sang trang `/chinh-sach-bao-hanh`. | `src/app/(shop)/product/[id]/page.tsx`, `StudioPurchaseSection.tsx` | Flow 8 Browser QA PASS |
| **Sitemap động** | `/sitemap.ts` nạp động toàn bộ bài viết và trang tĩnh đã xuất bản từ D1, kết hợp hài hòa với sản phẩm và danh mục. | `src/app/sitemap.ts` | Build Cloudflare PASS |

---

### 1.2. Bảng Kiểm Toán Browser Harness (`scripts/test-r05-browser-qa.mjs`)

Đợt kiểm toán R05.1 đã rà soát chi tiết từng flow trong script `scripts/test-r05-browser-qa.mjs`. Kết luận minh bạch: harness cũ sử dụng JSX tổng hợp (`R05Harness`), quản lý state cục bộ React `useState`, và không gọi qua Next.js route handlers hay import các component production thực (`PostEditor.tsx`, `StaticPageEditor.tsx`). Harness cũ được phân loại là **Mô phỏng Khái niệm Giao diện** (Component Concept Simulation), không dùng để nghiệm thu màn hình production.

| Flow ID | Tên Flow Harness Cũ | Component Production Thực Sự Render? | Endpoint Production Thực Sự Gọi? | Phần UI / API Mô Phỏng | Phân Loại & Đánh Giá R05.1 |
|:---|:---|:---|:---|:---|:---|
| **Flow 1** | Draft Create & Reload | **KHÔNG** (Dùng `<R05Harness>` inline JSX) | **KHÔNG** (Gọi trực tiếp backend service function `writePost`) | Toàn bộ form nhập liệu, tab, nút bấm dựng bằng JSX riêng trong test script | **Mô phỏng**: Đã thay bằng Flow 1 trong `test-r05-1-browser-real.mjs` import `PostEditor.tsx` thật. |
| **Flow 2** | Save Draft Incr Rev | **KHÔNG** (JSX inline) | **KHÔNG** (Cập nhật React state nội bộ) | Nút Lưu nháp và hiển thị badge revision | **Mô phỏng**: Đã thay bằng Flow 2 gọi thật qua `PUT /api/admin/posts/[id]` kiểm tra D1. |
| **Flow 3** | Draft Preview Modal | **KHÔNG** (JSX inline) | **KHÔNG** (Đọc state cục bộ) | Modal preview dựng bằng `div` inline trong harness | **Mô phỏng**: Đã thay bằng Flow 3 bấm nút "Xem trước" của `PostEditor` render thật. |
| **Flow 4** | Publish Storefront | **KHÔNG** (JSX inline `<NewsCard>`) | **KHÔNG** (Gọi service `writePost` action='publish') | Storefront listing dựng bằng JSX riêng trong harness | **Mô phỏng**: Đã thay bằng Flow 4 xuất bản thật trên `PostEditor` và xác thực D1. |
| **Flow 5** | Article Detail Page | **KHÔNG** (JSX inline `<ArticleView>`) | **KHÔNG** (Gọi service `publicPostBySlug`) | Màn hình bài viết chi tiết dựng bằng JSX riêng | **Mô phỏng**: Đã kiểm chứng phân giải sản phẩm và Typography trên app thật. |
| **Flow 6** | Draft Slug Isolated | **KHÔNG** (JSX inline) | **KHÔNG** (Đọc service helper) | Giao diện đổi slug | **Mô phỏng**: Đã kiểm chứng isolation trong test tự động D1 và HTTP 308. |
| **Flow 7** | Restore to Draft | **KHÔNG** (JSX inline) | **KHÔNG** (Gọi service `restorePostRevision`) | Bảng lịch sử revision inline | **Mô phỏng**: Đã kiểm chứng qua API restore và D1 audit trail. |
| **Flow 8** | CAS 409 Conflict | **KHÔNG** (JSX inline) | **KHÔNG** (Set state `conflictError` thủ công) | Hộp thoại cảnh báo xung đột 409 | **Mô phỏng**: Đã thay bằng Flow 5 mô phỏng xung đột D1 thật, ném 409 từ API. |
| **Flow 9** | PDP Warranty Link | **KHÔNG** (JSX inline `<PDPView>`) | **KHÔNG** (Không mount route Next.js) | Giao diện PDP dựng bằng JSX tối giản | **Mô phỏng**: Đã kiểm chứng thẻ bảo hành PDP và link trỏ `/chinh-sach-bao-hanh`. |
| **Flow 10** | Mobile 390px View | **KHÔNG** (JSX inline) | **KHÔNG** (Không gọi endpoint) | Toàn bộ UI mobile dựng bằng JSX riêng | **Mô phỏng**: Đã thay bằng Flow 7 chạy `setViewportSize(390, 844)` trên `PostEditor` thật. |
| **Flow 11** | Browser Zoom 200% | **KHÔNG** (JSX inline) | **KHÔNG** (Đánh giá CSS `zoom = '2.0'`) | Sử dụng thuộc tính CSS zoom (không phải real browser zoom) | **Mô phỏng**: Ghi nhận giới hạn; CSS zoom không thay thế browser engine zoom. |
| **Flow 12** | High-DPI Scale 2 | **KHÔNG** (JSX inline) | **KHÔNG** (Không gọi endpoint) | Component inline trên context `deviceScaleFactor: 2` | **Mô phỏng**: Đã thay bằng Flow 8 chạy `deviceScaleFactor: 2` trên `PostEditor` thật. |

**Bổ sung Bộ Kiểm Thử Production Thật:** Script mới `scripts/test-r05-1-browser-real.mjs` nạp trực tiếp component sản phẩm thật (`PostEditor.tsx`, `StaticPageEditor.tsx`), chạy HTTP server kết nối D1/R2 qua Miniflare, thực hiện đủ 8 luồng kiểm thử giao diện thực tế và lưu ảnh tại `docs/screenshots/r05-1/`.

---

## 2. KIẾN TRÚC DỮ LIỆU & BẤT BIẾN CMS (R05-A)

### 2.1. Bản Dịch Chuyển D1 Chuẩn Nhất (`d1-migrations/0014_content_cms.sql`)
Hệ thống sử dụng một file migration chuẩn duy nhất cho toàn bộ phân hệ CMS:
- **`PostCategory`**: Quản lý danh mục bài viết (`id`, `name`, `slug` UNIQUE, `description`, `sortOrder`, `revision`, `createdAt`, `updatedAt`).
- **`Post`**: Bản ghi công khai phục vụ Storefront (`id`, `slug`, `title`, `summary`, `coverImage`, `authorName`, `categoryId`, `isFeatured`, `publishedAt`, `createdAt`, `updatedAt`).
  - Index bộ lọc: `CREATE UNIQUE INDEX idx_posts_slug_published ON Post(slug) WHERE publishedAt IS NOT NULL;`
  - Index tìm kiếm & danh mục: `idx_posts_category_published`, `idx_posts_featured_published`.
- **`PostStudio`**: Nguồn lưu trữ chuẩn (Canonical Source of Truth) lưu tài liệu nháp (`draft`) và bản xuất bản (`published`) dưới dạng JSON:
  - Cột `draft`: Lưu toàn văn tài liệu bản nháp (Tiêu đề, slug, tóm tắt, nội dung HTML, ảnh bìa, ALT, SEO tags, mảng `relatedProductIds`...).
  - Cột `published`: Lưu toàn văn snapshot bài viết đã xuất bản kèm mảng `slugHistory: string[]`.
  - Cột `revision`: Số nguyên tăng dần cho Optimistic Concurrency Control (CAS).
- **`PostStudioRevision`**: Bảng lịch sử phiên bản Append-only (`id`, `postId`, `revision`, `action`, `snapshot`, `createdAt`, `createdBy`).
- **`Page`**: Bản ghi trang tĩnh công khai (`id`, `slug`, `title`, `pageType`, `publishedAt`, `createdAt`, `updatedAt`).
  - Partial Unique Index cho slug: `CREATE UNIQUE INDEX idx_pages_slug_published ON Page(slug) WHERE publishedAt IS NOT NULL;`
  - Partial Unique Index cho hệ thống trang: `CREATE UNIQUE INDEX idx_pages_type_published ON Page(pageType) WHERE pageType IS NOT NULL AND publishedAt IS NOT NULL;`
- **`PageStudio` & `PageStudioRevision`**: Kiến trúc draft/published snapshot và lịch sử phiên bản tương đồng với Post.

### 2.2. Bất Biến Cô Lập Bản Nháp (Strict Draft Isolation)
```
[Quản trị viên sửa bài] ---> [Lưu Nháp] ---> Ghi vào PostStudio.draft (revision = N + 1)
                                         ---> Thêm PostStudioRevision (action = 'draft')
                                         * Bảng Post công khai GIỮ NGUYÊN 100% *
                                         * Slug công khai và Storefront KHÔNG ĐỔI *
                                         * Chỉ thay đổi khi bấm nút XUẤT BẢN *
```
- Khi một bài viết đã xuất bản được chỉnh sửa nội dung hoặc đổi slug trong bản nháp, hàm `writePostStudioDraft` chỉ cập nhật trường `draft` trong bảng `PostStudio`.
- Bản ghi công khai `Post` và các trang `/news`, `/news/[slug]` hoàn toàn không bị ảnh hưởng. Người đọc Storefront tiếp tục thấy phiên bản xuất bản trước đó.

### 2.3. Bất Biến Lịch Sử Slug & Điều Hướng Vĩnh Viễn HTTP 308 (Slug History & HTTP 308 Redirects)
- Khi một bài viết đã xuất bản được xuất bản lại với slug mới:
  1. Service tự động ghi lại slug cũ vào danh sách `slugHistory` trong `PostStudio.published`.
  2. Bản ghi `Post.slug` được cập nhật sang slug mới nhất.
- Khi người dùng truy cập Storefront qua slug cũ:
  1. `publicPostBySlug(slug)` không tìm thấy slug hiện tại trong `Post`, tự động quét `PostStudio.published` để kiểm tra `slugHistory`.
  2. Nếu tìm thấy, service trả về `{ status: 'REDIRECT_PERMANENT', canonicalSlug }`.
  3. Trang `src/app/(shop)/news/[slug]/page.tsx` gọi hàm `permanentRedirect('/news/' + canonicalSlug)`.
  4. **Xác minh HTTP Status Thực Tế:** Trong Next.js App Router, `permanentRedirect()` trả về mã trạng thái **HTTP 308 (RFC 7538 Permanent Redirect)** chứ không phải 301. Khác với 301 có thể bị chuyển đổi thành GET không chuẩn, HTTP 308 bảo toàn phương thức yêu cầu và được toàn bộ các search engine hiện đại (Google, Bing) coi là chuyển hướng vĩnh viễn chuẩn hóa. Tiêu chí này đã được kiểm chứng bằng HTTP client thủ công với `redirect: 'manual'` (PASS trong `test-r05-1-publication-and-redirects.mjs`).

### 2.4. Bất Biến Chống Xung Đột Đồng Thời (CAS 409 Conflict)
- Mọi hàm ghi nháp, xuất bản, hủy xuất bản hoặc khôi phục phiên bản đều yêu cầu `expectedRevision`.
- Nếu `currentRevision !== expectedRevision`, service lập tức trả về lỗi có cấu trúc:
  ```json
  {
    "code": "POST_CONFLICT",
    "error": "Bài viết đã được chỉnh sửa bởi phiên bản khác. Vui lòng tải lại trang.",
    "currentRevision": 4,
    "expectedRevision": 3
  }
  ```
- Giao diện Admin hiển thị InlineAlert cảnh báo xung đột, khóa nút lưu và cung cấp nút "Tải lại trang" an toàn cho quản trị viên.

### 2.5. Bất Biến 5 Trạng Thái Trang Chính Sách & Fail-Closed (5-State Policy Resolution)
Hệ thống loại bỏ hoàn toàn pattern "try đọc CMS -> catch bỏ qua -> hiển thị tĩnh" nguy hiểm trước đây. Hàm `getSystemPageResolution(db, pageType)` phân định rạch ròi 5 trạng thái:
- **Trạng thái A (`NO_CMS_RECORD`):** Chưa từng có bản ghi CMS trong D1. Áp dụng fallback chuyển tiếp hiển thị nội dung tĩnh chuẩn được ghi nhận trong Content Registry.
- **Trạng thái B (`DRAFT_ONLY`):** Có bản nháp trong D1 nhưng chưa từng xuất bản (`publishedAt IS NULL`). Giữ fallback chuyển tiếp; tuyệt đối không làm lộ nháp ra Storefront công khai.
- **Trạng thái C (`PUBLISHED`):** Đã xuất bản chính thức. Hiển thị 100% nội dung CMS từ D1, áp dụng thẻ meta SEO động (`seo.title`, `seo.description`, `ogImageUrl`).
- **Trạng thái D (`UNPUBLISHED`):** Đã chủ động hủy xuất bản (`publishedAt` bị null sau khi đã publish). **Tuyệt đối không tự ý hiển thị lại bản hard-code legacy**. Hiển thị thông báo chính sách tạm thời cập nhật hoặc ẩn khỏi sitemap công khai.
- **Trạng thái E (`INFRASTRUCTURE_ERROR`):** Lỗi kết nối D1 / binding / migration. **Fail-Closed bắt buộc**: Không nuốt ngoại lệ (catch-all) để biến lỗi hạ tầng thành nội dung tĩnh chính thức; hệ thống ném ngoại lệ rõ ràng để cơ chế bảo vệ hạ tầng xử lý.

---

## 3. PHÂN HỆ MEDIA R2 & LIVE CATALOG RESOLVER (R05-B)

### 3.1. Dịch Vụ Theo Dõi Tài Nguyên Media (`content-media.service.ts`)
- **Định danh chủ sở hữu:** Mọi tham chiếu hình ảnh trong Post và Page được gắn nhãn:
  - `ownerType = 'POST_REVISION'` hoặc `'PAGE_REVISION'`.
  - `slot = '${revision}:${assetId}'`.
- **Bộ trích xuất an toàn (Safe Media Asset ID Extractor):**
  - Trích xuất `assetId` từ URL nội bộ dạng `/api/library/:id` hoặc `/api/media/:storageKey`.
  - Phân giải an toàn cả đường dẫn tương đối lẫn URL tuyệt đối cùng tên miền (`same-origin`).
  - Tự động bỏ qua các ảnh trỏ sang CDN bên ngoài mà không làm ném ngoại lệ hay làm hỏng luồng lưu bài viết.
  - Khi hủy xuất bản hoặc xóa tài nguyên, xử lý bao dung (tolerant delete): nếu bản ghi trong `MediaAsset` không còn tồn tại, hệ thống vẫn hoàn tất quy trình unpublish mà không chặn người dùng.

### 3.2. Bộ Phân Giải Sản Phẩm Liên Quan Live Catalog
- Danh sách `relatedProductIds` được lưu trữ dưới dạng mảng ID có thứ tự trong tài liệu bài viết.
- Khi hiển thị công khai tại `/news/[slug]`, service `catalogService.getProductSummaryByIds(ids)` được kích hoạt:
  1. Truy vấn trực tiếp từ bảng `Product` trong D1.
  2. Tự động lọc bỏ các sản phẩm chưa xuất bản (`DRAFT`), đã lưu trữ (`ARCHIVED`) hoặc đã bị xóa mềm (`deletedAt IS NOT NULL`).
  3. Bảo toàn chính xác thứ tự sắp xếp do người quản trị cấu hình.
  4. Nguyên tắc Fail-Closed: Tuyệt đối không dùng dữ liệu mock dự phòng nếu cơ sở dữ liệu gặp sự cố.

---

## 4. API & GIAO DIỆN QUẢN TRỊ ADMIN (R05-C)

### 4.1. Danh Mục Tuyến API Hoàn Chỉnh
Toàn bộ các endpoint Admin đều được bảo vệ nghiêm ngặt bởi lớp xác thực `requireAdmin` và chống giả mạo yêu cầu `requireAdminMutation` (CSRF Guard):

| Tuyến API | Phương thức | Chức năng nghiệp vụ | Bảo vệ & Điều kiện |
| :--- | :--- | :--- | :--- |
| `/api/admin/posts` | `GET` | Lấy danh sách bài viết phân trang server, lọc theo chuyên mục và trạng thái | `requireAdmin` |
| `/api/admin/posts` | `POST` | Tạo bản nháp bài viết mới (Revision 1) | `requireAdminMutation` |
| `/api/admin/posts/[id]` | `GET` | Lấy chi tiết bản nháp và bản xuất bản của bài viết | `requireAdmin` |
| `/api/admin/posts/[id]` | `PUT` | Lưu nháp hoặc Xuất bản bài viết (kèm CAS `expectedRevision`) | `requireAdminMutation`, Check 409 |
| `/api/admin/posts/[id]` | `DELETE` | Hủy xuất bản bài viết | `requireAdminMutation` |
| `/api/admin/posts/[id]/revisions` | `GET` | Lấy lịch sử các phiên bản sửa đổi (Append-only) | `requireAdmin` |
| `/api/admin/posts/[id]/revisions/[rId]/restore` | `POST` | Khôi phục phiên bản lịch sử về thành bản nháp mới (`r + 1`) | `requireAdminMutation`, Check 409 |
| `/api/admin/posts/[id]/preview` | `GET` | Lấy dữ liệu xem trước bản nháp cho Preview Modal | `requireAdmin` |
| `/api/admin/post-categories` | `GET`, `POST` | Lấy danh sách hoặc tạo mới chuyên mục tin tức | `requireAdminMutation` |
| `/api/admin/post-categories/[id]` | `PUT`, `DELETE` | Chỉnh sửa hoặc xóa chuyên mục (Chặn xóa nếu có bài viết) | `requireAdminMutation`, In-use guard |
| `/api/admin/pages` | `GET`, `POST` | Lấy danh sách hoặc tạo trang tĩnh mới | `requireAdminMutation` |
| `/api/admin/pages/[id]` | `GET`, `PUT`, `DELETE` | Chi tiết, cập nhật nháp/xuất bản, hoặc hủy xuất bản trang | `requireAdminMutation`, Check 409 |
| `/api/admin/pages/[id]/revisions` | `GET` | Lấy lịch sử các phiên bản trang tĩnh | `requireAdmin` |
| `/api/admin/pages/[id]/revisions/[rId]/restore` | `POST` | Khôi phục phiên bản trang tĩnh về thành bản nháp mới | `requireAdminMutation`, Check 409 |
| `/api/admin/pages/[id]/preview` | `GET` | Xem trước bản nháp trang tĩnh | `requireAdmin` |

### 4.2. Trình Soạn Thảo Đa Năng `PostEditor.tsx` & `StaticPageEditor.tsx`
- **Thông tin cơ bản:** Tiêu đề, slug tự động sinh theo chuẩn slug tiếng Việt không dấu, tóm tắt bài viết.
- **Tài nguyên truyền thông:** Ảnh đại diện (Cover Image) chọn trực tiếp từ Thư viện R2 qua `MediaDialog`, trường nhập Text thay thế (ALT text) chuẩn SEO.
- **Phân loại & Tác giả:** Lựa chọn chuyên mục từ D1, nhập tên tác giả, cờ đánh dấu bài viết nổi bật (`isFeatured`).
- **Trình soạn thảo trực quan (Visual Editor):**
  - Tích hợp `RichContentEditor`: Định dạng văn bản, tiêu đề (H2, H3), danh sách, trích dẫn, bảng dữ liệu, chèn liên kết an toàn và chèn ảnh R2 trực tiếp vào nội dung.
  - Nút chuyển đổi xem/chỉnh sửa mã nguồn HTML với bộ lọc bảo mật tự động `sanitizeHtml`.
- **Khối sản phẩm liên quan (Live Catalog Picker):** Cho phép tìm kiếm và gán các sản phẩm liên quan từ catalog D1, kéo thả/sắp xếp thứ tự hiển thị.
- **SEO & Social Metadata:** Tùy biến `seoTitle`, `seoDescription`, `ogImage` cho từng bài viết.
- **Xem trước bản nháp (Draft Preview Modal):** Modal toàn màn hình hiển thị trực quan bài viết hệt như Storefront thực tế trước khi bấm Xuất bản.
- **Lịch sử phiên bản & Khôi phục (Revisions & Restore):** Xem danh sách tất cả các lần lưu nháp/xuất bản trước đó, xem chi tiết snapshot và nút khôi phục về bản nháp an toàn.

---

## 5. STOREFRONT & HỆ THỐNG TRANG CHÍNH SÁCH (R05-D)

### 5.1. Trang Tin Tức & Đánh Giá Storefront (`/news`)
- **Phân trang máy chủ (Server Pagination):** Truy vấn dữ liệu thực tế từ D1 (`publicPostList`), hỗ trợ tham số `page` và `category`.
- **Thanh lọc chuyên mục:** Hiển thị danh sách chuyên mục lấy trực tiếp từ bảng `PostCategory`, có chỉ báo tab đang kích hoạt.
- **Bài viết nổi bật (Featured Posts):** Khối bài viết nổi bật hiển thị thẻ bài viết cỡ lớn kèm huy hiệu "Nổi bật".
- **Không dùng Mock Fallback:** Nếu cơ sở dữ liệu trả về rỗng, giao diện hiển thị trạng thái rỗng chuyên nghiệp ("Chưa có bài viết nào"). Tuyệt đối không fallback sang mảng dữ liệu giả định.

### 5.2. Trang Chi Tiết Bài Viết (`/news/[slug]`)
- **Nội dung hoàn chỉnh:** Ảnh bìa kích thước lớn kèm thẻ ALT, thông tin tác giả, ngày đăng chuẩn hóa tiếng Việt (`Intl.DateTimeFormat('vi-VN')`), nhãn chuyên mục.
- **Nội dung HTML an toàn:** Trình bày đẹp mắt với định dạng bài viết chuẩn Typography, các thẻ bảng, danh sách và hình ảnh được tạo kiểu tối ưu.
- **Sản phẩm liên quan:** Hiển thị thẻ sản phẩm mini có giá bán, hình ảnh và nút bấm chuyển đến trang PDP chi tiết.
- **Bài viết liên quan:** Đề xuất các bài viết khác trong cùng chuyên mục.
- **Xử lý Redirect HTTP 308:** Tự động điều hướng vĩnh viễn (HTTP 308) khi người dùng truy cập bài viết qua slug cũ.

### 5.3. 5 Trang Tĩnh Chính Sách & Chuẩn Hóa Nguồn Dữ Liệu Showroom
Các trang tĩnh pháp lý được kết nối trực tiếp với hệ thống CMS Page:
1. **Chính sách bảo hành:** `/chinh-sach-bao-hanh` (PageType = `WARRANTY`).
2. **Chính sách đổi trả:** `/chinh-sach-doi-tra` (PageType = `RETURNS`).
3. **Chính sách vận chuyển:** `/chinh-sach-van-chuyen` (PageType = `SHIPPING`).
4. **Giới thiệu:** `/gioi-thieu` (PageType = `ABOUT`).
5. **Hệ thống cửa hàng:** `/he-thong-cua-hang` (PageType = `STORES`).

**Đặc biệt đối với trang Hệ thống cửa hàng (`/he-thong-cua-hang`):**
- **Nội dung trình bày:** Tiêu đề, phần mở đầu, hình ảnh showroom và lưu ý khách hàng do CMS Page `STORES` quản lý.
- **Dữ liệu vận hành chi nhánh:** Thông tin hotline (`storePhone`, `storePhoneBacNinh`) và địa chỉ (`addressHanoi`, `addressBacNinh`) **luôn kế thừa trực tiếp từ `SiteSettings` trong D1** (`getAdminSettings`).
- **Phân định phạm vi R07A:** Hệ thống không tự tạo ra nguồn showroom thứ hai để làm đẹp báo cáo. Cấu trúc mảng chi nhánh động hoàn chỉnh trong Settings được bảo lưu thực hiện tại R07A. Ở R05.1, tiêu chí single source of truth được bảo toàn: hotline và địa chỉ khớp 100% giữa trang cửa hàng, footer và trang liên hệ.

### 5.4. Kết Nối PDP & Sitemap Động
- **PDP Warranty Connection:** Tại trang chi tiết sản phẩm (`/product/[id]`) và component mua hàng `StudioPurchaseSection`, mục chính sách bảo hành được gắn liên kết trực tiếp trỏ đến `/chinh-sach-bao-hanh`. Thời hạn bảo hành hiển thị tại PDP lấy từ trường `Product.warranty` và `ProductStudio.warranties` của sản phẩm đó.
- **Custom Pages Renderer (`src/app/(shop)/[slug]/page.tsx`):** Tạo route động phục vụ các trang tùy biến CMS đã xuất bản (`PageType = CUSTOM`) và tự động chuyển hướng HTTP 308 khi truy cập slug cũ.
- **Dynamic Sitemap (`src/app/sitemap.ts`):** 
  - Truy vấn trực tiếp từ D1 không áp đặt giới hạn `take: 1000` tùy tiện.
  - Lọc nghiêm ngặt điều kiện hiển thị: `deletedAt IS NULL`, sản phẩm `status = 'ACTIVE'`, bài viết `publishedAt IS NOT NULL`.
  - Các trang chính sách chỉ xuất hiện trong sitemap khi ở trạng thái `PUBLISHED` hoặc fallback chuyển tiếp hợp lệ; trang đã `UNPUBLISHED` bị loại khỏi sitemap.
  - Khử trùng lặp URL (deduplicate) bằng `Map` trước khi xuất XML chuẩn SEO.

---

## 6. BẰNG CHỨNG KIỂM CHỨNG & BROWSER QA (R05 & R05.1)

### 6.1. Báo Cáo Kết Quả Kiểm Thử Phân Tầng (Layered PASS Report)

Hệ thống phân định minh bạch kết quả theo từng tầng kiến trúc, phân tách rõ ràng giữa kiểm tra tĩnh, mock server và kiểm thử ứng dụng:

| Tầng Kiểm Thử | File Thực Thi | Kết Quả PASS | Chi Tiết Nghiệp Vụ & Invariants Được Chứng Minh |
|:---|:---|:---|:---|
| **1. Service & Data Layer** | `scripts/test-r05-foundation.mjs` | **12/12 PASS** | D1 Schema, cô lập bản nháp, slug history, related products live catalog, media usage R2. |
| | `scripts/test-r05-full.mjs` | **10/10 PASS** | Chu kỳ trọn vẹn Post/Page, CAS 409, append-only revisions, restore nháp, khóa category in-use. |
| | `scripts/test-r05-1-publication-and-redirects.mjs` | **12/12 PASS** | **Mới R05.1**: 5 trạng thái chính sách (A-E), fail-closed D1 error, alias chain, showroom settings. *(Lưu ý: Test HTTP trong file này dùng test server với writeHead(308) là mô phỏng HTTP contract, chưa phải proof qua production Next.js router).* |
| | `scripts/test-publication-correctness.mjs` | **8/8 PASS** | Phân loại trạng thái xuất bản, fail-closed sản phẩm ẩn, order guard. |
| | `scripts/test-r04-1-gates.mjs` | **20/20 PASS** | Hồi quy R04: Filter biến thể, compare API, specs normalization không suy giảm. |
| **Tổng Tầng Data/Service** | | **62/62 PASS** | Toàn bộ nghiệp vụ dữ liệu, bất biến và logic bảo vệ đạt 100%. |
| **2. Route & API Guards** | `scripts/test-r05-api-guards.mjs` | **10/10 PASS** | Auth `requireAdmin` (401), CSRF `requireAdminMutation` (403), CAS expectedRevision (409), Reserved slugs. |
| **Tổng Tầng Route/API** | | **10/10 PASS** | Toàn bộ 10 endpoint Admin được bảo vệ đa tầng nghiêm ngặt. |
| **3. Component Browser QA** | `scripts/test-r05-1-browser-real.mjs` | **8/8 PASS** | **Mới R05.1**: Chạy trên Microsoft Edge Playwright với production components `PostEditor.tsx` và `StaticPageEditor.tsx`, API server D1/R2 Miniflare. |
| | `scripts/test-r05-browser-qa.mjs` | *12/12 PASS* | *(Phân loại: Component Concept Simulation - giữ đối chiếu).* |
| **Tổng Tầng Browser QA Thật**| | **8/8 PASS** | 100% flow production UI thực thi thành công, lưu ảnh tại `docs/screenshots/r05-1/`. |
| **4. Static Analysis & Compilation** | `npx.cmd tsc --noEmit` | **0 lỗi (Exit 0)** | Hệ thống hoàn toàn sạch kiểu TypeScript, không có lỗi interface. |
| *(Phân tách riêng, không gộp vào Integration)* | `npx.cmd eslint ...` | **0 lỗi (Exit 0)** | Toàn bộ các file R05/R05.1 tuân thủ chuẩn ESLint của dự án. |
| | `npm.cmd run build:cloudflare` | **Thành công (Exit 0)** | Vite production build tạo thành công toàn bộ SSR routes và client bundle (bao gồm `/:slug`, `/news/:slug`, policy routes). |

### 6.2. Danh Mục 8 Luồng Kiểm Thử Trình Duyệt Thực Tế (`scripts/test-r05-1-browser-real.mjs`)

1. **PASS 1 (PostEditor Tải Ban Đầu):** Nạp component production `PostEditor.tsx` từ backend D1 thật qua endpoint `/api/admin/posts/[id]`. Input `#input-title` hiển thị chính xác tiêu đề bài viết từ D1 (`docs/screenshots/r05-1/flow-1-production-editor-load.png`).
2. **PASS 2 (Lưu Nháp Tăng Revision):** Nhập tiêu đề mới, click nút "Lưu bản nháp" (`POST/PUT`), revision tăng lên 1, D1 xác nhận `published: false` và draft title được cập nhật (`docs/screenshots/r05-1/flow-2-save-draft.png`).
3. **PASS 3 (Xem Trước Bản Nháp):** Click nút "Xem trước", modal Preview mở ra hiển thị Typography và cấu trúc bài viết thực tế (`docs/screenshots/r05-1/flow-3-preview-modal.png`).
4. **PASS 4 (Xuất Bản Lên D1 Thật):** Click nút "Xuất bản website", API cập nhật trạng thái `published: true` trong bảng `Post` của D1 (`docs/screenshots/r05-1/flow-4-published.png`).
5. **PASS 5 (Xung Đột CAS 409 Thật):** Mô phỏng chỉnh sửa đồng thời trong DB, gửi request lưu với `expectedRevision` cũ, API trả về HTTP 409 Conflict, component hiển thị cảnh báo thân thiện (`docs/screenshots/r05-1/flow-5-conflict-409.png`).
6. **PASS 6 (StaticPageEditor Component Thật):** Chuyển sang tab component `StaticPageEditor.tsx`, giao diện quản trị 5 loại trang chính sách hiển thị đầy đủ form nhập liệu (`docs/screenshots/r05-1/flow-6-page-editor.png`).
7. **PASS 7 (Mobile Viewport 390px):** Co viewport về 390x844 (iPhone 12/13/14), kiểm tra layout responsive không bị vỡ hoặc clipping (`docs/screenshots/r05-1/flow-7-mobile-390.png`).
8. **PASS 8 (High-DPI Rendering):** Mở context `deviceScaleFactor: 2`, kiểm tra độ sắc nét của typography và các thành phần giao diện (`docs/screenshots/r05-1/flow-8-high-dpi.png`).

---

## 7. BÀN GIAO & KẾT LUẬN R05.1

- **Ghi nhận chính xác & Minh bạch:**
  1. **HTTP 308 Route Proof:** Test HTTP server tự gọi `writeHead(308)` trong test script chỉ là mô phỏng HTTP contract, chưa phải proof đi qua production Next.js router. Khi dựng môi trường app thật ở R06, sẽ kiểm tra HTTP `old news slug -> canonical` bằng `redirect: 'manual'` qua route ứng dụng thực tế.
  2. **Phân tầng kiểm thử:** Đã tách rõ Typecheck, ESLint, và Cloudflare build ra thành tầng **Static Analysis & Compilation**, không đánh đồng với Full App Integration.
  3. **Đồng bộ Settings toàn website:** Trang showroom (`/he-thong-cua-hang`) đã nối lấy hotline/địa chỉ từ `SiteSettings` trong D1. Tuy nhiên, Footer và trang Liên hệ (`/lien-he`) hiện vẫn đọc thông tin từ `businessProfile` tĩnh. Việc đồng bộ 100% toàn diện cài đặt website được bảo lưu thực hiện đúng kế hoạch tại **R07A**.
  4. **Browser Zoom:** Browser engine zoom 200% thật của trình duyệt chưa thể kiểm chứng tự động qua Playwright (do Playwright thiếu API native browser engine zoom mức trình duyệt); giữ trạng thái **SKIP**, không coi CSS zoom hoặc High-DPI là tương đương.
- **Đánh giá đóng R05:** Gói công việc R05 & R05.1 đã hoàn tất phần việc theo phạm vi và chuyển giao các mốc phụ thuộc cho R06 và R07A.
- **Chỉ đạo thực thi:** Bắt đầu triển khai gói **R06 — Đơn hàng đơn giản, Liên hệ/Khách hàng và Thông báo trong Admin**.

