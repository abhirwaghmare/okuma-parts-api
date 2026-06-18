# Mocking and Test Data Patterns

## Table of Contents
1. Mock at the Boundary
2. Network Mocking
3. Function and Module Mocking
4. Test Data Patterns
5. Official References
6. Checklist

---

## 1. Mock at the Boundary

Examples below use common `Vitest` syntax. Apply the same boundary rules when the project uses `Jest` or another runner.

Mock external boundaries, not your own business logic:
- HTTP / GraphQL calls
- Time
- Randomness
- Browser APIs not available in the test environment
- Analytics and third-party SDKs

Avoid mocking:
- The function you are actually trying to prove
- Every child component by default
- Internal state transitions that can be asserted through output

Good rule: if users would notice the behavior, prefer exercising it for real inside the test boundary.

---

## 2. Network Mocking

Prefer network-level mocks over client-specific stubs so the same mock can work across tests, local development, and Storybook.

Example (MSW):

```javascript
const handlers = [
    http.get('/api/profile', () => {
        return HttpResponse.json({ id: '42', name: 'Asha' });
    }),
];
```

Practical rules:
- Keep one happy-path handler and add scenario-specific overrides per test
- Mock error, empty, slow, and partial-data responses
- Reuse handlers between Storybook stories and test suites when possible

---

## 3. Function and Module Mocking

Use the lightest tool that proves the behavior:
- Spy when you only need to observe calls
- Stub a return value when a dependency is slow or unstable
- Full module mock only when the real module makes the test non-deterministic

Example:

```javascript
const onSave = vi.fn();

render(<Editor onSave={onSave} />);

await user.click(screen.getByRole('button', { name: /save/i }));

expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ draft: false }));
```

Rules:
- Reset mocks between tests
- Keep mock setup near the test unless it is truly shared
- Prefer explicit per-test overrides over one giant global mock
- Be careful with hoisted module mocks in Vitest/Jest

---

## 4. Test Data Patterns

Prefer builders or factories over copied JSON blobs:

```javascript
const createUser = (overrides = {}) => ({
    id: 'user-1',
    name: 'Asha',
    role: 'editor',
    ...overrides,
});
```

Practical rules:
- Keep defaults realistic and valid
- Override only the fields needed by the scenario
- Name fixtures by intent: `anonymousUser`, `expiredSession`, `emptyResults`
- Keep IDs, dates, and locale-sensitive values deterministic
- Store large shared fixtures close to the domain they represent

Use small inline data when the scenario is obvious. Introduce shared builders only after duplication appears.

---

## 5. Official References

- [MSW: Getting Started](https://mswjs.io/)
- [Storybook: Mocking Network Requests](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests)
- [Vitest: Mock Functions](https://vitest.dev/guide/learn/mock-functions)
- [Vitest: Mocking Modules](https://vitest.dev/guide/mocking/modules.html)
- [Jest: Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest: Manual Mocks](https://jestjs.io/docs/manual-mocks)

---

## 6. Checklist

- [ ] Only external boundaries are mocked by default
- [ ] Network behavior is mocked at the network layer when possible
- [ ] Happy, error, empty, and slow responses are represented
- [ ] Spies/stubs are preferred before full module mocks
- [ ] Mocks are reset between tests
- [ ] Test data uses builders or realistic fixtures
- [ ] Shared fixtures are deterministic and easy to override
