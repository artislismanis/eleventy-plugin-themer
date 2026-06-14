/**
 * Playwright launch helper for the L5 browser layer.
 *
 * Prebuilt Chromium isn't available on every OS (and not in some CI sandboxes),
 * so `browserAvailable()` lets suites skip cleanly instead of hard-failing.
 * Point at an existing binary with PLAYWRIGHT_CHROMIUM_PATH or CHROME_BIN.
 */

import { chromium } from 'playwright';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || process.env.CHROME_BIN || undefined;

export const launchOptions = executablePath ? { executablePath } : {};

export function launch() {
  return chromium.launch(launchOptions);
}

export async function browserAvailable() {
  try {
    const b = await launch();
    await b.close();
    return true;
  } catch {
    return false;
  }
}
