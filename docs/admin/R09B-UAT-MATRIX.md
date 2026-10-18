# R09B - Technical UAT matrix

Review: 2026-10-18. Local tests use ephemeral D1/R2; staging rows below identify remote evidence separately. Technical PASS does not replace business sign-off.

| ID | Scenario | Expected | Actual |
|---|---|---|---|
| ID-01 | Owner bootstrap/collision | No implicit promotion/overwrite | PASS identity 13/13, operations collision |
| ID-02 | Owner/Editor/Sales API, CSRF, revoke/expiry | Deny unauthorized requests | PASS identity + Worker role matrix; not every role browser |
| CMS-01 | Product draft/publish/variants/media | Public projection only | PASS product-studio 12/12 |
| CMS-02 | Owner browser autosave/restore/conflict | Keep draft, public unchanged | PASS Admin browser 7/7 |
| CMS-03 | Schedule pinning/cancel/revoke | Correct revision, preserve newer draft | PASS operations 15/15 + Worker scheduled call; no automatic cron proof |
| MED-01 | Upload/reference/CSRF | Reject invalid/in-use operations | PASS media 16/16 after session-fixture correction |
| SF-01 | Search/filter/compare/PDP | Public data, URL state, variants | PASS R09A matrix 9 groups, subject to R09A open gates |
| SF-02 | Wishlist DB fault/retry | Preserve IDs, no fake empty | PASS matrix; blocked-storage proof historical |
| SF-03 | Four public consumers cross real sale clock | Sale starts/ends without reload | PASS closure: listing/PDP/compare/wishlist, Chrome focus emulation |
| SF-04 | Offline focus/retry/reconnect | Keep page and stored IDs; recover | PASS closure on built Worker after PublicPriceRefresh fix |
| SF-05 | Product INACTIVE | Hide search/related/API; PDP 404 | PASS closure after reload; Studio unpublish browser coverage separate |
| CMS-04 | Contact settings change | Render new phone/address | PASS home/profile/tracking; content-owner audit still open |
| ORD-01 | Quote/conflict/retry, variant race | Review changes, reject unavailable variant, one order | PASS checkout browser 7/7 |
| ORD-02 | SQL fault/concurrent create | Atomicity and idempotency | PASS Worker suite 18/18 |
| ORD-03 | R06.2 export/notification suite | Current contract-compatible full suite | PASS 15/15 after fixture obtains quote/ack; includes 520-order export |
| SEO-01 | Canonical/noindex/sitemap/301 | No private paths; strip sensitive query | PASS scoped matrix/Worker, not every rendered head |
| PERF-01 | Empty/full/retry checkout | Lab CLS <=0.1 | PASS 36 samples, max 0.041996 |
| ACC-01 | Native zoom 200% | Keyboard entry/reflow | PASS home/search/PDP/checkout via Chrome settings; r09-native-zoom.json. Not full WCAG certification |
| MIG-01 | Synthetic upgrade/backup/restore | Preserve history/snapshots | PASS SQLite 5/5; not Wrangler remote D1 |
| STG-01 | Real staging/cron | Correct binding and real scheduled event | 25 migrations, D1/R2 binding, deploy, HTTP 5/5 PASS. Automatic empty-queue cron observed; publication job proof OPEN |
| STG-02 | Authenticated staging UAT | Owner login, publish, media, checkout | Secret names present; Turnstile frontend deployed, missing-token rejection PASS. Owner login and successful real challenge/checkout still unverified |
| BIZ-01 | Store operator sign-off | Named operator accepts workflows | NOT RUN |

Every FAIL/SKIP remains open. Commands and artifact limits: R09B-ACCEPTANCE.md.
