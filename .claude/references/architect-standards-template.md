# Project Standards Document

**Template for Project Architects**

This document captures the technical standards, patterns, and conventions that all developers must follow when working on this project. Fill out each section and provide it to the APEX Framework via `/initialize-setup <path-to-document>`. The framework accepts both PDF and markdown files.

The framework reads this document and configures all AI agents to follow your project's exact patterns — ensuring consistent, architecture-compliant implementations across the team.

**Instructions:**
1. Fill out all sections below with your project's actual standards
2. Remove instructional text (in italics) after filling each section
3. Save as markdown (.md) or export to PDF (.pdf) — either format works
4. Run `/initialize-setup path/to/your-project-standards.md` (or `.pdf`) in the framework
5. After filling this out, the framework reads the document and populates agent context automatically — agents then follow your exact patterns

When you run `/initialize-setup` with this document, the framework maps your input to these locations:
- Section 1 → `<project_context>` in `CLAUDE.md`
- Section 2 → `<codebase_stack>` in `CLAUDE.md`
- Section 3 → `.claude/rules/code-standards.md`
- Section 4 → project context or code standards, depending on the content type
- Typical examples: accessibility, performance, and security expectations usually land in code standards; delivery model, branching, and team-process constraints usually land in project context

---

## 1. Project Context

### 1.1 Project Identity

**Project Name:**
_e.g., Acme Corporate Website_

**Organization:**
_e.g., Acme Corporation, Digital Experience Team_

**Project Purpose:**
_1-2 sentences describing what this project is and who it serves._
_e.g., "Corporate website for Acme Corporation serving investor relations, product information, and careers content to external audiences across 12 markets."_

### 1.2 Architecture

**Architecture Pattern:**
_Select one: Headful CMS / Headless CMS / Hybrid (headful + headless) / SPA (Single Page Application) / Microservices / Monolith / Serverless / Other_

**Architecture Description:**
_Describe the high-level architecture in 2-3 sentences._
_e.g., "Composable BigCommerce + Catalyst architecture. Catalog and customer data come from BigCommerce GraphQL Storefront API. Catalyst (Next.js 14 App Router) renders RSC pages on Vercel. Visual editing via Makeswift. All commerce mutations go through server actions."_

**Key Architectural Decisions:**
_List 3-5 major decisions that affect how developers build._
_e.g.:_
- _All catalog data fetched in RSC; client components consume serialised props only_
- _All mutations are server actions — no client-side calls to GraphQL Storefront or REST Management API_
- _Multi-storefront via per-request channel resolution; cart cookies isolated per channel_
- _Vercel CDN + Next.js cache with tag-based invalidation; customer-scoped queries are no-store_

### 1.3 Constraints and Rules

_List any hard constraints that developers must follow._
_e.g.:_
- _No third-party JavaScript libraries without architecture review_
- _All components must pass WCAG 2.2 AA accessibility audit_
- _No raw `fetch` to the BC GraphQL endpoint — use the typed `client.fetch` with gql.tada_
- _Maximum LCP page weight: 500KB initial load_

---

## 2. Technology Stack

### 2.1 Backend / Data Layer

**Language:** _e.g., TypeScript 5.x_
**Runtime:** _e.g., Node.js 24 / Edge runtime where applicable_
**Framework:** _e.g., Next.js 14 App Router / Catalyst (canary or release)_
**Package Manager:** _e.g., pnpm + Turborepo_
**Key Dependencies:** _e.g., gql.tada, Conform, Zod, Auth.js v5, next-intl_
**API Style:** _BigCommerce GraphQL Storefront via `client.fetch` (gql.tada); server actions for mutations; route handlers for webhooks_

**Build Command:**
```
pnpm build
```

**Deploy Command:**
```
git push (Vercel auto-deploy) — or `vercel deploy --prod` for direct deploys
```

### 2.2 Frontend

