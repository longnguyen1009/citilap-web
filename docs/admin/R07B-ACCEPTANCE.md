# Báo Cáo Nghiệm Thu R07B: Hot Sale, Countdown & Unified Pricing Engine

> **Dự án:** CitiLap E-Commerce & CMS  
> **Giai đoạn:** R07B (Mã hạng mục: `PROMO-01`) — Giờ vàng giá sốc, Đồng hồ đếm ngược mốc thực tế, và Động cơ tính giá hợp nhất  
> **Kế hoạch gốc:** CMS Master Plan V2 (`docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`)  
> **Tài liệu kiến trúc:** `docs/admin/R07B-HOT-SALE-PRICING.md`  
> **Ngày hoàn thành:** 2026-10-15  
> **Trạng thái:** HOÀN THÀNH TOÀN DIỆN (7/7 Integration Gates Pass, Build Cloudflare Code 0, TypeScript 0 Error)

---

## 1. Mục Tiêu & Phạm Vi Bàn Giao

### 1.1. Mục tiêu đạt được:
1. **Khung Giờ Chiến Dịch Thực Tế Trong CMS Settings:**
   - Bổ sung `flashSaleStartAt`, `flashSaleEndAt`, `flashSaleEnabled`, `flashSaleTitle` vào hợp đồng `SiteSettings`.
   - Lưu trữ chuẩn ISO 8601 UTC. Giao diện Admin hỗ trợ bộ chọn thời gian cục bộ (datetime-local) kèm hiển thị quy đổi giờ Hà Nội (UTC+7).
   - Kiểm thực nghiêm ngặt bằng Zod: từ chối lưu nếu `startAt >= endAt` khi bật chiến dịch.
   - Loại bỏ hoàn toàn sự phụ thuộc vào biến môi trường `NEXT_PUBLIC_FLASH_SALE_END_AT`.
2. **Đồng Hồ Đếm Ngược Theo Mốc Thực Tế (Milestone Countdown):**
   - Thành phần `FlashSaleCountdown` hiển thị chính xác theo 3 trạng thái mốc:
     - **Sắp diễn ra:** `"Bắt đầu trong: [DD:HH:MM:SS]"` (khi `now < startAt`).
     - **Đang diễn ra:** `"Kết thúc trong: [DD:HH:MM:SS]"` (khi `startAt <= now < endAt`).
     - **Đã kết thúc:** `"Flash sale đã kết thúc"` (khi `now >= endAt`).
   - Tuyệt đối không tự động cuộn thêm giờ (artificial reset / roll-forward). Đảm bảo tính nhất quán giữa Server và Client (Hydration-safe).
3. **Động Cơ Tính Giá Hợp Nhất (Unified Pricing Engine):**
   - Triển khai `src/server/services/pricing.service.ts` làm nguồn chân lý duy nhất cho việc định giá trên toàn bộ hệ thống:
     - `isFlashSaleActive(now, settings)`: Đánh giá theo khoảng thời gian nửa mở `[startAt, endAt)`.
     - `calculateEffectivePrice(product, isSaleActive)`: Tính toán giá bán có hiệu lực tức thời.
     - `resolvePrice(product, settings, now)`: Tiện ích tính giá kèm cài đặt hệ thống.
     - `applyPricingToHomepageProducts(products, settings, now)`: Định dạng danh sách sản phẩm hiển thị.
4. **Hết Hạn Giá Tức Thì Phía Máy Chủ (Server-Enforced Immediate Expiration):**
   - Ngoài khoảng `[startAt, endAt)`, các sản phẩm có cờ `isFlashSale = true` và `originalPrice > price` tự động có `effectivePrice` khôi phục về `originalPrice`, xóa `compareAtPrice`.
   - Loại bỏ hoàn toàn độ trễ hiển thị mà không cần tác vụ ngầm (background cron) quét và sửa database.
5. **Quản Lý Sản Phẩm Hot Sale Trong Product Studio:**
   - Mở rộng hợp đồng sản phẩm với cờ `isFlashSale: z.boolean().default(false)`.
   - Bổ sung tùy chọn checkbox `🔥 Giá sốc giờ vàng (Hot Sale)` trong tab Giá bán của Product Studio.
   - Tuân thủ bất biến cô lập bản nháp (Draft Isolation): thay đổi cờ `isFlashSale` trong bản nháp chỉ được chiếu vào cột `Product.isFlashSale` khi quản trị viên thực hiện hành động Xuất bản (Publish).
6. **Xác Thực Giá 0đ Tolerance & Chống Gian Lận Đơn Hàng:**
   - Khi tạo đơn hàng (`order.service.ts`), hệ thống tự động tính lại `effectivePrice` trên máy chủ và đối chiếu với `item.expectedPrice` do client gửi.
   - Nếu có bất kỳ sự chênh lệch nào (sai số 0đ), máy chủ từ chối tạo đơn với mã lỗi **HTTP 409 Conflict** (`code: 'PRICE_CHANGED'`).
   - Lưu trữ snapshot bất biến `unitPrice`, `compareAtPrice`, và ghi nhận log chiến dịch giờ vàng vào `OrderEvent`.
