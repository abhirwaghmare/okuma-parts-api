# Parts Book — Technical Design

**Version:** 1.0
**Date:** 2026-07-02
**Status:** Implemented (branch: POC_parts_book)
**Store:** tb0nfpch8c (BigCommerce sandbox)

---

## 1. Overview

The Parts Book is an authenticated, interactive parts catalogue that lets logged-in Okuma customers browse exploded assembly diagrams for their registered machine models, identify individual components by callout number, view live BC price and inventory data, and add parts directly to the store cart. The feature spans a Node.js/Express backend (serving as a data-enrichment proxy between the BC CDN, the BC REST API, and the storefront), a Handlebars page template with a three-level cascade navigation, and a jQuery PageManager class that drives the diagram viewer, callout overlay, parts table, and add-to-cart flow. Access is gated to authenticated customers; unauthenticated visitors are redirected to the BC login page.

---

## 2. Architecture

### System diagram

```
                         ┌─────────────────────────────────────┐
                         │         BC CDN (Static Assets)       │
                         │  store-tb0nfpch8c.mybigcommerce.com  │
                         │  /content/parts-book/                │
                         │   toc.json                           │
                         │   {pdfId}/{assembly}/{sheet}/        │
                         │     parts.json                       │
                         │     assembly.png                     │
                         └──────────────┬──────────────────────┘
                                        │ axios GET (server-side)
                         ┌──────────────▼──────────────────────┐
                         │      Express Backend (port 3001)     │
                         │      app/src/index.js                │
                         │                                      │
                         │  GET /api/parts-book/toc             │
                         │  GET /api/parts-book/sheets/…/parts  │
                         │  GET /api/machines                   │
                         │  GET /api/customer/:id/machines      │
                         │                                      │
                         │  ┌──────────────────────────────┐   │
                         │  │  BC REST Management API       │   │
                         │  │  api.bigcommerce.com          │   │
                         │  │  /v3/catalog/categories       │   │
                         │  │  /v3/catalog/products         │   │
                         │  │  /v3/customers/:id/metafields │   │
                         │  └──────────────────────────────┘   │
                         └──────────────┬──────────────────────┘
                                        │
                         (local dev)    │ ngrok tunnel exposes :3001
                         ┌──────────────▼──────────────────────┐
                         │   Stencil Frontend (port 3000)       │
                         │   theme/                             │
                         │                                      │
                         │  home.html — machine cards           │
                         │  parts-book.html — catalogue page    │
                         │  parts-book.js — PageManager class   │
                         └──────────────┬──────────────────────┘
                                        │ stencil start proxies
                         ┌──────────────▼──────────────────────┐
                         │         BC Store (sandbox)           │
                         │   store-tb0nfpch8c.mybigcommerce.com │
                         │   Storefront Cart API, sessions,     │
                         │   customer auth, web pages           │
                         └─────────────────────────────────────┘
```

### Repository layout

| Layer | Location |
|---|---|
| Express backend entry | `app/src/index.js` |
| Parts book route handlers | `app/src/routes/parts-book.js` |
| BC API service client | `app/src/services/bigcommerce.js` |
| Backend config + env | `app/src/config/index.js` |
| Handlebars page template | `theme/templates/pages/custom/page/parts-book.html` |
| PageManager JS | `theme/assets/js/theme/parts-book.js` |
| SCSS component | `theme/assets/scss/components/stencil/partsBook/_partsBook.scss` |
| Homepage machine cards | `theme/templates/pages/home.html` (inline `<script>` at bottom) |

### ngrok bridging (local dev only)

During local development the Express server runs on port 3001 and is not reachable by the BC sandbox storefront. ngrok creates an HTTPS tunnel so the sandbox theme can call the local Express API:

```
ngrok http 3001
# copy the generated https URL, e.g. https://abc123.ngrok.io
# paste it into BC admin → Storefront → Themes → Edit Theme → Okuma section
# → parts_book_api_url = https://abc123.ngrok.io
```

The Stencil frontend injects this value at render time via `{{theme_settings.parts_book_api_url}}`. When the value is empty (Stencil dev on `localhost:3000`), the homepage script falls back to `http://localhost:3001`.

