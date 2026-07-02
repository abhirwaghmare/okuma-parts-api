# Story Intelligence

## Acceptance Criteria Extraction

When user provides a Jira story or requirements document:

1. **Parse Story Format**:
   - Extract: Title, Description, Acceptance Criteria (ACs), Dependencies, Attachments
   - Identify: User persona, business value, success metrics
   - Flag: Missing ACs, vague requirements, untestable criteria

2. **AC Validation Checklist**:
   - Is each AC testable? (clear pass/fail condition)
   - Is scope bounded? (no open-ended "and more" language)
   - Are edge cases covered? (empty, null, error states)
   - Is authoring experience defined? (dialog fields, validation messages)

3. **Hidden Requirements Detection**:
   - **Accessibility**: If UI component, WCAG 2.2 AA is implicit
   - **Responsive**: If frontend, mobile breakpoints expected
   - **i18n**: If content-driven, translation support assumed
   - **Analytics**: If user-facing, tracking events may be needed
   - **Caching**: If public content, caching layer considerations required
   - **Permissions**: If gated content, ACL considerations

4. **Clarification Triggers**:
   - "Should support multiple..." → Ask: How many? What's max limit?
   - "Users can configure..." → Ask: Which users? Author/Admin/End-user?
   - "Display content from..." → Ask: What if source unavailable? Fallback?
   - "Integrate with..." → Ask: Auth method? Rate limits? SLA requirements?

**Output**: Before planning, list extracted ACs and any hidden/implicit requirements discovered.
