# Generate Unit Tests

Invoke the `junits-specialist` agent to generate comprehensive unit tests.

## When to Use
- After implementing backend code
- Need test coverage for new features
- Adding edge case tests
- Improving code coverage to meet 80% minimum

## Workflow
1. Invoke subagent `junits-specialist`
2. Analyze implementation code — identify test scenarios
3. Generate tests following the project's test framework and conventions from `<code_standards>` and `<codebase_stack>`
4. Execute tests and verify >=80% coverage
5. If implementation issues found — hand off to backend-dev, do not modify implementation code

Context: $ARGUMENTS
