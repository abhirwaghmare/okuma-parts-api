# Build Workflow

Planning workflow for implementation tasks: new features, enhancements, bug fixes, refactoring, and code quality improvements.

## Internal SDLC: Plan → Implement → Build → Review → Test → Deploy → Validate

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Pattern classification, reusability scan, implementation contract | Planner |
| **Implement** | Write code following plan's technical contract | backend-dev / frontend-dev |
| **Build** | Compile, run project build command | backend-dev / frontend-dev |
| **Review** | Code review against standards, security, performance | code-reviewer |
| **Test** | Unit tests, integration tests | junits-specialist |
| **Deploy** | Deploy to target environment | Direct execution |
| **Validate** | Full validation of deployed implementation | validation-tester |

**Autonomy:**
- S/M complexity: execute ALL phases end-to-end without asking. Notify briefly at each transition.
- L complexity: pause after Plan for user confirmation. Ask before Deploy only. All other phases execute automatically.

---

## Prerequisites (completed by planner before loading this workflow)
- Project standards read from `<code_standards>` and `<codebase_stack>`
- Input-Derived Patterns extracted if user provided visual/reference input
- code-explorer and research-intelligence invoked in parallel

---

## Step 1: Classify Pattern Category (MANDATORY)

The codebase may contain multiple coexisting patterns. Determine which governs this task:

**Pattern categories:**
- **Structural / Platform** — platform-level building blocks (page templates, layouts, navigation, breadcrumb, shared shells). Follow framework conventions and delegate to existing primitives.
- **Content-rendering / Custom** — components rendering design-driven content (hero, card, teaser, accordion, tabs, carousel). Project conventions from `<code_standards>`: custom templates, project-specific schemas/props, project service classes, design-driven CSS/JS.
- **Service / Integration** — backend services, configurations, external integrations. Project service conventions from `<code_standards>`.

**Gather evidence:**
- Check `<code_standards>` for documented patterns
- Use code-explorer findings to identify how existing similar components are built
- For content-rendering: look at existing custom component structure (template, schema/props, service class, CSS)
- For structural: look at existing platform-level component setup

**Confirm with user (MANDATORY):**
```
Pattern category: {Structural/OOTB | Content-rendering/Custom | Service/Integration | Mixed}
Rationale: {why — reference existing components}
Evidence: {2-3 existing component paths demonstrating this pattern}

Confirm?
```

If code-explorer findings contradict the selected pattern, re-confirm with user.

## Step 2: Load Planning Skills and Classify Task

- Load `planning-standards` skill → use `task-classification.md` to classify task type and estimate complexity
- If story/ticket provided → load `story-intelligence.md` from skill, invoke `story-context` skill
- If Figma URL provided → invoke `figma-context` skill
- If deployment-specific guidance applies (from `<codebase_stack>`) → load `deployment-planning.md`
- If Forms task → load `forms-planning.md`

## Step 3: Reusability Scan (MANDATORY)

- Follow `reusability-scan.md` from planning-standards skill — search codebase, apply decision matrix
- Surface findings to user: Found / Coverage / Proposed approach
- Reuse candidates MUST match the task's pattern category (do not suggest OOTB for custom, or vice versa)
- Wait for user confirmation before proceeding

## Step 4: Assess Complexity

- Apply `task-classification.md` complexity signals
- Assign T-shirt size (S/M/L) with rationale

## Step 5: Create Implementation Contract

Use `implementation-contracts.md` templates for the task type (Component/Service/Integration/Configuration).

The plan MUST include:

1. **Summary** — TL;DR (20-100 words), task type, complexity
2. **Pattern Category** — selected pattern with rationale and evidence from the codebase. If Mixed, specify which pattern governs each layer.
3. **Input-Derived Patterns** — class names, CSS conventions, structure, design tokens extracted from user input. If no input provided, state "No visual/reference input — following `<code_standards>`."
4. **Reusability Analysis** — what was found, coverage %, extend/build decision
5. **Technical Contract** — use the task-type-specific template from `implementation-contracts.md`:
   - For Components: file structure (from `<code_standards>`), prop/schema definition with actual fields, service class / data layer interface
   - For Services: interface design, method signatures, configuration, dependencies
   - For Integrations: endpoints, auth, DTOs, error handling
   - For Config: file paths, properties, environment variations
6. **File Impact** — exact files to add/modify/remove with FULL paths
7. **Execution Strategy** — see Step 6
8. **Open Questions** — unclear items needing user input

Rules:
- Technical contract sections ARE the plan — do NOT replace them with vague steps
- Component file structure and dialog structure MUST come from `<code_standards>` — not from OOTB defaults
- Include code snippets for API signatures and interface contracts only

## Step 6: Define Execution Strategy (MANDATORY)

Use the Execution Strategy section from `implementation-contracts.md`:

**Agent Assignment:**
- **backend-dev** — service classes, server actions, route handlers, integrations, backend code
- **frontend-dev** — templates/components, client bundles, JS/CSS, Storybook
- **Both** — full-stack features (component + data layer + schema/props + client bundle)
- **Main agent directly** — S-complexity single-file changes where subagent adds overhead

**Execution Mode:**
- **Parallel** — backend and frontend have no runtime dependency during implementation
- **Sequential** — one depends on the other's output
- **Mixed** — some parts parallel, some sequential

**Context Payload Per Agent:**
- Selected pattern category with evidence
- Input-Derived Patterns (class names, structure, design tokens)
- Project patterns from `<code_standards>` (file structure, dialog patterns, naming)
- File paths to create/modify
- Interface contracts and configs
- Dependencies on other agents' outputs

**SDLC Flow:** Per the Internal SDLC defined at the top of this document:
Plan → Implement → Build → Review → Test → Deploy → Validate

Phase transition rules:
- **Build** FAILS → debug, fix, rebuild. PASSES → proceed to Review.
- **Review** finds fixable issues → code-reviewer fixes, rebuilds. Architectural issues → back to dev agent.
- **Test** FAILS → fix, rebuild, re-run. PASSES → proceed to Deploy.
- **Deploy** → verify logs, confirm code active. Environment not running → notify user and stop.
- **Validate** FAILS → hand back to dev agent with failure details. PASSES → complete.

---

## Code Generation Principles (include in handoff to dev agents)

Dev agents must follow when implementing:
- **Read-Understand-Implement** — read existing code patterns BEFORE writing any code
- **Codebase is source of truth for reuse** — search before building, extend what exists, never duplicate. User-provided input takes priority for conventions and patterns.
- **YAGNI** — build only what is explicitly required, nothing speculative
- **Keep it simple** — simplest correct solution wins, favor straightforward over sophisticated
- **DRY** — single authoritative representation for every piece of logic
- **Least astonishment** — code behaves exactly as its name suggests, no surprising side effects

---

## Build Checklist (verify before presenting plan)

1. User input analyzed and Input-Derived Patterns extracted?
2. `<code_standards>` and `<codebase_stack>` read?
3. Pattern category classified and user confirmed?
4. Planning-standards skill loaded?
5. code-explorer AND research-intelligence invoked?
6. Reusability scan done and user confirmed?
7. Task classified and complexity assessed?
8. Plan uses correct template from implementation-contracts?
9. Pattern Category section with evidence included?
10. Input-Derived Patterns section included?
11. Execution Strategy with agent assignment and SDLC flow included?
12. File impact with full paths included?
13. Open questions included for unclear items?
