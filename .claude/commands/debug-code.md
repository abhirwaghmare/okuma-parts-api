# Debug

## Usage

```
/debug <description of the issue>
/debug <file or component name> <description>
```

Examples:
```
/debug card component RTL layout is broken in mobile
/debug frontend-dev.md the promo container does not render in dark theme
/debug NullPointerException in CardModel.getTitle()
```

## Execution Steps

### 1. Project Awareness + Parse the Issue

- Read `<codebase_stack>` from CLAUDE.md — tech stack, build commands, instance URLs, log locations
- Read `<code_standards>` from CLAUDE.md — project conventions

From `$ARGUMENTS`, identify:
- Affected component or file (if named)
- Nature of the issue: visual, functional, error/exception, accessibility, performance, build failure
- Environment: frontend, backend, build, or test — determine from `<codebase_stack>`

### 2. Reproduce First

- Adapt reproduction approach to the project's stack before touching any code:

**Frontend issues:**
- Check rendered output in browser or component development tool (if project uses one)
- Use DevTools to inspect: Elements, Console, Accessibility tab

**Backend issues:**
- Check application logs for the stack trace (log location from `<codebase_stack>`)
- Identify the relevant class or service involved
- Check service/component status if the platform provides a console

**Build issues:**
- Run the project's build command (from `<codebase_stack>`) and capture the full error output
- Identify the file and line number from the error

### 3. Read Before Hypothesizing

Read all relevant files completely before forming any hypothesis:
- For frontend: component folder and related files (determine from `<codebase_stack>`)
- For backend: relevant class, interface, and configuration files (determine from `<codebase_stack>`)
- For build: the file at the error line
- Propose a fix only with evidence from the code

### 4. Form a Hypothesis

State the root cause explicitly:

```
Root cause: {specific technical reason — file:line}
Evidence: {what in the code confirms this}
Impact: {what else may be affected}
```

- Avoid vague guesses without evidence such as "it might be a CSS issue" or "try adding a null check"

### 5. Propose and Implement Fix

The fix must be:
- Minimal — change only what is necessary
- Targeted — do not refactor surrounding code
- Tested — include the test/verification step

For frontend fixes:
1. Apply change
2. Run the project's frontend build command (from `<codebase_stack>`)
3. Verify in Storybook (if available) or browser
4. Run frontend tests if configured

For backend fixes:
1. Apply change
2. Run the project's build + deploy command (from `<codebase_stack>`)
3. Verify in the running instance

### 6. Report

After fix:
```
## Debug Report

**Issue**: {original description}
**Root Cause**: {technical explanation}
**Fix Applied**: {file:line — what changed and why}
**Verification**: {how the fix was verified}
**Regression Risk**: {None | Low | Medium — areas to monitor}
```

Context: $ARGUMENTS
