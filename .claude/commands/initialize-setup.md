# Initialize Setup

- Run this at the start of every new project or when onboarding onto an existing codebase
- Recommended before development -- otherwise agents operate with best-effort defaults
- Intended for the project architect or tech lead who owns the project's technical standards

- Two modes:
  1. **With architect's standards document (recommended):** Provide a PDF or markdown file containing the project's architecture, tech stack, patterns, and coding conventions. The framework reads the document and populates project context from it. Example: `/initialize-setup /path/to/project-standards.md` or `/initialize-setup /path/to/project-standards.pdf`
  2. **Codebase scan (fallback):** If no document is provided, the framework scans the codebase to detect the tech stack and infer conventions. This is less accurate than an architect-provided document.

- Reference template: use the architect standards template for the exact structure the architect should document. Fill it out and provide it as input in markdown or PDF form.

Invoke the `initialize-setup` skill and follow its instructions.

After completion, confirm:
- `<project_context>` and `<codebase_stack>` in CLAUDE.md are populated
- `<code_standards>` in CLAUDE.md is populated
- Conflict check results

Context: $ARGUMENTS
