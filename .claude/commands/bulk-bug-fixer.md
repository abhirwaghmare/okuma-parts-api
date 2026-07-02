# Bulk Bug Fixer

Invoke the `bulk-bug-fixer` subagent for multi-ticket bug analysis, checkpoints, Azure DevOps query runs, summary reports (markdown / JSON / Excel), and staged handoff to `/fix-bug` per approved ticket. Domain procedure is not duplicated here.

## When to Use
- Multiple work item IDs, comma-separated lists, or an Azure DevOps saved query URL
- Paginated fetch, `BATCH_SIZE` slices, checkpoint resume (`--resume`, `--status`, `--report`)
- Bulk triage, live reproduction, parallel root cause analysis, then optional Stage 7 fix queue

## When Not to Use
- Single bug, fix-first path — prefer `/fix-bug <id>` (lighter; bulk machinery is optional for one ID)

## Usage
```
/bulk-bug-fixer <id1,id2,...>
/bulk-bug-fixer <azure-devops-saved-query-url>
/bulk-bug-fixer --resume
/bulk-bug-fixer --status
/bulk-bug-fixer --report
```

Pass through any additional flags or arguments the agent supports; see `bulk-spec.md`.

## Workflow

### 1. Invoke Agent
- Invoke subagent `bulk-bug-fixer` with `$ARGUMENTS` (IDs, query URL, or flags such as `--resume`, `--status`, `--report`)

### 2. Agent Execution
- Subagent loads the `bugfix-workflow` skill — reads SKILL.md and `references/bulk-spec.md` end-to-end before stages
- Invokes `story-context` for tracker data
- Runs Stages 1–5 per `bulk-spec.md` and stops at Stage 6 for user confirmation before automated fixes

### 3. After Confirmation
- Stage 7 drives `/fix-bug <id>` (or `/fix-bug --next` when the summary JSON is the queue source) for each approved ticket
- Handoff buttons on the agent delegate apply-fix work to `frontend-dev`, `backend-dev`, or `junits-specialist` as specified in the spec

Context: $ARGUMENTS
