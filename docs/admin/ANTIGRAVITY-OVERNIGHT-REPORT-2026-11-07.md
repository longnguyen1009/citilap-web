# Báo cáo Điều phối UI qua đêm — 07/11/2026

## Trạng thái điều phối
- **Trạng thái hiện tại**: `ROUND7 DONE` (Tiếp nối `ROUND1A/1B DONE`, `ROUND2 DONE`, `ROUND3 DONE`, `ROUND4 DONE`, `ROUND5 DONE`, `ROUND6 CORRECTED`)
- **Timestamp `ROUND 1 ACK`**: `2026-11-07T00:52:15+07:00`
- **Timestamp `ROUND1A RUNNING`**: `2026-11-07T00:54:30+07:00`
- **Timestamp `ROUND1B RUNNING`**: `2026-11-07T01:16:50+07:00`
- **Timestamp `ROUND1B DONE`**: `2026-11-07T01:18:55+07:00`
- **Timestamp `ROUND2 ACK`**: `2026-11-07T01:24:05+07:00`
- **Timestamp `ROUND2 DONE`**: `2026-11-07T01:36:30+07:00`
- **Timestamp `ROUND3 ACK`**: `2026-11-07T01:44:45+07:00`
- **Timestamp `ROUND3 DONE`**: `2026-11-07T01:48:35+07:00`
- **Timestamp `ROUND4 ACK`**: `2026-11-07T01:49:35+07:00`
- **Timestamp `ROUND4 DONE`**: `2026-11-07T01:52:20+07:00`
- **Timestamp `ROUND5 ACK`**: `2026-11-07T01:53:46+07:00`
- **Timestamp `ROUND5 DONE`**: `2026-11-07T02:03:25+07:00`
- **Timestamp `ROUND6 REVIEW DONE`**: `2026-11-07T02:04:30+07:00`
- **Timestamp `ROUND7 ACK`**: `2026-11-07T02:07:40+07:00`
- **Timestamp `ROUND7 DONE`**: `2026-11-07T02:11:35+07:00`
- **Workspace**: `C:/Users/Admin/Desktop/citilap-web2` (branch `staging`, giữ nguyên dirty worktree và dev server PID `17148` trên `::1:3001`)
- **File source duy nhất chỉnh sửa trong `ROUND1A` & `ROUND1B`**: `src/components/product/ProductGallery.tsx`
- **File source chỉnh sửa trong `ROUND2`**: `src/components/home/ProductTabs.tsx`, `src/components/home/CustomerGallery.tsx`
- **File source chỉnh sửa trong `ROUND3`**: `src/components/product/ProductQuickCheckoutModal.tsx`
- **File source chỉnh sửa trong `ROUND4`**: `src/components/home/SliderSection.tsx`
- **File source chỉnh sửa trong `ROUND5` & `ROUND6`**: Không chỉnh sửa mã nguồn sản phẩm (chỉ xác thực & phân tích hiệu năng read-only)
- **File source chỉnh sửa trong `ROUND7`**: `src/components/product/ProductGallery.tsx`
- **Bằng chứng**: `.wrangler/ui-overnight-20261107/`

---

## 1. Chi tiết thực hiện `ROUND1A` & `ROUND1B` trên `src/components/product/ProductGallery.tsx`

### 1.1. Nhận diện cử chỉ vuốt ngang, lọc cuộn chéo/dọc, multitouch, `touchcancel` & hỗ trợ `pinch-zoom`
- **Lỗi trước khi sửa**:
  - `handleTouchEnd` chỉ kiểm tra `Math.abs(deltaX) > 40`, không theo dõi `deltaY`, không xử lý `touchcancel` hoặc `multitouch`. Khi người dùng cuộn dọc hơi chéo (`|deltaX| > 40`, `|deltaY| > |deltaX|`), gallery tự động chuyển ảnh ngoài ý muốn.
  - Vùng chạm ảnh chính và khung phóng to dùng `touch-pan-y` đơn lẻ (`touch-action: pan-y`), làm mất khả năng `pinch-zoom` trên thiết bị cảm ứng.
  - Sự kiện `click` tổng hợp ngay sau thao tác vuốt có nguy cơ mở nhầm lightbox hoặc đóng nhầm overlay.
- **Cách sửa (`ROUND1A` + `ROUND1B`)**:
  - Theo dõi cả `x`, `y` và cờ `multi` trong `touchStartRef`:
    - `handleTouchStart`: Nếu `e.touches.length !== 1` thì xóa `touchStartRef.current = null`.
    - `handleTouchMove`: Nếu `e.touches.length > 1` thì đánh dấu `start.multi = true` (bỏ qua cử chỉ đa điểm / pinch-zoom); nếu dịch chuyển `> 10px` theo trục X hoặc Y thì ghi nhận `swipedRef.current = true` kèm `swipeTimeRef.current = performance.now()`.
    - `handleTouchCancel`: Reset `touchStartRef.current = null`.
    - `handleTouchEnd`: Chỉ chuyển ảnh khi cử chỉ đơn điểm hoàn tất (`!start.multi`, `e.touches.length === 0`) và **ưu thế ngang rõ rệt**: `Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5`.
    - Chặn `click` tổng hợp ngay sau thao tác vuốt (`consumeSuppressedClick()` trong `< 400ms`) trên khung ảnh chính và backdrop `<dialog>` để vuốt không mở nhầm lightbox hoặc đóng nhầm overlay; nút `Phóng to / Xem ảnh to` vẫn mở trực tiếp khi bấm.
  - Kết hợp `touch-pan-y touch-pinch-zoom` trên cả 2 bề mặt cảm ứng (khung ảnh chính dòng `213` và khung ảnh trong lightbox dòng `401`), cho ra computed `touch-action: pan-y pinch-zoom` mà không gọi `preventDefault()` hay khóa viewport zoom.

### 1.2. Lightbox chuyển sang native `<dialog>` có focus management, khóa cuộn & không tràn ở `320px` / native zoom `200%`
- **Lỗi trước khi sửa**:
  - Lightbox cũ dùng `<div className="fixed inset-0 ...">` thường: không có ngữ nghĩa modal (`modal = false`), không giữ focus trong dialog khi nhấn `Tab`, không khóa `document.body.style.overflow`, không trả focus về nút mở khi đóng.
  - Khung ảnh phóng to dùng `w-[82vw] sm:w-[660px] md:w-[760px]` cộng thêm 2 nút mũi tên hai bên (`mr-3 w-11` và `ml-3 w-11`), làm tổng chiều rộng vượt quá viewport ở `320px` và ở `1440×900` native zoom `200%` (`innerWidth = 708px`), đẩy 2 nút mũi tên tràn ra ngoài màn hình.
