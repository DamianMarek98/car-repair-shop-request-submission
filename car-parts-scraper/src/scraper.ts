import { type BrowserContext, type Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';

// Apply stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

// Persistent browser data directory (stores cookies, sessions across runs)
const USER_DATA_DIR = path.resolve(process.cwd(), '.browser-data');

export interface ScrapeResult {
  success: boolean;
  data: Record<string, unknown>[];
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

  // Step 1: Navigate to login page and enter email
  console.log(`Navigating to login page: ${config.loginUrl}`);
  await page.goto(config.loginUrl, { waitUntil: 'networkidle' });

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

async function searchAndScrape(page: Page, query: string): Promise<Record<string, unknown>[]> {
  // Step 1: Type into search field
  console.log(`Searching for: ${query}`);
  await page.waitForSelector('input[name="query"]', { timeout: 60000 });
  await page.fill('input[name="query"]', query);

  // Step 2: Click search button
  await page.click('[data-testid="header-search-button-submit"]');

  // Step 3: Wait for results to load
  console.log('Waiting for search results...');
  await page.waitForSelector('tbody[data-product-code]', { timeout: 15000 });

  // Step 4: Extract all product codes from tbody elements
  const productCodes = await page.$$eval('tbody[data-product-code]', (tbodies) =>
    tbodies.map((tbody) => tbody.getAttribute('data-product-code') ?? '')
  );

  console.log(`Found ${productCodes.length} product code(s):`);
  productCodes.forEach((code) => console.log(`  - ${code}`));

  return productCodes.map((code) => ({
    productCode: code,
    query,
    scrapedAt: new Date().toISOString(),
  }));
}

export async function runScraper(config: ScraperConfig): Promise<ScrapeResult> {
  let context: BrowserContext | undefined;

  try {
    console.log(`Launching browser (persistent profile: ${USER_DATA_DIR})...`);
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: config.headless,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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

// --- Entry point ---

const config: ScraperConfig = {
  searchQuery: process.env.SEARCH_QUERY ?? '',
  headless: false,
  login: {
    loginUrl: 'https://pl.e-cat.intercars.eu/pl/',
    email: process.env.INTERCARS_EMAIL ?? 'zmddmarek@gmail.com',
    password: process.env.INTERCARS_PASSWORD ?? '',
  },
};

runScraper(config).then((result) => {
  if (result.success) {
    console.log('Scraping completed successfully:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.error('Scraping failed:', result.error);
    process.exit(1);
  }
});
