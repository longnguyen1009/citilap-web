# TASK 3 — Đóng khoảng trống kiểm chứng sau review TASK 2

Codex đã đọc `docs/ANTIGRAVITY-OVERNIGHT-REPORT.md`, đối chiếu `ProductHeroSection.tsx`, `inspection.service.ts`, `InspectionReports.tsx`, điểm gọi trong `ProductDetailPage.tsx` và các assert kiểm định trong `scripts/test-storefront-improvements.mjs` trước khi giao task này. Không thực hiện prompt Admin TASK 3 cũ nếu còn nằm trong hàng đợi; dùng phạm vi dưới đây, không chạy hai lượt song song.

## Kết luận review

- Sửa thuộc tính SVG sang `strokeLinecap`, `strokeLinejoin`, `strokeWidth` đúng với JSX; giữ thay đổi.
- TASK 2 báo 24/24 kiểm tra responsive và các luồng local đạt. Các con số này hiện là kết quả Antigravity báo cáo; cần trỏ tới script, log và ảnh có thể kiểm tra lại.
- Báo cáo gọi `effectiveCssWidth: 720px`, `deviceScaleFactor: 2` là native zoom 200%. Đổi viewport/DPR không đủ chứng minh zoom thực của trình duyệt. Phần này chưa được Codex chấp nhận PASS.
- `publicInspections` đổi từ khớp biến thể hoặc cả hai null sang `(u.variantId=? OR u.variantId IS NULL)`. Đây là thay đổi ngữ nghĩa dữ liệu, vượt quá sửa trình bày. Test hiện có gọi `publicInspections(..., null)`; chưa bảo vệ nhánh có biến thể. Cần xác minh máy cấp sản phẩm thực sự dùng chung hay chỉ là fixture thiếu liên kết, tránh sửa truy vấn chỉ để demo hiện ra.

## Công việc, theo thứ tự

1. Ngay khi nhận, thêm `## TASK 3` và `TASK 3 RUNNING` vào báo cáo. Giữ nguyên kết quả TASK 1/2; bổ sung trạng thái review, không xóa lịch sử.
2. Kiểm tra model, writer nhập máy, lựa chọn biến thể trên PDP và cách hiển thị chứng thư để xác định đúng nghĩa của `SerialUnit.variantId IS NULL`. Chọn diff nhỏ nhất theo bằng chứng. Nếu cho phép chứng thư cấp sản phẩm xuất hiện khi chọn biến thể, UI phải tránh khẳng định máy đó thuộc cấu hình đã chọn khi chưa có dữ liệu. Nếu fixture không đủ liên kết, không thay dữ liệu local đang chạy để che lỗi. Không tự suy diễn nghiệp vụ mới.
3. Bổ sung test vào script assert hiện có, chạy trên D1/SQLite cô lập, không thêm framework: cùng sản phẩm có biến thể A/B và máy không gắn biến thể; kiểm tra không lẫn máy B vào A, không lẫn sản phẩm khác, quy tắc null đã xác minh, máy SOLD, chứng thư unpublished, sản phẩm/biến thể ẩn hoặc inactive. Đối chiếu `publicInspections` và `lookupPublicInspectionByCode`: không trả link chứng thư mà lookup từ chối vì các điều kiện công khai không nhất quán. Chỉ sửa mismatch tái hiện được.
4. Kiểm tra native browser zoom 200% bằng zoom thật của Chrome, ghi rõ phương pháp và bằng chứng mức zoom. Không dùng CSS zoom, viewport thu nhỏ, DPR hay pinch zoom để thay thế. Nếu không điều khiển được native zoom, sửa phần báo cáo đó thành UNVERIFIED, giữ riêng kết quả responsive đã đo; không phát sinh mã website để làm test đạt.
5. Lưu bằng chứng browser liên quan task vào `.wrangler/task-3-evidence/`: script/lệnh tái chạy, log JSON, ảnh phù hợp. Với dữ liệu nhạy cảm không lưu token/PII trong log hoặc ảnh. Ghi đường dẫn bằng chứng TASK 2 nếu chúng tồn tại; nếu không còn, ghi rõ hoặc tái kiểm tra phạm vi cần thiết, không tạo lại số liệu cũ bằng suy đoán.
6. Chạy test vừa bổ sung, `node scripts/test-storefront-improvements.mjs`, `npx tsc --noEmit -p .`; kiểm tra lại PDP và link chứng thư khi có sửa liên quan. Ghi kết quả thật, exit code, file đã sửa, điểm chưa xác minh và đề xuất task kế. Cuối cùng ghi `TASK 3 DONE`, rồi dừng chờ Codex review trước khi giao task 4. DONE là kết thúc thực hiện; không đồng nghĩa tất cả tiêu chí đã PASS.

## Giới hạn

Giữ toàn bộ thay đổi đang có. Đọc hướng dẫn Next.js liên quan trước khi sửa code Next.js. Không mở rộng sang Admin trong task này. Không làm VietQR hoặc modal đặt lịch showroom. Không commit/push/deploy/reset/stash/clean/checkout, remote migration, seed/reset dữ liệu local hiện có, tạo đơn thật, gửi thông báo hoặc đổi secrets/quyền. Không dừng server đang chạy. Chỉ dùng fixture cô lập cho test ghi dữ liệu. Không tuyên bố staging/production đạt từ local.
