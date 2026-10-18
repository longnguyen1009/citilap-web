# R09B - Release runbook (staging partially executed)

Review: 2026-10-18. User authorized continuation after D1 creation: migration, R2 preparation and staging deploy. D1 `citilap-db-staging` in account `8952957f4eed25a74e19a3e273c4a589`, ID `a812357f-51a3-4139-badf-2079bf2cd2e9`, APAC, now has all 25 migrations; foreign-key check is empty. Empty baseline export is stored under ignored `.wrangler/backups/`. R2 `citilap-media-staging` was created. No production resources changed.

Staging build/config verified and deployed: `https://citilap-ecommerce-staging.restless-snowflake-aaae.workers.dev`, version `2f1a7b1f-3af2-426c-a09a-b2fdc3c7d4bb`. Source site URL now uses this actual endpoint; no custom domain/DNS configured. HTTP smoke 5/5 and staging noindex PASS. Automatic cron executions observed on empty queue; actual scheduled publication remains open. No secrets or Owner configured; authenticated UAT and Turnstile checkout remain blocked pending staging credentials. Production decision remains NO-GO.

## Preflight and artifact

Turnstile update: version `d71c15aa-b682-48a1-9588-cb6161607a89` includes widget wiring and retry preservation. ADMIN_EMAIL, ADMIN_PASSWORD and TURNSTILE_SECRET_KEY now exist. Successful Owner login and real human challenge still require validation. For staging builds also set `$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY='0x4AAAAAAFZsbdPpsQAHD2eQ'` before Vite, restoring its previous value afterward; client public variables are frozen at build time. Assert the site key exists in the generated client bundle before deployment. Never place the secret key in a NEXT_PUBLIC variable.

1. Name the operator and approve the exact Cloudflare account, staging Worker, D1 ID, R2 bucket and domain. Verify staging resources are distinct from production. Do not rely on default CLI credentials.
2. Review R09A open browser/content gates and R09B UAT matrix. Obtain business sign-off separately. Inventory current remote schema and Wrangler migration ledger only after remote access is authorized.
3. Record HEAD plus dirty-diff/untracked hashes; HEAD alone does not identify this build. Preserve source, lockfile, artifact hashes, migrations/checksums and validation evidence. Agree on a commit/release artifact before rollout; this session makes no commit.
4. Resolve staging config placeholders and build explicitly for staging with `CLOUDFLARE_ENV=staging` (PowerShell: `$env:CLOUDFLARE_ENV='staging'`, then `node node_modules/vite/bin/vite.js build`, restoring the previous environment value afterward). Inspect generated dist/server/wrangler.json: Worker name, APP_ENV, site URL, DB ID, R2 bucket, assets and cron must all match the approved target. If any dev binding remains, STOP.

## Backup and migration rehearsal

5. Export approved target D1 before writes; record backup identifier/time and restore point. Store backup outside Git with controlled access. Capture order/item counts and snapshot hashes, users/roles, public/draft revisions, media usage, jobs and redirects. Back up R2 objects separately; D1 export does not contain them.
6. Restore into an isolated D1 rehearsal target and test the exact missing migration list. The synthetic SQLite rehearsal is preliminary only. Verify backup/restore there before touching the target.
7. Use installed Wrangler, explicit staging environment and database. Read-only inventory command template: `npx.cmd wrangler d1 migrations list citilap-db-staging --env staging --remote`. Export template: `npx.cmd wrangler d1 export citilap-db-staging --env staging --remote --output=<approved-backup-path>`. Resolve placeholders and review actual arguments before execution.
8. Only after separate approval, apply: `npx.cmd wrangler d1 migrations apply citilap-db-staging --env staging --remote`. Compare ledger and checksum inventory first. Do not manually replay non-idempotent ALTER statements, delete ledger rows or use Prisma db push. 0022 adds checkoutSnapshot; do not backfill old orders from current settings.

## Deploy and smoke

9. Review the staging-generated config and artifact hash, then deploy that exact build: `npx.cmd wrangler deploy --config dist/server/wrangler.json`. This command is only valid after step 4 has produced and verified a staging config. Verify the resolved target before confirming any CLI prompt. Do not deploy a raw TypeScript entry or the existing dev-generated config by accident.
10. Verify bindings/secrets without exposing values. Bootstrap only when no Owner exists and email is unused; never overwrite/promote an existing account. Verify DB-account login and remove bootstrap secrets when appropriate.
11. Smoke on actual staging URL: role denial/CSRF/revoke, draft/publish/unpublish, media bytes/references, campaign prices, cart/checkout review/retry, immutable confirmation and no public cache of credentials/order details. Verify canonical/noindex/sitemap/301 and cookie domain/security.
12. Observe an actual automatic Cloudflare cron boundary. Require job DONE, CMS_SCHEDULE_DONE log, expected public revision and preserved newer draft. A manual scheduled handler call is not equivalent. Record Worker/version/time and screenshots with sensitive values removed.

## Abort and rollback

Abort for wrong binding/account, schema mismatch, failed snapshot invariant, login/role regression, broken checkout, unexpected publication, lost media or cron failure. Stop writes where necessary. Prefer forward repair while retaining additive tables, audit and order history. Roll back code only to a version verified compatible with the new schema. Never re-enable shared-secret authorization.

If restoring data is unavoidable, obtain explicit approval: enumerate writes since the backup, expected data loss and reconciliation plan. Test restoration on an isolated target first. Restore R2 separately when required. Re-run financial/publication invariants and smoke before reopening writes.

Release authorization remains a separate named decision. No production deploy, migration, DNS or secret change is authorized by this runbook.
