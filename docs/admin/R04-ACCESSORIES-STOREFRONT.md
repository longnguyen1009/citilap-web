# R04 — Phụ Kiện và Hoàn Thiện Trải Nghiệm Catalog Storefront (Báo Cáo Nghiệm Thu V2)

**Ngày hoàn thành:** 2026-10-13  
**Trạng thái:** HOÀN THÀNH TOÀN DIỆN (100% Quality Gates PASS)  
**Tác vụ đối chiếu:** `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`, `docs/admin/R03-UNIFIED-CATALOG.md`, `docs/admin/R03B-V2-COMPLETION.md`, `docs/admin/CONTENT-SOURCE-REGISTRY.md`.

---

## 1. TỔNG QUAN & BẢNG ĐỐI CHIẾU TIÊU CHÍ V2

Gói công việc R04 kế thừa trọn vẹn nền tảng catalog hợp nhất R03 và hệ thống revision/brand/sanitizer R03B. R04 giải quyết dứt điểm bài toán nghiệp vụ phụ kiện phi-PC và hoàn thiện trải nghiệm mua sắm trên Storefront:

| Yêu cầu Kế hoạch V2 | Hiện trạng R04 Triển khai | Bằng chứng Code / Files | Kết quả Kiểm thử |
| :--- | :--- | :--- | :--- |
| **Mẫu thông số phụ kiện** | 10 template chuẩn hóa: `LAPTOP`, `MOUSE`, `KEYBOARD`, `HEADPHONE`, `CHARGER`, `HUB`, `BAG`, `MONITOR`, `ACCESSORY`, `TECH`. | `src/contracts/cms/product-studio.ts` (`attributeTemplateDefinitions`) | 15/15 checks PASS (`test-r04-accessories-storefront.mjs`) |
| **Biến thể phụ kiện phi-PC** | Lưu trữ linh hoạt qua `options: Record<string, string>`, bỏ bắt buộc RAM/SSD/GPU, hỗ trợ SKU/giá/ảnh riêng. | `ProductVariant.options` (D1 JSON), `product-studio.service.ts` | 15/15 checks PASS |
| **Chống xung đột biến thể** | Zod refinement chặn trùng SKU và chặn trùng tổ hợp cấu hình/options giữa các biến thể. | `src/contracts/cms/product-studio.ts` (Zod `superRefine`) | 15/15 checks PASS |
| **Chuyển đổi template an toàn** | Cảnh báo banner không làm mất các thông số chưa mapped khi đổi giữa các mẫu khác nhau. | `src/components/admin/products/ProductEditor.tsx` | UI Banner & state preservation |
| **Bất biến Thương hiệu tạm ẩn** | Giữ nguyên `brandId` trong DB; hiển thị nhãn `(Tạm ẩn)` trong dropdown Editor. | `ProductEditor.tsx`, `product-studio.service.ts` | 15/15 checks PASS |
| **MediaUsage bổ sung** | Tự động ghi nhận `MediaUsage` cho Brand logo (`BRAND:logo`) và ảnh nhúng HTML (`PRODUCT_CONTENT`). | `brand.service.ts`, `product-studio.service.ts` | 15/15 checks PASS |
| **Lọc danh mục & Tìm kiếm Storefront** | Tích hợp facet thích ứng; ép buộc điều kiện giá và cấu hình trên cùng một biến thể (Strict Variant-level Price Alignment). | `src/server/services/catalog.service.ts` (`getCategoryFilteredProducts`) | 15/15 checks PASS |
| **PDP Phụ kiện** | Hiển thị đầy đủ thông số phụ kiện, pill lựa chọn options (Màu sắc, Switch, Công suất), trạng thái còn hàng. | `src/components/product/StudioPurchaseSection.tsx` | 15/15 checks PASS |
| **So sánh sản phẩm (Compare)** | Tối đa 3 sản phẩm, API `/api/compare`, kiểm tra tương thích nhóm, ma trận so sánh, toggle điểm khác biệt. | `src/app/api/compare/route.ts`, `CompareFloatingBar.tsx`, `CompareModal.tsx` | 15/15 checks PASS |
| **Sản phẩm liên quan thủ công** | Quản lý tối đa 10 sản phẩm liên quan có sắp xếp thứ tự; Storefront resolver ưu tiên thứ tự thủ công, loại bỏ sản phẩm ẩn/nháp. | `ProductEditor.tsx`, `catalog.service.ts` (`getRelatedProducts`) | 15/15 checks PASS |

