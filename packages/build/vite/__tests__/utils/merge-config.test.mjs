import { describe, it, expect } from 'vitest';

import { deepMergeViteConfig } from '../../utils/merge-config.mjs';

describe('merge-config', () => {
  describe('deepMergeViteConfig', () => {
    it('should return theme config when no user config', () => {
      const theme = { root: '/project', appType: 'custom' };

      const result = deepMergeViteConfig(theme);

      expect(result.root).toBe('/project');
      expect(result.appType).toBe('custom');
    });

    it('should shallow merge top-level properties', () => {
      const theme = { root: '/project', appType: 'custom' };
      const user = { root: '/other', mode: 'production' };

      const result = deepMergeViteConfig(theme, user);

      expect(result.root).toBe('/other');
      expect(result.appType).toBe('custom');
      expect(result.mode).toBe('production');
    });

    it('should deep merge resolve.alias', () => {
      const theme = { resolve: { alias: { '@theme': '/theme' } } };
      const user = { resolve: { alias: { '@custom': '/custom' } } };

      const result = deepMergeViteConfig(theme, user);

      expect(result.resolve.alias).toEqual({
        '@theme': '/theme',
        '@custom': '/custom',
      });
    });

    it('should allow user alias to override theme alias', () => {
      const theme = { resolve: { alias: { '@theme': '/theme' } } };
      const user = { resolve: { alias: { '@theme': '/override' } } };

      const result = deepMergeViteConfig(theme, user);

      expect(result.resolve.alias['@theme']).toBe('/override');
    });

    it('should deep merge css.preprocessorOptions.scss', () => {
      const theme = {
        css: {
          preprocessorOptions: {
            scss: { api: 'modern-compiler', additionalData: '$theme: base;' },
          },
        },
      };
      const user = {
        css: {
          preprocessorOptions: {
            scss: { additionalData: '$custom: true;' },
          },
        },
      };

      const result = deepMergeViteConfig(theme, user);

      expect(result.css.preprocessorOptions.scss.api).toBe('modern-compiler');
      expect(result.css.preprocessorOptions.scss.additionalData).toBe('$custom: true;');
    });

    it('should concatenate plugins (theme first, user second)', () => {
      const themePlugin = { name: 'theme-plugin' };
      const userPlugin = { name: 'user-plugin' };
      const theme = { plugins: [themePlugin] };
      const user = { plugins: [userPlugin] };

      const result = deepMergeViteConfig(theme, user);

      expect(result.plugins).toEqual([themePlugin, userPlugin]);
    });

    it('should handle missing plugins in theme config', () => {
      const theme = {};
      const user = { plugins: [{ name: 'user-plugin' }] };

      const result = deepMergeViteConfig(theme, user);

      expect(result.plugins).toHaveLength(1);
    });

    it('should handle missing plugins in user config', () => {
      const theme = { plugins: [{ name: 'theme-plugin' }] };

      const result = deepMergeViteConfig(theme, {});

      expect(result.plugins).toHaveLength(1);
    });

    it('should handle missing resolve in both configs', () => {
      const result = deepMergeViteConfig({}, {});

      expect(result.resolve).toBeDefined();
      expect(result.resolve.alias).toEqual({});
    });

    it('should handle missing css in both configs', () => {
      const result = deepMergeViteConfig({}, {});

      expect(result.css).toBeDefined();
      expect(result.css.preprocessorOptions.scss).toEqual({});
    });

    it('should preserve other resolve properties', () => {
      const theme = { resolve: { extensions: ['.js'], alias: { '@a': '/a' } } };
      const user = { resolve: { dedupe: ['vue'] } };

      const result = deepMergeViteConfig(theme, user);

      expect(result.resolve.extensions).toEqual(['.js']);
      expect(result.resolve.dedupe).toEqual(['vue']);
      expect(result.resolve.alias['@a']).toBe('/a');
    });

    it('should deep merge build options preserving rollupOptions', () => {
      const theme = {
        build: {
          sourcemap: true,
          rollupOptions: { input: { main: '/main.js' }, output: { dir: 'dist' } },
        },
      };
      const user = {
        build: {
          minify: false,
          rollupOptions: { input: { extra: '/extra.js' } },
        },
      };

      const result = deepMergeViteConfig(theme, user);

      expect(result.build.sourcemap).toBe(true);
      expect(result.build.minify).toBe(false);
      expect(result.build.rollupOptions.input).toEqual({ main: '/main.js', extra: '/extra.js' });
      expect(result.build.rollupOptions.output).toEqual({ dir: 'dist' });
    });

    it('should deep merge server options', () => {
      const theme = { server: { port: 3000, host: true } };
      const user = { server: { port: 8080, open: true } };

      const result = deepMergeViteConfig(theme, user);

      expect(result.server.port).toBe(8080);
      expect(result.server.host).toBe(true);
      expect(result.server.open).toBe(true);
    });

    it('should handle missing build/server in both configs', () => {
      const result = deepMergeViteConfig({}, {});

      expect(result.build).toBeDefined();
      expect(result.build.rollupOptions).toEqual({ input: {} });
      expect(result.server).toBeDefined();
    });

    it('should not allow prototype pollution via __proto__ in theme config', () => {
      const theme = JSON.parse('{"__proto__": {"polluted": true}, "root": "/project"}');
      const user = {};

      deepMergeViteConfig(theme, user);

      expect({}.polluted).toBeUndefined();
    });

    it('should not allow prototype pollution via __proto__ in user config', () => {
      const theme = { root: '/project' };
      const user = JSON.parse('{"__proto__": {"polluted": true}}');

      deepMergeViteConfig(theme, user);

      expect({}.polluted).toBeUndefined();
    });

    it('should strip constructor and prototype keys', () => {
      const theme = { root: '/project' };
      const user = { constructor: { prototype: { polluted: true } } };

      const result = deepMergeViteConfig(theme, user);

      // constructor key should not be an own property on result
      expect(Object.hasOwn(result, 'constructor')).toBe(false);
      expect({}.polluted).toBeUndefined();
    });
  });
});
