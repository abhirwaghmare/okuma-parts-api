# Maintain Workflow

Planning workflow for maintenance tasks: code review, documentation, debugging, and knowledge sharing.

Each maintenance type has its own internal SDLC:

## Internal SDLC by Maintenance Type

### Code Review: Plan → Review → Fix → Build → Deploy → Verify

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Identify scope, focus areas, review checklist | Planner |
| **Review** | Execute code review against standards, security, performance | code-reviewer |
| **Fix** | Fix issues found during review | code-reviewer (simple) / backend-dev or frontend-dev (architectural) |
| **Build** | Rebuild after fixes | code-reviewer / dev agent |
| **Deploy** | Redeploy fixed code | Direct execution |
| **Verify** | Confirm fixes work, no regressions | validation-tester (if deployed) |

### Documentation: Plan → Draft → Review → Publish

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Identify doc type, audience, scope, structure | Planner |
| **Draft** | Create documentation content | docs-scribe |
| **Review** | Review for accuracy, completeness, audience fit | Planner self-review |
| **Publish** | Commit/merge documentation files | docs-scribe |

### Debugging: Plan → Investigate → Fix → Build → Test → Deploy → Verify

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Define symptom, gather evidence, identify investigation scope | Planner |
| **Investigate** | Trace execution, examine state, identify root cause | backend-dev / frontend-dev |
| **Fix** | Minimal change addressing root cause | backend-dev / frontend-dev |
| **Build** | Compile after fix | backend-dev / frontend-dev |
| **Test** | Run affected tests, verify fix | junits-specialist |
| **Deploy** | Deploy the fix | Direct execution |
| **Verify** | Confirm bug is resolved, no regressions | validation-tester |

### Knowledge Sharing: Plan → Create → Review

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Identify topic, audience, format | Planner |
| **Create** | Produce content (docs, walkthrough, explanation) | docs-scribe / direct |
| **Review** | Review for accuracy and clarity | Planner self-review |

**Autonomy (all maintenance types):**
- S/M complexity: execute all phases end-to-end without asking. Notify at each transition.
- L complexity: pause after Plan for user confirmation before execution.

---

## Prerequisites (completed by planner before loading this workflow)
- Project standards read from `<code_standards>` and `<codebase_stack>`
- code-explorer invoked to understand scope

---

## Phase 1: Plan (all types)

### Identify Maintenance Type

| Type | Focus | Primary Agent |
|------|-------|---------------|
| **Code Review** | Standards compliance, security, performance, quality | code-reviewer |
| **Documentation** | Architecture docs, ADRs, runbooks, READMEs | docs-scribe |
| **Debugging** | Root cause analysis, hypothesis-driven investigation | backend-dev / frontend-dev |
| **Knowledge Sharing** | Technical explanations, onboarding material | docs-scribe or direct |

### Scope the Work

**For Code Review:**
- Identify files/features to review
- Determine focus: security, performance, accessibility, standards compliance, or general
- Check for recent changes (git log) to prioritize review areas

**For Documentation:**
- Identify documentation type: architecture, ADR, runbook, README, API docs
- Identify target audience: developers, operations, architects
- Check existing documentation for gaps and outdated content

**For Debugging:**
- Understand the symptom: what's failing, when, where
- Gather evidence: error logs, stack traces, reproduction steps
- Identify the investigation scope

**For Knowledge Sharing:**
- Identify the topic and audience
- Determine format: documentation, walkthrough, or direct explanation

### Present Maintenance Plan

**For Code Review:**
```
## Code Review Plan

**Scope:** {Files/features to review}
**Focus:** {Security | Performance | Accessibility | Standards | General}
**Complexity:** {S/M/L}

### Internal SDLC: Plan → Review → Fix → Build → Deploy → Verify

### Review Checklist
- [ ] Security: XSS, injection, hardcoded secrets, CSRF
- [ ] Logic: null safety, edge cases, error handling
- [ ] Standards: <code_standards> compliance
- [ ] Performance: N+1 queries, caching, resource lifecycle

### Agent Assignment
| Phase | Agent |
|-------|-------|
| Review + Fix | code-reviewer |
| Build | code-reviewer |
| Deploy | Direct |
| Verify | validation-tester |
```

**For Documentation:**
```
## Documentation Plan

**Type:** {Architecture | ADR | Runbook | README | API}
**Audience:** {Developers | Operations | Architects}
**Complexity:** {S/M/L}

### Internal SDLC: Plan → Draft → Review → Publish

### Scope
{What to document, why}

### Structure
{Proposed sections and content outline}

### Agent: docs-scribe
```

**For Debugging:**
```
## Debug Plan

**Symptom:** {What's failing}
**Evidence:** {Error logs, reproduction steps}
**Complexity:** {S/M/L}

### Internal SDLC: Plan → Investigate → Fix → Build → Test → Deploy → Verify

### Investigation Steps
1. {Trace execution path}
2. {Examine state at failure point}
3. {Identify root cause}

### Hypothesis
{Initial hypothesis based on evidence — "Issue occurs because [reason]"}

### Verification
{How to test the hypothesis before fixing}

### Agent Assignment
| Phase | Agent |
|-------|-------|
| Investigate + Fix | backend-dev / frontend-dev |
| Build | dev agent |
| Test | junits-specialist |
| Deploy | Direct |
| Verify | validation-tester |
```

---

## Execution Phases (type-specific)

### Code Review Execution

**Review:** code-reviewer scans all files in scope against `<code_standards>`, security, performance, quality.

**Fix:** code-reviewer fixes issues directly (style, logic bugs, missing checks). Architectural issues → hand back to backend-dev or frontend-dev.

**Build:** Rebuild using project build command from `<codebase_stack>` after all fixes. FAILS: debug, fix, rebuild. PASSES: proceed.

**Deploy:** Redeploy fixed code using deploy command from `<codebase_stack>`. If no code changes → skip.

**Verify:** If deployed, invoke validation-tester for smoke test. Confirm fixes work, no regressions.

### Documentation Execution

**Draft:** docs-scribe creates content following the proposed structure.

**Review:** Self-review for technical accuracy against codebase, completeness, audience fit.

**Publish:** Commit documentation files. Report files created/updated with paths.

### Debug Execution

**Investigate:** Trace execution, examine state at failure point, identify root cause.

**Fix:** Minimal change addressing root cause, not symptoms.

**Build:** Rebuild. FAILS: debug build error, fix, rebuild. PASSES: proceed.

**Test:** Run affected tests. If tests fail → fix, rebuild, re-test. If tests pass → proceed.

**Deploy:** Deploy the fix using deploy command from `<codebase_stack>`.

**Verify:** Invoke validation-tester. Confirm bug is resolved, no regressions.

### Debug Methodology

1. **Investigate** — trace execution, examine state at failure, identify root cause
2. **Hypothesize** — "Issue occurs because [reason]" with evidence
3. **Validate** — test hypothesis before fixing
4. **Fix** — minimal change addressing root cause, not symptoms
5. **Verify** — run tests, check edge cases

FORBIDDEN: "Let's try X", "This might work", "Add null check" without understanding why.
