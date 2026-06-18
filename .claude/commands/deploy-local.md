# Deploy (Local Dev Server)

## When to Use
- Starting the Next.js dev server for local validation
- Smoke testing after build or env-var changes
- Reproducing issues locally with the latest code

## Workflow

### 0. Project Awareness + Confirm target
- Read `<codebase_stack>` from CLAUDE.md — get dev command, port, and any env hints
- Default for Catalyst projects: `pnpm dev` (runs `pnpm generate` + `next dev`). Default URL: `http://localhost:3000`.
- If `<codebase_stack>` defines a different command (e.g., `pnpm --filter core dev`), use that
- If `<codebase_stack>` is not populated or the dev command is missing, ask the user for the exact command to run

### 1. Pre-deploy checks
- Verify repo root: `pwd`
- Confirm dependencies installed: `pnpm install --frozen-lockfile` if `node_modules` is missing
- Verify `.env.local` exists with required `BIGCOMMERCE_STORE_HASH`, `BIGCOMMERCE_STOREFRONT_TOKEN`, `BIGCOMMERCE_CHANNEL_ID`, `AUTH_SECRET`

### 2. Generate GraphQL types (if schema or channel changed)
- Run `pnpm generate` — reads `.env.local`, introspects the BC schema, writes `core/__generated__/graphql-env.d.ts`
- Skip if no schema-affecting changes

### 3. Start dev server
- Run the dev command in background or a dedicated terminal:
  - `pnpm dev`
- Filter logs to surface errors:
  - `| grep -E "error|warn|ready|started|compiled"`

### 4. Validate
- Verify the server is up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` should return 200 or 307 (redirect to locale)
- Hit a known route (e.g., `http://localhost:3000/en`) and check status
- Open browser to confirm the storefront renders

### 5. Report
- Provide a short summary: dev URL, build status, env vars confirmed (without printing secret values), and any warnings or errors

## Notes
- Avoid dumping full terminal logs into context.
- Prefer `head`, `tail`, and `grep -E` for any output longer than a screen.
- Never echo `.env.local` contents or token values in command output.
- Vercel preview deploys are a separate workflow — push the branch and let CI deploy.
