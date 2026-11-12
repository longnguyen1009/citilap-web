# Antigravity round 07D: Media editor initial folder race

Implement small patch only after Codex assigns. Read AGENTS.md/installed Next use-client doc. Scope `src/components/admin/media/MediaEditor.tsx` and one focused runnable browser check. Preserve dirty edits. No dependencies, guidance CLI, backend/storefront/deploy/DB writes.

Verified initial media detail GET unconditionally setFolder(data.asset.folder), overwriting folder selected by user while request pending. Respect touched folder when late detail arrives, update canonical baseline/current without destroying touched local value. Guard all detail/optimization/folder callbacks against abort/unmount/old asset. Fields already disabled during save; do not claim or introduce unnecessary save-during-edit mechanism.

Clipboard rejection currently silent; show visible error and only mark copy success after promise resolves. Stale two-second timer must not clear a newer copy of SAME key; generation/timer cleanup sufficient. Keep dirty close confirmation, revision/usage archive guard, original media retention, native dialog focus/Escape.

Browser real /admin/media with mocked delayed detail/clipboard: select new folder before initial detail resolves, selected folder survives; cancel discard retains edits; rejected/missing clipboard visible, retry works, same-key timer. Use isolated runtime3012 and existing QA session (never print token); block all real mutations. Typecheck/scoped lint. Report `.wrangler/admin-review-20261112/round-07d-report.md` NEEDS_REVIEW then stop.
