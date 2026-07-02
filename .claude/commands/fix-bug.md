# Fix Bug

Run the single-ticket bugfix pipeline. All phase steps, templates, memory keys, and build rules live in the skill — not repeated here.

## When to Use
- One Azure DevOps / Jira Bug work item end-to-end
- `/fix-bug --next` after a bulk run (resolves the next row from a bug-analysis-summary JSON)
- A ticket that already has Stage 4 root cause in memory from bulk-bug-fixer (orchestrator continues from the phase the spec allows)

## When Not to Use
- Multi-ticket query / batch triage — use `/bulk-bug-fixer` first; then `/fix-bug` per approved id as needed

## Usage
```
/fix-bug <work-item-id>
/fix-bug --next
/fix-bug --next <path/to/bug-analysis-summary-*.json>
```

## Workflow

### 1. Load Skill
- Invoke `bugfix-workflow` — read SKILL.md then `references/single-ticket-spec.md` in full before Phase 0 or `--next` resolution
- For `--next` or fields tied to a bulk summary, also read the linked sections in `references/bulk-spec.md` (JSON schema, gates, URL rules) as the single-ticket spec indicates

### 2. Execute Pipeline
- Execute Phase 0 through 5a exactly as `single-ticket-spec.md` defines — including tracker-only data, handoffs for code changes, `@commit-and-raise-pr` where specified, and phase completion lines

### 3. Handoffs
- Use handoff buttons on the `bulk-bug-fixer` agent when the workflow delegates apply-fix work to `frontend-dev`, `backend-dev`, or `junits-specialist`

Context: $ARGUMENTS
