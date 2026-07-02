# Framework Migration and Upgrade Guidance

Use the official upgrade path first, then adapt it to project constraints. Prefer small, reversible moves over one large rewrite.

## Upgrade Playbook

### 1. Audit Before Changing Code

Capture:
- Current framework and tooling versions
- Browser support commitments
- SSR / visual-editor constraints
- Third-party packages tied to framework internals
- Build, test, and lint baselines

Do not start by changing component code. Start by proving the current app is green.

### 2. Upgrade Tooling and Framework Together

Major upgrades often fail because the runtime was updated but the surrounding toolchain was not.

Check together:
- CLI / build tool
- Router
- State library
- Test runner
- UI library dependencies
- TypeScript and ESLint compatibility

### 3. Prefer Incremental Migration

Good migration sequence:

1. Upgrade dependencies
2. Run official codemods or CLI migrations
3. Fix compile/runtime warnings
4. Migrate one feature slice at a time
5. Remove compatibility shims last

### 4. Keep the DOM Contract Stable

Especially in server-rendered pages:
- Preserve CSS hooks unless intentionally changing them
- Preserve server-rendered markup structure when possible
- Keep analytics/test selectors stable
- Avoid rewriting a working component just to adopt a new syntax

## React Guidance

### Priority Items

- Use `createRoot` for client rendering on modern React roots
- Review effects for Strict Mode safety in development
- Move redundant derived-state effects back into render logic
- Replace legacy rendering or lifecycle patterns when touched

For embedded / integrated React (e.g. mounted inside another framework's page):
- Mount inside an explicit component root
- Do not assume ownership of the full page DOM
- Unmount cleanly if the integration lifecycle requires it

## Angular Guidance

### Priority Items

- Use `ng update` and the Angular Update Guide instead of manual version guessing
- Apply CLI migrations before manual refactors
- Upgrade to latest patch releases on the target major
- Introduce standalone APIs, signals, or new control flow deliberately, not all at once

Practical rule:
- First make the old patterns run on the new version
- Then modernize templates and state patterns in follow-up changes

## Vue Guidance

### Priority Items

- For Vue 2 to Vue 3 migrations, use the migration build when a direct cutover is risky
- Upgrade router, state, and SFC tooling with Vue core
- Convert new or touched code to Composition API incrementally
- Remove compatibility warnings feature by feature

Practical rule:
- Keep one compatibility backlog
- Burn it down after the app is stable on Vue 3

## Handlebars / Vanilla / HTML-First Guidance

### Migrate Behavior Separately from Markup

For HTML-first components:
- Keep server-rendered HTML stable first
- Move inline behavior to module-based JavaScript
- Replace page-global scripts with per-component initializers
- Keep `data-*` hooks backward compatible during rollout

### Respect Delivery Constraints

- Keep client bundle categories and inclusion points stable until the new bundle is verified
- Test server-rendered pages, editor placeholders, and production behavior separately
- Prefer progressive enhancement over replacing server-rendered markup with client rendering

## Release Checklist

- Build, lint, tests, and type checks pass
- No unresolved framework deprecation warnings in touched areas
- Key flows verified in preview and production contexts
- Rendered HTML/CSS contract checked for regressions
- Accessibility smoke test completed
- Rollback path documented for major version changes

## Unforced Errors to Avoid

- Upgrading framework core without router/store/plugin alignment
- Mixing migration refactors with visual redesign in one change
- Rewriting stable components to “modernize” syntax without business value
- Keeping compatibility mode forever
- Ignoring visual-editor / preview regression checks in server-rendered projects

## Official References

- React: [How to Upgrade to React 18](https://react.dev/blog/2022/03/08/react-18-upgrade-guide), [`createRoot`](https://react.dev/reference/react-dom/client/createRoot), [Managing State](https://react.dev/learn/managing-state)
- Angular: [Angular Update Guide](https://angular.dev/update), [Migrations](https://angular.dev/reference/migrations), [Signals](https://angular.dev/guide/signals/), [Control Flow](https://angular.dev/guide/templates/control-flow)
- Vue: [Vue 3 Migration Build](https://v3-migration.vuejs.org/migration-build), [Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html), [Quick Start](https://vuejs.org/guide/quick-start.html)
- [Next.js Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
