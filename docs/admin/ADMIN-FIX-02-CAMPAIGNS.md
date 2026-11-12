# Antigravity — vòng 02: Campaigns

Chỉ chạy khi Codex giao. Đọc AGENTS.md, ADMIN-REVIEW-20261112.md, source mới nhất, Next docs. Sửa trực tiếp, diff nhỏ. Không sửa storefront, deploy/push/remote writes/reset/stash/clean. Có tiến trình khác đang sửa shared UI/autosave: giữ nguyên.

Phạm vi campaign.service.ts, campaigns API/contracts/page, CampaignProductPicker; migration mới nếu cần giữ invariant race-safe. Đọc test-hot-sale-campaigns.mjs, test-r07b-* và trigger migration 0020 trước sửa.

1. Server canonical price: không tin regularPrice client. Lấy Product.price/ProductVariant.price active từ DB, đúng owner; salePrice phải >0 và < giá hiện bán. Lưu regularPrice chuẩn. published snapshot thay draft trong picker. Kiểm tra giá khi publish/toggle. Resolve campaign không để campaign cũ nâng giá bán sau khi catalog hạ giá. Không tạo đệ quy pricing context; tận dụng JOIN. Chạy test giá cơ sở/variant/campaign cũ sau đổi giá và client spoof.
2. ARCHIVED không thể bật lại bằng PUT; 409 rõ. UI khóa bật/sửa archive hoặc chỉ cho duplicate có chủ ý. CAS và D1 batch phải giữ rollback toàn bộ, kể cả audit.
3. handleToggle đang GET detail rồi gửi expectedRevision:c.revision; sửa current.data.revision. Editor load detail cũng phải lấy revision/detail đồng bộ, response cũ không ghi đè form khác.
4. PUBLISHED bắt buộc ít nhất một item; DRAFT rỗng vẫn hợp lệ.
5. Overlap khi cùng productId và một trong hai variantId NULL phải bị chặn, hai variant khác nhau vẫn cho phép. Kiểm tra cả trong cùng campaign. Áp service + DB trigger bảo vệ đua publish; nếu cần migration mới, không sửa migration đã áp. Khoảng nửa mở [start,end), chạm biên không trùng. SQL lọc thời gian thay tải lịch sử toàn bộ.
6. Picker chỉ dùng biến thể đang kinh doanh từ projection/published, không lấy draft unpublished variant IDs. Hiện giá/tồn kho thật, không bịa stock. Có phân trang kết quả (không chỉ 20). Không đưa status không tồn tại trong document schema; kiểm tra shape DTO thực tế.
7. Bulk percentage: VND integer dương, không NaN/Infinity, làm tròn phù hợp giá thấp và clamp < regularPrice; giá cơ sở 1đ không có sale dương thì báo không áp dụng. Thay alert bằng banner. Cảnh báo khi publish sửa giá campaign đang chạy.

Chưa làm quota/sold count ở vòng này: đây là tính năng cần reservation lifecycle và idempotency riêng. Không nhét migration quota sơ sài.

Một regression check runnable dùng Miniflare D1 hiện có, gồm concurrent overlaps và rollback. Chạy test liên quan, typecheck, scoped ESLint. Báo browser desktop riêng. ACK trước sửa; report `.wrangler/admin-review-20261112/round-02-report.md`, lệnh/exit/giới hạn, kết thúc ROUND 02 NEEDS_REVIEW rồi chờ Codex.
