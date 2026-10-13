# CMS Admin + StoreFront — kế hoạch V2

Ngày: 2026-10-13. Căn cứ: yêu cầu mới trực tiếp của chủ dự án. V2 thay thế phạm vi và thứ tự phụ thuộc của master plan cũ khi có khác biệt; giữ mã R00–R09 để không làm mất lịch sử triển khai.

## 1. Mục tiêu, tiến độ và quyền triển khai

Xây CMS dễ dùng như WordPress cho nội dung sản phẩm Laptop/Phụ kiện, trang chủ/landing, Hot Sale, bài viết, trang tĩnh và thông tin website; quản lý đơn, liên hệ, khách hàng và ba vai trò ở mức gọn. StoreFront tiêu thụ dữ liệu đã xuất bản từ Admin xuyên suốt listing → PDP → giỏ hàng → checkout.

Antigravity phụ trách code cả Admin và phần kết nối StoreFront cần thiết. Không áp dụng lại phân công cũ “Codex chỉ Admin, Antigravity chỉ FrontStore” để cản trở nhiệm vụ mới. Codex lập kế hoạch/prompt và review báo cáo. Quyền sở hữu file đang chỉnh vẫn phải kiểm tra trước khi thay đổi.

Tiến độ có thể xác nhận trong lượt lập kế hoạch này:

- R00–R02: có tài liệu trong repo và báo cáo người dùng cung cấp. Số PASS là kết quả được báo cáo, không phải kiểm thử được Codex chạy lại hôm nay.
- R03: working tree có ProductEditor, route API admin products và nhiều thay đổi catalog; chưa thấy `R03-UNIFIED-CATALOG.md`. Coi là đang triển khai/chưa nghiệm thu, không viết lại từ đầu hoặc tự coi đã hoàn thành.
- Lượt này chỉ thay đổi tài liệu; không sửa ứng dụng hoặc dữ liệu.

Phạm vi mới được chấp thuận: cấu hình phí ship, phương thức thanh toán và áp dụng chúng vào checkout; giá Hot Sale có hiệu lực; khách hàng/liên hệ và export; ba vai trò; so sánh sản phẩm; SEO/hiệu năng StoreFront.

Chưa bao gồm: kho số lượng/serial, nhập hàng, kế toán, đối soát, tích hợp cổng thanh toán tự động, CRM automation. Coupon hoãn đến khi checkout có nhu cầu cụ thể. Cấu hình COD/chuyển khoản không đồng nghĩa xây cổng thanh toán hay tự xác nhận đã thu tiền.

## 2. Nguyên tắc dữ liệu dùng chung

### 2.1 Sản phẩm có ba nhóm trạng thái riêng

| Nhóm | Giá trị/ý nghĩa đích | Quy tắc |
|---|---|---|
| Xuất bản | Nháp, Đang hiển thị, Lưu trữ; chỉ báo nháp mới hơn khi xác định được | “Đang bán” trong tab catalog là nhãn kinh doanh, không suy ra còn hàng |
| Tình trạng máy | Mới, Like New và các giá trị legacy còn dùng | Là thuộc tính/biến thể; không trộn với nhãn marketing |
| Tình trạng hàng | Còn hàng, Hết hàng, Liên hệ | Độc lập với publication; quyết định CTA theo bảng quy tắc |

Nhãn “Hàng mới về”, “Bán chạy” là nhãn marketing nhập tay; không khẳng định được tính tự động từ doanh số nếu chưa có nguồn. “Mới 100%/Like New” là condition. UI có thể hiển thị cùng vùng nhưng nguồn và ý nghĩa phải tách.

Availability mặc định nhập tay. Chuẩn bị nguồn MANUAL/SYNC và thời điểm đồng bộ khi thật sự có integration. Chưa có nguồn đồng bộ thì không tạo nút sync giả hoặc gọi ERP bất kỳ. Nếu thêm sync, xác định rõ nguồn thắng, override và lỗi không được tự biến hết hàng thành còn hàng.

PREORDER đã có phải được bảo toàn trong migration/adapter cho đến khi chốt mapping; không tự chuyển thành AVAILABLE. Đích ba trạng thái không cho phép âm thầm làm mất ý nghĩa dữ liệu cũ.

### 2.2 Một nguồn authoring, một projection public có kiểm chứng

