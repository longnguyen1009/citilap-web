# Antigravity — vòng 03: Products

Chỉ chạy khi Codex giao. Giữ concurrent edits và storefront. Không deploy/push/remote writes/reset/stash/clean. Đọc AGENTS/Next docs, product-studio service/contracts/editor/tests và migration 0010.

Đính chính: CAS đã có trigger studio_revision_guard + PK revision và concurrency test PASS. Không thay bằng WHERE revision rồi bỏ check atomic batch, vì 0-row UPDATE không tự rollback SQL sau. Nếu bổ sung WHERE phải có guard rollback batch. Không rewrite CAS đang đúng chỉ vì review đầu vào bỏ sót trigger.

1. Matrix mặc định giá từ doc.price lúc mở generator, giữ manual override; không hằng 25 triệu, không dùng || làm mất zero hợp lệ. Sinh SKU tự động với UUID suffix/generate-once; mọi add/duplicate/matrix unique trong document và validate server tránh collision DB. Không tự thay SKU người nhập.
2. Uniqueness slug và SKU kiểm tra trước save draft/publish, field errors rõ. Dự thảo khác có SKU trùng cũng cần xét nếu định nghĩa uniqueness xuyên draft. Không tái dùng SKU của variant cũ có order history bằng cách xóa record. Quy tắc tái sử dụng phải bảo toàn order/inventory references.
3. MediaUsage: PRODUCT_REVISION giữ ảnh từng revision để restore, không xóa retention. Chỉ sửa duplicate reference trong cùng owner/slot nếu có; test history media vẫn archive-blocked. PRODUCT_CONTENT cũng phải xét history trước cleanup.
4. Hạ xuất bản độc lập nội dung draft lỗi: endpoint/action chỉ cần productId + expectedRevision, giữ draft và public state, CAS/audit atomic, confirm UI; không yêu cầu validate toàn bộ document/media/R2 để ẩn khẩn cấp. Không xóa sản phẩm.
5. Public Product.price đồng bộ min giá variants thực sự orderable khi publish; draft save không thay projection public. Làm rõ CONTACT/UNAVAILABLE và case không có variant. Test admin list và public resolver/filters không lệch.
6. restore snapshot phải normalizeStudioDocument trước schema/write, trả document normalized thực tế; không ghi raw snapshot vào response.
7. Inspect baseline failing test `removed variant becomes inactive and stock=0`: quantity/backing inventory logic có thể chủ đích giữ stock. Xác minh invariant trước sửa code hay test; không ép zero nếu dẫn tới mất tồn kho.

Autosave shared đang được tiến trình khác sửa, review integration sau; không ghi đè hook/DraftRecovery. Dùng tests hiện có, thêm case giá matrix/uniqueness/invalid draft unpublish/legacy restore; typecheck/lint scoped; report `.wrangler/admin-review-20261112/round-03-report.md`, ACK và ROUND 03 NEEDS_REVIEW rồi chờ Codex.

## Regression mới đã tái hiện trên patch đồng thời

Chạy `node .wrangler/admin-review-20261112/repro-current-price.mjs` trên Miniflare sạch, publish document.price=14.000.000, variant.price=10.000.000. Output thực tế: projection=10000000, published=14000000, adminList=14000000, variant=10000000. Assert FAIL. Code tính effectiveProductPrice sau snapshot JSON.stringify(d), chỉ update Product.price. Cần canonical hóa giá đúng lúc trước serialize snapshot (hoặc một resolver canonical thống nhất cho tất cả consumer, không sửa storefront UI). Draft sau publish, publishedSummary, published document, catalog sort/filter phải cùng semantics; không normalize theo variant khi chỉ save draft nếu đó là thay đổi nghiệp vụ ngoài scope. Thêm case nhiều variant CONTACT/UNAVAILABLE và originalPrice riêng theo variant để không kế thừa giá gạch sai.
## Gate bổ sung từ snapshot đang thay đổi

Typecheck 12/11 phát hiện ProductEditor truyền `formatNumberDots`/`parseNumberDots`/`money` vào VariantMatrixGeneratorPanel trong khi props không nhận; thiếu imports `AlertTriangle`, `Search`. Kiểm tra snapshot mới rồi sửa phần còn tồn tại. Panel đang dùng `docPrice || 25000000`: giá 0 không được âm thầm thành 25 triệu. Repro price tại `.wrangler/admin-review-20261112/repro-current-price.mjs` vẫn là gate bắt buộc: projection/published/adminList phải thống nhất giá canonical khi publish, giữ draft isolation.
