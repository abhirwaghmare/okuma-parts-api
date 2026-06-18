# Accessibility Standards (WCAG 2.2 AA)

## Table of Contents
1. Focus Indicators
2. Color Contrast
3. Keyboard Navigation
4. Touch Targets
5. ARIA
6. Reduced Motion
7. Screen Reader
8. Testing with axe-core
9. Checklist

---

## 1. Focus Indicators

All interactive elements must have visible focus indicators:

```less
.cmp-{name} {
    &:focus-visible {
        outline: 2px solid @focus-color;
        outline-offset: 2px;
    }
}
```

Never use `outline: none` without a visible custom focus replacement.

---

## 2. Color Contrast

Requirements:
- Normal text (< 18pt): minimum 4.5:1 contrast ratio
- Large text (>= 18pt or 14pt bold): minimum 3:1 contrast ratio
- UI components and graphical objects: minimum 3:1 against adjacent colors

```less
// Approved color combinations (examples — verify with project palette)
color: @color-text-primary;           // High contrast on light backgrounds
background: @color-background-light;
```

Use a contrast checker tool (browser DevTools, axe, or Figma plugin) to verify all text/background combinations before committing.

---

## 3. Keyboard Navigation

All interactive elements must be reachable and operable via keyboard:

```javascript
// Correct — keyboard event handler
element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleActivation();
    }
    if (event.key === 'Escape') {
        handleClose();
    }
});
```

Tab order must follow visual reading order. Use `tabindex="0"` to add non-interactive elements to tab flow. Never use positive `tabindex` values.

---

## 4. Touch Targets

All interactive elements must meet minimum touch target size:

```less
.cmp-{name}__button,
[role="button"] {
    min-height: 44px;
    min-width: 44px;
    cursor: pointer;
}
```

Spacing between adjacent targets must be at least 8px.

---

## 5. ARIA

Required patterns:

```html
<!-- Non-button interactive element -->
<div role="button" tabindex="0" aria-label="Close dialog">X</div>

<!-- Show/hide toggle -->
<button aria-expanded="false" aria-controls="panel-id">Toggle</button>
<div id="panel-id" hidden>Panel content</div>

<!-- Icon-only button -->
<button aria-label="Search">
    <svg aria-hidden="true">...</svg>
</button>

<!-- Form field -->
<label for="field-id">Field label</label>
<input id="field-id" type="text" aria-describedby="field-hint" />
<div id="field-hint">Hint text</div>

<!-- Error state -->
<input aria-invalid="true" aria-describedby="error-id" />
<div id="error-id" role="alert">Error message</div>

<!-- Loading state -->
<div aria-live="polite" aria-busy="true">Loading...</div>
```

ARIA rules:
- Do not use ARIA roles that conflict with the native element semantics
- `aria-hidden="true"` on decorative images and icons
- `aria-label` or `aria-labelledby` on every interactive element that has no visible text
- `aria-live` regions for dynamic content updates

---

## 6. Reduced Motion

Respect the user's motion preference:

```less
@media (prefers-reduced-motion: reduce) {
    .cmp-{name} {
        animation: none;
        transition: none;
    }
}
```

Never suppress this media query. Animations and transitions must not be the only means of conveying information.

---

## 7. Screen Reader

Semantic HTML first. Use the right element for the right purpose:
- `<button>` for buttons (not `<div role="button">` unless unavoidable)
- `<a href>` for navigation links
- `<nav>` for navigation landmarks
- `<main>`, `<header>`, `<footer>`, `<aside>` for page landmarks
- `<h1>`–`<h6>` for headings in logical hierarchy
- `<ul>` / `<ol>` for lists

Skip links for keyboard users:

```html
<a class="skip-link" href="#main-content">Skip to main content</a>
```

```less
.skip-link {
    position: absolute;
    top: -100%;
    &:focus {
        top: 0;
    }
}
```

---

## 8. Testing with axe-core

In Playwright tests, run axe-core on every story:

```javascript
const { checkA11y } = require('axe-playwright');

test('accessibility — default', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-{name}--default');
    await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
    });
});
```

Fix all violations with severity `critical` and `serious` before merging. `moderate` violations require documented justification.

---

## 9. Checklist

- [ ] Focus visible on all interactive elements (`:focus-visible`)
- [ ] Color contrast >= 4.5:1 for normal text, >= 3:1 for large text
- [ ] All interactive elements keyboard reachable (Tab, Enter, Space, Escape)
- [ ] Touch targets >= 44x44px with 8px spacing
- [ ] ARIA labels on icon-only buttons and interactive elements without visible text
- [ ] `aria-expanded` on toggle controls
- [ ] `aria-live` on dynamic content regions
- [ ] `aria-hidden` on decorative icons and images
- [ ] Reduced motion respected (`prefers-reduced-motion`)
- [ ] Semantic HTML used (no `div` buttons without necessity)
- [ ] Skip link present on page
- [ ] axe-core passes with no critical/serious violations
- [ ] Tested with screen reader (VoiceOver or NVDA)
