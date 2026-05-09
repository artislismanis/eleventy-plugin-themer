import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { configurePassthroughCopy } from '../../lib/cascade/assets.mjs';

// Mock fs module
vi.mock('fs');

describe('cascade/assets.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const projectRoot = '/project';
  const themeMetadata = { name: 'test-theme' };
  const themePublicDir = path.join(projectRoot, 'node_modules', 'test-theme', 'public');
  const userPublicDir = path.join(projectRoot, 'public');

  describe('configurePassthroughCopy', () => {
    it('should register theme assets with eleventyConfig.addPassthroughCopy', () => {
      const mockEleventyConfig = {
        addPassthroughCopy: vi.fn(),
      };

      fs.existsSync.mockImplementation((p) => p === themePublicDir);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themePublicDir) {
          return [{ name: 'favicon.svg', isDirectory: () => false }];
        }
        return [];
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      configurePassthroughCopy(mockEleventyConfig, projectRoot, themeMetadata);

      expect(mockEleventyConfig.addPassthroughCopy).toHaveBeenCalledTimes(1);
    });

    it('should not register user-only assets (Eleventy handles those via passthrough)', () => {
      const mockEleventyConfig = {
        addPassthroughCopy: vi.fn(),
      };

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themePublicDir) return [];
        if (dir === userPublicDir) return [{ name: 'custom-logo.png', isDirectory: () => false }];
        return [];
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      configurePassthroughCopy(mockEleventyConfig, projectRoot, themeMetadata);

      expect(mockEleventyConfig.addPassthroughCopy).not.toHaveBeenCalled();
    });

    it('should not register user override assets with addPassthroughCopy', () => {
      const mockEleventyConfig = {
        addPassthroughCopy: vi.fn(),
      };

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themePublicDir) {
          return [{ name: 'favicon.svg', isDirectory: () => false }];
        }
        if (dir === userPublicDir) {
          return [{ name: 'favicon.svg', isDirectory: () => false }];
        }
        return [];
      });

      vi.spyOn(console, 'log').mockImplementation(() => {});

      configurePassthroughCopy(mockEleventyConfig, projectRoot, themeMetadata);

      // User override means the theme asset is NOT registered (user file wins)
      expect(mockEleventyConfig.addPassthroughCopy).toHaveBeenCalledTimes(0);
    });
  });
});
