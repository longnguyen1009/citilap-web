# Antigravity — vòng 07: Các trang Admin còn lại

Chỉ chạy khi Codex giao; chia patch nhỏ, report từng nhóm, giữ dirty worktree và storefront. Không deploy/remote writes. Đọc findings/source mới. Không tự thêm redesign/abstraction.

## A. Brands: chặn ghi đè

writeBrand và UI chưa có CAS; AdminMutationGuard chỉ kiểm tra tồn tại. Thêm token revision phù hợp schema, field DTO/UI payload, guard trong cùng batch với Product.brand synchronization, MediaUsage và audit. D1 zero-changes không rollback batch tự động: dùng guard hiện có. Lỗi 409 giữ form, không báo success. Validate slug trùng cả race theo DB constraint; đừng chỉ precheck. Migration mới nếu cần, không sửa migration đã áp. Test hai writer một thắng và loser không đổi Product.brand/audit/media. Archive tương tác với draft đang sửa phải có expected token hợp lệ.

## B. Feedback, request race, display

- audit page finally của request abort cũ không được tắt loading request mới. Guard generation/aborted.
- redirects handleCopy await writeText, success sau resolve, rejected hiển thị lỗi/retry. Test stale save có ghi audit sai không: hiện service batch audit rồi xét meta.changes, nếu tái hiện thì guard mutation+audit atomic. Giữ redirect internal path/chain/loop security.
- analytics empty message dùng rangeLabel; tránh Math.max(...unboundedRows). SQL aggregate totals riêng + giới hạn/phân trang detail nếu all lớn; không làm totals chỉ tính page. Render unavailable/error có retry phù hợp runtime.
- post-categories delete alert thay inline feedback, disable đúng item pending, giữ dialog khi save lỗi. Không xóa category còn bài viết nếu canonical service không cho.
- users native modal lỗi phải nhìn thấy bên trong dialog (background alert có thể bị che); giữ self/last owner và session revocation safeguards. Kiểm tra hiện giới hạn 200 hoặc pager nếu cần, không bịa tổng.
- media upload/edit/folder/search/paging/archive: xác minh validation/status/dirty guard với consumer thật. Không cleanup usage lịch sử để hết warning.

## C. Nghiệm thu desktop từng route chưa được sửa

Dashboard, contacts, customers, products/list/preview, posts/list, pages/list, users, media, redirects, audit, analytics, brands, post-categories: 1280/1440/1920. Kiểm tra loading/error/empty, tìm/lọc/paging/Back/reload, native dialog focus/Escape/restore, label/keyboard, bảng không che CTA, API 401/403/409 giữ draft. Contacts note gõ khi request đang chạy, customers chọn nhanh detail, export đúng filter/PII roles. Không tạo order/contact/payment thật. Với mock/browser intercept phải ghi rõ, không gọi đó là D1 persistence.

Đọc API/service trước sửa, chỉ fix lỗi có tái hiện/bằng chứng. Ghi page chưa kiểm chứng thay giả PASS. Tests/typecheck/lint/build cuối nhóm; ACK/report round-07-report.md và artifact screenshots/JSON, NEEDS_REVIEW rồi chờ Codex.