- Giữ Product/Variant IDs, SKU, relations, snapshots đơn và media revisions.
- Legacy đang public không được biến mất chỉ vì mở editor hoặc lưu nháp lần đầu.
- Draft không ghi trực tiếp vào dữ liệu public. Restore tạo nháp/revision mới, người dùng preview/publish để áp dụng.
- Tất cả CRUD/bulk/import/restore đi qua service chuẩn hoặc adapter đã kiểm chứng. Chỉ khóa writer cũ sau khi chuyển consumer.
- Nội dung public được lọc theo publication tại mọi đường đọc, không chỉ PDP.
- Guard auth/CSRF/revision từ R01 phải được kế thừa, không thay bằng ẩn nút.

## 3. Cấu trúc quản trị đích

| Menu | Màn hình |
|---|---|
| Tổng quan | Đơn mới, nội dung cần xử lý, thao tác nhanh có dữ liệu thật |
| Sản phẩm | Tất cả, Laptop, Phụ kiện, Danh mục, Thương hiệu, mẫu thông số |
| Nội dung website | Trang chủ, Landing pages, Trang tĩnh, Menu, Footer |
| Khuyến mãi | Hot Sale, Bộ sưu tập |
| Tin tức / Review | Bài viết, Chuyên mục, Thẻ nếu cần |
| Đơn hàng | Danh sách, chi tiết, thông báo đơn mới |
| Liên hệ & Khách hàng | Liên hệ, khách hàng, export |
| Thư viện | Ảnh/video, usage và lưu trữ |
| Cài đặt | Thương hiệu website, liên hệ/social, giao hàng/thanh toán, SEO/301, tài khoản/quyền, nhật ký |

Laptop/Phụ kiện là góc nhìn của cùng catalog/editor. Bộ sưu tập chỉ có một editor dù được tham chiếu từ khuyến mãi, trang chủ và menu. Menu chỉ mở khi chức năng thật hoạt động; không tạo placeholder để đủ sơ đồ.

## 4. Backlog chức năng theo yêu cầu mới

