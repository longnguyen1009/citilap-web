# Review cấu trúc Admin CMS — 2026-10-12

Phạm vi: phục vụ kế hoạch CMS Laptop, Phụ kiện, Tin tức, Order. Đánh giá source ở HEAD `3694c01`; chưa quan sát browser hoặc production. Kế hoạch chi tiết: [ADMIN-CMS-MASTER-PLAN.md](../docs/admin/ADMIN-CMS-MASTER-PLAN.md).

Admin đã có nền tảng media, product publication và navigation có thể kế thừa. Trở ngại chính là hai luồng quản lý sản phẩm, settings chưa bền vững và thiếu quản trị Tin tức.

## Phần giữ lại

Product IDs và quan hệ đơn; ProductStudio/revision; MediaAsset/MediaUsage; NavigationStudio; kết nối CMS hiện có trong StoreFront; tiếp nhận đơn và snapshot.

## Đánh giá theo source

| Tiêu chí | Điểm /4 | Cơ sở và giới hạn |
|---|---|---|
| Tổ chức công việc | 2 | Menu theo module kỹ thuật, sản phẩm có hai điểm vào |
| Độ tin cậy lưu cấu hình | 1 | In-memory API và fallback trình duyệt báo thành công |
| Bao phủ yêu cầu 4 nhóm | 2 | Sản phẩm/đơn có nền; bài viết còn hard-code |
| Visual, responsive, accessibility | Chưa chấm | Cần browser; không suy ra điểm từ CSS |

## Findings

| ID | Mức | Bằng chứng | Tác động / sửa |
|---|---|---|---|
| A01 | MEDIUM | `src/app/admin/layout.tsx:36` và `:37` | Hai editor sản phẩm gây lựa chọn khó hiểu; hợp nhất UX/writer |
| A02 | HIGH | `src/app/api/admin/settings/route.ts` biến cachedSettings; `src/app/admin/settings/page.tsx:74` | Không có lưu bền vững, lỗi server vẫn báo success local; D1 + trạng thái lỗi thật |
| A03 | HIGH | Route settings không gọi auth/CSRF guard; `src/middleware.ts:38` chỉ bảo vệ `/admin/:path*` | Thiếu bảo vệ mutation trong source; bổ sung guard và kiểm chứng API trực tiếp |
| A04 | HIGH | `src/app/admin/settings/page.tsx:39` return trước đoạn reset loading | Đường tải thành công giữ loading; sửa lifecycle và test hai nhánh |
| A05 | MEDIUM | `src/app/(shop)/news/page.tsx:14` | Nội dung fixed, không có authoring; xây Post editor + renderer |
| A06 | MEDIUM | `src/server/services/product-studio.service.ts:8` | Chỉ lấy 100 sản phẩm; danh sách tìm phía client không bao phủ catalog; phân trang/search server |
| A07 | MEDIUM | `docs/admin/ADMIN-04-NAVIGATION.md` mô tả publish toàn aggregate | Các tab chia nhiệm vụ nhưng publication chung; hiển thị change summary trước publish |
| A08 | HIGH | `src/server/services/storefront-cms.service.ts:13` trả null cả 404/503 | Lỗi hạ tầng bị gộp vào fallback; phân biệt trạng thái và kiểm chứng không lộ nội dung đã ẩn |

## Hành động

Ngay: R00/R01 độ tin cậy và bảo vệ dữ liệu. Tiếp: R02–R07 luồng vận hành bốn nhóm và chỉnh nội dung website. Sau: R08–R09 quyền nâng cao, lịch/khôi phục và nghiệm thu.

Không đề xuất viết lại CMS từ đầu vì các service/revision/media hiện có tái sử dụng được. Không kết luận phải thay màu/font trước khi có bằng chứng rendered UI.

## Khoảng trống kiểm chứng

Chưa có kiểm thử browser, direct API, database remote, deployment, usability với người vận hành. Khả năng hidden content lộ qua legacy fallback phải kiểm tra toàn chuỗi đọc; source hiện tại xác nhận việc nuốt lỗi 503, chưa chứng minh từng tình huống lộ dữ liệu runtime.

Verdict: **Block** đối với việc coi CMS đã hoàn thiện theo phạm vi khảo sát source; cần giải quyết các HIGH và nghiệm thu runtime. Không phải kết luận toàn hệ thống production đã hỏng.