- **Cách sửa (`ROUND1A` + `ROUND1B`)**:
  - Chuyển sang phần tử `<dialog ref={dialogRef} aria-modal="true" ...>` mở bằng `node.showModal()` trong `useLayoutEffect`.
  - Đặt `autoFocus` trực tiếp trên nút đầu tiên trong `<dialog>` (`button[aria-label="Đóng ảnh phóng to"]`), bỏ `closeButtonRef` và lệnh `.focus()` thủ công dư thừa vì `showModal()` tự động focus phần tử đầu tiên/có `autoFocus`.
  - Lưu `previousOverflow = document.body.style.overflow` trước khi đặt `'hidden'` và khôi phục nguyên trạng trong cleanup cùng với việc trả focus về `opener` (`zoomButtonRef.current`).
  - Hỗ trợ đóng bằng `Escape` (`onCancel` / `onClose`) và click vào vùng nền (`backdrop`), hỗ trợ phím `ArrowLeft` / `ArrowRight` trên `<dialog>` mà không đăng ký listener `window` trùng lặp.
  - Bố cục hàng chứa khung ảnh và 2 nút điều hướng: `flex w-full max-w-[880px] items-center justify-center gap-1.5 sm:gap-3` với khung ảnh `min-w-0 flex-1 max-w-[760px]` và chiều cao `h-[min(58dvh,calc(100dvh-9rem))] sm:h-[min(68dvh,calc(100dvh-9rem))] max-h-[640px]`. Ở `320×568` (`prevRect: left=8..48`, `stageRect: left=54..266`, `nextRect: left=272..312`) và ở `1440×900` native zoom `200%` (`innerWidth = 708`, `prevRect: left=16..60`, `stageRect: left=72..636`, `nextRect: left=648..692`), cả khung ảnh và 2 mũi tên đều nằm trọn trong viewport (`dialogOverflowX = 0`, `dialogOverflowY = 0`, `docOverflow = 0`). Giữ nguyên caption và dải thumbnail.

### 1.3. Cuộn dải thumbnail ngang bằng `rail.scrollBy` thay cho `scrollIntoView`
- **Lỗi trước khi sửa**:
  - `useEffect` gọi `btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })` ngay khi mount và mỗi lần đổi ảnh, có thể làm cuộn cả trang (`window`/ancestor) và trong React StrictMode replay hiệu ứng mount vẫn kích hoạt kể cả khi dùng `hasMountedRef`.
- **Cách sửa (`ROUND1B`)**:
  - Bỏ hoàn toàn `hasMountedRef` và `scrollIntoView`.
  - Trong `useEffect([safeActiveIndex])`, đo `thumb.getBoundingClientRect()` so với `rail = thumb.parentElement` (`rail.getBoundingClientRect()`). Chỉ khi thumbnail đang chọn nằm ngoài biên ngang nhìn thấy của `rail` (`thumbRect.left < railRect.left` hoặc `thumbRect.right > railRect.right`) mới gọi `rail.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' })`. Nếu đã nằm trong vùng nhìn thấy (`delta === 0`, bao gồm lúc mount ảnh đầu tiên) thì không làm gì; tuyệt đối không tác động lên cuộn dọc của trang.

### 1.4. Tối ưu tải ảnh thumbnail (`loading="lazy"`, `decoding="async"`)
- Giữ nguyên ảnh chính (`activeImg`) tải eager để bảo toàn LCP trên PDP.
- Thêm `loading="lazy"` và `decoding="async"` cho các thẻ `<img>` trong dải thumbnail chính (dòng `327-328`) và dải thumbnail trong lightbox (dòng `454-455`).

---

## 2. Kết quả kiểm tra Lệnh, Browser & Giới hạn bằng chứng

### 2.1. ESLint & TypeScript (`ROUND1B`)
- **Lệnh**:
  ```powershell
  npx eslint src/components/product/ProductGallery.tsx; npx tsc --noEmit
  ```
- **Kết quả**:
  - `npx eslint src/components/product/ProductGallery.tsx`: Exit code `0` (`0 errors`, `4 warnings` `@next/next/no-img-element` có sẵn trên các thẻ `<img>`).
  - `npx tsc --noEmit`: Exit code `0` (`0 errors`).

### 2.2. Ghi nhận trung thực về Harness kiểm tra trình duyệt (`ROUND1A` vs Kiểm tra độc lập của Codex)
- **Harness của Agent (`.wrangler/ui-overnight-20261107/verify-round1a-gallery.mjs` → `.wrangler/ui-overnight-20261107/round1a/results.json`)**:
  - **Trạng thái**: **FAILED ở bước chuỗi sự kiện cảm ứng trên fixture** (Không tính là PASS cho phần swipe).
  - **Nguyên nhân**: Trong script thử nghiệm của agent, việc gọi đồng bộ `.click()` ngay sau `dispatchTouchEvent` và đo DOM trong cùng lượt đánh giá mà không chờ React flush trạng thái làm mở `<dialog>` sớm và làm hỏng các bước touch kế tiếp trong cùng chuỗi, dẫn đến `afterHorizontalSwipe.activeIndex = 0` và `bodyOverflowWhileOpen = 'clip'` trong `round1a/results.json`. Theo chỉ đạo của Codex, không chạy lại hoặc viết lại harness 700 dòng này.
  - Các số đo hình học khung `<dialog>` trong `round1a/results.json` (trên isolated component fixture) xác nhận ở `320×568` (`prevRect: 8..48`, `stageRect: 54..266`, `nextRect: 272..312`, `dialogOverflowX320: 0`) và ở `1440×900` zoom `200%` (`innerWidth: 708`, `prevRect: 16..60`, `stageRect: 72..636`, `nextRect: 648..692`, `dialogOverflowX: 0`) không tràn.
- **Kiểm tra độc lập của Codex (`.wrangler/ui-overnight-20261107/CODEX-LIVE-REVIEW.md`)**:
  - Trên storefront thật (`gallery-after-patient/results.json`): `modal = true`, `locked = true`, `Escape` đóng modal và trả focus về nút mở, không có lỗi JS/API.
  - Trên component thực tế với chuỗi raw CDP touch input của Codex: vuốt ngang chuyển ảnh `0 -> 1`, vuốt chéo giữ nguyên `1`, vuốt ngang với `prefers-reduced-motion: reduce` chuyển `1 -> 2`, và click ngay sau khi vuốt bị chặn đúng thiết kế.

