# Demo local CitiLap

> Ghi chép giai đoạn demo trước đây. Cấu hình hiện tại đã chuyển sang nội dung chính thức theo yêu cầu chủ cửa hàng; xem `docs/OFFICIAL-STOREFRONT.md`. Không chạy lại seed demo lên dữ liệu hiện tại.

Mở http://localhost:3001. Nếu server chưa chạy: `npm.cmd run dev:cloudflare`.

## Dữ liệu đã hoàn thiện

- 1.570 sản phẩm xuất bản: ảnh lưu R2 local, cấu hình, giá, biến thể, gói bảo hành, nội dung và tồn kho mô phỏng.
- Laptop: 2 serial mô phỏng mỗi cấu hình; phụ kiện: 12 đơn vị mỗi cấu hình, kho `DEMO-HN`.
- Trang chủ dùng banner thương hiệu, danh mục có ảnh, nhóm sản phẩm theo ngân sách, 3 bài cẩm nang và CTA showroom.
- Menu, bộ sưu tập, địa chỉ, hotline, giờ mở cửa lấy từ CMS. Ẩn các sản phẩm seed cũ và QA khỏi storefront; giữ lịch sử.
- Bộ chọn laptop hoạt động với danh mục trên 500 máy. Bài viết và CTA trang chủ đọc cấu hình CMS thay cho nội dung mẫu viết cứng.
- COD bật; chuyển khoản tắt. Nhận đơn online tại Hà Nội. Phí vận chuyển được tính lại qua checkout quote.
- Đơn thử `CTL-20261018-NG1W`: dữ liệu mô phỏng, không giao hàng hoặc thu tiền.

## Chạy lại và kiểm tra

`node scripts/test-local-demo.mjs` kiểm tra các route, nội dung CMS, bộ chọn máy, giá quote, COD và showroom Hà Nội.

`node scripts/test-local-demo.mjs --create-order` gửi đơn thử bằng idempotency key cố định. Chỉ dùng local; nếu giá hoặc điều khoản đổi, replay có thể bị từ chối đúng thiết kế.

Script `node scripts/complete-local-demo.mjs --local` đã chạy. Script cần cache nhập ảnh/sản phẩm trong `.wrangler/competitor-research`, database đã migrate và R2 local. Có sao lưu database trước cập nhật trong `.wrangler/backups`; marker `complete-demo-result.json` chặn chạy đè các chỉnh sửa tiếp theo. Đây là bước hoàn thiện dữ liệu nhập sẵn, không phải bootstrap database trống.

## Phạm vi

Giá, tồn kho, bảo hành theo SKU và đơn hàng dùng cho trải nghiệm; banner demo xuất hiện toàn storefront. Ảnh/thông số tham chiếu giữ thông tin nguồn; không phải hồ sơ kiểm định hàng thực tế. Email, Zalo OA và thanh toán online cần cấu hình dịch vụ thật trước khi vận hành. Không thay đổi remote hoặc triển khai production.

Kiểm tra Chrome ở 1440/768/390px: trang chủ không tràn ngang, ảnh đang tải không lỗi; giỏ hàng và so sánh được kiểm tra riêng. Bằng chứng local trong `.wrangler/competitor-research/evidence/demo-*.png`.
