# Parts Book — Feature Documentation

**Version:** 1.0  
**Date:** 2026-06-29  
**Machine:** LU300-M  
**PDF Reference:** LE15-173-R2 (Pub No. LE15-173-R2, Aug 2003, 339 pages)  
**Status:** Planning complete — implementation pending  
**Figma:** https://okumaui.github.io/Okuma_UI_Designs/parts-catalogue.html  
**Test credentials:** customer@okuma.com / customer123

---

## Overview

The Parts Book is an authenticated, interactive parts catalogue page for the LU300-M machine. It presents a three-level hierarchy (Assembly Group → Sheet → Parts) with exploded diagram views, numbered callout markers, and commerce actions (Add to Cart / Add to Quote).

Access is gated to logged-in customers and dealers. Unauthenticated visitors are redirected to the login page.

---

## User Journey

```
Login → Parts Book page
  → Select Assembly Group (e.g. "1 - Bed Group")
    → Select Sheet (e.g. "Sheet No.1 Bed")
      → Exploded diagram loads with numbered callout circles
      → Parts table renders below diagram
      → Click callout or table row → tooltip + row highlight
      → Set qty → Add to Cart / Add to Quote
```

---

## UI Design

All UI patterns are derived from the Figma reference at https://okumaui.github.io/Okuma_UI_Designs/parts-catalogue.html.

### Page Header

```
LU300-M  [VERIFIED MACHINE]                        [Download PDF ↓]
```

- Machine name as `<h1>`
- `VERIFIED MACHINE` badge rendered in green — populated by machine verification API (stubbed in v1)
- Download PDF button top-right

### Navigation — Cascade Dropdowns

Three sequential `<select>` elements. Each is disabled until the prior selection is made.

| Step | Dropdown label | Source |
|---|---|---|
| 1 | Select Book | Top-level machine model (LU300-M only in v1) |
| 2 | Select Group | Assemblies from `index.json` — e.g. "1 - Bed Group", "2 - Headstock Group" |
| 3 | Select Sheet | Sheets within the chosen group — e.g. "Sheet No.1 Bed", "Sheet No.2 Support Duct" |

### Breadcrumb

```
Home / Parts Book / LU300-M / Catalogue
```

### Diagram Area

- Full-width container
- Assembly PNG image displayed within the container
- Zoom controls (+ / −) on right edge: `transform: scale()` min 0.5, max 3.0
- Callout markers: blue circles with index number, absolutely positioned by normalized % coords derived from `callout_box_2d`

### Callout Tooltip

Appears on callout click or table row click. Dark popover containing:

| Field | Source |
|---|---|
| Part # | `part_no` |
| Part Name | `description` |
| Unit Price | BC product `price` |
| Qty stepper | `− 1 +` spinner |
| Add to Cart | Posts to Storefront Cart REST API |

### Parts Table

Columns: `#` · `PART #` · `PART NAME` · `DESCRIPTION` · `COMPATIBILITY` · `UNIT PRICE` · `AVAILABLE` · `QTY` · Action

| Column | Notes |
|---|---|
| `#` | `callout_number` from parts JSON |
| `PART #` | `part_no` |
| `PART NAME` | `description` |
| `DESCRIPTION` | Extended description from BC metafield `parts_book.description` |
| `COMPATIBILITY` | `Verified` (plain text) or `Direct Replacement` (blue link) — from metafield |
| `UNIT PRICE` | BC product `price` |
| `AVAILABLE` | `In-Stock` (green badge) or `Out of Stock` (gray badge) — from BC `inventory_level` / `availability` |
| `QTY` | Inline qty stepper |
| Action | `Add To Cart` (primary blue) · `Add To Quote` (secondary) · `Suggested Alternatives` link |

Active row: light blue highlight (`#eef3ff`) when its callout is selected and vice versa.

---

## Data Architecture

### Source Data — Extracted PDF Structure

The PDF (LE15-173-R2) has been pre-processed by an extraction pipeline into a structured directory tree. Sample located at:  
`C:\Users\llal\OneDrive - Deloitte (O365D)\Okuma Commerce - Implementation\01 Technical\PBSample1-LE15-173-R2`

