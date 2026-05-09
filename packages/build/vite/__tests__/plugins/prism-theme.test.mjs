import { describe, it, expect } from 'vitest';

import { prismThemePlugin, VALID_THEMES } from '../../plugins/prism-theme.mjs';

describe('prismThemePlugin', () => {
  describe('VALID_THEMES', () => {
    it('should contain all bundled PrismJS themes', () => {
      expect(VALID_THEMES).toContain('prism');
      expect(VALID_THEMES).toContain('prism-coy');
      expect(VALID_THEMES).toContain('prism-dark');
      expect(VALID_THEMES).toContain('prism-funky');
      expect(VALID_THEMES).toContain('prism-okaidia');
      expect(VALID_THEMES).toContain('prism-solarizedlight');
      expect(VALID_THEMES).toContain('prism-tomorrow');
      expect(VALID_THEMES).toContain('prism-twilight');
      expect(VALID_THEMES.size).toBe(8);
    });
  });

  describe('validation', () => {
    it('should throw for invalid theme name', () => {
      expect(() => prismThemePlugin({ prismTheme: 'nonexistent' })).toThrow(
        '[prism-theme] Invalid theme "nonexistent"',
      );
    });

    it('should throw for path traversal attempt', () => {
      expect(() => prismThemePlugin({ prismTheme: '../../malicious' })).toThrow(
        '[prism-theme] Invalid theme',
      );
    });

    it('should not throw for valid theme names', () => {
      for (const theme of VALID_THEMES) {
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
