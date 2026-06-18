# Pull Request Workflow

## Table of Contents
1. Pre-PR Quality Gates
2. Branch Naming
3. Commit Messages
4. PR Title and Description
5. ADO Pull Request Creation
6. Merge Criteria
7. Checklist

---

## 1. Pre-PR Quality Gates

Run the repo's available quality gates before creating a PR.

| Gate | Typical command | Severity |
|---|---|---|
| Build | `npm run build` | Critical |
| Lint | `npm run lint` | Critical |
| Unit tests | `npm run test` | Critical |
| Storybook build | `npm run build-storybook` | Critical |
| Playwright E2E | `npx playwright test {component}.spec.js` | Critical |
| Security audit | `npm audit --audit-level=high` | Critical |
| Accessibility | axe-core via Playwright (no critical/serious) | Critical |

- If any gate fails, fix it before creating the PR
- If the repo uses different commands, use the repo's commands instead of these examples

---

## 2. Branch Naming

| Work item type | Branch prefix | Example |
|---|---|---|
| User Story | `feature/` | `feature/12345-card-component` |
| Bug | `bugfix/` | `bugfix/12345-card-alignment-fix` |
| Hotfix | `hotfix/` | `hotfix/12345-critical-cta-issue` |
| Task | `feature/` | `feature/12345-update-variable-names` |

Format: `{prefix}{work-item-id}-{sanitized-title}`
- Lowercase
- Hyphens for spaces and special characters
- Max 50 characters after the prefix

---

## 3. Commit Messages

```
{type}({scope}): {description under 72 chars}

- {change 1}
- {change 2}
- {change 3}

Implements #{work-item-id}
```

Type mapping:
- User Story → `feat`
- Bug → `fix`
- Refactor → `refactor`
- Test → `test`
- Documentation → `docs`

Scope: `frontend`

Examples:

```
feat(frontend): add card component with RTL and dark theme support

- Created component folder with partials, entry HTMLs, LESS, and JS
- Added Storybook stories (default, dark, RTL)
- Added Playwright tests (all 8 categories)
- Mapped Figma design tokens to LESS variables

Implements #12345
```

```
fix(frontend): resolve promo container RTL text alignment

- Changed margin-left to margin-inline-start in default.less
- Added logical property to variable.less

Implements #12346
```

---

## 4. PR Title and Description

### Title Format

```
{type}({scope}): {summary under 70 chars}
```

Examples:
- `feat(frontend): add featured promo multiple rows component`
- `fix(frontend): resolve promo container RTL alignment issue`

### Description Template

```markdown
## Summary

{1-3 sentence description of what was built or fixed and why}

## Changes

- Created component: `{components-path}/{name}/`
  - Partials: {list of partials}
  - Entry HTMLs: {list}
  - JS: root entry + `js/{name}.js`
  - LESS: `less/clientlibs/css/default.less` + `variable.less`, printer styles
  - Stories: `{name}.stories.js` ({n} variants)
  - Playwright: `{name}.spec.js` (8 test categories, cross-browser)

## Validation

| Gate | Status |
|---|---|
| Build | PASS |
| Lint | PASS |
| Storybook build | PASS |
| Playwright tests | PASS ({n}/{n}) |
| Accessibility (axe) | PASS |
| Security audit | PASS |

## Linked Work Item

#{work-item-id}
```

---

## 5. ADO Pull Request Creation

Use the ADO MCP `repo_create_pull_request` function:

Parameters:
- `sourceRefName`: `refs/heads/{branch-name}`
- `targetRefName`: target branch from the repo's active workflow
- `title`: PR title as defined above
- `description`: PR description as defined above
- `workItems`: `[{work-item-id}]`
- `isDraft`: `false` (unless explicitly requested)

Process:
1. Resolve repository ID via `repo_get_repo_by_name_or_id` (use repo name from git config)
2. Create PR using resolved repository GUID
3. Return PR URL to user

---

## 6. Merge Criteria

A PR may be merged when:
- All CI/CD checks pass
- At least 1 peer review approval received
- All critical and major review comments resolved
- No merge conflicts with target branch
- Linked work item ID is in the PR

---

## 7. Checklist

- [ ] Branch named correctly (`feature/` or `bugfix/` prefix)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build-storybook` passes
- [ ] `npx playwright test` passes (all 8 categories, all browsers)
- [ ] `npm audit --audit-level=high` passes
- [ ] axe-core passes (no critical/serious violations)
- [ ] Commit message follows format with `Implements #{id}`
- [ ] PR title follows `{type}({scope}): {summary}` format
- [ ] PR description includes changes, validation table, and linked work item
- [ ] ADO work item linked to PR
