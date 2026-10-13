# Kế hoạch tổng thể CMS Admin CitiLap

> Cập nhật phạm vi ngày 2026-10-13: dùng [ADMIN-CMS-MASTER-PLAN-V2.md](ADMIN-CMS-MASTER-PLAN-V2.md) làm kế hoạch hiện hành. Văn bản bên dưới giữ làm baseline lịch sử; các giới hạn cũ về shipping/payment settings, khách hàng, vai trò và phạm vi StoreFront được thay bằng V2. Không coi mô tả hiện trạng ngày 2026-10-12 là trạng thái code hiện tại.

Ngày: 2026-10-12. Trạng thái: kế hoạch đề xuất, chưa triển khai.
Baseline khảo sát: `citilap-web2`, HEAD `3694c01`; đối chiếu tài liệu ADMIN-01..04 và worktree `citilap-web2-admin`.
Phương pháp: đọc source, schema, route và tài liệu; chưa chạy browser, API live, D1 remote hoặc kiểm thử production trong lượt này. Tài liệu bàn giao cũ có đoạn chưa cập nhật trạng thái tích hợp; hiện source StoreFront đã gọi service CMS cho navigation, product và collection.

## 1. Mục tiêu và định nghĩa hoàn thành

Người vận hành có thể quản lý Laptop, Phụ kiện, Tin tức và Đơn hàng bằng giao diện tiếng Việt rõ ràng; tự đổi nội dung, ảnh, menu và các khối StoreFront đã hỗ trợ mà không sửa code hoặc deploy.

“Dễ dùng như WordPress” được cụ thể hóa thành: danh sách → thêm/sửa → lưu nháp → xem trước trên giao diện thật → xuất bản/cập nhật → khôi phục phiên bản. Các màn hình dùng cùng quy ước và một nguồn dữ liệu. Đây là CMS trên nền tảng hiện có, không phải kế hoạch cài WordPress.

Phạm vi Order mặc định là tiếp nhận và theo dõi yêu cầu đặt hàng từ website. Hoàn tất xử lý yêu cầu không đồng nghĩa đã thu tiền hoặc đã giao hàng. Kho, serial, kế toán, đối soát và cổng thanh toán không nằm trong kế hoạch này. Nếu cần fulfillment đầy đủ, tách đặc tả nghiệp vụ riêng trước khi mở rộng trạng thái.

Điều kiện hoàn thành bản CMS cốt lõi:

- Quản trị được cả 4 nhóm; mọi nút đang hiển thị có chức năng thật.
- Laptop/Phụ kiện dùng một hệ thống sản phẩm, một editor; mẫu trường khác nhau theo loại hàng.
- Bài viết có trang danh sách và chi tiết thật; không còn nội dung mẫu cố định trong luồng chính.
- Nội dung đã lưu tồn tại sau reload, đăng nhập máy khác và khởi động lại tiến trình.
- Nháp không lọt ra public; cập nhật public đúng các vị trí liên quan và có thể phục hồi.
- Đơn giữ nguyên thông tin sản phẩm/giá tại lúc gửi; xử lý có lịch sử và quyền truy cập.
- Người vận hành thực hiện được các kịch bản nghiệm thu ở mục 12 mà không cần hướng dẫn về API, JSON hay tên service.

## 2. Hiện trạng và quyết định kế thừa

