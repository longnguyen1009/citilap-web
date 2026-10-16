# R08 — Quyền, nhật ký và độ tin cậy vận hành CMS

Ngày: 2026-10-16. Thiết kế chuẩn bị; chưa có chứng nhận triển khai. Bổ sung master plan V2. R07B.01 và R07C không bị mở rộng bởi tài liệu này.

## 1. Chia gói triển khai

R08A danh tính/quyền/audit → review và regression → R08B autosave/restore/schedule → review → R08C SEO/redirect. Không triển khai cả ba trong một prompt. Mỗi gói nối đủ persistence, service, API, Admin và public consumer cần thiết.

## 2. R08A — Danh tính và quyền

### Ma trận mặc định

| Capability | Owner | Editor | Sales |
|---|---|---|---|
| Catalog public để hỗ trợ khách | Có | Có | Có |
| Nháp, publish, media, layout, bài/trang | Có | Có | Không |
| Giá, availability, campaign | Có | Có, ghi audit | Không |
| Đơn/contact/khách và ghi chú nội bộ | Có | Không | Có |
| Export đơn/khách | Có | Không | Chỉ khi cấp quyền riêng |
| Shipping/payment, redirect, tài khoản, audit toàn hệ thống | Có | Không | Không |

Capability names là đề xuất: `content.edit`, `content.publish`, `commerce.edit`, `orders.read`, `orders.process`, `contacts.process`, `customers.read`, `pii.export`, `settings.manage`, `users.manage`, `audit.read`. Server là nguồn quyết định; sidebar đọc projection quyền để hiển thị.

### Tài khoản và phiên

Màn hình Owner: danh sách tài khoản, tạo/vô hiệu hóa, đổi vai trò, thu hồi phiên, cấp quyền export. Tái sử dụng User nếu phù hợp sau review; không dựng bảng identity thứ hai mặc định. Chốt cơ chế đăng nhập và hash mật khẩu phù hợp runtime trước implementation; không viết credential mặc định vào migration/seed.

Session phải có subject xác thực và session/version có thể thu hồi. Đổi quyền, khóa tài khoản hoặc reset credential phải ảnh hưởng request tiếp theo theo SLA được kiểm chứng; đề xuất kiểm tra trạng thái/quyền server mỗi request ở quy mô ban đầu. Cookie HttpOnly, Secure trên HTTPS, SameSite phù hợp; rotation khi login/thay đổi quyền; giữ guard CSRF mutation.

Không cho khóa/xóa/hạ quyền Owner cuối cùng. Kiểm tra điều kiện này atomically để hai request song song không làm mất Owner. Không cho tự nâng quyền qua body API. Các account vô hiệu hóa giữ reference audit, không xóa lịch sử.

Secret chung hiện có không mang user identity: phải kiểm kê mọi cookie/bearer/legacy endpoint, lập bảng route→capability. Không để bearer cũ mặc nhiên bypass quyền sau chuyển đổi. Automation cần principal và quyền riêng nếu thực sự có consumer. Bootstrap Owner bằng thao tác operator được kiểm soát, rồi thu hồi cơ chế chuyển tiếp; không đổi secret hoặc migrate remote trong phase thiết kế.

### Audit

Event đề xuất: ID, occurredAt UTC, actorId hoặc actorType hệ thống/legacy xác định được, action, entityType/ID, revision trước/sau, request correlation ID và summary đã redact. Không lưu secret, session, password, raw customer payload hoặc bank credential trong diff. Không gán ngược audit cũ cho nhân viên mới.

Thao tác cần audit: đổi quyền/khóa account; publish/unpublish/restore; giá/availability/campaign; settings/redirect; transition đơn; export PII. Event business thành công và mutation phải nhất quán qua cơ chế batch/transaction phù hợp D1; nếu chưa bảo đảm được, báo rõ và giải quyết trước nghiệm thu. Audit append-only qua API ứng dụng; quyền Owner cũng không có nút sửa/xóa event. Retention/archive cần chính sách riêng, không gọi append-only là bất biến trước người có quyền DB.

Audit UI lọc actor/action/entity/date, phân trang server, link về đối tượng; bản ghi đã mất vẫn hiển thị summary. Export audit không tự nằm trong quyền export PII.

### API và lỗi

Tái dùng envelope dự án. 401 chưa có session hợp lệ; 403 thiếu capability/CSRF; 409 revision conflict hoặc vi phạm Owner cuối; 422 input sai quan hệ; 503 infrastructure. Error code ổn định; không hiển thị DB stack. Auth trước truy vấn PII và trước phân trang/export; bảo vệ cả route legacy, upload, bulk, restore và cron bằng principal thích hợp.

### Gate R08A

Fixture Owner/Editor/Sales/Sales+export/disabled. Kiểm tra mọi nhóm route bằng HTTP trực tiếp; quyền đã thu hồi chặn cả phiên đang mở; hai thao tác hạ Owner song song còn ít nhất một Owner; role injection không hiệu lực; export đúng filter và có audit; CSRF không tạo event thành công; audit không có secret/PII thô. Browser kiểm tra login/logout, phiên hết hạn, thông báo 403 và menu tương ứng. Không dùng UI ẩn làm bằng chứng authorization.

