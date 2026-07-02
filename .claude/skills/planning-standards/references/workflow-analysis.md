# Analysis Workflow

Planning workflow for analysis tasks: discovery, requirements gathering, NFR analysis, and technical feasibility assessment.

## Internal SDLC: Plan → Research → Analyze → Document → Review

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Identify analysis type, define scope and objectives | Planner |
| **Research** | Gather context from codebase, external docs, story/ticket | code-explorer + research-intelligence |
| **Analyze** | Conduct the analysis per type (discovery/requirements/NFR/feasibility) | Planner |
| **Document** | Produce the analysis report with findings and recommendations | Planner |
| **Review** | Self-review report quality, present to user for feedback | Planner |

**Autonomy:**
- S/M complexity: execute all phases end-to-end. Present report at the end.
- L complexity: pause after Research to confirm scope before proceeding to Analyze.

---

## Prerequisites (completed by planner before loading this workflow)
- Project standards read from `<code_standards>` and `<codebase_stack>`
- code-explorer invoked to understand current codebase state

---

## Phase 1: Plan

Identify the analysis type and define scope:

| Type | Focus | Output |
|------|-------|--------|
| **Discovery** | Scope definition, stakeholder needs, existing solutions | Discovery report with scope and recommendations |
| **Requirements** | Functional and non-functional requirements extraction | Requirements document with acceptance criteria |
| **NFR Analysis** | Performance, security, scalability, accessibility requirements | NFR specification with measurable targets |
| **Feasibility** | Technical viability, risk assessment, effort estimation | Feasibility report with go/no-go recommendation |

Assess complexity (S/M/L) and apply autonomy rules.

## Phase 2: Research

- **Codebase scan** — code-explorer results showing current state, existing capabilities, and constraints
- **External research** — invoke research-intelligence for platform capabilities, limitations, and best practices relevant to the analysis
- **Story/ticket context** — if provided, invoke story-context skill to extract requirements

For L complexity: present research findings and confirm scope before proceeding.

## Phase 3: Analyze

**For Discovery:**
- Identify scope boundaries (what's in, what's out)
- Map existing solutions in the codebase
- Identify gaps between current state and desired state
- List stakeholders and their concerns

**For Requirements:**
- Extract functional requirements from user input/story
- Identify non-functional requirements (performance, security, accessibility, i18n)
- Detect hidden/implicit requirements (WCAG compliance, CDN/caching, i18n)
- Define acceptance criteria with pass/fail conditions

**For NFR Analysis:**
- Identify applicable NFR categories (performance, security, scalability, accessibility, reliability)
- Define measurable targets for each (response time < Xms, Lighthouse > Y, WCAG 2.2 AA)
- Assess current state against targets
- Identify gaps and remediation effort

**For Feasibility:**
- Assess technical viability against the project's stack and architecture from `<codebase_stack>`
- Identify risks and mitigation strategies
- Estimate effort (S/M/L) with rationale
- Provide go/no-go recommendation with conditions

## Phase 4: Document

Produce the analysis report:

```
## {Analysis Type} Report

**Scope:** {What was analyzed}
**Complexity:** {S/M/L}
**Context:** {Project architecture, relevant codebase findings}

### Findings
{Type-specific findings from Phase 3}

### Recommendations
{Actionable next steps — suggest Design or Build as the follow-up SDLC category}

### Risks and Constraints
{Technical risks, dependencies, blockers}

### Open Questions
{Items needing clarification}
```

## Phase 5: Review

- Self-review: Is the report complete, accurate, and actionable?
- Present to user for feedback
- If analysis reveals a Build or Design need → recommend starting a new task with that category
- If deep architecture analysis needed → hand off to solutions-architect
