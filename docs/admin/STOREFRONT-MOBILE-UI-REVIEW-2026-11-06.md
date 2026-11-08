# Storefront Mobile UI/UX Review & Remediation — 2026-11-06

## Trạng thái điều phối

- **Trạng thái hiện tại**: `MOBILE 2 ACK` (Đang rà soát, sửa lỗi và kiểm tra thực tế Chi tiết sản phẩm, Giỏ hàng, Checkout; giữ nguyên kết quả MOBILE 1 đã được chấp nhận)
- **Thời điểm nhận việc (`MOBILE 1 ACK`)**: `2026-11-06T01:26:00+07:00`
- **Thời điểm hoàn tất (`MOBILE 1 DONE`)**: `2026-11-06T01:41:00+07:00`
- **Thời điểm nhận việc (`MOBILE 2 ACK`)**: `2026-11-06T01:44:00+07:00`
- **File chạm trong vòng sửa nhỏ cuối cùng (`MOBILE 1`)**: `src/components/home/ProductTabs.tsx`, `docs/admin/STOREFRONT-MOBILE-UI-REVIEW-2026-11-06.md`
- **Branch**: `staging`
- **Phạm vi đợt này (`MOBILE 1`)**:
  - Điều hướng và khám phá sản phẩm trên Storefront Mobile (`320×568`, `390×844`, `430×932`, `768×1024`, `1440×900`) và Desktop native zoom `200%` (`1440×900` qua Chrome profile `default_zoom_level`).
  - Header, menu/drawer mobile (`MobileBottomNav`), filter drawer (`MobileFilterDrawer`), floating contact (`FloatingContactWidget`), `ScrollToTop`, Trang chủ (`/`), Danh mục (`/phan-loai`, `/phan-loai/[slug]`) và Tìm kiếm (`/search`).

---

## 1. Phát hiện, Mức độ & Cách tái hiện

### 1.1. Tràn ngang 36px trên Trang chủ tại viewport 320px (Mức độ: High)
- **Tái hiện**: Mở `/` ở viewport `320×568` (`baseline/results.json` & `baseline/320-0.png`). Chrome mobile tự nới `window.innerWidth` từ `320` lên `356` (`scrollWidth = 356`, tràn thực tế `36px`).
- **Nguyên nhân**:
  1. `src/components/home/HotSaleCampaigns.tsx`: Khối countdown dùng `flex items-center gap-2` với nhãn `"Kết thúc sau:"` (`whitespace-nowrap`) và 4 ô số `min-w-[40px]` khiến tổng chiều rộng vượt quá container `320px`.
  2. `src/components/home/VideoReviews.tsx`: Khung danh sách video có các phần tử flex/button thiếu `min-w-0` và `overflow-hidden`, đẩy rộng thẻ cha ở `320px`.
- **Cách sửa**:
  - Cho phép `flex-wrap` và co gọn kích thước ô đếm ngược trên màn siêu nhỏ (`min-w-[36px] sm:min-w-[40px]`) trong `HotSaleCampaigns.tsx`.
  - Thêm `overflow-hidden` trên wrapper và `min-w-0` cho các cột/nút danh sách video trong `VideoReviews.tsx`.

### 1.2. Tràn ngang trên `/phan-loai`, `/search` và `<details>` popover ẩn trên Danh mục (Mức độ: High)
- **Tái hiện**:
  1. Mở `/phan-loai` ở `320–430px`: Vòng tròn blur trang trí `top-0 right-0 -mt-10 -mr-10 w-64 h-64` nằm trong khối chỉ có `overflow-y-visible` mà không có `overflow-x-clip`, gây tràn ngang.
  2. Mở `/search?q=thinkpad` ở `320px`: Ô thương hiệu `Lenovo` dùng ảnh SVG `w-20` (`80px`) trong lưới `grid-cols-4` ở `320px` (mỗi ô chỉ rộng `~62px`), làm tràn ô thương hiệu; các chip bộ lọc nhanh chưa có `hidden [[open]>&]:block` trên popover `<details>`.
  3. Mở `/phan-loai` (`CategoryCatalog.tsx`): Các `<details>` bộ lọc có popover `absolute left-0 w-60`/`w-72` vẫn tính vào bounding box khi đóng ở một số trình duyệt nếu chỉ ẩn bằng `opacity-0 invisible`.