---

## 3. Data Model

### CDN asset tree

All static data assets are uploaded to the BC CDN at:

```
https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book/
```

The CDN base URL is configured via the `PARTS_BOOK_CDN_BASE_URL` environment variable and accessed in code via `config.partsBook.cdnBaseUrl`.

#### `toc.json` — Master table of contents

```json
{
  "documents": [
    {
      "id": "LE15-173-R2",
      "label": "LU300-M",
      "category_id": 306,
      "overview_image": "LE15-173-R2/overview.png",
      "assemblies": [
        {
          "slug": "1-bed-group",
          "label": "1 - Bed Group",
          "overview_image": "LE15-173-R2/1-bed-group/overview.png",
          "sheets": [
            {
              "slug": "sheet-no-1-bed",
              "label": "Sheet No.1 Bed",
              "sheet_number": 1,
              "assembly_image": "LE15-173-R2/1-bed-group/sheet-no-1-bed/assembly.png",
              "parts_json": "LE15-173-R2/1-bed-group/sheet-no-1-bed/parts.json"
            }
          ]
        }
      ]
    }
  ]
}
```

The `id` field is the publication number (e.g. `LE15-173-R2`) and serves as `pdfId` throughout the API. The `category_id` links the document to a BC catalog category, which the backend uses to look up the category image.

All relative image paths in `toc.json` are rewritten to full CDN URLs by the backend before the response is sent to the client (see `rewriteTocImagePaths` in `app/src/routes/parts-book.js`).

#### Per-sheet `parts.json`

Referenced via `sheet.parts_json` in the TOC. One file per diagram sheet.

```json
{
  "parts": [
    {
      "callout_number": 1,
      "sheet_item": "1-001",
      "part_no": "525-0000-01-01",
      "description": "BED",
      "unit_no": "S1000-0525-008A01",
      "qty": 1,
      "callout_box_2d": [201.0, 530.0, 217.0, 536.6],
      "has_table_match": true
    }
  ]
}
```

`callout_box_2d` is `[ymin, xmin, ymax, xmax]` in a 0–1000 normalised coordinate space relative to the diagram image dimensions. The backend converts this to CSS percentage centre coordinates before returning:

```
calloutX = ((xmin + xmax) / 2) / 10   → % from left
calloutY = ((ymin + ymax) / 2) / 10   → % from top
```

Parts with `has_table_match: false` have no matching row in the original PDF parts table and are returned without price or inventory data.

#### BC category structure for machine models

Machine model categories are organised under four parent categories in BC:

| Parent ID | Machine type |
|---|---|
| 301 | Grinding Machines |
| 302 | Turning Centers |
| 303 | Multi-Tasking Machines |
| 304 | Machining Centers |

Child categories (one per machine model) carry the publication number in their description field as plain text matching the pattern `Pub No. {pubNo}` (e.g. `Pub No. LE15-173-R2`). The backend parses this with a regex to surface `pubNo` in API responses.

#### Customer metafield — registered machines

The Express backend reads a BC customer metafield to determine which machines are registered to a logged-in customer:

| Attribute | Value |
|---|---|
| Namespace | `okuma` |
| Key | `registered_machines` |
| Permission | Read via server-side BC API only |
| Value type | JSON string |

Value schema (array):

```json
[
  {
    "serial": "P1234567",
    "model": "LU300-M",
    "install_date": "2024-03-15",
    "status": "Active"
  }
]
```

Machines with `status: "Inactive"` are filtered out before the response is returned. The `model` string is fuzzy-matched against BC category names to enrich each machine entry with `imageUrl`, `pubNo`, `machineType`, and `categoryId` (see Section 6).

---

## 4. API Contracts

All endpoints are defined in `app/src/routes/parts-book.js` and mounted at the Express app root (no path prefix).

### GET /api/parts-book/toc

Returns the master TOC with all image paths rewritten to full CDN URLs and each document enriched with its BC category image.

