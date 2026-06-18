# Categories and Brands

## Category tree (full hierarchy)

```graphql
query CategoryTree {
  site {
    categoryTree {
      entityId
      name
      path
      hasChildren
      children {
        entityId
        name
        path
        hasChildren
        children { entityId name path }
      }
    }
  }
}
```

- Returns the full assigned tree for the current channel.
- Build a nav once at the layout level with `revalidate: 3600` and `tags: [TAGS.categories]`.

## Single category page

```graphql
query CategoryPage($entityId: Int!, $first: Int!, $after: String) {
  site {
    category(entityId: $entityId) {
      entityId
      name
      path
      defaultImage { url: urlTemplate(lossy: true) altText }
      description
      seo { pageTitle metaKeywords metaDescription }
      breadcrumbs(depth: 5) { edges { node { name path } } }
      products(first: $first, after: $after, sortBy: BEST_SELLING) {
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
    }
  }
}
```

`sortBy` accepts: `BEST_SELLING`, `NEWEST`, `LOWEST_PRICE`, `HIGHEST_PRICE`, `A_TO_Z`, `Z_TO_A`, `RELEVANCE`, `FEATURED`.

## Category by path (route-based)

```graphql
query CategoryByPath($path: String!) {
  site {
    route(path: $path) {
      node {
        ... on Category {
          entityId
          name
          path
          description
          products(first: 24) { edges { node { entityId name path } } }
        }
      }
    }
  }
}
```

## Brand page

```graphql
query BrandPage($entityId: Int!, $first: Int!, $after: String) {
  site {
    brand(entityId: $entityId) {
      entityId
      name
      path
      defaultImage { url: urlTemplate(lossy: true) altText }
      seo { pageTitle metaKeywords metaDescription }
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node { entityId name path ...PricingFragment } }
      }
    }
  }
}
```

## Breadcrumbs

Most product/category/brand nodes expose a `breadcrumbs(depth: Int)` field:

```graphql
breadcrumbs(depth: 5) { edges { node { name path entityId } } }
```

Render with `name` and link via `path`. Always prefix with the channel base URL — never assume `/`.

## Catalyst route resolution

`core/app/[locale]/(default)/[...rest]/page.tsx` is the catch-all that runs `site.route(path:)`. It dispatches to the proper template (PDP, PLP, Brand, Web Page, Blog Post) based on the returned `__typename`. If you add a new entity type (e.g., custom landing pages), branch in the dispatcher rather than creating a parallel route.

## Cache keys

```ts
TAGS.categories                  // category tree (long-lived)
TAGS.category(entityId)          // single category (medium-lived)
TAGS.brand(entityId)             // single brand (medium-lived)
```

Revalidate on:
- `store/category/*` webhooks → `revalidateTag(TAGS.categories)` and the specific category tag
- `store/brand/*` webhooks → `revalidateTag(TAGS.brand(entityId))`

## Anti-patterns

- Building a nav by walking the tree per request — fetch once with high revalidate and tag-invalidate.
- Hard-coding category IDs in the storefront — they differ between channels and environments. Resolve by handle/path.
- Forgetting to render `route.redirect.toUrl` — leads to broken URLs after slug edits.