- **Cách sửa**:
  - Thêm `overflow-x-clip` cho banner `/phan-loai` (`src/app/(catalog)/phan-loai/page.tsx`).
  - Giới hạn `max-w-full` cho logo thương hiệu và đổi popover `<details>` sang `hidden [[open]>&]:block` trong `src/components/search/SearchListingContainer.tsx` và `src/components/category/CategoryCatalog.tsx`.

### 1.3. Hồi quy native `<dialog>` khi mở menu/filter ở mobile rồi resize sang desktop & tối giản xử lý modal (Mức độ: High — theo review của Codex)
- **Tái hiện**:
  - Mở menu danh mục (`button[aria-label="Mở danh mục sản phẩm"]`) ở `390×844` rồi resize sang `1440×900` (`mobile1-resize/results.json`): `<dialog>` vẫn ở trạng thái `:modal` nhưng có `md:hidden` (`display: none`), đồng thời `document.body.style.overflow` vẫn là `"hidden"`. Trang desktop bị khóa cuộn và inert bởi một modal vô hình.
  - Ngoài ra, `MobileBottomNav.tsx` và `MobileFilterDrawer.tsx` vừa gọi `showModal()` vừa đăng ký `window.addEventListener("keydown", ...)` trùng lặp cho `Tab`/`Escape`, có fallback `setAttribute("open", "")` âm thầm biến modal thành non-modal, gọi `.focus()` hai lần qua `requestAnimationFrame`, và thêm CSS `dialog:modal`/`dialog::backdrop` toàn cục không cần thiết trong `src/app/globals.css`.
- **Cách sửa**:
  - Trong `src/components/layout/MobileBottomNav.tsx` và `src/components/category/MobileFilterDrawer.tsx`:
    - Dùng thuần native `dialog.showModal()`, `onCancel`, `onClose`; bỏ hẳn listener `window` `keydown` (`Tab`/`Escape` tự tạo), bỏ fallback `setAttribute("open", "")` và bỏ `requestAnimationFrame` focus trùng lặp.
    - Lưu `previousOverflow = document.body.style.overflow` trước khi khóa cuộn và khôi phục đúng `previousOverflow` trong cleanup.
    - Lắng nghe vượt breakpoint (`matchMedia("(min-width: 768px)")` / `resize` cho menu mobile; kiểm tra `getComputedStyle(opener).display === "none"` khi resize cho filter drawer): tự động `dialog.close()`, đồng bộ state đóng, trả lại `document.body.style.overflow`, và **không** cố focus nút mở đang `display: none`. Khi chỉ đổi chiều cao trên mobile (`390×844` → `390×620`), native `<dialog>` vẫn giữ nguyên trạng thái mở.
  - Bỏ các rule `dialog:modal` và `dialog::backdrop` toàn cục ở cuối `src/app/globals.css` (đã có `overscroll-contain` trực tiếp trên drawer).

### 1.4. Tỷ lệ Header mobile, vị trí nút nổi và vùng chạm nút hành động trên `ProductCard` / Filter (Mức độ: Medium)
- **Tái hiện**:
  - Trên `320px–430px`, logo Header chiếm nhiều chiều ngang khiến ô tìm kiếm bị hẹp.
  - Nút So sánh và Yêu thích trên `ProductCard.tsx` chỉ đạt `28×28px` (`w-7 h-7`), khó chạm chính xác trên mobile; nhưng nếu phóng to cả vòng tròn hiển thị sẽ che ảnh sản phẩm hoặc làm cắt chữ badge `LikeNew 99%` ở lưới 2 cột.
  - Nút mở bộ lọc tìm kiếm/danh mục và các tab/nút điều hướng rail cần đảm bảo chiều cao chạm tối thiểu (`min-h-11`) và hỗ trợ `motion-reduce`.
