# R4 — Luồng ghi thật local, toàn bộ Admin/storefront còn lại

Chỉ chạy khi Codex giao sau review các vòng trước. Giữ dữ liệu/server hiện có, không remote/deploy. Người dùng đã cho phép seed local; dùng D1/R2 fixture riêng với backup khi cần, dữ liệu test ghi rõ demo, không gửi thông báo bên ngoài.

## Mục tiêu

Hoàn tất kiểm tra hành vi/persistence, không lấy route 200 hoặc ảnh tĩnh làm bằng chứng luồng ghi đã chạy.

- Storefront: search/suggestions/filter/sort/pagination, category/brand/collection, PDP variants/gallery/inspection/warranty/accessories, compare/wishlist/recently viewed persist reload; cart thay quantity/remove/stale variant; quote server, shipping/pickup/payment, tạo order local thực qua browser, success token/private tracking, idempotent retry, price change/expired promotion, sold/unpublished selection; contact local, lỗi validation/Turnstile vẫn fail closed theo môi trường. Không tự tắt guard để test pass.
- Admin desktop: products/Studio create-save-reload-publish-unpublish-archive; media upload/alt/reuse/archive in-use guard; categories/brands/navigation/tree links; posts/pages/categories/builder/collections draft/publication/revision conflict; campaigns interval/overlap; settings save/reload/public consistency; orders status/reason/note/revision/history; contacts processing/history/note; users/RBAC/audit/redirects/analytics/notifications. Tận dụng suites hiện có, phân biệt browser proof và service/HTTP proof. Không tạo framework mới.
- Cross-surface: sau save draft storefront không đổi; publish storefront đổi đúng; unpublish không resurrect fallback; edit/save conflict không mất draft; dữ liệu order snapshots giữ nguyên khi sản phẩm/settings/campaign đổi.

## Baseline Codex đã kiểm tra trong lượt này

- `node scripts/test-admin-workspace-ui.mjs`: 27 pages, 81 desktop viewport checks PASS (read-only).
- `.wrangler/audit-public/report.json`: 23 public routes, 4 viewport sizes, không overflow/uncaught browser exception. Không chứng minh submit hay zoom.
- `.wrangler/audit-public/links.json`: 138 internal links, không 4xx (HTTP only).
- `node scripts/test-r08-operations.mjs`: 15/15 PASS ephemeral D1/R2.
- `node scripts/test-r07a-site-builder.mjs`: 11/11 PASS ephemeral D1.
- `node scripts/test-r06-production-handlers.mjs`: FAIL first create order 400 vs 201; fixture payload cũ thiếu checkout fields/acknowledgment. Không hạ validation production; cập nhật fixture theo contract thật rồi kiểm tra atomicity/idempotency/public DTO/export.
- `node scripts/test-r06-1-integrity.mjs`: 10/18 PASS; seed order thất bại do thiếu xác nhận tổng tiền gây lỗi dây chuyền. Sửa fixture setup theo quote/ack hiện tại và rerun, giữ các assertions CAS/ledger/export.
- `node scripts/test-settings-http-routes.mjs`: bundle FAIL vì import `createAdminSession` không còn export. Dùng auth hiện hành/fixture chuẩn, không mở thêm auth bypass production.
- `node scripts/test-publication-correctness.mjs`: bundle FAIL, generated Prisma wasm chưa externalize. Kiểm tra cập nhật harness, không đổi production bundler để che lỗi test.
- `node scripts/test-r07b-4-regression.mjs`: 16/16 PASS, D1/service + handler HTTP fixture; đã cover hiện tại cart/checkout snapshots/PRICE_CHANGED/campaign guards, có thể dùng làm chuẩn cho fixture R06.
- `node scripts/test-r08-identity.mjs`: 13/13 PASS, D1/fixture HTTP; không cần chạy lại nếu không chạm identity.
- `node scripts/test-homepage-cards-browser.mjs`: timeout chờ homepage DOM ready/h1; audit Playwright riêng đã mở homepage thành công. Điều tra chờ resource/harness trước kết luận UI lỗi, không gọi script này PASS.

## Phạm vi sửa

Tái hiện và sửa tối thiểu mọi lỗi cụ thể còn gặp. Lập route/flow matrix PASS/FAIL/UNVERIFIED với artifacts. Không xóa test để che lỗi; chỉ sửa kỳ vọng khi chứng minh contract đã đổi đúng. Nếu test cũ trùng suite mới, chỉ rõ suite mới cover assertions nào; không tuyên bố test cũ PASS.

Typecheck/scoped lint/build/tests phù hợp. Browser storefront 1440/768/390/320 + native zoom 200%; Admin desktop. Ghi R4 RUNNING/DONE và giới hạn vào report, chờ Codex review cuối. Không nhận toàn website ổn khi còn lỗi tái hiện hoặc luồng quan trọng chưa kiểm chứng.
