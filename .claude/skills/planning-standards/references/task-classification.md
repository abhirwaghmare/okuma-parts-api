# Task Classification

## Task Type Classification

Before delegating research, analyze user request to identify primary scenario (use first match):

- **Catalyst Page / Component (RSC)**: New or modified Next.js App Router route (`page.tsx`, `layout.tsx`), RSC + child client components, GraphQL fragments co-located with the route under `_components/` and `_actions/`.
- **GraphQL Storefront Query**: New or modified query/mutation against the BigCommerce GraphQL Storefront API — `site.product`, `site.cart`, `customer`, etc. — using `gql.tada` with fragments.
- **REST Management Integration**: Server-only call to `api.bigcommerce.com/stores/{hash}/v3/...` via `X-Auth-Token`. Lives in a route handler or server action. Examples: order sync, catalog automation, customer group changes.
- **Webhook Handler**: `app/api/webhooks/.../route.ts` consuming a BC webhook scope (`store/product/*`, `store/order/*`, etc.). Signature verification, idempotency, tag invalidation.
- **Makeswift Component**: Visual-editor-friendly component registered with `runtime.registerComponent`, exposing typed controls for marketers. May embed BC product data.
- **Customer Auth Flow**: Sign-in/up, password reset, JWT SSO redirect, session handling with Auth.js, customer impersonation token mint.
- **B2B Configuration**: B2B Edition features — companies, buyer roles, quote / RFQ, sales rep impersonation, shopping lists, PO terms.
- **Configuration / Infrastructure**: Env vars, channel setup, sites and routes (`/v3/sites`), webhook subscriptions, deploy config (Vercel/Netlify), feature flags.

This classification guides research scope, file impact list, and handoff routing.

## Complexity Signals

### Auto-Detect Complexity (T-Shirt Sizing)

Analyze request and research findings to estimate complexity:

**Small (S) - 1-2 days**:
- Single file type (one RSC OR one server action, not both)
- Single GraphQL query change reusing existing fragments
- Reuses established project patterns
- No external integrations beyond the BC client already wired
- No new env vars or BC config

**Medium (M) - 3-5 days**:
- Multi-layer change: RSC + child client components + server action + new GraphQL fragment
- New Catalyst route under an existing route group
- One REST Management integration (new endpoint, existing scope)
- New webhook subscription with simple tag invalidation
- Moderate Makeswift component (3-5 controls, single data shape)
- New env var and one BC dashboard change

**Large (L) - 1-2 weeks**:
- Cross-cutting concern (touches multiple routes, layouts, and services)
- New BC channel setup with sites + routes + custom domain
- New B2B workflow (quote → order conversion, sales rep impersonation)
- Complex Makeswift component with custom controls and live BC data binding
- Headless checkout (Checkout REST API) instead of hosted/embedded
- New caching strategy across multiple tags with webhook re-mapping
- First implementation of an architectural pattern in this project (auth provider, monitoring, multi-storefront)

**Complexity Signals to Watch**:
| Signal | Adds Complexity |
|--------|-----------------|
| "real-time" or "live inventory" | +M → L |
| "drag and drop" or visual editor | +S → M |
| "customer groups" or "B2B" | +S → M |
| "multiple channels" or "multi-storefront" | +S → M |
| "external API" without existing client | +M → L |
| "checkout customisation" | +M → L (especially full headless checkout) |
| "data sync" or "ERP integration" | +M → L |
| "JWT SSO" or "identity federation" | +M → L |
| First implementation of pattern | +1 size |
| Touches both Storefront GraphQL and REST Management | +1 size |

**Output**: Include complexity estimate (S/M/L) with rationale in plan summary.
