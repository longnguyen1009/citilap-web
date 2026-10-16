# Prompt Antigravity — R07C: Checkout Gọn + Shipping / Payment Settings

Bạn đang triển khai CitiLap CMS Admin và phần kết nối StoreFront. **Chỉ thực hiện R07C** sau khi R07B (Hot Sale + unified pricing) đã gate-pass. Không khởi động lại dự án hoặc chạy toàn bộ roadmap cùng lúc.

Tài liệu thiết kế bắt buộc: `docs/admin/R07C-CHECKOUT-SETTINGS.md`.  
Phạm vi master: `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md` — SET-02, SF-03.

**Bổ sung 2026-10-16:** Đọc `docs/admin/R07C-INTEGRATION-ADDENDUM.md` trước triển khai; addendum ưu tiên khi prompt/bản thiết kế cũ còn mâu thuẫn. Gate vào là review R07B.3, không chỉ báo cáo R07B.1/2. Tái dùng `src/server/services/checkout-shipping-policy.ts` và chạy `node --test scripts/test-r07c-shipping-policy.mjs`. Module thuần đã chuẩn bị riêng, chưa nối runtime. Quote server là bắt buộc; xác nhận tổng/ship, replay trước live settings validation, snapshot bank/showroom và fail-closed áp theo addendum. Không coi policy test là nghiệm thu R07C.

---

## 1. Đọc và bảo toàn công việc hiện có

Đọc theo thứ tự:
1. `AGENTS.md` và guide Next.js trong `node_modules/next/dist/docs/`.
2. `docs/admin/R07C-CHECKOUT-SETTINGS.md` (contract ship/method/snapshot).
3. `docs/admin/R07B-ACCEPTANCE.md` / `R07B-HOT-SALE-PRICING.md` (nếu có) — xác nhận `resolvePrice` / pricing service đã có và PASS.
4. `docs/admin/R06-ORDERS-CONTACTS-CUSTOMERS.md` — không mở lại state machine đơn.
5. Code hiện trạng:
   - `src/contracts/cms/settings.ts` — `shippingFee`, `freeShippingThreshold`, `codEnabled`, `bankTransferEnabled`, `bankAccountInfo`
   - `src/app/admin/settings/page.tsx` — tab Shipping (banner “chờ R08” cần sửa thành đã nối R07C)
   - `src/app/(shop)/checkout/page.tsx` — hardcode `paymentMethod: "COD"`
   - `src/app/(shop)/checkout/success/page.tsx`
   - `src/server/services/order.service.ts` — `shippingFee = 0` cố định; tạo đơn + idempotency
   - `src/app/api/orders/route.ts`
   - Pricing service R07B (đường dẫn do R07B bàn giao)

Kiểm tra HEAD/branch/status. Working tree có thể chứa thay đổi R03→R07B.  
**Tuyệt đối không** `reset` / `clean` / `stash` / ghi đè worktree / sửa `.dev.vars` / đụng process port **3001** / migrate remote/production.

Lập bảng delta trước khi code:
| Yêu cầu SET-02 / SF-03 | Code hiện có | R07B dependency | Phần thiếu R07C | Phase sau (R08) |

**Gate vào:** Nếu R07B chưa có pricing service dùng được cho `createOrder`, **dừng và báo** — không tự bịa công thức giá song song.

Chỉ làm R07C trong lượt này. Không tự commit / merge / push / deploy.

---

## 2. Mục tiêu R07C (phải đạt)

1. Checkout và `createOrder` đọc **cùng** Settings: phí ship, ngưỡng miễn, COD/CK bật-tắt, STK text.
2. Server tính `shippingFee` theo công thức trong `R07C-CHECKOUT-SETTINGS.md` §4.1 (pickup = 0; delivery + threshold).
3. Subtotal / line prices đi qua **pricing R07B** (`resolvePrice`), không đọc giá thô bỏ qua sale window.
4. Method bị tắt → UI không chọn được + API **400** `PAYMENT_METHOD_DISABLED`.
5. Chọn `BANK_TRANSFER` → hiện `bankAccountInfo`; `paymentStatus` vẫn `PENDING` (không tự PAID).
6. Success page hiển thị ship + method + hướng dẫn CK khi cần.
7. Idempotency hiện có vẫn PASS; đơn snapshot không bị Settings đổi sau đó làm sai.
8. Tài liệu nghiệm thu + cập nhật backlog/registry.

---

## 3. Phạm vi BẮT BUỘC / NGOÀI PHẠM VI

### Bắt buộc
- Wire Admin Settings tab Shipping → StoreFront (gỡ banner chờ R08; nói rõ đã nối R07C).
- Checkout UI: chọn `COD` | `BANK_TRANSFER` theo flags; quote/hiển thị ship & tổng từ server.
- `createOrder`: verify method allowlist; tính ship; dùng pricing R07B; ghi snapshot đúng field đã có.
- Khuyến nghị `POST /api/checkout/quote` (hoặc tương đương) — một hàm thuần dùng chung UI + create.
- Pickup showroom: ưu tiên hotline/địa chỉ từ `getStorefrontSettings()` (R07A).
- Tests: `scripts/test-r07c-checkout-settings.mjs` (+ smoke/browser tối thiểu, screenshots `docs/screenshots/r07c/`).
- Docs: `docs/admin/R07C-ACCEPTANCE.md`; cập nhật `R00-BACKLOG.md`, `CONTENT-SOURCE-REGISTRY.md`.

