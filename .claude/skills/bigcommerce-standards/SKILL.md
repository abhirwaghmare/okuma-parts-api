---
name: bigcommerce-standards
description: Supplementary BigCommerce (Catalyst) platform reference for storefront development with Next.js App Router, GraphQL Storefront API, REST Management API, B2B Edition, Makeswift visual editing, webhooks, and testing. Load this skill with a concrete BigCommerce/Catalyst question after checking project code standards and Input-Derived Patterns first.
---

# BigCommerce (Catalyst) Standards

Supplementary BigCommerce platform knowledge for Catalyst storefronts (Next.js 14+/16+ App Router, React Server Components, TypeScript, `gql.tada`). Platform-level patterns only. Load with a concrete question — not as background context. All reference files use `.md` format.

## Priority Order

1. Project code standards — follow them when they define how the project organises routes, queries, components, server actions, tests
2. Input-Derived Patterns — class names, structure, design tokens from Storybook/Figma/designs override these references
3. These references — load only for platform knowledge gaps where 1 and 2 provide no guidance

If project code standards show `[Run /initialize-setup to populate]`, warn the invoking agent and proceed with references as fallback.

## When to Load

- A concrete Catalyst route, RSC, server action, GraphQL query, REST integration, webhook handler, Makeswift component, customer/auth, or B2B question
- Narrow broad requests to the specific area before loading references

## When Not to Load

- Project code standards already answer the question
- Input-Derived Patterns define the implementation shape
- General project conventions or framework questions — use `framework-guidance` instead

---

## Quick Lookup

| If you need... | Load... |
| --- | --- |
| Storefront GraphQL client setup (`createClient`, tokens, channel) | `core/graphql-storefront-client-setup.md` |
| REST Management API call (server-only) | `core/rest-management-api.md` |
| Typed GraphQL queries with `gql.tada` | `core/gql-tada-and-codegen.md` |
| Catalyst env vars / multi-channel | `core/environment-configuration.md` |
| Product detail page / variants / options | `catalog/products-and-variants.md` |
| Category tree / brand pages / breadcrumbs | `catalog/categories-and-brands.md` |
| Customer-group pricing / sale logic | `catalog/pricing-and-customer-groups.md` |
| Search / facets / pagination | `catalog/search-and-faceting.md` |
| Cart query / add/update/delete line items | `cart-and-checkout/cart-lifecycle.md` |
| Checkout redirect / order confirmation | `cart-and-checkout/checkout-and-orders.md` |
| Coupons / automatic promotions / gift certificates | `cart-and-checkout/promotions-and-coupons.md` |
| Customer login / account / addresses | `customer/customer-auth-and-account.md` |
| B2B Edition (companies, quotes, RFQ) | `customer/b2b-companies-and-buyers.md` |
| Server actions / route.ts handlers | `extensions/catalyst-server-actions-and-routes.md` |
| Webhooks / event bridge / signature verify | `extensions/webhooks-and-event-bridge.md` |
| Page Builder widgets / Scripts API | `extensions/bigcommerce-functions-and-scripts.md` |
| RSC vs client component decisions | `frontend/catalyst-rsc-patterns.md` |
| Makeswift visual editing integration | `frontend/makeswift-integration.md` |
| Next.js cache, revalidation, tags | `frontend/caching-and-revalidation.md` |
| Vitest + React Testing Library + MSW | `testing/vitest-rtl-tests.md` |
| Playwright E2E (cart, checkout, B2B) | `testing/playwright-e2e.md` |

---

## Reference Library (7 domains, 21 files)

Load only what the current task needs.

### Core — `references/core/`
- `graphql-storefront-client-setup` — `@bigcommerce/catalyst-client` `createClient`, storefront token, channel ID, customer impersonation token, env vars
- `rest-management-api` — when to use REST vs GraphQL, `X-Auth-Token`, store-level vs channel-level scopes, base URL `api.bigcommerce.com/stores/{store_hash}`
- `gql-tada-and-codegen` — typed GraphQL with `gql.tada`, fragment masking with `FragmentOf<T>`, `VariablesOf<T>`, codegen via `pnpm generate`
- `environment-configuration` — Catalyst `.env.local`, channels per environment, multi-storefront, OTel and revalidate settings

