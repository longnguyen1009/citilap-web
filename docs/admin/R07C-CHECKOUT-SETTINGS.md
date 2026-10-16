# CitiLap CMS V2 — Kiến Trúc R07C: Checkout Gọn + Shipping / Payment Settings

> **Bổ sung 2026-10-16:** [R07C-INTEGRATION-ADDENDUM.md](R07C-INTEGRATION-ADDENDUM.md) ưu tiên khi có khác biệt: quote bắt buộc, xác nhận ship/tổng, snapshot ngân hàng/showroom, idempotent replay và fail-closed. Chỉ tích hợp runtime sau review R07B.3. Policy tính ship đã chuẩn bị độc lập, không có nghĩa checkout R07C đã triển khai.

> **Dự án:** CitiLap Web (`citilap-web2`)  
> **Giai đoạn:** R07C — Checkout gọn, phí vận chuyển & phương thức thanh toán từ CMS, confirmation rõ  
> **Ngày lập:** 2026-10-15  
> **Căn cứ:** `ADMIN-CMS-MASTER-PLAN-V2.md` (SET-02, SF-03), `PROMPT-R07B.md` / kết quả R07B (unified pricing), R06 order pipeline  
> **Trạng thái tài liệu:** Thiết kế chuẩn bị song song lúc Antigravity triển khai R07B — **chưa triển khai code R07C**  
> **Ranh giới:** Không làm cổng thanh toán online thật (VNPay/MoMo…), không fulfillment engine, không RBAC R08.

---

## 1. Kiểm Kê Hiện Trạng (Baseline trước R07C)

| Thành phần | Hiện trạng | Khoảng trống R07C |
|---|---|---|
| **Admin Settings → tab Shipping** | Đã lưu D1: `shippingFee`, `freeShippingThreshold`, `codEnabled`, `bankTransferEnabled`, `bankAccountInfo` (`src/contracts/cms/settings.ts`, `/admin/settings`) | Banner còn ghi “chờ R08”; StoreFront **chưa đọc** các field này |
| **Public Settings DTO** | `PublicStorefrontSettings` đã whitelist ship/payment fields | Checkout page chưa gọi `getStorefrontSettings()` |
| **Checkout UI** | `src/app/(shop)/checkout/page.tsx` — form gọn, delivery/pickup, `Idempotency-Key`, hardcode `paymentMethod: "COD"` | Không chọn CK ngân hàng; không hiển thị phí ship / STK; showroom pickup vẫn từ `business-profile` tĩnh một phần |
| **Order create** | `order.service.ts` → `shippingFee = 0` cố định; giá dòng lấy thẳng `Product`/`ProductVariant.price` | Phải **tiêu thụ pricing R07B** + tính ship từ Settings; chặn method bị tắt |
| **Success page** | `/checkout/success` + token confirmation đã có (R06) | Bổ sung hiển thị ship/method/hướng dẫn CK khi cần |
| **Idempotency** | Header `Idempotency-Key` + `payloadHash` đã có | Giữ nguyên; regression bắt buộc |

---

## 2. Mục Tiêu R07C

1. **Một nguồn cấu hình** phí ship & phương thức thanh toán từ `SiteSettings` → Checkout + `createOrder` cùng contract.
2. **Server tính và xác minh:** subtotal (qua pricing R07B), shippingFee, totalAmount; method bị tắt **không** tạo được đơn qua API.
3. **Checkout UI gọn:** chọn COD / Chuyển khoản (nếu bật); hiện phí ship hoặc “Miễn phí”; pickup = ship 0; hiện `bankAccountInfo` khi chọn CK.
4. **Confirmation rõ:** success page mirror snapshot (hàng, ship, tổng, method, hướng dẫn CK nếu PENDING bank transfer).
5. **Không** tự đánh dấu `paymentStatus = PAID` khi khách chọn chuyển khoản — chỉ `PENDING` + hướng dẫn; nhân viên xác nhận sau (R06 workflow giữ nguyên).

---

## 3. Phụ Thuộc R07B (bắt buộc trước khi code R07C)

R07C **tiêu thụ** unified pricing từ R07B:

| Input từ R07B | Cách R07C dùng |
|---|---|
| `resolvePrice({ productId, variantId })` | Thay thế đọc `variant.price` / `product.price` thô trong `createOrder` |
| Giá lệch client vs server | Trả 409/422 để UI yêu cầu xác nhận lại — không âm thầm chốt |
| Snapshot campaign trên dòng hàng (nếu R07B đã thêm) | Giữ nguyên khi tạo OrderItem; R07C không định nghĩa lại sale |

Nếu R07B chưa gate-pass: **không bắt đầu implement R07C**.

---

## 4. Contract Tính Phí & Thanh Toán

### 4.1. Shipping (server)

```
subtotal = Σ resolvePrice(line).effectivePrice * qty
if shippingMethod === 'pickup':
  shippingFee = 0
else: // 'standard' / delivery
  if freeShippingThreshold > 0 AND subtotal >= freeShippingThreshold:
    shippingFee = 0
  else:
    shippingFee = settings.shippingFee
total = subtotal + shippingFee - discountAmount  // discountAmount mặc định 0 ở R07C
```

- Số tiền đơn vị **VNĐ integer**.
- `freeShippingThreshold === 0` nghĩa là **không** áp dụng miễn phí theo ngưỡng (luôn thu `shippingFee` cho delivery), khớp hint Admin hiện tại.
- Không tính theo tỉnh/quận phức tạp trong R07C (giữ flat fee).

### 4.2. Payment methods