7. **Đồng Bộ Trải Nghiệm StoreFront:**
   - Khối Flash Sale trang chủ (`FlashSaleSection.tsx`) tự động ẩn khi chiến dịch không kích hoạt hoặc đã kết thúc.
   - Trang `/hot-sale` chỉ hiển thị các sản phẩm có `isFlashSale = true`, loại bỏ việc trộn lẫn sản phẩm nổi bật không giảm giá, có thông báo trạng thái rõ ràng khi hết giờ vàng.
   - Thẻ sản phẩm `ProductCard.tsx` hiển thị nhãn Hot Sale và giá gạch chân đồng bộ khi đang trong đợt sale.
   - Trang chi tiết sản phẩm PDP (`/product/[id]`) đồng bộ giá hiển thị, biến thể, sản phẩm liên quan và dữ liệu có cấu trúc SEO JSON-LD (`schema.org/Offer`).

### 1.2. Ranh giới phạm vi (Scope Boundaries):
- **Bảo toàn R06 & R07A:** Giữ nguyên vẹn máy trạng thái đơn hàng R06 và toàn bộ hệ thống Site Builder / Collections R07A.
- **Không vượt sang R07C:** Chưa can thiệp vào cài đặt phí vận chuyển và cổng thanh toán tự động R07C.
- **An toàn môi trường:** Không thay đổi cơ sở dữ liệu trên remote, không can thiệp `.dev.vars`, tôn trọng các tệp đang biên tập.

---

## 2. Nhật Ký Kiểm Thử Đa Tầng (5 Layers of Verification)

### Tầng A — Kiểm Tra Mã Nguồn Tĩnh & Đóng Gói (Static Code & Cloudflare Build)
- `cmd /c npx tsc --noEmit`: Kết quả **Code 0**, hoàn toàn sạch lỗi kiểu dữ liệu (clean type check).
- `cmd /c npm run build:cloudflare`: Kết quả **Code 0**. Tất cả các tuyến SSR/Edge liên quan đến Hot Sale và Pricing đều được phân loại và biên dịch thành công:
  - `? /hot-sale`
  - `ƒ /product/:id`
  - `? /checkout`
  - `λ /api/settings`
  - `λ /api/orders`
  - `? /admin/settings`
  - `? /admin/products`

### Tầng B & C — Kiểm Thử Hợp Đồng & Cơ Sở Dữ Liệu Miniflare D1
Thực thi kiểm thử độc lập qua `node scripts/test-r07b-hot-sale-pricing.mjs`:

```text
--- STARTING R07B HOT SALE & UNIFIED PRICING TEST SUITE ---
PASS: Apply database schema up to 0017
PASS: Gate 1: isFlashSaleActive evaluated strictly on [startAt, endAt) server interval
PASS: Gate 2: calculateEffectivePrice expires sale prices to originalPrice immediately
PASS: Gate 3: Settings contract stores UTC and rejects startAt >= endAt when enabled
PASS: Gate 4: Product Studio isFlashSale flag and publish projection with draft isolation
PASS: Gate 5: Order creation verifies price with 0đ tolerance and snapshots campaign
PASS: Gate 6: applyPricingToHomepageProducts handles active and inactive transitions cleanly

ALL 7 CHECKS PASSED SUCCESSFULLY! R07B INTEGRATION VERIFIED.
```

#### Chi tiết các cổng nghiệm thu tự động (Gates):
1. **Gate 1 (Khung giờ nửa mở):**
   - Trước `startAt`: `isFlashSaleActive === false`.
   - Đúng `startAt`: `isFlashSaleActive === true`.
   - Giữa khoảng `startAt` và `endAt`: `isFlashSaleActive === true`.
   - Đúng `endAt`: `isFlashSaleActive === false`.
   - Sau `endAt`: `isFlashSaleActive === false`.
2. **Gate 2 (Hết hạn giá tức thì):**
   - Sản phẩm có `isFlashSale = true`, `price = 15.000.000đ`, `originalPrice = 20.000.000đ`.
   - Khi chiến dịch Active: `effectivePrice = 15.000.000đ`, `isOnSale = true`, `compareAtPrice = 20.000.000đ`.
   - Khi chiến dịch Inactive: `effectivePrice = 20.000.000đ`, `isOnSale = false`, `compareAtPrice = null`.
   - Sản phẩm thường (`isFlashSale = false`): giữ nguyên giá niêm yết trong cả 2 trạng thái.
