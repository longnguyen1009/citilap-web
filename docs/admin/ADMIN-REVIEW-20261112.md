# Admin review — 12/11/2026

Trạng thái phát hành mới nhất: [ADMIN-RELEASE-20261112.md](./ADMIN-RELEASE-20261112.md). Nội dung dưới đây là nhật ký theo thời điểm; các dòng chưa push/chưa sửa có thể đã được thay thế.

Codex review; Antigravity sửa. Trạng thái chỉ ACCEPTED sau review độc lập. Không deploy, push, remote DB writes. Giữ storefront và thay đổi có sẵn (`ConfirmDialog.tsx`, `Toast.tsx`). Baseline: `.wrangler/admin-review-20261112/baseline-src`.

## Vòng sửa

1. Builder: mất dữ liệu khi chọn khối; restore ghi đè; preview validation; conflict; Ctrl+S; page=0; cảnh báo rời trang trùng. Đang giao.
2. Campaigns: giá server canonical; trạng thái archived; revision toggle; overlap; empty publish; variant picker và bulk pricing. Chờ đối chiếu.
3. Product Editor: atomic revision; giá/SKU ma trận; uniqueness; MediaUsage; unpublish; restore; giá sản phẩm. Chờ đối chiếu.
4. Local recovery cho editor: debounce, identity/entity scope, revision-aware, khôi phục có lựa chọn, lỗi quota/storage, tuyệt đối không tự publish. Chờ vòng 1–3.
5. Các trang còn lại: dashboard, analytics, audit, brands, categories, contacts, customers, inventory, media, navigation, orders/list/detail, pages/list/new/edit, post-categories, posts/list/new/edit, products/list/new/edit/preview, product-studio, redirects, settings, users. Review page + API + service; prompt riêng theo lỗi đã xác nhận.
6. P2 và tính năng mới: quota Flash Sale cần thiết kế reservation/cancel/idempotency atomic trước migration; undo/redo và history sau các lỗi dữ liệu. Không coi đề xuất tính năng là lỗi đã xác nhận.

## Cổng nghiệm thu

- Diff nhỏ, không reset/stash/clean; không sửa storefront chỉ để khớp Admin.
- Một regression check chạy được cho logic mới, dùng test harness sẵn có.
- Typecheck, lint file sửa, test liên quan, build Cloudflare cuối mỗi nhóm.
- Admin browser desktop 1280/1440/1920 nếu runtime/auth khả dụng; static/API checks không thay bằng chứng browser hoặc persistence.
- ACK → NEEDS_REVIEW → Codex ACCEPTED / FOLLOW_UP. Report ghi file, lệnh/exit, test cases và giới hạn. Process/CLI exit 0 không chứng minh patch hoàn thành.

## Nhật ký

### Tiếp tục sau khi người dùng khôi phục Antigravity