- **Cách sửa**:
  - Tinh chỉnh kích thước logo và padding ô tìm kiếm trên mobile trong `src/components/layout/Header.tsx` và `src/components/search/SearchAutocomplete.tsx`.
  - Tăng vùng chạm thực tế của 2 nút So sánh và Yêu thích trong `src/components/product/ProductCard.tsx` lên `36×36px` ở `<640px` và `40×40px` ở `>=640px` (`w-9 h-9 sm:w-10 sm:h-10 -m-1`) trong khi giữ vòng tròn hiển thị nhỏ gọn (`before:w-7 before:h-7 sm:before:w-8 sm:before:h-8`) bằng pseudo-element `before:`, giúp tăng diện tích chạm mà không che ảnh sản phẩm và không làm cắt badge `LikeNew 99%` / `Mới 100%` trên mọi loại card (laptop, phụ kiện, sale).
  - Đảm bảo khoảng cách đáy của `FloatingContactWidget.tsx` và `ScrollToTop.tsx` không đè lên `MobileBottomNav`, bổ sung `min-h-11` cho các nút mở bộ lọc (`CategoryListingContainer.tsx`, `SearchListingContainer.tsx`) và `motion-reduce` cho `ProductTabs.tsx`.

### 1.5. Thẻ sản phẩm trong `ProductCarousel` (`ProductTabs.tsx`) quá hẹp ở `<480px` (Mức độ: High — theo review của Codex)
- **Tái hiện**:
  - Tại `.wrangler/storefront-mobile-20261106/mobile1-rail/390-rail-before.png` và `mobile1-rail/results.json`: Do `ProductCarousel` bố trí lưới 3 cột `grid-cols-[28px_minmax(0,1fr)_28px]` cho 2 nút mũi tên hai bên, vùng rail ở giữa tại viewport `390px` chỉ còn rộng `266px`. Khi nhánh `oneAtATime = false` dùng `auto-cols-[calc((100%-12px)/2)]` (ép 2 cột ngay trên màn nhỏ), mỗi card chỉ rộng `123px`, làm nhãn `Mới 100%`, tên sản phẩm và thông số spec bị cắt cụt.
- **Cách sửa**:
  - Trong `src/components/home/ProductTabs.tsx` (`ProductCarousel`), đổi nhánh `oneAtATime = false` từ `'auto-cols-[calc((100%-12px)/2)]'` thành `'auto-cols-[85%] min-[480px]:auto-cols-[calc((100%-12px)/2)]'`. Giữ nguyên nhánh `oneAtATime = true`, `md:auto-cols-[calc((100%-24px)/3)]`, `lg:auto-cols-[calc((100%-48px)/5)]`, dữ liệu, nút mũi tên, nút tạm dừng và logic cuộn.

---

## 2. Danh sách file chạm trong đợt `MOBILE 1`

1. `src/components/layout/Header.tsx`
2. `src/components/layout/MobileBottomNav.tsx`
3. `src/components/layout/FloatingContactWidget.tsx`
4. `src/components/layout/ScrollToTop.tsx`
5. `src/components/search/SearchAutocomplete.tsx`
6. `src/components/search/SearchListingContainer.tsx`
7. `src/components/home/HotSaleCampaigns.tsx`
8. `src/components/home/VideoReviews.tsx`
9. `src/components/home/ProductTabs.tsx`
10. `src/components/category/CategoryCatalog.tsx`
11. `src/components/category/CategoryListingContainer.tsx`
12. `src/components/category/MobileFilterDrawer.tsx`
13. `src/components/product/ProductCard.tsx`
14. `src/app/(catalog)/phan-loai/page.tsx`
15. `docs/admin/STOREFRONT-MOBILE-UI-REVIEW-2026-11-06.md`

*(Lưu ý: `src/app/globals.css` đã được hoàn nguyên phần rule `dialog` thừa, khớp 100% với HEAD).*

---

## 3. Lệnh kiểm tra và kết quả thật

### 3.1. Kiểm tra hồi quy menu `<dialog>` khi resize qua breakpoint `md` (`390px` → `1440px` → `390px`)
- **Lệnh**:
  ```powershell
  node .wrangler/storefront-mobile-20261106/review.mjs mobile1-resize-fixed --menu-only --resize
  ```
