# CITILAP — PROJECT CONTEXT

> **Phiên bản thực thi:** 2026-10-06  
> **Dự án:** `citilap-ecommerce`  
> **Ngôn ngữ tài liệu:** Tiếng Việt  
> **Mục đích:** Đây là tài liệu context chính cho toàn bộ AI/developer làm việc trên website Citilap. Tài liệu này mô tả mục tiêu sản phẩm, kiến trúc, UI/UX, dữ liệu, Cloudflare, quy tắc nghiệp vụ, cách làm việc với AI và thứ tự triển khai.  
> **Nguyên tắc ưu tiên:** Nếu code hiện tại, prompt cũ hoặc tài liệu cũ mâu thuẫn với tài liệu này thì tài liệu 2026-10-06 được ưu tiên.

---

# 1. TỔNG QUAN DỰ ÁN

Citilap là nền tảng thương mại điện tử tập trung vào:

- laptop gaming;
- laptop văn phòng/học tập;
- laptop mới;
- laptop like-new/đã qua sử dụng;
- MacBook;
- màn hình;
- linh kiện;
- phụ kiện;
- các sản phẩm công nghệ liên quan.

Website không chỉ là trang trưng bày sản phẩm mà là nền tảng bán hàng có khả năng phát triển tiếp thành:

- website khách hàng;
- trang quản trị;
- POS tại cửa hàng;
- quản lý nhiều kho;
- ứng dụng mobile;
- CRM;
- ERP/WMS;
- tích hợp vận chuyển;
- tích hợp thanh toán;
- đồng bộ marketplace;
- TikTok Shop/Shopee/Facebook;
- API cho đối tác;
- analytics;
- tìm kiếm/đề xuất bằng AI.

Phiên bản đầu tiên vẫn nên là **modular monolith**, không triển khai microservices sớm.

---

# 2. MỤC TIÊU HIỆN TẠI

Mục tiêu hiện tại là **hoàn thiện website Citilap để có thể đưa vào sử dụng thực tế**.

Không xây lại toàn bộ dự án từ đầu.

Thứ tự ưu tiên:

1. Hoàn thiện UI/UX storefront.
2. Chuẩn hóa design system.
3. Thay mock data bằng data thật.
4. Xây data layer thật trên Cloudflare ngay từ bây giờ.
5. Hoàn thiện product/category/search.
6. Hoàn thiện product detail.
7. Hoàn thiện cart/checkout/account.
8. Hoàn thiện admin cần thiết cho vận hành.
9. Kiểm tra SEO, responsive, accessibility và performance.
10. Hardening bảo mật, test, monitoring và deploy production.

Chiến lược tổng thể:

`UI hoàn chỉnh -> dữ liệu thật trên Cloudflare -> luồng mua hàng thật -> admin vận hành -> hardening -> production`

---

# 3. CÔNG CỤ AI VÀ CÁCH LÀM VIỆC

## 3.1 Công cụ hiện tại

Hiện tại dự án đang chủ yếu dùng:

- **Antigravity**
- **Gemini 3.8**

để hỗ trợ coding.

Đây chỉ là công cụ hiện tại, **không phải ràng buộc kiến trúc**.

Sau này có thể dùng:

- Gemini phiên bản khác;
- Codex;
- Claude;
- ChatGPT;
- agent khác;
- IDE/AI tool khác.

Vì vậy mọi prompt, tài liệu và kiến trúc phải **AI-agnostic**.

Không được thiết kế quy trình phụ thuộc vào riêng Antigravity hoặc Gemini.

## 3.2 Quy tắc cho AI coding agent

Trước mỗi task, AI phải:

1. Đọc file context này.
2. Kiểm tra code hiện tại.
3. Xác định component/module liên quan.
4. Không giả định code chưa đọc.
5. Không rewrite cả hệ thống nếu task chỉ yêu cầu sửa một phần.
6. Không thay đổi schema/API/domain rule khi chỉ đang sửa UI.
7. Không thêm dependency lớn nếu chưa cần.
8. Không tạo hệ thống song song khi đã có module tương đương.
9. Không thay data thật bằng mock để “làm cho UI chạy”.
10. Không hard-code logic nghiệp vụ trong component React.

Sau mỗi task phải báo cáo:

- mục tiêu;
- file đã sửa;
- hành vi thay đổi;
- migration nếu có;
- API thay đổi nếu có;
- test đã chạy;
- build/typecheck/lint;
- hạn chế còn lại;
- task tiếp theo.

Ưu tiên patch nhỏ, dễ review, dễ rollback.

---

# 4. STACK HIỆN TẠI VÀ ĐỊNH HƯỚNG

## 4.1 Frontend

Dùng:

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- Radix UI/shadcn hoặc component system nội bộ;
- Zod;
- React Hook Form khi cần.

Ưu tiên:

- Server Components khi phù hợp;
- SSR/SSG/ISR theo nhu cầu;
- tránh biến mọi component thành client component;
- SEO-friendly;
- mobile responsive;
- performance tốt.

## 4.2 Runtime production

Runtime mục tiêu:

- **Cloudflare Workers**

Website nên được chuẩn bị để chạy trên Workers ngay từ giai đoạn hiện tại.

Đối với Next.js hiện tại:

- ưu tiên hướng triển khai Cloudflare khuyến nghị hiện hành;
- hiện tại có thể đánh giá `vinext`;
- nếu một phần code hiện tại chưa tương thích thì giữ giải pháp tương thích tạm thời;
- không rewrite toàn bộ ứng dụng chỉ để đổi adapter hosting.

Mục tiêu là:

`Next.js application -> Cloudflare Workers`

---

# 5. CLOUDFLARE-FIRST ARCHITECTURE

Từ phiên bản context này, Citilap được định hướng **Cloudflare-native ngay từ giai đoạn phát triển hiện tại**.

Không còn chiến lược:

`mock/local trước -> sau này mới migrate Cloudflare`

Thay bằng:

`local dev tương thích Cloudflare -> staging Cloudflare -> production Cloudflare`

Các service chính ưu tiên sử dụng toàn bộ hệ sinh thái Cloudflare khi phù hợp.

---

# 6. CLOUDFLARE D1 — DATABASE CHÍNH

## 6.1 Quyết định kiến trúc

**Cloudflare D1 là database production mặc định của dự án.**

Không còn mặc định PostgreSQL.

Schema mới phải được thiết kế theo D1/SQLite ngay từ bây giờ.

Mock data hiện tại phải dần được thay bằng D1 thật.

## 6.2 ORM

Có thể tiếp tục dùng Prisma nếu tương thích tốt.

Hướng ưu tiên:

- Prisma schema theo SQLite/D1;
- `@prisma/adapter-d1`;
- migrations bằng SQL;
- không dùng feature PostgreSQL-specific;
- không giả định row lock/PostgreSQL semantics.

Nếu Prisma tạo friction lớn với D1 ở một module nào đó thì có thể:

- dùng D1 prepared statements trực tiếp;
- tạo repository abstraction;
- vẫn giữ domain service độc lập với query implementation.

## 6.3 Nguyên tắc thiết kế schema D1

Phải ưu tiên:

- khóa chính rõ ràng;
- unique constraint;
- foreign key phù hợp;
- index cho query thật;
- integer cho money;
- UTC timestamp;
- enum dưới dạng code/text ổn định;
- soft delete cho business record khi phù hợp;
- migration có version;
- không sửa database production thủ công.

Không dùng `Float` cho tiền.

VND lưu số nguyên theo đồng.

Ví dụ:

`24.000.000 VND -> 24000000`

---

# 7. CLOUDFLARE R2 — STORAGE CHÍNH

## 7.1 Quyết định

Toàn bộ media production dùng:

- **Cloudflare R2**

Không lưu ảnh upload production vào:

- `public/uploads`;
- local disk;
- filesystem của Worker.

## 7.2 Nội dung lưu trên R2

Bao gồm:

- ảnh sản phẩm;
- ảnh variant;
- ảnh serial/unit nếu cần;
- video sản phẩm;
- ảnh bài viết;
- banner;
- ảnh review;
- tài liệu/invoice export nếu phù hợp;
- file import/export tạm nếu cần.

## 7.3 Luồng upload

Luồng mong muốn:

`Admin -> API xác thực -> validate -> R2 -> public/custom CDN URL -> Website`

Phải validate:

- MIME/type thực tế;
- extension;
- kích thước file;
- kích thước ảnh;
- quyền upload;
- object key;
- metadata.

Không tin filename từ client.

---

# 8. CÁC DỊCH VỤ CLOUDFLARE KHÁC

## 8.1 KV

Cloudflare KV dùng cho dữ liệu đọc nhiều, không mang tính giao dịch.

Ví dụ:

- feature flags;
- cấu hình public cache;
- cache navigation;
- cache category metadata;
- cache search suggestion;
- settings ít thay đổi;
- rate-limit metadata đơn giản nếu phù hợp.

Không dùng KV làm source of truth cho:

- inventory;
- order;
- payment;
- reservation;
- serial;
- customer balance.

## 8.2 Queues

Cloudflare Queues dùng cho job bất đồng bộ:

- email;
- notification;
- xử lý ảnh;
- import/export;
- invoice;
- shipping sync;
- marketplace sync;
- analytics event processing;
- background jobs khác.

Không để job nặng block request checkout.

## 8.3 Cron Triggers

Dùng cho:

- release reservation hết hạn;
- hết hạn promotion;
- refresh sitemap;
- shipping sync;
- cleanup;
- kiểm tra dữ liệu định kỳ;
- report theo lịch.

## 8.4 Turnstile

Dùng khi cần chống bot cho:

- đăng nhập;
- đăng ký;
- forgot password;
- form public;
- review;
- contact;
- hành vi có nguy cơ spam.

Không ép captcha vào mọi request.

## 8.5 WAF

Dùng cho production:

- firewall;
- bot/rate control;
- rule bảo vệ endpoint nhạy cảm;
- bảo vệ admin;
- chống request bất thường.

## 8.6 Cloudflare Images

Có thể dùng nếu giúp đơn giản hóa:

- resize;
- responsive images;
- WebP/AVIF;
- transformation.

Nếu pipeline R2 + image processing đã đủ thì không bắt buộc dùng Images.

## 8.7 Durable Objects

Chỉ dùng khi có bài toán coordination/state thực sự cần.

Ví dụ có thể cân nhắc:

- lock/coordination đặc biệt;
- realtime room;
- coordination cho một resource có contention cao.

Không dùng Durable Objects chỉ vì “Cloudflare có service này”.

## 8.8 Analytics/Observability

Ưu tiên các khả năng Cloudflare phù hợp để theo dõi:

- request;
- latency;
- error;
- Worker logs;
- queue failures;
- cron failures;
- D1 query;
- R2 operations.

Nếu cần error tracking chuyên sâu ngoài Cloudflare thì phải được quyết định riêng.

---

# 9. NGUYÊN TẮC KIẾN TRÚC CỐT LÕI

Các nguyên tắc này là bắt buộc.

1. API-first.
2. Frontend không phải source of truth cho giá.
3. Frontend không phải source of truth cho tồn kho.
4. Business logic quan trọng nằm ở server/domain layer.
5. Product phải hỗ trợ Variant/SKU.
6. Laptop vật lý phải có khả năng hỗ trợ Serial Unit.
7. Inventory thay đổi phải có history/transaction.
8. Order phải snapshot dữ liệu lịch sử.
9. Các write operation quan trọng phải idempotent.
10. Không bán cùng một physical unit hai lần.
11. Admin authorization phải kiểm tra server-side.
12. Hành động quản trị quan trọng phải có audit log.
13. Payment và shipping dùng abstraction.
14. Media dùng R2/object storage.
15. Database thay đổi qua migration.
16. Public page phải SEO-friendly.
17. Modular monolith trước.
18. Không microservice hóa sớm.
19. Code domain không phụ thuộc trực tiếp vào UI framework.
20. Cloudflare là infrastructure mặc định, nhưng domain vẫn phải sạch và testable.

---

# 10. DOMAIN MODEL SẢN PHẨM

Không mô hình hóa sản phẩm chỉ bằng:

`Tên + giá + ảnh + mô tả`

Mô hình logic:

`Product -> Variant/SKU -> Serial Unit -> Price -> Inventory -> Order Snapshot`

## Product

Đại diện model/sản phẩm công khai.

Ví dụ:

`Lenovo Legion 5 2023 R7000`

## Variant/SKU

Đại diện cấu hình có thể bán.

Ví dụ:

`R7-7840H / 16GB / 512GB / RTX 4060`

## Serial Unit

Đại diện máy vật lý thực tế.

Cần cho laptop cũ/like-new.

Có thể có:

- serial;
- condition;
- ngoại hình;
- battery;
- repair history;
- cost;
- warehouse;
- trạng thái.

Không phải product nào cũng bắt buộc hiển thị serial trên website, nhưng backend phải hỗ trợ.

---

# 11. THÔNG SỐ LAPTOP

Hệ thống specs phải mở rộng được.

## CPU

- hãng;
- model;
- generation;
- core;
- thread;
- base clock;
- boost clock.

## GPU

- model;
- VRAM;
- TGP;
- integrated/dedicated.

## RAM

- capacity;
- type;
- bus;
- slot;
- khả năng nâng cấp.

## SSD/Storage

- capacity;
- type;
- interface;
- slot;
- nâng cấp.

## Display

- size;
- resolution;
- panel;
- refresh rate;
- brightness;
- color gamut;
- touch.

## Khác

- Wi‑Fi;
- Bluetooth;
- USB;
- Thunderbolt/USB4;
- HDMI;
- LAN;
- webcam;
- keyboard;
- battery;
- weight;
- dimensions.

Không redesign schema mỗi lần cần thêm một thông số nhỏ.

---

# 12. TÌNH TRẠNG SẢN PHẨM

Hỗ trợ các code ổn định như:

- NEW
- LIKE_NEW
- USED
- REFURBISHED
- REPAIRED
- LIQUIDATION
- DAMAGED

UI hiển thị label tiếng Việt.

Ví dụ:

- Mới 100%
- Like New 99%
- Đã qua sử dụng

Với máy cũ có thể lưu:

- ngoại hình;
- xước;
- pin;
- cycle;
- màn hình;
- bàn phím;
- bản lề;
- mainboard;
- CPU/GPU;
- phụ kiện;
- lịch sử sửa chữa.

---

# 13. INVENTORY VÀ SERIAL

Hệ thống phải hỗ trợ nhiều kho ngay từ data model.

Ví dụ:

- Bắc Ninh;
- Hà Nội;
- TP.HCM;
- kho trung tâm;
- kho bảo hành/sửa chữa.

Trạng thái inventory/unit có thể gồm:

- AVAILABLE
- RESERVED
- SOLD
- IN_TRANSIT
- REPAIR
- DAMAGED
- RETURNING
- RETURNED

Mọi thay đổi inventory phải tạo record lịch sử.

Ví dụ transaction:

- IMPORT
- SALE
- RETURN
- TRANSFER
- ADJUSTMENT
- REPAIR
- DAMAGED
- RESERVED
- RELEASED

Không silently update stock.

---

# 14. CONCURRENCY VỚI D1

Đây là phần bắt buộc phải test kỹ.

Nếu còn đúng một máy:

- hai khách không được mua thành công cùng lúc.

Không được copy cơ chế PostgreSQL row lock cũ sang D1 một cách máy móc.

Phải thiết kế phù hợp SQLite/D1.

Ưu tiên:

- atomic conditional update;
- unique constraint;
- transaction/batch khi phù hợp;
- idempotency record;
- state machine rõ ràng.

Flow cơ bản:

`AVAILABLE -> RESERVED -> SOLD`

Nếu reservation hết hạn:

`RESERVED -> AVAILABLE`

Phải có test race condition thật.

---

# 15. ORDER

Trạng thái order có thể gồm:

- PENDING
- CONFIRMED
- PROCESSING
- PACKING
- SHIPPING
- DELIVERED
- COMPLETED
- CANCELLED
- RETURNED
- REFUNDED

Order phải có history append-only.

Không overwrite lịch sử trạng thái.

Order item phải snapshot:

- product name;
- SKU;
- serial nếu có;
- unit price;
- discount;
- final price;
- cấu hình hiển thị cần thiết.

Sau này sửa product không được làm thay đổi order cũ.

---

# 16. IDEMPOTENCY

Các operation quan trọng phải idempotent:

- create order;
- payment;
- refund;
- shipment;
- một số inventory mutation.

Retry cùng một request không được tạo:

- duplicate order;
- duplicate payment;
- duplicate refund;
- duplicate reservation.

---

# 17. PAYMENT

Không hard-code một payment provider vào Order domain.

Tạo abstraction:

`PaymentProvider`

Giai đoạn đầu ưu tiên:

- COD;
- chuyển khoản ngân hàng.

Sau này có thể thêm:

- VNPay;
- MoMo;
- ZaloPay;
- provider khác.

Payment state:

- PENDING
- AUTHORIZED
- PAID
- FAILED
- REFUNDED
- CANCELLED

---

# 18. SHIPPING

Tạo abstraction:

`ShippingProvider`

Có thể hỗ trợ:

- manual;
- GHN;
- GHTK;
- Viettel Post;
- J&T;
- provider khác.

Operation:

- quote;
- create;
- cancel;
- track.

UI không chứa logic riêng của từng provider.

---

# 19. AUTH VÀ RBAC

Customer auth có thể gồm:

- email/password;
- phone/OTP;
- Google;
- reset password;
- session.

Admin cần:

- login riêng;
- session management;
- 2FA khi triển khai;
- logout all;
- login history.

RBAC phải server-side.

Ví dụ role:

- Super Admin;
- Admin;
- Manager;
- Product Manager;
- Order Manager;
- Warehouse;
- Customer Support;
- Content Editor;
- Marketing;
- Accountant.

Permission dạng granular:

- product.read
- product.create
- product.update
- product.archive
- order.read
- order.update
- order.cancel
- inventory.read
- inventory.update
- customer.read
- customer.update
- content.create
- content.publish

Ẩn button trên UI không phải authorization.

---

# 20. AUDIT LOG

Các hành động quan trọng phải log:

- đổi giá;
- archive product;
- sửa tồn kho;
- đổi trạng thái order;
- cancel;
- refund;
- đổi role;
- publish article;
- thay đổi cấu hình hệ thống.

Audit log nên lưu:

- actor;
- action;
- resource;
- resource ID;
- before;
- after;
- IP khi phù hợp;
- user agent;
- timestamp;
- request ID.

---

# 21. API

API dùng version:

`/api/v1`

