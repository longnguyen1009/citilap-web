# R07B — Kiến Trúc & Thiết Kế Hot Sale, Countdown & Unified Pricing Engine

> **Dự án:** CitiLap CMS & StoreFront  
> **Giai đoạn:** R07B (Mã phạm vi: `PROMO-01`)  
> **Kế hoạch gốc:** `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`  
> **Ngày hoàn thành:** 2026-10-15  
> **Trạng thái:** HOÀN THÀNH TOÀN DIỆN (7/7 Integration Gates Pass, Build Cloudflare Code 0, TypeScript 0 Error)

---

## 1. Bối Cảnh & Vấn Đề Kỹ Thuật Trước R07B

Trước R07B, hệ thống Flash Sale / Hot Sale gặp các bất cập nghiêm trọng:
1. **Countdown giả lập & biến môi trường:** StoreFront phụ thuộc vào `NEXT_PUBLIC_FLASH_SALE_END_AT` hoặc tự động cuộn thêm 24-48h khi hết hạn (artificial reset), gây mất uy tín với khách hàng.
2. **Không có khung giờ chiến dịch thực tế:** Cài đặt Admin CMS chỉ có cờ bật/tắt sơ khai và tiêu đề, không có thời điểm bắt đầu (`startAt`) và kết thúc (`endAt`) cụ thể.
3. **Phân tán logic tính giá:** Giá bán được tính ad-hoc ở nhiều nơi (ProductCard, trang chủ, PDP, giỏ hàng, API đơn hàng), dẫn đến nguy cơ lệch giá giữa lúc duyệt hàng và lúc thanh toán.
4. **Không có cơ chế hết hạn tức thì (Immediate Expiration):** Khi chiến dịch kết thúc, giá ưu đãi vẫn hiển thị trên các trang nếu không có cron/worker chạy ngầm cập nhật lại DB.
5. **Đơn hàng không xác thực giá phía máy chủ:** Khách hàng có thể gửi `price` từ trình duyệt hoặc mua với giá sale sau khi hết giờ vàng nếu backend không tính toán lại giá tại thời điểm đặt.

---

## 2. Kiến Trúc & Các Nguyên Tắc Bất Biến R07B

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Admin CMS Site Settings                         │
│  - flashSaleEnabled (boolean)                                          │
│  - flashSaleTitle (string)                                             │
│  - flashSaleStartAt (ISO UTC string)                                   │
│  - flashSaleEndAt (ISO UTC string)                                     │
│  - Guard: startAt < endAt (Zod superRefine UTC)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            Unified Pricing Engine (pricing.service.ts)                 │
│  - isFlashSaleActive(now, settings): now in [startAt, endAt)           │
│  - calculateEffectivePrice(product, isSaleActive)                      │
│      * Active  -> effectivePrice = product.price                       │
│      * Expired -> effectivePrice = product.originalPrice               │
│                   (nếu isFlashSale && originalPrice > price)           │
│  - resolvePrice(product, settings, now)                                │
│  - applyPricingToHomepageProducts(products, settings, now)             │
└──────────────────┬─────────────────┬───────────────────┬───────────────┘
                   │                 │                   │
                   ▼                 ▼                   ▼
     ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐
     │ StoreFront UI     │  │ PDP & Structured  │  │ Order Checkout     │
     │ - FlashSaleSection│  │   Data (JSON-LD)  │  │ - 0đ tolerance verif│
     │ - FlashSaleCountdn│  │ - schema.org offer│  │ - 409 PRICE_CHANGED│
     │ - /hot-sale page  │  │ - Variant pricing │  │ - Snapshot unit/   │
     │ - ProductCard     │  │ - Related products│  │   compareAt price  │
     └───────────────────┘  └───────────────────┘  └────────────────────┘
