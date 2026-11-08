# Điều phối UI qua đêm — 07/11/2026

Người dùng đã giao rõ: Antigravity thực hiện; Codex chỉ review và giao task. Tiếp nối phiên Storefront UI and Functionality Review hiện tại, không tạo một đợt redesign khác. Yêu cầu gốc: review UI đến chi tiết nhỏ, tải nhanh, mượt, thân thiện vuốt mobile.

## Giới hạn chung

- Chỉ workspace `C:/Users/Admin/Desktop/citilap-web2`, branch hiện tại `staging`. Giữ nguyên dirty worktree, dữ liệu, layout/content và nghiệp vụ hiện hành. Không sửa repo citilap-admin-nextjs.
- Không reset/stash/clean/checkout/commit/push/merge/deploy/migrate/seed, không thay quyền/secrets, không dừng server đang có. Không thêm dependency hoặc framework chỉ để kiểm tra.
- Phạm vi sửa: presentation/interaction và tối ưu frontend có bằng chứng. Không sửa Admin, backend, API contract, schema, giá, tồn kho, validation nghiệp vụ, idempotency hoặc thanh toán.
- Đọc AGENTS.md và guide Next liên quan trước sửa code. Ưu tiên native CSS/HTML, diff nhỏ. Không đổi thiết kế hàng loạt, không che lỗi bằng overflow-hidden toàn trang, không tắt zoom.
- Browser QA local, profile cô lập. Không tạo đơn/liên hệ/thanh toán thật. Chặn API ghi; chỉ cho quote/cart revalidate local nếu cần và nêu rõ. Không coi fixture là bằng chứng ghi DB.
- Báo cáo `docs/admin/ANTIGRAVITY-OVERNIGHT-REPORT-2026-11-07.md`; bằng chứng `.wrangler/ui-overnight-20261107/`. Ghi ACK/RUNNING/DONE/BLOCKED có timestamp thật cho mỗi vòng, file riêng đợt, lỗi trước/sau, lệnh/exit, screenshot/JSON, giới hạn bằng chứng.
- Chỉ làm vòng được Codex giao. DONE rồi dừng chỉnh, chờ review. Nếu quota/auth/busy, ghi BLOCKED cùng lỗi cụ thể; không giả nhận việc hoặc hoàn tất.

## Vòng 1 — Chốt việc hiện tại và baseline

1. Ghi `ROUND 1 ACK` ngay. Báo việc người dùng đang giao đã làm tới đâu, những file vừa sửa, những command còn chạy. Hoàn tất phần frontend đang dở trong phạm vi; không chạy hai lượt agent sửa cùng file.
2. Báo cáo MOBILE 2 ngày 06/11 chỉ là lịch sử chưa nghiệm thu, không phải yêu cầu làm lại. Đối chiếu source hiện tại: sticky mua ở320px bị cắt giá/khoảng trống đáy64px; quick checkout tràn bên trong dialog dù document không tràn; input mobile dưới16px. Chỉ sửa nếu còn tái hiện.
3. Kiểm tra browser các route có thật: homepage, một danh mục, search, PDP laptop/phụ kiện đang xuất bản, cart và checkout có sản phẩm (thêm bằng UI thật, không submit). Viewport320/390/430/768/1440; ghi internal overflow của dialog và khả năng đọc/chạm, không chỉ document overflow.
4. Đo baseline có thể so sánh cho homepage/catalog/PDP: cold/warm cache, cấu hình mạng/CPU cụ thể, navigation timing/TTFB/FCP/LCP/CLS, request count/bytes, long tasks khi scroll/swipe nếu browser hỗ trợ. Chỉ số không lấy được ghi UNVERIFIED. Dev timing phải ghi dev, không tuyên bố hiệu năng production. Không chạy build song song với dev nếu ảnh hưởng server; đề xuất cách đo production cô lập cho Codex review.
5. Kiểm tra swipe thực qua touch events/thiết bị: rail sản phẩm, gallery PDP, scroll dọc bắt đầu trên rail, tap sau swipe không mở nhầm, giữ arrow/keyboard, reduced-motion. Không dùng scrollLeft gán bằng JS để kết luận swipe đạt. Chrome emulation không phải iPhone/Android thật.
6. Chỉ chốt sửa đang dở hoặc lỗi nghiêm trọng tái hiện trong vòng này. Đề xuất tối đa5 lỗi còn lại theo mức ảnh hưởng, kèm source và bằng chứng; Codex chọn vòng tiếp theo.
7. Chạy lint file vừa sửa và TypeScript nếu có sửa logic; lưu receipt. Không khai toàn bộ lint PASS nếu có lỗi cũ. Chờ command hoàn tất. Ghi `ROUND 1 DONE` rồi dừng.

## Hướng vòng tiếp theo — chưa được tự bắt đầu

- Vòng2: bottleneck tải thực đo được (ảnh LCP/ảnh dưới fold, JS/hydration, video/embed, request lặp); giữ trải nghiệm và dữ liệu.
- Vòng3: swipe/scroll/gesture, sticky/safe-area, keyboard/focus, chuyển hướng/back và persistence.
- Vòng4: chi tiết UI còn lỗi trên trang phụ, empty/loading/error và hồi quy tổng hợp; build cuối, báo cáo sáng có PASS/FAIL/UNVERIFIED riêng.

Không tạo việc chỉ để có nhiều diff. Mỗi vòng cần kết quả có thể review; ưu tiên tác động thực với ít code.
