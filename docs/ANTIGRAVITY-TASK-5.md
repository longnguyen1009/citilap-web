# TASK 5 — Chốt regression bàn phím dialog lý do đơn hàng

Đọc `docs/ANTIGRAVITY-TASK-4-REVIEW.md` trước. Đây là follow-up có bằng chứng từ review TASK 4, chưa mở rộng sang các màn Admin khác.

1. Ghi ACK và TASK 5 RUNNING trong báo cáo. Sửa kết luận TASK 4 về Escape thành chưa đủ bằng chứng, giữ lịch sử và giải thích vì JSON không có kết quả modal.
2. Sửa script browser hiện có: sau mở dialog phải chờ React render bằng until, assert nút mở tồn tại với đơn local phù hợp, dialog thực sự hiện và submit disabled khi rỗng. Không được bỏ qua rồi PASS. Dùng Input.dispatchKeyEvent cho bàn phím thật, assert mọi kết quả; ghi kết quả cụ thể vào JSON. Không submit/hủy/mở lại đơn thật.
3. Tái hiện focus ngay sau mở, Escape không cần click vào textarea trước, Tab/Shift+Tab trong dialog, đóng trở về nút mở, accessible name textarea. Source hiện có wrapper onKeyDown nhưng thiếu chuyển focus vào dialog. Chỉ sửa lỗi tái hiện được bằng diff nhỏ. Ưu tiên khả năng modal native hoặc giải pháp sẵn có; không thêm dependency/abstraction. Giữ nguyên xác thực, transition logic và điều kiện đang xử lý. Đọc Next.js docs liên quan trước sửa.
4. Login đang bị 429 sau nhiều lượt; giữ nguyên rate limit. Nếu còn session hợp lệ trong bộ nhớ môi trường đã có, dùng ADMIN_UI_COOKIE mà không in/lưu token. Nếu không có, chờ cửa sổ rate limit; không login lặp, không đổi IP để né giới hạn, không reset DB/session/rate limit. Tiếp tục đọc source/test độc lập trong lúc chờ.
5. Kiểm tra browser desktop, typecheck và một kiểm tra chạy lại cho logic vừa sửa. Bằng chứng `.wrangler/task-5-evidence/` hoặc script hiện có cùng JSON riêng, che PII; không tạo nhiều script sao chép nếu có thể tái dùng. Báo kết quả thật, file sửa, lệnh/exit code, giới hạn. Ghi TASK 5 DONE rồi chờ Codex review trước task kế.

Giữ toàn bộ thay đổi sẵn có, server và DB local. Không commit/push/deploy/reset/stash/clean/checkout, remote migration, dữ liệu/đơn/thông báo thật, secrets hoặc quyền. Không VietQR/modal showroom. Không coi read-only là persistence hoặc local là staging/production.
