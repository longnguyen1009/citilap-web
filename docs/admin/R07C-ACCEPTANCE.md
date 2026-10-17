# R07C — Checkout, phí giao hàng và thanh toán từ Settings

Ngày nghiệm thu: 2026-10-17 (GMT+7). **Hoàn thành triển khai và gate local full-app**. Staging/remote chưa chạy; chưa deploy hoặc áp migration vào DB dev/remote. R08 giữ worktree riêng.

## Delta và contract

| Yêu cầu | Baseline | R07C |
|---|---|---|
| Giá | R07B.4 đã có pricing và guard | Giữ `calculateEffectivePrice`, guard public/variant, campaign snapshots; tách resolution dùng chung quote/create |
| Phí ship | Order ship0, UI chờ tư vấn | `computeShippingFee` dùng subtotal sau campaign; threshold0 tắt miễn phí, pickup0 |
| Payment | COD hardcode | COD/BANK_TRANSFER theo cấu hình; CK thiếu hướng dẫn không khả dụng; không method thì fail closed |
| Quote | Chưa có | `POST /api/checkout/quote`, no-store, rate limit riêng, không tạo Order/Item/Event/Notification |
| Xác nhận | Chỉ giá dòng | Bắt buộc expectedPrice và checkoutAcknowledgment gồm shippingFee/totalAmount/termsVersion |
| Snapshot | Chưa có bank/showroom | `Order.checkoutSnapshot` JSON: settingsRevision, bankAccountInfo, showroom ID/tên/địa chỉ/điện thoại |
| Pickup | Business profile tĩnh | Chỉ Hanoi có hỗ trợ online theo contract hiện hành; địa chỉ/tên/điện thoại từ Settings đã lưu; địa chỉ rỗng vô hiệu pickup |
| Retry | Key chưa gắn payload/form | Đóng băng payload trong sessionStorage khi gửi; network/500/429 giữ key; reload retry đúng payload cũ |
| Confirmation | COD hardcode, thiếu snapshot | API token trả snapshot, success hiển thị ship/tổng/method/hướng dẫn CK; không token hợp lệ không giả báo thành công |
| R08 | Worktree riêng | Không RBAC hoặc merge trong R07C |

Quote và create dùng `checkout.service.ts`, một evaluatedAt và một Settings document cho pricing/ship/payment mỗi lần tính. Không có công thức ship trong client. Quote request tối đa10 targets, quantity1–5, IDs bounded, duplicate target bị từ chối. Chưa chọn payment được lấy quote để hiển thị lựa chọn; create bắt buộc chọn payment và xác nhận tổng. Settings thiếu/corrupt/query lỗi không fallback default shipping/COD.

`PRICE_CHANGED`409 giữ changedItems/oldSubtotal/newSubtotal/oldGrandTotal/newGrandTotal, thêm quote mới và phí cũ/mới. `CHECKOUT_CHANGED`409 dùng cùng details khi chỉ ship/tổng/bank/showroom đổi. `PAYMENT_METHOD_DISABLED`400 buộc chọn lại; không tự chuyển phương thức. Xác nhận modal cập nhật thông tin, khách bấm gửi lần nữa; không tự gửi. Hash terms chỉ gồm thông tin nhận/thanh toán liên quan, tránh thay đổi branding gây conflict vô ích. Settings revision được lưu riêng trong snapshot.

Replay kiểm tra order đã commit trước live settings/pricing. Hash v1 gồm acknowledgment, line expectations và showroom; payload legacy không acknowledgment giữ thuật toán hash cũ và chỉ replay đơn có sẵn. Tạo mới thiếu acknowledgment bị400. Concurrent cùng key trả cùng winner; khác payload trả422. Khi nhận lỗi chưa rõ kết quả, form khóa và nút thử lại dùng request đã lưu, kể cả quote mới hiện không khả dụng. Sau409 chưa commit, lần gửi mới có key mới.

## Kiểm thử thực chạy

Windows, Node26.7.0; production Cloudflare build chạy trên Miniflare với D1/R2 ephemeral, JS/CSS thật. Fixture không load `.env`/Wrangler config, chỉ synthetic credentials/contact/bank. Không đụng localhost3001.

