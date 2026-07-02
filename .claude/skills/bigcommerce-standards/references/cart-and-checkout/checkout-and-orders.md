# Checkout and Orders

Catalyst uses BigCommerce's hosted checkout by default. The cart-to-checkout transition mints redirect URLs scoped to the cart; the order is finalised by BC; the storefront renders an order-confirmation page.

## Mint checkout redirect URLs

```graphql
mutation CreateCartRedirectUrls($input: CreateCartRedirectUrlsInput!) {
  cart {
    createCartRedirectUrls(input: $input) {
      redirectUrls {
        embeddedCheckoutUrl
        redirectedCheckoutUrl
      }
    }
  }
}
```

Input:
```ts
{ cartEntityId: 'abc-...' }
```

Outputs:
- `redirectedCheckoutUrl` — hosted, full-page checkout. Default Catalyst path.
- `embeddedCheckoutUrl` — used with the Embedded Checkout SDK (custom shell, BC iframe content).

Each URL is single-use and short-lived. Mint fresh on every "Go to checkout" click.

## Server action: go to checkout

```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const CreateCartRedirectUrlsMutation = graphql(`
  mutation CreateCartRedirectUrls($input: CreateCartRedirectUrlsInput!) {
    cart {
      createCartRedirectUrls(input: $input) {
        redirectUrls { redirectedCheckoutUrl }
      }
    }
  }
`);

export async function goToCheckout() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get('cartId')?.value;

  if (!cartId) {
    throw new Error('Cart is empty');
  }

  const res = await client.fetch({
    document: CreateCartRedirectUrlsMutation,
    variables: { input: { cartEntityId: cartId } },
    fetchOptions: { cache: 'no-store' },
  });

  const url = res.data.cart.createCartRedirectUrls.redirectUrls.redirectedCheckoutUrl;

  if (!url) {
    throw new Error('Failed to create checkout URL');
  }

  redirect(url);
}
```

## Embedded Checkout

If the business requires a custom-styled checkout in the storefront DNS:

1. Mint `embeddedCheckoutUrl`.
2. Load `@bigcommerce/checkout-sdk` in a client component.
3. Call `embedCheckout({ containerId: 'checkout', url })`.
4. Subscribe to `onComplete` and route to the order-confirmation page.

Caveats:
- Embedded Checkout requires it to be enabled on the BC channel.
- The `embeddedCheckoutUrl` host must be added to the channel's CORS whitelist.

## Order confirmation

After successful checkout, BC redirects to `/order-confirmation/{order_id}` (Catalyst maps this to `app/[locale]/(default)/order-confirmation/[orderId]/page.tsx`).

```graphql
query OrderConfirmation($filter: OrderFilterInput!) {
  site {
    order(filter: $filter) {
      entityId
      orderedAt { utc }
      status { label value }
      subTotal { value currencyCode }
      shipping { value currencyCode }
      taxTotal { value currencyCode }
      totalIncTax { value currencyCode }
      consignments {
        shipping {
          edges {
            node {
              entityId
              shippingAddress { firstName lastName address1 city stateOrProvince postalCode countryCode }
              lineItems {
                edges {
                  node { entityId name quantity productEntityId variantEntityId subTotalListPrice { value currencyCode } }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Always require an order access token (BC sets a signed cookie after checkout completes) before showing the confirmation. Do not expose order data by raw `orderId` in the URL.

## Order webhooks

After the order is placed BC fires `store/order/created`, `store/order/updated`, `store/order/statusUpdated`. Use webhooks for:
- Sending confirmation emails (if not relying on BC's built-in).
- Forwarding to ERP/OMS.
- Invalidating cart cache and clearing the `cartId` cookie (rare — usually handled by checkout success page).

See `extensions/webhooks-and-event-bridge.md`.

## Headless / custom checkout (advanced)

If hosted/embedded does not meet the requirements (B2B PO workflows, multi-step custom shipping), use the Checkout REST API (`/v3/checkouts/{cartId}`, `/v3/checkouts/{cartId}/billing-address`, `/v3/checkouts/{cartId}/consignments`, `/v3/checkouts/{cartId}/payments`) directly. Higher complexity — only choose when the hosted experience is genuinely insufficient.

## Anti-patterns

- Reusing `redirectedCheckoutUrl` across multiple clicks — it expires.
- Embedding the hosted checkout in an iframe without BC's Embedded Checkout SDK — CSP and CSRF problems.
- Showing order details on `/order-confirmation/{id}` without verifying the signed order cookie — IDOR risk.
