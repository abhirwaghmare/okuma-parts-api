# Responsive Layout Patterns

## Table of Contents
1. Breakpoint Model
2. Core Layout Patterns
3. Container Queries
4. Grid and Flex Usage
5. Spacing and Width Constraints
6. Internationalization and Overflow
7. Checklist
8. Primary References

---

## 1. Breakpoint Model

Build mobile-first and scale up from the smallest supported layout:

```css
.ds-feature-grid {
    display: grid;
    gap: var(--ds-space-md);
}

@media (min-width: 48rem) {
    .ds-feature-grid {
        gap: var(--ds-space-lg);
    }
}
```

Rules:
- Base styles should work on narrow viewports first
- Add `min-width` breakpoints only when content actually needs a new layout
- Prefer content-driven breakpoints over device-name breakpoints such as `tablet` or `desktop`

---

## 2. Core Layout Patterns

Use a few reusable layout objects across the system.

### Stack

```css
.l-stack {
    display: grid;
    gap: var(--ds-space-md);
}
```

Use for vertical rhythm between headings, body copy, buttons, and form groups.

### Cluster

```css
.l-cluster {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-space-sm);
    align-items: center;
}
```

Use for button groups, tags, inline metadata, or filter chips.

### Sidebar

```css
.l-sidebar {
    display: grid;
    gap: var(--ds-space-lg);
}

@media (min-width: 64rem) {
    .l-sidebar {
        grid-template-columns: minmax(16rem, 24rem) minmax(0, 1fr);
    }
}
```

Use for nav-plus-content, filters-plus-results, or aside-plus-article layouts.

---

## 3. Container Queries

Use container queries when a component should respond to its own width instead of the viewport:

```css
.ds-card-list {
    container-type: inline-size;
}

.ds-card-list__item {
    display: grid;
    gap: var(--ds-space-md);
}

@container (min-width: 36rem) {
    .ds-card-list__item {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
    }
}
```

Use cases:
- cards that appear in wide content areas and narrow sidebars
- promo blocks reused across templates
- nested components inside grid cells

---

## 4. Grid and Flex Usage

Choose layout primitives by problem shape:

```css
.l-auto-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--ds-space-lg);
}
```

Rules:
- Use Grid for two-dimensional placement and repeatable card layouts
- Use Flexbox for one-dimensional alignment such as toolbars, button rows, and inline groups
- Add `minmax(0, 1fr)` for tracks that must shrink without overflow
- Set `min-width: 0` on flex or grid children that contain long text

Example:

```css
.ds-toolbar {
    display: flex;
    gap: var(--ds-space-sm);
    align-items: center;
}

.ds-toolbar__title {
    min-width: 0;
}
```

---

## 5. Spacing and Width Constraints

Let tokens control rhythm and readable line length:

```css
.l-page-section {
    padding-inline: var(--ds-space-lg);
    padding-block: var(--ds-space-xl);
}

.l-measure {
    max-inline-size: 70ch;
}
```

Rules:
- Use spacing tokens for gaps, padding, and section rhythm
- Use `max-inline-size` for readable text measures and content containers
- Prefer intrinsic sizing functions such as `minmax()` and `fit-content()` before hardcoded widths

---

## 6. Internationalization and Overflow

Responsive layouts also need to survive longer text, RTL, and localization:

```css
.ds-summary {
    padding-inline: var(--ds-space-md);
    overflow-wrap: anywhere;
}
```

Rules:
- Use logical properties so layouts work in LTR and RTL
- Expect button labels and headings to grow in translated content
- Avoid fixed heights for text containers
- Test at 200% zoom and with long strings before merging

---

## 7. Checklist

- [ ] Base layout works on narrow screens first
- [ ] Breakpoints are content-driven, not device-name driven
- [ ] Shared layout objects are reused across components
- [ ] Container queries are used for component-level responsiveness where needed
- [ ] Grid is used for two-dimensional layouts and Flexbox for one-dimensional alignment
- [ ] Long text can shrink or wrap without overflow
- [ ] Logical properties used for RTL-safe spacing and alignment

---

## 8. Primary References

- [MDN: Responsive web design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN: CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries)
- [MDN: CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
- [MDN: CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- [MDN: Basic concepts of Flexbox](https://developer.mozilla.org/docs/Web/CSS/CSS_Flexible_Box_Layout/Basic_Concepts_of_Flexbox)
- [MDN: CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