**Framework:** _e.g., React 18 / 19 via Catalyst on Next.js 14 App Router (RSC + Client Components)_
**Styling:** _e.g., Tailwind CSS, composed via `cn()` helper (`clsx` + `tailwind-merge`)_
**Scripting:** _e.g., TypeScript 5.x_
**Build Tool:** _e.g., Next.js compiler (Turbopack/Webpack)_
**Component Library:** _e.g., Storybook 8.x / None_
**Design System:** _e.g., Custom design system based on Figma / Makeswift / None_

**Frontend Build Command:**
```
pnpm build
```

**Storybook Command (if applicable):**
```
pnpm storybook
```

### 2.3 Testing

**Unit Test Framework:** _e.g., Vitest + React Testing Library + MSW for unit/integration_
**E2E Test Framework:** _e.g., Playwright_
**Test Naming Convention:** _e.g., `{name}.test.ts(x)`, `describe / it` with behaviour-named assertions_
**Minimum Coverage Target:** _e.g., 80% line coverage for all new code_

**Test Command:**
```
pnpm test
```

### 2.4 Infrastructure

**Cloud Platform:** _e.g., Vercel / Netlify / Cloudflare Pages / self-hosted Node_
**CI/CD:** _e.g., GitHub Actions + Vercel pipeline_
**Environments:** _e.g., local (`pnpm dev`), preview (`https://<branch>-<project>.vercel.app/`), production (`https://www.example.com`)_
**CDN:** _e.g., Vercel Edge Network / Cloudflare / Fastly_
**Caching layer:** _e.g., Next.js cache (tag-based) backed by Vercel data cache_

---

## 3. Code Standards

### 3.1 Naming Conventions

**TypeScript Modules:** _e.g., kebab-case file names; named exports preferred; one component per file_
**Functions / Variables:** _e.g., camelCase; constants UPPER_SNAKE_CASE_
**Types / Interfaces / Components:** _e.g., PascalCase; file name matches default export_
**CSS / Tailwind:** _e.g., utility-first via `cn()` helper; component-specific BEM (cmp-{component}__{element}--{modifier}) only when bypassing Tailwind_
**File Names:** _e.g., Component folders kebab-case (`product-card/`), files `index.tsx`, `card.stories.tsx`_
**GraphQL Operations:** _e.g., one query/fragment per file under `core/client/queries/` or `core/client/fragments/`_
**Env Files:** _e.g., `.env.local` for dev, Vercel env vars per environment_

### 3.2 Component File Structure

_Show the exact directory layout for a typical component in your project._

**Example for a custom content component:**
```
core/components/
  hero/
    index.tsx                (React Server or Client component)
    hero.stories.tsx         (Storybook story)
    hero.test.tsx            (Vitest + RTL)
    hero.module.css          (optional CSS Module if not Tailwind-only)
```

**Example for a Catalyst page (RSC):**
```
core/app/(default)/products/[slug]/
  page.tsx                   (RSC fetching via client.fetch + gql.tada)
  loading.tsx                (Suspense fallback)
  error.tsx                  (Error boundary)
```

### 3.3 Component Props / Schema

_Show the exact prop / schema pattern your project uses._

**Standard component prop pattern:**
```tsx
import type { ReactNode } from 'react';

export interface HeroProps {
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  children?: ReactNode;
}

export function Hero({ title, description, cta, children }: HeroProps) {
  // ...
}
```

_Are props validated at runtime (Zod for server actions)? What's the typical prop count? Optional vs required defaults?_

### 3.4 Service / Data Layer Patterns

_Show the exact data layer pattern your project uses._

**Standard typed GraphQL query (gql.tada):**
```tsx
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const HeroQuery = graphql(`
  query Hero($entityId: Int!) {
    site {
      product(entityId: $entityId) {
        name
        defaultImage { url(width: 1200) altText }
      }
    }
  }
`);

export async function getHero(entityId: number) {
  const { data } = await client.fetch({
    document: HeroQuery,
    variables: { entityId },
    fetchOptions: { next: { tags: ['product', `product-${entityId}`] } },
  });
  return data.site.product;
}
```

