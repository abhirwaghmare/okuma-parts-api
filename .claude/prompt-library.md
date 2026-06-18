# BigCommerce (Catalyst) Prompt Library

Quick-reference prompts for common BigCommerce / Catalyst development tasks. Copy, adjust to your context, and go.

---

## Planning & Analysis

**1. Plan a new Catalyst component from a Jira story**
```
/planner #12345
```

**2. Plan a new Catalyst component from a Figma design**
```
/planner https://figma.com/design/... build the card component shown in the design
```

**3. Plan a new Catalyst component with both story and design**
```
/planner #12345 https://figma.com/design/...
```

**4. Plan a new server action / route handler**
```
/planner I need a server action that fetches product data from the BigCommerce GraphQL Storefront and caches responses by tag for 10 minutes
```

**5. Plan a third-party API integration**
```
/planner I need to integrate with Salesforce CRM to sync customer profile data on form submission via a server action
```

**6. Analyze existing component for reuse before building new**
```
/planner check if we have an existing component that could be extended for a featured article card with image, title, description, and CTA
```

---

## BigCommerce Backend (Server Actions + GraphQL Storefront)

**7. Create a typed GraphQL Storefront query**
```
/build create a gql.tada query for the hero PDP block that selects product name, default image, description, and CTA link
```

**8. Create a server action with Zod validation**
```
/build create a server action that adds an item to the cart — validate FormData with Zod via parseWithZod, call BigCommerce GraphQL, revalidateTag('cart')
```

**9. Create a Next.js route handler for a BC webhook**
```
/build create a POST route handler at /api/webhooks/orders that verifies the BigCommerce HMAC signature, deduplicates via payload hash, and revalidates the orders tag
```

**10. Add a field to an existing component**
```
/build add a list-of-tags prop (max 5, label + link each) to the card component and update the matching GraphQL fragment
```

**11. Create a scheduled cron handler**
```
/build create a Vercel cron route handler at /api/cron/cleanup that runs nightly to invalidate stale cache tags
```

**12. Debug a server action error**
```
/debug AddToCartAction returns "Invalid product entity ID" when the SKU lookup succeeds in the GraphQL playground
```

**13. Fix a cache-tag leak**
```
/debug customer cart is being cached across users — investigate cache strategy and revalidateTag usage in cart server actions
```

---

## Catalyst Frontend (RSC + Client Components)

**14. Create an RSC page**
```
/build create a Catalyst page at app/(default)/products/[slug]/page.tsx that fetches the product via GraphQL Storefront and renders name, gallery, description, and Add to Cart
```

**15. Create a client component**
```
/build create a client AddToCartButton component that wires a form action to the addToCart server action and shows pending state
```

**16. Fix an accessibility issue on a component**
```
/debug the carousel component fails axe-core audit — missing ARIA labels on navigation buttons and focus is not managed when slide changes
```

**17. Convert a Figma design to a Catalyst component**
```
/planner https://figma.com/design/...
/build build the promo banner component from the Figma design — match the design tokens, layout, and responsive breakpoints exactly using Tailwind utilities
```

**18. Add RTL support to a component**
```
/build add RTL support to the card component — replace directional Tailwind utilities with logical properties (ms-, me-, ps-, pe-) and create an RTL Storybook story
```

---

## Catalyst Platform / Deployment

**19. Audit a feature for RSC/client boundary correctness**
```
/review-code check this feature for any GraphQL Storefront or REST Management API calls happening in client components — they must live in RSC or server actions
```

**20. Set up next-intl localized routes**
```
/build add next-intl support with route-prefixed locales for en, es, and fr — wire BigCommerce channel-per-locale resolution via beforeRequest
```

**21. Configure a multi-storefront channel resolver**
```
/build add a per-request channel resolver in core/client/index.ts so each hostname maps to the right BIGCOMMERCE_CHANNEL_ID
```

**22. Replace direct fetch calls with the typed client**
```
/build replace direct fetch() calls to the GraphQL endpoint with client.fetch + gql.tada in core/components/product-card
```

---

## BigCommerce Headless

**23. Define a GraphQL fragment**
```
/build create a PricingFragment under core/client/fragments/ that exposes price, salePrice, retailPrice, and currency — apply fragment masking
```

**24. Add a B2B Edition flow**
```
/build add a B2B quote-request server action — validate via Zod, call the B2B API with the rotated B2B_API_TOKEN, and surface masked errors
```

**25. Wire customer JWT SSO**
```
/build implement a customer JWT SSO mint endpoint — sign with BIGCOMMERCE_CLIENT_SECRET, HS256, 30s expiry, include iss/iat/jti/operation/store_hash/customer_id/channel_id
```

**26. Fetch products in a React Server Component**
```
/build create an RSC that lists featured products using client.fetch + gql.tada and renders them as ProductCard, with Suspense for streaming
```

---

## Migration / Upgrades

**27. Scan codebase for deprecated patterns**
```
/review-code scan for any client components calling the GraphQL Storefront or REST Management API directly — list every occurrence with file and line number
```

**28. Migrate REST calls to GraphQL Storefront**
```
/build migrate the legacy fetch('/api/products') calls to client.fetch + a typed gql.tada query and reuse existing fragments
```

**29. Bump Next.js + React versions**
```
/build run the official Next.js codemod, fix compile/runtime warnings, and verify Catalyst pages still render and stream correctly
```

---

## Testing & Review

**30. Write Vitest tests for a server action**
```
/generate-junits write Vitest tests for addToCart — happy path, invalid FormData, BC API error, and revalidateTag called on success (mock BC GraphQL with MSW)
```

**31. Review my component code before commit**
```
/review-code
```

**32. Full code review of a feature**
```
/review-code review the card component implementation — check Catalyst standards, security, accessibility, performance, and code quality
```

**33. Fix failing Vitest tests**
```
/debug Vitest tests in card-model.test.ts are failing — getProductTitle() returns null when the GraphQL fragment is masked correctly
```

**34. Write Playwright tests for a Catalyst page**
```
/generate-junits write Playwright tests for the PDP — cover rendering, keyboard navigation, accessibility (axe-core), responsive breakpoints, and RTL
```

---

## Debugging & Onboarding

**35. Explain how a component works**
```
/debug-code core/components/product-card/index.tsx
```

**36. Debug a frontend rendering issue**
```
/debug the promo banner component does not render correctly on mobile — the image overflows its container below 768px
```

**37. Onboard to this Catalyst project**
```
/debug-code
```

**38. Find where a feature is implemented**
```
/debug-code where is the search functionality implemented — I need to understand the route, server action, and components before adding a filter
```

---

## Tip: Combine Commands for Richer Context

```
/planner #12345 https://figma.com/design/...
/planner build the login form component
```
