# Codex review — 28/10/2026

Scope: reviewer/điều phối; Antigravity sửa. Branch staging, worktree ban đầu sạch. Không commit/push/deploy/remote migration. Seed/mutation test chỉ local fixture, giữ dữ liệu hiện có.

## Findings và vòng giao việc

| Vòng | Vấn đề | Trạng thái |
| --- | --- | --- |
| R1 | Dashboard sai status/cột media, swallow query errors; Customers/Contacts thiếu pagination | Nghiệm thu code; Codex chạy độc lập 8/8 PASS ngày 29/10; xem R1-REVIEW |
| R2 | Publish stale CPU/GPU series, variant condition/facets/filter sai, 2TB khớp 1000GB, PDP specs chưa theo variant | Core fixes +7 nhóm test qua; chưa nghiệm thu: gallery badge hardcode NEW, compare assertions thiếu. Antigravity bị quota rồi yêu cầu login |
| R3 | Brand hứa 15 ngày/12–24 tháng khác policies; news video mẫu/kênh đối thủ; badge ảnh vỡ/link #; heading/content/settings consistency | Source/browser evidence; chờ giao |
| R4 | Mutation/persistence/cross-surface/checkout/permission evidence còn thiếu; test fixtures lỗi thời | Chờ giao |

## Bằng chứng độc lập trước sửa

- `node .wrangler/review-data.mjs`: local read-only, 586 NEW + 85 COMPLETED orders, 1577 READY media, 150 products, 9 pages, 16 posts; FK clean. Đây là số liệu kiểm tra ngày 28/10, không phải production.
- `node .wrangler/review-reproduce.mjs`: stale cpuSeries/gpuSeries, condition NEW vs variant USED, facets 16GB/512GB vs variant 32GB/2TB; filter Core i5 khớp AMD Ryzen; 2048GB filter khớp 1000GB. Script assert lỗi hiện hữu, không phải acceptance sau sửa.
- `node .wrangler/audit-public.mjs`: 23 routes x 1440/768/390/320; không overflow, không uncaught exception. Shared badge image broken. `.wrangler/audit-public/report.json`, screenshots cùng thư mục. Chỉ đọc, không submit, không native zoom.
- `node .wrangler/audit-links.mjs`: 138 internal links HTTP thành công; `.wrangler/audit-public/links.json`. Không chứng minh interaction.
- `node scripts/test-admin-workspace-ui.mjs`: 27 routes, 81 desktop viewport checks PASS; read-only data. `.wrangler/admin-workspace-evidence/`.
- `node scripts/test-r08-operations.mjs`: 15/15 PASS ephemeral D1/R2 (schedule, revisions, audit atomicity, redirects, sitemap).
- `node scripts/test-r08-identity.mjs`: 13/13 PASS ephemeral D1/fixture HTTP (roles, revocation, CSRF, Owner, audit, notifications).
- `node scripts/test-r07a-site-builder.mjs`: 11/11 PASS isolated service integration.
- `node scripts/test-r07b-4-regression.mjs`: 16/16 PASS ephemeral D1/service + handler HTTP (cart validation, campaign boundaries, PRICE_CHANGED, immutable snapshots).
- `node .wrangler/repro-contact-filter.mjs`: ban đầu PENDING filter vẫn giữ PROCESSING row; Antigravity sửa và Codex chạy độc lập lại ngày 29/10, rowCount=0 đúng. Intercepted fixture, không ghi dữ liệu thật.
- Runtime dev ban đầu chập chờn/timeouts, Antigravity restart đúng Vite local; Codex kiểm tra sau restart `/` 200 ~1.8s, `/api/settings` 200 ~71ms.
- `node .wrangler/audit-zoom.mjs`: sau restart, 8 route ở native Chrome zoom 200% (outerWidth1440, innerWidth708, DPR2), không overflow. Screenshot qua CDP trong `.wrangler/audit-public/zoom/`; lần đầu screenshot Playwright bị crop đã được thay bằng CDP capture đúng. Phát hiện nested main tại search/news/order-tracking, chuyển R3. Không bao phủ submit hay zoom PDP có data.

## Test debt phát hiện

- `test-r06-production-handlers.mjs`: first order create 400 vs expected 201; fixture thiếu shippingMethod/checkout acknowledgment hiện hành.
- `test-r06-1-integrity.mjs`: 10/18 PASS, seed order thiếu acknowledgment khiến cascade failure. Chưa kết luận production bug.
- `test-settings-http-routes.mjs`: import createAdminSession không còn export; harness lỗi thời.
- `test-publication-correctness.mjs`: esbuild chưa externalize generated Prisma wasm; harness không chạy được.

Không tuyên bố toàn website PASS. R1 đã review source và chạy độc lập `node scripts/test-r1-audit.mjs` 8/8 PASS (service/API fixture + desktop browser); chưa chạy toàn bộ mutation/browser persistence, staging/production chưa kiểm tra trong lượt này.

## Trạng thái bàn giao 29/10 khoảng 01:10 GMT+7

- R2 chi tiết: `docs/ANTIGRAVITY-AUDIT-R2-REVIEW.md`, có prompt tiếp tục cụ thể. Codex independent mixed-variant13/13, unified catalog12/12, pricing16/16; final typecheck PASS. R2 full harness có7 nhóm PASS nhưng exit1 do15 CSP errors badge footer (R3); không ghi whole-suite PASS.
- R2 browser screenshots đã xem; badge ảnh vẫn ghi Mới100% trong variant USED: lỗi thật `ProductGallery.tsx:116`, giữ R2 chưa nghiệm thu. Compare test mới count/id, chưa đúng SKU/specs proof.
- `.wrangler/audit-public/r2-data-integrity.json`:150 original products không đổi,4 demo ARCHIVED/unpublished; order/media counts giữ nguyên, FK clean. Giữ data/history, không reset.
- Antigravity `Individual quota reached`, UI báo refresh04/11. Đã chọn Gemini3.8 Flash sẵn có, không bật overages/nâng gói; sau đó IDE yêu cầu Google sign-in. Không có agent đang tiếp tục. `.wrangler/audit-public/antigravity-auth-blocked.png`.
- Cần đăng nhập Antigravity/model còn quota để tiếp tục vòng review/giao việc. R3/R4 có brief nhưng **chưa giao, chưa thực hiện**. Không claim toàn storefront/Admin ổn. Workspace giữ nguyên tất cả thay đổi, chưa commit/push/deploy/remote migration.