| Mã | Nhóm | Công việc cụ thể | Gate đầu ra |
|---|---|---|---|
| CAT-01 | Danh sách sản phẩm | Server search/page/sort; lọc publication, loại, danh mục, thương hiệu; total đúng; URL giữ ngữ cảnh | Tìm/sửa bản ghi thứ 101+, back-to-list giữ filter |
| CAT-02 | Product editor | Ảnh/biến thể/spec/mô tả/SEO/condition/nhãn; một editor và writer; giá/bảo hành theo contract | Laptop và phụ kiện cũ round-trip không mất dữ liệu; nháp/public riêng |
| CAT-03 | Availability | Còn/hết/liên hệ; nguồn manual/sync thật; CTA nhất quán | Hết/liên hệ không đặt nhầm; không quản lý số lượng tồn |
| CAT-04 | Lịch sử | Danh sách revision, xem thông tin thay đổi, khôi phục nháp có guard | Bản public cũ giữ nguyên tới khi publish; media cũ còn dùng được |
| CAT-05 | Thương hiệu | Tên, slug, logo, mô tả, SEO, ẩn/hiện; trang thương hiệu + sản phẩm | Logo và bộ lọc dùng cùng Brand; không xóa brand còn tham chiếu |
| ACC-01 | Phụ kiện | Mẫu chuột/bàn phím/tai nghe/sạc/hub/balo; variant màu/công suất/kết nối | Editor không ép CPU/RAM; đúng giá/ảnh/variant khi đặt đơn |
| NAV-01 | Menu/danh mục | Hoàn thiện cây, thứ tự, ảnh/SEO, hidden references, mobile navigation | Cùng nguồn desktop/mobile; publish aggregate rõ phạm vi |
| MED-01 | Media | Tìm/lọc, upload lỗi từng file, ALT, usage, picker, ảnh theo vị trí | Không xóa ảnh đang dùng hoặc cần restore; URL R2 chạy thật |
| CONTENT-01 | Tin/Review | Editor trực quan, chuyên mục, featured image, SEO, sản phẩm liên quan, draft/preview/publish | Listing/detail/chuyên mục đọc DB; bỏ bài mẫu hard-code khỏi runtime |
| CONTENT-02 | Trang tĩnh | Bảo hành, đổi trả, vận chuyển, giới thiệu, hệ thống cửa hàng | URL cũ giữ tương thích; chính sách PDP dùng cùng nội dung đã publish |
| ORDER-01 | Đơn đơn giản | Danh sách/chi tiết; mới, đã liên hệ, đã xác nhận, hoàn tất, hủy; ghi chú nội bộ | Transition hợp lệ, audit, snapshot bất biến |
| ORDER-02 | Thông báo | Badge + danh sách đơn chưa đọc, đánh dấu đọc, polling hợp lý | Trạng thái chưa đọc lưu theo tài khoản; không báo lặp do reload |
| CRM-01 | Liên hệ/khách | Xem, tìm/lọc, đánh dấu xử lý liên hệ, lịch sử phù hợp, export theo filter/quyền | Không tự gộp người chỉ vì cùng tên; không tạo khách trùng âm thầm |
| SITE-01 | Page builder | Banner/slider/product grid/category/brand/collection/news/CTA; bật/tắt/kéo thả; landing | Draft/public riêng; preview bằng renderer thật; bàn phím có nút lên/xuống |
| SITE-02 | Nguồn sản phẩm block | Manual IDs + thứ tự hoặc rule typed theo filter/sort/limit | Server resolve, published-only, stable order, empty-state rõ; không nhận SQL tùy ý |
| PROMO-01 | Hot Sale | Tên, thời gian bắt đầu/kết thúc, sản phẩm/variant, giá sale; nháp/publish; countdown | Giá nhất quán card/PDP/cart/checkout; không countdown tự gia hạn |
| PROMO-02 | Collection | `/collection` listing và detail theo route chuẩn; manual/rule; SEO/ảnh/mô tả | Cùng nguồn builder, menu và listing; không tạo collection thứ hai |
| SET-01 | Settings chung | Logo/favicon, contact, showroom, social, footer, SEO defaults | Một lần sửa áp mọi consumer đã map, tồn tại qua restart |
| SET-02 | Checkout settings | Phí ship đơn giản, ngưỡng miễn nếu cần, COD/chuyển khoản/phương thức được bật | Server tính/kiểm tra, snapshot lúc gửi; không tự coi chuyển khoản là đã trả |
| SET-03 | Redirect | 301 nội bộ old→new, kiểm tra chain/loop, dành route hệ thống | HTTP redirect đúng, không open redirect hoặc che admin/API |
| AUTH-01 | Vai trò | Chủ cửa hàng, Biên tập, Bán hàng; permission server; audit | API trực tiếp bị chặn đúng quyền, không chỉ sidebar |
| SF-01 | Listing/tìm kiếm | CPU/RAM/GPU/màn hình/giá/condition, brand/category, sort, pagination, URL query chia sẻ được | Filter dựa schema chuẩn, không lặp hard-code bộ thuộc tính |
| SF-02 | PDP | Variants/gallery/specs/compare/related/warranty | Chọn đúng variant/giá/ảnh; compare cùng loại; policy dùng nguồn CMS |
| SF-03 | Checkout | Form gọn, validation, order confirmation rõ, pricing/availability/settings phía server | Idempotent; snapshot dòng hàng, giảm giá và ship đúng |
| SF-04 | SEO/hiệu năng | Metadata, Product/Breadcrumb structured data, sitemap, canonical, ảnh/cache/CWV | Chỉ public trong sitemap; giá structured data khớp trang; đo trước/sau |

## 5. Những quyết định nghiệp vụ cần thống nhất ngay trong contract

### Hot Sale và giá

- Mốc thời gian lưu UTC, nhập/hiển thị giờ Việt Nam; hiệu lực `[startAt, endAt)` theo giờ server.
- Countdown chỉ trình bày mốc thời gian; không quyết định giá. Chiến dịch hết hạn phải hết giá sale cả khi job nền chưa chạy.
- Ưu tiên sale theo variant. Sale cấp sản phẩm phải có quy tắc rõ cho các variant, không áp một giá vào mọi cấu hình ngoài ý muốn.
- Mặc định chặn hai chiến dịch đã publish chồng thời gian trên cùng variant; chưa có stacking hoặc coupon.
- Một service tính giá dùng chung cho card, PDP, cart, checkout và metadata; cache không giữ sale qua mốc bắt đầu/kết thúc.
- Checkout xác minh lại giá; nếu khác giá khách vừa thấy, trả thay đổi để khách xác nhận, không âm thầm chốt tổng khác.
- Đơn giữ giá gốc, giá thực tính, campaign reference khi có, phí ship và tổng tại thời điểm gửi. Không sửa lại đơn cũ khi campaign thay đổi.

### Order, liên hệ và thông báo

