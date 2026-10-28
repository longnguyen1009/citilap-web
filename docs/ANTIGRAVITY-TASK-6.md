# TASK 6 — Tổng kiểm tra bằng chứng và chốt báo cáo lượt hiện tại

Đọc `docs/ANTIGRAVITY-TASK-5-REVIEW.md`. Codex đã chạy lại browser TASK 4/5 độc lập: exit 0, đầy đủ dialog assertions. Không chạy lại các gate đã PASS nếu không có thay đổi mới hoặc vấn đề chưa giải quyết.

1. Ghi ACK/TASK 6 RUNNING. Đọc báo cáo TASK 1–5 và review Codex TASK 3–5, đối chiếu trạng thái đầu/cuối báo cáo, file và artifact thật. Sửa trạng thái ACK cũ đang RUNNING nếu đã hết task; giữ lịch sử và phần đính chính Escape TASK 4.
2. Chốt bảng PASS/FAIL/UNVERIFIED/BLOCKED ngắn theo luồng settings, checkout success/order tracking/privacy, inspections API/variant/null, storefront responsive/native zoom, Admin read-only và dialog. Ghi rõ bằng chứng của Antigravity so với lệnh Codex chạy độc lập; không chuyển UNVERIFIED thành PASS chỉ vì task DONE. Không gọi source-string assert là test hành vi.
3. Kiểm tra diff phạm vi TASK 1–5 để tìm lỗi còn rõ bằng chứng, không sửa/format thay đổi sẵn có ngoài phạm vi. Chỉ khi tìm ra lỗi mới thì tái hiện, sửa nhỏ và chạy gate liên quan; còn lại chỉ cập nhật tài liệu. Không tạo thêm framework/script hoặc mở rộng quét toàn bộ Admin. Không xóa test hay công việc có sẵn.
4. Ghi riêng giới hạn: chưa submit đơn/contact thật, chưa save/publish/chuyển trạng thái thật, chưa staging/production; diff check có trailing whitespace ngoài phạm vi ProductEditor.tsx, login từng 429 và đã giữ rate limit. Ghi đường dẫn JSON/script/ảnh thật, danh sách file sửa theo task, việc còn lại theo bằng chứng, không danh sách tính năng suy đoán.
5. Ghi TASK 6 DONE và kết luận lượt đã hết task có căn cứ trong phạm vi được giao, hoặc nêu lỗi cụ thể cần Codex giao follow-up. Dừng chờ Codex review cuối; không tự mở TASK 7.

Giữ toàn bộ thay đổi, server/DB đang chạy. Không commit/push/deploy/reset/stash/clean/checkout, remote migration, seed/reset DB, dữ liệu/đơn/thông báo thật, secrets/quyền. Không VietQR, không modal showroom. Không hỏi xác nhận các bước đã được giao.