| Attribute | Value |
|---|---|
| Auth | None (the route itself is public; the BC storefront page enforces customer auth) |
| Query params | None |

**Response (200):**

```json
{
  "documents": [
    {
      "id": "LE15-173-R2",
      "label": "LU300-M",
      "category_id": 306,
      "overview_image": "https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book/LE15-173-R2/overview.png",
      "category_image": "https://cdn11.bigcommerce.com/s-tb0nfpch8c/images/...",
      "assemblies": [
        {
          "slug": "1-bed-group",
          "label": "1 - Bed Group",
          "overview_image": "https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book/...",
          "sheets": [
            {
              "slug": "sheet-no-1-bed",
              "label": "Sheet No.1 Bed",
              "sheet_number": 1,
              "assembly_image": "https://..."
            }
          ]
        }
      ]
    }
  ]
}
```

**Error codes:**

| Code | Condition |
|---|---|
| 500 | `toc.json` not found on CDN or CDN fetch failed |

---

### GET /api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts

Returns all parts for a sheet, enriched with BC price/inventory data and diagram callout coordinates as CSS percentages.

| Attribute | Value |
|---|---|
| Auth | None (enforced at storefront layer) |
| Path params | `pdfId` — publication number (e.g. `LE15-173-R2`); `assemblySlug`; `sheetSlug` |
| Query params | None |

The handler:

1. Fetches `toc.json` to locate the `parts_json` path for the requested sheet
2. Fetches the sheet's `parts.json` from the CDN
3. Collects all `part_no` values where `has_table_match` is true
4. Batch-fetches BC products (`/v3/catalog/products?sku:in=...`) for price, inventory level, and availability
5. Converts `callout_box_2d` coordinates to `calloutX`/`calloutY` percentages
6. Returns the merged result

**Response (200):**

```json
{
  "sheet": {
    "id": "sheet-no-1-bed",
    "label": "Sheet No.1 Bed",
    "sheetNumber": 1,
    "diagramUrl": "https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book/LE15-173-R2/..."
  },
  "parts": [
    {
      "calloutNumber": 1,
      "sheetItem": "1-001",
      "partNo": "525-0000-01-01",
      "description": "BED",
      "unitNo": "S1000-0525-008A01",
      "qty": 1,
      "calloutX": 53.32,
      "calloutY": 20.90,
      "price": 842.00,
      "inStock": true,
      "productId": 12345,
      "hasTableMatch": true
    }
  ]
}
```

Parts with no matching BC product have `price: null`, `inStock: false`, `productId: null`. They appear in the parts table without commerce actions.

**Error codes:**

| Code | Condition |
|---|---|
| 404 | `pdfId`, `assemblySlug`, or `sheetSlug` not found in TOC |
| 500 | `toc.json` or `parts.json` CDN fetch failed |

---

### GET /api/machines

Returns all machine model categories (children of parent IDs 301–304), each enriched with a category image URL and publication number parsed from the BC category description.

| Attribute | Value |
|---|---|
| Auth | None |
| Query params | None |

**Response (200):**

```json
{
  "machines": [
    {
      "categoryId": 306,
      "name": "LU300-M",
      "machineType": "Turning Centers",
      "imageUrl": "https://cdn11.bigcommerce.com/s-tb0nfpch8c/images/...",
      "pubNo": "LE15-173-R2"
    }
  ]
}
```

Used by the homepage machine grid when no customer is logged in (shows all available models rather than registered machines).

**Error codes:**

| Code | Condition |
|---|---|
| 500 | BC category API call failed |

---

### GET /api/customer/:customerId/machines

Returns the registered machines for a specific customer, enriched with BC category images matched by model name.

| Attribute | Value |
|---|---|
| Auth | None at HTTP level — `customerId` must be a positive integer string |
| Path params | `customerId` — BC customer ID (digits only; validated with `/^\d+$/`) |
| Query params | None |

The handler runs two BC API calls in parallel:

- `GET /v3/customers/{customerId}/metafields` — to read the `okuma.registered_machines` metafield
- `GET /v3/catalog/categories?parent_id:in=301,302,303,304` — to build the machine category lookup

