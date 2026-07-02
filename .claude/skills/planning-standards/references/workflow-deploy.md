# Deploy Workflow

Planning workflow for deployment tasks: CI/CD setup, release management, environment configuration, and deployment execution.

## Internal SDLC: Plan → Build → Execute → Verify → Validate

| Phase | What Happens | Agent |
|-------|-------------|-------|
| **Plan** | Define deployment scope, gather context, create deployment plan | Planner |
| **Build** | Ensure build passes with latest code, package artifacts | Direct execution |
| **Execute** | Run deployment commands, apply configurations | Direct execution |
| **Verify** | Check logs, confirm code is active, smoke test | Direct execution |
| **Validate** | Full validation of deployed environment | validation-tester |

**Autonomy:**
- S/M complexity: execute all phases end-to-end without asking. Notify at each transition.
- L complexity: pause after Plan for user confirmation before Execute.

---

## Prerequisites (completed by planner before loading this workflow)
- Project standards read from `<codebase_stack>` (build/deploy commands)
- code-explorer invoked to understand build/deploy configuration

---

## Phase 1: Plan

### Identify Deployment Scope

| Type | Focus | Output |
|------|-------|--------|
| **Deployment Execution** | Deploy code to an environment | Deployment plan with verification steps |
| **CI/CD Setup** | Pipeline configuration or updates | Pipeline configuration plan |
| **Release Management** | Version, tag, changelog, rollback plan | Release plan with checklist |
| **Environment Config** | Environment-specific configuration | Configuration plan with environment details |

### Gather Deployment Context

From `<codebase_stack>`:
- Build command
- Deploy command
- Target environments (local, dev, stage, prod)
- Platform/runtime version (from `<codebase_stack>`)
- Hosting/CI configuration (if applicable)

From code-explorer:
- Existing CI/CD configuration (GitHub Actions, Jenkins, Vercel/Netlify config, Cloud Manager)
- Environment-specific configurations
- CDN / caching layer configuration
- Environment variable references

### Create Deployment Plan

**For Deployment Execution:**
- Pre-deployment checklist (build passes, tests pass, code reviewed)
- Deployment steps using project's deploy command from `<codebase_stack>`
- Post-deployment verification steps
- Rollback procedure if deployment fails

**For CI/CD Setup:**
- Pipeline stages: build > test > deploy > validate
- Configuration per environment
- Secret management
- Notification and alerting

**For Release Management:**
- Version numbering strategy
- Changelog generation
- Tag creation
- Rollback plan with previous version reference
- Communication plan

**For Environment Config:**
- Service configurations per environment
- CDN / caching rules per environment
- Environment variables and secrets
- Content migration (if needed)

### Present Deployment Plan

```
## Deployment Plan: {Scope}

**Type:** {Execution | CI/CD | Release | Environment Config}
**Target:** {Environment(s)}
**Complexity:** {S/M/L}

### Internal SDLC: Plan → Build → Execute → Verify → Validate

### Pre-Deployment Checklist
- [ ] Build passes
- [ ] Tests pass
- [ ] Code reviewed
- [ ] {Additional prerequisites}

### Deployment Steps
{Step-by-step with exact commands from <codebase_stack>}

### Verification Steps
{How to confirm success — logs, smoke tests, URL checks}

### Rollback Procedure
{Steps to revert if deployment fails}

### Open Questions
{Unclear items}
```

## Phase 2: Build

- Run project build command from `<codebase_stack>`
- Verify build produces deployable artifacts
- FAILS: debug, fix build issues, rebuild
- PASSES: proceed to Execute

## Phase 3: Execute

- Run pre-deployment checklist (all items must pass)
- Execute deployment using project's deploy command from `<codebase_stack>`
- For CI/CD setup: apply pipeline configuration changes
- For environment config: deploy service configs, CDN/caching rules
- If environment not running: notify user and stop

## Phase 4: Verify

- Check application logs for errors immediately after deployment
- Confirm latest code is active (check bundle versions, component rendering)
- Run smoke tests: key pages load, critical functionality works
- If verification FAILS: debug, fix, and redeploy (back to Execute)
- If verification PASSES: proceed to Validate

## Phase 5: Validate

- Invoke validation-tester against the deployed environment
- validation-tester runs high-level validation first, then detailed if high-level passes
- If validation FAILS: report failures, hand back to dev agents for fixes, then re-deploy
- If validation PASSES: deployment is complete
- Report final status: deployment target, verification results, validation results
