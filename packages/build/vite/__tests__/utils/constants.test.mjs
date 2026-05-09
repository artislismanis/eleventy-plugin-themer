import { describe, it, expect } from 'vitest';

import { GLOB_PATTERNS, ASSET_PATHS } from '../../utils/constants.mjs';

describe('constants', () => {
  describe('GLOB_PATTERNS', () => {
    it('should generate HTML glob pattern', () => {
      expect(GLOB_PATTERNS.html('_site')).toBe('_site/**/*.html');
    });

    it('should generate CSS glob pattern', () => {
      expect(GLOB_PATTERNS.css('_site')).toBe('_site/assets/css/*.css');
    });
  });

  describe('ASSET_PATHS', () => {
    it('should have standard asset paths', () => {
      expect(ASSET_PATHS.scripts).toBe('assets/scripts');
      expect(ASSET_PATHS.css).toBe('assets/css');
      expect(ASSET_PATHS.fonts).toBe('assets/fonts');
      expect(ASSET_PATHS.images).toBe('assets/images');
    });
  });
});
