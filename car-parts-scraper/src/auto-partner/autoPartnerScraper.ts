import { type BrowserContext, type Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { parseAutoPartnerHTML, type AutoPartnerProductData } from './autoPartnerParser';

// Apply stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

// Persistent browser data directory (stores cookies, sessions across runs)
const USER_DATA_DIR = path.resolve(process.cwd(), '.browser-data-auto-partner');

export interface ScrapeResult {
  success: boolean;
  data: AutoPartnerProductData[] | null;
  error?: string;
}

export interface AutoPartnerLoginConfig {
  loginUrl: string;
  username: string;
  password: string;
}

export interface ScraperConfig {
  searchQuery: string;
  login?: AutoPartnerLoginConfig;
  headless: boolean;
}

/**
 * Dismiss the "Informacje systemowe" modal if it is visible.
 * Returns true if the modal was found and closed, false otherwise.
 */
async function dismissSystemInfoModal(page: Page): Promise<boolean> {
  const modal = page.locator('#sys-info-modal.in');
  if (await modal.count() > 0) {
    console.log('System info modal detected — closing...');
    await modal.locator('.modal-footer button[data-dismiss="modal"]').click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

async function login(page: Page, config: ScraperConfig['login']): Promise<void> {
  if (!config) return;

  // Step 1: Navigate to login page
  console.log(`Navigating to login page: ${config.loginUrl}`);
  await page.goto(config.loginUrl, { waitUntil: 'networkidle' });

  // Step 2: Check for system info modal (appears when user is already logged in)
  if (await dismissSystemInfoModal(page)) {
    console.log('Already logged in (system modal dismissed)');
    return;
  }

  // Step 3: Check if already logged in (no modal, but user link present)
  const loggedInLink = page.locator('a[href="/account/edit"][title="Zalogowany"]');
  if (await loggedInLink.count() > 0) {
    console.log('Already logged in');
    return;
  }

  // Step 4: Not logged in — fill login form
  console.log('Entering username...');
  await page.fill('#username', config.username);

  console.log('Entering password...');
  await page.fill('#password', config.password);

  // Step 5: Submit the login form
  console.log('Submitting login form...');
  await page.click('button[type="submit"].btn.btn-red.btn-lg');

  // Wait for page to settle after login
  await page.waitForLoadState('networkidle');

  // Step 6: Handle system info modal that may appear after login
  if (await dismissSystemInfoModal(page)) {
    console.log('Post-login system info modal dismissed');
  }

  console.log('Login completed');
}

async function searchAndScrape(page: Page, query: string): Promise<AutoPartnerProductData[]> {
  // Step 1: Fill the search input
  console.log(`Searching for: ${query}`);
  await page.fill('#text-input-searcher', query);

  // Step 2: Click the search button
  console.log('Clicking search button...');
  await page.click('#search-submit');

  // Step 3: Wait for product search data API response
  console.log('Waiting for product search data to load...');
  try {
    await page.waitForResponse(
      (response) => response.url().includes('/productsearch/data') && response.status() === 200,
      { timeout: 15000 }
    );
    console.log('Product search data loaded successfully');
  } catch (error) {
    console.log('Product search data timeout — continuing anyway');
  }

  // Step 3.1: Wait for DOM to update with loaded data
  console.log('Waiting for DOM to update...');
  await page.waitForTimeout(2000);

  // Step 4: Capture page HTML and parse results
  console.log('Capturing page HTML...');
  const htmlContent = await page.content();

  console.log('Parsing product data...');
  const products = parseAutoPartnerHTML(htmlContent);

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

    // Search and scrape
    const data = await searchAndScrape(page, config.searchQuery);
    console.log(`Scraped ${data.length} record(s)`);

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Scraper error: ${message}`);
    return { success: false, data: null, error: message };
  } finally {
    await context?.close();
  }
}

// --- Entry point (only when run directly, not when imported by the server) ---

if (require.main === module) {
  const config: ScraperConfig = {
    searchQuery: process.env.SEARCH_QUERY ?? '',
    headless: false,
    login: {
      loginUrl: 'https://katalog.autopartner.pl/',
      username: process.env.AUTO_PARTNER_USERNAME ?? '',
      password: process.env.AUTO_PARTNER_PASSWORD ?? '',
    },
  };

  runScraper(config).then((result) => {
    if (result.success && result.data) {
      console.log('Scrape completed successfully!');
      console.log(`Found ${result.data.length} products\n`);

      const tableData = result.data.map((product, index) => ({
        index: index + 1,
        name: product.name,
        availability: product.availability,
        price: product.price,
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
