# Hoàn thiện website tự chủ theo từng task

Người dùng giao ngày 28/10/2026: tiếp tục sửa và hoàn thiện website trong lúc người dùng nghỉ, tự kiểm tra mỗi task rồi tiếp tục task kế tiếp, không dừng để hỏi các lựa chọn triển khai thông thường.

## Phạm vi và bảo toàn công việc

- Workspace: `C:/Users/Admin/Desktop/citilap-web2`. Đọc `AGENTS.md`, kiểm tra branch, `git status` và diff trước khi sửa. Giữ mọi thay đổi đang có; không reset, stash, clean, checkout, commit hay push.
- Tiếp tục task đang thực hiện trong cuộc hội thoại Antigravity nếu có. Không chạy hai task ghi cùng file đồng thời. Không thay thiết kế, nội dung hay nghiệp vụ theo suy đoán.
- Không deploy, publish nội dung, thay dữ liệu thật, remote migration, đổi secrets, quyền hoặc cơ chế duyệt lệnh. Quyền hệ thống vẫn áp dụng; gặp bước cần quyền thì ghi BLOCKED và tiếp tục phần độc lập được phép.
- Giữ server và dữ liệu local hiện có. Không cài dependency nếu nền tảng hoặc dependency hiện tại đáp ứng.
- Đọc hướng dẫn Next.js liên quan trong `node_modules/next/dist/docs/` trước khi sửa code Next.js.

## Vòng làm việc

1. Kiểm kê thay đổi và kế hoạch còn dở. Chọn một task nhỏ có bằng chứng lỗi hoặc tiêu chí hoàn thành rõ ràng. Ghi mục tiêu và file dự kiến vào `docs/ANTIGRAVITY-OVERNIGHT-REPORT.md`.
2. Tái hiện lỗi, sửa tối thiểu, chạy kiểm tra phù hợp. Không lấy build/lint làm bằng chứng giao diện hay thao tác trình duyệt đã đạt.
3. Ghi kết quả, file đã sửa, lệnh kiểm tra và kết quả thật, bằng chứng trình duyệt nếu có, phần chưa xác minh. Chỉ đánh PASS khi đủ bằng chứng; thiếu công cụ thì ghi UNVERIFIED hoặc BLOCKED.
4. Tự review diff, xử lý regression do task gây ra, rồi chuyển task tiếp theo. Không chờ người dùng xác nhận từng task. Không mở rộng sang tính năng hay thiết kế mới.

## Thứ tự ưu tiên

1. Hoàn tất task Antigravity đang làm và kiểm tra các thay đổi storefront còn dở.
2. Kiểm tra các luồng mua hàng hiện có: trang chủ, tìm kiếm/danh mục, chi tiết sản phẩm, giỏ hàng, checkout, trang thành công và tra cứu đơn. Chỉ tạo dữ liệu kiểm thử trong môi trường local đã xác định an toàn; không tạo đơn hoặc gửi thông báo thật.
3. Sửa lỗi giao diện/tương tác có thể tái hiện: tràn ngang, nút không hoạt động, trạng thái rỗng/lỗi/loading, điều hướng bàn phím, focus và nhãn truy cập. Storefront kiểm tra 1440/768/390/320px và native zoom 200% nếu có trình duyệt.
4. Admin: trước hết kiểm tra regression từ thay đổi hiện có; theo `docs/admin/ADMIN-PROTOTYPE-ROLLOUT.md` nếu còn task đã được giao. Admin chỉ cần desktop. Không tự nhận sửa file đang có agent khác xử lý.
5. Chạy bộ kiểm tra phù hợp cuối lượt; tổng hợp PASS/FAIL/UNVERIFIED/BLOCKED và việc còn lại. Khi hết task có căn cứ, kết thúc báo cáo, không tự tạo thêm việc.

## Điều kiện báo cáo

Phân biệt local, browser, staging và production. Không tuyên bố staging/production đạt từ kiểm tra local. Giữ nguyên API contracts, auth, giá, tồn kho, thanh toán, lịch sử và dữ liệu published. Với lỗi nghiệp vụ chưa đủ căn cứ, ghi bằng chứng và bỏ qua phần sửa suy đoán.

Đây là chỉ dẫn cho Antigravity tự nối tiếp task. File này không chứng minh có kết nối giám sát hai chiều với Codex, và không thay thế cơ chế cấp quyền của ứng dụng.
