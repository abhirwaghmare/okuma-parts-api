# BigCommerce Functions, Scripts, and Page Builder

For non-Catalyst surfaces (legacy Stencil, hosted checkout pages, embedded contexts), BC offers Scripts API, Page Builder widgets, and Big Open Data Layer. Catalyst stores usually use only the Scripts API and BODL.

## Scripts API

Inject scripts into BC-hosted pages (checkout, account, legacy storefronts). Managed via REST.

```bash
POST /v3/content/scripts
```

```json
{
  "name": "Site Analytics",
  "description": "Privacy-safe analytics tag",
  "html": "<script src='https://analytics.example.com/lib.js' async></script>",
  "auto_uninstall": true,
  "load_method": "default",
  "location": "head",
  "visibility": "all_pages",
  "kind": "script_tag",
  "consent_category": 2
}
```

Key fields:
- `location`: `head` or `footer`.
- `visibility`: `all_pages` | `checkout` | `order_confirmation` | `storefront`.
- `consent_category`: 1 (strict necessary), 2 (functional), 3 (analytics), 4 (targeting) — maps to BC's cookie consent banner.

Use when Catalyst is the storefront but checkout remains on BC's hosted pages — that's where Scripts API delivers tracking/marketing tags.

## Page Builder widgets (Stencil only)

Page Builder is the drag-and-drop editor for Stencil themes. Custom widgets are HTML/CSS/JS bundles registered via the BC control panel or API. **Not used on Catalyst** — Catalyst uses Makeswift as its visual editor. See `frontend/makeswift-integration.md`.

If your project mixes Catalyst (storefront) with Stencil (account/checkout):
- Build Page Builder widgets only for the Stencil surfaces.
- Keep them simple — they cannot share React state with Catalyst.

## Big Open Data Layer (BODL)

BODL is BC's standardised client-side event layer. Catalyst emits BODL events for analytics and personalisation.

### Common events

| Event | Fires when |
| --- | --- |
| `bodl_v1_product_viewed` | PDP loads |
| `bodl_v1_product_added_to_cart` | Add-to-cart success |
| `bodl_v1_product_removed_from_cart` | Remove from cart |
| `bodl_v1_cart_viewed` | Cart page loads |
| `bodl_v1_checkout_started` | Begin checkout |
| `bodl_v1_order_completed` | Order confirmation page |
| `bodl_v1_product_search_results_viewed` | Search results render |
| `bodl_v1_product_list_viewed` | PLP loads |

### Emit in Catalyst

```tsx
'use client';

import { useEffect } from 'react';

export function ProductViewed({ product }: { product: { id: number; name: string; price: number; currency: string } }) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('bodl_v1_product_viewed', {
        detail: {
          product: {
            product_id: String(product.id),
            sku: undefined,
            base_price: product.price,
            sale_price: product.price,
            currency: product.currency,
            name: product.name,
          },
        },
      }),
    );
  }, [product.id]);

  return null;
}
```

### Subscribe (analytics integration)

```ts
window.addEventListener('bodl_v1_order_completed', (event) => {
  const detail = (event as CustomEvent).detail;
  // forward to GA4, Segment, BlueShift, etc.
});
```

Use BODL instead of bespoke `dataLayer.push` so any vendor that ships a BC-aware tag works without rewrites.

## Headless integrations (recommended path)

For most extension needs in Catalyst, prefer:

1. **Webhooks → background job** for catalog/order side effects.
2. **REST Management API** for admin-side reads/writes.
3. **Storefront GraphQL with `customerAccessToken`** for personalised reads.
4. **Server actions** for cart/customer mutations from the storefront.
5. **Route handlers** for HTTP endpoints (webhook receivers, search proxies, A/B test config).

Avoid Scripts API for anything that can run inside Catalyst — Catalyst code is type-safe, version-controlled, and CI-tested. Scripts API code is none of those.

## Anti-patterns

- Building business logic in Scripts API HTML blobs — no version control, no testing, no rollback.
- Custom `dataLayer.push` calls when BODL covers the event — fragmentation.
- Page Builder widgets that try to call Catalyst APIs — they cannot share session/cookies cleanly.
