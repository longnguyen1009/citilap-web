# Cải thiện Admin theo admin-prototype

Ngày: 26/10/2026. Tham chiếu: `public/admin-prototype/index.html`.
Ưu tiên người dùng chọn: Sản phẩm trước. Mỗi lượt hoàn thiện một trang và kiểm tra trước khi chuyển sang trang tiếp theo.

## Quy tắc giao diện

- Admin dành cho PC: thanh trên tối 44px, sidebar 240px, nền slate nhạt, card trắng viền rõ.
- Tiêu đề 22px, chữ nội dung 13px, bộ lọc gọn, bảng sát mép card, thao tác có tên đọc được.
- Breadcrumb xuất hiện một lần. Không cần di chuột mới thấy thao tác chính.
- Nút, bộ lọc, trạng thái và số liệu phải nối API thật. Không chuyển các `alert()` mô phỏng, doanh thu mẫu, tồn kho mẫu hoặc trạng thái sức khỏe giả từ prototype vào admin.
- Giữ phân quyền, giá, cấu hình, ảnh, nội dung nháp, hợp đồng API và lịch sử nghiệp vụ. Chỉ xuất bản khi người dùng chọn rõ hành động đó.
- Dialog dùng nền tảng trình duyệt: khóa tương tác nền, Tab, Escape, trả focus và hỗ trợ reduced motion.

## Phân tích và thứ tự từng trang

Các dòng chưa hoàn thiện là kế hoạch từ đối chiếu mã nguồn với prototype; chưa phải chứng nhận giao diện bằng trình duyệt.

| Lượt | Trang | Chênh lệch và hướng cải thiện | Trạng thái |
| --- | --- | --- | --- |
| 1 | `/admin/products` | Card bị padding mặc định đè `p-0`; thông tin kỹ thuật và nút lặp làm hàng cao; bộ lọc bị giấu; nhãn trạng thái có giá trị API không hỗ trợ. Cần bảng gọn, bộ lọc rõ, trạng thái đúng và sửa nhanh an toàn. | Đã hoàn thiện lượt này |
| 2 | `/admin/products/new`, `/admin/products/[id]` | Editor hai cột theo prototype, sidebar xuất bản, đối chiếu nháp/công khai; tab cấu hình, media, nội dung, FAQ/quà tặng, kiểm định, SEO và lịch sử. | Đã làm; kiểm chứng bên dưới |
| 3 | `/admin/dashboard` | Các card tác vụ và lối tắt chiếm nhiều chiều cao. Gom việc cần xử lý, đơn mới, nháp sản phẩm và lối tắt theo bố cục hai cột của mẫu; dùng số liệu vận hành hiện có. | Đã smoke test khung chung; chưa cải thiện riêng |
| 4 | `/admin/orders`, `/admin/orders/[id]` | Tìm kiếm, trạng thái, ngày và bảng cần cùng nhịp; trang chi tiết dài. Ưu tiên khách hàng, mặt hàng, tổng tiền, trạng thái và lịch sử; giữ vòng đời đơn và xuất dữ liệu theo quyền. | Đã smoke test danh sách với khung chung; chưa cải thiện riêng |
| 5 | `/admin/customers` | Card tổng hợp, bảng và dialog chi tiết cần cùng mật độ. Phân biệt khách đăng ký/vãng lai, tổng chi tiêu và đơn bị hủy; làm rõ liên hệ và lịch sử. | Chưa làm riêng |
| 6 | `/admin/contacts` | Tin liên hệ dạng card dài. Thu gọn vùng nhận diện khách, nguồn, nội dung, trạng thái và thao tác phản hồi; giữ toàn bộ lời nhắn và tiến trình xử lý. | Chưa làm riêng |
| 7 | `/admin/categories` | Dùng chung NavigationStudio với quản lý menu. Cần làm rõ cây danh mục, cha/con, trạng thái và form sửa; giữ ID, đường dẫn và liên kết sản phẩm. | Chưa làm riêng |
| 8 | `/admin/brands` | Trang có bộ lọc và form riêng. Đồng bộ bảng, logo, trạng thái, số sản phẩm, chỉnh sửa và lỗi nhập liệu. | Chưa làm riêng |
| 9 | `/admin/campaigns` | Header, bảng và editor dùng kiểu riêng. Đồng bộ trạng thái, khoảng giờ GMT+7, sản phẩm, giá và thao tác; giữ chống chồng chiến dịch và kiểm tra phiên bản. | Chưa làm riêng |
| 10 | `/admin/media` | Header và controls trong `media.css` lớn hơn mẫu. Gọn vùng tải lên/bộ lọc; giữ ảnh dễ chọn, chi tiết metadata và nguồn sử dụng; không thay cơ chế R2. | Chưa làm riêng |
| 11 | `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]` | Đồng bộ danh sách ảnh bìa, tác giả, chuyên mục, trạng thái và thời gian; editor cùng nhịp với Product Studio. Giữ nháp, lịch đăng và SEO. | Chưa làm riêng |
| 12 | `/admin/post-categories` | Đồng bộ form và bảng chuyên mục, slug, trạng thái, số bài và thao tác lưu/lỗi. | Chưa làm riêng |
| 13 | `/admin/pages`, `/admin/pages/new`, `/admin/pages/[id]` | Gọn danh sách trang chính sách; làm rõ đường dẫn, xuất bản và cập nhật; editor giữ HTML, SEO và media hiện có. | Chưa làm riêng |
| 14 | `/admin/builder`, `/admin/builder/[id]` | Danh sách trang, lối vào editor và thao tác xem trước cần cùng kiểu. Giữ bố cục nội dung, section, lịch xuất bản và các luồng builder đang chạy. | Chưa làm riêng |
| 15 | `/admin/navigation` | Tách rõ menu, cây danh mục và bộ sưu tập trong workspace; giữ nhãn, thứ tự, liên kết và menu đã biên tập. | Chưa làm riêng |
| 16 | `/admin/analytics` | Trang đã có bộ trình bày riêng. Rà lại phân cấp chỉ số, phễu, bảng ngày, trường hợp chưa có dữ liệu và nhãn thời gian; không thay cách tính. | Chưa làm riêng |
| 17 | `/admin/settings` | Form dài với nhiều nhóm. Đồng bộ tab, phần cấu hình và vùng lưu; giữ mọi giá trị, kiểm tra hợp lệ và trạng thái thay đổi chưa lưu. | Chưa làm riêng |
| 18 | `/admin/users` | Rà bảng thành viên, trạng thái, vai trò và form; quyền nhạy cảm phải rõ và giữ nguyên bảo vệ Owner hiện có. | Chưa làm riêng |
| 19 | `/admin/audit` | Đồng bộ toolbar, bộ lọc, bảng, chi tiết sự kiện, sao chép và phân trang; không rút gọn mất chứng cứ. | Chưa làm riêng |
| 20 | `/admin/redirects` | Đồng bộ form tạo/sửa, nguồn/đích, trạng thái, tìm kiếm và phân trang; giữ kiểm tra vòng lặp và đường dẫn. | Chưa làm riêng |

