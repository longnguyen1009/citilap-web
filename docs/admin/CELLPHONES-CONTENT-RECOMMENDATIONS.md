# Đề xuất nội dung CitiLap

Đối chiếu homepage https://cellphones.com.vn/ ngày 24/10/2026 (HTTP 200), ảnh người dùng gửi và các luồng đang có của CitiLap. Chỉ đề xuất; chưa thêm các block dưới đây.

| Ưu tiên | Nội dung nên làm | Cách áp dụng cho CitiLap |
| --- | --- | --- |
| 1 | Chọn theo nhu cầu | Theo ảnh tham khảo: Văn phòng, Gaming, Mỏng nhẹ, Đồ họa – kỹ thuật, Sinh viên, Cảm ứng, Laptop AI. Dùng tag đã lưu để tạo link `/search?tag=...`; chỉ hiện nhóm có sản phẩm. Không suy đoán máy có AI/cảm ứng chỉ từ tên. |
| 1 | Bằng chứng cho laptop cũ/Like New | Trên card ghi đúng tình trạng, bảo hành; PDP có ảnh máy thực tế, báo cáo kiểm tra, pin, màn hình, phụ kiện kèm theo. Thay lời quảng cáo chung bằng dữ liệu từng máy; thiếu dữ liệu thì ghi rõ cần xác nhận. |
| 1 | Giá và ưu đãi dễ hiểu | Gom khung sale theo ngày/giờ; nêu cấu hình áp dụng, giá thường và giá sale. Tách rõ ưu đãi sinh viên với điều kiện thật, không dùng giá rẻ nhất của một cấu hình cho tất cả cấu hình. |
| 2 | Chọn theo ngân sách | Thêm lối tắt dưới 15 triệu, 15–20 triệu, 20–30 triệu; dùng bộ lọc giá hiện có. Kết hợp nhu cầu với ngân sách và so sánh các máy đã chọn. |
| 2 | Nội dung tư vấn sát quyết định mua | Bài “Sinh viên kỹ thuật nên chọn GPU nào?”, “16GB hay 32GB RAM?”, “Checklist mua ThinkPad/Legion cũ”, “Laptop văn phòng 15–20 triệu”. Mỗi bài liên kết tới nhóm sản phẩm đang bán; có tác giả, ngày cập nhật và cấu hình thử nghiệm. |
| 2 | Dịch vụ rõ trước khi đặt mua | CellphoneS nhấn mạnh mua trả góp, thu cũ, giao hàng, tra cứu đơn và hỗ trợ bảo hành. CitiLap nên đưa thời gian giao dự kiến, điều kiện đổi trả/bảo hành, hotline và link tra cứu đơn gần CTA. Chỉ quảng bá trả góp/thu cũ khi đã có quy trình và điều kiện vận hành thật. |

Không sao chép ngưỡng miễn phí giao hàng, voucher, tên chương trình khách hàng hoặc cam kết dịch vụ của CellphoneS. Các thông tin đó không phải chính sách CitiLap.

Tag: tối đa 30 tag/sản phẩm, 60 ký tự/tag, chuẩn hóa chữ thường và loại trùng khi lưu. Có thể đặt `gaming`, `sinh-vien`, `van-phong`, `mong-nhe`, `do-hoa`, `cam-ung`, `laptop-ai`; giữ một cách đặt tên nhất quán. Bộ lọc `/api/search?tag=gaming&tag=mong-nhe` lấy sản phẩm có đủ hai tag.

Đường dẫn: sản phẩm `/laptop/<slug>` hoặc `/phu-kien/<slug>`; danh mục theo đủ chuỗi cha/con. Dưới `/phu-kien`, đường dẫn danh mục được ưu tiên khi trùng; writer chặn xuất bản sản phẩm có slug trùng danh mục con đã lưu. Trang cố định và `/news/...` giữ nguyên.
