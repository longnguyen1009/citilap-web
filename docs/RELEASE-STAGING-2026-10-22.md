# CitiLap staging release - 2026-10-22

## Delivered

- Local and staging now publish 100 products, 10 original buying-guide articles and 9 content/policy pages.
- Catalog: 30 gaming, 35 office, 20 graphics, 5 MacBook; 2 each RAM/SSD, hub, stand/cooling, mouse/keyboard and bag.
- Existing model/specification/image data was reused. Imported reference prices and stock were not treated as verified CitiLap inventory. All 100 products use CONTACT availability; zero in storage renders as "Lien he bao gia", not a free offer. Checkout remains unavailable for these products until verified prices/availability are entered in Admin.
- Old 1,608 products were archived through the canonical writer; old 3 posts were unpublished. Historical records remain in Admin because orders/serials depend on them. No new backup was created, per user instruction.
- Menu, homepage product/news references, category/brand visibility, store settings, SEO defaults and service copy were updated. Unused demo post category hidden; unsupported promotion/gift banner removed.
- Published policies: warranty, returns, delivery, privacy, purchase terms. Published supporting pages: about, stores, buying guide and FAQ. Standard warranty: new laptop 12 months; used laptop/accessories 6 months; qualifying hardware defects handled under 7-day returns policy.
- Bank transfer disabled until real beneficiary information exists. Legal registration/tax/bank identifiers were not invented.

## Deployment

- URL: https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev
- Worker version: `3a91c2a7-80c6-451b-b46a-652292a78fc3`.
- Staging D1: `a812357f-51a3-4139-badf-2079bf2cd2e9`; R2: `citilap-media-staging`; Images binding enabled.
- Migration `0028_search_read_model.sql` applied to staging. Local already had this migration.
- Production/DNS untouched. Staging retains noindex. Worktree remains uncommitted; source/build fingerprint recorded under `.wrangler/release/source-fingerprint.json`.

## Runtime fixes

- Continuous catalog edits can invalidate both guarded search rebuilds. Search now uses one fresh uncached resolver result after those attempts instead of returning an avoidable 500; obsolete results never enter cache. Regression test exercises continuous invalidation and page slicing.
- Vinext's optimizer reads only the ASSETS binding by default. The Worker now routes `/api/library/{id}` image sources through the existing D1/R2 library service while retaining native parameter/type validation and Cloudflare image transformation. Missing images still fail closed; no remote URL fetching added.

## Verification

| Check | Result |
| --- | --- |
| Local catalog/content/category/media/home references | PASS: 100 products, 10 posts, 9 pages |
| Local and staging history counts | 671 orders, 834 order items, 3,049 serials preserved |
| Local and staging foreign-key check | No violations |
| Public staging catalog pagination | 100 unique intended slugs across three pages |
| Public staging routes/media | 133 URLs and 100 original images return 200 |
| Staging HTTP smoke | 5/5; admin unauthorized and noindex checked |
| Real headless Edge browser | 10 route/viewport checks at 390px and 1440px; home/search/product/news/warranty, no horizontal overflow, visible broken images or page errors |
| Cache/read-model regression | PASS, including continuous-write fallback |
| Storefront regression | PASS |
| Pricing/order regression | 16/16 PASS |
| Built Worker HTTP + isolated D1/R2 | 18/18 PASS after final Worker change |
| TypeScript / scoped source lint / Cloudflare build | PASS |
| Full repository lint | Still 6 existing errors and 18 warnings; not a green full-lint claim |

Full-lint errors remain in Admin builder/products/campaigns effects, campaign render-time Date.now and builder preview's explicit any. These are outside the release-content changes. Browser checks do not cover every Admin edit flow or a real human Turnstile challenge. No claim of completed payment/fulfillment UAT.

## Images and performance evidence

Actual staging GETs now return transformed bytes directly, without redirects:

| Image | Original | WebP 384px | WebP 640px |
| --- | --- | --- | --- |
| Logo | 27,748 B / 1,680px PNG | 4,526 B | 7,538 B |
| Sample catalog image | 42,636 B / 829px WebP | 4,016 B | 7,264 B |

WebP and AVIF negotiation checked at requested widths 384/640/1080, twice per combination. Images smaller than requested width are not upscaled (829px source stays 829px for request 1080). Optimized responses have `Vary: Accept` and public immutable cache headers. `CF-Cache-Status` is absent on transformed responses: this proves transformation and cache policy, not an edge cache hit. Logo original reports HIT. These workstation samples are not Core Web Vitals, global CDN p95, or a measured initial-JavaScript reduction.

Evidence: `.wrangler/release/local-checks.json`, `staging-checks.json`, `staging-db-checks.json`, `browser-checks.json`, browser screenshots, build/deploy/full-app/lint logs; `.wrangler/staging-image-measurement.json`. Local history hashes remained unchanged across repeat release runs in this turn; no pre-operation remote row hash was available.

Rerun checks: `node scripts/test-release-content.mjs --local`, `node scripts/test-release-content.mjs --staging`, `node scripts/measure-staging-images.mjs`, `node scripts/test-performance.mjs`.

## Production handoff

Enter verified per-product price/availability before accepting online orders. Configure actual bank details if enabling bank transfer. Production D1 currently has a placeholder ID and needs explicit provisioning/deployment scope. Real human Turnstile/contact/checkout flow and production domain must be verified before opening paid checkout.
