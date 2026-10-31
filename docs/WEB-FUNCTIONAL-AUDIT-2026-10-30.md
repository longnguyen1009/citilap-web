# Kiểm tra chức năng và cải thiện Admin - 30/10/2026

## Kết luận và phạm vi

Đã rà soát rộng các luồng sản phẩm, CMS, menu/bộ sưu tập, giá/chiến dịch, giỏ hàng/checkout, đơn hàng, khách hàng/tư vấn, media, phân quyền, lịch xuất bản và chuyển hướng. Đã sửa các lỗi có bằng chứng dưới đây. **Chưa thể khẳng định mọi chức năng và mọi nhánh của website đều PASS.**

Kiểm chứng bằng source hiện tại, D1/R2 thử nghiệm cô lập, Worker build Cloudflare và Chrome thực. Admin kiểm tra desktop; storefront kiểm tra 1440/768/390/320px. Không deploy, commit, push hoặc thay đổi DB remote. Các sửa đổi chưa commit có sẵn được giữ nguyên, không tính là phần mới thực hiện trong báo cáo này.

## Lỗi đã sửa

| Mức | Lỗi và tác động | Sửa và bằng chứng |
| --- | --- | --- |
| P1 | Redirect chuyển tiếp mọi query, gồm `token` và dữ liệu riêng tư | `src/proxy.ts` chỉ giữ tham số catalog/SKU cho phép; test HTTP xác nhận bỏ token/email và giữ nhiều brand + RAM |
| P1 | Trang sản phẩm chèn 2 nhận xét mẫu, cộng sẵn 32 đánh giá và điểm 4.9 | Xóa dữ liệu mẫu; tổng/điểm/sao lấy từ phản hồi đã duyệt; trạng thái rỗng là 0; bỏ khẳng định đã mua khi chưa xác minh đơn |
| P2 | Ghép đánh giá theo chuỗi con làm Legion 5 nhận đánh giá Legion 5 Pro | Khớp chính xác tên đã chuẩn hóa; danh sách tên rỗng không trả mọi đánh giá. Test D1 phân biệt tên gần giống và phản hồi chưa duyệt |
| P1 | Nút Tạo Landing Page gửi payload phẳng, thiếu `action`, `expectedRevision`, `document` và SEO bắt buộc | Form gửi đúng contract; browser tạo trang thật trong DB fixture, mở editor và reload giữ đúng tiêu đề/tên nội bộ/bản nháp |
| P2 | API danh sách Builder trả `name`, UI đọc `title/internalName/sectionCount` | Dùng chung type contract và trả đủ dữ liệu từ draft; không còn tên/số khối trống |
| P2 | Bộ lọc Builder chỉ lọc 20 dòng đã tải; không có nút sang trang; số đếm sai | Lọc trước phân trang tại server, tách Trang chủ khỏi kết quả, thêm Trước/Sau và reset trang khi đổi bộ lọc; fixture 23 trang xác nhận không mất/trùng dòng |
| P2 | Tìm kiếm Builder không tìm được tiêu đề nếu tên nội bộ khác | Tìm cả tiêu đề draft, tên nội bộ và slug; test title khác internalName |
| P2 | Tìm kiếm/phân trang Builder làm Trang chủ bị báo nháp/0 khối sai | Tải trạng thái Trang chủ riêng; lỗi tải hiển thị chưa biết trạng thái, không suy đoán |
| P2 | Preview nhận JSON/document chưa validate, dữ liệu lỗi có thể bị bỏ qua hoặc thành lỗi server | Parse schema trước resolver, payload sai/JSON hỏng trả 400; vẫn hỗ trợ body rỗng để xem nháp đã lưu |
| P2 | Gallery mở trực tiếp/reload không chọn ảnh của biến thể ban đầu | Khởi tạo index từ selectedImage; đồng bộ khi đổi ảnh biến thể, giữ thao tác chọn ảnh thủ công; test render với ảnh rỗng và ảnh được chọn không ở đầu |
| P3 | Newsletter trả 201 nhưng không lưu đăng ký | Email sai trả 400; email hợp lệ trả 503 chưa khả dụng, không báo thành công giả. Chưa thêm hệ thống newsletter |

