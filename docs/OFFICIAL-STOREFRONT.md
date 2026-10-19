# CitiLap: nhận diện và nội dung chính thức trong local

Chủ cửa hàng xác nhận đơn vị vận hành là **Hộ kinh doanh CitiLap**, đồng ý xuất bản chính sách và thay logo. Thay đổi lưu trong D1 local và mã nguồn; chưa triển khai lên remote.

## Sửa thông tin trong admin

| Nội dung | Màn hình |
| --- | --- |
| Logo, favicon, liên hệ, giờ làm việc, mạng xã hội, SEO mặc định | `/admin/settings` |
| Menu chính, menu footer, phân loại, bộ sưu tập | `/admin/navigation` |
| 9 trang: giới thiệu, cửa hàng, FAQ, mua hàng, bảo hành, đổi trả, vận chuyển, thanh toán, bảo mật | `/admin/pages` |
| Banner và các khối trang chủ | `/admin/builder` |
| Sản phẩm, ảnh, giá, biến thể và trạng thái nhận đơn | `/admin/products` |

Sửa rồi xuất bản để thay nội dung storefront. Các trang hướng dẫn, thanh toán, bảo mật và FAQ đọc bản xuất bản từ CMS; bản nháp không công khai. Khi gỡ xuất bản các trang này, URL không phục hồi nội dung cũ.

## Nhận diện và điều hướng

- Logo laptop mở nét chữ C, các ô vuông xanh/trắng theo mẫu chủ cửa hàng; slogan “Một chữ tín - Vạn niềm tin”. Wordmark sáng dùng trên header tối, rộng 260px desktop, 210px tablet và 156px mobile. SVG và PNG trong `public/brand/citilap-*`; biểu tượng tab trong `src/app/favicon.ico`.
- Banner `public/brand/citilap-hero.webp` cắt phần ảnh laptop từ tài sản thương hiệu, bỏ chữ và địa chỉ in cũ; tiêu đề và CTA chỉnh trong Site Builder.
- Bỏ banner demo và thanh liên kết phụ dưới menu. Đặt lịch, FAQ và bộ chọn laptop nằm trong menu Về CitiLap; CTA trang chủ tiếp tục dẫn tới bộ chọn máy.
- Bỏ mục Hot Sale khi chưa có chương trình khuyến mãi thật. Giữ nhóm gaming, văn phòng, đồ họa, MacBook và phụ kiện; menu footer có giới thiệu, cửa hàng, liên hệ, điều khoản và bảo mật.

## Sản phẩm và dữ liệu vận hành

1.570 sản phẩm nhập từ nguồn tham khảo vẫn được xuất bản, nhưng chuyển sang `CONTACT`; không dùng tồn kho mô phỏng làm bằng chứng hàng có sẵn. Giá nguồn chưa có trả về 0 nội bộ và hiển thị Liên hệ báo giá; giá nguồn có sẵn được ghi rõ tham khảo ở trang chi tiết và bộ chọn máy. Checkout từ chối mua sản phẩm cần xác nhận. Không tự thêm gói bảo hành, giảm giá hoặc doanh số giả.

Trước khi chuyển sản phẩm sang nhận đơn, cần cập nhật giá bán, hồ sơ hàng thật, gói bảo hành và kho thực tế. Các serial, kho `DEMO-HN`, số dư và đơn thử từ giai đoạn trước vẫn giữ lịch sử trong admin, không phải hàng thực. Không đổi trạng thái hàng loạt để dùng số dư đó làm tồn kho bán thật. Nguồn ảnh và trạng thái quyền sử dụng vẫn nằm trong manifest nhập liệu; xác minh quyền dùng ảnh trước công khai trên Internet.

## Thông tin còn thiếu từ chủ cửa hàng

Đã có tên hộ kinh doanh; chưa có mã số thuế, số/ngày/cơ quan cấp đăng ký và địa chỉ đăng ký pháp lý. Không dùng địa chỉ showroom để tự suy ra địa chỉ đăng ký. Không tự khai đã thông báo/đăng ký với Bộ Công Thương. Các mục này chưa được xác minh, nên bản local chưa chứng minh đủ điều kiện pháp lý để vận hành công khai.

Email và Zalo OA tự động chưa có tài khoản dịch vụ; link Zalo hiện là số liên hệ đã xác nhận. Không có cổng thanh toán online. COD chỉ là phương thức tiếp nhận được cấu hình, không chứng minh đã thu tiền.

## Kiểm tra và khôi phục

- `node scripts/test-official-store.mjs`: 9 trang xuất bản, logo/favicon, hai dải nội dung đã bỏ, chặn checkout hàng tham khảo, bộ chọn máy và FAQ an toàn.
- `node scripts/test-storefront-policies.mjs`: nội dung chính sách và liên kết FAQ.
- Chrome local 1440/768/390: logo tải được, không tràn ngang, submenu Về CitiLap mở bằng focus/hover, FAQ mở đóng bằng phần tử native.
- `scripts/complete-official-store.mjs --local` dùng cache nhập sản phẩm và database đã có; có marker chặn chạy đè. Chỉnh sửa tiếp qua admin.
- Sao lưu trước chuyển đổi: `.wrangler/backups/before-official-store-*.sqlite`. Không phục hồi đè khi server đang ghi dữ liệu; giữ lịch sử revision CMS để sửa từng nội dung.
