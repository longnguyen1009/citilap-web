# STORE-12 — CITI LAP BUSINESS PROFILE, CONTENT PAGES & TECHNICAL SEO

> **Gửi cho Antigravity SAU KHI đính kèm 2 tài liệu** `CitiLap_Business_Profile_2026-10-09.md`, `CitiLap_Du_Thao_Chinh_Sach_Can_Duyet.md` **và các ảnh nguồn CitiLap**.
>
> Đây là bản STORE-12 mới, thay thế prompt STORE-12 trước đây nếu có khác biệt về thông tin doanh nghiệp. Những chỗ còn thiếu được đánh dấu PENDING; KHÔNG tự điền bằng dữ liệu giả.

## 0. Project contract

Đọc `CITILAP_PROJECT_CONTEXT.md`, báo cáo CF-01 → STORE-11, schema D1, Catalog Service, Image/R2 pipeline, Metadata API và các tài liệu được đính kèm.

**Business scope:** `citilap-ecommerce` là storefront thương mại điện tử, guest checkout, đơn hàng PENDING → COMPLETED; không quản lý kho, serial, đơn cọc, thu tiền, kế toán, ERP, trade-in. Các module STORE-09 Inventory Foundation đã đóng băng, không được đưa trở lại checkout. Thanh toán trực tuyến là ý tưởng tương lai, **không triển khai lúc này**.

Nguồn sự thật về tên, số điện thoại, cửa hàng, bảo hành, vận chuyển: hồ sơ doanh nghiệp đính kèm. Không dùng thông tin tự suy diễn từ quảng cáo, seed data, banner cũ hoặc website đối thủ.

### Stop/approval gates
- Trước khi code, báo cáo **Audit + Gap Matrix**, đối chiếu các trường đang hard-code trong project với Business Profile.
- Có thể implement các dữ liệu CONFIRMED. Các trường PENDING phải đi qua feature flag/ẩn/ghi chú cho chủ dự án; không tự chọn giá trị.
- Chính sách pháp lý/thuế chưa duyệt: có thể soạn và xây trang ở trạng thái **DRAFT/NOINDEX và không quảng bá là chính sách đã phê duyệt**. Không tự công bố pháp nhân/MST chưa cung cấp.
- Không deploy production.

## 1. Canonical business identity

Dùng **CitiLap** làm tên brand chính, website `https://citilap.vn` làm canonical được đề xuất. Bố trí redirect www → non-www khi DNS/SSL sẵn sàng và đã xác minh domain thực tế. Tên xuất hiện trên ảnh là "CitiLap VN"/"CitiLap.VN" có thể được xem như alternate name, không tự đổi tên brand trong toàn hệ thống.

Tagline hiện tại: `CitiLap - Laptop - Công Nghệ - Cho cuộc sống tốt hơn`.
Thông điệp trên logo/biển hiệu: `Một chữ tín - Vạn niềm tin`. Giữ cả hai trong vai trò rõ ràng, không trộn lẫn hoặc tự tạo câu khẩu hiệu thứ ba.

Founded July 2024. Ngành hàng: laptop gaming, Ultrabook/laptop cao cấp, máy like-new/used và phụ kiện công nghệ; phân khúc trọng tâm 15–30 triệu; bán hàng toàn quốc.

Contact chính: hotline `0899188186`, email `contact@citilap.vn`, Facebook `https://www.facebook.com/citilap`, TikTok `https://www.tiktok.com/@citilapvn`. Zalo số 0899188186, chưa có OA URL. Hotline Bắc Ninh 0842044999. Không giả mạo kênh YouTube/Zalo OA chưa có.

## 2. Một nguồn cấu hình duy nhất

Đề xuất `src/config/business-profile.ts` hoặc cấu trúc tương đương; typed và server/client boundary rõ ràng. Không copy thông tin tại nhiều file.

Schema logic tối thiểu:

```ts
interface StoreLocation {
  id: string;
  name: string;
  status: 'ACTIVE' | 'TEMPORARILY_CLOSED';
  address: string;
  phone: string;
  mapsUrl?: string;
  openingHours?: { days: number[]; opens: string; closes: string }[];
  isHeadOffice: boolean;
  onlinePickupEnabled: boolean;
  walkInViewingAndPurchaseEnabled?: boolean;
  sundayByAppointmentOnly?: boolean;
  warrantyDropoffEnabled?: boolean;
  publicDisplay: boolean;
}

interface BusinessProfile {
  brandName: string;
  alternateNames: string[];
  canonicalUrl: string;
  logoAsset: string;
  primaryTagline: string;
  traditionalMotto?: string;
  phone: string;
  email: string;
  socialProfiles: string[];
  locations: StoreLocation[];
}
```

Có thể điều chỉnh shape sau audit. Cấu hình location phải phân biệt **hoạt động thực tế**, **được phép hiển thị**, **được nhận đơn online tại cửa hàng**; không dùng `ACTIVE` làm mặc định `onlinePickupEnabled=true`.

### Chi nhánh

**Hà Nội (cơ sở chính, ACTIVE):** Số 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội. 0899188186. Thứ Hai–thứ Bảy 09:00–20:00. **Chủ nhật chỉ hỗ trợ theo lịch hẹn.** Google Maps `https://maps.app.goo.gl/vydJE4R6hyDCshh56`. Cho phép nhận đơn online tại showroom và khách đến mua trực tiếp. **Chính sách miễn phí giao hàng trong bán kính 10 km chỉ áp dụng quanh cơ sở Hà Nội** (không tự động tính khi chưa có quy tắc khoảng cách).

**Bắc Ninh (ACTIVE):** Số 40 Trần Hưng Đạo, Phường Võ Cường, TP. Bắc Ninh. 0842044999. Thứ Hai–thứ Bảy 09:00–20:00. **Chủ nhật chỉ hỗ trợ theo lịch hẹn.** Google Maps `https://maps.app.goo.gl/qH6tpuhL48P78XFr6`. **Có phục vụ khách đến xem và mua máy trực tiếp.** **Không đưa làm điểm pickup online**; **không tự quảng bá freeship 10 km tại Bắc Ninh**.

**TP.HCM (TEMPORARILY_CLOSED):** Số 552 Cộng Hòa, Quận Tân Bình, TP.HCM là địa chỉ lịch sử. Không dùng làm showroom đang mở, điểm pickup online, LocalBusiness mở cửa hoặc landing page quảng cáo đang hoạt động.

Chủ nhật tại hai cơ sở ACTIVE: **chỉ hỗ trợ theo lịch hẹn trước**, không có giờ mở cửa cố định. Giờ ngày lễ và định dạng địa chỉ hành chính mới chưa xác nhận; không tự đoán. Trong `openingHoursSpecification` chỉ khai báo thứ Hai–thứ Bảy; với Chủ nhật hiển thị note hẹn trước thay vì khai báo mở cửa thường lệ.

## 3. Brand assets

Sử dụng 100% tài sản gốc đi kèm, không tạo logo mới/không lấy ảnh stock hoặc logo tìm kiếm trên mạng. Kiểm tra tương quan ảnh–cơ sở trước khi gắn chú thích showroom.

- `assets/brand-logo-original.jpg`: file logo gốc nền xanh đậm (không phải logo transparent).
- `assets/store-photo-01.jpg` ... `store-photo-04.jpg`: 4 ảnh thực tế được chủ cửa hàng xác nhận **đều chụp tại CitiLap Hà Nội**. Không sử dụng để đại diện cho Bắc Ninh hoặc TP.HCM.
- `assets/marketing-banner-original.png`: banner gốc.

Tạo assets web tối ưu trong `public/brand/` hoặc media storage hiện có; tạo derivatives WebP/AVIF phù hợp bằng công cụ build/offline nếu được phép, giữ file gốc. Không thay đổi hệ thống upload R2 MEDIA-03 và không dùng native image libraries làm hỏng vinext. Hình có khách/nhân viên: chỉ đăng khi xác nhận quyền sử dụng/quyền riêng tư.

Favicon và logo Header nên dùng logo nguyên gốc phù hợp, nếu cần icon cắt từ file gốc phải đảm bảo không làm sai nhận diện; không dùng AI vẽ logo khác.

## 4. Các trang nội dung tĩnh cần triển khai

Mỗi trang có copywriting tiếng Việt thân thiện, đúng thông tin được xác nhận, breadcrumb, meta title/description, responsive, footer links và accessible.

