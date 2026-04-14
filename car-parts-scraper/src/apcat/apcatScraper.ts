import { type BrowserContext, type Frame, type Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { parseApcatHTML, type ApcatProductData } from './apcatParser.js';

// Apply stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

// Persistent browser data directory (stores cookies, sessions across runs)
const USER_DATA_DIR = path.resolve(process.cwd(), '.browser-data-apcat');

export interface ScrapeResult {
  success: boolean;
  data: ApcatProductData[] | null;
  error?: string;
}

export interface ApcatLoginConfig {
  loginUrl: string;
  username: string;
  password: string;
}

export interface ScraperConfig {
  searchQuery: string;
  login?: ApcatLoginConfig;
  headless: boolean;
}

/**
 * Dismiss any blocking overlay frames:
 * - Colorbox overlay (#cboxClose) — lives inside the main iframe
 * - Information notification modal (cboxIframe with src Notification.aspx)
 */
async function dismissFrames(page: Page): Promise<void> {
  for (const frame of page.frames()) {
    // Colorbox overlay
    const colorboxClose = await frame.$('#cboxClose');
    if (colorboxClose && await colorboxClose.isVisible()) {
      console.log('Colorbox overlay detected — closing...');
      try {
        await frame.click('#cboxClose', { timeout: 5000 });
        await page.waitForTimeout(1000);
      } catch (err) {
        console.warn('Could not close colorbox overlay, continuing...', err);
      }
    }

    // Information notification modal
    if (frame.url().includes('Notification.aspx')) {
      const notificationClose = await frame.$('div.notificationBtn.btn');
      if (notificationClose) {
        console.log('Information modal detected — closing...');
        await frame.click('div.notificationBtn.btn');
        await page.waitForTimeout(2000);
      }
    }
  }
}

async function login(page: Page, config: ScraperConfig['login']): Promise<void> {
  if (!config) return;

  // Step 1: Navigate to login page
  console.log(`Navigating to login page: ${config.loginUrl}`);
  await page.goto(config.loginUrl, { waitUntil: 'networkidle' });

  // Check if already logged in — the username label is present on the post-login page
  const userLabel = page.locator('span.usrNameLable', { hasText: config.username });
  if (await userLabel.count() > 0) {
    console.log(`Already logged in as: ${config.username}`);
    return;
  }

  // The login form lives inside an iframe — get the correct frame
  console.log('Looking for login iframe...');
  const frames = page.frames();
  console.log(`Found ${frames.length} frame(s): ${frames.map(f => f.url()).join(', ')}`);

  // Find the frame that contains the login form (has the username input)
  let loginFrame: Frame | null = null;
  for (const frame of frames) {
    const input = await frame.$('input[name="username"]');
    if (input) {
      loginFrame = frame;
      console.log(`Login form found in frame: ${frame.url()}`);
      break;
    }
  }

  if (!loginFrame) {
    throw new Error('Could not find login form in any frame');
  }

  // Fill in username
  console.log('Entering username...');
  await loginFrame.fill('input[name="username"]', config.username);

  // Fill in password
  console.log('Entering password...');
  await loginFrame.fill('input[name="password"]', config.password);

  // Click the Login button
  console.log('Submitting login form...');
  await loginFrame.click('input[name="login"]');

  // Wait for the iframe to settle after login (no full page navigation — iframe updates in place)
  await page.waitForTimeout(3000);

  // Step 2 (optional): Handle "new session" prompt — appears when another session is already active
  // Check in all frames since the prompt may be inside the iframe
  const NEW_SESSION_MAX_RETRIES = 3;
  const NEW_SESSION_RETRY_DELAY_MS = 1000;
  let newSessionHandled = false;
  for (let attempt = 1; attempt <= NEW_SESSION_MAX_RETRIES; attempt++) {
    for (const frame of page.frames()) {
      const newSessionPrompt = await frame.$('span:has-text("Do you want to open a new session by deleting the current session?")');
      if (newSessionPrompt) {
        console.log('Active session detected — confirming new session...');
        await frame.click('#ok');
        await page.waitForTimeout(2000);
        newSessionHandled = true;
        break;
      }
    }
    if (newSessionHandled) break;
    if (attempt < NEW_SESSION_MAX_RETRIES) {
      console.log(`New session prompt not found (attempt ${attempt}/${NEW_SESSION_MAX_RETRIES}), waiting ${NEW_SESSION_RETRY_DELAY_MS}ms...`);
      await page.waitForTimeout(NEW_SESSION_RETRY_DELAY_MS);
    }
  }

  // Step 3: Dismiss colorbox overlay and/or information modal
  await dismissFrames(page);

  console.log('Login completed');
}

async function searchAndScrape(page: Page, query: string): Promise<ApcatProductData[]> {
  // Find the frame that contains the search input (same iframe as the main catalogue)
  await page.waitForTimeout(3000);
  console.log(`Searching for: ${query}`);
  const SEARCH_INPUT_MAX_RETRIES = 5;
  const SEARCH_INPUT_RETRY_DELAY_MS = 2000;

  let searchFrame: Frame | null = null;
  for (let attempt = 1; attempt <= SEARCH_INPUT_MAX_RETRIES; attempt++) {
    for (const frame of page.frames()) {
      const input = await frame.$('#home_txt_art_direkt');
      if (input) {
        searchFrame = frame;
        console.log(`Search form found in frame: ${frame.url()}`);
        break;
      }
    }
    if (searchFrame) break;
    if (attempt < SEARCH_INPUT_MAX_RETRIES) {
      console.log(`Search input not found (attempt ${attempt}/${SEARCH_INPUT_MAX_RETRIES}), waiting ${SEARCH_INPUT_RETRY_DELAY_MS}ms...`);
      await page.waitForTimeout(SEARCH_INPUT_RETRY_DELAY_MS);
      await dismissFrames(page);
    }
  }

  if (!searchFrame) {
    throw new Error('Could not find search input (#home_txt_art_direkt) in any frame');
  }

  await dismissFrames(page);
  // Step 1: Fill in the search input and submit with Enter
  await searchFrame.fill('#home_txt_art_direkt', query);
  await dismissFrames(page);
  console.log('Submitting search with Enter...');
  await searchFrame.press('#home_txt_art_direkt', 'Enter');

  // Step 3: Wait for results to load
  console.log('Waiting for search results to load...');
  await page.waitForTimeout(3000);
  await dismissFrames(page);
  // Step 3b: Wait for ERP bonus widgets to be injected (loaded asynchronously by APCAT)
  try {
    await searchFrame.waitForSelector('div.bonus_info_widget_text', { timeout: 5000 });
    console.log('ERP bonus widgets loaded');
  } catch {
    console.log('No bonus widgets appeared within timeout — product may have no bonus');
  }

  // Step 4: Capture frame HTML and parse results
  console.log('Capturing frame HTML...');
  const htmlContent = await searchFrame.content();

  console.log('Parsing product data...');
  const products = parseApcatHTML(htmlContent);

  console.log(`Found ${products.length} product(s)`);

  return products;
}

export async function runScraper(config: ScraperConfig): Promise<ScrapeResult> {
  let context: BrowserContext | undefined;

  try {
    console.log(`Launching browser (persistent profile: ${USER_DATA_DIR})...`);
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: config.headless,
      locale: 'en-US',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      args: ['--window-size=1,1', '--window-position=-32000,-32000', '--start-minimized', '--disable-features=CalculateNativeWinOcclusion', // prevents Windows from snapping off-screen windows back
        '--no-first-run',      // skips the "welcome" screen that can steal focus
        '--no-default-browser-check'],
    });

    const page: Page = context.pages()[0] ?? (await context.newPage());

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

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const config: ScraperConfig = {
    searchQuery: process.env.SEARCH_QUERY ?? '',
    headless: false,
    login: {
      loginUrl: 'https://apcat.eu/',
      username: process.env.APCAT_USERNAME ?? '',
      password: process.env.APCAT_PASSWORD ?? '',
    },
  };

  runScraper(config).then((result) => {
    if (result.success && result.data) {
      console.log('Scrape completed successfully!');
      console.log(`Found ${result.data.length} products\n`);

      const tableData = result.data.map((product, index) => ({
        index: index + 1,
        dealerPartNumber: product.dealerPartNumber,
        availability: product.availability.join(' | '),
        prices: product.prices.join(' | '),
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