## 3. R08B — Nháp, xung đột và phục hồi

### Autosave

Chỉ autosave draft qua writer hiện hành với expectedRevision; không ghi public. Trạng thái hiển thị: Có thay đổi → Đang lưu → Đã lưu lúc GMT+7 hoặc Chưa lưu/Lỗi. Một request save đang chạy; thay đổi mới được xếp sau với revision nhận được từ server. Response cũ không được ghi đè nội dung mới.

Đề xuất debounce 1–2 giây, nút Lưu ngay và cảnh báo rời trang khi chưa lưu. Không dựa vào debounce/unload để bảo đảm persistence. 409 giữ nguyên bản đang sửa, cho xem phiên bản server và sao chép/phục hồi; không blind retry đè revision khác. Mất mạng/401 giữ bản sửa trong editor; khôi phục đăng nhập không tự publish. Nếu dùng local recovery, key scoped account/entity/schemaVersion, có TTL và xóa khi logout; không lưu PII/secret vào localStorage.

### Lịch sử và restore

Danh sách revision có thời điểm, actor khi xác thực được, loại thao tác, trạng thái published/draft. Preview dùng renderer thật và có quyền, noindex/no-store. Restore tạo draft mới có CAS, giữ public tới khi publish riêng. Media còn được revision/schedule tham chiếu phải được bảo vệ khỏi cleanup. Không giữ mọi asset vô hạn bằng quy tắc mơ hồ: xây retention/reference policy trước khi bật cleanup.

### Scheduling

Schedule tham chiếu entity và revision cụ thể, action, executeAt UTC, trạng thái, actor, attempt/error metadata. UI nhập/hiện GMT+7, preview thời điểm sẽ chạy. Không schedule “bản mới nhất”. Draft mới sau schedule không thay revision đã chọn; UI báo rõ lịch đang trỏ bản cũ.

Job bền vững trên hạ tầng đích claim công việc, xác minh quyền/điều kiện và publish qua writer chuẩn; retry cùng job không tạo hai publication. Claim có lease phục hồi crash, không giữ job RUNNING vô hạn. Nếu publication thay đổi sau khi lập lịch hoặc revision không còn hợp lệ, dừng conflict để người vận hành quyết định; không ghi đè public mới. Hủy lịch và worker chạy đồng thời phải có một kết quả nguyên tử rõ ràng; UI hiển thị kết quả thực tế.

Quyền actor lập lịch phải được kiểm tra lại lúc thực thi; actor đã khóa/mất quyền → BLOCKED và cần Owner xử lý. System executor được ghi riêng với người lập lịch. Không tái dùng scheduler legacy như bằng chứng scheduling CMS; kiểm tra deployment có D1 binding và trigger thực tế.

### Gate R08B

Hai tab cùng sửa → 409 không mất nội dung; response save tới trễ không đè text mới; restart giữ draft server; restore không đổi public; media revision cũ còn xem được; worker retry/crash không publish trùng; sửa draft sau schedule vẫn xuất đúng revision; cancel race và revoked actor xử lý đúng. Staging cần quan sát qua mốc lịch thật, có log job và public revision mới; gọi endpoint thủ công chỉ là kiểm tra HTTP.

## 4. R08C — SEO và redirect

Một nguồn SEO defaults trong Settings; override từ product/content/landing đã publish. Metadata và structured data lấy public projection, giá từ pricing chung; không phát minh review/rating/stock. Sitemap chỉ URL canonical public, không preview/admin/checkout/token/query tùy ý.

Redirect UI: source path, target nội bộ đã validate, enabled, ghi chú, revision và kiểm tra ảnh hưởng. Chỉ 301 cho chuyển vĩnh viễn theo master plan; kiểm thử status thật. Chặn scheme/host ngoài, protocol-relative, encoded bypass, loop/chain, source trùng và route hệ thống `/admin`, `/api`, auth, preview, checkout. Chuẩn hóa path/trailing slash theo route hiện hành; giữ hay bỏ query phải được ghi thành policy và test, không copy token nhạy cảm sang target.

Gate: source→target trả HTTP 301 thật với Location đúng; loop/concurrent conflict bị chặn; draft không sitemap; canonical/robots phù hợp; Product schema khớp giá và variant hiển thị cả lúc campaign hết hạn. Đọc hướng dẫn Next.js metadata/cache hiện hành trước code.

## 5. Migration và nghiệm thu chung

Tên schema/API ở đây là đề xuất, không phải contract runtime. Trước sửa: map writer/consumer, số account/role hiện có, FK, revision và fixture legacy. Migration additive trên DB riêng; giữ IDs, snapshots, references và audit cũ. Data rollback riêng với code rollback; không reset DB hoặc xóa migration của agent khác.

Đóng từng gói khi static, local data, HTTP và browser đạt; staging chưa chạy ghi SKIP kèm lý do. Báo cáo không coi test mock là app thật. Dừng sau gói được giao; không merge/deploy/migrate remote.
