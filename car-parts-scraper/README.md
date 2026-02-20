# Car Parts Scraper

Playwright-based scraper for car parts aggregation from Inter Parts and APCAT.

---

## Setup

```bash
cd car-parts-scraper
npm install
npx playwright install chromium
```

---

## Environment variables

Create a `.env` file or export variables in your shell before running:

| Variable             | Description                        |
|----------------------|------------------------------------|
| `INTERCARS_EMAIL`    | Inter Cars login e-mail            |
| `INTERCARS_PASSWORD` | Inter Cars login password          |
| `APCAT_USERNAME`     | APCAT login username               |
| `APCAT_PASSWORD`     | APCAT login password               |

---

## Running the web app (server + frontend)

The server exposes a REST API and serves the frontend (`src/public/`) as static files.

### Development mode (recommended)

Starts the server with `tsx` — no build step needed, auto-reloads on file changes:

```bash
INTERCARS_EMAIL=your@email.com \
INTERCARS_PASSWORD=yourpass \
APCAT_USERNAME=yourusername \
APCAT_PASSWORD=yourpass \
npm run dev
```

Then open **http://localhost:3000** in your browser.

### Watch mode

Same as dev, but automatically restarts when source files change:

```bash
INTERCARS_EMAIL=your@email.com \
INTERCARS_PASSWORD=yourpass \
APCAT_USERNAME=yourusername \
APCAT_PASSWORD=yourpass \
npm run dev:watch
```

### Production mode

Build first, then start the compiled output:

```bash
npm run build

INTERCARS_EMAIL=your@email.com \
INTERCARS_PASSWORD=yourpass \
APCAT_USERNAME=yourusername \
APCAT_PASSWORD=yourpass \
npm start
```

---

## API endpoints

| Method | Path                        | Description                    |
|--------|-----------------------------|--------------------------------|
| `POST` | `/api/scrape/inter-parts`   | Scrape parts from Inter Parts  |
| `POST` | `/api/scrape/apcat`         | Scrape parts from APCAT        |
| `GET`  | `/api/health`               | Health check                   |

### Request body (both scrape endpoints)

```json
{
  "searchQuery": "8200505191",
  "headless": false
}
```

- `searchQuery` — OEM part number to search *(required)*
- `headless` — run browser without a visible window; default `false`

---

## Standalone scraper / parser scripts

Run a scraper directly (without the web server):

```bash
# Inter Parts scraper
INTERCARS_EMAIL=your@email.com INTERCARS_PASSWORD=yourpass SEARCH_QUERY=8200505191 tsx src/inter-parts/interPartsScraper.ts

# APCAT scraper
APCAT_USERNAME=yourusername APCAT_PASSWORD=yourpass SEARCH_QUERY=8200505191 tsx src/apcat/apcatScraper.ts
```

Parse a saved HTML file (useful for development / testing):

```bash
# Parse Inter Parts HTML
npm run parse-interparts

# Parse APCAT HTML (uses src/apcat/apcat-test.html)
npm run parse-apcat
```

---

## Project structure

```
src/
├── server.ts                    # Express server — API + static frontend
├── index.ts                     # Public re-exports
├── public/
│   ├── index.html               # Frontend UI
│   └── app.js                   # Frontend logic
├── inter-parts/
│   ├── interPartsScraper.ts     # Playwright scraper for Inter Parts
│   └── interPartsParser.ts      # Cheerio HTML parser for Inter Parts
└── apcat/
    ├── apcatScraper.ts          # Playwright scraper for APCAT
    ├── apcatParser.ts           # Cheerio HTML parser for APCAT
    └── apcat-test.html          # Sample HTML for parser testing
```
