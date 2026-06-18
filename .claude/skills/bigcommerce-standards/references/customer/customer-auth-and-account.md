# Customer Auth and Account

Catalyst customer authentication uses Auth.js (NextAuth v5) on the storefront side and BC's Customer Login API on the back end. Sessions are minted with a customer impersonation token that is then attached to Storefront GraphQL calls.

## Auth flows

| Flow | Path |
| --- | --- |
| Email + password sign-in | `POST /login` → calls BC Customer Login (`/v3/customer/current/customers/{id}/jwt`) → mints impersonation token |
| Sign-up | `customer.registerCustomerWithReCaptcha` GraphQL mutation |
| Forgot password | `customer.requestResetPassword` |
| Logout | clear session cookie + impersonation token |
| SSO (JWT-redirect) | sign customer JWT on third-party identity provider → redirect to `/login/token/{jwt}` → BC validates signature + audience |

## Customer GraphQL queries

```graphql
query Customer {
  customer {
    entityId
    firstName
    lastName
    email
    phone
    company
    notes
    customerGroupId
    addressCount
    attributeCount
    storeCredit { value currencyCode }
  }
}
```

```graphql
query CustomerAddresses($first: Int!, $after: String) {
  customer {
    addresses(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          entityId
          firstName lastName
          company phone
          address1 address2 city stateOrProvince countryCode postalCode
        }
      }
    }
  }
}
```

```graphql
query CustomerOrders($first: Int!, $after: String) {
  customer {
    orders(first: $first, after: $after, sortBy: NEWEST) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          entityId
          status { label value }
          orderedAt { utc }
          totalIncTax { value currencyCode }
          consignments {
            shipping { edges { node { lineItems { edges { node { name productEntityId } } } } } }
          }
        }
      }
    }
  }
}
```

All customer queries require the customer impersonation token in `client.fetch`:

```ts
const customerAccessToken = await getSessionCustomerAccessToken();

await client.fetch({
  document: CustomerQuery,
  customerAccessToken,
  fetchOptions: { cache: 'no-store' },
});
```

## Customer Login JWT (SSO)

Use when a third-party IdP owns identity. Steps:

1. IdP authenticates the user.
2. Backend signs a JWT with the BC API client's `client_secret`:
   ```ts
   import jwt from 'jsonwebtoken';

   const payload = {
     iss: process.env.BIGCOMMERCE_CLIENT_ID,
     iat: Math.floor(Date.now() / 1000),
     jti: crypto.randomUUID(),
     operation: 'customer_login',
     store_hash: process.env.BIGCOMMERCE_STORE_HASH,
     customer_id: customerId,
     channel_id: Number(process.env.BIGCOMMERCE_CHANNEL_ID),
   };

   const token = jwt.sign(payload, process.env.BIGCOMMERCE_CLIENT_SECRET!, {
     algorithm: 'HS256',
     expiresIn: '30s',
   });

   const redirectUrl = `${storefrontOrigin}/login/token/${token}`;
   ```
3. Browser visits `redirectUrl`; BC verifies signature, audience (`store_hash`), and timestamp; session is created.

Critical:
- `expiresIn: '30s'` — short-lived. The JWT is one-shot.
- Verify the audience (`store_hash`) and `channel_id` server-side before signing — never sign a JWT for a customer the user did not authenticate.
- `client_secret` is server-only.

## Registration

```graphql
mutation RegisterCustomer($input: RegisterCustomerInput!, $reCaptchaV2: ReCaptchaV2Input) {
  customer {
    registerCustomerWithReCaptcha(input: $input, reCaptchaV2: $reCaptchaV2) {
      customer { entityId firstName lastName email }
      errors { ... on EmailAlreadyInUseError { message } ... on ValidationError { message path } }
    }
  }
}
```

Handle the `errors` union explicitly — BC returns structured errors for `EmailAlreadyInUseError`, `ValidationError`, `CustomerRegistrationDisabledError`, etc.

## Password reset

```graphql
mutation RequestResetPassword($input: RequestResetPasswordInput!) {
  customer { requestResetPassword(input: $input) { errors { __typename } } }
}
```

BC sends the reset email; no token is returned to the storefront.

## Customer Groups

`customer.customerGroupId` is the resolved group. Use it to drive group-aware UI (B2B nav, hide consumer-only categories). Server-only — never trust a client-supplied group.

## Session storage

Catalyst stores the customer impersonation token in the NextAuth session cookie (HttpOnly, Secure, SameSite=Lax). Retrieve it via `getSessionCustomerAccessToken()` inside server components and server actions.

## Anti-patterns

- Storing the customer impersonation token in `localStorage`. Browser XSS = full account compromise.
- Re-signing the JWT-redirect token client-side. `client_secret` must stay on the server.
- Querying `customer` without `cache: 'no-store'`. Customer data must never enter the shared Data Cache.
- Skipping reCAPTCHA on registration — bots will create accounts immediately.
