# Báo Cáo Triển Khai R06 — Đơn Hàng Đơn Giản, Liên Hệ/Khách Hàng Và Thông Báo Admin

**Dự án:** CitiLap Web (`citilap-web2`)  
**Phiên bản phát hành:** R06 — Order Processing, In-Admin Notifications, Contact Triage, Customer Aggregation & Secure CSV Exports  
**Kế thừa:** R01–R05 (Bảo toàn 100% catalog, CMS, media library và navigation; không viết lại hệ thống nội dung).  
**Môi trường thử nghiệm:** Cloudflare D1 / Miniflare isolated test DB, Microsoft Edge Playwright browser headless.  
**Ngày hoàn thành:** 14/10/2026.

---

## 1. Baseline & Phạm Vi Nghiệp Vụ

### 1.1. Bảng Khảo Sát Hiện Trạng & Khoảng Thiếu Trước Khi Triển Khai

| Chức năng | Đã có (R01–R05) | Nguồn dữ liệu | Khoảng thiếu | File/API tác động |
| :--- | :--- | :--- | :--- | :--- |
| **Đơn hàng (Orders)** | Model `Order`, `OrderItem`. Checkout API tính giá server. Trang tra cứu public. | SQLite / D1 table `Order`, `OrderItem` | Chưa có state machine xử lý vận hành (`NEW` -> `CONTACTED` -> `CONFIRMED` -> `COMPLETED`); thiếu timeline sự kiện (`OrderEvent`), ghi chú nội bộ nhân viên (`OrderNote`), kiểm soát tranh chấp phiên (`revision`/CAS 409). | `src/server/services/order.service.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/app/api/orders/[id]/notes/route.ts`, `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[id]/page.tsx` |
| **Thông báo (Notifications)** | Chưa có hệ thống thông báo admin. | Không có | Chưa có model `AdminNotification`, chuông thông báo (Bell Badge) trên Admin Topbar, popover danh sách, đánh dấu đã đọc, chống lặp đơn hàng/liên hệ mới. | `src/server/services/notification.service.ts`, `src/components/admin/notifications/AdminNotificationBell.tsx`, `src/app/admin/layout.tsx`, `src/app/api/admin/notifications/route.ts`, `[id]/read/route.ts`, `read-all/route.ts` |
| **Liên hệ (Contacts)** | Model `ContactSubmission`, API gửi form storefront. | SQLite / D1 table `ContactSubmission` | Thiếu trạng thái `PROCESSING`, thiếu ghi chú nội bộ, thiếu audit người xử lý (`handledBy`, `handledAt`), UI admin chỉ có toggle nhị phân đơn giản. | `src/server/services/contact.service.ts`, `src/app/admin/contacts/page.tsx`, `src/app/api/admin/contacts/route.ts`, `[id]/route.ts` |
| **Khách hàng (Customers)** | Trang admin đọc từ mock array `mockUsers`. | Dữ liệu tĩnh giả lập trong source | Chưa kết nối D1 thật; chưa tách bạch tài khoản đăng ký (`User`) với khách đặt hàng vãng lai (`guest`); chưa có thống kê số đơn và chi tiêu tích lũy thật. | `src/server/services/customer.service.ts`, `src/app/admin/customers/page.tsx`, `src/app/api/customers/route.ts` |
| **Xuất dữ liệu (CSV Export)** | Chưa có tính năng export an toàn. | Không có | Thiếu API stream CSV có auth `requireAdmin`, thiếu UTF-8 BOM tiếng Việt, thiếu phòng chống CWE-1236 Formula Injection (`=`, `+`, `-`, `@`), chưa hỗ trợ xuất toàn bộ trang theo filter. | `src/lib/csv-export.ts`, `src/app/api/admin/orders/export/route.ts`, `src/app/api/admin/contacts/export/route.ts`, `src/app/api/admin/customers/export/route.ts` |

### 1.2. Giới Hạn Phạm Vi R06 (Explicit Exclusions)
- **Không triển khai:** Kho/serial/IMEI, kế toán thu chi công nợ, cổng thanh toán tự động (VNPay/Momo), đơn vị vận chuyển (GHN/GHTK), coupon/voucher/hot sale engine, email/SMS/Zalo thông báo ra ngoài, CRM automation / marketing deduplication.
- **Quy ước pháp lý & vận hành:** Trạng thái **"Hoàn tất" (`COMPLETED`)** đại diện cho **"Hoàn tất xử lý yêu cầu mua hàng"**, tuyệt đối không tự động xác nhận đã thanh toán tiền hoặc đã giao hàng vật lý.

