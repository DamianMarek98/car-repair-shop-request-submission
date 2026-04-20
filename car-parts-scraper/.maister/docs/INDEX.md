# Documentation Index

**IMPORTANT**: Read this file at the beginning of any development task to understand available documentation and standards.

## Quick Reference

### Project Documentation
Project-level documentation covering vision, goals, architecture, and technology choices.

### Technical Standards
Coding standards, conventions, and best practices organized by domain.

---

## Project Documentation

Located in `.maister/docs/project/`

#### Technology Stack (`project/tech-stack.md`)
TypeScript/Express backend with Playwright browser automation and Cheerio HTML parsing. Vanilla JavaScript frontend. No database — client-side localStorage for search history. Dev tooling: tsx for development, tsc for production builds, npm for package management.

#### System Architecture (`project/architecture.md`)
Modular plugin-based architecture with Express REST API gateway. Each vendor (Inter Parts, APCAT, Auto Partner) has a dedicated scraper module (Playwright automation) and parser module (Cheerio HTML extraction). Frontend serves as a unified search interface with tabbed vendor results.

---

## Technical Standards

### Global Standards

Located in `.maister/docs/standards/global/`

#### Coding Style (`standards/global/coding-style.md`)
Naming consistency, automatic formatting, descriptive names, focused functions, uniform indentation, no dead code, no unnecessary backward compatibility, and DRY principles.

#### Commenting (`standards/global/commenting.md`)
Let code speak through structure and naming, comment sparingly for non-obvious logic, and avoid change-tracking comments.

#### Development Conventions (`standards/global/conventions.md`)
Predictable project structure, up-to-date documentation, clean version control, environment variables, minimal dependencies, consistent reviews, testing standards, feature flags, changelog updates, and building only what is needed.

#### Error Handling (`standards/global/error-handling.md`)
Clear user messages, fail fast on invalid state, typed exceptions, centralized handling, graceful degradation, retry with backoff, and resource cleanup.

#### Minimal Implementation (`standards/global/minimal-implementation.md`)
Build what you need, clear purpose for every artifact, delete exploration artifacts, no future stubs, no speculative abstractions, review before commit, and treating unused code as debt.

#### Validation (`standards/global/validation.md`)
Server-side always, client-side for feedback, validate early, specific errors, allowlists over blocklists, type and format checks, input sanitization, business rules, and consistent enforcement.

#### Naming Conventions (`standards/global/naming.md`)
camelCase for TypeScript source files (e.g., interPartsParser.ts), kebab-case for feature directories (e.g., inter-parts/).

#### Import Conventions (`standards/global/imports.md`)
External packages first then relative local imports. Use inline `type` keyword for type-only imports.

### Frontend Standards

Located in `.maister/docs/standards/frontend/`

#### Accessibility (`standards/frontend/accessibility.md`)
Semantic HTML, keyboard navigation, color contrast, alt text and labels, screen reader testing, ARIA when needed, heading structure, and focus management.

#### Components (`standards/frontend/components.md`)
Single responsibility, reusability, composability, clear interface, encapsulation, consistent naming, local state, minimal props, and documentation.

#### CSS (`standards/frontend/css.md`)
Consistent methodology, work with the framework, design tokens, minimize custom CSS, and production optimization.

#### Responsive Design (`standards/frontend/responsive.md`)
Mobile-first approach, standard breakpoints, fluid layouts, relative units, cross-device testing, touch-friendly targets, mobile performance, readable typography, and content priority.

### Backend Standards

Located in `.maister/docs/standards/backend/`

#### API Design (`standards/backend/api.md`)
RESTful principles, consistent naming, versioning, plural nouns, limited nesting, query parameters, proper status codes, and rate limit headers.

#### Database Migrations (`standards/backend/migrations.md`)
Reversible migrations, small and focused changes, zero-downtime awareness, separate schema and data, careful indexing, descriptive names, and version control.

#### Models (`standards/backend/models.md`)
Clear naming, timestamps, database constraints, appropriate types, index foreign keys, multi-layer validation, clear relationships, and practical normalization.

#### Database Queries (`standards/backend/queries.md`)
Parameterized queries, avoid N+1, select only needed columns, index strategic columns, transactions, query timeouts, and cache expensive queries.

#### TypeScript Conventions (`standards/backend/typescript.md`)
ESM with .js extensions for relative imports, interface over type for object shapes, named async function declarations for core logic, arrow functions for route handlers, and direct-run guard pattern with import.meta.url.

#### Backend Patterns (`standards/backend/patterns.md`)
Scraper+Parser module pair per vendor, JSON response envelope with success/data/error, try-catch with instanceof Error, and console logging with bracket tags [Layer/Module].

### Testing Standards

Located in `.maister/docs/standards/testing/`

#### Test Writing (`standards/testing/test-writing.md`)
Test behavior not implementation, clear names, mock external dependencies, fast execution, risk-based testing, balance coverage and velocity, critical path focus, and appropriate depth.

---

## How to Use This Documentation

1. **Start Here**: Always read this INDEX.md first to understand what documentation exists
2. **Project Context**: Read relevant project documentation before starting work
3. **Standards**: Reference appropriate standards when writing code
4. **Keep Updated**: Update documentation when making significant changes
5. **Customize**: Adapt all documentation to your project's specific needs

## Updating Documentation

- Project documentation should be updated when goals, tech stack, or architecture changes
- Technical standards should be updated when team conventions evolve
- Always update INDEX.md when adding, removing, or significantly changing documentation
