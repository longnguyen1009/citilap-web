# MOBILE 3 — Trang phụ và hồi quy cuối

Chỉ chạy khi Codex gửi file này sau nghiệm thu MOBILE 2. Giữ mọi giới hạn trong ANTIGRAVITY-MOBILE-2026-11-06.md: bảo toàn dirty worktree, server/dữ liệu local; không sửa Admin/backend/API/schema/nghiệp vụ, không commit/push/deploy/migrate hoặc thay permissions.

Ghi MOBILE 3 ACK vào docs/admin/STOREFRONT-MOBILE-UI-REVIEW-2026-11-06.md.

Rà các route thực tế: wishlist, so-sanh, order-tracking, hot-sale, news và một bài viết, lien-he, he-thong-cua-hang, chính sách bảo hành/đổi trả và profile nếu có. Chỉ sửa lỗi UI/interaction tái hiện được: thứ tự nội dung, bảng/cuộn ngang nội bộ, vùng chạm, form/nhãn/lỗi, sticky che nội dung, ảnh/link hỏng hoặc modal thiếu focus. Không tạo đơn, tra cứu số điện thoại thật, gửi liên hệ, publish hoặc thêm nội dung/dữ liệu giả.

Hồi quy các thay đổi MOBILE 1/2 trên trình duyệt thật: 320×568, 390×844, 430×932, 768×1024, 1440×900 và native browser zoom 200%. Xác minh menu focus/trap/return/Escape, filter URL/reload/back, rail touch/keyboard, PDP và giỏ có sản phẩm, checkout có sản phẩm mà không submit đơn, reduced-motion và safe-area. Chặn API tạo đơn/liên hệ/thanh toán; fixture phải tách và ghi rõ.

Không mở rộng thiết kế nếu không có lỗi. Không viết lại toàn trang. Nếu trang hiện tại ổn, ghi đã kiểm tra và giữ nguyên.

Đọc script trước chạy, chờ command async hoàn tất trong turn, không kết thúc ở lời hứa. Chạy lint phần sửa, TypeScript, check hiện có phù hợp và build:cloudflare. Ghi báo cáo cuối gồm danh sách file thay đổi riêng tác vụ này, lỗi trước/sau, screenshot/JSON, test và hạn chế bằng chứng. Ghi MOBILE 3 DONE rồi dừng để Codex nghiệm thu; không tự tạo tác vụ tiếp theo.
