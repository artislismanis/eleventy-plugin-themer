/**
 * Shared Vitest configuration base for all packages in the monorepo.
 *
 * Each package's `vitest.config.mjs` imports `createProjectConfig(name)` to
 * declare a project with the standard test layout — `__tests__` test files
 * with the `.test.mjs` suffix, globals enabled. Package-specific overrides
 * can be merged at the call site.
 *
 * The repo-root `vitest.config.mjs` re-exports `rootConfig` so `npm test`
 * runs the full project suite with shared coverage settings.
 */

import { defineConfig, defineProject, mergeConfig } from 'vitest/config';

const SHARED_TEST_OPTIONS = {
  globals: true,
  include: ['__tests__/**/*.test.mjs'],
};

/**
 * Build a per-package Vitest project config.
 *
 * @param {string} name - Project label shown in CLI output.
 * @param {object} [overrides] - Additional Vitest config to deep-merge.
 */
export function createProjectConfig(name, overrides = {}) {
  const base = defineProject({
    test: { name, ...SHARED_TEST_OPTIONS },
  });
  return Object.keys(overrides).length ? mergeConfig(base, overrides) : base;
}

/**
 * Root-level Vitest config — defines all monorepo projects and coverage rules.
 */
export const rootConfig = defineConfig({
  test: {
    ...SHARED_TEST_OPTIONS,
    projects: ['packages/core', 'packages/build/vite', 'packages/themes/base'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/**/lib/**/*.mjs', 'packages/**/utils/**/*.mjs'],
      exclude: ['**/__tests__/**', '**/index.mjs'],
    },
  },
});
