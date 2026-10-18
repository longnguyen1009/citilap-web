# Prompt Antigravity - R09A.1: đóng gap storefront

Bạn tiếp quản CitiLap Web2 tại `C:\Users\Admin\Desktop\citilap-web2`.
Thực hiện R09A.1 đến khi có code, test và báo cáo review được. Chỉ làm phase này; chưa chạy R09B.

## Bối cảnh và quyền thao tác

R08 đã commit tại `91ff087`. R09A đã có code và bằng chứng local nhưng chưa được nghiệm thu phát hành. Tại lúc giao việc, code R09A và evidence vẫn nằm trong working tree, gồm cả file untracked. Đây là công việc cần kế thừa, không phải rác để dọn.

- Đọc `AGENTS.md`, git status/diff/log và kiểm kê file trước khi sửa. Xác minh HEAD thực tế; không giả định trạng thái bàn giao còn nguyên.
- Đọc `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md`, `NEXT-FUNCTIONS-ROADMAP.md`, `R09A-STOREFRONT-COMPLETION.md`, `R09A-ACCEPTANCE.md` và `R08-ACCEPTANCE.md`.
- Đọc guide tương ứng trong `node_modules/next/dist/docs/` trước khi sửa Next.js. Dùng skill Prisma phù hợp nếu sửa query/CLI.
- Antigravity được sửa Admin/API/StoreFront cần thiết trong phạm vi phase, nhưng phải kiểm tra file ownership và tránh ghi đè công việc đang chạy.
- Không reset, stash, checkout bỏ thay đổi, commit, merge, push, deploy hoặc migrate DB thật. Không dừng server của người dùng. Test trên D1/R2 tạm hoặc bản sao được phép; không dùng `.env` production để chạy fixture.
- Dùng dependency hiện có, diff nhỏ, không redesign hoặc tạo hệ thống search/compare/pricing thứ hai.

## Bằng chứng bàn giao, phải đối chiếu lại

R09A service 10/10; built Worker HTTP 18/18; browser R09A 7/7; checkout browser 5/5; typecheck, scoped lint và Cloudflare build PASS. R04.1 20/20 và R07B.4 16/16 có trong báo cáo. Đây là kết quả local trước bàn giao, không tự ghi thành kết quả của lần chạy mới.

Đã sửa cache HTML cũ bằng `connection()` tại shop layout. PublicPriceRefresh cập nhật biên campaign/focus/30 giây; wishlist/compare lấy API mới. Không bỏ `no-store` chỉ để nâng điểm đo. Wishlist lưu versioned IDs; PDP dùng variant thật; profile/tracking đã bỏ dữ liệu mẫu. Giữ các invariant này.

## Công việc bắt buộc

### 1. Sửa và đo lại layout shift checkout

- Đọc `docs/admin/evidence/r09a-performance.json`: 24 mẫu sau thay đổi, fixture nhỏ, cart trống, cửa sổ đo 1,5 giây; desktop checkout CLS khoảng 0,195. Không gọi đây là baseline trước tối ưu hoặc field CWV.
- Tái hiện và tìm node gây shift bằng PerformanceObserver/trace. Kiểm tra chuyển từ SSR/hydration sang cart đã đọc storage, pending retry và checkout có hàng. Không kết luận nguyên nhân chỉ từ source.
- Sửa tối thiểu để layout ổn định, không giấu giá thật, mất form hoặc làm sai retry. Trạng thái loading phải rõ và accessible.
- Đo trước/sau trên cùng fixture/build settings, desktop 1440 và mobile 390, cache lạnh/ấm, ít nhất 3 lượt mỗi trường hợp checkout trống/có hàng. Theo dõi đến khi UI ổn định và hoàn tất tương tác cần kiểm tra, không chỉ timeout ngắn.
- Mục tiêu CLS <= 0,1 trong các kịch bản lab đã đo. Ghi dữ liệu thô, LCP/CLS/TTFB, browser/version, viewport, throttle, số lượt, trạng thái giỏ; không suy ra field INP từ lab.

### 2. Hoàn tất browser matrix R09A

Dùng browser thật với built Worker và D1/R2 tạm, mở rộng harness hiện có. Mỗi trường hợp cần assert kết quả, không chỉ screenshot:

