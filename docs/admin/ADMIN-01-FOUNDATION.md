# ADMIN-01 — Nền tảng CMS CitiLap

Ngày: 2026-10-10. Baseline khảo sát: `6635fb1`. Phạm vi: audit, kiến trúc, hợp đồng dữ liệu và phối hợp; chưa xây màn hình CMS, API CMS hay migration.

## Mục tiêu và giới hạn

Admin quản lý nội dung xuất hiện trên Frontstore: sản phẩm laptop/phụ kiện/đồ chơi công nghệ, ảnh/video, bài viết, trang, menu và bố cục. Giữ Scope Reset STORE-10: không quản lý kho/serial, không trừ hoặc giữ kho khi đặt hàng, không thu chi hay xử lý thanh toán. Đơn hàng/hộp thư hiện tại tiếp tục là tiếp nhận thông tin.

Không cài WordPress hoặc thay stack. Kế thừa Next.js, D1, Prisma và R2 hiện tại. Nội dung thường nhật không cần deploy; loại block mới cần developer bổ sung renderer và version contract.

## Audit tĩnh và công việc bắt buộc

| Bằng chứng | Hiện trạng | Xử lý / chủ sở hữu |
|---|---|---|
| `src/app/api/products/route.ts`, `categories/route.ts`, `brands/route.ts` | Kiểm tra `DATABASE_URL`, còn fallback mock; không tương đương xác định binding D1 | ADMIN-03/04: truy vấn bằng service D1; lỗi rõ ràng, không fake success; giữ public DTO tương thích |
| Các mutation sản phẩm/danh mục và restore version | Một số dùng `requireAdmin` thay vì `requireAdminMutation` | ADMIN-03/04: kiểm kê từng method, bổ sung CSRF và test quyền trước phát hành |
| `src/app/admin/settings/page.tsx` | Lưu localStorage, chứa cả cấu hình phí ship/thanh toán | ADMIN-04: cấu hình website thật trên D1; loại khỏi UI CMS các điều khiển ngoài scope, không xóa dữ liệu lịch sử |
| `Product`, `ProductVariant`, `Category`, `Brand` | Có mô hình catalog, cây danh mục và thông số laptop | ADMIN-03: tái sử dụng, thêm mẫu thông số phụ kiện; không lập catalog thứ hai |
| `ProductImage`, `/api/upload`, `ImageUploader` | Ảnh theo sản phẩm, R2, giới hạn 5 MB/file; chưa là thư viện tổng quát | ADMIN-02: MediaAsset/MediaUsage, adapter ảnh cũ, picker chung |
| `ProductVersion`, `ProductEditLog` | Đã có nền tảng revision/audit riêng sản phẩm | Giữ nguyên; revision CMS dùng cùng nguyên tắc, không thay snapshot cũ |
| `src/app/(shop)/news/page.tsx` | Bài viết hard-code | ADMIN-05: nội dung D1 và renderer do Frontstore tích hợp |
| `src/config/business-profile.ts` | Thông tin kinh doanh có nguồn xác nhận | Chuyển sang settings có migration rõ ràng khi đến ADMIN-04; không ghi đè thông tin đã duyệt |
| Schema hiện tại | Chưa có Page/Post/MediaAsset/Layout/Menu tổng quát | Bổ sung tăng dần theo phase, chưa áp migration trong ADMIN-01 |
| Frontstore working tree lúc khảo sát | Homepage, Header, MobileBottomNav, CategoryGridSection, category-showcase đang thay đổi | Antigravity sở hữu; không chỉnh/định dạng các file này |

Đây là bằng chứng đọc code, không phải kiểm thử API hoặc D1 live. Báo cáo PASS STORE-14 không thay thế việc xác minh các luồng admin trên Workers.

## Cấu trúc menu đích

1. Tổng quan: nháp, lịch xuất bản, nội dung thiếu ảnh và thao tác nhanh; không dashboard doanh thu/kho mới.
2. Sản phẩm: tất cả, thêm mới, danh mục, thương hiệu, bộ thuộc tính, bộ sưu tập.
3. Thư viện: ảnh, video, file đang sử dụng.
4. Nội dung: bài viết, chuyên mục bài viết, tag, trang nội dung.
5. Giao diện: trang chủ, menu, banner, mẫu trang, footer.
6. Tiếp nhận: đơn hàng, hộp thư liên hệ hiện có.
7. Cài đặt website: thương hiệu, showroom, SEO, người biên tập/quyền.

Đây là information architecture, không phải các route đã tồn tại. Chỉ thêm mục điều hướng clickable khi có màn hình hoạt động. Không tạo sidebar với link chết. Không sửa shell admin trong phase hợp đồng này.

## Mô hình dữ liệu đích

