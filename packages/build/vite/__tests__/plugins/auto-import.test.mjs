import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { themeAutoImportPlugin } from '../../plugins/auto-import.mjs';

vi.mock('fs');
vi.mock('@eleventy-plugin-themer/core', () => ({
  resolveResource: vi.fn(),
  getThemeRoot: vi.fn((projectRoot, themeName) =>
    path.join(projectRoot, 'node_modules', themeName),
  ),
}));

const { resolveResource } = await import('@eleventy-plugin-themer/core');

describe('themeAutoImportPlugin', () => {
  const baseOptions = {
    projectRoot: '/project',
    themeName: 'test-theme',
    stylesEntry: 'styles/main.scss',
    scriptsEntry: 'scripts/main.js',
    resolvedOverridePaths: { scripts: 'overrides/scripts', styles: 'overrides/styles' },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw when required options are missing', () => {
    expect(() => themeAutoImportPlugin({})).toThrow();
    expect(() => themeAutoImportPlugin({ projectRoot: '/p' })).toThrow();
  });

  it('should return a Vite plugin with correct name', () => {
    const plugin = themeAutoImportPlugin(baseOptions);

    expect(plugin.name).toBe('theme-auto-import');
    expect(plugin.transform).toBeDefined();
  });

  it('should return null for non-matching files', () => {
    resolveResource.mockReturnValue({
      path: '/project/overrides/scripts/main.js',
      source: 'user',
    });

    const plugin = themeAutoImportPlugin(baseOptions);
    const result = plugin.transform('console.log("hello")', '/some/other/file.js');

    expect(result).toBeNull();
  });

  it('should return null when no user main script exists', () => {
    resolveResource.mockReturnValue(null);

    const plugin = themeAutoImportPlugin(baseOptions);
    const result = plugin.transform('console.log("hello")', '/any/file.js');

    expect(result).toBeNull();
  });

  it('should return null when main script is from theme (not user)', () => {
    resolveResource.mockReturnValue({
      path: '/project/node_modules/test-theme/scripts/main.js',
      source: 'theme',
    });

    const plugin = themeAutoImportPlugin(baseOptions);
    const result = plugin.transform(
      'console.log("hello")',
      '/project/node_modules/test-theme/scripts/main.js',
    );

    expect(result).toBeNull();
  });

  it('should inject theme imports when transforming user main script', () => {
    const userMainPath = '/project/overrides/scripts/main.js';
    resolveResource.mockReturnValue({
      path: userMainPath,
      source: 'user',
    });
    fs.existsSync.mockReturnValue(true);

    const plugin = themeAutoImportPlugin(baseOptions);
    const result = plugin.transform('// user code', userMainPath);

    expect(result).not.toBeNull();
    expect(result.code).toContain('Auto-imported by theme');
    expect(result.code).toContain("import '");
    expect(result.code).toContain('// user code');
  });

  it('should skip theme style import when theme styles do not exist', () => {
    const userMainPath = '/project/overrides/scripts/main.js';
    resolveResource.mockReturnValue({
      path: userMainPath,
      source: 'user',
    });

    const themeRoot = path.join('/project', 'node_modules', 'test-theme');
    fs.existsSync.mockImplementation((p) => {
      // Only scripts exist, not styles
      return p === path.join(themeRoot, 'scripts/main.js');
    });

    const plugin = themeAutoImportPlugin(baseOptions);
    const result = plugin.transform('// user code', userMainPath);

    expect(result.code).not.toContain('main.scss');
    expect(result.code).toContain('main.js');
  });
});
