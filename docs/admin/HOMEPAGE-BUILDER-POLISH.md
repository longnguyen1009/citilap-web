# Báo Cáo Cải Tiến Chi Tiết Homepage & Admin Site Builder

Tài liệu ghi lại toàn bộ quá trình audit, các vấn đề phát hiện, giải pháp xử lý trực tiếp bằng mã nguồn, kết quả kiểm thử responsive/a11y và bộ ảnh bằng chứng trước/sau (before/after) cho Homepage và Admin Site Builder (`/admin/builder`, `/admin/builder/home`).

---

## 1. Tổng quan & Mục tiêu

- **Mục tiêu**: Giữ nguyên toàn bộ ngôn ngữ thiết kế thương hiệu, hệ thống phân loại danh mục, dữ liệu sản phẩm, database schema và API contracts. Tập trung hoàn thiện các vi tương tác (micro-interactions), trạng thái phản hồi (hover, active, focus-visible, disabled, loading, error), khả năng truy cập bàn phím (A11y, Escape handling, focus trap/restoration) và nâng cao trải nghiệm quản trị builder.
- **Trạng thái**: Hoàn thành 100%, vượt qua toàn bộ bài kiểm tra client boundary và TypeScript typecheck.

---

## 2. Bảng phân loại vấn đề & Mức độ ảnh hưởng (P1 / P2 / P3)

