# Nội dung admin từ UI phân loại và chi tiết sản phẩm

Ngày: 26/10/2026. Phạm vi: checkout `staging`, giữ thiết kế hiện tại và thay dữ liệu mẫu bằng dữ liệu quản trị. Admin kiểm tra PC; storefront kiểm tra 1440/768/390/320px.

## Bản đồ nội dung

| Khối storefront | Nguồn admin | Xử lý |
|---|---|---|
| Phân loại cha, dòng máy, phiên bản | `/admin/navigation`: cây danh mục, tên, slug, ảnh, mô tả, hiển thị | Dùng dữ liệu đã xuất bản, giữ menu tự biên soạn và thứ tự hiện có. Thêm H1 cho trình đọc màn hình; hiện mô tả danh mục dưới danh sách. |
| Bộ lọc thương hiệu, nhu cầu, năm, CPU/GPU/RAM/SSD | `/admin/products`: thương hiệu, nhãn nhu cầu, thông số và cấu hình | Dùng search/facets hiện có. Thêm `Năm ra mắt` trong mẫu laptop và nút thêm trường cho sản phẩm cũ. Lọc và facets ưu tiên năm đã nhập, fallback tên/model; không còn giới hạn 2021–2026 hoặc lấy nhầm năm từ mô tả bảo hành. Nhu cầu dùng tags. |
| Giá, giá so sánh, giá khuyến mãi | `/admin/products`, `/admin/campaigns`, cấu hình Flash Sale | Giữ bộ tính giá dùng chung. Biến thể không mượn giá so sánh của sản phẩm cha. |
| Tên, model, thương hiệu, ảnh, bài đánh giá, thông số | `/admin/products/:id` | Bỏ model và thương hiệu Lenovo gán sẵn cho sản phẩm thật; ảnh đổi theo SKU. |
| Chọn cấu hình và màu | `/admin/products/:id` → Cấu hình & Giá → tùy chọn biến thể | Màu là lựa chọn SKU thật: khóa `Màu sắc` hoặc `color`; `Mã màu` nhận `#RRGGBB`. Chọn màu đổi SKU và giá; không thu phụ phí màu từ client. |
| Gói bảo hành | `/admin/products/:id` → Cấu hình & Giá | Dùng tên, mô tả, điều chỉnh giá đã xuất bản. Server kiểm tra lựa chọn; lưu nội dung và giá trong snapshot đơn. Tên gói phải duy nhất. |
| FAQ, quà tặng | `/admin/products/:id` → Bài giới thiệu | Thêm danh sách có thể sửa/xóa; lưu nháp và xuất bản theo revision hiện có. Chưa nhập thì ẩn khối, không tự đưa cam kết mẫu lên website. |
| Phụ kiện mua kèm | `/admin/products/:id` → Bài giới thiệu | Chọn tối đa 8 sản phẩm thật, đổi thứ tự hoặc bỏ. Dùng cấu hình đầu tiên đang công khai; mặt hàng không khả dụng bị ẩn. Giá do bộ tính giá hiện có xác định. Phụ kiện thành dòng hàng riêng trong giỏ và đơn. |
| Đặc quyền an tâm, vận chuyển, banner bên cạnh thông số | `/admin/settings` → Trang sản phẩm | Danh sách nội dung và tối đa 2 banner có tiêu đề, mô tả, liên kết. URL nội bộ hoặc HTTPS. Không sinh sẵn ưu đãi tài chính. |
| Showroom, hotline, giờ mở cửa | `/admin/settings` → Cửa hàng & Hotline | Trang sản phẩm đồng bộ cấu hình hiện hành; không dùng địa chỉ mẫu riêng trong modal. Điểm nhận hàng online theo chính sách server hiện có: Hà Nội. |
| Mua ngay, thanh nổi cuối trang | Modal trên trang sản phẩm; đơn tại `/admin/orders` | Tính giá/phí bằng `/api/checkout/quote`, tạo đơn bằng `/api/orders`, hiển thị mã đơn thật và liên kết xác nhận có token. Không sửa/xóa giỏ hiện có. |
| Chuyển khoản, COD | `/admin/settings` → Vận chuyển & Thanh toán | Chỉ hiện phương thức được server cho phép; hiện hướng dẫn chuyển khoản đã cấu hình. Tạo đơn không tự đánh dấu đã trả tiền. |
| Tư vấn trả góp | Yêu cầu tại `/admin/contacts` | Bảng dự toán chia tiền gốc theo trả trước/kỳ hạn; CTA mở form gửi yêu cầu có ngữ cảnh sản phẩm. Không hứa duyệt vay/0%/thời gian duyệt khi chưa có tích hợp ngân hàng. |
| Phản hồi đánh giá | `/admin/contacts` | Chỉ báo thành công sau khi server lưu; yêu cầu số điện thoại xác minh. Phản hồi gửi nội bộ, chưa công khai hoặc cộng vào điểm đánh giá. Bỏ điểm 4.9/32 lượt mẫu trên sản phẩm thật. |
| Sản phẩm tương tự | `/admin/products/:id`: danh sách liên quan, fallback theo danh mục | Giữ luồng chọn tay và gợi ý hiện có. |

