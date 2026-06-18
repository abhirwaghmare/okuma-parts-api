---
description: Intelligent commit workflow with optional rebase and PR prep, optimized for low-noise terminal output. If a story ID is provided, closes the agent subtasks and comments the PR link on the parent story.
argument-hint: "optional notes, target branch, and/or story ID (ADO: #12345, Jira: PROJ-123)"
allowed-tools: Read, Grep, Glob, Write
---

# Commit Code

## When to Use
- You want a single guided flow for rebase, commit, and PR preparation
- You want standardized commit messaging following project conventions
- You want the command to ask for missing info and proceed sequentially

## Workflow

### 0. Gather context and intent
- Identify current branch, repo status, and staged changes
- If the user did not provide a target branch, ask for it
- If a rebase is requested or needed, confirm source and target branches

### 1. Validate working tree
- `git status -sb | head -n 40`
- `git branch --show-current`
- `git log -1 --oneline`

### 2. Rebase flow
- If rebase is requested or divergence detected, ask for target branch if missing
- Run `git fetch --all --prune`
- Rebase with `git rebase origin/<target-branch> | tail -n 200`
- If conflicts occur, stop and ask for resolution preference

### 3. Pre-commit checks
- If repo defines checks, run them with filtered output:
  - Prefer `--quiet` or `-q` where supported
  - Pipe output: `| tail -n 200` or `| grep -E "ERROR|WARN|FAIL|SUCCESS|BUILD|TEST"`

### 4. Standardize commit message
- Build a commit message following the project's convention (check recent git log for style):
  - Scope: component/module or area
  - Summary: concise, present tense
  - Optional ticket or issue ID
- If missing, ask for scope and summary
- Confirm with user before committing

### 5. Commit
- Stage if needed (confirm if nothing staged)
- Commit with the standardized message
- Show `git log -1 --oneline`

### 6. PR preparation
- Prepare PR title and description from commit and changes
- If target branch missing, ask for it
- Provide PR summary text and checklist for the user

### 7. Story subtask closure (only if story ID provided in `$ARGUMENTS`)

**Detect PM tool from the story ID format:**
- Numeric (e.g. `#12345` or `12345`) — ADO
- Alphanumeric with hyphen (e.g. `PROJ-123`) — Jira

**ADO tool reference:**
- Fetch: `mcp_ado_wit_get_work_item`
- Update: `mcp_ado_wit_update_work_item`
- Comment: `mcp_ado_wit_add_work_item_comment`

**Jira tool reference:**
- Fetch: `getJiraIssue`
- Get valid transitions: `getTransitionsForJiraIssue`
- Transition: `transitionJiraIssue`
- Comment: `addCommentToJiraIssue`

**Steps:**
1. Fetch the parent story — `mcp_ado_wit_get_work_item` / `getJiraIssue`
2. Retrieve all child subtasks from work item relations
3. Check current state of each subtask — skip any already Closed/Done
4. Close only the subtasks that are still open:
   - ADO: `mcp_ado_wit_update_work_item` — `System.State` = "Closed", `Microsoft.VSTS.Scheduling.OriginalEstimate` = 1, `Microsoft.VSTS.Scheduling.CompletedWork` = 1, `Custom.ProductivityTool` = "GitHub Copilot", `Custom.TimesavedusingAItools` = 1 (do not set RemainingWork)
   - Jira: `getTransitionsForJiraIssue` > find "Done" transition ID > `transitionJiraIssue`
5. Do not change the parent story state — it stays open until the PR is merged
6. Post comment on the parent story with the PR link:
   - ADO: `mcp_ado_wit_add_work_item_comment` — "PR raised: [PR title] — [PR URL]. Agent subtasks closed. Awaiting PR review and merge."
   - Jira: `addCommentToJiraIssue` — same text
7. Print subtask summary table — one row per subtask found on the story, plus the parent:
   ```
   | Subtask          | ID    | Previous State | New State | Action   |
   |------------------|-------|----------------|-----------|----------|
   | {subtask role}   | #ID   | {prior state}  | Closed    | closed   |
   | ...              | ...   | ...            | ...       | ...      |
   | Parent Story     | #ID   | Active         | Active    | unchanged|
   ```

## Output Summary
- Current branch, target branch, and rebase status
- Commit message used
- PR title/body draft if generated
- Subtask closure summary (if story ID was provided)

## Notes
- Avoid dumping full terminal logs into context.
- Prefer `head`, `tail`, and `grep -E` for any output longer than a screen.
- Parent story state is not changed by this command — only subtasks are closed.
