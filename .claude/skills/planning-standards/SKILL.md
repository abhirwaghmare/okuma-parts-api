---
name: planning-standards
description: Implementation planning patterns for BigCommerce (Catalyst) projects — SDLC category workflows, task classification, complexity estimation, reusability analysis, story intelligence, and implementation contract templates. Invoke this skill after task classification with a concrete planning task and user requirements.
---

# Planning Standards

- Planning patterns, contract templates, SDLC workflows, and decision frameworks for BigCommerce (Catalyst) implementation planning
- Load this skill after the planner has classified the task and gathered initial context
- Use it for concrete planning work, not as general framework doctrine

## Before Using These References

- These references provide planning templates and frameworks, not project-specific patterns
- Before applying any template, check in this order:

1. Check Input-Derived Patterns (from user input — Storybook, Figma, designs, reference code). These override everything.
2. Check project code standards — this defines how the project structures routes, queries, components, server actions, and tests
3. Use these references for the planning framework — task classification, complexity signals, contract structure, and execution strategy — and fill the templates with project-specific values, not the examples shown in the templates

- Examples in these references (route layouts, query shapes, component layouts) are fallback illustrations
- If the project does it differently, follow the project

- Expected input:
  - a classified task type such as Build, Analysis, Design, Test, Deploy, or Maintain
  - user requirements, story context, or reference input
- Missing input behavior:
  - if the task is not yet classified, classify it before loading deeper references
  - if requirements are incomplete, gather them before drafting the plan
- When not to load:
  - before task classification
  - for general framework questions — use `framework-guidance` instead

## Reference Library

Progressive disclosure — load only the references needed for the current planning task.

### SDLC Category Workflows (loaded by planner after task classification)

The planner classifies every task into one of six categories, then loads the matching workflow:

- **Analysis**: [workflow-analysis.md](references/workflow-analysis.md) — discovery, requirements gathering, NFR analysis, feasibility
- **Design**: [workflow-design.md](references/workflow-design.md) — HLD, LLD, architecture decisions, pattern selection
- **Build**: [workflow-build.md](references/workflow-build.md) — implementation planning, SDLC phases, engineering principles, execution strategy
- **Test**: [workflow-test.md](references/workflow-test.md) — test strategy, test cases, coverage targets, agent assignment
- **Deploy**: [workflow-deploy.md](references/workflow-deploy.md) — CI/CD, release management, environment configuration
- **Maintain**: [workflow-maintain.md](references/workflow-maintain.md) — code review, documentation, debugging, knowledge sharing

### Core Planning (loaded by workflows as needed)

- **Task Classification & Complexity**: [task-classification.md](references/task-classification.md) — Task type identification (Catalyst Page/Component, GraphQL Storefront Query, REST Management Integration, Webhook Handler, Makeswift Component, Customer Auth Flow, B2B Configuration), T-shirt sizing (S/M/L), complexity escalation signals
- **Story Intelligence**: [story-intelligence.md](references/story-intelligence.md) — Acceptance criteria extraction, hidden requirements detection, clarification triggers
- **Reusability Scan**: [reusability-scan.md](references/reusability-scan.md) — Reuse decision matrix (70%/50% thresholds), surface-propose-confirm pattern, codebase search protocol
- **Implementation Contracts**: [implementation-contracts.md](references/implementation-contracts.md) — Task-type-specific plan templates (Catalyst Page, GraphQL Query, REST Integration, Webhook, Makeswift, Customer Auth, B2B), file impact sections, handoff payloads

### Platform-Specific Planning

- **Deployment Planning**: [deployment-planning.md](references/deployment-planning.md) — Vercel/Netlify deploys, preview environments, BC channel mapping, custom domain via BC vs host, B2B Edition enablement

### Research Protocol

- **BigCommerce Intelligence**: [bigcommerce-intelligence.md](references/bigcommerce-intelligence.md) — Research sources (priority order), task-specific intelligence by type (Catalyst Page, GraphQL Query, REST Integration, Webhook, Makeswift, Customer Auth, B2B), edge case patterns, performance considerations

## Progressive Disclosure Examples

**Plan a new PDP component** → Load: `workflow-build.md`, then `task-classification.md`, `reusability-scan.md`, `implementation-contracts.md`, `bigcommerce-intelligence.md`
**Plan from a Jira story** → Load: `workflow-build.md`, then `story-intelligence.md`, `task-classification.md`, `implementation-contracts.md`
**Plan a webhook handler** → Load: `workflow-build.md`, then `implementation-contracts.md`, `bigcommerce-intelligence.md`
**Plan a Makeswift integration** → Load: `workflow-build.md`, then `task-classification.md`, `implementation-contracts.md`
**Plan a B2B workflow** → Load: `workflow-build.md`, then `task-classification.md`, `bigcommerce-intelligence.md`, `implementation-contracts.md`
**Plan a Vercel deployment** → Load: `workflow-deploy.md`, then `deployment-planning.md`
**Create test plan** → Load: `workflow-test.md`
**Plan code review** → Load: `workflow-maintain.md`
**Requirements analysis** → Load: `workflow-analysis.md`
**Architecture design** → Load: `workflow-design.md`
**Estimate task complexity** → Load: `task-classification.md`
**Check if component can be reused** → Load: `reusability-scan.md`
