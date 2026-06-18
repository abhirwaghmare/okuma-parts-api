---
name: storybook-patterns
description: Extracts technical patterns from existing Storybook stories (class names, CSS conventions, component structure, variants, props) and generates new Storybook stories matching project conventions. Use when (1) user provides a Storybook reference, story file, or Storybook URL as input, (2) planner needs Input-Derived Patterns from a Storybook source, (3) frontend-dev needs to create or update Storybook stories after component implementation, (4) reviewing or auditing existing Storybook stories for consistency.
---

# Storybook Patterns

- Two capabilities:
  - extract patterns from existing stories
  - generate new stories after implementation

## Input Expectations
- Requires one of:
  - a Storybook story file path
  - a Storybook URL
  - a reference story to extract patterns from
  - a completed component implementation when generating stories
- Missing input behavior:
  - if there is no concrete Storybook source, ask for the exact story file, URL, or reference story
  - if the goal is story generation, wait until the component implementation exists
- When not to load:
  - do not load without a concrete Storybook source
  - do not load for story generation before the component implementation is complete

## Before Using This Skill

1. Read project code standards — they may already describe the project's Storybook setup
2. If project code standards have no Storybook guidance → scan the project's `.storybook/` directory and existing `*.stories.*` files to discover conventions
3. Avoid assuming a Storybook version, framework, or format — discover it from the project

## Reference Library

- **Pattern Extraction**: [pattern-extraction.md](references/pattern-extraction.md) — How to analyze Storybook stories and extract Input-Derived Patterns (class names, CSS conventions, component structure, variants, props, design tokens)
- **Story Generation**: [story-generation.md](references/story-generation.md) — How to create new Storybook stories matching the project's conventions (CSF format detection, args/controls, decorators, framework-specific patterns)

## Progressive Disclosure

**User provides Storybook reference as input** → Load: `pattern-extraction.md`
**Frontend-dev needs to create stories after implementation** → Load: `story-generation.md`
**Full lifecycle (extract from reference + create new story)** → Load both
