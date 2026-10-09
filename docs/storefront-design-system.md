# Citilap.VN — Storefront Design System Foundation

Phiên bản: 1.0.0 (Step 1 Foundation)  
Cập nhật: 2026-10-01  
Trạng thái: Hoạt động (Approved Foundation)

---

## 1. Brand Direction & Triết lý Thiết kế

Citilap.VN là nền tảng thương mại điện tử chuyên biệt về laptop công nghệ cao, đặc biệt có thế mạnh nổi trội về:
- **Laptop Gaming & Workstation** (cần hiệu năng cao, tản nhiệt tốt, card đồ họa rời mạnh mẽ).
- **Laptop Like New / Used & Máy lướt tuyển chọn** (yêu cầu tuyệt đối về độ minh bạch tình trạng ngoại hình 99%, thời hạn bảo hành phần cứng và nguồn gốc linh kiện).
- **Laptop Văn phòng & Doanh nhân** (tinh tế, thanh lịch, tin cậy).

### Nguyên tắc định vị hình ảnh (Visual Principles):
1. **Professional Technology Retailer**: Hiện đại, chuẩn mực, sạch sẽ, không tạo cảm giác chợ linh kiện cũ hay web quảng cáo rối rắm.
2. **Product-First & High Information Density**: Laptop là nhân vật chính. Khách hàng mua laptop dựa trên thông số kỹ thuật (CPU, VGA, RAM, SSD, màn hình, tình trạng) nên thông tin phải được trình bày súc tích, dễ scan, không giấu thông số quan trọng.
3. **Gaming-Capable nhưng Không RGB / Cyberpunk lòe loẹt**: Không sử dụng gradient đỏ-tím rực rỡ, không dùng neon glow, không dùng viền phát sáng. Khí chất công nghệ đến từ đường nét sắc sảo, viền mỏng tinh tế, typography chuẩn mực và màu xanh thương hiệu uy tín.
4. **Minh bạch tình trạng & Tạo dựng niềm tin**: Nhãn tình trạng máy ("Like New 99%", "Mới 100%"), thời hạn bảo hành ("BH 12 tháng") và trạng thái tồn kho ("Sẵn hàng", "Còn 2 máy") luôn hiển thị rõ ràng, chuẩn hóa vị trí.

---

## 2. Color Tokens

Hệ màu được cấu trúc thành các semantic tokens trong `src/app/globals.css`. Không hard-code các mã màu hex phân mảnh rải rác trong component.

| Token CSS Variable | Semantic Role / Purpose | Giá trị màu HEX / HSL | Utility / Usage Class |
| :--- | :--- | :--- | :--- |
| `--background` | Nền trang storefront | `#ffffff` | `bg-[var(--background)]` / `bg-white` |
| `--foreground` | Màu chữ chính toàn trang | `#0f172a` (Slate 900) | `text-[var(--foreground)]` |
| `--color-brand-primary` | Màu nhận diện thương hiệu Citilap, interactive buttons, active links | `#2563eb` (Blue 600) | `bg-blue-600`, `text-blue-600` |
| `--color-brand-primary-hover` | Hover state của brand elements | `#1d4ed8` (Blue 700) | `hover:bg-blue-700` |
| `--color-brand-primary-subtle` | Nền nhẹ của active tabs, chip đã chọn | `#eff6ff` (Blue 50) | `bg-blue-50` |
| `--color-brand-navy` | Nền Header tối, Topbar kỹ thuật số, banner điểm nhấn | `#0b1221` (Navy sâu) | `bg-slate-900` / Navy |
| `--color-price-current` | Giá bán hiện tại (ưu tiên nổi bật, dễ chốt đơn) | `#dc2626` (Red 600) | `text-price-current`, `text-red-600` |
| `--color-price-old` | Giá gốc niêm yết (gạch ngang, mờ thứ cấp) | `#94a3b8` (Slate 400) | `text-price-old`, `text-slate-400` |
| `--color-badge-sale` | Tag giảm giá deal sốc, flash sale | `#dc2626` (Red 600) | `bg-red-600 text-white` |
| `--color-condition-like-new` | Tag máy Like New / 99% / 98% (tông ấm tin cậy) | `#b45309` (Amber 800) | `bg-amber-50 text-amber-800 border-amber-200/80` |
| `--color-condition-new` | Tag máy Mới 100% nguyên seal | `#1d4ed8` (Blue 700) | `bg-blue-50 text-blue-700 border-blue-200/80` |
| `--color-stock-available` | Trạng thái sẵn hàng tại showroom | `#15803d` (Emerald 700) | `text-emerald-700 bg-emerald-50` |
| `--color-stock-low` | Trạng thái sắp hết hàng (< 3 máy) | `#d97706` (Amber 600) | `text-amber-600 bg-amber-50` |
| `--color-stock-out` | Trạng thái tạm hết hàng | `#64748b` (Slate 500) | `text-slate-500 bg-slate-100` |
| `--color-surface-card` | Bề mặt card sản phẩm | `#ffffff` | `.surface-card` |
| `--color-surface-subtle` | Bề mặt nền thumbnail ảnh, container phụ | `#f8fafc` (Slate 50) | `bg-slate-50` |
| `--color-border-subtle` | Đường viền card, ngăn cách hàng thông số | `#e2e8f0` (Slate 200) | `border-slate-200` |
| `--color-border-strong` | Đường viền input, card hover | `#cbd5e1` (Slate 300) | `border-slate-300` |

