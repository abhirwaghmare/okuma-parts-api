---
name: frontend-code-standards
description: Frontend development standards for BigCommerce (Catalyst, Next.js App Router) projects — React Server Components, client components, Tailwind CSS, Storybook, accessibility, security, testing (Vitest + RTL + Playwright), code review, PR workflows, and bug analysis. Load this skill for a concrete frontend task when project code standards need supplemental guidance for that specific area.
---

# Frontend Code Standards

- Load references on demand — only what is relevant to the current task
- Use this skill to supplement project code standards for a specific frontend task, not as background policy

## Before Loading Any Reference

- Read project code standards first
- Read Input-Derived Patterns next when Storybook, Figma, live site, or story context already define the target
- Use these references only for the gaps left after project conventions and input-derived context

## Input Expectations
- Expected input:
  - a concrete frontend task such as a component build, style update, Storybook change, test task, code review, or bug investigation
  - discovered stack context from the codebase
- Missing input behavior:
  - clarify the exact frontend work before loading references when the task is still broad
  - discover the stack context from the codebase first when it is still unknown
- When not to load:
  - when project code standards already fully cover the frontend conventions needed for the task at hand
  - when Input-Derived Patterns already define the structure, naming, tokens, or behavior needed for the task

## Execution Checklist

- Confirm the exact frontend task
- Discover the stack context from the codebase
- Check project code standards before loading any supplemental reference
- Check Input-Derived Patterns before loading any supplemental reference
- Load only the reference files relevant to the task and detected stack
- Pass project-specific and input-derived decisions forward unchanged

## Tech Stack Discovery

- Framework: infer from `package.json` dependencies — for Catalyst projects expect `next`, `react`, `@bigcommerce/catalyst-client`, `next-intl`, `next-auth`; React Server Components are the default rendering model
- Styling: Tailwind CSS by default for Catalyst (`tailwind.config.js`); legacy projects may use CSS modules or styled-components — verify in the codebase
- Scripting: TypeScript (Catalyst is 98%+ TS)
- Storybook: infer from `.storybook/` folder and `package.json`
- Component paths: Catalyst uses `core/components/`, route-scoped `_components/`, client components suffixed `.client.tsx` or marked with `'use client'`; visual editor components registered under `core/lib/makeswift/components/`
- Server actions: `_actions/*.ts` with `'use server'`; route handlers `app/api/.../route.ts`

- Avoid hardcoding paths, class-name prefixes, or framework assumptions before reading the codebase

## Reference Files (33)

### Core
**Load**: `references/core/component-standards.md`
- When: creating or modifying frontend components (HTML/Handlebars, LESS/CSS, JS)
- Covers: folder structure, BEM naming, LESS patterns, RTL, printer styles, Storybook integration

**Load**: `references/core/frontend-standards.md`
- When: writing any JavaScript or CSS
- Covers: ES6+ JS standards, CSS/LESS variable usage, mobile-first responsive, module structure

**Load**: `references/core/frontend-architecture.md`
- When: defining or reviewing frontend structure across components, modules, and pages
- Covers: layering, separation of concerns, contracts, composition boundaries

**Load**: `references/core/api-data-fetching-patterns.md`
- When: integrating frontend code with APIs or authored endpoints
- Covers: fetch patterns, error handling, loading states, resilience, contract awareness

**Load**: `references/core/forms-and-validation.md`
- When: building or reviewing forms and validation UX
- Covers: validation flow, error messaging, async validation, submission states

**Load**: `references/core/internationalization-and-localization.md`
- When: implementing translated or locale-aware frontend behavior
- Covers: locale handling, formatting, text direction, translation-safe UI patterns

**Load**: `references/core/browser-support-and-progressive-enhancement.md`
- When: defining browser support expectations or fallbacks
- Covers: progressive enhancement, compatibility strategy, fallback behavior

### Design-to-Code (Figma)
**Invoke the `figma-context` skill**
- When: a Figma URL is present and you need design context
- Covers: URL parsing, token extraction, responsive intent, component existence check, token mapping

### Design System
**Load**: `references/design-system/css-architecture.md`
- When: defining CSS structure or reviewing stylesheet maintainability
- Covers: CSS layering, specificity control, logical properties, scalable styling

**Load**: `references/design-system/design-tokens-and-theming.md`
- When: working on tokens, themes, or shared UI variables
- Covers: token tiers, CSS custom properties, semantic tokens, theming patterns

**Load**: `references/design-system/responsive-layout-patterns.md`
- When: building responsive layouts or adapting components across breakpoints
- Covers: mobile-first strategy, Grid/Flexbox, container queries, layout rules