| Mức độ | Vấn đề phát hiện | Ảnh hưởng người dùng & Quản trị viên | Giải pháp đã thực hiện |
| :--- | :--- | :--- | :--- |
| **P1** | **Modal Preview Admin Builder gặp lỗi runtime khi render ProductCard** | Khi người dùng bấm "Xem trước" trong Admin Builder, block sản phẩm gọi `useWishlist()` và `useCompare()`. Do `(admin)` layout không bọc `WishlistProvider`, giao diện preview bị crash hoàn toàn. | 1. Cung cấp hook `useOptionalWishlist` và `useOptionalCompare` trong `WishlistContext.tsx` và `CompareContext.tsx` giúp `ProductCard` render an toàn ở mọi ngữ cảnh.<br>2. Bọc component modal preview trong `WishlistProvider` và `CompareProvider`. |
| **P1** | **Block Slider trên Homepage tĩnh, không có tương tác** | Homepage và BlockRenderer hiển thị slider dưới dạng ảnh tĩnh đơn lẻ; người dùng không thể chuyển slide, không có autoplay, không hỗ trợ vuốt chạm (touch/drag swipe). | Xây dựng component `src/components/home/SliderSection.tsx` đầy đủ tính năng: Autoplay (pause on hover/focus), hỗ trợ drag vuốt chuột/cảm ứng, phím mũi tên bàn phím, phân trang chấm tròn, nút bấm kích thước 44px chuẩn touch target, tuân thủ `prefers-reduced-motion`. |
| **P1** | **Thiếu xác nhận an toàn cho các tác vụ nhạy cảm trong Builder** | Quản trị viên bấm nút xóa section ("Xóa khối") hoặc bấm "Xuất bản" / "Gỡ xuất bản" sẽ thực thi ngay lập tức mà không có hộp thoại xác nhận, dễ gây mất dữ liệu hoặc thay đổi trang công khai ngoài ý muốn. | Thêm hộp thoại `window.confirm` cảnh báo rõ ràng trước khi xóa khối nội dung, trước khi xuất bản bản nháp lên trang chủ và trước khi gỡ xuất bản. |
| **P1** | **Thiếu phím tắt Escape & đóng backdrop cho các Modal trong Builder** | Các modal Xem trước (Preview), Lịch sử phiên bản (Revisions) và Tạo trang mới (Create Landing Page) không thể đóng bằng phím Escape hoặc click vùng nền ngoài backdrop, không trả lại focus về nút kích hoạt. | Bổ sung event listener `keydown` bắt phím `Escape`, đóng khi bấm backdrop overlay và khôi phục focus chính xác về trigger element khi modal đóng. |
| **P2** | **Khu vực làm việc Builder bị thu hẹp ~120px do SchedulePanel** | `SchedulePanel` và `DraftRecoveryBanner` được gắn cố định ngay phía trên header của Builder, chiếm dụng không gian làm việc quý giá trên màn hình laptop/desktop. | 1. Di dời `SchedulePanel` vào trong tab "Cài đặt & SEO" gọn gàng, trực quan.<br>2. Tích hợp trực tiếp trạng thái tự động lưu (`autosaveStatus`) vào thanh tiêu đề (header) bên cạnh số bản sửa đổi. |
| **P2** | **Banner thông báo lỗi lưu/xuất bản thiếu nổi bật** | Khi xảy ra lỗi lưu hoặc xuất bản bản nháp, thông báo lỗi chỉ xuất hiện nhỏ trong modal hoặc bị bỏ qua, quản trị viên khó nhận biết nguyên nhân thất bại. | Bổ sung banner cảnh báo lỗi toàn cục có nút đóng (dismissible error alert) màu đỏ nổi bật ngay dưới thanh công cụ header của Builder. |
| **P2** | **Thẻ ProductCard có liên kết lồng nhau và viền focus chưa rõ** | `ProductCard` chứa nhiều thẻ `<a>` lồng nhau (ảnh sản phẩm và tiêu đề đều là link), gây sai chuẩn HTML và khó điều hướng bằng phím Tab cho công nghệ hỗ trợ (screen readers). | Sử dụng kỹ thuật stretched-link (`after:absolute after:inset-0`) trên tiêu đề sản phẩm, nút so sánh và nút yêu thích có `z-index` độc lập, bổ sung `focus-visible:ring-2` và hiệu ứng nhấc nhẹ khi rê chuột (`hover:-translate-y-0.5`). |
| **P2** | **Bộ sưu tập khách hàng (CustomerGallery) thiếu trạng thái giới hạn cuộn** | Hai nút mũi tên điều hướng cuộn ngang không tự động disable khi ở đầu hoặc cuối danh sách, khiến người dùng bấm mà không có phản hồi thị giác. | Thêm tính năng tính toán vị trí cuộn (`scrollLeft`, `scrollWidth`, `clientWidth`) để tự động `disabled` nút Trước/Sau và giảm độ mờ `opacity-30 cursor-not-allowed`. |
| **P2** | **Form chỉnh sửa Slider, Video và Gallery trong Builder thiếu Media Library** | Quản trị viên phải gõ thủ công URL hình ảnh cho từng slide, video thumbnail và gallery photo; không có ảnh xem trước (thumbnail preview) và không chọn được từ Thư viện Media. | Xây dựng lại `SliderForm`, `VideoReviewsForm`, `CustomerGalleryForm` hỗ trợ xem trước ảnh trực quan và tích hợp nút "Chọn từ thư viện" liên kết trực tiếp với `MediaDialog`. |
| **P3** | **Thiếu vi tương tác (micro-interactions) đồng bộ trên Homepage** | Các nút bấm, tab chuyển danh mục, danh mục hot, banner phụ và logo thương hiệu thiếu trạng thái bấm xuống (`active:scale-95`), focus-visible ring và giảm chuyển động (`motion-reduce`). | Bổ sung đồng bộ các lớp tương tác Tailwind CSS: `active:scale-[0.98]`, `focus-visible:ring-2 focus-visible:ring-blue-500`, `motion-reduce:transition-none`, `motion-reduce:hover:scale-100`. |

---

## 3. Danh sách các tệp đã chỉnh sửa & Chi tiết kỹ thuật

### 3.1. Các tệp Storefront Homepage (`src/components/home/` & `src/components/product/`)

1. **`src/components/home/SliderSection.tsx`** *(Tệp mới)*:
   - Slider tương tác chạy phía client (`'use client'`).
   - Tự động chuyển slide sau mỗi 5 giây; tự động tạm dừng khi rê chuột (`onMouseEnter`) hoặc khi người dùng focus bàn phím (`onFocus`).
   - Hỗ trợ vuốt chạm cảm ứng (touch swipe) và kéo chuột (mouse drag) mượt mà với con trỏ `cursor-grab` / `cursor-grabbing`.
   - Cơ chế triệt tiêu click nhầm khi đang thực hiện thao tác kéo (`isDragging` check).
   - Nút điều hướng Trước/Sau có kích thước tối thiểu 44x44px kèm `aria-label` và `focus-visible:ring-2`.
   - Hàng chấm tròn phân trang (dots) hỗ trợ phím chuyển nhanh slide.
   - Hỗ trợ `window.matchMedia('(prefers-reduced-motion: reduce)')` để tắt hiệu ứng trượt nếu người dùng nhạy cảm với chuyển động.