- **Kết quả**: `PASS 390 / overflow=0` (Exit code `0`).
- **Trích xuất `.wrangler/storefront-mobile-20261106/mobile1-resize-fixed/results.json`**:
  - `overflow`: `0` (`innerWidth: 390, clientWidth: 390`)
  - `menu`: `{ "dialog": true, "focusInside": true, "locked": true }`
  - `trapped`: `true` (Tab giữ trong modal / sentinel của native dialog, không lọt vào nội dung nền)
  - `resize`: `{ "closed": true, "unlocked": true, "modalDisplay": null, "reopened": true }`
  - `closed`: `true` (đóng bằng `Escape`)
  - `focusReturned`: `true` (trả focus về `button[aria-label="Mở danh mục sản phẩm"]`)
  - `errors`: `[]`, `apiErrors`: `[]`, `blocked`: `[]`

### 3.2. Kiểm tra tương tác thật: chọn & áp dụng bộ lọc + giữ URL qua Reload/Back/Forward + kích thước nút Card + resize chiều cao mobile
- **Lệnh**:
  ```powershell
  node .wrangler/storefront-mobile-20261106/verify-mobile1-codex.mjs
  ```
- **Kết quả**: `ALL VERIFICATIONS PASSED` (Exit code `0`).
- **Trích xuất `.wrangler/storefront-mobile-20261106/mobile1-codex-verify/results.json`**:
  - `mobileHeightResize` (`390×844` → `390×620`): `{ "modalStillOpen": true, "locked": true }`
  - `cardButtons320` (`136` nút Compare/Wishlist trên `/` ở `320×568`): `minWidth: 36, minHeight: 36, pageOverflow: 0`
  - `filterInteractivePersistence` (mở drawer bộ lọc trên `/search?q=thinkpad`, bấm chọn danh mục `Lenovo ThinkPad P`, bấm `Áp dụng bộ lọc`, sau đó `reload`, `history.back()`, `history.forward()`):
    - `initialSearchUrl`: `"/search?q=thinkpad"`
    - `selectedOption`: `{ "type": "button", "label": "Lenovo ThinkPad P6" }`
    - `appliedSearchUrl`: `"/search?q=thinkpad&category=lenovo-thinkpad-p"`
    - `afterReloadUrl`: `"/search?q=thinkpad&category=lenovo-thinkpad-p"` (`persistedAcrossReload: true`)
    - `afterBackUrl`: `"/search?q=thinkpad"` (`restoredOnBack: true`)
    - `afterForwardUrl`: `"/search?q=thinkpad&category=lenovo-thinkpad-p"` (`restoredOnForward: true`)

### 3.3. Kiểm tra `ProductCarousel` rail ở `390×844` và `320×568`
- **Lệnh kiểm tra `390×844`** (dùng script gốc):
  ```powershell
  node .wrangler/storefront-mobile-20261106/review.mjs rail-fixed-390 --menu-only --rail
  ```
  - **Kết quả**: `PASS 390 / overflow=0` (Exit code `0`).
  - **Trích xuất `.wrangler/storefront-mobile-20261106/rail-fixed-390/results.json`**:
    - `viewportWidth`: `390`, `overflow`: `0`
    - `label`: `"Sản phẩm Laptop mới về"`, `width` (rail `clientWidth`): `266`
    - `cardWidth`: `219.296875` px (`>= 160px`, tăng từ `123px` ở `mobile1-rail/results.json`; hiển thị đầy đủ badge `Mới 100%`, thương hiệu, giá, tên 2 dòng và 4 ô cấu hình tại `rail-fixed-390/390-rail-before.png`)
    - Điều hướng bàn phím (`Enter` trên nút `Sản phẩm tiếp theo`): `scrollLeft` tăng từ `0` lên `231` (`afterKey: { "left": 231, "active": "Sản phẩm tiếp theo" }`)
    - Điều hướng chuột (click nút `Sản phẩm tiếp theo`): `scrollLeft` tăng từ `231` lên `463` (`after: 463`, `moved: true`; ảnh sau khi cuộn tại `rail-fixed-390/390-rail-after.png`)
    - Ghi chú harness cho `afterTouch`: `afterTouch: 463` (`touchMoved: false`). Nguyên nhân do lệnh `Input.synthesizeScrollGesture` trong harness truyền `xDistance: -120, speed: 300, preventFling: true` trên vùng có `snap-x snap-mandatory`, khoảng kéo `120px` với `preventFling: true` khiến Chrome CSS scroll-snap trả lại điểm neo hiện tại (`463`). Không sửa rộng source để chạy theo hành vi giả lập `preventFling` của harness.
