# Environment Configuration

Catalyst environment variables for local, preview, and production.

## Required `.env.local`

```bash
# Identity
BIGCOMMERCE_STORE_HASH=abcd1234
BIGCOMMERCE_CHANNEL_ID=1

# Storefront API tokens
BIGCOMMERCE_STOREFRONT_TOKEN=eyJ...                  # server-side
BIGCOMMERCE_STOREFRONT_UNAUTHENTICATED_TOKEN=eyJ...  # public-safe

# Optional: REST Management (server-only)
BIGCOMMERCE_ACCESS_TOKEN=...
BIGCOMMERCE_CLIENT_ID=...
BIGCOMMERCE_CLIENT_SECRET=...

# Auth.js / NextAuth
AUTH_SECRET=$(openssl rand -hex 32)

# Catalyst behaviour
ENABLE_ADMIN_ROUTE=false           # production: false
DEFAULT_REVALIDATE_TARGET=3600     # seconds — Data Cache revalidation default

# Build / Turbo
TURBO_REMOTE_CACHE_SIGNATURE_KEY=  # signed Turborepo cache (optional)

# OpenTelemetry
OTEL_SERVICE_NAME=next-app
NEXT_OTEL_VERBOSE=
NEXT_OTEL_FETCH_DISABLED=
```

## Channels per environment

A common multi-environment matrix:

| Env | Channel ID | Store hash | Storefront token |
| --- | --- | --- | --- |
| Local | 1 | dev hash | dev token (CORS = `*` allowed only on local) |
| Preview | 2 (preview channel) | shared dev hash | preview token |
| Staging | 3 | staging hash | staging token |
| Production | 100 (production channel) | prod hash | prod token, server-only |

Notes:
- The channel ID must match a channel created via the BC control panel (Channel Manager) or `POST /v3/channels`.
- Sites and routes (`/v3/sites`, `/v3/sites/{site_id}/routes`) link a channel to the public origin used by the storefront — required for canonical URLs.

## Multi-storefront

If you serve multiple channels from one Next.js deployment (locale, brand, region), resolve channel ID per request and override on the client:

```ts
// middleware.ts or beforeRequest hook
const locale = req.headers.get('x-locale');
const channelId = LOCALE_TO_CHANNEL[locale] ?? DEFAULT_CHANNEL_ID;
```

Each channel may have its own:
- Currency, language, tax zone
- Product catalogue assignments
- Cart cookie isolation

## Where each env var lives

| Var | Browser bundle? | Notes |
| --- | --- | --- |
| `BIGCOMMERCE_STORE_HASH` | safe to read on server; treat as private elsewhere | Identifier, low risk but no need to expose |
| `BIGCOMMERCE_STOREFRONT_TOKEN` | NEVER | JWT, server-only |
| `BIGCOMMERCE_STOREFRONT_UNAUTHENTICATED_TOKEN` | OK if CORS-locked | Use only for client-side anonymous reads |
| `BIGCOMMERCE_ACCESS_TOKEN` (REST) | NEVER | Server only |
| `AUTH_SECRET` | NEVER | NextAuth signing key |
| `DEFAULT_REVALIDATE_TARGET` | OK | Numeric tuning only |

Prefix with `NEXT_PUBLIC_` only if intentional. Default to no prefix.

## Vercel / Netlify / Cloudflare Pages

- Set the same vars in the deploy provider dashboard.
- `BIGCOMMERCE_STORE_HASH` and `BIGCOMMERCE_CHANNEL_ID` are typically per-environment.
- For preview deployments, use a dedicated preview channel so live shopper data is never affected.

## Local dev gotchas

- After editing `.env.local`, restart `pnpm dev` — Next.js does not hot-reload env vars.
- `pnpm generate` reads `.env.local` directly. Re-run it whenever you switch channel/store hash.
- `ENABLE_ADMIN_ROUTE=true` only in local — exposes `/admin` redirect to BC control panel.
