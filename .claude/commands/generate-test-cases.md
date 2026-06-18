# Generate Test Cases

## Usage

```
/generate-test-cases <ado-id or jira-key>
/generate-test-cases <description of what was built>
/generate-test-cases #12345 card component with dark theme and RTL
```

## Execution Steps

### 1. Project Awareness + Gather Context

- Read `<codebase_stack>` from CLAUDE.md — determine project architecture (headful / headless / SPA / hybrid), test framework, instance URLs
- Adapt test categories below based on project type:
  - Headful: include Authoring tests (dialog, drag-and-drop)
  - Headless/SPA: replace Authoring tests with API/rendering tests
  - Hybrid: include both

- If an ADO/Jira ID is provided, invoke `story-context` skill to fetch title, description, and acceptance criteria
- If a description is provided, use it directly as the implementation context
- If both are provided, use the story context as the primary source and the description as supplementary detail

### 2. Classify Complexity

Based on the implementation scope, assign S or M complexity:
- **S** — single component, single file type, no external integrations
- **M** — multiple file types, new custom component, 1 external integration

If the implementation appears L complexity (cross-cutting, new architectural pattern, multi-environment), warn the user:
> "This appears to be an L-complexity task. Test case generation is scoped to S and M. Proceeding with what is determinable from the provided context."

### 3. Generate Test Cases

- Produce a test case table with the following columns:

| # | Category | Test Case | Steps | Expected Result | Type | Execution |
|---|---|---|---|---|---|---|
| 1 | Functional | ... | ... | ... | Positive/Negative/Edge | AI / Manual |

**Categories to cover:**

**Functional:**
- Component renders with valid data
- Component renders with missing/empty data (null, empty strings)
- All authored fields appear correctly on page
- CTA links/buttons work as expected
- Conditional visibility rules work (show/hide based on dialog values)
- Responsive behavior at mobile (375px), tablet (768px), desktop (1440px)
- RTL layout renders correctly (if applicable)
- Dark theme / variant renders correctly (if applicable)

**Authoring** (headful/hybrid only — skip for headless/SPA):
- Component can be added to a page via drag-and-drop
- All dialog fields save and persist correctly
- Required field validation shows error on empty submit
- Component preview in authoring matches published output

**Accessibility:**
- Accessibility scan passes with no critical/serious violations
- All interactive elements are keyboard reachable
- Focus indicators are visible
- Color contrast meets 4.5:1 for text, 3:1 for large text
- Images have meaningful alt text

**Performance:**
- Performance score meets project threshold (from `<code_standards>`)
- Core web vitals within acceptable range
- Component loads without layout shift

**Security:**
- No XSS in rendered output
- No inline scripts or handlers in HTML output
- CSP compatible

**Execution column rules:**
- **AI** — can be automated as an end-to-end test or accessibility scan (deterministic, no visual judgment required)
- **Manual** — requires visual inspection, business judgment, or authoring interaction

### 4. Save Report as File

After generating the test case table, save it as a CSV file at `test-cases-report.csv`:

```csv
#,Category,Test Case,Steps,Expected Result,Type,Execution
1,Functional,Component renders with valid data,...,...,Positive,AI
2,Functional,Component renders with missing data,...,...,Negative,AI
```

### 5. Output

- Present the test case table in the chat
- Confirm the CSV file was saved at `test-cases-report.csv`
- After the table:

```
Test Cases: {total count}
AI-Automatable: {count} — can be automated as end-to-end tests or unit tests
Manual: {count} — require human execution

Report saved: test-cases-report.csv

Test environment:
- Author: {author URL from <codebase_stack> or localhost} (authoring and dialog validation)
- Publish: {publish URL from <codebase_stack> or localhost} (rendering validation)
```

Suggest next step:
```
To generate unit tests for backend code: /generate-junits
To validate the implementation against these test cases: /validate-implementation
```

Context: $ARGUMENTS
