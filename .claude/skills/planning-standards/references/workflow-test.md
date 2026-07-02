# Test Workflow

Planning workflow for test tasks: test strategy, test planning, unit testing, integration testing, and system testing.

## Internal SDLC: Plan → Implement → Build → Review → Execute → Deploy

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Define test scope, discover conventions, create test plan | Planner |
| **Implement** | Write test code (unit tests, integration tests, E2E scripts) | junits-specialist / validation-tester |
| **Build** | Compile tests, verify they pass build | junits-specialist |
| **Review** | Review test code quality, coverage, completeness | code-reviewer |
| **Execute** | Run full test suite, collect results and coverage report | junits-specialist / validation-tester |
| **Deploy** | Deploy test infrastructure changes if any (test configs, fixtures) | Direct execution |

**Autonomy:**
- S/M complexity: execute all phases end-to-end without asking. Notify at each transition.
- L complexity: pause after Plan for user confirmation before Implement.

---

## Prerequisites (completed by planner before loading this workflow)
- Project standards read from `<code_standards>` and `<codebase_stack>`
- code-explorer invoked to understand existing test patterns

---

## Phase 1: Plan

### Identify Test Scope

| Type | Focus | Agent |
|------|-------|-------|
| **Unit Test Plan** | Unit tests for components, services, route handlers, server actions | junits-specialist |
| **Integration Test Plan** | Cross-service and API integration tests | junits-specialist + validation-tester |
| **System Test Plan** | End-to-end validation of deployed features | validation-tester |
| **Test Strategy** | Overall testing approach for a feature or project | Planner (no handoff) |
| **Coverage Improvement** | Increase test coverage for existing code | junits-specialist |

### Discover Test Conventions

From code-explorer findings and `<code_standards>`:
- Test framework: project's test runner (Vitest, Jest, JUnit, etc.)
- Mock library: project's mock library (MSW, Mockito, etc.)
- Test location: co-located vs separate test directory
- Test naming convention: {ClassName}Test, {ClassName}Spec, etc.
- Existing test utilities and helpers
- Current coverage baseline (if measurable)

### Create Test Plan

**For Unit Tests:**
- List classes/methods to test
- For each: happy path, edge cases (null, empty, boundary), error states
- Identify mock requirements (HTTP clients, external APIs, framework helpers, service classes)
- Target: minimum 80% coverage

**For Integration Tests:**
- List integration points to test
- Define test scenarios: success, failure, timeout, auth failure
- Identify test environment requirements

**For System Tests:**
- List features/pages to validate
- Define test cases: functional, accessibility (WCAG 2.2 AA), performance, responsive
- Identify validation URL and environment

**For Test Strategy:**
- Test pyramid: unit > integration > system ratios
- Coverage targets by layer
- Tools and frameworks
- CI/CD integration

**For Coverage Improvement:**
- Identify untested or under-tested classes
- Prioritize by risk (public APIs, business logic, integrations)
- Define target coverage per class

### Present Test Plan

```
## Test Plan: {Feature/Scope}

**Test Type:** {Unit | Integration | System | Strategy | Coverage}
**Complexity:** {S/M/L}

### Internal SDLC: Plan → Implement → Build → Review → Execute → Deploy

### Test Conventions (from codebase)
{Framework, naming, location, existing utilities}

### Test Cases
| ID | Description | Type | Priority |
|----|-------------|------|----------|
| T1 | {description} | {happy/edge/error} | {high/medium/low} |

### Mock Requirements
{What needs to be mocked and how — specific to project's mock library}

### Coverage Target
{Percentage target with rationale}

### Agent Assignment
| Phase | Agent | Scope |
|-------|-------|-------|
| Implement | junits-specialist | {unit/integration test code} |
| Implement | validation-tester | {system/E2E test scripts} |
| Review | code-reviewer | {test code quality review} |
| Execute | junits-specialist | {run tests, report coverage} |

### Open Questions
{Unclear items}
```

## Phase 2: Implement

- junits-specialist writes unit/integration test code following project conventions
- validation-tester creates E2E test scripts (if system tests)
- Follow test naming and structure from `<code_standards>`
- Match mock patterns from existing tests in the codebase

## Phase 3: Build

- Run project build command from `<codebase_stack>` to compile tests
- FAILS: debug compilation errors, fix, rebuild
- PASSES: proceed to Review

## Phase 4: Review

- Invoke code-reviewer on test files
- Review focus: test quality, coverage completeness, mock correctness, edge case coverage
- Reviewer fixes issues directly if fixable, rebuilds after fixes
- Architectural issues (wrong test approach) → back to Implement

## Phase 5: Execute

- Run full test suite using project test command from `<codebase_stack>`
- Collect results: pass/fail counts, coverage report
- If tests FAIL due to implementation bugs → hand back to backend-dev or frontend-dev with failure details
- If tests FAIL due to test bugs → fix tests, rebuild, re-execute
- If tests PASS and coverage >= 80% → proceed to Deploy

## Phase 6: Deploy

- If test infrastructure changes were made (new test configs, fixtures, CI pipeline updates) → deploy them
- If no infrastructure changes → skip this phase
- Verify test suite runs in CI/CD pipeline (if applicable)
- Report final results: pass/fail, coverage %, any known gaps