| Route đề xuất | Nội dung |
|---|---|
| `/gioi-thieu` | Lịch sử từ 07/2024, thế mạnh chọn lọc/kiểm tra sản phẩm, ảnh cửa hàng thực (sau xác nhận), slogan |
| `/lien-he` | Hotline, email, Facebook, TikTok, Hà Nội/Bắc Ninh, bản đồ/directions links |
| `/he-thong-cua-hang` | Hai cơ sở đang hoạt động: Thứ Hai–thứ Bảy 09:00–20:00, Chủ nhật hẹn trước. Bắc Ninh đón khách mua trực tiếp nhưng không nhận pickup đơn online; HCM chỉ nếu cần hiển thị lịch sử và gắn rõ "Tạm đóng cửa" |
| `/chinh-sach-bao-hanh` | Gói theo SKU/đơn hàng: mới 6/12 tháng; used 3/6/12; linh kiện 3–6 tùy gói; không ghi "mọi máy BH 12 tháng" |
| `/chinh-sach-doi-tra` | 7 ngày với lỗi phù hợp chính sách; điều kiện kiểm tra, xử lý hoàn tiền; mua lại máy theo chính sách thu cũ KHÁC với đổi trả |
| `/chinh-sach-van-chuyen` | Toàn quốc; cước tham khảo 100.000–300.000đ tùy hình thức, phí cụ thể xác nhận khi tư vấn; chỉ Hà Nội có freeship trong bán kính 10 km, chưa tự động tính; showroom pickup đơn online chỉ Hà Nội |
| `/chinh-sach-bao-mat` | Dự thảo quyền riêng tư, dữ liệu đơn hàng, dùng nội bộ, đơn vị vận chuyển, dự kiến 2 năm, quyền người dùng/cookie |
| `/dieu-khoan-mua-hang` | Đặt hàng là yêu cầu mua; chưa có thanh toán online; nhân viên xác nhận SKU/giá/vận chuyển; sửa/hủy đơn qua hotline |
| `/huong-dan-mua-hang` | Hướng dẫn tìm → SKU → cart → checkout → PENDING → tư vấn xác nhận |

Không tạo Blog CMS lớn; đề xuất architecture cho bài viết tin công nghệ, review/hướng dẫn trong roadmap sau. Không tự xuất bản bài viết AI giả làm trải nghiệm thực tế.

Chính sách đính kèm hiện là **bản dự thảo**: không được tự đánh dấu `APPROVED` trong code hoặc bật `index` trước khi chủ cửa hàng duyệt. Nếu tách static pages đã chuẩn bị, có thể dùng draft flag/noindex và không đưa sitemap cho đến khi được phê duyệt.

## 5. Chính xác về vận chuyển/đơn hàng

- Giao hàng toàn quốc, xử lý đơn dự kiến 1 ngày, nhân viên thường liên hệ 1–4h; chú ý ngoài giờ chưa chốt SLA.
- **ĐÃ XÁC NHẬN:** Phí vận chuyển tham khảo **100.000–300.000đ**, tùy phương thức vận chuyển; đây **không phải giá ship được tính trước trên Checkout**. Nhân viên sẽ báo mức phí thực tế khi tư vấn.
- **ĐÃ XÁC NHẬN:** **Miễn phí giao hàng trong bán kính 10 km quanh cơ sở Hà Nội**. Không áp dụng mặc định cho Bắc Ninh, không suy rộng sang mọi showroom. Chưa thống nhất cách tính 10 km nên **không tự xây thuật toán miễn phí** hay hiển thị "freeship đã áp dụng" trong checkout. Có thể diễn đạt ở chính sách như một thông tin áp dụng có điều kiện và yêu cầu khách liên hệ để xác nhận.
- Checkout giữ copy đã được STORE-11 harden: **"Phí vận chuyển sẽ được xác nhận khi tư vấn"**. Không dùng `shippingFee = 0` để hiển thị "Miễn phí"; nếu có thể, audit kế hoạch chuyển mô hình nullable/status ở task riêng (không phá đơn cũ).
- Khách có thể đặt mà chưa thanh toán. Đặt thành công `PENDING` không đồng nghĩa đã giữ hàng, đã thu tiền hoặc đã xác nhận giao hàng.

## 6. Correct warranty/condition claims

