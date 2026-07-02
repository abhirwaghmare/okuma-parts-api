# Vitest + React Testing Library + MSW

Catalyst's recommended unit/integration test stack:
- **Vitest** — fast Vite-based test runner.
- **React Testing Library** — DOM testing, user-event simulation.
- **MSW** — request interception for GraphQL Storefront and REST Management.

## Install

```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw @vitejs/plugin-react
```

## Vitest config

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '~': path.resolve(__dirname, './') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: { reporter: ['text', 'html'], lines: 80 },
  },
});
```

## Setup file

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## MSW handlers (GraphQL)

```ts
// tests/msw/server.ts
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';

const STOREFRONT_GRAPHQL = `https://store-${process.env.BIGCOMMERCE_STORE_HASH ?? 'test'}.mybigcommerce.com/graphql`;

export const handlers = [
  graphql.query('ProductByEntityId', () =>
    HttpResponse.json({
      data: {
        site: {
          product: {
            entityId: 1,
            name: 'Test Product',
            path: '/test-product/',
            prices: {
              price: { value: 19.99, currencyCode: 'USD' },
              basePrice: { value: 24.99, currencyCode: 'USD' },
              retailPrice: null,
              salePrice: { value: 19.99, currencyCode: 'USD' },
              priceRange: { min: { value: 19.99, currencyCode: 'USD' }, max: { value: 19.99, currencyCode: 'USD' } },
            },
          },
        },
      },
    }),
  ),
];

export const server = setupServer(...handlers);
```

MSW intercepts by query name when using `graphql.query(name, ...)`. For un-named operations use `graphql.operation(...)`.

## Component test (client component)

```tsx
// components/quantity-input.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QuantityInput } from './quantity-input';

// mock the server action
vi.mock('../_actions/update-line-item', () => ({
  updateLineItem: vi.fn(async () => ({ lastResult: null, lineItems: [] })),
}));

describe('QuantityInput', () => {
  it('increments quantity on plus click', async () => {
    const user = userEvent.setup();
    render(<QuantityInput initial={1} lineItemId="abc" />);

    await user.click(screen.getByRole('button', { name: '+' }));

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not allow quantity below 1', async () => {
    const user = userEvent.setup();
    render(<QuantityInput initial={1} lineItemId="abc" />);

    await user.click(screen.getByRole('button', { name: '-' }));

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
```

## RSC testing limits

React Server Components cannot be rendered in jsdom. Two practical paths:

1. **Extract the data-shaping logic** out of the RSC into a pure async function, test the function with MSW, and skip rendering.
2. **Render via Playwright** in a real Next.js dev server (see `playwright-e2e.md`).

```ts
// page-data.test.ts
import { describe, expect, it } from 'vitest';

import { getProduct } from './page-data';

describe('getProduct', () => {
  it('returns product on happy path', async () => {
    const product = await getProduct('/test-product/');
    expect(product?.name).toBe('Test Product');
  });

  it('returns null on missing slug', async () => {
    const product = await getProduct('/does-not-exist/');
    expect(product).toBeNull();
  });
});
```

## Server action tests

Server actions are async functions — call them directly with crafted `FormData`.

```ts
// _actions/apply-coupon-code.test.ts
import { describe, expect, it } from 'vitest';

import { applyCouponCode } from './apply-coupon-code';

describe('applyCouponCode', () => {
  it('returns ok on valid coupon', async () => {
    const fd = new FormData();
    fd.set('couponCode', 'SUMMER10');
    const result = await applyCouponCode(fd);
    expect(result.ok).toBe(true);
  });

  it('rejects empty coupon', async () => {
    const fd = new FormData();
    fd.set('couponCode', '');
    const result = await applyCouponCode(fd);
    expect(result.ok).toBe(false);
  });
});
```

Mock `cookies()` and `revalidateTag` via `vi.mock('next/headers', ...)` and `vi.mock('next/cache', ...)` when the action depends on them.

## Coverage targets

- 80% lines on new code.
- 100% on validation schemas and pricing/discount math.
- Cover happy + null/empty + boundary + error paths for every public function.

## Anti-patterns

- Mocking `client.fetch` directly with `vi.mock` — fragile across renames. Prefer MSW.
- Testing implementation details (internal hooks) instead of user-visible behaviour.
- Snapshots on dynamic time/date strings — pin clock with `vi.useFakeTimers()`.
