# Frontend Architecture

## Table of Contents
1. Architecture Principles
2. Rendering Boundaries
3. Component Boundaries
4. State and Data Ownership
5. Asset and Dependency Loading
6. BigCommerce (Catalyst) Considerations
7. Checklist
8. Official References

---

## 1. Architecture Principles

Prefer simple layers with clear ownership:
- Markup layer: semantic HTML structure
- Presentation layer: CSS / LESS, tokens, responsive behavior
- Behavior layer: JavaScript for enhancement and interaction
- Data layer: authored content, page model JSON, or API responses

Rules:
- Keep rendering decisions close to the component
- Keep business rules out of templates when possible
- Prefer composition over deep inheritance
- Optimize for predictable initialization and teardown

---

## 2. Rendering Boundaries

Server-rendered or authored HTML should remain usable before JavaScript runs.

```html
<section class="cmp-accordion" data-cmp-is="accordion">
    <button class="cmp-accordion__toggle" aria-expanded="false">
        Shipping details
    </button>
    <div class="cmp-accordion__panel" hidden>
        ...
    </div>
</section>
```

```javascript
document.querySelectorAll('[data-cmp-is="accordion"]').forEach((root) => {
    const button = root.querySelector('.cmp-accordion__toggle');
    const panel = root.querySelector('.cmp-accordion__panel');

    button?.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        panel.hidden = expanded;
    });
});
```

Guidance:
- HTML provides the baseline state
- JavaScript enhances behavior, not core content access
- Avoid components that render nothing until client code loads unless the project explicitly requires it

---

## 3. Component Boundaries

A good component owns:
- One clear UI responsibility
- Its own DOM hooks and events
- Local styles scoped by project naming convention

Avoid components that:
- Reach into sibling DOM trees
- Depend on page-global mutable state without a contract
- Mix layout, API orchestration, analytics, and form logic in one file

```javascript
// Good: narrow public API
export const initializeTabs = (rootElement) => {
    if (!rootElement) {
        return;
    }

    // Component-only behavior
};
```

Keep shared logic in utilities only when at least two components need the same rule.

---

## 4. State and Data Ownership

Use the narrowest state scope that works:

| State type | Default owner |
|---|---|
| Expanded / collapsed | Component-local state |
| Selected tab / step | Nearest parent container |
| Page filters / URL params | URL or page-level controller |
| Server-rendered content | RSC / GraphQL Storefront API data |
| API cache | Shared data layer or framework query library |

Rules:
- Do not duplicate server state into multiple local stores unless needed for editing
- Derive UI state from URL or server-rendered data when possible
- Treat DOM as an output, not the source of truth

---

## 5. Asset and Dependency Loading

Load only what the page needs:
- Prefer route-, template-, or component-level splitting
- Delay non-critical behavior until the relevant DOM exists
- Keep client bundles independent from visual-editor / authoring-only tooling

```javascript
const initializeWhenVisible = (element, callback) => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                callback(entry.target);
                observer.unobserve(entry.target);
            }
        });
    });

    observer.observe(element);
};
```

For styles:
- Global tokens and reset rules load once
- Component styles stay with the component or its bundled CSS module / Tailwind utility group
- Avoid large catch-all bundles when only a few components are used

---

## 6. BigCommerce (Catalyst) Considerations

For Catalyst frontend projects:
- Treat the BigCommerce GraphQL Storefront API as the source of catalog truth — fetched in RSC, never from client components.
- Keep client-side code resilient to missing or empty fields returned from GraphQL.
- Separate Makeswift visual-editor behavior from production rendering when requirements differ.
- Use Next.js dynamic imports for non-critical client components — keep the RSC payload lean.
- Preserve semantic HTML so RSC streams render meaningfully before hydration completes.

Common Catalyst-safe pattern:

```typescript
const title = product?.name?.trim();

if (!title) {
  return <ProductPlaceholder />;
}
```

---

## 7. Checklist

- [ ] HTML is meaningful before JavaScript enhancement
- [ ] Component responsibilities are narrow and explicit
- [ ] State lives at the smallest practical scope
- [ ] Server-fetched data is not duplicated into client stores without reason
- [ ] DOM selectors stay within the component boundary
- [ ] Global CSS and JS are minimized
- [ ] Non-critical code loads lazily where appropriate
- [ ] Missing GraphQL fields fail safely
- [ ] Preview and production deploys both remain usable

---

## 8. Official References

- MDN Web Docs: Building blocks of the Web
  `https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Creating_the_content`
- MDN Web Docs: Lazy loading
  `https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading`
- BigCommerce Catalyst — Architecture
  `https://www.catalyst.dev/docs`
- Next.js App Router
  `https://nextjs.org/docs/app`
