# Prompt Antigravity — R07B.2: Khép các lỗi pricing và campaign trước R07C

Chỉ thực hiện R07B.2. Đọc `AGENTS.md`, guide Next.js liên quan trong `node_modules/next/dist/docs/`, master plan V2, `docs/admin/R07B.1-CODEX-REVIEW.md`, acceptance R07B.1 và code/tests hiện tại. Review đã chạy lại suite 17/17 PASS nhưng phát hiện gap thật; không dùng số PASS này để bác bỏ source findings.

## 1. Bảo toàn và baseline

Đọc git status/diff, giữ mọi thay đổi đang dở. Không reset/stash/clean, không sửa schema/generated của người khác ngoài phần gói này cần. Phân biệt báo cáo cũ với kết quả tự chạy. Trước code lập bảng consumer→nguồn product/variant→pricing context→cache→test. Kiểm tra cả search, compare, wishlist/cart resolver và metadata; không coi import pricing service là đã tích hợp.

## 2. Sửa bắt buộc

- Đưa active campaign và target product/variant vào mọi consumer giá thuộc R07B. Dùng cùng contract/context tại một evaluatedAt cho một lần resolve; tránh N+1 campaign/settings query. Không gửi Map/raw DB object làm public DTO. Cart lưu ID/variant và revalidate giá qua server, không tự tin giá persisted.
- Sửa order và PDP không fallback variant.originalPrice sang cha, kể cả null. Chốt regularPrice/compareAtPrice/isOnSale theo contract và kiểm tra JSON-LD cùng giá hiển thị.
- Chốt scope product campaign an toàn: mặc định không tự áp một giá base vào mọi variant. Variant có item explicit; nếu cần rule khác phải mô tả và test rõ, không suy diễn.
- Calculator xác minh `[startAt,endAt)` cho explicit item/campaign tại `at`, kể cả stale context và context hợp nhất nhiều campaign. Fail-closed khi đọc settings/campaign lỗi; không nuốt lỗi hạ tầng thành giá thường/empty content.
- Không cho save status=PUBLISHED bypass publish validation. Save/update/publish/archive có revision/CAS và D1 atomic phù hợp runtime. Chặn overlap cả khi concurrent publish/update; rollback giữ item cũ khi lỗi. Không tin Prisma `$transaction` là đủ trên D1.
- Validate target tồn tại, variant thuộc product, publication hợp lệ, duplicate targets, giá và khoảng thời gian. Mọi writer dùng cùng service guard.
- Kiểm kê Admin/API campaign; hoàn thiện phần quản trị nằm trong R07B còn thiếu: list/editor, GMT+7 input/preview, validation, publish/archive, auth/CSRF/revision errors. Không tạo campaign service xong rồi báo CMS hoàn thành. Nếu đây là thay đổi phạm vi so nhiệm vụ gốc, ghi rõ phần chưa có và không đánh dấu phase đóng.

## 3. Kiểm chứng bắt buộc

Regression test trước/sau cho từng lỗi trong review. Trên D1 fixture riêng, test active campaign qua các public service thực, variant isolation qua createOrder, save bypass, concurrent publish/update, failure rollback, wrong parent variant và duplicate targets. Exact startAt/endAt và stale merged context phải có clock cố định; không phụ thuộc ngày máy chạy.

Snapshot test phải tạo đơn lúc campaign active, sửa/archive campaign và đổi giá sau đó, đọc lại/transition/replay để chứng minh bản cũ giữ nguyên. Test riêng lỗi query settings/campaign khi đọc product/idempotency còn hoạt động.

Gọi route HTTP thật để kiểm tra 409 payload, validation, auth/CSRF. Browser toàn app kiểm tra giá card/PDP/cart/checkout/JSON-LD, giữ form qua 409, nút xác nhận chỉ tạo một order, retry timeout và review cart. Thiếu browser ghi SKIP và gate chưa nghiệm thu; không gọi service test là browser proof.

Chạy suite R07B.1, R07B, R06.2, typecheck và Cloudflare build phù hợp; báo command, environment và kết quả riêng. Không xóa generated test bundle đang tracked chỉ để làm sạch nếu chưa rõ ownership.

## 4. Bàn giao và hard stop

Tạo acceptance R07B.2 có source mapping, lỗi/repro trước và sau, PASS/FAIL/SKIP từng lớp và migration/rollback nếu có. Sửa kết luận “100%/all gates” ở acceptance R07B.1/roadmap thành trạng thái phản ánh bằng chứng, giữ lịch sử test đã chạy. Cập nhật registry khi consumer thật đã nối.

Dừng sau R07B.2. Không làm shipping/payment R07C, RBAC R08, coupon, kho/serial, cổng thanh toán hoặc gửi thông báo ra ngoài. Không commit/push/merge/deploy/migrate remote. Chỉ đề xuất chuyển R07C khi lỗi pricing/campaign đã sửa và nêu rõ gate browser/staging còn thiếu.
