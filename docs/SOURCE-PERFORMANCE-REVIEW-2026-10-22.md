# Source, dependency and performance review - 2026-10-22

## Pham vi va ket luan

Review source hien tai, import graph TypeScript, dependency truc tiep, build Cloudflare va test local. Khong deploy, khong sua DB local/remote, khong xoa backup, khong thay logo dang chinh. Khong co do browser/Core Web Vitals moi trong dot nay. Cac con so bundle khong phai tong download cua mot trang.

Huong kien truc de xuat: modular monolith tren Workers + D1 + R2, server-rendered storefront, CMS publication la nguon noi dung cong khai, mot pricing/checkout authority. Chua co bang chung can microservices, Redis, Elasticsearch, Redux hay doi framework ngay.

## Findings theo uu tien

1. **P1 - Search va advisor tang chi phi theo catalog.** `src/server/services/search.service.ts:680` doc toan bo tap khop (kem studio, variants, images), tinh gia/facet trong JS, roi moi cat trang tai dong 904. Autocomplete tai dong 940 goi lai search day du. `src/server/services/advisor.service.ts:7` doc tat ca laptop truoc khi resolve. `catalog-batches.ts` chi gioi han 80 moi batch de tranh parameter limit, khong gioi han tong cong viec. Search rong/tu van co the tang latency, CPU va D1 reads khi catalog lon. Khong them LIMIT tuy tien vi se sai facet, thu tu gia va eligibility.
2. **P1 - Kiem thu legacy writer dang hong harness.** `scripts/test-legacy-writer-locks.mjs` khong bundle duoc WASM, van dung contract session cu va mock chi bat alias. Chua the dung suite nay de chung minh auth/409. Can cap nhat harness theo session D1 hien tai; giu ca test unauthorized, CSRF va mutation denial. Khong giam auth de lam test xanh.
3. **P2 - Legacy metadata export kiem tra sai dieu kien DB.** `src/app/api/products/metadata/route.ts:5` va GET guard dua vao DATABASE_URL, trong khi runtime Cloudflare dung DB binding. D1 hop le van co the bi tra 503 neu khong co bien Node. Xac nhan consumer legacy, sau do chuyen sang D1 context hoac retire endpoint bang contract ro rang; khong xoa API vi khong co import.
4. **P2 - Client state va modal duoc mount o root.** `src/app/layout.tsx` boc Cart/Wishlist/Compare va import CompareModal tren moi route. Admin preview san pham thuc su dung StudioPurchaseSection, nen khong the don gian chuyen provider sang (shop). Tach storefront + preview scope va lazy-load dialog theo thao tac; phai test storage restore, focus, Escape, preview va navigation.
5. **P2 - Nhieu lan doc cau hinh tren duong render.** Root metadata, homepage metadata va shop layout cung doc settings. Da bo mot lan doc trung trong root metadata. Tiep theo dedupe trong pham vi request; chi edge-cache public snapshot voi revision/invalidation. Khong cache private draft, auth, checkout quote, gia/ton kho vuot qua promotion boundary.
6. **P2 - Chat luong Admin chua qua lint.** 6 errors: builder/page.tsx:73; campaigns/page.tsx:127,419; products/page.tsx:129,193; api/admin/builder/[id]/preview/route.ts:13. Chu yeu state trong effect, Date.now trong render va any. Day la static findings, khong tu dong chung minh moi effect gay loop. Can sua lifecycle voi kiem thu hanh vi, khong tat rule hang loat.
7. **P2 - Hai pipeline va nhieu DB compatibility layer.** next dev/build + vinext/Vite/Worker va D1 + Node/libsql fallback. `src/lib/prisma.ts` tu chon file SQLite theo prefix, tao client Node moi moi lan fallback. `scripts/post-prisma-generate.mjs` patch generated internals va dung ban sao WASM. Can chon Cloudflare lam runtime chuan, tach Node tooling, chi ro DB path va kiem tra regeneration tren fresh checkout.
8. **P2 - Anh library van qua DB va R2.** `media-library.service.ts:88` lay metadata DB va object R2 truoc ca 304; cache browser 1 gio. Nen tao derivative theo kich thuoc, URL co revision/hash, CDN cache voi invalidation khi thay/quyen truy cap thay doi. Khong dat immutable cho URL co the doi noi dung. next/image trong source chua du de khang dinh Worker dang resize anh that.

