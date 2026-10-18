# Seed local và cải tiến storefront

Ngày: 18/10/2026. Phạm vi kiểm tra: local D1, Worker build, Chrome desktop/mobile.

## Dữ liệu mẫu

```powershell
npm.cmd run db:migrate:local
npm.cmd run db:seed:demo
npm.cmd run dev:cloudflare
```

- 12 laptop, 2 phụ kiện, 3 bài cẩm nang; tất cả ID bắt đầu `demo-`.
- Laptop có máy vật lý ở kho mẫu; một số máy cũ có báo cáo kiểm định mẫu.
- Phụ kiện có tồn 0 để không tạo tồn có thể bán khi chưa có sổ nhập hàng.
- Nhãn `[Mẫu]`, ảnh SVG minh họa, mô tả và báo cáo ghi rõ chưa kiểm chứng trên hàng thật.
- Script chỉ nhận `--local`, từ chối DB không xác định được duy nhất; sao lưu SQLite vào `.wrangler/backups/` trước khi ghi.
- Chạy lại không nhân bản, không ghi đè chỉnh sửa hoặc reset tồn kho. Không chạy seed cũ để thay thế bộ này.
- Chưa seed khách hàng, đánh giá, đơn thanh toán hoặc doanh thu giả.
- Bộ seed phát triển không được dùng làm dữ liệu bán hàng production.

## Chức năng có thể dùng

| Đường dẫn | Chức năng |
|---|---|
| `/chon-laptop` | Chọn ngân sách, công việc, tình trạng, trọng lượng; tối đa 3 gợi ý với lý do và hạn chế. Form GET giữ lựa chọn khi tải lại/chia sẻ URL. |
| `/product/demo-thinkpad-t14` | Ví dụ báo cáo kiểm tra theo mã máy, pin, ngoại hình, ngày đo, bảo hành. Máy đã bán/ẩn không có hồ sơ công khai. |
| `/admin/products/demo-thinkpad-t14` | Tải và sửa hồ sơ máy; lưu riêng với nội dung CMS. Chống ghi đè khi hai người sửa cùng hồ sơ. |
| `/lien-he?intent=appointment` | Yêu cầu hẹn xem máy trong 30 ngày; chọn cơ sở, thời gian GMT+7. Lưu vào hộp thư liên hệ và thông báo admin. Chưa giữ hàng/chưa xác nhận lịch tự động. |
| `/search?q=laptop%20gaming%2020%20trieu` | Hiểu ngân sách trong câu tìm kiếm, chuẩn hóa `RTX4060`; vẫn dùng giá thực tế từ resolver chung. |
| Bảng so sánh | Hiển thị “Phù hợp”, “Hạn chế”, thông tin nâng cấp khi đã nhập trong CMS. Không suy diễn thông số chưa có. |
| `/news` | Ba bài mẫu: chọn máy theo công việc, kiểm tra laptop cũ, RAM hay GPU. |
| `/admin/analytics` | Tổng lượt thao tác theo ngày GMT+7, 30 ngày gần nhất; quyền Owner. |

Thống kê mặc định tắt, người dùng bật/tắt ở footer. Payload chỉ có tên sự kiện; không gửi câu tìm kiếm, URL, email hay điện thoại. Số lượt không phải số khách duy nhất, doanh thu hoặc số đơn đã thanh toán. Rate limiter dùng cơ chế IP hash hiện có; log hạ tầng chịu chính sách lưu log riêng.

Bộ chọn máy là luật cấu hình: RAM từ 16GB, GPU rời cho gaming/đồ họa, nhẹ tối đa 1,6 kg khi chọn mang đi. Không đảm bảo FPS, thời lượng pin hay tương thích phần mềm. Giới hạn 500 mẫu laptop; vượt giới hạn báo lỗi rõ thay vì trả kết quả bị cắt âm thầm. Một cấu hình đại diện được xét cho mỗi sản phẩm; chưa xếp hạng mọi biến thể độc lập.

## Migration và kiểm tra

- `0026_product_inspection.sql`: dữ liệu công khai tách khỏi serial nội bộ, giá vốn và ghi chú kho.
- `0027_storefront_metrics.sql`: bộ đếm sự kiện tổng hợp.
- Hai migration đã áp local; chưa áp remote.

```powershell
npm.cmd run test:storefront-improvements
node scripts/test-storefront-improvements-browser.mjs http://localhost:3001
node scripts/test-r09a-storefront.mjs
npx.cmd tsc --noEmit
npm.cmd run build:cloudflare
```

Test mới dùng SQLite/Miniflare cô lập để kiểm tra seed lặp, giữ dữ liệu đã sửa, khóa ngoại, ngân sách, tìm kiếm, quyền sở hữu hồ sơ, xung đột sửa, ẩn máy đã bán và lưu lịch hẹn. Browser test dùng Chrome thật ở 1440px/390px, ảnh riêng tại `.wrangler/improvements-evidence/`; không ghi đè evidence R09 của phiên khác.

Kết quả local: test mới PASS; hồi quy R09A service/handler 10/10 PASS; Chrome 1440px/390px PASS (bao gồm đồng ý thống kê và payload không chứa thông tin liên hệ); TypeScript PASS; lint các file nguồn sửa PASS; Cloudflare build exit 0. Chạy seed lại trên DB local trả `addedLaptops: 0, products: 14`. Các lỗi thiếu bảng được test R09A chủ động tạo trong DB cô lập để kiểm tra đường lỗi, không phải lỗi DB local đang chạy.

Chưa có bằng chứng production, native zoom 200%, Core Web Vitals thực địa hoặc gửi email/Zalo thành công. Browser test chưa đăng nhập và thao tác editor kiểm định; logic lưu được kiểm tra tại service/D1, route chưa đăng nhập được kiểm tra trả 401.

## Phần còn lại và phụ thuộc

- **Thanh toán online:** hoãn theo yêu cầu. Giữ quy trình COD/chuyển khoản hiện có.
- **Email + Zalo OA:** đã chốt hai kênh, chưa cấu hình/gửi thật. Cần chọn dịch vụ email, xác minh domain gửi, kết nối OA và cấp quyền/template phù hợp. Không lưu khóa trong repo. Số điện thoại không được mặc định coi là Zalo user ID.
- **Báo có hàng/giảm giá:** chưa triển khai. Cần đăng ký có đồng ý, hủy đăng ký, xác thực người nhận và hai kênh gửi hoạt động trước khi tự động thông báo.
- **Combo RAM/SSD:** chưa triển khai giỏ combo. Cần dữ liệu tương thích theo SKU, giá công lắp và tồn linh kiện; không suy ra tương thích từ tên model.
- **Tra cứu bảo hành:** chưa triển khai lịch sử sửa chữa/tra cứu mới. Cần nguồn ngày bắt đầu, phạm vi bảo hành và quyền xác thực khách. Hồ sơ sản phẩm hiện chỉ mô tả bảo hành áp dụng.
- **Đồng bộ hệ thống quản trị/kho:** chưa tích hợp API ngoài repo; cần chốt nguồn dữ liệu gốc và hợp đồng đồng bộ.
- **Hiệu năng/SEO nâng cao:** bộ chọn máy có canonical/noindex cho tổ hợp lọc; các phần SEO/ảnh/checkout cũ được giữ. Chưa coi mục tiêu LCP/INP/CLS là đã đạt nếu chưa đo bản triển khai với dữ liệu thật.

Những phần trên chưa được đánh dấu hoàn tất. Không commit, push, deploy hoặc gửi tin bên ngoài trong đợt này.
