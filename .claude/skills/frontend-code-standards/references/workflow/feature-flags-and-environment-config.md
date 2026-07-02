# Feature Flags and Environment Configuration

## Table of Contents
1. Core Principles
2. Feature Flag Workflow
3. Environment Configuration Workflow
4. Safe Client Config Pattern
5. Validation
6. Checklist
7. Official References

---

## 1. Core Principles

Treat feature flags and environment config as separate concerns:

| Concern | Purpose | Change without rebuild? |
|---|---|---|
| Feature flag | Control exposure of functionality | Usually yes |
| Environment config | Point the app at the correct services and public settings | Sometimes |
| Secret | Authenticate privileged systems | No - never ship to frontend |

Rules:
- Use flags to separate deployment from release
- Use config for environment-specific values, not for product rollout decisions
- Never put secrets, tokens, or private keys in browser bundles

---

## 2. Feature Flag Workflow

Use flags for incomplete work, risky launches, canary rollout, and kill switches.

Recommended flag metadata:

| Field | Example |
|---|---|
| Key | `checkout.redesign.enabled` |
| Type | boolean / multivariate |
| Owner | frontend team or named engineer |
| Default | `false` |
| Expiry | `2026-06-30` |
| Rollout rule | internal users, 10%, country, cohort |

Implementation rules:
- Evaluate flags in one shared client/service, not inline across many components
- Provide safe defaults so the UI still renders if flag delivery fails
- Keep flag names business-readable and stable
- Add telemetry for flag-driven releases so production behavior is explainable
- Remove stale flags after the rollout is complete

Practical rollout sequence:
1. Merge behind a disabled flag
2. Verify in test/staging with the flag enabled
3. Enable for internal users first
4. Expand to a percentage or target cohort
5. Make the new path the default
6. Delete the old path and the flag

Avoid:
- Nested flag checks throughout JSX/templates
- Permanent flags with no owner or expiry
- Using flags as a substitute for permissions or secrets

---

## 3. Environment Configuration Workflow

Use environment config for public values the frontend needs at runtime or build time.

Typical public config:
- API base URL
- Asset base URL
- Analytics environment name
- Public feature flag client key
- Locale, region, or brand identifier

Configuration rules:
- Centralize reads in a single config module
- Validate required values at startup and fail fast when critical values are missing
- Keep `.env.local` and machine-specific overrides out of source control
- Use runtime config injection for values that vary by environment without requiring a rebuild
- Document which values are build-time only versus runtime-loaded

Framework reminders:
- Vite exposes client variables through `import.meta.env`, commonly with a `VITE_` prefix
- Next.js exposes browser variables only when prefixed with `NEXT_PUBLIC_`
- Treat all browser-exposed variables as public, even if they came from `.env`

---

## 4. Safe Client Config Pattern

Use a typed adapter instead of reading env values all over the app:

```typescript
type AppConfig = {
    apiBaseUrl: string;
    analyticsEnv: string;
    enableMockApi: boolean;
};

const getRequired = (value: string | undefined, name: string) => {
    if (!value) {
        throw new Error(`Missing required config: ${name}`);
    }

    return value;
};

export const appConfig: AppConfig = {
    apiBaseUrl: getRequired(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL'),
    analyticsEnv: getRequired(import.meta.env.VITE_ANALYTICS_ENV, 'VITE_ANALYTICS_ENV'),
    enableMockApi: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
};
```

For runtime-injected config, prefer one source such as:
- `window.__APP_CONFIG__`
- `/config.json`
- server-rendered config in the page shell

Do not mix three or four config sources unless the project already requires it.

---

## 5. Validation

Validate before merge and before release:

| Check | Expected outcome |
|---|---|
| Missing config locally | App fails fast with a clear message |
| Staging config | Correct services and analytics endpoints |
| Production config | Public keys only, no secrets |
| Flag fallback | UI behaves safely when flag provider is unavailable |
| Flag cleanup | Old flags removed after rollout completion |

Useful automation:
- Config schema validation in startup tests
- Smoke tests for each deployed environment
- Static scan to prevent committed `.env` secrets

---

## 6. Checklist

- [ ] Feature flags have owner, default, and expiry
- [ ] New work is hidden behind a flag when rollout risk is non-trivial
- [ ] Flag evaluation is centralized
- [ ] Browser-exposed config contains no secrets
- [ ] Config reads are centralized in one module
- [ ] Required config values are validated at startup
- [ ] `.env.local` or equivalent is ignored by git
- [ ] Staging and production values are verified before release
- [ ] Temporary flags are removed after rollout

---

## 7. Official References

- OpenFeature introduction: https://openfeature.dev/docs/reference/intro
- OpenFeature specification: https://openfeature.dev/specification/
- Vite env variables and modes: https://vite.dev/guide/env-and-mode
- Next.js environment variables: https://nextjs.org/docs/pages/guides/environment-variables
- MDN `import.meta`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta
