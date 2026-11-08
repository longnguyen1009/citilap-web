# Rà soát Admin theo luồng thao tác

Kiểm tra local tại `http://localhost:3001`, desktop 1280/1440/1920px. Giữ nguyên thay đổi có sẵn trong worktree, API và nghiệp vụ.

| Khu vực | Điều chỉnh |
| --- | --- |
| Khung Admin | Thống nhất nhãn menu; tiêu đề và nhóm hành động tự xuống dòng khi thiếu chỗ. Bỏ quy tắc tự tô đỏ nút cuối mỗi nhóm hành động. |
| Tổng quan | Tách thao tác thường dùng khỏi tiêu đề; gọi đúng số liệu đã/chưa xuất bản; ghi rõ doanh thu toàn thời gian; đếm đúng số đơn trong danh sách gần đây; hiển thị từng sản phẩm tồn thấp thành liên kết. |
| Sản phẩm | Giữ tìm kiếm, trạng thái và loại sản phẩm ở ngoài; gom danh mục, hãng, nhận đơn, sắp xếp vào bộ lọc nâng cao. Điều kiện trong URL được giữ khi đóng và khôi phục sau tải lại. |
| Đơn hàng | Tìm kiếm và thanh toán luôn hiện; khoảng ngày và mốc nhanh nằm trong phần mở rộng. Đóng phần lọc không xóa điều kiện. |
| Kho & Kiểm định | Đưa bảng và bộ lọc lên trước thông tin showroom; tách trạng thái Serial khỏi bảng SKU; lọc bảng SKU theo kho/tên/SKU trên dữ liệu đã tải; ghi rõ giới hạn 100 dòng. |
| Phiếu nhập máy | Nhóm Máy & kho nhận trước Kiểm định & bảo hành; gắn nhãn với ô nhập; nút lưu phản ánh có/không công khai kiểm định; giữ nội dung khi ẩn phiếu; giữ đúng variant khi nhập từ dòng SKU. |
| Trạng thái máy | Dùng nhãn theo Serial, tránh gọi AVAILABLE là Có nhận đơn. |
| Cài đặt | Xếp nhóm theo cửa hàng, giao hàng/thanh toán, sản phẩm, banner/kênh video, cam kết, Flash Sale dự phòng. Chuyển mạng xã hội/video khỏi thông tin cửa hàng; giải thích phạm vi mỗi nhóm; hiện trạng thái chưa lưu và phạm vi lưu tất cả mục. |

## Kiểm chứng

- TypeScript: `npx.cmd tsc --noEmit` PASS.
- ESLint: các file TSX chỉnh trong lượt này PASS.
- `git diff --check` trên Admin, PageHeader và script kiểm tra PASS. Toàn worktree vẫn có khoảng trắng cuối dòng từ thay đổi có sẵn trong `src/components/category/CategoryCatalog.tsx`.
- Cloudflare build: `npm.cmd run build:cloudflare` PASS. Log: `.wrangler/admin-ui-build.log`.
- Chrome: 28 trang, 84 kiểm tra viewport PASS sau khi đợi dữ liệu tải xong; không có exception hoặc API đọc trả lỗi.
- Luồng tương tác PASS: mở lọc bằng bàn phím, URL lọc sản phẩm, đóng lọc giữ điều kiện, tải lại khôi phục lọc sản phẩm, khoảng ngày đơn hàng, đổi bảng Kho, mở/ẩn phiếu nhập giữ nội dung, chuyển đủ sáu nhóm cài đặt.
- Ảnh và kết quả: `.wrangler/admin-workspace-evidence/`, `results.json`.

Chạy lại: `node scripts/test-admin-workspace-ui.mjs`. Kiểm tra nhanh các luồng vừa chỉnh: `node scripts/test-admin-workspace-ui.mjs http://localhost:3001 --flows-only`.

28 trang gồm 24 màn hình danh sách/tạo mới/cấu hình và 4 trang chi tiết có dữ liệu thực: sản phẩm, đơn hàng, bài viết, trang chính sách. Các nhóm Khách hàng, Liên hệ, Danh mục, Thương hiệu, Chiến dịch, Media, Nội dung, Builder, Menu, Analytics, Tài khoản, Nhật ký và Chuyển hướng đều được kiểm tra tải dữ liệu và tràn bố cục desktop; không sửa thêm nếu chưa thấy lỗi thuộc phạm vi này.

## Giới hạn

Chrome đăng nhập local rồi chặn mọi API ghi. Chưa kiểm chứng thao tác lưu/xuất bản/nhập kho xuống DB hoặc production. Không commit, deploy hay chạy migration. Bộ lọc SKU chỉ áp dụng trên tối đa 100 dòng API hiện tại trả về; chưa bổ sung phân trang hoặc đổi API.
