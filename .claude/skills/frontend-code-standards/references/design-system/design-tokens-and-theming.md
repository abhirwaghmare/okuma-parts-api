# Design Tokens and Theming

## Table of Contents
1. Token Tiers
2. Token Source Format
3. CSS Variable Mapping
4. Theme Switching
5. Component Consumption Rules
6. Checklist
7. Primary References

---

## 1. Token Tiers

Keep token naming semantic and layered:

```text
Reference tokens  ->  Semantic tokens  ->  Component tokens

color.blue.700    ->  color.text.primary  ->  button.primary.text
space.16          ->  space.md            ->  card.padding
radius.8          ->  radius.md           ->  input.radius
```

Recommended usage:
- Reference tokens store raw values such as hex, spacing units, or font sizes
- Semantic tokens describe purpose such as `color.text.primary`
- Component tokens exist only when a component needs a stable local alias

Do not let component code depend directly on raw palette names such as `blue-700` or `gray-100`.

---

## 2. Token Source Format

When the source of truth is JSON or platform-agnostic token files, use a predictable token shape:

```json
{
  "color": {
    "text": {
      "primary": {
        "$value": "{color.neutral.900}",
        "$type": "color"
      }
    }
  },
  "space": {
    "md": {
      "$value": "1rem",
      "$type": "dimension"
    }
  }
}
```

Practical rules:
- Keep token names stable and human-readable
- Store aliases through token references instead of duplicating raw values
- Add metadata only when teams actively use it for tooling, docs, or deprecation tracking

---

## 3. CSS Variable Mapping

Expose semantic tokens as CSS custom properties at the theme boundary:

```css
:root {
    --ds-color-text-primary: #111827;
    --ds-color-surface-page: #ffffff;
    --ds-space-md: 1rem;
    --ds-radius-md: 0.5rem;
}
```

Theme overrides should redefine the same semantic property names:

```css
[data-theme="dark"] {
    --ds-color-text-primary: #f9fafb;
    --ds-color-surface-page: #111827;
}
```

Rules:
- Publish semantic variables, not raw palette variables, to component authors
- Keep naming consistent across CSS, token files, and design tooling
- Use fallback values sparingly; missing tokens should fail fast during review

---

## 4. Theme Switching

Support theming with a small number of stable entry points:

```css
:root {
    color-scheme: light;
}

[data-theme="dark"] {
    color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme]) {
        --ds-color-text-primary: #f9fafb;
        --ds-color-surface-page: #111827;
        color-scheme: dark;
    }
}
```

Theme guidance:
- Theme semantic tokens, not component selectors
- Keep contrast-safe token pairs together, for example text and surface
- Use `color-scheme` so native form controls and scrollbars align with the active theme
- Prefer `data-theme` on the app root or page root over per-component theme toggles

---

## 5. Component Consumption Rules

Components should consume the smallest stable token surface they need:

```css
.ds-button {
    padding-inline: var(--ds-space-md);
    padding-block: calc(var(--ds-space-sm) + 2px);
    border-radius: var(--ds-radius-md);
    background: var(--ds-color-action-primary-bg);
    color: var(--ds-color-action-primary-text);
}
```

Rules:
- Use semantic tokens first
- Introduce component tokens when multiple internals share the same decision
- Avoid hardcoded hex, pixel spacing, or shadow values inside component files
- Typography, spacing, radius, border, shadow, and motion should all be tokenized when reused

---

## 6. Checklist

- [ ] Token model separates reference, semantic, and component layers
- [ ] Source token names are stable and implementation-friendly
- [ ] Semantic tokens are published as CSS custom properties
- [ ] Dark or branded themes override semantic tokens, not component CSS
- [ ] `color-scheme` is set when light/dark themes are supported
- [ ] Components do not hardcode reusable visual values

---

## 7. Primary References

- [Design Tokens Community Group: Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
- [MDN: `prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-color-scheme)
- [MDN: `color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme)