## Lượt 1: khung chung và Sản phẩm

### Đã sửa

- Khung chung theo kích thước mẫu, menu nhóm gọn, active link không trùng khi mở trang thêm sản phẩm; giữ kiểm tra phiên và phân quyền.
- Menu tạo nhanh lọc theo quyền, đóng bằng Escape/click ngoài. Tìm kiếm dùng API admin để tìm cả sản phẩm nháp; đọc đúng response đơn hàng và mở đúng chi tiết đơn.
- PageHeader gọn, bỏ breadcrumb trùng ở topbar. AdminCard tôn trọng padding truyền vào, không còn `sm:p-6` đè bảng.
- Sản phẩm có bộ lọc sẵn, phân trang 20/50/100, số kết quả theo bộ lọc thật, hành động ngay dưới tên, ảnh 56px, giá dễ đọc và thông báo có nháp mới.
- Trạng thái nhận đơn đúng hợp đồng: `AVAILABLE`, `PREORDER`, `CONTACT`, `UNAVAILABLE`. Không gắn nhãn “hết hàng” cho mọi trạng thái không nhận đơn.
- Tìm kiếm dùng form native. URL giữ bộ lọc/phân trang khi reload; request cũ không ghi đè kết quả request mới.
- Sửa nhanh đọc bản nháp khi mở, gửi `{ expectedRevision, action, document }`, giữ các trường ngoài phạm vi chỉnh. Giá theo cấu hình vẫn chỉnh trong editor đầy đủ.
- “Lưu nháp” và “Xuất bản” là hai nút rõ ràng. Có thông báo và xác nhận nếu xuất bản sản phẩm đang có nháp mới. Lỗi/xung đột giữ nguyên dữ liệu người dùng vừa nhập.

### Kiểm tra