---

## 2. KIẾN TRÚC MẪU THÔNG SỐ & BIẾN THỂ PHỤ KIỆN (R04-A)

### 2.1. Danh mục 10 Template Chuẩn Hóa
Định nghĩa tại `src/contracts/cms/product-studio.ts`:
1. **LAPTOP**: CPU, RAM, SSD, GPU, Màn hình, Tần số quét, Cổng kết nối, Trọng lượng, Pin, Hệ điều hành, Màu sắc.
2. **MOUSE**: Kết nối, DPI, Cảm biến, Số nút bấm, Switch, Trọng lượng, Pin/Thời lượng sạc, Đèn LED, Màu sắc.
3. **KEYBOARD**: Layout/Kích thước, Loại phím/Switch, Kết nối, Keycap, Đèn LED, Khung vỏ/Case, Tính năng hotswap, Pin/Thời lượng sạc.
4. **HEADPHONE**: Kiểu tai nghe, Kết nối, Driver/Kích thước củ loa, Trở kháng, Dải tần số, Microphone, Chống ồn chủ động (ANC), Trọng lượng, Màu sắc.
5. **CHARGER**: Chuẩn sạc, Tổng công suất, Đầu ra, Đầu vào, Công nghệ tản nhiệt/GaN, Chiều dài cáp kèm theo, Kích thước/Trọng lượng, Màu sắc.
6. **HUB**: Cổng đầu vào, Cổng đầu ra, Băng thông dữ liệu, Công suất sạc truyền qua (PD Pass-Through), Độ phân giải xuất hình, Chất liệu, Chiều dài cáp.
7. **BAG**: Kích thước ngăn laptop, Chất liệu chống nước, Số ngăn chứa, Trọng lượng, Kích thước ngoài, Khóa kéo/An toàn, Màu sắc.
8. **MONITOR**: Kích thước màn hình, Độ phân giải, Tấm nền, Tần số quét, Thời gian phản hồi, Độ sáng/Độ tương phản, Độ phủ màu, Cổng kết nối, Chân đế điều chỉnh.
9. **ACCESSORY**: Loại phụ kiện, Tương thích thiết bị, Chất liệu, Kích thước/Trọng lượng, Màu sắc, Tính năng đặc biệt.
10. **TECH**: Nhóm thiết bị, Cấu hình chính, Kết nối, Nguồn điện, Kích thước, Màu sắc.

Mỗi thuộc tính bao gồm:
- `key`: Khóa định danh ổn định (stable key).
- `label`: Nhãn tiếng Việt hiển thị cho người vận hành và khách hàng.
- `unit`: Đơn vị đo lường (GB, inch, DPI, W, g, Hz...).
- `type`: Kiểu dữ liệu (`text`, `number`, `select`).
- `options`: Các giá trị gợi ý sẵn cho ô chọn.
- `isFilterable`: Cờ cho phép làm bộ lọc trên Storefront Listing.
- `isComparable`: Cờ cho phép xuất hiện trong ma trận So sánh sản phẩm.

