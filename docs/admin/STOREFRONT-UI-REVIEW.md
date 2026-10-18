# Storefront UI/UX Review & Remediation Report

Báo cáo kiểm tra và khắc phục giao diện thực tế (Real Browser Audit) cho hệ thống Storefront CitiLap theo tiêu chuẩn mua sắm, hiển thị tiếng Việt và trải nghiệm đa thiết bị.

---

## 1. Phạm vi, Route và Viewport Đã Kiểm Tra Bằng Browser Thật

Kiểm tra trực tiếp bằng Chrome DevTools Protocol (CDP) và Chromium headless/headed instance trên bản build Cloudflare Worker thực tế kèm SQLite/D1 in-memory fixture server.

| Route | Viewport kiểm tra | Mục đích kiểm tra |
|---|---|---|
| `/` (Trang chủ) | 1440x900, 1280x800, 768x1024, 390x844, 360x780, Zoom 200% | Header, mega menu, banner hero, flash sale, feature strip, footer, scroll-to-top |
| `/search` & `/search?q=...` | 1440x900, 768x1024, 390x844, Zoom 200% | Autocomplete, bộ lọc đa facet, drawer lọc mobile, sắp xếp, chip lọc |
| `/category/laptop-gaming` | 1440x900, 768x1024, 390x844 | Lưới sản phẩm, facet danh mục, breadcrumb |
| `/product/fixture-p` (PDP) | 1440x900, 768x1024, 390x844, Zoom 200% | Đổi variant, cập nhật giá tức thời, tăng giảm số lượng, thêm giỏ hàng, hotline |
| `/cart` (Giỏ hàng) | 1440x900, 768x1024, 390x844 | Danh sách giỏ hàng, coupon, summary card, khoảng cách an toàn với mobile nav |
| `/checkout` (Thanh toán) | 1440x900, 768x1024, 390x844, Zoom 200% | Chọn giao hàng/nhận cửa hàng, COD/chuyển khoản, nút gửi đơn, review 409 |
| `/wishlist` (Yêu thích) | 1440x900, 768x1024, 390x844 | Quản lý danh sách thiết bị, card sản phẩm, empty state, thử lại khi lỗi |
| `/order-tracking` | 1440x900, 390x844 | Form tra cứu mã đơn, hiển thị trạng thái |
| `/profile` | 1440x900, 390x844 | Thông tin tài khoản và điều hướng lịch sử |

---

## 2. Danh Sách Vấn Đề Phát Hiện & Mức Độ

### Mức độ: Cản trở thao tác (Blocker / High Usability)
1. **Nút "Gửi Đơn Đặt Hàng" và "TIẾN HÀNH ĐẶT HÀNG" bị che trên Mobile**:
   - *Hiện trạng*: `MobileBottomNav` fixed ở chân màn hình (cao 56px + safe-area) che khuất nửa dưới của các nút CTA quan trọng trên màn hình `/checkout` và `/cart`.
   - *Khắc phục*: Ẩn `MobileBottomNav` trên luồng checkout (`/checkout` và `/checkout/success`) theo chuẩn e-commerce để tập trung mua hàng; tăng `pb-24 md:pb-12` trên trang `/cart`.

2. **Nút Submit Checkout hiển thị Spinner "Đang tính tổng tiền..." vĩnh viễn**:
   - *Hiện trạng*: Trong `checkout/page.tsx`, `quoteReady` yêu cầu `!!paymentMethod`. Khi khách chưa chọn hình thức thanh toán (COD hoặc Chuyển khoản), nút hiển thị spinner kèm text "Đang tính tổng tiền...", khiến khách hàng tưởng hệ thống bị đơ/treo.
   - *Khắc phục*: Tách trạng thái `isQuoteCalculating`. Khi báo giá đã tính xong nhưng chưa chọn thanh toán, hiển thị rõ ràng "Vui lòng chọn phương thức thanh toán" (disabled); chỉ hiện spinner khi thật sự đang tính; hiển thị "Gửi Đơn Đặt Hàng" khi đã sẵn sàng.

