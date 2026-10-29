# Codex review R2 — 29/10/2026

Trạng thái: đang review, chưa nghiệm thu R2.

## Bằng chứng độc lập trong lúc Antigravity sửa

- `.wrangler/review-r2-check.mjs`: 13/13 PASS trên Miniflare DB riêng. Từ repro cũ, đổi assertions sang kết quả đúng: Ryzen 7/RTX 4070 thay stale Core i5/GTX1650; search facet 32GB/2TB; condition USED; lọc Core i5 rỗng; 1000GB khớp 1TB nhưng không 2TB. Thêm 3 published variants: RAM facet đếm mỗi product một lần, nhận cả Core i7 secondary variant, 32GB+1TB không ghép khác variant, 32GB+2TB+Core i7+NEW chọn đúng mix-b.
- `node scripts/test-unified-catalog.mjs`: 12/12 PASS.
- `node scripts/test-r07b-4-regression.mjs`: 16/16 PASS, D1/service + handler HTTP fixture; campaign boundaries/availability/PRICE_CHANGED/snapshots/atomicity/RBAC guards. Không phải full-app browser hoặc staging proof.

## Follow-up đã giao

- Không lấy `limit*2` rồi post-filter: có thể bỏ sót matches; agent đã chuyển batch trước lọc/pagination. Kiểm tra final diff/performance tiếp.
- Không duplicate parser giữa catalog/publish; agent đang gom về parser trong product-studio service.
- Không vá server-rendered specs bằng `querySelector`/`textContent` trong Hero effect: không đồng bộ JSON-LD/recently viewed/compare và giữ giá trị variant trước khi field trống. Yêu cầu dùng React/Next route SKU hiện có và browser proof click/reload.

Chờ final code, typecheck/lint, regression suite của agent và browser artifacts trước khi giao R3. Không deploy/commit/push/remote migration.

## Bổ sung review harness

- Codex `npx tsc --noEmit` và scoped ESLint 8 files R2 đều exit 0, không errors/warnings. `git diff --check` PASS.
- Agent đã bỏ DOM mutation, dùng `router.replace(..., {scroll:false})` và key theo SKU để render lại; cần browser proof.
- Harness đầu dùng schema/route cũ, định publish/restore `prod-001`: yêu cầu bỏ trước chạy, dùng demo riêng.
- Harness tiếp theo dùng SQL delete rộng theo `name LIKE 'AUDIT R2%'` và xóa AdminAudit: yêu cầu bỏ, tạo slug duy nhất/run và archive qua API/revision, giữ history. Backup local online trước seed nếu dùng server local thật.
- `Emulation.setPageScaleFactor` không phải native browser zoom; không nhận làm native200% evidence. Dùng cách `.wrangler/audit-zoom.mjs`, ghi outer/inner/DPR.

## Review cuối phần đã có — 01:10 GMT+7

Antigravity bị `Individual quota reached` (UI báo baseline refresh 04/11/2026). Đã thử Gemini3.8 Flash trong menu sẵn có, không bật overages/nâng gói; sau đó IDE hiển thị `Authentication Required` / `Continue with Google`. Không còn agent chạy để nhận R2 follow-up hoặc R3. Screenshot `.wrangler/audit-public/antigravity-auth-blocked.png`. Cần đăng nhập với model còn quota để tiếp tục giao việc.

Codex chạy độc lập `node scripts/test-r2-audit.mjs`: **7 nhóm hành vi PASS nhưng toàn lệnh exit 1**, không nhận whole-suite PASS. Log `.wrangler/audit-public/r2-codex-test.log`.

- 4 nhóm fixture: parser/storage, publish projection, combined filters/facets/unavailable variants, category pagination và active/expired campaigns.
- 3 nhóm browser: click SKU/render RSC/specs/condition/JSON-LD/recent/cart/quote/reload; search/category responsive; native Chrome zoom200% (outer1440, inner708, DPR2, no overflow).
- Exit1 ở assertion consoleErrors: **15 CSP errors** cho badge `bizweb.dktcdn.net/.../logo_bct.png`. Lỗi thực đã nằm trong R3, không whitelist CSP để che chứng nhận sai. Giữ assertion và rerun sau sửa R3.
- Browser publish là Admin API thật, không phải thao tác form Admin. Test compare trong nhóm browser chỉ assert product count/id, chưa chứng minh đúng SKU/specs/condition/price; không nhận tên test làm bằng chứng selected-variant comparison.
- Xem screenshot `docs/admin/evidence/r2-pdp-variant-switched.png` phát hiện badge gallery vẫn **Mới 100% Fullbox** trong khi variant đang chọn USED và hero condition là **Đã qua sử dụng**. Source `src/components/product/ProductGallery.tsx:116` hardcode. **Phải sửa trước nghiệm thu R2**, truyền condition từ selected variant qua prop, không vá DOM. Kiểm tra đổi NEW/USED/reload, bảo toàn disabled/unavailable CTA.

Data integrity độc lập: `.wrangler/audit-public/r2-data-integrity.json`: **150 original products không đổi mọi field đã baseline, 4 demo đều ARCHIVED/unpublished, 586 NEW +85 COMPLETED orders,1577 READY media, FK clean**. Demo archive qua API200, không xóa lịch sử. Online backup `.wrangler/audit-backups/pre-r2-1793210331327-b65da93ea2843a376d3060d680e68bc0241759acd637c928159fd6791d37ffe8.sqlite` integrity ok,151products tại lúc chụp; không phải backup150 trước seed.

### Prompt tiếp tục sau đăng nhập

Tiếp tục đúng R2, đọc R2-REVIEW. Sửa badge gallery hardcode condition; tăng assertions compare theo contract thực (không claim selected variant nếu API hiện chỉ nhận product IDs). Hoàn tất core R2 rồi báo reviewer. Badge footer/CSP đã giao trong brief R3, không xóa assertion hoặc mở CSP để test xanh. Không chạy R3/R4 đồng thời, không deploy/remote migration/commit/push/reset/stash. Giữ demo archived/audit/local data. Khi core R2 được review xong, vòng tiếp là `docs/ANTIGRAVITY-AUDIT-R3.md`, sau đó R4.
