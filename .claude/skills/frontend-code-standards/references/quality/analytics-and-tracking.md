# Analytics and Tracking Standards

## Table of Contents
1. Tracking Contract
2. Data Layer First
3. Consent and Load Order
4. Event Design
5. Reliable Delivery
6. Validation and Debugging
7. Official References
8. Checklist

---

## 1. Tracking Contract

Frontend tracking must be intentional, stable, and reviewable:
- Define what is being measured before adding code
- Track business events, not random clicks
- Use stable names for events and payload fields
- Keep the same event meaning across templates and components

Every tracked event should answer:
- What user action or state change happened?
- When should it fire?
- Which fields are required?
- Which downstream tool consumes it?

Do not infer analytics requirements by scraping visible text or brittle DOM structure.

---

## 2. Data Layer First

For Catalyst projects, prefer a structured data layer (e.g. `window.dataLayer` for GTM, Vercel Web Analytics, or Datadog RUM) over direct vendor calls in component code. Extend the project's existing data layer instead of inventing a second event system.

```javascript
window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
    event: 'view_item',
    ecommerce: {
        items: [{ item_id: productId, item_name: productName, price }],
    },
});
```

Custom events should be explicit and small:

```javascript
window.dataLayer.push({
    event: 'form_submit_success',
    form: {
        id: 'contact-us',
        type: 'lead',
    },
});
```

Rules:
- Push structured data, not formatted reporting strings
- Include stable IDs, component names, and page context
- Avoid duplicate page-level metadata on every component event unless required
- Keep PII, secrets, and sensitive form values out of the data layer
- Do not couple component rendering logic to a specific analytics vendor

---

## 3. Consent and Load Order

Tracking must respect consent and project privacy rules:
- Do not fire non-essential analytics before consent is granted
- Load tag managers and analytics libraries after consent when required
- Ensure components fail safely when tracking is unavailable
- Keep consent state handling centralized, not duplicated in each component

For preview and visual-editor environments (e.g. Vercel preview, Makeswift edit mode), do not count preview-only interactions or editor chrome events as production analytics unless the project explicitly requires it.

---

## 4. Event Design

One business interaction should map to one clear event.

```javascript
button.addEventListener('click', () => {
    window.adobeDataLayer.push({
        event: 'cta-click',
        component: {
            id: 'hero-primary-cta',
            type: 'button'
        },
        link: {
            destination: '/apply-now'
        }
    });
});
```

Rules:
- Use present-tense, action-based event names such as `cta-click`, `accordion-open`, `video-start`
- Fire on confirmed interaction or state change, not on hover
- Prevent duplicate firing during re-render, hydration, or repeated listener attachment
- Distinguish page view, component impression, and engagement events
- Document required payload fields before implementation

For SPA-like experiences, route changes must trigger the correct page view logic exactly once per virtual page change.

---

## 5. Reliable Delivery

Use browser-supported delivery patterns for lightweight analytics sends:

```javascript
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        navigator.sendBeacon('/analytics', JSON.stringify({ event: 'page-hide' }));
    }
});
```

Rules:
- Prefer `navigator.sendBeacon()` for small unload or visibility-based analytics payloads
- Use `fetch(..., { keepalive: true })` only when request control is required
- Do not block navigation waiting for analytics requests
- Do not attach analytics only to `beforeunload` or `unload`
- Retry or queue only when the business case justifies the added complexity

---

## 6. Validation and Debugging

Tracking changes must be testable:
- Verify events in browser DevTools and network logs
- Validate payload shape against the agreed tracking contract
- Test with real authored content, not only mocked component data
- Confirm no duplicate events fire on refresh, author mode, or personalization updates

Review minimum:
- Page load or page view event
- Primary CTA click event
- One form success event
- One component impression or visibility event, if used

---

## 7. Official References

- [Google Tag Manager — dataLayer reference](https://developers.google.com/tag-platform/tag-manager/web/datalayer)
- [Adobe Client Data Layer repository](https://github.com/adobe/adobe-client-data-layer)
- [`Navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

## 8. Checklist

- [ ] Tracking requirements are defined before implementation
- [ ] Data layer used as the primary frontend tracking contract
- [ ] Event names and payload fields are stable and documented
- [ ] No PII or sensitive values pushed into analytics payloads
- [ ] Consent rules applied before non-essential tracking fires
- [ ] Author mode and editor-only interactions excluded unless required
- [ ] Duplicate events prevented during re-render or re-init
- [ ] SPA or virtual page view handling validated where applicable
- [ ] `sendBeacon()` or equivalent used for lightweight page-exit delivery
- [ ] Events verified in DevTools or tag debugger before merge
