# Code Review Standards

## Table of Contents
1. Review Process
2. Severity Model
3. HTML / Handlebars Checklist
4. CSS / LESS Checklist
5. JavaScript Checklist
6. Accessibility Checklist
7. Performance Checklist
8. Security Checklist
9. Output Format

---

## 1. Review Process

Use the steps below when the repo supports the listed commands and tools.

1. Read the PR description and linked work item (ADO/Jira) to understand intent
2. Check out the branch and run the build locally (`npm run build`)
3. Run Storybook and visually verify all stories
4. Run Playwright tests (`npx playwright test`)
5. Review code systematically using checklists below
6. Lead with findings and group them by severity
7. Approve when all critical and major issues are resolved

---

## 2. Severity Model

| Severity | Meaning | Blocks merge? |
|---|---|---|
| Critical | Security vulnerability, accessibility violation, build failure, test failure | Yes — must fix |
| Major | Standards violation, missing required file, incorrect patterns | Yes — must fix |
| Minor | Code style, naming, readability improvement | No — fix or document |
| Suggestion | Optional improvement, alternative approach | No |

---

## 3. HTML / Handlebars Checklist

- [ ] One partial per variant/theme
- [ ] RTL partial exists and calls default with modifier class
- [ ] Entry HTMLs present for each partial
- [ ] No hardcoded content that should come from data (use Handlebars variables)
- [ ] Semantic HTML elements used correctly
- [ ] No inline styles or inline event handlers
- [ ] ARIA attributes present on interactive elements
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Form fields have associated `<label>`

---

## 4. CSS / LESS Checklist

- [ ] CSS naming follows project convention from project code standards (BEM, custom prefix, utility classes, or other)
- [ ] No hardcoded color or spacing values (use `@cmp-{name}-*` variables)
- [ ] Variables defined in `less/clientlibs/css/variable.less`
- [ ] Mobile-first responsive (base styles + media query overrides)
- [ ] RTL uses logical properties (`border-inline-start`, `padding-inline-start`)
- [ ] Printer styles present in `less/printer/css/printer.less`
- [ ] Focus indicator on interactive elements (`:focus-visible`)
- [ ] Touch targets >= 44x44px
- [ ] No `!important` unless overriding third-party styles (with comment)
- [ ] `@variable` syntax used (not `$variable`)
- [ ] `prefers-reduced-motion` respected for animations

---

## 5. JavaScript Checklist

- [ ] ES6+ syntax (const/let, arrow functions, async/await)
- [ ] No `var` declarations
- [ ] No `console.log` in production code
- [ ] Error handling with try/catch on async operations
- [ ] Event listeners (no inline `onclick` handlers)
- [ ] No `eval()`, `Function()`, or `setTimeout(string)`
- [ ] No `innerHTML` with unsanitized input
- [ ] AI code markers present on AI-generated sections
- [ ] Component logic in `js/` folder, not in root `.js`
- [ ] Module exports correct (named exports from `js/` file)

---

## 6. Accessibility Checklist

- [ ] Focus visible on all interactive elements
- [ ] Keyboard navigable (Tab, Enter, Space, Escape)
- [ ] Color contrast >= 4.5:1 (normal text), >= 3:1 (large text)
- [ ] Touch targets >= 44x44px
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-expanded` on toggle controls
- [ ] `aria-hidden` on decorative elements
- [ ] `aria-live` on dynamically updated regions
- [ ] axe-core passes with no critical/serious violations

---

## 7. Performance Checklist

- [ ] Images have explicit `width` and `height` to prevent layout shift
- [ ] Images use lazy loading (`loading="lazy"`) for below-fold content
- [ ] No synchronous `document.write()`
- [ ] No render-blocking scripts in `<head>` (use `defer` or `async`)
- [ ] LESS variables (not repeated values) minimize CSS output
- [ ] Large assets loaded dynamically (dynamic loader pattern)

---

## 8. Security Checklist

- [ ] No secrets, tokens, or API keys in code
- [ ] No `innerHTML` with user-controlled input (use DOMPurify or textContent)
- [ ] No inline event handlers in HTML
- [ ] CSP-compatible (no inline scripts without nonce)
- [ ] `npm audit` passes (no critical/high vulnerabilities)

---

## 9. Output Format

Post review comments in this format:

```
[Critical] {File}:{Line} — {Issue description}
Why: {Technical reason this is a problem}
Fix: {Specific action to resolve}

[Major] {File}:{Line} — {Issue description}
Why: {Technical reason}
Fix: {Specific action}

[Minor] {File}:{Line} — {Suggestion}

[Suggestion] {General improvement idea}
```

Summary comment format:

```
## Code Review Summary

**Status**: Changes requested | Approved

**Critical**: {n} issues — fix before merge
**Major**: {n} issues — fix before merge
**Minor**: {n} issues — optional

**Build**: Pass | Fail
**Tests**: Pass | Fail ({n}/{n} passing)
**Accessibility**: Pass | Fail ({violations} axe violations)
**Storybook**: Pass | Fail
```