```
LE15-173-R2/
├── index.json                          ← catalog index (14 assemblies, 124 sheets)
├── {assembly_slug}/
│   ├── assembly.json                   ← assembly overview + sheet reference callouts
│   ├── overview.png                    ← assembly overview diagram image
│   └── {sheet_slug}/
│       ├── parts.json                  ← parts with callout coordinates
│       ├── assembly.png                ← sheet exploded diagram image
│       └── table.png                   ← parts table scan image (reference only)
```

#### `index.json` — Top-level Catalog

```json
{
  "pdf_name": "LE15-173-R2",
  "assembly_count": 14,
  "sheet_count": 124,
  "assemblies": [
    {
      "assembly": "1_bed_group",
      "directory": "1_bed_group",
      "assembly_json": "1_bed_group/assembly.json",
      "overview_image": "1_bed_group/overview.png",
      "sheet_count": 3,
      "sheets": [
        {
          "sheet_number": 1,
          "slug": "sheet_no_1_bed",
          "directory": "1_bed_group/sheet_no_1_bed",
          "assembly_image": "1_bed_group/sheet_no_1_bed/assembly.png",
          "parts_json": "1_bed_group/sheet_no_1_bed/parts.json"
        }
      ]
    }
  ]
}
```

#### `{assembly}/assembly.json` — Assembly Overview Callouts

Used to render clickable sheet reference callouts on the assembly overview image.

```json
{
  "pdf_name": "LE15-173-R2",
  "assembly": "1_bed_group",
  "coordinate_space": "Normalized [ymin, xmin, ymax, xmax] from 0 to 1000",
  "overview": { "page_number": 20 },
  "sheet_reference_callouts": [
    {
      "box_id": "sheet_callout_001",
      "text": "SHEET No.2",
      "sheet_numbers": [2],
      "box_2d": [294.7, 447.1, 305.9, 541.6],
      "target_sheets": [{ "sheet_number": 2, "directory": "sheet_no_2_support_duct" }]
    }
  ]
}
```

#### `{assembly}/{sheet}/parts.json` — Sheet Parts with Callout Coordinates

This is the primary data source for the parts table and callout marker rendering.

```json
{
  "pdf_name": "LE15-173-R2",
  "assembly": "1_bed_group",
  "sheet": {
    "sheet_number": 1,
    "directory": "sheet_no_1_bed",
    "title": "SHEET NO.1 BED",
    "diagram_page_number": 22,
    "table_page_number": 23
  },
  "coordinate_space": "Normalized [ymin, xmin, ymax, xmax] from 0 to 1000",
  "parts": [
    {
      "box_id": "part_callout_001_01",
      "callout_number": 1,
      "callout_instance_index": 1,
      "callout_box_2d": [201.0, 530.0, 217.0, 536.6],
      "has_table_match": true,
      "item_number": 1,
      "sheet_item": "1-001",
      "part_no": "525-0000-01-01",
      "description": "BED",
      "unit_no": "S1000-0525-008A01",
      "qty": 1,
      "table_row_box_2d": [140.8, 92.2, 156.3, 484.8]
    }
  ],
  "stats": {
    "callout_count": 12,
    "table_row_count": 12,
    "matched_count": 12
  }
}
```

**Coordinate conversion for rendering:**  
`callout_box_2d` is `[ymin, xmin, ymax, xmax]` in 0–1000 space. Convert to percentage for absolute CSS positioning:

```js
const [ymin, xmin, ymax, xmax] = part.callout_box_2d;
const cx = ((xmin + xmax) / 2) / 10;  // % from left
const cy = ((ymin + ymax) / 2) / 10;  // % from top
// Use: style="left: {cx}%; top: {cy}%"
```

### BC Product Catalog — One Product Per Part

| BC Field | Value |
|---|---|
| SKU | Part number (e.g. `525-0000-01-01`) |
| Price | Managed in BC catalog normally |
| Inventory | Managed in BC catalog normally |

### BC Product Metafields

