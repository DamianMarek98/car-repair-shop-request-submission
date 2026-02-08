import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export interface ScrapeResult {
  success: boolean;
  data: Record<string, unknown>[];
  error?: string;
}

export interface ScraperConfig {
  url: string;
  login?: {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    username: string;
    password: string;
  };
  headless: boolean;
}

async function login(page: Page, config: ScraperConfig['login']): Promise<void> {
  if (!config) return;

  console.log(`Navigating to login page: ${config.loginUrl}`);
  await page.goto(config.loginUrl, { waitUntil: 'networkidle' });

  await page.fill(config.usernameSelector, config.username);
  await page.fill(config.passwordSelector, config.password);
  await page.click(config.submitSelector);

  // Wait for navigation after login completes
  await page.waitForLoadState('networkidle');
  console.log('Login completed');
}

async function scrapeData(page: Page, _url: string): Promise<Record<string, unknown>[]> {
  // TODO: Implement your scraping logic here
  // This is a template - replace with actual selectors and data extraction

  // Example: scrape a table of parts
  // const rows = await page.$$eval('table.parts tbody tr', (trs) =>
  //   trs.map((tr) => {
  //     const cells = tr.querySelectorAll('td');
  //     return {
  //       partNumber: cells[0]?.textContent?.trim() ?? '',
  //       name: cells[1]?.textContent?.trim() ?? '',
  //       price: cells[2]?.textContent?.trim() ?? '',
  //       availability: cells[3]?.textContent?.trim() ?? '',
  //     };
  //   })
  // );

  const title = await page.title();
  const url = page.url();

  return [{ title, url, scrapedAt: new Date().toISOString() }];
}

export async function runScraper(config: ScraperConfig): Promise<ScrapeResult> {
  let browser: Browser | undefined;

  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: config.headless });

    const context: BrowserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    const page: Page = await context.newPage();

    // Perform login if credentials provided
    if (config.login) {
      await login(page, config.login);
    }

    // Navigate to target page
    console.log(`Navigating to: ${config.url}`);
    await page.goto(config.url, { waitUntil: 'networkidle' });

    // Scrape data
    const data = await scrapeData(page, config.url);
    console.log(`Scraped ${data.length} record(s)`);

    await context.close();

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Scraper error: ${message}`);
    return { success: false, data: [], error: message };
  } finally {
    await browser?.close();
  }
}

// --- Entry point ---

const config: ScraperConfig = {
  // TODO: Replace with the target website URL
  url: 'https://example.com/parts',
  headless: true,

  // TODO: Uncomment and fill in if the site requires login
  // login: {
  //   loginUrl: 'https://example.com/login',
  //   usernameSelector: '#username',
  //   passwordSelector: '#password',
  //   submitSelector: 'button[type="submit"]',
  //   username: process.env.SCRAPER_USERNAME ?? '',
  //   password: process.env.SCRAPER_PASSWORD ?? '',
  // },
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
