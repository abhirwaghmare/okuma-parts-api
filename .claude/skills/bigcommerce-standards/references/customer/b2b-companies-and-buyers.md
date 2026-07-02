# B2B Companies and Buyers (B2B Edition)

B2B Edition is an add-on to BigCommerce that introduces companies, buyer hierarchies, quote / RFQ workflows, purchase orders, sales rep impersonation, and shared shopping lists. It has its own GraphQL API alongside the storefront API.

## Enablement check

```ts
function isB2BEnabled(channelId: number) {
  // B2B Edition is enabled per channel in the BC control panel.
  // Project should expose a feature flag set during channel onboarding.
  return process.env.B2B_EDITION_ENABLED === 'true';
}
```

If B2B Edition is not enabled, do not import its client or render its UI. Failing closed is mandatory — otherwise consumer shoppers see B2B-only widgets.

## B2B GraphQL endpoint

- Base URL: `https://api-b2b.bigcommerce.com/graphql` (regional variants exist).
- Auth: B2B token minted via `B2B Storefront API > Authorization > /api/io/auth/storefront` with a customer's BC ID and store hash.
- Token is per-customer; refresh on session start.

## Authentication wrapper

```ts
async function getB2BToken(customerId: number, customerEmail: string) {
  const res = await fetch('https://api-b2b.bigcommerce.com/api/io/auth/storefront', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authToken: process.env.B2B_API_TOKEN!,
    },
    body: JSON.stringify({
      storeHash: process.env.BIGCOMMERCE_STORE_HASH,
      customerId,
      email: customerEmail,
      channelId: Number(process.env.BIGCOMMERCE_CHANNEL_ID),
    }),
  });
  const json = await res.json();
  return json.data.token; // attach as `authToken` header on B2B GraphQL calls
}
```

## Company

```graphql
query Company {
  company {
    companyId
    companyName
    companyEmail
    extraFields { fieldName fieldValue }
    addresses {
      id
      addressLine1
      city
      state
      country
      zipCode
    }
  }
}
```

Buyer roles:
- `admin` — manage users, addresses, payment methods.
- `senior buyer` — place orders, view all orders within company.
- `junior buyer` — place orders within configured spend limits.

```graphql
query CompanyUsers {
  users {
    edges {
      node {
        id
        firstName
        lastName
        email
        role            # ADMIN | SENIOR_BUYER | JUNIOR_BUYER
        isActive
      }
    }
  }
}
```

## Quote / RFQ workflow

1. Buyer adds items to a shopping list or builds a cart.
2. Buyer clicks "Request quote" → mutation `createQuote`.
3. Sales rep receives notification, edits prices/terms, sends back.
4. Buyer accepts → quote converts to an order via `quoteCheckout`.

```graphql
mutation CreateQuote($input: CreateQuoteInput!) {
  quote {
    createQuote(input: $input) {
      quote { id status referenceNumber }
    }
  }
}
```

```graphql
query Quotes($status: QuoteStatus, $first: Int!) {
  quote {
    quotes(filter: { status: $status }, first: $first) {
      edges {
        node {
          id
          referenceNumber
          status            # OPEN | PENDING | APPROVED | EXPIRED | ORDERED
          createdAt
          subtotal { value currencyCode }
          discountAmount { value currencyCode }
          totalAmount { value currencyCode }
          quoteItems {
            edges { node { productId variantId quantity name unitPrice { value currencyCode } } }
          }
        }
      }
    }
  }
}
```

## Sales rep impersonation ("masquerade")

A sales rep logs into the company portal and shops on behalf of a buyer. The rep authenticates as themselves; the B2B layer issues a buyer-scoped session token. All catalog/cart calls then resolve to the buyer's customer group, price list, and address book.

Implementation:
1. Detect `salesRep` flag in the session.
2. Fetch the buyer's customer ID via the B2B API.
3. Mint a customer impersonation token (REST Management: `POST /v3/customer/current/customers/{id}/jwt`) for that buyer.
4. Attach it to storefront calls — pricing, cart, addresses now belong to the buyer.

Always show a persistent "Shopping as {buyer name}" banner. Audit every action with both rep ID and buyer ID.

## Purchase orders, NET terms, credit lines

Configured per company in the BC control panel. The storefront reads `company.creditLine` and `company.terms` and presents PO checkout as a payment option when available. The PO is recorded via `quoteCheckout` → `paymentMethod: PURCHASE_ORDER`.

## Shopping lists

```graphql
query ShoppingLists {
  shoppingList {
    shoppingLists {
      edges {
        node {
          id name description channelId
          items {
            edges {
              node { id productId variantId quantity }
            }
          }
        }
      }
    }
  }
}
```

Buyers reorder by copying a shopping list into the cart in one action — common B2B workflow.

## Anti-patterns

- Calling B2B GraphQL with a stale token. Refresh on session start; cache by customer ID with short TTL.
- Mixing B2C and B2B carts. Carts are isolated by channel and customer scope.
- Showing rep-only UI without checking `role === 'SALES_REP'` server-side.
- Letting a junior buyer bypass spend limits client-side — enforce server-side via B2B policies.