| Method code | Bật khi | Hành vi tạo đơn | `paymentStatus` ban đầu |
|---|---|---|---|
| `COD` | `codEnabled === true` | Cho phép | `PENDING` |
| `BANK_TRANSFER` | `bankTransferEnabled === true` | Cho phép; UI hiện `bankAccountInfo` | `PENDING` (không coi là đã trả) |

- Client gửi `paymentMethod` không thuộc allowlist hoặc method đang tắt → **400** `PAYMENT_METHOD_DISABLED`.
- Nếu cả hai method tắt → Checkout hiện trạng thái bảo trì; API từ chối mọi create (cấu hình Owner sai — fail closed).
- **Cấm** tích hợp cổng online / webhook / QR động từ bank API trong R07C. `bankAccountInfo` là text hướng dẫn do Owner nhập.

### 4.3. Public quote (tuỳ chọn nhưng khuyến nghị)

Endpoint hoặc server action dùng chung logic:

- `POST /api/checkout/quote` (hoặc tính trong RSC checkout) nhận `items[]` + `shippingMethod` → trả `{ lines, subtotal, shippingFee, total, allowedPaymentMethods, bankAccountInfo? }`.
- Checkout UI **không** tự tính ship bằng JS copy công thức; chỉ hiển thị kết quả server (có thể refresh khi đổi delivery/pickup).

---

## 5. Thay Đổi Tuyến Đường & UI

```
[StoreFront]
├── /cart              -> Link checkout (giữ); có thể preview ship ước tính nếu đã có quote
├── /checkout          -> Đọc Settings + quote; chọn method; submit createOrder
└── /checkout/success  -> Snapshot đủ ship/method/hướng dẫn CK

[Admin]
└── /admin/settings (tab Vận chuyển & Thanh toán)
    -> Gỡ banner “chờ R08”; copy đúng: đã nối StoreFront ở R07C
    -> Validate: ít nhất một method bật khi save (cảnh báo hoặc chặn — chốt trong implement: cảnh báo mạnh + cho save, fail-closed ở StoreFront)

[API]
├── POST /api/orders           -> Verify price (R07B) + ship + method
└── POST /api/checkout/quote   -> (khuyến nghị) pure compute, no persist
```

Pickup showroom: ưu tiên địa chỉ/hotline từ `getStorefrontSettings()` (đã có R07A); fallback `business-profile` nếu thiếu.

---

## 6. Order Snapshot Bổ Sung

Giữ schema R06; đảm bảo các field đã có được **điền đúng**:

| Field | R07C |
|---|---|
| `subtotalAmount` | Từ pricing R07B |
| `shippingFee` | Công thức §4.1 (không còn hardcode 0) |
| `discountAmount` | 0 trừ khi R07B đã snapshot sale vào line (sale nằm ở `priceSnapshot`, không trừ đôi) |
| `totalAmount` | subtotal + shippingFee |
| `paymentMethod` | `COD` \| `BANK_TRANSFER` |
| `paymentStatus` | `PENDING` |
| `shippingMethod` | `standard` \| `pickup` |

Không mở lại state machine đơn R06. Không sửa nghĩa NEW→…→COMPLETED.

---

## 7. Idempotency & An Toàn

- Giữ `Idempotency-Key` + `payloadHash` hiện có.
- Đổi `paymentMethod` / `shippingMethod` / items trên cùng key → `IDEMPOTENCY_PAYLOAD_MISMATCH` (đã có).
- `bankAccountInfo` có thể chứa PII tài khoản shop — chỉ trả cho checkout/success đã auth theo session đặt hàng (token), **không** log raw vào server logs.
- CSRF/auth Admin Settings giữ nguyên; public quote rate-limit nếu dễ thêm (không bắt buộc gate).

---

## 8. Ma Trận Quyền (ghi nhớ — UI RBAC = R08)

Theo V2: chỉ Owner cấu hình payment/shipping settings. R07C vẫn `requireAdmin` trên `/api/admin/settings` như hiện tại; không implement role Editor/Sales trong phase này.

---

## 9. Kiểm Thử Dự Kiến (chi tiết trong PROMPT-R07C)

1. Settings: COD only / Bank only / cả hai / cả hai tắt.
2. Delivery dưới ngưỡng → thu ship; trên ngưỡng → ship 0; pickup → ship 0.
3. API create với method tắt → 400.
4. Giá lệch (R07B) → không tạo đơn sai tổng.
5. Idempotent replay cùng payload → 200 cùng orderId.
6. Success page hiện đúng ship + hướng dẫn CK.
7. Regression R06 list/detail order; R07A settings branding không gãy.

---

## 10. Ngoài Phạm Vi R07C

- Cổng thanh toán tự động, IPN, đối soát ngân hàng.
- Phí ship theo vùng hành chính / trọng lượng.
- Coupon / mã giảm giá.
- Tự động `paymentStatus = PAID`.
- R08 RBAC, R09 SEO/CWV audit đầy đủ.
- Commit/deploy/migrate remote (tuân thủ quy tắc agent dự án).

---

## 11. Rollback

- Feature flag mềm: nếu Settings thiếu/ lỗi đọc → fail-closed (không đặt hàng) hoặc fallback ship 0 + chỉ COD **có log** — chốt trong implement theo hướng **fail-closed khi method không xác định được**, tránh thu sai tiền.
- Unpublish không áp dụng (Settings lưu trực tiếp); Owner sửa lại fee/method trên Admin là đủ.
- Đơn đã tạo giữ snapshot cũ khi Settings đổi sau đó.
