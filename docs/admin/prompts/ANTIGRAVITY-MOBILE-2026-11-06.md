# Storefront Mobile — điều phối ngày 06/11/2026

Người dùng giao Codex gọi Antigravity, kiểm tra kết quả và lặp lại trong lúc nghỉ. Đây là lượt mới, không nối trạng thái TASK 1–6 cũ.

Workspace: `C:/Users/Admin/Desktop/citilap-web2`, branch hiện tại `staging`. Đọc AGENTS.md và hướng dẫn Next.js liên quan trước khi sửa. Kiểm kê git status và diff, bảo toàn mọi thay đổi có sẵn. Không sửa Admin; không đổi API, schema, migration, auth, pricing, tồn kho, cart/quote, PRICE_CHANGED, chống đơn trùng, CMS hoặc SEO. Không commit, merge, push, deploy, reset, clean, stash, đổi branch, dừng server người dùng hay ghi dữ liệu production. Không tạo đơn, gửi liên hệ, gọi thanh toán hoặc publish nội dung thật. Giữ dữ liệu local; nếu cần kiểm tra ghi phải dùng fixture cô lập và ghi rõ phạm vi.

Codex điều phối từng đợt; Antigravity chỉ thực hiện đợt đã giao. Không chạy hai tác vụ chỉnh cùng file. Không dùng kết quả cũ làm bằng chứng mới.

## Giao tiếp qua file

Tạo `docs/admin/STOREFRONT-MOBILE-UI-REVIEW-2026-11-06.md`. Ghi ngay `MOBILE 1 ACK` cùng thời điểm, phạm vi và file dự kiến sửa để Codex biết đã nhận việc. Khi hoàn thành ghi `MOBILE 1 DONE`; nếu vướng ghi `MOBILE 1 BLOCKED` cùng bằng chứng. Không ghi DONE khi còn tiến trình sửa/test của đợt đang chạy.

Mỗi đợt có: phát hiện/mức độ/cách tái hiện, thay đổi, file chạm trong đợt, lệnh và kết quả thật, ảnh trước/sau, route/viewport, phần chưa xác minh. Lưu ảnh/JSON trong `.wrangler/storefront-mobile-20261106/`. Không ghi secrets, cookie hoặc thông tin cá nhân vào báo cáo/log chia sẻ.

## MOBILE 1 — điều hướng và khám phá sản phẩm

Rà nhanh toàn bộ storefront để lập danh sách vấn đề theo hành trình khách hàng. Trực tiếp sửa UI/interaction của Header, menu mobile, bottom navigation, floating contact, Trang chủ, Danh mục và Tìm kiếm. Ưu tiên lỗi có thể tái hiện, cản trở đọc/tìm/chọn sản phẩm trên mobile. Không dừng ở kế hoạch; không thay nhận diện/nội dung toàn trang theo suy đoán.

- Header gọn, tìm kiếm dễ thấy; menu/drawer đóng mở đúng, cuộn nội bộ, quản lý focus và trả focus; không khóa cuộn sai.
- Không tràn ngang toàn trang, chữ cắt, nội dung chồng, khoảng trắng thừa. Thứ tự nội dung và CTA theo hành trình mua hàng.
- Product card dễ đọc tên, giá, cấu hình, trạng thái; rail/carousel dùng được bằng chạm và có điều khiển rõ ràng; không phụ thuộc hover.
- Filter/sort hiển thị điều kiện đang áp dụng, xóa dễ; giữ URL, điều kiện khi đóng drawer/quay lại/reload. Giữ discovery theo server/API hiện hành.
- Bottom navigation, contact widget, cookie notice và sticky CTA không che nhau hoặc che nội dung; tôn trọng safe-area.
- Vùng chạm điều khiển chính khoảng 44×44px; tương phản, focus, tên truy cập, Escape và reduced-motion.
- Kiểm tra loading/empty/error/retry và ảnh lỗi. Không thêm dữ liệu giả để che lỗi thật.

Đọc `docs/admin/STOREFRONT-UI-REVIEW.md`, `docs/STOREFRONT-UI-REVIEW.md`, `docs/admin/R09A-ACCEPTANCE.md` và source hiện tại; xác định component thực sự được route sử dụng.

## Kiểm chứng bắt buộc

Trình duyệt thật tại 320×568, 390×844, 430×932, 768×1024 và 1440×900. Kiểm tra thao tác chạm, bàn phím, drawer, rail, filter, URL/reload, scroll và viewport ngắn. Đợi dữ liệu tải xong trước chụp ảnh. Desktop native browser zoom 200%, không thay bằng CSS zoom hoặc đổi viewport rồi gọi là native zoom.

Đọc script trước chạy; ưu tiên kiểm tra không ghi dữ liệu. Chạy TypeScript, lint phần chỉnh, test liên quan và `build:cloudflare`. Phân biệt source/static, browser, local DB và production; thiếu browser thì ghi UNVERIFIED, không tự đánh visual PASS.

Khi xong MOBILE 1, dừng chỉnh file, ghi DONE và chờ Codex review. Đợt kế tiếp dự kiến MOBILE 2 (chi tiết sản phẩm/giỏ hàng/checkout), rồi MOBILE 3 (trang phụ/regression), chỉ bắt đầu khi được giao.
