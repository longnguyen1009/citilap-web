# Storefront URLs and category tree

Implemented locally on 2026-10-23. No commit, remote migration or deployment.

- CMS remains `/admin`.
- Products use `/laptop/{slug}` or `/phu-kien/{slug}`. SKU selection stays in the query string.
- Categories use root-level URLs with the complete parent chain (updated 2026-10-25).
- Example: `/laptop-gaming/lenovo-legion/legion-5-2023`.
- `/phan-loai` remains a category directory. Category detail pages contain scoped search, brands, needs, tags, configuration/price filters, sorting and pagination.
- Category filtering uses Server Components, native GET forms and links. URL `searchParams` determine the server result; core discovery works without JavaScript.
- Category base URLs and unfiltered pagination have self canonicals. Filtered/search/sorted results use `noindex,follow` and the base-category canonical. BreadcrumbList and ItemList JSON-LD describe the rendered page.
- `/category` redirects to the `/phan-loai` directory. Former `/phan-loai/...` category details permanently redirect to root-level URLs with query parameters preserved. Runtime link normalization handles existing CMS content without rewriting published snapshots or migrating the database.
- Category detail pages use compact image cards and dropdown filters. Laptop criteria cover needs, CPU, GPU, RAM and storage; accessory criteria cover type, connection and power. Only stored connection/power values are shown. Accessory cards omit the laptop specification matrix.
- Root categories include Laptop Mới, Laptop Like New, Gaming, Ultrabook, Workstation, Văn Phòng, MacBook and Phụ kiện.
- Category identity stays stable when its slug or parent changes.
- Header and mobile menus preserve the original eight authored entries, labels, order and curated children. Registering categories does not add or replace menu entries. All children of category menu entries target real level-2 categories, including MacBook color groups. The header dropdown, mobile menu and Danh m?c picker share these targets.
- Parent listings, homepage queries, facets and category-based Site Builder rules include descendant categories.
- Mới/Like New are condition-based laptop groups; accessory descendants are excluded.
- Product breadcrumbs follow the category ancestry. Product canonical URLs, structured data, search suggestions and sitemap use the new routes.
- Old product/category links redirect permanently; query parameters are preserved. Renamed and reparented category aliases resolve directly to the latest path, including when returning to an earlier slug.
- Invalid category ancestry returns HTTP 404. CMS pages and reserved application routes cannot share a category root slug.
- Published Site Builder link fields are normalized without rewriting draft or published authoring snapshots.
- CMS rich text now has explicit CSS for headings, paragraphs, lists, links, tables, quotes and media. No typography dependency was added.

## Local data

`node scripts/register-storefront-taxonomy.mjs --local`

The script selects one local CMS database, backs it up, preserves existing category IDs, publishes navigation through the CMS service and records product publication revisions. It refuses unpublished edits to navigation or products selected for republication.

The original main menu was restored from the initial backup after the taxonomy registration expanded it incorrectly. Desktop mega-menu image cards and compact dropdown grids are restored. The category picker follows authored category menu entries rather than every registered root. Product rows and category documents were compared before/after restoration and remained unchanged. Backup before menu restoration: `.wrangler/backups/before-taxonomy-1792756228300.sqlite`.

- 47 visible categories registered.
- 100 products changed primary category, confirmed against the pre-update backup after correcting a Legion-branded bag to the accessory branch.
- Unpublished product drafts preserved rather than automatically published or rewritten.
- Published product templates are checked against the laptop/accessory tree; accessory names containing a laptop series do not take precedence over their product type.
- Product prices, variant prices/status/stock and unpublished draft content match the backup.
- Running registration again changes zero product categories and creates no duplicate categories.
- Backup before initial registration: `.wrangler/backups/before-taxonomy-1792746278735.sqlite`.

Existing collections remain available for editorial collections and homepage content. No collection or order history was deleted.

## Validation

- `npx.cmd tsc --noEmit --pretty false`
- ESLint on changed routing, navigation, catalog, SEO and menu files: no errors; existing unused `actor` warning in Site Builder.
- `node scripts/test-navigation.mjs`: 17/17, isolated Miniflare D1/R2. Covers hierarchy, descendant filtering, facets, product-type rules, concurrent writes, reserved slugs, reparenting and redirect reversal.
- `node scripts/test-r07a-site-builder.mjs`: 11/11, isolated D1/R2.
- `npm.cmd run build:cloudflare`: passed; build only.
- `node scripts/test-storefront-taxonomy-browser.mjs`: real Chromium (Edge) on localhost, at 1440, 768, 390 and 320px. Checks original menu groups and desktop/mobile clicks, nested category canonical URLs, query-preserving 301, wrong-ancestry 404, sitemap, homepage links, contact form and nine fixed CMS pages.
- Browser evidence: `.wrangler/taxonomy-evidence/`.
- After restoring menus: `node scripts/test-storefront-taxonomy-browser.mjs http://localhost:3001 --menu-only` passed at all four widths, including desktop/mobile group clicks and zero uncaught exceptions. TypeScript, targeted ESLint and navigation 17/17 passed again. The menu-only run skips the fixed-page typography loop.

Browser checks cover warranty, returns, shipping, privacy, buying guide, purchase terms, FAQ, introduction and stores pages. Typography hierarchy, paragraph spacing, list markers and horizontal overflow are checked on every viewport. Contact form rendering is checked separately.

Local verification does not establish staging or production behavior.

### Category discovery verification (2026-10-25)

- Catalog routes share the shop layout through `(catalog)`, outside the shop loading boundary, so server-rendered results remain visible with JavaScript disabled.
- Detail breadcrumbs and BreadcrumbList JSON-LD contain only home and category ancestry; the directory is omitted. Category selection uses a compact native details picker with image cards.
- Blue active summaries group selected values by criterion; removing a group preserves other filters and sorting. Dropdown captions show selected labels, including custom price ranges. Need pills have icons; brand cards show actual matching product counts under other criteria, independent of selected brands.
- Default desktop heading, brand/need rows and filters measure 267.5px at 1440px; products appear within the initial viewport. Laptop and accessory controls remain distinct. No production year, weight or AI capability is inferred from product names.
- `node scripts/test-product-catalog-browser.mjs`: passed on localhost at 1440, 768, 390 and 320px. Covers category directory/detail, root-level nested URLs, query-preserving redirects, sitemap, canonical/noindex/JSON-LD, native search/filter/sort/pagination without JavaScript, empty/invalid filters and wishlist persistence. Also covers accessory-specific controls and native type filtering, accessory category/product route precedence, dropdown bounds, Escape/focus return, outside click and mobile rail arrows. No uncaught browser exceptions.
- Category and criteria rails scroll horizontally on mobile; only dropdown dismissal and arrow scrolling need client enhancement. Accessory connection/power controls appear only when structured values exist. Isolated D1 tests verify those facets and filters, plus stock/price matching on the same variant.
- Screenshots: `.wrangler/product-catalog-evidence/`.
- TypeScript, targeted ESLint, navigation 18/18, storefront improvements, Site Builder 11/11, product paths and Cloudflare build passed. No deployment.

## Level-2 menu registration (2026-10-24)

`node scripts/register-storefront-taxonomy.mjs --local --menu-categories`

Converts 23 collection menu targets to child categories while preserving labels, order and existing collections. Gaming families sit directly under Gaming; combined office categories contain the existing family categories. Five MacBook color products and one Dell Gaming product receive their corresponding category in both the product projection and published/draft Studio documents, with publication revisions. Category-only updates preserve all other product fields and variants. Existing category URLs redirect through the navigation publisher. Local only.