---

## 2. Ma Trận Chuyển Đổi Trạng Thái Đơn Hàng (State Transition Matrix)

### 2.1. Bảng Chuyển Đổi Phía Server (`order.service.ts`)

| Trạng thái nguồn | Trạng thái đích | Quyền hạn | Lý do bắt buộc | Được phép mở lại? | Mô tả vận hành & Quy tắc ràng buộc |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **NEW (Mới)** | `CONTACTED` | `ADMIN` | Không | Không | Nhân viên đã liên hệ điện thoại/zalo với khách để tư vấn cấu hình và xác nhận nhu cầu. |
| **NEW (Mới)** | `CONFIRMED` | `ADMIN` | Không | Không | Cho phép xác nhận trực tiếp khi khách xác nhận rõ ràng ngay từ bước đặt hoặc qua hotline. |
| **NEW (Mới)** | `CANCELLED` | `ADMIN` | **CÓ** (Tối thiểu 3 ký tự) | CÓ (Mở lại về `NEW`) | Khách đổi ý, đặt nhầm hoặc không liên lạc được. Bắt buộc nhập lý do hủy. |
| **CONTACTED** | `CONFIRMED` | `ADMIN` | Không | Không | Khách chốt cấu hình máy, thời gian và địa chỉ giao hàng. |
| **CONTACTED** | `CANCELLED` | `ADMIN` | **CÓ** (Tối thiểu 3 ký tự) | CÓ (Mở lại về `NEW`) | Khách từ chối mua sau khi tư vấn. Bắt buộc nhập lý do hủy. |
| **CONFIRMED** | `COMPLETED` | `ADMIN` | Không | Không | Hoàn tất xử lý yêu cầu đặt hàng. Đây là trạng thái kết thúc nghiệp vụ xử lý tại R06. |
| **CONFIRMED** | `CANCELLED` | `ADMIN` | **CÓ** (Tối thiểu 3 ký tự) | CÓ (Mở lại về `NEW`) | Đơn đã chốt nhưng phát sinh sự cố hủy trước khi thực hiện. Bắt buộc nhập lý do. |
| **CANCELLED** | `NEW` | `ADMIN` | **CÓ** (Tối thiểu 3 ký tự) | N/A | **Mở lại đơn hàng**: Đưa đơn về trạng thái Mới (`NEW`) để tiếp nhận lại. Bắt buộc nhập lý do mở lại. |
| **COMPLETED** | *(Bất kỳ)* | N/A | N/A | **KHÔNG** | Trạng thái kết thúc; server từ chối mọi yêu cầu chuyển đổi tiếp theo (`INVALID_TRANSITION`). |
| *(Trạng thái bất kỳ)* | *(Cùng trạng thái)*| N/A | N/A | N/A | Bị chặn là `SAME_STATUS_NOOP` (HTTP 400), không sinh event giả mạo trong lịch sử. |

### 2.2. Kiểm Soát Tranh Chấp Concurrency (CAS / HTTP 409)
Mỗi bản ghi `Order` mang một số nguyên `revision` tự tăng (bắt đầu từ `0` theo schema chuẩn, kiểm tra số nguyên không âm `expectedRevision >= 0`). Tương tự, `ContactSubmission` mang `revision` (bắt đầu từ `1`).
1. Client gửi mutation chuyển trạng thái hoặc ghi chú với trường `expectedRevision`.
2. Server thực thi CAS trực tiếp tại câu lệnh DB UPDATE (`WHERE id = ? AND revision = ?`) để loại bỏ hoàn toàn race condition trong môi trường serverless/D1.
3. Nếu không có dòng nào được cập nhật (`changes === 0`): Server quăng lỗi `OrderConflictError` hoặc `ContactConflictError`, trả HTTP `409 Conflict` kèm `{ currentRevision }`.
4. Nếu lệnh ghi sự kiện `OrderEvent` thất bại sau khi update: Server kích hoạt compensating rollback để khôi phục lại trạng thái và revision cũ, ngăn chặn triệt để hiện tượng phantom event.
5. Giao diện Admin hiển thị banner xung đột màu vàng cam (`#concurrency-conflict-banner` hoặc modal xung đột), **bảo toàn nguyên vẹn nội dung ghi chú nhân viên đang soạn thảo**, đồng thời cung cấp nút *"Tải lại dữ liệu mới nhất"* để đồng bộ.

