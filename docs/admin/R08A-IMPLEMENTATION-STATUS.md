# R08A — Identity, permissions và audit: trạng thái triển khai

Ngày 2026-10-16. **WIP, chưa nghiệm thu R08A; chưa bắt đầu R08B/R08C.**

## Tích hợp master ngày 2026-10-17

- Theo yêu cầu người dùng: checkpoint R07B.4/R07C tại `dfe619e`, tích hợp nhánh `feature/r08-admin-operations` (`ff50f0e`) vào master. Đây là merge phần R08A đã có, không phải nghiệm thu toàn bộ R08.
- Xung đột campaign giữ thứ tự delete-items có guard / update / insert của R07B.4, thêm audit vào cùng batch. Prisma client sinh lại từ schema gồm cả User identity và Order.checkoutSnapshot.
- Fixture R07B.4 đổi sang loginAdmin/session DB; fixture full Worker R07C đăng nhập qua `/api/auth/login`. Không dùng cookie signed legacy để vượt guard mới.
- Chạy lại sau tích hợp: `node scripts/test-r08-identity.mjs` **13/13 PASS**; `node scripts/test-r07b-4-regression.mjs` **16/16 PASS**; `node scripts/test-r07c-checkout-settings.mjs` **12/12 PASS** (Worker build thật, D1/R2 tạm).
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**. `npm.cmd run build:cloudflare`: **PASS**, exit 0; log local `.wrangler/r08-merge-build.log`.
- Scoped ESLint trên identity/context/auth/proxy và campaign/order services/routes: **FAIL**, 2 lỗi `no-explicit-any` tại campaign create/update và 1 cảnh báo import `campaignDocumentSchema` thừa; đã có trước merge, chưa sửa trong gói tích hợp.
- Browser không chạy lại trong lần merge này; bằng chứng browser R07C trước merge không chứng nhận UI/session R08. Các gate còn thiếu bên dưới vẫn giữ, trừ typecheck tích hợp nay đã sạch.
- Migration `0021` và `0022` chỉ chạy trên DB tạm trong test; chưa áp dụng DB dev/remote. Khi rollout cần migration trước code và cấu hình bootstrap Owner theo mục bên dưới. Chưa push/deploy.

## Cách ly công việc

- Checkpoint đầu vào: `03ddd0a` trên `master`, chứa R07B.3 đang sửa, không phải release đã đạt gate.
- Branch: `feature/r08-admin-operations`; worktree: `.worktrees/r08`.
- Không sửa worktree gốc của Antigravity; không push/merge/deploy/migrate remote.
- Migration `0021_admin_identity.sql` mới chỉ chạy trên D1 fixture. Kiểm tra lại số migration khi tích hợp R07B.3.

## Đã nối runtime

- Dùng User hiện hành; Owner/Editor/Sales, quyền export riêng cho Sales. Unknown protected route mặc định Owner-only.
- Session opaque, DB chỉ lưu SHA-256 token; kiểm tra account/version/expiry mỗi request. Cookie HttpOnly/SameSite, Secure trong production.
- Không còn quyền qua bearer chung hoặc signed cookie cũ. Bearer header không miễn CSRF cho cookie.
- Hash password PBKDF2-SHA256 với salt ngẫu nhiên; giới hạn 100.000 vòng theo Workers WebCrypto. Không ghi credential mặc định vào migration.
- Owner quản lý tài khoản ở `/admin/users`: create, role, disable, export, reset password. Mọi lần sửa thu hồi session; expectedRevision bắt buộc khi sửa.
- DB trigger bảo vệ Owner cuối, kể cả concurrent demotion. Audit account và mutation cùng batch có guard atomic.
- Guard async nối route admin/legacy/media/upload/bulk/restore; sidebar chỉ hiển thị capability tương ứng. `/api/admin/session` trả projection quyền, no-store.
- `src/proxy.ts` bảo vệ URL admin theo convention Next 16. Hiện kiểm tra DB từng request để thu hồi ngay; cần đo latency trước staging. API vẫn có guard riêng.
- Request actor dùng AsyncLocalStorage, không dùng global mutable actor; HTTP wrapper tách khỏi writer helpers.
- Audit cùng batch tại canonical product/post/page/navigation/settings/builder/campaign/order/contact writers. Product archive có audit; restore dùng canonical action `restore`, không ghi log rời sau commit. Post/Page/Navigation revision mới có actor xác thực; lịch sử cũ giữ nguyên.
- Export orders/contacts/customers ghi audit trước khi trả CSV, không lưu raw PII vào summary.
- `/admin/audit`: server pagination 50; API và UI lọc actor/action/entity/ngày GMT+7.
- Notification read state theo user, không đổi trạng thái đã đọc của người khác. Logout UI giữ trang và báo lỗi nếu thu hồi thất bại.

