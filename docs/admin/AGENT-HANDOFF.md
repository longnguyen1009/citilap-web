# Phân chia công việc CMS / Frontstore

Ngày 2026-10-10. Đây là đề xuất phối hợp được Codex thực hiện trong phạm vi của mình; chưa có xác nhận Antigravity đã đọc hoặc áp dụng.

## Workspace

- Frontstore giữ `C:/Users/Admin/Desktop/citilap-web2`, branch hiện tại `master`.
- Admin làm tại `C:/Users/Admin/Desktop/citilap-web2-admin`, branch `feature/admin-cms-foundation`, tách từ `6635fb1`.
- node_modules trong worktree admin là junction tới dependencies hiện tại để kiểm tra; không install/update dependencies qua junction. Khi cần đổi dependency, dùng bản cài riêng và phối hợp lockfile.
- Không checkout branch của nhau, stash/reset hay commit thay đổi của agent khác. Không auto-merge khi một phía còn đang sửa working tree.

## Ownership

| Khu vực | Chủ sở hữu |
|---|---|
| `src/app/(shop)`, home/product/category/search/layout components | Antigravity |
| `src/app/admin`, `src/components/admin`, CMS admin API/services | Codex |
| `src/contracts/cms`, `docs/admin` | Codex định nghĩa; Frontstore review/tích hợp theo version |
| Prisma schema, SQL migrations, generated client | Codex điều phối theo phase; xác nhận không có migration song song trước ghi |
| Public catalog API/services, auth, business-profile | Dùng chung: đọc diff, mô tả thay đổi và giữ backward compatibility |
| globals.css, package/lockfile, context/runbook | Dùng chung: tích hợp tuần tự, tránh thay đổi chỉ để phục vụ một màn hình |

## Handoff ADMIN-01

- Đã bàn giao authoring contract hero/category-grid/product-grid và menu; chưa có API CMS.
- Antigravity tiếp tục UI hiện tại, không chuyển sang endpoint đề xuất chưa tồn tại.
- `category-showcase.ts` đang ở working tree Frontstore là presentation config hiện tại; khi ADMIN-04 tích hợp sẽ chuyển sang tham chiếu Category thật, tránh hai nguồn quản lý lâu dài.
- Tiếp theo Codex: ADMIN-02 Media Library, giữ ProductImage tương thích.
- Trước tích hợp: hai phía chốt resolved public DTO, fixture hợp lệ, renderer support và default/fallback; chạy regression product/cart/checkout.

## Handoff ADMIN-03 — Product Studio

- Codex đã tạo editor `/admin/product-studio` trong worktree Admin, hỗ trợ laptop/chuột/phụ kiện/đồ chơi công nghệ, media, cấu hình, tình trạng, bảo hành và trạng thái bán trên web độc lập với kho.
- Frontstore lấy nội dung **đã xuất bản** qua `GET /api/catalog/studio/:slug`. Contract nguồn: `src/contracts/cms/product-studio.ts`; mô tả mapping và bằng chứng: `docs/admin/ADMIN-03-PRODUCT-STUDIO.md`. API trả 404 cho bản chưa publish hoặc đã unpublish.
- Antigravity cần map `media[]` thành gallery (ảnh/video, ALT, biến thể), nhóm `variants[]` theo tình trạng rồi cấu hình, hiển thị `warranties[]` với `adjustment`, và dùng `availability`/`canOrder` để quyết định CTA. Không hiển thị số lượng tồn kho từ DTO này.
- Khi merge worktree, kiểm tra thay đổi chồng lấn ở schema/migrations và public catalog routes. Cần chạy lại regression product/PDP/cart/checkout, media CDN/R2 và breakpoint mobile trên phiên bản tích hợp. Kiểm thử ADMIN-03 hiện tại là local D1/R2; chưa chứng minh PDP của Antigravity đã dùng DTO hoặc staging/production chạy thành công.
- ADMIN-04 kế tiếp xử lý menu Phụ kiện, danh mục/collection và thứ tự hiển thị từ CMS; phối hợp dữ liệu với Frontstore trước khi thay renderer.

## Handoff ADMIN-04 — Điều hướng

- Codex đã thêm `/admin/navigation` và chuyển `/admin/categories` sang editor dùng chung. Dữ liệu nháp/published, revision guard và Category projection ở migration `0011_navigation_studio.sql`.
- Contract và giới hạn: `docs/admin/ADMIN-04-NAVIGATION.md`, `src/contracts/cms/navigation.ts`. Public: `GET /api/catalog/navigation`, `GET /api/catalog/collections/:slug`. Header desktop/mobile phải dùng chung `menus.main`; footer dùng `menus.footer`.
- Category showcase lấy ID/tên/ảnh/thứ tự từ `categories[]`, tránh giữ song song `category-showcase.ts` làm nguồn chỉnh nội dung lâu dài. API `/api/categories` nay đọc D1 thật; các mutation cũ trả 409 sau auth/CSRF, UI admin đã chuyển sang API mới.
- Frontstore phải xây `/collection/:slug` và render menu/category-grid/footer trước nghiệm thu end-to-end. Chưa có bằng chứng Antigravity đã tích hợp; không tuyên bố cửa hàng đang dùng cấu hình này.
- SiteSettings/business-profile còn riêng; không có thay đổi thanh toán/kho. Sau khi tích hợp, chạy regression header/mobile/PDP/cart/checkout và kiểm tra trạng thái ẩn trước deploy.

## Nhịp phối hợp tiếp theo

Mỗi phase ghi task, file dự kiến sửa, thay đổi contract/migration, kiểm thử và phần chưa làm. Kiểm tra `git status`, HEAD và diff trước bắt đầu/kết thúc. Bàn giao bằng commit có phạm vi rõ; merge/cherry-pick tuần tự khi baseline phù hợp. Không tự deploy, đổi DNS hoặc chạy remote migration trong workflow phát triển admin này.
