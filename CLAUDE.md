<project_context>
- Project name: Okuma BC
- Business unit: Deloitte US Consulting
- BigCommerce store hash: tb0nfpch8c
- Channel ID(s): [FILL IN — check store admin → Channel Manager]
- B2B Edition enabled: n (not configured — confirm if required)
- Makeswift enabled: n (Stencil theme, not Catalyst)
- Production storefront origin: [FILL IN — e.g. https://okuma.mybigcommerce.com or custom domain]
- Target environments: [FILL IN — preview / staging / prod]
- Customer auth model: BigCommerce native session (Stencil) + API key auth for Node.js backend
- Key integrations: BigCommerce V2/V3 REST API, Storefront GraphQL API, webhooks (store/order/statusUpdated)
- Launch date: [FILL IN]
- Key constraints: [FILL IN — regulatory, multi-region, accessibility requirements if any]
</project_context>

<codebase_stack>
- Storefront: BigCommerce Stencil (Cornerstone-based Apex fork) — not Catalyst/Next.js
- Templating: Handlebars (.html templates in theme/templates/)
- Styling: SCSS (theme/assets/scss/) bundled via webpack
- JS: Custom JS in theme/assets/js/, webpack-bundled, PageManager pattern
- Build tool: webpack (webpack.common.js / webpack.dev.js / webpack.prod.js) + Grunt
- Stencil CLI: @bigcommerce/stencil-cli (global)
- Package manager: npm (theme/package.json and app/package.json — no monorepo tooling yet)
- Node version: >= 18.x
- Backend: Node.js/Express (app/src/index.js)
  - Framework: Express 4.x
  - HTTP client: axios
  - Auth: express-session + BC OAuth 2.0 callback flow
  - Config: dotenv (app/.env — never committed)
- REST Management API scopes used: Products (v3/catalog/products), Orders, Webhooks (v3/hooks)
- BC credentials location: app/.env (BC_CLIENT_ID, BC_CLIENT_SECRET, BC_ACCESS_TOKEN, BC_STORE_HASH)
- Build command (theme): stencil bundle → uploads .zip via store admin
- Dev command (theme): stencil start (localhost:3000 proxy)
- Dev command (app): npm run dev (nodemon, port 3000 — change PORT in app/.env if running both)
- Deploy (theme): stencil bundle → upload zip to store admin or via API
- Deploy (app): [FILL IN — Heroku / Railway / EC2 / other]
- Tunnelling for webhooks/callbacks: ngrok (ngrok http 3000)
- Testing: [FILL IN — no test framework configured yet]
- Observability: [FILL IN]
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