2. **`src/components/builder/BlockRenderer.tsx`**:
   - Tích hợp `SliderSection` thay thế cho block slider ảnh tĩnh cũ.
   - Nâng cấp `BannerBlock`: bọc banner trong liên kết tương tác an toàn, hiệu ứng phóng nhẹ ảnh nền `group-hover:scale-[1.02]`, hiệu ứng bấm `active:scale-[0.99]`, và vòng viền `focus-visible:ring-2`.

3. **`src/components/product/ProductCard.tsx`**:
   - Chuyển đổi cấu trúc liên kết: Ảnh sản phẩm là visual thuần túy; liên kết chính nằm trên tiêu đề sản phẩm với pseudo-element stretched-link (`after:absolute after:inset-0 after:z-10`).
   - Các nút chức năng (So sánh, Yêu thích) được đẩy lên `z-20` để thao tác độc lập mà không kích hoạt điều hướng trang.
   - Thêm hiệu ứng nâng thẻ nhẹ `hover:-translate-y-0.5 hover:shadow-card-hover` và vòng viền `focus-within:border-brand-primary`.
   - Sử dụng `useOptionalWishlist()` và `useOptionalCompare()` để thẻ hoạt động bền bỉ, không crash ngay cả khi nằm ngoài Context Provider (ví dụ trong Preview modal hoặc Storybook).

4. **`src/context/WishlistContext.tsx` & `src/context/CompareContext.tsx`**:
   - Bổ sung và export hai hook an toàn: `useOptionalWishlist()` và `useOptionalCompare()`. Khi không tìm thấy Provider trong cây DOM, trả về fallback an toàn (`items: []`, `isInWishlist: () => false`, v.v.) thay vì ném lỗi `throw new Error(...)`.

5. **`src/components/home/ProductTabs.tsx`**:
   - Thêm trạng thái `active:scale-95`, `cursor-pointer`, và vòng viền `focus-visible:ring-2 focus-visible:ring-blue-500` trên các tab danh mục.
   - Bổ sung `role="region"`, `tabIndex={0}`, và `aria-label` cho thanh cuộn sản phẩm ngang để người dùng khiếm thị có thể điều hướng bằng bàn phím.

6. **`src/components/home/VideoReviews.tsx`**:
   - Thêm cơ chế ghi nhớ phần tử kích hoạt (`triggerRef.current = document.activeElement`) và hoàn trả focus chính xác khi đóng dialog video.
   - Bổ sung `active:scale-[0.98]` và `focus-visible:ring-2` trên các tab nền tảng (Tất cả, TikTok, YouTube) và thumbnail video.

7. **`src/components/home/CustomerGallery.tsx`**:
   - Thêm hàm `updateScrollBounds()` tính toán vị trí `scrollLeft` so với `maxScrollLeft` để tự động kích hoạt/vô hiệu hóa các nút mũi tên cuộn ngang.
   - Khôi phục focus về ảnh kích hoạt khi đóng hộp thoại phóng to ảnh khách hàng.
   - Sửa lỗi thiếu import hook `useEffect`.

8. **`src/components/home/BrandSection.tsx`**:
   - Bổ sung `active:scale-95`, `focus-visible:ring-2 focus-visible:ring-blue-500` và `motion-reduce:transition-none` trên từng thẻ thương hiệu.

9. **`src/components/home/HeroSection.tsx`**:
   - Bổ sung `active:scale-[0.99]`, `focus-visible:ring-2` và mở rộng toàn bộ diện tích click cho 2 banner phụ bằng `after:absolute after:inset-0`.

