# API and Data Fetching Patterns

## Table of Contents
1. Default Approach
2. Request Lifecycle
3. Loading, Empty, and Error States
4. Caching and Revalidation
5. Writes and Mutations
6. BigCommerce (Catalyst) Considerations
7. Checklist
8. Official References

---

## 1. Default Approach

Use the platform first:
- `fetch()` for HTTP requests
- `URL` and `URLSearchParams` for query strings
- `AbortController` for cancellation
- `FormData` for multipart form submissions

```javascript
const fetchProducts = async ({ locale, signal }) => {
    const url = new URL('/api/products', window.location.origin);
    url.search = new URLSearchParams({ locale }).toString();

    const response = await fetch(url, {
        method: 'GET',
        signal,
        headers: {
            Accept: 'application/json',
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
};
```

Rules:
- Check `response.ok` on every request
- Send only the headers you need
- Use `credentials` intentionally
- Do not build query strings with string concatenation

---

## 2. Request Lifecycle

Every request path should define:
- When it starts
- How it is canceled
- What happens if the user navigates away
- Which state wins when multiple requests race

```javascript
const controller = new AbortController();

try {
    const data = await fetchProducts({
        locale: document.documentElement.lang || 'en',
        signal: controller.signal,
    });
    renderProducts(data);
} catch (error) {
    if (error.name !== 'AbortError') {
        showErrorState();
    }
}
```

Practical rules:
- Abort stale requests on route change, filter change, or component teardown
- Ignore late responses from older requests
- Keep one clear owner for each request

---

## 3. Loading, Empty, and Error States

Do not treat "not yet loaded" and "loaded but empty" as the same state.

```javascript
if (state.status === 'loading') {
    renderSkeleton();
} else if (state.status === 'error') {
    renderErrorMessage();
} else if (state.items.length === 0) {
    renderEmptyState();
} else {
    renderResults(state.items);
}
```

Requirements:
- Loading UI should preserve layout where possible
- Error UI should explain what the user can do next
- Empty state should be intentional, not a blank area

---

## 4. Caching and Revalidation

Prefer HTTP caching before custom client caching:
- Respect `Cache-Control`, `ETag`, and CDN behavior
- Reuse framework query libraries only when the project already depends on them or shared cache behavior is needed
- Avoid manual in-memory caches with unclear invalidation rules

Good fits for shared query libraries:
- Search results reused across views
- User/session-scoped data needed by many components
- Background revalidation requirements

For simple page-level components, direct `fetch()` is usually enough.

---

## 5. Writes and Mutations

Writes must handle duplicate submits, retries, and visible user feedback.

```javascript
const submitOrder = async (payload) => {
    const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Unable to submit order');
    }

    return response.json();
};
```

Rules:
- Disable or guard repeated submits while a mutation is in flight
- Show success and error feedback near the action
- Revalidate dependent UI after successful writes
- Respect CSRF and same-origin protections required by the platform

---

## 6. BigCommerce (Catalyst) Considerations

For Catalyst frontend projects:
- Default to RSC for data fetching — never call the GraphQL Storefront or REST Management API from a client component.
- Use the typed `client.fetch` (gql.tada via `core/client/graphql.ts`) — do not call raw `fetch` to the GraphQL endpoint.
- Reuse fragments from `core/client/fragments/` and honour fragment masking (`readFragment(Fragment, masked)`).
- Customer-scoped queries (cart, customer, orders) must use `cache: 'no-store'` and never `force-cache`.
- Tag every cached query; after every cart/coupon/customer mutation call `revalidateTag(TAGS.cart)` (or the relevant tag).
- Treat loading, empty, success, and error states as first-class — Catalyst pages depend on Suspense boundaries for streaming.

Useful pattern:

```typescript
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const ProductQuery = graphql(`
  query Product($entityId: Int!) {
    site { product(entityId: $entityId) { name } }
  }
`);

const { data } = await client.fetch({
  document: ProductQuery,
  variables: { entityId },
  fetchOptions: { next: { tags: ['product', `product-${entityId}`] } },
});
```

If the project uses a framework data layer, follow that project pattern rather than mixing multiple fetching strategies in one page.

---

## 7. Checklist

- [ ] Requests use `fetch()` or the project-approved data layer
- [ ] Query strings use `URLSearchParams`
- [ ] `response.ok` is checked before parsing success data
- [ ] Requests can be canceled when no longer needed
- [ ] Loading, empty, success, and error states are distinct
- [ ] Writes prevent duplicate submits
- [ ] Caching strategy is explicit
- [ ] CSRF / auth / credentials behavior is intentional
- [ ] BigCommerce GraphQL data is fetched in RSC / server actions before adding new client-side calls

---

## 8. Official References

- MDN Web Docs: Fetch API
  `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API`
- MDN Web Docs: AbortController
  `https://developer.mozilla.org/en-US/docs/Web/API/AbortController`
- MDN Web Docs: URLSearchParams
  `https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams`
- MDN Web Docs: FormData
  `https://developer.mozilla.org/en-US/docs/Web/API/FormData`
- BigCommerce Catalyst — Data fetching
  `https://www.catalyst.dev/docs/data-fetching`
- BigCommerce GraphQL Storefront API
  `https://developer.bigcommerce.com/docs/storefront/graphql`
