import path from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createThemeViteConfig } from '../theme-config.mjs';

vi.mock('@eleventy-plugin-themer/core', () => ({
  DEFAULT_ASSET_ENTRIES: { styles: 'styles/main.scss', scripts: 'scripts/main.js' },
  getThemeRoot: vi.fn((projectRoot, themeName) =>
    path.join(projectRoot, 'node_modules', themeName),
  ),
}));

vi.mock('@eleventy-plugin-themer/core/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../plugins/auto-import.mjs', () => ({
  themeAutoImportPlugin: vi.fn(() => ({ name: 'theme-auto-import' })),
}));

vi.mock('../plugins/feature-serve.mjs', () => ({
  featureServePlugin: vi.fn(() => ({ name: 'feature-serve' })),
}));

vi.mock('../plugins/prism-theme.mjs', () => ({
  prismThemePlugin: vi.fn(() => ({ name: 'prism-theme' })),
}));

vi.mock('../utils/plugin-orchestrator.mjs', () => ({
  runOptimizations: vi.fn(),
}));

vi.mock('../utils/features.mjs', () => ({
  getFeaturePathsForBuild: vi.fn(() => new Map()),
}));

const { deepMergeViteConfig } = vi.hoisted(() => ({
  deepMergeViteConfig: vi.fn((base) => base),
}));

vi.mock('../utils/merge-config.mjs', () => ({ deepMergeViteConfig }));

const baseThemeMetadata = { name: 'test-theme' };

const baseOptions = {
  projectRoot: '/project',
  resolvedOverridePaths: {
    styles: 'overrides/styles',
    scripts: 'overrides/scripts',
    features: 'overrides/features',
  },
};

describe('createThemeViteConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    deepMergeViteConfig.mockImplementation((base) => base);
  });

  it('should throw when projectRoot is missing', () => {
    expect(() => createThemeViteConfig(baseThemeMetadata, {})).toThrow('projectRoot is required');
  });

  it('should throw when themeMetadata is missing', () => {
    expect(() => createThemeViteConfig(null, baseOptions)).toThrow('themeMetadata with name');
  });

  it('should return a config object with resolve aliases', () => {
    const result = createThemeViteConfig(baseThemeMetadata, baseOptions);

    expect(result).toBeDefined();
    expect(result.resolve.alias['@theme']).toContain('test-theme');
  });

  describe('mergeThemeBuildHints — prototype pollution guard', () => {
    it('should not pollute Object.prototype via __proto__ key in themeBuild', () => {
      const before = Object.prototype.polluted;

      // Use a plain object with __proto__ as a string key in build config
      const themeMetadata = {
        name: 'test-theme',
        build: JSON.parse('{"__proto__": {"polluted": true}, "purgeCSS": {}}'),
      };

      createThemeViteConfig(themeMetadata, {
        ...baseOptions,
        optimizations: { purgeCSS: true },
      });

      expect(Object.prototype.polluted).toBe(before);
    });

    it('should not apply constructor key from themeBuild', () => {
      const themeMetadata = {
        name: 'test-theme',
        build: { constructor: { evil: true } },
      };

      expect(() =>
        createThemeViteConfig(themeMetadata, {
          ...baseOptions,
          optimizations: { purgeCSS: true },
        }),
      ).not.toThrow();
    });

    it('should apply safe plugin keys and create optimization plugin', () => {
      let capturedConfig;
      deepMergeViteConfig.mockImplementation((base) => {
        capturedConfig = base;
        return base;
      });

      const themeMetadata = {
        name: 'test-theme',
        build: { purgeCSS: { safelist: { standard: ['theme-color'] } } },
      };

      createThemeViteConfig(themeMetadata, {
        ...baseOptions,
        optimizations: { purgeCSS: true },
      });

      const hasOptimizationPlugin = capturedConfig.plugins.some(
        (p) => p?.name === 'eleventy-themes-optimization',
      );
      expect(hasOptimizationPlugin).toBe(true);
    });
  });
});