### 2.3. Giới hạn bằng chứng
- Ảnh chụp và kết quả trên fixture cô lập chỉ kiểm chứng logic và bố cục cấp component, **không** tự chứng minh tích hợp toàn trang hoặc hành vi Safari/iOS/Android vật lý.
- Chưa chạy full production build (`npm run build:cloudflare`) ở vòng này theo đúng yêu cầu hoãn build cuối tới vòng tổng hợp.
- Chưa tuyên bố hoàn tất toàn bộ `ROUND 1` (các hạng mục còn lại của Vòng 1 sẽ theo điều phối tiếp theo của Codex).

---

## 3. Chi tiết thực hiện `ROUND2` (`ProductTabs.tsx` & `CustomerGallery.tsx`)

### 3.1. Phạm vi file và thay đổi mã nguồn (`+11 / -8` dòng, không reformat)
1. **`src/components/home/ProductTabs.tsx` (`+8 / -4` dòng trong `ProductCarousel`)**:
   - **Bước cuộn thực tế (`getStep`) cho cả `move()` thủ công và `autoplay`**:
     - Thay giá trị cứng `+ 12` (lệch với `gap-2.5` = `10px` trên mobile) bằng helper nội bộ:
       ```tsx
       const getStep = (el: HTMLElement) => (el.firstElementChild?.getBoundingClientRect().width || 0) + (parseFloat(getComputedStyle(el).columnGap) || 0);
       ```
     - Dùng `getStep(el)` trong cả `move(direction)` (`el.scrollBy({ left: direction * getStep(el), behavior })`) và `setInterval` tự cuộn (`el.scrollLeft + getStep(el)`). Giữ nguyên toàn bộ cơ chế `autoplay`, tạm dừng khi hover/focus/touch/tab ẩn, `prefers-reduced-motion`, danh sách tab/link và snap.
   - **Bailout state `bounds` khi `start`/`end` không đổi**:
     - Trong `useEffect([products])`, cập nhật `update`:
       ```tsx
       const update = () => {
         const start = el.scrollLeft <= 1, end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
         setBounds(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
       };
       ```
     - Tránh tạo object mới và re-render toàn bộ rail ở mỗi sự kiện `scroll` thụ động (`{ passive: true }`) khi trạng thái đầu/cuối không đổi, vẫn cập nhật chính xác ở hai biên, khi `ResizeObserver` kích hoạt hoặc khi đổi danh sách `products`.
   - **Độ rộng thẻ `ProductCarousel` mặc định (`oneAtATime = false`) dưới `480px`**:
     - Chuyển nhánh mặc định từ `'auto-cols-[calc((100%-10px)/2)]'` sang `'auto-cols-[85%] min-[480px]:auto-cols-[calc((100%-10px)/2)]'`.
     - Giữ nguyên hoàn toàn nhánh `oneAtATime = true` (`'auto-cols-[78%] min-[420px]:auto-cols-[calc((100%-10px)/2)]'`) của `FLASHSALE` và giữ nguyên bố cục từ `480px` trở lên (`2` cột ở `480px+`, `md:auto-cols-[calc((100%-24px)/3)]`, `lg:auto-cols-[calc((100%-48px)/5)]`), không đụng vào catalog grid hay `ProductCard.tsx`.

2. **`src/components/home/CustomerGallery.tsx` (`+3 / -4` dòng)**:
   - **Bailout state `bounds` khi `start`/`end` không đổi**:
     - Trong `useEffect([images])`, cập nhật `update`:
       ```tsx
       const update = () => {
         const start = el.scrollLeft <= 1;
         const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
         setBounds((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
       };
       ```
     - Giữ nguyên listener `{ passive: true }`, `ResizeObserver`, hộp thoại `<dialog>` và giao diện.

### 3.2. Kết quả kiểm tra Lệnh (`ROUND2`)
- **Lệnh**:
  ```powershell
  npx eslint src/components/home/ProductTabs.tsx src/components/home/CustomerGallery.tsx; npx tsc --noEmit
  ```
- **Kết quả**:
  - `npx eslint src/components/home/ProductTabs.tsx src/components/home/CustomerGallery.tsx`: Exit code `0` (`0 errors`, `0 warnings`).
  - `npx tsc --noEmit`: Exit code `0` (`0 errors`).

### 3.3. Bằng chứng Baseline trước khi sửa của Codex & Giới hạn xác thực `ROUND2`
- **Bằng chứng trình duyệt thực tế trước khi sửa (do Codex thu thập tại `.wrangler/ui-overnight-20261107/rail-before-direct/results.json`, `320-rail.png`, `390-rail.png`)**:
  - Rail mặc định `Sản phẩm Laptop mới về` (`oneAtATime = false` nằm trong tab panel có padding):
    - Ở viewport `320×844`: `rail.clientWidth = 260px`, `cardWidth = 121px`, `columnGap = 10px`, `scrollWidth = 1963px` — thẻ quá hẹp (`121px`), tên sản phẩm bị cắt thành `[Mới 100%] MacBook...`, badge tình trạng bị cắt thành `Mới 1`, các chip thông số CPU/RAM/SSD/màn hình bị cắt dấu `...`.
    - Ở viewport `390×844`: `rail.clientWidth = 330px`, `cardWidth = 156px`, `columnGap = 10px`, `scrollWidth = 2488px`.
  - Rail `Sản phẩm FLASHSALE` (`oneAtATime = true`, `.wrangler/ui-overnight-20261107/rail-before-patient/results.json`) vốn đã có `cardWidth = 201.23px` (ở `320px`) và `255.83px` (ở `390px`), được giữ nguyên không thay đổi.
- **Trạng thái kiểm tra trình duyệt sau khi sửa (`AFTER`)**:
  - **Đã được Codex chấp nhận trong phạm vi actual-component fixture**: raw touch ở `320`/`390` và keyboard ở `768`/`1440` `PASS`; lượt kiểm tra live storefront sau sửa bị timeout nên không tuyên bố kết luận production.
  - Chưa chạy full build theo đúng giới hạn của vòng hiện tại.

---

## 4. Chi tiết thực hiện `ROUND3` (`ProductQuickCheckoutModal.tsx`)

