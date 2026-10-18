# R09B - Migration rehearsal

Review: 2026-10-18. Synthetic SQLite rehearsal PASS; real-data and remote D1 rehearsal NOT RUN.

Run `node scripts/test-r09b-migration.mjs`. Evidence: [inventory and hashes](evidence/r09b-migration.json).

Script applies 0001-0020 to disposable SQLite, then seeds users including an email collision, public/private product revisions, order/item/event price snapshots and media references. It backs up the nonempty pre-R08 database, upgrades through 0021-0025 and verifies every old column in nine tables.

Five checks PASS:

1. Injected failure after 0021 SQL rolls back schema and rehearsal ledger.
2. Resume applies five migrations; second run skips matching checksums and rejects changed hashes.
3. IDs, credentials/roles, drafts/public data, financial snapshots and media relations survive. Legacy checkoutSnapshot stays NULL; publishedRevision backfills to 1. Foreign-key check is empty.
4. Last-owner, append-only audit, active schedule uniqueness and redirect-chain guards reject invalid mutations.
5. Native SQLite backup restores a separate DB with matching rows/ledger and working guards; integrity check returns ok.

0022 is **checkout_snapshot**, not audit. 0021 is identity; 0023 audit metadata; 0024 schedule; 0025 redirect. Exact names/checksums come from current migration files.

Limitations: RehearsalLedger is test-only, not Wrangler's ledger. SQLite backup is not D1 export/Time Travel. This does not certify remote migration transactions, actual legacy-data quality or R2 object backup. R08 operations separately verifies bootstrap collision and schedule writers on ephemeral D1.

Before staging: obtain authorized sanitized backup, inventory actual schema/ledger, restore an isolated D1 target, apply missing migrations with installed Wrangler, compare counts/snapshots/constraints and practice D1 restore there. Never use Prisma db push to reconcile tables absent from Prisma schema. Preserve additive tables/history; prefer forward repair.