## Da thuc hien

- Xoa 9 file component/barrel khong co inbound import trong source/scripts: ImageUploader, ProductStudio cu, VerticalMenu, ProductActions, ProductMobileCTA, ProductPriceOptions, ProductRecommendations, ProductSidebar, components/ui/index.ts. Cac file nay khong phai route entry. ProductEditor, StudioPurchaseSection va services hien hanh van giu.
- Xoa 6 bundle test an `scripts/.r06*` / `.r07a-test-bundle.mjs` va `scripts/verify-cf.mjs`: moi file co build source tao lai. Them ignore cho verify-cf. Tong 16 file: **12,291,745 bytes (~11.72 MiB)**. Chu yeu giam repo/review cost, khong phai 11.72 MiB JavaScript nguoi mua duoc tiet kiem.
- Xoa 20 declaration/helper cua legacy product writer khong con caller; giu GET, auth, CSRF wrapper va 409 LEGACY_WRITER_DISABLED.
- Go dependency truc tiep @prisma/adapter-better-sqlite3 va better-sqlite3; npm cap nhat lockfile. Khong xoa libsql vi van co Node fallback va script Turso.
- Pin vite 8.3.3, @vitejs/plugin-react 6.1.2, @vitejs/plugin-rsc 0.5.35 thay latest theo version dang lock; khong upgrade framework.
- Bo allowScripts chi chua hai version SQLite native da go. Bo mot query settings trung trong root metadata.
- ESLint bo qua .worktrees va .vinext; khong lint checkout phu/build cache.

## Audit tung dependency truc tiep

| Package | Vai tro | Quyet dinh |
|---|---|---|
| @libsql/client | push-turso.ts, libsql tooling | Giu; retire cung Turso tooling khi da quyet dinh bo Node mode |
| @prisma/adapter-better-sqlite3 | Khong co caller source/script | Da go |
| better-sqlite3 | Khong co caller source/script | Da go dependency truc tiep; dependency transitive tuy chon co the van ton tai |
| @prisma/adapter-d1 | Runtime Prisma tren D1 | Giu |
| @prisma/adapter-libsql | Node fallback trong src/lib/prisma.ts | Giu; tach tooling sau |
| @prisma/client | Client runtime, generated client | Giu; khong xoa vi chi thay SQL thu cong o mot so service |
| prisma | Generate/schema CLI | Giu; co the chuyen devDependency khi CI generate ro rang |
| @vinext/cloudflare | cf:deploy CLI | Giu khi script con duoc dung |
| vinext | Next compatibility tren Vite/Worker | Giu; danh gia do tuong thich bang integration tests truoc doi runtime |
| next | Framework imports, font/image/types, Node scripts | Giu; khong xem la du chi vi co vinext |
| react | UI/RSC | Giu |
| react-dom | Render/hydration | Giu, dong bo version React |
| react-server-dom-webpack | RSC peer cua vinext | Giu |
| lucide-react | Icon tree-shaken theo import | Giu; khong doi icon library de tiet kiem khong co so do |
| zod | Validation tai API/CMS boundaries | Giu; tach schema server lon khoi client khi build graph chung minh bi keo vao |
| @cloudflare/vite-plugin | D1/R2 bindings, build Worker | Giu |
| @cloudflare/workers-types | Type D1/R2 | Giu |
| @tailwindcss/postcss | Next/PostCSS pipeline | Giu den khi retire Node build |
| @tailwindcss/vite | Pipeline Vite | Giu |
| tailwindcss | CSS generation | Giu |
| @types/node | Node types | Giu; major 20 khac tool runtime hien tai, can dong bo voi Node LTS da chon |
| @types/react | React types | Giu |
| @types/react-dom | React DOM types | Giu |
| @vitejs/plugin-react | Peer cua vinext | Giu, da pin |
| @vitejs/plugin-rsc | RSC peer cua vinext | Giu, da pin |
| vite | Build/runtime tooling | Giu, da pin |
| eslint | Static checks | Giu |
| eslint-config-next | Next/React rules | Giu |
| typescript | Typecheck | Giu |
| wrangler | Worker/D1/R2 tooling | Giu |

