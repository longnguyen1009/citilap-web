# Rà soát Admin → Storefront — 29/10/2026

## Kết luận

Chưa thể nghiệm thu toàn bộ chức năng. Xác nhận 5 lỗi nối cấu hình Homepage/CMS bằng test chạy thực tế và 1 API trả thành công nhưng không lưu dữ liệu qua kiểm tra source. Chưa sửa code ứng dụng; thêm test tái hiện để phục vụ sửa và nghiệm thu.

Phạm vi bằng chứng: source hiện tại, D1 local chỉ đọc, build Cloudflare mới, browser local và DB/R2 thử nghiệm cô lập. Không kiểm tra staging/production; không deploy, migrate, commit hay push. Đăng nhập browser tạo session local; các màn Admin được chặn mutation. Tạo đơn/publish/sửa settings trong test nghiệp vụ dùng DB thử nghiệm riêng.

## Trường hợp 6 ảnh chỉ thấy 3

- Homepage local `home`: revision 25, publishedRevision 25; draft và published giống nhau.
- Cả hai chứa 6 mục: `store-photo-02.jpg`, `store-photo-03.jpg`, rồi `store-photo-04.jpg` lặp 4 lần. Tổng cộng chỉ có **3 ảnh khác nhau**.
- Code hiện tại `src/components/home/CustomerGallery.tsx:18` giữ các URL trùng, chỉ bỏ URL rỗng. Resolver và HTML render đều giữ đủ 6 mục.
- Browser trên build mới: đủ 6 nút ảnh ở 1440/768/390/320px; cuộn ngang, mở ảnh và Escape đóng đều hoạt động; không tràn ngang trang. Ảnh tải theo lazy loading, các lần kiểm tra sau đã tải đủ 6.
- **Không tái hiện lỗi mất 3 mục trên bản local hiện tại.** Chưa có bằng chứng xác định phiên bản/môi trường người dùng đã gặp lỗi; không kết luận môi trường đang deploy đã sửa.
- Bằng chứng: `.wrangler/audit-2026-10-29/gallery.json`, `gallery-*.png`; test gallery trong `scripts/test-admin-storefront-audit.mjs`.

## Findings

### F1 — P2: Khối thương hiệu không dùng dữ liệu Admin

`src/components/builder/BlockRenderer.tsx:87`, `src/components/builder/BlockRenderer.tsx:374`, `src/components/home/BrandSection.tsx:5`.

Service có resolve `brandIds` thành `resolvedBrands`, nhưng renderer gọi `BrandSection` không truyền section. Component dùng danh sách 8 hãng và tiêu đề cố định. Đổi tên khối, thêm/ẩn thương hiệu, thay logo trong Admin không được phản ánh ở khối này. Admin còn ghi rõ logo được đồng bộ từ catalog tại `src/components/admin/builder/SiteBuilderEditor.tsx:2438`.

Test truyền heading và thương hiệu riêng: cả hai không xuất hiện trong HTML. Cần render dữ liệu đã resolve, giữ trạng thái công khai và thứ tự do Admin chọn.

### F2 — P2: Preview HOT SALE và homepage dùng hai nguồn khác nhau

`src/components/builder/BlockRenderer.tsx:81`, `src/components/admin/builder/SiteBuilderEditor.tsx:1497`, `src/app/(shop)/page.tsx:81`.

Preview render section `sec-hot-sale` từ cấu hình builder. Homepage truyền `flashSale` khiến renderer thay toàn bộ section bằng component chiến dịch. Tiêu đề, danh sách sản phẩm chọn tay, nhãn, thứ tự và link của section bị bỏ qua trên homepage. Khi không có chiến dịch phù hợp, component có thể trả rỗng dù preview vẫn có sản phẩm.

Test cùng section: preview chứa heading đã nhập; render với đầu vào homepage mất heading. Cần thống nhất nguồn chiến dịch và preview, hoặc khóa các trường builder không có hiệu lực và giải thích rõ trong Admin. Không đổi cách tính giá chiến dịch để chữa lỗi trình bày này.

### F3 — P2: Nhập Collection ID hợp lệ nhưng khối biến mất

