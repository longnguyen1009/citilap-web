# CMS merge — kiểm chứng local 2026-10-11

## Trạng thái

- `master` đã nhận `feature/admin-cms-foundation` qua merge commit `5701993` (local; chưa push/deploy).
- Các trang quản trị được build: `/admin/media`, `/admin/product-studio`, `/admin/navigation`, `/admin/categories`.
- Migration CMS `0009`–`0011` có trong source; `wrangler d1 migrations list --local` báo không còn migration chờ áp dụng. Không kiểm tra/thay đổi D1 remote.

## Kiểm chứng sau merge

| Kiểm tra | Kết quả |
| --- | --- |
| `node scripts/test-navigation.mjs` | 16/16 PASS (bao gồm URL ảnh danh mục từ seed cũ) |
| `node scripts/test-product-studio.mjs` | 12/12 PASS |
| `node scripts/test-media-library.mjs` | 16/16 PASS |
| Resolver ProductImage (6 assertions) | 6/6 PASS |
| `npx tsc --noEmit` | PASS |
| ESLint các file liên quan | PASS (0 errors) |
| `npm run build:cloudflare` | PASS |

## Tương thích ảnh sau merge

- Dữ liệu development có `ProductImage.r2Key` mẫu như `products/lenovo-legion-5-pro-front.webp` nhưng URL hiển thị thực tế là `https://images.unsplash.com/...`. PDP và thẻ sản phẩm giờ ưu tiên URL ngoài hợp lệ trong trường hợp này.
- Ảnh do CMS Media Library tải lên có key `library/...` và URL công khai `/api/library/:id`; resolver giữ nguyên endpoint này thay vì gửi sang `/api/media/library/...` (403).
- Media route cho phép `categories/` để khớp hình danh mục cũ. **Seed chỉ chứa tên key danh mục; cần đưa ảnh thật vào R2 hoặc thay bằng ảnh Media Library để hiển thị được.**

## Giới hạn và việc còn lại

- Lệnh kiểm tra HTTP localhost bị bộ lọc công cụ từ chối trước khi chạy; chưa có bằng chứng Playwright/PDP trực tiếp cho bản merge này. Các suite browser trước merge chỉ chứng minh worktree Admin.
- Frontstore hiện chưa có renderer `/collection/:slug`; Header/footer/category showcase và PDP cần được Antigravity tích hợp với các DTO CMS ở `docs/admin/AGENT-HANDOFF.md` rồi kiểm tra desktop/mobile, giỏ hàng, checkout.
- Chưa push `master`, chưa deploy staging/production, chưa migrate D1 remote.
