# R09A - Reviewed local evidence

Review: 2026-10-18. Base HEAD: 91ff08742e02178a555e065e54ace0766341368f plus uncommitted changes. Full release acceptance remains OPEN. This replaces overstated claims in the previous report.

## Fixes

- Checkout retains a shared shell/minimum height; validation does not flash a healthy-state banner. Quote loading remains visible in submit status and accessible to screen readers.
- ProductCard no longer guesses kind from CPU. CompareContext no longer blocks using stale local kind/template. The public compare API enforces compatibility; client enforces item limit. Incompatible items can enter the tray but cannot generate a comparison table.
- Matrix asserts descending API prices, uses an isolated browser context, performs Clear/Apply, requires a known related product, waits across real future sale boundaries, checks exact representative price, toggles differences and checks focus return.
- Benchmark asserts cart state and quote settlement, uses mobile 390x844, clears cache immediately before cold navigation and stores shift source rectangles. Original evidence remains separate.
- Admin restore test compares published main content rather than whole HTML containing a dynamic request clock.
- Offline focus previously triggered a router refresh that replaced the page with Chrome's network-error page. PublicPriceRefresh now skips router.refresh while navigator.onLine is false, retains client retry events and refreshes on reconnect. The real-browser regression verifies retained wishlist IDs, usable retry and online recovery.

## Fresh validation

| Gate | Result |
|---|---|
| Typecheck, scoped TS/TSX lint, Cloudflare build | PASS |
| test-r09a-storefront.mjs | 10/10 PASS |
| test-r08-full-app.mjs --r09a --serve | 18/18 PASS |
| test-r09a-matrix.mjs | 9 groups PASS; native zoom covered by separate suite below |
| test-r09-native-zoom.mjs | 4/4 PASS: home/search/PDP/checkout, native Chrome zoom 200% |
| test-r09-closure.mjs | 4 groups PASS: concurrent sale boundaries, unpublish, offline/reconnect, CMS contact/noindex |
| test-r07c-browser.mjs | 7/7 PASS, including variant removal and price review |
| test-r08-browser.mjs | 7/7 PASS |
| benchmark-checkout-cls.mjs | 36/36 samples <=0.1 |

Built Worker and ephemeral Miniflare D1/R2 only. R07B.4 rerun: 16/16 PASS. Earlier R04.1 counts are historical, not a fresh run in this review.

## Performance

See [reviewed measurements](evidence/r09a-performance-reviewed.json). Chrome 155.0.8059.82; desktop 1440x900/mobile 390x844; empty/populated/pending retry; cold/warm; three runs each. Expected state asserted, then observed for three seconds. No CPU/network throttle.

Max CLS: 0.041996. Empty/mobile: 0; populated desktop: 0.012290; retry desktop: 0.041996. Raw shift sources retained. These are post-fix lab samples, not field CWV/INP or a matched before/after experiment. Earlier claimed pre-fix populated/retry values lack preserved raw evidence and are withdrawn. Historical empty 0.195 is not a matched baseline.

Original r09a-performance.json remains the earlier submission; reviewed file is authoritative for this run. Supplemental route samples do not certify full performance.

## Corrected CMS inventory

| Consumer | Actual source | Proof |
|---|---|---|
| Footer/mobile phone | settings.storePhone; businessProfile.displayPhone fallback | Source inspected |
| Footer branches | addressHanoi/addressBacNinh/storePhoneBacNinh; businessProfile.locations | Source inspected |
| Policy routes | getSystemPageResolution: WARRANTY, RETURNS, SHIPPING | Source inspected, not blanket browser certification |
| Profile/tracking | Honest assistance routes | Browser asserted |

There is no SiteSettings.contactPhone/showrooms contract. Earlier invented fallback properties and blanket CLEAN claims are withdrawn. Full content-owner audit remains open.

[Closure evidence](evidence/r09-closure.json) verifies changed storePhone/addressHanoi on home/profile/tracking and rendered noindex on search/profile/tracking. It does not certify all policy body contact details. Policy resolver states (no record, draft, published, unpublished, DB error) passed test-r05-1-publication-and-redirects.mjs; its hand-written HTTP 308 server is not application-route proof.

## Open gates

- Native desktop 200% zoom: PASS for home/search/PDP/checkout reflow and keyboard entry. [Metrics](evidence/r09-native-zoom.json) use Chrome settingsPrivate.setDefaultZoom(2), OS scale 1, no CDP metrics override/CSS zoom/pinch. DPR 2, innerWidth 711 versus outerWidth 1440, visualViewport.scale 1; no horizontal document overflow. This is headless native Chrome zoom, not manual Ctrl+Plus or full accessibility certification.
- Simultaneous real-clock sale start/end PASS across search listing/PDP/compare/wishlist, with four Chrome targets using focus emulation. Cart/quote stale-price rejection and checkout review/retry remain separate tests, not part of that simultaneous matrix.
- Variant disabled after quote rejects submit without losing form/cart context. Wishlist offline/retry/reconnect PASS (recovery at 100ms latency, 200KB/s). Product INACTIVE disappears after reload from search/related, compare/wishlist APIs, and PDP returns 404. Full offline/slow-network coverage, every rendered head/privacy case and Studio unpublish browser coverage remain open.
- Search sort currently has API order assertions, not every rendered-order/facet combination.
- Catalog regression covers 1,202 products/page 101. No CPU/memory benchmark supports 45ms or 2,500/5,000 product ceilings; those claims are withdrawn. In-memory matched-pool processing remains a scale risk.
- Working tree is intentionally dirty. No commit/push/deploy/remote migration.

User authorized R09B local work; this does not waive open gates or authorize production release. See R09B-ACCEPTANCE.md.
