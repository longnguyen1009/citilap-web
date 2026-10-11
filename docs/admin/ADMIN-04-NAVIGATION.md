# ADMIN-04 — Menu, danh mục và collection

Ngày kiểm chứng: 2026-10-11. Worktree `citilap-web2-admin`, branch `feature/admin-cms-foundation`. Phạm vi này là CMS Admin, persistence và API public; Frontstore do Antigravity tích hợp.

## Chức năng

- `/admin/navigation`: menu chính hai cấp dùng chung desktop/mobile, footer, nhãn tùy chỉnh, đích danh mục/collection/sản phẩm/đường dẫn nội bộ, sắp thứ tự, thêm/bỏ mục con.
- `/admin/categories`: cùng trình biên tập, mở sẵn tab Danh mục. Tạo/sửa tên, slug, mô tả, danh mục cha, thứ tự, ẩn/hiện, chọn ảnh Media Library và ALT. Danh mục có ID đã lưu trong catalog chỉ được ẩn; bản mới chưa xuất bản có thể bỏ khỏi tài liệu nếu không còn tham chiếu.
- Collection chọn thủ công tối đa 24 sản phẩm, sắp thứ tự, tên/slug/mô tả/ẩn hiện. Bộ chọn có tìm kiếm và phân trang 25 sản phẩm. Tên sản phẩm đã chọn được tải lại từ D1 sau reload.
- Lưu nháp, xuất bản, xem trước nội dung điều hướng ở desktop/mobile, thông báo chưa lưu, chặn rời trang/tải lại khi có thay đổi và bản phục hồi sessionStorage khi lưu lỗi.
- Toàn bộ menu/danh mục/collection dùng chung một lần lưu và xuất bản. Chỉnh nháp không đổi public; phiên bản stale trả 409 và giữ nội dung editor để người dùng kiểm tra.

## Dữ liệu và tính toàn vẹn

Migration `0011_navigation_studio.sql` thêm `NavigationStudio` và `NavigationRevision`. Quyết định triển khai: dùng một tài liệu có version cho toàn bộ cấu trúc điều hướng, thay vì nhiều bảng Menu/Collection rời rạc. Như vậy một menu trỏ tới collection hoặc danh mục mới có thể xuất bản cùng lúc. Contract `src/contracts/cms/navigation.ts` giới hạn 200 danh mục, 24 collection, 16 mục cấp đầu và 16 con/mục cho mỗi menu. Đây chưa phải CMS phân quyền nhiều nhóm biên tập độc lập.

`Category` hiện có tiếp tục là danh tính catalog; ID và quan hệ Product không bị thay thế. Trước lần lưu đầu tiên, editor nạp dữ liệu Category thật. Chỉ khi publish, tên/slug/mô tả/ảnh/parent/status/sortOrder được cập nhật vào Category cùng batch với snapshot và revision. Không xóa Category/Product, không thay stock hoặc thanh toán. Các lỗi SQL làm rollback toàn batch.

- Schema chặn slug/ID trùng, đường dẫn ngoài site, parent thiếu/vòng lặp, danh mục con hiện khi cha ẩn và tham chiếu menu thiếu.
- Publish kiểm tra sản phẩm tồn tại/chưa xóa/đã xuất bản; ảnh READY, ALT và R2 object tồn tại. Bản nháp có thể chọn sản phẩm DRAFT nhưng phải xuất bản sản phẩm trước khi publish điều hướng.
- Trigger revision chặn hai người cùng ghi một version. Lịch sử giữ document/action/actor `admin`/timestamp; actor dùng quyền admin chung hiện có, chưa có danh tính editor riêng.
- MediaUsage giữ ảnh của từng revision, ngăn archive ảnh còn được dùng. Chưa có chính sách dọn revision.
- Danh mục/collection ẩn bị loại khỏi DTO public và mục menu trỏ trực tiếp tới chúng cũng bị loại. Nếu mục cha menu bị loại, các mục con của nó không xuất hiện.
- Sản phẩm bị ẩn/xóa sau khi collection đã publish được loại khi đọc public, không trả dữ liệu bản nháp.

## API và hợp đồng Frontstore

| Endpoint | Chức năng |
|---|---|
| `GET /api/admin/navigation` | Document nháp, revision hiện tại, publishedRevision, tên sản phẩm tham chiếu và ID Category hiện có; admin/no-store |
| `PUT /api/admin/navigation` | `{expectedRevision, action: "save" hoặc "publish", document}`; admin + CSRF |
| `GET /api/admin/navigation/products?q=&page=1` | Bộ chọn sản phẩm phân trang; admin |
| `POST /api/admin/navigation/preview` | Document đang sửa → resolved DTO; admin + CSRF/no-store |
| `GET /api/catalog/navigation` | Chỉ snapshot đã publish, 404 nếu chưa xuất bản; no-store |
| `GET /api/catalog/collections/:slug` | Collection đang hiện + danh sách sản phẩm public theo đúng thứ tự; 404 nếu chưa có/đã ẩn |
| `GET /api/categories` | Category ACTIVE từ D1, sortOrder, parent/subCategories, `_count.products` chỉ đếm sản phẩm public |

