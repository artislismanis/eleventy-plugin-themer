import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E node-env suites: real Eleventy/Vite builds of fixtures, asserted against
 * `_site/`. Kept separate from the fast unit `npm test` (which runs the
 * per-package projects) so multi-second builds never tax the inner loop.
 * Browser tests live in `vitest.config.browser.mjs`.
 */
export default defineConfig({
  root: __dirname,
  test: {
    name: 'e2e',
    globals: true,
    include: ['tests/**/*.test.mjs'],
    exclude: ['tests/browser/**'],
    globalSetup: ['./helpers/global-setup.mjs'],
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
