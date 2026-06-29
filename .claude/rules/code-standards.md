Universal baseline standards. Projects add their own conventions below or via `/initialize-setup`.

## TypeScript / JavaScript

### Naming
- Variables and functions: camelCase. Constants: UPPER_SNAKE_CASE.
- Types, interfaces, components: PascalCase. Files: match the export name.
- Tailwind classes: utility-first, prefer composition via `clsx` / `tailwind-merge` helpers — match the project's `cn()` helper if one exists.
- Boolean variables: use `is`, `has`, `should` prefixes.

### Readability
- Prefer `const` over `let`. Do not use `var`.
- Use arrow functions for callbacks and short expressions. Use named functions for top-level logic.
- Destructure objects and arrays at the point of use.
- Keep functions under 30 lines. Extract when logic branches.
- Use template literals over string concatenation.
- Prefer explicit return types on exported functions and server actions.

### Error Handling
- Use try/catch for async operations. Always handle the catch.
- Do not silently swallow errors -- log or propagate.
- Validate external data at the boundary (API responses, user input, BC webhook payloads, form data).

### DOM and Events (client components)
- Use event delegation over per-element listeners when handling repeated elements.
- Prefer `addEventListener` over inline event handlers.
- Clean up event listeners and timers on component teardown (`useEffect` cleanup).

### CSS / SCSS
- This project uses SCSS — not Tailwind. Do not introduce Tailwind or `clsx`/`tailwind-merge`.
- Mobile-first breakpoints using Foundation 5 breakpoint variables.
- Use `settings/` SCSS variables for colors, spacing, and typography — never hardcode values.
- Max selector nesting: 3 levels (enforced by stylelint).
- Max compound selectors per rule: 4 (enforced by stylelint).
- Component SCSS files go in `theme/assets/scss/components/`; page-level styles go in `theme/assets/scss/layouts/`.

## Testing

### Structure
- One test file per source file. Mirror the source directory structure.
- Test names describe the scenario: `returns null when slug not found` or `applies coupon and revalidates cart`.
- Arrange-Act-Assert (AAA) pattern in every test.

### Coverage
- Target 80% line coverage for new code.
- Cover: happy path, null/empty inputs, boundary values, error conditions, BC API errors.
- Do not test private functions directly -- test through the public API.

### Mocking
- This project uses Jest 27 — do not introduce Vitest or MSW.
- Mock jQuery/DOM dependencies with `jest.spyOn` or `jest.fn()` on `jQuery.fn` methods.
- Use `jest.mock()` for module-level mocks (e.g., stencil-utils API calls).
- Keep mocks minimal — only mock what the test needs.

## General

### Comments
- Write self-documenting code. Add comments only when the "why" is not obvious from the code.
- No commented-out code in production. Remove it or track in version control.
- No TODO comments without a ticket reference.
- No emojis in comments, logs, or code.

### Logging
- Use the project's logger -- no bare `console.log` in production code.
- Log at appropriate levels: ERROR for failures, WARN for recoverable issues, INFO for significant events, DEBUG for development.
- Include context in log messages (what was attempted, relevant IDs).
- Never log tokens, customer impersonation tokens, or PII.

### Security
- Do not hardcode credentials, API keys, or secrets.
- Validate and sanitize all external input (user input, API responses, URL parameters, webhook payloads).
- Use parameterized queries -- no string concatenation for SQL.
- Follow context-aware output escaping for the rendering framework (React auto-escapes; only `dangerouslySetInnerHTML` for trusted server-rendered content).

### Git
- Commit messages: `type(scope): description` (e.g., `feat(pdp): add variant configurator`).
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Keep commits atomic -- one logical change per commit.

---

## BigCommerce Stencil (Okuma BC)

### JS — PageManager pattern
- All page-level logic lives in a class that extends `PageManager` (from `theme/assets/js/theme/page-manager.js`).
- Override `onReady()` — this is the entry point called after jQuery DOM-ready.
- Export the class as `export default`. Register it in `theme/assets/js/app.js` `pageClasses` map.
- Use dynamic `import()` in `app.js` for code-splitting per page type — do not add synchronous imports to the top of `app.js`.
- jQuery (`$`) is globally available via webpack ProvidePlugin — no need to import it in page modules.

