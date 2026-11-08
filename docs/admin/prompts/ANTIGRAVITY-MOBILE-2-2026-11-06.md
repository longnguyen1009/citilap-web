# MOBILE 2 — Chi tiết sản phẩm, Giỏ hàng, Checkout

Chỉ thực hiện khi Codex gửi file này như tác vụ tiếp theo. Giữ toàn bộ giới hạn của `ANTIGRAVITY-MOBILE-2026-11-06.md` và kết quả MOBILE 1 đã được chấp nhận.

Ghi ngay `MOBILE 2 ACK` trong `docs/admin/STOREFRONT-MOBILE-UI-REVIEW-2026-11-06.md`, rồi sửa và kiểm tra thực tế, không chỉ lập kế hoạch.

Tận dụng source/docs/baseline đã đọc ở MOBILE 1; không tải lại guidance hoặc đọc lại toàn repo. Đi thẳng vào component thực sự được route dùng, ưu tiên diff nhỏ dựa trên lỗi tái hiện. Command async phải poll đến hoàn tất trong turn; không kết thúc ở thông báo đang chạy.

Điểm bắt đầu source: `src/components/product/ProductDetailPage.tsx`, `ProductHeroSection.tsx`, `ProductGallery.tsx`, `ProductPurchaseSection.tsx`, `StudioPurchaseSection.tsx`, `ProductQuickCheckoutModal.tsx`, `src/app/(shop)/cart/page.tsx`, `src/app/(shop)/checkout/page.tsx`. Dùng `rg --files` nếu cần tìm file, không đoán hàng loạt route group. `CartContext` chỉ đọc để hiểu contract, không đổi logic. Với dialog, dùng cơ chế native; không thêm focus trap/Escape listener trùng hoặc fallback nonmodal. Đọc report Codex `docs/admin/STOREFRONT-MOBILE-CODEX-REVIEW-2026-11-06.md` để phân biệt bằng chứng và lỗi lint có sẵn.

1. Kiểm tra một laptop và một phụ kiện được xuất bản thực tế, bằng URL lấy từ catalog hiện hành. Không hardcode fixture cũ hoặc tự bịa cart item khi nút thêm giỏ không hoạt động.
   - Codex vừa lấy từ HTML trang chủ local: `/laptop/ref-tgs-7172?sku=LOCAL-7172`, `/laptop/ref-tgs-19434?sku=LOCAL-19434`, `/phu-kien/phu-kien-mouse-keyboard`. Dùng như điểm bắt đầu và xác minh vẫn có dữ liệu/thêm giỏ thật, không coi URL này tự chứng minh khả dụng.
2. Rà và sửa UI Mobile của gallery, ảnh/video, tên máy, giá, chọn cấu hình/biến thể/bảo hành, nhận đơn/hết hàng, ưu đãi, hồ sơ kiểm định, thông số và mô tả. Thông tin mua hàng quan trọng phải thấy trước; nhóm nội dung dài hợp lý; không thay nội dung, dữ liệu hoặc logic nghiệp vụ.
3. Kiểm tra sticky CTA, bottom navigation, nút liên hệ, safe-area, chiều cao viewport ngắn. Không che nút mua, tổng tiền, field đang nhập hoặc nội dung cuối trang. Vùng chạm điều khiển chính khoảng 44×44px.
4. Dùng browser profile cô lập, chọn sản phẩm/biến thể rồi thêm giỏ bằng thao tác thật. Kiểm tra đổi số lượng, xóa, tải lại, quay lại, sản phẩm không khả dụng và lỗi xác thực giỏ. Giữ nguyên revalidation, giá snapshot và PRICE_CHANGED.
5. Kiểm tra checkout có sản phẩm: thông tin liên hệ/giao hàng, bàn phím đúng loại, nhãn field, thông báo lỗi đúng chỗ, thứ tự form, phương thức thanh toán, tổng tiền và retry không mất thông tin. Input mobile cần cỡ chữ ít nhất16px để tránh autozoom trên iOS, gồm ô tìm kiếm dùng chung nếu còn nhỏ; không tắt user zoom. Chỉ sửa presentation/interaction; không đổi validation business, API, giá/phí, thanh toán, idempotency hoặc contracts.
6. Không submit đơn/liên hệ/thanh toán thật. Trên local đã xác định, có thể gọi quote để kiểm chứng hiển thị tổng tiền (quote có thể tăng bộ đếm rate-limit, không tạo đơn). Chặn API tạo đơn/liên hệ/thanh toán trong browser QA; dùng fixture cô lập nếu cần thử response success/failure và ghi rõ fixture không chứng minh ghi DB thật. Không reset/migrate/seed DB đang chạy.
7. Kiểm tra loading/empty/error/retry, hết hàng, nội dung/giá dài, modal gallery/quick checkout, Escape, focus trap/return, keyboard, touch và reduced-motion. Phân biệt trạng thái thật và trạng thái fixture.

Trình duyệt thật: 320×568, 390×844, 430×932, 768×1024, 1440×900 và desktop native zoom 200%. Đợi dữ liệu/hydration xong. Ghi bằng chứng UI có giỏ và form; ảnh giỏ rỗng không đủ kết luận luồng checkout PASS.

Đọc script trước chạy. Chạy TypeScript, lint file chỉnh, kiểm tra hiện có phù hợp và build:cloudflare. Đối chiếu regression Trang chủ/Menu/Filter từ MOBILE 1. Bảo toàn dirty worktree; không sửa Admin/backend/schema/migration, không commit/deploy hoặc đổi cơ chế quyền.

Ghi phát hiện, file đã sửa riêng trong đợt, ảnh trước/sau, routes/viewports, lệnh/kết quả, browser vs fixture vs DB, phần chưa kiểm chứng. Bằng chứng tại `.wrangler/storefront-mobile-20261106/`. Khi hoàn tất ghi `MOBILE 2 DONE`, dừng chỉnh và chờ Codex review. Không tự bắt đầu MOBILE 3.