---

## 3. Typography Hierarchy

Hệ thống sử dụng font **Inter** tối ưu hiển thị chữ số kỹ thuật và tiếng Việt với font-feature settings hiện đại.

| Role | Cỡ chữ (Size) | Độ đậm (Weight) | Leading | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Hero Title** | `clamp(1.75rem, 4vw, 2.75rem)` (28px - 44px) | ExtraBold (800) | `1.15` | Tiêu đề chính trang chủ, banner chiến dịch lớn |
| **Section Title (H2)** | `clamp(1.125rem, 2vw, 1.375rem)` (18px - 22px) | Bold (700) | `1.25` | Tiêu đề các block sản phẩm trang chủ ("Laptop Gaming Bán Chạy", "Máy Like New Tuyển Chọn") |
| **H3 / Subsection** | `1rem` (16px) | SemiBold (600) | `1.3` | Tiêu đề nhóm bộ lọc, heading widget phụ |
| **Product Title (Card)** | `13px` - `13.5px` | Medium (500) | `1.35` | Tên model máy trong card (clamp tối đa 2 dòng, min-height ổn định) |
| **Price (Current)** | `16px` - `17px` (Desktop: 17px, Mobile: 16px) | Bold (700) | `1.1` | Giá bán máy, đỏ nổi bật không bị lấn át |
| **Price (Old)** | `11.5px` - `12px` | Regular (400) | `1.1` | Giá cũ gạch ngang, màu xám nhạt slate-400 |
| **Specs & Matrix Chip** | `11px` | Medium (500) | `1.2` | Thông số CPU, RAM, SSD, Màn hình, VGA trong chip |
| **Card Metadata** | `10.5px` - `11px` | SemiBold (600) | `1.2` | Nhãn thương hiệu/series, thời hạn bảo hành, số máy còn lại |
| **Body (Standard)** | `14px` (`text-sm`) | Regular (400) | `1.5` | Nội dung mô tả chính sách, text thông tin chi tiết |
| **Secondary Body** | `13px` | Regular (400) | `1.4` | Chú thích phụ, gợi ý tìm kiếm |

---

## 4. Spacing & Container System

### Container Primitives: `<Container>`
- **Desktop (>1024px):** Max-width cố định `1370px`, horizontal padding `px-8` (32px).
- **Tablet (640px - 1024px):** Horizontal padding `px-6` (24px).
- **Mobile (<640px):** Horizontal padding `px-4` (16px), không bao giờ để nội dung dính sát mép kính màn hình.
- Component: `src/components/ui/Container.tsx`

### Spacing Conventions:
- **Khoảng cách giữa các Section trang chủ:** `py-8 sm:py-10 lg:py-12`
- **Product Grid Gap (Desktop):** `gap-3 sm:gap-4`
- **Product Grid Gap (Mobile 2 cột):** `gap-2 sm:gap-3` (được tính toán vừa khít không tràn chữ trên màn hình 375px).
- **Khoảng cách Header - Nội dung:** Đồng bộ qua layout storefront.

---

## 5. Radius Hierarchy

Không sử dụng bán kính bo tròn ngẫu nhiên hoặc giant radius (>24px) trên các khối vuông kỹ thuật. Chuẩn hóa về 4 cấp độ:

| Cấp độ | Giá trị | CSS Variable | Đối tượng áp dụng |
| :--- | :--- | :--- | :--- |
| **Control** | `0.5rem` (8px) | `--radius-control` | Buttons, Inputs, Select dropdowns, SpecChips, Skeleton |
| **Card** | `0.75rem` (12px) | `--radius-card` | ProductCard, CategoryCard, ReviewCard, Dialog content |
| **Surface** | `1rem` (16px) | `--radius-surface` | Khối container lớn, Section banner, EmptyState wrapper |
| **Pill** | `9999px` | `--radius-pill` | Wishlist circle button, Filter pill tags, Badges tròn |

---

## 6. Shadow & Elevation

Loại bỏ toàn bộ colored glow (đỏ/cam/neon) không phù hợp định vị công nghệ cao. Hệ thống bóng đổ mới tinh giản và chân thực:

| Cấp độ | CSS Variable | Đặc tả | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **None** | `shadow-none` | Không shadow, chỉ dùng border | Mặc định các chip thông số và input state |
| **Card Rest** | `--shadow-card` | `0 1px 3px 0 rgb(0 0 0 / 0.05)` | Trạng thái nghỉ của Product Card |
| **Card Hover** | `--shadow-card-hover` | `0 4px 6px -1px rgb(0 0 0 / 0.07)` | Trạng thái rê chuột lên Product Card |
| **Popover / Dropdown** | `--shadow-popover` | `0 10px 15px -3px rgb(0 0 0 / 0.08)` | Menu mega, dropdown giỏ hàng, popup bảo hành |

---

## 7. Base Primitives & Usage

Tất cả các primitive được đặt tại `src/components/ui/` và export qua `src/components/ui/index.ts`:

### 1. `Container`
```tsx
import { Container } from "@/components/ui/Container";

<Container>
  <SectionContent />
</Container>
```

### 2. `Button`
Hỗ trợ 6 variants (`primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`), 4 sizes (`sm`, `md`, `lg`, `icon`), tích hợp `loading` spinner và accessibility ring.
```tsx
import { Button } from "@/components/ui/Button";

<Button variant="primary" size="md">Xem chi tiết</Button>
<Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Lọc sản phẩm</Button>
<Button variant="ghost" size="icon" aria-label="Menu"><Menu /></Button>
```

