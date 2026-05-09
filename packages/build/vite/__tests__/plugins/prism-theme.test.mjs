import { describe, it, expect } from 'vitest';

import { prismThemePlugin } from '../../plugins/prism-theme.mjs';

const BUNDLED_THEMES = [
  'prism',
  'prism-coy',
  'prism-dark',
  'prism-funky',
  'prism-okaidia',
  'prism-solarizedlight',
  'prism-tomorrow',
  'prism-twilight',
];

describe('prismThemePlugin', () => {
  describe('validation', () => {
    it('should throw for invalid theme name and surface the bundled list', () => {
      let err;
      try {
        prismThemePlugin({ prismTheme: 'nonexistent' });
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.message).toContain('[prism-theme] Invalid theme "nonexistent"');
      for (const theme of BUNDLED_THEMES) {
        expect(err.message).toContain(theme);
      }
    });

    it('should throw for path traversal attempt', () => {
      expect(() => prismThemePlugin({ prismTheme: '../../malicious' })).toThrow(
        '[prism-theme] Invalid theme',
      );
    });

    it('should not throw for valid theme names', () => {
      for (const theme of BUNDLED_THEMES) {
        expect(() => prismThemePlugin({ prismTheme: theme })).not.toThrow();
      }
    });

    it('should not throw with default options', () => {
      expect(() => prismThemePlugin()).not.toThrow();
    });
  });

  describe('resolveId', () => {
    it('should resolve virtual:prism-theme', () => {
      const plugin = prismThemePlugin();

      expect(plugin.resolveId('virtual:prism-theme')).toBe('\0virtual:prism-theme');
    });

    it('should return undefined for other module IDs', () => {
      const plugin = prismThemePlugin();

      expect(plugin.resolveId('other-module')).toBeUndefined();
      expect(plugin.resolveId('./styles.scss')).toBeUndefined();
    });
  });

  describe('load', () => {
    it('should generate default theme import with diff-highlight', () => {
      const plugin = prismThemePlugin();
      const code = plugin.load('\0virtual:prism-theme');

      expect(code).toContain("import 'prismjs/themes/prism-tomorrow.css'");
      expect(code).toContain("import 'prismjs/plugins/diff-highlight/prism-diff-highlight.css'");
    });

    it('should generate custom theme import', () => {
      const plugin = prismThemePlugin({ prismTheme: 'prism-okaidia' });
      const code = plugin.load('\0virtual:prism-theme');

      expect(code).toContain("import 'prismjs/themes/prism-okaidia.css'");
    });

    it('should omit diff-highlight when disabled', () => {
      const plugin = prismThemePlugin({ diffHighlight: false });
      const code = plugin.load('\0virtual:prism-theme');

      expect(code).toContain("import 'prismjs/themes/prism-tomorrow.css'");
      expect(code).not.toContain('diff-highlight');
    });

    it('should return undefined for other module IDs', () => {
      const plugin = prismThemePlugin();

      expect(plugin.load('other-module')).toBeUndefined();
    });
  });

  describe('plugin metadata', () => {
    it('should have correct plugin name', () => {
      const plugin = prismThemePlugin();

      expect(plugin.name).toBe('eleventy-themes-prism-theme');
    });
  });
});