| Lớp | Command | PASS | FAIL | SKIP |
|---|---|---:|---:|---:|
| Pure shipping policy | `node --test scripts/test-r07c-shipping-policy.mjs` | 5 | 0 | 0 |
| Full Worker HTTP + D1 | `node scripts/test-r07c-checkout-settings.mjs --serve` | 12 | 0 | 0 |
| Full-app Chrome headless | `node scripts/test-r07c-browser.mjs http://127.0.0.1:62342` | 5 | 0 | 0 |
| R07B.4 regression | `node scripts/test-r07b-4-regression.mjs` | 16 | 0 | 0 |
| TypeScript | `npx.cmd tsc --noEmit` | 1 | 0 | 0 |
| Scoped ESLint | Checkout contracts/service/pages/routes, order service/routes, pricing, settings page, rate limiter | 1 | 0 | 0 |
| Cloudflare build | `npm.cmd run build:cloudflare` | 1 | 0 | 0 |
| Staging/remote | Chưa deploy/migrate, chưa xác minh bindings/Turnstile thật | 0 | 0 | 1 |

Không cộng service/HTTP/browser thành một tổng chứng nhận. R07B.4 test16 được cập nhật fixture acknowledgment theo contract mới, vẫn khẳng định PRICE_CHANGED, snapshot/replay/transition. Các suite Antigravity cũ không được tính là vừa chạy lại.

HTTP12 nhóm: threshold−1/exact/+1/zero và sale subtotal; pickup/forged address/unknown showroom; ship đổi409 không ghi đơn; methods tắt/bank thiếu; bank đổi409 và snapshot/replay sau tắt method; PRICE_CHANGED; malformed/bounds/missing acknowledgment; invalid Settings/DB failure; trigger SQL abort rollback Order/Item/Event/Notification; concurrent same-key một order; legacy replay không acknowledgment; admin settings401/CSRF403, R06 order list và checkout HTML.

Browser5 nhóm: PDP→checkout BANK_TRANSFER desktop1440; reload giữ form/method và mobile390 không tràn ngang; giữ response delivery rồi trả pickup trước, response cũ không ghi đè; bank đổi hiện modal giữ form và không tạo order trước xác nhận; cố ý ngắt response201 sau commit, reload rồi retry sau khi tắt cả hai method vẫn nhận cùng order, snapshot bank/showroom cũ. CDP chỉ làm trễ/ngắt transport, không mock handler hoặc kết quả nghiệp vụ. Profile Chrome tạm riêng đã đóng; fixture đã dừng khi bàn giao.

Ảnh: [desktop](evidence/r07c-desktop-checkout.png), [mobile390](evidence/r07c-mobile-checkout.png), [bank conflict](evidence/r07c-bank-conflict.png), [success snapshot](evidence/r07c-order-success.png).

Các lỗi/lượt chưa đạt đã xử lý: API customer order detail thiếu payment/snapshot (đã thêm và test lại); test SQL malformed JSON bị constraint json_valid chặn (giữ assertion constraint và dùng valid JSON sai schema để test fail closed); fixture dùng nhầm PUT settings và `/api/admin/orders` (đã sửa POST và `/api/orders`); browser click trước hydration (chờ hydration); chạy browser nhiều lượt cùng IP chạm rate-limit (mỗi lượt IP fixture riêng, app limiter giữ nguyên). Lượt sandbox chặn esbuild/Chrome không tính PASS; chạy lại được hệ thống duyệt, vẫn trên DB/profile tạm. Không che các lỗi này bằng mock.

## Files và migration

Nguồn chính: `src/contracts/checkout.ts`, `src/server/services/checkout.service.ts`, `order.service.ts`, `pricing.service.ts`, `src/app/api/checkout/quote/route.ts`, orders POST/detail, checkout/success pages, admin settings page, `src/lib/rate-limiter.ts`.

Migration `d1-migrations/0022_checkout_snapshot.sql` thêm nullable TEXT, không backfill legacy. 0021 dành cho R08 ở worktree khác; không tạo migration trùng số. Prisma schema/client đã generate bằng config tạm không dotenv, post-generation WASM patch đã chạy. Chỉ áp migrations vào Miniflare RAM trong test. Triển khai thật phải áp0022 trước code mới; chưa chứng nhận migration state remote.

Rollback: ngưng nhận đơn mới trước rollback code, giữ cột/snapshot để bảo toàn hướng dẫn cũ. Không rollback về ship0/COD khi Settings lỗi; không drop snapshot hoặc thay dữ liệu lịch sử bằng Settings mới. R07C không dùng cổng thanh toán, không auto-PAID, coupon hay RBAC. Chưa mở thêm showroom ngoài Hanoi; cần cấu hình showroom riêng trước khi mở rộng.

Chạy lại: build trước, chạy HTTP script `--serve`, lấy URL `R07C_FULL_APP_FIXTURE`, chạy browser script với URL đó. Không rebuild giữa lúc server fixture đang phục vụ browser. Browser cần Chrome tại đường dẫn cài đặt trong script. Ctrl-C dừng fixture sau kiểm tra.
