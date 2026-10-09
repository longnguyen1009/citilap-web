# CITI LAP — BUSINESS PROFILE / SINGLE SOURCE OF TRUTH

**Ngày tổng hợp:** 09/10/2026  
**Dự án:** `citilap-ecommerce`  
**Trạng thái:** Dữ liệu do chủ cửa hàng cung cấp; một số trường cần xác nhận trước khi xuất bản.  
**Mục đích:** Một nguồn chung cho Header, Footer, trang giới thiệu, liên hệ, showroom, Checkout, chính sách, SEO và JSON-LD.

## Quy ước
- **CONFIRMED:** Chủ cửa hàng đã cung cấp hoặc xác nhận.
- **RECOMMENDED:** Đề xuất triển khai; không được xem là sự thật về doanh nghiệp.
- **PENDING:** Cần làm rõ trước khi xuất bản/đưa vào business logic.
- **NOT PUBLIC:** Không tự công bố.

## 1. Thương hiệu

| Trường | Giá trị | Trạng thái |
|---|---|---|
| `brandName` | CitiLap | CONFIRMED |
| `alternateName` | CitiLapVN, CitiLap.VN (biến thể xuất hiện trên ảnh biển hiệu/logo) | CONFIRMED / tham khảo hình ảnh |
| `domain` | citilap.vn | CONFIRMED |
| `canonicalSiteUrl` | https://citilap.vn | RECOMMENDED; xác minh DNS, SSL, redirects và Search Console trước production |
| `wwwPolicy` | Chuyển hướng https://www.citilap.vn → https://citilap.vn bằng 301/308 khi host đã cấu hình | RECOMMENDED |
| `founded` | 07/2024 | CONFIRMED |
| `primaryMarketingTagline` | CitiLap - Laptop - Công Nghệ - Cho cuộc sống tốt hơn | CONFIRMED theo phần trả lời H |
| `legacyBrandMotto` | Một chữ tín - Vạn niềm tin | CONFIRMED từ ảnh nhận diện; không thay thế tagline hiện tại nếu chưa được duyệt |
| `productFocus` | Laptop Gaming, Ultrabook/laptop cao cấp, laptop văn phòng/đồ họa và phụ kiện công nghệ | CONFIRMED |
| `targetSegment` | 15–30 triệu VND | CONFIRMED |
| `targetMarket` | Toàn quốc | CONFIRMED |
| `registeredLegalName` | Không công khai lúc này | NOT PUBLIC; cần kiểm tra nghĩa vụ công bố trước production |
| `taxCode` | Không công khai lúc này | NOT PUBLIC; cần kiểm tra nghĩa vụ công bố trước production |

**Giới thiệu đã biên tập để trình duyệt:**  
> CitiLap là cửa hàng chuyên laptop gaming, Ultrabook, laptop cao cấp và phụ kiện công nghệ. Thành lập từ tháng 7/2024, CitiLap chú trọng lựa chọn và kiểm tra sản phẩm kỹ lưỡng, tư vấn cấu hình phù hợp cùng mức giá hợp lý. Các sản phẩm đã qua sử dụng được mô tả tình trạng thực tế trong thông tin chi tiết để khách hàng cân nhắc trước khi đặt mua.

**Không tự khẳng định:** giá rẻ nhất thị trường, máy nào cũng pin >90%, máy nào cũng nguyên bản, tất cả sản phẩm đều được bảo hành 12 tháng.

## 2. Liên hệ

| Trường | Giá trị | Trạng thái |
|---|---|---|
| `salesPhone` | 0899188186 | CONFIRMED |
| `supportPhone` | 0899188186 | CONFIRMED |
| `zaloPhone` | 0899188186 | CONFIRMED; chưa có URL OA chính thức |
| `generalEmail` | contact@citilap.vn | CONFIRMED |
| `warrantyEmail` | contact@citilap.vn | CONFIRMED |
| `supportHours` | 09:00–20:00, thứ Hai–thứ Bảy | CONFIRMED |
| `outOfHoursConsultation` | Có thể tư vấn ngoài giờ | CONFIRMED, **không suy ra hỗ trợ 24/7** |
| `sundayHours` | Chủ nhật: chỉ tiếp/hỗ trợ theo lịch hẹn trước (không có giờ mở cửa cố định) | CONFIRMED |
| `facebook` | https://www.facebook.com/citilap | CONFIRMED |
| `tiktok` | https://www.tiktok.com/@citilapvn | CONFIRMED |
| `youtube` | Chưa có | CONFIRMED |
| `zaloOA` | Chưa có | CONFIRMED |

Gợi ý đường dẫn gọi và liên lạc: `tel:+84899188186`, `mailto:contact@citilap.vn`. Với Zalo chỉ tạo link theo phương thức thật sự đang hoạt động; không giả mạo URL OA.

