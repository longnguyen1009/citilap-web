---
version: alpha
colors:
  primary: "#2563eb"
  primaryHover: "#1d4ed8"
  surface: "#ffffff"
  background: "#f8fafc"
  text: "#0f172a"
  border: "#e2e8f0"
typography:
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "1.5"
rounded:
  control: "8px"
  card: "12px"
  dialog: "16px"
spacing:
  controlGap: "8px"
  gridGap: "16px"
  panel: "20px"
---

## Overview

CitiLap admin is a Vietnamese content publishing workspace. Preserve the existing blue actions, neutral slate shell and Inter font. The media library behaves like a contact sheet: generous image area, compact filenames and usage count. Avoid decorative dashboard metrics, oversized headings, marketing gradients or a second visual theme.

## Colors

Runtime ownership remains `src/app/globals.css` (existing @theme). Primary/hover use `--color-brand-primary` / `--color-brand-primary-hover`, text inherits `--foreground`. Existing slate neutrals continue in admin. `src/components/admin/media/media.css` owns the library geometry and interaction classes. This document mirrors existing runtime values; it does not generate a new theme. Frontstore design remains in `docs/storefront-design-system.md` and is not redesigned here.

## Typography

Inherited Inter for Vietnamese names and labels, 14px body and 24px page heading. File sizes and pagination stay readable. Filename truncation includes the full name in title/detail; metadata editor never truncates editable text.

## Layout

Keep the shared admin main scroller. Library grid uses 4:3 previews and two columns on narrow phones. Native select popups are intentionally platform-owned. Dialog becomes one column at 600px. Upload results keep individual rows so failures do not erase successes.

## Elevation & Depth

Flat white panels and thin borders; only dialog backdrop creates depth. Use native modal dialog for focus containment and inert background.

## Shapes

Controls 8px, cards 12px, modal 16px. Preview geometry remains reserved on image failure.

## Components

`media.css` -> `.media-button` / `.media-field` / `.media-card` / `.media-dialog` -> MediaBrowser, MediaEditor, MediaUpload, ImageUploader picker. Focus uses brand-primary, errors use red text plus explanation. Shared MediaDialog owns Escape/focus restoration. Scoped scrollbars remain visible; existing global CSS stays owned by Frontstore, avoiding concurrent global changes.

## Do's and Don'ts

Use explicit Vietnamese verbs, visible labels, status live regions and retry. Never show fake progress percentages (XHR upload bytes only), native alert/confirm, random image URLs, or a destructive delete action. Archiving preserves public URLs and is described as library organization, not privacy revocation.

## Admin R02 Conventions & UI Standards

### 1. Information Hierarchy & Page Structure
- **PageHeader (`src/components/admin/ui/PageHeader.tsx`)**: Every admin page has a single clear H1 heading, concise sub-description, contextual badge (e.g. revision count, active status), and one primary action button (e.g., "Lưu cấu hình", "Thêm sản phẩm").
- **AdminBreadcrumbs (`src/components/admin/ui/AdminBreadcrumbs.tsx`)**: Route-aware navigational trail rendered in the topbar and above page headers, maintaining operator context at all times.

### 2. Density & Spacing
- **Content Max-Width**: `max-w-7xl` for listing, dashboard, and tables; `max-w-5xl` for focused form pages (e.g., Settings).
- **Controls & Form Groups**: Compact 38–42px control height; `gap-4` between sibling fields; `gap-6` between fieldset cards.
- **Card Panels (`src/components/admin/ui/AdminCard.tsx`)**: Flat white background (`bg-white`), subtle 1px border (`border-slate-200/80`), rounded 12px (`rounded-xl`), with distinct header/body/footer divisions.

### 3. Button Hierarchy (`src/components/admin/ui/AdminButton.tsx`)
- **Primary**: `bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm` — Reserved strictly for the single main action per view.
- **Secondary**: `bg-white hover:bg-slate-50 text-slate-700 border border-slate-300` — For dismiss, back, or auxiliary actions.
- **Destructive**: `bg-rose-600 hover:bg-rose-700 text-white` — For irreversible or archive actions.
- **Ghost**: `hover:bg-slate-100 text-slate-600` — For inline or toolbar triggers.

### 4. Semantic Status Colors (`src/components/admin/ui/StatusBadge.tsx`)
Never communicate state by color alone; always pair with explicit Vietnamese text and semantic dot indicator:
- **Emerald (Success / Published / Hoàn thành)**: `bg-emerald-50 text-emerald-700 border-emerald-200/60`
- **Amber (Pending / Draft / Chờ xử lý)**: `bg-amber-50 text-amber-700 border-amber-200/60`
- **Rose (Failed / Cancelled / Ngừng nhận đơn)**: `bg-rose-50 text-rose-700 border-rose-200/60`
- **Blue (In Progress / Đang xử lý)**: `bg-blue-50 text-blue-700 border-blue-200/60`
- **Slate (Draft / Hidden / Lưu trữ)**: `bg-slate-100 text-slate-600 border-slate-200`

### 5. Feedback & Alerts (`src/components/admin/ui/InlineAlert.tsx`)
- Critical validation or server errors must never rely solely on auto-dismissing toasts.
- Use persistent `InlineAlert` banners with structured title, message, and action (e.g. "Tải bản mới từ server" on 409 conflict).
- Never display raw technical jargon (`D1`, `revision #`, `SQL constraint`) as primary user messages.

### 6. Responsive & Accessibility Shell
- **Desktop (1440px)**: Persistent 64-width sidebar divided into 3 functional groups (Tổng quan & Bán hàng, Catalog & Biên tập, Nội dung & Hệ thống).
- **Mobile (390px / 768px)**: Accessible off-canvas drawer with keyboard `Escape` handler, `aria-modal="true"`, focus entrapment and restoration to the open trigger.
- **Zoom 200%**: Layout adapts fluidly without toolbar overlap or hiding primary save actions.

### 7. CSS Scoping
- All admin components utilize scoped Tailwind utility classes targeting slate/zinc neutrals.
- Zero mutation of global design tokens or Storefront CSS rules in `src/app/globals.css`. Storefront styling remains 100% isolated.

### 8. Storefront Catalog & Comparison UX Conventions (R04)
- **Floating Compare Bar (`src/components/product/CompareFloatingBar.tsx`)**:
  - Docked at screen bottom (`fixed bottom-6 left-1/2 -translate-x-1/2 z-40`), elevated shadow (`shadow-2xl ring-1 ring-slate-900/10`), rounded-2xl with white glassmorphic background (`bg-white/95 backdrop-blur-md`).
  - Limits comparison to max 3 products (`MAX_COMPARE_PRODUCTS = 3`), shows product thumbnail, name, remove button, count badge, and high-visibility "So sánh ngay" action button (`bg-blue-600 text-white`).
- **Compare Modal (`src/components/product/CompareModal.tsx`)**:
  - Accessible dialog with difference toggle ("Chỉ xem điểm khác biệt"), side-by-side spec comparison matrix, and highlighting for diverging attributes (`bg-blue-50/60`).
  - Incompatible categories are prevented client-side and validated on server `/api/compare`.
- **Accessory Variant Options Selector (`src/components/product/StudioPurchaseSection.tsx`)**:
  - Dynamically renders option pills for non-PC items (Color, Switch, Connection, Power, Size) alongside Laptop RAM/SSD.
  - Active selection uses `border-blue-600 bg-blue-50/50 text-blue-700 font-medium ring-2 ring-blue-600/20`.
  - Inactive/unavailable variants clearly communicated with reduced opacity and availability badges.


