# Playwright E2E

Catalyst ships with a `playwright.config.ts` and `tests/` directory. Use Playwright for end-to-end flows: cart, checkout, login, B2B.

## Config

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'mobile', use: devices['iPhone 14'] },
  ],
});
```

## Add-to-cart flow

```ts
// tests/e2e/add-to-cart.spec.ts
import { test, expect } from '@playwright/test';

test('shopper adds a product to cart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /shop now/i }).click();

  // pick the first product card
  const firstCard = page.getByTestId('product-card').first();
  await firstCard.click();

  await expect(page).toHaveURL(/\/product\//);
  await page.getByRole('button', { name: /add to cart/i }).click();

  // mini-cart shows the item
  await page.getByRole('button', { name: /cart/i }).click();
  await expect(page.getByTestId('cart-item')).toHaveCount(1);
});
```

## Checkout redirect flow

```ts
test('cart redirects to BigCommerce hosted checkout', async ({ page, context }) => {
  // assume cart already has one item via test helper
  await addItemToCart(page, { sku: 'TEST-001' });
  await page.goto('/cart');

  const navigation = page.waitForURL(/checkout/);
  await page.getByRole('link', { name: /checkout/i }).click();
  await navigation;

  // hosted checkout host varies — assert origin contains the store hash
  expect(page.url()).toContain(process.env.BIGCOMMERCE_STORE_HASH ?? '');
});
```

## Login flow

```ts
test('customer logs in and sees account', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_CUSTOMER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_CUSTOMER_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
});
```

## B2B: quote request

```ts
test('B2B buyer requests a quote', async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto('/category/widgets');
  await page.getByTestId('product-card').first().click();
  await page.getByRole('button', { name: /request quote/i }).click();
  await page.getByLabel('Quote name').fill('Q4 procurement');
  await page.getByRole('button', { name: /submit/i }).click();
  await expect(page.getByText(/quote submitted/i)).toBeVisible();
});
```

## Embedded checkout stub (when applicable)

```ts
test('embedded checkout loads inside storefront', async ({ page }) => {
  await addItemToCart(page, { sku: 'TEST-001' });
  await page.goto('/checkout');

  // BC embedded checkout iframe
  const frame = page.frameLocator('iframe[name="bc-checkout"]');
  await expect(frame.getByLabel('Email')).toBeVisible();
});
```

## Test data strategy

- Use a dedicated **test channel** in BC for E2E. Never run E2E against the production channel.
- Seed test data via REST Management before the suite (`/v3/catalog/products`, `/v3/customers`).
- Tear down after the run — keep test channel pristine.
- Set `BIGCOMMERCE_CHANNEL_ID` to the test channel in the Playwright env.

## Network interception

Playwright can mock BC network calls when running against the local dev server:

```ts
await page.route('**/graphql', async (route) => {
  const json = JSON.parse(route.request().postData() ?? '{}');
  if (json.operationName === 'ProductByEntityId') {
    return route.fulfill({ status: 200, body: JSON.stringify({ data: { site: { product: stubProduct } } }) });
  }
  return route.continue();
});
```

Use sparingly — mocking too much defeats E2E purpose. Reserve for failure-mode tests (network errors, slow responses).

## CI

```yaml
# .github/workflows/e2e.yml (snippet)
- run: pnpm install --frozen-lockfile
- run: pnpm playwright install --with-deps
- run: pnpm build
- run: pnpm start &
- run: pnpm playwright test
  env:
    BIGCOMMERCE_STORE_HASH: ${{ secrets.BIGCOMMERCE_STORE_HASH }}
    BIGCOMMERCE_STOREFRONT_TOKEN: ${{ secrets.BIGCOMMERCE_STOREFRONT_TOKEN }}
    BIGCOMMERCE_CHANNEL_ID: ${{ vars.BIGCOMMERCE_TEST_CHANNEL_ID }}
```

## Accessibility checks

```ts
import AxeBuilder from '@axe-core/playwright';

test('PDP has no critical axe violations', async ({ page }) => {
  await page.goto('/product/test-product');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(critical).toEqual([]);
});
```

## Anti-patterns

- Running E2E against production store — risks polluting orders, exhausting stock.
- Hard-coding product IDs — fragile; seed and capture IDs at suite start.
- Relying on visual selectors (`.btn.btn-primary:nth-child(2)`) — use `data-testid` or role queries.
- Skipping `await page.waitForLoadState('networkidle')` before assertions on RSC-streamed content.
