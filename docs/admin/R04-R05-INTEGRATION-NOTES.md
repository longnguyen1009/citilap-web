# Bàn Giao Tích Hợp R04.1 & R05 (Gửi Claude)

> **Tài liệu phối hợp nội bộ**: Bàn giao trạng thái, hợp đồng dữ liệu và các điểm tiếp xúc giữa **R04/R04.1 (Phụ kiện & Storefront Catalog)** và **R05 (Tin tức/Review & Trang tĩnh)**.
> **Nguyên tắc**: Không can thiệp chéo worktree, không tự merge. Bàn giao độc lập qua tài liệu và hợp đồng rõ ràng.

---

## 1. Baseline Git & Trạng Thái Workspace

- **Git Branch**: `master`
- **Git HEAD Commit**: `085746d43b01d82ab45ca1802046fedc85d25670`
- **Hash-object (blob) của các dependency quan trọng chưa commit**:
  | File | Git Blob Hash (SHA-1) | Ghi chú |
  |---|---|---|
  | `src/contracts/cms/product-studio.ts` | `8df921455a8d5553450c40a4761d3820d4a9fe38` | Contract Product Studio & 10 Templates |
  | `src/contracts/catalog/compare.ts` | `352d5e820ddf8ff4ffea82592b9514b735fa32fe` | Contract so sánh sản phẩm (Compare) |
  | `src/server/services/catalog.service.ts` | `a5faacb1575d50e74d9182e213f272661d4bc8d9` | Truy vấn catalog, filter biến thể & phụ kiện |
  | `src/server/services/search.service.ts` | `e70d417e62e3460a859323f541d9110d520248ee` | Tìm kiếm catalog đồng bộ logic filter |
  | `src/server/media-http.ts` | `a6c95469a95bec36f89a99946be77f1560fba7f7` | Helper trích xuất môi trường Cloudflare D1/R2 |
  | `src/app/api/compare/route.ts` | `5d0008700737b6c6202542f27036ee2c5db78f8f` | Production endpoint `/api/compare` |

---

## 2. Media Usage API & Cơ Chế Bảo Vệ Ảnh

### 2.1. Pattern theo dõi tài sản đa thực thể (`MediaUsage`)
Hệ thống quản lý thư viện ảnh (`media-library.service.ts`) theo dõi mọi tài sản gắn vào:
- `ProductStudio` (thư viện ảnh sản phẩm + ảnh trong mô tả HTML) qua `ownerType='PRODUCT_REVISION'` và `'PRODUCT_CONTENT'`.
- `ProductStudioRevision` (lịch sử revision để khi restore không mất ảnh cũ).
- `Brand` (logo thương hiệu qua `ownerType='BRAND'`, `slot='logo'`).
- Khi R05 hoàn thiện `Post` / `Page`: bảng `MediaUsage` sử dụng cột `ownerType='POST_REVISION'` và `ownerType='PAGE_REVISION'`, `slot='${revision}:${assetId}'`. Cột trong database là `ownerType` (không phải `entityType`).

### 2.2. Trích xuất ảnh HTML an toàn (`contentAssets`)
Trong `src/server/services/content-media.service.ts` hoặc pattern `contentAssets`:
- Quét URL thực tế đang dùng trên hệ thống: `/api/library/:id` (hoặc URL nội bộ cùng site) và `/api/media/:storageKey` (tra cứu ngược `MediaAsset.storageKey` để lấy `assetId`).
- **URL ngoài / CDN bên thứ 3** được bỏ qua an toàn, tuyệt đối không tạo liên kết rác vào database.
- Khi người dùng bấm **Archive/Xóa** media trong Media Library: Nếu media đang có liên kết trong bảng `MediaUsage` (`usageCount > 0`), trigger ném lỗi `MEDIA_IN_USE` ("Tài sản đang được sử dụng, không thể lưu trữ").

---

## 3. Contract Sản Phẩm & Product Picker Dùng Cho Bài Viết (R05)

Khi xây dựng tính năng chèn sản phẩm vào bài viết tin tức/đánh giá (Post Editor):

### 3.1. API tìm kiếm sản phẩm cho Picker
- Endpoint Admin: `GET /api/admin/products?q=...&limit=12` (sử dụng `catalogList` từ `product-studio.service.ts`).
- Admin picker **không phải là public-only resolver**, nó trả về đầy đủ sản phẩm kèm trạng thái (`isPublished`, `isDraftOnly`, `productStatus`) để người quản trị biết rõ trạng thái bài liên kết.
- Dữ liệu trả về thực tế (`CatalogItem`):
  ```ts
  interface CatalogItem {
    id: string;
    name: string;
    publicName: string;
    slug: string;
    price: number;
    publicPrice: number;
    originalPrice: number | null;
    productStatus: string;
    isPublished: boolean;
    isDraftOnly: boolean;
    hasUnpublishedDraft: boolean;
    availability: string;
    brand: string;
    image: string;
  }
  ```

