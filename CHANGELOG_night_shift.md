# CHANGELOG — Night Shift 🌙

> Ca làm việc tự trị qua đêm (2026-08-24 → 2026-08-25).
> Toàn bộ thay đổi được thực hiện tự động theo ủy quyền của bạn.
> Kết quả cuối: `tsc` ✅ — `npm run build` ✅ — 18 trang + 5 API endpoint đều trả HTTP 200 ✅

---

## 1. Thiết kế lại nút "Danh mục" + menu xổ xuống

**File:** `src/components/layout/Header.tsx`

**Tại sao:** Giao diện cũ đơn giản, chỉ là dropdown text thuần, không có icon, không có mega menu.

**Đã làm:**
- Nút "Danh mục" gradient xanh, icon `LayoutGrid`, badge chevron xoay 180° khi mở.
- Đổi từ hover sang **click** để mở/đóng menu (theo yêu cầu của bạn).
- Đóng menu khi click ra ngoài (`mousedown` listener) và khi cuộn trang (`scroll` listener).
- Menu cấp 1 gồm 10 danh mục, mỗi danh mục có icon riêng (map qua `categoryIcons`).
- Hover vào item cấp 1 → xổ mega menu cấp 2 bên phải, căn ngang item (`top-0`), có "cầu nối" hover vô hình (`w-4`) để di chuột chậm không bị mất menu.
- Mega menu thu gọn tối giản: tiêu đề xanh, lưới 2 cột các link thương hiệu/dòng máy, nút "Xem tất cả".
- Thanh nav bar (Laptop Gaming, Laptop Văn Phòng...) cũng có dropdown dữ liệu tương tự.

**Kết quả:** Menu hoạt động mượt, đúng yêu cầu click-to-open, mega menu không bị mất khi di chuột.

---

## 2. Sửa lỗi icon lucide-react

**File:** `src/components/layout/Header.tsx`

**Tại sao:** Icon `Desktop` không tồn tại trong lucide-react → gây lỗi runtime (bạn báo qua screenshot).

**Đã làm:** Thay `Desktop` bằng `HardDrive`.

**Kết quả:** Hết lỗi, icon hiển thị bình thường.

---

## 3. Routing danh mục + dữ liệu mẫu theo URL

**File:** `src/app/(shop)/category/[slug]/page.tsx`

**Tại sao:** Click vào phân loại cần đi tới đúng URL có query params (vd: `/category/laptop-do-hoa?brand=dell&series=precision`) và trang phải render đúng dữ liệu tương ứng.

**Đã làm:**
- Đọc `searchParams`: `brand`, `series`, `sub`.
- Thêm map `brandNames` / `seriesNames` (slug → tên hiển thị).
- Ghép `displayTitle` từ danh mục + hãng + dòng máy, dùng cho breadcrumb và `<h1>`.
- Thêm helper `generateProducts(baseName, count)` tạo sản phẩm mẫu khi có filter; không có filter thì dùng danh sách cứng.

**Kết quả:** Mỗi link trong mega menu trỏ đúng trang, trang hiển thị tiêu đề + sản phẩm khớp bộ lọc.

---

## 4. API không còn 500 khi chưa có database

