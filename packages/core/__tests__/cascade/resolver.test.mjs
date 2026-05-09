import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  resolveResource,
  scanWithCascade,
  scanDirectoryRecursive,
  determineUserSource,
} from '../../lib/cascade/resolver.mjs';
import { getThemeRoot, buildPaths } from '../../lib/cascade/paths.mjs';

// Mock fs module
vi.mock('fs');

describe('cascade/resolver.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getThemeRoot', () => {
    it('should return correct path to theme in node_modules', () => {
      const projectRoot = '/project';
      const themeName = '@eleventy-plugin-themer/theme-base';

      const result = getThemeRoot(projectRoot, themeName);

      expect(result).toBe(
        path.join('/project', 'node_modules', '@eleventy-plugin-themer/theme-base'),
      );
    });

    it('should handle simple theme names', () => {
      const result = getThemeRoot('/app', 'my-theme');

      expect(result).toBe(path.join('/app', 'node_modules', 'my-theme'));
    });
  });

  describe('buildPaths', () => {
    it('should build correct user and theme paths', () => {
      const projectRoot = '/project';
      const themeName = 'test-theme';
      const resolvedOverridePaths = { layouts: 'overrides/layouts' };

      const result = buildPaths(
        projectRoot,
        themeName,
        resolvedOverridePaths,
        'layouts',
        'base.njk',
      );

      expect(result.user).toBe(path.join('/project', 'overrides/layouts', 'base.njk'));
      expect(result.theme).toBe(
        path.join('/project', 'node_modules', 'test-theme', 'layouts', 'base.njk'),
      );
      expect(result.userDir).toBe(path.join('/project', 'overrides/layouts'));
      expect(result.themeDir).toBe(path.join('/project', 'node_modules', 'test-theme', 'layouts'));
    });

    it('should handle empty filename', () => {
      const result = buildPaths('/project', 'theme', { data: 'content/_data' }, 'data');

      expect(result.user).toBe(path.join('/project', 'content/_data'));
      expect(result.theme).toBe(path.join('/project', 'node_modules', 'theme', 'data'));
    });
  });

  describe('resolveResource', () => {
    it('should return user path when user file exists', () => {
      fs.existsSync.mockImplementation((p) => p.includes('overrides'));

      const result = resolveResource({
        projectRoot: '/project',
        themeName: 'test-theme',
        resolvedOverridePaths: { layouts: 'overrides/layouts' },
        resourceType: 'layouts',
        filename: 'base.njk',
      });

      expect(result.source).toBe('user');
      expect(result.path).toContain('overrides/layouts');
    });

    it('should return theme path when only theme file exists', () => {
      fs.existsSync.mockImplementation((p) => p.includes('node_modules'));

      const result = resolveResource({
        projectRoot: '/project',
        themeName: 'test-theme',
        resolvedOverridePaths: {},
        resourceType: 'layouts',
        filename: 'base.njk',
      });

      expect(result.source).toBe('theme');
      expect(result.path).toContain('node_modules');
    });

    it('should return null when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = resolveResource({
        projectRoot: '/project',
        themeName: 'test-theme',
        resolvedOverridePaths: {},
        resourceType: 'layouts',
        filename: 'missing.njk',
      });

      expect(result).toBeNull();
    });

    it('should throw error when throwOnMissing is true and file not found', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() =>
        resolveResource({
          projectRoot: '/project',
          themeName: 'test-theme',
          resolvedOverridePaths: {},
          resourceType: 'layouts',
          filename: 'missing.njk',
          throwOnMissing: true,
        }),
      ).toThrow();
    });

    it('should use custom error message when provided', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() =>
        resolveResource({
          projectRoot: '/project',
          themeName: 'test-theme',
          resolvedOverridePaths: {},
          resourceType: 'layouts',
          filename: 'missing.njk',
          throwOnMissing: true,
          errorMessage: 'Custom error message',
        }),
      ).toThrow('Custom error message');
    });
  });

  describe('determineUserSource', () => {
    it('should return "override" when item exists in map', () => {
      const existingItems = new Map([['file.js', { name: 'file.js', source: 'theme' }]]);

      const result = determineUserSource(existingItems, 'file.js');

      expect(result).toBe('override');
    });

    it('should return "user" when item does not exist in map', () => {
      const existingItems = new Map();

      const result = determineUserSource(existingItems, 'new-file.js');

      expect(result).toBe('user');
    });
  });

  describe('scanWithCascade', () => {
    it('should handle ENOENT race condition in directory scanning', () => {
      // Simulate: existsSync returns true, but readdirSync throws ENOENT (directory removed between checks)
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });

      const result = scanWithCascade({
        projectRoot: '/project',
        themeName: 'test-theme',
        resolvedOverridePaths: { data: 'content/_data' },
        resourceType: 'data',
      });

      expect(result.size).toBe(0);
    });

    it('should rethrow non-ENOENT errors from directory scanning', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(() => {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      expect(() =>
        scanWithCascade({
          projectRoot: '/project',
          themeName: 'test-theme',
          resolvedOverridePaths: { data: 'content/_data' },
          resourceType: 'data',
        }),
      ).toThrow('EACCES');
    });

    it('should merge theme and user files with correct sources', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('node_modules')) {
          return ['theme-only.js', 'shared.js'];
        }
        return ['user-only.js', 'shared.js'];
      });

      const result = scanWithCascade({
        projectRoot: '/project',
        themeName: 'test-theme',
        resolvedOverridePaths: { data: 'content/_data' },
        resourceType: 'data',
      });

      expect(result.get('theme-only.js').source).toBe('theme');
      expect(result.get('user-only.js').source).toBe('user');
      expect(result.get('shared.js').source).toBe('override');
    });
  });

  describe('scanDirectoryRecursive', () => {
    it('should handle ENOENT race condition gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(() => {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      });

      const result = scanDirectoryRecursive('/vanished');

      expect(result).toEqual([]);
    });

    it('should rethrow non-ENOENT errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(() => {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      expect(() => scanDirectoryRecursive('/protected')).toThrow('EACCES');
    });

    it('should return empty array for nonexistent directory', () => {
      fs.existsSync.mockReturnValue(false);

      const result = scanDirectoryRecursive('/nonexistent');

      expect(result).toEqual([]);
    });

    it('should recursively scan directories', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir, _options) => {
        if (dir === '/base') {
          return [
            { name: 'file1.txt', isDirectory: () => false },
            { name: 'subdir', isDirectory: () => true },
          ];
        }
        if (dir === '/base/subdir') {
          return [{ name: 'file2.txt', isDirectory: () => false }];
        }
        return [];
      });

      const result = scanDirectoryRecursive('/base');

      expect(result).toContain('file1.txt');
      expect(result).toContain(path.join('subdir', 'file2.txt'));
    });
  });
});
