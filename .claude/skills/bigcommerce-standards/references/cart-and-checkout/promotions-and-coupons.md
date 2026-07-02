# Promotions and Coupons

BC has three promotion vehicles:
1. Automatic promotions — set up in BC, applied without shopper action.
2. Coupon codes — applied by the shopper or via URL/marketing link.
3. Gift certificates — purchased by one customer, redeemed by another.

## Coupons

### Apply a coupon

```graphql
mutation ApplyCheckoutCoupon($input: ApplyCheckoutCouponInput!) {
  checkout {
    applyCheckoutCoupon(input: $input) {
      checkout {
        entityId
        coupons { code couponType discountedAmount { value currencyCode } }
        cart { entityId }
      }
    }
  }
}
```

Input:
```ts
{ checkoutEntityId: '<cartId>', data: { couponCode: 'SUMMER10' } }
```

Server action wrapper (mirror Catalyst's `apply-coupon-code.ts`):

```ts
'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { TAGS } from '~/client/tags';

const ApplyCouponMutation = graphql(`
  mutation ApplyCheckoutCoupon($input: ApplyCheckoutCouponInput!) {
    checkout {
      applyCheckoutCoupon(input: $input) {
        checkout { entityId coupons { code } }
      }
    }
  }
`);

export async function applyCouponCode(formData: FormData) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get('cartId')?.value;
  if (!cartId) return { ok: false, error: 'empty_cart' };

  const couponCode = String(formData.get('couponCode') ?? '').trim();
  if (!couponCode) return { ok: false, error: 'missing_code' };

  try {
    await client.fetch({
      document: ApplyCouponMutation,
      variables: { input: { checkoutEntityId: cartId, data: { couponCode } } },
      fetchOptions: { cache: 'no-store' },
    });
    revalidateTag(TAGS.cart);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'invalid_coupon' };
  }
}
```

### Remove a coupon

```graphql
mutation UnapplyCheckoutCoupon($input: UnapplyCheckoutCouponInput!) {
  checkout {
    unapplyCheckoutCoupon(input: $input) {
      checkout { entityId coupons { code } }
    }
  }
}
```

Input:
```ts
{ checkoutEntityId: '<cartId>', data: { couponCode: 'SUMMER10' } }
```

### URL-applied coupons

BC supports automatic coupon application via query string: `?p=SUMMER10`. Catalyst hooks this on the home/cart page by reading `searchParams.p` and calling the same server action.

## Automatic promotions

Automatic promotions are configured in the BC control panel (Marketing → Promotions). They have no apply mutation — they appear in `cart.promotionsApplied` once the cart matches the rule.

Display:
```graphql
cart {
  promotionsApplied { code }
  discounts { entityId discountedAmount { value currencyCode } }
}
```

`promotionsApplied[].code` may be empty for automatic promotions — render the discount line by name from the rule metadata if needed (fetch the promotion via REST: `/v3/promotions/{id}`).

## Gift certificates

### Apply gift certificate

```graphql
mutation ApplyCheckoutGiftCertificate($input: ApplyCheckoutGiftCertificateInput!) {
  checkout {
    applyCheckoutGiftCertificate(input: $input) {
      checkout {
        entityId
        giftCertificates { code spent { value currencyCode } remaining { value currencyCode } }
      }
    }
  }
}
```

Input:
```ts
{ checkoutEntityId: '<cartId>', data: { giftCertificateCode: 'GC-ABC123' } }
```

### Remove gift certificate

```graphql
mutation UnapplyCheckoutGiftCertificate($input: UnapplyCheckoutGiftCertificateInput!) {
  checkout {
    unapplyCheckoutGiftCertificate(input: $input) {
      checkout { entityId giftCertificates { code } }
    }
  }
}
```

## Stacking rules

- One coupon code per cart (BC enforces).
- Multiple gift certificates allowed; they reduce order total but never go below shipping/tax floor.
- Automatic promotions stack with the single coupon unless promotion is marked `exclusive`.

## Display rules

| Field | Source |
| --- | --- |
| Subtotal before discounts | `cart.baseAmount` |
| Discount total | `cart.discountedAmount` |
| Grand total before tax/ship | `cart.amount` |
| Coupon line items | `cart.promotionsApplied` + `cart.discounts` |
| Gift certificate lines | `cart.giftCertificatesApplied` |

Render zero discounts gracefully — empty arrays are common.

## Anti-patterns

- Calling `applyCheckoutCoupon` without trimming whitespace from user input.
- Surface raw error messages from BC to shopper — they often contain internal coupon-rule details. Map to `invalid_coupon`, `expired_coupon`, etc.
- Adding multiple coupons via repeated mutations — only the last one is retained.