---

## 3. Chuyển Đổi Dữ Liệu Cũ (Legacy Migration) & Lược Đồ D1

### 3.1. Bảng Ánh Xạ Mã Trạng Thái Cũ
Toàn bộ đơn hàng trong hệ thống được chuẩn hóa về bộ mã tiếng Anh quy chuẩn:
- `PENDING` / `"Chờ xác nhận"` $\rightarrow$ `NEW` (Mới). Tuyệt đối không suy diễn sang `CONTACTED` hoặc `CONFIRMED`.
- `COMPLETED` / `"Đã hoàn thành"` $\rightarrow$ `COMPLETED` (Hoàn tất).
- `CANCELLED` / `"Đã hủy"` $\rightarrow$ `CANCELLED` (Đã hủy).
- Các trường `id`, `orderNumber`, `createdAt`, `completedAt`, `items`, `priceSnapshot`, `productNameSnapshot` được bảo tồn nguyên vẹn 100%.

### 3.2. Migration `d1-migrations/0015_order_management.sql`
```sql
-- 1. Bổ sung revision cho Order
ALTER TABLE "Order" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- 2. Chuẩn hóa trạng thái legacy
UPDATE "Order" SET "status" = 'NEW' WHERE "status" IN ('PENDING', 'Chờ xác nhận');
UPDATE "Order" SET "status" = 'COMPLETED' WHERE "status" IN ('COMPLETED', 'Đã hoàn thành');
UPDATE "Order" SET "status" = 'CANCELLED' WHERE "status" IN ('CANCELLED', 'Đã hủy');

-- 3. Bảng sự kiện lịch sử (Append-only Timeline)
CREATE TABLE IF NOT EXISTS "OrderEvent" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "reason" TEXT,
  "note" TEXT,
  "actor" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_order_event_order" ON "OrderEvent"("orderId");

-- 4. Bảng ghi chú nội bộ nhân viên
CREATE TABLE IF NOT EXISTS "OrderNote" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_order_note_order" ON "OrderNote"("orderId");

-- 5. Bảng thông báo vận hành Admin
CREATE TABLE IF NOT EXISTS "AdminNotification" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "referenceId" TEXT,
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT 0,
  "readAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_admin_notification_unique_ref" ON "AdminNotification"("type", "referenceId");

-- 6. Mở rộng ContactSubmission & Migration 0016
-- d1-migrations/0016_contact_management_and_order_cas.sql:
ALTER TABLE "ContactSubmission" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ContactSubmission" ADD COLUMN "startedProcessingAt" DATETIME;
CREATE TABLE IF NOT EXISTS "ContactEvent" (
  "id" TEXT PRIMARY KEY,
  "contactId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "note" TEXT,
  "actor" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("contactId") REFERENCES "ContactSubmission"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_contact_event_contact" ON "ContactEvent"("contactId");
```

### 3.3. Kế Hoạch Rollback Không Xóa Dữ Liệu
Trong trường hợp cần hoàn nguyên code R06 về R05, dữ liệu đơn hàng và khách hàng hoàn toàn không bị mất mát:
```sql
-- Dữ liệu Order giữ nguyên; các bảng OrderEvent, OrderNote, AdminNotification không ảnh hưởng đến schema cũ.
UPDATE "Order" SET "status" = 'PENDING' WHERE "status" = 'NEW';
-- Drop bảng bổ sung nếu cần giải phóng bộ nhớ test:
-- DROP TABLE IF EXISTS "ContactEvent";
-- DROP TABLE IF EXISTS "AdminNotification";
-- DROP TABLE IF EXISTS "OrderNote";
-- DROP TABLE IF EXISTS "OrderEvent";
```

---

## 4. Danh Tính, Bảo Mật, Ngữ Nghĩa Vận Hành & Khách Hàng

