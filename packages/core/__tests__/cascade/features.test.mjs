import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveFeatureEntryPath, getAvailableFeatures } from '../../lib/cascade/features.mjs';
import { FEATURE_CONVENTIONS } from '../../lib/defaults.mjs';

// Mock fs module
vi.mock('fs');

describe('cascade/features.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveFeatureEntryPath', () => {
    it('should prefer index.auto.js when both exist', () => {
      fs.existsSync.mockImplementation((p) => {
        return p.endsWith(FEATURE_CONVENTIONS.autoInit) || p.endsWith(FEATURE_CONVENTIONS.entry);
      });

      const result = resolveFeatureEntryPath('/features/code-highlighting');

      expect(result).toBe(path.join('/features/code-highlighting', FEATURE_CONVENTIONS.autoInit));
    });

    it('should return index.js when index.auto.js does not exist', () => {
      fs.existsSync.mockImplementation((p) => {
        return p.endsWith(FEATURE_CONVENTIONS.entry);
      });

      const result = resolveFeatureEntryPath('/features/gallery');

      expect(result).toBe(path.join('/features/gallery', FEATURE_CONVENTIONS.entry));
    });

    it('should return null when neither entry file exists', () => {
      fs.existsSync.mockReturnValue(false);

      const result = resolveFeatureEntryPath('/features/missing');

      expect(result).toBeNull();
    });
  });

  describe('getAvailableFeatures', () => {
    const mockThemeMetadata = {
      name: '@eleventy-plugin-themer/theme-base',
      themeFeatures: [
        { name: 'code-highlighting', entry: 'features/code-highlighting/index.js' },
        { name: 'gallery', entry: 'features/gallery/index.js' },
      ],
    };

    it('should return theme features from metadata', () => {
      // Mock theme feature files exist
      fs.existsSync.mockImplementation((p) => {
        return (
          p.includes('node_modules') && (p.endsWith('index.auto.js') || p.endsWith('index.js'))
        );
      });

      const result = getAvailableFeatures('/project', mockThemeMetadata);

      expect(result.has('code-highlighting')).toBe(true);
      expect(result.get('code-highlighting').source).toBe('theme');
    });

    it('should detect user features from override directory', () => {
      fs.existsSync.mockImplementation((p) => {
        // Theme features
        if (p.includes('node_modules') && p.endsWith('index.auto.js')) {
          return true;
        }
        // User features directory
        if (p.includes('overrides/features') && !p.includes('.')) {
          return true;
        }
        // User feature entry
        if (p.includes('overrides/features') && p.endsWith('index.js')) {
          return true;
        }
        return false;
      });

      fs.readdirSync.mockImplementation((dir, _options) => {
        if (dir.includes('overrides/features')) {
          return [{ name: 'custom-feature', isDirectory: () => true }];
        }
        return [];
      });

      const result = getAvailableFeatures('/project', mockThemeMetadata);

      expect(result.has('custom-feature')).toBe(true);
      expect(result.get('custom-feature').source).toBe('user');
    });

    it('should mark user features that override theme features as "override"', () => {
      fs.existsSync.mockImplementation((p) => {
        // Theme features
        if (p.includes('node_modules') && p.endsWith('index.auto.js')) {
          return true;
        }
        // User features directory
        if (p.includes('overrides/features') && !p.includes('.')) {
          return true;
        }
        // User feature entry
        if (p.includes('overrides/features') && p.endsWith('index.js')) {
          return true;
        }
        return false;
      });

      fs.readdirSync.mockImplementation((dir, _options) => {
        if (dir.includes('overrides/features')) {
          // Override an existing theme feature
          return [{ name: 'code-highlighting', isDirectory: () => true }];
        }
        return [];
      });

      const result = getAvailableFeatures('/project', mockThemeMetadata);

      expect(result.get('code-highlighting').source).toBe('override');
      expect(result.get('code-highlighting').path).toContain('overrides/features');
    });

    it('should return empty map when no features exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = getAvailableFeatures('/project', { name: 'empty-theme' });

      expect(result.size).toBe(0);
    });

    it('should skip features without valid entry points', () => {
      fs.existsSync.mockReturnValue(false);

      const result = getAvailableFeatures('/project', mockThemeMetadata);

      expect(result.size).toBe(0);
    });

    it('should use custom override paths when provided', () => {
      const customPaths = { features: 'custom/features' };

      fs.existsSync.mockImplementation((p) => {
        return p.includes('custom/features');
      });

      fs.readdirSync.mockImplementation((dir, _options) => {
        if (dir.includes('custom/features')) {
          return [{ name: 'custom-feature', isDirectory: () => true }];
        }
        return [];
      });

      getAvailableFeatures('/project', { name: 'test-theme' }, customPaths);

      // Should check custom path
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('custom/features'));
    });

    it('should handle themeMetadata without themeFeatures array', () => {
      fs.existsSync.mockReturnValue(false);

      const result = getAvailableFeatures('/project', { name: 'test-theme' });

      expect(result.size).toBe(0);
    });
  });
});
