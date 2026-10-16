# Prompt Antigravity — R07B.3: CAS không side effect, overlap atomic và resolver đúng target

Chỉ thực hiện R07B.3 trước R07C. Đọc AGENTS.md, guide Next.js liên quan, master plan V2, `docs/admin/R07B.2-CODEX-REVIEW.md`, `scripts/review-r07b-2-concurrency.mjs`, acceptance và code hiện hành. Giữ nguyên mọi thay đổi đang dở; không reset/stash/clean. Không đọc/in credential vào report hoặc test log.

## Lỗi đã tái hiện độc lập

1. Request thua CAS trả CAMPAIGN_REVISION_CONFLICT nhưng vẫn đổi item salePrice 15 triệu → 12 triệu.
2. Hai campaign khác ID, cùng target/time publish đồng thời đều fulfilled, cả hai PUBLISHED.
3. Resolver trả 0 cho product không tồn tại, giá cha 20 triệu cho variant không tồn tại; cart API đánh dấu available=true.

Script review chỉ dùng DB tạm, không HTTP hoặc DB dev/remote. Exit 0 không có nghĩa product PASS; đọc `defectReproduced`. Sau sửa chuyển các trường hợp này thành regression khẳng định invariant đúng, không giữ assertion mong đợi bug.

## Phạm vi sửa

- CAS và item replacement phải nguyên tử về điều kiện, không chỉ cùng batch: CAS failure làm mutation không có side effect. Kiểm tra metadata sau commit là quá muộn. Chứng minh title/status/revision/items đều thuộc cùng writer thắng.
- Bảo vệ overlap tại atomic writer/DB, xuyên mọi đường create-PUBLISHED, save-PUBLISHED, update items/time và publish. Hai campaign khác ID phải có tối đa một bên thành công nếu cùng target/time. Không dùng mutex process/in-memory; cân nhắc constraint/trigger/claim phù hợp D1, review schema trước chọn migration number.
- expectedRevision bắt buộc ở update/publish/archive và mọi alias route. Thiếu/sai type/fractional/negative trả validation error; stale trả 409; không tự dùng revision hiện tại thay cho client. Route DELETE không bypass contract.
- Resolver reject product missing, variant missing/wrong parent, deleted/hidden/draft/inactive theo public/orderability guard chuẩn. Không lộ giá draft, không fallback variant về base. AVAILABLE/CONTACT/OUT_OF_STOCK/PREORDER dùng contract hiện hành, không suy từ stock tùy tiện.
- Cart revalidate phân biệt unavailable với infrastructure, validate/bound array và từng item. Error query không biến thành success/unavailable; UI giữ cart và hiển thị retry. Không im lặng báo giá 0 hoặc cho checkout hàng bị ẩn.
- Trace ProductSection→product-home→catalog readers và category/brand/recommendations/search/compare/PDP/builder/collection/cart/checkout/JSON-LD. Chốt một context/evaluatedAt cho một lần resolve; nối campaign ở mọi đường còn thiếu, không query settings/campaign từng item.

## Verification

1. Deterministic interleaving: request đã đọc revision, writer khác thắng trước batch → request cũ 409 và không thay bất kỳ dữ liệu nào.
2. Hai publish khác campaign cùng target/time; concurrent create/update PUBLISHED; vừa đổi item vừa publish. Chỉ một winner, dữ liệu không có overlap, retry không phá invariant.
3. SQL failure thực bên trong batch sau mutation bắt đầu: ví dụ fixture trigger cố ý abort item insert. So title/revision/status/toàn bộ item trước-sau, không dùng invalid target bị prevalidation chặn làm bằng chứng rollback.
4. Missing/wrong-parent/hidden/deleted/inactive target qua service và HTTP cart API. Fault query product riêng trong khi settings/campaign vẫn đọc được → infrastructure error đúng, không success 200 giả.
5. Active campaign qua catalog/home/category/brand/PDP và checkout tại cùng clock; không chỉ resolver. Exact start/end và stale item context, snapshots sau archive/price edit/replay/transition.
6. HTTP auth/CSRF + mutation thiếu revision/stale revision, conflict/validation envelope. Fixture/server HTTP riêng, không hardcode ID của DB dev hoặc ghi order vào DB đang dùng.
7. Test dùng clock có thể inject hoặc fixture thời gian tạo động có kiểm soát; tránh suite chết sau 20/10/2026. Giữ fixed clock cho boundary assertions.
8. Chạy suites regression liên quan, typecheck, build Cloudflare; báo môi trường/command đúng thực tế. Browser local nếu có công cụ và fixture: campaign CRUD/publish, card/PDP/cart/409/retry/form persistence. Browser/staging thiếu ghi SKIP và blocker cụ thể, không thay bằng mock service.

## Bàn giao và dừng

Acceptance R07B.3 ghi lỗi trước/sau, source mapping, migration/rollback, số PASS/FAIL/SKIP từng lớp; sửa trạng thái “đóng kín/sẵn sàng R07C” trong roadmap và acceptance cũ theo bằng chứng, giữ lịch sử test. Báo cáo test nào thực chạy, test nào chỉ kế thừa; không gộp service/HTTP/browser thành một tổng chứng nhận.

Dừng sau R07B.3. Không shipping/payment R07C, RBAC R08, coupon/kho/serial/cổng thanh toán. Không commit/push/merge/deploy/migrate remote. Chỉ đề xuất R07C khi các lỗi P1 này đã khép và gate còn thiếu được nêu rõ.