### 4.1. Zero-Trust Server Actor & Ngữ Nghĩa Hộp Thư Vận Hành Chung
- **Server-Determined Actor:** Không bao giờ tin tưởng client body gửi `actor`. Server gán nhãn cứng `SHARED_ADMIN_ACTOR = 'Admin vận hành (Phiên dùng chung)'` và `SHARED_CONTACT_ACTOR = 'Admin vận hành (Phiên dùng chung)'` cho mọi thao tác chuyển trạng thái, ghi chú và xử lý liên hệ.
- **Hộp thư vận hành chung (Team Operational Inbox):** Quản trị viên sử dụng cookie session HMAC (`admin_session`). Cờ `isRead` của thông báo là trạng thái dùng chung của ca trực.
- **Thông báo tin cậy & Đối soát (Reconciliation):** Đơn hàng mới và liên hệ mới kích hoạt tạo thông báo với cơ chế retry tối đa 2 lần khi gặp lỗi tạm thời. Định kỳ đối soát các đơn trong 24h gần nhất (`ON CONFLICT("type", "referenceId") DO NOTHING`) để không bỏ sót thông báo và tuyệt đối không reset cờ `isRead` của các thông báo đã đọc.
- **R08 RBAC Gate:** Phân quyền theo từng tài khoản nhân viên riêng biệt (`per-user read isolation`) được thiết lập gate rõ ràng sang **R08 (RBAC & Multi-user Staff Identity)**.

### 4.2. Dữ Liệu Khách Hàng Trung Thực (Truthful Customer Identity & Metrics)
- **Không tự ý gộp danh tính (No Auto-Merging):** Khách hàng có tài khoản đăng ký được định danh theo `userId`. Đơn hàng của khách vãng lai (guest) được định danh độc lập theo từng đơn (`guest-${order.id}`). Tuyệt đối không tự động gom các đơn khách vãng lai trùng số điện thoại thành một hồ sơ duy nhất để tránh gộp nhầm thông tin cá nhân.
- **Gợi ý chưa xác thực (Unverified Suggestions):** Trong chi tiết khách hàng (`getCustomerDetail`), các đơn hàng hoặc liên hệ khác có cùng số điện thoại chỉ được hiển thị dưới dạng gợi ý liên quan (`suggestedOrders`, `suggestedContacts`) để nhân viên vận hành tham khảo, không làm biến dạng dữ liệu gốc.
- **Chỉ số trung thực:** Nhãn thống kê được chuẩn hóa thành **"Tổng giá trị đơn không hủy"** (tính trên các đơn có `status != 'CANCELLED'`). Phân trang khách hàng hoạt động không giới hạn (vượt mốc 500 bản ghi qua kỹ thuật cursor/offset).

### 4.3. Ranh Giới DTO Công Khai (Public) vs Nội Bộ (Internal)
Để bảo vệ quyền riêng tư và an toàn thông tin nghiệp vụ:
1. **Public Order API & Order Tracking:** Sử dụng hàm lọc nghiêm ngặt `sanitizeOrderForPublic()`. Tuyệt đối **KHÔNG** trả về:
   - `internalNotes` (Ghi chú nội bộ của nhân viên).
   - `events` (Dòng thời gian sự kiện xử lý nội bộ).
   - `revision` (Số phiên bản concurrency nội bộ).
   - `confirmationTokenHash` (Hash token xác thực).
2. **Admin API:** Yêu cầu middleware `requireAdmin()` xác thực session hợp lệ trước khi cho phép đọc thông tin chi tiết hoặc ghi chú.

---

## 5. An Toàn Dữ Liệu & Xuất File (CSV Export)

