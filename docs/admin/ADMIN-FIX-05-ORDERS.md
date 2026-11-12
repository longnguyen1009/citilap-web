# Antigravity — vòng 05: Đơn hàng, ưu tiên P0

Codex giao thực hiện vòng05 ngay. Đây là task backend integrity, không phải redesign UI: không gọi modern-web-guidance hoặc cài dependency/search CLI bên ngoài. Phạm vi orders list/detail + API `[id]` và helper domain/tests liên quan. Không sửa storefront/checkout contract ngoài invariant cần thiết; không deploy/remote writes.

Source đã xác nhận:
1. `ASSIGN_SERIAL` trong api/orders/[id]/route.ts chỉ SELECT serial theo ID, không kiểm tra cùng product/variant, status, order khác hoặc reservation. Bất kỳ serial nào có thể gán vào bất kỳ OrderItem nào. Bỏ gán luôn chuyển serial cũ về AVAILABLE, kể cả đơn COMPLETED. Không kiểm tra trạng thái đơn/CAS. D1 migrations hiện không có trigger bảo vệ invariant này. Đây là P0 dữ liệu kho/đơn.
2. `UPDATE_BILLING` nằm trước expectedRevision validation, UPDATE Order không tăng/check revision. Hai admin có thể ghi đè paymentStatus/shippingFee/totalAmount; trạng thái completed/cancelled cũng không guard. Input enum/số sai bị âm thầm bỏ qua rồi success. UI không gửi revision cho cả billing và assign.
3. List fetchOrders không AbortController/request generation; query chậm cũ có thể ghi đè filter mới. URL state chỉ initial đọc + replace, cần xác minh Back/Forward đồng bộ và clamp trang ngoài phạm vi.

Sửa nhỏ nhưng trọn invariant:
- Tất cả mutation cần CAS bắt buộc, tăng revision và trả 409 với UI giữ nội dung đang sửa. Guard D1 batch phải rollback toàn bộ stock/item/event/audit, không chỉ WHERE rồi xét changes sau batch.
- Chỉ serial đúng product + variant, trạng thái phù hợp, không giữ bởi order/reservation khác. Một serial không thể thuộc hai đơn còn hiệu lực. Gỡ serial SOLD/đơn hoàn tất đi qua return workflow hợp lệ, không về AVAILABLE trực tiếp. Đơn cancelled không nhận giữ serial mới. Xét legacy variant NULL theo semantics hiện có.
- Preserve snapshot giá/cost/amount collected; billing giữ quy tắc tài chính và order lifecycle. Validate finite safe VND integer với giới hạn hiện có; lỗi field trả 400, không silent fallback. Không tự tạo refund/payment thật.
- UI giữ draft khi conflict, disable operation chồng nhau, picker lọc đúng variant/server vẫn authoritative.
- List abort/generation, error rõ, paging hợp lệ và Back/Forward.

Test runnable Miniflare/handler sẵn có: wrong product/variant, serial reserved elsewhere, hai order giành một serial, bỏ gán đơn completed, update stale billing, race state transition và billing, rollback no partial item/event/audit, 404 + invalid input/auth/CSRF. Không ghi DB thật. ACK/report round-05-report.md, typecheck/lint/tests, browser desktop riêng; ROUND 05 NEEDS_REVIEW rồi chờ Codex.

## Repro đã chạy thật

`node .wrangler/admin-review-20261112/repro-current-price.mjs billing` dùng Miniflare isolated, loginAdmin + cookie thật fixture. Gửi UPDATE_BILLING/paymentStatus=PAID, thiếu expectedRevision. Output HTTP200/paymentStatus=PAID/revision=0, assert FAIL. Log repro-billing.log. Tái dùng prefix setup để viết regression chính thức tối thiểu; không dùng Bearer auth cũ và không sửa auth để test qua. Next/server cần external `next/server.js` khi bundle Node, tránh bundle UA-parser __dirname.

Có tiến trình khác đang đổi orders/page.tsx (UI table). Tránh ghi đè; ưu tiên API/detail/domain integrity. Nếu list file còn đổi, để list browser/race sang followup. API orders/[id]/route.ts và inventory endpoint chưa bị phiên khác sửa tại lúc Codex giao; kiểm tra git diff lần nữa.
