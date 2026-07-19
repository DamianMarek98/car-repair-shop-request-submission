# CLAUDE.md

Guidance for AI agents working in this repository.

## What this is

A car repair shop platform: clients submit repair requests online, the shop's
receptionist manages them, plus side tools for parts price aggregation and
AI-assisted DB querying. Live at https://renocar-zgloszenie.pl/.

Backend is a Spring Boot **modular monolith (DDD)** plus serverless Lambdas on AWS
(API Gateway, Lambda, DynamoDB, SNS, Route53, CloudFront). Migrated from EC2 to
serverless for cost.

## Modules

| Path | Tech | Purpose |
|------|------|---------|
| `car-repair-shop-backend/shop/` | Java, Spring Boot, Maven | **Core monolith.** DDD modules: `auth` (JWT login), `repair/request` (request management — controller/events/query), `availability` (appointment-day blocking), `commons`, `config`. Persists to DynamoDB. Runs as Lambda via a RequestStreamHandler bridge. |
| `car-repair-shop-backend/repair-request-submitted-consumer/` | Java, Maven | Lambda for **submitting** a repair request (validation → DynamoDB write). Split out from the monolith to cut cold-start time. |
| `car-repair-shop-backend/new-repair-request-notification-lambda/` | Java, Gradle (Kotlin DSL) | Lambda triggered by DynamoDB stream events; sends **SNS email notifications** to the shop on a new submission. |
| `car-repair-shop-backend/infrastructure/` | Java, Maven | AWS infrastructure-as-code scaffold — currently an **empty placeholder** (no pom/sources); real AWS resources are managed manually. |
| `submission-portal/` | Angular | **Public client form** to submit a repair request (the renocar-zgloszenie.pl frontend). |
| `repair-requests-portal/` | Angular | **Admin/receptionist portal** (auth-guarded) to view and handle submissions. |
| `car-parts-scraper/` | TypeScript, Playwright, Express | Scrapes & aggregates car part prices from **Inter Cars, APCAT, Auto-Partner**. Per-vendor `*Scraper`+`*Parser` under `src/<vendor>/`, shared `browserSessionManager.ts` (persistent logged-in browser sessions), Express web UI in `src/server.ts` + `src/public/`. |
| `renocar-win-package/` | Node bundle | Self-contained **Windows distribution of the scraper** (bundled node + built `dist/`, `start.bat`) for the shop's PC. `renocar-scraper-win.zip` is the packaged artifact. |
| `car-repair-shop-ai-chat/` | Python, Streamlit, OpenAI | NL → SQL **query assistant** over a Firebird DB. `app/` = `llm_client`, `query_engine`, `schema_context`, `safety` (query guards), `database`, `models`; `ui/streamlit_app.py` = UI. |
| `renocar-webpage/` | Static HTML/CSS/JS | Marketing/landing site (`httpdocs/`, jQuery bxslider). |

## Commands (root `package.json` orchestrates the JS modules)

```bash
npm run install:submission-portal   # install client portal deps
npm run build:submission-portal     # prod build client portal
npm run install:admin-portal        # install admin portal deps
npm run build:admin-portal          # prod build admin portal
npm run install:scraper             # install scraper deps
npm run build:scraper               # build scraper
# npm run scrape is BROKEN — targets a nonexistent src/scraper.ts; run vendor scrapers directly
```

Per-module:
- **Backend (shop / consumer):** Maven — `mvn test`, `mvn package` (shaded jar for Lambda). No wrapper (`mvnw`) exists — use system `mvn` with JDK 21. `shop` integration tests need Docker (LocalStack).
- **Notification lambda:** Gradle — `./gradlew build`.
- **Scraper:** `npm run dev` (Express dev server), per-vendor `parse-*` scripts.
- **AI chat:** `pip install -r requirements.txt`, `pytest`, `streamlit run car-repair-shop-ai-chat/ui/streamlit_app.py`.
- **Angular portals:** `ng serve` (dev), `ng test`.

## Module guides, skills & docs

- **Every module has its own `CLAUDE.md`** with verified build/test/run commands, layout,
  conventions, and pitfalls — read it before working in that module. `renocar-webpage/` also
  has `ANALYSIS.md` + `PLAN.md` (site audit and fix plan).
- **Repo-level skills** in `.claude/skills/`: `build-and-test-platform`,
  `backend-lambda-work` (incl. the shop⟷consumer sync contract), `angular-portals`,
  `scraper-work`, `refresh-win-package`.
- **Review docs (2026-07)** in `docs/`: engineering & business capability reviews, the
  renocar.pl digital-presence audit, and `consultancy-summary.md` tying them together.

## Conventions & notes

- Backend follows **DDD / modular-monolith** boundaries — keep cross-module access through facades (e.g. `UnavailableDayFacade`), not internals.
- Lambdas are deliberately separate Maven/Gradle projects (cold-start isolation); don't fold their logic back into `shop/`.
- DTOs/converters for DynamoDB live next to their module (e.g. `RepairRequestItemConverter`).
- The scraper logs into vendor sites; credentials come from env vars (`INTERCARS_*`, `APCAT_*`) — never hardcode. See `car-parts-scraper/README.md`.
- `submission-portal/` and `repair-requests-portal/` are independent Angular apps despite the shared form domain.
</content>
</invoke>