### Mức độ: Khó sử dụng (Usability)
3. **Nút ScrollToTop z-index quá cao (z-50) và đè lên nút Mua ngay / Drawer**:
   - *Hiện trạng*: `ScrollToTop` màu đỏ chói với shadow đỏ, nổi ở `z-50` ngang hàng với modal và drawer, đè lên nút "Mua ngay" trên PDP mobile và che một phần nút lọc.
   - *Khắc phục*: Giảm z-index xuống `z-30` (dưới modal/drawer `z-50`), chuyển sang giao diện neutral glassmorphism tinh tế (`bg-slate-900/85 hover:bg-slate-950 text-white backdrop-blur-md`), điều chỉnh vị trí an toàn `bottom-20 right-3.5 md:bottom-6 md:right-6`.

4. **Tablet (768px - 1023px) bị mất hoàn toàn Giỏ hàng, Yêu thích và Profile**:
   - *Hiện trạng*: `Header.tsx` dùng `hidden lg:flex` cho toàn bộ khối action bên phải, trong khi `MobileBottomNav` dùng `md:hidden`. Ở độ phân giải tablet (iPad 768px), người dùng không có bất kỳ nút nào để vào giỏ hàng hoặc xem wishlist.
   - *Khắc phục*: Đổi container thành `hidden md:flex items-center gap-3 lg:gap-8`, đưa `CartIcon`, `Wishlist` và `Tài khoản` hiển thị từ breakpoint `md`.

5. **Drawer Danh Mục Mobile bị trống rỗng khi `navigation.menus.main` rỗng**:
   - *Hiện trạng*: Khi D1/CMS khởi tạo `navigation` nhưng `menus.main` là mảng rỗng `[]`, drawer mobile chỉ hiện 1 nút "Xem tất cả danh mục", còn lại trắng tinh vì điều kiện `!navigation` không được kích hoạt.
   - *Khắc phục*: Bổ sung kiểm tra `navigation?.menus.main && navigation.menus.main.length > 0`, nếu rỗng tự động fallback render danh sách `categories` và shortcut phụ kiện.

### Mức độ: Thiếu nhất quán (Inconsistency)
6. **Footer Cột 4 "Về CitiLap" bị bỏ trống hoàn toàn**:
   - *Hiện trạng*: Tương tự drawer, khi `navigation.menus.footer` là `[]`, khối fallback `!navigation` không chạy, để lại tiêu đề "Về CitiLap" với khoảng trắng lớn bên dưới.
   - *Khắc phục*: Chuyển điều kiện kiểm tra độ dài mảng; nếu footer menu CMS rỗng, tự động render 5 liên kết chuẩn: Giới thiệu thương hiệu, Hệ thống cửa hàng, Liên hệ & Hỗ trợ kỹ thuật, Điều khoản đặt hàng, Chính sách bảo mật thông tin.

7. **Header "Thông tin" dẫn sang Admin `/login` thay vì Storefront `/profile`**:
   - *Hiện trạng*: Nút icon User trên desktop header trỏ về `/login` (trang quản trị CMS), không đồng nhất với nút "Tài khoản" trỏ về `/profile` trên mobile nav.
   - *Khắc phục*: Đổi link thành `/profile` và đổi nhãn thành "Tài khoản".

8. **ProductCard footer tràn chữ khi thiếu bảo hành**:
   - *Hiện trạng*: Chuỗi fallback "Chưa cập nhật bảo hành" quá dài trên card 2 cột mobile, ép text trạng thái "Nhận yêu cầu mua" xuống dòng đôi bị kẹp chữ.
   - *Khắc phục*: Rút gọn thành "BH chính hãng" và thêm `shrink-0 whitespace-nowrap min-w-0` đảm bảo không bao giờ bị nhảy dòng xấu.

### Mức độ: Hoàn thiện hiển thị (Polish)
9. **PDP Variant Selector & Stepper số lượng**:
   - *Hiện trạng*: Bấm đổi cấu hình laptop bị delay phản hồi do không có local state; ô số lượng chỉ là native number input khó bấm trên điện thoại.
   - *Khắc phục*: Thêm local state cập nhật highlight ngay lập tức khi click cấu hình; bổ sung nút `-` và `+` stepper với kích thước chuẩn cảm ứng.