| Hạng mục | Bằng chứng source hiện tại | Quyết định |
|---|---|---|
| Điều hướng Admin | `src/app/admin/layout.tsx` có cả Quản lý sản phẩm và Product Studio; Media đứng trước Tổng quan | Tổ chức lại theo công việc, hợp nhất điểm vào sản phẩm |
| Sản phẩm | ProductStudio, revision, gallery, biến thể, bảo hành, trạng thái web; `product-studio.service.ts` giới hạn danh sách 100 | Kế thừa service, làm lại danh sách/editor và phân trang server |
| Catalog cũ | `/admin/products`, `/new`, `/[id]` cùng tồn tại với studio | Lập ma trận trường và writer; chuyển từng luồng sang nguồn chuẩn trước khi bỏ editor cũ |
| Media | MediaAsset/MediaUsage, upload/picker và service hiện có | Dùng chung cho toàn CMS; mở rộng usage cho bài/trang/bố cục |
| Điều hướng public | Layout/home/category/PDP/collection đã gọi các hàm `getPublished*` | Giữ kết nối, kiểm chứng lại từng luồng; không coi tài liệu bàn giao cũ là trạng thái hiện hành |
| Danh mục/menu/collection | NavigationStudio là một tài liệu, lưu/publish chung; category page mở một tab của editor | Tách màn hình thao tác; giai đoạn đầu giữ atomic publication, nêu rõ toàn bộ thay đổi sắp xuất bản |
| Cài đặt | API `src/app/api/admin/settings/route.ts` dùng biến `cachedSettings`; UI có fallback localStorage báo thành công | Ưu tiên D1, validation, quyền/CSRF; lỗi server không được báo đã đồng bộ |
| Bảo vệ settings | Route settings không gọi guard; middleware chỉ match `/admin/:path*` | Kiểm chứng endpoint, bổ sung bảo vệ server trước khi sử dụng cấu hình thật |
| Loading settings | Nhánh fetch thành công return trước đoạn đặt loading=false trong UI | Đưa vào sửa lỗi nền; nghiệm thu tải thành công và thất bại |
| Tin tức | `src/app/(shop)/news/page.tsx` khai báo trực tiếp featuredArticle/articles | Xây ContentEntry + editor + API + renderer danh sách/chi tiết |
| Đơn hàng | Có danh sách/chi tiết, tìm kiếm, trạng thái PENDING/COMPLETED, OrderItem snapshot | Giữ tiếp nhận đang chạy, mở rộng quy trình và lịch sử có migration |
| Fallback CMS | `storefront-cms.service.ts` trả null cho cả 404 và 503 | Phân biệt chưa có publication với lỗi hạ tầng; rà soát tránh hiện catalog cũ khi người dùng đã chủ động ẩn |

Đây là kết luận từ source; chưa xác nhận biểu hiện trên website đang triển khai. Không xóa bảng inventory/payment chỉ vì các màn hình CMS không dùng chúng.

## 3. Cấu trúc menu đích

| Menu chính | Màn hình con | Công việc chính |
|---|---|---|
| Tổng quan | Việc cần làm, nội dung mới sửa | Xử lý đơn mới, tiếp tục nháp, phát hiện nội dung thiếu |
| Laptop | Tất cả laptop, Thêm laptop, Danh mục laptop | Quản lý catalog và nội dung laptop |
| Phụ kiện | Tất cả phụ kiện, Thêm phụ kiện, Danh mục phụ kiện | Quản lý chuột, bàn phím, tai nghe, sạc, hub, balo… |
| Tin tức | Tất cả bài viết, Viết bài, Chuyên mục, Thẻ | Biên tập và xuất bản |
| Đơn hàng | Tất cả đơn, Đơn cần xử lý, Liên hệ tư vấn | Theo dõi yêu cầu của khách |
| Thư viện | Ảnh/video, Đang sử dụng, Đã lưu trữ | Tải lên, chọn lại, quản lý media |
| Nội dung website | Trang chủ, Trang Laptop, Trang Phụ kiện, Trang Tin tức, Trang thông tin, Menu, Footer, Bộ sưu tập | Quyết định nội dung và thứ tự hiển thị |
| Cài đặt | Thông tin cửa hàng, Thương hiệu & mẫu thông số, SEO chung, Người dùng & quyền, Nhật ký | Quản trị cấu hình dùng chung |

Laptop và Phụ kiện là hai góc nhìn có bộ lọc/mẫu riêng trên cùng Product, không tạo hai database hoặc hai editor độc lập. “Khách hàng” chưa cần menu CRM riêng; thông tin khách đặt trong chi tiết đơn và lịch sử yêu cầu theo quyền.

Route đích gợi ý: `/admin/laptops`, `/admin/accessories`, `/admin/posts`, `/admin/orders`, `/admin/media`, `/admin/site/*`, `/admin/settings/*`. Đây là đề xuất, không phải route đã có. Chỉ bật mục menu khi màn hình đã hoạt động. URL cũ chuyển hướng đến đúng bản ghi, giữ query tìm kiếm khi phù hợp.

## 4. Quy tắc UX áp dụng toàn bộ Admin

