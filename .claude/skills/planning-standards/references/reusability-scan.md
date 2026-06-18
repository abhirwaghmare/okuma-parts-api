# Codebase-First Reuse Scan

## Priority Order (non-negotiable)
1. **Project codebase** — search for existing components/services FIRST
2. **Catalyst defaults** — evaluate ONLY if the project already uses them (detected via imports from Catalyst-provided packages or starter components in `core/`)
3. **Framework best practices** — last resort, only when project and codebase provide no guidance

If the project builds custom components exclusively (no Catalyst default patterns in codebase), skip Catalyst-default evaluation entirely. Focus on extending what the project already has.

## Step 1: Search Project Codebase (MANDATORY)

**Existing Custom Components** (via #search):
- Search `core/components/` (and any app/sub-app components folders) for similar functionality
- Check component groups for related patterns
- Evaluate: Can existing component be extended or configured?

**Existing Server Actions / Service Modules** (via #search + #usages):
- Search `core/lib/`, `core/lib/actions/`, `core/client/` for similar abstractions
- Check exported function signatures for reusable contracts
- Evaluate: Can existing module be enhanced vs creating new?

**Shared Utilities** (via #search):
- Search `core/lib/utils/` or `core/lib/helpers/` for common patterns
- Check for existing HTTP wrappers (`client.fetch`), validators (Zod schemas), formatters
- Evaluate: Should utility be extracted from implementation?

## Step 2: Evaluate Catalyst Defaults (CONDITIONAL)

Run this step ONLY if the project codebase shows Catalyst-default usage:
- Check for imports from Catalyst-shipped components or unchanged starter modules
- If found → evaluate the Catalyst default for the current requirement
- If not found → skip this step, project has chosen custom development

## Step 3: Apply Reuse Decision Matrix

Apply to whatever was found (project code, Core Components, or both):

| Scenario | Action |
|----------|--------|
| Existing component/service fits 70%+ | EXTEND/CONFIGURE existing |
| Existing covers 50-69% | EVALUATE extend vs build (document trade-offs) |
| Existing covers <50% | BUILD new (but extract shared utilities) |
| No existing patterns | BUILD new (establish pattern for future reuse) |

## Surface, Propose, Confirm (MANDATORY)

Present findings to the user BEFORE the plan proceeds:

```
Found: {component/service name} at {exact path}
Coverage: {X%} — covers {what it covers}, missing {what it does not}

Proposed approach: EXTEND existing / EVALUATE trade-offs / BUILD new
Reason: {one sentence justification}

Proceed with this approach?
```

Do NOT skip this step. Do NOT assume the user wants a new component. The user confirms. Only then does the plan proceed.

**Output**: Include "Reusability Analysis" section in plan with findings, decision, and confirmation received.
