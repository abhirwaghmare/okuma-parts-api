Universal baseline standards. Projects add their own conventions below or via `/initialize-setup`.

## TypeScript / JavaScript

### Naming
- Variables and functions: camelCase. Constants: UPPER_SNAKE_CASE.
- Types, interfaces, components: PascalCase. Files: match the export name.
- Tailwind classes: utility-first, prefer composition via `clsx` / `tailwind-merge` helpers — match the project's `cn()` helper if one exists.
- Boolean variables: use `is`, `has`, `should` prefixes.

### Readability
- Prefer `const` over `let`. Do not use `var`.
- Use arrow functions for callbacks and short expressions. Use named functions for top-level logic.
- Destructure objects and arrays at the point of use.
- Keep functions under 30 lines. Extract when logic branches.
- Use template literals over string concatenation.
- Prefer explicit return types on exported functions and server actions.

### Error Handling
- Use try/catch for async operations. Always handle the catch.
- Do not silently swallow errors -- log or propagate.
- Validate external data at the boundary (API responses, user input, BC webhook payloads, form data).

### DOM and Events (client components)
- Use event delegation over per-element listeners when handling repeated elements.
- Prefer `addEventListener` over inline event handlers.
- Clean up event listeners and timers on component teardown (`useEffect` cleanup).

### CSS / Tailwind
- Tailwind utilities are preferred for Catalyst projects -- compose with `clsx` and `tailwind-merge`.
- Mobile-first breakpoints (`sm`, `md`, `lg`, `xl`).
- Use logical properties (`ms-`, `me-`, `ps-`, `pe-`) when supported for RTL safety.
- For non-Tailwind CSS, keep selectors shallow -- max 3 levels of nesting.
- Use design tokens (CSS custom properties or Tailwind config) for colors, spacing, typography.

## Testing

### Structure
- One test file per source file. Mirror the source directory structure.
- Test names describe the scenario: `returns null when slug not found` or `applies coupon and revalidates cart`.
- Arrange-Act-Assert (AAA) pattern in every test.

### Coverage
- Target 80% line coverage for new code.
- Cover: happy path, null/empty inputs, boundary values, error conditions, BC API errors.
- Do not test private functions directly -- test through the public API.

### Mocking
- Mock external dependencies (BC GraphQL, REST endpoints) with MSW. Do not mock `client.fetch` directly with `vi.mock`.
- Mock Next.js helpers (`next/headers`, `next/cache`, `next/navigation`) with `vi.mock`.
- Use the project's test framework (Vitest, Jest, etc.) -- do not mix frameworks.
- Keep mocks minimal -- only mock what the test needs.

## General

### Comments
- Write self-documenting code. Add comments only when the "why" is not obvious from the code.
- No commented-out code in production. Remove it or track in version control.
- No TODO comments without a ticket reference.
- No emojis in comments, logs, or code.

### Logging
- Use the project's logger -- no bare `console.log` in production code.
- Log at appropriate levels: ERROR for failures, WARN for recoverable issues, INFO for significant events, DEBUG for development.
- Include context in log messages (what was attempted, relevant IDs).
- Never log tokens, customer impersonation tokens, or PII.

### Security
- Do not hardcode credentials, API keys, or secrets.
- Validate and sanitize all external input (user input, API responses, URL parameters, webhook payloads).
- Use parameterized queries -- no string concatenation for SQL.
- Follow context-aware output escaping for the rendering framework (React auto-escapes; only `dangerouslySetInnerHTML` for trusted server-rendered content).

### Git
- Commit messages: `type(scope): description` (e.g., `feat(pdp): add variant configurator`).
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Keep commits atomic -- one logical change per commit.

---

## BigCommerce (Catalyst)

### Secrets and tokens
- Never expose `BIGCOMMERCE_ACCESS_TOKEN` (REST Management `X-Auth-Token`) to the browser bundle. Server code only.
- Never expose the customer impersonation token to the browser bundle. Server code only — attach via `client.fetch({ customerAccessToken })`.
- `BIGCOMMERCE_STOREFRONT_TOKEN` is the JWT for GraphQL Storefront. Treat as server-side by default. Use `BIGCOMMERCE_STOREFRONT_UNAUTHENTICATED_TOKEN` (CORS-locked) only when client-side anonymous reads are genuinely required.
- `AUTH_SECRET`, `B2B_API_TOKEN`, `MAKESWIFT_SITE_API_KEY`: server only. Rotate annually or on suspected compromise.
- `NEXT_PUBLIC_*` prefix means it ships to the browser. Use only for non-sensitive values.

### Channel scoping
- Every GraphQL Storefront request is channel-scoped via `BIGCOMMERCE_CHANNEL_ID`.
- For multi-storefront, resolve channel per request via `beforeRequest` and scope cart cookies per channel.
- Never share a `cartId` cookie across channels — they are isolated.

### GraphQL hygiene
- Use `gql.tada` typed queries via `graphql()` from `core/client/graphql.ts`. Do not call raw `fetch` to the GraphQL endpoint.
- Reuse fragments from `core/client/fragments/` (e.g., `PricingFragment`).
- Honour fragment masking — consume `FragmentOf<T>` via `readFragment(Fragment, masked)`.
- Selection sets must be lean — every requested field consumed by the UI.

### Webhook safety
- Verify every incoming BC webhook with `crypto.timingSafeEqual` against `BIGCOMMERCE_WEBHOOK_SECRET`.
- Idempotency via `payload.hash` stored in Redis/DB with 24h TTL.
- Respond 2xx within 5s. Push heavy work to a queue.
- Handlers must set `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`.

### Customer JWT SSO
- Sign JWTs with `BIGCOMMERCE_CLIENT_SECRET`, algorithm HS256, `expiresIn: '30s'`, include `iss`, `iat`, `jti`, `operation: 'customer_login'`, `store_hash`, `customer_id`, `channel_id`.
- Verify signature and audience server-side before signing — never sign for a customer the user has not authenticated.

### RSC and client boundary
- Default to RSC for data fetching. `'use client'` only when interactivity demands it.
- Never call the GraphQL Storefront or REST Management API from a client component — all data fetching lives in RSC or server actions.
- Pass only serialisable props from RSC to client components.

### Caching
- Tag every cached query. Match cache TTL to data lifecycle.
- Customer-scoped queries (cart, customer, orders): `cache: 'no-store'`. Never `force-cache`.
- After every cart/coupon/customer mutation: `revalidateTag(TAGS.cart)` (or relevant tag).
- Webhook handlers invalidate exactly the tags that match the event scope.

### Server actions
- Validate every `FormData` input with Zod (Conform's `parseWithZod` is the Catalyst pattern).
- Mask BC error messages before returning to the client — never surface raw upstream errors.
- Use `'use server'` directive at the top of the file.

### Accessibility
- WCAG 2.2 AA minimum. Use semantic HTML5 elements; reach for ARIA only when semantics fall short.
- Every interactive element keyboard reachable. Focus visible. Color contrast meets AA.
- `next/image` with explicit width/height to avoid CLS; use BC `urlTemplate(lossy: true)` for image URLs.

---

*Project-specific standards are added below by `/initialize-setup` or manually by the project team.*
