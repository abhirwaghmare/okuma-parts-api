# Makeswift Integration

Makeswift is Catalyst's recommended visual page builder. Marketers edit pages visually; developers register React components that Makeswift can drop into pages. Catalyst pages render Makeswift content via the `MakeswiftComponent` slot.

## Install

```bash
pnpm add @makeswift/runtime next-makeswift
```

`.env.local`:
```bash
MAKESWIFT_SITE_API_KEY=...
```

The site API key is server-side. Per-environment keys allow isolating preview/production content.

## Runtime + provider

```ts
// lib/makeswift/runtime.ts
import { ReactRuntime } from '@makeswift/runtime/react';

export const runtime = new ReactRuntime();
```

```tsx
// app/[locale]/layout.tsx
import { ReactRuntimeProvider } from '@makeswift/runtime/next';

import { runtime } from '~/lib/makeswift/runtime';

import './register-components'; // side-effect imports

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ReactRuntimeProvider runtime={runtime}>{children}</ReactRuntimeProvider>
      </body>
    </html>
  );
}
```

## Register a component

```tsx
// lib/makeswift/components/hero.makeswift.ts
import { Style, TextInput, Image } from '@makeswift/runtime/controls';

import { runtime } from '~/lib/makeswift/runtime';
import { Hero } from '~/components/hero';

runtime.registerComponent(Hero, {
  type: 'hero',
  label: 'Hero',
  props: {
    className: Style({ properties: Style.All }),
    title: TextInput({ label: 'Title', defaultValue: 'Welcome' }),
    subtitle: TextInput({ label: 'Subtitle' }),
    image: Image({ label: 'Background image' }),
  },
});
```

`Hero` is a normal React component (server or client — your call). Makeswift passes the configured props at render time.

## Render Makeswift content

```tsx
// app/[locale]/(default)/[[...rest]]/page.tsx
import { MakeswiftComponent } from '@makeswift/runtime/next';
import { client as makeswiftClient } from '~/lib/makeswift/client';

import { runtime } from '~/lib/makeswift/runtime';

export default async function CatchAllPage({ params, searchParams }: { params: Promise<{ rest?: string[] }>; searchParams: Promise<Record<string, string>> }) {
  const { rest = [] } = await params;
  const path = '/' + rest.join('/');
  const sp = await searchParams;

  const snapshot = await makeswiftClient.getPageSnapshot(path, {
    siteVersion: sp['x-makeswift-draft-mode'] ? 'Working' : 'Live',
  });

  if (!snapshot) return null;

  return <MakeswiftComponent snapshot={snapshot} label="Page" runtime={runtime} />;
}
```

Notes:
- The Makeswift catch-all should be the **last** route resolver — let real Catalyst routes (PDP, PLP) match first.
- Use `siteVersion: 'Working'` for draft mode; `'Live'` for production.

## Draft mode

Editors preview unpublished content. Next.js has built-in `draftMode()`:

```ts
// app/api/draft/route.ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (secret !== process.env.MAKESWIFT_DRAFT_SECRET) return new Response('Unauthorized', { status: 401 });

  (await draftMode()).enable();
  redirect(url.searchParams.get('path') ?? '/');
}
```

When draft mode is on, fetch from Makeswift with `siteVersion: 'Working'`. Always set `cache: 'no-store'` for draft content.

## Mixing BC product data with Makeswift content

Pattern: Makeswift drops a "Product Showcase" component on a marketing page; the component reads a product entity ID and fetches BC data.

```tsx
// components/product-showcase.tsx
import { client } from '~/client';
import { ProductCardQuery } from './query';

export async function ProductShowcase({ entityId }: { entityId: number }) {
  const res = await client.fetch({
    document: ProductCardQuery,
    variables: { entityId, currencyCode: 'USD' },
    fetchOptions: { next: { revalidate: 300 } },
  });

  const product = res.data.site.product;
  return product ? <ProductCard product={product} /> : null;
}
```

Register with a `Number` control so editors pick the product:

```ts
runtime.registerComponent(ProductShowcase, {
  type: 'product-showcase',
  label: 'Product Showcase',
  props: {
    entityId: Number({ label: 'Product entity ID', defaultValue: 0 }),
  },
});
```

For better editor UX, build a custom control that pickers from BC's product catalog and stores `entityId`.

## Server vs client components in Makeswift

- Makeswift supports both. Server components run on the server during snapshot render — efficient for data-heavy slots.
- Use client components for interactive widgets (carousel, tabs).

## Revalidation

Makeswift can call your storefront on publish:
1. Set a publish webhook URL pointing at `/api/revalidate-makeswift`.
2. In the handler, `revalidatePath('/')` or `revalidateTag(TAGS.makeswiftPage(path))`.

## Anti-patterns

- Rendering the Makeswift catch-all before BC route resolution — every PDP becomes a 404.
- Hard-coding API keys in client code — Makeswift's site API key is server-only.
- Using `siteVersion: 'Working'` in production — editors' unpublished changes leak.
- Server actions inside Makeswift-registered client components without bundling — Next.js will complain.