### Testing
**Load**: `references/testing/storybook.md`
- When: creating or updating Storybook stories
- Covers: CSF 3.0 format, mandatory story exports, RTL/accessibility/responsive stories

**Load**: `references/testing/testing.md`
- When: generating or reviewing frontend tests
- Covers: 8 Playwright test categories, axe-core, visual regression, cross-browser

**Load**: `references/testing/unit-testing-patterns.md`
- When: writing or reviewing low-level frontend tests
- Covers: unit boundaries, assertions, async tests, maintainable test structure

**Load**: `references/testing/component-testing.md`
- When: testing rendered component behavior in isolation
- Covers: render-level tests, interaction tests, framework-neutral component QA

**Load**: `references/testing/visual-regression-strategy.md`
- When: adding screenshot or visual diff coverage
- Covers: baseline management, stable test states, visual QA workflows

**Load**: `references/testing/mocking-and-test-data-patterns.md`
- When: designing mocks, fixtures, or deterministic test data
- Covers: API mocks, fixtures, realistic data shaping, isolation patterns

### Frameworks
**Load**: `references/frameworks/handlebars-and-vanilla-js.md`
- When: project uses Handlebars, plain HTML, or vanilla JS for templated frontend code
- Covers: template usage, DOM behavior, progressive enhancement, framework-agnostic scripting

**Load**: `references/frameworks/react.md`
- When: project uses React (detected from stack context or `package.json`)
- Covers: Catalyst (Next.js 14 App Router + RSC) integration, functional components, hooks, state management, TypeScript, performance, testing

**Load**: `references/frameworks/vue.md`
- When: project uses Vue (detected from stack context or `package.json`)
- Covers: Composition API (Vue 3), Options API (Vue 2), Pinia, TypeScript, performance, testing

**Load**: `references/frameworks/angular.md`
- When: working on Angular modules
- Covers: Angular 17-19 patterns, standalone components, signals, RxJS migration

**Load**: `references/frameworks/state-management-patterns.md`
- When: state complexity is growing across components or screens
- Covers: local vs shared state, framework-native patterns, store boundaries

**Load**: `references/frameworks/framework-migration-and-upgrade-guidance.md`
- When: upgrading framework versions or modernizing legacy frontend code
- Covers: upgrade planning, migration sequencing, compatibility and testing strategy

### Quality
**Load**: `references/quality/accessibility.md`
- When: implementing or reviewing accessibility
- Covers: focus indicators, color contrast, keyboard navigation, touch targets, ARIA

**Load**: `references/quality/code-review.md`
- When: reviewing frontend code (invoked by code-reviewer)
- Covers: review process, severity model, HTML/CSS/JS/a11y/performance/security checklist

**Load**: `references/quality/security.md`
- When: auditing frontend security
- Covers: XSS prevention, secrets detection, CSP compliance, OWASP Top 10

**Load**: `references/quality/performance-optimization.md`
- When: reviewing runtime or page performance
- Covers: CWV-oriented optimization, bundle awareness, rendering efficiency

**Load**: `references/quality/analytics-and-tracking.md`
- When: implementing or reviewing analytics and instrumentation
- Covers: event design, data quality, client data layer awareness, tracking hygiene

**Load**: `references/quality/documentation-standards.md`
- When: documenting components, stories, APIs, or implementation decisions
- Covers: README expectations, usage docs, contracts, maintainability documentation

### Workflow
**Load**: `references/workflow/bug-workflow.md`
- When: debugging frontend issues or analyzing bugs from ADO/Jira
- Covers: analysis phases, precision targeting, complexity scoring, fix workflow

**Load**: `references/workflow/pr-workflow.md`
- When: creating or reviewing pull requests
- Covers: PR quality gates, description template, commit format, branch naming, merge criteria

**Load**: `references/workflow/release-workflow.md`
- When: preparing frontend changes for release or coordinated rollout
- Covers: release readiness, sequencing, validation, deployment coordination

**Load**: `references/workflow/feature-flags-and-environment-config.md`
- When: working with rollout controls or environment-specific behavior
- Covers: feature flags, config boundaries, environment-safe delivery patterns

**Load**: `references/workflow/frontend-modernization-workflow.md`
- When: planning legacy cleanup or phased frontend modernization
- Covers: modernization sequencing, risk control, incremental upgrade flow

## Handoff Rules

- Keep project code standards as the primary source for repo conventions
- Keep Input-Derived Patterns as the primary source for extracted structure, class names, tokens, and behavior
- Use frontend references to fill in implementation detail only where the first two sources are silent