- Sidebar tối đa hai cấp, tên tiếng Việt theo nghiệp vụ; không dùng tên nội bộ “Studio” làm nhiệm vụ người dùng phải lựa chọn.
- Danh sách dạng bảng gọn: tiêu đề + Thêm mới; tab trạng thái; tìm kiếm/bộ lọc; bảng; phân trang. Giữ bộ lọc trong URL khi mở chi tiết rồi quay lại.
- Các cột cơ bản: ảnh, tên, loại/danh mục, trạng thái, người sửa, lần sửa; sản phẩm thêm giá, đơn thêm khách và ngày gửi.
- Editor có vùng nội dung chính và vùng Xuất bản. Thông tin nâng cao thu gọn, không dồn tất cả vào một form dài.
- Nút nhất quán: Lưu nháp, Xem trước, Xuất bản; bản đã public dùng Cập nhật website; Ẩn khỏi website và Thùng rác là hai hành động khác nhau.
- Phân biệt “Đang nháp”, “Đã xuất bản”, “Có thay đổi chưa xuất bản”, “Đã ẩn”, “Trong thùng rác”. Trạng thái nhận đặt hàng hiển thị riêng.
- Autosave nháp có thời điểm lưu; cache phục hồi trình duyệt chỉ là cứu hộ, không được gọi là đã đồng bộ.
- Validation đặt cạnh trường và có danh sách lỗi liên kết đến trường; mất mạng/hết phiên/409 giữ nội dung đang sửa.
- Xem trước mở renderer StoreFront thật bằng phiên/token có hạn, noindex/no-store; không coi một modal mô tả dữ liệu là preview hoàn chỉnh.
- Mọi màn hình có loading, empty, error/retry, success và trạng thái không đủ quyền. Không có chỉ số hoặc thông báo giả.
- Desktop ưu tiên bảng thao tác; mobile giữ đọc/sửa cơ bản, toolbar không che trường. Kiểm tra bàn phím, focus, zoom 200%, nội dung tiếng Việt dài, không chỉ dựa vào màu.
- Bulk action chỉ áp dụng vào trường dùng chung, cho biết số bản ghi và lỗi từng dòng; publish/xóa có bước xem tác động.

## 5. Chi tiết bốn nhóm nghiệp vụ

### 5.1 Laptop

| Khu vực | Chức năng cần có | Nghiệm thu |
|---|---|---|
| Danh sách | Tìm tên/model/SKU; lọc hãng, danh mục, giá, trạng thái xuất bản/nhận đơn; sort; phân trang server | Tìm được bản ghi ngoài 100 sản phẩm gần nhất; quay lại giữ bộ lọc |
| Thông tin | Tên, slug, hãng, dòng máy, danh mục, mô tả ngắn, điểm nổi bật | Slug duy nhất, lỗi rõ ràng, không mất thông tin cũ |
| Thông số | CPU/GPU/RAM/SSD/màn hình/pin/cổng/kích thước/trọng lượng, đơn vị và nhóm hiển thị | Cùng dữ liệu phục vụ bảng thông số và filter StoreFront |
| Cấu hình bán | Các biến thể, SKU, tình trạng, giá/giá tham chiếu, trạng thái nhận đơn | Khách chọn biến thể thì giá, ảnh, CTA và đơn nhất quán |
| Bảo hành | Chính sách chung, lựa chọn thời hạn và phụ phí nếu áp dụng | Giá cuối cùng được xác minh phía server, snapshot đúng |
| Media | Ảnh đại diện, gallery, video được hỗ trợ, ảnh riêng biến thể, ALT, thứ tự | Không cho ảnh chưa sẵn sàng thành ảnh public |
| Nội dung | Editor trực quan cho mô tả, bảng, ảnh, FAQ và bài liên quan | Không phải nhập HTML; render an toàn trên PDP |
| SEO/hiển thị | Title, description, OG, URL, cờ nổi bật và bộ sưu tập | Thẻ preview đúng; đổi slug có redirect khi URL public dùng slug |
| Quản lý | Nhân bản thành nháp, lịch sử, phục hồi, ẩn, thùng rác | Nhân bản sinh ID/SKU phù hợp, không sửa đơn cũ; phục hồi tạo revision mới |

Luồng chuẩn: Laptop → Thêm laptop → nhập tối thiểu → Lưu nháp → thêm cấu hình/ảnh → Xem trước → Xuất bản → Mở trên website.

Không bắt người vận hành nhập đồng thời thông số text và thông số filter. Có mapping chuẩn hóa; trường không chuyển đổi được phải có cảnh báo, không âm thầm ghi sai.

### 5.2 Phụ kiện

