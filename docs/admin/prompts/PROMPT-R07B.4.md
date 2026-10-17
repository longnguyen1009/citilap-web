# Prompt Antigravity — R07B.4: Khép public guard, cart UX và atomic final-state update

Chỉ thực hiện R07B.4. Đọc AGENTS.md, guide Next hiện hành, master plan V2, `docs/admin/R07B.3-CODEX-REVIEW.md`, `scripts/review-r07b-3-gates.mjs`, prompt/acceptance R07B.3 và code thật. Không reset/stash/clean/overwrite công việc đang dở; không đọc/in `.env` hoặc credential. R08 nằm ở `.worktrees/r08`, branch `feature/r08-admin-operations`, Codex phụ trách; không sửa/merge phần đó.

## Findings phải khép

1. Resolver phân biệt legacy không Studio với Studio có publishedNULL. Reject draft/unpublished/hidden/deleted/inactive đúng public/orderability contract ở cả D1, Prisma và prefetched path. Object `input.product` cũ/không khớp ID không được bypass authoritative guard. Nếu display reader cần snapshot, tách trách nhiệm/contract rõ; bulk context tránh N+1, không query settings/campaign từng item. Kiểm tra AVAILABLE/CONTACT/PREORDER/UNAVAILABLE theo contract hiện có, không suy từ stock.
2. Cart API validate đầy đủ từng item: bounded nonempty string id/productId, optional variantId đúng type, expectedPrice finite integer VND hợp lệ nếu có, array<=50; malformed input400 trước query, infrastructure giữ lỗi thật. Không để numeric variantId thành500 hoặc ID object được200.
3. CartContext và cart/checkout UI phải dùng unavailable và trạng thái pending/error. Giữ item/form khi lỗi mạng/DB; hiển thị lý do, nút retry; chặn submit với target unavailable hoặc revalidation chưa thành công. Khi có response cũ đến trễ, không ghi đè cart/variant/quantity mới. Revalidate lại khi vào checkout/reload theo contract; server createOrder vẫn là authority, không dựa UI guard.
4. Sửa published campaign update xét final item/time set atomically. Case đổi cả target/time hợp lệ phải thành công; conflict thật vẫn rollback toàn bộ và409. Không tạm DRAFT ở giao dịch riêng, không nới trigger làm race quay lại. Kiểm tra createPUBLISHED/savePUBLISHED/updateitems/time/publish/archive/retry và CAS. Migration0020 đã được báo apply local; migration tiến phải kiểm kê cả root và R08 trước chọn số (0021 đã dành identity ở R08). Không migrate DB dev/remote trong lượt này; chỉ fixture.

## Verification bắt buộc

- Chuyển review probes thành regression khẳng định invariant đúng, không assertion mong bug. Giữ ba regression gốc, deterministic interleaving sau read trước batch, title/status/revision/toàn bộ items thuộc writer thắng.
- Concurrent createPUBLISHED/updatePUBLISHED/đổiitems-và-publish, conflict thật và final-state không overlap; SQL trigger abort sau mutation bắt đầu chứng minh rollback.
- Missing/wrongparent/hidden/deleted/inactive/unpublished qua resolver và cart HTTP. Prefetched stale ACTIVE sau archive/unpublish/disable; product object sai ID; query fault riêng product trong khi settings/campaign đọc được.
- Fixture HTTP server riêng cổng ngẫu nhiên, DB/R2 tạm, không localhost3001 hoặc ID/order dev. Gọi handlers thật; ghi rõ đây là handler HTTP hay full app. Auth/CSRF cho mutation, missing/type/fractional/negative/stale expectedRevision trên PUT/DELETE/publish/archive và alias, conflict/validation envelope. Không nhận revision hiện tại từ DB thay client. Kiểm tra revision alias nếu duy trì phải ghi contract rõ.
- Trace ProductSection→product-home→catalog và category/brand/recommendations/search/compare/PDP/builder/collection/cart/checkout/JSON-LD. Chứng minh campaign active, exactstart/exactend và stale context; một evaluatedAt/context cho cùng lần resolve. Không lấy một featured reader test làm full storefront proof.
- Clock inject hoặc fixture thời gian động kiểm soát, tránh suite hết hạn theo ngày máy. Fixedclock cho boundary.
- Chạy regression liên quan, typecheck và build Cloudflare. Nếu đổi hàm dùng chung, kiểm tra consumer thật. Browser nếu công cụ/fixture có: unavailable, infrastructure retry,409/form persistence, campaign CRUD và final-state update. Thiếu browser ghi SKIP cùng blocker công cụ thực tế, không gọi service/HTTP là browser và không tự deploy.

## Bàn giao và dừng

Tạo R07B.4-ACCEPTANCE với source mapping, migration/rollback an toàn, số PASS/FAIL/SKIP từng lớp và command thực chạy. Sửa claims “100%/đóng kín/sẵn sàng R07C” trong acceptance/roadmap/registry theo review; giữ lịch sử kết quả cũ, không xóa bằng chứng. Tách test kế thừa với test vừa chạy.

Dừng sau R07B.4. Không R07C shipping/payment, R08 RBAC, coupon/kho/serial/payment gateway. Không commit/push/merge/deploy/migrate dev/remote. Không drop trigger trên DB đang chạy để rollback khi admin writes còn mở. Chỉ đề xuất R07C sau review kết quả mới.
