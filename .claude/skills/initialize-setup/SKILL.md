---
name: initialize-setup
description: Scans any project to detect its tech stack, conventions, and code standards, then populates project context for the framework. Supports two modes — architect's standards document (PDF/markdown) or automatic codebase scan. Run this at the start of every new project or when onboarding onto an existing codebase. Works with any stack — BigCommerce (Catalyst), Next.js, React, Node, Python, Go, etc.
---

# Initialize Setup

## When to Use
- First time working on a project
- Onboarding onto an existing codebase
- After major architectural changes
- When CLAUDE.md still shows `[Run /initialize-setup to populate]`

## Mode Selection

Check whether the user provided a document path:
- **Mode A -- Architect's Document**: PDF or markdown provided. Extract context, populate framework files, validate against codebase.
- **Mode B -- Codebase Scan**: no document provided. Scan codebase to detect stack and infer conventions.
- **Mode C -- Hybrid**: document provided but incomplete. Use document as primary, fill gaps with codebase scan.

---

## Mode A: Architect's Document

### A1. Read and Extract
- Read the provided PDF or markdown
- Extract: project context (name, purpose, architecture, constraints), codebase stack (tech stack, build/deploy/test commands, infrastructure), code standards (naming, file structure, code patterns, dialog patterns, test patterns)

### A2. Map to Framework Targets
- `<project_context>` in CLAUDE.md -- project name, org, purpose, architecture, constraints
- `<codebase_stack>` in CLAUDE.md -- backend stack, frontend stack, infrastructure, build/deploy/test commands
- `.claude/rules/code-standards.md` -- naming, file structure, code patterns, pattern categories, dialog/config patterns, test patterns. Include inline examples where they clarify a convention.

### A3. Validate Against Codebase
- Compare extracted guidance against actual project files (pom.xml, package.json, etc.)
- Check: tech stack matches, naming conventions match, pattern categories match, commands are correct
- Report discrepancies: `DISCREPANCY: Document says {X}, codebase shows {Y}. Using: {chosen} -- {rationale}`
- Ask user to resolve before finalizing

---

## Mode B: Codebase Scan

### B1. Scan Project Structure
- Read project root directory tree
- Identify: build configs (package.json, pnpm-workspace.yaml, turbo.json, pom.xml, Cargo.toml, go.mod, requirements.txt, pyproject.toml, Makefile), README, source dirs, CI configs, test dirs, containerization files
- Read actual files. Do not infer without evidence.

### B2. Detect Tech Stack

**BigCommerce (Catalyst) detection signals — high priority, check first:**
- `package.json` contains `@bigcommerce/catalyst-client`, `gql.tada`, `@0no-co/graphqlsp`, or scripts referencing `catalyst`
- `core/` directory containing `app/` (App Router), `client/`, `components/`, `middlewares/`
- `core/client/index.ts` exporting a `createClient` from `@bigcommerce/catalyst-client`
- `core/client/graphql.ts` with `initGraphQLTada`
- `graphql.config.json` present at repo root
- `.env.example` containing `BIGCOMMERCE_STORE_HASH`, `BIGCOMMERCE_STOREFRONT_TOKEN`, `BIGCOMMERCE_CHANNEL_ID`
- `pnpm-workspace.yaml` + `turbo.json` (Catalyst is a pnpm/Turborepo monorepo)
- `next.config.ts` (Next.js App Router)

If Catalyst is detected, capture:
- Catalyst version (from `package.json`)
- Next.js version
- B2B Edition presence (search for `@bigcommerce/b2b-storefront-edition` or B2B env vars)
- Makeswift integration (search for `@makeswift/runtime`)
- Auth.js v5 (search for `next-auth` `^5` or `beta`)
- i18n (`next-intl`)
- Number of channels (single vs multi-storefront — check `core/channels.config.ts`)

**General stack detection:**
- **Backend / API layer**: language/version, framework/version, build tool, deps, test framework, API style (GraphQL Storefront vs REST Management), data layer
- **Frontend**: framework/version (Next.js App Router for Catalyst), styling (Tailwind for Catalyst), scripting (TS), build tool (Next.js + Turborepo for Catalyst), component library (Catalyst Vibe Soul), test framework (Vitest, Playwright)
- **Infrastructure**: cloud platform (Vercel/Netlify/Cloudflare Pages for Catalyst), CI/CD, containerization, deployment model
- Mark unknowns as `unknown -- verify with team`. Do not fabricate.

### B3. Discover Conventions
- **Naming**: scan 5-10 files per type, extract class/method/CSS/file/variable naming
- **File structure**: directory layout per module type
- **Code patterns**: DI style, state management, error handling, logging, import ordering
- **Pattern categories**: structural/OOTB vs content-rendering/custom vs service/integration. Report ratios, flag where conventions differ.
- **Dialog/config patterns**: how author dialogs or configs are structured. Document each category separately if they differ.
- **Test patterns**: file location, naming, assertion style, mocking approach
- Describe what the project does, do not prescribe.

---

## Write Framework Files

- Locate CLAUDE.md at project root (create if missing)
- Replace content only inside `<project_context>` and `<codebase_stack>`
- Write code standards to `.claude/rules/code-standards.md`
- Do not modify other sections of CLAUDE.md

## Validate

- `<project_context>` populated with actual project data
- `<codebase_stack>` populated with actual project data
- `.claude/rules/code-standards.md` exists and populated
- No other CLAUDE.md sections modified
- Build, deploy, and test commands present in stack context

## Conflict Check

- Compare project conventions against framework rules
- Report: `CONFLICT: Framework says {rule}. Project uses {pattern}. Recommendation: {follow project / update project}`
- Ask user to resolve. Per decision priority, project conventions win.

## Output

Confirm: mode used, files updated, project name/stack/language, frontend stack, infrastructure, unknowns to verify, discrepancies, conflict check result.