```

### 2.1. Nguồn Lưu Trữ Khung Giờ Chiến Dịch Chuẩn (Canonical Time Window)
- Bảng `SiteSettings` trong SQLite/D1 (`id = 'site'`) là nguồn duy nhất lưu trữ cấu hình chiến dịch:
  - `flashSaleEnabled`: Cờ kích hoạt chiến dịch (Zod hỗ trợ cả boolean và số 0/1 từ SQLite JSON).
  - `flashSaleTitle`: Tiêu đề chiến dịch tùy chỉnh (mặc định: `"GIỜ VÀNG GIÁ SỐC"`).
  - `flashSaleStartAt`: Thời điểm bắt đầu chuẩn ISO 8601 UTC.
  - `flashSaleEndAt`: Thời điểm kết thúc chuẩn ISO 8601 UTC.
- **Quy tắc kiểm thực (Zod Contract Guard):**
  - Khi `flashSaleEnabled = true`, cả `flashSaleStartAt` và `flashSaleEndAt` đều bắt buộc.
  - Bắt buộc `flashSaleStartAt < flashSaleEndAt`. Nếu vi phạm, Zod ném lỗi tại đường dẫn `flashSaleEndAt`.
- **Loại bỏ hoàn toàn biến môi trường:** Xóa bỏ sự phụ thuộc vào `NEXT_PUBLIC_FLASH_SALE_END_AT`.

### 2.2. Khoảng Thời Gian Nửa Mở (Half-open Interval `[startAt, endAt)`)
Hệ thống sử dụng khoảng thời gian nửa mở trên dòng thời gian UTC:
```typescript
export function isFlashSaleActive(
  now: Date = new Date(),
  settings?: {
    flashSaleEnabled?: boolean;
    flashSaleStartAt?: string | null;
    flashSaleEndAt?: string | null;
  } | null
): boolean {
  if (!settings || !settings.flashSaleEnabled) return false;
  if (!settings.flashSaleStartAt || !settings.flashSaleEndAt) return false;

  const start = new Date(settings.flashSaleStartAt).getTime();
  const end = new Date(settings.flashSaleEndAt).getTime();
  const current = now.getTime();

  if (isNaN(start) || isNaN(end)) return false;
  return current >= start && current < end;
}
```

### 2.3. Hết Hạn Tức Thì Phía Máy Chủ (Server-Enforced Immediate Expiration)
Thay vì phụ thuộc vào worker chạy định kỳ để gỡ cờ giá, `calculateEffectivePrice` trong `pricing.service.ts` đánh giá tức thời:
- Khi chiến dịch đang **Active**: Sản phẩm có `isFlashSale = true` được bán với giá `price` (giá ưu đãi giờ vàng), `compareAtPrice = originalPrice`.
- Khi chiến dịch **Inactive hoặc Expired**: Nếu sản phẩm có cờ `isFlashSale = true` và `originalPrice > price`, giá bán có hiệu lực (`effectivePrice`) tự động khôi phục về `originalPrice`, và `compareAtPrice = null`.
- Nhờ vậy, ngay tại microsecond mà `now >= endAt`, mọi truy vấn hiển thị, giỏ hàng, và tạo đơn hàng đều tự động áp dụng giá gốc mà không có độ trễ nền.

### 2.4. Xác Thực Giá 0đ Tolerance Khi Tạo Đơn Hàng (Order Creation Verification)
Khi người dùng bấm đặt hàng (`POST /api/orders`):
1. Client gửi kèm `item.expectedPrice` (giá mà người dùng nhìn thấy trong giỏ hàng).
2. Service `order.service.ts` phân giải lại sản phẩm từ cơ sở dữ liệu và lấy `SiteSettings` hiện tại.
3. Tính toán `effectivePrice` thông qua `calculateEffectivePrice(product, isSaleActive)`.
4. So khớp `item.expectedPrice` với `effectivePrice`:
   - Nếu có bất kỳ sự sai lệch nào (`item.expectedPrice !== effectivePrice`, sai số 0 đồng), server lập tức từ chối và ném lỗi **HTTP 409 Conflict** (`code: 'PRICE_CHANGED'`).
   - Phản hồi trả về thông tin chi tiết: `productId`, `title`, `clientPrice`, `serverPrice`.
5. Nếu khớp giá, đơn hàng được tạo với bản snapshot bất biến:
   - `OrderItem.price`: snapshot `effectivePrice`.
   - `OrderItem.compareAtPrice`: snapshot giá so sánh trước giảm (nếu có).
   - `OrderEvent`: ghi nhận sự kiện đặt hàng kèm chiến dịch giờ vàng (nếu sản phẩm đang trong sale).

---

## 3. Danh Mục Các Thành Phần Đã Triển Khai

| Phân hệ | Tệp nguồn | Nội dung thực hiện |
|---|---|---|
| **Contracts** | `src/contracts/cms/settings.ts` | Bổ sung `flashSaleStartAt`, validation `startAt < endAt`, hỗ trợ SQLite JSON boolean/number. |
| **Contracts** | `src/contracts/cms/product-studio.ts` | Bổ sung trường `isFlashSale: z.boolean().default(false)` vào `productDocumentSchema` & `blankProduct()`. |
| **Pricing Engine** | `src/server/services/pricing.service.ts` | Service tập trung tính giá có hiệu lực, trạng thái sale, resolve giá danh sách sản phẩm. |
| **Admin UI** | `src/app/admin/settings/page.tsx` | Form nhập `startAt` / `endAt` (datetime-local), preview múi giờ UTC+7, validation tương tác. |
| **Product Studio** | `src/components/admin/products/ProductEditor.tsx` | Checkbox `🔥 Giá sốc giờ vàng (Hot Sale)` trong tab Giá bán & Khuyến mãi. |
| **Product Service** | `src/server/services/product-studio.service.ts` | Mapping `isFlashSale` trong draft, publish projection vào cột `Product.isFlashSale`, bảo đảm cô lập nháp. |
| **Catalog Service**| `src/server/services/catalog.service.ts` | Trả về `isFlashSale` trong `ProductDetailData` cho PDP. |
| **Countdown UI** | `src/components/product/FlashSaleCountdown.tsx` | Hiển thị 3 mốc: Sắp diễn ra (`Bắt đầu trong:`), Đang diễn ra (`Kết thúc trong:`), Đã kết thúc (`Flash sale đã kết thúc`). Không tự reset/cuộn thêm giờ. |
| **Trang chủ UI** | `src/components/home/FlashSaleSection.tsx` | Đọc `getStorefrontSettings()`, ẩn hoàn toàn khi chiến dịch kết thúc hoặc tắt, đồng bộ tiêu đề & đếm ngược. |
| **Trang Hot Sale**| `src/app/(shop)/hot-sale/page.tsx` | Lọc chính xác sản phẩm `isFlashSale = true`, tính giá qua `applyPricingToHomepageProducts()`, banner trạng thái sạch sẽ. Không trộn sản phẩm thường. |
| **Card Sản phẩm** | `src/components/product/ProductCard.tsx` | Hỗ trợ cờ `isFlashSale`, badge Hot Sale động, hiển thị giá so sánh gạch ngang khi `isOnSale`. |
| **Trang Chi Tiết** | `src/app/(shop)/product/[id]/page.tsx` | Đồng bộ giá hiển thị, JSON-LD schema.org offer, biến thể, sản phẩm liên quan theo `calculateEffectivePrice`. |
| **Giỏ & Checkout** | `src/app/(shop)/checkout/page.tsx` | Truyền `expectedPrice: item.price` sang payload đặt hàng. |
| **Order API** | `src/app/api/orders/route.ts` | Xử lý mã lỗi `409 Conflict` khi nhận diện `PRICE_CHANGED`. |
| **Order Service**| `src/server/services/order.service.ts` | Tính lại giá hiệu lực trên server, xác thực 0đ tolerance, snapshot giá & campaign log. |

---

---

## 4. Kiểm Thử & Nghiệm Thu (Verification)

Chi tiết kịch bản và kết quả kiểm thử R07B gốc:
👉 `docs/admin/R07B-ACCEPTANCE.md`

---

## 5. R07B.1 — Khép Unified Pricing, Xác Nhận Giá Checkout & Campaign (Master Plan V2)

> **Mã giai đoạn:** R07B.1  
> **Ngày hoàn thành:** 2026-10-16  
> **Migration:** `d1-migrations/0018_campaign_and_order_snapshot.sql`  
> **Kiểm thử tích hợp:** `scripts/test-r07b-1-unified-pricing.mjs` (17/17 PASS, 100%)

### 5.1. Bất Biến Giá & Cách Ly Biến Thể (Variant Price Isolation)
1. **Phân biệt 3 loại giá:**
   - **Giá bán thường (Regular Price):** Giá niêm yết chuẩn (`variant.price` hoặc `product.price`).
   - **Giá tham chiếu (Compare-at Price):** Giá gạch ngang trước khi giảm, chỉ xuất hiện khi có ưu đãi hợp lệ.
   - **Giá chiến dịch (Campaign / Flash Sale Price):** Giá có hiệu lực trong khoảng `[startAt, endAt)`.
2. **Cách ly giá biến thể:**
   - Biến thể tuyệt đối **không mượn** `originalPrice` của sản phẩm cha khi biến thể thiếu `originalPrice`.
   - Biến thể chưa có cấu hình sale hợp lệ giữ nguyên giá bán thường của chính nó (`variant.price`), với `isOnSale = false` và `compareAtPrice = null`.
   - `isOnSale` là `true` **duy nhất khi có ưu đãi thật sự hợp lệ** (`effectivePrice < compareAtPrice`).

### 5.2. Thứ Tự Ưu Tiên Chiến Dịch (Campaign Priority Hierarchy)
```
1. PromotionCampaignItem theo Biến Thể (variantId)  [Ưu tiên cao nhất]
                      ↓
