# R07C — Quy tắc tích hợp đã chốt để chuẩn bị song song

Ngày: 2026-10-16. Bổ sung và ưu tiên hơn các lựa chọn còn mơ hồ trong `R07C-CHECKOUT-SETTINGS.md` và prompt R07C. Chỉ chuẩn bị phần độc lập lúc Antigravity sửa R07B.3; không chứng nhận R07B.3 hoặc checkout đã hoàn thành.

## 1. Phần code bàn giao

`src/server/services/checkout-shipping-policy.ts`: `computeShippingFee` đúng signature đã đề xuất ở prompt R07C. Không import Next, DB, pricing hoặc settings, không truy cập credential. Nhận subtotal **sau** pricing campaign; threshold 0 tắt miễn phí theo ngưỡng, threshold dương dùng >=, pickup ship 0. Giá trị phải safe integer VND không âm; invalid config không bị coerce/làm tròn về 0, kể cả pickup. Hàm không validate cart rỗng hay public/orderability, đó là trách nhiệm service checkout.

Kiểm tra độc lập: `node --test scripts/test-r07c-shipping-policy.mjs`. Đây là test chính sách tiền thuần, không phải D1/API/browser proof. Module chưa có runtime consumer; Antigravity tái dùng hàm sau gate review R07B.3, không viết công thức thứ hai trong client.

## 2. Quote là bắt buộc trong luồng tích hợp

Chọn `POST /api/checkout/quote` dùng chung checkout calculation với createOrder. Không persist Order/Customer/Notification khi quote. Request chỉ chứa target IDs, quantity, shippingMethod, showroomId nếu pickup và paymentMethod nếu đã chọn; không nhận tổng/ship từ client làm authority. Bound theo cart/order contract hiện hành.

Response gồm evaluatedAt UTC, lines với ID/variant/quantity/effective unit price/line total, subtotal, shippingFee, totalAmount, allowedPaymentMethods, phương thức nhận hàng và hướng dẫn ngân hàng công khai khi cần. DTO JSON sạch, không Map, raw settings, internal note hay secret. no-store cho response quote. Lỗi infrastructure là lỗi thật; không default COD/ship 0.

Đổi delivery/pickup/variant/quantity phải refresh quote; response cũ đến trễ không ghi đè lựa chọn mới. Disable submit khi đang lấy quote hoặc quote lỗi; giữ form và cart. Tính lại ở createOrder với cùng pricing/settings context tại một evaluatedAt cho lần tạo. Không dùng quote cache làm giá có hiệu lực vĩnh viễn.

## 3. Xác nhận tổng tiền và settings thay đổi

Create request phải có expected line prices và expected shippingFee/totalAmount đã hiển thị. Đây là dữ liệu xác nhận, không phải giá trị được tin để tính tiền. Nếu line price hoặc shipping/tổng khác: không ghi đơn, trả 409 có tổng cũ/mới và mọi dòng đổi để khách xác nhận lại. Không chỉ kiểm tra giá dòng: Admin đổi phí ship cũng có thể tăng tiền dù dòng hàng không đổi.

Giữ PRICE_CHANGED envelope R07B cho line changes để không phá UI cũ; bổ sung code/DTO cho checkout total/settings change có contract rõ trước code. Payment method vừa bị tắt trả PAYMENT_METHOD_DISABLED, yêu cầu chọn lại; không tự đổi COD↔BANK_TRANSFER và submit. Nếu hướng dẫn ngân hàng thay đổi trong lúc form mở, refresh và yêu cầu review thông tin CK mới trước tạo đơn.

Không có payment method được bật: Admin được lưu với cảnh báo sẽ ngưng nhận đơn mới; quote/create fail closed với thông báo rõ. BANK_TRANSFER chỉ khả dụng khi flag bật và bankAccountInfo không rỗng; flag bật nhưng thiếu hướng dẫn là cấu hình lỗi cần sửa, không nhận đơn CK thiếu nơi thanh toán. Không thêm workflow xác nhận PAID; R06 chưa phải payment engine.

## 4. Idempotency trước live revalidation

Replay của đơn đã commit cùng key và payload phải trả cùng order/snapshot **trước** kiểm tra settings/campaign hiện tại. Nếu method vừa tắt hoặc sale hết sau create, retry timeout vẫn lấy đơn cũ, không trả lỗi mới khiến khách đặt lần hai. Cùng key khác payload phải mismatch, không ghi thêm. Cần xác định fields của payload hash bao gồm lựa chọn checkout/quote acknowledgment; không sửa hash cũ làm replay đơn legacy thất bại ngầm.

