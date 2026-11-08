# Kiểm tra độc lập storefront mobile — 06/11/2026

Trạng thái: MOBILE 1 được chấp nhận trong phạm vi bằng chứng dưới đây; MOBILE 2 đang được giao, MOBILE 3 chưa thực hiện. Antigravity sửa source; Codex giao việc, đọc diff và kiểm tra browser độc lập. Chưa nghiệm thu toàn bộ storefront.

## Bằng chứng đã kiểm tra

- Baseline `baseline/results.json`: 75 tổ hợp route/viewport, trang chủ320px tràn36px. Các ca còn lại không tràn toàn trang. Không suy ra mọi nội dung/interaction đều đạt từ số đo overflow.
- `menu-before/results.json`: chuột thật sau hydration, Tab/Escape ở320/390/430px xác nhận menu gốc thiếu focus vào drawer, giữ focus và trả focus.
- `mobile1-check2/results.json`: trang chủ `/`, danh mục `/phan-loai`, tìm kiếm `/search?q=thinkpad` qua5 kích thước320/390/430/768/1440:15 ca không tràn;3 ca menu đạt focus/Tab/Escape/return. Không lỗi JavaScript hoặc API đọc trong lượt này.
- `mobile1-zoom/results.json`:3 route trên ở native Chrome zoom200%; outerWidth1440, innerWidth708, DPR2, CSS zoom1, visualViewport.scale1. Không tràn. Không dùng thông số zoom từ script Antigravity để thay thế bằng chứng độc lập này.
- `mobile1-resize/results.json`: phát hiện lỗi hồi quy menu ẩn trên desktop nhưng vẫn modal và khóa cuộn. `mobile1-resize-fixed/results.json` sau sửa: đóng và mở khóa ở desktop, trở lại mobile mở lại được, Escape trả focus.
- `mobile1-codex-verify/results.json` do Antigravity chạy, Codex đọc script và kết quả: chọn ThinkPad P, áp dụng bộ lọc, reload, Back/Forward giữ đúng URL. Resize chiều cao mobile giữ menu mở. Route category dùng catalog mới không có nút legacy drawer: script bỏ qua ca resize filter đó, không được tính PASS.
- `mobile1-rail/390-rail-before.png`: card laptop chỉ123px ở390px; tên, tình trạng và cấu hình khó đọc. Chưa chấp nhận phần này. `mobile1-rail-input/results.json` kiểm tra lại sự kiện Enter có text: scrollLeft0→135; chuột bấm nút tiếp theo135→270. Lượt `mobile1-rail` trước đó thiếu text cho Enter, không xác nhận được bàn phím; không dùng nó làm bằng chứng điều hướng đạt.

## Check source và giới hạn

- `agent-diff.mjs` tái dựng source trước tác vụ từ edit receipts và đối chiếu SHA256 với snapshot ban đầu; diff riêng ở `agent-changes.diff`. Không gộp thay đổi có sẵn vào thành quả tác vụ.
- TypeScript đạt ở lượt trước. Build Cloudflare đạt trước vòng sửa resize; cần build cuối sau thay đổi tiếp theo.
- Lint bốn file drawer/card đạt exit0 với1 warning `badgeColor`. Lint toàn bộ file chạm vẫn lỗi ở `VideoReviews.tsx:141` và `SearchAutocomplete.tsx:81`. `lint-baseline-comparison.json` xác nhận cùng lỗi `react-hooks/set-state-in-effect` đã tồn tại trong source snapshot trước sửa. Báo cáo Antigravity nói chung “các file sửa đều đạt” là rộng hơn bằng chứng.
- Các đường dẫn bằng chứng nêu trên nằm dưới `.wrangler/storefront-mobile-20261106/`.
- Kiểm tra local; chưa chứng minh luồng giỏ có sản phẩm/checkout, ghi đơn, thanh toán, staging hoặc production. Không tạo đơn/liên hệ/thanh toán thật. Không commit/push/deploy/migrate/reset/stash/clean; giữ server local và phần việc đang có.

## Nghiệm thu rail bổ sung

- Antigravity đổi một nhánh CSS `ProductCarousel`: dưới480px dùng card85% chiều rộng rail thay cho hai card; từ480px trở lên giữ hai card, md3/lg5. Không đổi dữ liệu hay logic mua hàng.
- Ảnh `rail-fixed-390/390-rail-before.png`: card219.3px thay123px, đọc rõ tên MacBook Neo2026, tình trạng, giá, RAM/SSD và màn hình. `rail-fixed-320/320-rail-before.png`: card159.8px; không tràn, giá/tình trạng rõ, một số tên/spec vẫn rút gọn theo card hiện hành.
- Kiểm tra độc lập sau đợi hydration, dùng Enter đầy đủ, chuột và chuỗi touchStart/touchMove/touchEnd: `rail-real-touch/results.json` tại390px có scrollLeft0→231→463→694; `rail-touch-320/results.json` tại320px có0→172→344→515. Menu/focus cũng đạt trong cả hai lượt. Không lỗi JavaScript/API đọc.
- Các lượt dùng `Input.synthesizeScrollGesture` không đổi scrollLeft; đây chưa đủ bằng chứng swipe. Kết luận touch dựa trên chuỗi raw touch nêu trên.
- TypeScript và lint ProductTabs đạt theo command receipts sau sửa CSS. Build cuối và regression toàn storefront sẽ chạy sau các đợt tiếp theo. Không suy ra native iOS/Android đã được kiểm tra từ Chrome emulation.

## MOBILE 2 — kiểm tra độc lập trước sửa

- `purchase-review.mjs` dùng profile Chrome cô lập, chỉ cho phép POST local `/api/cart/revalidate` và `/api/checkout/quote`; chặn API ghi khác. Quote local có thể tăng bộ đếm rate-limit, không tạo đơn.
- `mobile2-before` dừng do script dùng nhầm danh mục phụ kiện làm PDP. Laptop đã thêm giỏ; không coi timeout tìm nút ở danh mục là lỗi UI.
- `mobile2-before-real/results.json`: thêm laptop `/laptop/ref-tgs-7172?sku=LOCAL-7172` và bàn phím `/phu-kien/ban-phim-co-dareu-ek75-rgb-grey-black-citilap?sku=LOCAL150-57-1` bằng nút thật; tăng/giảm số lượng, reload, xóa rồi reload đạt. Không tự tạo cart item bằng localStorage. PDP laptop/phụ kiện, giỏ có sản phẩm và checkout có sản phẩm qua5 kích thước:20 ca không tràn trang, không lỗi JavaScript/API.
- `mobile2-interactions-before/results.json`: mở modal bằng thanh mua cố định ở320px, focus vào modal; Escape đóng, mở khóa cuộn, trả focus MUA NGAY. Nhập tên giả `KIEM TRA UI LOCAL` rồi tải lại checkout giữ tên. Không submit đơn.
- Ảnh `sticky.png` xác nhận giá bị cắt và khoảng trống64px dưới thanh mua. `quick-checkout.png` xác nhận nội dung bên trong modal tràn/cắt ngang dù document overflow0. Cần đo overflow bên trong dialog sau sửa; không suy ra bố cục đạt chỉ từ document overflow.
- Cỡ chữ thực đo: search13px, quick checkout13px, checkout14.8px trên mobile. Đang giao Antigravity sửa presentation; chưa nghiệm thu MOBILE 2.
