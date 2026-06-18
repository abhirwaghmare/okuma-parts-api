---
name: figma-context
description: Extracts structured design context from Figma and converts it into a `Figma Design Context` block for planner and frontend delivery agents. Load when the user input includes a Figma URL or node-specific Figma target.
---

# Figma Context

## Load When
- User input includes a Figma URL
- Planner or frontend agent needs design-backed context

## Skip When
- User already supplied a complete design spec in text
- Input references design ideas without an actual Figma target

## Missing Input
- Look for a Figma URL before deciding input is missing
- Look for a node-id before deciding the target is usable
- Ask for the URL or node link only when no actionable target exists

---

## Execution

### 1. Detect Target
- Scan request for a Figma URL
- Parse fileKey and nodeId (convert dashed IDs like `1-2` to `1:2`)
- Accepted URL patterns: `figma.com/design/`, `figma.com/board/`, `figma.com/make/`, `figma.com/file/`, `figma.com/proto/`
- Treat branch URLs by using the branch key as the active fileKey
- Ask for node-specific URL when file is too broad

### 2. Check Access
- Check whether Figma MCP tools are available in the current session
- Use MCP extraction when available
- If MCP missing: tell user, suggest checking desktop app/Dev Mode/MCP enablement, ask for manual design data

### 3. Extract Design Context
- Use Figma extraction tool for target node's design context
- Use variable/token extraction when variables are exposed
- Use metadata or tree inspection only to narrow an oversized target

**Component Set Extraction (2-pass):**

Pass 1 -- direct fetch:
- Fetch target node, classify for COMPONENT_SET
- Extract componentPropertyDefinitions for variant axes
- Include: fills, auto-layout, componentPropertyDefinitions
- Exclude: absoluteBoundingBox, blendMode, invisible nodes

Pass 2 -- fallbacks (run in order until one succeeds):
- File-level component set discovery
- Variant name pattern scan (sibling nodes matching `Property=Value`)
- Full-depth re-fetch of parent frame
- Name parsing for embedded variant properties

### 4. Structure Output
- Emit one Figma Design Context block (see output contract below)
- Keep exact values and units
- Preserve both variable references and resolved values
- Mark missing details only when source does not expose them

### 5. Handoff
- Pass context block into planner or frontend implementation flow
- Reuse exact tokens, spacing, layout rules during build
- Run component existence check before creating anything new

---

## Output Contract

```text
## Figma Design Context

**Source**: <Figma URL>
**File**: <file name>
**Component**: <component or frame name>
**Target**: fileKey=<fileKey>, nodeId=<nodeId>

### Design Tokens
Colors: <semantic label>: <resolved value>
Typography: <text role>: <font-family>, <size>/<line-height>, weight
Spacing: padding, gap, border radius, shadows
Figma Variables: <collection>/<name>: <resolved value>

### Layout
Mode, direction, alignment, columns, wrap

### Variants and States
<Property>: <Value1> | <Value2>

### Responsive Breakpoints
Mobile / Tablet / Desktop: <breakpoint>

### Component Hierarchy
Parent > Child > Nested element

### Assets
<asset name>: <reference>

### Authoring Notes
<designer note>

**Missing**: <field names>
```

---

## Extraction Checklist
- Component or frame name
- Colors, typography, spacing, sizing, radius, effects
- Layout direction and nesting
- Variants and states (default, hover, active, focus, disabled, error, loading)
- Responsive intent (what stacks, hides, reflows, truncates)
- Prefer variables over raw values; keep both name and resolved value

## Design-to-Code
- Run extraction first
- Check codebase for existing component match
- Modify existing when close match found; create new only when reuse is inappropriate
- Map tokens into the repo token system
- Implement markup, styles, behavior
- Validate build

## Validation
- Colors, typography, spacing sections contain real values
- Component hierarchy present
- Numeric values exact when sourced from Figma
- Variable name and resolved value both appear when variables exist
- No value was invented