- 07B Brands: independent race baseline hai writer cùng thắng; sau patch đúng một winner/409 loser, Product/audit không đổi bởi loser. Root chạy authenticated Miniflare suite12/12 PASS, rồi bỏ parser JSON thủ công trùng lặp và token query/header không cần; rerun12/12 PASS. Browser dialog còn chờ runtime ổn định; không suy ra UI PASS từ source.
- 07C Analytics: root chạy actual async page + SQL trên Miniflare riêng:120 bản ghi/12 ngày, aggregate toàn khoảng,50 dòng/trang, tie ordering không trùng/bỏ sót, clamp trang,7 ngày/empty90 ngày, DB-error retry PASS. Đây là check logic/SQL, chưa là browser acceptance.
- Media: tái hiện real Admin UI/mock delayed detail: thư mục vừa chọn bị response detail ghi đè. Giao prompt07D cho ACP session `e3a69f2f-507f-448c-9a6c-0992ae161ce4`; chỉ MediaEditor và regression, giữ dirty-close và revision guard. Quota08A và recovery06B vẫn đang sửa, chưa ACCEPTED.
- ACP thật đã nhận các prompt nhỏ 06A Settings, 07A Audit/clipboard, 07B Brands CAS, 06B recovery, 07C Analytics/dialog feedback. Không ghi đè hoặc quy toàn bộ dirty diff cho các worker này.
- 06A: Codex tái hiện browser trước sửa: phản hồi save chậm ghi đè input mới. Sau sửa, independent browser PASS: giữ input/dirty, request kế dùng revision mới,409 backup lấy nội dung mới nhất,401/storage failure hiện rõ. Video response không làm sống lại dòng vừa xóa trong khi chờ. POST/metadata dùng browser mocks; GET/session/layout thật trên runtime3012/D1 riêng. Worker cũng báo typecheck/lint và đủ ba video paths/reload lock PASS; cần gate snapshot cuối sau các vòng tiếp.
- 07A: Codex tái hiện clipboard báo thành công ngay khi Promise còn pending. Sau sửa independent browser PASS pending/rejected/resolved + đổi filter nhanh giữ loading và rows mới nhất. API Audit/clipboard mô phỏng; không phải bằng chứng persistence. Brands CAS và recovery chưa nghiệm thu.
- Runtime QA3012 dùng `VINEXT_NO_DEV_LOCK=1` vì dev server của người dùng3001 vẫn đang chạy; không dừng server người dùng. Session fixture đã gia hạn trong DB `browser-state` riêng; không in token, không sửa DB chung.
- Bằng chứng mới: `.wrangler/admin-review-20261112/settings-independent-browser.log`, `settings-video-browser.log`, `audit-independent-browser.log`, worker `round-06a-report.md`. Các dòng "credits bị chặn" phía dưới là trạng thái lượt trước.
- 07A **ACCEPTED trong phạm vi** request ownership/clipboard: Codex chạy thêm Redirects unavailable/retry/timer và script worker với refresh+filter chồng lấn, đều PASS. Regression giữ tại `scripts/test-r07a-audit-clipboard.mjs`; independent report `round-07a-report.md`. Không nghiệm thu redirect mutation service từ các check này.

### Trạng thái cuối vòng chạy (xem các log bên dưới để phân biệt baseline)

- **Antigravity bị chặn bởi credits**: ACP báo `Your AI credits balance is too low to continue` ở vòng05 và07. Vòng06 chưa có patch hoàn chỉnh, đã dừng coordinator để tránh ghi tiếp ngoài review. Không có tiến trình Antigravity được hứa chạy nền sau lượt này. Các prompt01–08 còn nguyên để giao lại sau khi credits khả dụng; phải đọc diff mới, không áp mù.
- Vòng01: Builder API13/13 + browser thực chọn khối/backup/reload/restore/Ctrl+S/persistence trong D1 cô lập PASS. Tách component từ phiên khác đưa regex409 trở lại; Codex đã sửa lại dùng `MediaRequestError.status`. Local recovery đầy đủ actor/baseRevision/multi-tab chưa nghiệm thu.
- Vòng02: kiểm thử service D1 thật xác nhận canonical price, giá sale nhỏ hơn giá hiện tại, archived lock, empty publish, overlap, server-owned soldCount PASS. Toggle dùng revision mới đã đối chiếu source. **Quota chưa ACCEPTED**: concurrent checkout, counter race với campaign edit, cumulative customer limit và cancel/reopen vẫn cần vòng08.
- Vòng03: Codex sửa canonical min active variant price trước snapshot, giữ draft isolation; bỏ fallback25 triệu còn sót ở matrix. Product Studio18/18 PASS gồm concurrency và snapshot/projection/admin-list price. MediaUsage revision retention giữ nguyên. Các mục uniqueness/history/restore từ patch song song cần tiếp tục review theo prompt03/08.
- Vòng04/05: Antigravity viết patch Order service/API/UI; Codex sửa fixture sai schema/auth/error-code, JSON400 và bổ sung Inventory guard + intake validation + QC draft không bịa số pin/kiểm định. **21/21** Miniflare checks PASS: wrong product/variant, reservation ownership, serial race, billing CAS/lifecycle, fault-injected rollback, manual SOLD release denied, QC CAS race, invalid intake và unpublished unknown QC facts. Không đồng nghĩa tất cả chức năng inventory đã hoàn thiện: server paging/filter/product picker và warehouse mutation còn trong prompt04.
- Vòng06/07: review route và prompt đã giao ACP thật nhưng chưa có implementation hoàn tất do credits. Settings vẫn có save-response overwrite, Brands thiếu CAS, recovery còn thiếu actor/baseRevision, audit/clipboard/analytics và một số restore/search race còn mở. Không đánh ACCEPTED toàn bộ Admin.
- Browser cuối trên runtime3012/D1 persistence riêng: **25 route × 3 viewport =75 checks PASS**, gồm Product detail fixture. Tám Product tabs ×3 viewport PASS ở lượt riêng. Chủ yếu layout/read/empty/filter; chưa phải mọi thao tác CRUD hay dữ liệu production. Artifacts `.wrangler/admin-review-20261112/browser-evidence/` và log `browser-final.log`.
- Typecheck, scoped lint, Cloudflare build và các suite có log riêng dưới `.wrangler/admin-review-20261112/`. Đây là bằng chứng local. Không deploy/push/commit, không áp migration lên shared local DB hay remote. Toàn bộ DB viết cho QA nằm trong Miniflare hoặc `browser-state` riêng.
- Gate cuối: `tsc --noEmit`0, scoped ESLint0 (không warning), `npm run build:cloudflare`0, `git diff --check`0. Builder UI/persistence0, slow-save backup/storage-error browser0, canonical-price HTTP + rendered Admin0. Đã tắt runtime QA riêng và watcher duyệt lệnh; không để vòng ACP chạy nền.

