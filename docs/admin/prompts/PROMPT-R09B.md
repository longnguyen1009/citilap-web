# Prompt Antigravity - R09B: UAT, migration rehearsal và runbook

Đây là prompt có điều kiện, dùng SAU báo cáo R09A.1 đã được review. Không chạy cùng R09A.1 trong một lượt. Trước khi giao, đối chiếu lại các gate còn mở trong `R09A-ACCEPTANCE.md`.

Bạn thực hiện R09B cho CitiLap Web2 tại `C:\Users\Admin\Desktop\citilap-web2`. Mục tiêu: chứng minh khả năng vận hành và chuẩn bị phát hành với bằng chứng tách theo môi trường. R09B không mặc nhiên cấp quyền deploy hoặc thay đổi DB thật.

## 1. Điều kiện đầu vào và giới hạn

- Đọc AGENTS.md, git status/diff/log; bảo toàn toàn bộ thay đổi đã có. Xác minh HEAD, build, migration inventory và file ownership.
- Đọc `ADMIN-CMS-MASTER-PLAN-V2.md`, `NEXT-FUNCTIONS-ROADMAP.md`, `R08-ACCEPTANCE.md`, `R09A-ACCEPTANCE.md` và các acceptance R07B/R07C hiện có. Đọc guide Next.js/skill Prisma phù hợp trước thay đổi liên quan.
- Antigravity có thể sửa Admin/API/StoreFront cần thiết cho bug UAT trong scope; không tự mở feature mới, payment gateway, fulfillment, auth khách hàng, OTP hay newsletter.
- Kiểm tra có quyết định nghiệm thu R09A hoặc loại scope rõ ràng từ người phụ trách. Nếu chưa có, chỉ chuẩn bị ma trận/checklist/runbook; báo gate thiếu, chưa chuyển sang thực thi R09B.
- Không reset, stash, commit, merge, push, deploy, migrate/reset DB thật; không đổi DNS, secret hay binding remote. Không chạy `prisma db push` để đồng bộ schema.
- Rehearsal chỉ trên DB disposable. Không lấy dữ liệu/backup thật hoặc truy cập remote nếu chưa được chỉ định và cấp quyền. Không đưa secret, token, PII hay backup vào Git/evidence.

## 2. UAT theo vai trò và nghiệp vụ

Tạo ma trận có ID, vai trò, precondition, thao tác, expected, actual, môi trường, evidence và severity. Bám quyền thực tế trong contract, không tự suy diễn quyền từ tên vai trò.

- Owner: đăng nhập, quản lý quyền/revoke, cấu hình, audit. Editor/Sales: chỉ xem và thao tác đúng phạm vi; UI và API đều chặn hành động trái quyền. Test session hết hạn/revoke và CSRF.
- Catalog/Product Studio: tạo/sửa, variant, ảnh/spec, draft/preview/publish/unpublish; public chỉ nhận published projection, search/compare/PDP/cart nhất quán.
- Media: upload hợp lệ/không hợp lệ, metadata/reference; không xóa media đang được revision hoặc lịch publish tham chiếu.
- Content/Site Builder/navigation: draft không lộ, publish/reorder/ẩn/restore, autosave/reload, hai editor conflict không mất dữ liệu; policy/showroom/SEO phản ánh CMS.
- Campaign: lịch bắt đầu/kết thúc, public price, variant rules, price-change confirmation và snapshot order.
- Checkout: method/shipping settings, form reload, 409 xác nhận lại, response bị mất/retry, một order; confirmation credential chỉ đọc đúng order, không lộ note/PII/token qua cache/log/referrer/metadata.
- Order/contact/customer: chuyển trạng thái, ghi chú/read/export theo quyền; không gọi giá trị yêu cầu là tiền đã thu, không thay đổi snapshot đã chốt.
- Redirect/sitemap/canonical: published-only, 301 không loop, query nhạy cảm bị loại, internal/preview/confirmation không index.
- Browser: desktop/mobile/tablet, keyboard/native zoom, offline/slow response, error/retry, accessibility các luồng chính. Kế thừa evidence R09A có ghi phiên bản; chạy lại những luồng bị thay đổi.

Chạy UAT kỹ thuật bằng fixture được kiểm soát; UAT do chủ cửa hàng/người vận hành duyệt phải có ô sign-off riêng. Không tự ký thay người dùng. Bug phát hiện: sửa nhỏ, để regression, chạy lại gate liên quan. Thiết kế thay đổi lớn cần báo scope trước.

## 3. Diễn tập migration có dữ liệu