## Bằng chứng đã chạy

| Lớp | Command | Kết quả |
|---|---|---|
| Identity/D1 + HTTP fixture | `node scripts/test-r08-identity.mjs` | 13/13 PASS |
| Product Studio/D1/R2 fixture | `node scripts/test-product-studio.mjs` | 12/12 PASS |
| Order/contact CAS, rollback, export | `node scripts/test-r06-2-atomic.mjs` | 15/15 PASS sau giữ fallback actor legacy |
| Navigation suite | `node scripts/test-navigation.mjs` | BLOCKED trước assertions: esbuild không có loader cho Prisma `.wasm?module` |
| Prisma generate | `node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma` + `node scripts/post-prisma-generate.mjs` | PASS, generated client trong worktree |
| Typecheck | `npx.cmd tsc --noEmit --incremental false` | FAIL: lỗi checkpoint R07B.3 ở campaign archive/service và product-home context arguments |
| Lint phần R08 mới | `node node_modules/eslint/bin/eslint.js` với danh sách identity/permissions/context/users/audit/proxy | PASS, 0 lỗi |
| Cloudflare bundle | `npm.cmd run build:cloudflare` | Build complete, exit 0 ở lần cuối; log chuyển vào `.wrangler/logs` để tránh EPERM ngoài sandbox |
| Browser/full app/staging | Chưa chạy | SKIP: chưa có app fixture HTTP đầy đủ/browser session/staging deployment của branch |

HTTP fixture chạy server Node cổng ngẫu nhiên, gọi route handlers tài khoản thật với DB Miniflare tạm. Đây không phải bằng chứng full Next/vinext app hoặc browser. Không dùng DB dev, ID/order thật hoặc credential từ `.env`.

Regression mới chứng minh: legacy auth bị từ chối; role matrix; revoke ngay request tiếp; account CAS; last Owner race; CSRF kể cả Bearer header kèm cookie; append-only/no secret; notification isolation/idempotency; HTTP 401/403/create/missing revision/409; audit SQL failure rollback cả Product; restore tạo draft mới; lọc ngày GMT+7 đúng boundary và từ chối ngày lịch sai.

## Gate còn thiếu trước nghiệm thu

1. Review toàn bộ route→capability; HTTP trực tiếp từng nhóm legacy/upload/bulk/restore/export. Chưa lấy account HTTP fixture làm chứng nhận mọi route.
2. Khép audit các đường còn thiếu: brand, post-category, media và các legacy writer không đi canonical; chống phantom event khi CAS thua. Không gọi audit toàn hệ thống đã hoàn chỉnh.
3. Bổ sung metadata audit revision trước/sau, correlation ID và link đối tượng trong UI; hiện event gồm actor/action/entity/summary/time, không có raw customer payload.
4. Kiểm tra account bootstrap collision/legacy migration bằng fixture riêng; hiện không tự nâng USER/ADMIN cũ lên Owner, không overwrite account trùng email.
5. Browser login/logout/session expiry/403/menu/form persistence; full-app HTTP auth/CSRF và export filter/audit. Đo latency DB auth ở proxy.
6. Tích hợp bản R07B.3 đã review, typecheck sạch; sửa navigation test harness WASM và chạy lại suites liên quan. Cloudflare bundle không thay thế typecheck.
7. Review migration/schema parity: các bảng session/read/audit/guard hiện dùng raw D1 SQL; schema Prisma mới có ba cột User. Không dùng Prisma db push để suy ra/xóa bảng D1.

## Bootstrap và rollback

- Operator phải cấu hình ADMIN_EMAIL/ADMIN_PASSWORD qua secret runtime. Login bootstrap chỉ khi chưa có Owner và email chưa tồn tại; không in secret vào report/log.
- Sau Owner đầu tiên, account quản trị tạo qua UI Owner; env bootstrap không tự reset password account có sẵn. Có thể gỡ secret bootstrap sau kiểm tra login bằng DB account.
- Rollout code cần migration additive trước. Không chạy branch lên DB chưa có migration; lỗi binding/schema phải trả infrastructure, không fallback legacy auth.
- Data rollback không DROP/reset bảng: giữ User IDs, sessions/audit/references; nếu lỗi, chặn admin traffic và sửa tiến, không âm thầm bật lại shared-secret authorization.
- Chưa có migration rollback phá dữ liệu; mọi thao tác DB dev/staging/remote cần kế hoạch tích hợp và backup riêng.

R08B autosave/scheduling và R08C SEO/301 giữ ở spec. Chưa triển khai, không gộp thành trạng thái “R08 hoàn thành”.
