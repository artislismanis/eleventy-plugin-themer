import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAvailableFeatures, resolveResource } from '@eleventy-plugin-themer/core/internal/api';

import { getFeaturePathsForBuild, getFeatureEntries } from '../../utils/features.mjs';

vi.mock('@eleventy-plugin-themer/core/internal/api', () => ({
  getAvailableFeatures: vi.fn(),
  resolveFeatureEntryPath: vi.fn(),
  resolveResource: vi.fn(),
}));

vi.mock('@eleventy-plugin-themer/core/internal/defaults', () => ({
  DEFAULT_ASSET_ENTRIES: {
    styles: 'styles/main.scss',
    scripts: 'scripts/main.js',
  },
}));

describe('build-vite/utils/features.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFeaturePathsForBuild', () => {
    it('should return Map of feature name to path', () => {
      const mockFeatures = new Map([
        [
          'code-highlighting',
          { name: 'code-highlighting', path: '/path/to/code.js', source: 'theme' },
        ],
        ['gallery', { name: 'gallery', path: '/path/to/gallery.js', source: 'user' }],
      ]);

      const result = getFeaturePathsForBuild(mockFeatures);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('code-highlighting')).toBe('/path/to/code.js');
      expect(result.get('gallery')).toBe('/path/to/gallery.js');
    });

    it('should return empty Map when given empty Map', () => {
      const result = getFeaturePathsForBuild(new Map());
      expect(result.size).toBe(0);
    });

    it('should throw TypeError when discoveredFeatures is missing', () => {
      expect(() => getFeaturePathsForBuild()).toThrow(TypeError);
      expect(() => getFeaturePathsForBuild(null)).toThrow(/discoveredFeatures/);
      expect(() => getFeaturePathsForBuild({})).toThrow(/discoveredFeatures/);
    });
  });

  describe('getFeatureEntries', () => {
    const mockThemeMetadata = {
      name: '@eleventy-plugin-themer/theme-base',
    };

    it('should include main entry point', () => {
      const mockFeatures = new Map();
      getAvailableFeatures.mockReturnValue(mockFeatures);
      resolveResource.mockReturnValue({ path: '/project/scripts/main.js', source: 'theme' });

      const result = getFeatureEntries('/project', mockThemeMetadata);

      expect(result.main).toBe('/project/scripts/main.js');
    });

    it('should include all discovered features as entry points', () => {
      const mockFeatures = new Map([
        [
          'code-highlighting',
          { name: 'code-highlighting', path: '/features/code.js', source: 'theme' },
        ],
        ['gallery', { name: 'gallery', path: '/features/gallery.js', source: 'user' }],
      ]);
      getAvailableFeatures.mockReturnValue(mockFeatures);
      resolveResource.mockReturnValue({ path: '/project/scripts/main.js', source: 'theme' });

      const result = getFeatureEntries('/project', mockThemeMetadata);

      expect(result['/code-highlighting.js']).toBe('/features/code.js');
      expect(result['/gallery.js']).toBe('/features/gallery.js');
    });

    it('should use custom asset entry from theme metadata', () => {
      const metadataWithCustomEntry = {
        name: 'test-theme',
        assets: {
          scripts: {
            entry: 'scripts/custom.js',
          },
        },
      };
      getAvailableFeatures.mockReturnValue(new Map());
      resolveResource.mockReturnValue({ path: '/project/scripts/custom.js', source: 'theme' });

      getFeatureEntries('/project', metadataWithCustomEntry);

      expect(resolveResource).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'custom.js',
        }),
      );
    });

    it('should pass resolved override paths to core functions', () => {
      const resolvedPaths = {
        layouts: 'overrides/layouts',
        features: 'custom/features',
        styles: 'overrides/styles',
        scripts: 'overrides/scripts',
        data: 'content/_data',
        public: 'public',
      };
      getAvailableFeatures.mockReturnValue(new Map());
      resolveResource.mockReturnValue({ path: '/project/scripts/main.js', source: 'theme' });

      getFeatureEntries('/project', mockThemeMetadata, { resolvedOverridePaths: resolvedPaths });

      expect(getAvailableFeatures).toHaveBeenCalledWith(
        '/project',
        mockThemeMetadata,
        resolvedPaths,
      );
    });

    it('should skip getAvailableFeatures when discoveredFeatures provided', () => {
      const preDiscovered = new Map([
        ['existing', { name: 'existing', path: '/x/existing.js', source: 'theme' }],
      ]);
      resolveResource.mockReturnValue({ path: '/project/scripts/main.js', source: 'theme' });

      const result = getFeatureEntries('/project', mockThemeMetadata, {
        discoveredFeatures: preDiscovered,
      });

      expect(getAvailableFeatures).not.toHaveBeenCalled();
      expect(result['/existing.js']).toBe('/x/existing.js');
    });

    it('should log feature discovery when features exist', () => {
      const mockFeatures = new Map([
        [
          'code-highlighting',
          { name: 'code-highlighting', path: '/features/code.js', source: 'theme' },
        ],
      ]);
      getAvailableFeatures.mockReturnValue(mockFeatures);
      resolveResource.mockReturnValue({ path: '/project/scripts/main.js', source: 'theme' });

      getFeatureEntries('/project', mockThemeMetadata);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Discovered features'));
    });

    it('should not log when no features found', () => {
      getAvailableFeatures.mockReturnValue(new Map());
      resolveResource.mockReturnValue({ path: '/project/scripts/main.js', source: 'theme' });

      getFeatureEntries('/project', mockThemeMetadata);

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Discovered features'));
    });
  });
});