Namespace: `parts_book` · Permission: `read_and_sf_access`

| Key | Example | Purpose |
|---|---|---|
| `sheet_id` | `"lu300m-sheet-001"` | Assigns part to a sheet |
| `index_no` | `"4"` | Callout number (matches `callout_number` in parts.json) |
| `callout_x` | `"63.5"` | Centre % x on diagram (derived from `callout_box_2d`) |
| `callout_y` | `"41.2"` | Centre % y on diagram (derived from `callout_box_2d`) |
| `compatibility` | `"Verified"` / `"Direct Replacement"` | Compatibility label |
| `description` | `"BOLT, socket-head 12X30"` | Extended description |
| `unit_no` | `"S1000-0525-008A01"` | Assembly unit number from PDF |

### Static Catalog Data File

**Path:** `app/src/data/parts-book/lu300m.json`  
**Purpose:** Mirrors `index.json` from the extracted PDF data. Contains the books/groups/sheets hierarchy plus parts per sheet and diagram image paths. No database required for v1.

**Structure:**

```json
{
  "machine": "LU300-M",
  "pdfRef": "LE15-173-R2",
  "assemblies": [
    {
      "id": "1_bed_group",
      "label": "1 - Bed Group",
      "overviewImage": "/img/parts-book/lu300m/1_bed_group/overview.png",
      "sheets": [
        {
          "id": "sheet_no_1_bed",
          "sheetNumber": 1,
          "label": "Sheet No.1 Bed",
          "diagramImage": "/img/parts-book/lu300m/1_bed_group/sheet_no_1_bed/assembly.png",
          "parts": [
            {
              "calloutNumber": 1,
              "sheetItem": "1-001",
              "partNo": "525-0000-01-01",
              "description": "BED",
              "unitNo": "S1000-0525-008A01",
              "qty": 1,
              "calloutBox2d": [201.0, 530.0, 217.0, 536.6]
            }
          ]
        }
      ]
    }
  ]
}
```

### Diagram Images

PNGs extracted from the PDF, one per sheet. Stored in `theme/assets/img/parts-book/lu300m/`.  
Path pattern: `theme/assets/img/parts-book/lu300m/{assembly_slug}/{sheet_slug}/assembly.png`

---

## Backend API

**File:** `app/src/routes/v1/parts-book.ts`  
**Mounted at:** `app/src/routes/v1/index.ts` → `/parts-book`  
**Auth:** All endpoints require `req.session.customerId` — return `401` if missing.

### GET /v1/api/parts-book/catalog

Returns the books/groups/sheets hierarchy from the static JSON (no parts detail).

**Response:**
```json
{
  "books": [{ "id": "lu300m", "label": "LU300-M" }],
  "groups": [
    { "id": "1_bed_group", "label": "1 - Bed Group", "bookId": "lu300m" }
  ],
  "sheets": [
    { "id": "sheet_no_1_bed", "label": "Sheet No.1 Bed", "sheetNumber": 1, "groupId": "1_bed_group" }
  ]
}
```

### GET /v1/api/parts-book/sheets/:sheetId/parts

- Reads parts array from `lu300m.json` for the given `sheetId`
- Extracts all `partNo` values from the sheet
- Batch-fetches BC products: `GET /v3/catalog/products?sku:in={skus}&limit=50&include_fields=id,sku,name,price,inventory_level,availability`
- Merges price + inventory into each part entry
- Converts `callout_box_2d` [ymin, xmin, ymax, xmax] to `calloutX`/`calloutY` percentage centre coords

**Response:**
```json
{
  "sheet": {
    "id": "sheet_no_1_bed",
    "label": "Sheet No.1 Bed",
    "sheetNumber": 1,
    "diagramUrl": "/img/parts-book/lu300m/1_bed_group/sheet_no_1_bed/assembly.png"
  },
  "parts": [
    {
      "indexNo": 1,
      "sheetItem": "1-001",
      "partNo": "525-0000-01-01",
      "partName": "BED",
      "description": "BED",
      "unitNo": "S1000-0525-008A01",
      "compatibility": "Verified",
      "price": 0,
      "inStock": true,
      "productId": 12345,
      "calloutX": 53.3,
      "calloutY": 20.9
    }
  ]
}
```

