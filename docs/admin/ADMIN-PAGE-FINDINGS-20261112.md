# Rà từng route Admin — 12/11/2026

Đây là review source, chưa là browser acceptance. Baseline lưu ở `.wrangler/admin-review-20261112/baseline-src`; source đang đổi đồng thời, findings mô tả baseline trừ khi ghi khác. Không đánh dấu page PASS chỉ vì route mở được.

## Findings đã xác nhận

| Route | Mức / kết quả | Bằng chứng và việc cần làm |
|---|---|---|
| /admin/builder, /admin/builder/[id] | P0 mất nháp | SiteBuilderEditor loadPageData deps selectedSectionId; vòng 01 đã giao. Preview 400 có sẵn, thiếu issues; bỏ raw fallback; page clamp; confirm restore/delete rõ. |
| /admin/campaigns | P0 giá sai, bật archive; P1 conflict | campaign.service assertValidCampaignTargets chỉ kiểm tra active/owner; regularPrice client; handleToggle dùng c.revision sau GET. Vòng 02. |
| /admin/products/new, /admin/products/[id] | P0 mặc định matrix sai giá; P1 SKU, restore | matrixBasePrice=25000000; SKU dùng slug+length hoặc RAM/SSD; restore raw snapshot. Vòng 03. CAS hai admin đã PASS test Miniflare nhờ trigger, không phải lỗi overwrite đã xác nhận. |
| /admin/products | Chưa thấy lỗi P0 riêng trong lần đọc đầu | requestId chống response cũ, clamp trang theo catalog.page, archive confirm và feedback có sẵn. Cần browser quick edit/filter/Back/reload và kiểm tra projection giá ở vòng 03. |
| /admin/products/[id]/preview | Cần kiểm chứng | Có publish expectedRevision và sanitize content; cần browser focus, price/variant/public parity sau vòng 03. |
| /admin/product-studio | Route alias | Redirect /admin/products, không có editor thứ hai cần redesign. |
| /admin/inventory | P0 bỏ state machine; P1 validation/paging | UPDATE_SERIAL_STATUS ghi thẳng SerialUnit; có thể SOLD→AVAILABLE. CREATE_SERIAL enum/owner/active chưa chặt; mặc định pin 97 và lời đã kiểm định không có đo thực. GET LIMIT100/200, balances filter client. Vòng 04. |
| /admin/orders/[id] | P0 serial assignment; P1 billing CAS | ASSIGN_SERIAL SELECT chỉ id, bỏ product/variant/status/reservation; unassign serial cũ về AVAILABLE. UPDATE_BILLING không expectedRevision/tăng revision. Vòng 05. |
| /admin/orders | P1 response cũ | fetchOrders không abort/generation; response chậm có thể ghi đè filter mới. Vòng 05; kiểm chứng Back/Forward và ngoài trang. |
| /admin/settings | P1 mất thay đổi khi đang lưu | handleSave setSettings(response.document), setIsDirty(false) vô điều kiện; input vẫn có thể đổi khi request đang chạy. Catch chỉ lưu local khi network exception; 401/409 return trước backup. STORAGE_KEY dùng chung tài khoản và thiếu revision. Vòng 06. |
| /admin/posts/new, /admin/posts/[id] | P1 restore mất nháp; P2 search race | handleRestore confirm không nói mất nháp; setDoc(snapshot) nếu không gõ thêm trong lúc request, ghi đè nháp tồn tại trước restore. Search không abort/generation. Hook manual-save baseline chưa local recovery; shared hook đang đổi. Vòng 06. |
| /admin/pages/new, /admin/pages/[id] | P1 restore/backup tương tự Posts | StaticPageEditor cùng luồng restore và hook; kiểm chứng normalization server trước sửa. Vòng 06. |
| /admin/posts, /admin/pages | Review source đầu chưa thấy P0 riêng | Effect có ignore response cũ; paging có prev clamp/next. Cần browser filter/empty/error/Back/new/edit và confirm dirty khi chuyển route. |
| /admin/post-categories | P2 lỗi delete qua alert | handleDelete catch alert(); thay inline feedback; kiểm chứng CAS create/edit và liên kết bài viết trước xóa. Vòng 07. |
| /admin/categories | P2 beforeunload trùng; recovery scope | CategoriesStudio own beforeunload + useDraftAutosave. Canonical document lưu qua navigation writer có CAS, latestDoc giữ edit trong save. Session recovery không theo actor/revision. Vòng 06/07. |
| /admin/navigation | P1 recovery không revision/actor | recover() sessionStorage global key, parse schema nhưng không metadata revision/actor; shared hook đang đổi. save có lock/latest ref nên giữ edit trong request. Vòng 06. |
| /admin/brands | P1 cập nhật đồng thời last-write-wins | UI payload không revision; brandSchema không expectedRevision, UPDATE Brand chỉ WHERE id/deletedAt. Guard chỉ existence. Không tự thêm migration trước xác định CAS token phù hợp. Vòng 07. |
| /admin/media | Chưa thấy P0 trong lần đọc đầu | MediaEditor có revision và confirm dirty trước close, media usage chặn archive. Cần browser upload/edit/folder/paging/archive đang được dùng. Không xóa PRODUCT_REVISION usage retention. |
| /admin/redirects | P2 báo copy thành công giả | handleCopy không await/catch clipboard.writeText nhưng setCopiedId ngay. Service có redirectPath và chain DB guard. Stale UPDATE có thể vẫn ghi audit trước check meta.changes: cần test để kết luận audit sai. Vòng 07. |
| /admin/users | Cần browser và regression phân quyền | Service dùng adminVersion CAS, owner guard trong atomic batch. Không thấy bằng chứng overwrite cùng kiểu Brands. listAdminAccounts LIMIT200 không pager: kiểm chứng nhu cầu/hiện giới hạn. Không log secrets. |
| /admin/audit | P2 loading request cũ | AbortController có sẵn nhưng finally setLoading(false) vô điều kiện khi request cũ bị abort; spinner có thể tắt trong lúc request mới pending. Cần guard generation/aborted. Vòng 07. |
| /admin/analytics | P2 range/scale | Empty text cố định 30 ngày dù range 7d/90d/all; all tải toàn bộ rows, Math.max(...results.map()) có trần argument. Dùng aggregate/giới hạn detail paging khi data lớn. Vòng 07. |
| /admin/dashboard | Chưa thấy lỗi P0 riêng trong lần đọc đầu | Đã có abort + requestSeq; cần kiểm tra metric/timezone/links với API dữ liệu fixture. |
| /admin/contacts | Chưa thấy lỗi P0 riêng trong lần đọc đầu | Có abort/generation, expectedRevision khi PATCH và giữ note khi 409. Cần browser note đang gõ lúc phản hồi save về, status transition, filtered export/PII. |
| /admin/customers | Chưa thấy lỗi P0 riêng trong lần đọc đầu | Có abort + detailSeq và reset detail khi chọn khách. Cần browser rapid selection/export/PII và API cap/filters. |