Tái sử dụng danh sách, editor, media, SEO, publication và lịch sử sản phẩm; chọn mẫu theo loại:

| Mẫu | Trường đặc trưng ban đầu |
|---|---|
| Chuột | Kết nối, cảm biến/DPI, nút, trọng lượng, pin |
| Bàn phím | Layout, switch, kích thước, kết nối, đèn |
| Tai nghe | Kết nối, micro, driver, pin, nền tảng tương thích |
| Sạc | Công suất, chuẩn sạc, đầu kết nối, thiết bị tương thích |
| Hub | Cổng vào/ra, công suất PD, chuẩn truyền, hỗ trợ màn hình |
| Balo/túi | Cỡ laptop, kích thước, chất liệu, màu |
| Khác | Bộ thuộc tính có nhãn/kiểu/đơn vị do quản trị cấu hình |

Biến thể phù hợp gồm màu, kết nối, công suất; không ép RAM/CPU vào phụ kiện. Quan hệ “phù hợp với laptop” và “sản phẩm liên quan” tham chiếu ID, không sao chép sản phẩm. Bộ lọc và landing Phụ kiện lấy đúng phân loại.

Nghiệm thu: tạo chuột hai màu và hub hai mức công suất; mỗi cấu hình có ảnh/giá; PDP, giỏ hàng, đơn và reload đều giữ đúng lựa chọn.

### 5.3 Tin tức

- Danh sách bài: tìm kiếm, chuyên mục, tác giả, trạng thái, ngày; nhân bản, bulk chuyển chuyên mục, thùng rác.
- Editor: tiêu đề, slug, tóm tắt, ảnh đại diện/ALT, nội dung trực quan, chuyên mục, thẻ, tác giả hiển thị, bài nổi bật, SEO.
- Bộ nội dung ban đầu: đoạn văn, heading, danh sách, ảnh/chú thích, gallery, trích dẫn, bảng, video được phép, liên kết, khối sản phẩm liên quan. Không nhận script/embed tùy ý.
- Nháp, lưu tự động, xem trước, xuất bản, cập nhật, ẩn, lịch sử và khôi phục; lên lịch ở giai đoạn hoàn thiện.
- StoreFront: `/news`, trang chi tiết theo slug, chuyên mục, phân trang, tìm kiếm, bài liên quan; homepage chọn bài thủ công hoặc theo chuyên mục.
- SEO: metadata, canonical, OG, sitemap chỉ có bài public, redirect slug cũ. Không phát sinh ngày/tác giả giả.
- Trang thông tin dùng chung nền editor nhưng loại Page riêng: giới thiệu, liên hệ, chính sách. Chỉ xuất bản nội dung kinh doanh đã được duyệt.

Nghiệm thu: người biên tập tự tạo bài có ảnh và sản phẩm liên quan; nháp không đọc được từ public; cập nhật chỉ hiện sau publish; bài ẩn biến mất khỏi listing, tìm kiếm và sitemap.

### 5.4 Order / Đơn hàng

- Danh sách: mã đơn, thời điểm, tên/điện thoại, sản phẩm rút gọn, giá trị yêu cầu, trạng thái xử lý, người phụ trách; tìm mã/số điện thoại, lọc ngày/trạng thái/người phụ trách.
- Chi tiết: thông tin khách, phương thức nhận, ghi chú khách; sản phẩm/biến thể/bảo hành/giá lúc gửi; lịch sử xử lý; ghi chú nội bộ tách khỏi dữ liệu public.
- Luồng đề xuất: Mới → Đang xử lý → Đã xử lý; nhánh Hủy, đánh dấu trùng/spam bằng lý do. Đổi nhãn “Đã hoàn thành” thành “Đã xử lý yêu cầu” để tránh ngụ ý thanh toán/giao hàng.
- Khi triển khai phải đặc tả transition phía server, ai được mở lại, lý do bắt buộc khi hủy/mở lại; mỗi thay đổi ghi actor/thời gian/trạng thái cũ-mới.
- Mapping dữ liệu cũ: PENDING → Mới, COMPLETED → Đã xử lý; giữ thời gian và snapshot. Thay đổi enum phải đồng bộ API, UI, export, contract và test, không chỉ đổi dropdown.
- Tiếp nhận giữ idempotency chống gửi trùng; giá, availability và lựa chọn phải được server kiểm tra. Đơn gửi trước khi đổi giá vẫn giữ giá đã chốt lúc tiếp nhận.
- Export CSV theo filter và quyền, xử lý ký tự công thức; dữ liệu khách không đưa vào public DTO/log lỗi phổ thông. Không phục hồi PII vào localStorage của editor nội dung.
- Hộp thư liên hệ đặt gần đơn; có thể tạo yêu cầu xử lý liên kết nguồn mà không biến mỗi liên hệ thành đơn bán.
- Thông báo trong Admin cho đơn mới; email tự động/CRM là mở rộng riêng sau khi chốt kênh, nội dung và cơ chế gửi lại.