Mot so scripts import truc tiep esbuild, miniflare, dotenv, sharp nhung dang dua vao dependency bac cau. Can khai bao devDependency cho cong cu tro thanh workflow chinh thuc; khong them package moi trong dot cleanup nay. Removal chi cap nhat manifest/lockfile; node_modules hien tai khong duoc cai lai tu dau.

## Audit module va dich den

| Module | Danh gia | Buoc tiep |
|---|---|---|
| app/(shop), components/home/product/layout | RSC + client islands, header client lon | Do hydration/header/menu; lazy dialog, tach client state nho |
| app/admin, components/admin | CMS editor hien hanh va preview | Scope providers dung preview, sua 6 lint errors |
| contracts | DTO + Zod boundary | Giu; tach server-only schema khoi client bundle neu can |
| services/catalog/search/advisor | Public projection + shared pricing | Doc model search denormalized, SQL filter/count/page |
| services/product-studio/navigation/page/post/builder | Draft/published + revisions | Giu, publish invalidation la trung tam cache |
| services/pricing/order/inventory | Financial correctness | Mot authority, snapshot bat bien, CAS/idempotency/atomic reservations |
| lib/auth, admin request context | Session/permissions/CSRF | Giu; khong dung cache public cho session, test revoke |
| infra/cloudflare, media services | D1/R2 integration | It binding resolver hon, anh derivative/CDN versioned |
| prisma/generated + d1-migrations | ORM + D1 schema | Fresh-checkout generate test, migration checksum; chua xoa generated/wasm |
| scripts, docs/evidence | Regression/import/backup/audit | Giu source tests va bang chung; bo generated bundles, tach archive sau |
| public assets | CMS co the tham chieu bang URL trong DB | Khong xoa chi vi khong co import; can doi chieu draft/published/revisions/R2 |
| dev.db, schema.sql, push-turso.ts | Legacy tooling/data chua xac minh consumer | Giu DB va scripts; chua doc/xoa du lieu |

## Nang cap de xuat theo thu tu

### P0 - Khoa baseline va do dung

Chon Node LTS duoc vinext/Prisma/Wrangler ho tro, pin bang engines va file version, fresh npm ci + generate + typecheck + build trong CI. Sua harness legacy va lint Admin. Smoke CMS publish, PDP, cart, quote, checkout idempotency, cancel, auth/CSRF. Khong coi build PASS la business UAT.

Do mobile thiet bi/network co dinh va staging: LCP, INP, CLS p75; TTFB p50/p95; so D1 query/rows-read; Worker CPU; JS transfer theo route; image bytes. Muc tieu de xuat: LCP <=2.5s, INP <=200ms, CLS <=0.1; day la target, chua phai ket qua.

### P1 - Search read model va cache an toan

Tao projection chi tu published catalog: normalized text, typed RAM/storage/CPU/GPU, representative SKU, availability va gia co version. Index theo query thuc te/EXPLAIN QUERY PLAN. Candidate retrieval va pagination trong DB; autocomplete dung query nhe rieng. FTS5 chi sau khi xac minh runtime D1 va quy tac tieng Viet. Facet, variant matching va promotion price phai giu ket qua nhu resolver hien tai. Gia/ton kho duoc revalidate khi quote/checkout; read model khong la authority thanh toan.

Cache menu/settings/page/post theo published revision. Thoi han cache gia khong vuot promotion boundary. Invalidation sau commit publish/unpublish; no-store cho preview, admin, session, checkout va customer data. Tranh global mutable request state.

