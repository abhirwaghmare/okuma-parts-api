# Build

## When to Use
- Starting implementation from an approved plan
- Building backend, frontend, or both
- Resuming an in-progress implementation

## Usage
```
/build
/build backend
/build frontend
/build <description of what to build>
```

## Workflow

### 1. Detect Scope
Read the approved plan's Execution Strategy to determine:
- **Backend only** — invoke `backend-dev` agent
- **Frontend only** — invoke `frontend-dev` agent
- **Both** — invoke `backend-dev` and `frontend-dev` agents per the plan's execution mode (parallel or sequential)
- **No plan exists** — ask user what to build, then invoke `planner` first

If user explicitly specified `/build backend` or `/build frontend`, use that scope directly.

### 2. Load Skills
- Load relevant domain skills based on the task
- Read `<code_standards>` from CLAUDE.md for project conventions

### 3. Activate Story (if story ID in context)
If a story ID is present in the conversation context:
- Invoke `functional-pmo` agent to move the story and all subtasks to Active/In Progress before invoking dev agents
- If no PM tool MCP is configured, functional-pmo skips the transition and proceeds

### 4. Execute Per Plan Strategy
Follow the plan's Execution Strategy:
- **Parallel**: invoke backend-dev and frontend-dev simultaneously, each with their context payload from the plan
- **Sequential**: invoke in the order specified, pass outputs forward
- **Mixed**: parallel first, then sequential steps that depend on parallel outputs

### 5. After Implementation — SDLC Continues Automatically
The implementing agents drive the remaining SDLC phases end-to-end per CLAUDE.md:
- **Build** — run project build command from `<codebase_stack>` (default for Catalyst: `pnpm build`; runs `pnpm generate` + `next build`). If build fails: debug, fix, rebuild.
- **Review** — invoke `code-reviewer`. Reviewer fixes what it finds, rebuilds, verifies. When clean: proceed.
- **Test** — invoke appropriate test agent (Vitest + RTL for unit/integration; Playwright for E2E). If tests fail: fix, rebuild, re-run. If pass: proceed.
- **Deploy** — run project deploy command from `<codebase_stack>` (default for Catalyst: `pnpm dev` locally, Vercel/Netlify preview for shared review). Verify deployment.
- **Validate** — invoke `validation-tester` agent. Complete only after validation passes.

At each phase transition, output a single status line and proceed — do not stop to ask permission between phases.

Context: $ARGUMENTS