- Luồng mặc định: Mới → Đã liên hệ → Đã xác nhận → Hoàn tất; có thể Mới → Đã xác nhận nếu xác nhận trực tiếp. Nhánh Hủy từ trạng thái chưa hoàn tất; hủy/mở lại cần lý do và quyền.
- “Hoàn tất” là hoàn tất xử lý yêu cầu, không tự xác nhận thanh toán/giao hàng. Không thêm fulfillment engine.
- PENDING cũ mặc định về Mới, COMPLETED về Hoàn tất; giữ timestamp/snapshot và đối chiếu số lượng. Không đặt lại lịch sử cũ thành ngày migration.
- Thông báo R06 là trong Admin; email/SMS/push bên ngoài không tự triển khai hoặc gửi khi chưa chốt kênh.
- Export CSV theo filter và quyền, chống CSV formula injection, tránh PII trong log; không cho Editor truy cập khách/đơn.

### Quyền

| Khả năng | Chủ cửa hàng | Biên tập | Bán hàng |
|---|---|---|---|
| Nội dung sản phẩm/bài/trang/media | Toàn quyền | Sửa và xuất bản | Chỉ xem catalog cần cho công việc |
| Giá/availability/Hot Sale | Toàn quyền | Có theo quyền nội dung thương mại mặc định; ghi audit | Không mặc định |
| Đơn/liên hệ/khách | Toàn quyền | Không | Xem và xử lý |
| Export khách/đơn | Có | Không | Có theo quyền riêng được bật |
| Tài khoản/payment settings/301/cấu hình hệ thống | Có | Không | Không |

Đây là ma trận đề xuất, không phải trạng thái quyền đã triển khai. Owner vẫn là người cấp quyền; không hard-code tài khoản/password mặc định. R08 hoàn thiện role UI; endpoint mới có auth và permission hook từ phase tạo, không chờ cuối mới bảo vệ.

## 6. “Toàn bộ nội dung StoreFront lấy từ Admin”

Nội dung kinh doanh/biên tập thuộc CMS: sản phẩm, thông số, giá, campaign, bài, chính sách, showroom, banner/slider, menu/footer, brand, collection, related products, thông tin liên hệ và SEO tùy chỉnh. Không giữ bộ config thứ hai cho cùng một nội dung.

Mã nguồn vẫn sở hữu renderer, component/layout primitives, validation, nhãn thao tác hệ thống và thông báo lỗi. Secret, token, payment credentials không trở thành nội dung CMS public. Mẫu mặc định chỉ dùng bootstrap có kiểm soát, không che lỗi DB bằng dữ liệu bán hàng giả.

Lập content-source registry: vị trí StoreFront → field/entity Admin → persistence → public DTO → renderer → cache → owner phase → test. Mỗi trường chưa nối consumer phải hiển thị trạng thái đúng, không báo “đã đồng bộ”.

SEO filter: URL query ổn định, chia sẻ và quay lại được. Chỉ index landing/tổ hợp được chọn; xác định canonical/noindex cho tổ hợp tùy ý để tránh bùng nổ faceted URLs. Không đưa mọi query vào sitemap. Quyết định cụ thể kiểm chứng theo tài liệu chính thức ở phase SEO, không tự hứa URL “thân thiện SEO” là đủ.

So sánh: tối đa 3–4 sản phẩm cùng nhóm là mặc định đề xuất; dùng thông số chuẩn hóa, ô thiếu ghi “Chưa cập nhật”; không phát minh thông số. Related manual trước, fallback rule rõ, luôn published-only.

CWV: đo baseline và sau thay đổi theo route, thiết bị, môi trường; tách lab và field. Không gọi đạt CWV production chỉ từ một Lighthouse run. Tối ưu ảnh đúng kích thước, ưu tiên ảnh chính, tránh tải toàn gallery, giữ layout ổn định; cache phải tôn trọng publication và giá sale.

## 7. Lộ trình giữ mã phase, mở rộng theo V2

