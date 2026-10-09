# CITILAP E-COMMERCE — PRODUCTION & STAGING DEPLOYMENT RUNBOOK

> **Dự án:** `citilap-ecommerce`  
> **Phiên bản tài liệu:** 2026-10-10 (STORE-14.1)  
> **Target Runtimes:** Cloudflare Workers, Cloudflare D1, Cloudflare R2  
> **Tooling Baseline:** Wrangler `4.147.0`, Vinext `1.0.1`, Next.js `16.3.1`, React `19.2.8`, Prisma `7.9.1`  
> **Quy tắc tuyệt đối:** KHÔNG thực thi bất kỳ lệnh deploy nào lên remote hoặc thay đổi DNS `citilap.vn` khi chưa có sự phê duyệt bằng văn bản của chủ dự án.

---

## 1. MÔI TRƯỜNG & NGUYÊN TẮC CÁCH LY

| Tiêu chí | Môi trường Development (Local) | Môi trường Staging (Remote) | Môi trường Production (Remote) |
|---|---|---|---|
| **Worker Name** | `citilap-ecommerce` (local) | `citilap-ecommerce-staging` | `citilap-ecommerce-prod` |
| **D1 Database** | `citilap-db-dev` (local state) | `citilap-db-staging` | `citilap-db-prod` |
| **R2 Bucket** | `citilap-media-dev` (local state) | `citilap-media-staging` | `citilap-media-prod` |
| **URL Truy cập** | `http://localhost:3000` | `https://staging.citilap.vn` | `https://citilap.vn` |
| **Indexing** | `noindex` | `noindex` (X-Robots-Tag / robots.txt) | Cho phép index (trừ 6 trang chính sách DRAFT) |
| **Dữ liệu đơn hàng** | Dữ liệu test local | Dữ liệu kiểm thử nội bộ | Dữ liệu khách hàng thực tế |
| **Secrets / Keys** | Local test tokens | Staging credentials độc lập | Production credentials cấp cao nhất |

---

## 2. CHUẨN BỊ TÀI NGUYÊN CLOUDFLARE (CHỈ CHẠY KHI ĐƯỢC DUYỆT)

### 2.1 Tạo Cloudflare D1 Databases
```bash
# Tạo database Staging
npx wrangler d1 create citilap-db-staging

# Tạo database Production
npx wrangler d1 create citilap-db-prod
```
*Ghi lại `database_id` được in ra trong terminal (chuỗi UUID) và cập nhật vào `wrangler.jsonc` tại các trường `STAGING_D1_DB_ID_PLACEHOLDER` và `PROD_D1_DB_ID_PLACEHOLDER`.*

### 2.2 Tạo Cloudflare R2 Buckets
```bash
# Tạo bucket Staging
npx wrangler r2 bucket create citilap-media-staging

# Tạo bucket Production
npx wrangler r2 bucket create citilap-media-prod
```

### 2.3 Tạo Cloudflare Turnstile Widgets
1. Truy cập Cloudflare Dashboard -> **Turnstile** -> **Add Widget**.
2. **Staging Widget:**
   - Name: `CitiLap Staging`
   - Domain: `staging.citilap.vn` (và `localhost` nếu muốn test)
   - Widget Mode: Managed
3. **Production Widget:**
   - Name: `CitiLap Production`
   - Domain: `citilap.vn`
   - Widget Mode: Managed
4. Lưu lại Site Key và Secret Key của từng môi trường.

---

## 3. THIẾT LẬP SECRETS AN TOÀN (CLOUDFLARE SECRETS)

> [!WARNING]
> Tuyệt đối KHÔNG commit secrets vào Git hoặc lưu trong file `.env` trên repository. Mọi khóa bảo mật phải được nạp qua lệnh `wrangler secret put`.

### 3.1 Secrets cho Staging
```bash
npx wrangler secret put ADMIN_API_TOKEN --env staging
npx wrangler secret put ADMIN_EMAIL --env staging
npx wrangler secret put ADMIN_PASSWORD --env staging
npx wrangler secret put ADMIN_JWT_SECRET --env staging
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging
npx wrangler secret put RATE_LIMIT_PEPPER --env staging
```

### 3.2 Secrets cho Production
```bash
npx wrangler secret put ADMIN_API_TOKEN --env production
npx wrangler secret put ADMIN_EMAIL --env production
npx wrangler secret put ADMIN_PASSWORD --env production
npx wrangler secret put ADMIN_JWT_SECRET --env production
npx wrangler secret put TURNSTILE_SECRET_KEY --env production
npx wrangler secret put RATE_LIMIT_PEPPER --env production
```

---

