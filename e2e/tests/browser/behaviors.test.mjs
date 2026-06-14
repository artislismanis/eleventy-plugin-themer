/**
 * Browser runtime behaviors (§2.9 dark-mode, §5.8 feature init, §8 escaping) — L5.
 *
 * Drives a served `browser` fixture with Playwright Chromium. Skips cleanly when
 * no Chromium is available (set CHROME_BIN / PLAYWRIGHT_CHROMIUM_PATH to point
 * at a binary, or run where Playwright's browser is installed).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startDevServer } from '../../helpers/devServer.mjs';
import { launch, browserAvailable } from '../../helpers/browser.mjs';

const PORT = 8200;
const available = await browserAvailable();
const suite = available ? describe : describe.skip;

if (!available) {
  console.warn('[e2e-browser] Chromium unavailable — skipping browser suite.');
}

suite('browser runtime behaviors', () => {
  let server;
  let browser;

  beforeAll(async () => {
    server = await startDevServer('browser', { port: PORT });
    browser = await launch();
  }, 90000);

  afterAll(async () => {
    await browser?.close();
    await server?.stop();
  });

  async function openHome() {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    return page;
  }

  it('dark-mode toggle flips data-theme', async () => {
    const page = await openHome();
    try {
      await page.waitForFunction(() => !!document.documentElement.dataset.theme);
      const before = await page.getAttribute('html', 'data-theme');
      expect(before).toBe('light');

      await page.click('[data-theme-toggle]');
      await page.waitForFunction((prev) => document.documentElement.dataset.theme !== prev, before);
      expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
    } finally {
      await page.close();
    }
  });

  it('user feature sets its data attribute at runtime', async () => {
    const page = await openHome();
    try {
      await page.waitForFunction(() => document.documentElement.dataset.widget === 'loaded');
      expect(await page.getAttribute('html', 'data-widget')).toBe('loaded');
    } finally {
      await page.close();
    }
  });

  it('an injection payload in a config value renders inert', async () => {
    const page = await openHome();
    try {
      // Escaped: no real <img> injected, no error handler fires, text preserved.
      expect(await page.locator('.copyright img').count()).toBe(0);
      expect(await page.evaluate(() => window.__xss)).toBeUndefined();
      expect(await page.locator('.copyright').innerText()).toContain('onerror');
    } finally {
      await page.close();
    }
  });
});
