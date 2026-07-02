# Vue Standards

Generic patterns for Vue projects — component development, Composition API, and performance. Discover the project's Vue version and patterns from project code standards before applying anything here.

## Component Patterns

### Composition API (Vue 3 — preferred)
Use `<script setup>` for Vue 3 projects:

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
});

const isExpanded = ref(false);
const itemCount = computed(() => props.items.length);

onMounted(() => {
  // Initialize after mount
});
</script>
```

### Options API (Vue 2 — legacy)
If project uses Vue 2 (check stack context):

```vue
<script>
export default {
  name: 'HeroBanner',
  props: {
    title: { type: String, required: true },
    items: { type: Array, default: () => [] },
  },
  data() {
    return { isExpanded: false };
  },
  computed: {
    itemCount() { return this.items.length; },
  },
};
</script>
```

### TypeScript Support
If project uses TypeScript:

```vue
<script setup lang="ts">
interface CardProps {
  title: string;
  image?: string;
  link?: { url: string; label: string };
}

const props = defineProps<CardProps>();
</script>
```

## State Management

Discover from stack context what the project uses:

| Pattern | When to Use |
|---------|------------|
| ref/reactive | Component-local state |
| provide/inject | Shared state across component tree (theme, locale) |
| Pinia (Vue 3) | Global state management (recommended over Vuex) |
| Vuex (Vue 2) | Global state (legacy — use Pinia for new projects) |

For server-rendered apps, most components receive props from the page model — local state is usually sufficient.

## Template Patterns

### Conditional Rendering
```vue
<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else>
    <h1>{{ title }}</h1>
    <ul v-if="items.length">
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>
```

### Slots (Component Composition)
```vue
<!-- Layout component -->
<template>
  <div class="layout">
    <header><slot name="header" /></header>
    <main><slot /></main>
    <footer><slot name="footer" /></footer>
  </div>
</template>
```

### Event Handling
```vue
<template>
  <button @click="handleClick" @keydown.enter="handleClick">
    {{ label }}
  </button>
</template>

<script setup>
const emit = defineEmits(['action']);
const handleClick = () => emit('action', { id: props.id });
</script>
```

## Performance

### Lazy Loading Components
```js
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
);
```

### v-once and v-memo
```vue
<!-- Static content — render once, never re-render -->
<footer v-once>{{ copyright }}</footer>

<!-- Memoize based on dependencies (Vue 3.2+) -->
<div v-memo="[item.id, item.selected]">{{ item.name }}</div>
```

### Image Optimization
- Use `loading="lazy"` for below-fold images
- Provide `width` and `height` to prevent CLS
- Use `srcset` for responsive images
- Prefer WebP format with fallback

## Testing

Follow project test conventions from project code standards. Common patterns:

```js
// Vue Test Utils + Vitest (Vue 3)
import { mount } from '@vue/test-utils';
import HeroBanner from './HeroBanner.vue';

test('renders hero title', () => {
  const wrapper = mount(HeroBanner, {
    props: { title: 'Welcome' },
  });
  expect(wrapper.find('h1').text()).toBe('Welcome');
});

// With server-rendered context — mock page model props
test('renders with server props', () => {
  const wrapper = mount(HeroBanner, {
    props: {
      title: 'Welcome',
      slug: '/home/herobanner',
    },
  });
  expect(wrapper.exists()).toBe(true);
});
```

## Common Pitfalls

- Mutating props directly — Vue warns, use `emit` to communicate changes to parent
- Using Options API in a Composition API project (or vice versa) — check project code standards
- Not handling undefined props — server data may pass null for empty fields
- Memory leaks — clean up watchers, event listeners in `onUnmounted`
- Using `v-html` without sanitization — XSS risk with server-rendered content
