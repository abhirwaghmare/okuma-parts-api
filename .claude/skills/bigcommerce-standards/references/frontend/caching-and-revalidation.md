# Caching and Revalidation

Next.js App Router caches at several layers:
1. Request Memoization — per-request, deduplicates `fetch` calls.
2. Data Cache — persistent across requests, keyed by URL + headers.
3. Full Route Cache — static HTML of fully-prerendered routes.
4. Router Cache — client-side route segment cache.

Catalyst tunes each layer for BC data lifecycle.

## Default tag map

```ts
// core/client/tags.ts
export const TAGS = {
  categories: 'categories',
  category: (id: number) => `category-${id}`,
  brand: (id: number) => `brand-${id}`,
  product: (id: number) => `product-${id}`,
  cart: 'cart',
  customer: 'customer',
  settings: 'settings',
};
```

## Revalidate target

```ts
// core/client/revalidate-target.ts
export const revalidate = Number(process.env.DEFAULT_REVALIDATE_TARGET ?? 3600);
```

Default 1 hour. Override per call when needed.

## Per-query cache strategy

| Query | Strategy |
| --- | --- |
| Site settings, nav, category tree | `next: { revalidate: 3600, tags: ['settings', 'categories'] }` |
| Product detail (anonymous) | `next: { revalidate: 600, tags: [TAGS.product(id)] }` |
| Product detail (customer-scoped pricing) | `cache: 'no-store'` |
| Category PLP | `next: { revalidate: 300, tags: [TAGS.category(id)] }` |
| Search results | `next: { revalidate: 60 }` (or `no-store` if heavily personalised) |
| Cart query | `cache: 'no-store'` (always) |
| Customer query | `cache: 'no-store'` (always) |
| Order detail | `cache: 'no-store'` (always) |

```ts
const response = await client.fetch({
  document: ProductPageQuery,
  variables: { entityId, currencyCode: 'USD' },
  fetchOptions: { next: { revalidate: 600, tags: [TAGS.product(entityId)] } },
});
```

## `react.cache` for per-render memoization

```ts
import { cache } from 'react';

export const getProductBySlug = cache(async (slug: string) => {
  const res = await client.fetch({
    document: ProductByPathQuery,
    variables: { path: `/${slug}/` },
    fetchOptions: { next: { revalidate: 600 } },
  });
  return res.data.site.route.node;
});
```

Multiple RSC components in one render call `getProductBySlug` once — `react.cache` collapses them.

## `unstable_cache` for non-fetch caching

For heavy computations or non-fetch lookups (e.g., currency conversion table):

```ts
import { unstable_cache } from 'next/cache';

export const getCurrencyTable = unstable_cache(
  async () => {
    const res = await fetch('https://api.frankfurter.app/latest');
    return res.json();
  },
  ['currency-table'],
  { revalidate: 3600, tags: ['currency'] },
);
```

## Invalidation via webhooks

```ts
import { revalidateTag } from 'next/cache';

case 'store/product/updated':
  revalidateTag(TAGS.product(payload.data.id));
  break;

case 'store/category/created':
case 'store/category/updated':
case 'store/category/deleted':
  revalidateTag(TAGS.categories);
  break;
```

See `extensions/webhooks-and-event-bridge.md` for full handler.

## `revalidatePath` vs `revalidateTag`

- `revalidateTag('product-123')` — invalidate every Data Cache entry tagged `product-123`. Use when many routes consume the same data.
- `revalidatePath('/product/widget-x')` — invalidate Full Route Cache for that exact URL. Use when you know one route is stale.

Prefer tags for breadth; paths for surgical invalidation.

## Streaming with Suspense

Streamed RSC can hold a fast initial paint and progressively stream slow data. Combine with `cache: 'no-store'` for personalised slices:

```tsx
<Suspense fallback={<CartSkeleton />}>
  <CartContents />
</Suspense>
```

`CartContents` is an RSC that awaits `getCart()` with `cache: 'no-store'` — the shell renders immediately, cart streams in.

## Full Route Cache

A route is fully prerendered (static HTML) when:
- It has no dynamic functions (`cookies()`, `headers()`, `searchParams`).
- All `fetch` calls have `next: { revalidate }` (not `no-store`).

If any RSC in the route uses `cookies()` (cart, customer), the entire route becomes dynamic. That is the right answer for cart/account pages — never try to force them static.

## Anti-patterns

- `cache: 'force-cache'` on customer or cart queries — privacy hazard.
- `revalidate: 0` instead of `cache: 'no-store'` — ambiguous behaviour across Next versions.
- Calling `revalidateTag` from a client component — server-only API.
- Tagging every product with a single `'product'` tag — one webhook invalidates the entire catalog cache.
- Mixing `revalidatePath` and `revalidateTag` without a clear ownership model — invalidations race and miss.
