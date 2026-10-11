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