## 3. Cơ sở / showroom

### Cơ sở chính — CitiLap Hà Nội
- `id`: `hanoi`
- `name`: CitiLap Hà Nội
- `status`: `ACTIVE`
- `headOffice`: `true`
- `address`: Số 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội
- `phone`: 0899188186
- `openingHours`: Thứ Hai–thứ Bảy, 09:00–20:00; Chủ nhật **chỉ hỗ trợ theo lịch hẹn trước**, không mở cửa cố định
- `mapsUrl`: https://maps.app.goo.gl/vydJE4R6hyDCshh56
- `onlineOrderPickupAllowed`: `true`
- `receiveWarranty`: `true` (theo chính sách mọi chi nhánh hoạt động)
- Ghi chú: Chưa xác minh riêng tọa độ GPS và định dạng địa chỉ hành chính mới. **Không khai báo Chủ nhật là ngày mở cửa thông thường trong openingHoursSpecification; chỉ hiển thị ghi chú hẹn trước.**

### CitiLap Bắc Ninh
- `id`: `bac-ninh`
- `name`: CitiLap Bắc Ninh
- `status`: `ACTIVE`
- `address`: Số 40 Trần Hưng Đạo, Phường Võ Cường, TP. Bắc Ninh
- `phone`: 0842044999
- `openingHours`: Thứ Hai–thứ Bảy, 09:00–20:00; Chủ nhật **chỉ hỗ trợ theo lịch hẹn trước**, không mở cửa cố định
- `mapsUrl`: https://maps.app.goo.gl/qH6tpuhL48P78XFr6
- `onlineOrderPickupAllowed`: `false` theo dữ liệu chủ cửa hàng
- `walkInViewingAndDirectPurchaseAllowed`: `true` — khách **được đến xem và mua máy trực tiếp** tại cơ sở Bắc Ninh; đây là nghiệp vụ khác với nhận đơn online tại showroom.
- `receiveWarranty`: `true` theo chính sách mọi chi nhánh hoạt động; xác nhận quy trình thực tế

### CitiLap Hồ Chí Minh
- `id`: `hcm`
- `name`: CitiLap Hồ Chí Minh
- `status`: `TEMPORARILY_CLOSED`
- `address`: Số 552 Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh (địa chỉ lịch sử)
- `phone`: 0899188186
- `mapsUrl`: chưa có
- `onlineOrderPickupAllowed`: `false`
- KHÔNG đưa vào checkout pickup, KHÔNG quảng bá là showroom đang mở, KHÔNG tạo openingHours LocalBusiness như đang hoạt động.
- Nếu hiển thị trên lịch sử chi nhánh, ghi rõ **Tạm đóng cửa**.

**Quy tắc quan trọng:** Chỉ Hà Nội xuất hiện trong selector "Nhận tại showroom" cho đơn online hiện tại; không tự lấy mọi chi nhánh ACTIVE thành điểm nhận hàng.

## 4. Tài sản thương hiệu được đính kèm

Các ảnh gốc kèm gói bàn giao:
- `assets/brand-logo-original.jpg`: logo CitiLap VN trên nền xanh đậm (ảnh gốc 900×900).
- `assets/store-photo-01.jpg` ... `assets/store-photo-04.jpg`: 4 ảnh mặt tiền/không gian/hoạt động thực tế tại **CitiLap Hà Nội**; chủ cửa hàng đã xác nhận tất cả ảnh cửa hàng trong gói thuộc cơ sở Hà Nội.
- `assets/marketing-banner-original.png`: banner ghép sản phẩm/thông tin thương hiệu.

**Hướng dẫn:** Không thay logo bằng ảnh AI hoặc ảnh Internet; không tự đổi màu bộ nhận diện. Cần bản logo SVG hoặc PNG trong suốt chất lượng cao để dùng Header/favicon nếu có. Trước khi sử dụng ảnh có người làm nội dung quảng cáo công khai, xác nhận quyền sử dụng hình ảnh/phù hợp quyền riêng tư. **Chỉ gắn bốn ảnh cửa hàng trong gói cho CitiLap Hà Nội**, không dùng làm ảnh đại diện cơ sở Bắc Ninh/TP.HCM. Chưa có ảnh riêng được xác nhận cho Bắc Ninh.

## 5. Bảo hành — quy tắc đã xác nhận

