# React Standards (BigCommerce Catalyst)

Patterns for Catalyst projects — Next.js 14 App Router, React Server Components, server actions, and TypeScript. Discover the project's Catalyst, Next.js, and React versions from `<codebase_stack>` before applying anything here.

## Catalyst Page (RSC) Integration

### Server Components by Default
Catalyst pages are React Server Components by default. Fetch data via `client.fetch` (gql.tada) and stream HTML to the client:

```tsx
// core/app/(default)/products/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const ProductPageQuery = graphql(`
  query ProductPage($entityId: Int!) {
    site {
      product(entityId: $entityId) {
        name
        description
      }
    }
  }
`);

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { data } = await client.fetch({
    document: ProductPageQuery,
    variables: { entityId: Number(params.slug) },
    fetchOptions: { next: { tags: ['product', `product-${params.slug}`] } },
  });

  const product = data.site.product;
  if (!product) notFound();

  return (
    <section className="product">
      <h1>{product.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: product.description }} />
    </section>
  );
}
```

### Client Components — When Required
Use `'use client'` only when interactivity demands it (event handlers, hooks, browser APIs):

```tsx
'use client';

import { useState } from 'react';

export function AddToCartButton({ entityId }: { entityId: number }) {
  const [isPending, setPending] = useState(false);
  // call a server action via form action or transition
  return (
    <button type="submit" disabled={isPending}>
      Add to cart
    </button>
  );
}
```

### Server Actions
Mutate state via server actions; validate with Zod (Conform's `parseWithZod` is the Catalyst pattern):

```tsx
'use server';

import { parseWithZod } from '@conform-to/zod';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const AddToCartSchema = z.object({ entityId: z.coerce.number(), quantity: z.coerce.number().min(1) });

export async function addToCart(_state: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: AddToCartSchema });
  if (submission.status !== 'success') return submission.reply();

  // call BigCommerce GraphQL via client.fetch with customer access token
  revalidateTag('cart');
  return submission.reply();
}
```

## Component Patterns

### Functional Components (default)
Use functional components with hooks. RSC components can be `async`:

```tsx
type CardProps = {
  title: string;
  image?: { url: string; altText: string };
  link?: { url: string; label: string };
};

export function Card({ title, image, link }: CardProps) {
  return (
    <article className="card">
      {image && <img src={image.url} alt={image.altText} loading="lazy" />}
      <h3>{title}</h3>
      {link && <a href={link.url}>{link.label}</a>}
    </article>
  );
}
```

### Props and TypeScript
Catalyst is TypeScript-first. Prefer explicit types on exported components:

```tsx
interface CardProps {
  title: string;
  image?: { url: string; altText: string };
  link?: { url: string; label: string };
}

export function Card({ title, image, link }: CardProps) { /* ... */ }
```

### Custom Hooks (client only)
Custom hooks must be used in client components (`'use client'`):

```tsx
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
```

## State Management

Discover from `<codebase_stack>` what the project uses:

| Pattern | When to Use |
|---------|------------|
| Server data via RSC | Default — data fetched on the server, passed as serializable props |
| useState/useReducer | Component-local interactive state |
| React Context | Shared client state (theme, locale, cart UI state) |
| URL state / search params | Page filters, pagination, persistent UI state |
| Zustand / Jotai | Complex cross-component client state (avoid for server data) |

For Catalyst, most data comes from RSC props — client-side stores are reserved for genuinely interactive UI state.

## Performance

### Memoization
```tsx
'use client';
const ExpensiveClient = React.memo(({ data }: { data: Data }) => { /* ... */ });
const computedValue = useMemo(() => expensiveCalc(data), [data]);
const stableCallback = useCallback(() => handleClick(id), [id]);
```

### Code Splitting via dynamic()
```tsx
import dynamic from 'next/dynamic';

const HeavyClientWidget = dynamic(() => import('./HeavyClientWidget'), {
  loading: () => <p>Loading...</p>,
});
```

### Image Optimization
- Use `next/image` with explicit `width` and `height` to prevent CLS
- Use the BigCommerce CDN with `urlTemplate(lossy: true)` for image URLs
- Provide responsive `sizes` for grid/gallery layouts
- Prefer AVIF/WebP via `next/image` defaults

## Testing

Catalyst uses Vitest + React Testing Library + MSW. Follow project test conventions:

```tsx
// Vitest + React Testing Library
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders the title', () => {
    render(<Card title="Welcome" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Welcome');
  });
});
```

Mock the GraphQL Storefront API with MSW — do not mock `client.fetch` directly.

## Common Pitfalls

- Calling GraphQL Storefront or REST Management API from a client component — must be RSC or server action
- Passing non-serializable values (functions, class instances) from RSC to client components
- Forgetting `revalidateTag` after cart/coupon/customer mutations — UI shows stale data
- Using `force-cache` on customer-scoped queries — leaks data across users; always `cache: 'no-store'`
- Direct DOM manipulation — use refs, not `document.querySelector`
- Memory leaks — clean up event listeners and subscriptions in `useEffect` return
- Exposing server-only env vars (`BIGCOMMERCE_ACCESS_TOKEN`, customer impersonation token) to the client bundle
