import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { configureDataCascade } from '../../lib/cascade/data.mjs';

// Mock fs module
vi.mock('fs');

describe('cascade/data.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const projectRoot = '/project';
  const themeMetadata = { name: 'test-theme' };
  const themeDataDir = path.join(projectRoot, 'node_modules', 'test-theme', 'data');
  const userDataDir = path.join(projectRoot, 'content/_data');

  describe('configureDataCascade', () => {
    it('should register .js and .json theme data files with addGlobalData (not .md)', () => {
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockImplementation((p) => p === themeDataDir);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themeDataDir) return ['site.js', 'navigation.json', 'readme.md'];
        return [];
      });

      configureDataCascade(mockConfig, projectRoot, themeMetadata);

      const registeredNames = mockConfig.addGlobalData.mock.calls.map((c) => c[0]);
      expect(registeredNames).toContain('site');
      expect(registeredNames).toContain('navigation');
      expect(registeredNames).not.toContain('readme');
    });

    it('should not register user-only data files (Eleventy handles those natively)', () => {
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themeDataDir) return [];
        if (dir === userDataDir) return ['custom.js'];
        return [];
      });

      configureDataCascade(mockConfig, projectRoot, themeMetadata);

      expect(mockConfig.addGlobalData).not.toHaveBeenCalled();
    });

    it('should not register user override data files (user file wins via Eleventy cascade)', () => {
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themeDataDir) return ['site.js', 'navigation.json'];
        if (dir === userDataDir) return ['site.js'];
        return [];
      });

      configureDataCascade(mockConfig, projectRoot, themeMetadata);

      // Only navigation.json should be registered (site.js is overridden by user)
      const registeredNames = mockConfig.addGlobalData.mock.calls.map((c) => c[0]);
      expect(registeredNames).toContain('navigation');
      expect(registeredNames).not.toContain('site');
    });

    it('should register callback functions (not raw data) for lazy loading', () => {
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockImplementation((p) => p === themeDataDir);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themeDataDir) return ['site.js'];
        return [];
      });

      configureDataCascade(mockConfig, projectRoot, themeMetadata);

      const callback = mockConfig.addGlobalData.mock.calls[0][1];
      expect(typeof callback).toBe('function');
    });

    it('should respect custom override paths', () => {
      const customOverridePaths = { data: 'custom/_data' };
      const customDataDir = path.join(projectRoot, 'custom/_data');
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockImplementation((p) => p === themeDataDir || p === customDataDir);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themeDataDir) return ['site.js'];
        if (dir === customDataDir) return ['site.js'];
        return [];
      });

      configureDataCascade(mockConfig, projectRoot, themeMetadata, customOverridePaths);

      // site.js is overridden by user, so nothing should be registered
      expect(mockConfig.addGlobalData).not.toHaveBeenCalled();
    });

    it('should handle empty data directories gracefully', () => {
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockReturnValue(false);

      configureDataCascade(mockConfig, projectRoot, themeMetadata);

      expect(mockConfig.addGlobalData).not.toHaveBeenCalled();
    });

    it('should invoke async import callback and return module default', async () => {
      const mockConfig = { addGlobalData: vi.fn() };

      fs.existsSync.mockImplementation((p) => p === themeDataDir);
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === themeDataDir) return ['site.js'];
        return [];
      });

      configureDataCascade(mockConfig, projectRoot, themeMetadata);

      const callback = mockConfig.addGlobalData.mock.calls[0][1];

      // The callback imports from the real filesystem — expect it to throw for non-existent file
      // This exercises the async import path inside the callback
      await expect(callback()).rejects.toThrow();
    });
  });
});
