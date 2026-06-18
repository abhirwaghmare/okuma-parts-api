# Generate Documentation

## When to Use
- After a feature is implemented, reviewed, and tested
- Creating architecture decision records (ADRs)
- Writing component READMEs or runbooks
- Documenting a completed service or integration

## Usage
```
/docs <description of what to document>
/docs ADR for the caching strategy decision
/docs README for the hero banner component
/docs runbook for the content migration process
```

## Workflow
1. Invoke subagent `docs-scribe`
2. Docs-scribe reads `<codebase_stack>` from CLAUDE.md for project context
3. Analyzes the request and determines documentation type (ADR, README, runbook, API docs)
4. Searches codebase for relevant code, configs, and existing docs
5. Proposes structure -- waits for approval on high-impact operations (new ADRs, directory restructuring)
6. Creates/updates documentation
7. Validates markdown syntax and link integrity

Context: $ARGUMENTS
