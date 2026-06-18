---
name: framework-guidance
description: Universal framework guidance for designing, maintaining, and evolving agentic coding systems across Claude Code, Cursor, VS Code, and GitHub Copilot. Use when creating, updating, or maintaining agents, commands, skills, rules, or hooks. Also use when resolving cross-surface conflicts, validating framework changes, deciding where new guidance belongs, or adapting the framework for a new platform.
---

# Framework Guidance

Use this skill for framework-level concerns:
- Agent, subagent, and handoff design
- Skills, commands, and rules
- Hook architecture and guardrails
- Cross-platform framework structure
- Framework maintenance and validation

Generic maintenance guide for the framework itself, not project-domain guidance.

---

## Platform Documentation

Use official docs when the decision depends on platform behavior.

### Claude Code
- [Overview](https://code.claude.com/docs/en/overview)
- [Memory and project instructions](https://code.claude.com/docs/en/memory)
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [MCP](https://code.claude.com/docs/en/mcp)
- [Interactive mode and slash commands](https://code.claude.com/docs/en/interactive-mode)
- [Settings](https://code.claude.com/docs/en/settings)

### Cursor
- [Docs home](https://docs.cursor.com/)
- [Rules](https://docs.cursor.com/en/context)
- [Agent tools](https://docs.cursor.com/agent/tools)
- [MCP](https://docs.cursor.com/en/context/mcp)
- [Background agents](https://docs.cursor.com/en/background-agents)

### VS Code / GitHub Copilot
- [Custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Hooks](https://code.visualstudio.com/docs/copilot/customization/hooks)
- [MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [Create skills](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills)

---

## Core Principles

### 1. Separation of Concerns
- **Root instructions** own always-on project context data containers and system instructions
- **Rules** own topic-scoped always-on standards that load at session start
- **Agents** own role behavior, workflow, stop rules, handoffs, and stop hooks
- **Skills** own deep conditional knowledge loaded on demand
- **Commands** own invocation shape and light user-facing framing
- **Hooks** own deterministic or lifecycle-bound enforcement
- **Reference assets** own reusable support material (e.g., story-template.md)

### 2. Thin Invokers, Rich Knowledge Containers
- Commands stay thin
- Agents coordinate work, not become encyclopedias
- Skills hold deep knowledge and examples
- Hooks enforce or automate, not replace good prompt design

### 3. Progressive Disclosure
1. Always-on instructions (CLAUDE.md, rules)
2. Relevant skill or agent
3. Deeper references only when needed

### 4. Decision Hierarchy
1. User intent and explicit task constraints
2. Project conventions and repository patterns
3. Framework guidance
4. Platform defaults and official vendor docs

### 5. Codebase-First Adaptation
- Follow existing naming and structure unless explicitly asked to change them
- Prefer extending proven patterns over inventing new ones

### 6. Boundaries Before Expansion
- Do not add new agents, commands, skills, hooks, or prompts unless the need is explicit and durable

### 7. Self-Review Before Handoff
- Agents check whether they completed the assignment, not merely responded
- Stop hooks validate completion and return actionable failure reasons

### 8. Interoperability
- Framework guidance survives across Claude Code, Cursor, VS Code, and GitHub Copilot
- Use portable concepts: root instructions, agents, skills, hooks, commands, prompts, MCP servers
- Document platform differences where they matter

### 9. Read, Understand, Then Change
1. Read existing framework components completely
2. Understand what is authoritative vs derived
3. Change the smallest surface that correctly fixes the problem
4. Validate downstream references

---

## Pipeline Workflow

The framework operates on a three-agent pipeline with user-controlled decision points:

**Planner** -> **Functional PMO** -> **Build agents (backend-dev / frontend-dev)**

### Entry Points
- **Story ID present + implement intent**: planner extracts plan from story, offers build handoffs
- **No story ID**: planner generates plan, exposes Create User Story + Update User Story buttons
- **Story ID + changed requirements**: planner generates updated plan, exposes Update User Story

### State Management
- Only functional-pmo handles story state changes (New -> Active -> Closed)
- Dev agents and other agents do not touch story states directly
- Story content follows `.claude/references/story-template.md` as the single source of truth

---

## What Belongs Where

- **Root instructions**: always-on, applies across most tasks, project context data containers
- **Rules**: always-on but topic-scoped, supplements root instructions, loads at session start
- **Agents**: named role with workflow, stop rules, handoffs, and stop hooks
- **Skills**: deep conditional knowledge, examples, references, scripts
- **Commands**: user-facing entry point, light invocation framing
- **Hooks**: lifecycle-bound enforcement, deterministic or judgment-based
- **Reference assets**: reusable support material cited by multiple surfaces (e.g., story-template.md, architect-standards-template.md)

---

## Framework Shape

```text
project-root/
  CLAUDE.md
  .claude/
    agents/          11 specialist agents
    commands/        16 slash commands
    skills/          12 curated skills
    plans/           saved implementation plans
    rules/
      code-standards.md
    references/
      architect-standards-template.md
      story-template.md
    prompt-library.md
    settings.json    permissions + hooks
  .cursor/
    rules/           Cursor-specific rules
    mcp.json
  .vscode/
    settings.json
    mcp.json
```

Not every framework needs every directory. Separate portable assets from platform-specific files.

### Core Building Blocks
- **Root instructions**: always-on project context and system instructions
- **Rules**: topic-scoped always-on standards (e.g., code-standards.md)
- **Agents**: named role behaviors with workflow, boundaries, stop rules, handoffs, and stop hooks
- **Skills**: deep conditional knowledge loaded on demand
- **Commands**: user-facing entry points for stable workflow shapes
- **Reference assets**: reusable files cited by agents and commands (story-template.md, architect-standards-template.md)
- **Hooks**: lifecycle-bound enforcement (PreCompact, Stop, SubagentStop)
- **MCP config**: external tool and data-source connections

### Role Topology
- **Planner** interprets the task, gathers context, produces an implementation contract
- **Functional PMO** creates or updates stories in ADO/Jira, manages story state
- **Backend-dev / Frontend-dev** implement per the approved plan
- **Code-reviewer** validates quality, returns findings only
- **Junits-specialist** generates tests
- **Validation-tester** validates deployed output
- **Solutions-architect** provides architectural recommendations
- **Code-explorer** scans codebase for reuse
- **Research-intelligence** fetches platform documentation
- **Docs-scribe** creates architecture docs, ADRs, runbooks

### Skill Shape

Minimal:
```text
skill-name/
  SKILL.md
```

Expanded:
```text
skill-name/
  SKILL.md
  references/
    topic.md
  scripts/
    helper.sh
```

SKILL.md is the entry point and navigation guide. Keep it lean. Move detailed content to references.

---

## Prompting Standards

### Agent/Skill/Command Body Format
- Use `##` markdown headers for section structure
- XML tags are used only for data containers in CLAUDE.md (`<project_context>`, `<codebase_stack>`, `<system_instructions>`)
- Agent, skill, and command bodies use markdown, not XML

### Prompting Checklist
Apply to every agent, command, and skill file:

1. Bullets over prose -- no sentences where a bullet works
2. No aggressive CAPS -- use "do not" instead of "NEVER", no ALWAYS/REQUIRED/AVOID in all-caps
3. No hardcoded file paths as instructions -- say "project code standards" and "stack context" instead of naming specific files
4. XML only for data containers in CLAUDE.md -- agent/skill/command bodies use `##` markdown headers
5. No severity attributes on rules
6. Positive framing where possible -- say what to do, not just what to avoid
7. No filler phrases, no preamble, no ceremony
8. Role definitions need purpose -- explain what the agent does, what it owns, what it does not do
9. Trigger clarity for skills -- input-driven skills state what input they expect, what to do if missing, when not to load
10. Keep domain-specific content -- platform-specific content in platform-specific branches is intentional
11. Frontmatter (handoffs, stop hooks) must be consistent with body behavior

### Agent Frontmatter

Typical fields: `name`, `description`, `argument-hint`, `handoffs`, `hooks`

```yaml
---
name: agent-name
description: Clear description of role and constraints.
argument-hint: "What the user should provide."
handoffs:
  - label: Handoff Label
    agent: target-agent
    prompt: "Context for the target agent."
hooks:
  Stop:
    - hooks:
        - type: prompt
          prompt: "Completion check."
---
```

- `description` describes the role precisely
- `argument-hint` written for humans
- `handoffs` reference real agent names, explain state not methodology
- Stop hooks validate that the agent completed its job before exiting

### Skill Frontmatter

Only `name` and `description`:

```yaml
---
name: skill-name
description: When to use, what it covers, trigger conditions.
---
```

- `description` makes invocation conditions easy to infer
- SKILL.md acts as entry and navigation guide

---

## Hook Guidance

Use hooks for enforcement at lifecycle boundaries:
- Inject or refresh context
- Block unsafe actions
- Run post-edit or post-tool checks
- Verify completion before stopping
- Provide failure-specific recovery guidance

### Hook Types
- **Deterministic**: inspect files/state, block unsafe actions, run validators, log events
- **Judgment-based (prompt)**: whether an agent completed its role, whether output followed required structure, whether a handoff is missing critical context

Prefer deterministic when possible.

### Supported Events
- PreToolUse, PostToolUse
- Notification
- UserPromptSubmit
- Stop, SubagentStop
- PreCompact
- SessionStart, SessionEnd

### Framework Hooks (current)
- **PreCompact** -- preserves context during compaction (structured summary: done/in-progress/next/active plan)
- **Stop** -- ensures SDLC continuity when agent finishes
- **SubagentStop** -- injects task tracking into subagents

### Design Questions
- Is this deterministic or judgment-based?
- Global or scoped to one role/workflow?
- Would this be clearer as an instruction, skill, or agent rule instead?
- What lifecycle event owns it?
- What does the user see when the hook blocks or fails?

---

## Framework Modification Workflow

1. **Discover** -- identify the files and surfaces involved
2. **Read** -- read authoritative files completely before proposing a change
3. **Analyze** -- compare current vs desired behavior, identify the owning layer
4. **Propose** -- describe the change and why it belongs in that surface
5. **Modify** -- change only approved scope
6. **Validate** -- run syntax, reference, and consistency checks
7. **Report** -- summarize what changed and what behavior is now different

When a concept appears in multiple places: identify the authoritative source first, update it first, align dependent surfaces second.

### Safety Rules
- Do not change framework behavior without understanding which layer owns it
- Do not silently change a component's fundamental role
- Do not leave references half-updated after a rename
- Do not add a new primitive just to avoid improving an existing one

---

## Common Anti-Patterns

- Embedding too much domain knowledge in agents (use skills instead)
- Repeating root-level rules inside every agent
- Handoff prompts that re-teach the next agent's entire job
- Commands duplicating agent prompts or hiding durable logic
- Near-duplicate commands for the same user intent
- Too many tiny reference files with links but no guidance
- Using hooks for advisory guidance that belongs in prompts
- Contradictory guidance across files
- Stale references after renames
- Fixing symptoms in multiple places instead of the owning layer

---

## Validation Checklist

### Syntax
- Frontmatter is valid YAML
- Field names match framework conventions

### References
- Internal links point to real files
- Referenced agents, skills, commands, hooks exist
- Stale names and old paths are gone after renames

### Consistency
- Change applied at the authoritative layer
- Agents, skills, commands, hooks do not contradict each other
- Commands remain thin
- Hook behavior is documented and scoped

### Content Quality
- Bullets over prose
- No hardcoded file paths as instruction references
- No aggressive CAPS emphasis
- No XML tags in agent/skill/command bodies (markdown headers only)
- No severity attributes on rules
- Positive framing where possible
- Frontmatter consistent with body behavior
- Stop hooks present and validate completion

### Error Handling
- Missing file: report path, list what exists, update references after confirming target
- Ownership conflict: explain in terms of role/layer, recommend correct surface
- Breaking change: warn explicitly, describe downstream impact, confirm before applying
- Invalid syntax: fix first, re-validate before reporting success
