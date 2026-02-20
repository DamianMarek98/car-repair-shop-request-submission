import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runScraper as runInterPartsScraper, type ScraperConfig as InterPartsScraperConfig, type ScrapeResult as InterPartsScrapeResult } from './inter-parts/interPartsScraper.js';
import { runScraper as runApcatScraper, type ScraperConfig as ApcatScraperConfig, type ScrapeResult as ApcatScrapeResult } from './apcat/apcatScraper.js';
import { runScraper as runAutoPartnerScraper, type ScraperConfig as AutoPartnerScraperConfig, type ScrapeResult as AutoPartnerScrapeResult } from './auto-partner/autoPartnerScraper.js';

// Get __dirname equivalent in ES modules
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request body interface for /api/scrape/inter-parts
interface InterPartsScrapeRequestBody {
  searchQuery: string;
  headless?: boolean;
  login?: {
    loginUrl: string;
    email: string;
    password: string;
  };
}

// Request body interface for /api/scrape/apcat
interface ApcatScrapeRequestBody {
  searchQuery: string;
  headless?: boolean;
  login?: {
    loginUrl: string;
    username: string;
    password: string;
  };
}

// Request body interface for /api/scrape/auto-partner
interface AutoPartnerScrapeRequestBody {
  searchQuery: string;
  headless?: boolean;
  login?: {
    loginUrl: string;
    username: string;
    password: string;
  };
}

/**
 * POST /api/scrape/inter-parts
 * Scrape car parts from Inter Parts
 */
app.post('/api/scrape/inter-parts', async (req: Request<{}, {}, InterPartsScrapeRequestBody>, res: Response) => {
  try {
    const { searchQuery, headless = false, login } = req.body;

    // Validate required fields
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        data: [],
        error: 'searchQuery is required and must be a string'
      });
    }

    // Build scraper config
    const config: InterPartsScraperConfig = {
      searchQuery: searchQuery.trim(),
      headless,
      login: login || {
        loginUrl: 'https://pl.e-cat.intercars.eu/pl/',
        email: process.env.INTERCARS_EMAIL || '',
        password: process.env.INTERCARS_PASSWORD || ''
      }
    };

    // Validate login credentials if provided
    if (config.login && (!config.login.email || !config.login.password)) {
      console.warn('[API/inter-parts] Warning: Missing login credentials. Scraping may fail if login is required.');
    }

    console.log(`[API/inter-parts] Starting scrape for: "${config.searchQuery}" (headless: ${config.headless})`);

    // Run the scraper
    const result: InterPartsScrapeResult = await runInterPartsScraper(config);

    console.log(`[API/inter-parts] Scrape completed. Success: ${result.success}, Products found: ${result.data.length}`);

    // Return results
    res.json(result);

  } catch (error) {
    console.error('[API/inter-parts] Scrape error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      data: [],
      error: errorMessage
    });
  }
});

/**
 * POST /api/scrape/apcat
 * Scrape car parts from APCAT
 */
app.post('/api/scrape/apcat', async (req: Request<{}, {}, ApcatScrapeRequestBody>, res: Response) => {
  try {
    const { searchQuery, headless = false, login } = req.body;

    // Validate required fields
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'searchQuery is required and must be a string'
      });
    }

    // Build scraper config
    const config: ApcatScraperConfig = {
      searchQuery: searchQuery.trim(),
      headless,
      login: login || {
        loginUrl: 'https://apcat.eu/',
        username: process.env.APCAT_USERNAME || '',
        password: process.env.APCAT_PASSWORD || ''
      }
    };

    // Validate login credentials if provided
    if (config.login && (!config.login.username || !config.login.password)) {
      console.warn('[API/apcat] Warning: Missing login credentials. Scraping may fail if login is required.');
    }

    console.log(`[API/apcat] Starting scrape for: "${config.searchQuery}" (headless: ${config.headless})`);

    // Run the scraper
    const result: ApcatScrapeResult = await runApcatScraper(config);

    console.log(`[API/apcat] Scrape completed. Success: ${result.success}, Products found: ${result.data?.length ?? 0}`);

    // Return results
    res.json(result);

  } catch (error) {
    console.error('[API/apcat] Scrape error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      data: null,
      error: errorMessage
    });
  }
});

/**
 * POST /api/scrape/auto-partner
 * Scrape car parts from Auto Partner
 */
app.post('/api/scrape/auto-partner', async (req: Request<{}, {}, AutoPartnerScrapeRequestBody>, res: Response) => {
  try {
    const { searchQuery, headless = false, login } = req.body;

    // Validate required fields
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'searchQuery is required and must be a string'
      });
    }

    // Build scraper config
    const config: AutoPartnerScraperConfig = {
      searchQuery: searchQuery.trim(),
      headless,
      login: login || {
        loginUrl: 'https://katalog.autopartner.pl/',
        username: process.env.AUTO_PARTNER_USERNAME || '',
        password: process.env.AUTO_PARTNER_PASSWORD || ''
      }
    };

    // Validate login credentials if provided
    if (config.login && (!config.login.username || !config.login.password)) {
      console.warn('[API/auto-partner] Warning: Missing login credentials. Scraping may fail if login is required.');
    }

    console.log(`[API/auto-partner] Starting scrape for: "${config.searchQuery}" (headless: ${config.headless})`);

    // Run the scraper
    const result: AutoPartnerScrapeResult = await runAutoPartnerScraper(config);

    console.log(`[API/auto-partner] Scrape completed. Success: ${result.success}, Products found: ${result.data?.length ?? 0}`);

    // Return results
    res.json(result);

  } catch (error) {
    console.error('[API/auto-partner] Scrape error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      data: null,
      error: errorMessage
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /
 * Serve the main HTML page
 */
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('  RENOCAR Car Parts Scraper Server');
  console.log('='.repeat(60));
  console.log(`  🚀 Server running at: http://localhost:${PORT}`);
  console.log(`  📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`  🔍 Inter Parts API: POST http://localhost:${PORT}/api/scrape/inter-parts`);
  console.log(`  🔍 APCAT API:         POST http://localhost:${PORT}/api/scrape/apcat`);
  console.log(`  🔍 Auto Partner API:  POST http://localhost:${PORT}/api/scrape/auto-partner`);
  console.log('='.repeat(60));
  console.log(`  Environment:`);
  console.log(`    - Node version: ${process.version}`);
  console.log(`    - InterCars email configured:    ${process.env.INTERCARS_EMAIL ? 'Yes' : 'No'}`);
  console.log(`    - InterCars password configured: ${process.env.INTERCARS_PASSWORD ? 'Yes' : 'No'}`);
  console.log(`    - APCAT username configured:     ${process.env.APCAT_USERNAME ? 'Yes' : 'No'}`);
  console.log(`    - APCAT password configured:     ${process.env.APCAT_PASSWORD ? 'Yes' : 'No'}`);
  console.log(`    - Auto Partner username configured: ${process.env.AUTO_PARTNER_USERNAME ? 'Yes' : 'No'}`);
  console.log(`    - Auto Partner password configured: ${process.env.AUTO_PARTNER_PASSWORD ? 'Yes' : 'No'}`);
  console.log('='.repeat(60));
  console.log('  Ready to accept requests!');
  console.log('');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