Đánh giá hiện vẫn nhận diện sản phẩm bằng tên trong message cũ. Muốn giữ lịch sử qua đổi tên hoặc tránh trùng tên giữa hai sản phẩm khác nhau cần chuyển sang product ID; chưa đổi schema trong lượt này.

## Admin dễ hiểu hơn

- Mô tả đầu trang được xuống dòng, không giấu phần quan trọng sau dấu cắt.
- Làm rõ nguồn dữ liệu và bước tiếp theo trên Sản phẩm, Đơn hàng, Khách hàng, Tư vấn, Media, Bài viết, Trang/chính sách và Builder.
- Giải thích lưu nháp/xuất bản, sản phẩm so với kho/serial, giá thường so với chiến dịch, tư vấn so với đơn hàng và ảnh thư viện so với ảnh đã xuất bản.
- Sidebar dùng “Bố cục trang”, “Menu & Bộ sưu tập”; settings dùng “Trang sản phẩm” thay cho “Trang SP”.
- Danh mục/menu/bộ sưu tập có hướng dẫn riêng theo tab; thông báo rõ xuất bản Navigation áp dụng chung cả ba phần.
- Builder hiển thị nháp chưa xuất bản, số kết quả thật, trạng thái lọc, thông báo không tìm thấy và label liên kết input trong form tạo trang.

## Ma trận kiểm chứng

| Nhóm | Bằng chứng hiện tại | Giới hạn |
| --- | --- | --- |
| Product Studio | 17/17 | D1/R2 cô lập |
| Unified catalog | 12/12 | Service fixture |
| Navigation/collection | 18/18 | Service fixture |
| Media library | 17/17 | Không phải kiểm tra toàn bộ R2 remote |
| Site Builder | 11/11 + bộ hồi quy mới | Bao gồm draft/publish/concurrency; không thử mọi tổ hợp khối bằng browser |
| Hồi quy CMS/reviews/gallery/newsletter/Builder | 11 nhóm PASS, 0 failure | `scripts/test-admin-storefront-audit.mjs` |
| Giá/order R07B.4 | 16/16 | Handler/service fixture |
| Cạnh tranh chiến dịch R07B.3 | 16/16 | D1 cô lập; 3 kiểm tra cart HTTP dùng local 3001 |
| Đơn hàng/notification/contact | 30/30 | `test-r06-order-management.mjs` |
| CAS, khách vãng lai, số tiền không hủy | 18/18 | `test-r06-1-integrity.mjs` |
| Atomicity, CSV/keyset, notification | 15/15 | `test-r06-2-atomic.mjs` |
| Settings/auth/CSRF | 9/9 | Session người dùng thật trong DB fixture |
| Identity/permission | 13/13 | Service + fixture HTTP |
| Schedule/restore/redirect | 15/15 | Không xác nhận cron remote |
| Publication correctness | 8/8 | Gồm nháp/ẩn, guard checkout và snapshot lịch sử |
| Shipping/order guard | Exit 0 | Hai suite tương ứng |
| Advisor/search/inspection/appointment/reviews | Exit 0 | Gồm khớp đúng sản phẩm, phản hồi đã duyệt, ghi tư vấn và notification |
| Worker HTTP/D1 | 19/19 | Quote, ship/pickup, payment settings, PRICE_CHANGED, rollback, idempotency, auth/role/export, cron, redirect, wishlist/search, preview |
| PDP trên Worker + browser | 8/8 nhóm; checkout HTTP đi kèm 12/12 | Publish/reload/CAS, năm sản xuất, warranty/accessory, giả giá, 4 viewport, mua nhanh/retry, trả góp/review, Admin sửa FAQ/lưu/reload và không lộ nháp |
| Admin browser | 26 màn x 3 viewport = 78 checks PASS | 1280/1440/1920; chỉ đọc trong lượt quét này; không chứng minh mọi form lưu được |
| Builder browser mutation | PASS | 23 trang fixture, lọc/phân trang/tìm kiếm, trạng thái Trang chủ, tạo bằng form và reload |
| Storefront browser | 23 route x 4 viewport = 92 checks PASS | HTTP 200, không tràn ngang và không page exception; không phải kiểm tra mọi nút |
| TypeScript/build Cloudflare | PASS | Không thay thế kiểm thử browser/nghiệp vụ |
| D1 local chỉ đọc | Foreign key check không vi phạm | Snapshot: 159 Product, 675 Order, 1.577 MediaAsset; không đánh giá remote |
| Full lint | **Chưa PASS: 10 errors, 47 warnings** | Các lỗi còn lại thuộc React set-state-in-effect; xem mục sau |

