# BigCommerce Intelligence (Catalyst)

Research, checklists, and edge cases for planning BigCommerce work on Catalyst storefronts.

## Research sources (priority order)

1. Project codebase — existing query/route/component patterns are the contract.
2. `bigcommerce-standards` skill references (`references/core`, `catalog`, `cart-and-checkout`, `customer`, `extensions`, `frontend`, `testing`).
3. `developer.bigcommerce.com/docs/storefront/catalyst` — Catalyst guides and recipes.
4. `developer.bigcommerce.com/docs/storefront/graphql` — Storefront GraphQL reference (root queries, mutations, types).
5. `developer.bigcommerce.com/docs/rest-management` — REST Management endpoints.
6. `developer.bigcommerce.com/docs/storefront/b2b-edition` — B2B Edition reference.
7. `github.com/bigcommerce/catalyst` (canary branch) — source-of-truth Catalyst patterns.
8. `bigcommerce.dev` community examples.

When in doubt, check the live Catalyst repo. Marketing-doc patterns sometimes lag the canary source.

## Task-specific intelligence

### Catalyst Page / Component (RSC)

Checklist:
- Is the route covered by `[locale]/(default)/[...rest]` (route resolver) or does it need a new file?
- RSC vs client boundary: data fetch lives in RSC, only interactivity in client child.
- Cache strategy: revalidate target + tag map.
- Streaming: where does `<Suspense>` go for slow data?
- Metadata: `generateMetadata` returning SEO from `site.product.seo`.
- Loading and error UI files present.
- i18n: `next-intl` `getTranslations()` if user-facing copy.
- Accessibility: keyboard navigation, ARIA labels, contrast ratios.

### GraphQL Storefront Query

Checklist:
- Is the query channel-scoped? (Implicitly yes via `client`.)
- Does it need `customerAccessToken`? If yes → `cache: 'no-store'`.
- Currency variable passed explicitly?
- Pricing fragment reused (no inline price duplication)?
- Pagination via cursor (`first`/`after`), not page numbers?
- Selection set is minimal — every requested field consumed in UI?
- Fragment masking honoured (`FragmentOf<T>` via `readFragment`)?
- Errors handled (`response.errors` not just `response.data`)?

### REST Management Integration

Checklist:
- Endpoint version (`/v3/` preferred over `/v2/` when available)?
- Scope on the API account matches the endpoint?
- Server-only (route handler or server action)?
- `X-Auth-Token` from `process.env.BIGCOMMERCE_ACCESS_TOKEN`, never client-exposed?
- Rate-limit awareness — read `X-Rate-Limit-Requests-Left`, back off on 429?
- Pagination via `?page` and `?limit` (REST uses page-based, not cursor)?
- Response shape (`{ data, meta }`) destructured correctly?

### Webhook Handler

Checklist:
- Signature verification with `crypto.timingSafeEqual`?
- Idempotency via `payload.hash` (Redis or DB with 24h TTL)?
- 2xx response within 5s, heavy work queued?
- Tag invalidation map covers the scope?
- Retries handled (BC retries 3x; ensure side effects are idempotent)?
- Webhook secret stored in env (`BIGCOMMERCE_WEBHOOK_SECRET`)?
- `runtime = 'nodejs'` set (need `node:crypto`)?
- `dynamic = 'force-dynamic'` set (no caching)?

### Makeswift Component

Checklist:
- Component registered via `runtime.registerComponent` in side-effect file?
- Props match Makeswift controls (`TextInput`, `Image`, `Style`, `Number`, custom)?
- Server vs client component decision documented?
- Draft mode tested (`?x-makeswift-draft-mode=`)?
- Publish webhook revalidates the right path/tag?
- API key (`MAKESWIFT_SITE_API_KEY`) server-only?

### Customer Auth Flow

Checklist:
- Storefront uses Auth.js (NextAuth v5)? `AUTH_SECRET` set?
- Customer impersonation token minted server-side via Customer Login API?
- Token attached to `client.fetch` as `customerAccessToken`?
- Customer-scoped queries marked `cache: 'no-store'`?
- JWT SSO (if used): signed with `client_secret`, `expiresIn: '30s'`, includes `store_hash`, `channel_id`?
- reCAPTCHA on registration?
- Session cookie HttpOnly, Secure, SameSite=Lax?

### B2B Configuration

Checklist:
- B2B Edition enabled on the channel?
- B2B token minted per-customer (cached briefly)?
- Role-aware UI (admin, senior buyer, junior buyer)?
- Quote workflow (`createQuote`, `quoteCheckout`) implemented end-to-end?
- Sales rep impersonation surfaces a persistent "Shopping as ..." banner?
- Spend limits enforced server-side via B2B policies?

## Edge cases

- **Channel scoping**: every Storefront API request is channel-scoped. Switching channels (multi-storefront) requires `beforeRequest` override + cookie scoping per channel.
- **Customer impersonation token TTL**: short-lived (JWT often 24h max; treat as much shorter). Re-mint on session refresh, never persist in client.
- **Embedded vs hosted checkout**: hosted is default; embedded requires SDK + channel feature + CORS allowlist. Custom (checkout REST API) is rare and expensive — justify with explicit requirement.
- **Catalyst monorepo**: pnpm + Turborepo + `core/` package. Don't edit generated `__generated__/` files. Run `pnpm generate` after schema-affecting changes.
- **Channel-aware redirects**: `site.route(path:)` returns `redirect.toUrl` for changed slugs — always render redirects, never assume static paths.
- **Pricing display vs computed**: `prices.price.value` is the resolved price; `basePrice` is pre-discount. Don't recompute discounts client-side.
- **Cart cookie isolation**: `cartId` is per-channel. Don't cross-channel carry-over.
- **Rate limits**: Storefront API has per-IP rate limits (high but real); REST Management is per-store quota. Plan bulk operations with queues.

## Performance tips

- Use `react.cache` to dedupe RSC fetches in one render.
- Tag every fetch — surgical invalidation is the difference between fast and broken caches.
- Stream slow content with `<Suspense>` instead of blocking the shell.
- For PLPs, prefetch the next page on scroll/hover via `router.prefetch`.
- Avoid client-side data fetching for product/cart — always RSC or server action.
- Image: use `next/image` with `urlTemplate(lossy: true)` and explicit width/height.