### P1 - Media va client delivery

Sinh WebP/AVIF va cac kich thuoc 320/640/960/1280 theo nhu cau; luu kich thuoc, dung sizes dung layout, preload chi LCP image. Chung minh response resize/content-type/bytes tren staging. Lazy-load compare/editor/dialog khi can; giu keyboard/focus/loading accessibility. Tach providers cho storefront va preview, khong de Admin duoc gan cart revalidation mac dinh.

### P2 - Nen tang ecommerce

Order lifecycle ro rang; inventory reservation + expiry; idempotent payment webhook; unique event IDs; reconciliation job; immutable payment ledger va sale snapshots. Tach email/CRM/notification sang transactional outbox + queue consumer co retry/dead-letter, khong chen external I/O vao transaction checkout. Chi them payment integration khi chot gateway.

Giu modular monolith theo domain catalog, pricing, inventory, checkout/orders, customers, content/media. Chuan hoa error contract/request ID, structured logs (khong PII/secrets), latency/error-rate dashboard, backups va restore drill. Postgres/Hyperdrive chi khi D1 transaction/concurrency/query workload duoc do va khong dap ung; chua co co so de migrate ngay.

## Bang chung build va kiem thu

- TypeScript: PASS sau cleanup API.
- Cloudflare build: PASS; co warning vinext route classification va node:crypto externalization can trace client graph neu muon dong release gate.
- test-storefront-improvements.mjs: PASS (seed/idempotency, search, advisor, inspection, appointment fixtures).
- test-r08-full-app.mjs --r09a: **18/18 PASS**, built Worker + ephemeral D1/R2; gom quote, rollback, idempotency, auth/CSRF, role matrix (co legacy routes), metadata, CMS schedule va storefront. Loi SQL duoc inject trong case 8/9 la tinh huong kiem thu, khong phai DB local bi hong.
- Lint cac file da sua va git diff --check: PASS. Manifest/lockfile dependency truc tiep khop nhau.
- test-legacy-writer-locks.mjs: BLOCKED o bundling WASM; chua chay assertion.
- Full lint: 6 errors truoc cleanup helper; errors o cac file khong sua trong dot nay. Warning count se giam sau xoa dead helpers; khong khang dinh full lint xanh.
- Khong co browser/staging/production performance proof, khong fresh npm ci.
- Build snapshot: 164 JS assets cho tat ca routes. Cac chunk lon: index 216,197 B (gzip 45,280 B), framework 190,103 B (59,060 B), vinext 152,274 B (45,748 B), schemas 91,491 B (25,605 B). Khong cong thanh homepage payload; can trace manifest/network waterfall.

Log va inventory local: .wrangler/source-audit-*, .wrangler/source-cleanup-inventory.json. Cac tai lieu baseline cu van mo ta file legacy da xoa; dung bao cao nay lam current delta, khong sua lai bang chung lich su.

## Dot toi uu tiep theo - 2026-10-22

- Search: Prisma select chi lay truong dung cho ranking, facets va product card; bo contentHtml, SEO va cac truong khong dung. ProductImage chi query sau pagination cho toi da 48 product IDs, uu tien primary nhu cu. Giu resolver gia, matching cung bien the, thu tu va facets. Them regression pagination, facets, primary image va empty page.
- CMS: cache public settings va published navigation snapshot theo revision, WeakMap rieng theo DB binding. Mot SELECT doc revision va CASE document trong cung snapshot: hit khong truyen JSON ve Worker. Khong TTL, khong tra stale khi DB loi; deletion/unpublish xoa cache. Settings tra ban sao de caller khong sua cache. Collection/menu van resolve tinh trang product va gia hien tai. Menu product lookup batch 80 IDs thay vi N query noi tiep.
- Anh: dung adapter imagesOptimizer cua @vinext/cloudflare da cai san, IMAGES binding trong cau hinh local/staging/production. next/image sizes hien tai duoc giu; khai bao AVIF/WebP. Chi thay cau hinh repo, chua provision/deploy Cloudflare hay xac nhan endpoint resize/CDN tu xa.
- JavaScript: React.lazy chi import CompareModal khi mo. Build sinh chunk CompareModal 8,512 bytes (raw, khong phai so lieu network). Chuyen Cart/Wishlist/Compare providers va floating UI tu root sang shop; admin product preview co layout rieng giu providers. Admin thuong khong mount cart revalidation.

