# Handlebars + Vanilla JS Patterns

Practical patterns for HTML-first components, progressive enhancement, and framework-agnostic JavaScript. Prefer this approach when server-rendered markup is the source of truth and JavaScript adds behavior rather than rebuilding the DOM.

## When to Use This Stack

- Server-rendered pages where content must work before JavaScript runs
- Content-heavy components with simple interaction layers
- Pages that need stable, crawlable HTML and low hydration cost
- Incremental enhancement inside server-rendered markup

## Handlebars Template Rules

### Escape by Default

Use normal expressions unless the value is already sanitized and trusted:

```handlebars
<h2>{{title}}</h2>
<div class="cmp-copy">{{body}}</div>
```

Avoid raw HTML output unless there is a clear sanitization boundary:

```handlebars
{{{trustedHtml}}}
```

### Prefer Partials for Reuse

Keep repeated structure in partials, not duplicated markup:

```handlebars
{{> teaser title=title url=url variant="promo"}}
```

Good uses for partials:
- Variant shells
- Shared CTA markup
- Layout wrappers
- Repeated icon/text rows

### Keep Helpers Small and Predictable

Helpers should format values or select small view variants. Do not hide business logic in helpers.

```js
Handlebars.registerHelper('isExternal', (url) => /^https?:\/\//.test(url));
```

### Use Built-In Helpers First

Reach for `#if`, `#unless`, `#each`, `#with`, and `lookup` before adding custom helpers.

```handlebars
{{#if items.length}}
  <ul>
    {{#each items}}
      <li>{{this.label}}</li>
    {{/each}}
  </ul>
{{else}}
  <p>No items available.</p>
{{/if}}
```

## Vanilla JS DOM Contract

### Use `data-*` Attributes for JS Hooks

Use classes for styling and `data-*` attributes for behavior/state hooks:

```html
<div class="cmp-accordion" data-cmp-is="accordion">
  <button data-accordion-trigger aria-expanded="false">Details</button>
  <div data-accordion-panel hidden>...</div>
</div>
```

```js
const root = document.querySelector('[data-cmp-is="accordion"]');
const trigger = root.querySelector('[data-accordion-trigger]');
const panel = root.querySelector('[data-accordion-panel]');
```

Rules:
- Keep selectors local to a component root
- Prefer `dataset` over parsing class names
- Do not store visible content only in `data-*` attributes

### Make Initialization Idempotent

Components may be re-rendered, included multiple times, or reloaded in authoring flows. Guard against double-binding:

```js
export function initAccordion(root) {
  if (root.dataset.enhanced === 'true') return;
  root.dataset.enhanced = 'true';

  const trigger = root.querySelector('[data-accordion-trigger]');
  const panel = root.querySelector('[data-accordion-panel]');

  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
}
```

### Prefer Event Delegation for Lists

If a component renders repeating items, bind once on the root and inspect the clicked target.

```js
root.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button) return;

  const item = button.closest('[data-item-id]');
  item?.remove();
});
```

## Async and Cross-Component Behavior

### Abort In-Flight Requests

Use `AbortController` for fetch work that may be replaced by navigation, tab changes, or author updates.

```js
const controller = new AbortController();

fetch('/api/search', { signal: controller.signal })
  .then((response) => response.json())
  .then(renderResults)
  .catch((error) => {
    if (error.name !== 'AbortError') throw error;
  });

// Later
controller.abort();
```

### Use `CustomEvent` for Loose Coupling

For small cross-component communication, dispatch semantic events instead of creating a global store:

```js
root.dispatchEvent(new CustomEvent('cmp:filter-change', {
  bubbles: true,
  detail: { value: 'news' },
}));
```

Use this for:
- Filter changes
- Dialog open/close signals
- Analytics-friendly UI events

Avoid this for:
- Complex multi-step workflows
- App-wide canonical state

## Server-Rendered-Friendly Patterns

### Keep Markup Useful Without JS

Render the server content first. JavaScript should enhance the existing HTML, not replace the component root.

Good:
- Toggle classes, attributes, and `hidden`
- Inject optional async fragments into a dedicated child container
- Read server-rendered values from markup or JSON payloads

Avoid:
- Replacing the full component DOM with `innerHTML`
- Depending on JavaScript to render essential text or links
- Hard-coding page-global selectors when the component can exist multiple times

### Mount Per Component Root

Initialize from each component container instead of one page-global singleton:

```js
document
  .querySelectorAll('[data-cmp-is="accordion"]')
  .forEach(initAccordion);
```

### Respect Bundle Delivery

Ship enhancement code through the framework's bundling pipeline and keep component JavaScript scoped so the same bundle can safely run across server-rendered pages.

## Quick Checklist

- Handlebars output escaped by default
- Reuse handled with partials, not copy/paste
- Helpers kept small and side-effect free
- JS selectors based on `data-*` hooks
- Initialization safe to run more than once
- Async work cancelable
- HTML stays meaningful without JavaScript

## Official References

- [Handlebars Expressions](https://handlebarsjs.com/guide/expressions.html), [Built-In Helpers](https://handlebarsjs.com/guide/builtin-helpers.html), [Partials](https://handlebarsjs.com/guide/partials.html)
- [MDN `data-*` attributes](https://developer.mozilla.org/docs/Web/HTML/How_to/Use_data_attributes), [MDN `CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent), [MDN `AbortController`](https://developer.mozilla.org/docs/Web/API/AbortController)
- [MDN: Progressive Enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)
