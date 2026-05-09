import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/**/*.test.mjs'],
    projects: ['packages/core', 'packages/build/vite', 'packages/themes/base'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/**/lib/**/*.mjs', 'packages/**/utils/**/*.mjs'],
      exclude: ['**/__tests__/**', '**/index.mjs'],
    },
  },
});
