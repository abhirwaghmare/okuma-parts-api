# Validate Implementation

## When to Use
- After deploying code to the local instance
- After the SDLC Deploy phase completes
- To verify acceptance criteria are met
- To compare live implementation against Figma design

## Usage
```
/validate-implementation <url>
/validate-implementation <url> against <ado-id or jira-key>
/validate-implementation <url> against <figma-url>
/validate-implementation <url> against <ado-id> and <figma-url>
```

## Workflow
1. Invoke subagent `validation-tester`
2. If ADO/Jira ID provided, invoke `story-context` skill
3. If Figma URL provided, invoke `figma-context` skill
4. If Figma context already exists in the conversation from a prior skill invocation, use it directly for design fidelity comparison
5. Validation agent uses Chrome DevTools MCP (preferred) and runs two phases:
   - **High-level**: cosmetic happy-flow check (page loads, component renders, no console errors)
   - **Detailed**: full test case execution with a descriptive CSV report (named after the component/page being validated), including design fidelity against Figma when Figma context is available
6. If high-level fails, report failures and hand back to implementing agent for fix > deploy > re-validate
7. If detailed completes, report PASS/PARTIAL/FAIL with CSV

Context: $ARGUMENTS