Nghiệm thu: đặt đơn từ StoreFront → xuất hiện Admin → phân công/ghi chú/chuyển trạng thái → reload giữ kết quả; sản phẩm đổi giá/ẩn không làm thay đổi lịch sử đơn.

## 6. Các chức năng CMS dùng chung

| Module | Công việc cụ thể |
|---|---|
| Media | Tìm/lọc, grid/list, tải nhiều file, tiến độ/lỗi từng file, metadata/ALT, nơi sử dụng, picker chung, chặn xóa asset đang được revision giữ lại |
| Danh mục | Cây theo Laptop/Phụ kiện, ảnh, mô tả, SEO, thứ tự, ẩn/hiện; chặn chu trình; preview các tham chiếu bị ảnh hưởng |
| Thương hiệu/mẫu thông số | Tên/logo, mẫu trường typed có đơn vị, trường filter, giá trị lựa chọn; thay mẫu phải preview tác động dữ liệu |
| Bộ sưu tập | Chọn/sắp sản phẩm thủ công trước; bộ động theo rule ở giai đoạn sau; cùng một nơi quản lý được dùng ở nhiều trang |
| Menu | Main/footer, nhãn, đích từ bộ chọn nội dung, hai cấp, thứ tự, kiểm tra link; desktop/mobile cùng nguồn |
| Trang chủ/trang nhóm | Danh sách block, thêm/bỏ/ẩn/sắp xếp/nhân bản, chọn nội dung tham chiếu, preview desktop/mobile, publish theo trang |
| Bộ block | Hero/banner; danh mục; lưới laptop; lưới phụ kiện; bộ sưu tập; bài viết; cam kết dịch vụ; FAQ; CTA |
| Cấu hình website | Logo/favicon, tên website, hotline/Zalo/social, địa chỉ/giờ mở cửa, footer, SEO mặc định; dữ liệu D1 có revision |
| Quyền/nhật ký | Chủ website, người xuất bản, biên tập viên, nhân viên đơn hàng; kiểm tra quyền từng action phía server |

Custom trong phạm vi block/mẫu đã hỗ trợ: thay nội dung, ảnh desktop/mobile, liên kết, số lượng item, nguồn dữ liệu, thứ tự và một số biến thể giao diện có kiểm soát. Block hoặc layout hoàn toàn mới vẫn cần bổ sung renderer; không hứa thay được mọi CSS bằng CMS.

Không tạo page builder tự do ngay từ đầu. Dùng các section phù hợp StoreFront đang có để giữ responsive và giảm thao tác. Nội dung giảm giá/countdown chỉ chạy theo cấu hình thực, không tự gia hạn giả khi process khởi động.

## 7. Ma trận Admin → StoreFront

| Nguồn quản trị | Nơi hiển thị cần kết nối | Bằng chứng nghiệm thu |
|---|---|---|
| Laptop/Phụ kiện | Card, category, tìm kiếm, collection, PDP, giỏ hàng, checkout | Cùng ID/giá/ảnh/biến thể, published-only và server kiểm tra khi gửi đơn |
| Thuộc tính | Filter listing và bảng thông số PDP | Cùng dữ liệu chuẩn hóa, không bộ lọc riêng hard-code lệch editor |
| Tin tức | Trang tin, chi tiết, chuyên mục, bài homepage, bài liên quan | Nháp/ẩn không public, URL và metadata đúng |
| Menu/danh mục | Header, mobile drawer, footer, category showcase | Thứ tự/ẩn hiện và đích liên kết đúng trên desktop/mobile |
| Block trang | Homepage, landing Laptop/Phụ kiện/Tin tức | Sắp thứ tự/ẩn block phản ánh đúng, không cần deploy |
| Settings | Header/footer/contact/CTA/metadata mặc định | Thay hotline trên Admin đồng bộ mọi vị trí và tồn tại qua restart |
| Order | Checkout/confirmation và Admin | Gửi một yêu cầu tạo một đơn, dữ liệu nội bộ không lọt public |