10. **Lỗi ngắt dòng và cắt dấu tiếng Việt trên mobile**:
    - *FeatureStrip*: Đổi `line-clamp-1` thành `line-clamp-2` để người dùng đọc trọn vẹn 4 cam kết chất lượng.
    - *FlashSaleSection*: Thêm `shrink-0 whitespace-nowrap` cho link "Xem tất cả >" tránh bị rớt chữ.
    - *HeroSection*: Thêm `text-balance` vào slogan để dấu sao `☆` không bị cô lập ở dòng thứ 2.
    - *SectionHeader*: Thêm `leading-snug py-0.5` cho tiêu đề banner tránh cắt dấu mũ/dấu sắc tiếng Việt ("THẦN ĐỒ HOẠ", "QUÁI VẬT GAMING").

11. **WishlistPage**:
    - Bọc card thông tin rõ ràng, giữ nguyên 100% các contract nhãn và role status/alert của test.

---

## 3. Các File Đã Sửa Đổi

1. [src/components/layout/MobileBottomNav.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/layout/MobileBottomNav.tsx)
   - Ẩn trên route checkout (`isProductPage || isCheckoutPage`).
   - Fallback render categories khi `navigation.menus.main` rỗng.
2. [src/app/(shop)/checkout/page.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/(shop)/checkout/page.tsx)
   - Bổ sung `isQuoteCalculating`, sửa logic nhãn nút submit tránh spinner vô tận.
3. [src/app/(shop)/cart/page.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/(shop)/cart/page.tsx)
   - Thêm `pb-24 md:pb-12` bảo đảm an toàn với thanh điều hướng mobile.
4. [src/components/layout/ScrollToTop.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/layout/ScrollToTop.tsx)
   - Giảm z-index `z-30`, chuyển màu neutral dark glassmorphic, tinh chỉnh vị trí `bottom-20 right-3.5`.
5. [src/components/layout/Header.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/layout/Header.tsx)
   - Cho phép hiển thị Cart, Wishlist, Tài khoản từ breakpoint `md` (tablet 768px).
   - Đổi link người dùng từ `/login` sang `/profile`.
6. [src/components/layout/Footer.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/layout/Footer.tsx)
   - Bổ sung fallback cho Cột 4 khi footer menu CMS rỗng.
7. [src/components/product/ProductPurchaseSection.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/product/ProductPurchaseSection.tsx)
   - Thêm local variant selection state, nút tăng giảm stepper `+`/`-`, link trực tiếp vào giỏ hàng khi thêm thành công.
8. [src/components/product/ProductCard.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/product/ProductCard.tsx)
   - Tối ưu chuỗi fallback bảo hành và chống tràn chữ trạng thái nhận đơn.
9. [src/components/home/FeatureStrip.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/home/FeatureStrip.tsx)
   - Tăng độ dài mô tả lên 2 dòng (`line-clamp-2`).
10. [src/components/home/FlashSaleSection.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/home/FlashSaleSection.tsx)
    - Chống wrap link "Xem tất cả >".
11. [src/components/home/HeroSection.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/home/HeroSection.tsx)
    - Thêm `text-balance` cho slogan.
12. [src/components/ui/SectionHeader.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/components/ui/SectionHeader.tsx)
    - Tăng `leading-snug py-0.5` chống cắt dấu diacritic tiếng Việt.
