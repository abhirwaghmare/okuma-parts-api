# Internationalization and Localization

## Table of Contents
1. Core Principles
2. Language and Direction
3. Formatting and Message Patterns
4. Content and Translation Keys
5. BigCommerce (Catalyst) Considerations
6. Testing
7. Checklist
8. Official References

---

## 1. Core Principles

Internationalization (i18n) prepares the UI for multiple locales.
Localization (l10n) applies locale-specific content and formatting.

Rules:
- Never concatenate translated sentence fragments
- Keep text, formatting, and layout locale-aware
- Assume text expansion and contraction
- Design for both left-to-right and right-to-left layouts where required

---

## 2. Language and Direction

Set the document language correctly and use directional attributes when needed.

```html
<html lang="en">
<body>
    <article lang="fr">
        ...
    </article>
</body>
</html>
```

```html
<section dir="rtl" class="cmp-promo">
    ...
</section>
```

CSS guidance:

```less
.cmp-promo {
    padding-inline-start: 16px;
    margin-inline-end: 12px;
    text-align: start;
}
```

Prefer logical properties over `left` / `right` specific rules.

---

## 3. Formatting and Message Patterns

Use the `Intl` APIs for locale-aware formatting.

```javascript
const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
});

const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
});
```

Practical rules:
- Format dates, times, numbers, and currency at render time
- Keep time zones explicit when business meaning depends on them
- Support pluralization and variable interpolation through the project's translation layer
- Do not hardcode separators, month names, or currency symbols

---

## 4. Content and Translation Keys

Translation keys should be stable and descriptive.

```javascript
const messages = {
    'cart.summary.items': '{count} items',
    'form.error.required': 'This field is required.',
};
```

Rules:
- Use keys by meaning, not by English source copy alone
- Keep reusable UI messages separate from authored long-form content
- Do not place HTML markup inside translation strings unless the project pattern explicitly supports it safely

---

## 5. BigCommerce (Catalyst) Considerations

For Catalyst frontend projects:
- Use `next-intl` for UI copy and route-prefixed locales — never hardcode user-facing strings.
- Catalog content (product names, descriptions) comes from the GraphQL Storefront API in the requested locale — request the channel-scoped locale variant.
- Multi-storefront: each channel may have a distinct locale set — resolve channel + locale per request via `beforeRequest` middleware.
- Keep placeholders and empty states localizable through `next-intl` message keys.
- Ensure client-side strings match the locale of the current request (`getLocale()` server-side, `useLocale()` in client components).

If locale comes from the request context, use that as the default formatter locale:

```typescript
import { getLocale } from 'next-intl/server';

const locale = await getLocale();
```

When the project supports RTL locales, verify both server-rendered markup and component CSS with real content, not just mirrored placeholders.

---

## 6. Testing

Test at least:
- One default LTR locale
- One locale with longer strings
- One locale with different date/number formatting
- One RTL locale when supported

Verify:
- Truncation and wrapping
- Icon and chevron direction where meaning changes
- Validation and status messages
- Locale switching persistence

---

## 7. Checklist

- [ ] `lang` is set correctly on the document or language-specific blocks
- [ ] `dir` is handled correctly for RTL content
- [ ] CSS uses logical properties where possible
- [ ] `Intl` APIs or project localization utilities format locale-sensitive values
- [ ] Translation keys are stable and meaningful
- [ ] No concatenated translated sentence fragments
- [ ] GraphQL Storefront catalog content and `next-intl` UI strings stay locale-aligned
- [ ] LTR, long-text, and RTL scenarios are tested where applicable

---

## 8. Official References

- MDN Web Docs: HTML `lang` global attribute
  `https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang`
- MDN Web Docs: HTML `dir` global attribute
  `https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir`
- MDN Web Docs: `Intl.DateTimeFormat`
  `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat`
- MDN Web Docs: `Intl.NumberFormat`
  `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat`
- Adobe Experience Manager 6.5: Internationalization
  `https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/components/internationalization/i18n-dev`