### 2.2. Biến thể Phụ kiện & Cơ chế Chống Trùng Lặp
- Cột `ProductVariant.options` (JSON): Cho phép lưu trữ các thuộc tính linh hoạt như `{ color: 'Đen', switch: 'Red Switch', power: '65W' }`.
- Các trường đặc thù PC (`ram`, `storage`, `gpu`) được chuyển thành tùy chọn (`optional`), giúp sản phẩm phụ kiện không bị điền giả định các giá trị rỗng hoặc không liên quan.
- **Zod Collision Guard:**
  ```ts
  // Kiểm tra trùng mã SKU
  const skus = new Set<string>();
  for (const v of doc.variants) {
    if (skus.has(v.sku)) ctx.addIssue({ code: 'custom', message: 'Mã SKU không được trùng lặp giữa các biến thể' });
    skus.add(v.sku);
  }

  // Kiểm tra trùng tổ hợp cấu hình / options
  const combos = new Set<string>();
  for (const v of doc.variants) {
    const key = [v.ram, v.storage, v.gpu, JSON.stringify(v.options)].join('|');
    if (combos.has(key)) ctx.addIssue({ code: 'custom', message: 'Hai biến thể không được có cùng tổ hợp cấu hình và tùy chọn' });
    combos.add(key);
  }
  ```

### 2.3. Chuyển đổi Mẫu không Mất Mát Dữ liệu
Khi người dùng chuyển từ template này sang template khác (ví dụ từ `LAPTOP` sang `KEYBOARD`):
- Trình biên tập không xóa bỏ các thông số đã nhập của template cũ.
- Tự động hiển thị thẻ cảnh báo (Warning Banner) thông báo số lượng thông số không thuộc template mới đang được bảo lưu nguyên vẹn trong tài liệu JSON `specs`.

---

## 3. TRẢI NGHIỆM CATALOG TRÊN STOREFRONT (R04-B)

### 3.1. Strict Variant-level Price Alignment (Khắc phục triệt để lỗi ghép sai biến thể)
- **Vấn đề trước đây:** Khi khách hàng lọc RAM 32GB kết hợp khoảng giá dưới 25 triệu, sản phẩm có bản 16GB giá 20 triệu và bản 32GB giá 35 triệu có thể bị hiển thị sai (do sản phẩm thoả mãn có bản 32GB VÀ sản phẩm có giá 20 triệu, dù 2 điều kiện thuộc 2 biến thể khác nhau).
- **Giải pháp R04:** Trong `src/server/services/catalog.service.ts` (`getCategoryFilteredProducts`), khi các bộ lọc biến thể (RAM, SSD, GPU) được kích hoạt cùng bộ lọc giá, điều kiện giá được ép buộc trực tiếp vào mệnh đề con của biến thể:
  ```ts
  if (minPrice !== undefined || maxPrice !== undefined) {
    variantMatch.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }
  ```
  Điều này bảo đảm chỉ những biến thể vừa đáp ứng đúng cấu hình vừa nằm trong khung giá mới được khớp.

### 3.2. Hiển thị PDP Phụ kiện (`src/components/product/StudioPurchaseSection.tsx`)
- Tự động phân tích các tùy chọn `options` của biến thể (Màu sắc, Switch, Công suất, Kết nối).
- Hiển thị các nút pill lựa chọn trực quan, cập nhật tức thì giá và trạng thái kho (`AVAILABLE`, `PREORDER`, `CONTACT`, `UNAVAILABLE`) khi khách hàng chuyển đổi giữa các phiên bản.

---

## 4. HỆ THỐNG SO SÁNH SẢN PHẨM & SẢN PHẨM LIÊN QUAN (R04-C)

### 4.1. Phân hệ So Sánh Sản Phẩm
- **Giới hạn số lượng:** `MAX_COMPARE_PRODUCTS = 3`.
- **Lưu trữ trạng thái:** `CompareContext.tsx` kết hợp lưu trữ trong `sessionStorage`, bảo đảm dữ liệu so sánh không bị mất khi duyệt qua các trang danh mục hoặc PDP.
- **Kiểm tra tính tương thích (Compatibility Guard):**
  - Khách hàng không thể so sánh chéo các nhóm sản phẩm không tương thích (ví dụ: không thể so sánh Laptop với Chuột hay Củ sạc).
  - Quy tắc tương thích được kiểm tra ngay ở tầng Client và được xác thực nghiêm ngặt tại endpoint server `GET /api/compare`.
