# CitiLap — Backlog chức năng Admin và Storefront tiếp theo

> R07C 2026-10-17: triển khai và full-app local PASS; quote/ship/payment/snapshot đã nối. HTTP12 nhóm, browser5 nhóm, R07B.4 regression16 nhóm; staging/remote chưa chứng nhận. Xem [R07C-ACCEPTANCE.md](R07C-ACCEPTANCE.md).

> Codex R07B.4 2026-10-16: regression và gate full-app local đã PASS: 11 nhóm HTTP/rendering, 5 nhóm browser admin, 6 nhóm browser storefront/cart/checkout. Sửa thêm order unavailable500→409. Staging/remote chưa chứng nhận; R07C chưa tự bắt đầu. Xem [R07B.4-ACCEPTANCE.md](R07B.4-ACCEPTANCE.md). Claims cũ bên dưới giữ làm lịch sử, không thay bằng chứng hiện tại.

Ngày: 2026-10-16. Trạng thái: đặc tả đề xuất, chưa triển khai/nghiệm thu.

Tài liệu bổ sung [master plan V2](ADMIN-CMS-MASTER-PLAN-V2.md), không thay thế phase đang chạy. Giai đoạn R07B.1, R07B.2 và gói vá lỗi concurrency & strict resolver R07B.3 (xem [R07B.2-CODEX-REVIEW.md](R07B.2-CODEX-REVIEW.md), [R07B.2-ACCEPTANCE.md](R07B.2-ACCEPTANCE.md) và [R07B.3-ACCEPTANCE.md](R07B.3-ACCEPTANCE.md)) đã hoàn thành toàn diện với đầy đủ bằng chứng kiểm thử 4 suite regression PASS (16/16, 22/22, 17/17, 3/3), typecheck 0 lỗi, build Cloudflare Exit 0. Giai đoạn tiếp theo là R07C giữ đặc tả riêng tại [Checkout settings](R07C-CHECKOUT-SETTINGS.md).

## 1. Thứ tự và ranh giới

| Gói | Giá trị vận hành | Ưu tiên | Phụ thuộc |
|---|---|---|---|
| R07C | Giá, phí ship và phương thức thanh toán nhất quán khi đặt hàng | P0 trước phát hành | R07B.3 khép CAS, overlap DB atomic và strict resolver; review R07B.2 |
| R08A | Tài khoản riêng, ba vai trò, thu hồi phiên, nhật ký | P0 khi mở nhiều nhân viên | R07C ổn định; kiểm kê mọi API quản trị |
| R08B | Autosave nháp, phục hồi, lịch xuất bản đúng revision | P1 | R08A và writer CMS hiện hành |
| R08C | SEO defaults, redirect và public discovery | P1 trước phát hành | Published projection; pricing và policy đã nối |
| R09A | Hoàn thiện search/compare/wishlist; bỏ trải nghiệm mẫu | P1 trước phát hành | R07C, kiểm kê R04 và nội dung public |
| R09B | UAT, diễn tập migration, staging và runbook | P0 trước phát hành | Các gate bắt buộc đã đóng |
| EXT-01 | Yêu cầu tư vấn gắn sản phẩm/biến thể | P1 đề xuất sau lõi | Contact R06, published catalog, R08A |
| EXT-02 | Tra cứu đơn bằng quyền truy cập riêng của khách | P1 đề xuất | Confirmation R06/R07C, rate limit |
| EXT-03 | Dashboard hàng chờ và kiểm tra nội dung | P1 | Order/contact thật, permissions và public registry |
| EXT-04 | Newsletter lưu thật và quản lý đăng ký | P2, có thể ẩn trước phát hành | Quyết định mục đích thu email và lưu trữ |

EXT là backlog mới để lựa chọn triển khai, không tự động trở thành điều kiện chặn R09 hay mở rộng R07B. Không bổ sung kho/serial, kế toán, coupon, cổng thanh toán, tài khoản khách hàng đầy đủ hoặc gửi email/SMS/Zalo vào các gói này.

## 2. Baseline đã đọc từ mã nguồn

Đây là quan sát tĩnh ngày 2026-10-16, cần kiểm tra lại trước khi code vì có agent đang thay đổi repo:

| Nguồn | Quan sát | Hệ quả thiết kế |
|---|---|---|
| `src/lib/auth.ts` | Phiên admin ký bằng secret chung, payload thời hạn; chưa thể hiện user ID/role | Không gắn nhãn audit là danh tính nhân viên từ session hiện tại |
| `src/app/(shop)/order-tracking/page.tsx` | Form chạy timer và luôn trả không tìm thấy; không gọi lookup thật | Bỏ kết quả giả; triển khai EXT-02 hoặc chuyển sang trợ giúp tra cứu |
| `src/app/(shop)/profile/page.tsx` | Có tên Nguyễn Văn A và nhãn thành viên Vàng viết trực tiếp | Không phát hành như hồ sơ khách thật khi chưa có customer auth |
| `src/app/api/newsletter/route.ts` | Validate email rồi trả 201, chưa thấy ghi persistence trong route | Không báo đăng ký thành công khi chưa lưu; EXT-04 hoặc ẩn form |
| `src/app/api/compare/route.ts` | API so sánh đã có | R09A kiểm tra và hoàn thiện, không tạo hệ thống so sánh thứ hai |
| `src/app/api/cron/publish-scheduler/route.ts` | Scheduler legacy dùng Prisma, bỏ qua studio-owned product | Không coi endpoint này đã giải quyết scheduling revision CMS trên D1 |

## 3. EXT-01 — Yêu cầu tư vấn sản phẩm

### Luồng và màn hình

PDP trạng thái Liên hệ hoặc CTA tư vấn → form tên, điện thoại, lời nhắn tùy chọn → gửi một lần → mã yêu cầu → hàng chờ Liên hệ trong Admin. Sản phẩm Hết hàng vẫn có thể tư vấn, không biến yêu cầu này thành đơn mua. PREORDER giữ mapping hiện hành tới khi quyết định nghiệp vụ được chốt.

Admin hiển thị loại yêu cầu, sản phẩm/variant, thời điểm nhận, trạng thái xử lý và ghi chú nội bộ. Dùng workflow contact R06; không dựng CRM riêng. Liên kết PDP đã ẩn phải hiện “Sản phẩm không còn công khai” trong Admin thay vì link public hỏng.

### Hợp đồng đề xuất

- Request: `productId`, `variantId?`, `name`, `phone`, `message?`, `submissionKey`. Server xác minh variant thuộc product và product public tại lúc gửi.
- Persist: contact ID, loại `PRODUCT_ADVICE`, product/variant reference, tên/SKU snapshot phục vụ nhân viên, trường liên hệ, thời gian UTC, trạng thái workflow. Schema thực tế chốt sau kiểm kê contact service.
- Response public: mã yêu cầu và thông báo đã tiếp nhận; không trả ghi chú, danh tính nhân viên hoặc PII của yêu cầu khác.
- Chống gửi lặp bằng key có phạm vi và payload hash; cùng key khác payload trả conflict. Không gộp hai khách chỉ vì cùng tên/số điện thoại.
- Có giới hạn kích thước, validation điện thoại, rate limit và phản hồi 429; không log số điện thoại/lời nhắn thô. Không tự gửi tin nhắn ra ngoài.

### Tiêu chí nghiệm thu

1. Gửi từ PDP có variant → reload Admin vẫn thấy đúng ngữ cảnh và contact.
2. Double click/retry cùng key không tạo hai contact; payload khác không bị nuốt.
3. Product bị ẩn hoặc variant sai → từ chối, không lộ draft.
4. Sales xử lý được; Editor gọi API trực tiếp bị chặn; ghi chú không xuất hiện public.
5. DB lỗi → form giữ dữ liệu và báo chưa gửi; không hiển thị mã thành công giả.

## 4. EXT-02 — Tra cứu trạng thái đơn an toàn

MVP dùng quyền truy cập xác nhận đơn đã có: khách mở đường dẫn/token nhận khi đặt hàng để xem trạng thái xử lý. Token là credential; không đưa vào analytics, log, sitemap hoặc referrer bên thứ ba. Nếu cơ chế hiện hành dùng URL query, thiết kế đổi sang cookie/session ngắn hạn sau exchange và loại credential khỏi URL khi khả thi.

Mã đơn + điện thoại không đủ quyền trả đầy đủ đơn/địa chỉ. Form hiện tại chỉ hướng dẫn mở liên kết xác nhận hoặc liên hệ shop. Tra cứu qua OTP là phase khác, cần quyết định nhà cung cấp và quyền gửi; không triển khai ngầm.