Kiem thu dot nay:

- TypeScript PASS; scoped ESLint 0 errors, con warning actor cu trong settings; scripts bi bo qua boi lint config nhung da chay truc tiep.
- Cloudflare build PASS; build artifact xac nhan dynamic import CompareModal.
- node scripts/test-performance.mjs PASS: cache-hit khong tra document, revision change, caller mutation, deletion/unpublish, missing menu product, DB failure.
- node scripts/test-storefront-improvements.mjs PASS, gom test moi cho pagination/anh/facets.
- node scripts/test-r07b-4-regression.mjs: 16/16 PASS (D1/service + handler HTTP).
- node scripts/test-r08-full-app.mjs --r09a: 18/18 PASS (built Worker HTTP + D1/R2 tam).
- Log: .wrangler/performance-build.log, .wrangler/performance-pricing.log, .wrangler/performance-full-app.log.

Gioi han con lai: search van doc tap matched products de tinh relevance, gia va facets; chua co published search read model, SQL pagination hay autocomplete rieng. Cache moi bao phu settings/navigation/collection snapshot, chua page/post. Chua co browser waterfall/Core Web Vitals, keyboard/focus browser test, hay bang chung anh thuc su resize/AVIF/WebP/cache-hit tren staging. Khong khang dinh muc tang toc khi chua do. Khong migration/data sync/deploy trong dot nay.

## Dot SQL read model, page/post va do staging - 2026-10-22

Trang thai moi thay the cac gioi han tuong ung cua dot truoc:

- Search su dung materialized query-result read model trong D1, khong phai FTS hay ban sao thuat toan gia. Cache miss dung resolver goc tinh danh sach da sap xep/facets; cache hit doc trang bang SQL range + LIMIT tren PRIMARY KEY(cacheKey,position). API, trang search va suggestions mac dinh di qua read model. Caller truyen Prisma client/pricing context rieng van dung resolver truc tiep.
- Migration 0028 them SearchCatalogRevision, SearchResultSet, SearchResultItem. Trigger invalidation bao phu Product, ProductVariant, ProductStudio, Brand, Category, SiteSettings, PromotionCampaign va PromotionCampaignItem. Revision guard khong luu ket qua neu catalog doi trong luc tinh; retry toi da hai lan, sau do bao loi thay vi tra cache cu.
- Thoi han toi da 5 phut va khong vuot moc bat dau/ket thuc flash sale/campaign. Metadata va page duoc doc trong D1 batch; facets/total va thu tu thuoc cung result set. Anh chi hydrate cho trang hien tai, nen thay doi ProductImage khong can invalidate gia/facets.
- Gioi han 32 query sets, toi da 2.000 matches/set. Vuot 2.000 thi dung duong uncached. Cold query van tinh tren toan bo tap khop va them chi phi ghi D1; chua toi uu candidate retrieval/FTS, chua co autocomplete query rieng. Khong mo ta day la SQL filtering hoan toan. Can theo doi cache-hit ratio, rows written va cold latency truoc khi nang gioi han.
- Page/post: metadata lookup luon kiem tra published/deletedAt; published document cache theo entity ID + publishedRevision, toi da 64 snapshots/DB binding. Warm read khong truyen content JSON. Anh, category va related product visibility van resolve hien tai; draft khong vao cache. Neu revision doi giua metadata va document read, tra 503 de retry, khong dung snapshot khac revision.
- Sua search image resolver dung getProductImageUrl da co: anh Library dung stored URL /api/library/{assetId}, khong tao /api/media/library/... bi cam. Khong mo rong quyen route media.
- worker-configuration.d.ts da generate lai, co IMAGES binding.