- Inventory migration từ repo và schema thực tế của nguồn rehearsal. `d1-migrations` là nguồn chuẩn cho bảng CMS/trigger; Prisma không mirror đầy đủ tất cả bảng.
- R08 có migrations 0021-0025 trong báo cáo cũ; xác minh lại tên, thứ tự, checksum, migration ledger và migration mới trước lập lệnh. Không hardcode điểm bắt đầu theo báo cáo.
- Tạo dữ liệu legacy có ý nghĩa trên DB tạm: users/roles/account collision, draft/published revisions, schedules, redirects, media references, orders/items/events và financial snapshots. Không coi apply toàn bộ migration trên DB rỗng là rehearsal nâng cấp.
- Chụp baseline counts, foreign keys, IDs, revision, order snapshots; apply phần migration thiếu lên DB tạm theo đúng công cụ dự án. Kiểm tra backfill, constraints, login/quyền, published data và count/hash sau nâng cấp.
- Diễn tập lỗi giữa chừng, cách nhận biết migration đã áp dụng, resume an toàn theo migration ledger; không giả định SQL raw có thể chạy lại tùy ý.
- Kiểm tra bootstrap Owner không ghi đè/promote tài khoản legacy trùng email; giữ audit/history và revoke semantics.
- Kiểm chứng backup/restore trên một DB tạm riêng. Nếu chỉ có dữ liệu synthetic, ghi rõ; rehearsal với bản sao legacy thật đã được phép vẫn là gate riêng chưa hoàn thành.
- Rollback ứng dụng phải tương thích schema; ưu tiên forward repair, chặn write khi cần. Không drop additive tables, không khôi phục shared-secret auth, không reset dữ liệu để làm test xanh. Runbook phải giải thích nguy cơ mất writes sau backup và cách đối soát.

## 4. Chuẩn bị staging, thực thi theo quyền riêng

Chuẩn bị gói review trước mọi thay đổi remote:

- Đích staging cụ thể: account/project/Worker, D1/R2 IDs hoặc tên binding, domain; xác nhận không phải production. Không suy đoán đích từ credential mặc định.
- Artifact/build được chọn và cách định danh; nếu working tree chưa commit, ghi rõ không thể coi HEAD là toàn bộ artifact.
- Danh sách migration còn thiếu, plan backup/restore, command chính xác, thứ tự migration/deploy/smoke, cron/bindings/secrets cần có nhưng không ghi giá trị secret.
- Criteria go/no-go, người thực thi, cửa sổ thay đổi, rollback triggers và kiểm tra sau rollback. Nêu compatibility code/schema và rủi ro vận hành cụ thể.

Nếu chưa được cấp quyền deploy/migrate staging: hoàn thành toàn bộ UAT local, rehearsal và runbook khả thi; để staging ở BLOCKED/SKIP với lý do. Trình gói thay đổi cụ thể để xin duyệt cuối cùng, không xin quyền chung chung từ đầu.

Chỉ sau khi được cấp quyền rõ cho đúng đích staging mới thực thi phần tương ứng. Gate staging gồm:

- HTTP/browser smoke trên URL thật; login theo vai trò, publish/unpublish, giá/checkout/confirmation, upload R2, redirect/sitemap và cache.
- Quan sát cron Cloudflare tự chạy qua một mốc lịch: job DONE, log `CMS_SCHEDULE_DONE`, đúng public revision và newer draft được giữ. Gọi scheduled handler thủ công không chứng minh cron tự động.
- Lịch sale theo clock thực, session/cookie domain, request failure và log không leak PII/secret. Phân biệt staging với production.

## 5. Tài liệu và quyết định kết thúc

Tạo/cập nhật:

- `docs/admin/R09B-UAT-MATRIX.md`: cases, kết quả theo lớp/môi trường, evidence, sign-off còn thiếu.
- `docs/admin/R09B-MIGRATION-REHEARSAL.md`: nguồn fixture, schema trước/sau, migration inventory, invariants/counts, lỗi/resume, backup/restore và giới hạn của rehearsal.
- `docs/admin/R09B-RELEASE-RUNBOOK.md`: preflight, lệnh đúng môi trường, backup, migration/deploy, smoke/cron, go/no-go và rollback/forward repair.
- `docs/admin/R09B-ACCEPTANCE.md`: bugs sửa, commands/exit codes, artifact identity, PASS/FAIL/SKIP/BLOCKED từng gate, người cần duyệt và việc còn lại.

Chạy typecheck, scoped lint, build, service/HTTP/browser regression phù hợp; giữ evidence chạy được. Không cộng PASS của suite cũ vào suite mới. Không coi lint/build hoặc component mock là browser/staging proof.

Kết luận riêng: local ready, migration rehearsal ready, staging verified, business UAT signed off, release authorized. Các trạng thái này độc lập. Không ghi R09B hoàn tất nếu gate bắt buộc còn thiếu. Dừng trước production release; không tự commit/push/deploy/migrate remote ngoài quyền được cấp cụ thể.
