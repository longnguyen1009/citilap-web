# R3 — Nội dung mâu thuẫn, media giả, liên kết, semantic UI

Chờ Codex giao sau R2. Giữ phạm vi bảo toàn workspace/local/remote của R1.

## Lỗi source/browser Codex đã thấy

- `src/app/(shop)/brand/[slug]/page.tsx`: hứa bảo hành chính hãng 12–24 tháng, bao test 1 đổi 1 trong 15 ngày. Chính sách/business profile và các trang khác dùng gói theo SKU, hỗ trợ lỗi kỹ thuật trong 7 ngày. Bỏ lời hứa chung không đúng; dẫn tới chính sách và thời hạn theo sản phẩm/đơn. Không bịa cam kết mới.
- `src/app/(shop)/news/page.tsx`: DEFAULT_SIDEBAR_VIDEOS gán tiêu đề review laptop cho video mẫu aqz-KE-bpKQ, ysz5S6PUM-U, jNQXAC9IVRw; fallback YouTube sang kênh đối thủ CellphoneSOfficial. Chỉ dùng media/kênh đã cấu hình published đúng. Không có video/kênh thì ẩn module/CTA, không thay bằng mock. Kiểm tra disabled/empty CMS block không tự resurrect fallback.
- Browser `.wrangler/audit-public/report.json`: ảnh badge Bộ Công Thương dùng `bizweb.dktcdn.net/.../logo_bct.png` tải lỗi trên phần lớn trang. Footer link fallback `#` nhưng vẫn title/alt khẳng định đã thông báo. Chỉ render badge khi enabled, có ảnh hợp lệ và URL xác minh thực; không dựng chứng nhận/URL giả. Dữ liệu hiện có không đủ thì ẩn, Admin báo field validation rõ. Không tự nhận chứng nhận pháp lý.
- Empty cart/checkout/success, news thiếu h1 trong lần duyệt; kiểm tra trạng thái thực và sửa semantic heading cần thiết, không redesign rộng. Screenshot `.wrangler/audit-public/`.
- Browser native zoom phát hiện `/search` có 2 `<main>` lồng nhau (layout + page). Giữ một landmark main, thay wrapper nội dung bằng section/div đúng semantics; rà các trang tương tự. Đây là lỗi accessibility, không phải chỉ lỗi selector test.
- `.wrangler/audit-public-dynamic/report.json`: `/brand/lenovo` còn broken image `brands/lenovo.svg` (relative URL resolve sai dưới /brand). Chuẩn hóa media URL/path ở boundary phù hợp, giữ external/CDN/R2 URLs, test brand list/detail/Admin preview. Laptop/PDP/accessory/category/collection/news sample không overflow ở 4 viewports; đây chỉ là rendering proof.
- `.wrangler/audit-public/links.json` là kết quả crawl liên kết nội bộ thực. Điều tra các 4xx/error bằng route/data trước sửa; permalink alias phải redirect đúng và giữ query SKU.
- Dữ liệu local hiện có: chuột Dareu LM106G, bàn phím Dareu EK75, RAM DDR5 Samsung/SK Hynix, hub Rapoo XD61/XD71 có category phụ kiện nhưng published Studio template `LAPTOP`, link public `/laptop/...`. Kiểm tra đây là seed/adoption lỗi hay cấu hình tác giả; sửa default/adoption/seed local phù hợp ACCESSORY, không tự sửa remote hoặc phát minh specs. Nếu đổi local published data, backup + idempotent script + so sánh trước/sau và giữ snapshots đơn cũ. Xác minh Admin kind filter/card/PDP/accessory route nhất quán.

## Rà soát mở rộng có giới hạn rõ

Đối chiếu settings/published pages với Header/Footer/PDP/brand/profile/contact/showroom/policies/checkout: phone/email/address/giờ làm, condition/warranty/returns/shipping/pickup. Trường nào có CMS thì dùng nguồn cùng contract; không vừa settings mới vừa hardcode cũ. Kiểm tra cả metadata/JSON-LD, không chỉ body. Không tùy tiện xóa nội dung CMS hoặc ghi seed lên dữ liệu thật. Fixture riêng chứng minh đổi settings rồi reload hiển thị nhất quán.

Kiểm tra menu/link/filter/tab/carousel/dialog trên storefront 1440/768/390/320px, bàn phím, reduced motion, native zoom 200%. Dùng nguồn thật, không thay layout hiện có khi không có lỗi.

## Nghiệm thu

- Browser trước/sau lỗi vừa nêu, links không còn dead target, ảnh không vỡ, không fallback kênh/video sai, lời hứa nhất quán.
- Một runnable regression check có ý nghĩa cho resolver/validation mới nếu có logic; không chỉ string assertion.
- Typecheck/scoped lint/test liên quan; ảnh/JSON/lệnh thật, ghi R3 RUNNING/DONE vào report; chờ Codex review.
