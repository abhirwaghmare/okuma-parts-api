---
name: live-site-context
description: Extracts structured implementation context from a live site URL, selector, or screenshot and converts it into `Input-Derived Patterns` for planner and frontend delivery agents. Load when the user wants to inspect, replicate, compare, or derive authoring requirements from a running site.
---

# Live Site Context

## Load When
- User provides a live site URL as a component reference
- User wants to replicate or compare a running component
- Planner needs live-reference patterns before planning

## Skip When
- User already supplied full DOM, CSS, and behavior details
- Input does not identify a live reference, selector, screenshot, or component description

## Missing Input
- Look for URL first, then selector or component description, then screenshot
- Ask only when the component cannot be located from current input

---

## Execution

### 1. Detect Target
- Scan request for URL, selector, screenshot, or component description
- Choose the most precise target available

### 2. Check Access
- Chrome DevTools MCP (preferred)
- Playwright MCP (fallback)
- Screenshot-only analysis (last resort when no browser MCP and screenshot exists)

### 3. Open and Inspect
- Navigate to URL, wait for page to settle
- Locate component by selector, DOM query, or visual clue
- Extract: DOM structure, class names, computed styles, responsive behavior, interactions
- Stay read-only by default -- do not submit forms, authenticate, mutate state, or trigger destructive actions unless user explicitly asks

### 4. Structure Output
- Emit one `Input-Derived Patterns (from Live Site)` block (see contract below)
- Keep exact class names and computed values from MCP
- Mark visual estimates as approximate in screenshot-only mode

### 5. Handoff
- Pass block into planner or frontend implementation
- Preserve extracted naming and authoring patterns during implementation

---

## Output Contract

```text
## Input-Derived Patterns (from Live Site)

**Source**: <URL>
**Component**: <name or description>
**Viewport**: <width tested>

### CSS Convention
Naming, prefix, exact class name examples

### DOM Structure
<simplified HTML, 3 levels max>

### Typography
Heading and body: font-family, size, weight, color

### Color Palette
Background, text, accent/CTA, border

### Layout
Display, direction, alignment, gap, columns, max-width, padding

### Responsive Behavior
Mobile / Tablet / Desktop: what changes

### Interactive Elements
<element>: role and behavior

### Props -> Dialog Field Mapping
| Content Element | Value Example | Maps to Dialog Field |
|----------------|---------------|---------------------|

### Implementation Notes
Reuse candidates, structure clues, authoring notes

**Missing**: <field names>
```

---

## MCP Extraction Fields
- Outer HTML (top nesting levels), tags, class names, key attributes
- Text content, alt text
- Computed typography, colors (hex), layout properties
- Border, radius, shadow, opacity, transform
- Hover behaviors (when safely detectable)
- Breakpoint behavior at current and resized widths

## Screenshot-Only Mode
- Describe layout structure
- Estimate typography hierarchy and major colors
- Identify visible interactive elements
- Mark all values as approximate

## Authoring Implications
- Content elements that should become dialog fields
- Repeating content that suggests multifields
- Media elements that suggest asset pickers
- CTA elements that suggest link fields and labels

## Validation
- CSS convention identified
- At least 3 exact class names when MCP extraction succeeded
- DOM structure contains real HTML
- Typography and color values present (exact from MCP, approximate from screenshot)
- Props -> Dialog Field Mapping has at least one row when authorable content exists
- No value invented