### 4.1. Bằng chứng Baseline trước khi sửa của Codex (`.wrangler/ui-overnight-20261107/checkout-before-fixed-harness/results.json`)
- Trên actual-component fixture có quote giả lập và tên sản phẩm dài:
  - Ở `320px`: `dialog.width = 296px`, `inner.width = 294px`, nhưng `inner.scrollWidth = 548px` và `fieldset.width = 532px` (do `<fieldset>` thiếu `min-w-0` và khối recap thiếu `flex-1`). Nút đóng bị ép nhỏ còn `23.28×32px`; các ô `input` cao `38px` (`< 44px`).
  - Ở `390px`: `dialog.width = 366px`, `inner.width = 364px`, nhưng `inner.scrollWidth = 548px`, `fieldset.width = 532px`, nút đóng `29.5×32px`.
  - Ở `768px` & `1440px`: `dialog.width = 512px`, `inner.width = 510px`, nhưng `inner.scrollWidth = 613px`, `fieldset.width = 593px` (vượt chiều rộng khả dụng `470px`), nút đóng `32×32px`.

### 4.2. Phạm vi file và thay đổi mã nguồn (`+18 / -18` dòng trong `src/components/product/ProductQuickCheckoutModal.tsx`, chỉ sửa trình bày)
1. **Header & Nút đóng (`44×44px`, không bị bóp méo)**:
   - Thêm `gap-2` cho khung header, `min-w-0` cho khối tiêu đề/mô tả, và đổi nút đóng từ `h-8 w-8` sang `h-11 w-11 shrink-0` (`44×44px`).
2. **Khắc phục tràn ngang `<fieldset>` và hộp thông tin sản phẩm (Recap)**:
   - Thêm `min-w-0` trực tiếp vào `<fieldset disabled={locked} className="min-w-0 space-y-4 disabled:opacity-70">` (không dùng cách che `overflow-x-hidden` giả tạo).
   - Đổi khối chữ trong Product Recap Box từ `min-w-0` sang `flex-1 min-w-0` để `truncate` hoạt động trong giới hạn flex container.
   - Cho phép hàng tổng thanh toán dự kiến xuống dòng an toàn với `flex flex-wrap items-center justify-between gap-2 text-xs`.
   - Thêm `break-words` cho danh sách dòng báo giá (`<ul>` / `<li>`) và dòng tóm tắt tiền hàng/phí giao hàng (`<p>`) để tên sản phẩm dài tự ngắt dòng.
3. **Lưới chọn Hình thức nhận máy & Phương thức thanh toán dưới `480px`**:
   - Hình thức nhận máy: đổi `grid-cols-2` sang `grid-cols-1 min-[480px]:grid-cols-2`, thêm `min-h-11` cho 2 nút lựa chọn và `shrink-0` cho vòng tròn radio.
   - Phương thức thanh toán: đổi `grid-cols-3` sang `grid-cols-1 min-[480px]:grid-cols-3`, giữ nguyên bố cục gọn 3 cột từ `480px` trở lên (bao gồm tablet/desktop).
4. **Chiều cao tối thiểu `44px` (`min-h-11`) cho các trường nhập liệu**:
   - Thêm `min-h-11` cho `#quick-customer-name`, `#quick-customer-phone`, `#quick-address` và `<select id="quick-showroom">`. Giữ nguyên quy tắc font-size `16px` trên mobile trong CSS toàn cục.
   - Giữ nguyên tuyệt đối toàn bộ logic `<dialog>`, `Escape`, focus, khóa cuộn `body`, báo giá (`quote`), `pending`, `Idempotency-Key`, `sessionStorage`, `VietQrPaymentCard`, `Turnstile` và xử lý gửi đơn.

### 4.3. Kết quả kiểm tra Lệnh (`ROUND3`) & Giới hạn xác thực
- **Lệnh**:
  ```powershell
  npx eslint src/components/product/ProductQuickCheckoutModal.tsx; npx tsc --noEmit
  ```
- **Kết quả**:
  - `npx eslint src/components/product/ProductQuickCheckoutModal.tsx`: Exit code `0` (`0 errors`, `0 warnings`).
  - `npx tsc --noEmit`: Exit code `0` (`0 errors`).
- **Trạng thái kiểm tra trình duyệt sau khi sửa (`AFTER`)**:
  - **Đã được Codex chấp nhận trong phạm vi actual-component fixture**: `checkout-after` và `checkout-zoom200` `PASS`; không tuyên bố kiểm thử gửi đơn hay thanh toán trên live storefront.
  - Chưa chạy full build theo đúng giới hạn của vòng hiện tại.

---

## 5. Chi tiết thực hiện `ROUND4` (`SliderSection.tsx`)

### 5.1. Bằng chứng Baseline trước khi sửa của Codex (`.wrangler/ui-overnight-20261107/slider-before/results.json`)
- Ở viewport `390×844` trên actual-component fixture:
  - Chuỗi `touchStart` + `touchMove` ngang `-100px` + `touchCancel` đã làm đổi từ `Slide 0` sang `Slide 1` do `onPointerCancel` và `onLostPointerCapture` cùng gọi `handlePointerEnd` (hàm thực thi chuyển slide).
  - Thuộc tính `style={{ touchAction: 'pan-y' }}` vô hiệu hóa `pinch-zoom` trên vùng slider.
  - Vuốt ngang bình thường và cuộn dọc `85px` hoạt động đúng, cần được bảo toàn.

### 5.2. Phạm vi file và thay đổi mã nguồn (`+45 / -41` dòng trong `src/components/home/SliderSection.tsx`)
1. **Tách biệt hủy cử chỉ (`handlePointerCancel` / `resetGesture`) khỏi kết thúc hợp lệ (`handlePointerEnd`)**:
   - Tạo helper nội bộ `resetGesture(target, pointerId)`:
     - Xóa toàn bộ ref cử chỉ (`dragStartX.current = null`, `dragStartY.current = null`, `dragDistance.current = 0`, `isHorizontalDrag.current = false`, `activePointerId.current = null`) và đặt `setIsDragging(false)` **trước khi** gọi `target.releasePointerCapture(pointerId)`.
     - Giữ cơ chế giải phóng `suppressClick.current = false` sau `150ms` nếu cử chỉ đã phát sinh kéo ngang.
   - `handlePointerCancel`: chỉ kiểm tra `activePointerId.current !== null && e.pointerId === activePointerId.current` rồi gọi `resetGesture(e.currentTarget, e.pointerId)` — tuyệt đối không chuyển slide khi nhận `onPointerCancel` hoặc `onLostPointerCapture`.
   - `handlePointerEnd` (chỉ gắn cho `onPointerUp`):
     - Đọc `distance = dragDistance.current` và `shouldAdvance = isHorizontalDrag.current && Math.abs(distance) > 40` trước khi gọi `resetGesture(e.currentTarget, e.pointerId)`.
     - Nhờ xóa `activePointerId.current = null` trước khi `releasePointerCapture`, sự kiện `lostpointercapture` đồng bộ/bất đồng bộ không thể gây commit kép hoặc xóa mất khoảng cách kéo trước khi xét điều kiện chuyển slide.
