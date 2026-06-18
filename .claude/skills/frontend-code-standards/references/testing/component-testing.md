# Component Testing

## Table of Contents
1. Purpose
2. Query Strategy
3. Interaction Patterns
4. Coverage Matrix
5. Official References
6. Checklist

---

## 1. Purpose

Examples below use common Testing Library patterns. Keep the query and interaction strategy even when the render helper differs by framework.

Component tests should prove what a user can perceive and do:
- What renders
- What changes after interaction
- What is announced to assistive technology
- What happens in loading, empty, success, and error states

Prefer component tests over implementation-heavy unit tests when behavior depends on rendered DOM, browser events, or accessibility semantics.

---

## 2. Query Strategy

Follow semantic query priority first:
- `getByRole(..., { name })`
- `getByLabelText()`
- `getByText()`
- `getByTestId()` only as a last resort

Example:

```javascript
test('submits the form', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), '[email protected]');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await expect(screen.findByRole('status')).resolves.toBeVisible();
});
```

Rules:
- Use `screen` for top-level queries
- Use `findBy...` for async UI changes
- Use `within()` when the contract is scoped to one region
- Do not target CSS classes, component instances, or internal state

---

## 3. Interaction Patterns

Prefer full user interactions over low-level event firing:

```javascript
test('opens details on keyboard activation', async () => {
    const user = userEvent.setup();

    render(<Accordion />);

    const toggle = screen.getByRole('button', { name: /details/i });
    toggle.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('region', { name: /details/i })).toBeVisible();
});
```

Cover interactions that matter in production:
- Click and tap behavior
- Keyboard behavior for interactive controls
- Focus movement after open/close/submit
- Disabled and busy states
- Error messages and status messages

If the project uses Storybook, reuse stories as stable component states and validate the same states in automated tests.

---

## 4. Coverage Matrix

Minimum states for most interactive components:

| State / Behavior | Expectation |
|---|---|
| Default | Main content renders and primary action is available |
| Loading | Progress indicator or busy state is exposed |
| Empty | Empty copy is visible and action is still clear |
| Error | Error message is visible and recovery path is testable |
| Success | Final state is visible and callbacks/side effects are confirmed |
| Keyboard | Tab, Enter, Space, Escape work where relevant |
| Accessibility | Roles, labels, and names support semantic queries |

---

## 5. Official References

- [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [Testing Library: About Queries](https://testing-library.com/docs/queries/about/)
- [Testing Library: user-event Introduction](https://testing-library.com/docs/user-event/intro/)
- [Storybook: Vitest Addon / Component Tests](https://storybook.js.org/docs/writing-tests/test-addon)
- [Playwright: Component Testing](https://playwright.dev/docs/test-components)

---

## 6. Checklist

- [ ] Test asserts user-visible behavior
- [ ] Semantic queries used before `data-testid`
- [ ] Interactions use `userEvent` or equivalent user-level APIs
- [ ] Async UI changes use `findBy...` or equivalent wait patterns
- [ ] Loading, empty, error, and success states covered where relevant
- [ ] Keyboard path covered for interactive components
- [ ] No assertions on framework internals or CSS class names
