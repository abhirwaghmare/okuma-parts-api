# Catalyst RSC Patterns

Catalyst is built on Next.js App Router. Default to React Server Components (RSC); reach for `'use client'` only when interactivity demands it.

## Mental model

| Layer | Pattern | Examples |
| --- | --- | --- |
| Data fetch + page shell | RSC | `app/[locale]/(default)/product/[slug]/page.tsx` |
| Interactive controls | Client component (`'use client'`) | Quantity picker, option swatches, mini-cart drawer |
| Mutations | Server action (`'use server'`) | Add-to-cart, apply coupon, update address |
| External effects | Route handler (`app/api/.../route.ts`) | Webhooks, REST proxies |

## Where data fetching lives

Always in RSC or server actions — never in client components.

```tsx
// app/[locale]/(default)/product/[slug]/page.tsx  (RSC)
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getProduct } from './page-data';
import { ProductHero } from './_components/product-hero';
import { ProductDetails } from './_components/product-details';
import { RelatedProducts } from './_components/related-products';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <main>
      <ProductHero product={product} />

      {/* Stream heavy below-the-fold content */}
      <Suspense fallback={<ProductDetails.Skeleton />}>
        <ProductDetails product={product} />
      </Suspense>

      <Suspense fallback={null}>
        <RelatedProducts productId={product.entityId} />
      </Suspense>
    </main>
  );
}
```

## Parallel data loading

Don't await sequentially when fetches are independent. Kick them off together.

```tsx
export default async function CartPage() {
  const [cart, recommendations] = await Promise.all([getCart(), getRecommendations()]);
  return <CartView cart={cart} recommendations={recommendations} />;
}
```

For RSC streaming with independent slow data, use child `<Suspense>` boundaries — each child can `await` its own data and stream when ready.

## Client component boundary

A component becomes a client component the moment it uses:
- `useState`, `useEffect`, `useRef`, `useReducer`
- Browser-only APIs (`window`, `document`, `localStorage`)
- Event handlers passed to DOM elements

Keep client components small and leaf-shaped:

```tsx
// _components/quantity-input.tsx
'use client';

import { useState } from 'react';
import { updateLineItem } from '../_actions/update-line-item';

export function QuantityInput({ initial, lineItemId }: { initial: number; lineItemId: string }) {
  const [value, setValue] = useState(initial);

  async function commit(next: number) {
    setValue(next);
    const fd = new FormData();
    fd.set('id', lineItemId);
    fd.set('quantity', String(next));
    await updateLineItem({ lastResult: null, lineItems: [] }, fd);
  }

  return (
    <div>
      <button onClick={() => commit(Math.max(1, value - 1))}>-</button>
      <span>{value}</span>
      <button onClick={() => commit(value + 1)}>+</button>
    </div>
  );
}
```

## Passing data from RSC → client

You can pass:
- Plain serialisable props (numbers, strings, dates, plain objects, arrays).
- React node children.

You cannot pass:
- Functions, class instances, Map/Set with non-serialisable values, GraphQL clients.

Always pre-shape the data in RSC into the minimal client-facing type, masking fragment unions explicitly.

## Composition pattern: server "shell" + client islands

```tsx
// _components/product-details.tsx  (RSC)
import { Suspense } from 'react';

import { ConfiguratorClient } from './configurator.client';
import { ReviewsClient } from './reviews.client';

export function ProductDetails({ product }: { product: Product }) {
  const initialSelection = deriveInitialSelection(product);

  return (
    <section>
      <h1>{product.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: product.description }} />
      <ConfiguratorClient
        productEntityId={product.entityId}
        options={product.options}
        initialSelection={initialSelection}
      />
      <Suspense fallback={null}>
        <ReviewsClient productId={product.entityId} />
      </Suspense>
    </section>
  );
}
```

Server does the heavy data shaping; client gets only the minimum needed for interactivity.

## Loading and error UI

- `loading.tsx` per route — streamed shell while RSC awaits.
- `error.tsx` per route — boundary for thrown errors during RSC render.
- `not-found.tsx` — when `notFound()` is called.

```tsx
// app/[locale]/(default)/product/[slug]/loading.tsx
export default function Loading() { return <ProductSkeleton />; }

// app/[locale]/(default)/product/[slug]/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Something went wrong loading this product.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Metadata

```tsx
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.seo.pageTitle || product.name,
    description: product.seo.metaDescription,
    openGraph: { images: product.defaultImage ? [product.defaultImage.url] : undefined },
  };
}
```

## Anti-patterns

- `'use client'` at the top of a layout or page — converts the entire subtree to client, defeats RSC.
- Fetching from client components with `useEffect` — duplicate data, no cache benefit.
- Passing the GraphQL client through props — server-only object, will throw.
- Mixing `<Suspense>` with `cache: 'no-store'` everywhere — kills streaming benefits.
