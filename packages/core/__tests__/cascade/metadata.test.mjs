import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveThemeMetadata, _resetThemerMetadataCache } from '../../lib/cascade/metadata.mjs';

// Mock fs module
vi.mock('fs');

describe('resolveThemeMetadata', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Cache is process-wide; reset so each test sees fresh fs mocks.
    _resetThemerMetadataCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const projectRoot = '/project';
  const themeName = '@eleventy-plugin-themer/theme-base';
  const themeRoot = path.join(projectRoot, 'node_modules', themeName);
  const pkgJsonPath = path.join(themeRoot, 'package.json');
  const themeJsonPath = path.join(themeRoot, 'theme.json');

  it('should read and merge package.json and theme.json correctly', () => {
    const pkgJson = {
      name: '@eleventy-plugin-themer/theme-base',
      version: '3.0.0',
      description: 'Base theme for Eleventy',
    };
    const themeJson = {
      themeFeatures: [{ name: 'code-highlighting', entry: 'features/code-highlighting/index.js' }],
      config: { colors: { primary: '#333' } },
    };

    fs.existsSync.mockImplementation((p) => p === pkgJsonPath || p === themeJsonPath);
    fs.readFileSync.mockImplementation((p) => {
      if (p === pkgJsonPath) return JSON.stringify(pkgJson);
      if (p === themeJsonPath) return JSON.stringify(themeJson);
      throw new Error(`Unexpected read: ${p}`);
    });

    const result = resolveThemeMetadata(projectRoot, themeName);

    expect(result.name).toBe('@eleventy-plugin-themer/theme-base');
    expect(result.version).toBe('3.0.0');
    expect(result.description).toBe('Base theme for Eleventy');
    expect(result.themeFeatures).toEqual(themeJson.themeFeatures);
    expect(result.config).toEqual(themeJson.config);
  });

  it('should let package.json name/version/description take precedence over theme.json', () => {
    const pkgJson = {
      name: 'pkg-name',
      version: '2.0.0',
      description: 'From package.json',
    };
    const themeJson = {
      name: 'theme-name',
      version: '1.0.0',
      description: 'From theme.json',
      extraField: 'preserved',
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((p) => {
      if (p === pkgJsonPath) return JSON.stringify(pkgJson);
      if (p === themeJsonPath) return JSON.stringify(themeJson);
      throw new Error(`Unexpected read: ${p}`);
    });

    const result = resolveThemeMetadata(projectRoot, themeName);

    expect(result.name).toBe('pkg-name');
    expect(result.version).toBe('2.0.0');
    expect(result.description).toBe('From package.json');
    expect(result.extraField).toBe('preserved');
  });

  it('should return theme.json fields when present', () => {
    const pkgJson = { name: 'theme', version: '1.0.0', description: 'desc' };
    const themeJson = {
      themeFeatures: [{ name: 'gallery', entry: 'features/gallery/index.js' }],
      config: { navigation: { showHomeLink: true } },
      cascade: { defaultOverridePaths: { layouts: 'custom/layouts' } },
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((p) => {
      if (p === pkgJsonPath) return JSON.stringify(pkgJson);
      if (p === themeJsonPath) return JSON.stringify(themeJson);
      throw new Error(`Unexpected read: ${p}`);
    });

    const result = resolveThemeMetadata(projectRoot, themeName);

    expect(result.themeFeatures).toEqual(themeJson.themeFeatures);
    expect(result.config).toEqual(themeJson.config);
    expect(result.cascade).toEqual(themeJson.cascade);
  });

  it('should handle missing theme.json gracefully', () => {
    const pkgJson = { name: 'theme', version: '1.0.0', description: 'desc' };

    fs.existsSync.mockImplementation((p) => p === pkgJsonPath);
    fs.readFileSync.mockImplementation((p) => {
      if (p === pkgJsonPath) return JSON.stringify(pkgJson);
      throw new Error(`Unexpected read: ${p}`);
    });

    const result = resolveThemeMetadata(projectRoot, themeName);

    expect(result.name).toBe('theme');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe('desc');
  });

  it('should throw with helpful message when package.json not found', () => {
    fs.existsSync.mockReturnValue(false);

    expect(() => resolveThemeMetadata(projectRoot, themeName)).toThrow(/package\.json not found/);
    expect(() => resolveThemeMetadata(projectRoot, themeName)).toThrow(
      new RegExp(themeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  });

  /** Mount package.json + theme.json fixtures on the fs mock. */
  function mountTheme(themeJson, pkgJson = { name: 'theme', version: '1.0.0', description: 'd' }) {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((p) => {
      if (p === pkgJsonPath) return JSON.stringify(pkgJson);
      if (p === themeJsonPath) return JSON.stringify(themeJson);
      throw new Error(`Unexpected read: ${p}`);
    });
  }

  describe('contract version handshake', () => {
    it('accepts a supported contractVersion', () => {
      mountTheme({ contractVersion: 1 });
      expect(resolveThemeMetadata(projectRoot, themeName).contractVersion).toBe(1);
    });

    it('warns but does not throw when contractVersion is missing (pre-1.0 grace)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mountTheme({});
      expect(() => resolveThemeMetadata(projectRoot, themeName)).not.toThrow();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('does not declare a contractVersion'),
      );
    });

    it('throws on an unsupported (too-new) contractVersion', () => {
      mountTheme({ contractVersion: 999 });
      expect(() => resolveThemeMetadata(projectRoot, themeName)).toThrow(/contract v999/);
    });

    it('throws on a non-integer contractVersion', () => {
      mountTheme({ contractVersion: 1.5 });
      expect(() => resolveThemeMetadata(projectRoot, themeName)).toThrow(
        /non-integer contractVersion/,
      );
    });
  });

  describe('capabilities validation', () => {
    it('accepts a well-formed capabilities block', () => {
      mountTheme({
        contractVersion: 1,
        capabilities: {
          social: { render: 'icons', fallback: 'text' },
          analytics: ['googleAnalytics'],
          comments: ['disqus'],
          search: false,
        },
      });
      expect(() => resolveThemeMetadata(projectRoot, themeName)).not.toThrow();
    });

    it('throws on a malformed capabilities block', () => {
      mountTheme({ contractVersion: 1, capabilities: { analytics: 'not-an-array' } });
      expect(() => resolveThemeMetadata(projectRoot, themeName)).toThrow(/Invalid "capabilities"/);
    });
  });
});
