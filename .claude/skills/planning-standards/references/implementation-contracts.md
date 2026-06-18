# Implementation Contracts

These are TEMPLATES — fill them with project-specific values from `<code_standards>` and Input-Derived Patterns. The examples below (route layouts, query shapes, server actions) are FALLBACK illustrations for when the project has no established convention. If the project does it differently, use the project's way.

MANDATORY sections to include in plan output (adapt based on task type):

**Task Type**: {Catalyst Page / GraphQL Query / REST Integration / Webhook / Makeswift Component / Customer Auth / B2B Configuration / Configuration}
**Complexity**: {S/M/L} - {1-sentence rationale}

---

**Extracted Acceptance Criteria** (if story provided):
- AC1: {Testable criterion with pass/fail condition}
- AC2: {Testable criterion}
- AC3: {Testable criterion}

**Hidden/Implicit Requirements Identified**:
- {e.g., WCAG 2.2 AA compliance, customer-group-aware pricing, cache invalidation, i18n via `next-intl`, channel scoping}

---

**Reusability Analysis**:
- Existing routes/queries/components evaluated: {List what was checked}
- Reuse decision: {EXTEND existing / BUILD new / CONFIGURE existing}
- Rationale: {Why this decision - feature match %, pattern alignment}

---

## [IF Catalyst Page / Component (RSC)]

**Route File Structure**:
Derive from `<code_standards>` — show the directory tree THIS project uses. The example below is the Catalyst convention; replace with the project's actual structure if `<code_standards>` defines one:
```
core/app/[locale]/(default)/[route]/
├─ page.tsx                  # RSC entry — awaits data, renders shell
├─ page-data.ts              # GraphQL queries + fragments + getXxx() loader
├─ loading.tsx               # Skeleton shell while RSC awaits
├─ error.tsx                 # Error boundary (client)
├─ not-found.tsx             # 404 (optional, route-scoped)
├─ _components/              # Server + client components for this route only
│   ├─ hero.tsx              # Server component
│   ├─ gallery.client.tsx    # Client component (interactive)
│   └─ schema/
│       └─ fragment.ts       # JSON-LD product schema fragment
└─ _actions/                 # Server actions for this route
    ├─ apply-coupon-code.ts
    └─ update-line-item.ts
```

**RSC vs Client Boundary**:
- Data fetching, layout, metadata → RSC (`page.tsx`, server `_components/*.tsx`)
- Stateful interactivity → client (`_components/*.client.tsx`)
- Mutations → server actions (`_actions/*.ts`)
- Pre-shape data in RSC into the minimal type the client component needs

**GraphQL Selection**:
- Reuse `PricingFragment`, `PaginationFragment` from `core/client/fragments/`
- New fragments live next to the route in `page-data.ts` or `_components/*/fragment.ts`
- Variables passed: `entityId` (Int!), `currencyCode` (currencyCode), pagination cursors as needed

**Cache Strategy**:
- Anonymous read: `next: { revalidate: <target>, tags: [TAGS.xxx(id)] }`
- Customer-scoped read: `cache: 'no-store'`, customer impersonation token attached
- Mutation: `cache: 'no-store'` + `revalidateTag(TAGS.xxx)` after success

---

## [IF GraphQL Storefront Query]

**Query Design**:
```
Root: site.{product|category|brand|cart|search}
Variables: { entityId: Int!, currencyCode: currencyCode, $first: Int, $after: String }
Fragments: PricingFragment + custom fragments for the consuming UI
Auth: anonymous / customer impersonation token (specify)
Cache: revalidate target + tag list / no-store (specify)
```

**Selection set discipline**:
- Every requested field must be consumed by the UI
- Use `urlTemplate(lossy: true)` for images instead of raw `url`
- Pagination via `first`/`after` (never `skip`/`take`)

**File impact**:
- `core/client/fragments/...` for shared fragments
- `core/app/.../page-data.ts` for route-specific queries
- `core/client/tags.ts` if a new tag is introduced

---

## [IF REST Management Integration]

**Integration Architecture**:
```
Base URL: https://api.bigcommerce.com/stores/${BIGCOMMERCE_STORE_HASH}
Endpoint: /v3/{resource}/{id}
Method: GET | POST | PUT | DELETE
Auth: X-Auth-Token: ${BIGCOMMERCE_ACCESS_TOKEN}
Scopes required: {Products: read-only / Orders: modify / etc.}
Runtime: nodejs (REST + crypto)
```

