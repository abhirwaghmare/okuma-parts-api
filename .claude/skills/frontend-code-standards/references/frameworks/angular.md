# Angular Patterns

## Table of Contents
1. Component Generation
2. Control Flow (Angular 17+)
3. Subscription Management
4. Standalone Components
5. Signals (Angular 16+)
6. State Management
7. Checklist

---

## 1. Component Generation

Standard Angular component pattern (Angular 17+):

```typescript
// AI Generated Code (BEGIN)
import {
    Component,
    OnInit,
    OnDestroy,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-{name}',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './{name}.component.html',
    styleUrls: ['./{name}.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class {Name}Component implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    @Input() title!: string;
    @Input() description?: string;
    @Output() itemClick = new EventEmitter<void>();

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        // Initialization
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
// AI Generated Code (END)
```

Key patterns:
- `standalone: true` by default in Angular 17+
- `ChangeDetectionStrategy.OnPush` for performance
- `Input()` with `!` for required inputs (strict mode)
- `Input()` with `?` for optional inputs
- `destroy$` Subject for subscription cleanup

---

## 2. Control Flow (Angular 17+)

New built-in control flow replaces structural directives:

```html
<!-- New control flow (Angular 17+) -->
@if (condition) {
    <div>Shown when true</div>
} @else if (otherCondition) {
    <div>Alternative</div>
} @else {
    <div>Default</div>
}

@for (item of items; track item.id) {
    <div>{{ item.name }}</div>
} @empty {
    <div>No items</div>
}

@switch (status) {
    @case ('active') { <span>Active</span> }
    @case ('inactive') { <span>Inactive</span> }
    @default { <span>Unknown</span> }
}

@defer (on viewport) {
    <heavy-component />
}
```

Old structural directives (still valid but prefer new syntax for Angular 17+):

```html
<!-- Old syntax -->
<div *ngIf="condition">Content</div>
<div *ngFor="let item of items; trackBy: trackById">{{ item.name }}</div>
```

---

## 3. Subscription Management

### Pattern 1: takeUntil (Manual Cleanup)

```typescript
// AI Generated Code (BEGIN)
private destroy$ = new Subject<void>();

ngOnInit(): void {
    this.dataService.getData()
        .pipe(takeUntil(this.destroy$))
        .subscribe(data => {
            this.data = data;
            this.cdr.markForCheck();
        });
}

ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
}
// AI Generated Code (END)
```

### Pattern 2: async pipe (Preferred — No Manual Cleanup)

```typescript
// Component
data$ = this.dataService.getData();
```

```html
<!-- Template -->
@if (data$ | async; as data) {
    <div>{{ data.title }}</div>
}
```

### Pattern 3: toDestroyRef (Angular 16+)

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';

private destroyRef = inject(DestroyRef);

ngOnInit(): void {
    this.dataService.getData()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => this.data = data);
}
```

Rules:
- Never leave subscriptions open without cleanup
- Prefer `async` pipe for template subscriptions
- Use `takeUntil(this.destroy$)` for programmatic subscriptions
- Always call `destroy$.next()` in `ngOnDestroy`

---

## 4. Standalone Components

Angular 17+ defaults to standalone components. Module-based components are still supported.

Converting module-based to standalone:
```typescript
// Before (module-based)
@Component({
    selector: 'app-{name}',
    templateUrl: './{name}.component.html',
})
export class {Name}Component {}

// @NgModule imports the component

// After (standalone)
@Component({
    selector: 'app-{name}',
    standalone: true,
    imports: [CommonModule, RouterModule, /* other standalone components */],
    templateUrl: './{name}.component.html',
})
export class {Name}Component {}
```

---

## 5. Signals (Angular 16+)

Signals provide reactive state without RxJS for simple cases:

```typescript
import { signal, computed, effect } from '@angular/core';

// Signal (writable reactive state)
count = signal(0);

// Computed (derived state)
doubled = computed(() => this.count() * 2);

// Effect (side effect on signal change)
constructor() {
    effect(() => {
        console.debug('Count changed:', this.count());
    });
}

// Update signal
increment() {
    this.count.update(v => v + 1);
    // or
    this.count.set(10);
}
```

Template usage:
```html
<div>Count: {{ count() }}</div>
<div>Doubled: {{ doubled() }}</div>
```

When to use signals vs RxJS:
- Signals: Simple component state, derived values, replacing `BehaviorSubject` for local state
- RxJS: HTTP calls, complex async flows, event streams, operators needed

---

## 6. State Management

| Complexity | Recommended approach |
|---|---|
| Component-local | Signals or component properties |
| Parent-child | `@Input()` / `@Output()` with EventEmitter |
| Sibling components | Service with `BehaviorSubject` or signal |
| Application-wide | NgRx Store (if already in project) |

Check `package.json` for `@ngrx/store` before choosing approach. Use what the project already uses.

---

## 7. Checklist

- [ ] `standalone: true` on new components (Angular 17+)
- [ ] `ChangeDetectionStrategy.OnPush` used
- [ ] All subscriptions have cleanup (`takeUntil` or `async` pipe)
- [ ] `destroy$.next()` called in `ngOnDestroy`
- [ ] New control flow syntax (`@if`, `@for`) used for Angular 17+
- [ ] `track` expression used in `@for` loops
- [ ] `@defer` used for heavy/below-fold components
- [ ] Signals used for simple reactive state (Angular 16+)
- [ ] `toPromise()` replaced with `firstValueFrom()` (RxJS 7+)
- [ ] No `*ngIf` / `*ngFor` on new components (use `@if` / `@for`)
- [ ] All `@Input()` required fields marked with `!`
