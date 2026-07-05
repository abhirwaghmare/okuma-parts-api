# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<project_context>
- Project name: Okuma BC
- Business unit: Deloitte US Consulting
- BigCommerce store hash: tb0nfpch8c
- Channel ID(s): [FILL IN — check store admin → Channel Manager]
- B2B Edition enabled: n (using BundleB2B/B3 auto-loader instead — configured in the Stencil theme, which lives in a separate repository)
- Makeswift enabled: n (Stencil theme, not Catalyst)
- Production storefront origin: [FILL IN — e.g. https://okuma.mybigcommerce.com or custom domain]
- Target environments: [FILL IN — preview / staging / prod]
- Customer auth model: BigCommerce native session (Stencil built-in login/account pages)
- Key integrations: BC V2/V3 REST API, Storefront GraphQL API, webhooks (store/order/statusUpdated), BundleB2B (B3) auto-loader
- Launch date: [FILL IN]
- Key constraints: [FILL IN — regulatory, multi-region, accessibility requirements if any]
</project_context>

<codebase_stack>
## Repository layout

This repository contains only the **Node.js/Express backend** (`app/`). The BigCommerce Stencil theme lives in a separate repository.

```
Okuma-BC/
├── app/        # Node.js/Express TypeScript backend — Parts Book API + BC REST integrations
├── docs/       # Technical design documents
├── scripts/    # One-off seeding and upload utilities (JS, not part of the app build)
└── coverage/   # Jest coverage output (gitignored)
```

## Backend (app/)

- Runtime: Node.js >= 18.x (currently v20.16.0), npm >= 9.x
- Language: TypeScript 6, compiled to CommonJS (`dist/`) via `tsc`; dev mode via `tsx watch`
- Framework: Express 4
- Port: **3000** by default (override with `PORT` env var; auto-binds to next available port if 3000 is in use)
- Logger: Winston — `app/src/config/logger.ts`; use `logger` from this module, never bare `console.log` in production paths
- BC API client: axios instance at `app/src/services/bigcommerce.ts` — pre-configured with `X-Auth-Token` and store base URL; use this for all BC REST calls
- Session: express-session with `httpOnly` + `sameSite: lax`; `secure` flag on in production
- CORS: controlled by `CORS_ORIGINS` env var (comma-separated); defaults to localhost:3000 and localhost:3001
- Validation: custom `validate()` middleware at `app/src/middleware/validate.ts` — pass a schema with `query/params/body` field rules; throws `ValidationError` which `errorHandler` maps to 400
- Error hierarchy: `AppError → ValidationError / NotFoundError` in `app/src/middleware/errors.ts`; `errorHandler` middleware at `app/src/middleware/errorHandler.ts` maps status, hides 5xx details

### Backend commands

```bash
cd app && npm install          # first-time setup
cd app && npm run dev          # tsx watch — live reload, no compile step
cd app && npm run build        # tsc → dist/
cd app && npm start            # node dist/index.js (production)
cd app && npm run lint         # eslint src/**/*.ts
cd app && npm run lint:fix     # eslint --fix
cd app && npm run format       # prettier --write
cd app && npm run format:check # prettier --check
```

No test runner is wired up yet (`tests/` directory is present but empty).

### Environment variables (app/.env)

Required: `BC_ACCESS_TOKEN`, `BC_STORE_HASH`, `SESSION_SECRET`, `PARTS_BOOK_CDN_BASE_URL`
Optional: `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, `BC_APP_CALLBACK_URL`, `PORT`, `CORS_ORIGINS`, `BC_WEBDAV_USER`, `BC_WEBDAV_PASS`

Config is loaded and validated at startup in `app/src/config/index.ts` — the app throws on missing required vars.

### Route structure

| Mount | File | Purpose |
|---|---|---|
| `/health` | `routes/health.ts` | Liveness check |
| `/api/products` | `routes/products.ts` | BC catalog proxy (list + get by id) |
| `/auth/callback` | `routes/auth.ts` | OAuth install callback (token exchange stub) |
| `/webhooks/order` | `routes/webhooks.ts` | BC order webhook — HMAC-SHA256 verified, async handler |
| `/api/parts-book/*` | `routes/parts-book.ts` | Parts Book TOC, sheet parts with BC SKU enrichment, machine list, customer machines |

### Parts Book data model

Assets live on BC WebDAV CDN (`PARTS_BOOK_CDN_BASE_URL`). Entry point is `toc.json` — array of documents each with assemblies and sheets. Sheet detail fetches `parts.json` from CDN, then enriches matching SKUs via `bcClient.get('/v3/catalog/products', { params: { 'sku:in': ... } })`. Machine model → BC category matching is done in-memory via fuzzy normalised-name lookup in `fetchMachineCategories()` / `matchCategory()`. Customer machines are stored as JSON in a BC customer metafield: `namespace=okuma, key=registered_machines`.

### Webhook pattern

`routes/webhooks.ts` uses `express.raw()` before JSON parse so the raw body is available for HMAC verification. New webhook routes must follow the same pattern: parse raw → verify signature → ack 200 immediately → run handler async.

## Stencil theme (separate repo)

- Cornerstone 6.11.0 base (Apex fork)
- Handlebars v4, SCSS (Foundation 5 + Citadel), Webpack 5, jQuery 3.6.1
- B2B: BundleB2B (B3) auto-loader configured in `theme/assets/js/theme/global.js`
- Deploy: `stencil bundle` → upload zip to BC store admin

## Tunnelling for local dev

```bash
node src/index.ts        # or npm run dev in app/
ngrok http 3000          # expose backend over HTTPS
# In BC admin → Storefront → My Themes → Customise → Okuma → set Parts Book API URL to ngrok URL
# Add BC store domain to CORS_ORIGINS in app/.env, then restart
```

## Code format

Prettier: `singleQuote: true`, `trailingComma: es5`, `printWidth: 120`, `tabWidth: 4`, `semi: true`, `arrowParens: avoid`
ESLint: airbnb-base + @typescript-eslint (strict mode). Lint runs as a pre-commit hook via Husky + lint-staged.
</codebase_stack>

<system_instructions>
## Core Principles
- Simplicity first — minimal code, minimal impact, nothing speculative
- No laziness — find root causes, avoid temporary fixes, hold work to senior developer standards
- Minimal impact — change only what is necessary and avoid side effects
- Codebase is the source of truth for reuse — search before building, extend what exists, avoid duplication
- User-provided input takes priority for conventions and patterns

## Verification Before Done
- Do not mark work complete without proving it works
- Ask: "Would a senior developer approve this?"
- Run tests, check logs, and demonstrate correctness
- Review your own output before handing off

## Demand Elegance
- For non-trivial changes: pause and ask whether there is a more elegant way
- If a fix feels hacky: step back and implement the elegant solution
- Skip this for simple, obvious fixes
- Challenge your own output before handing off

## Bug Fixing
- Given a bug report: investigate and fix without hand-holding
- Start with logs, errors, and failing tests
- State the reason with evidence before fixing
- Fix the minimal root cause rather than symptoms
- Verify with tests after the fix
- Do not ask the user for information you can find yourself

## Skills
- Invoke the relevant skill before domain-specific work
- Check available skills first
- If a skill covers the domain, load and use it fully

## Delegation
Before every non-trivial response, reason through:
- Is this simple enough for me, or does a specialist own it?
- External knowledge needed (docs, APIs, BigCommerce documentation)? → Delegate to research-intelligence
- Codebase discovery needed (existing routes, queries, components, files)? → Delegate to code-explorer
- Which specialist fits: solutions-architect, backend-dev, frontend-dev, code-reviewer, junits-specialist, validation-tester, docs-scribe?
- Can parts run in parallel? If yes, run them simultaneously
- Medium-to-complex scope? Default to subagents — coordinate, do not execute

If reasoning says delegate, invoke immediately — do not just mention it.
Provide subagents with all necessary context — no round-trips for clarification.
You own the outcome even when a subagent executes.

## Code
- Read relevant files before answering or writing anything
- Match existing patterns
- Do not invent new patterns without permission
- When unclear, ask before implementing

## Session Routing
- New session + domain task → invoke planner first
- Active session + plan exists → resume the active agent
- Out-of-scope task → handle directly without framework agents
- Bypass planner for codebase questions, casual messages, framework maintenance, and operational commands
- Operational commands include debug, deploy, publish, and author content
- If project context or stack context is still unpopulated: tell the user to run `/initialize-setup`, then proceed with best-effort defaults

## Decision Priority
1. User-provided input such as designs, references, and requirements
2. Project context and stack context in this file
3. Project code standards
4. Existing codebase patterns
5. Framework best practices as a last resort

## Workflow Rules
- Plan before every development task
- Operational tasks such as debug, deploy, publish, and author content may execute directly
- Avoid summary files unless the user asks for them
- Avoid documentation unless the user explicitly requests it
- Confirm before destructive changes
- Keep communication clear, direct, and technically honest

## SDLC
Plan → Implement → Build → Review → Test → Deploy → Validate

Complete each phase fully before the next. Do not skip or merge phases.
After writing any code, run the build immediately — no asking, no suggesting.
At each phase transition, output a single status line (e.g., "Build passed. Proceeding to review.") and move on — no summaries, no asking permission.

**Plan** — approved plan with complexity size `S`, `M`, or `L`. Proceed per autonomy rules.
**Implement** — write code. Run the project's build command (from `<codebase_stack>`) when done.
**Build** — if it fails: debug, fix, rebuild. If it passes: proceed to review.
**Review** — invoke code-reviewer. Reviewer fixes what it finds, rebuilds, redeploys. Architectural issues handed back to dev agent. When clean: proceed to tests.
**Test** — invoke the appropriate test agent. If tests fail: fix, rebuild, re-run. If tests pass: proceed to deploy.
**Deploy** — use the project's deploy command (from `<codebase_stack>`). If target environment is not running: notify user and stop.
  - Run the deploy command
  - Verify: check application logs for errors, confirm latest code is active
  - If verification fails: debug and redeploy
**Validate** — invoke `validation-tester` agent. Complete only after validation passes.

### Autonomy
- **S and M**: execute all phases end-to-end without asking. Notify briefly at each transition.
- **L**: ask before Deploy only. All other phases execute automatically.

### Phase Self-Check (every agent, before handing off)
1. Followed Read-Understand-Implement — read existing code before writing?
2. Self-reviewed output — not a checklist, an actual quality review of what was generated?
3. Code matches existing project patterns from `<code_standards>`?
4. Build passes (run project build command from `<codebase_stack>`)?
5. No scope creep beyond approved plan?
6. Checked assumptions, risks, edge cases?
7. Verification evidence exists before marking complete?
8. If any answer is no — fix before handing off.

### Debug and Fix (Hypothesis-Driven)
1. Investigate — trace execution, examine state at failure, identify root cause
2. Hypothesize — "Issue occurs because [reason]" with evidence
3. Validate — test hypothesis before fixing
4. Fix — minimal change addressing root cause, not symptoms
5. Verify — run tests, check edge cases
Do not guess without evidence. Do not apply fixes without understanding why.

## Boundaries
- Do not create agents, skills, commands, or hooks unless explicitly requested
- Do not add dependencies unless explicitly requested
- Confirm before destructive changes
- Work within what exists
</system_instructions>
