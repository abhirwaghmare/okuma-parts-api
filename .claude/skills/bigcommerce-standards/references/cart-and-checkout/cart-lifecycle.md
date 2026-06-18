# Cart Lifecycle

BigCommerce carts are server-resident. The storefront holds a `cartId` cookie and mutates the cart via Storefront GraphQL mutations. Catalyst's cart actions live under `core/app/[locale]/(default)/cart/_actions/`.

## Cart cookie

- Name: `cartId` (Catalyst sets it via `cookies()` server-side after `cart.createCart`).
- Anonymous carts persist as long as the cookie is alive.
- On login, optionally merge the anonymous cart into the customer cart with `cart.assignCartToCustomer`.

## Read the active cart

```graphql
query GetCart($cartId: String!) {
  site {
    cart(entityId: $cartId) {
      entityId
      currencyCode
      isTaxIncluded
      baseAmount { value currencyCode }
      discountedAmount { value currencyCode }
      amount { value currencyCode }
      lineItems {
        totalQuantity
        physicalItems { ...PhysicalItemFragment }
        digitalItems  { ...DigitalItemFragment }
        giftCertificates { entityId name amount { value currencyCode } }
        customItems { entityId name quantity listPrice { value currencyCode } }
      }
      discounts { entityId discountedAmount { value currencyCode } }
      promotionsApplied { code }
      giftCertificatesApplied { entityId code amount { value currencyCode } }
    }
  }
}
```

## Add line items

```graphql
mutation AddCartLineItems($input: AddCartLineItemsInput!) {
  cart {
    addCartLineItems(input: $input) {
      cart {
        entityId
        ...CartFields
      }
    }
  }
}
```

Server action:

```ts
'use server';

import { cookies } from 'next/headers';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidateTag } from 'next/cache';
import { TAGS } from '~/client/tags';

const AddCartLineItemsMutation = graphql(`
  mutation AddCartLineItems($input: AddCartLineItemsInput!) {
    cart {
      addCartLineItems(input: $input) { cart { entityId } }
    }
  }
`);

export async function addToCart(input: { productEntityId: number; quantity: number; selectedOptions?: any }) {
  const cookieStore = await cookies();
  let cartId = cookieStore.get('cartId')?.value;

  // ensure cart exists
  if (!cartId) {
    cartId = await createCart({ productEntityId: input.productEntityId, quantity: input.quantity });
    cookieStore.set('cartId', cartId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  } else {
    await client.fetch({
      document: AddCartLineItemsMutation,
      variables: {
        input: {
          cartEntityId: cartId,
          data: {
            lineItems: [
              {
                productEntityId: input.productEntityId,
                quantity: input.quantity,
                selectedOptions: input.selectedOptions,
              },
            ],
          },
        },
      },
      fetchOptions: { cache: 'no-store' },
    });
  }

  revalidateTag(TAGS.cart);
}
```

## Update line item

```graphql
mutation UpdateCartLineItem($input: UpdateCartLineItemInput!) {
  cart {
    updateCartLineItem(input: $input) { cart { entityId } }
  }
}
```

Use when changing quantity, swapping a variant, or editing modifier values. Catalyst's `update-line-item.ts` action does an `increment`/`decrement`/`set` dispatch with Zod-validated form data.

## Remove line item

```graphql
mutation DeleteCartLineItem($input: DeleteCartLineItemInput!) {
  cart {
    deleteCartLineItem(input: $input) { cart { entityId } deletedLineItemEntityId }
  }
}
```

Input shape:
```ts
{ cartEntityId: 'abc-...', lineItemEntityId: 'def-...' }
```

If the last line item is removed the cart is destroyed by BC. Clear the `cartId` cookie afterwards.

## Anonymous → logged-in transition

```graphql
mutation AssignCartToCustomer($input: AssignCartToCustomerInput!) {
  cart {
    assignCartToCustomer(input: $input) { cart { entityId } }
  }
}
```

Pass the customer impersonation token in `client.fetch({ customerAccessToken })`. After the mutation:
1. Revalidate `TAGS.cart`.
2. Replace the `cartId` cookie value if the customer already had a saved cart that BC merges into.

## Line item types

| Type | When |
| --- | --- |
| `PhysicalItem` | Standard physical product |
| `DigitalItem` | Digital download, software, licence |
| `GiftCertificate` | Purchase of a gift certificate (not redemption) |
| `CustomItem` | Manually added by sales rep (B2B) — name/price/quantity |

Render lists with discriminated unions on `__typename`.

## Cache strategy

```ts
fetchOptions: { cache: 'no-store' }  // every cart write/read
revalidateTag(TAGS.cart)             // after every mutation
```

Never cache cart in the public Data Cache — leaks across shoppers.

## Anti-patterns

- Sharing one `cartId` cookie across channels — channels are isolated.
- Caching cart query with `force-cache` — privacy hazard.
- Persisting cart state in localStorage — BC is the source of truth; localStorage drifts.
- Failing to revalidate after mutation — mini-cart and PDP "added" badge get stale.
