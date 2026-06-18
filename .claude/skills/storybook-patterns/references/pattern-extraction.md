# Storybook Pattern Extraction

Extract technical patterns from existing Storybook stories to produce Input-Derived Patterns for the planner and dev agents. These patterns take priority over skill references and platform best practices.

## When to Extract

- User provides a Storybook story file (`.stories.js`, `.stories.ts`, `.stories.jsx`, `.stories.tsx`, `.stories.mdx`)
- User provides a Storybook URL pointing to a deployed Storybook instance
- User references a component by name that has an existing Storybook story in the project
- Planner Step 1 (Input Analysis) identifies Storybook as an input source

## Extraction Process

### 1. Discover Project Storybook Setup

Before extracting from any story, understand how THIS project uses Storybook:

- Read `.storybook/main.js` or `.storybook/main.ts` — framework, addons, story glob patterns
- Read `.storybook/preview.js` or `.storybook/preview.ts` — global decorators, parameters, viewports
- Check `package.json` for Storybook version and framework package (`@storybook/html`, `@storybook/react`, `@storybook/angular`, `@storybook/web-components`)
- Identify story format: CSF2 (`export default { title }` + named exports) vs CSF3 (`export default { component }` + object exports) vs MDX

Document these as **Project Storybook Configuration** — agents need this to generate compatible stories.

### 2. Extract from Story File

Read the story file and extract:

**Component Identity**
- Component name (from `export default { title }` or `component` field)
- Component path / import source
- Story names (each named export = a story variant)

**CSS Class Names and Naming Convention**
- Scan the story's template/render function for all CSS class names used
- Identify the naming convention: BEM (`block__element--modifier`), custom prefix (`cmp-`, `c-`, `ui-`), utility classes (Tailwind), or project-specific
- Extract the prefix pattern if one exists (e.g., `cmp-hero`, `cmp-card` → prefix is `cmp-`)
- Document exact class names — these are the source of truth for implementation

**Component HTML Structure**
- Extract the markup/template from the story's render function or template
- Identify the component hierarchy (parent → children → nested elements)
- Note semantic HTML usage (section, article, nav, header, figure, etc.)
- Identify data attributes, ARIA attributes, role attributes

**Props / Args / Controls**
- Extract all args defined in the story (these map to component props/dialog fields)
- For each arg: name, type, default value, description (if present)
- Identify which args control visibility, content, variants
- Map args to potential authoring dialog fields (text → textfield, boolean → checkbox, select → dropdown)

**Variants and States**
- Each named export is a variant — document what each variant demonstrates
- Identify state variations: default, hover, active, disabled, loading, empty, error
- Extract variant-specific arg overrides

**Design Tokens / Styling**
- Extract CSS custom properties (--var-name) used in the story or imported styles
- Identify color values, typography values, spacing values
- Note responsive behavior if viewports/breakpoints are configured in the story

**Interaction Patterns**
- Identify event handlers (onClick, onChange, onSubmit, etc.)
- Note animation/transition classes or JS behavior
- Document keyboard interaction if present

### 3. Extract from Storybook URL

If user provides a URL to a deployed Storybook:

1. Use browser/fetch tools to access the Storybook instance
2. Navigate to the specific story
3. Inspect the rendered DOM to extract:
   - Actual CSS class names on rendered elements
   - Computed styles (fonts, colors, spacing)
   - HTML structure
   - Component hierarchy
4. Check the "Docs" tab for prop documentation
5. Check the "Controls" panel for available args

### 4. Extract from Project Codebase

If user references a component by name:

1. Search for `*.stories.*` files matching the component name
2. Search for the component's implementation file (imported by the story)
3. Extract from both: story file (variants, args) + implementation (HTML, CSS classes, behavior)

## Output Format

Produce an **Input-Derived Patterns** block that the planner and dev agents can consume directly:

````text
## Input-Derived Patterns (from Storybook)

**Source**: {story file path or Storybook URL}
**Component**: {component name}

### CSS Convention
- Naming: {BEM / custom prefix / utility / project-specific}
- Prefix: {e.g., "cmp-" or "c-" or none}
- Examples: {exact class names from the story — e.g., "cmp-hero__title", "cmp-hero__title--large", "cmp-hero__media"}

### Component Structure
```html
{exact HTML structure from the story's render/template}
```

### Props → Dialog Field Mapping
| Prop | Type | Default | Maps to Dialog Field |
|------|------|---------|---------------------|
| {name} | {type} | {default} | {textfield / textarea / checkbox / select / pathfield / etc.} |

### Variants
- {variant name}: {what it demonstrates}

### Design Tokens
- {token name}: {value}

### Interaction Patterns
- {event}: {behavior}
````

## Output Validation (before handoff)

Before passing Input-Derived Patterns to any consumer, verify:
- [ ] CSS Convention section has naming type identified (BEM, custom prefix, utility, etc.) — not "unknown"
- [ ] CSS Convention has at least 3 actual class name examples extracted from the story
- [ ] Component Structure has actual HTML markup (not a generic description like "a section with a heading")
- [ ] Props → Dialog Field Mapping table has at least 1 row (every component has at least one authorable prop)
- [ ] Variants section lists at least the default variant
- [ ] No class names or prop names were invented — every value traces back to the story source

If any check fails, flag it in the output: `**Incomplete**: {what is missing and why (e.g., "No props found — story uses static HTML with no args")}`

## Rules

- NEVER replace extracted class names with OOTB or best-practice names. If the story uses `cmp-hero__title`, the implementation MUST use `cmp-hero__title`.
- NEVER assume a CSS naming convention. Extract it from the actual story.
- NEVER skip props extraction — props map directly to authoring dialog fields.
- If the story uses a design system or token set, identify and document it. Do not substitute with a different system.
- If the story conflicts with `<code_standards>`, note the conflict but FOLLOW THE STORY — it represents what the project wants for this specific component.