`src/components/admin/builder/SiteBuilderEditor.tsx:2465`, `src/server/services/site-builder.service.ts:566`, `src/server/services/navigation.service.ts:243`.

Form nhận “Collection ID / Slug”; resolver truyền nguyên giá trị vào `publicCollection`, hàm chỉ tìm theo `slug`. Nhập ID khác slug gây 404 bị catch thành `undefined`; renderer trả null, không báo cấu hình sai.

Fixture có `id=collection-id`, `slug=collection-slug`: ID không resolve, slug resolve đúng. Cần picker lưu định danh thống nhất hoặc hỗ trợ cả hai; lỗi tham chiếu phải hiện trước khi publish.

### F4 — P2: Giới hạn tin tức tự động bị nâng lên tối thiểu 10

`src/server/services/site-builder.service.ts:556`, `src/components/admin/builder/SiteBuilderEditor.tsx:2500`.

Khi `postIds=[]`, service dùng `Math.max(data.limit || 10, 10)`. Admin chọn 1–9 bài vẫn nhận tối đa 10. Fixture có 6 bài, cấu hình limit=2, storefront resolver trả 6. Cần dùng giới hạn đã validate của Admin.

### F5 — P2: Giới hạn sản phẩm trong khối bộ sưu tập bị bỏ qua

`src/contracts/cms/site-builder.ts` (`featuredCollectionSectionDataSchema.limit`), `src/server/services/site-builder.service.ts:566`, `src/components/builder/BlockRenderer.tsx:410`.

Schema có giới hạn mặc định 12, nhưng resolver lấy collection đầy đủ và renderer map toàn bộ `col.products`. Fixture limit=1 với 2 sản phẩm vẫn render sản phẩm thứ hai. Cần áp giới hạn riêng của khối sau khi resolve; không làm mất dữ liệu trang collection đầy đủ. Form hiện cũng chưa cung cấp trường sửa limit cho khối này.

### F6 — P3: API newsletter trả thành công nhưng không ghi nhận đăng ký

`src/app/api/newsletter/route.ts:8`.

Handler chỉ validate email rồi trả HTTP 201 `Subscription received`; không ghi DB, gọi dịch vụ nhận đăng ký hay đưa vào hàng đợi. Tìm source hiện tại chưa thấy storefront gọi endpoint này, nên chưa xác nhận người dùng đang gặp trên UI. Nếu giữ API cần lưu thật; nếu chức năng không dùng thì bỏ endpoint thay vì giữ thành công giả.

## Ma trận kiểm chứng

| Nhóm | Kết quả trong lượt này | Giới hạn |
| --- | --- | --- |
| Product Studio → public API | 158/158 bản ghi khớp trạng thái public; bản công khai khớp name, slug, availability, variants, specs, warranties, contentHtml, số media | Chưa đối chiếu pixel/nội dung từng PDP; không phải kiểm tra giá hiệu lực từng SKU |
| Homepage gallery | 6/6 mục, cuộn/modal/Escape ở 4 viewport | 3 URL khác nhau; chưa kiểm tra deployment người dùng |
| CMS/Homepage | Test mới: 2 PASS, 5 FAIL xác nhận F1–F5 | Có chủ đích giữ test đỏ cho lỗi chưa sửa |
| Product Studio | 17/17 PASS | DB/R2 cô lập |
| Unified catalog | 12/12 PASS | DB cô lập |
| Navigation/collection | 18/18 PASS | Không thay thế test builder F3/F5 |
| Media library | 17/17 PASS | D1/R2 cô lập; không kiểm tra mọi object remote |
| Site Builder | 11/11 PASS | Test cũ không phát hiện 5 lỗi consumer mới |
| Giá/cart/order | R07B.4 16/16 PASS | Service + handler HTTP fixture |
| Checkout trên build mới | 12 nhóm HTTP/D1 PASS | Phí ship, pickup, payment settings, PRICE_CHANGED, immutable snapshot, rollback, idempotency; không thanh toán ngân hàng thật |
| PDP trên build mới | 6 nhóm PASS trước khi harness dừng | Publish/reload/CAS; year filter; warranty/accessory; giả giá; browser 4 viewport; quick checkout tạo đơn và retry không trùng |
| Shipping/order guard | 2 suite exit 0 | Các invariant riêng, không phải mọi thao tác UI |
| Wishlist/advisor/inspection/appointment | `test-storefront-improvements.mjs` exit 0 | Contract/service fixture, gồm contact lưu D1 và notification |
| Identity/permission | 13/13 PASS | Role, revocation, CSRF, audit, notification trong fixture |
| Schedule/restore/redirect | 15/15 PASS | Fixture; chưa chạy cron remote |
| Admin browser | 25 màn × 1280/1440/1920 = 75 checks PASS | Chỉ đọc, mutation bị chặn; không đủ để kết luận mọi form lưu được |
| Storefront browser | 23 route × 1440/768/390/320 = 92 checks; HTTP 200, không uncaught exception, không overflow | Kiểm tra render; cart/wishlist có thể rỗng; không chứng minh mọi nút hoạt động; ảnh lazy chưa tải không được tính ảnh vỡ |
| TypeScript/build | `tsc --noEmit`, `npm run build:cloudflare` PASS | Không thay thế nghiệp vụ/browser |
| D1 local | `PRAGMA foreign_key_check`: không vi phạm | Không đánh giá remote |

