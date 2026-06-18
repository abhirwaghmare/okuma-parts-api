# Browser Support and Progressive Enhancement

## Table of Contents
1. Support Strategy
2. Progressive Enhancement
3. Feature Detection
4. CSS Fallbacks
5. JavaScript Fallbacks
6. BigCommerce (Catalyst) Considerations
7. Checklist
8. Official References

---

## 1. Support Strategy

Define browser support before implementation.

Practical default:
- Start from the project's analytics and contractual support requirements
- Prefer widely available platform features
- Check compatibility before adopting new APIs
- Treat "works everywhere" and "identical everywhere" as different goals

Rules:
- Critical content and navigation must remain accessible on all supported browsers
- Enhancements may vary when the baseline experience remains usable
- Avoid adding polyfills for features that are not required by project support targets

---

## 2. Progressive Enhancement

Build from semantic HTML first, then layer CSS and JavaScript.

```html
<details class="cmp-faq">
    <summary>What is covered?</summary>
    <p>Coverage details...</p>
</details>
```

This pattern already works without custom JavaScript. Add scripting only when the experience needs more control than the platform gives by default.

Guidance:
- Content first
- Interaction second
- Visual polish third

---

## 3. Feature Detection

Detect capabilities, not browser names.

```javascript
if ('IntersectionObserver' in window) {
    startLazyLoading();
} else {
    loadCriticalImagesImmediately();
}
```

```css
@supports (display: grid) {
    .cmp-layout {
        display: grid;
    }
}
```

Avoid:
- User-agent sniffing for normal feature decisions
- Shipping large fallback code for non-critical enhancements

---

## 4. CSS Fallbacks

Use a safe baseline, then enhance.

```less
.cmp-layout {
    display: block;
}

@supports (display: grid) {
    .cmp-layout {
        display: grid;
        gap: 16px;
    }
}
```

Rules:
- Preserve readable order without advanced layout features
- Keep contrast, spacing, and typography usable when modern effects fail
- Respect user preferences such as reduced motion and high contrast

---

## 5. JavaScript Fallbacks

JavaScript should enhance behavior, not gate core content access.

```javascript
const dialogElement = document.querySelector('[data-cmp-dialog]');

if (dialogElement && typeof dialogElement.showModal === 'function') {
    dialogElement.showModal();
} else if (dialogElement) {
    dialogElement.hidden = false;
}
```

Rules:
- Guard optional APIs before use
- Keep error paths quiet and recoverable
- Load polyfills only for required features and only where needed

---

## 6. BigCommerce (Catalyst) Considerations

For Catalyst frontend projects:
- Default to RSC; treat the server-rendered HTML stream as the baseline experience.
- Do not hide core product/content behind client-only rendering unless the project explicitly requires it.
- Use `'use client'` only when interactivity demands it — keep the JS payload small.
- Order Next.js script loading (`next/script` strategies) so essential CSS and JS land before optional enhancements.
- Use `next/image` with explicit width/height to avoid CLS; use the BigCommerce CDN with `urlTemplate(lossy: true)` for image URLs.

Good baseline:
- RSC renders content
- Tailwind utilities and CSS provide usable layout
- Client components add richer interactions, analytics, lazy behavior, or personalization

---

## 7. Checklist

- [ ] Browser support targets are defined
- [ ] Critical content works without advanced APIs
- [ ] Semantic HTML provides the baseline experience
- [ ] Capabilities are detected with feature detection, not UA sniffing
- [ ] CSS has a readable fallback path
- [ ] Optional JS APIs are guarded before use
- [ ] Polyfills are justified by support requirements
- [ ] Server-rendered content remains visible if client-side enhancements fail
- [ ] Preview and production deploys are both tested

---

## 8. Official References

- MDN Web Docs: Progressive enhancement
  `https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement`
- MDN Web Docs: `@supports`
  `https://developer.mozilla.org/en-US/docs/Web/CSS/@supports`
- MDN Web Docs: Browser compatibility
  `https://developer.mozilla.org/en-US/docs/Glossary/Browser_compatibility`
- MDN Web Docs: Baseline
  `https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility`
