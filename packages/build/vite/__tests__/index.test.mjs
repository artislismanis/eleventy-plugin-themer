import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getThemerContext } from '@eleventy-plugin-themer/core';

import { eleventyPluginThemerVite } from '../index.mjs';

// Mocks for the core dependencies used by index.mjs (declared after the
// imports because vi.mock is hoisted by Vitest's transformer to the top of
// the file, making `import` ordering inert from a lint perspective).
vi.mock('@eleventy-plugin-themer/core', () => ({
  getThemerContext: vi.fn(),
  DEFAULT_ASSET_ENTRIES: { styles: 'styles/main.scss', scripts: 'scripts/main.js' },
  getThemeRoot: vi.fn((root, name) => `${root}/node_modules/${name}`),
}));

vi.mock('../theme-config.mjs', () => ({
  createThemeViteConfig: vi.fn(() => ({})),
}));

vi.mock('../utils/features.mjs', () => ({
  getFeatureEntries: vi.fn(() => ({})),
  getFeaturePathsForBuild: vi.fn(() => new Map()),
}));

vi.mock('../utils/integration-check.mjs', () => ({
  runIntegrationCheck: vi.fn(),
}));

vi.mock('@11ty/eleventy-plugin-vite', () => ({
  default: vi.fn(),
}));

describe('eleventyPluginThemerVite — themer context sharing', () => {
  let mockEleventyConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEleventyConfig = { addPlugin: vi.fn() };
  });

  it('uses the cached themer context when present', async () => {
    const cachedFeatures = new Map([
      ['cached-feature', { name: 'cached-feature', source: 'theme', path: '/p/cached.js' }],
    ]);
    getThemerContext.mockReturnValue({
      themeMetadata: { name: 'cached-theme' },
      resolvedOverridePaths: { features: 'overrides/features' },
      discoveredFeatures: cachedFeatures,
      projectRoot: '/project',
    });

    await expect(
      eleventyPluginThemerVite(mockEleventyConfig, {
        theme: 'whatever-theme',
        projectRoot: '/project',
      }),
    ).resolves.toBeDefined();

    expect(mockEleventyConfig.addPlugin).toHaveBeenCalled();
  });

  it('throws when no cached context (core plugin not registered first)', async () => {
    getThemerContext.mockReturnValue(undefined);

    await expect(
      eleventyPluginThemerVite(mockEleventyConfig, {
        theme: 'fallback-theme',
        projectRoot: '/project',
      }),
    ).rejects.toThrow(/no themer context/);
  });

  it('throws on unknown optimization keys (typo guard)', async () => {
    getThemerContext.mockReturnValue({
      themeMetadata: { name: 'cached-theme' },
      resolvedOverridePaths: { features: 'overrides/features' },
      discoveredFeatures: new Map(),
      projectRoot: '/project',
    });

    await expect(
      eleventyPluginThemerVite(mockEleventyConfig, {
        theme: 'cached-theme',
        projectRoot: '/project',
        optimizations: { purgeCS: true, criticalCSS: true },
      }),
    ).rejects.toThrow(/unknown optimization key.*purgeCS/);
  });
});