## Đính chính danh sách đầu vào

- ProductStudio CAS hoạt động: migration 0010 trigger và revision PK, test concurrent hai writer một thắng PASS. Chỉ thêm guard nếu có tái hiện mới.
- Preview malformed JSON/Zod lỗi đã trả 400 qua mediaFailure; không phải 500 theo code baseline. Thiếu issues field là lỗi thật.
- MediaUsage revision retention có chủ đích, test chặn archive ảnh từng dùng PASS; xóa trước mỗi save sẽ phá restore.
- Campaign picker dùng studio document, không có status field variant trong shape đang đọc. Cần dùng canonical published/projection; không thể sửa bằng filter `v.status` giả định.
- Flash Sale quota là tính năng mới liên quan checkout/cancel/reservation/idempotency, không chỉ thêm ba ô nhập. Chưa làm trước dữ liệu P0.

## Bằng chứng hiện tại

- Browser runtime riêng port3012, D1 persistence riêng `.wrangler/admin-review-20261112/browser-state`: 24 route × 1280/1440/1920 = 72 viewport checks PASS trên fixture phần lớn rỗng. Artifact `browser-evidence/results.json` + screenshots. Đây là smoke/layout/keyboard filters, không phải mọi business flow hoặc dữ liệu production.
- Builder browser thao tác thật PASS: sửa Hero, chọn khối khác rồi quay lại giữ edit; local backup debounce chứa edit; reload và khôi phục đúng edit; Ctrl+S đúng một PUT; GET D1 xác nhận draft đã lưu, publishedRevision giữ1; reload giữ nội dung. Artifact `browser-evidence/builder-flow.json`, `builder-browser-flow.log`. Chỉ DB cô lập.
- Sau tách component từ phiên IDE khác, Builder handleSave lại dùng regex nhận diện409. Vòng06 phải giữ status-based conflict gate; không chốt ACCEPTED source trước khi snapshot cuối ổn định.

