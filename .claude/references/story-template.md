# Story Template

Used by functional-pmo when creating or updating stories in ADO or Jira. Sections map 1:1 to planner output. Populate every section from the approved plan. Omit sections that do not apply -- do not leave empty placeholders.

## Rules

1. Follow this section order -- do not invent new sections
2. Keep language concise, professional, non-technical where possible
3. Scope bullets use `module.path` -> `path/to/files` for traceability
4. One deliverable per bullet -- no compound sentences
5. Total description should not exceed 800 words
6. Format per the active PM tool (see bottom of this file)

---

## Parent Story Template

### Proposed Title
`{Category} | {Component/Feature} | {Short behavior description}`
Categories: `Dev`, `Config`, `Bug`, `Refactor`, `Test`, `Docs`

### Context
- 1-3 sentences: current state, what needs to change
- Reference parent epic/feature if applicable: "Parent: #{ID}"
- Call out UX sign-off, analytics, or validation requirements

### Business Objective
- 1-2 sentences from end-user or business perspective
- What does the user gain? What problem is solved?
- Keep non-technical -- a BA or PO should understand this

### Input Context
| Source | Reference |
|--------|-----------|
| Figma | {URL, frame, node IDs -- or N/A} |
| Storybook | {reference -- or N/A} |
| Live site | {URL -- or N/A} |
| Story/Ticket | {ADO ID or Jira key -- or N/A} |

### Input-Derived Patterns
- Class names and CSS naming convention extracted from input
- Component structure and hierarchy
- Design tokens: colors, typography, spacing, breakpoints
- Interaction patterns: hover states, animations, responsive behavior
- If no visual input: "No visual input -- following project code standards"

### Acceptance Criteria
- [ ] {Functional criterion -- what the feature must do}
- [ ] {Non-functional criterion -- performance, accessibility, security}
- [ ] {Design fidelity criterion -- if visual spec was provided}
- [ ] {Hidden/implicit requirements -- WCAG 2.2 AA, i18n, caching, responsive}

### Reusability Analysis
- Components/services evaluated: {what was searched}
- Coverage: {X%}
- Decision: {EXTEND existing / BUILD new / CONFIGURE existing}
- Rationale: {why -- 1-2 sentences}
- If EXTEND: inherited features from parent, net-new scope only

### Technical Contract
Include the task-type-specific contract from the plan:
- **Component**: file structure, prop/schema definition, template/page nodes, architecture decision (extend vs build), inherited features, net-new scope
- **Service**: interface design, key methods, dependencies, configuration, implementation patterns
- **Integration**: external system, auth, endpoints, request/response models, security/resilience
- **Configuration**: config type, location, environment, properties, deployment considerations
- Include API signatures, interface contracts, and ASCII architecture diagrams from the plan
- Include Figma node references per component so dev agents can do targeted extraction

### Front End Scope
- **{module.path}** -- `{folder/path}`: {what to create or change}
  - {sub-deliverable: specific file or behavior}
- **Accessibility** -- WCAG 2.2 AA: {specific deliverables, or "None"}
- **Storybook** -- {story additions/updates, or "N/A"}
- **Analytics** -- {tracking changes, or "None"}

### Back End Scope
- **{module.path}** -- `{folder/path}`: {what to create or change}
  - {sub-deliverable: specific class, method, or config}

### File Impact
| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `{full path}` | {what and why} |
| MODIFY | `{full path}` | {what and why} |
| REMOVE | `{full path}` | {what and why} |

### Execution Strategy
| Item | Value |
|------|-------|
| Complexity | {S / M / L} |
| Autonomy | {Auto end-to-end / Ask before deploy} |
| Agent assignment | {backend-dev / frontend-dev / both} |
| Execution mode | {parallel / sequential / mixed} |
| SDLC flow | Implement > Build > Review > Test > Deploy > Validate |

Context payloads per agent: {what each agent needs -- file paths, interface contracts, design tokens, Figma nodes, config requirements}

### Out of Scope
- {What this story intentionally does not cover}

### Dependencies / Blockers
- {Upstream story, API contract, design sign-off, environment dependency}

### Open Questions
- {Unresolved items from the plan needing user input}

### Subtasks
List only subtasks that apply. Do not include roles with no work.
| Role | Task ID | Status |
|------|---------|--------|
| {role} | {ID after creation} | New |

---

## Subtask Description Guidance

Each subtask gets scoped content from the parent plan -- not the full story, not a one-liner.

**Backend Development subtask:**
- Summary: 1-liner of what backend work this covers
- Technical Contract: backend-relevant sections only (server actions, route handlers, service classes, GraphQL documents, integrations, config)
- Interface contracts and API signatures
- File Impact: backend files only (TypeScript service modules, GraphQL documents, route handlers, configs)
- Acceptance Criteria: backend-testable items only

**Frontend Development subtask:**
- Summary: 1-liner of what frontend work this covers
- Input-Derived Patterns: design tokens, class names, CSS conventions
- Figma node references for targeted component-level extraction
- File Impact: frontend files only (TSX/JSX components, Tailwind utilities, CSS modules, client bundles)
- Acceptance Criteria: UI, accessibility, responsive items only

**Unit Testing subtask:**
- Summary: 1-liner of what to test
- Classes to test from backend and frontend scope
- Coverage target (default 80% line coverage)
- Edge cases: null, empty, boundary values, error states
- File Impact: test files only

---

## PM Tool Field Mapping

| Field | ADO | Jira |
|-------|-----|------|
| Title | `System.Title` | `summary` |
| Description | `System.Description` (HTML) | `description` (ADF) |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` field if available, else in description | Checklist in description body |
| Story Points | `Microsoft.VSTS.Scheduling.StoryPoints` | Retrieve field ID from project metadata before setting |
| Tags/Labels | `System.Tags` (semicolon-separated) | `labels` (array) |
| Parent | `System.Parent` = parent work item ID | `parent` = parent issue key |
| Area Path | `System.AreaPath` | N/A (use `components` field) |
| Iteration/Sprint | `System.IterationPath` | `sprint` field |
| Priority | `Microsoft.VSTS.Common.Priority` (1-4) | `priority` (object with id) |
| Subtask type | "Task" with `System.Parent` | "Sub-task" with `parent` |

---

## Formatting by PM Tool

**ADO** -- convert to HTML: headings to `<h3>`, bullets to `<ul><li>`, tables to `<table>`, bold to `<strong>`, code to `<code>`, checkboxes to `<input type="checkbox" disabled>`. Escape `<`, `>`, `&` in paths.

**Jira** -- use ADF: headings as `heading` nodes, bullets as `bulletList`, tables as `table` nodes, checkboxes as `taskList` with `taskItem`, bold as `strong` mark, code as `code` mark.

**Manual fallback** -- standard markdown, clean enough to copy-paste into any tool.
