---
name: bugfix-workflow
description: Mandatory bugfix procedures. Single-ticket path for @fix-bug: fetch, triage, live repro, RCA, branch, PR, ADO comment, --next queue. Bulk path for @bulk-bug-fixer: Stages 1–7, checkpoints, summary md/json/xlsx, gates, Stage 7 to @fix-bug. Invoke and read the matching reference file in full before executing that workflow.
---

# Bugfix workflow

Procedure is not duplicated here. Authoritative content is split for readability:

| Entry point | Read (in full, after this file) |
|---|---|
| `@fix-bug` or `/fix-bug`, one work item ID | `references/single-ticket-spec.md` |
| `@bulk-bug-fixer`, `bulk-bug-fixer` agent, `/bulk-bug-fixer` | `references/bulk-spec.md` |

Stage 7 (bulk) invokes `@fix-bug`, which is governed by `single-ticket-spec.md` for Phase 0–5/5a. The two reference files cross-link to each other where procedures overlap; follow those links instead of duplicating steps.

Do not run the relevant phases/stages until this SKILL.md and the correct `references/*.md` have been read end-to-end for the path you are executing.

## Load order (mandatory)

1. Read this SKILL.md (you are here).
2. For single-ticket work, read `references/single-ticket-spec.md` top to bottom.
3. For bulk work, read `references/bulk-spec.md` top to bottom. When the spec hands off to `@fix-bug`, the single-ticket file remains the source for those phases (unless a row was pre-populated in bulk Stage 4 — as described in `single-ticket-spec.md`).

## Other skills and commands

- `story-context` — tracker fetch (Azure DevOps / Jira per that skill)
- `code-explorer`, `research-intelligence` — reuse and external docs (per the active reference)
- `frontend-code-standards`, `bigcommerce-standards` — per handoffs on the slash command or agent
- Helpers — `scripts/generate-xlsx-from-summary.mjs`; see `references/bulk-spec.md` (Implementation scripts)

## Rules

The skill ships a Cursor auto-resume rule:

- `rules/bug-analysis-auto-resume.mdc` — fires at session start, detects a pending `bulk-*.checkpoint.json`, and resumes the batch automatically without requiring `@bulk-bug-fixer --resume`

**To activate:** copy `rules/bug-analysis-auto-resume.mdc` to `.cursor/rules/` in the project. To disable without removing the file, add `AUTO_RESUME: false` anywhere below the frontmatter in that file.

## Onboarding

- Project Constants for single-ticket defaults live at the top of `references/single-ticket-spec.md`.
- Project Constants for batch size, branches, preprod, URL patterns, and bulk gates live in `references/bulk-spec.md`.