- **Lệnh kiểm tra `320×568`** (bản sao `.wrangler/storefront-mobile-20261106/review-rail320.mjs` chỉ đổi viewport `--menu-only` từ `[[390,844]]` sang `[[320,568]]`, giữ nguyên script gốc `review.mjs`):
  ```powershell
  node .wrangler/storefront-mobile-20261106/review-rail320.mjs rail-fixed-320 --menu-only --rail
  ```
  - **Kết quả**: `PASS 320 / overflow=0` (Exit code `0`).
  - **Trích xuất `.wrangler/storefront-mobile-20261106/rail-fixed-320/results.json`**:
    - `viewportWidth`: `320`, `overflow`: `0`
    - `label`: `"Sản phẩm Laptop mới về"`, `width` (rail `clientWidth`): `196`
    - `cardWidth`: `159.796875` px (xấp xỉ `160px`, bằng đúng `85%` của `188px` vùng nội dung sau trừ `px-1` = `8px` của rail `196px`; ảnh tại `rail-fixed-320/320-rail-before.png`)
    - Điều hướng bàn phím (`Enter` trên nút `Sản phẩm tiếp theo`): `scrollLeft` tăng từ `0` lên `172` (`afterKey: { "left": 172, "active": "Sản phẩm tiếp theo" }`)
    - Điều hướng chuột (click nút `Sản phẩm tiếp theo`): `scrollLeft` tăng từ `172` lên `344` (`after: 344`, `moved: true`; ảnh sau khi cuộn tại `rail-fixed-320/320-rail-after.png`)
    - Ghi chú harness cho `afterTouch`: `afterTouch: 344` (`touchMoved: false`), cùng cơ chế CSS scroll-snap với `Input.synthesizeScrollGesture` (`xDistance: -120, preventFling: true`) như ở `390px`.

### 3.4. Kiểm tra 15 tổ hợp Route × Viewport (`320`, `390`, `430`, `768`, `1440`) & Native Zoom `200%`
- **Bằng chứng độc lập đã xác nhận tại**:
  - `.wrangler/storefront-mobile-20261106/mobile1-check2/results.json`: **15/15** route × viewport (`/`, `/phan-loai/laptop-gaming`, `/search?q=thinkpad` tại `320×568`, `390×844`, `430×932`, `768×1024`, `1440×900`) đạt `overflow = 0`, `innerWidth === clientWidth`, cùng **3/3** tương tác menu mobile (`320`, `390`, `430`) đạt `PASS`.
  - `.wrangler/storefront-mobile-20261106/mobile1-zoom/results.json`: **3/3** route (`/`, `/phan-loai`, `/search?q=thinkpad`) ở `1440×900` với Chrome native zoom `200%` (`outerWidth = 1440`, `innerWidth = 708`, `clientWidth = 700`, `dpr = 2`) đạt `overflow = 0`.

### 3.5. Kiểm tra TypeScript, ESLint & Build
- **TypeScript**:
  ```powershell
  npx tsc --noEmit
  ```
  - **Kết quả**: Exit code `0` (không có lỗi kiểu).
- **ESLint trên `src/components/home/ProductTabs.tsx`**:
  ```powershell
  npx eslint src/components/home/ProductTabs.tsx
  ```
  - **Kết quả**: Exit code `0` (`0 errors`, `0 warnings`).
- **ESLint trên các file sửa trong đợt review `<dialog>` / `ProductCard`**:
  ```powershell
  npx eslint src/components/layout/MobileBottomNav.tsx src/components/category/MobileFilterDrawer.tsx src/components/category/CategoryListingContainer.tsx src/components/product/ProductCard.tsx
  ```
  - **Kết quả**: Exit code `0` (`0 errors`).
- **Lưu ý về ESLint toàn bộ các file chạm từ trước**:
  - Không tuyên bố toàn bộ lint PASS trên mọi file trong đợt đầu vì còn **2 lỗi có sẵn** ở `src/components/home/VideoReviews.tsx:141` và `src/components/search/SearchAutocomplete.tsx:81` (`react-hooks/set-state-in-effect` tại các dòng không thuộc phạm vi sửa CSS của vòng này).
