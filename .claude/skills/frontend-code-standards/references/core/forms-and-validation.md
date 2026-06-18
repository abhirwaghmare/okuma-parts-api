# Forms and Validation

## Table of Contents
1. Form Structure
2. Native-First Validation
3. Error and Success Feedback
4. Submission Patterns
5. Accessibility
6. BigCommerce (Catalyst) Considerations
7. Checklist
8. Official References

---

## 1. Form Structure

Prefer native form behavior before custom scripting.

```html
<form class="cmp-signup" novalidate>
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" autocomplete="email" required />

    <button type="submit">Sign up</button>
</form>
```

Rules:
- Use real `<form>` elements for submissions
- Match `label` and `id` for every input
- Use correct input types (`email`, `tel`, `number`, `date`) only when they fit the data
- Use `autocomplete` tokens where possible

---

## 2. Native-First Validation

Use built-in constraints first, then add custom rules only where needed.

```javascript
form.addEventListener('submit', (event) => {
    if (!form.checkValidity()) {
        event.preventDefault();
        form.reportValidity();
    }
});
```

Add custom rules with `setCustomValidity()`:

```javascript
passwordInput.addEventListener('input', () => {
    const isStrongEnough = passwordInput.value.length >= 12;
    passwordInput.setCustomValidity(isStrongEnough ? '' : 'Use at least 12 characters.');
});
```

Rules:
- Keep validation rules aligned with server validation
- Do not rely on client validation for security
- Validate again on the server for every submit

---

## 3. Error and Success Feedback

Show feedback close to the field and summarize when needed.

```html
<label for="postal-code">Postal code</label>
<input
    id="postal-code"
    name="postalCode"
    aria-describedby="postal-code-error"
    aria-invalid="true"
/>
<div id="postal-code-error" role="alert">Enter a valid postal code.</div>
```

Guidance:
- Use `aria-invalid="true"` only when the field is actually invalid
- Tie help text and error text with `aria-describedby`
- Keep error copy specific and actionable
- Do not clear user input after a failed submit unless required for security

---

## 4. Submission Patterns

Prefer progressive enhancement:
- The form should still submit without JavaScript unless the product explicitly depends on client-only behavior
- Use `requestSubmit()` when triggering submit from custom controls
- Use `FormData` for multipart and file uploads

```javascript
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    submitButton.disabled = true;

    try {
        const body = new FormData(form);
        await fetch(form.action, {
            method: form.method || 'POST',
            body,
            credentials: 'same-origin',
        });
        showSuccessMessage();
    } catch (error) {
        showSubmitError();
    } finally {
        submitButton.disabled = false;
    }
});
```

---

## 5. Accessibility

Requirements:
- Every control has an accessible name
- Required fields are indicated visually and programmatically
- Error messages are announced
- Keyboard users can reach and submit the form without pointer interaction

Useful patterns:
- `<fieldset>` and `<legend>` for grouped controls
- `aria-live="polite"` for async success or failure messages
- `inputmode` for mobile-friendly keyboards when helpful

---

## 6. BigCommerce (Catalyst) Considerations

For Catalyst frontend projects:
- Use server actions for form submission — `'use server'` directive at the top of the file.
- Validate every `FormData` input with Zod (Conform's `parseWithZod` is the Catalyst pattern).
- Treat labels, help text, placeholders, and validation copy as locale-aware strings (`next-intl`).
- Mask BigCommerce error messages before returning to the client — never surface raw upstream errors.
- Use Catalyst's `<Form>` / Conform integration for accessible inline error rendering; pair with `aria-invalid` and `aria-describedby` for assistive tech.

Example fallback:

```typescript
const successMessage = t('form.success', { defaultMessage: 'Form submitted successfully.' });
```

---

## 7. Checklist

- [ ] Real `<form>` element is used
- [ ] Inputs have labels and meaningful `name` attributes
- [ ] Native constraints are used where possible
- [ ] Client and server validation rules match
- [ ] Invalid fields expose clear inline errors
- [ ] `aria-invalid` and `aria-describedby` are applied correctly
- [ ] Submit flow prevents accidental duplicate submissions
- [ ] Success and failure feedback are visible and announced
- [ ] Locale-aware form copy and validation messages are wired through `next-intl`

---

## 8. Official References

- MDN Web Docs: Client-side form validation
  `https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation`
- MDN Web Docs: HTMLFormElement `requestSubmit()`
  `https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/requestSubmit`
- MDN Web Docs: Constraint validation
  `https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation`
- MDN Web Docs: FormData
  `https://developer.mozilla.org/en-US/docs/Web/API/FormData`