### Catalog — `references/catalog/`
- `products-and-variants` — `site.product(entityId:|path:)`, `site.products(entityIds:)`, `variants`, `productOptions`, modifiers, custom fields, MPN/SKU
- `categories-and-brands` — `site.categoryTree`, `site.category(entityId:)`, `site.brand`, breadcrumbs, hierarchical fetch
- `pricing-and-customer-groups` — `prices(currencyCode:)`, customer-group-aware pricing, sale price logic, price range
- `search-and-faceting` — `site.search.searchProducts`, facets, sorting, pagination via `first`/`after`

### Cart & Checkout — `references/cart-and-checkout/`
- `cart-lifecycle` — `cart` query, `cart.addCartLineItems`, `cart.updateCartLineItem`, `cart.deleteCartLineItem`, cookie `cartId`, anonymous → logged-in merge
- `checkout-and-orders` — Catalyst checkout, `cart.createCartRedirectUrls`, `checkout.orderConfirmation`, Embedded Checkout option, hosted checkout vs custom
- `promotions-and-coupons` — `cart.applyCheckoutCoupon`, `cart.unapplyCheckoutCoupon`, automatic promotions, gift certificates

### Customer — `references/customer/`
- `customer-auth-and-account` — Customer Login API, JWT SSO redirect, `customer { entityId firstName ... }`, addresses, orders, customer impersonation token usage
- `b2b-companies-and-buyers` — B2B Edition GraphQL: company, buyer roles, quote / RFQ workflow, sales rep impersonation, ShopperContextProvider

### Extensions — `references/extensions/`
- `catalyst-server-actions-and-routes` — `'use server'` actions, `app/api/.../route.ts`, edge vs node runtime, form actions
- `webhooks-and-event-bridge` — BC webhooks for `store/order/*`, `store/cart/*`, `store/product/*`, signature verification, retries, idempotency
- `bigcommerce-functions-and-scripts` — Scripts API, Page Builder widgets, Big Open Data Layer events

### Frontend — `references/frontend/`
- `catalyst-rsc-patterns` — RSC vs `'use client'`, where data fetching lives, `<Suspense>` boundaries, parallel data loading
- `makeswift-integration` — `MakeswiftComponent`, `runtime.registerComponent`, draft mode via `?x-makeswift-draft-mode=`, visual editing patterns
- `caching-and-revalidation` — Next.js `fetch` cache, `revalidate`, tag-based revalidation, `unstable_cache`, `revalidateTag`

### Testing — `references/testing/`
- `vitest-rtl-tests` — component tests, RSC testing limits, MSW for GraphQL mocking
- `playwright-e2e` — cart flow, checkout, B2B flows, embedded checkout stub

## Progressive Disclosure Examples

**Build a PDP** → Load: `frontend/catalyst-rsc-patterns.md`, `catalog/products-and-variants.md`, `catalog/pricing-and-customer-groups.md`, `core/gql-tada-and-codegen.md`
**Add cart action** → Load: `cart-and-checkout/cart-lifecycle.md`, `extensions/catalyst-server-actions-and-routes.md`
**Integrate a webhook** → Load: `extensions/webhooks-and-event-bridge.md`, `core/rest-management-api.md`
**Set up Customer login** → Load: `customer/customer-auth-and-account.md`, `core/graphql-storefront-client-setup.md`
**Add B2B quote flow** → Load: `customer/b2b-companies-and-buyers.md`, `customer/customer-auth-and-account.md`
**Add Makeswift section** → Load: `frontend/makeswift-integration.md`, `frontend/catalyst-rsc-patterns.md`
**Tune cache strategy** → Load: `frontend/caching-and-revalidation.md`
**Write component tests** → Load: `testing/vitest-rtl-tests.md`
**Write E2E checkout test** → Load: `testing/playwright-e2e.md`
