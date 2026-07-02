# State Management Patterns

Choose the smallest state model that matches the problem. Most frontend bugs come from duplicated state, unclear ownership, or mixing server data with local UI state.

## Decide State Scope First

Use this order:

1. If it can be derived, compute it instead of storing it
2. If one component owns it, keep it local
3. If a subtree shares it, lift it up or use scoped dependency injection
4. If it comes from the server, treat it as server state with fetching/caching rules
5. Use a global store only when multiple distant features truly coordinate on the same data

## State Types

| State type | Typical owner | Recommended pattern |
|---|---|---|
| Derived view state | Current component | Compute from props/state |
| Transient UI state | Current component | Local state |
| Shared feature state | Feature shell / route | Lift up, context, provide/inject, signals |
| Server state | Data layer | Query/caching layer or service |
| URL/filter state | Router / page | URL params as source of truth |
| Server-rendered data | Markup / RSC props | Read-only input, not duplicated app state |

## React

### Default Progression

| Need | Pattern |
|---|---|
| One component owns it | `useState` |
| Multiple related updates | `useReducer` |
| Shared across a subtree | Context |
| Remote API data | Query library / route loader |

Guidance:
- Start with `useState`
- Move to `useReducer` when several events mutate the same object graph
- Use Context for stable shared concerns like theme, locale, auth shell state
- Do not store values that can be calculated during render

Good:

```jsx
const visibleItems = items.filter((item) => item.active);
```

Avoid:

```jsx
const [visibleItems, setVisibleItems] = useState([]);
useEffect(() => {
  setVisibleItems(items.filter((item) => item.active));
}, [items]);
```

## Angular

### Default Progression

| Need | Pattern |
|---|---|
| Local reactive view state | `signal()` |
| Derived state | `computed()` |
| Async streams / external APIs | RxJS |
| Shared feature state | Shared service or store pattern |

Guidance:
- Prefer signals for local component state
- Use `computed` for derived values
- Keep RxJS for async/event streams and existing service APIs
- Avoid pushing every value into a singleton service by default

```typescript
readonly filters = signal({ activeOnly: false });
readonly visibleItems = computed(() =>
  this.items().filter((item) => !this.filters().activeOnly || item.active)
);
```

## Vue

### Default Progression

| Need | Pattern |
|---|---|
| Local state | `ref()` / `reactive()` |
| Derived state | `computed()` |
| Shared subtree state | `provide()` / `inject()` |
| App-wide coordinated state | Pinia if the project already uses it |

Guidance:
- Prefer `ref` for primitives and focused values
- Use `reactive` for grouped objects when it improves readability
- Keep computed values side-effect free
- Reach for Pinia only when multiple routes or distant features share real application state

```vue
<script setup>
import { ref, computed } from 'vue';

const query = ref('');
const filtered = computed(() =>
  items.value.filter((item) => item.title.includes(query.value))
);
</script>
```

## Vanilla JS and Server-Rendered-Friendly Patterns

### Keep State Close to the DOM Root

For HTML-first components, state usually lives in one module per component instance:

```js
export function initTabs(root) {
  const state = { activeId: root.dataset.defaultTab || 'overview' };

  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-tab-id]');
    if (!trigger) return;

    state.activeId = trigger.dataset.tabId;
    renderTabs(root, state);
  });

  renderTabs(root, state);
}
```

Use this for:
- Accordions
- Tabs
- Filters
- Lightboxes
- Small forms

### Treat Server-Rendered Content as Input

In server-rendered pages:
- Read server-provided values from HTML or RSC props
- Do not mirror all server props into a global client store
- Persist only user-driven UI state that must survive navigation or refresh

## Preferred Patterns by Problem

| Problem | Preferred pattern |
|---|---|
| Toggle, open/close, selected tab | Local component state |
| Complex form wizard | Reducer, feature service, or store |
| Theme / locale / account context | Scoped shared state |
| API data cache | Server-state tool or service layer |
| Derived labels, counts, filters | Compute, do not store |
| Cross-component event notification | Custom events before global store |

## Anti-Patterns

- Storing derived values instead of computing them
- Copying props/page-model data into local state with no edit flow
- One global store for every toggle and modal
- Mixing server cache data and local UI flags in the same object
- Mutating shared state objects in place when the framework expects immutable updates
- Using effects/watchers only to sync one local value to another

## Quick Checklist

- One clear owner for each state value
- Derived values computed, not duplicated
- Local state preferred over app-wide state
- Server state handled separately from UI state
- Server-rendered data treated as input, not canonical store state
- Shared state introduced only when multiple consumers justify it

## Official References

- React: [Managing State](https://react.dev/learn/managing-state), [`useState`](https://react.dev/reference/react/useState), [`useReducer`](https://react.dev/reference/react/useReducer), [Context](https://react.dev/learn/passing-data-deeply-with-context), [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- Angular: [Signals](https://angular.dev/guide/signals/), [Control Flow](https://angular.dev/guide/templates/control-flow), [Update Guide](https://angular.dev/update)
- Vue: [Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html), [Computed Properties](https://vuejs.org/guide/essentials/computed), [Provide / Inject](https://vuejs.org/guide/components/provide-inject)
