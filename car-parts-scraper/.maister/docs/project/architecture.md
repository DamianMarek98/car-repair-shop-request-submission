# System Architecture

## Overview
Car Parts Aggregator is a fullstack application that scrapes car part prices from multiple vendor websites, aggregating results into a unified search interface. It uses a modular plugin-based architecture where each vendor has its own scraper + parser module.

## Architecture Pattern
**Pattern**: Modular plugin-based with REST API gateway

The system follows a simple but effective pattern: an Express API server acts as the gateway, routing search requests to vendor-specific scraper modules. Each vendor module encapsulates its own authentication flow, navigation logic, and HTML parsing.

## System Structure

### API Server
- **Location**: `src/server.ts`
- **Purpose**: Express REST API — routes requests, serves static frontend, handles errors
- **Key Endpoints**:
  - `POST /api/scrape/inter-cars` — Inter Parts scraping
  - `POST /api/scrape/apcat` — APCAT scraping
  - `POST /api/scrape/auto-partner` — Auto Partner scraping
  - `GET /api/health` — Health check

### Vendor Modules
- **Location**: `src/inter-parts/`, `src/apcat/`, `src/auto-partner/`
- **Purpose**: Vendor-specific scraping and parsing logic
- **Pattern**: Each vendor has two files:
  - `{vendor}Scraper.ts` — Playwright browser automation (login, search, extract HTML)
  - `{vendor}Parser.ts` — Cheerio HTML parsing (extract structured product data)

### Frontend UI
- **Location**: `src/public/`
- **Purpose**: Search interface with tabbed vendor results, sorting, filtering
- **Key Files**:
  - `index.html` — Page structure
  - `app.js` — Client-side logic (search history, table rendering, keyboard navigation)

## Data Flow

```
User → Frontend (search form)
  → POST /api/scrape/{vendor} (fetch)
    → Express route handler
      → Scraper module (Playwright: login → search → extract HTML)
        → Parser module (Cheerio: HTML → structured JSON)
      ← JSON response (products array)
    ← Response to client
  → Frontend renders tabbed tables with sort/filter
```

## External Integrations

| Integration | Type | Purpose |
|-------------|------|---------|
| Inter Parts website | Web scraping | Car part catalog and pricing |
| APCAT website | Web scraping | Car part catalog and pricing |
| Auto Partner website | Web scraping | Car part catalog and pricing |

## Configuration
- **Environment variables**: Vendor credentials (INTERCARS_EMAIL, INTERCARS_PASSWORD, etc.)
- **PORT**: Server port (default 3000)
- **Browser data directories**: `.browser-data-{vendor}/` for persistent auth sessions
- **Headless mode**: Configurable per request via API body

## Session Management
Each vendor scraper maintains a persistent browser data directory (`.browser-data-{vendor}/`) to reuse authenticated sessions across requests, avoiding repeated logins.

---
*Based on codebase analysis performed 2026-04-20*