13. [src/app/(shop)/wishlist/page.tsx](file:///c:/Users/Admin/Desktop/citilap-web2/src/app/(shop)/wishlist/page.tsx)
    - Tinh chỉnh layout thẻ card và khoảng cách typography.

---

## 4. Bằng Chứng Hình Ảnh Trước & Sau (Before / After Evidence)

Tất cả ảnh chụp màn hình được lưu trong thư mục `docs/admin/evidence/`:

| Vị trí / Vấn đề | Trước khi sửa (Before) | Sau khi sửa (After) |
|---|---|---|
| **Footer Mobile (Cột 4 trống)** | `audit-home-mobile-footer.png` | `audit-home-mobile-footer-fixed.png` |
| **Mobile Drawer (Menu rỗng)** | `audit-mobile-drawer-open.png` | `audit-mobile-drawer-fixed.png` |
| **Cart Mobile (Che khuất nút)** | `audit-cart-populated-mobile.png` | `audit-cart-mobile-fixed.png` |
| **Checkout Mobile (Bị thanh đáy che & đơ nút)** | `audit-checkout-mobile-bottom.png` | `audit-checkout-mobile-fixed.png` |
| **PDP Mobile (Variant & số lượng)** | `audit-pdp-mobile-top.png` | `audit-pdp-mobile-fixed.png` |
| **Tablet 768px (Mất Giỏ hàng / Wishlist)** | `audit-home-tablet-768.png` | `audit-home-tablet-768-fixed.png` |
| **Wishlist Desktop 1440px** | `audit-wishlist-1440.png` | `audit-wishlist-1440-fixed.png` |

---

## 5. Lệnh Kiểm Tra & Kết Quả Thực Tế

Toàn bộ các lệnh kiểm tra tự động đã được thực thi và xác minh đạt 100%:

```powershell
# 1. Kiểm tra build Cloudflare
npm run build:cloudflare
# Kết quả: EXIT 0 - Build complete (All routes compiled)

# 2. Kiểm tra kiểu TypeScript
npx tsc --noEmit
# Kết quả: EXIT 0 - Zero type errors

# 3. Kiểm tra ESLint phạm vi sửa đổi
npx eslint "src/app/(shop)/checkout/page.tsx" "src/app/(shop)/cart/page.tsx" "src/components/layout/MobileBottomNav.tsx" "src/components/layout/Header.tsx" "src/components/layout/Footer.tsx" "src/components/product/ProductPurchaseSection.tsx" "src/components/product/ProductCard.tsx" "src/components/layout/ScrollToTop.tsx" "src/components/home/FeatureStrip.tsx" "src/components/home/FlashSaleSection.tsx" "src/components/home/HeroSection.tsx" "src/components/ui/SectionHeader.tsx" "src/app/(shop)/wishlist/page.tsx"
# Kết quả: EXIT 0 - 0 errors, 1 warning (img tag quy ước có sẵn)

# 4. Kiểm tra full Worker HTTP/D1 contracts
node scripts/test-r08-full-app.mjs --r09a
# Kết quả: 18/18 PASS

# 5. Kiểm tra toàn bộ luồng mua hàng trình duyệt R07C
node scripts/test-r07c-browser.mjs http://127.0.0.1:57379
# Kết quả: 7/7 PASS (PDP, form retention, quote, stock rejection, live price change, bank change review, idempotency)

# 6. Kiểm tra quyền và thao tác trình duyệt R08
node scripts/test-r08-browser.mjs http://127.0.0.1:57379
# Kết quả: 7/7 PASS (Autosave, history restore, conflict handling, mobile redirect screen, logout)

# 7. Kiểm tra ma trận trình duyệt R09A
node scripts/test-r09a-matrix.mjs http://127.0.0.1:57379
# Kết quả: 9/9 PASS (Search multi-facet, mobile drawer trap/escape, draft isolation, real-clock 409 review, compare limits, PDP variant integrity, DB fault recovery, SEO canonical, multi-viewport 1440/768/390)

# 8. Kiểm tra phóng to native 200%
node scripts/test-r09-native-zoom.mjs http://127.0.0.1:57379
# Kết quả: 4/4 PASS (/, /search, /product/fixture-p, /checkout không có ngang ngoài ý muốn)
```

---

## 6. Vấn Đề Còn Lại & Điểm Dừng

- **Giữ nguyên nghiệp vụ**: Các thuật toán tính giá `pricing.service`, snapshot điều khoản `termsVersion`, boundary 409 `PRICE_CHANGED` và cơ chế chống trùng đơn `Idempotency-Key` được bảo toàn nguyên vẹn.
- **Không đụng chạm ngoài phạm vi**: Admin dashboard, schema DB, migrations và API contracts được giữ nguyên.
- **Điểm dừng**: Đã hoàn tất sửa đổi và xác minh local. Không thực hiện commit, merge, push hay deploy theo đúng yêu cầu.
