# Component Standards

## Table of Contents
1. Folder Structure
2. CSS / LESS Standards
3. RTL Support
4. Printer Styles
5. Accessibility
6. Storybook Integration
7. Checklist

---

## 1. Folder Structure

Use this structure when project code standards align with it.

```
{components-path}/{component-name}/
│
│  -- Partials (Handlebars markup) --
├── {component-name}-partial.html                    # Default variant partial
├── {component-name}-{variant}-partial.html          # One partial per variant/theme
├── {component-name}-rtl-partial.html                # RTL partial (mandatory)
│
│  -- Storybook Entry HTMLs --
├── {component-name}.html                            # Default entry (calls partial + script)
├── {component-name}-{variant}.html                  # Entry per variant
│
│  -- Root files --
├── {component-name}.stories.js                      # Consolidated stories (ALL variants)
├── {component-name}.js                              # Root JS (imports globals + js/ + LESS)
├── {component-name}.less                            # Root LESS (imports all LESS modules)
│
│  -- JavaScript --
├── js/
│   └── {component-name}.js                          # Component logic (vanilla JS, exported)
│
│  -- Styles (LESS) --
├── less/
│   ├── flex.component-{name}-all.less               # Aggregator
│   ├── clientlibs/
│   │   ├── flex.component-{name}.less               # Clientlib entry
│   │   └── css/
│   │       ├── default.less                         # Default / desktop styles
│   │       └── variable.less                        # Component LESS variables
│   ├── printer/
│   │   └── css/
│   │       └── printer.less                         # @media print styles
│   └── rtl/
│       └── rtl.less                                 # RTL overrides (if needed)
│
└── dynamic-loader/
    └── {component-name}.js                          # Dynamic loader
```

Structural rules:
- One partial per variant/theme
- One entry HTML per partial
- RTL partial is included for every component
- Single `.stories.js` imports all entry HTMLs
- Business logic lives in `js/`, root `.js` only imports
- Dynamic loader imports component CSS/LESS bundle and re-exports component JS

---

## 2. CSS / LESS Standards

### BEM Naming (LESS)

```less
.cmp-{component} {
    &__element {}
    &--modifier {}
}
```

### Variable Naming

```less
@cmp-{name}-{element}-{property}: value;

// Examples
@cmp-aside-content-padding: 2em 1.8em;
@cmp-aside-content-title-font-size: 1.5em;
@cmp-aside-control-label-font-size: 1em;
```

### Design Token Usage

```less
.cmp-{name} {
    &__content {
        padding: @cmp-{name}-content-padding;

        &__title {
            font-size: @cmp-{name}-content-title-font-size;
            line-height: @cmp-{name}-content-title-line-height;
        }
    }
}
```

### LESS Import Chain

```
{name}.less (root)
├── less/flex.component-{name}-all.less
│   └── less/clientlibs/flex.component-{name}.less
│       ├── src/globals/css/site/css/global-variable-v2.less
│       ├── css/default.less
│       └── css/variable.less
└── less/printer/flex.component-{name}-printer.less
    ├── src/globals/css/site/css/global-variable-v2.less
    ├── ../clientlibs/css/variable.less
    └── css/printer.less
```

LESS syntax reminders:
- `@variable` not `$variable` (that is SCSS)
- `.mixin()` not `@mixin` (that is SCSS)
- `@import` for file includes

---

## 3. RTL Support

Use CSS logical properties for automatic RTL support:

```less
border-inline-start: 3px solid @color;    // instead of border-left
padding-inline-start: 20px;               // instead of padding-left
margin-inline-end: 16px;                  // instead of margin-right
```

RTL partial calls the default partial with modifier class:

```handlebars
{{> {component-name}/{component-name}-partial
    classes="cmp-{name}--rtl"
    title="Example RTL title"
}}
```

For complex RTL overrides, add `less/rtl/rtl.less`.

---

## 4. Printer Styles

Every component must have printer styles:

```less
@media print {
    .cmp-{name} {
        &__content {
            height: auto;
        }
        &__control-container {
            display: none;
        }
    }
}
```

---

## 5. Accessibility (WCAG 2.2 AA)

Focus indicators:

```less
.cmp-{name} {
    &:focus-visible {
        outline: 2px solid @focus-color;
        outline-offset: 2px;
    }
}
```

Interactive elements:

```less
[role="button"] {
    cursor: pointer;
    min-height: 44px;   // Touch target minimum
    min-width: 44px;
}
```

Required ARIA:
- `role="button"` on non-button clickable elements
- `tabindex="0"` for keyboard access
- `aria-expanded` for show/hide toggles

---

## 6. Storybook Integration

```javascript
import compile from '../../../.storybook/partials';
import DefaultHtml from './{component-name}.html?raw';
import VariantOneHtml from './{component-name}-{variant-1}.html?raw';
import './{component-name}.js';

const DefaultTemplate = () => compile(DefaultHtml);
const VariantOneTemplate = () => compile(VariantOneHtml);

export const Default = DefaultTemplate.bind({});
export const VariantOne = VariantOneTemplate.bind({});

export default {
    title: 'Components/{ComponentName}',
};
```

Rules:
- Uses `compile()` from `.storybook/partials` — HTML format, not JSX
- Import entry HTMLs as `?raw` strings
- Import root `.js` for side effects
- CSF 3.0 format, framework `@storybook/html-vite`
- Include an RTL story

---

## 7. Checklist

- [ ] Component folder at `{components-path}/{name}/`
- [ ] One partial per variant/theme
- [ ] RTL partial exists
- [ ] One entry HTML per partial
- [ ] Consolidated `.stories.js` with all variants exported
- [ ] JS logic in `js/` folder, root `.js` only imports
- [ ] LESS structure: `less/clientlibs/css/default.less` + `variable.less`
- [ ] Printer styles in `less/printer/css/printer.less`
- [ ] Dynamic loader in `dynamic-loader/`
- [ ] CSS naming follows project convention from project code standards
- [ ] No hardcoded colors/spacing (use `@cmp-{name}-*` variables)
- [ ] RTL uses logical properties
- [ ] WCAG 2.2 AA compliant (focus, ARIA, touch targets, contrast)
- [ ] Storybook renders all variants successfully