- Baseline: branch `production`; hai file untracked UI có sẵn. Đã đọc Next.js docs route và client/server.
- Xác nhận source Builder: selectedSectionId trong load deps, stringify đôi, beforeunload đôi, preview fallback thô, list page có thể về 0. Hook useDraftAutosave chủ đích manual-save, không có local recovery.
- CẢNH BÁO SỬA ĐỒNG THỜI: sau baseline có tiến trình khác sửa layout/admin.css/ui/index.ts/useDraftAutosave.ts/DraftRecovery.tsx. Antigravity vòng 01 chỉ sửa phạm vi Builder, không ghi đè các file chung này. Ctrl+S hiện xuất hiện trong hook mới: kiểm tra trước, không đăng ký trùng. Mọi thay đổi ngoài phạm vi phải so baseline và diff hiện tại.
- Đính chính review đầu vào: migration 0010 có `studio_revision_guard` + PK(productId,revision). Test Miniflare `concurrent editors have exactly one winner` PASS. Không có bằng chứng lỗi ghi đè đồng thời Product Studio. `PRODUCT_REVISION` MediaUsage giữ ảnh của history có chủ đích; không xóa retention để giảm bảng. Preview JSON/schema đã trả 400 qua mediaFailure, thiếu issues chi tiết.
- Baseline `node scripts/test-product-studio.mjs`: 12 check PASS gồm CAS concurrency, fail check cũ `removed variant becomes inactive and stock=0` (actual stock=1). Chưa đổi source service. `test-r07b-3-concurrency.mjs` cần HTTP localhost:3001, hiện ECONNREFUSED; không phải test logic đã chạy thất bại.
- Đã lập bảng từng route tại `ADMIN-PAGE-FINDINGS-20261112.md` và prompt vòng 01–08. Vòng 01 có ACK và patch, đang kiểm tra; Codex preliminary review tại `.wrangler/admin-review-20261112/round-01-review.md`. Phát hiện test mới dùng Bearer auth cũ và assertions mirror source; chưa nghiệm thu.
- Source tiếp tục thay đổi ngoài ACP vòng 01: migration 0029 quota/actor, campaign service/contracts, content editors và shared UI. Các vòng sau phải review diff mới trước, không áp prompt baseline mù quáng. Không quy toàn bộ diff cho ACP vòng 01.
- Vòng01 followup: Codex review source + chạy độc lập suite R07A mới 13/13 PASS, preview issues structured/400 và auth thật fixture; source-string tests đã bỏ. Đạt cổng source/API trong phạm vi; browser desktop và full-tree build/typecheck snapshot cuối CHƯA ACCEPTED. Source đang đổi ngoài phiên.
- Chuyển ưu tiên sang vòng05 API integrity đơn hàng trước vòng02/03 vì đã có repro thật: billing thiếu revision vẫn200/PAID/revision0; kho SOLD→AVAILABLE vẫn200. Các prompt vòng02/03 phải review patch đồng thời trước sửa. Không coi các mục chưa giao là đã hoàn thành.