### JS — Formatting
- **CONFLICT resolved (project wins):** Tab width is **4 spaces** (Prettier config), not 2.
- Line width: **120 characters** (Prettier printWidth).
- Quotes: **single quotes** (`singleQuote: true`).
- Semicolons: **required** (`semi: true`).
- Arrow function parens: **omit for single params** (`arrowParens: 'avoid'` — e.g., `x => x + 1`).
- Trailing commas in ES5-compatible contexts only.

### JS — Naming
- Page class files: camelCase matching the page type (e.g., `cart.js`, `product.js`).
- Page class names: PascalCase matching the file (e.g., `Cart`, `Product`, `PageManager`).
- Component utilities in `theme/assets/js/theme/common/` — named by function (e.g., `carousel.js`, `faceted-search.js`).

### SCSS — Structure (ITCSS-adjacent)
- `settings/` — Foundation + Citadel + global variables; **source of truth for all design values**.
- `tools/` — Mixins and functions (e.g., `remCalc`, `addFocusTooltip`).
- `components/` — BEM-like component styles (e.g., `_hero-carousel.scss`, `_product-card.scss`).
- `layouts/` — Page-level grid and structural styles.
- `utilities/` — Single-responsibility helper classes.
- Import order in `theme.scss`: settings → tools → base → components → layouts → utilities → vendor.

### SCSS — Naming
- BEM-like with component prefix: `.heroCarousel`, `.heroCarousel-slide`, `.heroCarousel-slide--first`.
- Stencil component names: `.productView-*`, `.pagination-*`, `.navPages-*` (match existing conventions).
- Custom components: `.[component]-[element]--[modifier]` pattern.

### Handlebars templates
- Layouts in `theme/templates/layout/` — extend `base.html` via `{{#block "name"}}{{/block}}`.
- Page templates in `theme/templates/pages/` — one file per page type, lowercase-with-dashes naming.
- Reusable partials in `theme/templates/components/` — included via `{{> components/path/to/partial}}`.
- Use `{{ var }}` (HTML-escaped) for all user-generated content. Use `{{{ raw }}}` only for trusted server-rendered HTML (e.g., BC CMS content).
- Use `{{cdn 'assets/...' resourceHint='preload' as='script'}}` for all asset references — never hardcode paths.
- Use `stencilConfig('setting-id')` in SCSS and `{{theme_settings.setting-id}}` in templates for theme settings.

### BC Stencil API
- Use `@bigcommerce/stencil-utils` for all Stencil JS API calls (cart, product options, faceted search, etc.).
- Import from the installed package: `import utils from '@bigcommerce/stencil-utils'`.
- Pass `context` from `stencilBootstrap` (available in `onReady(context)`) to utility calls that require store context.

### Secrets and credentials
- Never commit `.stencil` or `config.stencil.json` — both are gitignored and contain auth tokens and store URLs.
- Never expose BC `X-Auth-Token` (REST Management API key) in theme JS — it ships to the browser.
- Any backend credentials (BC_CLIENT_ID, BC_CLIENT_SECRET, BC_ACCESS_TOKEN) belong in `app/.env` only.

### Webhook safety (backend)
- Verify every incoming BC webhook with HMAC-SHA256 using `BC_CLIENT_SECRET` and `crypto.timingSafeEqual`.
- Respond 2xx within 5 seconds. Offload heavy processing asynchronously.

### Accessibility
- WCAG 2.2 AA minimum. Use semantic HTML5 elements in Handlebars templates.
- Every interactive element must be keyboard-reachable with visible focus. Use `_focus-tooltip.scss` mixin (`addFocusTooltip`) for custom focus indicators.
- Use `lazysizes` (already bundled) for lazy image loading — add `class="lazyload"` and `data-src`.
- Use `focus-trap` (already bundled) for modal/dialog focus management.

### Build and test commands
- **Install:** `cd theme && npm install`
- **Dev:** `cd theme && stencil start`
- **Build:** `cd theme && npm run build`
- **Test:** `cd theme && npm test`
- **Lint JS:** `cd theme && npm run lint`
- **Lint SCSS:** `cd theme && npm run stylelint`
- **Format:** `cd theme && npm run format`
- **Deploy:** `cd theme && stencil bundle` → upload `.zip` to BC store admin

---

*Project-specific standards populated by `/initialize-setup` on 2026-06-29.*