- Search: nhiều facet, OR trong cùng facet/AND giữa facet, sort/page; Back/Forward khôi phục URL và UI; mở URL trong context mới trả cùng query; malformed query có giải thích. Giữ test page 101 trên 1.202 sản phẩm ở tầng service/HTTP, không bắt buộc render 101 trang browser.
- Mobile drawer: Apply/Clear/Cancel/Escape, draft không đổi URL trước Apply, reset page đúng, focus trap và return. Phụ kiện không hiển thị facet laptop không phù hợp.
- Publish/unpublish: search/listing/compare/wishlist/related không leak draft; related không gợi ý chính sản phẩm. Kiểm tra sau reload và navigation, không chỉ lần tải đầu.
- Sale start/end: cùng fixture clock và lịch thật, mở card/listing, PDP, compare, wishlist và cart/checkout. Public giá cập nhật đúng; cart/quote nếu cần xác nhận giá mới phải thể hiện và giữ bước xác nhận. Không tự đổi giá rồi tự gửi đơn, không yêu cầu cart snapshot biến thành giá live nếu contract không quy định.
- Compare: sai nhóm, vượt MAX_COMPARE_PRODUCTS, thiếu spec, remove, chỉ hiện khác biệt, cuộn ngang và keyboard. Spec/condition/giá phải cùng representative variant; không dùng thiếu CPU để kết luận laptop là phụ kiện. API phải chặn kể cả bypass UI.
- PDP: chọn variant bằng URL/SKU/ID cập nhật ảnh/spec/giá/CTA/cart cùng cấu hình. Variant bị ẩn/hết khả dụng giữa lúc xem và submit bị server từ chối; UI giữ context và hướng dẫn chọn lại, không fallback âm thầm.
- Lỗi: mạng chậm, offline rồi retry, API 409/503, phiên Admin hết hạn/401 trong luồng liên quan. Giữ form và bản sửa; không biến lỗi thành empty/success. Timeout sau create phải tạo đúng một order; dùng lại test R07C hiện có.
- SEO: kiểm tra HTTP và rendered head cho PDP, landing, search/filter, profile/tracking, confirmation; canonical/noindex/sitemap/redirect nhất quán, không chứa credential hoặc PII. Kiểm tra cache sau publish/unpublish và tại biên sale.
- Desktop 1440, tablet 768, mobile 390 và browser zoom native 200%: không che CTA, focus rõ, thao tác bàn phím đầy đủ. `deviceScaleFactor`, CSS zoom và pinch emulation không thay thế native browser zoom. Không có công cụ phù hợp thì ghi SKIP cùng blocker, không giả PASS.

### 3. Audit consumer CMS và giới hạn catalog

- Kiểm kê các vị trí kinh doanh public còn hard-code: hotline/showroom, warranty/policy, CTA/footer, related, metadata. Mỗi vị trí ghi source/consumer và cách xử lý. Không nối CMS giả hoặc tự thêm auth/OTP/newsletter provider.
- Đối chiếu in-memory effective-price filtering với quy mô fixture có ý nghĩa, ghi số rows/latency/giới hạn. Giữ batching D1 để tránh quá giới hạn bind. Chỉ thêm projection/index nếu bằng chứng cho thấy cần; không mở rộng schema theo phỏng đoán.

## Verification và đầu ra

Đọc script trước khi chạy. Build mới trước browser; fixture phải trỏ đúng build, tạo mới khi cần. Không báo PASS cho suite chưa chạy hoặc còn assertion lỗi.

Các gate tối thiểu sau sửa tương ứng:

```text
node scripts/test-r04-1-gates.mjs
node scripts/test-r07b-4-regression.mjs
node scripts/test-r09a-storefront.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vite/bin/vite.js build
node scripts/test-r08-full-app.mjs --r09a --serve
node scripts/test-r09a-browser.mjs <fixture-url>
node scripts/test-r07c-browser.mjs <fixture-url>
git diff --check
```

Chạy scoped lint toàn bộ TS/TSX sửa/thêm; tách lỗi repo cũ khỏi regression mới. Chạy fixture browser có mutation tuần tự hoặc trên DB riêng, tránh làm nhiễu nhau. Không ghi đè evidence cũ mà không nêu đó là lần chạy mới.

Cập nhật `R09A-ACCEPTANCE.md`: từng dòng PASS/FAIL/SKIP theo static/service/HTTP/browser, file evidence, command, exit code, build/HEAD và dirty diff. Ghi root cause/fix CLS, số đo trước/sau và mọi gap còn lại. Bổ sung regression chạy được cho bug logic mới.

Kết thúc bằng báo cáo: thay đổi, gate thực chạy, gap còn mở, R09A đủ điều kiện review hay chưa. Nếu công cụ/môi trường chặn, hoàn tất phần độc lập và báo blocker cụ thể. Không tự coi SKIP là loại scope đã được duyệt. Dừng để review R09A; không tự chạy R09B hoặc phát hành.
