# GraphQL Storefront Client Setup

Catalyst uses `@bigcommerce/catalyst-client` to call the BigCommerce GraphQL Storefront API. The client is server-side, channel-scoped, and authenticates with a JWT storefront token.

## Required environment variables

```bash
# core/.env.local
BIGCOMMERCE_STORE_HASH=abcd1234
BIGCOMMERCE_STOREFRONT_TOKEN=eyJ...          # JWT — server-side use only
BIGCOMMERCE_STOREFRONT_UNAUTHENTICATED_TOKEN=eyJ...   # may be public
BIGCOMMERCE_CHANNEL_ID=1                      # the selling channel served by this storefront
```

Notes:
- `BIGCOMMERCE_STOREFRONT_TOKEN` should be used server-side. If `allowed_cors_origins` was omitted when the token was created, it permits server-to-server requests but cannot be safely exposed to the browser.
- `BIGCOMMERCE_STOREFRONT_UNAUTHENTICATED_TOKEN` is the public-safe token (CORS-restricted) for client-side anonymous reads if you ever need them. Default to RSC and skip exposing tokens to the browser entirely.
- Never put REST Management `X-Auth-Token` in any client-bundled file. That token belongs only to server routes.

## Client creation (`core/client/index.ts`)

```ts
import { createClient } from '@bigcommerce/catalyst-client';
import { backendUserAgent } from '~/lib/user-agent';

export const client = createClient({
  storefrontToken: process.env.BIGCOMMERCE_STOREFRONT_TOKEN ?? '',
  storeHash: process.env.BIGCOMMERCE_STORE_HASH ?? '',
  channelId: process.env.BIGCOMMERCE_CHANNEL_ID,
  backendUserAgentExtensions: backendUserAgent,
  logger:
    (process.env.NODE_ENV !== 'production' && process.env.CLIENT_LOGGER !== 'false') ||
    process.env.CLIENT_LOGGER === 'true',
  beforeRequest: async (fetchOptions) => {
    // attach correlation IDs, forwarded IPs, locale
    return { headers: { 'X-Correlation-Id': crypto.randomUUID() } };
  },
});
```

## Calling the client

```ts
import { cache } from 'react';
import { client } from '~/client';
import { graphql } from '~/client/graphql';
import { revalidate } from '~/client/revalidate-target';
import { TAGS } from '~/client/tags';

const SiteSettingsQuery = graphql(`
  query SiteSettings {
    site {
      settings {
        storeName
        contact { address email phone }
      }
    }
  }
`);

export const getSiteSettings = cache(async () => {
  const response = await client.fetch({
    document: SiteSettingsQuery,
    fetchOptions: { next: { revalidate, tags: [TAGS.settings] } },
  });

  return response.data.site.settings;
});
```

Key points:
- Wrap the fetch in `react.cache` for per-request memoization in a single render pass.
- Pass `fetchOptions.next.revalidate` and `tags` so Next.js Data Cache honours BigCommerce data lifecycle.
- `client.fetch` returns `{ data, errors }`; check `errors` and throw / surface in error boundaries.

## Customer impersonation token (logged-in queries)

For queries that depend on a customer identity (cart, customer, orders), pass an impersonation token in the request:

```ts
import { getSessionCustomerAccessToken } from '~/auth';

const customerAccessToken = await getSessionCustomerAccessToken();

await client.fetch({
  document: GetCartQuery,
  variables: { cartId },
  customerAccessToken, // signed JWT minted server-side via Customer Login API
  fetchOptions: { cache: 'no-store' },
});
```

The impersonation token is minted via the REST Management API and is short-lived (TTL is 24 hours by default but the JWT lifetime should be treated as much shorter). It must never reach the browser bundle.

## Channel scoping

- Every Storefront API request is scoped to a single channel. The channel ID resolves to a sales channel created in the BigCommerce control panel (Channel Manager).
- For multi-storefront, build a channel resolver that maps `locale` or `host` to a channel ID and override the client's `channelId` per request via `beforeRequest`.

## Anti-patterns

- Calling the Storefront API from a client component with `fetch` and a raw token (leaks the JWT into the bundle).
- Using `cache: 'force-cache'` for customer-scoped queries (poisons the shared cache).
- Sharing a single cart cookie across channels — channels are isolated.
