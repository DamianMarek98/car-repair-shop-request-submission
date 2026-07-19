# car-parts-scraper — parts price aggregation (Playwright + Express)

TypeScript ESM app that logs into three Polish parts vendors — **Inter Cars ("inter-parts"),
APCAT, Auto-Partner** — scrapes prices for an OEM part number, and serves a unified search UI.
Stack: Playwright (`playwright-extra` + stealth plugin), Cheerio for HTML parsing, Express +
vanilla-JS frontend (`src/public/`). No database; search history is browser localStorage.
See `README.md` for API details (note: its endpoint/env tables predate Auto-Partner support).

## Commands (verified from package.json)

```bash
npm install && npx playwright install chromium
npm run dev          # tsx src/server.ts -> http://localhost:3000
npm run dev:watch    # same, restarts on change
npm run build        # tsc + copies src/public -> dist/public
npm start            # node dist/server.js (requires build)
npm run parse-interparts | parse-apcat   # run a parser against the checked-in *-test.html fixture
```

Known-broken: `npm run scrape` points at `src/scraper.ts`, which **does not exist** (root
`npm run scrape` is broken for the same reason). Don't use it; run a vendor scraper directly,
e.g. `SEARCH_QUERY=8200505191 npx tsx src/inter-parts/interPartsScraper.ts` (plus that
vendor's credential env vars).

## Env vars (names only — never hardcode credentials)

`INTERCARS_EMAIL`, `INTERCARS_PASSWORD`, `APCAT_USERNAME`, `APCAT_PASSWORD`,
`AUTO_PARTNER_USERNAME`, `AUTO_PARTNER_PASSWORD`, `PORT` (default 3000), `SEARCH_QUERY`
(standalone scraper runs only).

## Architecture

- Per-vendor module pair under `src/<vendor>/`: `*Scraper.ts` (Playwright login + navigation,
  exports `create<Vendor>Context` / `login<Vendor>`) and `*Parser.ts` (pure Cheerio HTML →
  typed results; testable offline against the `*-test.html` fixture in the same dir). Follow
  this pair pattern when adding a vendor.
- `src/browserSessionManager.ts` — keeps one logged-in persistent `BrowserContext` per vendor,
  with a busy flag + queue so concurrent requests serialize per vendor. Each vendor persists
  its session in `.browser-data-<vendor>/` in the CWD (gitignored profile dirs) so logins
  survive restarts.
- `src/server.ts` — endpoints: `POST /api/scrape/inter-parts`, `POST /api/scrape/apcat`,
  `POST /api/scrape/auto-partner` (body: `{ "searchQuery": "...", "headless": bool }`),
  `GET /api/health`; serves `src/public/` statically.
- `src/index.ts` — public re-exports.

## Conventions & pitfalls

- ESM (`"type": "module"`): relative imports **must** use `.js` extensions in `.ts` source.
- Vendor sites change; scrapers use stealth + real login sessions. If a scraper breaks, save
  the page HTML into the vendor's `*-test.html` and fix the parser offline first.
- Delete a `.browser-data-<vendor>/` dir to force a fresh login for that vendor.
- Windows distribution: `scripts/build-win-package.sh` (run from this dir) rebuilds
  `../renocar-win-package/` and `../renocar-scraper-win.zip` — see the
  `refresh-win-package` skill. The empty `renocar-win-package/` dir inside this module is a
  stray artifact; the real one is at repo root.

## Coding Standards & Conventions

Read @.maister/docs/INDEX.md before starting any task. It indexes the project's coding standards and conventions:
- Coding standards organized by domain (frontend, backend, testing, etc.)
- Project vision, tech stack, and architecture decisions

Follow standards in `.maister/docs/standards/` when writing code — they represent team decisions. If standards conflict with the task, ask the user.

### Standards Evolution

When you notice recurring patterns, fixes, or conventions during implementation that aren't yet captured in standards — suggest adding them. Examples:
- A bug fix reveals a pattern that should be standardized (e.g., "always validate X before Y")
- PR review feedback identifies a convention the team wants enforced
- The same type of fix is needed across multiple files
- A new library/pattern is adopted that should be documented

When this happens, briefly suggest the standard to the user. If approved, invoke `/maister:standards-update` with the identified pattern.

## Maister Workflows

This project uses the maister plugin for structured development workflows. When any `/maister:*` command is invoked, execute it via the Skill tool immediately — do not skip workflows for "straightforward" tasks. The user chose the workflow intentionally; complexity assessment is the workflow's job.
