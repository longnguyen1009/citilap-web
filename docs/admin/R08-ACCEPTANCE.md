# R08 acceptance - local implementation

Date: 2026-10-17. Base: master `fd846c9`. R08A/B/C implemented; local checks below. Staging/production acceptance remains pending. R09A is outside this change.

## Delivered

- R08A: Owner/Editor/Sales guards and revocable DB sessions; account management; atomic writer audit with request ID, entity, revisions and separate scheduler executor. Brand/category/media writers share audit batches. Legacy `/api/upload` mutations return authenticated 409; uploader uses `/api/admin/media`. Existing campaign lint errors fixed.
- R08B: 1500ms draft autosave for saved product/post/page/navigation/landing entities. Single in-flight save, CAS, late-response protection, unsaved-exit warning. New entities still require first manual save. Failed edits remain in memory; all five editors offer JSON download and server comparison. No new localStorage recovery payloads.
- Restore creates a new private revision; public snapshot stays unchanged. Restore and save share editor locks; newer product/post/page typing is preserved. Site Builder reloads the complete restored document, including SEO and clean baseline.
- Durable schedules pin revisions for all five writers. UI uses GMT+7; storage uses UTC. Worker minute cron processes up to 20 jobs per invocation, 120-second claims, up to three transient attempts. Actor/version and public snapshot are checked again inside the publication transaction. Cancellation, claim, publish and DONE guards prevent duplicate or cancelled publication. A newer draft survives scheduled publication as a separate revision.
- R08C: Owner redirect editor, CAS and DB loop/chain constraints; configured redirects return HTTP 301. Internal literal ASCII paths only; percent escapes, external/system paths, queries and fragments rejected. Incoming query strings are discarded. Settings feed SEO defaults; sitemap uses published projections and excludes configured redirect sources. Existing legacy canonical aliases keep their existing redirect behavior.

## Verification

All data checks use disposable Miniflare D1/R2. No persistent dev DB or remote DB was migrated.

| Layer | Command | Result |
|---|---|---|
| Identity/service/handler fixtures | `node scripts/test-r08-identity.mjs` | 13/13 PASS |
| Operations/service D1/R2 | `node scripts/test-r08-operations.mjs` | 15/15 PASS |
| Built Worker HTTP + scheduled handler | `node scripts/test-r08-full-app.mjs --serve` | 16/16 PASS, includes 12 R07C checks |
| Chrome against built Worker fixture | `node scripts/test-r08-browser.mjs <fixture-url>` | 7/7 PASS |
| Pricing/checkout regression | `node scripts/test-r07b-4-regression.mjs` | 16/16 PASS |
| Navigation regression | `node scripts/test-navigation.mjs` | 16/16 PASS |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS |
| Cloudflare build | `node node_modules/vite/bin/vite.js build` | PASS, exit 0 |
| ESLint, changed/new TypeScript | scoped ESLint | 0 errors; 2 unused actor warnings in settings/site-builder services |
| Whitespace | `git diff --check` | PASS |

Browser coverage: Owner login/hydration, autosave/reload without publication, slow response/new typing, restore/reload without publication, competing editor conflict, mobile redirect save/reload, logout invalidation. Role restrictions are covered through HTTP/service tests, not every role's browser workflow. Schedule execution is a real local Worker scheduled-handler call, not proof of an automatic Cloudflare trigger.

Screenshots: [desktop autosave](evidence/r08-autosave-desktop.png), [conflict](evidence/r08-conflict.png), [mobile redirect](evidence/r08-redirect-mobile.png).

## Schema and rollout

1. Back up target D1 and inventory existing users/roles before an explicitly authorized rollout. Preserve IDs, audit and financial snapshots. Apply canonical `d1-migrations` in order: identity `0021`, audit atomicity `0022`, audit metadata `0023`, schedules `0024`, redirects `0025`. Tests apply these only to empty disposable databases.
2. Raw D1 SQL owns CMS scheduling/audit/redirect tables and guards. Prisma schema is not a complete CMS schema mirror; do not use `prisma db push` to reconcile or delete these tables. `0024` backfills ProductStudio.publishedRevision.
3. Deploy compatible Worker code only after migrations, with DB/R2 bindings and `* * * * *` cron from `wrangler.jsonc`. Bootstrap first Owner using runtime ADMIN_EMAIL/ADMIN_PASSWORD only when no Owner exists and email is unused; never promote or overwrite a legacy account implicitly. Remove bootstrap secrets after verifying DB-account login.
4. Verify role menus, account revocation, draft conflict/recovery, media references, redirect301 and sitemap on staging. Observe an actual scheduled time boundary: require `CMS_SCHEDULE_DONE` log plus job DONE, expected public revision and preserved newer draft. Local manual scheduled calls cannot replace this gate.
5. Rollback is forward repair with admin traffic blocked if needed; retain additive tables/history. Do not restore shared-secret authorization or drop/reset data. Do not enable media cleanup until retention/reference policy covers retained revisions and schedules; this change enables no cleanup.

## Remaining environment gates

- SKIP: staging browser matrix and automatic Cloudflare cron observation; no deployment requested.
- SKIP: migration rehearsal on a backup of actual legacy data, real account inventory and remote schema verification; no real DB access/migration requested. Bootstrap collision fixture verifies no overwrite, not a migration of an existing production dataset.
- No commit, push, deploy or real DB migration performed. Whole-repository lint is not certified by scoped lint results.
