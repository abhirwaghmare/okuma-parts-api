# Testing Standards (Playwright)

## Table of Contents
1. Test File Structure
2. Eight Test Categories
3. Accessibility Testing
4. Visual Regression
5. Cross-Browser
6. Checklist

---

## 1. Test File Structure

Test file: `{components-path}/{component-name}/{component-name}.spec.js`

```javascript
const { test, expect } = require('@playwright/test');
const { checkA11y, injectAxe } = require('axe-playwright');

const STORYBOOK_URL = 'http://localhost:6006';
const STORY_PATH = '/?path=/story/components-{name}--';

test.describe('{ComponentName}', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${STORYBOOK_URL}${STORY_PATH}default`);
        await page.waitForLoadState('networkidle');
    });

    // Tests organized by category (see below)
});
```

---

## 2. Eight Test Categories

Every component must have tests covering all 8 categories.

### Category 1: Rendering

```javascript
test('renders without errors', async ({ page }) => {
    const component = page.locator('.cmp-{name}');
    await expect(component).toBeVisible();
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    expect(errors).toHaveLength(0);
});
```

### Category 2: Variants

```javascript
test('all variants render', async ({ page }) => {
    const variants = ['default', 'theme-dark', 'rtl'];
    for (const variant of variants) {
        await page.goto(`${STORYBOOK_URL}${STORY_PATH}${variant}`);
        await expect(page.locator('.cmp-{name}')).toBeVisible();
    }
});
```

### Category 3: Interactions

```javascript
test('handles click interaction', async ({ page }) => {
    const button = page.locator('.cmp-{name}__button');
    await button.click();
    await expect(page.locator('.cmp-{name}__panel')).toBeVisible();
});
```

### Category 4: Keyboard Navigation

```javascript
test('keyboard navigation — Tab, Enter, Escape', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('.cmp-{name}__panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.cmp-{name}__panel')).toBeHidden();
});
```

### Category 5: Accessibility (axe-core)

```javascript
test('accessibility — WCAG 2.2 AA', async ({ page }) => {
    await injectAxe(page);
    await checkA11y(page, '.cmp-{name}', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        detailedReport: true,
    });
});
```

### Category 6: Responsive

```javascript
const breakpoints = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
];

for (const bp of breakpoints) {
    test(`renders at ${bp.name} (${bp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.reload();
        await expect(page.locator('.cmp-{name}')).toBeVisible();
    });
}
```

### Category 7: RTL

```javascript
test('RTL layout renders correctly', async ({ page }) => {
    await page.goto(`${STORYBOOK_URL}${STORY_PATH}rtl`);
    const component = page.locator('.cmp-{name}');
    await expect(component).toBeVisible();
    // Verify RTL-specific layout properties if applicable
    const direction = await component.evaluate(el =>
        getComputedStyle(el).direction
    );
    expect(direction).toBe('rtl');
});
```

### Category 8: Visual Regression

```javascript
test('visual regression — default', async ({ page }) => {
    await expect(page.locator('.cmp-{name}')).toHaveScreenshot(
        '{name}-default.png',
        { maxDiffPixelRatio: 0.01 }
    );
});
```

Run `npx playwright test --update-snapshots` to update baselines after intentional visual changes.

---

## 3. Accessibility Testing

Use axe-core via `axe-playwright` on every story variant:

```javascript
test('accessibility — all variants', async ({ page }) => {
    const variants = ['default', 'theme-dark'];
    for (const variant of variants) {
        await page.goto(`${STORYBOOK_URL}${STORY_PATH}${variant}`);
        await injectAxe(page);
        await checkA11y(page, '.cmp-{name}', {
            runOnly: { type: 'tag', values: ['wcag2aa', 'wcag22aa'] },
        });
    }
});
```

Fix all `critical` and `serious` violations. Document `moderate` violations with justification.

---

## 4. Visual Regression

Baselines are stored in `{component-name}.spec.js-snapshots/`.

Update strategy:
- Run `--update-snapshots` only for intentional visual changes
- Review diff images before committing updated snapshots
- Include snapshot updates in the same PR as the visual change

---

## 5. Cross-Browser

Configure in `playwright.config.js`:

```javascript
projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
]
```

All 5 browsers must pass before merge.

---

## 6. Checklist

- [ ] Test file at `{component-name}/{component-name}.spec.js`
- [ ] Category 1: Rendering (component visible, no console errors)
- [ ] Category 2: All variants render
- [ ] Category 3: Interactions (click, hover, toggle)
- [ ] Category 4: Keyboard (Tab, Enter, Space, Escape)
- [ ] Category 5: Accessibility (axe-core WCAG 2.2 AA)
- [ ] Category 6: Responsive (375px, 768px, 1440px)
- [ ] Category 7: RTL layout correct
- [ ] Category 8: Visual regression baselines set
- [ ] All 5 browsers pass (chromium, firefox, webkit, mobile-chrome, mobile-safari)
- [ ] No critical/serious axe violations