3. **Gate 3 (Hợp đồng Settings & SQLite Boolean/Number):**
   - Chấp nhận cấu hình hợp lệ với `startAt < endAt` ở định dạng ISO UTC.
   - Từ chối cấu hình với `startAt >= endAt` (Zod error tại `flashSaleEndAt`).
   - Xử lý tương thích việc SQLite lưu boolean dưới dạng số `0` và `1` trong JSON cột `SiteSettings.doc`.
4. **Gate 4 (Product Studio & Cô lập bản nháp):**
   - Cập nhật cờ `isFlashSale = true` trên bản nháp (draft).
   - Kiểm tra bảng `Product` công khai: `Product.isFlashSale` vẫn là `0` (chưa publish).
   - Thực hiện Xuất bản (Publish): `Product.isFlashSale` được chiếu thành công giá trị `1`.
5. **Gate 5 (Kiểm thực giá đơn hàng 0đ Tolerance):**
   - Gửi đơn hàng với giá đúng (`expectedPrice = 15.000.000đ`): Tạo đơn thành công (201 Created), snapshot `unitPrice = 15.000.000đ`, `compareAtPrice = 20.000.000đ`, ghi log sự kiện chiến dịch `GIỜ VÀNG GIÁ SỐC`.
   - Mô phỏng gian lận gửi giá cũ hoặc hết hạn giờ vàng (`expectedPrice = 15.000.000đ` khi giá đã về `20.000.000đ`): Bị từ chối với mã **HTTP 409 Conflict**, ném lỗi `PRICE_CHANGED` kèm chi tiết giá mong muốn và giá hệ thống.
6. **Gate 6 (Áp dụng giá danh sách StoreFront):**
   - Kiểm tra `applyPricingToHomepageProducts` khi chuyển đổi giữa Active và Inactive: các thuộc tính `price`, `originalPrice`, `isOnSale`, `discountPercent` được tính toán lại chính xác và đồng nhất.

---

## 3. Danh Mục Tệp Thay Đổi & Tạo Mới

| Phân loại | Đường dẫn tệp |
|---|---|
| **Mới** | `src/server/services/pricing.service.ts` |
| **Mới** | `scripts/test-r07b-hot-sale-pricing.mjs` |
| **Mới** | `docs/admin/R07B-HOT-SALE-PRICING.md` |
| **Mới** | `docs/admin/R07B-ACCEPTANCE.md` |
| **Cập nhật** | `src/contracts/cms/settings.ts` |
| **Cập nhật** | `src/contracts/cms/product-studio.ts` |
| **Cập nhật** | `src/server/services/product-studio.service.ts` |
| **Cập nhật** | `src/server/services/catalog.service.ts` |
| **Cập nhật** | `src/server/services/order.service.ts` |
| **Cập nhật** | `src/components/admin/products/ProductEditor.tsx` |
| **Cập nhật** | `src/app/admin/settings/page.tsx` |
| **Cập nhật** | `src/components/product/FlashSaleCountdown.tsx` |
| **Cập nhật** | `src/components/home/FlashSaleSection.tsx` |
| **Cập nhật** | `src/components/product/ProductCard.tsx` |
| **Cập nhật** | `src/app/(shop)/hot-sale/page.tsx` |
| **Cập nhật** | `src/app/(shop)/product/[id]/page.tsx` |
| **Cập nhật** | `src/app/(shop)/checkout/page.tsx` |
| **Cập nhật** | `src/app/api/orders/route.ts` |
| **Cập nhật** | `docs/admin/CONTENT-SOURCE-REGISTRY.md` |
| **Cập nhật** | `docs/admin/R00-BACKLOG.md` |

---

## 4. Kết Luận & Chuyển Giao Giai Đoạn

Giai đoạn **R07B (PROMO-01)** đã hoàn thành 100% các yêu cầu kỹ thuật và nghiệp vụ:
- ✅ Cài đặt khung giờ chiến dịch CMS lưu trữ UTC, kiểm thực chặt chẽ, loại bỏ hoàn toàn biến môi trường.
- ✅ Đếm ngược mốc thực tế không tự lặp lại.
- ✅ Động cơ tính giá hợp nhất `pricing.service.ts` bao phủ toàn diện StoreFront, PDP, Cart, và Order.
- ✅ Cơ chế hết hạn giá tức thời phía máy chủ (0đ lag).
- ✅ Tích hợp Product Studio với cơ chế cô lập bản nháp nghiêm ngặt.
- ✅ Xác thực giá tạo đơn 0đ tolerance, trả lỗi 409 `PRICE_CHANGED` khi có chênh lệch.
- ✅ 7/7 bài kiểm thử tích hợp Miniflare đạt kết quả PASS; Build Cloudflare và kiểm tra kiểu TypeScript đạt chuẩn tuyệt đối.

Sẵn sàng bàn giao và chuẩn bị tiền đề cho **R07C (Cài đặt vận chuyển & thanh toán checkout)** theo đúng lộ trình Master Plan V2.
