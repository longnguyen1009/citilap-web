# CitiLap CMS UX contract — ADMIN-02

Scope: new media workspace and media picker. Existing legacy admin flows will migrate incrementally, not by global restyling.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select in MediaBrowser | mediaQuerySchema | kind / state; OS popup accepted | browser filtering |
| Form | mediaEditSchema/videoSchema + media.css field | server schema + API | metadata edit stays in dialog, video create returns to list | persistence + validation |
| Scrollbar | existing globals.css; media.css modal geometry | DESIGN.md | modal overflow; never hidden | mobile no overflow |
| Toast | inline role=status and role=alert | mutation result | success / field or request failure | browser retry |
| CRUD | media-library.service + MediaBrowser/Editor | D1 metadata; R2 bytes | archive/restore, no permanent delete | Miniflare + browser |
| Dialog | MediaDialog | native showModal, cancel listener | picker / edit / add video | Escape/dirty/focus |

Locale vi-VN. Dates stored UTC, metadata displayed as names, byte sizes and counts. No money/payment controls. Permission is current admin server auth, no new accounts.

List filters use URL query, kind, state and page; refresh preserves filters. Picker search is transient and intentionally does not modify parent product URL. Search debounced 300ms, IME composition defers calls, clear is immediate and restores focus; stale fetches are aborted. List pages capped at 24; server clamps out-of-range pages.

Editor persists entered values on errors or expired session; no automatic close on failed save. Revision conflict requires re-open/reload after preserving the edited text, never silent overwrite. Escape with dirty edits offers keep editing/discard. Browser unload warns only when dirty. Video form fields remain in page state if the dialog closes. Upload per-file statuses survive individual failures; failed files can retry without repeating successful files. Upload cancellation cannot guarantee the server did not commit, so the UI explicitly asks the editor to check the library before retry.

Archiving is a reversible operation, blocked for tracked usage; R2 is not deleted and URLs remain public. No confirmation required for restore or metadata saves. A future permanent-delete flow requires its own usage/retention contract and confirmation.

Legacy HTML references may not yet be tracked; ProductImage and supported Product.images URL references are tracked by D1 triggers. Existing default alt is not silently overwritten at each use site.