10. **`src/components/home/CategoryGridSection.tsx`**:
    - Bổ sung thuộc tính trợ năng `role="region"`, `tabIndex={0}`, `aria-label="Danh mục sản phẩm hot"` và các nút cuộn ngang hỗ trợ người dùng bàn phím.

11. **`src/components/home/MediaSectionView.tsx`**:
    - Bổ sung hiệu ứng viền focus-visible, trạng thái bấm `active:scale-[0.99]`, đổi màu tiêu đề khi hover sang `text-blue-300`, và bổ sung quy tắc `motion-reduce:group-hover:scale-100`.

---

### 3.2. Các tệp Admin Site Builder (`src/components/admin/builder/` & `src/app/admin/builder/`)

1. **`src/components/admin/builder/SiteBuilderEditor.tsx`**:
   - **Tối ưu không gian làm việc**: Di chuyển `SchedulePanel` vào trong tab "Cài đặt & SEO", giải phóng ~120px chiều cao cho màn hình dựng trang.
   - **Thanh trạng thái lưu**: Chuyển `autosaveStatus` hiển thị nhỏ gọn, trực quan ngay trên header bên cạnh chỉ số Revision (`Đã lưu bản nháp`, `Đang lưu...`, `Lỗi tự động lưu`).
   - **Cảnh báo lỗi toàn cục**: Thêm thanh banner thông báo lỗi có thể đóng (`{error && <div ...>}`) ngay dưới header khi có lỗi lưu hoặc lỗi xuất bản.
   - **Nhân bản sâu (Deep Clone)**: Cập nhật hàm `handleDuplicateSection` sử dụng `structuredClone(sourceSection.data)` để tránh hiện tượng tham chiếu chung dữ liệu giữa các block nhân bản.
   - **Hộp thoại xác nhận an toàn**:
     - Thêm `window.confirm('Bạn có chắc chắn muốn xóa khối này khỏi trang?')` trước khi xóa block.
     - Thêm `window.confirm('Xuất bản bản nháp này lên trang chủ ngay bây giờ?')` trước khi xuất bản.
     - Thêm `window.confirm('Bạn có chắc muốn gỡ xuất bản trang chủ?')` trước khi hủy công khai.
   - **Khả năng tiếp cận phím Escape & Backdrop click**:
     - Lắng nghe sự kiện phím `Escape` để đóng ngay Modal Xem trước (Preview) hoặc Modal Lịch sử (Revisions).
     - Cho phép click vào vùng backdrop xám bên ngoài để đóng modal nhanh chóng.
   - **Bọc Provider cho Preview**: Bọc toàn bộ container của modal Xem trước trong `<WishlistProvider><CompareProvider>` đảm bảo mọi component con hiển thị hoàn hảo.
   - **Nâng cấp form biên tập khối (Block Forms)**:
     - Viết lại `SliderForm`: hiển thị danh sách slide dạng thẻ có ảnh thu nhỏ, hỗ trợ nhập tiêu đề phụ, badge, link, nhãn nút, xóa slide, di chuyển thứ tự và nút **"Chọn ảnh"** liên kết với Media Library.
     - Viết lại `VideoReviewsForm`: hỗ trợ xem trước thumbnail, chỉnh sửa nền tảng (YouTube / TikTok / Facebook), tiêu đề, tên khách hàng và chọn thumbnail từ Media Library.
     - Viết lại `CustomerGalleryForm`: hiển thị lưới thumbnail các ảnh feedback của khách hàng, cho phép xóa từng ảnh và nút **"Thêm ảnh từ thư viện"** để chèn nhiều ảnh nhanh chóng.
   - **Xử lý Media Selection mở rộng**: Mở rộng `handleMediaSelect` để bắt chính xác các ngữ cảnh `slide_image:*`, `video_thumb:*`, `gallery_image:*` và `gallery_image_add`.

2. **`src/app/admin/builder/page.tsx`**:
   - Bổ sung phím tắt `Escape` để đóng modal "Tạo landing page mới".
   - Bổ sung sự kiện đóng modal khi click ra ngoài vùng backdrop.
   - Hoàn trả focus về nút kích hoạt (`id="btn-create-landing"`) sau khi modal đóng.

---

## 4. Bảng kiểm tra Responsive & Khả năng truy cập (A11y)