- Máy mới: gói bảo hành **6 hoặc 12 tháng**, phụ thuộc gói/SKU khách chọn.
- Máy Like New/Used: gói **3, 6 hoặc 12 tháng**, phụ thuộc gói/SKU.
- Pin, sạc, màn hình và linh kiện tiêu hao: thời gian riêng **3–6 tháng tùy gói**; cần điều khoản chi tiết theo linh kiện.
- Tiếp nhận bảo hành: tại cơ sở đang hoạt động hoặc gửi máy qua vận chuyển/bưu điện theo hướng dẫn của CitiLap.
- Đầu mối chính: CitiLap Hà Nội.
- Loại trừ dự kiến: lỗi không thuộc phạm vi bảo hành sản phẩm/gói bảo hành và tổn hại do sử dụng sai, ngoại lực hoặc các nguyên nhân đã công bố rõ. **Không sử dụng câu loại trừ chung để phủ nhận quyền bảo hành theo luật.**
- **Thông số số tháng bảo hành phải lấy từ ProductVariant/warranty package thực tế; không hard-code "12 tháng" trong ProductCard/PDP.**

## 6. Đổi trả và hoàn tiền

- Đổi trả do lỗi kỹ thuật thuộc phạm vi lỗi sản phẩm: trong **7 ngày đầu** theo điều kiện áp dụng và kết quả kiểm tra.
- Khách không còn nhu cầu: có thể hỏi về **thu mua lại theo chính sách thu cũ** riêng; **không gọi đây là hoàn tiền/đổi trả miễn phí**.
- Hoàn tiền: sản phẩm lỗi trong 7 ngày hoặc trường hợp bảo hành mà cửa hàng không tìm được phương án giải quyết phù hợp, tùy điều kiện áp dụng/quyền lợi hợp pháp.
- Phí vận chuyển khi đổi trả: trao đổi theo từng tình huống; không khẳng định một bên luôn chịu phí.
- Đầu mối: CitiLap Hà Nội, 0899188186.
- Chi tiết thời gian phản hồi, biên bản lỗi, phương thức/tiến độ hoàn tiền cần xác nhận trước khi xuất bản chính sách hoàn chỉnh.

## 7. Tình trạng laptop cũ

- Like New 99%: mô tả định hướng của cửa hàng là máy sử dụng ít, ngoại hình khoảng 98–99%, mainboard nguyên bản/chưa sửa, pin trên 90%, SSD ít giờ.
- Chỉ được gắn các tuyên bố **pin >90%, main zin, ít giờ SSD** cho **máy cụ thể đã kiểm tra và lưu bằng chứng**, không mặc định đúng với toàn bộ USED/LIKE_NEW.
- Hạng ngoại hình: A/B/C/D; **PENDING** quy tắc định nghĩa từng hạng.
- CitiLap kiểm tra mainboard, linh kiện và các chức năng trước khi bán; tình trạng riêng cần được công bố trên trang chi tiết sản phẩm.
- Không đăng serial, giá vốn hoặc nhật ký nội bộ lên trang công khai.

## 8. Đặt hàng và vận chuyển

- Nhận đơn trên website toàn quốc, không yêu cầu tài khoản khách, không thanh toán trực tuyến trong scope hiện tại.
- Có giao hàng qua đơn vị vận chuyển hoặc giao theo bố trí của cửa hàng.
- Có thể kiểm tra máy trước khi nhận theo phương án thống nhất với shop và đơn vị vận chuyển.
- Mục tiêu xử lý đơn: **1 ngày**; mục tiêu liên hệ tư vấn **1–4 giờ** sau khi đặt (làm rõ ngoài giờ làm việc trước khi công bố SLA tuyệt đối).
- **Phí vận chuyển tham khảo 100.000–300.000đ**, thay đổi theo phương thức vận chuyển/địa chỉ; **không phải bảng giá cố định hay số tiền tự động tính tại checkout**. Nhân viên xác nhận mức phí cụ thể sau khi trao đổi.
- **Miễn phí giao hàng trong bán kính 10 km quanh cơ sở CitiLap Hà Nội**; **không áp dụng mặc định tại Bắc Ninh**. Cần xác nhận cách đo bán kính, điều kiện giao cụ thể trước khi lập trình tự tính freeship. Không tự động miễn phí dựa trên khách tự nhập địa chỉ.
- **Hiện tại Checkout luôn hiển thị "Phí vận chuyển sẽ được xác nhận khi tư vấn".** Không đánh đồng phí chưa xác định với miễn phí 0đ.
- Hủy/sửa đơn: khách liên hệ 0899188186.
- Thanh toán online có thể phát triển trong tương lai; **không tự triển khai trong STORE-12**.

## 9. Dữ liệu cá nhân và tracking