_Does the project use fragment masking? Where do shared fragments live? What's the convention for query-vs-action split?_

### 3.5 Frontend Patterns

**CSS / Tailwind Pattern:**
_e.g., "Tailwind utility-first with `cn()` helper for composition. Design tokens in `tailwind.config.ts` extend theme. Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)."_

**JavaScript / Client Component Pattern:**
_e.g., "RSC default. Client components opt in via `'use client'` only for interactivity. Custom hooks live in `core/hooks/`. Lazy-load heavy client widgets with `next/dynamic`."_

**Template Pattern (if applicable):**
_e.g., "JSX/TSX exclusively. Server-rendered HTML via RSC. Layouts in `core/app/<group>/layout.tsx`."_

### 3.6 Pattern Categories

_If your project has different patterns for different types of work, document each separately._

**Structural / Platform Components:**
_List which components follow this pattern and describe the convention._
_e.g., "Page layouts, route groups, navigation, breadcrumb. These wrap children and delegate rendering to lower-level primitives. No data fetching beyond layout-level metadata."_

**Content-Rendering / Custom Components:**
_List which components follow this pattern and describe the convention._
_e.g., "Hero, card, teaser, accordion, tabs, carousel, CTA banner. These use the full component file structure (Section 3.2), explicit prop types, dedicated GraphQL fragments where data-driven, and Tailwind utility classes."_

**Service / Integration Modules:**
_Describe backend service conventions._
_e.g., "All BigCommerce calls go through `client.fetch` with gql.tada documents. Server actions live in `core/lib/actions/`. Webhook handlers live in `core/app/api/webhooks/<event>/route.ts` with `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`. Services unit-tested with Vitest + MSW."_

### 3.7 Test Patterns

**Test Location:** _e.g., co-located `{name}.test.ts(x)` next to source files_
**Test File Naming:** _e.g., `{name}.test.ts` for units, `{name}.spec.ts` for Playwright_
**Test Naming:** _e.g., describe/it blocks with behaviour-named assertions ("returns null when slug not found")_
**Mock Setup:** _e.g., MSW handlers for BigCommerce GraphQL/REST; `vi.mock` for Next.js helpers (next/headers, next/cache, next/navigation)_
**Assertion Style:** _e.g., Vitest expect API (`expect().toBe()`, `expect().toHaveBeenCalled()`)_

**Example test skeleton:**
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders the title when provided', () => {
    render(<Hero title="Expected Title" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Expected Title');
  });
});
```

---

## 4. Additional Standards (Optional)

### 4.1 Accessibility Requirements
_e.g., WCAG 2.2 AA compliance required. All images must have alt text. All interactive elements must be keyboard navigable. Color contrast minimum 4.5:1._

### 4.2 Performance Requirements
_e.g., Lighthouse score >= 90. LCP < 2.5s. CLS < 0.1. Total page weight < 500KB. No render-blocking resources._

### 4.3 Security Requirements
_e.g., No inline event handlers. All user input validated server-side via Zod. No hardcoded credentials. CSP headers required. XSS prevention via React auto-escaping; `dangerouslySetInnerHTML` only with sanitized server-rendered content._

### 4.4 Internationalization (i18n)
_e.g., All user-facing strings must use `next-intl` message keys. Locale routing prefix: `/en/`, `/fr/`, `/de/`. Channel resolution per locale where multi-storefront. Right-to-left support required for Arabic._

### 4.5 Git and Branching
_e.g., GitFlow: feature/* branches from develop, release/* for releases. Commit message format: "TYPE(scope): description" (feat, fix, refactor, test, docs). PRs require 2 approvals._

---

**End of Template**

_After filling out this document:_
1. _Remove all instructional text (italicized guidance)_
2. _Save as markdown (.md) or export to PDF (.pdf)_
3. _Run: /initialize-setup path/to/your-project-standards.md (or .pdf)_