Response chuẩn:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "details": {}
  }
}
```

Dùng:

- Zod validation;
- typed request/response;
- pagination;
- structured errors;
- request ID.

Không return toàn bộ bảng lớn không pagination.

---

# 22. UI/UX — ĐỊNH HƯỚNG CHUNG

Website Citilap phải có cảm giác:

- hiện đại;
- sạch;
- chuyên nghiệp;
- đúng chất retail công nghệ;
- dễ quét thông tin;
- phù hợp thị trường Việt Nam;
- ưu tiên laptop gaming và laptop like-new.

Tham khảo website khác về UX được phép, nhưng không clone.

Tránh:

- border quá dày;
- quá nhiều màu accent;
- quá nhiều gradient;
- card mỗi chỗ một kiểu;
- banner chiếm quá nhiều không gian;
- hiệu ứng animation không cần thiết;
- UI giống dashboard admin trên trang khách;
- quá nhiều badge.

---

# 23. DESIGN SYSTEM

Trước khi sửa quá nhiều page rời rạc, phải thống nhất:

- color tokens;
- typography;
- spacing;
- container width;
- radius;
- shadow;
- border;
- surface hierarchy;
- breakpoint;
- buttons;
- inputs;
- select;
- checkbox;
- radio;
- badge;
- card;
- tabs;
- modal;
- drawer;
- toast;
- skeleton;
- empty state;
- error state;
- price component;
- stock component;
- condition component.

Không lặp arbitrary Tailwind value khắp project nếu có thể dùng token.

---

# 24. PRODUCT CARD

ProductCard đã được redesign theo hướng retail công nghệ sạch hơn.

Phải tiếp tục duy trì các trường business quan trọng:

- model/dòng máy;
- CPU;
- GPU;
- RAM;
- SSD;
- màn hình;
- tình trạng;
- giá;
- giá cũ/discount;
- stock;
- warranty.

Thứ tự ưu tiên hiển thị:

1. ảnh;
2. tên/model;
3. CPU/GPU;
4. RAM/SSD/display;
5. condition/warranty/stock;
6. giá;
7. CTA.

Không nhồi tất cả specification lên card.

---

# 25. RESPONSIVE

Mọi public page phải kiểm tra ít nhất:

- 360 px;
- 390 px;
- 768 px;
- 1024 px;
- 1440 px;
- desktop lớn.

Không được:

- horizontal overflow;
- chữ tràn;
- nút quá nhỏ;
- filter unusable;
- sticky element che nội dung;
- modal vượt viewport.

---

# 26. UI STATES

Mọi màn hình data-driven phải xử lý:

- loading;
- skeleton;
- empty;
- error;
- unavailable;
- out of stock;
- disabled;
- success;
- retry khi phù hợp.

Không chỉ thiết kế happy path.

---

# 27. HOMEPAGE

Homepage phải phục vụ bán hàng và discovery.

Ưu tiên:

- hero/promotion;
- category shortcuts;
- featured products;
- gaming;
- văn phòng/học tập;
- like-new;
- best value/sale;
- brand discovery;
- trust/policy;
- blog/news nếu hữu ích.

Tránh nhiều carousel cạnh tranh với nhau.

Về lâu dài homepage sections nên CMS-configurable.

---

# 28. CATEGORY / PRODUCT LISTING

Filter cần hỗ trợ:

- category;
- brand;
- price;
- CPU;
- GPU;
- RAM;
- SSD;
- display;
- refresh rate;
- condition.

Sorting:

- mới nhất;
- giá thấp -> cao;
- giá cao -> thấp;
- bán chạy;
- nổi bật.

UX:

- filter state nằm trong URL;
- refresh không mất filter;
- share URL giữ kết quả;
- mobile filter drawer;
- active filter chips;
- clear all;
- result count;
- empty results;
- pagination/cursor rõ ràng.

---

# 29. SEARCH

Search là tính năng cốt lõi.

Search theo:

- product name;
- model;
- SKU;
- brand;
- CPU;
- GPU.

UX mong muốn:

- autocomplete;
- keyboard navigation;
- no-result suggestions;
- recent search;
- popular search;
- typo tolerance khi có thể.

Giai đoạn đầu có thể dùng query D1 + index phù hợp.

Không thêm search engine ngoài Cloudflare nếu chưa chứng minh cần.

---

# 30. PRODUCT DETAIL

PDP phải có:

- gallery;
- video nếu có;
- title;
- SKU/model;
- current price;
- old price;
- discount;
- condition;
- stock;
- warranty;
- specs chính;
- specs đầy đủ;
- accessories;
- shipping;
- payment info;
- related products;
- reviews khi bật;
- add to cart;
- buy now;
- contact.

Với máy like-new/used:

- condition notes rõ;
- có thể hiển thị ngoại hình/đặc điểm;
- không biến PDP thành màn QC nội bộ.

---

# 31. CART

Cart phải hiển thị:

- sản phẩm;
- variant/SKU;
- quantity nếu áp dụng;
- current validated price;
- discount;
- subtotal;
- stock status;
- price change nếu có;
- remove/update.

Server phải validate lại giá và stock.

Không tin payload client.

---

# 32. CHECKOUT

Flow đề xuất:

1. Thông tin khách.
2. Địa chỉ/giao nhận.
3. Shipping method.
4. Payment method.
5. Server-calculated order summary.
6. Confirm.
7. Success/failure/retry.

Ưu tiên UX nhanh và phù hợp Việt Nam.

COD/chuyển khoản là P0.

---

# 33. CUSTOMER ACCOUNT

P0:

- profile;
- addresses;
- order history;
- order detail;
- tracking;
- wishlist.

P1/P2:

- loyalty;
- advanced CRM;
- membership;
- segmentation.

---

# 34. ADMIN

Admin MVP cần:

- authentication;
- dashboard;
- products;
- variants/SKU;
- categories;
- brands;
- inventory;
- serial;
- orders;
- customers;
- media;
- banners;
- blog/content;
- settings;
- RBAC.

Admin UI là công cụ vận hành, ưu tiên hiệu quả hơn trang trí.

---

# 35. CMS

Hỗ trợ:

- post;
- category;
- tag;
- author;
- draft;
- publish;
- schedule;
- SEO;
- thumbnail.

Editor có thể hỗ trợ:

- heading;
- text;
- image;
- video;
- table;
- link;
- quote;
- FAQ;
- product embed.

HTML phải sanitize.

---

# 36. HOMEPAGE PAGE BUILDER

Về sau admin có thể quản lý block:

- hero;
- product slider;
- product grid;
- category grid;
- banner;
- text;
- image;
- video;
- blog;
- FAQ;
- promotion.

Không cần developer deploy chỉ để đổi thứ tự block.

---

# 37. PROMOTION

Có thể hỗ trợ:

- phần trăm;
- fixed amount;
- coupon;
- min order;
- product scope;
- category scope;
- brand scope;
- customer scope;
- date range;
- usage limit.

Sau này:

- Buy X Get Y;
- combo;
- flash sale;
- member price;
- tier price.

Discount phải tính server-side.

Applied promotion phải snapshot vào order.

---

# 38. REVIEWS

Customer có thể gửi:

- rating 1-5;
- text;
- image;
- video.

Admin:

- approve;
- hide;
- delete/archive;
- reply.

Có thể yêu cầu verified purchase.

Review media dùng R2.

---

# 39. SEO

Mỗi entity public hỗ trợ:

- slug;
- meta title;
- meta description;
- canonical;
- OG title;
- OG description;
- OG image.

Hỗ trợ:

- sitemap;
- robots.txt;
- Product structured data;
- Breadcrumb;
- Article;
- Organization.

Slug đổi phải có redirect 301.

Draft/private không index.

---

# 40. MEDIA

Production media:

`R2 -> CDN/custom domain -> Website`

Cần:

- responsive size;
- WebP/AVIF khi pipeline hỗ trợ;
- thumbnail;
- lazy loading;
- width/height;
- cache;
- alt text;
- không layout shift.

---

# 41. PERFORMANCE

Target:

- LCP < 2.5s cho trang quan trọng trong profile test đã thống nhất;
- API nhanh trong giới hạn thực tế;
- giảm JS client;
- optimized images;
- cache hợp lý;
- tránh N+1;
- index query;
- không fetch dư;
- không render lại không cần thiết.

Cloudflare cache chỉ cache dữ liệu phù hợp.

Không cache sai:

- cart;
- account;
- inventory realtime;
- checkout response;
- data user-specific.

---

# 42. ACCESSIBILITY

Bắt buộc kiểm tra:

- keyboard;
- focus;
- label;
- alt;
- aria khi cần;
- button semantics;
- link semantics;
- contrast;
- dialog focus;
- mobile touch target.

Không đặt button bên trong link hoặc ngược lại sai semantics.

---

# 43. SECURITY

Baseline:

- HTTPS;
- secure auth;
- password hashing;
- httpOnly cookie khi phù hợp;
- SameSite;
- CSRF protection;
- CORS;
- validation;
- authorization;
- RBAC;
- rate limiting;
- Turnstile khi cần;
- upload validation;
- XSS protection;
- SQL injection protection;
- secret management;
- audit logs;
- WAF;
- admin protection.

Không commit secret.

Bindings và secret dùng Cloudflare environment/config.

---

# 44. ENVIRONMENTS

Tối thiểu:

- local/development;
- staging;
- production.

Mỗi environment dùng resource riêng:

- D1 riêng;
- R2 riêng;
- KV riêng nếu cần;
- Queue riêng;
- secrets riêng.

Không dùng production database để test UI.

---

# 45. CI/CD

Flow mong muốn:

`Git -> PR -> lint -> typecheck -> test -> build -> staging -> approval -> production`

Có migration check.

Production deploy phải có rollback plan.

Không test experimental code trực tiếp production.

---

# 46. TESTING

## Unit

Test:

- money;
- pricing;
- promotion;
- order status;
- reservation expiry;
- validation.

## Integration

Test:

- create order;
- reserve stock;
- order rollback;
- idempotency;
- payment callback;
- shipment;
- D1 transaction/batch behavior.

## Concurrency

Bắt buộc:

- 1 serial AVAILABLE;
- 2 checkout đồng thời;
- chỉ 1 thành công;
- không double sell.

## API

Test:

- auth;
- authorization;
- validation;
- pagination;
- errors;
- idempotency.

## E2E

Customer:

`Search -> Product -> Cart -> Checkout -> COD -> Order`

Admin:

`Create Product -> Publish -> Storefront verify`

---

# 47. OBSERVABILITY

Cần có:

- request ID;
- structured logs;
- Worker error logs;
- D1 errors;
- queue failures;
- cron failures;
- checkout failures;
- payment failures;
- latency;
- health/readiness.

Một lỗi order phải có đủ thông tin để trace mà không phải đoán.

---

# 48. BACKUP / RECOVERY

Trước production phải có:

- D1 backup/export strategy;
- media retention;
- restore test;
- documented recovery steps;
- migration rollback/forward policy.

Không coi backup là “có config là xong”.

Phải test restore.

---

# 49. DATA MOCK HIỆN TẠI

Dự án hiện vẫn có nhiều mock data.

Mock được phép dùng cho:

- Story/demo;
- local fixtures;
- tests;
- seed data.

Mock không được dùng làm production fallback.

Khi một feature được nối D1:

- nếu binding/config lỗi -> trả controlled error;
- không silently chuyển sang `mock-data.ts`.

Mục tiêu hiện tại là chuyển từng module từ mock sang D1, bắt đầu từ dữ liệu cần cho storefront.

---

# 50. BASELINE HIỆN TẠI

Theo context trước đó, project đã có:

## Storefront

- home;
- category;
- product;
- search;
- cart;
- checkout;
- profile;
- wishlist;
- news;
- policies.

Trạng thái: **PARTIAL**.

## Admin

- dashboard;
- products;
- categories;
- customers;
- orders;
- settings.

Trạng thái: **PARTIAL**.

## API

Đã có một số route:

- product;
- category;
- order;
- customer;
- dashboard;
- upload;
- metadata/version;
- scheduler.

Cần chuẩn hóa.

## Database

Hiện code có Prisma + SQLite/libSQL-like direction.

Đây là lợi thế để chuyển sang D1.

Không chuyển sang PostgreSQL.

## Cart/Wishlist

Một phần vẫn localStorage.

## Media

Một phần vẫn local filesystem.

Phải chuyển sang R2.

## Test/Ops

Chưa hoàn chỉnh.

---

# 51. ROADMAP THỰC THI MỚI

## Phase 0 — Audit code hiện tại

Mục tiêu:

- hiểu đúng code trước khi sửa.

Thực hiện:

- inventory route/page;
- inventory components;
- xác định design tokens;
- tìm mock data;
- tìm localStorage;
- tìm local uploads;
- liệt kê API;
- liệt kê DB access;
- lint;
- typecheck;
- build;
- ghi lại lỗi.

Output:

`CURRENT_STATE.md` hoặc section tương đương.

---

## Phase 1 — Cloudflare Foundation

Làm ngay từ đầu, không đợi UI xong.

### CF1.1 Wrangler / bindings

Thiết lập:

- Worker app config;
- D1 binding;
- R2 binding;
- env separation;
- secret handling;
- generated types.

### CF1.2 D1

- tạo D1 dev;
- migrations;
- seed;
- repository/data layer;
- Prisma D1 adapter nếu dùng Prisma.

### CF1.3 R2

- bucket dev;
- storage service;
- upload API;
- URL strategy.

### CF1.4 Các service nền cần thiết

Chỉ tạo khi task cần:

- KV;
- Queue;
- Cron;
- Turnstile.

Không over-engineer.

---

## Phase 2 — Design System

Chuẩn hóa:

- color;
- typography;
- spacing;
- radius;
- shadow;
- layout;
- responsive;
- components;
- loading/error/empty states.

---

## Phase 3 — Storefront Shell

Hoàn thiện:

- header;
- nav;
- search entry;
- mobile nav;
- cart;
- account;
- footer;
- breadcrumb;
- trust/policy.

---

## Phase 4 — Catalog + Homepage

D1 thật cho:

- categories;
- brands;
- products;
- variants;
- prices;
- product images.

Homepage đọc data thật.

Không mock fallback production.

---

## Phase 5 — Product Listing + Search

- filters;
- sort;
- URL state;
- mobile drawer;
- D1 query/index;
- autocomplete.

---

## Phase 6 — Product Detail

- real product data;
- R2 gallery;
- variants;
- stock;
- condition;
- specs;
- warranty;
- related products;
- SEO.

---

## Phase 7 — Cart

- guest cart;
- server revalidation;
- D1 cart nếu account/flow yêu cầu;
- price validation;
- stock validation.

---

## Phase 8 — Checkout + Orders

- checkout UI;
- customer snapshot;
- order snapshot;
- inventory reservation;
- concurrency-safe logic;
- idempotency;
- COD;
- bank transfer.

---

## Phase 9 — Account

- auth;
- profile;
- addresses;
- orders;
- tracking;
- wishlist.

---

## Phase 10 — Admin vận hành

- auth/RBAC;
- product;
- category;
- brand;
- inventory;
- serial;
- order;
- customer;
- R2 media;
- content;
- audit.

---

## Phase 11 — CMS/Promotion/Reviews

Làm sau core commerce.

---

## Phase 12 — Hardening

- tests;
- concurrency tests;
- security;
- SEO audit;
- accessibility;
- Core Web Vitals;
- Cloudflare WAF/Turnstile;
- logs;
- backup;
- restore;
- CI/CD.

---

# 52. THỨ TỰ TRIỂN KHAI NGAY TỪ BÂY GIỜ

Không làm kiểu:

`UI mock hoàn chỉnh -> sau đó mới nghĩ database`

Thay bằng hai track song song có kiểm soát:

### Track A — UI

`Audit -> Design System -> Home -> Listing -> PDP -> Cart -> Checkout -> Account`

### Track B — Cloudflare/Data

`Workers foundation -> D1 -> R2 -> Catalog real data -> Inventory/Order -> Queues/Cron khi cần`

Hai track gặp nhau ở từng feature.

Ví dụ Product Listing:

- UI filter;
- D1 schema;
- D1 query;
- API;
- UI;
- test;

được hoàn thiện thành một vertical slice.

---

# 53. DEFINITION OF DONE CHO FEATURE

Một feature không DONE chỉ vì UI đẹp.

Feature chỉ DONE khi các phần phù hợp đã có:

- database;
- migration;
- server/domain;
- API;
- UI;
- validation;
- authorization;
- error handling;
- loading;
- empty state;
- responsive;
- accessibility;
- SEO nếu public;
- tests;
- logging;
- documentation;
- Cloudflare binding/config nếu cần.

---

# 54. DEFINITION OF DONE CHO PAGE STOREFRONT

Một page public cần đạt:

- data thật hoặc fixture chỉ ở development;
- không production mock fallback;
- responsive;
- mobile usable;
- loading;
- empty;
- error;
- out-of-stock;
- keyboard;
- accessibility;
- SEO;
- optimized media;
- không obvious CLS;
- build pass;
- typecheck pass;
- không làm hỏng flow hiện tại.

---

# 55. P0 — RELEASE ĐẦU TIÊN

Bắt buộc:

- storefront end-to-end;
- D1 data thật;
- R2 media thật;
- product/category/search;
- price/stock server-side;
- cart;
- checkout;
- COD/bank transfer;
- order persistence;
- order history;
- inventory protection;
- admin access;
- basic RBAC;
- SEO basics;
- monitoring;
- backup/restore;
- production không mock fallback.

---

# 56. P1

Sau release đầu:

- promotion nâng cao;
- reviews;
- wishlist sync;
- advanced search;
- shipping automation;
- payment gateway;
- analytics nâng cao;
- CMS nâng cao.

---

# 57. P2

Không chặn launch:

- loyalty;
- membership;
- CRM;
- POS;
- mobile app;
- ERP/WMS sâu;
- marketplace sync;
- recommendation AI;
- AI customer support.

---

# 58. QUY TẮC KHÔNG ĐƯỢC PHÁ VỠ

1. Không double-sell một serial.
2. Không tin price từ browser.
3. Không tin stock từ browser.
4. Không sửa order history theo product hiện tại.
5. Không delete business record quan trọng nếu lịch sử đang tham chiếu.
6. Không bypass RBAC qua API.
7. Không upload production vào local disk.
8. Không dùng mock fallback ở production.
9. Không tạo schema chỉ để phục vụ một layout UI tạm thời.
10. Không để AI rewrite toàn bộ module nếu task không yêu cầu.
11. Không đưa PostgreSQL-specific assumption vào D1 code.
12. Không dùng KV cho transactional data.
13. Không dùng client-only state làm source of truth cho order/inventory.
14. Không hard-code provider-specific logic vào domain.
15. Không deploy migration production chưa có kiểm tra.

---

# 59. QUY TẮC CHO D1

Khi code D1:

- dùng prepared statements;
- dùng index;
- tránh query quá rộng;
- tránh N+1;
- hiểu SQLite semantics;
- dùng batch/transaction phù hợp;
- test constraint;
- test concurrency;
- test idempotency;
- benchmark query listing/search;
- không copy SQL PostgreSQL không tương thích.

Mọi migration phải lưu trong repo.

---

# 60. QUY TẮC CHO R2

Object key cần predictable nhưng không phụ thuộc filename user.

Ví dụ:

`products/{productId}/{uuid}.webp`

hoặc:

`products/{productId}/original/{uuid}`

Metadata DB lưu:

- key;
- bucket;
- mime;
- width;
- height;
- size;
- sort order;
- alt;
- entity reference.

DB không lưu file binary.

---

# 61. LOCAL DEVELOPMENT

Local dev phải mô phỏng production càng sát càng tốt.

Ưu tiên:

- Wrangler;
- local D1;
- local bindings;
- development R2 strategy phù hợp;
- `.dev.vars`/secret local;
- migration giống production.

Không xây hai code path hoàn toàn khác nhau:

`local SQLite code A`
`production D1 code B`

Một data access layer nên chạy được ở cả hai.

---

# 62. CONFIGURATION

Business configuration không hard-code.

Ví dụ:

- website name;
- hotline;
- email;
- social;
- order prefix;
- VAT;
- shipping;
- payment;
- warranty;
- store location.

Config transactional/quan trọng có thể nằm D1.

Read-heavy public config có thể cache KV.

Secret không nằm DB public/config.

---

# 63. MULTI-CHANNEL

Sau này cùng một source of truth phục vụ:

- website;
- admin;
- POS;
- mobile;
- Facebook;
- TikTok;
- Shopee;
- partner API.

Không tạo inventory riêng cho từng channel.

---

# 64. ANALYTICS EVENTS

Chuẩn bị event abstraction:

- view_item;
- search;
- add_to_cart;
- begin_checkout;
- purchase;
- refund.

Không hard-code analytics vendor vào mọi component.

---

# 65. DOMAIN EVENTS

Có thể chuẩn bị internal events:

- ProductCreated;
- ProductUpdated;
- StockChanged;
- OrderCreated;
- OrderConfirmed;
- OrderPaid;
- OrderShipped;
- OrderDelivered;
- OrderCancelled;
- PaymentSucceeded;
- PaymentFailed;
- CustomerCreated.

Ban đầu có thể dùng internal event + Queue khi cần.

Không cần Kafka/RabbitMQ.

---

# 66. REPOSITORY STRUCTURE — ĐỊNH HƯỚNG

Có thể duy trì app hiện tại và dần tách boundaries.

Ví dụ:

```text
src/
  app/
  components/
  domain/
    products/
    inventory/
    orders/
    customers/
    payments/
    shipping/
  server/
    services/
    repositories/
  infra/
    cloudflare/
      d1/
      r2/
      kv/
      queues/
  lib/
    validation/
    config/
```

Không bắt buộc rename toàn bộ repo ngay.

Mục tiêu là dependency direction rõ ràng.

---

# 67. CLOUDLFARE BINDINGS — QUY ƯỚC

Tên binding nên rõ và ổn định.

Ví dụ:

```text
DB
PRODUCT_MEDIA
CACHE
EMAIL_QUEUE
```

Tên cụ thể có thể thay đổi theo repo.

Phải generate TypeScript types từ Wrangler config khi có thể.

Không dùng `any` để né binding types.

---

# 68. UI AUDIT — TASK TIẾP THEO

Task tiếp theo nên là:

**UI-0 — Audit toàn bộ storefront hiện tại**

AI cần đọc repo và tạo báo cáo:

1. Tất cả routes.
2. Tất cả storefront pages.
3. Components dùng chung.
4. Design tokens hiện có.
5. ProductCard hiện tại.
6. Header/footer.
7. Mock data locations.
8. localStorage usage.
9. API hiện tại.
10. Prisma/database usage.
11. local uploads.
12. responsive issues.
13. accessibility issues.
14. SEO gaps.
15. component duplication.
16. dead code.
17. top 10 task cần làm tiếp.

Không sửa lớn trước khi hoàn thành audit này.

---

# 69. FORMAT TASK CHO AI

Mỗi task nên được viết dạng:

```text
Task:
Mục tiêu:

Context liên quan:
Phạm vi:
Không làm:

Files cần inspect trước:

Yêu cầu UI:
Yêu cầu data/API:
Yêu cầu Cloudflare:
Yêu cầu responsive:
Yêu cầu accessibility:

Acceptance criteria:

Verification:
- lint
- typecheck
- tests
- build