Each registered machine entry is matched against the category list using the three-tier fuzzy match algorithm (Section 6) to resolve `imageUrl`, `pubNo`, `machineType`, and `categoryId`.

**Response (200):**

```json
{
  "machines": [
    {
      "serial": "P1234567",
      "model": "LU300-M",
      "installDate": "2024-03-15",
      "status": "Active",
      "imageUrl": "https://cdn11.bigcommerce.com/s-tb0nfpch8c/images/...",
      "pubNo": "LE15-173-R2",
      "machineType": "Turning Centers",
      "categoryId": 306
    }
  ]
}
```

Returns `{ "machines": [] }` (not an error) when:
- The customer has no `registered_machines` metafield
- The metafield value is not valid JSON
- All entries have `status: "Inactive"`

**Error codes:**

| Code | Condition |
|---|---|
| 400 | `customerId` is missing or not a digit-only string |
| 500 | BC API call failed |

---

### GET /api/parts-book/machine/verify

Stub endpoint for serial number verification. Not connected to an external service.

| Attribute | Value |
|---|---|
| Query params | `serialNo` (required) |

**Response (200):**

```json
{
  "verified": true,
  "model": "LU300-M",
  "serialNo": "P1234567",
  "stockCondition": "Active"
}
```

**Error codes:**

| Code | Condition |
|---|---|
| 400 | `serialNo` query parameter missing |

---

## 5. Frontend Components

### Homepage machine cards (`home.html`)

The homepage contains an inline `<script>` block (IIFE) at the bottom of the template that renders the "My Registered Machines" grid section.

**API URL detection.** The Express API URL is resolved in this order:

1. `'{{theme_settings.parts_book_api_url}}'` — the theme setting rendered at page-load time by Handlebars. When this is set to an ngrok URL (sandbox) or a production URL, it is used directly.
2. If the value is empty and `window.location.port === '3000'` (Stencil local dev), the script falls back to `http://{hostname}:3001`.

```js
var API_URL = '{{theme_settings.parts_book_api_url}}'
    || (window.location.port === '3000' ? 'http://' + window.location.hostname + ':3001' : '');
```

**Data source selection.** The `customerId` is injected by Handlebars:

```js
var customerId = {{#if customer}}{{customer.id}}{{else}}0{{/if}};
```