Bảo hành phải được lấy từ SKU/gói dịch vụ chứ không hard-code. Không tự tạo gói có thể chọn nếu backend chưa hỗ trợ; chỉ trình bày đúng gói đã được dữ liệu sản phẩm xác nhận.

Máy Like New 99% được mô tả tiêu chuẩn từ cửa hàng (ngoại hình 98–99%, main nguyên bản, pin trên 90%, SSD ít giờ), nhưng không tự mặc định mọi máy USED/LIKE_NEW đều đạt những giá trị này. Chỉ khẳng định các thuộc tính đã được kiểm tra trên từng máy cụ thể. Cấp ngoại hình A/B/C/D chưa có bảng định nghĩa; không tự thiết kế định nghĩa.

Không dùng "bảo hành chính hãng" cho sản phẩm cũ nếu đó thực tế là bảo hành của cửa hàng.

## 7. Technical SEO foundation

Audit metadata trên home/category/search/product/cart/checkout/success/admin. Chuẩn hóa:
- `metadataBase`, canonical host non-www, absolute OG URLs, SSR metadata từ D1.
- Dynamic sitemap `/sitemap.xml`: home, `/category`, ACTIVE categories/products, các trang doanh nghiệp đã duyệt. Không chứa DRAFT, ARCHIVED, admin, cart, checkout/success, internal search, filter params, order token.
- `/robots.txt`: staging noindex, production crawl public hợp lệ, tránh disallow che mất noindex.
- Product/ProductGroup SEO cho multiple SKU: giá đúng variant, không review/rating/availability giả, canonical thống nhất với `?sku=`.
- SEO LocalBusiness cho từng chi nhánh **đang hoạt động** có thông tin được duyệt; không tạo Store đang mở cho HCM.
- `Organization`/`Store` schema: brand, homepage, logo URL thật, address HN, `sameAs` Facebook và TikTok, `contactPoint` từ business config. Chỉ dùng các thông tin hợp lệ đã có.
- `openingHoursSpecification`: Mon–Sat 09:00–20:00 cho Hà Nội và Bắc Ninh. Chủ nhật **chỉ hỗ trợ theo lịch hẹn**; không khai báo là khung giờ mở cửa thường xuyên, không bịa lịch ngày lễ.
- BreadcrumbList, internal linking, image alt text đúng ngữ cảnh.
- JSON-LD serializer an toàn với HTML script-breaking characters; test injection.
- Dữ liệu review thật: chỉ sử dụng khi có bằng chứng/canonical source; không bịa số review/Google stars.

## 8. User privacy, consent, compliance readiness

Chủ cửa hàng muốn triển khai GA4/Meta Pixel sau này. Tại STORE-12:
- Lập trang privacy notice dựa theo file dự thảo, nhưng **chưa bật tracking marketing/analytics không thiết yếu cho tới khi có cơ chế thông báo và consent phù hợp**.
- Khi triển khai tương lai, tách lựa chọn tracking khỏi checkbox cần thiết để gửi đơn; có khả năng từ chối, thay đổi lựa chọn, dùng Google Consent Mode nếu phù hợp.
- Không đưa tên, phone, email, address, order token, dữ liệu giỏ riêng vào JSON-LD/sitemap/OG.
- Retention "dự kiến 2 năm" không được viết thành cam kết xóa vô điều kiện sau 2 năm nếu có nghĩa vụ pháp lý khác.
- Tên pháp nhân/MST chủ cửa hàng chưa muốn công khai. **Không tự bịa hay điền thông tin đó**; ghi rõ cần kiểm tra nghĩa vụ nhận diện doanh nghiệp, thông báo/đăng ký nền tảng TMĐT tại `https://online.gov.vn/` trước khi production.
- Chủ cửa hàng phê duyệt chính sách trước khi công khai.

## 9. Header, Footer, Contact widgets

Tái sử dụng BusinessProfile:
- Header hotline chính `0899188186`, link tel.
- Footer logo/brand; slogan; Hà Nội + Bắc Ninh; giờ làm việc; email, Facebook, TikTok; liên kết chính sách đã phê duyệt; links showroom/map.
- Trang contact có hành động `Gọi ngay`, `Email`, `Chỉ đường` hợp lệ; không tạo nút giả.
- Checkout pickup options chỉ Hà Nội; sửa nếu UI hiện vẫn có Bắc Ninh/TPHCM.
- Không thêm sticky contact widgets che nút CTA trên mobile; kiểm thử 375/390/430/768/1440.

