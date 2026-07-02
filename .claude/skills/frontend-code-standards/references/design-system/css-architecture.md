# CSS Architecture

## Table of Contents
1. Layering Model
2. Selector Strategy
3. File and Module Boundaries
4. States and Variants
5. Cascade Control
6. Checklist
7. Primary References

---

## 1. Layering Model

Organize design-system CSS from lowest-level primitives to highest-level components:

```css
@layer reset, tokens, base, utilities, components, overrides;

@layer tokens {
    :root {
        --ds-space-md: 1rem;
        --ds-color-text-primary: #1f2937;
    }
}

@layer base {
    body {
        margin: 0;
        color: var(--ds-color-text-primary);
    }
}

@layer utilities {
    .u-visually-hidden {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        overflow: hidden;
    }
}

@layer components {
    .ds-card {
        padding: var(--ds-space-md);
    }
}
```

Recommended order:
- `reset`: normalize and element defaults
- `tokens`: custom properties only
- `base`: typography, links, form defaults
- `utilities`: single-purpose helper classes
- `components`: reusable design-system components
- `overrides`: deliberate escape hatch for project-specific exceptions

Keep all authored CSS in layers when possible. Unlayered rules win over normal layered rules, so reserve unlayered CSS for rare emergency overrides only.

---

## 2. Selector Strategy

Prefer predictable class selectors with low specificity:

```css
.ds-tabs {}
.ds-tabs__list {}
.ds-tabs__tab {}
.ds-tabs__tab[aria-selected="true"] {}
.ds-tabs--compact {}
```

Rules:
- Use component-scoped classes such as `.ds-card`, `.ds-modal`, `.ds-nav`
- Use elements with `__element` and variants with `--modifier` when that matches project conventions
- Use attribute selectors for state that already exists in markup: `[aria-expanded="true"]`, `[data-state="open"]`
- Avoid IDs, tag-qualified component selectors, and deep descendant chains
- Keep selectors shallow enough that a consumer can override them without `!important`

---

## 3. File and Module Boundaries

Treat each component as a standalone module:

```text
design-system/
├── tokens.css
├── utilities.css
├── button.css
├── card.css
└── modal.css
```

Module rules:
- One component file owns one component API
- Component files may consume tokens and utilities, but should not restyle other components
- Layout objects such as stack, cluster, or grid wrappers belong in shared layout files, not inside individual components
- Put one-off page fixes outside the design-system package

Example:

```css
/* button.css */
@layer components {
    .ds-button {
        display: inline-flex;
        gap: var(--ds-space-xs);
        align-items: center;
    }
}
```

---

## 4. States and Variants

Use semantic state hooks instead of presentation-only class sprawl:

```css
@layer components {
    .ds-accordion__panel {
        display: none;
    }

    .ds-accordion__trigger[aria-expanded="true"] + .ds-accordion__panel {
        display: block;
    }

    .ds-badge--success {
        background: var(--ds-color-surface-success);
        color: var(--ds-color-text-success);
    }
}
```

Prefer:
- ARIA state for interactive behavior
- `data-*` attributes for framework state hooks
- modifier classes for supported visual variants

Avoid:
- mixing variant and state into long chained selectors
- styling against framework-generated class names

---

## 5. Cascade Control

Keep overrides cheap and intentional:

```css
@layer components {
    .ds-field :where(input, select, textarea) {
        inline-size: 100%;
        font: inherit;
    }

    .ds-dialog {
        padding-inline: var(--ds-space-lg);
        padding-block: var(--ds-space-lg);
    }
}
```

Practical rules:
- Use `:where()` when grouping selectors so specificity stays at `0`
- Prefer CSS logical properties such as `padding-inline` and `margin-block` for RTL readiness
- Avoid `!important` in design-system source files
- If a selector needs repeated escalation, redesign the cascade or layer order instead

---

## 6. Checklist

- [ ] CSS is organized into explicit layers
- [ ] Tokens are defined separately from component rules
- [ ] Component selectors are class-based and low-specificity
- [ ] States use ARIA or `data-*` hooks where possible
- [ ] No cross-component overrides inside component files
- [ ] Logical properties used instead of left/right where applicable
- [ ] No `!important` unless there is a documented exception

---

## 7. Primary References

- [MDN: `@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/%40layer)
- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
- [MDN: `:where()`](https://developer.mozilla.org/en-US/docs/Web/CSS/%3Awhere)
- [MDN: CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