When `customerId` is non-zero the script calls `GET /api/customer/{customerId}/machines` (returns only the customer's registered machines). When zero it calls `GET /api/machines` (returns all available machine models).

**`buildCard(machine)`.** Builds the HTML string for one machine card. Uses `machine.imageUrl` for the photo (or a placeholder div when absent). The "Browse Parts Book" button href is constructed as `/parts-book?machine={pubNo}` when `pubNo` is present; otherwise `/parts-book`.

**`formatDate(iso)`.** Converts an ISO date string to `DD Mon YYYY` format using `Date.toLocaleDateString('en-GB', ...)`. Returns `'Pending Install'` when the value is falsy.

---

### PartsBook PageManager (`parts-book.js`)

Registered in `theme/assets/js/app.js` under the `pages/custom/page/parts-book` and `pages\custom\page\parts-book` keys (both path separators for Windows/Linux compatibility) as a dynamic `import()`.

**State maintained on the instance:**

| Property | Type | Description |
|---|---|---|
| `_apiUrl` | string | Resolved Express API base URL |
| `_toc` | object | Full TOC response from `/api/parts-book/toc` |
| `_currentPdfId` | string or null | Active publication number |
| `_currentAssemblySlug` | string or null | Active assembly slug |
| `_currentSheetSlug` | string or null | Active sheet slug |
| `_currentParts` | array | Parts array for the loaded sheet |
| `_zoomLevel` | number | Current CSS scale factor (0.5–3.0) |
| `_activeCallout` | number or null | Callout number of the selected callout |

**Lifecycle — `onReady()`.**

1. Resolves `_apiUrl` from `this.context.partsBookApiUrl` (injected via `{{inject}}`) with localhost fallback.
2. Calls `_initSelects()` (disables assembly and sheet selects).
3. Calls `_initZoom()` (wires zoom buttons).
4. Calls `_initTooltip()` (wires tooltip close, qty stepper, and add-to-cart in the tooltip).
5. Calls `_loadToc()` (fetches `/api/parts-book/toc`).

**Selection state machine.**

```
[idle]
  → user selects machine  → _onMachineChange(pdfId)
      populates assembly select, resets sheet select and workspace

  → user selects assembly → _onAssemblyChange(pdfId, assemblySlug)
      populates sheet select, shows assembly overview image

  → user selects sheet   → _onSheetChange(pdfId, assemblySlug, sheetSlug)
      workspace enters is-loading state
      fetches /api/parts-book/sheets/{pdfId}/{assemblySlug}/{sheetSlug}/parts
      on success: renders diagram + callouts + parts table, workspace enters is-visible state
      on error: shows .parts-book__workspace-error message
```

**`_populateMachineSelect(documents)`.** Checks for a `?machine=` URL query parameter. When present and matching a document `id`, only that document is added to the machine select and it is automatically selected, triggering `_onMachineChange`. This is the deep-link path used by the homepage "Browse Parts Book" card button.

**`_renderCallouts(parts)`.** Creates absolutely-positioned `div.parts-book__callout` elements for each part that has non-null `calloutX`/`calloutY`. Each callout has `role="button"`, `tabindex="0"`, `aria-label`, and `aria-pressed` attributes. Keyboard activation (Enter or Space) calls `_selectCallout`. Click and keyboard events are bound per element (not delegated) because the layer is rebuilt on each sheet load.

**`_renderPartsTable(parts)`.** Builds `<tr>` elements and appends them to `.parts-book__tbody`. The table header (`.parts-book__thead`) is revealed only when parts are present. Add-to-cart button clicks are handled via event delegation on `.parts-book__table` using the `.pb-table-add-to-cart` selector. Row click (outside the button) calls `_selectCallout`.

**`_selectCallout(calloutNumber, partNo)`.** The bidirectional selection handler. Removes active state from all callouts and rows, then adds active state to the matching callout and row. Scrolls the row into view (respecting `prefers-reduced-motion`). Calls `_showTooltip` for the selected part.

**`_showTooltip(part, calloutEl)`.** Populates and reveals the `.parts-book__tooltip` element. Calls `_positionTooltip` to place the tooltip to the right of the callout element (flips left if viewport clipping would occur, clamps to viewport bottom). Focus is moved to the close button for keyboard accessibility.

**`_addToCart(productId, quantity)`.** Async method. Fetches `/api/storefront/carts` to obtain the current cart ID. If a cart exists, POSTs to `/api/storefront/carts/{cartId}/items`; otherwise POSTs to `/api/storefront/carts` (creates a new cart). On success, triggers the `cart-quantity-update` custom event on `[data-cart-quantity]` to update the header cart count. Shows a polite `aria-live` feedback message.

**Zoom controls.** `_setZoom(level)` clamps the level to `[0.5, 3.0]` and applies `transform: scale(level)` with `transform-origin: top left` to `.parts-book__diagram-inner`.

---

### Page template (`parts-book.html`)

**Auth gate.** The template begins with:

```handlebars
{{#unless customer}}
    <script>window.location.replace('/login.php?returnUrl=' + encodeURIComponent(window.location.pathname));</script>
{{/unless}}
```

This is a client-side redirect. Because the template is rendered server-side by BC, unauthenticated users receive the HTML but the inline script immediately redirects them before the page renders visibly.

**Context injection.** The API URL is injected into the Stencil context object so the PageManager can read it via `this.context.partsBookApiUrl`:

```handlebars
{{inject 'partsBookApiUrl' theme_settings.parts_book_api_url}}
```

**Workspace visibility states.**

| CSS class | Meaning |
|---|---|
| (neither) | Initial state — workspace is `display: none` |
| `.is-loading` | Sheet fetch in progress — `aria-busy="true"` |
| `.is-visible` | Sheet loaded — workspace is `display: block` (single column) or `display: grid` (large breakpoint) |

**Parts table header.** `<thead class="parts-book__thead" hidden>` — the `hidden` attribute is removed by `_renderPartsTable` only when at least one part is present. This prevents a visible empty header row when the workspace first becomes visible at the assembly selection stage.

**Tooltip.** The `.parts-book__tooltip` element is present in the DOM at all times with `hidden` attribute. Shown/hidden by `_showTooltip`/`_hideTooltip`. The "Add to Quote" button (`pb-add-to-quote`) is rendered but has no backend handler (see Section 10).

---

## 6. Machine Matching Algorithm

The `matchCategory(modelName, categories)` function in `app/src/routes/parts-book.js` resolves a free-text machine model name from the customer metafield to a BC category entry. The match is case-insensitive and strips non-alphanumeric characters before comparison.

Both the input `modelName` and each category's `name` are normalised with:

```js
str.toLowerCase().replace(/[^a-z0-9]/g, '')
```

The three tiers are applied in order; the first match wins:

**Tier 1 — Exact normalised match.**
The normalised model name is compared character-for-character against each normalised category name. This handles exact matches including spacing, hyphen, and case differences (e.g. `"LU300-M"` → `"lu300m"` matches a category named `"LU300-M"`).

**Tier 2 — Substring match.**
Checks whether the normalised model name contains the normalised category name, or vice versa. This handles variant suffixes and truncated names (e.g. a registered model of `"LU300-M STANDARD"` would still match the `"LU300-M"` category because the category name is a substring of the model name).

**Tier 3 — Series prefix match.**
Extracts the first contiguous alphabetic token from the original model name using `/^[a-z]+/i` and checks whether any category's normalised name starts with that token. This handles sub-model variants not present in BC (e.g. `"GENOS M460-VE"` matches the `"GENOS M660-V"` category because both start with `"genos"`). This tier is the most permissive and may produce false positives for large machine catalogues; it is designed for the current six-model scope.

Returns `null` if no tier matches.

---

## 7. BC Category to PDF Mapping

The six machine model categories currently configured in the BC sandbox and their corresponding parts book PDFs:

| Cat ID | Machine Model | Pub No (PDF ID) | Category Image |
|--------|--------------|-----------------|----------------|
| 305 | GI-20N | GE15-039-R10 | No |
| 306 | LU300-M | LE15-173-R2 | Yes |
| 307 | LB3000 EX | LE15-221-R1 | Yes |
| 308 | MULTUS B200 | LE15-230-R5 | Yes |
| 309 | MU-400VA | ME15-181-R5 | No |
| 310 | GENOS M660-V | ME15-291-R2 | Yes |

The publication number is stored in each category's description field in BC admin as plain text: `Pub No. {pubNo}`. The backend parses it with `PUB_NO_RE = /Pub\s+No\.\s*([A-Z]{2}\d{2}-\d{3}-[A-Z0-9]+)/i`.

Note: `ME15-230-R1` is an available PDF that has no BC category yet. It must be created as a child of one of the parent categories (301–304) with `Pub No. ME15-230-R1` in its description before it can be surfaced via the API.

---

## 8. Deployment

### Local development

Two processes must run concurrently:

```bash
# Terminal 1 — Stencil dev server (theme hot-reload, BC proxy)
cd theme && stencil start
# Runs on http://localhost:3000

# Terminal 2 — Express backend
cd app && node src/index.js
# Runs on http://localhost:3001
```

Required environment variables in `app/.env`:

```
BC_ACCESS_TOKEN=...
BC_STORE_HASH=tb0nfpch8c
SESSION_SECRET=...
PARTS_BOOK_CDN_BASE_URL=https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book
CORS_ORIGINS=http://localhost:3000
```

All four values are required at startup. The Express process will throw and exit if any are missing.

### Sandbox / ngrok deployment

1. Start the Express backend locally.
2. Run `ngrok http 3001` to obtain an HTTPS tunnel URL.
3. In BC admin, navigate to Storefront → My Themes → Customise → Okuma section and set `parts_book_api_url` to the ngrok URL.
4. Run `cd theme && stencil bundle` to produce a `.zip` archive.
5. Upload the zip to BC admin: Storefront → Themes → Upload a Theme.
6. Apply the theme.

The ngrok URL changes each session unless a reserved domain is configured.

### CORS

The Express server reads allowed origins from the `CORS_ORIGINS` environment variable (comma-separated list). When the variable is not set, it defaults to `['http://localhost:3000', 'http://localhost:3001']`. For a sandbox session the ngrok URL of the Stencil frontend must be included if the storefront is also being served over ngrok.

```
CORS_ORIGINS=http://localhost:3000,https://abc123.ngrok.io
```

### Theme setting

The `parts_book_api_url` theme setting is defined in the theme's `schema.json` under the Okuma settings group. Its type is `text`. An empty value triggers the localhost fallback in `home.html`; the PageManager in `parts-book.js` also falls back to `http://localhost:3001` when `window.location.hostname === 'localhost'`.

---

## 9. Security Considerations

**`BC_ACCESS_TOKEN` isolation.** The BC REST Management API access token (`X-Auth-Token`) is stored exclusively in `app/.env` and used only by the server-side Express process. It is never injected into Handlebars templates or included in any client-facing response. The theme JS communicates only with the local/ngrok Express server and the BC Storefront API (which uses browser session cookies, not the management token).

**Customer metafield access.** The `okuma.registered_machines` metafield is fetched server-side by the Express handler for `GET /api/customer/:customerId/machines`. The browser never directly calls the BC Management API for customer data. The `customerId` path parameter is validated as a digit-only string before use.

**CORS allowlist.** Allowed origins are explicitly enumerated via `CORS_ORIGINS`. Credentials (`credentials: true`) are enabled on the CORS middleware, which means only listed origins receive the `Access-Control-Allow-Credentials: true` header required for cookie-bearing requests.

**Session security.** Express sessions use `httpOnly: true` and `sameSite: 'lax'` cookies. The `secure` flag is set to `true` when `NODE_ENV === 'production'`.

**Gitignored secrets.** `app/.env` and `theme/.stencil` / `theme/config.stencil.json` are gitignored. The `.stencil` file contains the BC store auth token and store URL used by the Stencil CLI. Neither file should ever be committed.

**Input sanitisation.** Callout selector strings are sanitised before use in jQuery attribute selectors to prevent selector injection:

```js
const safeCalloutNo = String(calloutNumber).replace(/["\\]/g, '');
```

---

## 10. Known Gaps and Future Work

| Item | Detail |
|---|---|
| GI-20N category image missing | Cat ID 305 has no image uploaded in BC admin. The `GET /api/machines` and `GET /api/customer/:id/machines` responses return an empty `imageUrl` for this model. The homepage card renders a placeholder div. |
| MU-400VA category image missing | Cat ID 309 has no image uploaded in BC admin. Same behaviour as above. |
| `ME15-230-R1` has no BC category | This PDF is available on the CDN but no corresponding BC category exists. The machine will not appear in API responses until a category is created under one of the parent IDs 301–304 with `Pub No. ME15-230-R1` in its description. |
| Add-to-quote flow is stubbed | The "Add to Quote" button (`pb-add-to-quote`) is present in both the tooltip and implied by the template, but there is no backend handler. Clicking it has no effect. Full implementation requires a quote request endpoint and backend storage. |
| KPI tiles are static placeholders | The "Open Orders" and "Open Quotes" tiles on the homepage render `—` and are not populated by any API call. The "Registered Machines" tile is populated from the machine grid API call. |
| Recent orders table is static | The recent orders table on the homepage contains hardcoded sample rows. There is no live BC orders API call. |
| Machine verification is a stub | `GET /api/parts-book/machine/verify` always returns `verified: true` with a hardcoded model. The verified badge and serial number in the parts book page header are not populated by any live call. |
| No server-side auth enforcement on API routes | The Express routes do not verify a BC session or customer identity. The `customerId` in `GET /api/customer/:customerId/machines` is supplied by the browser and not independently verified against a session. This is acceptable for a sandbox POC but must be addressed before production deployment. |
