# Sổ Bộ Nguồn Dữ Liệu Chuẩn (Content Source Registry)

> **Dự án:** CitiLap CMS & Storefront  
> **Phiên bản:** V2 (Chuẩn hóa R03B)  
> **Ngày cập nhật:** 2026-10-13  
> **Nguyên tắc cốt lõi:** Mỗi thực thể dữ liệu có duy nhất 1 nguồn chuẩn (Single Source of Truth), 1 service ghi chuẩn (Canonical Writer), và mọi thay đổi giao diện/công cộng phải tuân thủ chu kỳ kiểm soát trạng thái.

---

## 1. Bảng Phân Định Nguồn Chuẩn (Canonical Source of Truth Matrix)

| Thực thể dữ liệu | Nguồn lưu trữ chuẩn | Service quản lý chuẩn | Tuyến API Admin | Tuyến API / Route Public | Quyền hạn ghi (Writers) |
|---|---|---|---|---|---|
| **Sản phẩm (Laptop & Phụ kiện)** | Bảng `ProductStudio` (JSON draft/published) + bảng `Product` & `ProductVariant` (chiếu tìm kiếm & Storefront) | `src/server/services/product-studio.service.ts` | `/api/admin/products` | `/api/products` (chỉ đọc), `/product/[id]` | **Chỉ có `writeStudio`** qua `/api/admin/products`. Khóa 409 toàn bộ 5 legacy writers. |
| **Lịch sử Phiên bản (Product Revisions)** | Bảng `ProductStudioRevision` (Append-only JSON snapshot, không sửa/xóa) | `src/server/services/product-studio.service.ts` | `/api/admin/products/[id]/revisions`, `/revisions/[rId]/restore` | Không công khai | **Tự động sinh bởi `writeStudio`** khi Lưu nháp hoặc Xuất bản. Khôi phục tạo revision mới `expectedRevision + 1`. |
| **Thương hiệu (Brands)** | Bảng `Brand` (D1 canonical: id, name, slug, logo, description, seoTitle, seoDescription, status) | `src/server/services/brand.service.ts` | `/api/admin/brands`, `/api/admin/brands/[id]` | `/api/brands`, `/brand/[slug]` | **Chỉ có `writeBrand`** qua `/api/admin/brands`. Có bảo vệ khóa ngoại (không xóa Brand khi còn sản phẩm liên kết). |
| **Tài nguyên Media (Hình ảnh, Video)** | Cloudflare R2 Bucket + Bảng `MediaAsset` (metadata, alt, sizes, sha256) | `src/server/services/media-library.service.ts` | `/api/admin/media` | CDN R2 Public URL | **Chỉ có Media Library**. Khi xóa kiểm tra tham chiếu `MediaUsage` trong Catalog. |
| **Cài đặt Website (Settings)** | Bảng `SiteSettings` (D1 canonical id='site', bảng lịch sử `SiteSettingsRevision`) | `src/server/services/settings.service.ts` | `/api/admin/settings` | `/api/settings` (chỉ đọc cache) | **Chỉ có `writeSettings`**. Kiểm tra CSRF và Schema Zod nghiêm ngặt. |
| **Hệ thống Điều hướng (Navigation)** | Bảng `NavigationMenu` & `NavigationItem` (D1) | `src/server/services/navigation.service.ts` | `/api/admin/navigation` | Gắn trực tiếp vào layout server-side | **Chỉ có Navigation Studio**. Có kiểm tra liên kết hợp lệ. |

---

## 2. Quy Tắc 3 Trục Trạng Thái Sản Phẩm (3-Axis State Invariant)

Hệ thống CitiLap V2 phân định độc lập 3 trục trạng thái sản phẩm nhằm chấm dứt hoàn toàn sự nhầm lẫn giữa trạng thái hiển thị, kho hàng và tình trạng máy:

```
[ Trục 1: Publication ]   -> DRAFT (Nháp) | PUBLISHED (Đang hiển thị) | ARCHIVED (Lưu trữ)
[ Trục 2: Condition ]     -> NEW (Mới 100%) | LIKE_NEW (99%) | USED (Cũ) | REFURBISHED | LIQUIDATION
[ Trục 3: Availability ]  -> AVAILABLE (Còn hàng) | PREORDER (Đặt trước) | CONTACT (Liên hệ) | UNAVAILABLE (Hết hàng)
[ Trục 4: Marketing Tag ] -> isNewArrival (Hàng mới về) | isBestSeller (Bán chạy) | isFeatured (Nổi bật)
```