Kiem thu: TypeScript va scoped ESLint PASS; Cloudflare build PASS. test-performance PASS (revision, unpublish/delete, DB errors, cold/warm content, indexed SQL page, promotion boundary, concurrent rebuild). test-storefront-improvements PASS (cold/warm parity voi resolver goc cho relevance, price sort, price/spec filters; invalidation khi sua gia; Library URL). Pricing regression 16/16 PASS. Full Worker HTTP/D1 18/18 PASS; harness bo sung kiem tra HTTP search tao result set va tra warm response giong cold.

Local da backup tai .wrangler/backups/before-search-read-model-1792648499123.sqlite va apply duy nhat 0028. Khong sua business data/seed. Thu khoi dong dev de do latency khong hoan tat dependency scan, chua co HTTP local timing; da dung process thu nghiem. Bang chung runtime o tren la isolated built Worker, khong phai dev server hien tai.

### So lieu anh/CDN staging

Do luc 2026-10-22T05:53:03.564Z (12:53 GMT+7), HTTP GET tu may nay, 2 lan cho moi width/Accept; khong phai browser LCP hay p95 toan cau.

| Nguon / yeu cau | Ket qua thuc te |
| --- | --- |
| Logo goc /brand/citilap-logo.png | PNG 1.260 px, 25.911 bytes, HTTP 200 |
| Logo qua /_next/image, width 384/640/1080, Accept WebP/AVIF | 302 ve anh goc; sau redirect van PNG 1.260 px, 25.911 bytes |
| Cache logo | CF-Cache-Status HIT o response anh goc; KHONG chung minh cache cua anh resize |
| 12 request logo qua optimizer | 97-147 ms, median 101 ms, gom redirect/body; mau nho, khong la benchmark san xuat |
| Anh product do search tra /api/media/library/... | HTTP 403, 76 bytes JSON; optimizer cung redirect ve URL hong |
| Cung asset qua /api/library/7c73f6e4-ca31-4a25-8a7f-4ab5464ee78c | HTTP 200 image/webp, Cache-Control public max-age=3600, co ETag |

Lan thu dau dung width 320/960 tra 400 vi khong nam trong size allowlist hien tai; da do lai voi 384/640/1080 hop le. Khong quy ket 400 nay la loi CDN.

Ket luan: staging dang chay ban cu, chua co bang chung resize/format negotiation hoat dong. Ban sua da build local; can apply 0028 tren staging truoc deploy Worker, xac nhan Cloudflare Images binding/quyen su dung, sau do chay lai node scripts/measure-staging-images.mjs. Chua deploy, remote migrate hay dong bo data trong dot nay.

Bang chung local: .wrangler/staging-image-measurement.json, .wrangler/staging-image-measurement.log, .wrangler/staging-library-headers.txt, .wrangler/read-model-*.log. Script do staging chi GET, khong ghi du lieu tu xa.

## Cap nhat release staging - 2026-10-22

Trang thai moi: migration 0028 va Worker da deploy staging; local/staging co 100 san pham CONTACT, 10 bai viet, 9 trang noi dung/chinh sach. Search khi catalog lien tuc thay doi dung ket qua uncached moi sau hai lan rebuild, khong bao 500 chi vi revision race. Worker noi nguon anh Library D1/R2 vao ASSETS cho optimizer native; anh resize WebP/AVIF da xac minh bang bytes/kich thuoc, khong con 404 hoac redirect ve anh goc. Chua chung minh CDN cache-hit cho anh resize hay Core Web Vitals.

Bao cao hien hanh, version deploy, so lieu, kiem thu trinh duyet va gioi han production: [RELEASE-STAGING-2026-10-22.md](./RELEASE-STAGING-2026-10-22.md). Cac ket luan "chua deploy" o tren la bang chung lich su truoc dot release nay.