- `node scripts/test-product-studio.mjs`: 12 checks đầu PASS (gồm concurrent writer); sau đó fail baseline stock removed variant actual1/expected0. Log `.wrangler/admin-review-20261112/product-baseline.log`.
- Local localhost:3001 chưa chạy khi probe đầu; HTTP campaign concurrency test chưa tới logic do ECONNREFUSED.
- Chưa có browser acceptance 1280/1440/1920, persistence production hoặc deployment trong lượt này.

## Kiểm tra patch đang phát sinh ngoài phiên

### Kết quả sau sửa local (thay thế trạng thái FAIL baseline bên dưới)

- Inventory SOLD→AVAILABLE hiện HTTP409/SOLD giữ nguyên. API yêu cầu expectedUpdatedAt; D1 guard + audit cùng batch, kiểm tra active order/reservation. Intake validate enum/range/owner, QC không tự công khai hoặc bịa pin/checks. Suite Order/Inventory21/21 PASS.
- Billing thiếu expectedRevision bị chặn400; billing/assign CAS, ownership/lifecycle và rollback fault injection PASS. Antigravity viết patch chính; Codex sửa fixture sai schema/auth/error codes và JSON400, chạy độc lập. Test mới `scripts/test-r06-round05-order-integrity.mjs`.
- Price snapshot/projection/admin-list cùng10 triệu khi variant ACTIVE10 triệu và document14 triệu; Product Studio18/18 PASS. Chuẩn hóa khi publish, **không sửa dữ liệu đã lưu từ trước hay backfill production**. Đã republish fixture riêng qua HTTP và đối chiếu giá render Admin.
- Builder13/13 API PASS. Browser thực: đổi khối giữ edit, local restore/reload, Ctrl+S đúng một PUT, persisted draft không publish. Check thêm save chậm giữ newer input + newer backup khi revision tăng, storage quota error hiện rõ. Lệnh runnable trong môi trường QA riêng: `node .wrangler/admin-review-20261112/draft-race-browser.mjs http://localhost:3012`; log/artifact `draft-race-browser.log`, `browser-evidence/draft-race.json`.
- Campaign tests PASS: canonical price, archived/empty guards, overlap, expiry/exact variant, không nhận soldCount client. **Full quota vẫn mở**, không nhầm bộ kiểm thử này với bằng chứng chống oversell/cumulative customer limit.
- Browser cuối25 trang/75 viewport checks PASS trên fixture; không phải CRUD mọi trang. Shared autosave chỉ đã vá xóa nháp mới/disabled Ctrl+S/storage errors; actor identity, stale-baseRevision restore và multi-tab chưa hoàn tất. Settings save race, Brands CAS, inventory paging và các P2 theo prompt vẫn còn.
- Antigravity dừng do thiếu credits trước khi hoàn thành các vòng còn lại. Không có ACCEPTED toàn bộ Admin hoặc production proof.

- Miniflare repro mới `node .wrangler/admin-review-20261112/repro-current-price.mjs` FAIL: Product.price=10 triệu, published document.price=14 triệu và catalog admin.price=14 triệu khi variant.price=10 triệu. Log `repro-current-price.log`. Đây là lỗi thật của patch sync min-price chỉ ghi projection sau khi snapshot đã serialize; prompt vòng03 đã cập nhật.
- Migration0029 đã thêm quota/actor, nhưng search source checkout/order hiện chưa thấy quantityLimit/perCustomerLimit/soldCount enforcement. Không nghiệm thu quota chỉ từ pricing soldCount>=limit hoặc UI controls.
- Inventory P0 đã tái hiện bằng handler thật + loginAdmin/cookie trên isolated Miniflare: HTTP200 đổi SOLD thành AVAILABLE. `repro-current-price.mjs inventory`, log repro-inventory.log.
- Billing đã tái hiện bằng handler thật + loginAdmin/cookie trên isolated Miniflare: thiếu expectedRevision vẫn HTTP200 đổi PENDING thành PAID, revision vẫn0. `repro-current-price.mjs billing`, log repro-billing.log.