### Các bất biến nghiêm ngặt:
1. **Lưu nháp (Save Draft) độc lập hoàn toàn với Storefront:** Khi lưu nháp sản phẩm đang `PUBLISHED`, website công cộng vẫn giữ nguyên nội dung bản snapshot cũ cho tới khi quản trị viên thực hiện hành động **Xuất bản website**.
2. **Availability không đồng nhất với Publication Status:** Sản phẩm có thể `PUBLISHED` nhưng tình trạng hàng là `CONTACT` (Liên hệ) hoặc `PREORDER` (Đặt trước). Không được tự động chuyển `PREORDER` thành `AVAILABLE`.
3. **Condition không phải là trạng thái xuất bản:** Máy `LIKE_NEW` hay `USED` vẫn có chu kỳ xuất bản `DRAFT` -> `PUBLISHED` hoàn chỉnh.
4. **Nhãn marketing do người dùng quyết định:** Không tự động sinh giả nhãn `Bán chạy` hay `Hàng mới về` nếu chưa có nguồn chỉ số vận hành thực.

---

## 3. Quản Trị Thương Hiệu (Brand Subsystem Rules)

### 3.1. Nguồn chuẩn duy nhất:
- Không tạo dataset thương hiệu riêng biệt hoặc hard-code mảng JS.
- Bảng `Brand` trong SQLite/D1 là nguồn chân lý duy nhất.
- Bảng `Product` liên kết với `Brand` qua cột `brandId` (khóa ngoại mềm) và cột `brand` (tên hiển thị phục vụ tìm kiếm).

### 3.2. Quy tắc Lưu & Hiển thị:
- Lưu Brand có hiệu lực ngay lập tức trên hệ thống (không qua chu kỳ xuất bản draft/published phức tạp, nhưng được phân tách bằng trạng thái `ACTIVE` / `INACTIVE`).
- Thương hiệu `INACTIVE` sẽ bị ẩn khỏi Storefront công cộng. Trong giao diện Admin / Product Editor, các thương hiệu `INACTIVE` vẫn được tải và hiển thị với nhãn `(Tạm ẩn)` để đảm bảo sản phẩm đã gán thương hiệu này không bị mất dữ liệu liên kết.

### 3.3. Bảo vệ dữ liệu tham chiếu (Referential Guard):
- Không thể xóa một Brand nếu còn bất kỳ sản phẩm nào (`Product.deletedAt IS NULL`) đang liên kết với nó.
- Endpoint trả về lỗi `HTTP 400 BRAND_IN_USE` kèm số lượng sản phẩm liên kết, hướng dẫn quản trị viên chuyển sang trạng thái `INACTIVE` thay vì xóa.

---

## 4. Cơ Chế Lịch Sử & Khôi Phục (History & Restore Invariants)

```
[Revision N (Published)] ---> [Sửa & Lưu nháp] ---> [Revision N+1 (Draft)]
                                                         |
                                                  (Khôi phục Rev N)
                                                         |
                                                         v
                                              [Revision N+2 (Draft mới)]
                                         * Website vẫn giữ nội dung cũ *
                                         * Chỉ thay đổi sau khi Xuất bản *
```

1. **Bất biến Append-only:** Bảng `ProductStudioRevision` là bất biến. Không có API xóa, sửa hay ghi đè revision cũ.
2. **Khôi phục thành bản nháp (Restore as Draft):** Thao tác khôi phục một revision cũ sẽ tạo ra một revision mới (`expectedRevision + 1`) với `action = 'restore'` và ghi vào `ProductStudio.draft`.
3. **Bảo toàn Storefront:** Bản snapshot công khai `ProductStudio.published` và các cột tìm kiếm trên bảng `Product` tuyệt đối **không bị thay đổi** cho đến khi quản trị viên bấm nút Xuất bản.
4. **Chống xung đột ghi đè (Optimistic Concurrency 409):** Mọi thao tác lưu và khôi phục đều yêu cầu `expectedRevision`. Nếu hai quản trị viên cùng thao tác đồng thời, thao tác sau sẽ nhận `HTTP 409 Conflict`.