## 4. QUY TRÌNH THỰC THI MIGRATION AN TOÀN

Wrangler sử dụng cấu hình `"migrations_dir": "d1-migrations"` được chỉ định trong `wrangler.jsonc`.

### 4.1 Áp dụng Migrations cho Staging
```bash
# 1. Kiểm tra danh sách migration đang chờ áp dụng trên Staging
npx wrangler d1 migrations list citilap-db-staging --remote --env staging

# 2. Thực thi áp dụng migrations (0001 đến 0008)
npx wrangler d1 migrations apply citilap-db-staging --remote --env staging
```

### 4.2 Áp dụng Migrations cho Production
```bash
# 1. SAO LƯU DATABASE TRƯỚC KHI MIGRATION (Bắt buộc nếu đã có dữ liệu)
npx wrangler d1 export citilap-db-prod --remote --output=./backups/backup-citilap-db-prod-pre-migrate.sql

# 2. Kiểm tra danh sách migration trên Production
npx wrangler d1 migrations list citilap-db-prod --remote --env production

# 3. Thực thi áp dụng migrations
npx wrangler d1 migrations apply citilap-db-prod --remote --env production
```

---

## 5. CHÍNH SÁCH DỮ LIỆU SEED VÀ NHẬP CATALOG

> [!CAUTION]
> **Tuyệt đối KHÔNG chạy `scripts/seed-development.sql` trên Production!**  
> File `scripts/seed-development.sql` chứa thông tin laptop mẫu, ảnh placeholder Unsplash và tồn kho giả lập dùng cho phát triển local.  
> Không tồn tại file `seed_production.sql`.

### Quy trình nạp Catalog Sản phẩm thật:
1. Đăng nhập vào trang Quản trị sau khi triển khai: `https://citilap.vn/login`.
2. Tạo danh mục và nhập từng dòng máy thật qua giao diện Admin (`/admin/products/new`).
3. Tải ảnh thực tế của showroom và máy lên Cloudflare R2 qua công cụ Media Manager.
4. Trường hợp nhập liệu hàng loạt: Chuẩn bị file SQL import chính thức được Giám đốc / Chủ dự án phê duyệt ký duyệt trước khi nạp qua `wrangler d1 execute`.

---

## 6. QUY TRÌNH BUILD & TRIỂN KHAI (DEPLOY)

### 6.1 Triển khai lên Staging
```bash
# 1. Clean build Vite/Vinext
npm run build:cloudflare

# 2. Deploy lên môi trường Staging
npm run cf:deploy -- --env staging
```

### 6.2 Triển khai lên Production (Sau khi Staging PASS 100%)
```bash
# 1. Clean build Vite/Vinext
npm run build:cloudflare

# 2. Deploy lên môi trường Production
npm run cf:deploy -- --env production
```

---

## 7. CẤU HÌNH DOMAIN, DNS VÀ SSL/TLS

### 7.1 Cấu hình Custom Domain trên Cloudflare Workers
1. Vào **Workers & Pages** -> Chọn `citilap-ecommerce-prod` -> **Settings** -> **Domains & Routes**.
2. Thêm Custom Domain: `citilap.vn`.
3. Cloudflare tự động tạo bản ghi DNS và cấp phát chứng chỉ SSL Universal.

### 7.2 Chuyển hướng `www.citilap.vn` về `citilap.vn` (Apex Canonical)
1. Thêm bản ghi CNAME `www` trỏ về `citilap.vn` với trạng thái **Proxied (Orange Cloud)**.
2. Vào **Rules** -> **Redirect Rules** -> Tạo quy tắc:
   - When incoming request matches: `Hostname eq "www.citilap.vn"`
   - Then redirect to: `https://citilap.vn` (Status code: 301 Permanent Redirect).

### 7.3 Cấu hình SSL/TLS
- Đặt chế độ SSL/TLS tại **SSL/TLS -> Overview**: **Full (Strict)**.
- Bật **Always Use HTTPS**.

---

## 8. KẾ HOẠCH ROLLBACK KHẨN CẤP (EMERGENCY ROLLBACK)

Trong trường hợp phát sinh lỗi nghiêm trọng sau khi triển khai:

### 8.1 Rollback Worker Deployment (Tức thì < 5 giây)
```bash
# 1. Xem lịch sử các deployment gần nhất
npx wrangler deployments list --env production

# 2. Rollback về phiên bản ổn định trước đó
npx wrangler rollback --env production
```

### 8.2 Khôi phục D1 Database từ bản sao lưu
```bash
# Khôi phục từ file export trước đó
npx wrangler d1 execute citilap-db-prod --remote --file=./backups/backup-citilap-db-prod-pre-migrate.sql
```