2. PromotionCampaignItem theo Sản Phẩm (productId)
                      ↓
3. Site-Wide Flash Sale (Legacy settings)
                      ↓
4. Giá Bán Thường (Regular Price)                    [Mặc định không sale]
```

### 5.3. Ngăn Chặn Xung Đột Khung Giờ (Temporal Overlap Guard)
- Khi xuất bản chiến dịch (`publishCampaign`): Server kiểm tra điều kiện giao thoa thời gian `[startAt, endAt)` với mọi chiến dịch đang `PUBLISHED`.
- Nếu có trùng lặp sản phẩm hoặc biến thể trong cùng khung giờ, server chặn ngay lập tức và ném lỗi `CampaignConflictError` (`code: 'CAMPAIGN_OVERLAP_CONFLICT'`), chỉ rõ ID chiến dịch xung đột và tên sản phẩm/biến thể.

### 5.4. Đơn Hàng & Xác Nhận Giá Checkout (409 Structured Response & Recovery)
- **Tập hợp toàn bộ biến động giá:** Thay vì dừng ở item đầu tiên, server quét toàn bộ sản phẩm và tích lũy vào `PriceChangedError.details.changedItems`.
- **Phản hồi chuẩn 409 Conflict:**
  ```json
  {
    "success": false,
    "error": {
      "code": "PRICE_CHANGED",
      "message": "Giá sản phẩm đã thay đổi...",
      "details": {
        "changedItems": [
          {
            "productId": "...",
            "variantId": "...",
            "productName": "...",
            "oldPrice": 25000000,
            "newPrice": 28000000,
            "quantity": 1,
            "oldLineTotal": 25000000,
            "newLineTotal": 28000000
          }
        ],
        "oldSubtotal": 25000000,
        "newSubtotal": 28000000,
        "oldGrandTotal": 25000000,
        "newGrandTotal": 28000000
      }
    }
  }
  ```
- **Phục hồi thông minh trên Storefront (`/checkout`):**
  - Giữ nguyên toàn bộ form thông tin khách hàng (họ tên, số điện thoại, email, địa chỉ, ghi chú, hình thức nhận hàng).
  - Hiển thị Modal/Banner cảnh báo chi tiết biến động giá và chênh lệch tổng tiền.
  - Nút **"Xác nhận giá mới & Đặt hàng"**: Đồng bộ giá mới vào `CartContext` (`updateItemPrice`), làm mới `Idempotency-Key`, và tự động gửi lại đơn hàng thành công mà không yêu cầu khách nhập lại dữ liệu.

### 5.5. Snapshot Bất Biến Trên `OrderItem`
Bảng `OrderItem` được bổ sung 4 cột snapshot giá chuẩn xác:
- `regularPriceSnapshot` (INTEGER VND)
- `compareAtPriceSnapshot` (INTEGER VND | NULL)
- `campaignSnapshot` (TEXT JSON chứa metadata chiến dịch tại thời điểm đánh giá)
- `pricingEvaluatedAt` (DATETIME ISO UTC)

Nghiệm thu chi tiết: 👉 `docs/admin/R07B.1-ACCEPTANCE.md`

