# Pricing and Customer Groups

BC pricing has multiple layers — list price, sale price, retail (MSRP) price, and customer-group-specific prices. The Storefront API returns the *resolved* price for the active customer context.

## Shared pricing fragment

```graphql
fragment PricingFragment on Product {
  prices(currencyCode: $currencyCode) {
    price       { value currencyCode }    # what the shopper pays today
    basePrice   { value currencyCode }    # pre-discount list price
    retailPrice { value currencyCode }    # MSRP / "compare at"
    salePrice   { value currencyCode }    # explicit sale price if set
    priceRange {
      min { value currencyCode }
      max { value currencyCode }
    }
  }
}
```

Always pass `$currencyCode` so the API returns money in the correct currency for the channel.

## Customer-group-aware prices

`prices` is automatically scoped by the customer context attached to the request. To resolve group prices, attach the customer impersonation token (see `core/graphql-storefront-client-setup.md`).

```ts
import { getSessionCustomerAccessToken } from '~/auth';

const customerAccessToken = await getSessionCustomerAccessToken();

const response = await client.fetch({
  document: ProductPageQuery,
  variables: { entityId, currencyCode: 'USD' },
  customerAccessToken, // server-only; resolves group pricing, B2B catalog, hidden products
  fetchOptions: { cache: 'no-store' }, // never share group prices in the public cache
});
```

Critical rule: queries scoped by customer impersonation token **must not be cached in the shared Data Cache**. Use `cache: 'no-store'` or partition by customer ID.

## Sale price logic

```ts
function resolveDisplayPrice(prices: PricingFragmentMasked) {
  // unmask
  const p = readFragment(PricingFragment, prices);

  const isOnSale =
    p?.salePrice?.value != null &&
    p?.basePrice?.value != null &&
    p.salePrice.value < p.basePrice.value;

  return {
    current: p?.price?.value ?? 0,        // already the resolved "what they pay"
    compare: isOnSale ? p?.basePrice?.value : undefined,
    msrp: p?.retailPrice?.value,
  };
}
```

Notes:
- `price.value` is the **resolved** price — already accounts for sales and customer-group adjustments. Use it as the primary display value.
- `basePrice` is the pre-discount value — use as strike-through.
- `retailPrice` is MSRP — display as "compare at" only if business wants three tiers.
- If `priceRange.min !== priceRange.max`, render "from $X" for variant-priced products.

## Bulk pricing tiers

```graphql
prices(currencyCode: $currencyCode) {
  bulkPricing {
    minimumQuantity
    maximumQuantity
    ... on BulkPricingFixedPriceDiscount { price }
    ... on BulkPricingPercentageDiscount { percentOff }
    ... on BulkPricingRelativePriceDiscount { priceAdjustment }
  }
}
```

Display tiered pricing on PDPs when `bulkPricing` is non-empty.

## Tax-inclusive vs tax-exclusive

`prices.price.value` honours the channel's tax display setting. If the store is configured to show inclusive prices in B2C and exclusive in B2B, BC handles it server-side based on the resolved customer group. Do not manually add tax in the storefront.

## Customer Group resolution

- Customer groups are created via REST Management (`/v2/customer_groups`).
- Group assignment per customer happens via REST Management (`/v3/customers`) or via signup form mapping.
- Group prices are configured per product in the BC control panel or via REST (`/v3/pricelists`).
- Active group is automatically applied when the customer impersonation token is sent — no extra GraphQL variable required.

## Price list (alternative model)

Price Lists override the per-customer-group pricing matrix. Assign a customer to a price list and they see those prices regardless of group. Resolve identically — `prices.price.value` reflects the price list.

## Anti-patterns

- Caching customer-scoped prices in the shared cache — different shoppers see each other's pricing.
- Re-implementing tax logic in the storefront — the API already returns the correct display value.
- Computing sale state in the client from `price` alone — always compare `salePrice` (or `price`) against `basePrice`.
