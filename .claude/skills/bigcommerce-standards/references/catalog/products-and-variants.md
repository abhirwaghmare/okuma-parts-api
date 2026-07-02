# Products and Variants

The GraphQL Storefront API surfaces products under `site.product(entityId: Int)` or `site.product(path: String)`. Lists are available via `site.products(entityIds: [Int!])`, `site.newestProducts`, `site.featuredProducts`, `site.bestSellingProducts`.

## Single product by entity ID

```graphql
query ProductByEntityId($entityId: Int!, $currencyCode: currencyCode) {
  site {
    product(entityId: $entityId) {
      entityId
      name
      path
      sku
      mpn
      condition
      gtin
      availabilityV2 { status description }
      inventory {
        isInStock
        aggregated { availableToSell warningLevel }
      }
      description
      plainTextDescription
      defaultImage { url: urlTemplate(lossy: true) altText }
      images(first: 8) {
        edges { node { url: urlTemplate(lossy: true) altText isDefault } }
      }
      brand { entityId name path }
      categories(first: 5) {
        edges { node { entityId name path breadcrumbs(depth: 5) { edges { node { name path } } } } }
      }
      ...PricingFragment
    }
  }
}
```

## By URL path (preferred for storefront routing)

`site.route(path: "/path/to/product/")` is the canonical entry point: it returns the entity (product/category/brand/page) that matches the URL, plus redirects. Catalyst uses this to resolve `app/[locale]/(default)/[...rest]/page.tsx`.

```graphql
query RouteEntity($path: String!) {
  site {
    route(path: $path) {
      redirect { toUrl }
      node {
        __typename
        ... on Product { entityId name path }
        ... on Category { entityId name path }
        ... on Brand { entityId name path }
      }
    }
  }
}
```

## Variants

```graphql
query ProductVariants($entityId: Int!) {
  site {
    product(entityId: $entityId) {
      variants(first: 250) {
        edges {
          node {
            entityId
            sku
            mpn
            gtin
            defaultImage { url: urlTemplate(lossy: true) }
            options {
              edges {
                node {
                  entityId
                  displayName
                  values { edges { node { entityId label } } }
                }
              }
            }
            prices(currencyCode: $currencyCode) {
              price { value currencyCode }
              salePrice { value currencyCode }
            }
            inventory { isInStock aggregated { availableToSell } }
          }
        }
      }
    }
  }
}
```

The variant matrix in BC is the cartesian product of `productOptions` values; not every variant in the matrix has a stored row — those inherit the parent product's pricing and stock.

## Product options (configurator) and modifiers

`productOptions` covers variant-defining options (size, colour). `modifiers` covers personalisation fields that do not multiply variants (engraving text, gift wrap toggle).

```graphql
query ProductConfigurator($entityId: Int!) {
  site {
    product(entityId: $entityId) {
      productOptions(first: 50) {
        edges {
          node {
            __typename
            entityId
            displayName
            isRequired
            ... on MultipleChoiceOption {
              displayStyle
              values(first: 50) {
                edges {
                  node {
                    entityId
                    label
                    isDefault
                    isSelected
                    ... on SwatchOptionValue { hexColors imageUrl(lossy: true, width: 40) }
                    ... on ProductPickListOptionValue {
                      defaultImage { altText url: urlTemplate(lossy: true) }
                    }
                  }
                }
              }
            }
            ... on CheckboxOption {
              checkedByDefault
              label
              checkedOptionValueEntityId
              uncheckedOptionValueEntityId
            }
          }
        }
      }
      modifiers(first: 50) {
        edges {
          node {
            __typename
            entityId
            displayName
            isRequired
            ... on TextFieldModifier { defaultText: defaultValue maxLength minLength }
            ... on NumberFieldModifier { defaultNumber: defaultValue highest lowest isIntegerOnly }
            ... on MultiLineTextFieldModifier { defaultText: defaultValue maxLength minLength }
            ... on CheckboxModifier { checkedByDefault label }
          }
        }
      }
    }
  }
}
```

## Custom fields

Custom fields are arbitrary key/value pairs attached to a product (e.g., `material`, `care_instructions`).

```graphql
customFields(first: 25) {
  edges { node { entityId name value } }
}
```

## Resolving variant from selected options

Use `site.product(entityId: $entityId).variants(filters: { optionValueIds: $ids })` to fetch the variant matching the shopper's selection:

```graphql
query VariantBySelection($entityId: Int!, $optionValueIds: [OptionValueId!]!) {
  site {
    product(entityId: $entityId) {
      variants(first: 1, filters: { optionValueIds: $optionValueIds }) {
        edges { node { entityId sku inventory { isInStock } } }
      }
    }
  }
}
```

## Anti-patterns

- Looking up products by `path` and ignoring `redirect.toUrl` — broken canonical URLs after URL changes.
- Querying `variants(first: 250)` from a client component — large payload, leaks pricing.
- Re-fetching `productOptions` on every option change — fetch once, derive selection client-side.