2. **Chặn pointer phụ (`!e.isPrimary`) và pointer không khớp `activePointerId`**:
   - `handlePointerDown`: bỏ qua nếu `!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)`.
   - `handlePointerMove` & `handlePointerEnd`: bỏ qua nếu `!e.isPrimary || activePointerId.current !== e.pointerId || dragStartX.current === null`.
3. **Khôi phục `pinch-zoom` trên vùng cảm ứng**:
   - Đổi `style={{ touchAction: 'pan-y' }}` sang `style={{ touchAction: 'pan-y pinch-zoom' }}`.
   - Giữ nguyên hoàn toàn hành vi `autoplay`, `prefers-reduced-motion`, điều hướng phím `ArrowLeft`/`ArrowRight`, chặn click tổng hợp sau kéo và mở link bình thường.

### 5.3. Kết quả kiểm tra Lệnh (`ROUND4`) & Giới hạn xác thực
- **Lệnh**:
  ```powershell
  npx eslint src/components/home/SliderSection.tsx
  ```
- **Kết quả**:
  - `npx eslint src/components/home/SliderSection.tsx`: Exit code `0` (`0 errors`, `0 warnings`).
  - Chưa chạy lại `tsc` ở bước này theo đúng chỉ đạo (kiểm tra tổng hợp thực hiện sau `ROUND4`).
- **Trạng thái kiểm tra trình duyệt sau khi sửa (`AFTER`)**:
  - **Đã được Codex chấp nhận độc lập (`slider-after-accepted` fixture)**: `touchCancel` giữ nguyên slide (không chuyển nhầm), vuốt ngang/cuộn dọc/phím mũi tên/`prefers-reduced-motion` hoạt động đúng, chặn click tổng hợp ngay sau khi kéo, cho phép click mở link bình thường, bỏ qua pointer phụ (`non-primary`), không có lỗi JS/API.

---

## 6. Kết quả Xác thực Cuối cùng `ROUND5` (ESLint, TypeScript, Build & Local Production Preview)

### 6.1. Kết quả kiểm tra Lệnh trên 5 file đã chỉnh sửa
1. **Scoped ESLint (5 file đã chỉnh sửa)**:
   - **Lệnh**:
     ```powershell
     npx eslint src/components/product/ProductGallery.tsx src/components/product/ProductQuickCheckoutModal.tsx src/components/home/ProductTabs.tsx src/components/home/CustomerGallery.tsx src/components/home/SliderSection.tsx
     ```
   - **Kết quả**: Exit code `0` (`0 errors`, `4 warnings`).
   - **Chi tiết cảnh báo**: 4 cảnh báo `@next/next/no-img-element` có sẵn trong `src/components/product/ProductGallery.tsx` tại dòng `274:11`, `324:17`, `404:17`, `451:19`. Các file `ProductQuickCheckoutModal.tsx`, `ProductTabs.tsx`, `CustomerGallery.tsx`, `SliderSection.tsx` đạt `0 errors, 0 warnings`.
2. **TypeScript (`tsc`)**:
   - **Lệnh**:
     ```powershell
     npx tsc --noEmit
     ```
   - **Kết quả**: Exit code `0` (`0 errors`).
3. **Production Build (`npm run build:cloudflare` / `vite build`)**:
   - **Ghi nhận trung thực về tiến trình**: Lượt gọi `run_command` (`task-33`) của Agent bị ngắt ở bước `[1/5] analyze client references...` khi kết thúc lượt trả lời trước (không tính lượt bị ngắt đó là thành công và không có tiến trình cũ treo lại). Sau đó Codex đã chạy trực tiếp `npm run build:cloudflare` bằng công cụ của reviewer (không sửa mã nguồn sản phẩm) và xác nhận hoàn tất với **`exitCode: 0`** tại `.wrangler/ui-overnight-20261107/build-exit.json` và log đầy đủ tại `.wrangler/ui-overnight-20261107/build-cloudflare.log`.
   - **Cảnh báo trong quá trình build**: Ghi nhận các cảnh báo bundler `PLUGIN_TIMINGS` và `INEFFECTIVE_DYNAMIC_IMPORT` phát sinh từ gói `vinext` đã cài đặt (phân loại ảnh hưởng theo từng route chưa xác định trong phạm vi vòng này).

### 6.2. Xác thực của Codex trên Local Production Preview (`127.0.0.1:3002`, độc lập với dev server PID `17148` trên cổng `3001`)
- **`rail-production-preview/results.json`**: `PASS` trên storefront thực tế ở `320px`/`390px` (raw touch) và `768px`/`1440px` (bàn phím), ảnh sản phẩm thực tải thành công, không có lỗi JS/API.
- **`gallery-production-preview/results.json`**: `PASS` trên PDP thực tế cho `<dialog>` modal, quản lý focus, khóa cuộn `body` và phím `Escape`, không có lỗi JS/API.
- **Phạm vi bằng chứng**: Kết quả trên local production preview (`127.0.0.1:3002`) giải tỏa giới hạn timeout của dev server trước đó đối với nhóm tính năng đã kiểm tra, nhưng vẫn là kiểm thử cục bộ có giới hạn — **không** tuyên bố chấp nhận toàn bộ website, **không** thực hiện giao dịch đặt hàng/thanh toán thật, và **không** tuyên bố chỉ số Core Web Vitals thực địa (production field CWV).

---

## 7. Phân tích Hiệu năng Read-Only & Đính chính Giới hạn Quy kết (`ROUND6 CORRECTED`)

### 7.1. Số liệu Đo đạc Lab trên Local Production Preview (`.wrangler/ui-overnight-20261107/performance-production-preview/results.json`)
- **Điều kiện đo**: 6 mẫu đơn lẻ (single-run lab diagnostic) ở viewport `390×844`, CPU `1x` (unthrottled), trình duyệt cold/warm cache (Worker và D1 cục bộ tại `127.0.0.1:3002` đã warm sẵn), `resourceBufferFull = false`, `errors = []`, `apiErrors = []`.

