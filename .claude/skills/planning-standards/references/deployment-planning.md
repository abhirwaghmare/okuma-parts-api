# Deployment Planning (Catalyst)

Planning guidance for deploying Catalyst storefronts to Vercel, Netlify, or Cloudflare Pages, and for mapping deployments to BC channels.

## Host selection

| Host | Strengths | Trade-offs |
| --- | --- | --- |
| Vercel | First-class Next.js support, edge runtime, ISR, route handlers, Image CDN | Cost at scale; lock-in to `next/` runtimes |
| Netlify | Strong Next.js Runtime, edge functions, atomic deploys | Some Next.js features lag Vercel by a release or two |
| Cloudflare Pages | Edge-first, low latency, free tier generous | Compatibility caveats with full Next.js; verify features used (`unstable_cache`, ISR) |
| Self-hosted (Node/Docker) | Full control, no vendor lock-in | You own infra, scaling, edge cache |

Default to **Vercel** for green-field Catalyst projects unless cost, regulatory, or platform constraints rule it out.

## Environment matrix

| Environment | Vercel branch | BC channel | Store hash | Notes |
| --- | --- | --- | --- | --- |
| Local | n/a | Dev channel | Dev hash | `.env.local` only |
| Preview (per PR) | `feature/*` | Preview channel | Shared dev hash | `BIGCOMMERCE_STORE_HASH` and `BIGCOMMERCE_CHANNEL_ID` set on Vercel preview |
| Staging | `release/*` | Staging channel | Staging hash | Mirror of production data; smoke E2E |
| Production | `main` | Production channel | Prod hash | Long-lived; protected; cache tags on |

Each environment owns:
- Its own `BIGCOMMERCE_*` env vars.
- Its own `MAKESWIFT_SITE_API_KEY` (preview vs production sites).
- Its own webhook URLs registered in BC.

## Pre-deploy checklist

- `pnpm build` passes locally and in CI.
- `pnpm generate` was run after any schema-affecting change.
- All env vars present in Vercel dashboard for target environment.
- Webhook URLs registered in BC for the right scope.
- Sites + Routes configured under `/v3/sites` so canonical URLs resolve.
- Customer impersonation token mint path tested (`/v3/customer/current/customers/{id}/jwt`).
- Custom domain DNS configured (Cloudflare → Vercel CNAME, or BC channel's custom domain).
- Edge runtime functions audited — none calling `node:crypto` HMAC.
- Cache strategy reviewed — no `force-cache` on customer/cart queries.

## Custom domain options

| Option | When |
| --- | --- |
| Domain managed by BC channel | Use when checkout is hosted on BC and you want a unified domain |
| Domain managed by host (Vercel) | Standard headless setup; storefront origin is Vercel; checkout redirects to BC subdomain |
| Domain at Cloudflare with proxy to Vercel | Custom WAF, geo routing, advanced redirects |

When the storefront lives on the brand's domain and checkout on `*.mybigcommerce.com`, plan the customer-experience handoff carefully (cart context, session continuity, brand consistency).

## B2B Edition enablement

- B2B Edition is per-channel.
- Enable in BC control panel; receive separate B2B API credentials.
- Add `B2B_API_TOKEN`, `B2B_EDITION_ENABLED=true` to the target environment's env vars.
- Verify the B2B catch-all redirect for buyer portal entry points.

## Preview deployments

- Each PR gets a Vercel preview URL.
- Use a dedicated **preview BC channel** so shopper test data does not pollute production.
- Set Makeswift to preview mode (separate site API key).
- Webhook deliveries: register the preview URL only if the PR explicitly tests webhook flows; otherwise skip.

## Cache tag deployment

- On first deploy of a fresh tag map, expect a cold cache. Warm with a sitemap crawl or a smoke-test script.
- Confirm `revalidateTag` works in production by triggering a known webhook (e.g., a non-customer-facing product field change) and observing the storefront update.

## Rollback strategy

- Vercel: instant rollback via the deployment dashboard. Always retain the previous successful deployment.
- BC schema changes (rare, additive): no rollback needed; the storefront tolerates extra fields.
- Catalog data changes: roll back via BC control panel; the storefront picks up the change on cache invalidation.

## Observability

- OpenTelemetry hooks (`OTEL_SERVICE_NAME`, `NEXT_OTEL_VERBOSE`).
- Vercel Web Analytics or Datadog RUM for shopper experience.
- Log forwarder for route handlers (webhooks, REST proxies).
- Alert on:
  - Webhook 4xx/5xx rates > 1%.
  - Cart mutation latency p95 > 1.5s.
  - Storefront API error rate > 0.5% per minute.

## Anti-patterns

- Sharing a single channel across all environments — production traffic and test traffic collide.
- Forgetting to register webhook URL per environment — staging changes never invalidate production cache (good) but also never fire to staging (bad).
- Hard-coding BC origin in the storefront — moving channels breaks links.
- Skipping smoke E2E on preview — preview is the cheapest place to catch a checkout regression.
