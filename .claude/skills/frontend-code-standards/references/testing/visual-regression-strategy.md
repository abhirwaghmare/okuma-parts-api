# Visual Regression Strategy

## Table of Contents
1. What Visual Tests Should Cover
2. Baseline Strategy
3. Stabilizing Screenshots
4. Review and CI Workflow
5. Official References
6. Checklist

---

## 1. What Visual Tests Should Cover

Use visual regression for UI contracts that are hard to prove with text assertions alone:
- Layout and spacing
- Theme and variant differences
- Responsive states
- RTL rendering
- Complex states already represented in Storybook

Prefer visual tests for stable surfaces. Do not use them as a substitute for interaction, accessibility, or business-logic tests.

---

## 2. Baseline Strategy

Capture one baseline per meaningful variant:
- Default
- Important variants or themes
- Mobile and desktop layouts when they differ materially
- RTL when supported
- Error or empty states when the layout changes

Practical rules:
- Prefer component or element screenshots before full-page screenshots
- Keep baseline generation on one controlled browser and OS in CI
- Commit baselines with the code change that intentionally updates the UI
- Review image diffs before accepting new baselines

Example (Playwright):

```javascript
test('card visual baseline', async ({ page }) => {
    await page.goto('/iframe.html?id=components-card--default');
    await expect(page.getByTestId('card-root')).toHaveScreenshot('card-default.png');
});
```

---

## 3. Stabilizing Screenshots

Reduce visual noise before capturing baselines:
- Freeze or disable animations
- Mock network responses
- Fix dates, clocks, and random values
- Use deterministic fonts and seeded data
- Hide volatile regions such as ads, rotating banners, or timestamps

If the project is Storybook-centered, visual tests should run against stories because stories give stable, named UI states and reduce setup drift.

---

## 4. Review and CI Workflow

Recommended flow:
1. Create or update the story/state first
2. Run visual tests locally for the changed surface
3. Review diffs, not just pass/fail status
4. Accept baselines only for intentional changes
5. Run the same checks in CI before merge

Tool choice:
- Use Storybook visual testing when the repo already treats stories as the UI contract
- Use Playwright screenshot assertions when the team needs screenshots stored and reviewed in-repo

---

## 5. Official References

- [Storybook: Visual Tests](https://storybook.js.org/docs/writing-tests/visual-testing/)
- [Playwright: Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)

---

## 6. Checklist

- [ ] Visual tests cover stable, meaningful UI contracts
- [ ] Baselines exist for key variants, breakpoints, and RTL where needed
- [ ] Animations, time, and network data are controlled
- [ ] Component or element screenshots preferred over broad page captures
- [ ] Baseline updates reviewed in the same PR as the UI change
- [ ] CI runs the same visual checks as local workflow