Output report:
- files changed
- behavior changed
- migration
- tests
- limitations
- next task
```

---

# 70. NGUYÊN TẮC QUAN TRỌNG NHẤT

Citilap không được phát triển theo kiểu:

> “Làm giao diện trước bằng mock, backend tính sau.”

Từ bây giờ phát triển theo kiểu:

> **“Mỗi tính năng là một vertical slice: UI + D1 + API/domain + R2 nếu có + validation + test.”**

Ví dụ khi làm Product Detail:

Không chỉ sửa giao diện.

Phải xem luôn:

- Product schema;
- Variant;
- Price;
- Inventory;
- ProductImage/R2;
- API/query;
- SEO;
- loading/error;
- mobile;
- accessibility.

Tuy nhiên vẫn phải giữ phạm vi task nhỏ để tránh rewrite quá lớn.

---

# 71. QUYẾT ĐỊNH KIẾN TRÚC ĐÃ KHÓA — 2026-10-06

Các quyết định sau được coi là mặc định cho đến khi chủ dự án thay đổi:

1. Dùng Next.js/React/TypeScript.
2. Dùng Cloudflare Workers làm runtime production mục tiêu.
3. Dùng Cloudflare D1 làm database chính.
4. Dùng Cloudflare R2 làm object storage.
5. Dùng Cloudflare service khác khi đúng use case.
6. Không chủ động thiết kế fallback sang PostgreSQL.
7. Không trì hoãn Cloudflare migration vì project hiện vẫn ở giai đoạn mock/data chưa hoàn thiện.
8. Xây data thật trên Cloudflare ngay từ bây giờ.
9. Modular monolith.
10. API-first.
11. Product/Variant/SKU/Serial model vẫn được giữ.
12. Inventory và order phải bảo toàn lịch sử.
13. Concurrency/idempotency phải được test trên chính D1.
14. AI tool hiện tại là Antigravity + Gemini 3.8 nhưng project không phụ thuộc AI/model cụ thể.
15. UI completion và Cloudflare foundation được triển khai song song theo vertical slice.

---

# 72. GHI CHÚ CHUYỂN ĐỔI TỪ CONTEXT CŨ

Các nội dung sau của context cũ không còn áp dụng:

- PostgreSQL là database production bắt buộc.
- Redis là cache mặc định.
- media production có thể dùng S3/Supabase Storage.
- hoàn thành mock UI trước rồi mới migration infrastructure.
- kiến trúc phụ thuộc Vercel/managed PostgreSQL.
- thứ tự T0 -> T12 cũ là thứ tự bắt buộc tuyệt đối.

Thay bằng:

- D1;
- R2;
- Workers;
- KV khi phù hợp;
- Queues;
- Cron;
- Turnstile;
- WAF;
- các dịch vụ Cloudflare phù hợp khác.

Các yêu cầu nghiệp vụ, product model, inventory, order snapshot, RBAC, audit, SEO, testing và security từ context cũ vẫn được giữ nếu không mâu thuẫn với tài liệu này.

---

# 73. TRẠNG THÁI TÀI LIỆU

Đây là context chính thức mới để đưa cho Antigravity, Gemini hoặc AI khác.

Khi hoàn thành một task lớn, cập nhật:

```text
Task:
Status: TODO | IN_PROGRESS | BLOCKED | DONE
Ngày:
Mục tiêu:
Files/modules:
D1 migration:
R2 changes:
API/UI behavior:
Verification:
Known limitations:
Next:
```

Không để context trở thành tài liệu chết.

Nó phải được cập nhật theo code thật.

---

# 74. NEXT ACTION

Bắt đầu bằng:

**UI-0 + Cloudflare Foundation Audit**

Agent cần:

- đọc repo;
- xác nhận version thực tế;
- kiểm tra Next.js runtime compatibility;
- kiểm tra Prisma schema;
- xác định cách chuyển schema hiện tại sang D1;
- xác định local upload cần chuyển R2;
- map toàn bộ mock-data;
- map toàn bộ page/component;
- đề xuất top 10 task;
- không refactor lớn trong audit.

Sau audit mới bắt đầu Task UI-1 / CF-1 cụ thể.

---

# 75. NHẬT KÝ THỰC THI TASK

```text
Task: CF-01
Status: DONE
Ngày: 2026-10-06

Mục tiêu:
Thiết lập nền tảng Cloudflare-native (Workers, D1, R2, Wrangler, Prisma + D1) cho project citilap-ecommerce mà không làm đứt gãy Next.js development workflow hiện tại.

Files/modules changed:
- wrangler.jsonc (Cloudflare Worker config, bindings DB, PRODUCT_MEDIA, nodejs_compat)
- worker-configuration.d.ts (Cloudflare type definitions cho Env, D1Database, R2Bucket)
- prisma/schema.prisma (runtime = "cloudflare", client generator config)
- src/lib/prisma.ts (createPrismaD1Client, getPrismaClient, proxy PrismaClient cho D1 & fallback)
- package.json (scripts chuẩn hóa: dev, dev:cloudflare, cf:typegen, cf:deploy, db:migrate:local, db:query:local, verify:cf)
- .env.example (Environment strategy tài liệu hóa D1, R2, Admin auth)
- eslint.config.mjs (Ignore patterns cho bundles/generated/workerd)
- d1-migrations/0001_initial_schema.sql (Initial D1 migration tạo bảng cơ sở)
- scripts/verify-cf.ts & scripts/build-verify.mjs (Cloudflare runtime live verification test)

Cloudflare:
- Workers: Workerd compatibility verified via Wrangler dev & Vinext compatibility spike
- D1: citilap-db-dev (local SQLite storage inside .wrangler/state/v3/d1)
- R2: citilap-media-dev (local R2 object storage)

Bindings:
- DB (D1 Database -> citilap-db-dev)
- PRODUCT_MEDIA (R2 Bucket -> citilap-media-dev)

Commands:
- npm run dev: Next.js dev server truyền thống
- npm run dev:cloudflare: Vite/Vinext dev server trên port 3001
- npm run cf:typegen: Wrangler types generator
- npm run db:migrate:local: Áp dụng migration lên local D1
- npm run db:query:local: Thực thi SQL query trực tiếp trên local D1
- npm run verify:cf: Kiểm thử toàn diện D1, Prisma D1 adapter, R2 trên Cloudflare Workers runtime

Verification:
- D1 direct SQL query: PASS (SELECT 1 as num -> 1)
- Prisma Client + @prisma/adapter-d1: PASS (prisma.category.findMany() -> count: 0)
- Prisma lib module helper (src/lib/prisma.ts): PASS (getPrismaClient(env.DB).user.findMany() -> count: 0)
- R2 Bucket binding: PASS (PUT, GET read back, HEAD, DELETE verified)
- TypeScript check (npx tsc --noEmit): PASS (0 errors)
- Linter (npm run lint): PASS (0 errors, 5 baseline warnings)
- Next.js Production Build (npm run build): PASS (37/37 routes compiled)

Known limitations:
- /api/upload vẫn đang dùng fs/promises tạm thời (sẽ chuyển sang R2 trong MEDIA-03).
- Business schema catalog và monetary Float chưa đổi sang Int (thuộc task DATA-02).
- ~20 API routes vẫn còn guard hasDatabase = !!process.env.DATABASE_URL chuyển mock (sẽ được gỡ bỏ dần qua từng slice).

Next task:
DATA-02 — D1 Catalog Schema Foundation
```

```text
Task: DATA-02
Status: DONE
Ngày: 2026-10-07

Mục tiêu:
Xây dựng schema D1 thật cho Catalog của Citilap (Category, Brand, Product, ProductVariant/SKU, ProductImage) để các task storefront tiếp theo bỏ mock data và dùng dữ liệu thực. Chuẩn hóa tiền VND integer, stable codes cho condition/status, normalized specs cho filter, và development seed có cấu trúc tốt.

Schema changed:
- prisma/schema.prisma
- d1-migrations/0002_catalog_foundation.sql

D1 migration:
- d1-migrations/0002_catalog_foundation.sql (deterministic migration từ baseline CF-01, tạo Brand, ProductImage, recreate Product & ProductVariant với columns & index mới, migrate integer money).

Models:
- Category: Chuẩn hóa với sortOrder, status (ACTIVE/INACTIVE/ARCHIVED), parent relation, index slug/status/sortOrder.
- Brand: Thêm model chính thức (id, name, slug unique, logo, description, status, createdAt, updatedAt), relation Product.brandRel.
- Product: Chuẩn hóa catalog thật (brandId relation, condition stable code, status stable code, price Int, originalPrice Int, lowestPrice30d Int, normalized filter specs: cpu, cpuSeries, gpu, gpuSeries, ram, ramGb, storage, storageGb, display, screenSize, refreshRate, relation ProductImage).
- ProductVariant: Chuẩn hóa SKU unique, price Int, originalPrice Int, specs columns (cpu, gpu, ram, storage, display), status ACTIVE. Ghi chú: stock là transitional aggregate field trước khi triển khai Inventory/Serial workflow.
- ProductImage: Model metadata cho Cloudflare R2 (productId, variantId optional, r2Key làm source of truth, url, mimeType, width, height, size, alt, sortOrder, isPrimary). Không lưu binary trong D1.

Money migration:
- Đổi toàn bộ Float sang Int (VND integer số đồng): Product.price, Product.originalPrice, Product.lowestPrice30d, ProductVariant.price, ProductVariant.originalPrice, Order.totalAmount, Order.shippingFee, Order.discountAmount, OrderItem.price, User.totalSpend.
- Zero floating-point calculation for monetary values. Formatter UI (PriceTag, ProductCard) nhận number integer và format qua Intl / toLocaleString.

Indexes:
- Category: slug (unique), status, sortOrder, parentId.
- Brand: slug (unique), status.
- Product: slug (unique), categoryId, brandId, status, condition, createdAt, isFeatured, isNewArrival, isFlashSale, isBestSeller, price, ramGb, storageGb, cpuSeries, gpuSeries.
- ProductVariant: sku (unique), productId, status.
- ProductImage: productId, r2Key, sortOrder, isPrimary.

Seed:
- scripts/seed-development.sql: Deterministic development seed idempotent (INSERT OR REPLACE) gồm:
  - 7 Brands (Dell, Asus, Lenovo, HP, Apple, Acer, MSI).
  - 6 Categories (Gaming, Văn phòng, Đồ hoạ, MacBook, Like New, Linh kiện).
  - 12 Laptop Products đa dạng (Gaming Flagship, Văn phòng mỏng nhẹ, Like New 99%, MacBook M3, Creator/Studio).
  - 7 ProductVariants với cấu hình SKU riêng biệt.
  - 5 ProductImage metadata records mẫu.
  - Đầy đủ integer price, condition stable codes (NEW, LIKE_NEW), normalized spec values.
  - Quy định rõ: Đây là development seed, không phải dữ liệu thật Citilap production.

Cloudflare binding hardening:
- src/lib/prisma.ts: Áp dụng WeakMap client caching cho D1Database, setD1Database injector, dynamic require an toàn (safeRequire) cho cloudflare:workers binding mà không phá Vite/Next.js bundlers.
- wrangler.jsonc: Đã xác thực Cloudflare account và tạo remote dev D1 database thật "citilap-db-dev" với UUID: 932e3840-8062-49c9-8d4a-c6d0d33457ea (thay thế placeholder citilap-db-dev-local).

Verification:
- D1 SQL verification: PASS (migrations applied, seed applied).
- D1 Prisma Section 17 verification:
  - Category insert, unique slug constraint, query: PASS
  - Brand insert, unique slug constraint, relation: PASS
  - Product insert, unique slug, integer price verified, status, condition: PASS
  - Variant insert, unique SKU constraint, Product relation: PASS
  - ProductImage insert, ordering sortOrder, isPrimary: PASS
- D1 Prisma Section 18 smoke queries:
  - Homepage featured: PASS (count: 6)
  - Homepage new arrivals: PASS (count: 5)
  - Homepage flash sale: PASS (count: 4)
  - Category listing price asc order: PASS (count: 4, min: 26.990.000, max: 39.990.000)
  - Filter by Brand (Lenovo): PASS (count: 2)
  - Filter by CPU (Core i7): PASS (count: 5)
  - Filter by GPU (RTX 4060): PASS (count: 3)
  - Filter by RAM (16 GB): PASS (count: 7)
  - PDP by slug (lenovo-legion-5-pro-16arx8 with Brand, Category, 2 Variants, 2 Images): PASS
- Next.js build (npm run build): PASS (38/38 routes compiled).
- TypeScript check (npx tsc --noEmit): PASS (0 errors).
- Linter (npm run lint): PASS (0 errors).
- Vinext check (npx vinext check): PASS (97% compatible).

Known limitations:
- Storefront UI components vẫn tạm giữ fallback data trong các file mock (chưa xóa toàn bộ cho đến STORE-05/06/07).
- /api/upload vẫn lưu local file tạm thời (sẽ chuyển sang Cloudflare R2 trong MEDIA-03).
- Stock trên ProductVariant là trường aggregate tạm thời (chưa có SerialUnit / Inventory Ledger).

Next task:
MEDIA-03 — R2 Media Upload
```

```text
Task: MEDIA-03
Status: DONE
Ngày: 2026-10-07

Mục tiêu:
Loại bỏ hoàn toàn cơ chế upload production dựa trên filesystem (fs/promises -> public/uploads/products) và thay bằng Cloudflare-native media pipeline: Admin -> Upload API -> Validation -> R2 (PRODUCT_MEDIA) -> ProductImage metadata trong D1 -> Storefront. Không còn code ghi upload vào local filesystem.

R2 binding:
- PRODUCT_MEDIA (Cloudflare R2 Bucket binding: citilap-media-dev).
- Storage service hạ tầng: src/infra/cloudflare/r2/storage.ts wrap các operations put, get, head, delete hoàn toàn type-safe, không dùng AWS S3 SDK, hỗ trợ explicit injection setR2Bucket() và getR2Bucket().

Object key strategy:
- Không dùng raw filename của người dùng; sử dụng namespace có cấu trúc + random UUID:
  - Khi có productId: products/{productId}/{uuid}.{ext}
  - Khi có variantId: products/{productId}/variants/{variantId}/{uuid}.{ext}
  - Khi upload tạm: tmp/products/{uploadId}/{uuid}.{ext}

ProductImage metadata:
- Migration D1: d1-migrations/0003_media_pipeline.sql (chuyển url sang nullable, r2Key là source of truth duy nhất, index r2Key, productId, variantId, isPrimary, sortOrder).
- D1 chỉ lưu metadata: productId, variantId, r2Key, url, mimeType, width, height, size, alt, sortOrder, isPrimary. Tuyệt đối không lưu binary trong D1.

Upload flow:
1. Admin auth xác thực qua requireAdmin().
2. Nhận FormData, giới hạn tối đa 10 file / request, max 5MB / file, tổng tối đa 25MB.
3. Kiểm tra content signature (magic bytes) nghiêm ngặt: chỉ chấp nhận image/jpeg, image/png, image/webp. Từ chối file giả mạo, HTML, script, executable.
4. Trích xuất kích thước width/height bằng lightweight buffer parser (không phụ thuộc native sharp).
5. Upload trực tiếp buffer lên Cloudflare R2 bucket qua binding PRODUCT_MEDIA.
6. Ghi metadata ProductImage vào D1 (nếu có context productId).
7. Compensating action: Nếu ghi D1 thất bại, tự động xóa object vừa upload trên R2 để ngăn chặn orphan files.

Delete flow:
1. Admin auth qua requireAdmin().
2. Client gửi productImageId.
3. Server tra cứu ProductImage từ D1 -> resolve r2Key -> xóa object trên Cloudflare R2 -> xóa record trong D1.
4. Nếu ảnh bị xóa là ảnh chính (isPrimary), tự động thăng cấp ảnh tiếp theo làm ảnh chính.
5. Cho phép xóa ảnh tạm nếu key strictly bắt đầu bằng tmp/products/ (ngăn chặn arbitrary key manipulation).

Legacy media remaining:
- Đã xóa hoàn toàn thư mục public/uploads và file test 1788889527783-4on703.jpg khỏi repository.
- Không còn bất kỳ dòng code fs/promises hay ghi disk nào trong toàn bộ src/.
- Field Product.images legacy (JSON string) vẫn được mirror đồng bộ trong POST/PATCH để storefront cũ không bị gãy khi đang migrate từng bước.
- Các ảnh mock ngoài internet (Unsplash) từ seed cũ vẫn hiển thị bình thường.

Verification:
- Cloudflare Workers live test suite (scripts/verify-cf.ts):
  - Valid JPEG upload (R2 object + D1 metadata): PASS
  - Valid PNG upload (R2 object + D1 metadata): PASS
  - Valid WebP upload (R2 object + D1 metadata): PASS
  - Invalid MIME rejection (file giả script/html): PASS (rejected)
  - Oversized file rejection (> 5MB): PASS (rejected)
  - Media streaming route (/api/media/[...key]): PASS (Content-Type & Cache-Control immutable verified)
  - Compensating delete on D1 failure: PASS (orphan prevented)
  - Delete media by ID (lookup -> R2 delete -> D1 delete): PASS
  - All verification passed: 100% PASS
- Next.js build (npm run build): PASS (38/38 routes compiled).
- TypeScript check (npx tsc --noEmit): PASS (0 errors).
- Linter (npm run lint): PASS (0 errors, 5 baseline warnings).
- Vinext check (npx vinext check): PASS (97% compatible).

Known limitations:
- Storefront components hiện tại vẫn dùng mock data (sẽ nối sang dữ liệu D1 & R2 trong STORE-05/06/07).
- Ảnh upload trên R2 lưu định dạng gốc chất lượng cao, chưa có resize/responsive thumbnail on-the-fly (có thể tích hợp Cloudflare Images sau).

Next task:
UI-04 — Design System Foundation
```

```text
Task: UI-04
Status: DONE
Ngày: 2026-10-08

Mục tiêu:
Chuẩn hóa nền tảng giao diện Citilap trước khi hoàn thiện Homepage, Category và PDP: khóa design tokens, đồng bộ Tailwind CSS v4 @theme, chuẩn hóa typography scale, spacing/layout, shared UI primitives (Button, Badge, PriceTag, ConditionBadge, StockBadge, Skeleton, EmptyState, ErrorState, Input), loại bỏ duplicate component (SectionHeader), chuẩn hóa container storefront, loại bỏ duplicate markup ở Wishlist, sửa nested <main> landmark, và nâng cấp accessibility.