### Ngoài phạm vi (CẤM)
- **R08** RBAC / per-user roles.
- Cổng thanh toán online, IPN, QR động bank API, tự động PAID.
- Phí ship theo tỉnh/huyện/trọng lượng; coupon.
- Phá R06 state machine; phá R07A builder; viết lại pricing R07B.
- Commit/merge/deploy; migrate DB remote; đụng `.dev.vars` / port 3001.

---

## 4. Thiết kế triển khai (bám R07C-CHECKOUT-SETTINGS.md)

### 4.1. Hàm tính ship (single source)
```ts
computeShippingFee(input: {
  shippingMethod: 'standard' | 'pickup'
  subtotal: number
  shippingFee: number
  freeShippingThreshold: number
}): number
```
Đặt trong service dùng chung (ví dụ `checkout.service.ts` hoặc mở rộng order/pricing) — **cấm** copy công thức vào client làm nguồn chân lý.

### 4.2. createOrder changes
1. Load public settings từ D1.
2. Với mỗi line: `resolvePrice` (R07B) → `priceSnapshot` / campaign snapshot nếu có.
3. Tính subtotal → shippingFee → total.
4. Validate `paymentMethod` ∈ allowed.
5. Persist như hiện tại (batch D1, idempotency, confirmation token, AdminNotification R06).

Giá client (nếu gửi kèm): so khớp `effectivePrice`; lệch → **không** tạo đơn (409/422 rõ). Nếu client chưa gửi giá, server chỉ dùng giá resolve (an toàn hơn).

### 4.3. Checkout UI
- Form giữ gọn: tên, SĐT, email optional, địa chỉ hoặc showroom, ghi chú.
- Block tóm tắt: dòng hàng, tạm tính, phí ship (hoặc “Miễn phí”), tổng.
- Method radios theo flags; khi CK → box `bankAccountInfo` (whitespace-pre-wrap).
- Submit giữ `Idempotency-Key` một lần / attempt như hiện tại.

### 4.4. Fail-closed
- Không đọc được settings hoặc không còn method nào bật → chặn đặt hàng với message rõ, không âm thầm COD + ship 0.

---

## 5. Gate kiểm thử (bắt buộc trước khi báo xong)

### Tầng A — Static
- `npx tsc --noEmit` → 0 lỗi
- ESLint file đụng → 0 error
- `npm run build:cloudflare` → Exit 0 (hoặc ghi rõ lý do skip)

### Tầng B — Integration (Miniflare D1 riêng)
`scripts/test-r07c-checkout-settings.mjs` tối thiểu:
1. Delivery subtotal < threshold → `shippingFee === settings.shippingFee`.
2. Delivery subtotal ≥ threshold (>0) → ship 0.
3. Pickup → ship 0 dù subtotal nhỏ.
4. `codEnabled=false` + payment COD → 400.
5. `bankTransferEnabled=false` + BANK_TRANSFER → 400.
6. Cả hai tắt → create bị từ chối.
7. Idempotent replay cùng payload → cùng orderId; đổi method trên cùng key → mismatch.
8. Line price đi qua pricing R07B (sale window on/off) — không regress R07B.
9. Đổi Settings ship sau khi tạo đơn → đơn cũ giữ snapshot cũ.

### Tầng C — Smoke / Browser
- `/checkout` hiện ship & method đúng Settings.
- Chọn CK thấy STK; success page mirror.
- 1440 + 390; không đụng port 3001 (harness cô lập hoặc BASE_URL riêng).

### Tầng D — Regression
- R06 order admin list/detail vẫn đọc `shippingFee` / `paymentMethod`.
- R07A branding settings không gãy.

---

## 6. Bàn giao và điểm dừng

1. `docs/admin/R07C-ACCEPTANCE.md` — PASS x/y, file đụng, screenshot, hạn chế.
2. Cập nhật `R00-BACKLOG.md` (CMS-R07C HOÀN THÀNH), `CONTENT-SOURCE-REGISTRY.md` (SET-02/SF-03 consumers).
3. Gỡ/sửa Info banner Settings Shipping.
4. Báo cáo tiếng Việt + đề xuất prompt **R08** (RBAC).

**Chỉ đóng R07C** khi: Settings → checkout/order nhất quán, method tắt bị chặn, ship đúng công thức, pricing R07B được dùng, idempotency còn, gate PASS.

**Dừng ngay sau R07C.** Không tự sang R08.

Không tự commit, merge, deploy hoặc áp migration remote. Giữ process 3001 và dữ liệu thật của chủ shop.
