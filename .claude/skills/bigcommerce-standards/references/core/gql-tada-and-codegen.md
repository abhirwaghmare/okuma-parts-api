# Typed GraphQL with `gql.tada`

Catalyst uses `gql.tada` (with `@0no-co/graphqlsp` LSP) to type GraphQL operations at the source — no separate `.graphql` files, no generated `.ts` files for operations. Schema introspection is generated once via `pnpm generate`.

## File layout

```
core/
├── client/
│   ├── index.ts              # createClient
│   ├── graphql.ts            # exports `graphql`, `ResultOf`, `VariablesOf`, `FragmentOf`
│   ├── fragments/            # shared fragments (pricing, pagination)
│   ├── revalidate-target.ts  # exports `revalidate`
│   └── tags.ts               # exports `TAGS` constants
├── graphql.config.json       # points gql.tada to the introspected schema
└── scripts/generate.cjs      # runs schema introspection against BIGCOMMERCE_STORE_HASH
```

## `core/client/graphql.ts`

```ts
import { initGraphQLTada } from 'gql.tada';
import type { introspection } from '~/__generated__/graphql-env';

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: { DateTime: string; BigDecimal: string; Long: number };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from 'gql.tada';
```

## Defining a query

```ts
import { graphql } from '~/client/graphql';
import { PricingFragment } from '~/client/fragments/pricing';

export const ProductPageQuery = graphql(
  `
    query ProductPage($entityId: Int!, $currencyCode: currencyCode) {
      site {
        product(entityId: $entityId) {
          entityId
          name
          path
          sku
          mpn
          defaultImage { url: urlTemplate(lossy: true) altText }
          description
          ...PricingFragment
        }
      }
    }
  `,
  [PricingFragment],
);
```

- Pass dependent fragments as the second argument so `gql.tada` can resolve their types.
- The query is a string — but inferring `ResultOf<typeof ProductPageQuery>` gives you a fully-typed response with masking applied.

## Calling the query

```ts
import type { ResultOf, VariablesOf } from '~/client/graphql';

type Variables = VariablesOf<typeof ProductPageQuery>;
type Data = ResultOf<typeof ProductPageQuery>;

const response = await client.fetch({
  document: ProductPageQuery,
  variables: { entityId, currencyCode: 'USD' } satisfies Variables,
  fetchOptions: { next: { revalidate, tags: [TAGS.product(entityId)] } },
});

const product = response.data.site.product;
```

## Fragment masking

`FragmentOf<typeof PricingFragment>` is opaque at the call site. Use the matching `readFragment` (or the local `transformPrice` helper) to unmask when you actually consume it.

```ts
import { FragmentOf } from 'gql.tada';
import { PricingFragment } from '~/client/fragments/pricing';

export function PriceLabel({ pricing }: { pricing: FragmentOf<typeof PricingFragment> }) {
  // unmask via shared helper
  const prices = readFragment(PricingFragment, pricing);
  return <span>{prices?.price?.value}</span>;
}
```

Masking forces components to declare exactly the fragment they consume — keeps queries lean and types correct.

## Codegen

```bash
pnpm generate
# under the hood: dotenv -e .env.local -- node ./scripts/generate.cjs
# Introspects the storefront schema for BIGCOMMERCE_STORE_HASH / CHANNEL_ID
# Writes core/__generated__/graphql-env.d.ts
```

Re-run `pnpm generate` after:
- Changing channels (different schemas can be enabled per channel)
- BigCommerce schema updates (rare but versioned)
- Switching from authenticated to unauthenticated token (some fields are gated)

## Anti-patterns

- Hand-typing `interface ProductData { ... }` instead of `ResultOf<typeof Query>`. Drift guaranteed.
- Concatenating queries with template literals at runtime — breaks the LSP and persisted-query pipelines.
- Skipping `readFragment` and accessing masked fields directly — TS will refuse and tooling will complain.
