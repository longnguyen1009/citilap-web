# Antigravity round 07E: selected customer export boundary

Wait for Codex assignment. Scope Customers page, existing protected customer export route/service only if needed, ONE focused regression. Read AGENTS.md and relevant installed Next docs. Preserve dirty tree. No deploy/deps/shared DB writes/refactors.

Verified source: `downloadCustomersCsv` in `src/app/admin/customers/page.tsx` uses own escapeCsv without formula protection. DataTable bulk export calls it directly, bypassing existing protected `/api/admin/customers/export` capability/audit path. Existing `src/lib/csv-export.ts` already has `buildCsvContent`/`escapeCsvField`; reuse, do not add CSV implementation.

Keep selected-row export functional through existing server export authorization, CSV neutralization and audit. Use bounded validated selected IDs (max current page25, canonical guest/registered IDs), retain selected filter/source scope and correct data identity. Server must reject malformed/oversized selection, deny SALES without piiExport, allow OWNER/authorized SALES; never rely solely on hidden button. Don't widen roles or return unmasked data via a new endpoint. Prefer short diff/reuse. Success feedback must reflect actual response; show403/failure instead of optimistic success after window.open.

Regression: selected data containing `=1+1`, `+SUM(1,1)`, `@SUM(1,1)`, quotes/comma/newline/Vietnamese exports as safe literal cells. Unselected IDs absent, guest IDs resolve correctly, invalid/too-many IDs rejected, denied export has no audit, authorized export exactly one audit. Use real route/auth/D1 isolated Miniflare where applicable and browser mocked failures. No shared/remote writes. Typecheck/scoped lint, report `.wrangler/admin-review-20261112/round-07e-report.md` NEEDS_REVIEW then stop.
