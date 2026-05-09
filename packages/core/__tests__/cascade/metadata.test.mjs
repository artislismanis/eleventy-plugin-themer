import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveThemeMetadata } from '../../lib/cascade/metadata.mjs';

// Mock fs module
vi.mock('fs');

describe('resolveThemeMetadata', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
});