| Thực thể | Trách nhiệm | Phase |
|---|---|---|
| MediaAsset | ID, storage key/provider, loại, MIME, kích thước, width/height/duration, trạng thái xử lý, alt mặc định | 02 |
| MediaUsage | asset + owner type/id + revision/slot; theo dõi cả bản nháp và bản public | 02 |
| AttributeSet / AttributeDefinition | Mẫu thông số theo nhóm hàng; giữ cột laptop đang phục vụ filter | 03 |
| Collection / CollectionItem | Nhóm sản phẩm trưng bày; tham chiếu Product hiện tại | 04 |
| Menu / MenuRevision, SiteSettings | Điều hướng và thông tin website, draft/published tách biệt | 04 |
| ContentEntry / ContentRevision | Post hoặc Page, slug, SEO, bản nháp, bản public, lịch xuất bản | 05 |
| Layout / LayoutRevision | Tài liệu block có schemaVersion và các con trỏ revision | 06 |
| AuditEvent | Ai, thao tác gì, entity/revision, thời gian; không chứa secret | Theo từng phase |

Tên trên là thiết kế đích, chưa phải bảng đã tạo. Mỗi migration cần SQL D1, thử trên DB local riêng và kế hoạch tương thích trước khi cập nhật Prisma/generated client. Không chuyển dữ liệu bằng tay hoặc tự đổi số migration khi agent khác đang viết schema.

MediaAsset sẽ là nguồn metadata media chung; ProductImage giữ quan hệ, thứ tự, isPrimary và variantId. Migration thêm assetId nullable, backfill theo r2Key đã kiểm chứng, adapter đọc trong giai đoạn chuyển tiếp; không dual-write hai nguồn metadata độc lập. Alt override theo chỗ sử dụng. Video dùng provider abstraction; lựa chọn dịch vụ/chuyển mã và giới hạn phải được kiểm chứng riêng trước triển khai, chưa cam kết provider trong phase này.

Trạng thái tiếp nhận bán hàng trên website tách khỏi stock vật lý. ADMIN-03 phải thống nhất contract với Antigravity và thay các điều kiện CTA đang đọc stock theo lộ trình, không chỉ ẩn trường stock trong form.

## Xuất bản và tính toàn vẹn

- Bản nháp lưu riêng với revision đã xuất bản. Autosave không thay nội dung public.
- Mỗi write mang expectedRevision; service dùng conditional update trong transaction/batch D1. Stale revision trả 409, không ghi đè ngầm.
- Publish xác minh quyền, toàn bộ tham chiếu, asset READY/public và block renderer hỗ trợ; không chỉ parse Zod.
- Publish/rollback cập nhật con trỏ public và audit trong cùng atomic batch. Rollback tạo revision mới từ bản cũ, không sửa lịch sử.
- Preview dùng quyền admin hoặc token ký ngắn hạn gắn đúng resource/revision; no-store/noindex, không đưa vào sitemap hay cache public.
- Public chỉ nhận revision published và DTO đã resolve. Render không gọi endpoint admin. Không trả nháp, storage key private, thông tin tác giả nội bộ hoặc secret.
- Lịch xuất bản lưu UTC, UI hiển thị Asia/Ho_Chi_Minh; job retry idempotent, kiểm tra expected revision để không publish bản đã thay đổi.
- Cache key gồm revision public; chuyển revision phải cập nhật/invalidate điểm đọc. Lỗi invalidate có retry, không tuyên bố đã hiển thị mới khi chưa kiểm chứng.
- Xóa media phải xét usage của cả revision cần giữ/rollback; không xóa object R2 đang được tham chiếu. Cleanup có retention, không chạy trong ADMIN-01.

## Quyền và UX dùng chung

Ban đầu dùng cơ chế admin hiện có, không tự tạo tài khoản/password. Mô hình đích: Owner cấu hình/quản lý quyền, Publisher xuất bản, Editor sửa nháp/media. Cấp quyền luôn kiểm tra phía server cho từng action; không dựa vào việc ẩn nút.

Các màn hình mới thống nhất Tạo mới / Lưu nháp / Xem trước / Xuất bản; loading, empty, error/retry, unsaved changes, upload progress và thông báo conflict. Editor có bản phục hồi khi phiên đăng nhập hết hạn. Dữ liệu editor có schema version, không nhận script/HTML iframe tùy ý. Chọn editor cụ thể ở ADMIN-05 sau đánh giá khả năng tích hợp; chưa thêm dependency.

## Tiêu chí các phase tiếp theo

- ADMIN-02: upload ảnh, chọn lại ảnh, lỗi từng file, usage, reload persistence; không xóa ảnh còn dùng; đặt nền tảng video.
- ADMIN-03: tạo laptop và chuột với mẫu khác nhau; chọn biến thể/ảnh; nháp không lọt public; sửa giá và trạng thái web hiển thị đúng.
- ADMIN-04: chỉnh Phụ kiện trong menu, thứ tự danh mục và collection; render desktop/mobile từ cùng nguồn.
- ADMIN-05: bài/trang có revision, preview, publication và sanitized rendering; giữ chính sách DRAFT.
- ADMIN-06: hero/category-grid/product-grid end-to-end trước khi mở rộng block khác.
- ADMIN-07: landing pages, templates, video upload/playback đầy đủ và scheduling.
- ADMIN-08: quyền, cache, rollback, SEO, integration/browser QA trên staging.

Mỗi phase phải có lint/typecheck và test hành vi phù hợp; UI cần browser desktop/mobile, dữ liệu cần kiểm tra reload/D1. Không gọi phase UI/data hoàn thành chỉ từ typecheck.