### 3.2. Public PDP embed snapshot & URL
Khi Storefront hiển thị sản phẩm liên quan trong Post/Review, chỉ lấy dữ liệu từ **phiên bản published**:
- Link Storefront PDP: Route thực tế là `/product/[id]` (hỗ trợ cả slug và ID qua `classifyProductPublication(id, { lookupType: 'auto' })`).
- Không nhúng thông tin giá/ảnh từ bản nháp `draft` của CMS. Giá và ảnh hiển thị theo dữ liệu public hiện hành.

---

## 4. Cách Resolve Sản Phẩm Liên Quan Public (`getRelatedProducts`)

Trong `src/server/services/catalog.service.ts`:
```ts
export async function getRelatedProducts(
  currentProductId: string,
  categoryId: string | null,
  brandId: string | null,
  limit: number = 4,
  manualRelatedIds?: string[],
  prismaClient?: PrismaClient
): Promise<HomepageProduct[]>
```

### Quy tắc đã kiểm chứng qua test thực tế:
1. **Manual Curated First**: Nếu Admin có cấu hình danh sách `relatedIds` thủ công, các sản phẩm này được lấy trước theo đúng thứ tự mảng.
2. **Loại trừ trùng lặp & Self-reference**:
   - Tự động loại bỏ chính sản phẩm hiện tại (`id !== currentProductId`).
   - Khử trùng lặp ID bằng `Set`.
3. **Public-Only Guard**: Các sản phẩm bị xóa hoặc chuyển sang `INACTIVE` / `DRAFT` sẽ tự động bị loại bỏ khỏi danh sách công khai.
4. **Fallback Tự Động**: Nếu danh sách manual chưa đủ `limit`, service sẽ tự động bù đắp các sản phẩm cùng danh mục (`categoryId`) và thương hiệu (`brandId`), đảm bảo không trùng với các sản phẩm đã có.

---

## 5. Chính Sách Bán Hàng & Bảo Hành Trên PDP (Chờ Hợp Đồng R05)

- Hiện tại trên trang PDP (`/product/[slug]`):
  - Khối chính sách đổi trả / bảo hành / vận chuyển đang hiển thị nội dung tĩnh chuẩn từ `business-profile.ts`.
  - Khi R05 hoàn thiện module **Trang tĩnh & Chính sách (Page Studio)**, PDP sẽ được nối với endpoint hoặc service lấy nội dung trang tĩnh (ví dụ: slug `/chinh-sach-bao-hanh`, `/chinh-sach-doi-tra`) theo hợp đồng mà Claude công bố.

---

## 6. Danh Sách File Shared Đã Chỉnh Sửa Trong R04/R04.1

Các file thuộc tầng dùng chung đã được hoàn thiện trong đợt này (vui lòng lưu ý khi rebase/merge):
1. `src/contracts/cms/product-studio.ts`: Bổ sung 10 template attributes định nghĩa phụ kiện và cờ `isComparable`.
2. `src/server/services/catalog.service.ts`: Khép kín filter biến thể đồng bộ theo từng variant (`variantMatch`), chuẩn hóa đơn vị RAM/SSD, bổ sung facet `connection` và `power`, chuẩn hóa giá card theo variant thỏa mãn bộ lọc.
3. `src/server/services/search.service.ts`: Đồng bộ logic biến thể và phụ kiện sang tìm kiếm toàn diện.
4. `src/components/category/CategoryFilterSidebar.tsx`: Hỗ trợ facet Chuẩn kết nối và Công suất sạc trên phụ kiện; ẩn phần cứng CPU/RAM trên phụ kiện không liên quan.
5. `src/components/category/ActiveFilterChips.tsx`: Hỗ trợ chip lọc chuẩn kết nối & công suất.
6. `src/app/api/compare/route.ts`: Endpoint so sánh hoàn chỉnh với HTTP 400 validation, khử trùng ID, chặn nhóm không tương thích, kiểm tra `isComparable`.
7. `src/context/CompareContext.tsx`: Hydration an toàn tránh lỗi SSR với `sessionStorage`.
8. `src/components/product/CompareModal.tsx`: Focus management và phím tắt `Escape`.
9. `src/components/product/CompareFloatingBar.tsx`: Vị trí `bottom-28` an toàn không che mobile CTA.
