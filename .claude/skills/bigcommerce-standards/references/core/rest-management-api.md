# REST Management API

Server-only API for admin and back-of-house operations. Authenticated with `X-Auth-Token`. Never call from the browser.

## When to use REST vs GraphQL Storefront

| Use case | API |
| --- | --- |
| Storefront reads (products, categories, cart) | GraphQL Storefront |
| Storefront writes (cart line items, coupons) | GraphQL Storefront |
| Customer login / impersonation token mint | REST Management (Customer Login API) |
| Catalog create/update/delete (CMS automation) | REST Management |
| Order management (refunds, status, capture) | REST Management |
| Webhook subscription management | REST Management |
| Channels, sites, routes setup | REST Management |
| Customer Group changes | REST Management |
| Promotions / coupon code creation | REST Management |
| Settings rarely changed by shoppers | REST Management |

## Authentication

API account credentials (Store-level API Account):
- `Client ID`
- `Access Token` → goes in `X-Auth-Token`
- Scopes — store-level (admin) vs channel-level (storefront-scoped)

Header set:
```ts
const headers = {
  'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN!,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};
```

Base URL pattern:
```
https://api.bigcommerce.com/stores/{store_hash}/v3/...
https://api.bigcommerce.com/stores/{store_hash}/v2/...
```

Some endpoints (login, customer current token) live on different roots:
```
https://login.bigcommerce.com/customer/current.jwt?app_client_id={client_id}
```

## Example: fetch a product (REST)

```ts
// app/api/admin/products/route.ts
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sku = url.searchParams.get('sku');

  if (!sku) return Response.json({ error: 'sku required' }, { status: 400 });

  const res = await fetch(
    `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v3/catalog/products?sku=${encodeURIComponent(sku)}`,
    {
      headers: {
        'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN!,
        'Accept': 'application/json',
      },
      // server-only, never cache PII or admin data unless intentional
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return Response.json({ error: 'upstream' }, { status: 502 });
  }

  const json = await res.json();

  return Response.json(json);
}
```

## Key endpoints

| Domain | Endpoint |
| --- | --- |
| Catalog products | `GET/POST/PUT/DELETE /v3/catalog/products` |
| Catalog variants | `/v3/catalog/products/{product_id}/variants` |
| Catalog categories | `/v3/catalog/categories` (tree: `/v3/catalog/categories/tree`) |
| Catalog brands | `/v3/catalog/brands` |
| Customers | `/v3/customers` |
| Customer Groups | `/v2/customer_groups` |
| Orders | `/v2/orders` (and `/v2/orders/{id}/shipments`, `/refunds`) |
| Webhooks | `/v3/hooks` |
| Channels | `/v3/channels` |
| Sites and Routes | `/v3/sites`, `/v3/sites/{site_id}/routes` |
| Customer Login token mint | `POST /v3/customer/current/customers/{id}/jwt` (login JWT flow) |
| Carts (server-to-server) | `/v3/carts` |

## Scopes

| Need | Required scope |
| --- | --- |
| Read products | `Products: read-only` |
| Create/update products | `Products: modify` |
| Read orders | `Orders: read-only` |
| Refund/capture | `Orders: modify`, `Information & Settings: read-only` for taxes |
| Webhooks | `Information & Settings: modify` |
| Customer Login | `Customers Login: login` |
| Carts | `Carts: modify` |

Channel-scoped tokens limit access to a single channel — useful for multi-storefront isolation.

## Rate limits

- Quotas vary by plan; check `X-Rate-Limit-Requests-Left` and `X-Rate-Limit-Time-Reset-Ms` on every response.
- Backoff exponentially when `429`. Use a queue for bulk catalog imports.

## Webhook signature verification

Always verify the BigCommerce webhook payload before processing. See `extensions/webhooks-and-event-bridge.md`.

## Anti-patterns

- Putting `X-Auth-Token` in `NEXT_PUBLIC_*`. Any `NEXT_PUBLIC_*` value is shipped to the browser bundle.
- Calling REST Management from a client component or from a server action that returns the raw token to client state.
- Caching customer or order responses with `force-cache` — always `cache: 'no-store'` for PII.
