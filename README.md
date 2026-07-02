# Okuma BC

BigCommerce custom storefront for Okuma — Stencil theme and Node.js/Express backend for the Okuma Parts Portal, including an interactive Parts Book catalogue.

## Repository Structure

```
Okuma-BC/
├── app/      # Node.js/Express backend (BC REST API integration)
└── docs/     # Technical design documents
```

---

## Prerequisites

- Node.js >= 18.x (currently v20.16.0)
- npm >= 9.x
- git
- A BigCommerce sandbox or dev store ([devtools.bigcommerce.com](https://devtools.bigcommerce.com))
- ngrok (for sandbox testing): `npm install -g ngrok`

---

## app/ — Node.js/Express Backend

Express server on port **3001** providing Parts Book API endpoints. Fetches data from the BC CDN and BC Management API server-side; never exposes `BC_ACCESS_TOKEN` to the browser.

### Setup

```bash
cd app
npm install
# Create app/.env — see environment variables below
```

### Start

```bash
node src/index.js
# Runs at http://localhost:3001
```

### Environment variables (`app/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `BC_ACCESS_TOKEN` | Yes | Store REST Management API access token |
| `BC_STORE_HASH` | Yes | Store hash (e.g. `tb0nfpch8c`) |
| `SESSION_SECRET` | Yes | Express session secret |
| `PARTS_BOOK_CDN_BASE_URL` | Yes | BC CDN base URL for parts book assets (e.g. `https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book`) |
| `BC_CLIENT_ID` | No | BC app client ID (OAuth flows) |
| `BC_CLIENT_SECRET` | No | BC app client secret |
| `BC_APP_CALLBACK_URL` | No | OAuth callback URL (use ngrok locally) |
| `PORT` | No | Server port (default: `3001`) |
| `CORS_ORIGINS` | No | Comma-separated allowed CORS origins. Defaults to `http://localhost:3000,http://localhost:3001` |
| `BC_WEBDAV_USER` | No | WebDAV username for CDN asset uploads |
| `BC_WEBDAV_PASS` | No | WebDAV password |

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |
| `GET` | `/api/parts-book/toc` | Full TOC of all machine PDFs with assemblies, sheets, and category images |
| `GET` | `/api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts` | Parts list and diagram URL for a specific sheet |
| `GET` | `/api/machines` | All BC machine model categories with `imageUrl` and `pubNo` (unauthenticated) |
| `GET` | `/api/customer/:customerId/machines` | Registered machines for a customer enriched with category image |
| `GET` | `/api/parts-book/machine/verify` | Machine verification stub |

---

## Parts Book — BC CDN Assets

Assets are hosted on the BigCommerce WebDAV CDN. Base URL:

```
https://store-tb0nfpch8c.mybigcommerce.com/content/parts-book/
```

| Asset | URL pattern |
|-------|------------|
| Table of contents | `.../toc.json` |
| Assembly overview image | `.../{pubNo}/overview.png` |
| Sheet diagram | `.../{pubNo}/{assemblySlug}/{sheetSlug}.png` |
| Parts data | `.../{pubNo}/{assemblySlug}/{sheetSlug}/parts.json` |

### Machine model to PDF mapping

| BC Category ID | Machine Model | Pub No (PDF ID) | Category Image |
|----------------|--------------|-----------------|----------------|
| 305 | GI-20N | GE15-039-R10 | Not uploaded |
| 306 | LU300 | LE15-173-R2 | Yes |
| 307 | LB3000 EX | LE15-221-R1 | Yes |
| 308 | MULTUS B200 | LE15-230-R5 | Yes |
| 309 | MU-400VA | ME15-181-R5 | Not uploaded |
| 310 | GENOS M660-V | ME15-291-R2 | Yes |

---

## Sandbox / ngrok Deployment

The Express backend runs locally and must be exposed over HTTPS for the BC sandbox storefront to reach it.

1. Start the Express server: `node src/index.js` (port 3001)
2. In a separate terminal: `ngrok http 3001` — copy the HTTPS URL
3. In BC admin → Storefront → My Themes → Customise → **Okuma** section → set `Parts Book API URL` to the ngrok URL
4. Update `CORS_ORIGINS` in `app/.env` to include the BC store domain, then restart Express

---

## Git Workflow

```
main            — stable, deployable
POC_parts_book  — parts book feature branch
feature/*       — feature branches off main
```

Commit format: `type(scope): description`
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/parts-book-technical-design.md`](docs/parts-book-technical-design.md) | Full technical design — architecture, API contracts, data model, deployment, security |

---

## Secrets

Never commit:
- `app/.env`

This is covered by the `.gitignore` in `app/`.