- **Build Cloudflare**:
  ```powershell
  npm run build:cloudflare
  ```
  - **Kết quả**: Exit code `0` (xây dựng thành công).

---

## 4. Bằng chứng ảnh Trước / Sau & JSON (`.wrangler/storefront-mobile-20261106/`)

| Hạng mục | Trước khi sửa (Before) | Sau khi sửa (After) |
| :--- | :--- | :--- |
| `ProductCarousel` rail tại `390×844` (cuộn đến rail, trước/sau bấm tiếp) | `.wrangler/storefront-mobile-20261106/mobile1-rail/390-rail-before.png` (`cardWidth: 123px`, cắt chữ, `moved: false`) | `.wrangler/storefront-mobile-20261106/rail-fixed-390/390-rail-before.png`, `.wrangler/storefront-mobile-20261106/rail-fixed-390/390-rail-after.png` (`cardWidth: 219.296875px`, `scrollLeft: 0 -> 231 -> 463`, `moved: true`) |
| `ProductCarousel` rail tại `320×568` (cuộn đến rail, trước/sau bấm tiếp) | `.wrangler/storefront-mobile-20261106/baseline/320-0.png` | `.wrangler/storefront-mobile-20261106/rail-fixed-320/320-rail-before.png`, `.wrangler/storefront-mobile-20261106/rail-fixed-320/320-rail-after.png` (`cardWidth: 159.796875px`, `scrollLeft: 0 -> 172 -> 344`, `moved: true`) |
| Trang chủ `/` ở `320×568` (tràn 36px → 0px) | `.wrangler/storefront-mobile-20261106/baseline/320-0.png` | `.wrangler/storefront-mobile-20261106/mobile1-check2/320-0.png`, `.wrangler/storefront-mobile-20261106/mobile1-codex-verify/320-cards-after.png`, `.wrangler/storefront-mobile-20261106/rail-fixed-320/320-0.png` |
| Menu `<dialog>` mở ở `390×844` & focus trap | `.wrangler/storefront-mobile-20261106/menu-before/390-menu.png` | `.wrangler/storefront-mobile-20261106/mobile1-resize-fixed/390-menu.png`, `.wrangler/storefront-mobile-20261106/rail-fixed-390/390-menu.png` |
| Resize `390×844` → `1440×900` khi menu đang mở | `.wrangler/storefront-mobile-20261106/mobile1-resize/resize-desktop.png` (`results.json`: `closed: false, unlocked: false`) | `.wrangler/storefront-mobile-20261106/mobile1-resize-fixed/resize-desktop.png` (`results.json`: `closed: true, unlocked: true, reopened: true`) |
| Tương tác chọn & áp dụng bộ lọc trên `/search?q=thinkpad` (`390×844`) | `.wrangler/storefront-mobile-20261106/baseline/390-2.png` | `.wrangler/storefront-mobile-20261106/mobile1-codex-verify/390-search-filter-drawer-open.png`, `390-search-filter-selected.png`, `390-search-filter-applied.png` |
| Dữ liệu JSON tổng hợp | `.wrangler/storefront-mobile-20261106/baseline/results.json`, `mobile1-resize/results.json`, `mobile1-rail/results.json` | `.wrangler/storefront-mobile-20261106/mobile1-check2/results.json`, `mobile1-zoom/results.json`, `mobile1-resize-fixed/results.json`, `mobile1-codex-verify/results.json`, `rail-fixed-390/results.json`, `rail-fixed-320/results.json` |

---

## 5. Phần chưa xác minh / Giới hạn an toàn

- Không chạy `scripts/test-r09a-matrix.mjs` trên server local đang chạy vì script đó yêu cầu môi trường fixture cô lập riêng và chứa các bước tạo đơn hàng (`POST`).
- Các luồng PDP (`/laptop/[slug]`, `/phu-kien/[slug]`), Giỏ hàng (`/cart`), Thanh toán (`/checkout`) và các trang nội dung phụ sẽ được kiểm tra và xử lý chi tiết trong các đợt tiếp theo (`MOBILE 2+`) theo đúng điều phối của Codex.
