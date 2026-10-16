# R09A — Hoàn thiện storefront trước UAT

Ngày: 2026-10-16. Đặc tả đề xuất bổ sung V2, chưa triển khai. Tiêu thụ R07B pricing và R07C checkout; không sửa song song các file đang thuộc Antigravity.

## 1. Phạm vi kiểm kê trước khi sửa

Các chức năng search/filter/compare đã nằm trong R04. R09A đối chiếu hành vi thực tế và đóng khoảng trống; không ghi nhận thiếu chỉ vì chưa đọc đủ code. Kiểm kê route, component, public DTO, cache và test cho từng dòng dưới đây. Profile mẫu, order-tracking timer và newsletter chưa persistence là quan sát tĩnh được dẫn tại [backlog tiếp theo](NEXT-FUNCTIONS-ROADMAP.md).

| Luồng | Hành vi đích | Chủ nguồn dữ liệu |
|---|---|---|
| Search/listing | Query chia sẻ được; filter/sort/page server; back giữ ngữ cảnh | Published catalog + spec schema |
| Compare | Cùng nhóm, giới hạn từ contract hiện hành, thiếu spec ghi rõ | Compare contract + public catalog/pricing |
| Wishlist | Lưu trên thiết bị, reload giữ IDs; giá/availability đọc lại | Local IDs + public resolver |
| PDP | Variant/ảnh/spec/giá/CTA đúng, policy và related public | Catalog/pricing/content |
| Cart→checkout | Giá/thông tin cập nhật được giải thích, retry không trùng | Quote R07C + order service |
| Trợ giúp khách | Hotline/showroom/policy từ CMS, không dữ liệu hồ sơ giả | Settings/Page; EXT-02 nếu được chọn |

## 2. Search và filter

Query typed: từ khóa, brand/category, thuộc tính theo product kind, khoảng giá, condition, sort và page; tên key cuối cùng tái dùng API hiện có. Parse/normalize một chỗ; chặn input/limit vượt giới hạn. Đổi filter reset page; back/forward khôi phục UI; malformed query được chuẩn hóa có giải thích khi cần.

Facet laptop dùng spec schema chuẩn; phụ kiện không hiện CPU/RAM không phù hợp. Missing spec không tự biến thành 0/không có. Cần chốt rule multi-select OR trong một facet, AND giữa facet và kiểm thử total. Sort có tie-break ID ổn định. Tìm có dấu/không dấu cần đo và xác minh trên engine hiện tại trước cam kết fuzzy search.

Giá filter/sort phải có ngữ nghĩa rõ với variant: đề xuất giá mua thấp nhất của variant public có thể đặt tại thời điểm server, bao gồm campaign hiệu lực. Sản phẩm Liên hệ không có giá mua không giả thành giá 0; thể hiện riêng. Nếu engine hiện hành chưa hỗ trợ, ghi gap và chọn scope theo review, không sort giá base trong khi card hiện sale mà không giải thích.

Mobile dùng filter drawer có Áp dụng/Xóa, số filter và focus return; desktop có clear-all. Empty là không có kết quả; network/DB error có thử lại, giữ query. Giá/availability thay đổi giữa các page không được bảo đảm snapshot toàn catalog; không quảng bá pagination như dữ liệu bất biến.

## 3. Compare và wishlist

So sánh tái dùng `MAX_COMPARE_PRODUCTS` và contract hiện có; không hardcode giới hạn khác ở UI. Chặn nhóm không tương thích kèm lý do; query chỉ chứa IDs, không giá/spec client. Cho bỏ item, làm nổi thông số khác nhau, cuộn ngang trên mobile với tên hàng dễ đối chiếu; thao tác bàn phím được. Product bị ẩn không được resolve lại từ legacy.

Wishlist MVP ghi rõ “Lưu trên thiết bị này”, không hứa đồng bộ tài khoản. Persist versioned IDs, không PII; storage lỗi vẫn thao tác trong phiên và báo giới hạn khi cần. Resolver published-only; item bị ẩn/bị xóa hiển thị không còn khả dụng hoặc loại có thông báo, không lộ draft. Giá luôn lấy mới, không lấy giá đã lưu. Không tạo API khách hàng/account chỉ để lưu wishlist.

## 4. PDP, giỏ hàng và checkout

