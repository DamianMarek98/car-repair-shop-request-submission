import { type BrowserContext, type Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { parseInterPartsHTML, InterPartsProductData } from './interPartsParser.js';

// Apply stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

// Persistent browser data directory (stores cookies, sessions across runs)
const USER_DATA_DIR = path.resolve(process.cwd(), '.browser-data-inter-cars');

export interface ScrapeResult {
  success: boolean;
  data: InterPartsProductData[];
  error?: string;
}

export interface InterCarsLoginConfig {
  loginUrl: string;
  email: string;
  password: string;
}

export interface ScraperConfig {
  searchQuery: string;
  login?: InterCarsLoginConfig;
  headless: boolean;
}

async function login(page: Page, config: ScraperConfig['login']): Promise<void> {
  if (!config) return;

  // Step 1: Navigate to login page
  console.log(`Navigating to login page: ${config.loginUrl}`);
  await page.goto(config.loginUrl, { waitUntil: 'networkidle' });

  // Check if user is already logged in
  const isLoggedIn = await page.locator('.headermenu__triggerlabeltext').count() > 0;

  if (isLoggedIn) {
    const companyName = await page.locator('.headermenu__triggerlabeltext').first().textContent();
    console.log(`Already logged in as: ${companyName?.trim()}`);
    return;
  }

  // User not logged in, proceed with login flow
  console.log('Entering email address...');
  await page.fill('#usernameUserInput', config.email);
  await page.click('input[data-testid="identifier-auth-continue-button"]');

  // Step 2: Wait for password page and enter password
  console.log('Waiting for password page...');
  await page.waitForSelector('#password', { timeout: 10000 });

  console.log('Entering password...');
  await page.fill('#password', config.password);
  await page.click('#sign-in-button');

  console.log('Login completed');
}

async function searchAndScrape(page: Page, query: string): Promise<InterPartsProductData[]> {
  // Step 1: Type into search field
  console.log(`Searching for: ${query}`);
  await page.waitForSelector('input[name="query"]', { timeout: 60000 });
  await page.fill('input[name="query"]', query);

  // Step 2: Click search button
  await page.click('[data-testid="header-search-button-submit"]');

  // Step 3: Wait for results to load
  console.log('Waiting for search results...');
  await page.waitForSelector('tbody[data-product-code]', { timeout: 15000 });

  // Step 3.1: Wait for price data to load (optional - don't fail if timeout)
  console.log('Waiting for price data to load...');
  try {
    await page.waitForResponse(
      (response) => response.url().includes('/api/product/price/missing') && response.status() === 200,
      { timeout: 10000 }
    );
    console.log('Price data loaded successfully');
  } catch (error) {
    console.log('Price data timeout - continuing anyway');
  }

  // Step 3.2: Wait for availability data to load (optional - don't fail if timeout)
  console.log('Waiting for availability data to load...');
  try {
    await page.waitForResponse(
      (response) => response.url().includes('/api/product/availability') && response.status() === 200,
      { timeout: 10000 }
    );
    console.log('Availability data loaded successfully');
  } catch (error) {
    console.log('Availability data timeout - continuing anyway');
  }

  // Step 3.3: Wait for DOM to update with loaded data
  console.log('Waiting for DOM to update with data...');
  await page.waitForTimeout(2000);

  // Step 4: Get full page HTML content
  console.log('Capturing page HTML...');
  const htmlContent = await page.content();

  // Step 5: Parse HTML using the parser
  console.log('Parsing product data...');
  const products = parseInterPartsHTML(htmlContent);

  console.log(`Found ${products.length} product(s)`);

  return products;
}

export async function runScraper(config: ScraperConfig): Promise<ScrapeResult> {
  let context: BrowserContext | undefined;

  try {
    console.log(`Launching browser (persistent profile: ${USER_DATA_DIR})...`);
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: config.headless,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      args: ['--window-size=1,1', '--window-position=-32000,-32000', '--start-minimized', '--disable-features=CalculateNativeWinOcclusion', // prevents Windows from snapping off-screen windows back
        '--no-first-run',      // skips the "welcome" screen that can steal focus
        '--no-default-browser-check'],
    });

    const page: Page = context.pages()[0] ?? await context.newPage();

    // Perform login if credentials provided
    if (config.login) {
      await login(page, config.login);
    }

    // Search and scrape product codes
    const data = await searchAndScrape(page, config.searchQuery);
    console.log(`Scraped ${data.length} record(s)`);

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Scraper error: ${message}`);
    return { success: false, data: [], error: message };
  } finally {
    await context?.close();
  }
}

// --- Entry point (only when run directly, not when imported by the server) ---

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const config: ScraperConfig = {
    searchQuery: process.env.SEARCH_QUERY ?? '8200505191',
    headless: false,
    login: {
      loginUrl: 'https://pl.e-cat.intercars.eu/pl/',
      email: process.env.INTERCARS_EMAIL ?? '',
      password: process.env.INTERCARS_PASSWORD ?? '',
    },
  };

  runScraper(config).then((result) => {
    if (result.success) {
      console.log('Scrape completed successfully!');
      console.log(`Found ${result.data.length} products\n`);

      // Display results in console table
      const tableData = result.data.map((product, index) => ({
        index: index + 1,
        sku: product.sku,
        manufacturer: product.manufacturer,
        quantities: product.quantities.join(', '),
        branchAvailability: product.branchAvailability.join(', '),
        routeDeparture: product.routeDeparture.join(', '),
        stock: product.stock,
        priceGross: product.priceGross,
        priceRetail: product.priceRetail,
      }));

      console.table(tableData);

      if (result.data.length > 0) {
        console.log('\n=== Detailed view of first product ===');
        console.log(JSON.stringify(result.data[0], null, 2));
      }
    } else {
      console.error('Scraping failed:', result.error);
      process.exit(1);
    }
  });
}
