# Frontend Modernization Workflow

## Table of Contents
1. When to Modernize
2. Assessment
3. Modernization Strategy
4. Implementation Order
5. Verification
6. Definition of Done
7. Official References

---

## 1. When to Modernize

Modernize when legacy frontend patterns slow delivery, increase bundle size, or create repeated defects.

Common triggers:
- Unsupported or deprecated framework/tooling versions
- Build times that block delivery
- Repeated accessibility or responsive regressions
- Large amounts of custom CSS/JS that duplicate platform features
- Old browser support assumptions that no longer match actual traffic

Do not start with a rewrite by default. Prefer incremental replacement with measurable outcomes.

---

## 2. Assessment

Establish the current state before choosing tools or migration scope.

Assessment checklist:
- Inventory frameworks, bundler, test stack, Storybook version, and browser targets
- Identify deprecated dependencies and unsupported versions
- Capture baseline metrics: build time, bundle size, Web Vitals, test duration, and top JS errors
- List high-churn components and user journeys with the most regressions
- Confirm which legacy browser constraints are still real from analytics

Useful output:

| Area | Questions to answer |
|---|---|
| Browser support | What browsers do users actually use today? |
| UI stack | Which parts are framework code, server-rendered templates, or static assets? |
| Design system | What can be standardized instead of reimplemented? |
| Testing | What coverage protects migration work? |
| Release risk | Which journeys need flags, canary rollout, or parallel run? |

---

## 3. Modernization Strategy

Preferred order:

1. Set a target browser policy
2. Upgrade tooling needed for safe delivery
3. Stabilize tests and Storybook coverage
4. Migrate shared foundations
5. Replace legacy components incrementally
6. Remove dead code and old dependencies

Choose the smallest strategy that reduces risk:

| Strategy | Use when |
|---|---|
| In-place refactor | Same framework, outdated patterns, manageable scope |
| Strangler pattern | Legacy and modern UI must coexist temporarily |
| Route-by-route migration | App has clear page or route boundaries |
| Component-by-component migration | Shared design system can be upgraded first |

Rules:
- Keep old and new paths comparable during migration
- Put high-risk changes behind flags
- Use official migration guides and codemods when the framework provides them
- Avoid mixing architecture changes, design refresh, and product scope in one migration PR

---

## 4. Implementation Order

Modernize in this order unless the codebase clearly requires a different path:

### A. Tooling and Support Matrix

- Update Node/package manager versions required by the repo
- Define `browserslist` or equivalent target explicitly
- Align Babel/PostCSS/Autoprefixer and linting to the support target

### B. Quality Guardrails

- Ensure `npm run build`, `npm run lint`, `npm run test`, and `npm run build-storybook` are stable
- Add Playwright smoke tests for core journeys before moving high-risk UI
- Capture visual baselines for reusable components

### C. Shared Frontend Foundations

- Consolidate tokens, spacing, typography, and color usage
- Replace duplicated utility code with shared helpers
- Remove obsolete polyfills once browser support is redefined

### D. Component and Route Migration

- Start with low-dependency components to prove the pattern
- Migrate high-churn or high-value journeys next
- Keep adapters around temporary boundaries instead of forcing a full rewrite

### E. Cleanup

- Delete dead styles, legacy entry points, and unused packages
- Remove compatibility layers once no callers remain
- Update docs, onboarding notes, and release guidance

---

## 5. Verification

Track improvement with before/after metrics:

| Metric | Expected direction |
|---|---|
| Build time | Down |
| Initial JS/CSS size | Down |
| Lighthouse/Web Vitals | Up or stable |
| Accessibility issues | Down |
| Flaky tests | Down |
| Lead time for UI changes | Down |

Verification steps:
- Run the full quality gates on each migration slice
- Test changed journeys in Storybook and real app flows
- Validate browser support against the defined target, not old assumptions
- Monitor production errors after each rollout

---

## 6. Definition of Done

- [ ] Browser support target is documented and current
- [ ] Tooling upgrades are complete and supported
- [ ] Core tests and Storybook coverage protect migrated areas
- [ ] High-risk releases are behind feature flags
- [ ] Legacy code replaced in the targeted slice
- [ ] Dead dependencies, styles, and polyfills are removed
- [ ] Performance and stability metrics are equal or better after rollout
- [ ] Docs are updated for the new workflow

---

## 7. Official References

- Web Platform Baseline: https://web.dev/baseline/
- Browserslist queries and support targets: https://browsersl.ist/
- Storybook docs and isolated UI development: https://storybook.js.org/docs
