# R1 — Dashboard, Customers, Contacts

Người dùng ngày 28/10/2026 giao Codex review và Antigravity thực hiện, lặp đến khi đạt. Cho phép tự quyết hướng sửa, tạo seed local khi cần. Chỉ dẫn này mở rộng phạm vi lượt TASK 1–6 cũ.

## Cách phối hợp

- Codex review; Antigravity sửa code. Ghi ACK `R1 RUNNING` trong `docs/ANTIGRAVITY-AUDIT-REPORT.md` ngay khi nhận. Xong ghi `R1 DONE`, chờ Codex review và giao vòng sau.
- Giữ mọi công việc hiện có, server và DB. Không reset/stash/clean/commit/push/deploy hoặc remote migration. Không lộ secrets/PII. Seed local có backup, idempotent; ưu tiên fixture DB riêng cho mutation tests. Không gửi thông báo bên ngoài.
- Đọc AGENTS.md và hướng dẫn Next.js liên quan trước sửa. Không thêm dependency nếu công cụ sẵn có đủ.

## Lỗi đã xác minh qua source

1. `src/app/api/dashboard/route.ts`: đếm đơn chờ bằng PENDING/nhãn cũ trong khi contract dùng NEW. Kiểm tra trạng thái canonical trước sửa. MediaAsset dùng `archivedAt` không tồn tại; dùng state READY theo schema. Các `.catch(() => 0/[])` biến query lỗi thành dashboard thành công giả; trả lỗi rõ, UI hiển thị lỗi và retry, không che lỗi bằng 0.
2. `src/app/admin/customers/page.tsx`, `src/app/admin/contacts/page.tsx`: API có pagination nhưng UI chỉ tải trang đầu. Thêm phân trang server, tổng/range đúng; filter/search reset trang; chống stale response khi tìm nhanh/chuyển trang. Kiểm tra export đang xuất toàn bộ kết quả lọc hay chỉ trang hiện tại, ghi nhãn chính xác hoặc sửa phù hợp; không âm thầm xuất thiếu dữ liệu.
3. Customers stats strip hiện tính count/registered/guest/totalNonCancelled trên `customers` của trang hiện tại nhưng nhãn “Hồ sơ”, “Thành viên”, “Vãng lai”, “Tổng chi” giống tổng toàn bộ. Contacts pendingCount cũng cần đối chiếu phạm vi. Chọn diff ngắn: ghi rõ thống kê “trang hiện tại” hoặc dùng aggregate server thực. Không hiển thị 25 như tổng 671 và không gọi tổng tiền một trang là tổng khách hàng.

## Nghiệm thu

- Test hành vi với fixture trên 2 trang: chuyển trang, filter/search reset, empty/error/loading/retry, response cũ không đè mới. Một regression check runnable tối thiểu; tận dụng script có sẵn.
- Dashboard so với DB/status/state thật; query lỗi phải lộ lỗi thay vì 0. Không sửa dữ liệu thật để khớp UI.
- Browser Admin desktop 1440px, screenshot che PII, console/network; kiểm tra reload. Typecheck, scoped lint, diff check. Build nếu không ảnh hưởng server đang chạy.
- Báo file sửa, kết quả/lệnh thật, đường dẫn artifacts, giới hạn còn lại. PASS source/test/browser riêng. Không nhận toàn website PASS.

Sau R1, Codex sẽ giao review catalog/variant/filter và toàn bộ route/content/luồng ghi local. Không tự sửa các nhóm khác đồng thời.
