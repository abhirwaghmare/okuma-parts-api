# Frontend Release Workflow

## Table of Contents
1. Release Readiness
2. Versioning
3. Release Candidate Flow
4. Deployment and Verification
5. Rollback
6. Checklist
7. Official References

---

## 1. Release Readiness

Use a release only when the branch is already merge-ready. Do not use the release window to finish incomplete frontend work.

Minimum gates before cutting a release candidate:

| Gate | Typical command | Severity |
|---|---|---|
| Clean install | `npm ci` | Critical |
| Production build | `npm run build` | Critical |
| Lint | `npm run lint` | Critical |
| Unit tests | `npm run test` | Critical |
| Storybook build | `npm run build-storybook` | Critical |
| E2E smoke | `npx playwright test --grep @smoke --retries=2` | Critical |
| Accessibility smoke | axe-core via Playwright | Critical |

Release readiness rules:
- Freeze scope before the release candidate is created
- Move risky or incomplete work behind feature flags
- Confirm analytics, monitoring, and error tracking are enabled
- Confirm rollback path before deployment starts

---

## 2. Versioning

Use semantic versioning unless the repo has a different documented standard.

| Change type | Version bump | Example |
|---|---|---|
| Breaking UI contract, removed prop/API, incompatible markup/CSS contract | Major | `3.0.0` |
| Backward-compatible feature, new component variant, additive capability | Minor | `2.4.0` |
| Bug fix, styling correction, dependency patch with no contract change | Patch | `2.4.3` |

Rules:
- Do not reuse or mutate an existing release tag
- Keep release notes tied to the exact shipped commit
- Call out breaking changes, migrations, and flag defaults explicitly

---

## 3. Release Candidate Flow

Recommended sequence:

1. Create a release branch: `release/{version}` or use the repo's existing release mechanism
2. Update version metadata and changelog/release notes
3. Build the production artifact from the exact release commit
4. Deploy first to staging or pre-production
5. Run smoke tests against the deployed environment
6. Get product or QA sign-off for visible frontend changes
7. Promote the same artifact to production

Release notes should include:
- What changed for users
- Components, routes, or journeys affected
- Required feature flag changes
- Known limitations
- Rollback trigger and owner

---

## 4. Deployment and Verification

Prefer deploy-then-release:
- Deploy the artifact first
- Verify core journeys in production-safe mode
- Turn on feature flags gradually if needed

Post-deploy verification:

| Area | What to check |
|---|---|
| Availability | App loads, CDN assets resolve, no missing chunks |
| Core journeys | Login, navigation, search, form submit, checkout or equivalent |
| Observability | No spike in JS errors, failed network calls, or Web Vitals regressions |
| Accessibility | Keyboard path and focus state on changed flows |
| Flags/config | Intended environment values and flag defaults are active |

For high-risk releases:
- Use percentage rollout or internal-only rollout first
- Watch logs and client-side errors for 15-30 minutes before widening exposure
- Keep the engineer who shipped the change available through verification

---

## 5. Rollback

Rollback must be decided before release, not during an incident.

| Failure type | Preferred response |
|---|---|
| Feature is bad but deploy is healthy | Turn the feature flag off |
| Runtime config is wrong | Correct config and redeploy only if required |
| Broken production artifact | Roll back to the last known good artifact |
| Data or API contract issue | Coordinate rollback with backend before widening impact |

Rules:
- Keep the previous production artifact available
- Do not hotfix directly in production without a tracked commit
- After rollback, capture root cause, blast radius, and prevention action in the PR or incident note

---

## 6. Checklist

- [ ] Scope frozen for the release candidate
- [ ] `npm ci` completed successfully
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build-storybook` passes
- [ ] Playwright smoke coverage passes on the release candidate
- [ ] Accessibility smoke passes on changed flows
- [ ] Version bump matches semantic impact
- [ ] Release notes are written from the shipped commit
- [ ] Feature flags and environment values are confirmed
- [ ] Rollback owner and method are documented

---

## 7. Official References

- Semantic Versioning: https://semver.org/
- Playwright retries and CI stabilization: https://playwright.dev/docs/test-retries
- Storybook build workflow: https://storybook.js.org/docs/api/main-config/main-config-build
