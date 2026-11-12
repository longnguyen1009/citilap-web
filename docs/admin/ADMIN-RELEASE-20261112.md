# Admin release review — 12/11/2026

Người dùng đã yêu cầu review và push `origin/production`. Báo cáo này thay thế trạng thái lịch sử trong nhật ký review; không xác nhận deploy hoặc migration remote.

## Phạm vi

- Builder: giữ thay đổi khi chọn khối, preview validation/409, Ctrl+S, xác nhận restore; preview iframe và các component tách riêng đi cùng editor.
- Campaigns: giá canonical, khóa ARCHIVED, revision mới khi toggle, overlap sản phẩm/biến thể, chặn publish rỗng, picker và bulk discount.
- Products: revision concurrency, giá ma trận theo sản phẩm, giá min ACTIVE variant, snapshot/restore và unpublish.
- Orders/Inventory: revision và lifecycle, quyền sở hữu serial/reservation, kiểm tra nhập kho/QC, rollback tài chính.
- Brands CAS; Analytics aggregate toàn khoảng/phân trang; Audit/Redirects clipboard và request race; Media detail/clipboard race; Settings giữ input mới khi save/video trả chậm; feedback Users/PostCategories.
- Recovery actor/entity/revision và bảo vệ bản tạm khác tab; wiring Builder/Product/Post/StaticPage. Chưa nghiệm thu toàn bộ recovery của Navigation/Categories/Settings hoặc toàn luồng nhiều tab.

## Phần chưa phát hành

- Giữ thay đổi Dashboard, Customers và CategoriesStudio ngoài commit. Dashboard còn aggregate bị cắt; selected CSV khách hàng cần đi qua export API có quyền và audit; Categories cần review lại thao tác xác nhận bất đồng bộ.
- Quota Flash Sale chưa trừ suất atomic, chưa kiểm tra cộng dồn mỗi khách/cancel/reopen. Chặn cấu hình `quantityLimit`/`perCustomerLimit` ở schema server, khóa input và ghi rõ chưa khả dụng. Không quảng bá số đã bán là hoàn thiện. Mở lại sau khi prompt08A qua kiểm thử concurrency.
- Migration0030 dở dang giữ trong `.wrangler`, không nằm trong migrations phát hành. Migration0029 là phần mở rộng schema hiện được service/generated Prisma sử dụng; cần áp dụng trước deploy runtime. Chưa áp dụng trên remote/shared DB.
- Inventory paging/filter/product picker; campaign history; undo/redo và tối ưu khác tiếp tục theo prompt đã lưu.

## Bằng chứng trước khi chốt commit

- Typecheck/scoped ESLint/Cloudflare build và diff whitespace PASS ở snapshot review; kiểm tra lại cây index trước push.
- Builder API13/13 và browser với D1 riêng; Product Studio18/18; Orders/Inventory21/21; Brands12/12; recovery9 checks PASS.
- Browser 25 trang × desktop1280/1440/1920 =75 checks PASS. Kiểm tra focused Settings, Audit/Redirects, Media, Analytics/Users/PostCategories và recovery Post/Page PASS. Các mutation mock không chứng minh persistence remote.
- Kiểm thử quota gate thêm vào `scripts/test-hot-sale-campaigns.mjs`; campaign không đặt quota tiếp tục hoạt động.
- Log/artifact cục bộ tại `.wrangler/admin-review-20261112/`; không commit session token, DB fixture hoặc cache.

## Cổng phát hành đã chạy lại trên cây index riêng

- `npx tsc --noEmit`, scoped ESLint toàn bộ source đã stage, `npm run build:cloudflare`, `git diff --cached --check`: exit0.
- Toàn bộ năm suite trong `.github/workflows/ci.yml` PASS: media-library, image-optimization-and-cache, security-and-cache, storefront-improvements, admin-storefront-audit.
- Campaigns (gồm hai trường quota bị chặn), Product Studio18/18, Orders/Inventory21/21, recovery9 checks, Brands12/12 PASS.
- Sửa assertion source cũ của image/cache test để nhận đúng fallback worker hiện tại: trả nguyên response sau khi lên lịch invalidation. Worker không thay đổi trong bản này.
- Cây test xuất từ index, không chứa thay đổi Dashboard/Customers/CategoriesStudio bị loại. Browser75 checks phía trên thuộc snapshot workspace trước tách phạm vi; chưa chạy lại toàn bộ browser trên cây index. Preview iframe mới có source/build review, chưa có nghiệm thu browser riêng.

Push Git không đồng nghĩa website production đã deploy. Workflow repo chạy CI khi push; không có bước deploy trong workflow hiện tại.