### 3. `Badge`
Semantic badge không hard-code business text:
- `condition-like-new`: Máy Like New / 99% (vàng hổ phách nhạt)
- `condition-new`: Máy Mới 100% (xanh dương nhạt)
- `sale`: Giảm giá (đỏ đậm)
- `stock-in`, `stock-low`, `stock-out`: Trạng thái tồn kho
- `rank-top`, `rank-other`: Thứ hạng bán chạy (#1, #2, #3)
```tsx
import { Badge } from "@/components/ui/Badge";

<Badge variant="condition-like-new" size="xs">Like New 99%</Badge>
<Badge variant="sale" size="xs">-15%</Badge>
<Badge variant="stock-in" size="sm" dot>Sẵn hàng</Badge>
```

### 4. `PriceTag`
Định dạng giá đồng nhất toàn storefront. Tuyệt đối không tự bịa đặt giá cũ hoặc tính discount giả.
```tsx
import { PriceTag } from "@/components/ui/PriceTag";

<PriceTag price="18.990.000đ" oldPrice="22.500.000đ" size="md" />
<PriceTag price="34.500.000đ" size="xl" /> {/* PDP Hero */}
```

### 5. `SpecChip`
Hiển thị thông số máy dạng ô nhỏ gọn, sắc nét, có nhãn nổi bật cho card đồ họa VGA:
```tsx
import { SpecChip } from "@/components/ui/SpecChip";

<SpecChip icon={<Cpu className="w-3 h-3" />} value="i7-13700HX" />
<SpecChip label="VGA" highlight value="RTX 4060 8GB" />
```

### 6. `Skeleton`
Shimmer effect tinh tế dùng cho loading placeholder:
```tsx
import { Skeleton } from "@/components/ui/Skeleton";

<Skeleton className="w-full h-40 rounded-xl" />
```

### 7. `EmptyState`
Bố cục nhất quán khi không tìm thấy kết quả tìm kiếm, giỏ hàng trống, bộ lọc không có máy phù hợp:
```tsx
import { EmptyState } from "@/components/ui/EmptyState";

<EmptyState
  title="Không tìm thấy sản phẩm"
  description="Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc tầm giá."
  action={<Button variant="outline" size="sm">Xóa bộ lọc</Button>}
/>
```

### 8. `SectionHeader`
Tiêu đề section trang chủ tinh tế, chuẩn công nghệ:
```tsx
import { SectionHeader } from "@/components/ui/SectionHeader";

<SectionHeader
  title="Laptop Gaming Bán Chạy"
  subtitle="Tuyển chọn máy hiệu năng cao, card đồ họa rời thế hệ mới"
  action={{ label: "Xem tất cả", href: "/category/laptop-gaming" }}
/>
```

---

## 8. Product Card Migration

ProductCard hiện tại (`src/components/product/ProductCard.tsx`) đã hoàn tất migration sang Design System Foundation:
- **Bán kính góc:** Sử dụng `rounded-[var(--radius-card)]` (12px).
- **Bề mặt & Viền:** Nền trắng `bg-white`, viền mảnh `border-slate-200`, hover sang `border-slate-300` và elevation nhẹ `hover:shadow-md`.
- **Badges:** Tích hợp `Badge` primitive cho Rank (#1..#N), Condition ("Like New 99%" vs "Mới 100%"), Sale tag ("-15%").
- **Giá:** Tích hợp `PriceTag` size `md` với tông đỏ `#dc2626` rõ ràng, giá cũ gạch ngang `#94a3b8`.
- **Thông số Spec Matrix:** Tích hợp `SpecChip` chia 2 cột rõ ràng, chip VGA làm nổi bật chữ `VGA` xanh dương, chip RAM/SSD kết hợp bằng dấu chấm phân cách `•`.
- **Wishlist Button:** Nút tròn nổi dạng nổi độc lập `rounded-full`, có `aria-label` và `aria-pressed` đầy đủ chuẩn accessibility.
- **Không thay đổi UX/Data:** Giữ nguyên 100% logic dữ liệu, bảo hành, kiểm tra tồn kho, ảnh fallback.

---

## 9. Accessibility Conventions

1. **Focus Ring Visible:** Tất cả interactive elements (Buttons, Links, Inputs) đều có `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`. Không bao giờ bỏ outline mà không có chỉ báo thay thế.
2. **Disabled States:** Nút bị vô hiệu hóa có `disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed`.
3. **Contrast Standards:** Màu chữ chính `#0f172a` trên nền trắng đạt tỉ lệ tương phản > 12:1 (chuẩn AAA). Chữ thứ cấp `#475569` đạt tỉ lệ > 6:1 (chuẩn AA).
4. **Touch Target Size:** Các nút bấm trên mobile đạt tối thiểu 36px - 44px chiều cao để người dùng thao tác ngón tay dễ dàng.
5. **Reduced Motion:** Đã tích hợp media query `@media (prefers-reduced-motion: reduce)` trong `globals.css` để tôn trọng thiết lập của người dùng nhạy cảm với chuyển động.

---

## 10. Responsive Breakpoint Conventions

Tuân thủ nghiêm ngặt hệ thống Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Đặc biệt lưu ý khoảng 768px - 1024px (Tablet / Laptop nhỏ):**
- Layout card trên Tablet chuyển từ 2 cột (mobile) sang 3 cột (768px) và 4-5 cột (1280px).
- Container tự động áp dụng `px-6` (24px) ở khoảng này để tạo không gian thoáng đãng cho mắt đọc.

---

## 11. Do / Don't Guide cho các Task Tiếp Theo

### DO (NÊN LÀM):
- Sử dụng `<Container>` bọc nội dung các trang storefront (Header, Homepage sections, PLP, PDP, Cart, Checkout, Footer).
- Sử dụng `<Button>` và `<Badge>` với các semantic variants đã chuẩn hóa.
- Giữ card thông số laptop có mật độ cao, súc tích (cleanSpec bỏ chữ Intel/AMD/NVIDIA rườm rà).
- Sử dụng viền mảnh `border-slate-200` và nền `bg-slate-50` cho các ô phụ.
- Đảm bảo giá đỏ `#dc2626` luôn nổi bật và chân thực.

### DON'T (TUYỆT ĐỐI TRÁNH):
- **Không** sử dụng gradient đỏ-cam-tím làm background cho section headers.
- **Không** sử dụng neon glow hoặc shadow phát sáng lòe loẹt.
- **Không** tạo thêm các radius tùy biến (như `rounded-[22px]`, `rounded-[35px]`) khi các token chuẩn đã đáp ứng đủ.
- **Không** dùng cỡ chữ dưới 11px cho nội dung chính trên mobile.
- **Không** hard-code màu sắc rải rác như `text-[#234567]` hay `border-[#e3e3e3]`.
- **Không** can thiệp hoặc ghi đè làm hỏng giao diện Admin (`/admin/*`).
