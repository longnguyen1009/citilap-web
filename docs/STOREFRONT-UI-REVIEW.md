# StoreFront: giao diện và nội dung hỗ trợ

## Đã sửa trong local

- Trang liên hệ bỏ thông tin hỗ trợ 24/7, dùng giờ làm việc trong business profile.
- Hướng dẫn mua hàng dùng đúng nút của Product Studio, giải thích ảnh tham chiếu và kiểm tra lại giá/cấu hình.
- Chính sách vận chuyển mô tả phí đang hiển thị tại checkout và bước xác nhận trước giao; không hứa mọi đơn chỉ hiển thị một nhãn phí.
- Đổi trả bổ sung checklist tiếp nhận, sao lưu, biên bản; bỏ cam kết hoàn 100% chưa được hồ sơ chủ cửa hàng xác nhận.
- Bảo mật bỏ thời hạn lưu cố định 2 năm chưa xác nhận; mô tả dữ liệu trình duyệt và thống kê tùy chọn đúng chức năng hiện tại.
- PolicyLayout không suy diễn xuất bản CMS thành phê duyệt pháp lý, không hiển thị ngày cập nhật giả hoặc khẳng định NOINDEX khi metadata khác nhau.
- Mobile hiển thị nội dung trước danh mục hỗ trợ; breadcrumb xuống dòng, menu có aria-current.
- FAQ 8 câu, mở bằng details/summary native; liên kết từ footer và menu chính sách.
- FeatureStrip dự phòng bỏ cam kết nguyên zin, giảm 30–50%, bảo hành 12 tháng đồng loạt.

## Đề xuất tiếp theo

1. Hồ sơ kiểm tra từng máy: ảnh serial đã che phần nhạy cảm, tình trạng ngoại hình, pin đo ngày nào, phụ kiện đi kèm. Chỉ công bố khi có dữ liệu kiểm tra thật.
2. Chốt phạm vi bảo hành pin/sạc/màn hình, thời hạn phản hồi, hoàn tiền và lưu trữ dữ liệu trước vận hành thật; sau đó nhập bản chính sách được duyệt vào CMS.
3. Kết nối email và Zalo OA khi có tài khoản; cần kiểm tra gửi thật, retry và trạng thái giao nhận. Không hiển thị cam kết gửi thành công khi mới ghi hàng đợi.

## Kiểm tra

`node scripts/test-storefront-policies.mjs` kiểm tra HTTP, nội dung đã sửa và liên kết FAQ trên server local đang chạy. Không áp dụng kết quả này cho production hoặc bản CMS chính sách khác.

Chrome: kiểm tra FAQ và 5 trang hướng dẫn/chính sách tại 1440px và 390px, không tràn ngang; mở FAQ và kiểm tra lỗi JavaScript. Ảnh trong `.wrangler/competitor-research/evidence/policy-*.png`.

Các component legacy không còn được gọi như ProductSidebar, ProductPriceOptions, MediaSection vẫn cần rà soát nếu đưa trở lại; không coi chúng là nội dung storefront hiện hành.
