import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getThemeRoot, buildPaths } from '../../lib/cascade/paths.mjs';
import { DEFAULT_OVERRIDE_PATHS } from '../../lib/defaults.mjs';

describe('path utilities (future paths.mjs)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getThemeRoot', () => {
    it('should return correct path for scoped package names', () => {
      const result = getThemeRoot('/project', '@eleventy-plugin-themer/theme-base');

      expect(result).toBe(
        path.join('/project', 'node_modules', '@eleventy-plugin-themer/theme-base'),
      );
    });

    it('should return correct path for simple package names', () => {
      const result = getThemeRoot('/project', 'my-theme');

      expect(result).toBe(path.join('/project', 'node_modules', 'my-theme'));
    });

    it('should handle different project roots', () => {
      const result = getThemeRoot('/home/user/site', 'theme');

      expect(result).toBe(path.join('/home/user/site', 'node_modules', 'theme'));
    });
  });

  describe('buildPaths', () => {
    it('should construct correct user and theme paths with filename', () => {
      const result = buildPaths(
        '/project',
        'test-theme',
        { layouts: 'overrides/layouts' },
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

    it('should construct correct paths without filename', () => {
      const result = buildPaths('/project', 'theme', { data: 'content/_data' }, 'data');

      expect(result.user).toBe(path.join('/project', 'content/_data'));
      expect(result.theme).toBe(path.join('/project', 'node_modules', 'theme', 'data'));
    });

    it('should use default override paths when key not in resolvedOverridePaths', () => {
      const result = buildPaths('/project', 'theme', {}, 'layouts');

      expect(result.userDir).toBe(path.join('/project', DEFAULT_OVERRIDE_PATHS.layouts));
    });

    it('should handle scoped theme names correctly', () => {
      const result = buildPaths(
        '/project',
        '@scope/theme',
        { features: 'overrides/features' },
        'features',
      );

      expect(result.themeDir).toBe(
        path.join('/project', 'node_modules', '@scope/theme', 'features'),
      );
    });

    it('should map resource types to theme directory names', () => {
      // The THEME_RESOURCE_PATHS maps resource types to directory names
      const types = ['layouts', 'features', 'styles', 'scripts', 'data', 'public'];

      types.forEach((type) => {
        const result = buildPaths('/project', 'theme', {}, type);
        expect(result.themeDir).toBe(path.join('/project', 'node_modules', 'theme', type));
      });
    });
  });
});
