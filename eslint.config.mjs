import js from '@eslint/js';
import globals from 'globals';
import { flatConfigs as importXConfigs } from 'eslint-plugin-import-x';
import promisePlugin from 'eslint-plugin-promise';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/_site/**', '**/coverage/**', '**/*.min.js'] },

  js.configs.recommended,
  importXConfigs.recommended,
  promisePlugin.configs['flat/recommended'],

  // All JS files: shared settings and rules
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.es2022 },
    },
    rules: {
      'import-x/order': ['error', { 'newlines-between': 'always' }],
      // simple-icons is indexed by computed slug at module load in the base theme.
      'import-x/namespace': ['error', { allowComputed: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  // Node.js files: add Node globals
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['**/scripts/**/*.js', '**/features/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Browser scripts: add browser globals
  {
    files: ['**/scripts/**/*.js', '**/features/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
    rules: { 'import-x/no-unresolved': ['error', { ignore: ['^virtual:'] }] },
  },

  // Test files: add Vitest globals
  {
    files: ['**/__tests__/**/*.js', '**/__tests__/**/*.mjs', '**/*.test.js', '**/*.test.mjs'],
    languageOptions: { globals: { ...globals.vitest } },
  },

  // Vitest config files: ignore unresolved vitest/config
  {
    files: ['**/vitest.config.mjs', '**/vitest.config.base.mjs', '**/vitest.config.browser.mjs'],
    rules: { 'import-x/no-unresolved': ['error', { ignore: ['^vitest'] }] },
  },

  // E2E browser tests: code in page.evaluate/waitForFunction runs in the browser
  {
    files: ['e2e/tests/browser/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Build-vite package: ignore sub-path imports from workspace packages
  {
    files: ['packages/build/vite/**/*.mjs'],
    rules: {
      'import-x/no-unresolved': [
        'error',
        { ignore: ['^@eleventy-plugin-themer/core/', '^vitest'] },
      ],
    },
  },

  // Prettier (disables conflicting rules) - must be last
  prettierConfig,
];
