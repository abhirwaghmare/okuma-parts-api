# Frontend Security Standards

## Table of Contents
1. XSS Prevention
2. Secrets and Sensitive Data
3. Content Security Policy
4. Dependency Security
5. OWASP Top 10 — Frontend
6. Checklist

---

## 1. XSS Prevention

Never insert untrusted data into the DOM without sanitization:

```javascript
// Forbidden — DOM XSS
element.innerHTML = userInput;
document.write(userInput);
eval(userInput);

// Correct — textContent for plain text
element.textContent = userInput;

// Correct — sanitize if HTML is required
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

Template escaping:
- React auto-escapes children and attribute values — only `dangerouslySetInnerHTML` opts out, and must use sanitized server-rendered content
- Handlebars auto-escapes `{{variable}}` — use triple braces `{{{variable}}}` only for intentionally trusted HTML
- Always validate origin/scheme on URL attributes before binding (`href`, `src`)

```tsx
// React — never bind unsanitized HTML
<div dangerouslySetInnerHTML={{ __html: sanitize(richText) }} />

// React — safe URL binding
<a href={isSafeUrl(href) ? href : '#'}>Link</a>
```

---

## 2. Secrets and Sensitive Data

Never commit secrets to source control:
- API keys
- Tokens (access, refresh, bearer)
- Passwords or PINs
- Private certificates
- Connection strings with credentials

If a secret is detected in the codebase, treat it as compromised and rotate immediately.

Frontend code runs in the browser and is visible to users. Do not put server-side secrets in frontend bundles. Use environment variables injected at build time only for non-sensitive configuration.

---

## 3. Content Security Policy

Frontend code must be CSP-compatible:
- No inline `<script>` tags (unless nonce-based CSP is configured)
- No inline `onclick`, `onload`, or other inline event handlers
- No `javascript:` URLs
- External scripts must be from approved domains

```javascript
// Forbidden — inline event handler
// <button onclick="doSomething()">

// Correct — external event listener
document.querySelector('.cmp-button').addEventListener('click', doSomething);
```

---

## 4. Dependency Security

Run npm audit before each release:

```bash
npm audit
npm audit --audit-level=high    # Fail only on high/critical
```

Rules:
- No dependencies with known critical vulnerabilities
- High severity vulnerabilities require documented justification or immediate patch
- Keep direct dependencies up to date (monthly review)
- Use `npm audit fix` for safe auto-fixes; review breaking changes before `--force`

---

## 5. OWASP Top 10 — Frontend Relevant Items

| OWASP Risk | Frontend Concern | Prevention |
|---|---|---|
| A03 Injection | DOM XSS, template injection | Sanitize, use textContent, avoid innerHTML |
| A05 Security Misconfiguration | CSP, CORS, headers | CSP headers, no inline scripts |
| A06 Vulnerable Components | Outdated npm packages | `npm audit`, dependency updates |
| A07 Auth Failures | Token storage, session | HttpOnly cookies, no localStorage for tokens |
| A08 Data Integrity | Unsigned dependencies | npm lockfile, integrity checks |
| A10 SSRF | Fetch to arbitrary URLs | Validate and allowlist URL origins |

Token storage rules:
- Access tokens: memory only (not localStorage, not sessionStorage)
- Refresh tokens: HttpOnly cookie only
- Never log tokens in console output

---

## 6. Checklist

- [ ] No `innerHTML` with unsanitized input
- [ ] No `eval()`, `Function()` constructor, or `setTimeout(string)`
- [ ] No inline event handlers in HTML
- [ ] No `javascript:` URLs
- [ ] Handlebars triple braces only for intentionally safe HTML
- [ ] Server-rendered HTML passed to `dangerouslySetInnerHTML` is sanitized before render
- [ ] No secrets committed to source (API keys, tokens, passwords)
- [ ] `npm audit` passes (no high/critical vulnerabilities)
- [ ] CSP-compatible code (no inline scripts without nonce)
- [ ] Tokens not stored in localStorage
- [ ] External fetch calls use allowlisted origins