| Độ phân giải / Ngữ cảnh | Thiết bị đại diện | Trạng thái hiển thị | Hiện tượng vỡ tràn ngang (Overflow) | Ghi chú & Kết quả kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **1440 x 900 px** | Desktop / Laptop lớn | Cân đối, chuẩn lưới 12 cột | **Không** (`scrollWidth = innerWidth = 1440`) | Không gian builder rộng rãi; homepage hiển thị trọn vẹn banner đôi và slider 1200px. |
| **768 x 1024 px** | iPad / Máy tính bảng | Tự động chuyển 2 cột / lưới co giãn | **Không** (`scrollWidth = innerWidth = 768`) | Thanh tab cuộn mượt; nút mũi tên tự động căn lề; header responsive. |
| **390 x 844 px** | iPhone 12/13/14 Pro | 1 cột chuẩn mobile, hỗ trợ vuốt chạm | **Không** (`scrollWidth = innerWidth = 390`) | Touch swipe hoạt động mượt; stretched-link giúp chạm mở sản phẩm dễ dàng; các nút chức năng đạt > 44px. |
| **320 x 568 px** | Mobile cỡ nhỏ (iPhone SE cũ) | Co giãn linh hoạt, không tràn chữ | **Không** (`scrollWidth = innerWidth = 320`) | Tiêu đề sản phẩm xuống dòng tự nhiên; không xuất hiện thanh cuộn ngang trang ngoài ý muốn. |
| **Phóng to 200% (Zoom)** | Trợ năng thị giác kém | Bố cục tự chuyển sang single-column | **Không** | Văn bản không bị đè chữ; các modal tự động có `overflow-y-auto` để cuộn nội dung. |
| **Điều hướng bàn phím** | Phím Tab / Shift+Tab / Enter / Space | Focus ring rõ ràng (`ring-2 ring-blue-500`) | N/A | Dễ dàng nhảy qua từng thẻ sản phẩm, tab danh mục; phím mũi tên điều hướng slider; phím `Escape` đóng modal. |

---

## 5. Kết quả chạy tự động hóa & Kiểm tra mã nguồn

1. **Kiểm tra biên giới hạn Client Bundle (`scripts/test-builder-client-boundary.mjs`)**:
   ```bash
   node scripts/test-builder-client-boundary.mjs
   ```
   **Kết quả:**
   ```text
   PASS: builder browser bundle contains no server modules
   ```
   *Đảm bảo 100% không có import ngầm từ `src/server/` vào client component.*

2. **Kiểm tra TypeScript (`tsc --noEmit`)**:
   ```bash
   npx tsc --noEmit
   ```
   **Kết quả:**
   ```text
   Exit code: 0 (0 errors)
   ```
   *Toàn bộ type interface của block data, props component và hook context đồng bộ tuyệt đối.*

3. **Kiểm tra tích hợp toàn diện R07a Site Builder (`scripts/test-r07a-site-builder.mjs`)**:
   ```bash
   node scripts/test-r07a-site-builder.mjs
   ```
   **Kết quả:**
   ```text
   --- STARTING R07A SITE BUILDER INTEGRATION TEST SUITE ---
   PASS: Apply all migrations up to 0017_site_builder.sql
   PASS: Seed mock catalog data (products, categories, brands)
   PASS: Homepage bootstrap initializes revision 1, publishes, and subsequent calls skip
   PASS: Saving draft increments revision, updates draft, and does NOT leak to public homepage
   PASS: Publish atomically updates public storefront; unpublish gracefully disables it
   PASS: Concurrent or stale write attempts are rejected with 409 conflict
   PASS: LandingPageRevision tracks append-only history and restore creates a new draft
   PASS: Custom landing pages validate slugs, reject reserved routes, and serve /landing/:slug
   PASS: Product grid sections resolve active products and exclude draft products
   PASS: Collections support manual and rule modes, with published-only product resolution
   PASS: StoreFront settings provides CMS branding, showroom, hotline and contact data

   ========================================
   ALL R07A INTEGRATION TESTS PASSED: 11/11
   ========================================
   ```

