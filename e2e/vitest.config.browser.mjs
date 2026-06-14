import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * L5 browser suite: drives a served fixture with Playwright (Chromium) to test
 * runtime behaviors (dark-mode toggle, feature init, rendered escaping). Kept
 * in its own config/script so the browser dependency never burdens the node
 * suites; skips cleanly when no Chromium is available.
 */
export default defineConfig({
  root: __dirname,
  test: {
    name: 'e2e-browser',
    globals: true,
    include: ['tests/browser/**/*.test.mjs'],
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