## Phần chưa nghiệm thu

1. Full lint còn 10 lỗi `react-hooks/set-state-in-effect`: Admin audit, brands, inventory, redirects, users; InspectionEditor; OrderTrackingPortal (2); CompareModal; SearchAutocomplete. Đây là lỗi có sẵn trong baseline. Hai lỗi ban đầu khác ở preview `any` và ProductGallery đã được xử lý. Không bỏ rule hoặc sửa cấu hình để che lỗi.
2. `test-r06-production-handlers.mjs` vẫn dùng checkout thiếu acknowledgment và cơ chế bearer token cũ. Lượt chạy dừng ở expected 201/actual 400; chưa nghiệm thu suite này. Worker hiện hành đã kiểm chứng auth/checkout/export qua 19 nhóm HTTP, không coi đó là tương đương toàn bộ test cũ.
3. Browser R1/R2 chạy trên dev 3001 bị timeout chờ network idle. Các service fixture trước bước browser qua; không tính toàn suite PASS. R2 đã tạo một sản phẩm thử local và đã archive thành công trong finally (`936301af-cc60-4bd7-b1a1-d679aac7679b`); không xóa bản ghi/audit. Không thay đổi đơn thật trong các test mutation mới.
4. Chưa kiểm tra mọi mutation của tất cả màn Admin, mọi tổ hợp sản phẩm/SKU/chiến dịch, mọi ảnh remote, native 200% zoom, mọi trạng thái lỗi mạng hoặc trình duyệt khác Chrome.
5. Chưa kiểm tra staging/production, Turnstile remote, gửi email thật, thanh toán ngân hàng thực, cron/cache/CDN remote. Không đưa các phần này vào kết luận PASS.

Các test cũ settings/concurrency/order/integrity/publication/PDP đã được cập nhật theo contract hiện hành, không nới assertion nghiệp vụ: dùng session thật, acknowledgment từ quote, mã lỗi cụ thể, WASM external và selector/tab đang tồn tại. Test PDP ghi ảnh vào `.wrangler`, tránh ghi đè ảnh evidence tracked.

## Bằng chứng và chạy lại

Log/ảnh: `.wrangler/audit-2026-10-30/`. Quan trọng: `contracts-final.log`, `full-app-verified.log`, `pdp-final.log`, `orders-fixed.log`, `integrity-fixed.log`, `settings-fixed.log`, `concurrency-fixed.log`, `publication-fixed.log`, `improvements-final.log`, `workflows.json`, `builder-filter.png`, `lint-final.json`, `db-check.log`, `build.log`, `tsc-final.log`.

Ảnh quét Admin và kết quả: `.wrangler/admin-workspace-evidence/`. `workflows.mjs` trong thư mục evidence chỉ nhận URL fixture localhost có `/__fixture/session`; không chạy mutation đó trên local DB dự án hoặc remote. File này dùng Playwright có sẵn trong máy, chưa được đóng gói thành dependency dự án.

```powershell
node scripts/test-admin-storefront-audit.mjs
node scripts/test-storefront-improvements.mjs
node scripts/test-r06-order-management.mjs
node scripts/test-r06-1-integrity.mjs
node scripts/test-settings.mjs
node scripts/test-publication-correctness.mjs
npx.cmd tsc --noEmit
npm.cmd run build:cloudflare
node scripts/test-r08-full-app.mjs --r09a
node scripts/test-r07c-checkout-settings.mjs --product-detail
```

Hai lệnh cuối dùng build hiện tại và DB/R2 ephemeral. Giữ tách biệt kết quả service, HTTP Worker, browser và môi trường thật khi nghiệm thu.
