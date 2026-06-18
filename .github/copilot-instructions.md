# GitHub Copilot Instructions — BigCommerce (Catalyst)

This repository uses the Apex agentic framework adapted for BigCommerce headless storefronts on Catalyst (Next.js App Router, React Server Components, TypeScript, `gql.tada`). Copilot, follow these instructions whenever you produce code or suggestions for this codebase.

## Stack at a glance

- **Storefront**: BigCommerce Catalyst (Next.js App Router + React Server Components + TypeScript)
- **GraphQL client**: `@bigcommerce/catalyst-client` with typed operations via `gql.tada`
- **APIs**: GraphQL Storefront API (primary), REST Management API (server-only admin), B2B Edition GraphQL API
- **Visual editor**: Makeswift (where enabled)
- **Auth**: Auth.js v5 + BigCommerce Customer Login API; JWT-redirect SSO supported
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library + MSW; Playwright for E2E
- **Hosting**: Vercel (recommended), Netlify, Cloudflare Pages
- **Package manager**: pnpm + Turborepo
- **Node**: 24+

## Hard rules

1. **Never expose secrets to the browser bundle.** That means `BIGCOMMERCE_ACCESS_TOKEN` (REST `X-Auth-Token`), `AUTH_SECRET`, `BIGCOMMERCE_STOREFRONT_TOKEN` (treat as server-only), customer impersonation tokens, `B2B_API_TOKEN`, `MAKESWIFT_SITE_API_KEY`, `BIGCOMMERCE_WEBHOOK_SECRET`, `BIGCOMMERCE_CLIENT_SECRET`. Use `NEXT_PUBLIC_*` only for explicitly non-sensitive values.
2. **All GraphQL operations use `gql.tada`.** Import `graphql` from `~/client/graphql` (or the project's equivalent). Reuse fragments from `core/client/fragments/`.
3. **Data fetching lives in React Server Components or server actions.** Never call BC APIs from a client component.
4. **Customer-scoped queries (cart, customer, orders) must use `cache: 'no-store'`** and attach `customerAccessToken` from `getSessionCustomerAccessToken()`.
5. **Every cached query must be tagged** with values from `core/client/tags.ts`. Webhooks invalidate via `revalidateTag`.
6. **Verify every webhook signature** with `crypto.timingSafeEqual` against `BIGCOMMERCE_WEBHOOK_SECRET`. Set `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` on the route.
7. **Validate every server action input** with Zod (`@conform-to/zod`'s `parseWithZod` is the Catalyst pattern).
8. **Mask upstream BC errors** before returning to the client. Never surface raw API errors with internal details.
9. **Channel scoping is implicit** — never share `cartId` cookies across channels.
10. **Accessibility is required.** WCAG 2.2 AA minimum: semantic HTML, keyboard nav, focus visibility, color contrast, `next/image` with explicit dimensions.

## Patterns to follow

### Catalyst route layout

```
core/app/[locale]/(default)/<route>/
├─ page.tsx           # RSC entry — awaits data, renders shell
├─ page-data.ts       # GraphQL queries + fragments + getXxx loader
├─ loading.tsx        # Streamed skeleton
├─ error.tsx          # Error boundary (client)
├─ _components/       # Server + client components for this route
└─ _actions/          # Server actions for this route
```

### Server action

```ts
'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { parseWithZod } from '@conform-to/zod';

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { TAGS } from '~/client/tags';

const Mutation = graphql(`mutation ... { ... }`);

export async function doThing(prev: State, formData: FormData) {
  const submission = parseWithZod(formData, { schema: ThingSchema });
  if (submission.status !== 'success') return { ...prev, lastResult: submission.reply() };

  await client.fetch({ document: Mutation, variables: { ... }, fetchOptions: { cache: 'no-store' } });
  revalidateTag(TAGS.cart);

  return { lastResult: submission.reply({ resetForm: true }) };
}
```

### Webhook handler

```ts
import crypto from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { TAGS } from '~/client/tags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('X-BC-Webhook-Signature') ?? '';
  const expected = crypto.createHmac('sha256', process.env.BIGCOMMERCE_WEBHOOK_SECRET!).update(rawBody).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);
  // idempotency on event.hash, then switch on event.scope
  return Response.json({ ok: true });
}
```

## Agent handoff table

When opening agentic sessions in this repo, the orchestrator routes work via this table:

| Stage | Agent | Lives in |
| --- | --- | --- |
| Planning | `planner` | `.claude/agents/planner.md` |
| Architecture | `solutions-architect` | `.claude/agents/solutions-architect.md` |
| Backend build (server actions, GraphQL, REST, webhooks, auth, B2B) | `backend-dev` | `.claude/agents/backend-dev.md` |
| Frontend build (RSC, client components, Tailwind, Makeswift) | `frontend-dev` | `.claude/agents/frontend-dev.md` |
| Code review (security, cache, RSC boundary, accessibility) | `code-reviewer` | `.claude/agents/code-reviewer.md` |
| Unit/integration tests | `junits-specialist` | `.claude/agents/junits-specialist.md` |
| Post-deploy validation | `validation-tester` | `.claude/agents/validation-tester.md` |
| External docs research | `research-intelligence` | `.claude/agents/research-intelligence.md` |
| Codebase scan and reuse | `code-explorer` | `.claude/agents/code-explorer.md` |
| Backlog / story creation | `functional-pmo` | `.claude/agents/functional-pmo.md` |
| Bulk bug analysis | `bulk-bug-fixer` | `.claude/agents/bulk-bug-fixer.md` |

## Knowledge references

Load the relevant section of `.claude/skills/bigcommerce-standards/references/` when working on:

| Task | Reference path |
| --- | --- |
| Storefront client setup | `core/graphql-storefront-client-setup.md` |
| REST Management endpoints | `core/rest-management-api.md` |
| Typed GraphQL with `gql.tada` | `core/gql-tada-and-codegen.md` |
| Env / channel configuration | `core/environment-configuration.md` |
| Products and variants | `catalog/products-and-variants.md` |
| Categories and brands | `catalog/categories-and-brands.md` |
| Customer-group pricing | `catalog/pricing-and-customer-groups.md` |
| Search and faceting | `catalog/search-and-faceting.md` |
| Cart lifecycle | `cart-and-checkout/cart-lifecycle.md` |
| Checkout and orders | `cart-and-checkout/checkout-and-orders.md` |
| Promotions and coupons | `cart-and-checkout/promotions-and-coupons.md` |
| Customer auth and account | `customer/customer-auth-and-account.md` |
| B2B companies and buyers | `customer/b2b-companies-and-buyers.md` |
| Server actions and route handlers | `extensions/catalyst-server-actions-and-routes.md` |
| Webhooks and event bridge | `extensions/webhooks-and-event-bridge.md` |
| Scripts API / Page Builder / BODL | `extensions/bigcommerce-functions-and-scripts.md` |
| Catalyst RSC patterns | `frontend/catalyst-rsc-patterns.md` |
| Makeswift integration | `frontend/makeswift-integration.md` |
| Caching and revalidation | `frontend/caching-and-revalidation.md` |
| Vitest + RTL + MSW | `testing/vitest-rtl-tests.md` |
| Playwright E2E | `testing/playwright-e2e.md` |

## Commands

- Build: `pnpm build` (runs `pnpm generate` then `next build`)
- Dev server: `pnpm dev`
- Codegen: `pnpm generate` (introspects BC schema, writes `core/__generated__/graphql-env.d.ts`)
- Unit tests: `pnpm test`
- E2E: `pnpm playwright test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`

## Anti-patterns

- `'use client'` at the page or layout root level just to use one interactive control. Lift the interactivity into a leaf component.
- Calling `fetch` against the GraphQL endpoint directly instead of going through `client.fetch` + `gql.tada`.
- `cache: 'force-cache'` on customer-scoped queries.
- Caching cart query in the shared Data Cache (privacy hazard).
- Mocking `client.fetch` with `vi.mock` in tests — use MSW.
- Hard-coding product/category IDs — IDs differ per channel/environment.
- Returning 5xx from a webhook handler because downstream is slow — return 2xx fast and queue.