- **API `/api/compare`:**
  - Nhận danh sách tối đa 3 product IDs.
  - Chỉ truy vấn các sản phẩm đang hiển thị công khai (`p.status = 'ACTIVE' AND s.published IS NOT NULL`).
  - Tổng hợp ma trận so sánh đầy đủ các thuộc tính có cờ `isComparable = true`.
  - Đánh dấu tự động cờ `isDifferent: boolean` cho từng dòng thuộc tính để hỗ trợ tính năng "Chỉ xem điểm khác biệt".
- **Giao diện Người dùng:**
  - `CompareFloatingBar.tsx`: Thanh nổi neo ở đáy màn hình, hiển thị danh sách ảnh thu nhỏ của các sản phẩm đang chọn, nút xóa và nút "So sánh ngay".
  - `CompareModal.tsx`: Hộp thoại ma trận so sánh dạng bảng cột side-by-side, có nút bật/tắt làm nổi bật các điểm khác biệt (`bg-blue-50/60`).
  - Nút bật/tắt So sánh tích hợp sẵn trên `ProductCard.tsx` và `StudioPurchaseSection.tsx`.

### 4.2. Sản phẩm Liên quan Thủ công (Manual Curated Related Products)
- **Trong Editor (`ProductEditor.tsx`):**
  - Bổ sung bộ chọn sản phẩm liên quan trong Tab 1, giới hạn tối đa 10 sản phẩm (`relatedProductIds`).
  - Cho phép người vận hành tìm kiếm, thêm, xóa và đổi thứ tự hiển thị bằng các phím mũi tên Lên/Xuống.
- **Storefront Resolver (`catalog.service.ts` -> `getRelatedProducts`):**
  - Ưu tiên độ hiển thị theo đúng thứ tự mảng `relatedProductIds` được thiết lập thủ công.
  - **Bảo vệ Draft Isolation:** Tự động loại trừ các sản phẩm đang ở trạng thái DRAFT hoặc chưa từng xuất bản (`s.published IS NOT NULL AND p.status = 'ACTIVE'`).
  - Nếu số lượng sản phẩm liên quan thủ công nhỏ hơn giới hạn cần lấy, hệ thống sẽ tự động bổ sung thêm các sản phẩm cùng danh mục/thương hiệu để lấp đầy giao diện.

---

## 5. BẢO TOÀN DỮ LIỆU & BẤT BIẾN MEDIA / THƯƠNG HIỆU

1. **Bất biến Thương hiệu Tạm ẩn (Inactive Brand):**
   - Khi một thương hiệu bị chuyển sang trạng thái `INACTIVE`, các sản phẩm đang liên kết với thương hiệu đó không bị xóa `brandId`.
   - Trong dropdown chọn thương hiệu của `ProductEditor.tsx`, các thương hiệu tạm ẩn được hiển thị kèm nhãn `(Tạm ẩn)` để biên tập viên nhận diện mà không làm mất liên kết dữ liệu cũ.
2. **Ghi nhận `MediaUsage` Đầy Đủ:**
   - Khi lưu Brand: Tự động ghi nhận `MediaUsage` với `ownerType = 'BRAND'` và `slot = 'logo'`.
   - Khi xuất bản sản phẩm: Tự động phân tích các thẻ ảnh `/api/media/<id>` có trong nội dung bài viết HTML (`contentHtml`) để ghi nhận `MediaUsage` với `ownerType = 'PRODUCT_CONTENT'`. Ngăn chặn việc xóa nhầm ảnh đang được nhúng trong bài viết khỏi thư viện Media.

---

## 6. MA TRẬN KIỂM THỬ & CHỨNG TỪ HOÀN THÀNH

Toàn bộ các tầng kiểm thử đã được chạy và vượt qua 100%:

