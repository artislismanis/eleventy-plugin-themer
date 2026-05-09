import { describe, it, expect } from 'vitest';

import {
  DEFAULT_OVERRIDE_PATHS,
  DEFAULT_ASSET_ENTRIES,
  FEATURE_CONVENTIONS,
  resolveOverridePaths,
} from '../lib/defaults.mjs';

describe('defaults.mjs', () => {
  describe('DEFAULT_OVERRIDE_PATHS', () => {
    it('should have all required path keys', () => {
      expect(DEFAULT_OVERRIDE_PATHS).toHaveProperty('layouts');
      expect(DEFAULT_OVERRIDE_PATHS).toHaveProperty('features');
      expect(DEFAULT_OVERRIDE_PATHS).toHaveProperty('styles');
      expect(DEFAULT_OVERRIDE_PATHS).toHaveProperty('scripts');
      expect(DEFAULT_OVERRIDE_PATHS).toHaveProperty('data');
      expect(DEFAULT_OVERRIDE_PATHS).toHaveProperty('public');
    });

    it('should use conventional override paths', () => {
      expect(DEFAULT_OVERRIDE_PATHS.layouts).toBe('overrides/layouts');
      expect(DEFAULT_OVERRIDE_PATHS.features).toBe('overrides/features');
      expect(DEFAULT_OVERRIDE_PATHS.styles).toBe('overrides/styles');
      expect(DEFAULT_OVERRIDE_PATHS.scripts).toBe('overrides/scripts');
      expect(DEFAULT_OVERRIDE_PATHS.data).toBe('content/_data');
      expect(DEFAULT_OVERRIDE_PATHS.public).toBe('public');
    });
  });

  describe('DEFAULT_ASSET_ENTRIES', () => {
    it('should have styles and scripts entries', () => {
      expect(DEFAULT_ASSET_ENTRIES).toHaveProperty('styles');
      expect(DEFAULT_ASSET_ENTRIES).toHaveProperty('scripts');
    });

    it('should use conventional entry points', () => {
      expect(DEFAULT_ASSET_ENTRIES.styles).toBe('styles/main.scss');
      expect(DEFAULT_ASSET_ENTRIES.scripts).toBe('scripts/main.js');
    });
  });

  describe('FEATURE_CONVENTIONS', () => {
    it('should have autoInit and entry conventions', () => {
      expect(FEATURE_CONVENTIONS).toHaveProperty('autoInit');
      expect(FEATURE_CONVENTIONS).toHaveProperty('entry');
    });

    it('should use conventional filenames', () => {
      expect(FEATURE_CONVENTIONS.autoInit).toBe('index.auto.js');
      expect(FEATURE_CONVENTIONS.entry).toBe('index.js');
    });
  });

  describe('resolveOverridePaths', () => {
    it('should return framework defaults when called with no arguments', () => {
      const result = resolveOverridePaths();

      expect(result).toEqual(DEFAULT_OVERRIDE_PATHS);
    });

    it('should return framework defaults when called with empty objects', () => {
      const result = resolveOverridePaths({}, {});

      expect(result).toEqual(DEFAULT_OVERRIDE_PATHS);
    });

    it('should merge theme defaults over framework defaults', () => {
      const themeMetadata = {
        cascade: {
          defaultOverridePaths: {
            layouts: 'theme-layouts',
            data: 'theme-data',
          },
        },
      };

      const result = resolveOverridePaths(themeMetadata);

      expect(result.layouts).toBe('theme-layouts');
      expect(result.data).toBe('theme-data');
      // Other paths should remain as framework defaults
      expect(result.features).toBe(DEFAULT_OVERRIDE_PATHS.features);
      expect(result.styles).toBe(DEFAULT_OVERRIDE_PATHS.styles);
    });

    it('should merge user overrides over theme defaults', () => {
      const themeMetadata = {
        cascade: {
          defaultOverridePaths: {
            layouts: 'theme-layouts',
          },
        },
      };
      const userOverridePaths = {
        layouts: 'user-layouts',
      };

      const result = resolveOverridePaths(themeMetadata, userOverridePaths);

      expect(result.layouts).toBe('user-layouts');
    });

    it('should respect priority: user > theme > framework', () => {
      const themeMetadata = {
        cascade: {
          defaultOverridePaths: {
            layouts: 'theme-layouts',
            features: 'theme-features',
          },
        },
      };
      const userOverridePaths = {
        layouts: 'user-layouts',
      };

      const result = resolveOverridePaths(themeMetadata, userOverridePaths);

      // User override takes precedence
      expect(result.layouts).toBe('user-layouts');
      // Theme default takes precedence over framework
      expect(result.features).toBe('theme-features');
      // Framework default when no override
      expect(result.styles).toBe(DEFAULT_OVERRIDE_PATHS.styles);
    });

    it('should handle null themeMetadata gracefully', () => {
      const result = resolveOverridePaths(null, { layouts: 'custom' });

      expect(result.layouts).toBe('custom');
      expect(result.features).toBe(DEFAULT_OVERRIDE_PATHS.features);
    });

    it('should handle themeMetadata without cascade property', () => {
      const themeMetadata = {
        name: 'test-theme',
        version: '1.0.0',
      };

      const result = resolveOverridePaths(themeMetadata);

      expect(result).toEqual(DEFAULT_OVERRIDE_PATHS);
    });

    it('should handle themeMetadata with empty cascade', () => {
      const themeMetadata = {
        cascade: {},
      };

      const result = resolveOverridePaths(themeMetadata);

      expect(result).toEqual(DEFAULT_OVERRIDE_PATHS);
    });
  });
});
