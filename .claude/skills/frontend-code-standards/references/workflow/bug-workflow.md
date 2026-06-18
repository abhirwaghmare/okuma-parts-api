# Bug Analysis and Debug Workflow

## Table of Contents
1. Bug Analysis Phases
2. Precision Targeting
3. Fix Execution
4. Debug Workflow
5. Complexity Scoring

---

## 1. Bug Analysis Phases

### Phase 1: Source Intake

When a bug is provided (ADO/Jira ID or description):
1. Load the work item via `story-context` skill if an ID is provided
2. Extract: title, description, reproduction steps, affected component, error messages
3. Identify work item type: Bug, Defect, or Regression

### Phase 2: Codebase Analysis

Read the affected files before forming any hypothesis:
1. Identify the component from the bug description
2. Read the component folder completely (HTML, LESS, JS)
3. Read related Storybook stories and Playwright tests
4. Search for the specific selector, variable, or function mentioned in the bug

Never form a fix hypothesis without reading the affected code first.

### Phase 3: Root Cause Analysis

Apply hypothesis-driven debugging:

```
Hypothesis: "The bug occurs because [specific technical reason]"
Evidence: [File:Line that confirms this]
Impact: [What other areas are affected]
Fix: [Minimal change that addresses root cause, not symptom]
```

Forbidden: "Let's try X", "This might work", "Add null check" without understanding why the null occurs.

### Phase 4: Fix Scope Assessment

Before implementing, determine:
- Is this a CSS-only change? (low risk — style fix)
- Does it affect JS logic? (medium risk — test coverage required)
- Does it affect the component structure/partials? (higher risk — all variants must be tested)
- Does it affect shared globals or variables? (highest risk — may affect many components)

---

## 2. Precision Targeting

Match the fix scope to the bug scope. Do not refactor surrounding code. Never apply blanket changes — identify exactly what is broken, fix only that, and verify nothing else was affected.

### File-level targeting

| Bug type | Fix scope | Files to change |
|---|---|---|
| Visual misalignment | CSS/LESS only | `default.less` or `variable.less` |
| RTL layout issue | LESS logical properties | `rtl.less` or `default.less` |
| Printer layout | Print styles only | `printer.less` |
| JS interaction bug | JS only | `js/{component}.js` |
| Handlebars render bug | Partial only | `{component}-partial.html` |

### Breakpoint/device-level targeting

Before touching any code, determine the exact scope from the bug evidence:

| Evidence | Target |
|---|---|
| "Mobile padding is wrong" | `@media (max-width: 767px)` only |
| "Desktop alignment broken" | `@media (min-width: 1200px)` only |
| "RTL layout misaligned" | RTL-scoped rules only |
| "Dark theme color wrong" | Dark theme variant only |
| "All breakpoints affected" | Base styles (no media query) |
| Unclear scope | ASK the user before proceeding |

```less
// Correct — targets only the affected breakpoint
@media (max-width: 767px) {
    .cmp-component__title {
        padding: 1rem;
    }
}

// Wrong — blanket change affects all breakpoints unintentionally
.cmp-component__title {
    padding: 1rem;
}
```

After fixing, verify:
- The fixed device/breakpoint is resolved
- All other breakpoints are unchanged
- Storybook stories for all variants still render correctly
| Storybook render bug | Story file only | `{component}.stories.js` |
| Variable value wrong | Variable only | `variable.less` |
| ARIA / a11y issue | HTML + CSS | `*-partial.html` + `default.less` |

Never change files outside the fix scope unless the root cause analysis explicitly requires it.

---

## 3. Fix Execution

1. Create a fix branch: `bugfix/{work-item-id}-{sanitized-description}`
2. Read the affected files fully before editing
3. Implement the minimal fix
4. Wrap changed lines in AI code markers if AI-generated
5. Run build: `npm run build`
6. Run linting: `npm run lint`
7. Run Playwright tests: `npx playwright test {component-name}.spec.js`
8. Visually verify the fix in Storybook
9. Check that no other components are broken

---

## 4. Debug Workflow

For bugs that are not immediately obvious:

### Step 1: Reproduce

Reproduce the bug in Storybook before touching code:
```bash
npm run storybook
# Navigate to the affected story
# Verify the bug is visible
```

If the bug is not reproducible in Storybook, check if it requires specific runtime content or configuration.

### Step 2: Isolate

Use browser DevTools to identify:
- Which CSS rule is causing the visual issue (Computed tab)
- Which JS event is not firing (Event Listeners tab)
- Which element has missing or incorrect ARIA attributes (Accessibility tab)

### Step 3: Trace

For JS bugs, add temporary debug logging:
```javascript
console.debug('[{component-name}] state:', { element, value });
```
Remove all debug logging before committing.

### Step 4: Fix and Verify

After fixing:
- Verify the original bug is resolved
- Verify no regression in related stories
- Run axe-core to confirm no new a11y violations introduced

---

## 5. Complexity Scoring

Use this to determine effort estimate:

| Score | Criteria |
|---|---|
| Low | CSS-only change, single file, no logic change |
| Medium | JS change, multiple files, test updates required |
| High | Structural change (partials, folder), multiple variants affected, shared variable change |
| Critical | Shared globals change, may affect all components, requires regression testing |

For High/Critical complexity bugs:
- Get peer review before implementing
- Run the full Playwright suite after fixing
- Document the root cause and fix in the PR description