Public DTO tối thiểu: mã đơn, thời gian tạo, nhãn trạng thái xử lý, dòng hàng snapshot, tổng/ship/method snapshot, hướng dẫn hỗ trợ. Không trả internal note, audit actor, IP hoặc lịch sử thao tác nội bộ. “Hoàn tất” không chuyển thành “Đã thanh toán/Đã giao” khi chưa có dữ liệu tương ứng.

Token phải scoped một đơn, đủ entropy, có thời hạn/thu hồi theo cơ chế confirmation được review. API trả `Cache-Control: private, no-store`; trang noindex. Token sai/hết hạn phản hồi chung, không tiết lộ mã đơn tồn tại; rate limit trước truy vấn tốn tài nguyên. Không tạo endpoint public liệt kê đơn theo số điện thoại.

Gate: token A không đọc B; đơn đổi trạng thái hiển thị đúng sau reload; giá vẫn snapshot sau campaign/settings đổi; token hết hạn và rate limit có UI phù hợp; không lộ note/PII qua response, cache hoặc metadata. Kiểm chứng trên HTTP thật và browser, không chỉ service mock.

## 5. EXT-03 — Dashboard vận hành và chất lượng nội dung

Dashboard trả lời “việc gì cần làm tiếp”: đơn mới, contact chưa xử lý, nháp chờ xuất bản, lịch bị lỗi và nội dung public thiếu dữ liệu thiết yếu. Mỗi card dẫn tới danh sách với filter tương ứng; total do server tính trên cùng phạm vi dữ liệu/quyền.

Các kiểm tra đầu tiên: product public thiếu ảnh chính; variant không có giá hợp lệ; tham chiếu policy/menu bị ẩn; landing có section rỗng; content thiếu SEO title. Đây là cảnh báo chất lượng, không tự sửa dữ liệu hay tự publish. Có phân biệt lỗi chặn mua với gợi ý biên tập.

Sales thấy đơn/contact, Editor thấy nội dung, Owner thấy tổng hợp. Không gọi số đơn hoặc tổng giá trị yêu cầu là doanh thu thực thu. Thời gian lọc hiển thị GMT+7; API chuyển ngày sang khoảng UTC `[from,to)`; số tổng rỗng khác lỗi truy vấn. Hiển thị thời điểm cập nhật và nút thử lại.

Gate: card/filter cùng count; giới hạn ngày đúng ở 00:00 GMT+7; Editor không nhận số liệu/PII đơn qua API; lỗi DB không thành số 0; không có series/doanh thu giả để lấp dashboard.

## 6. EXT-04 — Newsletter tối thiểu, chưa gửi marketing

Chỉ mở form khi có persistence thật. Normalize email và dùng unique constraint để chống trùng; phản hồi chung cho email đã có nhằm tránh dò danh sách. Ghi nguồn form, thời gian, phiên bản lời đồng ý và trạng thái đăng ký. Admin Owner xem danh sách phân trang; export là quyền riêng và có audit/chống formula injection.

Phải có cách rút đăng ký trước khi mở chiến dịch gửi. Không tái sử dụng email checkout làm subscriber mặc định. Không thêm provider, campaign gửi, tracking pixel hoặc tự gửi xác nhận trong gói lưu đăng ký. Nếu chưa quyết định mục đích/retention và cách rút đăng ký, ẩn form public thay vì nhận email không xử lý.

Gate: 201 chỉ sau ghi thành công; retry/concurrent submit không trùng; lỗi DB trả lỗi thật; không có public listing email; reload Admin thấy đăng ký; unsubscribe idempotent và không làm lộ subscriber khác.

## 7. Quy tắc giao gói triển khai

Trước mỗi gói: đọc lại git status, file ownership, code/contract hiện hành và hướng dẫn Next.js tương ứng. Đặt tên migration sau khi đối chiếu nhánh tích hợp; không đặt số trước trong tài liệu. Chỉ sửa file của gói, giữ nguyên thay đổi đang dở của Antigravity.

Mỗi báo cáo tách static, service/data local, HTTP thật, browser toàn app và staging. Ghi command, môi trường, số PASS/FAIL/SKIP; thiếu browser ghi chưa kiểm chứng. Dừng sau gói được giao; không merge, deploy hoặc migrate remote từ tài liệu này.

Chi tiết tiếp theo: [R08 vận hành CMS](R08-OPERATIONS-SPEC.md) và [R09A storefront](R09A-STOREFRONT-COMPLETION.md).
