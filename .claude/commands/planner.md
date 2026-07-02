# Plan Implementation

## When to Use
- Planning a new feature, component, service, or integration
- Need structured implementation contracts before coding
- Want context gathered from design files or work item trackers

## Skills (required)
- Planning-standards is needed for every planning request
- Invoke relevant skills first
- Read all relevant sections and references inside each invoked skill before drafting the plan
- Produce a plan only after skill loading and reference reading are complete

## Workflow
1. Invoke subagent `planner`
2. Planner classifies SDLC category first (Analysis/Design/Build/Test/Deploy/Maintain)
3. Planner loads planning-standards and all relevant references for that category
4. If design URL provided, invoke design context skill
5. If work item ID provided, invoke story context skill
6. Planner runs parallel codebase exploration + research, then produces an implementation contract
7. Planner drafts the plan, evaluates it with the advisor tool if available, then presents it to the user

## Plan Output Contract (required)
The produced plan must include all of the following:
- Summary with task type and complexity (S/M/L)
- Input-Derived Patterns (exact values, no paraphrasing for design tokens)
- Reusability Analysis with extend-vs-build recommendation
- Technical Contract section using the relevant planning template
- File Impact with exact paths and action per file (create/modify/remove)
- Execution Strategy with agent assignment, execution mode, context payload, and SDLC flow
- Open Questions section for unresolved decisions

Reject and regenerate if any section is missing.

## Checklist Enforcement (Command-Level)
Before returning any plan, the planner must pass all checks:
1. Did I analyze user input first and extract Input-Derived Patterns (class names, structure, design tokens)?
2. Did I read `<code_standards>` and `<codebase_stack>` from CLAUDE.md?
3. Did I load planning-standards and read all relevant sections/references from invoked skills?
4. Did I invoke code-explorer (for reuse) AND research-intelligence in parallel?
5. Did I run the reusability scan and get user confirmation?
6. Did I classify the task type and assess complexity?
7. Does my plan use the correct planning template for this task?
8. Does my plan include Input-Derived Patterns so dev agents know the conventions?
9. Does my plan include an Execution Strategy with explicit justification for execution mode (parallel vs sequential vs mixed), dependency/order rationale, agent assignment, context payloads, and SDLC flow?
10. Does my plan include file structure derived from `<code_standards>` (not from OOTB defaults)?
11. Am I planning for others to execute, not myself?
12. Did I include Open Questions for unclear items?
13. Did I invoke planning-standards and read all relevant sections before drafting?
14. For Component Build tasks, did I include component/dialog(tab)/template-policy-content structures?
15. Does File Impact list exact paths and explicit CREATE/MODIFY/REMOVE actions?
16. Are SDLC todos actionable and phase-owned instead of generic milestones?
17. Did I call the advisor tool to evaluate the draft plan before presenting, if available?

If any checklist item fails, do not finalize -- regenerate with missing details.

Context: planning-standards $ARGUMENTS
