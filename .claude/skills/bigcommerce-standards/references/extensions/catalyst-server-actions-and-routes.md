# Server Actions and Route Handlers

Catalyst uses Next.js App Router conventions for server-side work: server actions (`'use server'`) for form submissions and mutations, route handlers (`app/.../route.ts`) for HTTP endpoints (webhooks, REST proxies, health checks).

## Server actions

### Conventions

- Live under `app/.../_actions/<verb>.ts`.
- Start with the `'use server'` directive.
- Are imported by client components and invoked via form submission or programmatically.
- Run in the Node.js runtime by default.
- Have access to `cookies()`, `headers()`, and the GraphQL `client`.
- Should validate inputs with Zod (`@conform-to/zod`) — never trust the form.

### Standard server action shape

```ts
'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { parseWithZod } from '@conform-to/zod';
import { getTranslations } from 'next-intl/server';

import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { TAGS } from '~/client/tags';
import { cartLineItemActionFormDataSchema } from '@/vibes/soul/sections/cart/schema';

const UpdateCartLineItemMutation = graphql(`
  mutation UpdateCartLineItem($input: UpdateCartLineItemInput!) {
    cart { updateCartLineItem(input: $input) { cart { entityId } } }
  }
`);

export async function updateCartLineItem(
  prevState: { lastResult: unknown },
  formData: FormData,
) {
  const t = await getTranslations('Cart.Errors');

  const submission = parseWithZod(formData, { schema: cartLineItemActionFormDataSchema });
  if (submission.status !== 'success') {
    return { ...prevState, lastResult: submission.reply() };
  }

  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) {
    return { ...prevState, lastResult: submission.reply({ formErrors: [t('emptyCart')] }) };
  }

  try {
    await client.fetch({
      document: UpdateCartLineItemMutation,
      variables: { input: { cartEntityId: cartId, lineItemEntityId: submission.value.id, data: { quantity: submission.value.quantity, productEntityId: submission.value.productEntityId } } },
      fetchOptions: { cache: 'no-store' },
    });
    revalidateTag(TAGS.cart);
    return { lastResult: submission.reply({ resetForm: true }) };
  } catch (err) {
    return { ...prevState, lastResult: submission.reply({ formErrors: [t('unknown')] }) };
  }
}
```

### Calling a server action from a client component

```tsx
'use client';

import { useFormState } from 'react-dom';
import { updateCartLineItem } from '../_actions/update-line-item';

export function QuantityInput() {
  const [state, action] = useFormState(updateCartLineItem, { lastResult: null });
  return (
    <form action={action}>
      <input name="quantity" type="number" min={1} />
      <button type="submit">Update</button>
    </form>
  );
}
```

### Programmatic invocation

Server actions can be imported and awaited directly from server components:

```tsx
import { applyCouponCode } from './_actions/apply-coupon-code';

export default async function CartPage() {
  // Inside this RSC, we can call the action without a form by manufacturing FormData.
}
```

## Route handlers (`route.ts`)

Use for:
- Webhooks (`app/api/webhooks/bigcommerce/route.ts`).
- REST Management proxy endpoints when the client cannot call BC directly.
- Health checks (`app/api/health/route.ts`).
- Headless integrations (search APIs, A/B test config, etc.).

### Webhook example

```ts
// app/api/webhooks/bigcommerce/route.ts
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { TAGS } from '~/client/tags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const sigHeader = (await headers()).get('X-BC-Webhook-Signature') ?? '';

  const expected = crypto
    .createHmac('sha256', process.env.BIGCOMMERCE_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body) as { scope: string; data: { type: string; id: number } };

  switch (event.scope) {
    case 'store/product/updated':
      revalidateTag(TAGS.product(event.data.id));
      break;
    case 'store/category/updated':
      revalidateTag(TAGS.categories);
      break;
    case 'store/order/created':
      // forward to OMS, send analytics, etc.
      break;
  }

  return Response.json({ ok: true });
}
```

### Runtime selection

| Runtime | When to use |
| --- | --- |
| `nodejs` (default) | Anything calling REST Management (uses Node `crypto`), DB libraries, file I/O |
| `edge` | Cache-warm pings, lightweight redirects, geo-detection, request inspection |

Pick by `export const runtime = 'edge' | 'nodejs'`. Most BC integrations need `nodejs`.

### Dynamic vs static

Webhook handlers must `export const dynamic = 'force-dynamic'` to bypass any caching layer and run on every request.

## Form actions in server components

```tsx
// Server component
export default function NewsletterForm() {
  async function subscribe(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '');
    // call REST Management or third-party
  }

  return (
    <form action={subscribe}>
      <input name="email" type="email" required />
      <button type="submit">Subscribe</button>
    </form>
  );
}
```

Inline `'use server'` is allowed for one-off server actions defined inside an RSC.

## Anti-patterns

- Calling REST Management from a client component via a server action that returns the raw token — leaks credentials into client state.
- Server actions returning sensitive PII without redacting (`addresses`, full order details with payment metadata).
- Not validating with Zod and trusting `formData` — XSS or injection downstream.
- Using `runtime = 'edge'` for handlers that need `node:crypto` HMAC verification.