| Route | Chế độ Cache Trình duyệt | TTFB (`ms`) | FCP (`ms`) | LCP (`ms`) | Phần tử LCP | Document Bytes (`navigationDecodedBytes`) | Subresource Count (`requestCount`, không gồm document) | Subresource Transfer (`resourceTransferBytes`, không gồm document & cross-origin thiếu TAO) | CLS | Long Tasks (`ms`) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `/` (Trang chủ) | Cold | `1885.3` | `2456` | `3044` | `IMG` (`/_next/image?url=%2Fbrand%2Fcitilap-hero.webp&w=640&q=75`) | `1,195,969` (~1.20 MB) | `113` | `2,656,383` | `0` | `178`, `334`, `66`, `266` |
| `/` (Trang chủ) | Warm | `1514.8` | `1612` | `2368` | `IMG` (`/_next/image?url=%2Fbrand%2Fcitilap-hero.webp&w=640&q=75`) | `1,195,969` (~1.20 MB) | `112` | `1,196,929` | `0` | `126`, `293` |
| `/phan-loai` | Cold | `152.7` | `516` | `516` | `P` | `206,704` (~202 KB) | `82` | `2,183,060` | `0` | `131` |
| `/phan-loai` | Warm | `176.2` | `308` | `308` | `P` | `206,704` (~202 KB) | `80` | `715,974` | `0` | Không có |
| `/laptop/ref-tgs-7172?sku=LOCAL-7172` | Cold | `384.2` | `896` | `2308` | `IMG` (`/api/library/c0da80d1-a3ed-4b35-aa52-769040efbeb8`, `2560×2553`) | `304,119` (~297 KB) | `97` | `1,861,892` | `0` | `353`, `56` |
| `/laptop/ref-tgs-7172?sku=LOCAL-7172` | Warm | `387.7` | `716` | `716` | `IMG` (`/api/library/c0da80d1-a3ed-4b35-aa52-769040efbeb8`, `2560×2553`) | `304,119` (~297 KB) | `96` | `269,853` | `0` | `77` |