## 10. Assets validation & legal content gates

Audit ảnh trong gói: logo 900×900 JPG, 4 ảnh showroom/hoạt động, banner PNG. Liên kết đúng với nơi trưng bày, không coi ảnh cũ là bằng chứng chi nhánh đang mở. Không tự đặt năm thành lập khác, hotline khác, địa chỉ khác.

Chính sách "/doi-tra", "/bao-mat" v.v. chỉ được public/index khi đã duyệt; nếu code đã có page cũ, đánh dấu các claims chưa xác minh rõ ràng thay vì lặng lẽ thay một chính sách bằng bản chưa phê duyệt.

## 11. Verification bắt buộc

- Xác minh toàn bộ địa chỉ, phone, social link ở Header/Footer/About/Contact/Checkout/JSON-LD đúng với file BusinessProfile.
- Hà Nội ACTIVE, online pickup enabled, freeship 10 km chỉ tại Hà Nội. Bắc Ninh ACTIVE, khách được xem/mua trực tiếp nhưng online pickup disabled và không áp dụng mặc định freeship 10 km. HCM TEMPORARILY_CLOSED và không có schema mở cửa/pickup.
- Hai cơ sở ACTIVE: mở cửa thứ Hai–thứ Bảy 09:00–20:00; Chủ nhật chỉ theo lịch hẹn, không khai báo mở cửa cố định trong LocalBusiness JSON-LD.
- Cước tham khảo 100.000–300.000đ theo phương thức không bị dùng làm phí chốt hoặc tự động trừ/cộng đơn; checkout hiện vẫn xác nhận phí ship khi tư vấn.
- 4 ảnh cửa hàng trong bundle chỉ được chú thích là ảnh CitiLap Hà Nội, không gán cho cơ sở Bắc Ninh/TP.HCM.
- Sitemap không có trang draft/checkout/admin/search/order.
- Robots, canonical, OG tuyệt đối trên domain chính (không `localhost`, không trộn `www`).
- 2 LocalBusiness nếu quyết định dùng schema cho 2 cơ sở đang hoạt động; không tạo fake GPS hoặc Google review.
- Không còn hard-coded `12 tháng BH`/`freeship` bất kể SKU/chính sách.
- Mọi policy đã duyệt index đúng; policy chưa duyệt được xử lý an toàn.
- Không có hình ảnh từ nguồn không được phép.
- SSR public routes hoạt động từ D1/R2, không mock fallback.
- Guest Order E2E không thay stock/payment; Admin PENDING → COMPLETED hoạt động.
- Browser responsive, ảnh loading, image alt, a11y, no horizontal overflow.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx vinext check`, `npm run verify:cf`; phân biệt Next build/standalone Worker với full storefront Worker E2E.

## 12. Out of scope

Không làm ERP, inventory, payment, finance, warehouse, serial, supplier, repair, reviews giả, tự sinh Google Business Profile, tạo địa chỉ/mã số thuế giả, CMS blog hoàn chỉnh, deployment production, tạo 30 bài review AI để SEO, hoặc thay logo chính thức bằng ảnh AI.

## 13. Deliverables / report

1. Business Profile typed config; diff so với hard-coded legacy business data.
2. Pages About/Contact/Stores/Policies/Guide (status DRAFT/APPROVED rõ ràng).
3. Header/Footer/Checkout pickup consistency.
4. Canonical domain, metadata helpers, robots, sitemap, JSON-LD Organization/LocalBusiness/Product.
5. Asset integration và copyright/privacy checks.
6. Browser/SEO tests + screenshots.
7. Gap List (thông tin PENDING), legal readiness checklist, những gì **chưa thể công bố**.
8. Update `CITILAP_PROJECT_CONTEXT.md` đưa BusinessProfile thành source of truth.
9. Lint/TS/Build/Vinext/verify:cf details; PASS/PARTIAL/BLOCKED dựa trên chứng cứ.

**Sau khi xong: DỪNG LẠI; không triển khai STORE-13, không deploy production và không tự đăng chính sách chưa được duyệt.**
