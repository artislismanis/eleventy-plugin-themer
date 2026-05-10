import fs from 'fs';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  eleventyPluginThemer,
  themerDataSchema,
  _resetThemerDataSchemaCache,
} from '../lib/index.mjs';
import { getThemerContext, getThemerDir } from '../lib/internal/context.mjs';

// Mock fs module
vi.mock('fs');

// Mock template-loader
vi.mock('../lib/template-loader.mjs', () => ({
  configureTemplateEngine: vi.fn(),
}));

describe('eleventyPluginThemer', () => {
  let mockEleventyConfig;

  beforeEach(() => {
    vi.resetAllMocks();

    mockEleventyConfig = {
      addGlobalData: vi.fn(),
      addFilter: vi.fn(),
      addShortcode: vi.fn(),
      addPairedShortcode: vi.fn(),
      addTransform: vi.fn(),
      addLayoutAlias: vi.fn(),
      addWatchTarget: vi.fn(),
    };

    // Mock theme package.json
    fs.existsSync.mockImplementation((p) => {
      if (p.includes('package.json')) return true;
      if (p.includes('theme.json')) return true;
      // Layout files
      if (p.includes('layouts') && p.endsWith('.njk')) return true;
      return false;
    });

    fs.readFileSync.mockImplementation((p) => {
      if (p.includes('package.json')) {
        return JSON.stringify({
          name: '@eleventy-plugin-themer/theme-base',
          version: '3.0.0',
          description: 'Base theme',
        });
      }
      if (p.includes('theme.json')) {
        return JSON.stringify({
          name: 'Theme Base',
          layouts: [
            { name: 'base', path: 'layouts/base.njk' },
            { name: 'post', path: 'layouts/post.njk' },
          ],
          themeFeatures: [
            { name: 'code-highlighting', entry: 'features/code-highlighting/index.js' },
          ],
        });
      }
      return '';
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when theme option is missing', async () => {
    await expect(
      eleventyPluginThemer(mockEleventyConfig, { projectRoot: '/project' }),
    ).rejects.toThrow('requires a `theme` option');
  });

  it('should throw when projectRoot option is missing', async () => {
    await expect(
      eleventyPluginThemer(mockEleventyConfig, { theme: 'test-theme', projectRoot: '' }),
    ).rejects.toThrow('requires a `projectRoot` option');
  });

  it('should add theme metadata as global data', async () => {
    // Mock dynamic import of theme module
    vi.stubGlobal('import', vi.fn());

    try {
      await eleventyPluginThemer(mockEleventyConfig, {
        theme: '@eleventy-plugin-themer/theme-base',
        projectRoot: '/project',
      });
    } catch {
      // Dynamic import may fail in test environment, that's OK
    }

    // Check that addGlobalData was called with 'themeMetadata'
    const globalDataCall = mockEleventyConfig.addGlobalData.mock.calls.find(
      ([key]) => key === 'themeMetadata',
    );
    expect(globalDataCall).toBeDefined();
    expect(globalDataCall[1]).toMatchObject({
      name: '@eleventy-plugin-themer/theme-base',
    });
  });
});

describe('getThemerContext / getThemerDir', () => {
  it('returns undefined when plugin has not run', () => {
    expect(getThemerContext({})).toBeUndefined();
  });

  it('throws from getThemerDir when context missing', () => {
    expect(() => getThemerDir({})).toThrow(/themer context not found/);
  });

  it('returns dir from cached context', () => {
    const fakeDir = { input: 'content', output: '_site', includes: '../foo' };
    const cfg = {};
    Object.defineProperty(cfg, '__themerContext', {
      value: { dir: fakeDir, themeMetadata: {}, resolvedOverridePaths: {}, projectRoot: '/p' },
    });
    expect(getThemerDir(cfg)).toBe(fakeDir);
  });
});

describe('themerDataSchema', () => {
  beforeEach(() => {
    _resetThemerDataSchemaCache();
  });

  it('throws when neither context nor themeMetadata is on data', async () => {
    await expect(themerDataSchema({})).rejects.toThrow(/cannot locate themer context/);
  });

  it('uses cached themer context from data.eleventy.eleventyConfig', async () => {
    const cfg = {};
    Object.defineProperty(cfg, '__themerContext', {
      value: {
        themeMetadata: { name: 't' },
        resolvedOverridePaths: {},
        projectRoot: '/p',
      },
    });

    await expect(
      themerDataSchema({
        eleventy: { eleventyConfig: cfg },
        draft: false,
        tags: ['x'],
      }),
    ).resolves.toBeUndefined();
  });

  it('falls back to data.themeMetadata when no context present', async () => {
    await expect(
      themerDataSchema({
        themeMetadata: { name: 't', themeFeatures: [] },
        tags: ['a'],
      }),
    ).resolves.toBeUndefined();
  });
});