Mỗi field mới phải có: nơi sửa, nơi lưu, validator, quyền sửa/publish, public DTO và component tiêu thụ. Field chưa có renderer không được giới thiệu như chức năng đã dùng được.

## 8. Kiến trúc và chuyển đổi dữ liệu

1. Giữ Next.js/D1/R2 và catalog hiện có. Trước khi viết code, đọc guide Next.js cài trong `node_modules/next/dist/docs/` và instructions của worktree.
2. Product giữ định danh/quan hệ; ProductStudio giữ authoring/revision, projection public và filter cập nhật nhất quán. Rà soát toàn bộ writer cũ, kể cả bulk/import/restore. Không để một writer cập nhật Product nhưng bỏ qua publication.
3. Chuẩn hóa product kind/mẫu dữ liệu. Backfill có báo cáo các bản ghi chưa phân loại được; không suy diễn chỉ từ tên sản phẩm hoặc một slug danh mục.
4. Giữ NavigationStudio aggregate trước để giảm rủi ro. Màn hình tách nhưng publish phải liệt kê thay đổi liên quan. Tách revision theo entity chỉ khi có phương án dependency và atomic publish; không giả vờ mỗi tab lưu độc lập.
5. Bổ sung ContentEntry/ContentRevision cho Post/Page; SiteSettings và SitePage/Layout revisions; AuditEvent, OrderEvent/ghi chú/phân công theo nhu cầu. Tên bảng là đề xuất, chốt sau schema review; không đặt số migration trước khi kiểm tra nhánh tích hợp.
6. Mutation có auth, CSRF, validation, expectedRevision; publish cập nhật dữ liệu/con trỏ public/audit trong batch phù hợp. Actor phải là danh tính người thao tác, không luôn là chuỗi “admin”.
7. Publication và availability độc lập. Explicitly hidden không được fallback sang catalog legacy public. Phân biệt 404 chưa từng CMS, 404 đã ẩn và lỗi 503; quy định rõ fail-closed cho nội dung đã ẩn.
8. Cache theo revision/invalidation có retry; định nghĩa độ trễ hiển thị và kiểm tra trên môi trường triển khai. Preview cách ly khỏi cache/sitemap public.
9. Backup và diễn tập migration trên DB riêng; kiểm tra số lượng, FK, ID, slug, references, giá/snapshot trước-sau. Không reset/import đè DB đang dùng.
10. Giữ tương thích URL/product IDs/API consumer; export nội dung và assets có manifest. Rollback code không đủ nếu schema không tương thích: mỗi phase có phương án dữ liệu riêng.
11. Scheduling chạy job bền vững, lưu UTC và hiển thị giờ Việt Nam; retry idempotent, chỉ publish revision được chọn, không dùng timer trong browser.

## 9. Phân quyền đề xuất

| Thao tác | Chủ website | Người xuất bản | Biên tập viên | Nhân viên đơn hàng |
|---|---|---|---|---|
| Sửa nháp sản phẩm/bài/media | Có | Có | Có | Không |
| Xuất bản/ẩn/khôi phục public | Có | Có | Không | Không |
| Bố cục/menu | Có | Có | Nháp nếu được giao | Không |
| Xem/sửa xử lý đơn, PII | Có | Không mặc định | Không | Có |
| Export đơn | Có | Không | Không | Quyền riêng |
| Settings/quản lý tài khoản | Có | Không | Không | Không |

Giai đoạn đầu có thể tiếp tục admin hiện có, nhưng guard server và audit là bắt buộc từ đầu. Khi mở nhiều người dùng mới triển khai vai trò đầy đủ; menu ẩn không thay thế authorization.

## 10. Backlog triển khai và phụ thuộc

Mã CMS-Rxx dùng cho kế hoạch mới, không đổi tên hay suy diễn lại mức hoàn thành ADMIN-01..04. Mỗi gói kết thúc bằng bản chạy được có bằng chứng, không chỉ tạo UI.