**Parts without a matching BC product** are included with `price: null` and `inStock: false` — they display in the table without commerce actions.

### GET /v1/api/parts-book/machine/verify

**Query:** `?serialNo=...`  
**Status:** Stub — returns hardcoded verified response. Replace with third-party API when details are confirmed.

```json
{
  "verified": true,
  "model": "LU300-M",
  "serialNo": "...",
  "stockCondition": "Active"
}
```

### BC Service Function

Added to `app/src/services/bigcommerce.ts`:

```ts
const getProductsBySKUs = (skus: string[]) =>
  bcClient.get(
    `/v3/catalog/products?sku:in=${skus.join(',')}&limit=50` +
    `&include_fields=id,sku,name,price,inventory_level,availability`
  );
```

---

## Frontend

### Handlebars Template

**File:** `theme/templates/pages/custom/page/parts-book.html`

Key points:
- `{{#unless customer}}` redirect to login
- Breadcrumbs via `{{> components/common/breadcrumbs}}`
- `{{#partial "page"}}...{{/partial}}` + `{{> layout/base}}` wrappers
- Injects `window.__PARTS_BOOK_API__ = '/v1/api/parts-book'` for JS to consume

### PageManager JS

**File:** `theme/assets/js/theme/parts-book.js`  
**Registered in:** `theme/assets/js/app.js` under `customClasses`:

```js
const customClasses = {
    'pages/custom/page/parts-book': () => import('./theme/parts-book'),
    'pages\\custom\\page\\parts-book': () => import('./theme/parts-book'),
};
```

**Responsibilities:**

| Step | Detail |
|---|---|
| Init | Fetch `/catalog`, populate and cascade the three dropdowns |
| Sheet change | Fetch `/sheets/:sheetId/parts`, render diagram + parts table |
| Diagram render | Load assembly PNG, position callout circles at `calloutX`/`calloutY`% |
| Callout click | Highlight callout + corresponding table row, show tooltip |
| Row click | Highlight row + corresponding callout, show tooltip |
| Tooltip | Dark popover: part details, qty stepper, Add to Cart button |
| Zoom | `transform: scale()` on diagram wrapper; min 0.5, max 3.0 |
| Add to Cart | Storefront Cart REST API (see pattern below) |
| Machine verify | On init, fetch `/machine/verify`, populate serial + stock condition spans |

**Add to Cart pattern (Storefront Cart REST API):**

```js
async _addToCart(productId, quantity) {
    const cartsRes = await fetch('/api/storefront/carts', { credentials: 'same-origin' });
    const carts = await cartsRes.json();
    const cartId = carts.length > 0 ? carts[0].id : null;
    const url = cartId
        ? `/api/storefront/carts/${cartId}/items`
        : '/api/storefront/carts';
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems: [{ productId, quantity }] }),
    });
    if (!res.ok) throw new Error('Add to cart failed');
    $('[data-cart-quantity]').trigger('cart-quantity-update');
}
```

### SCSS

**Files:**
- `theme/assets/scss/components/stencil/partsBook/_partsBook.scss` — component styles
- `theme/assets/scss/components/stencil/partsBook/_component.scss` — barrel import
- Registered in `theme/assets/scss/components/_components.scss`

**Key classes:**

| Class | Purpose |
|---|---|
| `.parts-book__header` | Page header with machine name + badge |
| `.badge--verified` | Green badge for VERIFIED MACHINE |
| `.parts-book__nav` | Cascade dropdown container |
| `.parts-book__diagram` | Full-width diagram wrapper with zoom support |
| `.parts-book__callout` | Blue circle, absolutely positioned |
| `.parts-book__callout--active` | Active callout state (highlighted) |
| `.parts-book__tooltip` | Dark popover on callout/row click |
| `.parts-book__row--active` | Light blue row highlight `#eef3ff` |
| `.badge--in-stock` | Green availability badge |
| `.badge--out-of-stock` | Gray availability badge |

