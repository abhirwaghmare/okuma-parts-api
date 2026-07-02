# Search and Faceting

`site.search.searchProducts` is the GraphQL entry point. It supports keyword search, structured filters (price, category, brand, attribute, rating, inventory), facets, sorting, and cursor pagination.

## Faceted search

```graphql
query FacetedSearch(
  $filters: SearchProductsFiltersInput!
  $sort: SearchProductsSortInput
  $first: Int!
  $after: String
) {
  site {
    search {
      searchProducts(filters: $filters, sort: $sort) {
        products(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              entityId
              name
              path
              defaultImage { url: urlTemplate(lossy: true) altText }
              ...PricingFragment
            }
          }
        }
        filters {
          edges {
            node {
              __typename
              name
              isCollapsedByDefault
              ... on BrandSearchFilter {
                displayProductCount
                brands(first: 50) {
                  edges { node { entityId name productCount isSelected } }
                }
              }
              ... on CategorySearchFilter {
                displayProductCount
                categories(first: 50) {
                  edges { node { entityId name productCount isSelected subCategories { edges { node { entityId name productCount isSelected } } } } }
                }
              }
              ... on PriceSearchFilter {
                selected { minPrice maxPrice }
                priceRanges { ranges { minPrice maxPrice productCount } }
              }
              ... on ProductAttributeSearchFilter {
                filterName
                displayProductCount
                attributes(first: 50) {
                  edges { node { value productCount isSelected } }
                }
              }
              ... on RatingSearchFilter {
                ratings { edges { node { value productCount isSelected } } }
              }
              ... on OtherSearchFilter {
                freeShipping { productCount isSelected }
                isFeatured { productCount isSelected }
                isInStock { productCount isSelected }
              }
            }
          }
        }
      }
    }
  }
}
```

## Filter shapes

| Filter | Input |
| --- | --- |
| Keyword | `searchTerm: "running shoes"` |
| Category | `categoryEntityId: 23` or `categoryEntityIds: [23, 24]` |
| Brand | `brandEntityIds: [4]` |
| Price | `price: { minPrice: 50, maxPrice: 200 }` |
| Attribute | `productAttributes: [{ attribute: "Material", values: ["Leather"] }]` |
| Rating | `rating: { minRating: 4 }` |
| Stock | `isInStock: true` |
| Free shipping | `isFreeShipping: true` |
| Featured | `isFeatured: true` |

Combine in `filters: SearchProductsFiltersInput`.

## Sort

```graphql
sort: SearchProductsSortInput
```

Common values:
- `FEATURED`
- `NEWEST`
- `BEST_SELLING`
- `A_TO_Z`
- `Z_TO_A`
- `LOWEST_PRICE`
- `HIGHEST_PRICE`
- `RELEVANCE` (only meaningful with `searchTerm`)

## Pagination

Cursor-based. `products(first: 24, after: $endCursor)`.

```ts
type PageResult<T> = { edges: { node: T }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

async function fetchAllPages<T>(loader: (after: string | null) => Promise<PageResult<T>>) {
  const all: T[] = [];
  let after: string | null = null;
  do {
    const page = await loader(after);
    all.push(...page.edges.map((e) => e.node));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return all;
}
```

For a storefront listing, fetch only the current page. Reserve full-walks for sitemap or feed generation.

## URL ↔ filter sync

In Catalyst, the `(faceted)` route group hosts category, brand, and search routes. State lives in `searchParams` so URLs are deep-linkable.

```ts
// app/[locale]/(default)/(faceted)/search/page.tsx
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const filters = mapSearchParamsToFilters(params);
  const sort = (params.sort as SortValue) ?? 'FEATURED';
  const after = (params.after as string | null) ?? null;

  const data = await searchFacetedProducts({ filters, sort, first: 24, after });
  return <SearchResults data={data} />;
}
```

## Performance

- Cache facet shapes (the available filters) with a short revalidate (e.g., 60s) keyed by the URL params.
- Prefetch the next page on hover/scroll using Next.js `<Link prefetch>` or `router.prefetch`.
- Limit `attributes(first:)` and `brands(first:)` to what the UI actually displays.

## Anti-patterns

- Refetching the full facet shape on every filter change. Only refetch results, keep facet shape stable per query.
- Storing search state in client memory only — deep links and back/forward break.
- Using `RELEVANCE` sort without a `searchTerm` — undefined order.
