---
name: refresh-win-package
description: Use when car-parts-scraper changes need to reach the shop's Windows PC — rebuilds renocar-win-package/ from the scraper sources and repackages renocar-scraper-win.zip, with mandatory credential-handling checks.
---

# Refresh the Windows scraper bundle

`renocar-win-package/` is a self-contained runtime for the shop PC: built scraper `dist/` +
portable `node/node.exe` + production `node_modules/` + `start.bat` + a copy of the scraper's
`package.json`. `renocar-scraper-win.zip` at repo root is the shippable artifact (zip root is
the `renocar-win-package/` folder itself — verified). Never hand-edit files inside the bundle.

## SECURITY GATE — resolve before rebuilding

The currently shipped bundle has real vendor credentials **hardcoded in
`renocar-win-package/dist/server.js` (~lines 184–202)** — flagged critical in
`docs/engineering-capabilities-review.md`. `start.bat` sets no env vars, so a clean rebuild
from source produces a bundle that cannot log in to Inter Cars/APCAT/Auto-Partner.

- NEVER re-hardcode credentials into `dist/server.js`, and never commit or zip real values.
- TODO(owner): pick a credential mechanism for the shop PC before the next refresh — e.g. a
  git-ignored `credentials.bat`/`.env` that `start.bat` sources before launching, created
  manually on the PC. Ask the owner rather than choosing silently.
- If the old credentials were ever distributed in the zip, treat them as leaked (rotate).

## Procedure

Steps 1–3 and 6 are verified against the repo; 4–5 are inferred from the bundle layout —
confirm on the shop PC after the first refresh.

1. Build the scraper:
   `cd "car-parts-scraper" && npm install && npm run build` (tsc + copies `src/public` → `dist/`).
2. Replace bundle code:
   `rm -rf "renocar-win-package/dist" && cp -R "car-parts-scraper/dist" "renocar-win-package/dist"`.
3. Sync manifest: `cp "car-parts-scraper/package.json" "renocar-win-package/package.json"`
   (the two files are currently identical; keep them so).
4. Only if `dependencies` changed: refresh production deps with
   `cd "renocar-win-package" && npm install --omit=dev`. Deps are pure-JS (cheerio, express,
   playwright wrappers) so building on macOS is OK; Chromium itself is downloaded on the PC at
   first run by `start.bat` (`PLAYWRIGHT_BROWSERS_PATH`, `playwright/cli.js install chromium`).
5. Leave `node/` (portable Node runtime) and `start.bat` untouched.
6. Repackage from repo root:
   `rm renocar-scraper-win.zip && zip -r renocar-scraper-win.zip renocar-win-package`.

## Verify

On the shop PC: unzip, run `start.bat`, open `http://localhost:3000`, run one search per
vendor tab. There is no automated test for the bundle — say so in your summary instead of
claiming it verified.
