# ADMIN-03 — Product Studio

Ngày kiểm chứng: 2026-10-10. Worktree `citilap-web2-admin`, branch `feature/admin-cms-foundation`. Chỉ triển khai và kiểm thử local; chưa commit, merge hoặc deploy.

## Đã triển khai

- `/admin/product-studio`: danh sách, tạo/sửa sản phẩm, mẫu laptop/chuột/phụ kiện/đồ chơi công nghệ, thông số, SEO và bài giới thiệu HTML cơ bản được sanitize phía server.
- Media Library picker ảnh/video, upload ảnh, alt, thứ tự ảnh, ảnh theo cấu hình. Video được chọn từ thư viện YouTube của ADMIN-02.
- Giao diện biên tập responsive ở 1440/768/390 px: danh sách sản phẩm thu gọn thành nút “Chọn sản phẩm” trên màn hình hẹp; toolbar tự xuống hàng; mỗi media hiển thị thumbnail, trường ALT, cấu hình áp dụng và nút đổi thứ tự. Có thể mở lại danh sách để chuyển sản phẩm trên mobile.
- Cấu hình có SKU, tình trạng máy, giá, RAM/SSD/GPU; các gói bảo hành có mô tả, điều chỉnh giá và khuyên dùng.
- Lưu nháp, xuất bản, ẩn khỏi web, xem trước nội dung trong admin; cảnh báo thay đổi chưa lưu và phục hồi sessionStorage khi lưu lỗi.
- Trạng thái web AVAILABLE/PREORDER/CONTACT/UNAVAILABLE độc lập với kho. Không sửa stock hoặc xây nghiệp vụ thanh toán.
- Product vẫn là danh tính catalog. Migration `0010_product_studio.sql` bổ sung tài liệu draft/published và lịch sử bất biến. D1 batch ghi revision, audit, usages và projection public cùng lúc; trigger chặn xung đột revision.
- MediaUsage giữ tham chiếu mọi revision. Publish kiểm tra ảnh có alt, asset READY và object R2 tồn tại. Chưa có chính sách xóa revision cũ.
- API Studio có admin auth, CSRF, no-store; legacy product mutations bổ sung CSRF và từ chối sửa sản phẩm đã chuyển vào Studio. Public list/detail dùng binding D1 thay vì fallback mock theo DATABASE_URL.

## Hợp đồng tích hợp Frontstore

`GET /api/catalog/studio/:slug` trả `{success,data}` từ snapshot đã xuất bản. Không trả draft hay storage key. Sản phẩm chưa xuất bản/đã ẩn trả 404. Xem schema tại `src/contracts/cms/product-studio.ts`.

- `media[]`: url, kind IMAGE/VIDEO, alt, variantId. Ảnh đầu tiên là ảnh đại diện; video là URL YouTube, không tự tải embed.
- `variants[]`: id, sku, name, condition, price, ram, storage, gpu. Nhóm theo condition rồi chọn cấu hình như ảnh tham chiếu.
- `warranties[]`: name, description, adjustment (VND có dấu), recommended. Giá hiển thị = giá cấu hình hoặc giá sản phẩm + adjustment.
- `availability` và `canOrder` là trạng thái tiếp nhận trên website. Không suy diễn “còn N máy” từ các trường này.
- Product/ProductVariant/ProductImage được cập nhật khi publish để tương thích reader cũ; các thông số laptop dạng văn bản được ánh xạ về cột hiện có.

Antigravity cần tích hợp DTO này vào PDP/CTA. Worktree Frontstore chưa được sửa. Chưa chứng minh renderer Frontstore đang chạy hiển thị đầy đủ video, bảo hành và trạng thái mới.

## Bằng chứng local

| Kiểm tra | Kết quả |
|---|---|
| Prisma generate + validate | PASS |
| TypeScript `--noEmit --incremental false` | PASS |
| Targeted ESLint | PASS |
| Miniflare D1/R2 `scripts/test-product-studio.mjs` | 12/12 PASS |
| Playwright `scripts/test-product-browser.mjs` | 11/11 PASS (bao gồm kiểm tra ảnh giải mã và responsive) |
| Cloudflare Vite production build | PASS |

Browser kiểm tra tạo laptop kèm ảnh/cấu hình/bảo hành, draft 404 public, persistence sau reload, publish và ảnh R2 HTTP 200, giá draft không đổi public, preview/Escape, unsaved guard, 1440/768/390 không overflow, mẫu chuột, public API D1, admin 401, CSRF 403, không có JS errors. Riêng thumbnail trong thẻ media được xác minh `img.complete && img.naturalWidth > 0` ở cả ba viewport; dữ liệu ảnh QA là PNG 1×1 nên không dùng ảnh chụp này để đánh giá chất lượng ảnh sản phẩm thật. Bằng chứng ở `docs/screenshots/admin03/verification.json`, `studio-{1440,768,390}.png` và `media-{1440,768,390}.png`. Dữ liệu QA được giữ trong D1/R2 local để xem lại. Script dọn Vite và token `.dev.vars` sau khi chạy.

## Giới hạn còn lại

- Đây là editor nội dung HTML cơ bản, chưa phải trình soạn thảo rich-text kiểu WordPress.
- Mẫu thuộc tính hiện là contract trong code, chưa có màn hình tự định nghĩa AttributeSet/AttributeDefinition.
- Danh sách giới hạn 100 sản phẩm gần nhất, tìm trong tập đó; chưa có pagination catalog lớn.
- Preview là nội dung trong admin, chưa phải preview toàn bộ PDP. Chưa có rollback UI, autosave hoặc scheduling.
- Các cột filter định lượng (ramGb/storageGb/cpuSeries/gpuSeries...) chưa được suy diễn từ chuỗi thông số; cần hợp đồng nhập liệu rõ ràng trước khi mở rộng bộ lọc.
- API cũ ngoài public list/detail vẫn có giới hạn DATABASE_URL; luồng mới phải dùng API Product Studio.
- Chưa kiểm thử staging/production; nghiệm thu end-to-end Frontstore chờ tích hợp Antigravity. ADMIN-03 chưa được coi là hoàn tất toàn bộ các tiêu chí mở rộng của ADMIN-01.
