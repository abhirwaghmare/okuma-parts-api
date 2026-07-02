# Frontend Performance Optimization Standards

## Table of Contents
1. Performance Targets
2. Images and Media
3. CSS and JavaScript Delivery
4. Runtime Performance
5. Measurement and Regression Checks
6. Official References
7. Checklist

---

## 1. Performance Targets

Use Core Web Vitals as the default frontend performance target:
- LCP <= 2.5s at the 75th percentile
- INP <= 200ms at the 75th percentile
- CLS <= 0.1 at the 75th percentile

For Catalyst frontend work, optimize the first viewport first:
- Prioritize the hero image (`next/image priority`), heading, and primary CTA
- Default to RSC and use client components only where interactivity demands it
- Avoid large client bundles when only one route or component needs the code — use `next/dynamic` for client widgets

Treat every new dependency, font, script, and third-party tag as a performance cost.

---

## 2. Images and Media

Always reserve space for media to prevent layout shift:

```html
<img
    src="/content/dam/site/hero.jpg"
    alt="Hero banner"
    width="1440"
    height="810"
    fetchpriority="high"
/>
```

For below-the-fold media, lazy load by default:

```html
<img
    src="/content/dam/site/card.jpg"
    alt="Card image"
    width="640"
    height="480"
    loading="lazy"
/>
```

Rules:
- Every content image must have explicit `width` and `height`
- Use `loading="lazy"` for below-the-fold images and iframes
- Do not lazy load the main LCP image
- Prefer responsive image sources and appropriately sized renditions
- Avoid autoplay video in the initial viewport unless business-critical

---

## 3. CSS and JavaScript Delivery

Keep the critical path small:

```html
<script src="/etc.clientlibs/site/clientlibs/main.js" defer></script>
```

```javascript
// Load optional behavior only when the component exists
if (document.querySelector('.cmp-carousel')) {
    import('./carousel.js').then(({ initCarousel }) => initCarousel());
}
```

Rules:
- Use `defer` for non-critical classic scripts
- Inline only truly critical CSS; keep it minimal
- Split optional component logic from base page logic
- Remove unused CSS, dead JavaScript, and duplicate polyfills
- Self-host and subset fonts where possible
- Use `font-display: swap` or an equivalent non-blocking font strategy

---

## 4. Runtime Performance

Fast page load is not enough; interactions must stay responsive:

```javascript
const onScroll = () => {
    window.requestAnimationFrame(updateStickyHeader);
};

window.addEventListener('scroll', onScroll, { passive: true });
```

Rules:
- Prefer CSS over JavaScript for visual effects when possible
- Batch DOM reads and writes; avoid layout thrashing
- Use `transform` and `opacity` for animation instead of layout-triggering properties
- Debounce or throttle resize, scroll, and input handlers when work is non-trivial
- Clean up observers and event listeners when components are destroyed
- Do not trigger analytics, personalization, and rendering work in the same hot path without measuring the cost

---

## 5. Measurement and Regression Checks

Measure both lab and field performance:
- Use Lighthouse during development to catch regressions early
- Use real-user monitoring for actual Core Web Vitals performance
- Test production-like pages with realistic content, not only local placeholders

When debugging:
- Check the LCP element first
- Check unexpected layout shifts caused by images, embeds, fonts, and injected banners
- Check long tasks and event handlers when INP degrades

Performance review minimum:
- Home page
- At least one heavy landing page
- At least one content page with multiple authored components

---

## 6. Official References

- [Core Web Vitals](https://web.dev/articles/vitals)
- [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp)
- [Interaction to Next Paint (INP)](https://web.dev/inp/)
- [Cumulative Layout Shift (CLS)](https://web.dev/articles/cls)
- [Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)
- [`<img>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [`<script>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [Lighthouse overview](https://developer.chrome.com/docs/lighthouse/overview)

---

## 7. Checklist

- [ ] LCP, INP, and CLS targets defined for the page or template
- [ ] Hero/LCP content prioritized in the first viewport
- [ ] Images include explicit `width` and `height`
- [ ] Below-the-fold media uses lazy loading
- [ ] LCP image is not lazy loaded
- [ ] Non-critical scripts use `defer`, `async`, or dynamic loading
- [ ] Optional component JS is not loaded globally without need
- [ ] Fonts use a non-blocking loading strategy
- [ ] Scroll, resize, and input handlers are measured and controlled
- [ ] Lighthouse checked before merge
- [ ] Field monitoring plan exists for production pages
