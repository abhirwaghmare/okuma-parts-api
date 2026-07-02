# Okuma BC

BigCommerce custom storefront for Okuma — monorepo containing the Stencil theme and Node.js backend.

## Repository Structure

```
Okuma-BC/
├── theme/    # BigCommerce Stencil theme (Cornerstone/Apex fork)
└── app/      # Node.js/Express backend (BC REST API integration)
```

---

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- git
- A BigCommerce sandbox or dev store ([devtools.bigcommerce.com](https://devtools.bigcommerce.com))
- Stencil CLI: `npm install -g @bigcommerce/stencil-cli`
- ngrok (for local webhook/callback testing): `npm install -g ngrok`

---

## theme/ — Stencil Theme

Handlebars-based storefront theme built on the Apex/Cornerstone base.

### Setup

```bash
cd theme
npm install
```

### Connect to store

```bash
stencil init
# Enter your store URL and API access token when prompted
# This writes .stencil — never commit it
```

### Local development

```bash
stencil start
# Runs at http://localhost:3000
```

### Production build

```bash
stencil bundle
# Outputs a .zip — upload via store admin or BC API
```

### Key folders

| Path | Purpose |
|------|---------|
| `templates/pages/` | Full page Handlebars templates |
| `templates/components/` | Reusable partials |
| `assets/js/theme/` | Custom JS (PageManager pattern) |
| `assets/scss/` | Sass stylesheets |
| `lang/` | i18n JSON files |
| `config.json` | Theme settings schema |

---

## app/ — Node.js/Express Backend

Express app for BC REST API integrations, webhook handling, and OAuth flows.

### Setup

```bash
cd app
npm install
cp .env.example .env
# Fill in your credentials in .env
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `BC_CLIENT_ID` | BC app client ID |
| `BC_CLIENT_SECRET` | BC app client secret |
| `BC_ACCESS_TOKEN` | Store API access token |
| `BC_STORE_HASH` | Store hash (e.g. `tb0nfpch8c`) |
| `BC_APP_CALLBACK_URL` | OAuth callback URL (use ngrok locally) |
| `SESSION_SECRET` | Express session secret |
| `PORT` | Port to run the server on (default: `3000`) |

### Local development

```bash
# Start the Express server
npm run dev

# In a separate terminal — expose a public URL for webhooks/callbacks
ngrok http 3000
# Copy the https URL into BC_APP_CALLBACK_URL in .env
```

### Available endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | Fetch products from BC V3 API |
| GET | `/auth/callback` | OAuth callback (stub — implement as needed) |

### Register a webhook

```js
// In src/services/bigcommerce.js
bcClient.post('/v3/hooks', {
  scope: 'store/order/statusUpdated',
  destination: 'https://your-ngrok-url/webhooks/order',
  is_active: true,
});
```

---

## Git Workflow

```
master          — stable, deployable
theme           — Stencil theme work (mirrors master theme/ content)
feature/*       — feature branches off master
```

Commit format: `type(scope): description`
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## Secrets

Never commit:
- `theme/.stencil`
- `theme/config.stencil.json`
- `theme/secrets.stencil.json`
- `app/.env`

These are all covered by `.gitignore` files at root and in `app/`.