DTO điều hướng có `schemaVersion`, `revision`, `categories[]`, `collections[]`, `menus.main[]`, `menus.footer[]`. Menu đã resolve thành `{id,label,href,children}`. `main` là nguồn chung cho header desktop và drawer mobile. Category gồm tên, slug, mô tả, parentId, image URL, alt và href. Collection trong navigation là metadata; tải danh sách sản phẩm qua endpoint chi tiết khi mở trang collection.

- Category href: `/category/:slug`.
- Product href: `/product/:id`, khớp route hiện tại.
- Collection href: `/collection/:slug`; **Frontstore cần bổ sung renderer/route này** trước khi đưa menu collection lên cửa hàng thật.
- Public không chứa document nháp, R2 storage key, MediaUsage, actor hoặc các ID sản phẩm DRAFT.
- Collection trả giá/ảnh từ Product đã được publish; không cung cấp tồn kho. CTA có cấu hình/bảo hành/trạng thái nhận đơn tiếp tục theo DTO Product Studio ở ADMIN-03.
- Trước lần publish đầu, Frontstore có thể giữ điều hướng đang chạy nếu navigation API trả 404. Lỗi 503 là lỗi môi trường/dữ liệu cần xử lý, không biến thành dữ liệu mẫu.

API mutation category cũ (`POST /api/categories`, `PATCH/DELETE /api/categories/:id`) đã được thay bằng 409 hướng sang editor mới, sau khi kiểm tra admin + CSRF. Đây là thay đổi có chủ ý để không có hai luồng ghi phá vỡ snapshot. Trang category admin hiện tại đã chuyển sang API mới. Nếu có client bên ngoài dùng mutation cũ, phải chuyển trước tích hợp.

## Kiểm chứng local

| Kiểm tra | Kết quả |
|---|---|
| Prisma generate + validate | PASS |
| TypeScript toàn dự án | PASS |
| ESLint phạm vi ADMIN-04 | PASS |
| `node scripts/test-navigation.mjs` | 15/15 PASS |
| `node scripts/test-navigation-browser.mjs` | 9/9 PASS |
| Regression `node scripts/test-product-studio.mjs` | 12/12 PASS |
| `npm.cmd run build:cloudflare` | PASS |

Service suite áp toàn bộ migrations trên Miniflare D1/R2 riêng. Kiểm tra draft isolation, publication atomicity, stale/concurrent writes, vòng lặp/slug/link, bảo toàn Category, media usages, ẩn nội dung, sản phẩm ngừng public, mất R2, rollback khi lỗi SQL, phân trang qua trang thứ hai và foreign keys.

Browser suite chạy Edge headless/Playwright trên Vite port 3014 với D1/R2 local: tạo category có ảnh, collection có sản phẩm, menu cha/con; reload persistence; public HTTP và ảnh 200; preview desktop/mobile; sửa nháp không thay public; unsaved guard; admin 401/CSRF 403/legacy writer 409; 1440/768/390 không overflow; không JS errors. Bằng chứng ở `docs/screenshots/admin04/verification.json` và ảnh cùng thư mục. Đây là preview/editor Admin, không phải nghiệm thu header/PDP/cart trên Frontstore.

Chỉ migration 0011 đã được áp vào D1 **local của worktree Admin**, sau khi kiểm tra pending migrations. Không reset/import dữ liệu; fixtures QA được giữ lại. Browser script dùng `.dev.vars` tạm, từ chối ghi đè file có sẵn và dọn token/process khi kết thúc. Trước khi chạy lại browser ở worktree mới, cần áp migrations local và có ít nhất một Category ACTIVE.

## Bàn giao và phần còn lại

Antigravity cần tích hợp Header/drawer/footer/category showcase từ DTO chung, route collection và regression sản phẩm/cart/checkout sau khi gộp code tuần tự. Không sửa worktree Frontstore trong phase này. Chưa commit/merge/deploy, chưa áp migration remote và chưa kiểm thử staging/production.

Collection hiện chọn thủ công; chưa có rule động, scheduling, rollback UI hoặc phân quyền Publisher/Editor. Preview là nội dung điều hướng, không phải toàn giao diện cửa hàng. Đổi tên/slug giữa hai category đang có có thể va chạm UNIQUE; lỗi trả 409 và rollback, cần đổi qua tên/slug trung gian.

SiteSettings/business-profile được nhắc trong audit ADMIN-01 chưa thuộc màn hình menu/danh mục/collection này; vẫn cần phase cấu hình website riêng. Không chuyển settings thanh toán/vận hành vào CMS.
