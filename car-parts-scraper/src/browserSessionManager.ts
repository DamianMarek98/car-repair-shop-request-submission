import { type BrowserContext, type Page } from 'playwright';
import {
  createInterCarsContext,
  loginInterCars,
  type InterCarsLoginConfig,
} from './inter-parts/interPartsScraper.js';
import {
  createApcatContext,
  loginApcat,
  type ApcatLoginConfig,
} from './apcat/apcatScraper.js';
import {
  createAutoPartnerContext,
  loginAutoPartner,
  type AutoPartnerLoginConfig,
} from './auto-partner/autoPartnerScraper.js';

export type Vendor = 'inter-cars' | 'apcat' | 'auto-partner';

export interface AllVendorConfigs {
  interCars: { headless: boolean; login: InterCarsLoginConfig };
  apcat: { headless: boolean; login: ApcatLoginConfig };
  autoPartner: { headless: boolean; login: AutoPartnerLoginConfig };
}

interface VendorSession {
  context: BrowserContext;
  page: Page;
  busy: boolean;
  queue: Array<(page: Page) => void>;
  config: AllVendorConfigs[keyof AllVendorConfigs];
}

const sessions = new Map<Vendor, VendorSession>();
let globalConfigs: AllVendorConfigs | undefined;

async function initVendorSession(vendor: Vendor, configs: AllVendorConfigs): Promise<void> {
  console.log(`[BrowserSessionManager] Initializing session for: ${vendor}`);
  try {
    let context: BrowserContext;
    let page: Page;
    let config: VendorSession['config'];

    if (vendor === 'inter-cars') {
      config = configs.interCars;
      context = await createInterCarsContext(config.headless);
      page = context.pages()[0] ?? await context.newPage();
      await loginInterCars(page, config.login);
    } else if (vendor === 'apcat') {
      config = configs.apcat;
      context = await createApcatContext(config.headless);
      page = context.pages()[0] ?? await context.newPage();
      await loginApcat(page, config.login);
    } else {
      config = configs.autoPartner;
      context = await createAutoPartnerContext(config.headless);
      page = context.pages()[0] ?? await context.newPage();
      await loginAutoPartner(page, config.login);
    }

    sessions.set(vendor, { context, page, busy: false, queue: [], config });
    console.log(`[BrowserSessionManager] Session ready for: ${vendor}`);
  } catch (err) {
    console.error(`[BrowserSessionManager] Failed to initialize session for ${vendor}:`, err);
    // Don't crash — other vendors remain available
  }
}

export async function initializeSessions(configs: AllVendorConfigs): Promise<void> {
  globalConfigs = configs;
  console.log('[BrowserSessionManager] Configs stored — sessions will start on demand');
}

export async function startSession(vendor: Vendor): Promise<void> {
  if (!globalConfigs) throw new Error('[BrowserSessionManager] No configs available');
  const existing = sessions.get(vendor);
  if (existing) {
    console.log(`[BrowserSessionManager] Session for ${vendor} already running`);
    return;
  }
  await initVendorSession(vendor, globalConfigs);
}

export async function stopSession(vendor: Vendor): Promise<void> {
  const existing = sessions.get(vendor);
  sessions.delete(vendor);
  if (existing) {
    try { await existing.context.close(); } catch { }
    console.log(`[BrowserSessionManager] Session stopped for: ${vendor}`);
  }
}

export async function acquireSession(vendor: Vendor): Promise<Page> {
  const session = sessions.get(vendor);
  if (!session) {
    throw new Error(`No browser session available for vendor: ${vendor}`);
  }

  if (!session.busy) {
    session.busy = true;
    return session.page;
  }

  return new Promise<Page>((resolve) => {
    session.queue.push(resolve);
  });
}

export function releaseSession(vendor: Vendor): void {
  const session = sessions.get(vendor);
  if (!session) return;

  const next = session.queue.shift();
  if (next) {
    next(session.page);
  } else {
    session.busy = false;
  }
}

// Returns the page to use (may be a new page if the session was restarted due to login failure).
export async function checkAndReloginIfNeeded(vendor: Vendor): Promise<Page> {
  const session = sessions.get(vendor);
  if (!session) throw new Error(`No browser session available for vendor: ${vendor}`);

  try {
    if (vendor === 'inter-cars') {
      await loginInterCars(session.page, (session.config as AllVendorConfigs['interCars']).login);
    } else if (vendor === 'apcat') {
      await loginApcat(session.page, (session.config as AllVendorConfigs['apcat']).login);
    } else {
      await loginAutoPartner(session.page, (session.config as AllVendorConfigs['autoPartner']).login);
    }
  } catch (err) {
    console.error(`[BrowserSessionManager] Re-login failed for ${vendor}, restarting session...`, err);
    await restartSession(vendor);
  }

  // Return the current page — may differ from the original if a restart occurred
  const current = sessions.get(vendor);
  if (!current) throw new Error(`Session for ${vendor} unavailable after restart attempt`);
  return current.page;
}

async function restartSession(vendor: Vendor): Promise<void> {
  if (!globalConfigs) throw new Error('[BrowserSessionManager] No configs available for restart');

  const existing = sessions.get(vendor);
  if (existing) {
    const pendingQueue = existing.queue;
    sessions.delete(vendor);
    try {
      await existing.context.close();
    } catch {
      // Ignore close errors on a crashed context
    }

    console.log(`[BrowserSessionManager] Restarting session for: ${vendor}`);
    await initVendorSession(vendor, globalConfigs);

    const newSession = sessions.get(vendor);
    if (newSession) {
      // Transfer ownership back to the current request; it will call releaseSession in finally
      newSession.busy = true;
      if (pendingQueue.length > 0) {
        newSession.queue = pendingQueue;
      }
    }
  }
}

export async function resetSession(vendor: Vendor): Promise<void> {
  if (!globalConfigs) throw new Error('[BrowserSessionManager] No configs available for reset');

  const existing = sessions.get(vendor);
  sessions.delete(vendor); // remove first so in-flight requests see no session and fail cleanly
  if (existing) {
    try { await existing.context.close(); } catch { /* ignore crashed context */ }
  }

  await initVendorSession(vendor, globalConfigs);
}

export async function shutdownSessions(): Promise<void> {
  await Promise.all(
    Array.from(sessions.values()).map(async (session) => {
      try {
        await session.context.close();
      } catch {
        // Ignore close errors during shutdown
      }
    })
  );
  sessions.clear();
  console.log('[BrowserSessionManager] All sessions closed');
}