4. **Kiểm tra Server Dev trên cổng 3001 & Trình duyệt thật (Chrome DevTools MCP)**:
   Vite + Cloudflare D1 dev server phản hồi mã `200 OK` trên cả tuyến Homepage (`/`), trang quản lý (`/admin/builder`) và trang biên tập (`/admin/builder/home`).
   Thực hiện tương tác thực tế với phiên đăng nhập quản trị viên (`admin@citilap.vn` / quyền `OWNER`):
   - Đóng mở Preview modal bằng nút "Xem trước" và phím `Escape`.
   - Kiểm tra cơ chế tự động lưu (autosave debounce) giữ nguyên trạng thái bản nháp qua các lần tải lại trang (reload).
   - Thử nghiệm `prefers-reduced-motion: reduce` xác nhận tắt toàn bộ hiệu ứng chuyển động (`transition: none`).

---

## 6. Hình ảnh bằng chứng (Evidence Screenshots) & So sánh

Tất cả ảnh bằng chứng được lưu trữ tại thư mục `docs/admin/evidence/homepage-polish/`:

| Tên tệp ảnh | Mô tả ngữ cảnh | Điểm cải tiến nhận diện được |
| :--- | :--- | :--- |
| [before-builder-1440.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/before-builder-1440.png) | Giao diện Admin Builder ban đầu (1440px) | `SchedulePanel` đặt trên đỉnh làm chật không gian; trạng thái lưu tách rời; form chỉnh sửa block thiếu ảnh preview. |
| [after-builder-1440.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-builder-1440.png) | Giao diện Admin Builder sau cải tiến (1440px) | Không gian làm việc thông thoáng thêm ~120px; trạng thái autosave đặt tinh tế trên header; form slider/video/gallery có thumbnail và nút chọn từ Thư viện Media. |
| [after-builder-768.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-builder-768.png) | Giao diện Admin Builder trên Tablet (768px) | Bố cục dạng ngăn xếp (stacked) co giãn hợp lý; các nút hành động tự động cuộn mà không làm tràn ngang màn hình. |
| [after-builder-preview.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-builder-preview.png) | Modal Xem trước (Preview) trong Admin Builder | Render đầy đủ dữ liệu thực tế không bị crash; bọc Context Provider; hỗ trợ đóng nhanh bằng phím `Escape`. |
| [before-home-1440-full.jpeg](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/before-home-1440-full.jpeg) | Homepage ban đầu (1440px toàn trang) | Slider tĩnh; thẻ sản phẩm có nested `<a>`; các nút cuộn ngang thiếu trạng thái vô hiệu hóa ở đầu/cuối danh sách. |
| [after-home-1440.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-home-1440.png) | Homepage sau cải tiến trên Desktop (1440px) | Slider tương tác sống động có autoplay/pause; chấm tròn điều hướng; thẻ sản phẩm có hiệu ứng hover nâng nhẹ và viền focus sắc nét. |
| [after-home-768.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-home-768.png) | Homepage hiển thị trên Tablet (768px) | Thanh danh mục cuộn mượt; lưới sản phẩm 2 cột tối ưu; nút bấm có touch target lớn. |
| [after-home-390.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-home-390.png) | Homepage hiển thị trên Mobile (390px) | Hỗ trợ vuốt trượt touch mượt mà; không vỡ layout; stretched link giúp người dùng dễ dàng chạm mở sản phẩm. |
| [after-home-320.png](file:///c:/Users/Admin/Desktop/citilap-web2/docs/admin/evidence/homepage-polish/after-home-320.png) | Homepage hiển thị trên màn hình hẹp (320px) | Không có thanh cuộn ngang thừa; văn bản tự co giãn gọn gàng; trải nghiệm liền mạch. |

---

## 7. Kết luận

Các cải tiến trên đã giải quyết triệt để các vấn đề về độ hoàn thiện giao diện, trạng thái tương tác và tính an toàn trong quản trị mà không làm biến đổi bất kỳ logic kinh doanh, schema cơ sở dữ liệu hay cấu trúc API nào của dự án CitiLap. Dự án đã sẵn sàng cho giai đoạn kiểm thử người dùng hoặc triển khai production.