- **Đính chính & Giới hạn diễn giải bắt buộc (`ROUND6` Corrections)**:
  1. **Giới hạn của `ResourceTiming`**: `requestCount` lấy từ `performance.getEntriesByType('resource')` **không bao gồm** request tài liệu gốc (`document` navigation) nên không phải tổng số request toàn trang; tương tự, `resourceTransferBytes` **không bao gồm** dung lượng tài liệu gốc (`navigationEncodedBytes`) và **không bao gồm** các tài nguyên cross-origin không trả header `Timing-Allow-Origin` (`TAO`).
  2. **Không quy kết nhân quả trực tiếp từ số đo toàn trang (Whole-page timing)**: Số đo tổng thể của trang (`ttfb`, `navigationDecodedBytes`, `longTasks`) **không tự chứng minh** tỷ trọng thời gian thuộc về một truy vấn D1 cụ thể hay thuộc về việc serialize các tab. Mọi nhận định liên kết giữa cấu trúc truy vấn/serialize với `TTFB` hoặc `longTasks` đều là **giả thuyết (hypotheses)** cần được xác minh bằng trace hoặc đo thời gian từng truy vấn (per-query/per-stage timing). Tương tự, khoảng cách Cold/Warm LCP trên PDP (`2308ms` vs `716ms`) gợi ý tác động của việc tải/cache tài nguyên, nhưng không chứng minh quy kết tuyệt đối và **không đưa ra dự báo số học** về LCP sau khi sửa.
  3. **Bác bỏ việc tự ý cắt giảm số lượng sản phẩm trong Tab đã xuất bản**: Việc âm thầm giảm giới hạn số sản phẩm mỗi tab (`tabLimit`) làm thay đổi hợp đồng dữ liệu CMS đã được biên tập và xuất bản (`published CMS contract`), do đó **bị loại bỏ** khỏi danh sách giải pháp tối ưu hóa drop-in.
  4. **Không tự ý bỏ qua `sec-hot-sale` trong hàm dùng chung `resolveSectionsForStorefront`**: Hàm [`resolveSectionsForStorefront`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts#L492-L634) còn phục vụ các trang Landing Page công khai (`getPublicLandingPage`) và chế độ xem trước Admin (`getPreviewLandingPage`), nơi `sec-hot-sale` không nhất thiết bị thay thế bởi `FlashSaleSection`. Tuyệt đối không bỏ qua việc resolve `sec-hot-sale` chỉ dựa trên `section.id === 'sec-hot-sale'` trừ khi caller truyền cờ tường minh xác nhận việc thay thế trên trang chủ. (Không thực hiện thay đổi backend nào trong vòng này.)
  5. **Đính chính về `loading="auto"` và `fetchPriority` trên ảnh chính PDP**: Thẻ `<img>` gốc có thuộc tính `loading: "auto"` vốn đã tải **eager mặc định** (không phải bị thiếu `loading="eager"`), và việc chỉ gắn thêm `fetchPriority="high"` tự nó **không giải quyết** được vấn đề băng thông của file ảnh nguồn kích thước quá lớn (`2560×2553` hiển thị trong khung cao `215px` ở viewport `390px`).
  6. **Không đề xuất bọc `React.cache()` trùng lặp**: `getPublishedHomepage`, `getPublishedNavigation`, `getStorefrontSettings` trong [`src/server/services/storefront-cms.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/storefront-cms.service.ts#L167-L205) đã được bọc `cache()`.

---

### 7.2. Các Phát hiện & Giả thuyết Đã Hiệu chỉnh

1. **Vấn đề Băng thông Ảnh Chính PDP Đã Xác nhận (Được chọn thực thi trong `ROUND7`)**:
   - **Vị trí**: [`src/components/product/ProductGallery.tsx` (dòng `273–280`)](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/product/ProductGallery.tsx#L273-L280).
   - **Bằng chứng**: Trong `performance-production-preview/results.json` (dòng `320–359`), phần tử LCP trên PDP (`/laptop/ref-tgs-7172?sku=LOCAL-7172`) là thẻ `<img>` tải trực tiếp `/api/library/c0da80d1-a3ed-4b35-aa52-769040efbeb8` ở kích thước gốc **`2560×2553`** cho khung hiển thị `w-full max-w-[460px]` cao `215px` (mobile `390×844`) / `330px` (`sm+`). Trong khi đó, `ProductCard` trên cùng bản local production preview đã sử dụng bộ tối ưu hóa `next/image` (`/_next/image`) thành công.
2. **Giả thuyết Server/D1 trên Trang chủ (Cần đo per-query timing trước khi can thiệp backend)**:
   - **Vị trí**: [`src/server/services/site-builder.service.ts` (dòng `513–593`)](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts#L513-L593) và [`src/server/services/catalog.service.ts` (dòng `874–893`)](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts#L874-L893).
   - **Bằng chứng vs. Giả thuyết**:
     - *Bằng chứng*: TTFB toàn trang của `/` là `1885.3ms` (cold) / `1514.8ms` (warm) và `resolveSectionsForStorefront` gọi `client.productStudio.findMany({ select: { productId: true, published: true } })` cùng các truy vấn `defaultInclude`.
     - *Giả thuyết*: Chi phí truy vấn và parse JSON trong `resolveSectionsForStorefront` đóng góp vào TTFB của `/`; cần gắn log/trace đo thời gian từng bước truy vấn và chỉ tối ưu hóa khi có cờ ngữ cảnh rõ ràng (không làm ảnh hưởng `getPublicLandingPage` / `getPreviewLandingPage` hoặc hợp đồng CMS).
3. **Giả thuyết Kích thước Document/RSC Payload trên Trang chủ (Cần profiling trước khi can thiệp)**:
   - **Vị trí**: [`src/components/builder/BlockRenderer.tsx` (dòng `307`)](file:///C:/Users/Admin/Desktop/citilap-web2/src/components/builder/BlockRenderer.tsx#L307) và [`src/server/services/catalog.service.ts` (dòng `832–871`)](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts#L832-L871).
   - **Bằng chứng vs. Giả thuyết**:
     - *Bằng chứng*: `navigationDecodedBytes` của `/` là `1,195,969` bytes (`~1.20 MB`).
     - *Giả thuyết*: Các trường trùng lặp trong DTO `HomepageProduct` khi serialize qua ranh giới `'use client'` góp phần làm tăng kích thước tài liệu và thời gian xử lý main thread; tuyệt đối không được cắt bớt số lượng sản phẩm/tab đã xuất bản của CMS.

---

## 8. Chi tiết thực hiện `ROUND7` — Tối ưu hóa Băng thông Ảnh Chính PDP (`src/components/product/ProductGallery.tsx`)

### 8.1. Phạm vi file và thay đổi mã nguồn (`+20 / -6` dòng trong `src/components/product/ProductGallery.tsx`)
- **Vấn đề thực tế**: Ảnh chính (LCP) trên PDP có đường dẫn nội bộ `/api/library/...` đang được render trực tiếp qua thẻ `<img>` ở độ phân giải gốc (`2560×2553`) bên trong khung hiển thị `w-full max-w-[460px]` cao `215px` (mobile `390×844`) / `330px` (`sm+`).
- **Cách sửa tối thiểu**:
  - Import `Image` từ `next/image`.
  - Thêm `relative` vào khung chứa ảnh chính (`className="relative flex h-[215px] sm:h-[330px] w-full max-w-[460px] items-center justify-center"` tại dòng `274`).
  - Chỉ khi `activeImg.url.startsWith('/api/library/')`, sử dụng `<Image>` từ `next/image` với:
    - `src={activeImg.url}` (giữ nguyên URL gốc, không viết lại query string thủ công).
    - `alt={activeImg.alt || productName}`
    - `fill`
    - `priority` và `fetchPriority="high"` (trong runtime `vinext/dist/shims/image.js`, `priority` kích hoạt `shouldPreload = true`, `loading = "eager"` và `fetchPriority = "high"`).
    - `sizes="(max-width: 640px) calc(100vw - 32px), 460px"`
    - `style={{ objectFit: 'contain' }}` và `className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"` (đảm bảo ghi đè `objectFit: "cover"` mặc định trong `getFillStyle` của `vinext`).
  - Đối với mọi nguồn ảnh khác (đường dẫn tương đối ngoài `/api/library/`, URL ngoài, data URI, placeholder `/images/placeholder-laptop.svg`), giữ nguyên nhánh fallback `<img>` như cũ.
  - Giữ nguyên hoàn toàn URL gốc trong `<dialog>` lightbox / phóng to (`activeImg.url` dòng `418`) và dải thumbnail, không thay đổi bất kỳ hành vi cử chỉ hay trạng thái nào của gallery.

### 8.2. Kết quả kiểm tra Lệnh (`ROUND7`) & Giới hạn xác thực
- **Lệnh**:
  ```powershell
  npx eslint src/components/product/ProductGallery.tsx
  ```
- **Kết quả**:
  - Exit code `0` (`0 errors`, `4 warnings` `@next/next/no-img-element` trên nhánh fallback `<img>` dòng `287` và 3 thẻ `<img>` thumbnail/lightbox dòng `338, 418, 465`).
  - Không chạy lại `tsc` hay `npm run build:cloudflare` trong ACP theo đúng chỉ đạo của Codex.
- **Trạng thái kiểm tra trình duyệt & hiệu năng sau khi sửa (`AFTER`)**:
  - **Đang chờ Codex xác thực độc lập (`Pending Codex`)**: Codex sẽ trực tiếp build lại bản production, kiểm tra request `/_next/image`, chụp ảnh màn hình khung chính + lightbox, chạy bộ kiểm thử gallery fixture và đo lại hiệu năng PDP thực tế. Agent không tự tuyên bố kết quả trình duyệt.

## Codex final receipt - ROUND7 accepted

Reviewer completed final TypeScript and Cloudflare build: both exit0. Gallery fallback fixture and native200% zoom PASS; actual production-preview main image640px and original lightbox2560px PASS. Measured image bytes322224 to19784; single-sample local LCP2308 to1068ms (not field CWV or controlled benchmark). Full independent evidence and remaining homepage performance tasks are in CODEX-OVERNIGHT-REVIEW-2026-11-07.md, ROUND7 final acceptance. No deploy or real transaction writes.

---

## 9. Chi tiết thực hiện `ROUND8` — Conditional `ProductStudio` Preload & Kiểm thử tích hợp `test-r07a-site-builder.mjs`

### 9.1. Phạm vi thực hiện chính xác (Exact Scope)
- **Mã nguồn sản phẩm đã sửa ở bước trước (giữ nguyên trong lượt tiếp nối này, không chỉnh sửa thêm)**:
  - [`src/server/services/site-builder.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/site-builder.service.ts): Trong `resolveSectionsForStorefront`, chỉ preload `client.productStudio.findMany({ select: { productId: true, published: true } })` khi có ít nhất một `product_grid` đang bật (`enabled !== false`) sử dụng rule chính (`sourceMode === 'rule'`) hoặc tab rule đang bật (`tab.enabled !== false && tab.sourceMode === 'rule'`) có `ruleCriteria.availability` khác `'all'` và không rỗng; nếu không có consumer nào cần lọc `availability` thì truyền `undefined` cho `preloadedStudios` (bỏ qua full-table scan `ProductStudio`), hoặc dùng chung đúng 1 lần preload cho mọi consumer trong cùng lệnh gọi.
  - [`src/server/services/catalog.service.ts`](file:///C:/Users/Admin/Desktop/citilap-web2/src/server/services/catalog.service.ts): Giữ nguyên ngữ nghĩa xuất bản, thứ tự sắp xếp, tính giá khuyến mãi (`PromotionCampaign`) và giữ nguyên `isFlashSale: false` khi dữ liệu gốc đặt `false`.
- **File kiểm thử chỉnh sửa trong lượt tiếp nối này**:
  - [`scripts/test-r07a-site-builder.mjs`](file:///C:/Users/Admin/Desktop/citilap-web2/scripts/test-r07a-site-builder.mjs):
    - Loại bỏ hoàn toàn `Proxy` bọc `DB.prepare` và biến đếm `studioFullScanSqlCount` bị lỗi (do Prisma D1 adapter không đi qua đường regex `DB.prepare` như giả định ban đầu).
    - Giữ nguyên spy trực tiếp trên `prismaClient.productStudio.findMany` và môi trường D1 cô lập trên Miniflare.
    - Rút gọn mã lặp bằng các fixture cơ sở (`makeCriteria`, `makeTab`, `makeGridSection`) nhưng giữ nguyên đầy đủ 7 kịch bản kiểm thử trong Test 10:
      1. Không có section sản phẩm (`banner`, `featured_categories`) → `studioFindManyCalls === 0`.
      2. `product_grid` bật với `availability: 'all'` hoặc bỏ trống (`omitted`) trên rule chính và các rule tab → `studioFindManyCalls === 0`, bảo toàn danh sách sản phẩm đã xuất bản (loại trừ `p-draft-laptop` và `p-studio-unpub`), thứ tự sắp xếp `price-asc` / `price-desc`, giá chiến dịch khuyến mãi thực tế (`price: 25990000`, `originalPrice: 30000000`, `oldPrice: 30000000`, `isOnSale: true`, `isFlashSale: false`, `discount: '-13%'`), chuẩn hóa `href` tab và đối chiếu `assert.deepEqual` với kết quả chạy cưỡng bức có preload `studios`.
      3. Rule chính bật với `AVAILABLE`, `PREORDER`, `CONTACT` → mỗi lần gọi preload đúng `1` lần (`studioFindManyCalls === 1`) và lọc chính xác từng nhóm sản phẩm.
      4. Rule chính `availability: 'all'` nhưng có rule tab đang bật yêu cầu `PREORDER` → preload đúng `1` lần (`studioFindManyCalls === 1`).
      5. Section bị tắt (`enabled: false`) và tab bị tắt (`enabled: false`) dù có `availability !== 'all'` → bị bỏ qua hoàn toàn (`studioFindManyCalls === 0`).
      6. Chế độ `manual` ở grid chính và tab (`sourceMode: 'manual'` hoặc tab mặc định không đặt `sourceMode`) có chứa `ruleCriteria.availability` dư thừa → bị bỏ qua (`studioFindManyCalls === 0`), vẫn loại trừ `p-studio-unpub` và giữ đúng giá khuyến mãi.
      7. Nhiều `product_grid` và nhiều rule tab kết hợp (`AVAILABLE`, `PREORDER`, `CONTACT`, `all`) trong cùng một lần gọi `resolveSectionsForStorefront` → dùng chung đúng `1` lần preload (`studioFindManyCalls === 1`).

### 9.2. Ghi nhận trung thực các lượt chạy thử nghiệm bị lỗi / gián đoạn trước đó (Failed Initial Test Attempts)
1. **Lượt thử đầu tiên trong phiên trước**: Test 10 thêm 511 dòng lặp lại kèm `Proxy` trên `DB.prepare` để đếm `studioFullScanSqlCount` qua regex SQL. Bộ đếm SQL này không bắt được truy vấn của Prisma D1 adapter (`0 !== 1`), và phiên làm việc bị ngắt kết nối mạng trước khi hoàn tất sửa test.
2. **Xác minh trung gian của Codex trước khi tiếp nối**: Codex đã chạy bản sao tạm thời chỉ bỏ các lệnh `assert` trên `studioFullScanSqlCount`: toàn bộ `12/12` bài kiểm tra tích hợp đều `PASS`, đồng thời chạy cùng bộ test đó với bản gốc `site-builder.before.ts` thì báo lỗi `1 !== 0` ở kịch bản không có consumer cần `availability`, chứng minh độ nhạy phát hiện hồi quy (regression sensitivity).

### 9.3. Kết quả thực thi cuối cùng (`node scripts/test-r07a-site-builder.mjs`)
- **Lệnh thực thi**:
  ```powershell
  node scripts/test-r07a-site-builder.mjs
  ```
- **Kết quả**: Hoàn tất đồng bộ với **`Exit code: 0`** — **`ALL R07A INTEGRATION TESTS PASSED: 12/12`**.
- **Trạng thái TypeScript, Build & Browser (do Codex đã xác minh)**:
  - `tsc` và `build` đều đạt `exit 0`; 6 mẫu đo trình duyệt không phát sinh lỗi (`0 errors`).
  - Không sửa thêm mã nguồn sản phẩm, không cài đặt dependency, không tạo migration, không ghi dữ liệu thật và không commit/push/deploy. Dừng tại đây để Codex nghiệm thu.

### Codex ROUND8 acceptance

Independent permanent regression rerun12/12 exit0 (round8/final-regression-exit.json), TypeScript/build exit0; bounded browser smoke no JS/API errors. Source guard accepted. Wording correction for9.1: sections retain original truthy enabled filter; main criteria consumer is sourceMode !== 'manual', including omitted legacy mode. Tab condition stays enabled !== false && sourceMode === 'rule'. Query-count evidence is real Prisma method invocation in isolated integration, not production SQL trace or latency attribution.