**Implementation Components**:
- Route handler or server action under `core/app/api/.../route.ts` (server-only)
- Thin client wrapper in `core/lib/bc-rest/{resource}.ts` if used in multiple places
- Zod schemas for request and response validation
- Error handling: read `X-Rate-Limit-Requests-Left`, back off on 429

**Security**:
- `X-Auth-Token` stays server-side (no `NEXT_PUBLIC_*`)
- `cache: 'no-store'` for any PII (customers, orders)
- Mask error messages before returning to client
- Input validation on every public route handler

---

## [IF Webhook Handler]

**Subscription**:
```
Scope: store/{entity}/{action}
Destination: https://<deploy host>/api/webhooks/bigcommerce
Active: true
Secret: BIGCOMMERCE_WEBHOOK_SECRET
```

**Handler shape**:
```
File: core/app/api/webhooks/bigcommerce/route.ts (or topic-specific path)
Runtime: nodejs
Dynamic: force-dynamic

Steps:
1. Read raw body and signature header (X-BC-Webhook-Signature)
2. HMAC SHA256 with timingSafeEqual
3. Idempotency check via payload.hash (Redis/DB, 24h TTL)
4. Switch on payload.scope
5. revalidateTag(...) per affected tag
6. Queue heavy work; return 2xx within 5s
```

**Tag map** (extend `core/client/tags.ts`):
```
store/product/* → TAGS.product(id)
store/category/* → TAGS.categories
store/sku/inventory/* → TAGS.product(productId)
store/order/* → custom downstream (OMS, analytics)
```

---

## [IF Makeswift Component]

**Component contract**:
```
Type: <camelCase-id>
Label: <human label shown in Makeswift>
Controls:
  - className: Style({ properties: Style.All })
  - <prop>: TextInput / Image / Number / Select / Link / Combobox / Style
Props consumed: ClassName + content props + (optional) BC entityId
```

**Files**:
- `core/components/<component>.tsx` (RSC or client)
- `core/lib/makeswift/components/<component>.makeswift.ts` (registration side-effect)
- Side-effect import added to `core/app/[locale]/layout.tsx` or central register

**Data binding to BC** (optional):
- If the component reads BC product/category data, accept `entityId: Number` control
- Inside the component, call `client.fetch` with `next.revalidate` + tag

**Draft mode**:
- Render with `siteVersion: 'Working'` when `draftMode().isEnabled === true`
- Otherwise `'Live'`

---

## [IF Customer Auth Flow]

**Flow**:
```
Step 1: UI form posts to /api/auth/[...nextauth] (Auth.js v5)
Step 2: Auth.js authorize() calls BC Customer Login REST to mint impersonation token
Step 3: Token stored in JWT-encrypted session cookie
Step 4: Server actions retrieve via getSessionCustomerAccessToken()
Step 5: client.fetch uses customerAccessToken on customer-scoped reads
```

**Files**:
- `core/auth/index.ts` (Auth.js config: providers, callbacks, session strategy)
- `core/auth.ts` exports `getSessionCustomerAccessToken()`
- `core/app/[locale]/(auth)/login/page.tsx` (login UI)
- `core/app/api/auth/[...nextauth]/route.ts` (Auth.js handler)

**Security**:
- `AUTH_SECRET` rotated annually (or on compromise)
- Session cookie HttpOnly, Secure, SameSite=Lax
- Customer impersonation token never serialised to client
- reCAPTCHA on register and password-reset endpoints

---

## [IF B2B Configuration]

**Enablement**:
- B2B Edition enabled on the channel in BC control panel
- `B2B_API_TOKEN` and `B2B_EDITION_ENABLED=true` in env

**Flow contract**:
```
On login: mint B2B session token via /api/io/auth/storefront
Buyer queries: company, users, addresses, shopping lists
Mutations: createQuote, quoteCheckout, updateAddress
Sales rep impersonation: mint customer impersonation token for buyer + "Shopping as ..." banner
```

**Files**:
- `core/lib/b2b/client.ts` (B2B GraphQL client + token cache)
- `core/app/[locale]/(default)/buyer-portal/...` (B2B-only routes)
- Server actions for quote workflow under `_actions/`

**Role gating**:
- Role checks server-side only
- Spend limits enforced server-side
- All buyer actions logged (rep ID + buyer ID when impersonating)

---

## [IF Configuration / Infrastructure]

