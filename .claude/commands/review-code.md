# Review Code

## When to Use
- Before committing code
- After feature completion
- For pull request review

## Workflow
1. Detect scope automatically:
   - If uncommitted changes exist (`git status`), scope to changed files only
   - If specific files are provided in `$ARGUMENTS`, scope to those files
   - If no changes and no files are specified, ask what to review
2. Invoke subagent `code-reviewer`
3. Code-reviewer reads `<code_standards>` and `<codebase_stack>` from CLAUDE.md as the review baseline
4. Code-reviewer loads supporting skills based on file type and project context
5. Code-reviewer scans critical and high-risk concerns first, then completes the full severity scan
6. Code-reviewer fixes what it finds — fixable issues are fixed directly, rebuilt, and verified
7. Architectural issues that need redesign are handed back to the implementing agent
8. After all fixes: the SDLC flow continues — Review > Test

Context: $ARGUMENTS
