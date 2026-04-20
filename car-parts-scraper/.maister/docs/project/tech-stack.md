# Technology Stack

## Overview
This document describes the technology choices and rationale for Car Parts Aggregator.

## Languages

### TypeScript (5.4)
- **Usage**: 100% of backend codebase
- **Rationale**: Type safety for complex scraper logic, strict mode catches errors at compile time
- **Key Features Used**: Strict mode, ES2022 target, ESM modules, interface-based typing

### JavaScript (ES6+)
- **Usage**: Frontend (vanilla, no framework)
- **Rationale**: Lightweight client-side logic without framework overhead for a simple UI

## Frameworks

### Frontend
- **None (Vanilla JavaScript)** — Static HTML/JS served by Express
  - Rationale: Simple UI requirements (search form, tabbed results) don't justify a framework

### Backend
- **Express 4.18.2** — REST API server
  - Rationale: Lightweight, well-known, sufficient for routing scrape requests to vendor modules

### Testing
- None configured (opportunity for improvement)

## Database
None — this is a scraper/aggregator with no persistent data layer. Search history is stored client-side in localStorage.

## Build Tools & Package Management

| Tool | Purpose |
|------|---------|
| npm | Package management (package-lock.json) |
| tsc (TypeScript Compiler) | Production builds to dist/ |
| tsx 4.7.0 | Development runtime (watch mode, no build step) |

## Infrastructure

### Containerization
Not configured (runs as a Node.js process).

### CI/CD
Not configured.

### Hosting
Local/self-hosted (Express server on PORT 3000).

## Development Tools

### Linting & Formatting
Not configured (opportunity: ESLint + Prettier).

### Type Checking
- TypeScript strict mode enabled
- Declaration maps for IDE navigation
- Source maps for debugging

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| playwright | 1.50.0 | Headless browser automation for web scraping |
| playwright-extra | 4.3.6 | Plugin system for Playwright |
| puppeteer-extra-plugin-stealth | 2.11.2 | Bot detection avoidance |
| cheerio | 1.0.0-rc.12 | Server-side HTML parsing (DOM extraction) |
| express | 4.18.2 | REST API server |
| tsx | 4.7.0 | TypeScript execution (dev) |

## Version Management
- Caret (^) version ranges for most dependencies
- package-lock.json for deterministic installs
- Node.js ES2022 target

---
*Last Updated*: 2026-04-20
*Auto-detected*: Language, framework, dependencies, build tools, TypeScript config