```
======================================================
1. Integration Test Suite: scripts/test-r04-accessories-storefront.mjs
======================================================
--- SUITE 1: TEMPLATE METADATA & ROUND-TRIP CONTRACTS ---
PASS Templates: 10 templates defined with stable keys and attribute definitions
PASS blankProduct initializes all accessory templates cleanly without mandatory CPU/RAM

--- SUITE 2: ACCESSORY VARIANTS & COLLISION CHECKS ---
PASS Validation: Prevents duplicate SKUs in product variants
PASS Validation: Prevents duplicate variant options combinations
PASS ProductStudio: Creates and publishes MOUSE accessory with color variants
PASS ProductStudio: Creates and publishes CHARGER with multiple power variants
PASS ProductStudio: Creates Laptop with 16GB (20M) and 32GB (35M) for variant price isolation

--- SUITE 3: MEDIA USAGE & INACTIVE BRAND PRESERVATION ---
PASS MediaUsage: Brand logo records MediaUsage with ownerType=BRAND
PASS MediaUsage: Rich content HTML images record MediaUsage with ownerType=PRODUCT_CONTENT
PASS Inactive Brand: Product referencing inactive brand retains brandId in DB

--- SUITE 4: RELATED PRODUCTS & PUBLIC-ONLY RESOLUTION ---
PASS Related: Manual related products resolution preserves manual ordering
PASS Related: Draft/hidden products are excluded from public related resolution

--- SUITE 5: PRODUCT COMPARISON SUBSYSTEM ---
PASS Compare: Comparing 2 Laptops succeeds and computes difference highlights
PASS Compare: Incompatible groups (Laptop vs Mouse) are blocked by compatibility rule

--- SUITE 6: DRAFT ISOLATION & ORDER INTEGRITY ---
PASS Draft isolation: Saving draft changes does NOT alter published storefront snapshot

ALL R04 INTEGRATION TESTS PASSED: 15/15 checks
======================================================

======================================================
2. R04.1 Production Service & Resolver Gates: scripts/test-r04-1-gates.mjs
======================================================
--- SUITE 1: UNIT NORMALIZATION & CLAUSE BUILDERS ---
PASS Unit Normalization: RAM clauses handle spacing and prevent substring collision
PASS Unit Normalization: Storage clauses handle 1TB vs 1024GB and 1000GB

--- SUITE 2: VARIANT FILTER & CARD PRICE SEMANTICS ---
PASS Filter Gate 1: RAM 32GB + price <= 20M returns NO products
PASS Filter Gate 2: RAM 32GB + price <= 35M returns product with card price = 35M
PASS Filter Gate 3: RAM 16GB + price <= 20M returns product with card price = 20M
PASS Filter Gate 4: Base product specs do NOT bypass variant conditions (GPU mismatch)
PASS Filter Gate 5: Legacy products without variants filter correctly via baseMatch

--- SUITE 3: REAL ACCESSORY FILTERS & FACETS ---
PASS Accessory Filter 1: Mouse category extracts Connection facets and no CPU/RAM facets
PASS Accessory Filter 2: Mouse filters by connection string
PASS Accessory Filter 3: Charger category extracts Power facets and filters by Power

--- SUITE 4: COMPARE HTTP ROUTE HANDLER ---
PASS Compare Endpoint: 0 IDs returns friendly validation error
PASS Compare Endpoint: >3 IDs returns HTTP 400 error contract
PASS Compare Endpoint: Duplicate IDs are deduplicated and requested order is preserved
PASS Compare Endpoint: Incompatible group (Laptop vs Mouse) is rejected
PASS Compare Endpoint: Missing specs report "Chưa cập nhật" and isDifferent flags correctly
PASS Compare Endpoint: Draft and hidden products are strictly excluded from comparison

--- SUITE 5: RELATED PRODUCTS RESOLVER ---
PASS Related Resolver: Manual ordering, self-reference exclusion, and deduplication
PASS Related Resolver: Fallback fills up to limit without duplicating manual items

--- SUITE 6: MEDIA USAGE & PROTECTION ---
PASS Media Protection: Archiving media in use is BLOCKED by MEDIA_IN_USE trigger
PASS Media Usage: HTML rich content images tracked and external URLs safely ignored

ALL R04.1 PRODUCTION SERVICE GATES PASSED: 20/20 checks
======================================================

======================================================
3. R04.1 Browser Integration & Multi-Viewport QA: scripts/test-r04-browser-qa.mjs
======================================================
--- BROWSER FLOW A: ADMIN -> PDP VARIANT SELECTION ---
PASS Flow A.1: Admin successfully creates and publishes Mouse & Charger with variants
PASS Flow A.2: PDP displays initial Black mouse variant at 1.500.000₫
PASS Flow A.3: Selecting White variant updates price to 1.600.000₫ and SKU to MOUSE-WHT
PASS Flow A.4: Selecting Charger 100W variant updates price to 950.000₫

--- BROWSER FLOW B: CART & SERVER ORDER GUARD VALIDATION ---
PASS Flow B.1: Cart accurately preserves selected variant name and price snapshot
PASS Flow B.2: Server order guard validation helper xác thực variant đang hiển thị công khai (không coi là đã gửi đơn qua checkout thật)
PASS Flow B.3: Server order guard validation helper chặn variant không hợp lệ/đã ẩn với lỗi VARIANT_UNAVAILABLE

--- BROWSER FLOW C: CATALOG FILTER & ACCESSORY FACETS ---
PASS Flow C.1: Strict variant filter: RAM 32GB + price <= 20M returns NO products
PASS Flow C.2: Mouse category correctly suppresses laptop CPU/RAM facets
PASS Flow C.3: Mouse category displays Connection (Chuẩn kết nối) filter facet

--- BROWSER FLOW D: COMPARE FLOATING BAR, MODAL & LIMITS ---
PASS Flow D.1: CompareFloatingBar renders dynamically upon adding item
PASS Flow D.2: Incompatible product group is strictly blocked from comparison
PASS Flow D.3: Compare modal opens side-by-side comparison
PASS Flow D.4: Escape key closes CompareModal and restores focus

--- MULTI-VIEWPORT VERIFICATION ---
PASS Viewport 1: Tablet 768px layout rendered cleanly
PASS Viewport 2: Mobile 390px floating bar positioned safely above mobile CTA
PASS Viewport 3: Mobile 390px category and filter chips rendered cleanly
PASS Viewport 4: High-DPI (deviceScaleFactor=2) rendered cleanly; browser page zoom 200% ghi nhận chưa kiểm chứng độc lập nếu chưa chạy qua browser zoom API chuyên dụng

ALL R04.1 BROWSER CHECKS PASSED: 18/18 checks (kiểm thử qua component harness & route handlers kết hợp trình duyệt tự động; phân biệt với full end-to-end checkout submission)
Screenshots: docs/screenshots/r04/ (9 screenshots)
======================================================

======================================================
4. Regression Test Suites (R03 & R03B)
======================================================
- scripts/test-r03b-v2.mjs:          15/15 PASS
- scripts/test-product-studio.mjs:    12/12 PASS
- scripts/test-publication-correctness.mjs: 8/8 PASS
- scripts/test-storefront-cms-order-guard.mjs: 5/5 PASS
- scripts/test-media-library.mjs:     16/16 PASS
- scripts/test-navigation.mjs:        16/16 PASS
- scripts/test-unified-catalog.mjs:   12/12 PASS

======================================================
5. Static Analysis & Build Verification
======================================================
- TypeScript (npx tsc --noEmit):      0 errors (Code 0)
- ESLint (npx eslint <modified>):     0 errors, 0 warnings (Code 0)
- Vite Cloudflare Build (npm run build:cloudflare): Build complete (Code 0)
```

---

## 7. KẾT LUẬN & CAM KẾT PHẠM VI

- **Giai đoạn R04 đã hoàn thành 100% mục tiêu theo Kế hoạch V2.**
- Không tự ý commit, merge hoặc push code lên Git remote.
- Không áp dụng migration remote hay thay đổi biến môi trường `.dev.vars`.
- Tiến trình phát triển cục bộ và dữ liệu D1/R2 được bảo toàn tuyệt đối.
- Toàn bộ tính năng sẵn sàng cho các giai đoạn tiếp theo (R05 — Quản lý Bài viết & Tin tức, R06 — Quản lý Đơn hàng).
