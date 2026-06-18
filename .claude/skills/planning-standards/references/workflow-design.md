# Design Workflow

Planning workflow for design tasks: high-level design (HLD), low-level design (LLD), architecture decisions, and pattern selection.

## Internal SDLC: Plan → Research → Design → Review → Document

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Identify design scope, classify pattern category | Planner |
| **Research** | Codebase exploration + external doc research | code-explorer + research-intelligence |
| **Design** | Create HLD/LLD/ADR/pattern recommendation | Planner (+ solutions-architect if complex) |
| **Review** | Architecture validation, trade-off analysis | solutions-architect (if needed) |
| **Document** | Finalize design document, present to user | Planner |

**Autonomy:**
- S/M complexity: execute all phases end-to-end. Present design at the end.
- L complexity: pause after Design to get architecture review before finalizing.

---

## Prerequisites (completed by planner before loading this workflow)
- Project standards read from `<code_standards>` and `<codebase_stack>`
- Input-Derived Patterns extracted if visual/reference input provided
- code-explorer and research-intelligence invoked in parallel

---

## Phase 1: Plan

Identify the design scope:

| Type | Focus | Output |
|------|-------|--------|
| **HLD** | System architecture, component interactions, data flow | Architecture overview with component responsibilities |
| **LLD** | Detailed class design, interface contracts, data models | Detailed design with interface definitions |
| **Architecture Decision** | Specific technical choice with trade-offs | ADR (Architecture Decision Record) |
| **Pattern Selection** | Which codebase pattern applies to a task | Pattern recommendation with evidence |

### Classify Pattern Category (MANDATORY for HLD/LLD)

Determine which codebase pattern governs this design:
- **Structural / OOTB** — platform-level, Core Component conventions
- **Content-rendering / Custom** — design-driven, project conventions from `<code_standards>`
- **Service / Integration** — backend services, project service conventions

**Gather evidence:**
- Check `<code_standards>` for documented patterns
- Use code-explorer findings to identify how existing similar components are built

**Confirm with user (MANDATORY):**
```
Pattern category: {Structural/OOTB | Content-rendering/Custom | Service/Integration | Mixed}
Rationale: {why — reference existing components}
Evidence: {2-3 existing component paths demonstrating this pattern}

Confirm?
```

Assess complexity (S/M/L) and apply autonomy rules.

## Phase 2: Research

- code-explorer findings: existing components, services, patterns relevant to the design
- research-intelligence findings: platform capabilities, API docs, best practices
- Fill gaps with WebFetch or Grep if subagent results are incomplete

## Phase 3: Design

**For HLD:**
- Define system boundaries and component responsibilities
- Map component interactions and data flow
- Identify integration points and external dependencies
- Define scalability and performance approach
- Consider security boundaries and access control

**For LLD:**
- Define interface contracts with method signatures
- Define data models (resource types, schemas, content structures)
- Define component schema/props structure (if component — from `<code_standards>` patterns)
- Define API contracts (if service/integration)
- Map dependency chains

**For Architecture Decision:**
- State the problem and constraints
- Evaluate alternatives internally — present single recommendation (not options list)
- Document trade-offs (performance, maintainability, complexity)
- Provide recommendation with rationale

**For Pattern Selection:**
- Scan codebase for existing patterns via code-explorer
- Classify pattern categories present in the codebase
- Match the task to the correct pattern with evidence
- Present evidence (2-3 existing components) and confirm with user

## Phase 4: Review

- For S/M: self-review the design for completeness, consistency, and technical soundness
- For L: hand off to solutions-architect for architecture validation
- solutions-architect returns a single recommendation with trade-off analysis
- Incorporate review feedback into the design

## Phase 5: Document

Present the finalized design:

```
## {Design Type}: {Title}

**Scope:** {What is being designed}
**Pattern Category:** {Selected pattern with rationale and evidence}
**Complexity:** {S/M/L}

### Design
{Type-specific content from Phase 3}

### Interface Contracts
{Method signatures, data models, API contracts — code snippets only}

### File Impact
{Exact files that would be created/modified — FULL paths}

### Risks and Considerations
{Technical risks, performance implications, security considerations}

### Next Steps
{Recommend Build category for implementation, or further Design if incomplete}

### Open Questions
{Items needing clarification}
```

After design approval → recommend Build category task with the design as input.