409 chưa tạo đơn: sau khách xác nhận giá/tổng mới, cấp key cho payload mới; network retry sau create chưa rõ kết quả giữ nguyên key. Không sinh key mỗi click. Khi người dùng sửa form/cart lúc đang gửi, cần khóa thao tác hoặc freeze payload để retry không thay payload dưới cùng key.

## 5. Snapshot ngân hàng và pickup

Order hiện có shippingFee/paymentMethod chưa đủ để success page hiển thị hướng dẫn cũ sau Owner đổi tài khoản. Cần snapshot text hướng dẫn CK đã xác nhận và pickup showroom ID/tên/địa chỉ đã chọn, cùng settings revision/version phù hợp. Chốt schema sau R07B.3 tích hợp; không đặt số migration trước, không backfill lịch sử bằng settings mới như thể đó là thông tin lúc đặt.

Confirmation đọc snapshot theo token/access guard hiện hành, không đọc hướng dẫn ngân hàng live để thay đơn cũ. Bank instructions là nội dung shop cố ý công khai cho checkout, không phải credential. Không yêu cầu token của đơn chưa tồn tại để xem hướng dẫn trước đặt; token bảo vệ success và PII đơn. Secret/key ngân hàng không vào CMS public.

Pickup chỉ nhận showroom đang được cấu hình hợp lệ trong Settings; server resolve địa chỉ, không tin text từ client hoặc static fallback. Thiếu showroom: không cho chọn pickup, delivery vẫn dùng được nếu cấu hình hợp lệ. Settings đọc lỗi không thay địa chỉ bằng dữ liệu tĩnh. Policy này thay fallback business-profile trong bản thiết kế cũ.

## 6. Acceptance matrix bổ sung

| ID | Tình huống | Kết quả bắt buộc |
|---|---|---|
| C01 | Effective subtotal threshold−1 / threshold / threshold+1 | Ship fee / 0 / 0 |
| C02 | Threshold=0, fee=0, pickup và invalid money | Đúng policy đã test; invalid không fallback |
| C03 | Sale kéo subtotal xuống dưới ngưỡng | Ship tính theo subtotal sale, không theo regular |
| C04 | Quote xong Owner tăng phí ship | 409 tổng cũ/mới; không có Order trước xác nhận |
| C05 | Quote xong method bị tắt hoặc bank text đổi | Chọn/review lại, không tự submit method khác |
| C06 | Cả hai method tắt / bank-only thiếu hướng dẫn | Fail closed rõ; không ghi order |
| C07 | Commit rồi settings đổi, retry cùng key | Cùng order và snapshot, kể cả method hiện đã tắt |
| C08 | Cùng key đổi items/method/shipping hoặc accepted quote | Mismatch theo contract đã chốt, không order thứ hai |
| C09 | Owner đổi tài khoản/showroom sau create | Success giữ thông tin snapshot cũ |
| C10 | Invalid/hidden showroom hoặc client sửa địa chỉ pickup | Server từ chối; không tin client text |
| C11 | DB settings/pricing lỗi và quote response tới trễ | Lỗi thật/không ghi đơn; UI không thay lựa chọn mới |
| C12 | Failure trong order batch | Không partial Order/Item/Event/Notification |
| C13 | Browser mobile/desktop, 409, retry timeout và reload | Form giữ dữ liệu; tổng đúng; một order |

Mỗi case tách pure policy, D1 fixture, HTTP thật và browser. Không gọi 5 test policy là R07C hoàn thành. Fixtures/API server riêng; không ghi DB dev/remote hoặc đụng process 3001. Settings lỗi fail closed tuyệt đối, không có lựa chọn fallback ship 0/COD trong rollback.

## 7. Bàn giao sau R07B.3

Review R07B.3 trước, lấy inventory file đang sửa. Tái dùng policy module, triển khai quote/snapshot/create/UI theo addendum và prompt R07C hiện hành. Sửa baseline cũ nói createOrder đọc giá thô: R07B đã có pricing, R07C chỉ tiêu thụ contract đã review. Gate local/API/browser còn thiếu phải ghi rõ, không tự đóng backlog từ số service tests. Dừng sau R07C, không deploy/migrate remote.