Hệ thống export phục vụ Đơn hàng, Liên hệ và Khách hàng tuân thủ nghiêm ngặt các tiêu chuẩn bảo mật dữ liệu khách hàng:
1. **Chống Formula Injection (CWE-1236):** Bất kỳ trường dữ liệu nào bắt đầu bằng các ký tự nguy hiểm (`=`, `+`, `-`, `@`, tab `\t`, CR `\r`) đều tự động được bao bọc tiền tố dấu nháy đơn (`'`) qua module `src/lib/csv-export.ts`.
2. **Single-Escaping Chuẩn Mực:** Khắc phục triệt để lỗi double-escaping (trước đây route handler gọi `escapeCsvField` rồi `buildCsvContent` lại escape thêm lần nữa dẫn tới `"""`). Dữ liệu được đưa dạng thô vào `buildCsvContent` và chỉ escape duy nhất 1 lần theo chuẩn RFC 4180.
3. **Tương thích Tiếng Việt hoàn hảo:** Tự động chèn Byte Order Mark UTF-8 (`\ufeff`) ở đầu stream dữ liệu để Microsoft Excel và Apple Numbers hiển thị đúng dấu tiếng Việt mà không bị vỡ font.
4. **Xuất Không Bị Kẹp Giới Hạn (Chunked Streaming):** Loại bỏ hoàn toàn các mốc chặn cứng (100 hoặc 5000 dòng). Các hàm `getAllOrdersForExport`, `getAllContactsForExport`, `getAllCustomersForExport` tải dữ liệu theo từng chunk (mỗi chunk 200 bản ghi) cho tới khi vét hết toàn bộ tập dữ liệu thỏa mãn bộ lọc.
5. **Bảo mật PII & Headers:**
   - Headers: `Cache-Control: private, no-store, max-age=0`.
   - Tuyệt đối không xuất mật khẩu, token, session hay mã bí mật.
   - Không ghi toàn văn nội dung dữ liệu cá nhân (PII) của khách vào server log.

---

## 6. Kết Quả Kiểm Thử Đa Tầng (Layered Verification)

```
========================================================================================
TẦNG KIỂM THỬ                         PHẠM VI                             KẾT QUẢ
========================================================================================
1. Tầng A: Tĩnh & Biên dịch            TypeScript Compiler (tsc --noEmit)   PASS (0 errors)
                                       ESLint toàn bộ các file sửa/thêm     PASS (0 errors, 0 warnings)
                                       Cloudflare Production Build (Vite)   PASS (Build succeeded)
----------------------------------------------------------------------------------------
2. Tầng B: Dịch vụ & DB biệt lập       test-r06-order-management.mjs       PASS (30/30 tests)
                                       - State machine transitions (6/6)
                                       - Invalid transitions & Reopen (5/5)
                                       - Same-status NOOP rejection (1/1)
                                       - Concurrency CAS 409 (2/2)
                                       - Internal staff notes (2/2)
                                       - Public DTO privacy sanitize (2/2)
                                       - Admin Notifications (4/4)
                                       - Contacts triage & HTML sanitize (3/3)
                                       - Customers D1 aggregation (3/3)
                                       - CSV Export Safe (2/2)
                                       -------------------------------------------------
                                       test-r06-1-integrity.mjs            PASS (18/18 tests)
                                       - Order CAS at DB write point (3/3)
                                       - Server-determined actor zero-trust(2/2)
                                       - Contacts CAS & timeline (4/4)
                                       - Customer truthful data & >500 pag (5/5)
                                       - CSV export chunking & single-esc  (2/2)
                                       - Notification retry & reconcile    (2/2)
                                       TOTAL TẦNG B                         PASS (48/48 - 100%)
----------------------------------------------------------------------------------------
3. Tầng D: Component Harness (Browser) Real Edge Headless Browser UI QA    PASS (9/9 Flows - 100%)
   (Ghi chú phân loại: Chạy trên       Flow 1: Đặt đơn qua Storefront API   PASS
    React components thực tế với mock  Flow 2: Đơn xuất hiện, Bell Badge=1  PASS
    HTTP backend server nội bộ; chưa   Flow 3: Dropdown & "Đã đọc hết"      PASS
    phải Tầng E Full-app production)   Flow 4: Transition NEW->CONTACTED    PASS
                                                Transition -> CONFIRMED     PASS
                                       Flow 5: Soạn & lưu ghi chú nội bộ    PASS
                                       Flow 6: Kích hoạt CAS 409 & Phục hồi PASS
                                                Transition -> COMPLETED     PASS
                                       Flow 7: Tiếp nhận & xử lý Liên hệ    PASS
                                       Flow 8: Trang Khách hàng D1 tổng hợp PASS
                                       Flow 9: Giao diện Mobile 390px       PASS
========================================================================================
```

---

## 7. Bằng Chứng Thực Tế (Browser Screenshots)

Toàn bộ ảnh chụp màn hình được sinh tự động bởi Microsoft Edge thật (Playwright headless) trên môi trường kiểm thử biệt lập:

