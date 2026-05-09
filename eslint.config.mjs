import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/_site/**', '**/coverage/**', '**/*.min.js'] },

  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
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
      'import/order': ['error', { 'newlines-between': 'always' }],
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
    rules: { 'import/no-unresolved': ['error', { ignore: ['^virtual:'] }] },
  },

  // Test files: add Vitest globals
  {
    files: ['**/__tests__/**/*.js', '**/__tests__/**/*.mjs', '**/*.test.js', '**/*.test.mjs'],
    languageOptions: { globals: { ...globals.vitest } },
  },

  // Vitest config files: ignore unresolved vitest/config
  {
    files: ['**/vitest.config.mjs'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^vitest'] }] },
  },

  // Build-vite package: ignore sub-path imports from workspace packages
  {
    files: ['packages/build/vite/**/*.mjs'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^@eleventy-plugin-themer/core/', '^vitest'] }],
    },
  },

  // Prettier (disables conflicting rules) - must be last
  prettierConfig,
];