- `node node_modules/typescript/bin/tsc --noEmit --pretty false`: PASS.
- ESLint 7 file TSX thay đổi: PASS, không lỗi/cảnh báo.
- `git diff --check`: PASS.
- `npm.cmd run build:cloudflare`: PASS, kết thúc với `Build complete.`
- `node scripts/test-admin-products-ui.mjs`: **11/11 PASS**, Chrome thật, 1280/1440/1920px; bộ lọc, phân trang/reload, tìm kiếm rỗng, dialog/focus/Escape, kiểm tra giá, lỗi phiên bản, payload lưu/xuất bản, lỗi danh sách/thử lại, command search sau kết quả rỗng.
- API đọc dùng dữ liệu local thật. Bài kiểm tra chặn toàn bộ mutation sản phẩm; lỗi 409 và phản hồi ghi thành công được mô phỏng. So sánh detail trước/sau xác nhận sản phẩm local giữ nguyên. Chưa xác nhận ghi thật vào D1 cho ngăn sửa nhanh.
- Smoke test khung chung ở `/admin/dashboard` và `/admin/orders`: mở được, có tiêu đề/nội dung, không tràn toàn trang. Không tính là nghiệm thu hai trang đó.
- Không kiểm tra mobile admin. Không thay đổi storefront, migration hoặc triển khai remote.
- Kiểm tra phụ sau build/HMR: `/admin` trả 307 và prototype trả 200; GET `/` bị timeout 15–20 giây trong hai lần gọi. Chưa xác định nguyên nhân, không coi storefront là PASS trong lượt này. Giữ server đang chạy để không gián đoạn phiên biên tập.

### Ảnh local

- [Sản phẩm trước](../../.wrangler/admin-ui-evidence/products-before.png)
- [Sản phẩm 1280px](../../.wrangler/admin-ui-evidence/products-1280.png)
- [Sản phẩm 1440px](../../.wrangler/admin-ui-evidence/products-1440.png)
- [Sản phẩm 1920px](../../.wrangler/admin-ui-evidence/products-1920.png)
- [Sửa nhanh](../../.wrangler/admin-ui-evidence/products-quick-edit.png)
- [Tìm kiếm](../../.wrangler/admin-ui-evidence/products-command-search.png)

Ảnh nằm trong `.wrangler` bị Git ignore, chỉ có trong workspace local.

## Lượt 2: logic danh sách, thêm/sửa sản phẩm và xem trước

### Thay đổi

- Danh sách tìm được SKU chưa xuất bản; lọc đủ chín loại phụ kiện. Danh mục, hãng, giá, ảnh đầu tiên và trạng thái nhận đơn theo nháp; hiện riêng giá/trạng thái website nếu khác. Sắp xếp theo giá/tên nháp, thời gian sửa Studio; giới hạn trang vượt phạm vi về trang cuối. Không trộn sản phẩm lưu trữ vào tab bản nháp.
- Editor chia hai cột, sidebar xuất bản cố định, ô tên đầy đủ; tab có bàn phím trái/phải/Home/End và nhãn form. Hồ sơ kiểm định lưu riêng trong tab Kiểm định, không xuất hiện dưới mọi tab.
- Tách rõ lưu nháp và xuất bản toàn bộ nội dung. Hiển thị bản đang công khai, giá chung và trạng thái nhận đơn; liên kết website dùng slug/template đã xuất bản qua productHref(). Giữ dữ liệu nhập khi API lỗi/409, hỗ trợ tải JSON và đối chiếu máy chủ; chặn tạo trùng lúc chuyển trang sau POST.
- Dùng schema chung kiểm tra trước khi gửi. Sửa trạng thái biến thể về AVAILABLE/PREORDER/CONTACT/UNAVAILABLE, cho phép kế thừa sản phẩm. Thêm giá gốc từng cấu hình; schema chặn giá gốc thấp hơn giá bán. Xóa cấu hình chuyển ảnh liên kết sang dùng chung.
- Chọn được cả ảnh và video; chặn vượt 30 media/40 cấu hình. Chèn ảnh bài viết qua DOM native để escape tên/ALT. Slug tự theo tên tới khi được chỉnh tay.
- Lịch sử đánh dấu publishedRevision thực tế thay vì đánh dấu revision nháp mới nhất. Đọc sản phẩm legacy không tự tạo cấu hình với ID ngẫu nhiên; giữ tình trạng đã lưu của cấu hình.
- Sửa trang preview đọc đúng {success,data}, giải URL ảnh qua thư viện media, cung cấp context cho component Storefront; vô hiệu thao tác mua hàng. Preview dùng nháp đã lưu và chưa tính chương trình ưu đãi. Dialog Xem trước tóm tắt bản đang nhập.
- Dùng hợp đồng dữ liệu hiện có; không đưa các số tồn kho, showroom, tên rút gọn hoặc nút giả từ prototype vào sản phẩm thật. Không sửa migration hoặc dữ liệu remote.