Design tokens:
- Brand: --color-brand-primary (#2563eb), --color-brand-primary-hover (#1d4ed8), --color-brand-primary-subtle (#eff6ff), --color-brand-accent (#f59e0b), --color-brand-navy (#0b1221), --color-brand-navy-surface (#0f172a).
- Commerce: --color-price-current (#dc2626), --color-price-old (#94a3b8), --color-discount (#dc2626).
- Condition: --color-condition-new, --color-condition-like-new, --color-condition-used (kèm bg và border tokens).
- Stock: --color-stock-available (#15803d), --color-stock-low (#d97706), --color-stock-out (#64748b) (kèm bg tokens).
- Surfaces: --color-surface, --color-surface-card, --color-surface-subtle (#f8fafc), --color-surface-muted (#f1f5f9), --color-surface-raised.
- Borders: --color-border-default (#e2e8f0), --color-border-subtle (#e2e8f0), --color-border-strong (#cbd5e1).
- Text: --color-text-primary (#0f172a), --color-text-secondary (#475569), --color-text-muted (#94a3b8), --color-text-inverse (#ffffff).
- Radii: --radius-sm (4px), --radius-control (8px), --radius-card (12px), --radius-surface (16px), --radius-panel (16px), --radius-pill (9999px).
- Shadows: --shadow-card, --shadow-card-hover, --shadow-dropdown, --shadow-modal, --shadow-popover.
- Container: --max-width-shop (1370px) -> utility max-w-shop và .container-shop.

Typography:
- Scale chuẩn: .text-caption (11px), .text-label (12px), .text-body-sm (13px), .text-body (14px), .text-body-lg (16px), .text-title-sm (18px), .text-title (20px), .text-heading (24px), .text-display (clamp 28px - 44px).
- Loại bỏ các kích thước tùy ý không nhất quán.

Container:
- .container-shop: w-full mx-auto max-w-shop px-4 sm:px-6 lg:px-8.
- Component Container (src/components/ui/Container.tsx) dùng max-w-shop thống nhất toàn bộ Storefront (Header, Homepage, Category, PDP, Cart, Wishlist, Footer).

Shared components changed:
- src/components/ui/Button.tsx: Thêm danger alias, semantic tokens, loading state aria-busy, focus ring accessible.
- src/components/ui/Badge.tsx: Thêm đầy đủ variants (default, primary, success, warning, error, condition-*, stock-*, sale/discount, rank-*), semantic colors.
- src/components/ui/PriceTag.tsx: Integer money contract (Intl vi-VN), hỗ trợ originalPrice + oldPrice alias, tự tính % discount khi originalPrice > price, semantic tokens.
- src/components/ui/ConditionBadge.tsx (mới): Mapper stable condition codes (NEW, LIKE_NEW, USED, REFURBISHED, REPAIRED, LIQUIDATION, DAMAGED) -> tiếng Việt chuẩn và style semantic. Cô lập fallback name inference.
- src/components/ui/StockBadge.tsx (mới): Chuẩn hóa trạng thái tồn kho (Sẵn hàng, Còn X máy, Hết hàng) với dot và màu token chuẩn.
- src/components/ui/Skeleton.tsx: Thêm ProductCardSkeleton và ProductGridSkeleton tái sử dụng được khắp hệ thống.
- src/components/ui/EmptyState.tsx: Cập nhật semantic tokens, typography scale, icon & action slots.
- src/components/ui/ErrorState.tsx (mới): Reusable error state thân thiện với khách hàng, hỗ trợ nút "Thử lại" và liên hệ hỗ trợ.
- src/components/ui/Input.tsx (mới): Form primitives (Input, Label, Textarea, Select, Checkbox) đồng bộ chiều cao h-10, padding, border, radius-control, error & focus ring.
- src/components/product/ProductCard.tsx: Nâng cấp dùng ConditionBadge, StockBadge, semantic tokens, PriceTag integer contract, hỗ trợ footerAction slot.

Duplicates removed:
- Xóa src/components/home/SectionHeader.tsx. Hợp nhất vào src/components/ui/SectionHeader.tsx (hỗ trợ cả standard border-b layout và banner layout với category quick links).
- Loại bỏ duplicate card markup trong src/app/(shop)/wishlist/page.tsx, chuyển sang tái sử dụng ProductCard qua prop footerAction và dùng EmptyState.

Accessibility:
- Sửa triệt để lỗi nested <main>: chuyển <main> trong src/app/(shop)/page.tsx và hot-sale/page.tsx thành <div> (duy nhất 1 <main> trong shop layout).
- Cấu hình *:focus-visible ring với outline 2px var(--color-brand-primary) outline-offset 2px.
- Các nút icon (Heart wishlist, toggle) có đầy đủ aria-label và aria-pressed.
- Loading button có aria-busy="true".

Responsive verification:
- Đã kiểm tra qua Chrome DevTools MCP ở 3 viewport tiêu chuẩn: Desktop (1440px), Tablet (768px), Mobile (390px).
- Đã kiểm tra các trang: Homepage (/), Wishlist (/wishlist), Cart (/cart), Admin redirect (/admin/products -> /login).
- Không phát hiện horizontal overflow, không vỡ layout, typography scale hiển thị rõ ràng và cân đối.
- Đã lưu screenshots: ui_04_desktop_1440.png, ui_04_tablet_768.png, ui_04_mobile_390.png, ui_04_wishlist_empty.png, ui_04_cart.png.

Commands:
- Linter (npm run lint): PASS (0 errors, 0 warnings).
- TypeScript (npx tsc --noEmit): PASS (0 errors).
- Next.js build (npm run build): PASS (38/38 routes compiled).
- Vinext check (npx vinext check): PASS (97% compatible).

Known limitations:
- Storefront components vẫn giữ mock data trong lib/home-mock-data.ts (sẽ thay bằng query D1/R2 thật trong STORE-05/06/07).
- Header dynamic categories hiện vẫn dùng danh sách tĩnh (sẽ kết nối D1 trong STORE-06).

Next task:
STORE-05 — Homepage Real Data + UI Completion
```

---

```text
Task: STORE-05
Status: PASS
Ngày: 2026-10-08

Mục tiêu:
Hoàn thiện Homepage Citilap thành trang thương mại điện tử sử dụng Cloudflare D1 và R2 thực tế, thay thế hoàn toàn cơ chế mock fallback trên trang chủ:
- Toàn bộ dữ liệu sản phẩm trang chủ đọc trực tiếp từ Cloudflare D1.
- Thông tin thương hiệu, giá (integer VND), cấu hình (normalized specs), tình trạng (stable condition codes) và tồn kho (transitional aggregate) chuẩn xác.
- Ảnh sản phẩm sử dụng metadata ProductImage/R2 (r2Key -> getPublicMediaUrl).
- Loại bỏ hoàn toàn src/lib/home-mock-data.ts và silent mock fallbacks.
- Sửa triệt để dead CTAs (href="#") và khắc phục routing slug giữa ProductCard và PDP.
- Giữ vững Design System UI-04, sửa triệt để self-referencing CSS variables.
- Đảm bảo 100% khả năng tương thích và đã kiểm thử thực tế trên Cloudflare Workers runtime.

Homepage Sections:
1. HeroSection: Banner hiển thị giá trị cốt lõi, quick category buttons và CTAs điều hướng thực tế (/category/laptop-gaming, /hot-sale, /category/laptop-van-phong).
2. FeatureStrip: Cam kết chất lượng độc lập (Bảo hành 12 tháng, Like New tuyển chọn, Trả góp 0%, Giao hàng hỏa tốc).
3. FlashSaleSection: Kết nối getFlashSaleProducts() từ D1, hiển thị countdown, ẩn an toàn khi danh sách rỗng (không tạo sản phẩm giả).
4. Featured Products (Sản phẩm nổi bật): Query getFeaturedProducts(10), hiển thị đầy đủ badges và specs.
5. Laptop Gaming: Query getCategoryProducts('laptop-gaming', 10).
6. Laptop Văn Phòng & Học Tập: Query getCategoryProducts('laptop-van-phong', 10).
7. Laptop Like New Tuyển Chọn: Query getLikeNewProducts(10) lọc theo điều kiện LIKE_NEW, USED, REFURBISHED, LIQUIDATION.
8. Brand Discovery: Danh sách thương hiệu đối tác nổi bật.
9. Trust & Policy: Chính sách đổi trả và hệ thống bảo hành.

Catalog Service:
- Tạo src/server/services/catalog.service.ts và re-export src/services/catalog.service.ts.
- Các hàm cung cấp: getFeaturedProducts, getNewArrivals, getFlashSaleProducts, getCategoryProducts, getLikeNewProducts, getBestSellingProducts, getHomepageCatalog.
- Dependency injection hỗ trợ cả Cloudflare Workers runtime (env.DB) và local Node.js.
- Không có silent mock fallback: lỗi database được log và throw/hiển thị ErrorState có kiểm soát; danh sách trống hiển thị EmptyState.

D1 Data Flow:
Cloudflare D1 -> Prisma Client (adapter-d1 / adapter-libsql local fallback) -> Catalog Service -> Homepage Server Components -> ProductCard.
- Price: Integer VND (Math.round).
- Condition: Stable codes (NEW, LIKE_NEW, USED, REFURBISHED, LIQUIDATION).
- Specs: Đọc trực tiếp từ normalized columns (cpu, ram, storage, gpu, display).
- Stock: Transitional aggregate count.

ProductImage/R2:
- Ưu tiên đọc metadata từ bảng ProductImage liên kết:
  1. isPrimary = true
  2. sortOrder tăng dần
- Media URL tạo bằng helper getPublicMediaUrl(r2Key) -> /api/media/${r2Key}.
- Fallback an toàn khi không có ảnh: hiển thị placeholder UI trung tính, không sử dụng ảnh ngẫu nhiên Unsplash.

Mock Cleanup:
- Xóa vĩnh viễn file src/lib/home-mock-data.ts sau khi xác nhận không còn bất kỳ consumer nào.
- Refactor src/services/product-home.ts ủy quyền 100% sang catalog.service.ts.
- Cập nhật ProductSection, FlashSaleSection, FeatureStrip, HeroSection loại bỏ hoàn toàn mock fallback.

CSS Preflight:
- Đã khắc phục triệt để self-referencing CSS variables trong @theme ở src/app/globals.css.
- Khai báo literal values tường minh:
  --color-brand-primary: #2563eb;
  --container-shop: 1370px;
  --max-width-shop: 1370px;
- Utility max-w-shop và .container-shop hoạt động chính xác ở 1370px.

CTA/Routing:
- Sửa toàn bộ CTA href="#" thành thẻ <Link> Next.js với đường dẫn chuẩn.
- Sửa PDP route tại src/app/(shop)/product/[id]/page.tsx hỗ trợ OR: [{ id }, { slug: id }], giúp ProductCard trỏ đến /product/${slug} hoạt động ngay lập tức mà không cần rewrite router.

Responsive:
- Kiểm tra các viewport: 390px (Mobile), 768px (Tablet), 1440px (Desktop).
- Layout co giãn linh hoạt, căn lề nhất quán qua .container-shop.
- Không có hiện tượng tràn chiều ngang (horizontal overflow).
- Thông số kỹ thuật trên mobile hiển thị rõ ràng, dễ đọc.

SEO:
- Homepage server-rendered chứa đầy đủ thẻ title, description, OpenGraph, canonical và semantic HTML (1 thẻ h1 duy nhất, semantic section landmarks).

Verification:
- Cloudflare Workers runtime verification (npm run verify:cf): PASS 100% (allPassed: true).
  + D1 direct & R2 operations: PASS
  + Section 17 catalog schema verification: PASS
  + Section 18 smoke queries: PASS
  + Media-03 R2 uploads & serving: PASS
  + STORE-05 Catalog Service queries & contract: PASS (featured, new arrivals, flash sale, gaming, like-new, empty category, batch catalog, R2 image resolution).
- ESLint (npm run lint): PASS (0 errors, 0 warnings).
- TypeScript (npx tsc --noEmit): PASS (0 errors).
- Next.js build (npm run build): PASS (38/38 routes compiled).
- Vinext check (npx vinext check): PASS (97% compatible).
- Dev server runtime check: PASS (HTML render chứa đầy đủ 12 sản phẩm D1 thật, giá VND, 0 mock data).

Known Limitations:
- Trang chi tiết sản phẩm (PDP) hiện tại mới chỉ giải quyết routing slug, PDP gallery/specs chuyên sâu thuộc phạm vi STORE-07.
- Header categories dropdown hiện vẫn đang dùng mock danh mục tĩnh, thuộc phạm vi STORE-06.

Next Task:
STORE-06 — Category & Navigation
```

---

```text
Task: STORE-06
Status: PASS
Ngày: 2026-10-08

Mục tiêu:
Hoàn thiện toàn bộ hệ thống danh mục sản phẩm và điều hướng Citilap bằng dữ liệu thật từ Cloudflare D1:
- Toàn bộ danh mục tại /category hiển thị từ Cloudflare D1.
- Điều hướng danh mục động từ Header (dropdown + navbar) và MobileBottomNav (drawer).
- Trang /category/[slug] truy vấn và lọc dữ liệu thật từ D1 với breadcrumb, grid, sorting, pagination, facets.
- Bộ lọc thương hiệu, CPU, GPU, RAM, SSD, khoảng giá VND, và tình trạng (stable condition codes).
- Lọc cấu hình theo biến thể nguyên tử (atomic matching: variants: { some: { AND: [...] } }) tránh sai lệch chéo giữa các variant.
- Đồng bộ toàn diện URL search parameters, bảo toàn khi refresh, back/forward, share URL.
- Zero mock fallback: throw/log lỗi, hiển thị ErrorState và EmptyState kiểm soát.
- Đảm bảo 100% khả năng tương thích Cloudflare Workers runtime (verify:cf allPassed: true).

Files Created:
- scripts/post-prisma-generate.mjs: Tự động hóa bản vá dual Node/WASM cho generated Prisma client sau prisma generate.
- src/app/(shop)/category/page.tsx: Trang danh mục tổng quan (/category) từ Cloudflare D1.
- src/components/category/CategoryFilterSidebar.tsx: Sidebar bộ lọc ràng buộc trực tiếp URL searchParams.
- src/components/category/ActiveFilterChips.tsx: Filter chips hiển thị các bộ lọc đang chọn, xóa từng filter hoặc Clear All.
- src/components/category/CategorySortSelect.tsx: Dropdown sắp xếp hỗ trợ newest, price-asc, price-desc, featured.
- src/components/category/CategoryPagination.tsx: Phân trang accessible với URL searchParams.
- src/components/category/MobileFilterDrawer.tsx: Slide-over drawer bộ lọc trên thiết bị di động.
- src/components/category/CategoryListingContainer.tsx: Container liên kết sidebar, chips, grid, drawer và pagination.

Files Modified:
- package.json: Thêm hook db:generate ("prisma generate && node scripts/post-prisma-generate.mjs") và postinstall.
- src/server/services/catalog.service.ts: Mở rộng Category Service với getActiveCategories, getCategoryBySlug, getActiveBrands, getCategoryFilteredProducts.
- src/app/(shop)/category/[slug]/page.tsx: Tái cấu trúc hoàn chỉnh Server Component kết nối D1, dynamic SEO, 404 handling.
- src/components/layout/Header.tsx: Động hóa dropdown danh mục và thanh điều hướng chính từ D1 categories và brands.
- src/components/layout/MobileBottomNav.tsx: Động hóa nút "Danh mục" mở drawer danh mục D1 thực tế.
- src/app/(shop)/layout.tsx: Truy vấn song song getActiveCategories và getActiveBrands, truyền xuống Header và MobileBottomNav.
- src/lib/prisma.ts: Bổ sung eslint-disable cho require trong safeRequire.
- scripts/verify-cf.ts: Bổ sung bộ 10 bài test STORE-06 trong worker verification suite.

Preflight STORE-05 Resolutions:
- 0.1 Prisma generated code: scripts/post-prisma-generate.mjs được tích hợp tự động qua npm run db:generate và postinstall, đảm bảo build lâu dài mà không cần chỉnh sửa thủ công.
- 0.2 Cloudflare Workers runtime: Đã phân định rõ giữa standalone verification Worker (wrangler dev scripts/verify-cf.mjs), Next.js dev server, và vinext build.
- 0.3 Cam kết thương hiệu: Các cam kết hiển thị trung thực theo seed/chuẩn thương mại hiện có, không tự suy diễn cam kết mới.

Category Architecture & Services:
- getActiveCategories: Truy vấn Category với status ACTIVE, tính toán productCount từ D1 qua _count: { products: { where: { status: 'ACTIVE' } } }.
- getCategoryBySlug: Tra cứu slug category chính xác từ D1; trả về null khi không tìm thấy -> trigger notFound().
- getActiveBrands: Truy vấn Brand với status ACTIVE, kèm productCount.
- getCategoryFilteredProducts:
  + Server-side filter parameterized an toàn qua Prisma D1 adapter.
  + Ghép nối atomic match trên ProductVariant cho RAM và Storage:
    variants: { some: { AND: [ramCondition, storageCondition] } }
  + Giá sản phẩm lấy từ Variant có giá nhỏ nhất thỏa mãn bộ lọc hoặc giá base Product.
  + Facets được tổng hợp song song trong 1 query pool duy nhất (brands, conditions, ramOptions, storageOptions, cpuSeries, gpuSeries, priceRange) giúp giảm tối đa I/O trên D1.

Dynamic Header & Mobile Navigation:
- Header: Nút "Danh mục" hiển thị dropdown chứa các category ACTIVE từ D1. Khi hover hiển thị thương hiệu D1 theo từng danh mục.
- Thanh nav ngang hiển thị các danh mục D1 hàng đầu, tự động highlight theo pathname.
- Phím Escape đóng tất cả các menu (keyboard accessibility), đầy đủ ARIA attributes (aria-expanded, aria-controls).
- Mobile: Nút "Danh mục" trên MobileBottomNav mở drawer hiển thị danh mục D1, liên kết thương hiệu, có nút đóng và Esc listener.

URL Strategy:
- Đồng bộ searchParams: brand, pricePreset, minPrice, maxPrice, condition, ram, storage, cpu, gpu, sort, page.
- Khi thay đổi filter, trang tự động reset về page 1.
- Hỗ trợ back/forward của trình duyệt và chia sẻ URL trực tiếp.

Verification:
- Cloudflare Workers runtime verification (npm run verify:cf): PASS 100% (allPassed: true).
  + activeCategoriesListing: PASS (count: 6)
  + categorySlugLookup: PASS (found: true, nullOnMissing: true)
  + activeBrandsListing: PASS (count: 7)
  + categoryFilteredProductsBasic: PASS (total: 4, hasFacets: true)
  + brandFilterD1: PASS (count: 1, brandMatched: true)
  + priceFilterD1: PASS (count: 2, pricesInRange: true)
  + variantAtomicSpecFilter: PASS (count: 3)
  + sortingPriceAscDesc: PASS (ascOk: true, descOk: true)
  + paginationPage1AndPage2: PASS (page1: 2, page2: 2, distinct: true)
  + pageOutOfBoundsGraceful: PASS (emptyReturned: true)
- ESLint (npm run lint): PASS (0 errors, 0 warnings).
- TypeScript (npx tsc --noEmit): PASS (0 errors).
- Next.js build (npm run build): PASS (39/39 routes compiled sạch sẽ, /category tĩnh và /category/[slug] động).
- Vinext check (npx vinext check): PASS (97% compatible).
- HTTP live testing on storefront (http://localhost:3001):
  + /category: 200 OK, hiển thị đầy đủ danh mục D1.
  + /category/laptop-gaming: 200 OK, hiển thị sản phẩm D1 thật, breadcrumb, sidebar, sorting.
  + /category/laptop-gaming?brand=lenovo: 200 OK, chỉ trả về Lenovo, có active filter chip.
  + /category/laptop-gaming?pricePreset=under-15m: 200 OK, hiển thị EmptyState "Không tìm thấy sản phẩm phù hợp" và nút "Xóa toàn bộ bộ lọc".
  + /category/non-existent-category: trả về 404 Not Found HTML.
  + Homepage regression check: PASS, không có hồi quy trên trang chủ.

Known Limitations:
- Playwright browser context trong môi trường subagent bị chặn do CDN AzureEdge 404 cho playwright-1.57.0-win32_x64.zip; verification được thay thế bằng kiểm thử HTTP/DOM toàn diện trên live storefront và Cloudflare worker verification.
- Trang chi tiết sản phẩm (PDP) gallery/tabs chuyên sâu sẽ được hoàn thiện trong STORE-07.

Next Task:
STORE-07 — Product Detail Page (PDP)
```

```text
Task: STORE-07
Status: PASS
Ngày: 2026-10-08

Mục tiêu:
Hoàn thiện trang chi tiết sản phẩm (PDP) của Citilap thành trang bán laptop sử dụng dữ liệu thật từ Cloudflare D1 và Cloudflare R2. Loại bỏ hoàn toàn mock data (Mock Legion 5 fallback, fake reviews, fake ratings 4.8, fake stock). Hỗ trợ lựa chọn SKU/variant, cập nhật đồng bộ giá/specs/stock/ảnh, gallery R2 với zoom lightbox, thông số kỹ thuật phân cấp, tình trạng like-new, tích hợp giỏ hàng và SEO metadata/JSON-LD chuẩn mực.

Product Detail Service:
- getProductDetail(identifier, selectedVariantParam, client):
  + Tra cứu sản phẩm trong D1 bằng slug hoặc legacy id (chỉ hiển thị status ACTIVE).
  + Eager loading quan hệ Brand, Category, ProductVariants, ProductImages.
  + Nhận diện variant được chọn thông qua tham số `selectedVariantParam` (ưu tiên SKU, hỗ trợ fallback id). Nếu không có hoặc không hợp lệ, tự động chọn variant active đầu tiên.
  + Tính toán đồng bộ: activeVariant, activePrice, activeOriginalPrice, activeDiscount, activeStock, activeSpecs, activeImages, fullSpecs (nhóm theo 6 danh mục kỹ thuật: Bộ xử lý, Đồ họa, Bộ nhớ & Lưu trữ, Màn hình, Thiết kế & Kích thước, Thông số khác).
- getRelatedProducts(productId, categoryId, brandId, limit, client):
  + Truy vấn D1 lấy các sản phẩm cùng Category hoặc Brand, loại trừ chính sản phẩm đang xem (id != productId), chỉ lấy status ACTIVE.

Routing:
- URL canonical ưu tiên: `/product/{slug}?sku={sku}`.
- Tra cứu bằng legacy ID (`/product/p-...`): Hệ thống tự động redirect 307 an toàn sang canonical slug URL (`/product/{slug}`) kèm preserve query params (ví dụ: `?sku=...`).
- Sản phẩm không tồn tại, hoặc ở trạng thái DRAFT / ARCHIVED: Lập tức gọi `notFound()` -> render trang 404 chuẩn của Citilap. Không còn cơ chế fallback sang mock data Legion 5.

Variant Selection:
- Component ProductVariantSelector hiển thị toàn bộ SKU thật từ D1 với sự khác biệt cấu hình (RAM, SSD, GPU, chênh lệch giá, tình trạng tồn kho).
- Deep-linking thông qua query param `?sku={sku}`, cập nhật shallowly qua Next.js router.
- Hỗ trợ keyboard accessibility (role="radiogroup", role="radio", aria-checked, tabindex).
- Đổi SKU lập tức cập nhật đồng bộ: Giá hiển thị, Giá gốc/Khuyến mãi, CPU/GPU/RAM/SSD/Display, Stock badge, Variant label, Gallery image (nếu SKU có ảnh riêng), Add to Cart payload.
- Mối liên kết từ Category Listing (STORE-06): ProductCard deep-link trực tiếp bằng `?sku={sku}` tương ứng với SKU đại diện cho giá đã lọc.

Price:
- Giá VND luôn là số nguyên (integer). Sử dụng component chuẩn PriceTag (hỗ trợ size xl, md, sm) kèm Original Price và Discount Badge nếu có.
- Giá luôn phản ánh chính xác biến thể (SKU) đang chọn, loại bỏ hoàn toàn hiện tượng mismatch giữa thẻ danh sách và trang chi tiết.
- Không tin cậy giá client gửi lên trong Add to Cart; server xác thực lại từ D1.

Specs:
- 2 cấp độ trình bày:
  + Quick Specs (Thông số nổi bật): Đặt ngay dưới tiêu đề và giá, làm nổi bật CPU, GPU, RAM, SSD, Màn hình cho trải nghiệm mua laptop nhanh chóng.
  + Full Specifications (ProductSpecsTable): Hiển thị chi tiết theo nhóm (Bộ xử lý, Đồ họa, Bộ nhớ & Lưu trữ, Màn hình, Thiết kế, Thông số khác), có icon phân loại, hỗ trợ accordion đóng/mở trên mobile/desktop. Không tự suy diễn hay parse chuỗi tên máy.

ProductImage/R2:
- Toàn bộ media PDP đọc từ ProductImage metadata trong D1, sinh URL qua `getPublicMediaUrl(r2Key)` trỏ tới `/api/media/...`.
- Sắp xếp ưu tiên: isPrimary DESC, sortOrder ASC. Tự động đồng bộ ảnh đại diện khi chọn variant có gán ảnh riêng.
- ProductGallery hỗ trợ: Main image viewport, thumbnails strip, nút chuyển ảnh Trước/Sau, modal Lightbox phóng to ảnh độ phân giải cao với phím bấm Escape / phím mũi tên.
- Fallback an toàn: Placeholder `/images/placeholder-laptop.svg` khi thiếu ảnh hoặc R2 object vắng mặt.
- `/api/media/[...key]` được tăng cường fallback sang `ProductImage.url` từ D1 khi chạy trên Node.js dev server (nơi không có Cloudflare R2 binding), loại bỏ hoàn toàn lỗi 500 ảnh media cục bộ.

Condition:
- Sử dụng mã tình trạng chuẩn hóa từ DB (NEW, LIKE_NEW, OPEN_BOX, REFURBISHED, GOOD, FAIR).
- Hiển thị qua ConditionBadge kèm mô tả chi tiết cam kết trong phần chính sách và bảo hành.

Stock:
- Trạng thái tồn kho lấy trực tiếp từ `activeVariant.stock` (aggregate D1).
- Hiển thị qua StockBadge: Còn hàng (In Stock), Hàng sắp về (Limited/Low Stock), hoặc Tạm hết hàng (Out of Stock).
- Khi hết hàng: Vô hiệu hóa nút Thêm vào giỏ hàng và Mua ngay.

Cart Integration:
- Tích hợp chặt chẽ với `CartContext`: gửi payload gồm Product ID, Variant ID (SKU), Title, Variant Label, Image, và Quantity.
- Hiển thị banner thông báo thêm vào giỏ hàng thành công với link mở giỏ.
- Nút "Mua ngay" thêm sản phẩm vào giỏ và điều hướng trực tiếp đến `/checkout`.

SEO:
- Metadata động (`generateMetadata`): Dynamic Title (`{Tên} {SKU} | Citilap`), Meta Description, Canonical URL (`/product/{slug}`), OpenGraph tags với ảnh đại diện thật từ R2.
- Structured Data JSON-LD:
  + Schema.org `Product`: Tên, Mô tả, SKU, Brand, Image, Offers (giá VND, availability `InStock`/`OutOfStock`, url, itemCondition).
  + Schema.org `BreadcrumbList`: Trang chủ > Danh mục > Tên sản phẩm.
  + TUYỆT ĐỐI KHÔNG chứa review fake, aggregateRating 4.8 giả mạo hay fake discount.

Responsive & Accessibility:
- Responsive 3 breakpoints: Mobile (390px), Tablet (768px), Desktop (1440px).
- ProductMobileCTA: Thanh mua hàng sticky dưới chân màn hình mobile, đặt cách `bottom-14` để không che khuất `MobileBottomNav`.
- Keyboard navigation đầy đủ cho Gallery thumbnails, Lightbox modal (Escape/Arrows), Variant selection (Radio group). Không lồng thẻ tương tác (no nested interactive elements).

Tests:
- Cloudflare Workers runtime verification (`npm run verify:cf`): 100% PASS (8/8 tests mới trong store07 suite).
  + pdpSlugLookup: PASS (lookup Lenovo Legion 5 Pro thành công).
  + pdpLegacyIdLookup: PASS (tra cứu bằng legacy ID p-legion-5-pro thành công).
  + pdpVariantSelectionBySku: PASS (chọn SKU L5P-R7-16-1TB-4060 lấy đúng giá 35.990.000đ).
  + pdpInvalidVariantGracefulFallback: PASS (SKU không tồn tại tự fallback về variant hợp lệ).
  + pdpNonExistentSlugReturnsNull: PASS (slug không tồn tại trả về null -> notFound).
  + pdpDraftProductNotPublic: PASS (sản phẩm DRAFT không public -> trả về null).
  + pdpProductImageR2Key: PASS (ảnh nạp từ D1 ProductImage kèm r2Key hợp lệ).
  + pdpRelatedProductsQuery: PASS (truy vấn sản phẩm liên quan từ D1 loại trừ chính sản phẩm đó).
- ESLint: 0 errors, 0 warnings.
- TypeScript: 0 errors (`npx tsc --noEmit`).
- Next.js build: PASS (`npm run build` thành công 39/39 routes, `/product/[id]` compiled động).
- Vinext check: PASS (97% compatible).
- HTTP Live Testing trên `http://localhost:3001`:
  + `/product/lenovo-legion-5-pro-16arx8`: 200 OK, render đầy đủ dữ liệu thật D1, Gallery R2, Specs, Related Products.
  + `/product/lenovo-legion-5-pro-16arx8?sku=L5P-R7-16-1TB-4060`: 200 OK, giá hiển thị 35.990.000đ khớp biến thể.
  + `/product/p-legion-5-pro`: 307 Redirect (NEXT_REDIRECT) trỏ về `/product/lenovo-legion-5-pro-16arx8`.
  + `/product/non-existent-product-12345`: 404 Not Found.

Cloudflare Runtime:
- Standalone Verification Worker (`npm run verify:cf`): 100% PASS trên Miniflare D1/R2.
- Local Next.js Runtime: Tích hợp D1 Prisma adapter, API media fallback bridge đảm bảo hình ảnh hiển thị mượt mà.
- vinext check: 97% compatible với Cloudflare Workers.

Known Limitations:
- Playwright runner nội bộ gặp hạn chế tải binary từ Azure CDN (404); kiểm thử đã được thực hiện bằng miniflare Worker verification, HTTP curl/fetch assertions, và Chrome DevTools MCP.
- Tồn kho hiển thị là tổng hợp SKU (`variant.stock`), chưa quản lý từng SerialUnit vật lý (sẽ triển khai ở Inventory Foundation).
- Tính năng Reviews: Do DB chưa có model Review thật, giao diện hiển thị Empty State chân thực cùng form đóng góp ý kiến; loại bỏ hoàn toàn các review giả.

Next Task:
STORE-08 — Search
```

```text
Task: STORE-08
Status: PASS
Ngày: 2026-10-08

Mục tiêu:
Xây dựng hệ thống tìm kiếm laptop thực tế cho website Citilap, sử dụng Cloudflare D1, hỗ trợ tìm kiếm theo tên, model, thương hiệu và cấu hình máy, kết hợp gợi ý trực tiếp (autocomplete), bộ lọc, sắp xếp và phân trang server-side. Tuyệt đối không dùng mock fallback hay kết quả giả.

Search Architecture:
- Kiến trúc tập trung xung quanh `src/server/services/search.service.ts`, kết nối trực tiếp với Cloudflare D1 thông qua Prisma Client D1 adapter.
- Tận dụng và tích hợp chặt chẽ với Catalog Service, tái sử dụng các model và mapper của hệ sinh thái Citilap: `Brand`, `Category`, `Product`, `ProductVariant`, `ProductImage`.
- Phục vụ hai tầng tiêu thụ:
  + Server Components (`/search/page.tsx`): Tìm kiếm và render trực tiếp SSR với facets, pagination, và sorting.
  + Client Components (`SearchAutocomplete` trong Header): Gợi ý nhanh (suggestions) qua API `/api/search/suggestions`.
- Tách bạch rõ ràng giữa tầng Service logic, API routes (`/api/search`, `/api/search/suggestions`), và UI presentation (`SearchListingContainer`, `SearchAutocomplete`, `ProductCard`).

Search API:
- `GET /api/search`:
  + Validation qua Zod (`SearchQuerySchema`): kiểm soát độ dài query (max 100 ký tự), các tham số filter (brand, category, condition, ram, storage, cpu, gpu, minPrice, maxPrice), sort options, và phân trang (page min 1, limit 1-50, default 12).
  + Trả về cấu trúc chuẩn: `{ success: true, data: { products, facets, pagination: { total, page, pageSize, totalPages } }, meta: { executionTimeMs } }`.
  + Ẩn hoàn toàn sản phẩm DRAFT/ARCHIVED (`status: 'ACTIVE'`).
- `GET /api/search/suggestions`:
  + Validation qua Zod (`SuggestionsQuerySchema`): query length max 100, limit max 15 (default 6).
  + Trả về cấu trúc gợi ý đa tầng: `{ success: true, data: { products, brands, categories, total } }`.
  + Hỗ trợ thumbnail ảnh tối ưu từ ProductImage metadata, giá tương ứng SKU, và highlight cấu hình.

D1 Query Strategy:
- Cơ chế Tokenization & Normalization (`normalizeSearchQuery`):
  + Loại bỏ ký tự đặc biệt nguy hiểm, chuẩn hóa khoảng trắng thừa, chuyển về chữ thường.
  + Tách chuỗi query thành các token riêng biệt (ví dụ: `legion 4060` -> `['legion', '4060']`).
- Multi-token matching qua Prisma SQLite D1:
  + Mỗi token được kết hợp bằng mệnh đề `AND`.
  + Trong từng token, tìm kiếm trên tổ hợp các trường: Product `name`, `model`, `series`, `slug`, Brand `name`, hoặc liên kết qua ProductVariant `sku`, `cpu`, `gpu`, `ram`, `storage`.
  + Tận dụng tối đa các chỉ mục B-tree có sẵn trên D1 (`Product_status_idx`, `Product_categoryId_idx`, `Product_brandId_idx`, `Product_model_idx`, `Product_series_idx`, `ProductVariant_sku_key`, `ProductVariant_status_idx`).
- Không tạo raw SQL tùy tiện, tránh hoàn toàn nguy cơ SQL Injection.
- Facets được truy vấn đồng thời trong một pool duy nhất, tính toán khoảng giá (minPrice, maxPrice) và các danh mục thông số thực tế để render bộ lọc chính xác.

Ranking:
- Thuật toán tính điểm liên quan xác định (Deterministic Relevance Scoring) dựa trên 7 cấp độ trọng số:
  1. Exact SKU hoặc Model match (+100 điểm).
  2. Exact Product Name match (+80 điểm).
  3. Prefix Match trên Name / Model (+50 điểm).
  4. Brand exact match (+40 điểm).
  5. Multi-token match đầy đủ trên Product + Variant (+30 điểm).
  6. Variant specs match (CPU/GPU/RAM/Storage/Series) (+20 điểm).
  7. Substring partial match (+10 điểm).
- Tie-break: Sắp xếp phụ theo `featured: desc`, sau đó theo `id: asc` để kết quả luôn ổn định 100% giữa các lần tải trang. Không dùng `Math.random()` hay popularity giả mạo.

Variant Matching:
- Giải quyết bài toán một Product có nhiều SKU với cấu hình và giá khác nhau:
  + Khi người dùng tìm kiếm cấu hình cụ thể (ví dụ: `RTX 4060`, `32GB`, hoặc mã SKU `L5P-R7-16-1TB-4060`), hàm `resolveRepresentativeVariant` sẽ đối chiếu các token tìm kiếm với danh sách variants đang hoạt động (`status: ACTIVE`).
  + Variant nào có điểm khớp cấu hình cao nhất sẽ được chọn làm đại diện cho ProductCard.
  + Giá (`price`, `originalPrice`, `discountPercent`) và thông số (CPU, GPU, RAM, SSD) trên ProductCard được ghi đè chính xác theo SKU này, không lấy nhầm giá của SKU rẻ hơn để quảng bá cấu hình đắt hơn.
  + Thẻ sản phẩm tự động deep-link trực tiếp đến `/product/{slug}?sku={sku}` để người dùng mở đúng cấu hình mong muốn trên PDP.

Autocomplete:
- Tích hợp component `SearchAutocomplete` vào cả Desktop Header và Mobile Drawer.
- Debounce 250ms tối ưu, chỉ kích hoạt tìm kiếm khi query đạt từ 2 ký tự trở lên.
- Xử lý race-condition triệt để qua `AbortController`: các request cũ đang bay sẽ bị abort ngay khi có ký tự mới, đảm bảo kết quả gõ nhanh không bị ghi đè sai thứ tự.
- Gợi ý phân loại trực quan: Thương hiệu phù hợp, Danh mục phù hợp, và Danh sách sản phẩm với ảnh R2, giá VND và thông số nổi bật.
- Nút "Xem tất cả kết quả cho '...'" dẫn thẳng về trang `/search?q=...`.
- Tự động đóng dropdown khi click outside hoặc ấn phím Escape.

Filters:
- Tái sử dụng và mở rộng hệ thống Category Filters từ STORE-06:
  + Lọc theo Brand, Category, Khoảng giá (presets & custom min/max), Tình trạng (Condition: NEW, LIKE_NEW, OPEN_BOX,...), CPU, GPU, RAM, SSD.
  + Hỗ trợ hiển thị Active Filter Chips với nút xóa từng filter hoặc "Xóa tất cả".
  + URL là Single Source of Truth cho toàn bộ trạng thái filter (`/search?q=...&brand=...&ram=...`). Refresh hoặc share URL bảo toàn nguyên vẹn kết quả.

Pagination:
- Phân trang server-side hoàn chỉnh:
  + Mặc định 12 sản phẩm/trang (hỗ trợ điều chỉnh qua tham số limit).
  + Trả về `total`, `page`, `totalPages`, không fetch toàn bộ catalog rồi slice trên client.
  + Khi thay đổi query hoặc bất kỳ filter nào, trang tự động reset về page 1.
  + Xử lý graceful khi `page` vượt quá tổng số trang (trả về mảng rỗng, không sập trang).

SEO:
- Trang `/search` được gắn thẻ meta `robots: { index: false, follow: true }` để ngăn công cụ tìm kiếm index hàng loạt kết quả tìm kiếm nội bộ gây loãng crawl budget, nhưng vẫn follow các link sản phẩm.
- Metadata Title và Description động theo từ khóa tìm kiếm (`Tìm kiếm: {query} | Citilap`).
- Không làm thay đổi canonical URL chuẩn của Category hay Product Detail.

Performance:
- Tốc độ phản hồi API trên D1 Miniflare / Local Node:
  + Suggestions API: ~15-30ms.
  + Search API: ~35-70ms.
- Tối ưu I/O D1: Giới hạn số lượng bản ghi trả về, chỉ select các trường cần thiết cho Card (`id`, `name`, `slug`, `model`, `series`, `basePrice`, `brand`, `variants`, `images`).
- Không cần di trú sang FTS5 do số lượng bản ghi hiện tại đáp ứng độ trễ sub-100ms với B-tree indexing hiện có.

Responsive:
- Hoàn toàn responsive trên 3 breakpoints chính:
  + Mobile (390px): Search bar nổi bật, Drawer bộ lọc trượt mượt mà, lưới sản phẩm 2 cột tối ưu cho điện thoại.
  + Tablet (768px): Lưới sản phẩm 2-3 cột.
  + Desktop (1440px): Sidebar bộ lọc cố định bên trái, lưới sản phẩm 3 cột rộng rãi, Autocomplete dropdown căn chuẩn kích thước thanh tìm kiếm.

Accessibility:
- ARIA Combobox Pattern đầy đủ:
  + `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`.
  + `role="listbox"` và `role="option"` cho danh sách gợi ý.
- Hỗ trợ bàn phím 100%:
  + Phím mũi tên Xuống/Lên (ArrowDown / ArrowUp) để điều hướng các gợi ý.
  + Phím Enter để chọn gợi ý đang highlight hoặc submit tìm kiếm.
  + Phím Escape để đóng nhanh menu gợi ý.
- Label ẩn (`sr-only`) rõ ràng cho input tìm kiếm.

Verification:
- Cloudflare Workers verification suite (`npm run verify:cf`): 10/10 tests STORE-08 PASS (100% allPassed: true):
  1. searchBasicProductName: PASS (tìm "legion" -> Lenovo Legion 5 Pro).
  2. searchByBrandName: PASS (tìm "asus" -> Asus ROG Zephyrus).
  3. searchByCpuGpuSpecs: PASS (tìm "4060" -> match cấu hình GPU RTX 4060).
  4. searchMultiKeywordTokenization: PASS (tìm "legion 4060" -> match chính xác máy có cả hai điều kiện).
  5. searchVariantSpecificSkuMatching: PASS (tìm "L5P-R7-16-1TB-4060" -> map chính xác SKU và giá 35.990.000đ).
  6. searchWithFiltersBrandAndRam: PASS (kết hợp query + filter brand ASUS và ram 16).
  7. searchPaginationPageSize: PASS (kiểm tra phân trang, total, trang 1 & 2 tách biệt không duplicate).
  8. searchSuggestionsApi: PASS (gợi ý nhanh đa phân loại).
  9. searchDraftProductsHidden: PASS (sản phẩm DRAFT/ARCHIVED bị loại bỏ hoàn toàn).
  10. searchNonExistentQueryEmptyResult: PASS (query lạ trả về danh sách rỗng, không crash).
- TypeScript (`npx tsc --noEmit`): 0 errors.
- ESLint (`npm run lint`): 0 errors, 0 warnings.
- Next.js build (`npm run build`): PASS (41/41 routes compiled thành công, bao gồm `/search`, `/api/search`, `/api/search/suggestions`).
- Vinext check (`npx vinext check`): PASS (97% Cloudflare Workers compatible).
- HTTP Live Testing trên `http://localhost:3001`:
  + Suggestions API `GET /api/search/suggestions?q=legion`: 200 OK.
  + Search API `GET /api/search?q=RTX+4060`: 200 OK.
  + `/search?q=legion`: 200 OK, hiển thị đầy đủ thẻ sản phẩm thật, bộ lọc, chip, và phân trang.
  + `/search?q=RTX+4060`: 200 OK.
  + `/search?brand=lenovo&ram=16`: 200 OK.
  + `/search?q=xyzsupernonexistentquery12345`: 200 OK, hiển thị Empty State "Không tìm thấy sản phẩm nào" cùng các gợi ý hữu ích.
  + Không hồi quy (regression) trên các route cũ: `/` (200 OK), `/category` (200 OK), `/category/laptop-gaming` (200 OK), `/product/lenovo-legion-5-pro-16arx8` (200 OK).

Known Limitations:
- Hỗ trợ tìm kiếm tiếng Việt không dấu hiện dùng normalization cơ bản của SQLite/JS. Nếu trong tương lai có nhu cầu tìm kiếm tiếng Việt không dấu quy mô lớn (FTS5 unaccent), có thể xem xét bổ sung tokeniser chuyên biệt khi dữ liệu vượt quá 10.000 sản phẩm.
- Tồn kho hiển thị trên card tìm kiếm phản ánh tổng tồn của biến thể đại diện (`variant.stock`), chưa quản lý theo serial vật lý (sẽ hoàn thiện tại STORE-09 Inventory Foundation).

Next Task:
STORE-09 — Inventory Foundation
```

```text
Task: STORE-09
Status: PASS
Ngày: 2026-10-08

Mục tiêu:
Xây dựng hệ thống quản lý tồn kho nền tảng cho Citilap trên Cloudflare D1. Quản lý kho đa địa điểm, máy laptop vật lý theo từng serial, hàng hóa không serial theo số lượng, sổ cái biến động kho bất biến (append-only ledger), giữ kho có thời hạn (reservation), gán máy (allocation), tách bạch hoàn toàn đặt cọc thương mại với giữ máy vật lý, và bảo đảm tính toàn vẹn đồng thời (concurrency & idempotency) trên SQLite D1.

Inventory Architecture:
- Phân tách hai mô hình tồn kho cốt lõi:
  + Serialized Inventory (`inventoryType = 'SERIALIZED'`): Quản lý từng máy laptop vật lý qua thực thể `SerialUnit`. Mỗi máy có Serial Number độc nhất, kho lưu trữ, tình trạng (condition) và trạng thái vòng đời riêng biệt.
  + Quantity Inventory (`inventoryType = 'QUANTITY'`): Quản lý hàng hóa phổ thông (phụ kiện, linh kiện) theo số lượng tổng hợp tại từng kho thông qua `InventoryBalance`.
- Sổ cái tồn kho bất biến (Stock Ledger): Mọi biến động nhập, xuất, giữ, nhả, phân máy, chuyển kho đều bắt buộc ghi vào bảng `InventoryTransaction`. Không ghi đè lịch sử.
- Reservation Engine: Giữ hàng có thời hạn (`expiresAt`), tự động hoàn trả khả dụng khi hết hạn hoặc bị hủy, bảo vệ chống race condition bằng atomic conditional update.
- Allocation Engine: Gán máy vật lý đích danh (`allocateSerial`) cho đơn hàng theo chỉ định của nhân viên kho/bán hàng hoặc workflow xử lý.
- Tách biệt đặt cọc và giữ máy (Deposit Separation): Đặt cọc cấu hình không tự động khóa cứng hoặc phân bổ SerialUnit vật lý, bảo toàn quyền điều phối linh hoạt của Citilap.
- Single Source of Truth: Tồn kho khả dụng được tính toán động từ SerialUnit (cho serialized) và InventoryBalance (cho quantity). Cung cấp hàm đồng bộ tương thích ngược `syncLegacyProductStock` cho các storefront read-paths hiện tại.

Warehouse:
- Bảng `Warehouse`: `id`, `code` (UNIQUE), `name`, `address`, `status` (ACTIVE/INACTIVE), `sortOrder`, `createdAt`, `updatedAt`.
- Không hard-code danh sách địa điểm trong domain logic; toàn bộ truy vấn dựa trên mã định danh kho.
- Dữ liệu development seed gồm 3 kho: `wh-hanoi` (Hà Nội - Cầu Giấy), `wh-bacninh` (Bắc Ninh - TP Bắc Ninh), `wh-hcm` (TP.HCM - Quận 10).

SerialUnit:
- Bảng `SerialUnit`: `id`, `serialNumber` (UNIQUE), `productId`, `variantId`, `warehouseId`, `condition`, `status`, `receivedAt`, `createdAt`, `updatedAt`.
- Finite State Machine nghiêm ngặt:
  + Các trạng thái: `AVAILABLE`, `RESERVED`, `ALLOCATED`, `SOLD`, `QC_HOLD`, `REPAIR`, `DAMAGED`, `RETURNING`, `RETURNED`.
  + Chỉ trạng thái `AVAILABLE` mới được phép bán hoặc giữ kho (`reserve`).
  + Chỉ trạng thái `AVAILABLE` hoặc `RESERVED` đúng cho reference mới được phép gán máy (`allocate`).
  + Chuyển trạng thái hợp lệ được kiểm soát chặt chẽ trong `validateSerialStateTransition`. Bất kỳ vi phạm nào đều bị chặn ngay lập tức.
- Serial number không bao giờ bị lộ ra ngoài giao diện công khai (Storefront/Public API).

Quantity Inventory:
- Bảng `InventoryBalance`: `id`, `warehouseId`, `variantId`, `onHand`, `reserved`, `createdAt`, `updatedAt`.
- Cặp `(warehouseId, variantId)` có ràng buộc duy nhất (UNIQUE INDEX).
- Ràng buộc bất biến: `onHand >= 0`, `reserved >= 0`, `reserved <= onHand`, `available = onHand - reserved`. CHECK constraint SQL ngăn chặn tuyệt đối tồn kho âm.

Ledger:
- Bảng `InventoryTransaction`:
  + Thuộc tính: `id`, `warehouseId`, `productId`, `variantId`, `serialUnitId`, `transactionType`, `quantityDelta`, `referenceType`, `referenceId`, `idempotencyKey`, `actorId`, `reason`, `createdAt`.
  + Transaction Types: `RECEIVE`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `RESERVE`, `RELEASE`, `ALLOCATE`, `SALE`, `RETURN`, `DAMAGE`.
  + Append-only: Nghiêm cấm UPDATE và DELETE. Mọi điều chỉnh đều là giao dịch mới với delta bù trừ.
  + Không ghi ledger đối với các thao tác thất bại hoặc xung đột concurrency.

Reservation:
- Bảng `InventoryReservation`:
  + Thuộc tính: `id`, `referenceType`, `referenceId`, `variantId`, `serialUnitId`, `quantity`, `status` (`ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`, `CANCELLED`), `expiresAt`, `idempotencyKey`, `payloadHash`, `createdAt`, `updatedAt`.
  + Hỗ trợ cả serialized (giữ đúng 1 SerialUnit) và quantity (tăng `reserved` trong `InventoryBalance`).
  + Có thời hạn hiệu lực (`expiresAt`). Hàm `expireActiveReservations` quét và khôi phục tồn kho an toàn.
  + Không giữ hàng khi người dùng chỉ bấm "Add to Cart" (tránh cart hoarding/DOS kho).

Allocation:
- Thao tác nghiệp vụ: `allocateSerial(serialUnitId, orderReference, actorId)`.
- Xác minh máy vật lý phải ở trạng thái hợp lệ, không bị bán (`SOLD`) hay giữ bởi giao dịch khác.
- Chuyển `SerialUnit.status = 'ALLOCATED'` và ghi nhận sự kiện `ALLOCATE` trong sổ cái.

Deposit Separation:
- Triết lý nghiệp vụ: Đặt cọc laptop like-new/used là đặt cọc cấu hình (SKU demand), KHÔNG phải giữ máy vật lý cụ thể.
- Hai khách hàng cùng đặt cọc một cấu hình khi kho chỉ có 1 chiếc: Hệ thống ghi nhận nhu cầu thương mại qua `recordCommercialDeposit`, KHÔNG tạo `InventoryReservation` khóa cứng máy và KHÔNG tự ý gán SerialUnit theo thứ tự thời gian.
- Nhân viên bán hàng/điều phối kho có toàn quyền xem xét và thực hiện `allocateSerial` cho khách hàng được ưu tiên theo chính sách kinh doanh thực tế.

Availability:
- Source of truth duy nhất:
  + Serialized: Số lượng `SerialUnit` có `status = 'AVAILABLE'` thuộc SKU/Variant đó.
  + Quantity: `SUM(onHand - reserved)` từ các bản ghi `InventoryBalance` thuộc SKU/Variant đó.
- API công khai: `GET /api/inventory/availability?sku=...`.
  + Trả về tổng tồn khả dụng (`availableStock`), trạng thái (`inStock`, `inventoryType`), và chi tiết theo tình trạng máy (`conditions`).
  + Tuyệt đối không để lộ danh sách serial number, giá vốn hay thông tin kho nội bộ ra ngoài.

D1 Concurrency Strategy:
- Triển khai trên Cloudflare D1 với SQLite semantics: Không dùng postgres row-locks (`SELECT FOR UPDATE`), không dùng interactive multi-step transactions giữ kết nối.
- Sử dụng **Atomic Conditional Update** làm chốt chặn cạnh tranh tuyệt đối:
  + Serialized: `UPDATE "SerialUnit" SET "status" = 'RESERVED', ... WHERE "id" = ? AND "status" = 'AVAILABLE'`
  + Quantity: `UPDATE "InventoryBalance" SET "reserved" = "reserved" + ? WHERE "warehouseId" = ? AND "variantId" = ? AND ("onHand" - "reserved") >= ?`
- Kiểm tra `meta.changes === 0`: Nếu số dòng ảnh hưởng bằng 0, request đã thua cuộc trong race condition và lập tức bị từ chối với lỗi `409 INVENTORY_CONFLICT`.
- Tuyệt đối không sử dụng Worker memory mutex (không an toàn trên đa cụm Worker) hay KV (eventually consistent).

Idempotency:
- Mọi mutation nhạy cảm đều hỗ trợ `idempotencyKey`.
- Lưu trữ hash SHA-256 của payload đi kèm (`payloadHash`):
  + Trùng key, trùng payload: Trả về kết quả giao dịch ban đầu với cờ `isIdempotentReplay: true`, không tạo giao dịch hay dòng ledger trùng lặp.
  + Trùng key, khác payload: Bị từ chối ngay lập tức với mã lỗi `IDEMPOTENCY_PAYLOAD_MISMATCH` (HTTP 422).

Migration:
- `d1-migrations/0004_inventory_foundation.sql`:
  + Bổ sung cột `inventoryType` (`SERIALIZED` / `QUANTITY`) vào bảng `Product`.
  + Tạo mới 5 bảng: `Warehouse`, `SerialUnit`, `InventoryBalance`, `InventoryTransaction`, `InventoryReservation`.
  + Thiết lập 11 chỉ mục (Indexes) tối ưu cho việc truy vấn theo SKU, Serial, Warehouse, Status và IdempotencyKey.
  + Đã thực thi thành công trên local D1 (37 SQL statements) mà không làm mất hay sai lệch dữ liệu hiện có.

Tests:
- Bộ Integration & Concurrency Test Suite gồm 10 kịch bản kiểm thử độc lập chạy trực tiếp trên Cloudflare D1 Miniflare (`npm run verify:cf`):
  1. `sameSerialRace`: 2 requests song song tranh chấp 1 SerialUnit -> Đúng 1 request thành công, 1 request nhận HTTP 409 Conflict; tồn kho nhất quán 100%.
  2. `repeatedSameIdempotencyKey`: Replay cùng key và payload -> Nhận kết quả trước đó, chỉ ghi nhận duy nhất 1 bản ghi ledger.
  3. `idempotencyPayloadMismatch`: Replay cùng key với payload sửa đổi -> Bị từ chối với lỗi `IDEMPOTENCY_PAYLOAD_MISMATCH`.
  4. `quantityStockRace`: 2 requests song song giữ 1 sản phẩm phụ kiện khi kho chỉ còn 1 -> Đúng 1 thành công, 1 nhận 409 Conflict; tồn kho reserved = 1, onHand = 1.
  5. `warehouseTransfer`: Chuyển máy giữa 2 kho -> Cập nhật chính xác `warehouseId`, ghi nhận cặp ledger `TRANSFER_OUT` và `TRANSFER_IN`.
  6. `reservationExpiration`: Hết hạn hold -> Trạng thái máy tự động hoàn trả về `AVAILABLE`, ghi nhận ledger `RELEASE`.
  7. `reserveVsExpireRace`: Tranh chấp giữa giữ và giải phóng kho -> Xử lý trọn vẹn, không sinh trạng thái rác.
  8. `allocationConflict`: Cố gắng gán 1 máy đã được allocate cho 1 đơn khác -> Bị từ chối dứt khoát.
  9. `failedMutationRollback`: Giả lập lỗi giữa chừng -> Không để xảy ra tình trạng biến động tồn kho mà thiếu ledger tương ứng.
  10. `commercialDepositSeparation`: 2 đơn cọc cùng SKU khi kho có 1 máy -> Không tạo hard reservation, SerialUnit vẫn ở trạng thái `AVAILABLE` cho nhân viên chủ động phân bổ sau.
- Kết quả kiểm định tự động: 10/10 tests PASS, `allPassed: true`.
- TypeScript (`npx tsc --noEmit`): 0 errors.
- ESLint (`npm run lint`): 0 errors, 0 warnings.
- Build Next.js (`npm run build`): Thành công toàn bộ 42 routes (bao gồm endpoint mới `/api/inventory/availability`).
- Vinext Compatibility (`npx vinext check`): 97% compatible với Cloudflare Workers.

Known Risks:
- Expiration Engine: Trên môi trường local hiện tại, việc quét hết hạn được thực hiện theo cơ chế lazy invocation hoặc worker endpoint. Trong môi trường production Cloudflare, cần khai báo `[triggers.crons]` trong `wrangler.toml` để chạy định kỳ mỗi phút.
- Legacy Storefront Compatibility: Hiện tại `ProductCard`, `StockBadge`, `SearchListing` và `PDP` vẫn đọc dữ liệu qua trường aggregate `variant.stock` và `product.stock`. Hàm `syncLegacyProductStock` đảm bảo tính nhất quán giữa hai hệ thống cho đến khi STORE-10/11 hoàn tất việc chuyển giao toàn bộ sang Inventory Service.

Next Task:
STORE-10 — Scope Reset & Simple Cart, Checkout & Order Management (Completed)
```

---

# 12. SCOPE RESET & STRATEGY UPDATE (2026-10-09)

> **Quyết định chính thức từ chủ dự án (có độ ưu tiên cao nhất, thay thế các roadmap cũ):**
> CitiLap Ecommerce là website bán hàng hướng tới khách hàng (customer-facing sales storefront), **KHÔNG phải hệ thống ERP hay quản trị vận hành nội bộ.**

## 12.1 Định hướng cốt lõi
Dự án tập trung vào:
1. Giao diện website hiện đại, chuyên nghiệp, trải nghiệm mượt mà.
2. Tối ưu chuyển đổi (conversion rate) và thân thiện người dùng di động (mobile-first).
3. Tìm kiếm, lọc và hiển thị laptop trực quan, đầy đủ thông số cấu hình.
4. Lựa chọn cấu hình SKU, giỏ hàng trực quan (localStorage, không bắt buộc đăng nhập).
5. Đặt hàng tinh gọn (Guest Checkout), lưu đơn hàng vào Cloudflare D1 với trạng thái `PENDING`.
6. Admin tiếp nhận thông tin đơn hàng và cập nhật trạng thái `PENDING -> COMPLETED`.

## 12.2 Đóng băng (Freeze) các module vận hành / ERP
Các nghiệp vụ sau đây **đã được một hệ thống khác đảm nhiệm** bên ngoài website:
- **Tồn kho vật lý & Serial:** Đóng băng toàn bộ mở rộng Inventory Foundation từ STORE-09. Đơn hàng mới tuyệt đối **KHÔNG trừ kho** (`Product.stock`, `ProductVariant.stock`, `InventoryBalance`), **KHÔNG đổi trạng thái SerialUnit**, **KHÔNG tạo InventoryReservation**.
- **Giao dịch tiền & cổng thanh toán:** Không tích hợp cổng thanh toán trực tuyến (VNPay, Momo, Stripe...), không lưu thông tin thẻ/tài khoản ngân hàng, không xử lý giao dịch tiền. Toàn bộ đơn hàng là yêu cầu mua hàng / đặt trước chờ nhân viên tư vấn gọi xác nhận.
- **Tài khoản người dùng:** Khách mua hàng là khách vãng lai (Guest Checkout), không bắt buộc tạo tài khoản, không sinh tài khoản ảo (`guest-...@guest.citilap.local`).
- **Nghiệp vụ khác:** Thu cũ đổi mới, ký gửi, sửa chữa dịch vụ, kế toán, hóa đơn GTGT, điều chuyển liên kho.

---

```text
Task: STORE-10
Status: PASS
Ngày: 2026-10-09

Mục tiêu:
Xây dựng luồng Giỏ hàng, Checkout tinh gọn (Guest Checkout) và Lưu đơn hàng vào Cloudflare D1 theo đúng Scope Reset. Đảm bảo trải nghiệm mua hàng mượt mà, xác thực giá phía server (authoritative price enforcement), bảo vệ idempotency bằng SHA-256 hash, màn hình xác nhận đơn hàng token-guarded bảo vệ quyền riêng tư, và giao diện Admin theo dõi/cập nhật trạng thái đơn (PENDING -> COMPLETED).

Cart:
- CartContext sử dụng localStorage phía client cho khách vãng lai (Guest Cart).
- Thêm, sửa số lượng, xóa sản phẩm, dọn sạch giỏ hàng tức thì, badge số lượng trên header cập nhật realtime.
- Tự động đồng bộ giỏ hàng, thông báo toast khi thao tác thành công.

Checkout:
- Route: `/checkout`.
- Thiết kế Mobile-first responsive, 2 cột trên desktop, sticky order summary.
- Thu thập thông tin khách hàng: Tên, Số điện thoại, Email (tùy chọn), Địa chỉ giao hàng hoặc Lựa chọn Nhận tại showroom CitiLap.
- Ghi chú đơn hàng.
- Banner minh bạch: Thông báo rõ "Đơn hàng của quý khách là yêu cầu mua hàng. Không cần thanh toán ngay lúc này. Nhân viên CitiLap sẽ liên hệ để xác nhận cấu hình và giao hàng."
- Chống spam/click đúp (Double-click protection) và sinh Idempotency-Key duy nhất cho mỗi phiên checkout.

Order Validation & Persistence:
- Service: `src/server/services/order.service.ts`.
- Server-side Authoritative Price: Giá và thông tin cấu hình được truy vấn trực tiếp từ Cloudflare D1 (bảng `ProductVariant` và `Product`). Không bao giờ tin tưởng giá từ client gửi lên.
- Tính toán chính xác: Subtotal, Shipping fee, Discount, Total.
- Snapshot dữ liệu bất biến: Lưu `productNameSnapshot`, `skuSnapshot`, `variantNameSnapshot`, `priceSnapshot`, `lineTotal` trên từng `OrderItem`.
- Trạng thái đơn hàng: Mặc định luôn là `PENDING`.
- Không tạo tài khoản ảo: `userId: null` (đơn hàng khách vãng lai hợp lệ).
- SHA-256 Idempotency:
  + Trùng key + trùng payload: Trả về đơn hàng đã tạo trước đó (`isIdempotentReplay: true`), không sinh đơn trùng.
  + Trùng key + khác payload: Từ chối với lỗi `IDEMPOTENCY_PAYLOAD_MISMATCH` (HTTP 422).
- Zero Stock Mutation: Tuyệt đối không trừ kho (`Product.stock`, `ProductVariant.stock`, `InventoryBalance`), không đổi trạng thái `SerialUnit`, không tạo `InventoryReservation`.

Success Page:
- Route: `/checkout/success?orderNumber=...&token=...`.
- Được bảo vệ bởi confirmationToken (HMAC/Hash) để khách hàng tra cứu ngay sau khi đặt mà không cần đăng nhập.
- Hiển thị mã đơn hàng, trạng thái PENDING (Chờ xác nhận), danh sách sản phẩm với giá snapshot, thông tin khách hàng được làm mờ (masked phone `098***222`) để bảo vệ dữ liệu cá nhân.

Admin Order Management:
- Route danh sách: `/admin/orders`.
- Lọc đơn theo trạng thái (Tất cả, PENDING, COMPLETED), tìm kiếm theo mã đơn, tên hoặc số điện thoại khách hàng.
- Nút thao tác nhanh "Đã xử lý xong" (Chuyển trạng thái sang `COMPLETED`).
- Route chi tiết: `/admin/orders/[id]`.
- Xem đầy đủ thông tin khách hàng, địa chỉ, ghi chú, snapshot sản phẩm và cấu hình.
- Thao tác cập nhật trạng thái `PENDING` -> `COMPLETED`, tự động lưu thời điểm hoàn thành `completedAt`.

D1 Database Migrations:
- `d1-migrations/0005_simple_order.sql`: Cập nhật bảng `Order` cho phép `userId NULL`, thêm các cột `subtotalAmount`, `shippingFee`, `discountAmount`, `totalAmount`, `payloadHash`, `completedAt`. Thêm các trường snapshot vào `OrderItem`.
- `d1-migrations/0006_order_item_serial.sql`: Bổ sung cột `serialUnitId` cho `OrderItem` để đồng bộ hoàn toàn giữa Prisma model và schema SQLite D1.

Tests & Verification:
- Bộ Integration Test Suite trên Cloudflare D1 Miniflare (`npm run verify:cf`):
  1. `guestOrderCreation`: PASS (Tạo đơn thành công với `userId: null`, trạng thái PENDING).
  2. `serverPriceEnforcement`: PASS (Đơn hàng lấy đúng giá từ D1, khớp subtotal).
  3. `noStockDecrementVerified`: PASS (Tồn kho `Product.stock` & `variant.stock` giữ nguyên 7 -> 7).
  4. `noSerialUnitAlterationVerified`: PASS (Số lượng SerialUnit AVAILABLE giữ nguyên 2 -> 2).
  5. `noInventoryReservationVerified`: PASS (Số lượng bản ghi InventoryReservation giữ nguyên 32 -> 32).
  6. `idempotencyReplay`: PASS (Cùng key & payload trả về kết quả cũ, cờ `isIdempotentReplay: true`).
  7. `idempotencyPayloadMismatch`: PASS (Cùng key khác payload bị từ chối `IDEMPOTENCY_PAYLOAD_MISMATCH`).
  8. `invalidItemHandling`: PASS (Từ chối sản phẩm không tồn tại).
  9. `adminStatusUpdate`: PASS (Cập nhật thành công trạng thái PENDING -> COMPLETED, set `completedAt`).
  10. `adminOrderListing`: PASS (Lấy danh sách đơn hàng cho admin phân trang chính xác).
- Tổng thể: 10/10 tests PASS, `allPassed: true`.
- TypeScript (`npx tsc --noEmit`): 0 errors.
- ESLint (`npm run lint`): 0 errors, 0 warnings.
- Build Next.js (`npm run build`): Thành công toàn bộ 44+ routes.

Known Limitations:
- Vì Cloudflare D1 chưa hỗ trợ nested transactions hoàn chỉnh trong worker environment, các snapshot order items được lưu trữ qua tuần tự batch inserts đảm bảo tính toàn vẹn.

Next Roadmap:
- STORE-11: Storefront UX, Conversion & Order Journey Polish (Hoàn thành)
- STORE-12: SEO, Sitemap, Structured Data & OpenGraph
- STORE-13: Security Hardening & Rate Limiting
- STORE-14: Production Cloudflare Pages / Workers Deployment
```

---

```text
Task: STORE-11
Status: PASS
Ngày: 2026-10-09

Mục tiêu:
Storefront UX, Conversion & Order Journey Polish. Nâng cao trải nghiệm người dùng trên toàn bộ luồng mua hàng (Homepage -> Search -> PDP -> Cart -> Checkout -> Success -> Admin Orders), giải quyết triệt để rủi ro dữ liệu không nguyên tử trên Cloudflare D1 bằng batching, loại bỏ các cam kết thương mại không có căn cứ (freeship/VAT giả định), bảo vệ quyền riêng tư qua data masking và token verification, đồng thời kiểm thử E2E thực tế trên trình duyệt xác nhận hành trình mua hàng trọn vẹn và không làm thay đổi tồn kho (Zero Inventory Mutation).

Chi tiết thực hiện:

1. Đảm bảo tính nguyên tử lưu trữ đơn hàng trên Cloudflare D1 (Atomic Order Persistence):
- Vấn đề: `@prisma/adapter-d1` không hỗ trợ native nested transactions trong môi trường edge/worker, các thao tác `$transaction` độc lập có nguy cơ để lại đơn hàng rác nếu chèn order items gặp lỗi.
- Giải pháp: Trong `src/server/services/order.service.ts`, sử dụng `d1Database.batch([orderStmt, ...itemStmts])` để thực thi toàn bộ câu lệnh SQL chèn Order và OrderItems trong một khối SQLite transaction nguyên tử duy nhất trên Cloudflare D1. Nếu bất kỳ câu lệnh nào thất bại, toàn bộ batch bị hủy (rollback).
- Thêm cơ chế rollback đền bù (compensating cleanup) cho non-D1 runtimes.
- Thêm kiểm thử simulated failure ép lỗi ở item thứ 2 để chứng minh không có đơn hàng mồ côi (orphaned order) nào tồn tại trong D1.

2. Chuẩn hóa cam kết thương mại và chính sách bán hàng (Commercial Accuracy & Policy Grounding):
- Rà soát và loại bỏ các cam kết thương mại chưa có căn cứ thực tế:
  + Giỏ hàng (`/cart`): Xóa bỏ dòng chữ "Miễn phí ship cho đơn từ 20 triệu!" và "(Đã bao gồm VAT)". Đổi phí vận chuyển thành "Xác nhận khi tư vấn", tổng tiền thành "Tạm tính dự kiến (chưa gồm phí ship nếu có)".
  + Trang chi tiết sản phẩm (`ProductActions.tsx`): Bỏ cam kết "Giao hàng tận nơi miễn phí" và "Miễn phí ship nội thành 10km", chuẩn hóa thành "Hỗ trợ giao hàng & kiểm tra máy" và "Hỗ trợ giao tận nơi toàn quốc, kiểm tra máy trước khi nhận".
  + Trang thanh toán (`/checkout`): Chuẩn hóa hiển thị phí ship "Chuyên viên sẽ xác nhận khi gọi", tổng tiền "Tạm tính dự kiến".
  + Trang hoàn tất (`/checkout/success`): Thêm ghi chú rõ ràng về việc phí vận chuyển sẽ được chuyên viên tư vấn thông báo và xác nhận khi gọi điện.

3. Bảo mật, Quyền riêng tư & Phân quyền:
- Bảo vệ trang xác nhận đơn hàng (`/checkout/success`) bằng `confirmationToken` (32 ký tự hex) được sinh an toàn cùng đơn hàng. Khách hàng chỉ truy cập được khi có token khớp với đơn.
- Che số điện thoại khách hàng (Phone Masking, ví dụ `098****655`) trên trang xác nhận công khai để chống lộ lọt thông tin cá nhân.
- Admin APIs (`/api/admin/orders`, `/api/admin/orders/[id]`): Xác thực token JWT của quản trị viên; từ chối 401 khi không có phiên đăng nhập hợp lệ.

4. Cam kết Tuyệt đối Không Biến Động Tồn Kho (Zero Inventory Mutation):
- Toàn bộ luồng tạo đơn, cập nhật đơn không tác động đến hệ thống kho ERP bên ngoài.
- Kiểm thử đối chứng xác nhận 100%:
  + `Product.stock` không thay đổi.
  + `ProductVariant.stock` không thay đổi.
  + Số lượng `SerialUnit` AVAILABLE không đổi.
  + Số lượng `InventoryReservation` không tăng thêm.

5. Kiểm thử E2E Thực tế trên Trình duyệt (End-to-End Browser Journey Validation):
- Kịch bản chạy trên Google Chrome:
  1. Trang chủ (`/`): Tải thành công giao diện desktop, thanh tìm kiếm sẵn sàng.
  2. Tìm kiếm: Nhập từ khóa "Lenovo Legion", gợi ý hiển thị tức thì, chọn sản phẩm "Lenovo Legion 5 Pro 16ARX8".
  3. Trang sản phẩm: Chọn cấu hình "32GB RAM / 1TB SSD" (SKU-LEGION-32-1TB). Giá cập nhật chính xác 35.990.000đ.
  4. Giỏ hàng: Thêm sản phẩm, giỏ hàng lưu vào localStorage, chuyển sang `/cart`, tăng số lượng lên 2 (Tạm tính: 71.980.000đ).
  5. Checkout: Nhập thông tin giao hàng ("Nguyễn Văn E2E Test", "0988776655", "Số 15 Cầu Giấy, Phường Quan Hoa, Hà Nội").
  6. Đặt hàng: Submit thành công, chuyển hướng `/checkout/success?orderId=...&token=...`.
  7. Xác thực Success: Hiển thị đúng mã đơn `CTL-20261009-MJ8A`, trạng thái PENDING, số điện thoại đã che `098****655`, snapshot 2 sản phẩm x 35.990.000đ.
  8. Xác thực D1 & Admin: Đơn hàng tồn tại trong D1 SQLite, Admin cập nhật trạng thái `PENDING -> COMPLETED` (lưu `completedAt`).
  9. Kiểm tra tồn kho: Stock trước (5) và sau (5) hoàn toàn bất biến.

6. Kết quả Kiểm thử & Chất lượng Mã nguồn:
- Cloudflare D1 Integration Tests (`npm run verify:cf`): 15/15 sub-verifications PASS (`allPassed: true`).
- TypeScript: `npx tsc --noEmit` -> 0 errors.
- ESLint: `npm run lint` -> 0 errors, 0 warnings.
- Production Build: `npm run build` -> Hoàn thành 42/42 routes thành công.
- Cloudflare Workers Compatibility: `npx vinext check` -> 97% tương thích.

Next Roadmap:
- STORE-12: CitiLap Business Profile, Content Pages & Technical SEO (Hoàn thành)
- STORE-13: Security Hardening & Rate Limiting
- STORE-14: Production Cloudflare Pages / Workers Deployment
```

---

```text
Task: STORE-12
Status: PASS
Ngày: 2026-10-09

Mục tiêu:
CitiLap Business Profile, Content Pages & Technical SEO. Đồng bộ nguồn sự thật duy nhất (Single Source of Truth) về hồ sơ doanh nghiệp CitiLap, tích hợp toàn bộ tài sản thương hiệu gốc, xây dựng 9 trang nội dung tĩnh chuẩn SEO tiếng Việt và an toàn pháp lý (các chính sách chưa duyệt được cô lập ở trạng thái DRAFT / NOINDEX), chuẩn hóa phân định vai trò chi nhánh và điểm nhận hàng online tại Checkout, triển khai Schema.org structured data (Organization, LocalBusiness, WebSite) an toàn HTML injection, dynamic sitemap và robots.txt đúng chuẩn.

Chi tiết thực hiện:

1. Nguồn Dữ Liệu Duy Nhất (Single Source of Truth):
- Tạo `src/config/business-profile.ts` định nghĩa kiểu dữ liệu `BusinessProfile` và `StoreLocation`:
  + Tên thương hiệu: `CitiLap` (alternate names: `CitiLap VN`, `CitiLap.VN`).
  + Canonical Site URL: `https://citilap.vn`.
  + Tagline: `CitiLap - Laptop - Công Nghệ - Cho cuộc sống tốt hơn`.
  + Khẩu hiệu / Slogan: `Một chữ tín - Vạn niềm tin`.
  + Thành lập: `07/2024`.
  + Hotline toàn quốc: `0899.188.186` (tel: `+84899188186`).
  + Email: `contact@citilap.vn`.
  + Mạng xã hội chính thức: Facebook `https://www.facebook.com/citilap`, TikTok `https://www.tiktok.com/@citilapvn`, Zalo `0899188186`.
  + Đồng bộ re-export tại `src/lib/site-config.ts` để loại bỏ toàn bộ dữ liệu hard-code phân mảnh.

2. Phân Định Rõ Ràng Vai Trò 3 Chi Nhánh:
- CitiLap Hà Nội (Trụ sở chính, ACTIVE):
  + Địa chỉ: Số 23/40 Tạ Quang Bửu, Phường Bạch Mai, Hà Nội. Hotline: 0899.188.186.
  + Giờ mở cửa: Thứ Hai – Thứ Bảy: 09:00 – 20:00. Chủ nhật tiếp khách theo lịch hẹn trước.
  + Điểm nhận đơn online duy nhất (`onlinePickupEnabled: true`).
  + Chính sách miễn phí giao hàng bán kính 10 km chỉ áp dụng quanh cơ sở Hà Nội (xác nhận khi gọi tư vấn).
- CitiLap Bắc Ninh (ACTIVE):
  + Địa chỉ: Số 40 Trần Hưng Đạo, Phường Võ Cường, TP. Bắc Ninh. Hotline: 0842.044.999.
  + Giờ mở cửa: Thứ Hai – Thứ Bảy: 09:00 – 20:00. Chủ nhật tiếp khách theo lịch hẹn trước.
  + Đón khách đến xem máy và mua trực tiếp (`walkInViewingAndPurchaseEnabled: true`).
  + Tuyệt đối KHÔNG nhận đơn online tại quầy (`onlinePickupEnabled: false`).
  + Không áp dụng mặc định freeship 10 km tại Bắc Ninh.
- CitiLap TP. Hồ Chí Minh (TEMPORARILY_CLOSED):
  + Địa chỉ lịch sử: Số 552 Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh.
  + Trạng thái: Tạm ngưng hoạt động để nâng cấp điểm phục vụ. Loại bỏ hoàn toàn khỏi điểm pickup và LocalBusiness Schema.org.

3. Đồng Bộ Tài Sản Thương Hiệu (Brand Assets):
- Tích hợp 6 tài sản chính thức từ `docs/assets/` vào `public/brand/`:
  + `brand-logo-original.jpg`: Logo nền xanh đậm nguyên bản.
  + `marketing-banner-original.png`: Banner thương hiệu gốc.
  + `store-photo-01.jpg` đến `store-photo-04.jpg`: 4 ảnh chụp thực tế tại trụ sở CitiLap Hà Nội (không gán sai cho Bắc Ninh hay TP.HCM).

4. Xây Dựng 9 Trang Nội Dung & Chính Sách An Toàn Pháp Lý:
- Các trang giới thiệu và chi nhánh (Public / Indexable):
  + `/gioi-thieu`: Lịch sử từ 07/2024, thế mạnh kỹ thuật kiểm tra máy, slogan, gallery 4 ảnh thực tế Hà Nội.
  + `/he-thong-cua-hang`: Chi tiết 3 cơ sở với phân định rõ ràng vai trò, giờ đón khách và link chỉ đường Google Maps.
  + `/lien-he`: Hotline 0899.188.186, email, bản đồ cơ sở, form gửi yêu cầu liên hệ.
  + `/contact`: Redirect 301 vĩnh viễn sang `/lien-he`.
- 6 Trang Chính Sách Dự Thảo (DRAFT & NOINDEX Banner):
  + `/chinh-sach-bao-hanh`: Phân định gói 3, 6, 12 tháng theo SKU và gói dịch vụ; loại bỏ cam kết "mọi máy bảo hành 12 tháng".
  + `/chinh-sach-doi-tra`: Quy định 7 ngày đổi mới do lỗi phần cứng; phân biệt rõ với chính sách thu cũ đổi mới.
  + `/chinh-sach-van-chuyen`: Toàn quốc; cước tham khảo 100.000–300.000đ xác nhận khi tư vấn; freeship 10km chỉ tại Hà Nội.
  + `/chinh-sach-bao-mat`: Dự thảo lưu trữ 2 năm nội bộ và đối tác vận chuyển; chưa bật marketing tracking khi chưa có consent.
  + `/dieu-khoan-mua-hang`: Đơn hàng là yêu cầu mua; không giao dịch trực tuyến trên web; xác nhận SKU/giá khi gọi.
  + `/huong-dan-mua-hang`: Quy trình 5 bước tìm máy -> cấu hình -> đặt hàng PENDING -> tư vấn xác nhận.
  + Banner cảnh báo DRAFT màu hổ phách hiển thị rõ ở đầu mỗi trang chính sách kèm chỉ thị robots `noindex, nofollow`.
  + Dynamic route `/chinh-sach/[slug]` hỗ trợ chuyển hướng tiện lợi sang các trang chính sách chuẩn.

5. Technical SEO & Schema.org Foundation:
- Metadata chuẩn hóa với `metadataBase: https://citilap.vn`, canonical URLs, absolute OpenGraph tags.
- Schema.org Structured Data (`src/lib/seo-helpers.ts`):
  + `Organization`: Brand, URL, logo URL, cùng các kênh sameAs (Facebook, TikTok), address trụ sở chính Hà Nội, contactPoint với giờ hỗ trợ kỹ thuật T2–T7 09:00–20:00.
  + `LocalBusiness` (ComputerStore): Tạo chính xác cho 2 cơ sở ACTIVE (Hà Nội, Bắc Ninh); loại trừ TP.HCM; giờ mở cửa T2–T7; Chủ nhật tiếp theo lịch hẹn (không khai báo mở cửa cố định).
  + `WebSite`: Schema site với SearchAction.
  + Hàm `serializeJsonLd()` mã hóa an toàn chống XSS / script-break (`<` -> `\u003c`, `>` -> `\u003e`, `&` -> `\u0026`).
- Dynamic `/sitemap.xml`: Chứa trang chủ, `/hot-sale`, `/category`, các trang tĩnh đã duyệt (`/gioi-thieu`, `/he-thong-cua-hang`, `/lien-he`) cùng toàn bộ danh mục và sản phẩm đang hoạt động từ D1; LOẠI TRỪ toàn bộ 6 trang chính sách dự thảo, trang admin, cart, checkout, search.
- `/robots.txt`: Chặn bot crawl `/admin/`, `/api/`, `/cart`, `/checkout/`, `/order-tracking` và toàn bộ 6 trang chính sách dự thảo; trỏ về sitemap chuẩn `https://citilap.vn/sitemap.xml`.

6. Kiểm Thử Toàn Diện & Kết Quả (Verification Details):
- Cloudflare Workers Integration Tests (`npm run verify:cf`):
  + `businessProfileContract`: PASS (Khớp 100% brand name, canonical URL, hotline, email, 07/2024, 2 active locations).
  + `branchRolesAndPickupSeparation`: PASS (Hà Nội pickup enabled & 10km freeship; Bắc Ninh pickup disabled & walk-in enabled; HCM temporarily closed; checkout pickup count = 1).
  + `openingHoursAndSundayPolicy`: PASS (Hà Nội & Bắc Ninh T2–T7 09:00–20:00; Chủ nhật tiếp khách theo lịch hẹn).
  + `schemaOrgTechnicalSeo`: PASS (Organization hợp lệ, 2 LocalBusiness, WebSite search action, loại trừ HCM).
  + `jsonLdHtmlInjectionSafety`: PASS (Toàn bộ ký tự HTML đặc biệt được escape an toàn).
  + Toàn bộ suite: 16/16 verifications PASS (`allPassed: true`).
- Linter (`npm run lint`): PASS (0 errors, 0 warnings).
- TypeScript (`npx tsc --noEmit`): PASS (0 errors).
- Production Build (`npm run build`): PASS (51/51 routes compiled thành công).
- Cloudflare Workers Compatibility (`npx vinext check`): PASS (97% tương thích, 0 issues).
- Browser Responsiveness: Kiểm tra Desktop (1440px) và Mobile (390px, 375px) xác nhận không có tràn ngang (`hasHorizontalOverflow: false`).

Next Roadmap:
- STORE-13: Security Hardening & Rate Limiting (HOÀN THÀNH)
- STORE-14: Cloudflare Deployment & Production QA
```

---

### STORE-13: Security Hardening, Rate Limiting & Production Readiness (2026-10-09)

**Trạng thái:** HOÀN THÀNH (PASS)  
**Mục tiêu cốt lõi:** Bảo vệ các chức năng customer storefront, guest checkout và admin order tracking đã hoàn thiện; ngăn chặn rò rỉ dữ liệu, phòng chống spam/lạm dụng, đảm bảo tính toàn vẹn và tương thích Cloudflare Workers runtime. Tuyệt đối KHÔNG triển khai ERP/Inventory/Payment/Customer Accounts. KHÔNG deploy production.

#### 1. SEO Preflight Fixes (Xử lý dứt điểm STORE-12)
- **Robots.txt & Media Serving:**
  - Cho phép Googlebot và crawler chính thống truy cập tài nguyên ảnh công khai: Thêm `allow: ["/", "/api/media/"]` vào `src/app/robots.ts`.
  - Tiếp tục Disallow các route nội bộ/nhạy cảm: `/admin/`, `/api/orders`, `/api/admin/`, `/cart`, `/checkout/`, `/order-tracking`.
  - Crawler có thể crawl ảnh sản phẩm R2 phục vụ qua `/api/media/products/*` mà không vi phạm quy tắc bảo mật.
- **Draft Policy Pages Crawlability & Noindex:**
  - Loại bỏ 6 trang chính sách dự thảo (`/chinh-sach-bao-hanh`, `/chinh-sach-doi-tra`, v.v.) khỏi danh sách `disallow` trong `robots.txt`.
  - Lý do kỹ thuật: Khi một URL bị `Disallow`, crawler không tải trang và không thể đọc thẻ `<meta name="robots" content="noindex, nofollow">`, dẫn đến nguy cơ Google index URL thô trên SERP. Việc cho phép crawler nạp trang giúp chỉ thị `noindex, nofollow` phát huy hiệu lực triệt để.
  - Các trang dự thảo vẫn hiển thị DRAFT warning banner màu hổ phách, không xuất hiện trong `sitemap.xml`, và không được coi là cam kết pháp lý chính thức.
- **ProductGroup Multi-SKU Structured Data:**
  - Nâng cấp `src/app/(shop)/product/[id]/page.tsx` và `src/lib/seo-helpers.ts` để sinh JSON-LD `ProductGroup` đúng chuẩn Google cho laptop có nhiều SKU (ví dụ: Lenovo Legion 5 Pro cấu hình 16GB/512GB vs 32GB/1TB).
  - Cấu hình từng biến thể dưới dạng `hasVariant` chứa SKU, name, price VND riêng biệt, URL canonical `?sku=...`, và không gán chéo giá giữa các SKU. Không sinh dữ liệu fake ratings hay fake inventory.

#### 2. API Security Matrix (14 Endpoints)
| Endpoint | Method | Phân loại | Role yêu cầu | PII đọc/ghi | Rate Limiting | Input Validation | IDOR Mitigation | Cache-Control | Rủi ro |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/orders` | POST | Public | Guest | Ghi (Tên, SĐT, Địa chỉ) | D1 (5 req/10m) + Turnstile | Zod schema + Max 10 items | N/A (Tạo mới, Idempotency) | `private, no-store, no-cache` | Thấp |
| `/api/orders` | GET | Admin | ADMIN | Đọc (Danh sách đơn) | D1 qua JWT session | Zod query params | `requireAdmin()` bắt buộc | `private, no-store, no-cache` | Thấp |
| `/api/orders/[id]` | GET (Guest) | Public | None (Token) | Đọc (Đơn hàng đã mask) | D1 qua IP | Token verification | `confirmationToken` SHA-256 | `private, no-store, no-cache` | Thấp |
| `/api/orders/[id]` | GET (Admin) | Admin | ADMIN | Đọc (Toàn bộ chi tiết) | D1 qua JWT session | Cuid/id format check | `requireAdmin()` bắt buộc | `private, no-store, no-cache` | Thấp |
| `/api/orders/[id]` | PATCH | Admin | ADMIN | Ghi (Cập nhật trạng thái) | D1 qua JWT session | Zod enum (PENDING, COMPLETED) | `requireAdmin()` bắt buộc | `private, no-store, no-cache` | Thấp |
| `/api/contact` | POST | Public | Guest | Ghi (Tên, SĐT, Email, Msg) | D1 (3 req/10m) + Honeypot | Zod + HTML Sanitization | N/A | `private, no-store, no-cache` | Thấp |
| `/api/auth/login` | POST | Public | None | Ghi (Xác thực Admin) | D1 (5 attempts/15m) | Zod (Username/Password) | N/A | `private, no-store, no-cache` | Thấp |
| `/api/auth/me` | GET | Authenticated | ADMIN | Đọc (Session info) | Session token check | Không | N/A | `private, no-store, no-cache` | Thấp |
| `/api/auth/logout` | POST | Authenticated | ADMIN | Ghi (Xóa cookie) | Session token check | Không | N/A | `private, no-store, no-cache` | Thấp |
| `/api/customers` | GET | Admin | ADMIN | Đọc (Danh sách khách hàng) | `requireAdmin()` bắt buộc | Query params | `requireAdmin()` bắt buộc | `private, no-store, no-cache` | Thấp |
| `/api/dashboard` | GET | Admin | ADMIN | Đọc (Thống kê đơn hàng) | `requireAdmin()` bắt buộc | Không | `requireAdmin()` bắt buộc | `private, no-store, no-cache` | Thấp |
| `/api/upload` | POST | Admin | ADMIN | Ghi (R2 Media upload) | `requireAdmin()` bắt buộc | Magic bytes, Mime, 5MB limit | `requireAdmin()` bắt buộc | `private, no-store, no-cache` | Thấp |
| `/api/media/[...key]` | GET | Public | None | Đọc (Public images) | Edge Cache | Path traversal regex check | Whitelist prefix & extension | `public, max-age=86400, s-maxage=604800` | Thấp |
| `/api/search/suggestions`| GET | Public | None | Đọc (Gợi ý tìm kiếm) | In-memory window (60 req/min) | Max 100 ký tự | N/A | `public, max-age=60, s-maxage=120` | Thấp |

#### 3. Admin Authentication & Authorization
- Áp dụng kiểm tra quyền nghiêm ngặt với `requireAdmin(request)` tại cả Handler và Service layer cho tất cả các route quản trị (`/api/orders` GET, `/api/orders/[id]` PATCH, `/api/customers`, `/api/dashboard`, `/api/upload`).
- Client không thể tự truyền role hay can thiệp vào payload token; token được ký bằng JWT secret server-side với `httpOnly`, `secure`, `sameSite: lax` cookies.
- Mọi truy vấn không có JWT hợp lệ đều bị từ chối với HTTP 401 Unauthorized / 403 Forbidden.

#### 4. Guest Order Privacy
- **Triệt tiêu nguy cơ IDOR / Enumeration:** Khách hàng không thể tra cứu thông tin đơn hàng nếu chỉ biết `orderId` hoặc `orderNumber`.
- **Cơ chế Confirmation Token:** Tạo mã SHA-256 token ngẫu nhiên dựa trên `orderId + createdAt + secret salt`. Token chỉ được trả về một lần duy nhất tại thời điểm Guest Checkout hoàn tất và được truyền qua URL query `?token=...` trên trang Success.
- **Masking thông tin nhạy cảm (PII):** Số điện thoại khách hàng được mask tự động trước khi trả về client (`098****655`), chỉ hiển thị 3 số đầu và 3 số cuối.
- **Header bảo vệ:** Đặt `Cache-Control: private, no-store, no-cache, must-revalidate` trên mọi phản hồi đơn hàng, đảm bảo CDN và shared caches không lưu dữ liệu khách. Đặt `Referrer-Policy: strict-origin-when-cross-origin` để ngăn rò rỉ URL chứa confirmation token sang dịch vụ thứ ba.

#### 5. Contact Form Security (Xử lý toàn diện `/api/contact`)
- **Backend Persistence thật:** Bổ sung model `ContactSubmission` trong Cloudflare D1 (`prisma/schema.prisma` và migration `d1-migrations/0007_contact_and_security.sql`). Dữ liệu liên hệ được lưu trữ thực sự vào database, không còn hiện tượng phản hồi thành công giả lập.
- **Chống Spam bằng Honeypot:** Form chứa trường bẫy ẩn `website`. Bot tự động điền trường này sẽ bị backend drop âm thầm (trả về success giả lập để đánh lừa bot mà không lưu vào D1).
- **Lọc mã độc XSS & Tag Stripping:** Loại bỏ toàn bộ thẻ HTML, `<script>`, `<iframe>` và javascript pseudo-protocols khỏi `name`, `email`, và `message`.
- **Data Minimization:** Chỉ thu thập `name`, `phone`, `email` (tùy chọn) và `message`. Giới hạn độ dài `message` tối đa 2.000 ký tự. Không lưu trữ toàn bộ SĐT rõ trong application console logs (áp dụng masked logging).
- **Interactive Component:** Thay thế form HTML tĩnh bằng React Client Component `<ContactForm />` với xử lý submit bất đồng bộ, spinner loading và thông báo trạng thái rõ ràng.

#### 6. Anti-Spam & Rate Limiting Strategy
- **D1-Backed Rate Limiting (`src/lib/rate-limiter.ts`):**
  - Sử dụng bảng D1 `RateLimitRecord` lưu trữ số lượng request theo cửa sổ trượt (sliding window) kết hợp IP hash SHA-256 (bảo vệ quyền riêng tư người dùng).
  - Áp dụng trên các endpoint quan trọng:
    + POST `/api/orders`: Tối đa 5 lượt tạo đơn / 10 phút.
    + POST `/api/contact`: Tối đa 3 lượt gửi liên hệ / 10 phút.
    + POST `/api/auth/login`: Tối đa 5 lượt đăng nhập sai / 15 phút.
  - Khi vượt ngưỡng, trả về HTTP 429 Too Many Requests với thông báo thân thiện kèm hotline hỗ trợ, không làm lộ chi tiết cấu hình bảo mật.
- **In-Memory Rate Limiting cho Search Suggestions:** Áp dụng sliding window 60 req/phút trên RAM worker cho `/api/search/suggestions` để tránh làm quá tải D1 do lượng gõ phím liên tục của người dùng.
- **Order Payload Constraints:** Giới hạn tối đa 10 sản phẩm khác nhau trong 1 đơn hàng, số lượng mỗi sản phẩm tối đa 5 chiếc để ngăn chặn tấn công spam số lượng lớn.

#### 7. Cloudflare Turnstile Integration
- Xây dựng module `src/lib/turnstile.ts` hỗ trợ xác thực mã bảo mật Turnstile qua Cloudflare Siteverify API (`https://challenges.cloudflare.com/turnstile/v0/siteverify`).
- Hỗ trợ đầy đủ các dummy keys chính thức của Cloudflare dùng cho môi trường kiểm thử (`1x00000000000000000000AA`, `2x00000000000000000000AB`, `3x00000000000000000000FF`).
- Chế độ Graceful Fallback: Nếu môi trường phát triển chưa cấu hình `CLOUDFLARE_TURNSTILE_SECRET_KEY`, hệ thống ghi nhận log cảnh báo và không làm gián đoạn trải nghiệm Guest Checkout của khách hàng thật.

#### 8. Order Atomicity Regression (D1 Atomic Batch)
- Xác minh lại cơ chế D1 Atomic Batch được xây dựng từ STORE-11:
  - Tạo đơn 1 sản phẩm: Thành công và toàn vẹn.
  - Tạo đơn nhiều sản phẩm: Toàn bộ `OrderItem` và `Order` được chèn trong 1 transaction batch duy nhất.
  - Thử nghiệm chèn lỗi ở `OrderItem`: Toàn bộ batch bị hủy (rollback), không sinh ra orphan order trong bảng `Order`.
  - Kiểm tra Concurrent Duplicate / Idempotency Replay: Request trùng lặp trả lại đơn hàng cũ kèm flag `isIdempotentReplay: true`. Nếu thay đổi nội dung payload nhưng giữ nguyên idempotency key, hệ thống trả lỗi HTTP 422 `IDEMPOTENCY_PAYLOAD_MISMATCH`.
  - Tuyệt đối không thay đổi tồn kho và không phát sinh giao dịch thanh toán trực tuyến.

#### 9. Secrets & Environment Security
- Tất cả các biến môi trường nhạy cảm (`JWT_SECRET`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `D1_TOKEN`, `R2_SECRET`) chỉ được nạp qua Cloudflare Worker bindings / process.env an toàn.
- Không commit file `.env` chứa secrets vào Git repository.
- Cập nhật `.env.example` với đầy đủ mô tả cấu hình mẫu cho Turnstile và Rate Limiting.
- Không để lộ bất kỳ khóa bí mật nào qua tiền tố `NEXT_PUBLIC_*`.

#### 10. Security Headers (`next.config.ts`)
- Cấu hình trọn bộ HTTP Security Headers chuẩn production:
  - `Content-Security-Policy`: Định nghĩa an toàn cho `default-src 'self'`, `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob: https:`, `frame-src https://challenges.cloudflare.com https://maps.google.com https://www.google.com`.
  - `X-Content-Type-Options: nosniff` (chống MIME-sniffing).
  - `X-Frame-Options: SAMEORIGIN` (chống Clickjacking).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (ép buộc HTTPS).

#### 11. Public Media Safety (`/api/media/[...key]`)
- **Chống Path Traversal:** Kiểm tra và chặn đứng các chuỗi điều hướng thư mục nguy hiểm (`..`, `%2e`, `\`).
- **Prefix Whitelist:** Chỉ cho phép phục vụ các tệp tin media nằm trong danh mục công khai hợp lệ: `products/`, `brand/`, `tmp/products/`.
- **Extension Whitelist:** Giới hạn định dạng hình ảnh an toàn: `.jpg`, `.jpeg`, `.png`, `.webp`. Từ chối toàn bộ file SVG, HTML, JS có nguy cơ thực thi mã độc.
- **Cache Policy:** Đặt `Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400` cho media hợp lệ; trả về 404 Not Found rõ ràng cho media không tồn tại, không trả placeholder 200 giả mạo làm sai lệch chỉ mục tìm kiếm.

#### 12. Privacy Policy Readiness & Tracking Consent
- 6 trang chính sách tiếp tục được duy trì ở trạng thái **DRAFT** với thông báo rõ ràng cho người dùng.
- Thống nhất thời hạn lưu trữ thông tin đơn hàng 2 năm phục vụ mục đích bảo hành, hậu mãi và đối soát.
- Tuyệt đối KHÔNG tự động kích hoạt Google Analytics, Meta Pixel hay bất kỳ công cụ tracking tiếp thị bên thứ ba nào khi chưa có cơ chế quản lý sự đồng ý (Consent Management).

#### 13. Kết Quả Kiểm Thử Toàn Diện (Verification Summary)
- **Miniflare Cloudflare Worker Suite (`scripts/verify-cf.ts` Section 14):**
  - Section 14 `store13Verification` thực thi 14 bài test chuyên sâu trên runtime Cloudflare:
    + Robots `/api/media/` allow rule & Draft policies accessible for noindex.
    + Contact submission D1 persistence & honeypot bot drop.
    + Rate limiter hit counting, sliding window enforcement, và 429 response formatting.
    + Turnstile siteverify dummy key verification.
    + Order phone masking (`098****655`) và token SHA-256 access control.
    + Media path traversal rejection & extension whitelist.
    + Security headers verification.
    + Order atomicity & idempotency regression.
  - Kết quả: **ALL CHECKS PASSED: ✅ TRUE (17/17 sections passed)**.
- **Browser E2E Testing (Chrome DevTools):**
  - Test `/lien-he`: Điền form liên hệ và submit thành công, giao diện chuyển sang màn hình tiếp nhận phản hồi mượt mà.
  - Test `/api/orders`: Gọi không có authentication trả về 401 Unauthorized; gọi tạo đơn liên tiếp bị chặn bởi 429 Too Many Requests.
  - Test `/api/orders/[id]`: Truy cập không token trả về 403 Forbidden; truy cập sai token trả về 403 Forbidden; truy cập với token chuẩn trả về 200 OK với SĐT đã mask `098****655` và `Cache-Control: private`.
  - Viewports: Mobile (390px), Tablet (768px), Desktop (1440px) hiển thị chuẩn mực, không có tràn ngang (`hasHorizontalOverflow: false`).
- **Codebase Standards:**
  - `npm run lint`: PASS (0 errors, 0 warnings).
  - `npx tsc --noEmit`: PASS (0 errors).
  - `npm run build`: PASS (51 routes compiled thành công với Next.js Turbopack).
  - `npx vinext check`: PASS (93% tương thích Cloudflare Workers, 19 supported, 0 blockers).

#### 14. Known Limitations & Kế Hoạch Tiếp Theo
- Rate limiting hiện tại sử dụng D1 database để lưu trữ counters; khi triển khai quy mô lớn với lưu lượng cực cao, có thể nâng cấp sang Cloudflare Workers KV hoặc Cloudflare WAF Rate Limiting Rules ở tầng mạng edge.
- Turnstile đang hoạt động ở chế độ development/test mode; cần cấu hình cặp Sitekey/Secretkey chính thức trên Cloudflare Dashboard khi chuẩn bị go-live.

**Next Task:**
`STORE-14 — Cloudflare Deployment & Production QA` (Đã hoàn thành - Chi tiết bên dưới)

---

### STORE-14 — Cloudflare Production Readiness, Staging Architecture & Final QA (2026-10-09)

#### 1. Mục tiêu và phạm vi STORE-14
- **Mục tiêu:** Rà soát và hoàn thiện toàn bộ hạ tầng kỹ thuật của `citilap-ecommerce` nhằm đạt trạng thái sẵn sàng vận hành production (Production-Ready) trên Cloudflare Workers, Cloudflare D1, Cloudflare R2 và Cloudflare Turnstile, đồng thời thiết lập môi trường Staging cách ly hoàn toàn.
- **Quy tắc bất biến:**
  - TUYỆT ĐỐI KHÔNG tự động triển khai lên domain production (`citilap.vn`).
  - TUYỆT ĐỐI KHÔNG chỉnh sửa bản ghi DNS, Cloudflare Nameservers hoặc can thiệp dữ liệu production.
  - TUYỆT ĐỐI KHÔNG triển khai ERP, quản lý kho đa điểm, cổng thanh toán trực tuyến hay tài khoản khách hàng (giữ vững phạm vi storefront + guest checkout).
  - Duy trì các trang chính sách ở chế độ DRAFT với amber warning banner.

#### 2. Kiến trúc & Các cải tiến trọng yếu (Key Hardening Upgrades)

##### 2.1 Turnstile Fail-Closed Hardening (`src/lib/turnstile.ts`)
- **Nguyên tắc Fail-Closed:** Khi ứng dụng chạy trong môi trường production hoặc staging (`APP_ENV === 'production' || process.env.NODE_ENV === 'production'`), nếu thiếu `TURNSTILE_SECRET_KEY`, hệ thống bắt buộc ném lỗi `TURNSTILE_SECRET_MISSING` (HTTP 500) và từ chối request, triệt tiêu hoàn toàn rủi ro bot bypass form khi dev quên cấu hình secret.
- **Chống Dummy Keys trên Production:** Cấm tuyệt đối việc sử dụng dummy test keys của Cloudflare (`1x00000000000000000000AA`, `2x00000000000000000000AB`, `3x00000000000000000000FF`) trong môi trường production (`DUMMY_KEY_IN_PRODUCTION`).
- **Freshness Verification:** Kiểm tra dấu thời gian `challenge_ts` trong payload xác thực từ Cloudflare Siteverify API; các token vượt quá 300 giây (5 phút) sẽ bị loại bỏ với lỗi `TURNSTILE_TOKEN_EXPIRED` nhằm ngăn chặn tấn công replay token.
- **Áp dụng:** Tích hợp kiểm tra nghiêm ngặt tại POST `/api/orders` và POST `/api/contact`.

##### 2.2 Confirmation Token CSPRNG Upgrade (192-bit) & D1 Hash-Only Storage
- **Nâng cấp độ hỗn loạn CSPRNG:** Thay thế token tạo từ hàm băm xác định bằng bộ sinh số ngẫu nhiên mật mã học Web Crypto `crypto.getRandomValues(new Uint8Array(24))` (192 bits entropy), mã hóa dạng hexadecimal 48 ký tự.
- **Mô hình Zero-Knowledge D1:** Bảng `Order` được bổ sung cột `confirmationTokenHash` (`d1-migrations/0008_order_confirmation_token_hash.sql`). Cơ sở dữ liệu D1 chỉ lưu trữ mã băm SHA-256 (`confirmationTokenHash`) của token. Bản rõ của token chỉ trả về một lần duy nhất cho client khi đặt hàng thành công để gắn vào URL query `?token=...`. Kẻ tấn công nếu đọc được D1 cũng không thể suy ngược ra token để truy cập đơn hàng của khách.
- **Timing-Safe Comparison:** Hàm `validateOrderConfirmationToken` sử dụng so sánh an toàn thời gian (`crypto.subtle.timingSafeEqual`) chống tấn công timing side-channel.
- **Tương thích ngược (Backward Compatibility):** Vẫn hỗ trợ xác thực an toàn cho các đơn hàng cũ tạo trước STORE-14 thông qua fallback xác thực thuật toán cũ trước khi chuyển đổi hoàn toàn.

##### 2.3 Phòng thủ CSRF & Cross-Origin Mutation cho Admin (`src/lib/auth.ts`)
- **Hạ tầng kiểm tra nguồn gốc:** Bổ sung `validateMutationOrigin(request)` và `requireAdminMutation(request)`.
- **Fetch Metadata Defense:** Reject ngay lập tức các request có header `Sec-Fetch-Site: cross-site` với HTTP 403 Forbidden.
- **Origin & Referer Validation:** Đối với các phiên làm việc quản trị sử dụng HttpOnly Cookie (`admin_session`), kiểm tra bắt buộc `Origin` hoặc `Referer` phải trùng khớp với `host` của hệ thống.
- **Bảo vệ toàn diện các endpoint nhạy cảm:**
  - PUT / PATCH `/api/orders/[id]` (cập nhật trạng thái đơn hàng).
  - POST / DELETE / PATCH `/api/upload` (tải lên / xóa media trên Cloudflare R2).
  - PATCH `/api/admin/contacts/[id]` (chuyển trạng thái xử lý thư liên hệ).

##### 2.4 Phân tách tiền tố công khai R2 Media (`src/app/api/media/[...key]`)
- **Phân vùng an toàn:**
  - `ALLOWED_PUBLIC_PREFIXES = ['products/', 'brand/']`: Cho phép khách vãng lai và crawler truy cập công khai không cần đăng nhập.
  - `ALLOWED_TEMP_PREFIXES = ['tmp/products/']`: Khu vực upload tạm của admin. Yêu cầu bắt buộc phiên đăng nhập Admin hợp lệ (`isAdminRequest`). Khách vãng lai truy cập prefix này nhận ngay HTTP 403 Forbidden.
- Giữ nguyên các cơ chế bảo vệ path traversal (`..`, `%2e`, `\`) và whitelist định dạng ảnh (`.jpg`, `.jpeg`, `.png`, `.webp`).

##### 2.5 Admin Contact Inbox (`/admin/contacts`)
- **Trang quản trị chuyên dụng:** Xây dựng giao diện responsive chuẩn desktop / tablet / mobile cho ban quản trị tại `/admin/contacts`.
- **Chức năng nghiệp vụ:**
  - Lọc trạng thái nhanh: "Tất cả", "Chờ xử lý (PENDING)", "Đã xử lý (HANDLED)".
  - Tìm kiếm theo tên khách hàng, số điện thoại, email hoặc nội dung tin nhắn.
  - Nút gọi điện (`tel:`) và gửi email (`mailto:`) trực tiếp.
  - Toggle cập nhật trạng thái đơn giản với phản hồi giao diện tức thì (optimistic update).
  - Tích hợp mục "Hộp thư liên hệ" với biểu tượng `Mail` trong thanh menu Admin sidebar.
- **API Endpoints:**
  - `GET /api/admin/contacts`: Lấy danh sách liên hệ có phân trang, lọc status và tìm kiếm.
  - `PATCH /api/admin/contacts/[id]`: Cập nhật trạng thái (`PENDING` hoặc `HANDLED`), tích hợp bảo vệ CSRF mutation.

##### 2.6 Rate Limiting Privacy & Peppered Hashing (`src/lib/rate-limiter.ts`)
- **Peppered IP Hash:** IP người dùng được băm SHA-256 kết hợp chuỗi bí mật `RATE_LIMIT_PEPPER` hoặc `ADMIN_JWT_SECRET` nhằm ngăn ngừa việc dò IP bằng bảng băm ngược (rainbow tables).
- **Edge IP Verification:** Ưu tiên sử dụng header mạng `cf-connecting-ip` do Cloudflare Edge chứng thực, loại bỏ khả năng giả mạo IP bằng `X-Forwarded-For`.
- **D1 Self-Cleaning:** Áp dụng cơ chế dọn dẹp cơ hội (opportunistic cleanup) với tỷ lệ mẫu 5% tự động xóa các bản ghi `RateLimitRecord` đã hết hạn trong D1, giữ cho kích thước bảng luôn tối ưu.

##### 2.7 Phân kỳ triển khai HSTS an toàn (`next.config.ts`)
- **Giai đoạn đầu (Phase 1):** Cấu hình `Strict-Transport-Security: max-age=2592000` (30 ngày), không bao gồm `preload` hay `includeSubDomains`.
- **Mục đích:** Ngăn ngừa nguy cơ khóa cứng trình duyệt (domain lockout) trên toàn bộ subdomain nội bộ của doanh nghiệp trong trường hợp có sự cố chứng chỉ SSL ban đầu. Chỉ kích hoạt `preload` và `includeSubDomains` sau tối thiểu 30 ngày vận hành ổn định trên production.

##### 2.8 Cấu hình môi trường Staging (`wrangler.jsonc`)
- Thiết lập cấu hình độc lập `env.staging`:
  - `citilap-db-staging`: D1 Database staging riêng biệt.
  - `citilap-media-staging`: R2 Bucket staging riêng biệt.
- Giữ nguyên cấu hình `env.production` ở dạng khai báo sẵn sàng (placeholders) và yêu cầu người dùng xác nhận trước khi liên kết tài nguyên Cloudflare thật.

#### 3. Kết quả kiểm thử toàn diện (Verification & QA Results)

| Hạng mục kiểm thử | Công cụ / Môi trường | Kết quả | Ghi chú |
|---|---|---|---|
| **Turnstile Fail-Closed** | `scripts/verify-cf.ts` Section 15 | ✅ PASS | Bắt buộc secret trên prod/staging, chặn dummy keys |
| **Confirmation Token Entropy** | Web Crypto CSPRNG (192-bit) | ✅ PASS | 48 hex chars, lưu băm SHA-256 vào D1 |
| **Admin CSRF Defense** | `verify-cf.ts` Section 15 | ✅ PASS | Chặn `Sec-Fetch-Site: cross-site`, validate Origin |
| **R2 Media Prefix Isolation** | `verify-cf.ts` Section 15 | ✅ PASS | `tmp/` trả 403 với guest, 200 với Admin session |
| **Admin Contact Inbox E2E** | `verify-cf.ts` Section 15 + Browser | ✅ PASS | GET danh sách, PATCH toggle status PENDING/HANDLED |
| **D1 Regressions (Section 1-14)** | Miniflare / workerd 8787 | ✅ PASS (100%) | 15/15 sections xanh toàn bộ |
| **Storefront E2E Checkout Flow** | Chrome DevTools Browser | ✅ PASS | PDP -> Add to Cart -> Checkout -> Success page |
| **Responsive QA (3 Viewports)** | 390px, 768px, 1440px | ✅ PASS | `hasHorizontalOverflow: false` trên toàn bộ trang |
| **TypeScript Typecheck** | `tsc --noEmit` | ✅ PASS | 0 errors |
| **ESLint Validation** | `npm run lint` | ✅ PASS | 0 errors, 0 warnings |
| **Next.js Production Build** | `npm run build` | ✅ PASS | 53 routes biên dịch thành công |
| **Vinext Cloudflare Bundle** | `npm run build:cloudflare` | ✅ PASS | `dist/server/index.js` sẵn sàng cho Workers |
| **Cloudflare Compatibility** | `npx vinext check` | ✅ PASS | 93% (19 supported, 0 blockers trong `src/`) |

#### 4. Quy trình Go-Live Production (Checklist triển khai thực tế)
Khi chủ sở hữu dự án quyết định triển khai lên Cloudflare Production:
1. Tạo tài nguyên trên Cloudflare Dashboard:
   - D1 Database: `npx wrangler d1 create citilap-db-prod`
   - R2 Bucket: `npx wrangler r2 bucket create citilap-media-prod`
   - Cloudflare Turnstile: Tạo cặp Site Key & Secret Key dạng Managed Challenge cho domain `citilap.vn`.
2. Thiết lập Cloudflare Secrets bảo mật:
   - `npx wrangler secret put ADMIN_API_TOKEN`
   - `npx wrangler secret put ADMIN_JWT_SECRET`
   - `npx wrangler secret put TURNSTILE_SECRET_KEY`
   - `npx wrangler secret put RATE_LIMIT_PEPPER`
3. Chạy D1 Migrations cho môi trường production:
   - `npx wrangler d1 migrations apply citilap-db-prod --remote`
4. Deploy ứng dụng:
   - `npm run deploy` (hoặc Cloudflare Pages / Workers CI/CD)
5. Trỏ DNS `citilap.vn` qua Cloudflare Proxy (Orange Cloud).