| Gói | Ưu tiên / phụ thuộc | Đầu việc và sản phẩm bàn giao | Điều kiện đóng |
|---|---|---|---|
| R00 Baseline | P0 / đầu tiên | Kiểm kê routes/writers/field mapping; thống nhất ID, URL, trạng thái, fixture Laptop/Phụ kiện/đơn; ghi baseline regression; đối chiếu worktree/HEAD | Có bảng giữ/thay/chuyển đổi và test baseline trước sửa |
| R01 Độ tin cậy | P0 / R00 | Sửa loading/settings; auth/CSRF/schema; D1 persistence; bỏ thông báo thành công khi chỉ lưu local; phân biệt lỗi/fallback CMS | Save/reload/restart/máy khác đúng; 401/403; không lộ nháp/đã ẩn |
| R02 Shell & UX chung | P1 / R00 | Sidebar, breadcrumbs, danh sách/editor primitives, toolbar/state/errors, thuật ngữ; dashboard việc cần làm từ dữ liệu thật | Không link chết; 4 tác vụ chính dễ tìm; desktop/mobile/keyboard |
| R03 Catalog thống nhất | P1 / R01,R02 | Danh sách phân trang; product kind; editor tabs; chuyển writer cũ, bulk/restore; URL tương thích; laptop specs/variants/media | Một luồng ghi chuẩn; sản phẩm cũ giữ dữ liệu; test ngoài 100 bản ghi |
| R04 Phụ kiện | P1 / R03 | Mẫu thuộc tính, biến thể phù hợp, danh mục, tương thích, filter, landing contract | Chuột/hub tạo-sửa-publish-PDP-cart-order thành công |
| R05 Tin tức & trang | P1 / R01,R02 | ContentEntry/revision, rich editor, chuyên mục/tag, media, SEO, preview, public listing/detail; Page policy | Bài mới đi đủ luồng, nháp/ẩn cách ly public, URL không hỏng |
| R06 Order | P1 / R01,R02; regression R03,R04 | Transition/migration trạng thái, timeline, ghi chú, phân công, filter/export, privacy/idempotency | Đơn thật từ local StoreFront xử lý được; snapshot và lịch sử đúng |
| R07 Nội dung StoreFront | P1 / R03,R04,R05 | Menu/category/collection UX; block editor các trang; footer/settings consumers; preview thật | Ma trận mục 7 đạt trên desktop/mobile, giữ nháp và public riêng |
| R08 Hoàn thiện CMS | P2 / R03..R07 | Autosave còn thiếu, lịch sử/rollback UI đầy đủ, scheduling, roles, redirects/sitemap, import CSV dry-run, export nội dung | Conflict/recovery/permissions/schedule/restore được kiểm thử |
| R09 Nghiệm thu phát hành | P1 / R01..R08 | Migration rehearsal, UAT, browser QA, regression, staging, runbook/rollback và hướng dẫn người dùng | Có kết quả từng gate; staging đạt trước bước phát hành |

Thứ tự chính: R00 → R01 → R02 → R03 → R04 → R05 → R06 → R07 → R08 → R09. R05/R06 có thể làm song song sau nền tảng khi có người độc lập; schema/shared contracts phải tích hợp tuần tự.

Ba mốc sử dụng:

- M1: quản trị Laptop/Phụ kiện thống nhất và dữ liệu bền vững (R00–R04).
- M2: cả bốn nhóm vận hành, chỉnh được nội dung StoreFront chủ yếu (R05–R07; regression Order chạy từ các gói catalog).
- M3: CMS đủ cho vận hành nhiều người, phục hồi/lên lịch và phát hành có bằng chứng (R08–R09).

Chưa cam kết ngày hoàn thành khi chưa có baseline runtime, độ phức tạp dữ liệu và người triển khai. Mỗi gói tách task 0,5–2 ngày công sau R00; đo tốc độ qua M1 rồi lập lịch có dự phòng QA/tích hợp. Không tính hoàn thành backend tương đương hoàn thành tính năng CMS.

## 11. Phân công và bàn giao

