# Unit Testing Patterns

## Table of Contents
1. What Unit Tests Should Cover
2. Preferred Test Shape
3. Async and Timer Patterns
4. Snapshot Guardrails
5. Official References
6. Checklist

---

## 1. What Unit Tests Should Cover

Examples below use common `Vitest` / `Jest` syntax. Adapt runner-specific APIs to the project standard.

Use unit tests for logic with a clear input/output contract:
- Formatters, validators, mappers, reducers, selectors
- Small state transitions
- Utility functions with edge cases
- Component helpers that do not need the DOM

Do not use unit tests to prove browser rendering, CSS layout, or framework wiring. Move those to component or visual tests.

---

## 2. Preferred Test Shape

Keep each test focused on one behavior:

```javascript
describe('formatPrice', () => {
    test('formats whole numbers with currency symbol', () => {
        const result = formatPrice(25, 'USD');
        expect(result).toBe('$25.00');
    });
});
```

Practical rules:
- Arrange data inline when it is short and readable
- Use `describe()` for one module or behavior group
- Name tests by observable outcome, not implementation
- Assert the contract, not temporary internals
- Prefer a few explicit assertions over one broad snapshot

Good test names:
- `returns fallback copy when title is missing`
- `throws when end date is before start date`
- `merges duplicate filters by key`

Avoid:
- `works correctly`
- `calls line 42 branch`

---

## 3. Async and Timer Patterns

For async logic:

```javascript
test('returns parsed API payload', async () => {
    const result = await loadProfile(apiClient);
    expect(result.name).toBe('Asha');
});
```

Rules:
- `await` the real unit under test
- Assert success and failure paths
- Use fake timers only when time is part of the contract
- Reset timers, mocks, and shared state after each test

Timer example:

```javascript
test('debounces repeated calls', () => {
    vi.useFakeTimers(); // or jest.useFakeTimers()

    const fn = vi.fn();
    const debounced = createDebounced(fn, 300);

    debounced();
    debounced();
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
});
```

---

## 4. Snapshot Guardrails

Snapshots are useful when the output is structured and hard to assert line by line, but keep them small.

Use snapshots for:
- Serializer output
- Error objects after normalization
- Small rendered fragments with stable content

Avoid snapshots for:
- Large objects
- Fast-changing markup
- Anything reviewers will not realistically read

Rules:
- Treat snapshots like source code
- Review snapshot diffs in the same PR as the change
- Prefer focused snapshots plus a few explicit assertions

---

## 5. Official References

- [Vitest: Mock Functions](https://vitest.dev/guide/learn/mock-functions)
- [Jest: Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest: Snapshot Testing](https://jestjs.io/docs/snapshot-testing)

---

## 6. Checklist

- [ ] Test covers a real input/output contract
- [ ] One behavior per test
- [ ] Test name describes the user-visible or business outcome
- [ ] Success, edge case, and failure paths covered where relevant
- [ ] Async code is properly awaited
- [ ] Fake timers used only when time behavior matters
- [ ] Snapshots are small and reviewable
- [ ] No assertions on private implementation details