**File:** `src/lib/mock-data.ts` (mới) + 8 route API:
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[id]/route.ts`
- `src/app/api/customers/route.ts`
- `src/app/api/dashboard/route.ts`

**Tại sao:** `DATABASE_URL` chưa cấu hình → mọi API đều crash 500, trang admin không tải được dữ liệu.

**Đã làm:**
- Tạo `mock-data.ts` chứa `mockCategories` (10), `mockProducts` (8), `mockOrders` (3), `mockUsers` (3).
- Mỗi route thêm guard `const hasDatabase = !!process.env.DATABASE_URL`:
  - `GET` → trả mock data khi chưa có DB.
  - Mutation (`POST/PATCH/PUT/DELETE`) → trả 503 "Database not configured" thay vì crash.
  - Có DB → `await import('@/lib/prisma')` và chạy query thật.

**Kết quả:** Tất cả endpoint trả 200; trang admin hiển thị dữ liệu mẫu; khi nào cấu hình DB thật thì tự chuyển sang Prisma.

---

## 5. Metadata trang gốc

**File:** `src/app/layout.tsx`

**Tại sao:** Title/description vẫn là mặc định "Create Next App".

**Đã làm:** Đổi thành `CITILAP.VN - Một chữ tín - Vạn niềm tin`, thêm description + keywords tiếng Việt.

**Kết quả:** SEO/tab trình duyệt hiển thị đúng thương hiệu.

---

## 6. Sửa `params`/`searchParams` chưa await (Next.js 16 async dynamic APIs)

**File:**
- `src/app/(shop)/category/[slug]/page.tsx`
- `src/app/(shop)/product/[id]/page.tsx`
- `src/app/(shop)/chinh-sach/[slug]/page.tsx`

**Tại sao:** Log dev server báo WARN lặp lại liên tục:
> `Route "/category/[slug]" used params.slug. params is a Promise and must be unwrapped with await or React.use()`

Next.js 16 yêu cầu `params` và `searchParams` là Promise — truy cập đồng bộ sẽ bị deprecate và có thể gây lỗi ở các bản sau.

**Đã làm:**
- Đổi signature thành `params: Promise<{...}>`, `searchParams: Promise<{...}>` và `await` trước khi dùng.
- `chinh-sach/[slug]` cũng được sửa tương tự (phát hiện khi quét toàn bộ route động).
- Các trang admin (`admin/orders/[id]`, `admin/products/[id]`) đã dùng `React.use()` đúng chuẩn từ trước — không cần sửa.

**Kết quả:** Hết WARN trong log; `tsc` ✅, `npm run build` ✅, các trang vẫn trả 200.

---

## 8. Fix lint: `no-explicit-any` + `require()` import

**Files:**
- `src/components/product/ProductCard.tsx` — `product: any` → proper `ProductCardProduct` type
- `src/app/(shop)/page.tsx` — `icon: any` → `icon: LucideIcon` + thêm import type
- `test-prisma.ts` — `require()` → `await import()`, bỏ import không dùng `createClient`

**Kết quả:** 0 lint errors, `tsc` ✅, build ✅

---

## 9. Fix lint: `react-hooks/set-state-in-effect`

**Files:**
- `src/context/CartContext.tsx` — thêm eslint-disable comment có lý do (localStorage hydration-safe)
- `src/app/admin/dashboard/page.tsx` — tương tự
- `src/app/admin/settings/page.tsx` — tương tự

**Lưu ý:** Lazy initializer pattern (useState + localStorage ngay trong init) sẽ gây hydration mismatch giữa server/client, nên giữ nguyên useEffect + suppress lint với lý do cụ thể.

**Kết quả:** 0 lint errors, build ✅

---

## 10. Fix `Math.random()` trong render (deterministic pricing)

**File:** `src/app/(shop)/category/[slug]/page.tsx`

**Tại sao:** `generateProducts()` dùng `Math.random()` cho giá/giảm giá → giá thay đổi mỗi lần refresh, không nhất quán và có thể gây vấn đề khi caching.

**Đã làm:** Thay `Math.random()` bằng công thức Deterministic dựa trên index `i` (`i % 5`, `(i * 5) % 15`).

**Kết quả:** Giá ổn định trên mỗi refresh.

---

## 11. Dọn dẹp 27 unused imports/vars (lint warnings)

**Files:**
- `src/app/(shop)/category/[slug]/page.tsx` — bỏ `SlidersHorizontal`
- `src/app/(shop)/checkout/page.tsx` — bỏ `ChevronRight`, `Truck`
- `src/app/(shop)/hot-sale/page.tsx` — bỏ `Link`, `ChevronRight`
- `src/app/(shop)/page.tsx` — bỏ `Cpu`, `Monitor`, `Star`, `CheckCircle`
- `src/app/(shop)/product/[id]/page.tsx` — bỏ 10 icon không dùng, giữ `Star` (đang dùng)
- `src/components/layout/Header.tsx` — bỏ `Star`
- `src/app/api/categories/route.ts` — bỏ param `_request` không dùng
- `src/app/api/products/route.ts` — dùng `brand`/`series` để filter (trước đó khai báo nhưng bỏ quên)
- `prisma/seed.ts` — bỏ 4 biến `prod2`, `prod3`, `admin`, `order1` không dùng

**Kết quả:** 0 lint errors, 0 unused-var warnings. Còn 20 warnings `<img>` vs `next/image` (không ảnh hưởng chức năng, cần refactor lớn hơn để chuyển đổi).

---

## 12. Rà soát toàn bộ components/pages (không cần sửa)

Đã đọc và kiểm tra, tất cả đều sạch, không phát hiện vấn đề:
- `ProductCard.tsx`, `ProductPriceOptions.tsx`, `Footer.tsx`, `CartIcon.tsx`, `ScrollToTop.tsx`
- `src/context/CartContext.tsx`
- `src/app/admin/layout.tsx`, `admin/dashboard`, `admin/products`, `admin/orders`, `admin/customers`
- `(shop)/page.tsx`, `product/[id]`, `cart`, `login`, `checkout`, `hot-sale`, `news`, `contact`, `order-tracking`, `profile`

---

## Kiểm tra cuối ca

| Hạng mục | Kết quả |
|---|---|
| `tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass (25/25 trang) |
| 18 trang (curl) | ✅ HTTP 200 |
| 5 API endpoint (curl) | ✅ HTTP 200 |

**Ghi chú:** `.env` chứa thông tin nhạy cảm (Supabase keys) — không động chạm, không log ra ngoài.
