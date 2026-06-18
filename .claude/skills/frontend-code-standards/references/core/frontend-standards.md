# Frontend Standards

## Table of Contents
1. JavaScript Standards
2. CSS / LESS Standards
3. Module Structure
4. AI Code Markers
5. Workflow Standards

---

## 1. JavaScript Standards

### ES6+ Syntax

```javascript
// Correct
const apiUrl = 'https://api.example.com';
let counter = 0;

const fetchData = async (endpoint) => {
    try {
        const response = await fetch(`${apiUrl}/${endpoint}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

// Avoid
var apiUrl = 'https://api.example.com';   // Use const/let
function fetchData(endpoint) { ... }       // Use arrow functions
```

### Error Handling

Use try/catch for async operations:

```javascript
try {
    const data = await fetchData('users');
    processData(data);
} catch (error) {
    handleError(error);
}
```

### Event Listeners — No Inline Handlers

```javascript
// Correct
button.addEventListener('click', handleClick);

// Forbidden
// <button onclick="handleClick()"> — no inline handlers
```

### Production Code

- No `console.log` in production code (use `console.error` only for genuine errors)
- No `var` declarations
- No `eval()` or `Function()` constructor
- No inline event handlers in HTML

---

## 2. CSS / LESS Standards

### Variable Usage

```scss
// Correct
.cmp-component {
    color: var(--color-text-primary);
    padding: var(--spacing-md);
    font-size: var(--font-size-base);
}

// Avoid
.cmp-component {
    color: #333;      // Use var(--color-text-primary)
    padding: 16px;    // Use var(--spacing-md)
    font-size: 16px;  // Use var(--font-size-base)
}
```

In LESS projects, use `@variable` syntax:

```less
.cmp-component {
    color: @color-text-primary;
    padding: @spacing-md;
}
```

### Mobile-First Responsive

```scss
.cmp-component {
    // Base (mobile) styles
    padding: var(--spacing-sm);

    // Tablet and up
    @media (min-width: 768px) {
        padding: var(--spacing-md);
    }

    // Desktop and up
    @media (min-width: 1280px) {
        padding: var(--spacing-lg);
    }
}
```

---

## 3. Module Structure

```javascript
// index.js — Module entry point
export { default as ComponentName } from './{component}.js';
export { initializeComponent } from './{component}.js';
```

---

## 4. AI Code Markers

When the project workflow uses AI code markers, wrap AI-generated code in them:

```javascript
// AI Generated Code (BEGIN)
const fetchData = async (endpoint) => {
    // ...
};
// AI Generated Code (END)
```

In LESS/CSS:

```less
// AI Generated Code (BEGIN)
.cmp-component {
    color: @color-text-primary;
}
// AI Generated Code (END)
```

- Purpose: clearly delineate AI-generated sections for human review and future edits

---

## 5. Workflow Standards

### Git Branch Naming

| Work item type | Branch prefix | Example |
|---|---|---|
| User Story | `feature/` | `feature/12345-card-component` |
| Bug | `bugfix/` | `bugfix/12345-card-alignment-fix` |
| Hotfix | `hotfix/` | `hotfix/12345-critical-issue` |

Branch name format: `{prefix}{work-item-id}-{sanitized-title}`
- Lowercase, hyphens, max 50 characters after prefix

### Commit Message Format

```
{type}({scope}): {description}

- {change 1}
- {change 2}

Implements #{work-item-id}
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
Scope: `frontend`

Examples:
- `feat(frontend): add card component with RTL support`
- `fix(frontend): resolve promo container alignment in RTL`

### PR Title Format

```
{type}({scope}): {summary under 70 chars}
```

Examples:
- `feat(frontend): add featured promo multiple rows component`
- `fix(frontend): resolve promo container RTL alignment issue`

### Coding Checklist

- [ ] ES6+ syntax used throughout
- [ ] No `var` declarations
- [ ] Proper error handling (try/catch)
- [ ] No `console.log` in production
- [ ] Event listeners (no inline handlers)
- [ ] CSS variables used (no hardcoded values)
- [ ] Mobile-first responsive design
- [ ] Tests created (80%+ coverage)
- [ ] AI code markers added
- [ ] No security vulnerabilities (XSS, eval)
