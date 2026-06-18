---
name: story-context
description: Fetches requirements context from Azure DevOps or Jira and converts it into a structured `story-context` block for planner and delivery agents. Load when the user input includes a work item ID, ticket key, or tracker URL.
---

# Story Context

## Load When
- User input includes an ADO work item reference (#12345, ADO 12345, or ADO URL)
- User input includes a Jira ticket key (BC-4201, CAT-88, DIG-88) or Jira URL
- Planner needs tracker-backed requirements context

## Skip When
- User already pasted complete story summary with title, description, and acceptance criteria
- Input does not identify a specific work item

## Missing Input
- Look for tracker URL, bare ID, or ticket key before deciding input is missing
- Ask only when none are present

---

## Execution

### 1. Detect Tracker
- Scan input for ADO ID patterns, Jira key patterns, or tracker URLs
- ADO: match #12345, numeric IDs near tracker language, URLs with `/_workitems/edit/<id>`
- Jira: match `[A-Z]+-[0-9]+`, URLs with `/browse/<KEY>-<id>`
- Prefer URL over bare ID; prefer the most explicitly referenced identifier
- Do not treat viewport widths, dates, build numbers as ADO IDs unless tracker intent is explicit

### 2. Check Access
- Check whether matching MCP server is available
- ADO MCP for Azure DevOps, Jira MCP for Jira
- If no MCP: tell user, ask for manual story content, continue with same output shape

### 3. Fetch Story Data
- Retrieve: title, description, acceptance criteria, status, estimate, iteration/sprint, attachments, linked items, labels/tags
- Extract embedded AC from description when dedicated field is empty (look for `AC:`, `Acceptance Criteria:`, `DoD:`, `Given / When / Then`)
- Capture engineering signals: repro steps, expected vs actual, components, templates, environments, devices, browsers, test URLs

### 4. Structure Output
- Emit one fenced `story-context` block (see contract below)
- Keep only source-backed values
- Omit empty sections instead of placeholders

### 5. Handoff
- Pass block directly into planner or invoking workflow
- Continue without asking user to restate requirements

---

## Output Contract

```story-context
## Story Context

**Source**: ADO #<id> | Jira <KEY>-<id> | Manual input
**Title**: <title>
**Status**: <state>  |  **Points**: <story points or "unestimated">
**Iteration/Sprint**: <value>
**Area**: <area path>
**Priority/Severity**: <value>

### Description
<plain text, max 300 words; "[truncated]" when needed>

### Acceptance Criteria
- <criterion>

### Linked Items
- <relationship>: <ID> -- <title>

### Attachments
- <filename>

### Tags / Labels
<comma-separated list>

### Implementation Impact
- Component(s), template(s), module(s), authoring/config impact

### QA / Test URLs
- <environment>: <url>

**Missing**: <field names>
```

---

## Fallback
- **No MCP**: ask for title, description, acceptance criteria, test URLs. Set source to "Manual input."
- **Not found**: ask user to verify ID or paste manually
- **Auth error**: ask user to check MCP token or session setup

## Validation
- Title present
- Description or acceptance criteria present
- AC are testable
- Hidden requirements checked (accessibility, responsive, i18n, caching, permissions)
- No field invented
