# CMS contract v1 — bàn giao Codex / Antigravity

Trạng thái: validator nền tảng đã triển khai; service, persistence, endpoint và renderer dưới đây là mục tiêu, chưa có runtime CMS.

Nguồn kiểm tra payload: `src/contracts/cms/v1.ts`. Schema dùng Zod strict, type TypeScript suy ra từ schema. Không sao chép interface riêng trong Frontstore.

## Phạm vi v1

Layout: `{ schemaVersion: 1, blocks: [...] }`, tối đa 30 block, ID duy nhất và ổn định khi reorder. Ba type: `hero`, `category-grid`, `product-grid`. Chưa hỗ trợ rich text/video/FAQ; gửi type khác phải lỗi validation, không âm thầm bỏ dữ liệu.

Hero chứa title, description, desktopImage, mobileImage tùy chọn và action tùy chọn. Category grid tham chiếu categoryId. Product grid chọn productIds thủ công hoặc categoryId + limit + sort. Không nhúng bản sao giá, tồn kho hoặc tên sản phẩm trong tài liệu layout.

Image reference: assetId + alt tại nơi dùng + decorative. Không chứa URL R2 do người dùng tùy nhập. Resolver kiểm tra asset tồn tại/READY/public; sinh URL public sau kiểm tra quyền. Chưa có resolver trong ADMIN-01.

Link target: category/product/page theo ID hoặc path nội bộ. Path v1 chỉ nhận root-relative không encoded characters; slug đổi vẫn resolve đúng bằng ID. External links/tel/mailto chưa có trong v1, mở rộng có schema và kiểm tra scheme riêng khi cần.

Menu: schemaVersion, location (`header|footer|mobile`), tối đa 16 mục cha, mỗi mục tối đa 16 con, không lồng sâu hơn. ID toàn menu duy nhất. Có thể cấu hình riêng mobile nhưng mặc định phase triển khai sẽ dùng cùng nội dung header khi chưa có override được publish.

## Ví dụ hợp lệ (ID minh họa, không phải dữ liệu seed)

```json
{
  "schemaVersion": 1,
  "blocks": [
    {
      "id": "home-accessories",
      "enabled": true,
      "type": "category-grid",
      "title": "Phụ kiện laptop",
      "items": [{ "categoryId": "example-category-id" }]
    }
  ]
}
```

## API đích (chưa tồn tại)

| Method / route đề xuất | Request / response | Quyền |
|---|---|---|
| GET `/api/admin/cms/layouts/:key` | data: id, revision, draftRevisionId, publishedRevisionId, draftDocument | admin |
| PUT `/api/admin/cms/layouts/:key/draft` | saveLayoutDraftSchema: expectedRevision + document | edit + CSRF |
| POST `/api/admin/cms/layouts/:key/publish` | publishLayoutSchema: expectedRevision + draftRevisionId | publish + CSRF |
| GET `/api/cms/layouts/:key` | data: schemaVersion, publishedRevisionId, resolved blocks | public published only |

Envelope giữ quy ước `{ success: true, data }` hoặc `{ success: false, error, code }`; mutation trả revision mới. 400 invalid schema, 401 chưa đăng nhập, 403 thiếu quyền/CSRF, 404 không có bản public, 409 revision conflict, 422 tham chiếu không hợp lệ, 503 DB/storage không sẵn sàng. Không fallback mock khi hạ tầng lỗi.

Public DTO được định nghĩa cùng resolver ở phase tích hợp, bao gồm URL/slug và trường catalog tối thiểu mà renderer cần; không dùng raw Prisma object. Contract hiện tại là authoring DTO, chưa phải resolved renderer DTO. Trước khi Antigravity nối API thật, hai phía phải có fixture resolved DTO và test tương thích.

## Quy tắc renderer và thay đổi version

- Thứ tự trong blocks là thứ tự hiển thị; enabled=false không render public.
- Không có layout published: giữ trải nghiệm Frontstore hiện tại trong giai đoạn chuyển tiếp, không sinh catalog giả. Khi chuyển nguồn hoàn tất, dùng empty/error state đã thống nhất.
- Tham chiếu mất hiệu lực sau publish: ẩn item không công khai, ẩn section rỗng, ghi log; không làm lộ product/category draft. Preview hiển thị lỗi để biên tập viên sửa.
- Unknown schemaVersion: giữ bản public tương thích gần nhất nếu có; không diễn giải như v1. Unknown block: cảnh báo và bỏ block an toàn ở renderer; editor/publisher từ chối ghi để tránh mất nội dung.
- Thêm field/type: cập nhật schema, fixture, renderer và kiểm thử trước bật tính năng admin. Breaking change cần version mới + migration tài liệu + rollback tương thích.
- Preview phải dùng cùng renderer với public; admin không dựng bản xem trước khác dễ sai bố cục.

## Kiểm chứng hiện có

`node --test scripts/test-cms-contracts.mjs` (Node có hỗ trợ TypeScript strip; môi trường hiện tại Node 26). Test biên payload, duplicate ID, link nguy hiểm, alt, version và concurrency metadata. Không thay thế test tồn tại reference, auth, D1 transaction, cache hay browser ở các phase runtime.
