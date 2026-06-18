# Frontend Documentation Standards

## Table of Contents
1. Required Documentation for Every Component
2. Storybook and Usage Examples
3. Code-Level API Documentation
4. BigCommerce (Catalyst) Notes
5. Change Documentation
6. Official References
7. Checklist

---

## 1. Required Documentation for Every Component

Every reusable frontend component should be documented at the level another developer needs to use, extend, and review it safely.

Minimum documentation should cover:
- Purpose of the component
- Supported variants or themes
- Required and optional inputs
- Accessibility behavior
- Analytics hooks or emitted events
- Known limitations

Keep documentation close to the component. If the repo uses Storybook, stories are the first layer of documentation, not an optional extra.

---

## 2. Storybook and Usage Examples

Use examples to document real usage, not only happy-path rendering:

```javascript
export default {
    title: 'Components/Button',
    component: Button,
    tags: ['autodocs']
};

export const Primary = {
    args: {
        label: 'Apply now',
        variant: 'primary'
    }
};
```

Rules:
- Add at least one default story and one edge-case story
- Name stories by behavior or context, not by internal implementation detail
- Keep story args realistic and author-friendly
- Document empty, error, loading, and long-content states when relevant
- Update stories when component API or authoring behavior changes

---

## 3. Code-Level API Documentation

Document public functions, modules, and non-obvious behavior directly in code:

```javascript
/**
 * Initializes the accordion component and binds one click listener per root.
 *
 * @param {HTMLElement} root - Accordion root element.
 * @returns {void}
 */
export function initAccordion(root) {
    // ...
}
```

Rules:
- Use JSDoc for public JavaScript APIs and shared utilities
- Explain why a behavior exists when it is not obvious from the code
- Document expected input shape, return value, and side effects
- Do not add comments that only repeat the code
- Update or delete stale comments during refactors

---

## 4. BigCommerce (Catalyst) Notes

Frontend documentation for Catalyst components should also capture data and integration assumptions:
- Expected GraphQL Storefront fields and fragments consumed
- Required CSS classes, Tailwind utilities, data attributes, or markup hooks
- Client-bundle dependencies (dynamic imports, Suspense boundaries) and load expectations
- Data layer events or analytics assumptions
- Empty-state behavior when product/content data is missing or the API returns errors

When a component depends on a server action or GraphQL query, document the exact selection set and props consumed. Keep that contract explicit so RSC, server actions, and client components do not drift apart.

---

## 5. Change Documentation

Documentation must change with the code:
- Update stories, README notes, and inline API docs in the same change when behavior changes
- Call out breaking frontend API changes in the PR description
- Add migration notes when renaming classes, events, modifiers, or component inputs
- Remove outdated examples, screenshots, and dead options instead of leaving them behind

If a reviewer cannot tell how to use the component after reading its docs and stories, the documentation is incomplete.

---

## 6. Official References

- [Storybook: How to write stories](https://storybook.js.org/docs/writing-stories/)
- [Storybook: Autodocs](https://storybook.js.org/docs/writing-docs/autodocs)
- [JSDoc: Getting Started](https://jsdoc.app/about-getting-started)
- [JSDoc: `@param`](https://jsdoc.app/tags-param)

---

## 7. Checklist

- [ ] Component purpose and supported variants documented
- [ ] Required and optional inputs documented
- [ ] At least one default story and one edge-case story provided
- [ ] Accessibility behavior documented where relevant
- [ ] Analytics hooks or emitted events documented
- [ ] Public JavaScript APIs use JSDoc where appropriate
- [ ] Catalyst data and integration assumptions captured (GraphQL fragments, server actions, env requirements)
- [ ] Breaking changes include migration notes
- [ ] Stale examples and outdated comments removed during refactor
