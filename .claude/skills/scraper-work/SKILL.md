---
name: scraper-work
description: Use when working on car-parts-scraper/ (Playwright vendor scrapers, Cheerio parsers, Express server, or the search UI) — env vars, the scraper/parser pair pattern, persistent browser sessions, and offline parser debugging.
---

# car-parts-scraper work

TypeScript **ESM** project (`"type": "module"` — relative imports need `.js` extensions in
`.ts` source). Also read `car-parts-scraper/CLAUDE.md` and `.maister/docs/INDEX.md` (this
module has its own coding standards).

## Run / build

```bash
cd "car-parts-scraper"
npm install && npx playwright install chromium
npm run dev            # tsx src/server.ts -> http://localhost:3000 (UI + API)
npm run dev:watch      # auto-restart
npm run build          # tsc + copy src/public -> dist/public
npm start              # node dist/server.js
```

`npm run scrape` (module and repo root) is broken — it targets a nonexistent
`src/scraper.ts`. Run a single vendor scraper directly instead:
`SEARCH_QUERY=<oem-number> npx tsx src/<vendor>/<vendor>Scraper.ts` with that vendor's
credential env vars set.

## Env vars (names only; from a `.env` or the shell — never hardcode)

`INTERCARS_EMAIL`, `INTERCARS_PASSWORD`, `APCAT_USERNAME`, `APCAT_PASSWORD`,
`AUTO_PARTNER_USERNAME`, `AUTO_PARTNER_PASSWORD`, `PORT`, `SEARCH_QUERY`.

## Architecture rules

- One directory per vendor (`src/inter-parts/`, `src/apcat/`, `src/auto-partner/`), each with
  a **Scraper** (Playwright: exports `create<Vendor>Context(headless)` + `login<Vendor>(page,
  config)` + the search flow) and a **Parser** (pure Cheerio, no browser). Adding a vendor =
  new pair + a session entry in `browserSessionManager.ts` + a `POST /api/scrape/<vendor>`
  route in `server.ts` + a tab in `src/public/`.
- `src/browserSessionManager.ts` owns one persistent logged-in `BrowserContext` per vendor
  with a busy-flag/queue (requests to the same vendor serialize). Sessions persist in
  `.browser-data-<vendor>/` dirs in the CWD; delete a dir to force re-login. Don't create
  browser contexts outside the session manager in server code.
- API: `POST /api/scrape/{inter-parts,apcat,auto-partner}` with
  `{ "searchQuery": "...", "headless": bool }`; `GET /api/health`.

## Debugging workflow (preferred)

Vendor sites change their markup; don't debug parsing through live logins. Save the result
page's HTML into the vendor dir's `*-test.html` fixture, then iterate offline with
`npm run parse-interparts` / `npm run parse-apcat` (add an equivalent script if you add a
vendor). Only after the parser passes on the fixture, verify the live scraper. The stealth
plugin (`playwright-extra` + `puppeteer-extra-plugin-stealth`) is required for logins — keep
it when touching context creation.

## Relation to renocar-win-package

The shop's PC runs this app via the root-level `renocar-win-package/` bundle (built `dist/` +
portable node.exe + `start.bat`). After scraper changes that should reach the shop, rebuild it
with the `refresh-win-package` skill. Never hand-edit `renocar-win-package/` or
`renocar-scraper-win.zip`.
