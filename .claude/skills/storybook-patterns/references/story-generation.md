# Storybook Story Generation

Generate new Storybook stories that match the project's existing conventions. Invoked by frontend-dev after component implementation.

## Before Generating

1. Read `<code_standards>` from CLAUDE.md for Storybook conventions
2. Discover project setup — scan `.storybook/` config and 2-3 existing stories to learn:
   - CSF version (CSF2 vs CSF3)
   - Framework (`@storybook/html`, `@storybook/react`, `@storybook/angular`, `@storybook/web-components`)
   - Story file naming convention (`ComponentName.stories.js` vs `component-name.stories.ts`)
   - Story file location (co-located with component vs separate `stories/` directory)
   - Decorator patterns (global vs story-level)
   - Args/controls style
   - Import patterns
3. NEVER generate a story format the project doesn't use

## Detect Story Format

### CSF2 (Component Story Format 2)
```js
export default {
  title: 'Components/HeroBanner',
  // no `component` field, render via template/render function
};

export const Default = () => `<div class="cmp-hero">...</div>`;
export const WithImage = () => `<div class="cmp-hero cmp-hero--with-image">...</div>`;
```

### CSF3 (Component Story Format 3)
```js
export default {
  title: 'Components/HeroBanner',
  component: HeroBanner, // for React/Angular/Vue
  args: { title: 'Default Title' },
};

export const Default = {};
export const WithImage = { args: { imageUrl: '/path/to/image.jpg' } };
```

### MDX Format
```mdx
import { Meta, Story, Canvas } from '@storybook/blocks';

<Meta title="Components/HeroBanner" />

# Hero Banner

<Canvas>
  <Story name="Default">
    {() => `<div class="cmp-hero">...</div>`}
  </Story>
</Canvas>
```

### Catalyst-Specific: React + TypeScript Stories
Catalyst projects use `@storybook/react-vite` (or `@storybook/nextjs`) with TypeScript and CSF 3.0:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { HeroBanner } from './hero-banner';

const meta: Meta<typeof HeroBanner> = {
  title: 'Components/HeroBanner',
  component: HeroBanner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HeroBanner>;

export const Default: Story = {
  args: {
    title: 'Welcome',
    description: 'Hero banner description',
    ctaLabel: 'Learn More',
    ctaUrl: '/about',
  },
};
```

## Generation Process

### 1. Identify What Needs Stories

From the implemented component, identify:
- Component name and file location
- All visual variants (default, with/without optional fields, responsive states)
- All interactive states (hover, focus, disabled, loading, error)
- Edge cases (long text, missing image, empty content)

### 2. Match Project Conventions

From the 2-3 existing stories scanned earlier:
- Use the same CSF version
- Use the same file naming pattern
- Use the same import style
- Use the same decorator pattern
- Use the same args/controls structure
- Place the file in the same location convention (co-located vs separate)

### 3. Generate Story File

**Story structure (adapt to project format):**

```
1. Imports (match project import style)
2. Default export (meta — title, component/template, argTypes, decorators)
3. Template function (if HTML/Handlebars project)
4. Named exports (one per variant):
   - Default (happy path, all fields populated)
   - Variant stories (with/without optional fields)
   - Edge case stories (long text, missing data, empty states)
```

### 4. Args → Component Props Mapping

Map component props/dialog fields to story args:

| Dialog Field Type | Storybook Arg Type | Control |
|-------------------|-------------------|---------|
| textfield (single line) | string | text |
| textarea (multiline) | string | text (multiline) |
| checkbox (boolean) | boolean | boolean |
| select (dropdown) | string | select / radio |
| pathfield (asset/page) | string | text (path) |
| numberfield | number | number |
| datepicker | string | date |
| multifield | array | object (array) |
| richtext | string | text (multiline) |
| colorfield | string | color |

### 5. ArgTypes for Controls

Generate argTypes for the Storybook Controls panel:

```js
argTypes: {
  title: {
    control: 'text',
    description: 'Component heading text',
    table: { category: 'Content' },
  },
  variant: {
    control: { type: 'select' },
    options: ['default', 'dark', 'compact'],
    description: 'Visual variant',
    table: { category: 'Style' },
  },
  showCta: {
    control: 'boolean',
    description: 'Toggle CTA button visibility',
    table: { category: 'Toggle' },
  },
},
```

### 6. Responsive Stories

If the project configures viewports in Storybook:

```js
export const Mobile = { ...Default };
Mobile.parameters = {
  viewport: { defaultViewport: 'mobile1' },
};

export const Tablet = { ...Default };
Tablet.parameters = {
  viewport: { defaultViewport: 'tablet' },
};
```

### 7. Decorator Patterns

Match the project's decorator usage. Common Catalyst patterns:

**Layout Decorator** (wraps component in a constrained container):
```tsx
export default {
  title: 'Components/HeroBanner',
  decorators: [
    (Story) => <div className="container mx-auto px-4"><Story /></div>,
  ],
};
```

**Theme Decorator** (applies project theme class):
```tsx
decorators: [
  (Story) => <div className="theme-light"><Story /></div>,
],
```

Only use decorators the project already uses. Do not invent new ones.

## Validation Checklist

Before delivering a generated story:
- [ ] Story format matches project convention (CSF2/CSF3/MDX)
- [ ] File name matches project naming pattern
- [ ] File location matches project convention (co-located vs separate)
- [ ] Imports match project import style
- [ ] Class names in story match the implemented component exactly
- [ ] All dialog-authorable fields have corresponding args
- [ ] Args have appropriate controls and descriptions
- [ ] Default story shows happy path (all fields populated)
- [ ] Edge case stories cover: long text, missing optional fields, empty states
- [ ] Story compiles and renders without errors (`npm run storybook`)
- [ ] No hardcoded values that should be args

## Rules

- NEVER generate a story in a format the project doesn't use (e.g., don't create CSF3 if project uses CSF2)
- NEVER invent class names — use exactly what the component implementation uses
- NEVER add decorators the project doesn't already use
- NEVER skip the project setup discovery step — every project's Storybook is different
- If the project uses a compile helper or template loader, use it. Do not bypass it with raw HTML.
- If Storybook build fails after adding the story, debug and fix before delivering
