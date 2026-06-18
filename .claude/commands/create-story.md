# Create Story

Invoke the `functional-pmo` agent to create a new user story with subtasks in the project's PM tool (ADO/Jira) from an approved implementation plan.

## When to Use
- After a plan is approved and you want to create a trackable story
- When no existing story ID is associated with the work
- For multi-component plans that need decomposition into multiple stories

## Usage
```
/create-story
/create-story .claude/plans/my-component-plan.md
```

## Workflow

### 1. Find the Plan
- If a file path is provided in `$ARGUMENTS`, read that file as the plan source
- If no argument, check the conversation context for an approved plan
- If no plan exists in context, list `.claude/plans/` and use the most recently modified MD file
- If `.claude/plans/` is empty or does not exist, tell the user to run the planner first and stop

### 2. Invoke Functional PMO Agent
Invoke subagent `functional-pmo` with operation: **CREATE**

The functional-pmo agent handles:
- Reading the story template from `.claude/references/story-template.md`
- Detecting the PM tool (ADO/Jira/GitHub or fallback to markdown)
- Extracting story content from the approved plan
- Formatting per the story template
- Determining and creating subtasks with scoped descriptions
- Presenting the story for user confirmation before creation
- Creating the story and subtasks in the PM tool
- Reporting story ID, subtask IDs, and next steps

### 3. Scope Assessment (multi-component plans)
For plans covering multiple components (full pages, large features):
- The functional-pmo agent decomposes into multiple stories — one per logical component
- Each story gets its own title, description, acceptance criteria, file impact, and subtasks
- Stories are independent unless the user provides a parent epic/feature ID

## Important
- Stories are created only after explicit user confirmation
- `.claude/references/story-template.md` is the single source of truth for story structure and formatting — functional-pmo reads it directly
- If no PM tool MCP is configured, functional-pmo returns formatted markdown for manual entry
- State changes (New → Active → Closed) are handled by `/update-story`, not this command

Context: $ARGUMENTS

 