| STT | Ảnh bằng chứng | Mô tả chi tiết |
| :---: | :--- | :--- |
| 1 | `docs/screenshots/r06/01_orders_list_and_badge.png` | Danh sách đơn hàng Admin, bộ lọc ngày/trạng thái và chuông thông báo (Bell Badge hiển thị số 1). |
| 2 | `docs/screenshots/r06/02_notifications_dropdown.png` | Popover danh sách thông báo đơn hàng mới, nút "Đã đọc hết" với ngữ nghĩa hộp thư chung. |
| 3 | `docs/screenshots/r06/03_order_detail_initial_new.png` | Chi tiết đơn hàng ở trạng thái `NEW` (Mới), các nút transition hợp lệ ("Đã liên hệ", "Xác nhận đơn", "Hủy đơn"). |
| 4 | `docs/screenshots/r06/04_order_detail_confirmed.png` | Chi tiết đơn hàng sau khi chuyển trạng thái sang `CONFIRMED` (Đã xác nhận), timeline ghi nhận lịch sử. |
| 5 | `docs/screenshots/r06/05_internal_note_added.png` | Nhân viên lưu ghi chú nội bộ về cấu hình máy; ghi chú hiển thị tức thì trên danh sách nội bộ. |
| 6 | `docs/screenshots/r06/06_concurrency_conflict_409.png` | **Banner xung đột phiên 409 Conflict** khi có mutation nền song song; giữ nguyên ghi chú đang soạn. |
| 7 | `docs/screenshots/r07_order_completed.png` | Đơn hàng hoàn tất xử lý (`COMPLETED`), hiển thị huy hiệu xanh lá "Hoàn tất xử lý yêu cầu". |
| 8 | `docs/screenshots/r06/08_contacts_page.png` | Quản lý liên hệ/tư vấn: Danh sách liên hệ mới, nút chuyển trạng thái "Đang liên hệ", ghi chú nội bộ. |
| 9 | `docs/screenshots/r06/09_customers_page.png` | Danh sách khách hàng tổng hợp từ D1, phân biệt rõ khách đăng ký (`REGISTERED`) và khách đặt hàng vãng lai (`GUEST_ORDER`). |
| 10 | `docs/screenshots/r06/10_mobile_orders_390px.png` | Giao diện quản lý đơn hàng trên màn hình di động 390px (iPhone viewport), co giãn mượt mà, đầy đủ chức năng. |

---

## 8. Cổng Còn Thiếu & Bàn Giao Kế Tiếp (Open Gates)

| Mã Cổng | Tên cổng | Hiện trạng | Kế hoạch giải quyết |
| :--- | :--- | :---: | :--- |
| **G-R06-1** | Per-user Staff RBAC & Individual Unread State | ĐANG MỞ (By Design) | Chuyển tiếp sang **R08**. R06 duy trì đúng ngữ nghĩa "Hộp thư vận hành chung (Đã đọc chung)". |
| **G-R06-2** | Full Website Settings Sync (Footer/Contact) | ĐANG MỞ | Đã phân bổ vào kế hoạch **R07A (Site Settings Synchronization)** theo đúng roadmap. |
| **G-R06-3** | Browser Real High-DPI Engine Zoom | SKIP | Giữ nguyên trạng thái SKIP theo quy chuẩn R05/R05.1; không coi CSS zoom là tương đương. |
| **G-R06-4** | Kho/Serial, Cổng thanh toán & Giao vận | NGOÀI PHẠM VI | Giữ nguyên phạm vi "Đơn hàng đơn giản". Không triển khai trước khi có module kho chuyên dụng. |

---

## 9. Đề Xuất Phạm Vi Cho R07A

Sau khi đóng R06 hoàn tất và được nghiệm thu, phạm vi khuyến nghị cho gói công việc tiếp theo (**R07A**):
1. **Đồng bộ hóa SiteSettings toàn diện:** Đấu nối `SiteSettings` từ D1 vào toàn bộ Footer, Header, trang Liên hệ, trang Giới thiệu và chính sách của website thay thế cho `businessProfile` tĩnh.
2. **Quản lý Cấu hình Hệ thống (System Configuration):** Bổ sung giao diện chỉnh sửa thông tin doanh nghiệp, hotline, email hỗ trợ, mã số thuế, địa chỉ showroom trực tiếp từ trang Admin Settings.
3. **SEO Meta & OpenGraph Đồng Bộ:** Kế thừa cấu hình thương hiệu để tự động sinh Canonical URL, OpenGraph Image và JSON-LD Organization schema chuẩn mực.