- Đơn vị liên hệ phụ trách dữ liệu: CitiLap (tên pháp lý chưa cung cấp công khai).
- Quy trình: lưu tên, số điện thoại, email nếu cung cấp, địa chỉ, nội dung đơn, trạng thái và lịch sử trao đổi phù hợp mục đích tiếp nhận/xử lý/bảo hành/hậu mãi.
- Có chuyển/sử dụng trong hệ thống quản lý nội bộ của CitiLap; không được viết "không chia sẻ dữ liệu" một cách tuyệt đối.
- Mốc dự kiến lưu đơn: **2 năm**, ngoại trừ các trường hợp cần lưu lâu hơn theo nghĩa vụ pháp luật; không hứa xóa tất cả sau đúng 2 năm trong mọi trường hợp.
- Yêu cầu dữ liệu: contact@citilap.vn / 0899188186.
- Có kế hoạch Google Analytics, Meta Pixel; chỉ bật sau khi công khai minh bạch về cookie/tracking và triển khai lựa chọn/đồng ý phù hợp.
- Chính sách quyền riêng tư phải có quyền của chủ thể dữ liệu và quy trình tiếp nhận yêu cầu, không chỉ là đoạn disclaimer.

## 10. Nội dung & SEO

- Phạm vi toàn quốc, nhấn mạnh showroom Hà Nội và Bắc Ninh đang hoạt động.
- Sản phẩm ưu tiên: laptop gaming, Ultrabook cao cấp; giá tập trung 15–30 triệu đồng.
- Có trang Giới thiệu và mục tin công nghệ/review/hướng dẫn chọn mua sau này. Không đăng bài AI giả đánh giá hoặc tin bài chưa có kiểm chứng.
- Có thể dùng liên kết/video TikTok chính thức đã công bố và bài review có nguồn/permission.
- Có đánh giá thật được phép công khai; yêu cầu URL hoặc hồ sơ đánh giá riêng trước khi đưa review/rating vào structured data.

## 11. Các quyết định kỹ thuật đề xuất

1. Dùng `https://citilap.vn` không www, canonical và sitemap thống nhất; chuyển hướng www khi DNS/TLS đã được cấu hình.
2. `site-config`/`business-profile` làm nguồn dữ liệu thống nhất; không hard-code 3 lần trong Header/Footer/JSON-LD.
3. `Organization` cho thương hiệu, `LocalBusiness`/`Store` chỉ cho **2 cơ sở đang hoạt động** với dữ liệu đầy đủ; HCM đang tạm đóng phải loại khỏi danh sách đang mở.
4. Checkout chỉ có pickup tại Hà Nội cho tới khi người phụ trách xác nhận lựa chọn khác.
5. Bài viết/chính sách lưu riêng ở content layer (Markdown/MDX an toàn hoặc config); không viết CMS/ERP mới chỉ để làm SEO.
6. Các chính sách phải được chủ cửa hàng duyệt trước khi public và rà soát pháp lý.
7. Chưa có Google Business Profile URL không cản triển khai LocalBusiness markup, nhưng không tự tạo review counts, tọa độ, địa chỉ mới.

## 12. Cần xác nhận thêm (không ngăn việc soạn prompt)

1. **ĐÃ XÁC NHẬN:** Phí vận chuyển tham khảo **100.000–300.000đ**, tùy phương thức; phí chính thức chốt khi tư vấn. Việc hiển thị khoảng tham khảo trên từng giao diện cần nhất quán và tránh cam kết sai.
2. **ĐÃ XÁC NHẬN:** Freeship trong bán kính **10 km chỉ tại Hà Nội**, không áp dụng mặc định cho Bắc Ninh. **Còn cần quyết định trước khi tự động tính:** khoảng cách theo đường đi hay bán kính địa lý, điều kiện giao hàng và cách xác minh địa chỉ.
3. **ĐÃ XÁC NHẬN:** Chủ nhật ở Hà Nội và Bắc Ninh **chỉ hỗ trợ theo lịch hẹn**; không công bố giờ mở cửa Chủ nhật cố định.
4. **ĐÃ XÁC NHẬN:** Bắc Ninh **có xem và mua trực tiếp**, nhưng **không là điểm nhận đơn online tại quầy**.
5. **ĐÃ XÁC NHẬN:** 4 ảnh cửa hàng trong gói đều thuộc **CitiLap Hà Nội**, không dùng để mô tả Bắc Ninh.
6. **PENDING PHÁP LÝ:** Pháp nhân/MST và nghĩa vụ công khai trên website/báo cáo TMĐT trước khi vận hành chính thức.
7. **PENDING CHÍNH SÁCH:** Định nghĩa cấp A/B/C/D, ngoại lệ bảo hành pin/sạc/màn hình và các điều kiện chi tiết.
8. **PENDING SLA:** Liên hệ trong 1–4h có tính ngoài giờ làm việc và Chủ nhật theo lịch hẹn hay không?

## 13. Tài liệu tham khảo công khai

- Google Organization markup: https://developers.google.com/search/docs/appearance/structured-data/organization
- Google LocalBusiness markup: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Luật Thương mại điện tử năm 2025 và thủ tục: https://online.gov.vn/
- Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP: https://chinhphu.vn/?classid=1&docid=216387&pageid=27160
- Google Analytics consent: https://developers.google.com/tag-platform/security/concepts/consent-mode
