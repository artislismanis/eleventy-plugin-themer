import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { deepMergeConfig, configureThemeConfig } from '../../lib/cascade/config.mjs';

// Mock fs module
vi.mock('fs');

describe('cascade/config.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deepMergeConfig', () => {
    it('should deep merge nested objects', () => {
      const target = { colors: { primary: '#333', secondary: '#666' } };
      const source = { colors: { primary: '#000' } };

      const result = deepMergeConfig(target, source);

      expect(result.colors.primary).toBe('#000');
      expect(result.colors.secondary).toBe('#666');
    });

    it('should handle null clearing', () => {
      const target = { feature: { enabled: true, config: {} } };
      const source = { feature: null };

      const result = deepMergeConfig(target, source);

      expect(result.feature).toBeNull();
    });

    it('should replace arrays instead of concatenating', () => {
      const target = { tags: ['a', 'b', 'c'] };
      const source = { tags: ['x', 'y'] };

      const result = deepMergeConfig(target, source);

      expect(result.tags).toEqual(['x', 'y']);
    });

    it('should skip undefined values', () => {
      const target = { key: 'original' };
      const source = { key: undefined };

      const result = deepMergeConfig(target, source);

      expect(result.key).toBe('original');
    });

    it('should overwrite primitives', () => {
      const target = { count: 5, name: 'old' };
      const source = { count: 10, name: 'new' };

      const result = deepMergeConfig(target, source);

      expect(result.count).toBe(10);
      expect(result.name).toBe('new');
    });

    it('should return copy of target when source is null/undefined', () => {
      const target = { key: 'value' };

      expect(deepMergeConfig(target, null)).toEqual({ key: 'value' });
      expect(deepMergeConfig(target, undefined)).toEqual({ key: 'value' });
    });

    it('should return copy of source when target is null/undefined', () => {
      const source = { key: 'value' };

      expect(deepMergeConfig(null, source)).toEqual({ key: 'value' });
      expect(deepMergeConfig(undefined, source)).toEqual({ key: 'value' });
    });

    it('should not mutate original objects', () => {
      const target = { nested: { a: 1 } };
      const source = { nested: { b: 2 } };

      deepMergeConfig(target, source);

      expect(target.nested).toEqual({ a: 1 });
      expect(source.nested).toEqual({ b: 2 });
    });

    it('should handle deeply nested merges', () => {
      const target = { a: { b: { c: { d: 1 } } } };
      const source = { a: { b: { c: { e: 2 } } } };

      const result = deepMergeConfig(target, source);

      expect(result.a.b.c.d).toBe(1);
      expect(result.a.b.c.e).toBe(2);
    });

    it('should not allow prototype pollution via __proto__', () => {
      const target = {};
      const source = JSON.parse('{"__proto__": {"polluted": true}}');

      deepMergeConfig(target, source);

      expect({}.polluted).toBeUndefined();
    });

    it('should not allow prototype pollution via constructor', () => {
      const target = {};
      const source = { constructor: { prototype: { polluted: true } } };

      deepMergeConfig(target, source);

      expect({}.polluted).toBeUndefined();
    });

    it('should not allow prototype pollution via nested __proto__', () => {
      const target = { nested: {} };
      const source = { nested: JSON.parse('{"__proto__": {"polluted": true}}') };

      deepMergeConfig(target, source);

      expect({}.polluted).toBeUndefined();
    });
  });

  describe('configureThemeConfig', () => {
    it('should register theme config as global data using theme defaults when no user config', async () => {
      const projectRoot = '/project';
      const themeMetadata = {
        name: 'test-theme',
        config: {
          colors: { primary: '#333', secondary: '#666' },
          navigation: { showHomeLink: true },
        },
      };
      const mockEleventyConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockReturnValue(false);

      configureThemeConfig(mockEleventyConfig, projectRoot, themeMetadata);

      expect(mockEleventyConfig.addGlobalData).toHaveBeenCalledWith('theme', expect.any(Function));

      // Call the registered callback and verify it returns theme defaults
      const callback = mockEleventyConfig.addGlobalData.mock.calls[0][1];
      const result = await callback();
      expect(result).toEqual(themeMetadata.config);
    });

    it('should register theme config returning empty object when metadata has no config', async () => {
      const projectRoot = '/project';
      const themeMetadata = { name: 'test-theme' };
      const mockEleventyConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockReturnValue(false);

      configureThemeConfig(mockEleventyConfig, projectRoot, themeMetadata);

      const callback = mockEleventyConfig.addGlobalData.mock.calls[0][1];
      const result = await callback();
      expect(result).toEqual({});
    });

    it('should re-throw errors when user config file fails to import', async () => {
      const projectRoot = '/project';
      const themeMetadata = { name: 'test-theme' };
      const mockEleventyConfig = { addGlobalData: vi.fn() };
      const configPath = path.join(projectRoot, 'theme.config.mjs');

      fs.existsSync.mockImplementation((p) => p === configPath);

      configureThemeConfig(mockEleventyConfig, projectRoot, themeMetadata);

      const callback = mockEleventyConfig.addGlobalData.mock.calls[0][1];
      // Import will fail because the file doesn't exist on disk
      await expect(callback()).rejects.toThrow();
    });
  });
});
