# Update Story

Context-aware lifecycle command for ADO/Jira stories. Detects the current state of the story and conversation context, then executes the appropriate workflow step automatically.

## When to Use
- Populating an empty story with plan content
- Activating a story and subtasks (New → Active)
- Triggering implementation from an active story
- Closing a story and subtasks after implementation is done

## Usage
```
/update-story #<work-item-id>
```

## Workflow

### 1. Fetch Story State
- Use the available PM tool MCP to fetch the work item by ID from `$ARGUMENTS`
- Read: current state, description content, child task relations

### 2. Determine Action Based on Context

Evaluate these criteria IN ORDER — execute the FIRST matching case:

---

**CASE 1: Story has empty/minimal description (no plan content)**

Action — **Populate Story with Plan Content**:
- Check if there is an approved plan in the current conversation context
- If YES: invoke `functional-pmo` agent with operation **UPDATE** to format and write the plan content per `.claude/references/story-template.md`
- If NO: tell the user "No approved plan found in this session. Please run the planner first to generate a plan, then re-run /update-story #ID."
- Report: "Story #{id} description updated with approved plan content."

---

**CASE 2: Story state is "New" or "Approved" (not yet Active)**

Action — **Activate Story + Subtasks**:
- Use the available PM tool MCP to move the parent story to Active
  - For ADO: check if DevStartDate and DevCompletionDate already have values — if missing, set both to today
- Get all child task IDs from relations or description table
- Move each subtask to Active using the same PM tool MCP
- Report: "Story #{id} and all subtasks moved to Active."

---

**CASE 3: Story is "Active" AND user requests implementation**

**Signals**: User says "implement", "start implementation", "build it", or runs `/update-story` with implementation intent in conversation context.

Action — **Trigger Build**:
- Invoke `functional-pmo` to move story and subtasks to Active/In Progress if not already
- Read the plan from the story description or conversation context
- Invoke the `/build` command workflow:
  - Backend work → invoke `backend-dev` subagent
  - Frontend work → invoke `frontend-dev` subagent
  - Both → invoke per the plan's execution mode
- After implementation → run `mvn clean install` to verify build
- If build passes → invoke `junits-specialist` subagent for unit tests
- After unit tests pass → run build again to confirm
- Add audit summary as comment on each subtask:
  - Dev summary → Backend/Frontend Development subtask
  - Test evidence → Unit Testing subtask
- Report: "Implementation complete. Build passed. Run `/update-story #{id}` again to close."
- Do not auto-close — wait for user to trigger closure

---

**CASE 4: Story is "Active" AND implementation is done**

**Signals**: Session context shows implementation + unit tests + build have been completed. The agent knows this because it performed or observed these steps in the current conversation.

Action — **Close Story + Subtasks**:
- Get all child task IDs from relations or description table
- Use the available PM tool MCP to close each subtask with the appropriate closing fields for the PM tool
  - For ADO: set state to Closed; set OriginalEstimate=1, CompletedWork=1, ProductivityTool and TimesavedusingAItools fields; do not set RemainingWork
- Close the parent story with the same closing fields
- Report: "All subtasks and parent story #{id} closed."

---

### 3. Ambiguity Resolution
When the story is **Active** and the agent cannot determine whether the user wants implementation (Case 3) or closure (Case 4), ASK the user:
> "Story #{id} is Active. What would you like to do?"
> 1. **Start implementation** — build the feature as planned
> 2. **Close the story** — mark everything as done

### 4. Summary
Always print a status table after any action — one row per item actually touched (parent story + each subtask found):
```
| Item | ID | State | Action Taken |
|------|----|-------|--------------|
| Parent Story | #ID | <state> | <what was done> |
| {subtask role} | #ID | <state> | <what was done> |
| ... | ... | ... | ... |
```

## Important
- Only `functional-pmo` handles story state changes — dev agents and other agents do not touch states directly
- Story content formatting always uses `.claude/references/story-template.md` as the source of truth
- Case 1 (populate) delegates to `functional-pmo` agent for proper template formatting
- Case 3 (implementation) triggers the full build cycle: implement → unit test → build
- Case 4 (close) only runs after implementation is confirmed done
- Story closure does NOT auto-close — QA handover remains manual by design

Context: $ARGUMENTS