### Bằng chứng

- Product Studio: **17/17 PASS**, D1/R2 Miniflare cô lập, chạy toàn bộ migration; tạo/lưu/xuất bản/reload, snapshot công khai, ảnh nháp, lọc/sắp xếp, SKU nháp, lịch sử và concurrency. Không ghi DB local đang dùng.
- Unified Catalog: **12/12 PASS**, 125 bản ghi cô lập, phân trang vượt 100 sản phẩm, kế thừa legacy, lưu trữ giữ OrderItem, xuất bản và 409. Harness đã thêm external cho module Workers/Prisma WASM hiện tại.
- Guard nhận đơn: **5/5 PASS**; kiểm tra response danh mục: PASS. Harness response đã cập nhật requestId/router theo component hiện tại.
- TypeScript toàn repo: PASS. ESLint năm file TS/TSX thay đổi: PASS, không cảnh báo. Diff whitespace: PASS.
- Chrome editor: **4/4 PASS**, desktop 1280/1440/1920px, tab/bàn phím, giữ input và payload đầy đủ khi 409, slug tự động/tùy chỉnh, thiếu danh mục chặn gửi, preview không kích hoạt mua hàng. API đọc local thật, mọi mutation sản phẩm bị CDP chặn; không coi đây là bằng chứng ghi D1 qua trình duyệt.
- Chrome danh sách: một lượt đạt 11/11 trước thay đổi ảnh nháp cuối; lượt sau đạt ba độ rộng và bộ lọc, rồi dừng do runtime kẹt ở kiểm tra phiên sau reload trang 2. Không ghi nhận toàn bộ suite kết hợp là PASS ở snapshot cuối.
- Runtime: khởi động lại đúng Vite PID 22428 sau request treo; server mới ready sau khoảng 91 giây. Log vẫn có cảnh báo multiple renderers và request 34-72 giây quanh HMR. Chưa xác định root cause; không khẳng định đã sửa lỗi tốc độ dev.
- `npm.cmd run build:cloudflare`: PASS, exit 0, kết thúc `Build complete.`
- Sau build, restart dev vì route admin timeout. Server cuối ready sau 104,6 giây; GET `/admin` = 307 (200ms), API danh mục chưa đăng nhập = 401 (302ms), prototype = 200 (67ms). Đây là kiểm tra HTTP khởi động, không thay thế kiểm tra phiên admin bằng trình duyệt.

### Tiếp tục bám mẫu: bố cục editor

- Tên/slug luôn hiển thị trên dải tab cuộn ngang; nút xem trước/lưu/xuất bản nằm trên đầu trang.
- Giá chung chỉnh trực tiếp ở sidebar. Cấu hình hiển thị thành hàng với tên, SKU, giá bán, nhận đơn, giá gốc; mở chi tiết để sửa thông số và tình trạng.
- Danh sách dùng tiêu đề “Tất cả sản phẩm”, gom bộ lọc vào khối trắng có viền.
- Không thêm dữ liệu giả cho model, tên rút gọn, cấu hình mặc định hay tồn kho.
- Kiểm tra lượt này: TypeScript và ESLint hai màn PASS; Chrome editor 4/4 PASS ở 1280/1440/1920px, có kiểm tra tên nằm trên tab và giá trong sidebar. API đọc thật, ghi sản phẩm bị chặn. Chưa chạy lại toàn bộ kiểm thử danh sách.

### Ảnh desktop

- [Editor 1280px](../../.wrangler/admin-ui-evidence/product-editor-1280.png)
- [Editor 1440px](../../.wrangler/admin-ui-evidence/product-editor-1440.png)
- [Editor 1920px](../../.wrangler/admin-ui-evidence/product-editor-1920.png)
- [Giữ bản sửa khi lỗi phiên bản](../../.wrangler/admin-ui-evidence/product-editor-conflict.png)
- [Xem trước Storefront](../../.wrangler/admin-ui-evidence/product-draft-preview.png)