---

## Data Prep Tooling

Data preparation runs **offline, in parallel with code development**. No tooling is part of the live storefront.

### Step 1 — Fill the Page Map

**File:** `scripts/parts-book-page-map.json`

Manually fill this from the PDF table of contents. Maps sheet slugs to PDF page numbers for extraction.

```json
{
  "sheet_no_1_bed": 22,
  "sheet_no_2_support_duct": 24,
  "sheet_no_3_hook": 26
}
```

> The sample data at `PBSample1-LE15-173-R2` already has `diagram_page_number` in each `parts.json` — use this to populate the map without manually reading the PDF.

### Step 2 — Extract Diagram PNGs

**File:** `scripts/extract-diagrams.js`  
**Usage:** `node scripts/extract-diagrams.js path/to/LE15-173-R2.pdf`  
**Dependencies:** `npm install pdfjs-dist canvas`  
**Output:** `theme/assets/img/parts-book/lu300m/{assembly_slug}/{sheet_slug}/assembly.png` at 150 DPI

The extraction script reads `scripts/parts-book-page-map.json` to know which PDF page maps to which sheet slug.

> **Key insight from sample data:** The extracted PDF structure already exists as a full JSON dataset at  
> `C:\Users\llal\OneDrive - Deloitte (O365D)\Okuma Commerce - Implementation\01 Technical\PBSample1-LE15-173-R2`  
> This includes `assembly.png` and `parts.json` per sheet with pre-computed callout coordinates. The extraction step may already be complete for LE15-173-R2.

### Step 3 — Verify/Generate Callout Coordinates

The sample `parts.json` files include `callout_box_2d` — normalized `[ymin, xmin, ymax, xmax]` coordinates (0–1000 space) for each callout marker. These can be converted directly to render positions without any manual marking tool.

**If coordinates need correction**, use the callout marker tool:

**Files:** `tools/callout-marker/index.html` · `tools/callout-marker/callout-marker.js`  
**Usage:** Open `index.html` directly in a browser (no server needed)

1. Load the extracted PNG via file input
2. Click on diagram to place numbered markers (blue circles)
3. Enter part number for each marker
4. Copy JSON from the live output panel → paste into `lu300m.json`

### Step 4 — Populate `lu300m.json`

Convert the extracted `index.json` + per-sheet `parts.json` files into `app/src/data/parts-book/lu300m.json`.

This can be scripted: iterate `index.json` assemblies → read each sheet's `parts.json` → build the unified catalog JSON.

### Step 5 — Seed BC Metafields (one-time)

**File:** `scripts/seed-parts-metafields.ts`

Reads `lu300m.json` and writes `parts_book` metafields to each matching BC product via REST Management API. Run once after products are created in the BC catalog.

---

## Available PDFs

The following part book PDFs are available at `C:\Users\llal\OneDrive - Deloitte (O365D)\Okuma Commerce - Implementation\01 Technical\Parts PDF`:

| File | Notes |
|---|---|
| `LE15-173-R2.pdf` | LU300-M — **in scope for v1** (sample data extracted) |
| `GE15-039-R10.pdf` | Future machine — out of scope v1 |
| `LE15-221-R1.pdf` | Future machine — out of scope v1 |
| `LE15-230-R5.pdf` | Future machine — out of scope v1 |
| `ME15-181-R5.pdf` | Future machine — out of scope v1 |
| `ME15-291-R2.pdf` | Future machine — out of scope v1 |

---

## File Impact

