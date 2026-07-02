# Webhooks and Event Bridge

BigCommerce webhooks broadcast asynchronous events for catalog, order, customer, cart, and store changes. Use them to invalidate cache tags, sync to ERP/OMS, send notifications, or trigger downstream pipelines.

## Subscribe to a webhook

```bash
POST https://api.bigcommerce.com/stores/{store_hash}/v3/hooks
```

```json
{
  "scope": "store/order/created",
  "destination": "https://storefront.example.com/api/webhooks/bigcommerce",
  "is_active": true,
  "headers": { "X-Caller": "catalyst" }
}
```

Common scopes:

| Scope | Fires on |
| --- | --- |
| `store/product/created` | New product |
| `store/product/updated` | Product changed (price, name, options) |
| `store/product/deleted` | Product removed |
| `store/category/created`/`updated`/`deleted` | Category lifecycle |
| `store/sku/inventory/updated` | Inventory level change |
| `store/order/created` | Order placed |
| `store/order/updated` | Order modified |
| `store/order/statusUpdated` | Status transition |
| `store/customer/created`/`updated` | Customer lifecycle |
| `store/cart/created`/`updated`/`deleted` | Cart lifecycle (high volume — subscribe selectively) |

## Verify the signature

```ts
import crypto from 'node:crypto';

export function verifyBigCommerceSignature(rawBody: string, signature: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return (
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
```

Signature header: `X-BC-Webhook-Signature`. The secret is set via the webhook's `client_secret` configuration in BC.

## Handler skeleton (Next.js route handler)

```ts
// app/api/webhooks/bigcommerce/route.ts
import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { TAGS } from '~/client/tags';
import { verifyBigCommerceSignature } from '~/lib/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WebhookPayload = {
  scope: string;
  store_id: string;
  data: { type: string; id: number };
  hash: string;
  created_at: number;
  producer: string;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('X-BC-Webhook-Signature') ?? '';

  if (!verifyBigCommerceSignature(rawBody, signature, process.env.BIGCOMMERCE_WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Idempotency: dedupe on `hash` for 24h (Redis, Upstash, or DB)
  if (await isDuplicate(JSON.parse(rawBody).hash)) {
    return Response.json({ ok: true, deduped: true });
  }

  const payload = JSON.parse(rawBody) as WebhookPayload;

  // Respond fast (BC retries after 30s timeout). Push heavy work to a queue.
  void enqueueProcessing(payload);

  return Response.json({ ok: true });
}

async function process(payload: WebhookPayload) {
  switch (payload.scope) {
    case 'store/product/updated':
      revalidateTag(TAGS.product(payload.data.id));
      break;
    case 'store/category/updated':
    case 'store/category/created':
    case 'store/category/deleted':
      revalidateTag(TAGS.categories);
      break;
    case 'store/sku/inventory/updated':
      // refetch product to update stock display
      revalidateTag(TAGS.product(payload.data.id));
      break;
    case 'store/order/created':
      await syncOrderToERP(payload.data.id);
      break;
  }
}
```

## Retries and timeouts

- BC retries 3 times with exponential backoff if your handler returns non-2xx or times out (30s).
- Return 2xx fast — within 5s ideally. Defer heavy work to a background queue (SQS, Upstash Queue, Vercel Queue, Inngest).
- After 3 failures, the webhook is deactivated and notifies the API account owner.

## Idempotency

`payload.hash` is BC's idempotency key. Store recent hashes in Redis with a 24h TTL and dedupe.

```ts
async function isDuplicate(hash: string) {
  const exists = await redis.set(`bc:wh:${hash}`, '1', { nx: true, ex: 86400 });
  return exists === null;
}
```

## Cache tag map

```ts
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

Webhooks map directly to tag invalidations — easy to reason about.

## Local development

- Use ngrok or Cloudflare Tunnel to expose `localhost:3000` and register `https://<tunnel>/api/webhooks/bigcommerce` in BC.
- Set the `BIGCOMMERCE_WEBHOOK_SECRET` env var; never default it to a literal in code.

## Anti-patterns

- Returning 5xx because downstream is slow — BC retries 3 times then disables. Always 2xx-fast and queue.
- Skipping signature verification "for now" — guarantees production breach.
- Re-running side-effects on duplicate deliveries — order emails sent twice, inventory double-decremented.
- Subscribing to `store/cart/*` indiscriminately — extremely high volume in healthy stores.
