# Storybook Standards

## Table of Contents
1. Story File Structure
2. Required Stories
3. Validation Workflow
4. Checklist

---

## 1. Story File Structure

Discover the project's Storybook setup from Storybook config and existing `*.stories.*` files. The example below shows a common Catalyst React + TypeScript pattern — adapt to what the project actually uses.

Example (Catalyst React + TypeScript pattern — replace with project's actual setup):
Framework: `@storybook/react-vite` (or `@storybook/nextjs` when Next.js features are needed)
Format: CSF 3.0 (Component Story Format) with TypeScript

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: { title: 'Product name' },
};

export const WithImage: Story = {
  args: {
    title: 'Product name',
    image: { url: '/placeholder.jpg', altText: 'Product photo' },
  },
};

export const Rtl: Story = {
  ...Default,
  parameters: { direction: 'rtl' },
};
```

Rules:
- One exported story per variant/theme
- Mock GraphQL Storefront data via MSW where stories need data fetching
- Title format: `'Components/{ComponentName}'`
- Use `tags: ['autodocs']` to auto-generate docs pages

---

## 2. Required Stories

Every component includes at minimum:

| Story | When Required |
|---|---|
| `Default` | Included for every component |
| `{VariantName}` | One per visual variant/theme |
| `Rtl` | Include when RTL layout needs visual verification |
| `Accessibility` | Include when used for axe-core a11y audit in Playwright |
| `Mobile` | When component has responsive behavior |

---

## 3. Validation Workflow

- After creating or modifying stories, validate in this order
- Use the repo's Storybook commands when they differ from the examples below

**Step 1: Build validation**
```bash
npm run build-storybook
```
Stories must compile without errors.

**Step 2: Runtime validation**
```bash
npm run storybook
```
Visit each story URL in the browser. Check:
- Component renders without console errors
- All variants match designs
- RTL story mirrors layout correctly
- No missing imports or broken references

**Step 3: Playwright validation**
Run Playwright tests against Storybook:
```bash
npx playwright test {component-name}.spec.js
```

**Error recovery:**
- `Module not found` → Fix import paths relative to story file
- `compile is not a function` → Check `.storybook/partials` import path
- `?raw not supported` → Confirm `@storybook/html-vite` builder is used
- Missing story renders blank → Check entry HTML calls the partial correctly

---

## 4. Checklist

- [ ] One story file per component (`{component-name}.stories.js`)
- [ ] All entry HTMLs imported as `?raw`
- [ ] Root `.js` imported for side effects
- [ ] `Default` story exported
- [ ] One story per variant/theme
- [ ] `Rtl` story exported
- [ ] `Accessibility` story exported
- [ ] Title format: `'Components/{ComponentName}'`
- [ ] `npm run build-storybook` passes
- [ ] All stories render without console errors
- [ ] RTL story visually correct