- Codex: Admin, CMS services/API, hợp đồng dữ liệu, migration điều phối và test phần quản trị.
- Phía StoreFront: renderer, route, public SEO, preview, responsive và ánh xạ DTO sang card/PDP/cart/checkout.
- Người vận hành: xác nhận thuật ngữ, mẫu thông số, nội dung chính sách và thực hiện UAT.
- Làm Admin trong worktree Admin theo ownership hiện có; baseline hai nhánh phải kiểm tra lại trước mỗi phase. Tài liệu này được lưu trong workspace đang mở để review, chưa sửa code của hai phía.
- Mỗi handoff gồm contract version, field mapping, fixture, trạng thái empty/error/hidden, ảnh minh chứng, kết quả test, migration và rollback. Gắn người chịu trách nhiệm cho từng hàng ma trận mục 7.
- Không đánh dấu hoàn thành khi chỉ có API hoặc mock UI. Không tự sửa/commit thay đổi chưa hoàn tất của người khác; tích hợp tuần tự file schema, lockfile, shared CSS/services.

## 12. Nghiệm thu

| Gate | Kiểm chứng bắt buộc |
|---|---|
| G1 Tĩnh | Typecheck, lint phạm vi sửa, build phù hợp deployment; contract backward compatibility |
| G2 Service/data | D1/R2 local riêng: publish atomicity, 409, validation, quyền, usage, snapshot, migration/FK |
| G3 API | Auth/CSRF, pagination, payload lỗi, idempotency, public-only, PII isolation, lỗi hạ tầng |
| G4 Browser | Các luồng bên dưới, 1440/768/390, keyboard/zoom, lỗi mạng, phiên hết hạn, reload |
| G5 Tích hợp | StoreFront dùng dữ liệu thật: header/category/search/PDP/cart/checkout/news/collection; đổi giá/ẩn/publish không sai luồng |
| G6 Staging | Migration, restart, cache, R2 URLs, quyền, rollback và lịch xuất bản trên hạ tầng đích |
| G7 UAT | Người vận hành thực hiện tác vụ không nhờ developer; ghi điểm vướng, sửa rồi chạy lại |

Kịch bản UAT:

1. Tạo laptop hai cấu hình, gắn ảnh và bảo hành, preview rồi publish.
2. Tìm/sửa sản phẩm cũ ngoài 100 mục mới nhất; nháp không đổi public.
3. Tạo chuột hai màu và hub hai mức công suất; đặt đúng biến thể.
4. Viết bài có ảnh/bảng/sản phẩm liên quan và xuất bản ra trang chi tiết.
5. Đổi banner, sắp lại section, thay sản phẩm nổi bật rồi xem desktop/mobile.
6. Đổi menu và ẩn danh mục/collection; kiểm tra link và các nơi sử dụng.
7. Đổi hotline, reload/máy khác/restart; mọi vị trí dùng chung giá trị.
8. Nhận đơn mới, ghi chú nội bộ, phân công, hủy/mở lại đúng quyền; dữ liệu khách không public.
9. Hai người sửa cùng nội dung: người sau nhận conflict và giữ bản sửa.
10. Mất mạng lúc lưu: báo thất bại thật, phục hồi được; không báo đã đồng bộ.
11. Phục hồi revision; asset của bản cũ vẫn dùng được, không làm thay đơn.
12. Ẩn sản phẩm/bài: không còn public hoặc fallback lộ lại; đơn cũ vẫn đủ snapshot.
13. Vai trò không được publish/xem đơn phải bị chặn cả API trực tiếp.
14. Lên lịch và retry job: chỉ một publication đúng revision/giờ, không xuất bản nhầm bản sửa sau.

Kết quả từng gate báo PASS x/y, FAIL, SKIP và môi trường. Test cũ trong ADMIN-02..04 chỉ là bằng chứng lịch sử, phải chạy lại phần chịu ảnh hưởng trên phiên bản tích hợp. Lượt lập kế hoạch này không có kết quả PASS runtime mới.

## 13. Việc nên bắt đầu ngay khi triển khai

1. R00: chốt ma trận writer và mapping các trường sản phẩm/settings với StoreFront; tạo fixture kiểm tra giữ dữ liệu cũ.
2. R01: bảo vệ và lưu settings vào D1, sửa thông báo/loading; kiểm tra hidden/fallback.
3. R02–R03: đưa người dùng vào một luồng quản lý Laptop/Phụ kiện thống nhất, triển khai form dễ hiểu và phân trang thật.

Các quyết định mặc định của kế hoạch: tiếp tục stack hiện có; tiếng Việt; hai nhóm hàng dùng chung catalog; Order là tiếp nhận yêu cầu; block builder có giới hạn; manual collections trước, automation nâng cao sau. Đây là các giả định thiết kế có thể điều chỉnh trước gói liên quan, không phải bằng chứng chức năng đã triển khai.