## Tính đúng đơn nhanh

- Server tính giá, bảo hành và phí giao hàng; không nhận tổng tiền do client tự quyết định.
- Lưu snapshot bảo hành và hiển thị trong chi tiết đơn admin qua tên cấu hình và snapshot checkout.
- Đổi giá, điều kiện bảo hành, phí hoặc thông tin chuyển khoản phải kiểm tra lại trước khi gửi tiếp.
- Chống gửi đúp bằng `Idempotency-Key`. Lỗi mạng, 403, 429 và 5xx giữ nguyên yêu cầu để thử lại; đóng/mở modal vẫn lấy cùng yêu cầu trong tab.
- Modal dùng native `dialog`, khóa nền, giữ focus trong modal và hỗ trợ Escape.
- `/demo-lenovo-loq` giữ vai trò xem mẫu; không nhận đơn. Slug sản phẩm thật không đi qua nhánh demo.

## Kiểm chứng

```powershell
npx.cmd tsc --noEmit --pretty false
npm.cmd run build:cloudflare
node scripts/test-product-studio.mjs
node scripts/test-r07c-checkout-settings.mjs --product-detail
```

Fixture kiểm thử dùng D1/R2 tạm, Worker build thật, Edge thật. Ảnh fixture là ảnh thương hiệu, không phải chứng cứ nội dung sản phẩm thực tế. Ảnh thao tác tại `docs/admin/evidence/product-detail-functions/`.

Kết quả local: TypeScript và build Cloudflare đạt; Product Studio 13/13, checkout Worker HTTP/D1 12/12, chức năng UI sản phẩm 8/8. ESLint các phần sửa không có lỗi; `CategoryCatalog.tsx` còn 2 cảnh báo biến chưa dùng từ UI hiện có. Kiểm tra browser bao gồm gửi đơn mất phản hồi rồi thử lại sau khi đóng/mở modal, bảo hành/phụ kiện, nhận tại shop/chuyển khoản, gửi tư vấn/đánh giá và sửa/lưu nháp/tải lại FAQ trên admin PC. Browser không ghi nhận runtime exception.

Không cần migration mới: các trường nội dung nằm trong JSON có revision; bảo hành nằm trong snapshot checkout hiện có. Không seed/sửa DB đang dùng, không deploy hoặc thay đổi production trong đợt này. Chủ cửa hàng cần nhập và xuất bản nội dung thật; dữ liệu cũ thiếu trường mới vẫn mở được.

Tích hợp trả góp ngân hàng, QR đối soát tự động và công khai đánh giá có kiểm duyệt chưa thuộc luồng hiện có. Thêm khi có nhà cung cấp và quy trình nghiệp vụ tương ứng; hiện đã có luồng yêu cầu nội bộ hoạt động. Native browser zoom 200% và môi trường staging/production chưa được chứng nhận bởi fixture này.
