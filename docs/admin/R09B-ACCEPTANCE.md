# R09B - Local execution and remaining release gates

Review: 2026-10-18. User authorized R09A fixes followed by R09B execution. Local work performed; overall R09B/release acceptance remains OPEN.

Base HEAD: `91ff08742e02178a555e065e54ace0766341368f`, plus dirty working tree. Build succeeded using `node node_modules/vite/bin/vite.js build`. Types and scoped TS/TSX lint passed. No commit/push or production change. Staging provisioning/migration/deploy executed with subsequent user authorization; see update below.

## Fresh results

| Command | Result | Environment |
|---|---|---|
| node scripts/test-r08-identity.mjs | 13/13 PASS | Ephemeral D1/service/handler |
| node scripts/test-r08-operations.mjs | 15/15 PASS | Ephemeral D1/R2, manual scheduled calls |
| node scripts/test-product-studio.mjs | 12/12 PASS | Ephemeral D1/R2 |
| node scripts/test-media-library.mjs | 16/16 PASS | Ephemeral D1/R2; fixture now uses DB session, not legacy bearer |
| node scripts/test-r06-2-atomic.mjs | 15/15 PASS | Ephemeral D1; fixture now obtains current quote/ack before create |
| node scripts/test-r07b-4-regression.mjs | 16/16 PASS | D1 + handler HTTP |
| node scripts/test-r09a-storefront.mjs | 10/10 PASS | D1/service/handler |
| node scripts/test-r08-full-app.mjs --r09a --serve | 18/18 PASS | Built Worker, ephemeral D1/R2 |
| node scripts/test-r08-browser.mjs <fixture-url> | 7/7 PASS | Chrome against local Worker |
| node scripts/test-r09a-matrix.mjs <fixture-url> | 9 groups PASS | Chrome against local Worker |
| node scripts/test-r09-native-zoom.mjs <fixture-url> | 4/4 PASS | Native Chrome 200% zoom; reflow and keyboard entry |
| node scripts/test-r09-closure.mjs <fixture-url> | 4 groups PASS | Concurrent sale clock, unpublish, offline/reconnect, rendered CMS contact/noindex |
| node scripts/test-r07c-browser.mjs <fixture-url> | 7/7 PASS | Includes variant removal race, price review, lost-response retry |
| node scripts/benchmark-checkout-cls.mjs <fixture-url> | 36 samples PASS | Chrome lab, max CLS 0.041996 |
| node scripts/test-r09b-migration.mjs | 5/5 PASS | Native SQLite synthetic populated upgrade/backup/restore |

Initial media and R06.2 failures were obsolete fixture contracts. They were corrected without weakening production authentication or checkout validation, then rerun successfully. Admin browser whole-HTML equality included a dynamic clock; test now asserts unchanged published main content.

Final local fix: offline focus no longer triggers a router refresh to Chrome's network-error page; online event refreshes current prices. After this change, Cloudflare build, typecheck, scoped lint, Worker 18/18 and the closure browser suite passed again. Earlier service/Admin/checkout/CLS results above predate this small refresh change; they are retained evidence, not claimed as a second full rerun.

## Evidence and decisions

- [Technical UAT matrix](R09B-UAT-MATRIX.md)
- [Migration rehearsal scope](R09B-MIGRATION-REHEARSAL.md), [checksums/results](evidence/r09b-migration.json)
- [Reviewed CLS data](evidence/r09a-performance-reviewed.json)
- [Native zoom metrics](evidence/r09-native-zoom.json), [closure browser results](evidence/r09-closure.json)
- [Build and dirty-source fingerprint](evidence/r09b-artifact.json)
- [Release/rollback runbook](R09B-RELEASE-RUNBOOK.md)
- [R09A remaining coverage](R09A-ACCEPTANCE.md)

Local technical checks listed above: PASS. Synthetic upgrade: PASS. Real legacy-data rehearsal: NOT RUN. Native zoom: scoped PASS. Content-owner audit and remaining browser coverage: OPEN (see R09A). Business UAT sign-off: NOT RUN. Production release: NOT AUTHORIZED.

## Authorized staging execution - 2026-10-18

- D1 `citilap-db-staging` (`a812357f-51a3-4139-badf-2079bf2cd2e9`, APAC): empty baseline exported before migration; 25/25 applied, no pending migrations, foreign-key violations 0, users 0. This is initial schema installation, not legacy-data upgrade/restore proof.
- R2 `citilap-media-staging` created in the same account. Binding verified; application media upload/read UAT not yet run.
- Staging build/deploy PASS, version `2f1a7b1f-3af2-426c-a09a-b2fdc3c7d4bb`, URL `https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev`. No custom domain/DNS changes.
- Fixed staging indexability: robots disallows all, proxy returns `X-Robots-Tag: noindex, nofollow`. Typecheck/scoped lint/build PASS. Runnable `node scripts/test-r09b-staging-smoke.mjs`: 5/5 PASS (home/search/products, unauthorized Admin 401, robots).
- Real automatic cron observed with outcome ok on empty queue; no `CMS_SCHEDULE_DONE`/pinned revision/newer draft proof yet. Observed versions are recorded per event.
- User selected `longbn95@gmail.com` as staging Owner. Wrangler confirms secret names ADMIN_EMAIL, ADMIN_PASSWORD and TURNSTILE_SECRET_KEY are present; values were not read. Owner creation/login remains unverified. User supplied public Turnstile site key `0x4AAAAAAFZsbdPpsQAHD2eQ`.
- Turnstile integration deployed as version `d71c15aa-b682-48a1-9588-cb6161607a89`: checkout/contact/home consultation/product feedback now mount the widget, wait for token, send token in header and reset after attempts. Checkout keeps the exact pending idempotency key/body after 403 so a previously committed order is not duplicated. Token is not persisted in the pending order payload. Feedback API errors no longer show success.
- Typecheck/scoped lint/local and staging builds PASS; local Worker 18/18 and checkout browser 7/7 PASS, including an explicitly mocked 403 after a real lost create response. Staging HTTP smoke 5/5 PASS. API missing-token check returns 403 missing-input-response. Real human challenge success remains unverified; headless Chrome reports a challenge error, which is not evidence that the key/hostname configuration is valid.
- Evidence: [provisioning/migration/cron](evidence/r09b-staging-provisioning.json), [HTTP smoke](evidence/r09b-staging-smoke.json), [staging artifact](evidence/r09b-staging-artifact.json). Earlier artifact file describes the earlier local build.

Do not aggregate these suite counts into a claim of complete UAT. Staging config names and URL alone are not proof of an existing resource or permission to modify it. Next remote step requires exact account/resource IDs, approved backup destination and explicit staging migration/deploy authorization after review of the runbook.

Turnstile diagnosis (2026-10-18): user reproduced failure in regular Chrome. CDP captured challenge error `110200`; Cloudflare official error-code reference defines it as `Domain not authorized`. Add `citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev` to Hostname Management for site key `0x4AAAAAAFZsbdPpsQAHD2eQ`, then rerun browser validation. This is a confirmed hostname authorization blocker, not merely headless-browser uncertainty.