| Phase | Phạm vi mới | Phụ thuộc/gate |
|---|---|---|
| R00–R02 | Giữ lịch sử, sửa ghi nhận sai; không làm lại | Gate browser còn thiếu tích hợp vào phase chịu ảnh hưởng |
| R03 | Catalog/editor/writer, legacy adoption, pagination, condition/availability/labels, lịch sử + nút restore, brand admin + trang thương hiệu cơ bản | Khép kín Laptop; không viết lại phần đang làm; preview đúng public contract |
| R04 | Phụ kiện + hoàn thiện taxonomy/media + SF-01/SF-02 | Filter/search, variants, so sánh, related, brand listing; warranty dùng contract Page khi R05 xong |
| R05 | Tin tức/Review + trang tĩnh + showroom content | Authoring và renderer đi cùng nhau; PDP policy/related article nối thật |
| R06 | Đơn đơn giản + liên hệ/khách + export + thông báo trong Admin | Giữ checkout hiện có; chuẩn bị snapshot/permission cho R07C |
| R07A | Page builder + landing + menu/footer/settings consumers + collection manual/rule | Cần catalog, content đã public; preview/publish + drag keyboard |
| R07B | Hot Sale + countdown + unified pricing | Sau R07A/các consumer catalog; tích hợp cả PDP và checkout, không chỉ banner |
| R07C | Checkout gọn + shipping/payment settings + confirmation | Tiêu thụ pricing R07B, order R06; giá/ship/method do server xác minh |
| R08 | 3 vai trò + nhật ký thống nhất + autosave/scheduling/khôi phục còn thiếu + SEO defaults/301/sitemap/structured data | Không hoãn guard quyền và security tới đây; lịch sử sản phẩm đã có ở R03 |
| R09A | Audit nội dung còn hard-code + SEO/filter policy + tối ưu cache/ảnh/CWV | Chặn hoàn thành nếu vẫn có nội dung CMS chưa nối consumer |
| R09B | UAT, migration rehearsal, staging, hướng dẫn/rollback | Bằng chứng môi trường rõ, phát hành là bước riêng |

Thứ tự mặc định: hoàn thành R03 đang làm → R04 → R05 → R06 → R07A → R07B → R07C → R08 → R09A/B. Không chạy tất cả phase từ một prompt. Mỗi phase có API/data/Admin/StoreFront cần thiết; không tích tụ backlog “backend xong, frontend để sau” tới cuối.

Gói bàn giao theo phase có thể chia nhỏ để review; ví dụ R03A catalog migration/editor, R03B brand/history và nghiệm thu. Không đánh dấu R03 hoàn thành nếu phần bắt buộc bị chuyển đi mà chưa ghi rõ.

Không ước lượng lịch cố định khi R03 còn đang thay đổi. Sau mỗi gate đo phần còn lại và cập nhật ngày dự kiến có dự phòng tích hợp, không lấy số file/test làm thước đo hoàn thành sản phẩm.

## 8. Gate nghiệm thu mới

1. Catalog: legacy adoption, pagination ngoài 100, restore không publish ngầm, brand và availability nhất quán.
2. Builder: bật/tắt/kéo thả, manual/rule, preview/publish, reload; cấu hình đổi không cần deploy.
3. Promo: trước bắt đầu/đang chạy/đúng lúc hết hạn; giá/structured data/checkout nhất quán, cache không giữ sale cũ.
4. Content: viết bài, liên kết sản phẩm, sửa policy/showroom; public page/PDP dùng nội dung đã publish, không còn bài mẫu.
5. Order/contact/customer: chuyển trạng thái/ghi chú/read state/export, quyền và snapshot đúng.
6. Checkout: tối thiểu trường cần thiết, method bị tắt không gửi được bằng API, shipping/price tính server, gửi lặp không tạo đơn lặp.
7. Roles: mỗi vai trò bị chặn đúng cả UI lẫn API; nhật ký có người/thao tác/đối tượng/thời gian.
8. SEO/content coverage: mọi vị trí kinh doanh có nguồn CMS; 301 không loop, sitemap published-only, schema giá đúng.
9. Browser: desktop/mobile, keyboard/zoom, lỗi mạng/conflict, phiên hết hạn, không mất bản sửa. Component mock test không thay thế toàn app.
10. Phát hành: tách static/service/HTTP/browser/local/staging/production; số PASS là của suite đã chạy, không tái dùng báo cáo cũ.

Lần cập nhật này không chạy kiểm thử ứng dụng. V2 là kế hoạch và tiêu chí đích, không phải chứng nhận các chức năng đã có.

## 9. Prompt triển khai

Prompt hiện hành gửi Antigravity: [PROMPT-R03-V2.md](prompts/PROMPT-R03-V2.md). Prompt yêu cầu đối chiếu code R03 đang làm, cập nhật backlog V2 và chỉ hoàn thành R03. Các prompt R04 trở đi được viết sau báo cáo nghiệm thu để bám đúng kết quả, không giả định trước schema/route đã hoàn thành.