## Test debt và phần chưa nghiệm thu

- `test-settings.mjs`: 2 check đầu qua, sau đó kỳ vọng actor `admin-tester` nhưng thực tế `legacy/system`. Harness gọi service cũ, chưa thiết lập admin context mới; chưa đủ bằng chứng kết luận actor trên route thực sai. Route hiện bọc `withAdminContext`.
- `test-r07b-3-concurrency.mjs`: các check CAS/overlap/rollback/strict resolver trước đó qua; dừng tại kỳ vọng `CAMPAIGN_VALIDATION_ERROR` trong khi code trả `MISSING_EXPECTED_REVISION`. Cần cập nhật hợp đồng test trước khi nghiệm thu toàn suite.
- PDP harness dừng ở nhóm thứ 7: selector `dialog input[name="name"]` trả null sau khi bấm mở form trả góp. Có thể là thiếu chờ render; chưa xác nhận lỗi sản phẩm. Chưa nghiệm thu gửi yêu cầu trả góp/review bằng browser trong lượt này.
- Chạy trực tiếp `test-product-detail-functions.mjs` không thực thi test vì file chỉ export helper; không tính exit 0 đó là PASS.
- Dev Vite ban đầu khởi động lâu, login timeout; có lần route chính sách trả 500. Build mới chạy bằng Wrangler local đã trả 200 cho cả 23 route và kiểm tra riêng 6 trang chính sách. Chưa quy lỗi transient của dev thành lỗi deployment.
- Chưa nghiệm thu đầy đủ mọi mutation Admin sau reload, mọi biến thể/giá chiến dịch trên tất cả consumer, tất cả trạng thái đơn, gửi email thật, Turnstile remote, lịch cron và CDN cache trên staging/production.
- Chưa chạy full lint hay native zoom trong lượt này. Không dùng screenshot hoặc PASS từ báo cáo cũ làm bằng chứng hiện tại.

## Chạy lại và bằng chứng

```sh
node scripts/test-admin-storefront-audit.mjs
```

Hiện exit 1 với đúng 5 assertion lỗi F1–F5. Test tạo DB ephemeral; không sửa DB local của dự án.

Log mới: `.wrangler/audit-2026-10-29/`. Quan trọng: `contracts.log`, `studio-parity.json`, `checkout-fresh-build.log`, `admin-browser-built.log`, `public-built/report.json`, `gallery.json`, `build.log`. Screenshot do suite cũ tự ghi đè đã chuyển sang thư mục bằng chứng mới và phục hồi bản tracked ban đầu.

Ưu tiên sửa F1–F5 cùng một vòng CMS consumer; sau đó sửa harness lỗi thời và chạy mutation/persistence còn thiếu. F6 xử lý theo quyết định có giữ chức năng newsletter hay không. Chưa thể đánh dấu website toàn bộ PASS.
