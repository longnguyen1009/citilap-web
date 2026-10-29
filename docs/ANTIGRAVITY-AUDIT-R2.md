# R2 — Published variant / catalog / search consistency

Chờ Codex giao R2 sau nghiệm thu R1. Không chạy đồng thời sửa R1.

## Bằng chứng Codex đã chạy lại

`node .wrangler/review-reproduce.mjs` trên Miniflare DB riêng: exit 0 ngày 28/10/2026. Script cũ assert xác nhận lỗi, không phải regression test xác nhận sửa.

- Publish specs CPU AMD Ryzen 7 8845HS/GPU RTX 4070 nhưng Product.cpuSeries vẫn Core i5, gpuSeries vẫn GTX 1650.
- Search REVIEW-SKU: variant 32GB/2TB/USED nhưng facets trả 16GB/512GB/NEW; card condition NEW.
- Filter CPU Core i5 vẫn trả variant có CPU AMD Ryzen 7 8845HS.
- `mapD1ProductToHomepageProduct` chọn storage 2048 vẫn matchesFilter=true với variant 1000GB.
- PDP `structuredSpecs`/spec panel cần kiểm tra variant được chọn thực sự, không chỉ giá/SKU. So sánh nguồn Admin draft/published, projection, card/search/category/collection/related/compare/wishlist/cart/PDP.

## Hướng sửa được giao

- Published document và selected published variant là nguồn sự thật. Projection/facets/filter/card/specs phải thống nhất. Bộ lọc nhiều thuộc tính phải cùng một variant; không ghép RAM variant A và SSD variant B. Facet counts theo sản phẩm, tránh đếm trùng variants.
- Chuẩn hóa dung lượng chính xác; 1TB/1024GB và 1000GB có thể cùng bucket 1TB, nhưng 1000GB không thành 2TB. Dùng parser/metrics sẵn có, tránh nhân bản logic.
- Update derived CPU/GPU series đúng với parser hiện tại; nếu không suy ra hợp lệ, bỏ dữ liệu cũ thay vì giữ sai. Giữ legacy non-Studio và effective pricing/campaign [startAt,endAt), không coi lệch published raw price là bug khi có campaign.
- Không đổi order/payment snapshots hay contracts ngoài cần thiết. Không thêm dependency/framework/abstraction không cần.

## Nghiệm thu

1. Mở rộng test hành vi sẵn có thành regression: mixed conditions, khác CPU/GPU/RAM/SSD, combined filters cùng variant, 1TB vs 2TB, facets, unpublished variants, legacy, active/expired campaign. Assert kết quả đúng sau fix, không assert lỗi cũ.
2. Browser local fixture riêng: publish từ Admin, reload, search/category/filter/PDP variant/giỏ/checkout quote nhất quán. Nếu thiếu variant-specific route param, chọn trong UI và đối chiếu contract hiện có. Không tác động dữ liệu thật/remote.
3. Scoped lint, typecheck, các test catalog/studio/order guard/pricing liên quan. Storefront 1440/768/390/320 và native zoom 200% cho phần thay đổi; Admin desktop.
4. Ghi R2 RUNNING/DONE, file/lệnh/kết quả/artifacts/giới hạn vào docs/ANTIGRAVITY-AUDIT-REPORT.md. Xong chờ Codex review. Giữ các ràng buộc bảo toàn workspace trong R1.