- Chọn variant cập nhật đồng bộ ảnh, giá, thông số, CTA và ID gửi vào cart. Variant sai/không còn public không được fallback sang hàng khác khi submit.
- Availability độc lập publication/condition. Hết hàng không đặt được; Liên hệ dẫn hỗ trợ hoặc EXT-01 nếu được giao. Giữ nghĩa PREORDER legacy tới khi có mapping được chốt.
- Policy/warranty từ Page/contract đã publish; related manual/rule theo nguồn hiện hành, không lộ nháp, không gợi ý chính sản phẩm đang xem.
- Khi quote đổi giá/ship/method: hiển thị tổng cũ/mới và yêu cầu xác nhận lại trước create. Không tự submit lại sau 409. Client bỏ dữ liệu lỗi thời sau xác nhận theo contract R07C cuối cùng.
- Retry cùng payload dùng cùng idempotency key; sau sửa payload/quyết định đặt mới áp dụng quy tắc key của order service. Không sinh key mới mỗi click gây hai đơn.
- Success đọc snapshot có access control; refresh vẫn xem được trong thời hạn credential; lỗi confirmation không dẫn khách gửi lại đơn đã tạo.

## 5. Loại trải nghiệm thành công giả

Trước UAT phải xử lý các đường dẫn public tới profile mẫu, tracking timer và newsletter chưa lưu. Với mỗi điểm, chọn rõ: nối persistence và quyền thật trong gói được giao, hoặc gỡ entry point/chuyển trang sang hướng dẫn hữu ích. Không giữ tên khách, điểm thành viên, lịch sử đơn hoặc thông báo đăng ký mẫu như dữ liệu thật. Không tự mở customer auth/OTP/email provider để lấp chỗ trống.

Content-source audit theo registry hiện hành; liệt kê từng fallback và điều kiện kích hoạt. DB lỗi không hiển thị sản phẩm mẫu hoặc số 0 như kết quả thật. Các tham chiếu hotline/showroom phải đọc published settings nhất quán.

## 6. SEO, cache và hiệu năng

R08C sở hữu cấu hình/redirect; R09A kiểm tra consumer. Landing được chọn có canonical riêng; query filter tùy ý có canonical/noindex policy được ghi và kiểm thử. Không đưa mọi query vào sitemap. Public cache tôn trọng publish/unpublish và biên campaign; private order/preview không cache public.

Đo baseline theo route home/listing/PDP/cart/checkout/news tại desktop/mobile trước tối ưu. Ghi build, môi trường, thiết bị, cache lạnh/ấm, công cụ và số lần đo. Theo dõi LCP/CLS/INP bằng dữ liệu phù hợp; lab không chứng minh field CWV. Ưu tiên kích thước ảnh, ảnh chính, giảm JS và giữ layout ổn định; không cải thiện điểm bằng cách bỏ nghiệp vụ hoặc trì hoãn hiển thị giá thật.

## 7. Ma trận nghiệm thu

| Kịch bản | Bằng chứng bắt buộc |
|---|---|
| Filter nhiều facet, page ngoài 100, back/share URL | HTTP total/order + browser URL/state |
| Sản phẩm draft/hidden trong search/compare/wishlist/related | Fixture local + API published-only |
| Sale bắt đầu/kết thúc khi trang đang mở | Giá card/PDP/compare/cart/quote đúng cùng clock; browser thực |
| Compare sai nhóm, thiếu spec, vượt giới hạn | Contract/API + mobile/keyboard |
| Wishlist reload/storage lỗi/product ẩn | Browser persistence và lỗi, không leak draft |
| Variant thay đổi hoặc mất availability trước submit | API từ chối + UI giữ context |
| Double click/timeout/retry sau create | Một order local và success snapshot đúng |
| 401/409/503, mạng chậm/offline | Không success giả; dữ liệu nhập được giữ |
| Metadata/sitemap/canonical/redirect/cache | Response HTTP và rendered head thật |
| Desktop 1440, tablet 768, mobile 390; zoom 200% | Browser toàn app, keyboard/focus, không chỉ deviceScaleFactor |

Mỗi dòng báo PASS/FAIL/SKIP riêng theo lớp. Không đặt tổng PASS trước khi chạy. Chỉ chuyển R09B khi gap phát hành được đóng hoặc có quyết định loại scope rõ. Không deploy/migrate remote trong R09A; staging và quyết định phát hành là gate riêng.