| Action | Path |
|---|---|
| CREATE | `theme/templates/pages/custom/page/parts-book.html` |
| CREATE | `theme/assets/js/theme/parts-book.js` |
| CREATE | `theme/assets/scss/components/stencil/partsBook/_partsBook.scss` |
| CREATE | `theme/assets/scss/components/stencil/partsBook/_component.scss` |
| CREATE | `app/src/routes/v1/parts-book.ts` |
| CREATE | `app/src/data/parts-book/lu300m.json` |
| CREATE | `scripts/extract-diagrams.js` |
| CREATE | `scripts/parts-book-page-map.json` |
| CREATE | `scripts/seed-parts-metafields.ts` |
| CREATE | `tools/callout-marker/index.html` |
| CREATE | `tools/callout-marker/callout-marker.js` |
| CREATE | `theme/assets/img/parts-book/lu300m/.gitkeep` |
| MODIFY | `theme/assets/js/app.js` — add `customClasses` entries |
| MODIFY | `theme/assets/scss/components/_components.scss` — add import |
| MODIFY | `app/src/routes/v1/index.ts` — mount `/parts-book` router |
| MODIFY | `app/src/services/bigcommerce.ts` — add `getProductsBySKUs` |

---

## Store Admin Prerequisites

Manual steps required before dev testing:

1. **Create a BC Web Page** in store admin: Storefront → Web Pages → Add Page  
   - URL: `/parts-book/`
   - Template: assign `parts-book.html` after theme bundle is uploaded

2. **Add `customLayouts`** to `config.stencil.json` (local dev only, gitignored):

```json
{
  "customLayouts": {
    "page": {
      "parts-book.html": "/parts-book/"
    }
  }
}
```

3. After theme bundle uploaded: assign the `parts-book` template via the Template Layout dropdown in the web page settings.

---

## Execution Order

```
Phase 1 — Data prep (offline, can run in parallel with coding)
  1. Verify/populate scripts/parts-book-page-map.json from PDF TOC
     (or derive from diagram_page_number values in PBSample1 parts.json files)
  2. Run: node scripts/extract-diagrams.js path/to/LE15-173-R2.pdf
     → generates PNGs (may already exist in PBSample1 directory)
  3. Convert PBSample1 data into app/src/data/parts-book/lu300m.json
  4. Run: node scripts/seed-parts-metafields.ts
     → loads parts into BC product metafields

Phase 2 — Code
  5. Backend: Express routes + BC service function + machine verification stub
  6. Frontend: Handlebars template + PageManager JS + SCSS
  7. Build: cd theme && npm run build

Phase 3 — Quality
  8. code-reviewer → junits-specialist
  9. Deploy: cd theme && stencil bundle → upload to BC store admin
  10. validation-tester against acceptance criteria
```

---

## Open Items

| Item | Status | Owner |
|---|---|---|
| Third-party machine verification API | TBD — API name, endpoint, auth, and response shape not yet provided. Stub returns `verified: true` for v1. | — |
| `lu300m.json` conversion script | Sample data at `PBSample1-LE15-173-R2` is the source. Write a one-off conversion script to build the catalog JSON. | — |
| Callout coordinates | `callout_box_2d` exists in sample `parts.json` files — no manual marking needed unless corrections required. | — |
| BC product catalog for LU300-M | Parts need to exist as BC products with SKU = part number before metafields can be seeded. Confirm if catalog is populated. | — |
| Add to Quote flow | Placeholder button in v1 — full flow is a future story. | — |
| Suggested Alternatives logic | Out of scope for v1. | — |
| Multi-machine support (other PDFs) | Out of scope for v1. Architecture supports adding new machines via additional catalog JSON files. | — |

---

## Architecture Notes

### Why static JSON, not a database?

The parts catalog data is read-only and changes only when a new PDF revision ships. A static JSON file on the filesystem served by Express is simpler, faster, and requires no database infrastructure for v1. If the catalog grows beyond one machine or requires admin editing, a database migration is the natural next step.

### Why BC products for price + inventory, not static data?

Price and inventory are managed by the store team and change independently of the parts catalog structure. Keeping them in BC means no custom admin tool is needed — the store team uses the existing BC admin UI.

### Coordinate system

The extracted PDF coordinates use a normalized `[ymin, xmin, ymax, xmax]` space from 0 to 1000 relative to the full source image dimensions. The frontend converts these to percentage-based CSS positions for absolute positioning within the diagram container:

```js
const cx = ((xmin + xmax) / 2) / 10;  // % left
const cy = ((ymin + ymax) / 2) / 10;  // % top
```

This makes callout placement resolution-independent — the same coordinates work at any diagram size.