**Configuration**:
```
Type: env var / BC channel setting / webhook subscription / Vercel project setting
Location: .env.local (local) + Vercel dashboard (preview, staging, prod) / BC control panel
Environment-specific: dev / preview / staging / prod
```

**Migration steps** (if changing existing config):
- {Step-by-step ordered list with rollback notes}

**Validation**:
- Smoke test (which page, which query) confirms the change

---

## [COMMON TO ALL TASK TYPES]

**File Impact**:
- Exact files to add/modify/remove with FULL paths (e.g., `core/app/[locale]/(default)/product/[slug]/page.tsx`)

**Public APIs & Configs**:
- TypeScript types/interfaces exposed
- GraphQL query/mutation names
- REST endpoints called
- Webhook scopes subscribed
- Makeswift component types registered
- Env vars added or changed
- Include code snippets for signatures only (not full implementations)

**Acceptance Criteria**:
- 3-4 high-level validation points (not detailed checklists)

**Dependencies & Risks**:
- External dependencies (BC apps, B2B Edition, Makeswift site, third-party services)
- Potential blockers or integration points
- Performance considerations (cache strategy, payload size, RSC streaming)

---

## Execution Strategy (MANDATORY)

Every plan MUST include an execution strategy that defines who builds what, in what order, and what context they need.

### Agent Assignment
Decide for each piece of the plan:
- **Main agent directly** — for S-complexity single-file changes where invoking a subagent adds overhead without value
- **backend-dev subagent** — for server actions, route handlers (REST proxies, webhook handlers), REST Management integration, GraphQL query design
- **frontend-dev subagent** — for RSC + client components, Makeswift components, Tailwind/CSS, accessibility
- **Both backend-dev + frontend-dev** — for full-stack features (RSC page + server action + child client component)

### Execution Mode
Determine if agents can work in parallel or must be sequential:

**Parallel** (preferred when possible):
- Backend and frontend have no runtime dependency on each other during implementation
- Both agents receive the full interface contract upfront (GraphQL query signature, server action prop shape)
- Example: server action and client component can be built simultaneously if the action signature is defined in the plan

**Sequential** (when one depends on the other):
- Frontend needs the GraphQL query result type to render correctly
- Webhook handler must invalidate tags that the storefront route uses
- Example: Define the query in `page-data.ts` first → then build server `_components/` → then client components consuming pre-shaped props

**Mixed** (common for M/L tasks):
- Some parts parallel, some sequential
- Example: GraphQL query + Makeswift registration in parallel → then RSC page that uses both

### Context Payload Per Agent
For each assigned agent, specify exactly what they need to work independently:
- **File paths** they will create/modify
- **Interface contracts** (TypeScript types, query/mutation names, server action signatures) they must implement or consume
- **Design tokens** (from Figma context) if frontend
- **Env vars / scopes** if backend
- **Cache tags** they invalidate or consume
- **Dependencies** on other agents' outputs (what they must wait for)

### SDLC Flow
The plan must define the full lifecycle — not just implementation. Use build/deploy commands from `<codebase_stack>` in CLAUDE.md:
1. **Implement** — agent assignment and execution mode as above
2. **Build** — `pnpm build` (or project command from `<codebase_stack>`) immediately after code is written
3. **Review** — invoke `code-reviewer` on all changed files together
4. **Test** — invoke `junits-specialist` (Vitest + RTL + MSW) and/or Playwright E2E
5. **Deploy** — `pnpm dev` locally; Vercel preview for shared review
6. **Validate** — run `/validate-implementation` against the deployed page

For S/M complexity: all phases execute automatically per CLAUDE.md autonomy rules.
For L complexity: ask before Deploy only.

### Execution Strategy Template
```
## Execution Strategy

**Complexity**: {S/M/L}
**Autonomy**: {Auto end-to-end / Ask before deploy}

**Agent Assignment**:
| Agent | Scope | Mode | Depends On |
|-------|-------|------|------------|
| {agent} | {what they build} | {parallel/sequential} | {nothing / other agent's output} |

**Context for each agent**:
- {agent}: {interface contract, file paths, design tokens, env vars, cache tags}

**SDLC Flow**:
Implement → Build → Review → Test → Deploy → Validate
{any phase-specific notes, e.g., "Review server action and RSC together"}
```

**Handoff Payload**:
- The Implementation Contract above
- Execution Strategy with agent assignments
- Concise rationale and architectural decisions
- Dependencies and execution order
