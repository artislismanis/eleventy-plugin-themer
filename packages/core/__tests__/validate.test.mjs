import fs from 'fs';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { validateTheme, validateComponent, logValidation } from '../lib/validate.mjs';

// Mock fs module
vi.mock('fs');

describe('validate.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateTheme', () => {
    const mockThemeMetadata = {
      name: '@eleventy-plugin-themer/theme-base',
    };

    it('should return valid when all requirements are met', () => {
      fs.existsSync.mockReturnValue(true);

      const result = validateTheme('/project', mockThemeMetadata);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when theme package not found', () => {
      fs.existsSync.mockReturnValue(false);

      const result = validateTheme('/project', mockThemeMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not found');
    });

    it('should return error when required theme directories missing', () => {
      fs.existsSync.mockImplementation((p) => {
        // Theme root exists but not subdirectories
        if (p.includes('node_modules') && !p.includes('layouts') && !p.includes('styles')) {
          return true;
        }
        return false;
      });

      const result = validateTheme('/project', mockThemeMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing required theme directory'))).toBe(true);
    });

    it('should return warning when user entry point missing', () => {
      fs.existsSync.mockImplementation((p) => {
        // Theme exists with all directories
        if (p.includes('node_modules')) {
          return true;
        }
        // User scripts entry point missing
        if (p.includes('main.js')) {
          return false;
        }
        // nunjucks exists
        if (p.includes('nunjucks')) {
          return true;
        }
        return false;
      });

      const result = validateTheme('/project', mockThemeMetadata);

      expect(result.warnings.some((w) => w.includes('No entry point found'))).toBe(true);
    });

    it('should return warning when user layouts directory missing', () => {
      fs.existsSync.mockImplementation((p) => {
        if (p.includes('node_modules')) {
          return true;
        }
        if (p.includes('nunjucks')) {
          return true;
        }
        // User layouts missing
        if (p.includes('overrides/layouts')) {
          return false;
        }
        return true;
      });

      const result = validateTheme('/project', mockThemeMetadata);

      expect(result.warnings.some((w) => w.includes('No layouts directory'))).toBe(true);
    });

    it('should return error when nunjucks not installed', () => {
      fs.existsSync.mockImplementation((p) => {
        if (p.includes('nunjucks')) {
          return false;
        }
        return true;
      });

      const result = validateTheme('/project', mockThemeMetadata);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Nunjucks not found'))).toBe(true);
    });

    it('should use custom override paths', () => {
      fs.existsSync.mockReturnValue(true);

      const customPaths = {
        scripts: 'custom/scripts',
        layouts: 'custom/layouts',
      };

      validateTheme('/project', mockThemeMetadata, customPaths);

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('custom/scripts'));
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('custom/layouts'));
    });
  });

  describe('validateComponent', () => {
    const mockThemeMetadata = {
      name: '@eleventy-plugin-themer/theme-base',
    };

    describe('layout validation', () => {
      it('should find layout in user directory first', () => {
        fs.existsSync.mockImplementation((p) => {
          return p.includes('overrides/layouts');
        });

        const result = validateComponent('layout', 'base', '/project', mockThemeMetadata);

        expect(result.exists).toBe(true);
        expect(result.source).toBe('user');
      });

      it('should fallback to theme layout', () => {
        fs.existsSync.mockImplementation((p) => {
          return p.includes('node_modules') && p.includes('layouts');
        });

        const result = validateComponent('layout', 'base', '/project', mockThemeMetadata);

        expect(result.exists).toBe(true);
        expect(result.source).toBe('theme');
      });

      it('should return exists false when layout not found', () => {
        fs.existsSync.mockReturnValue(false);

        const result = validateComponent('layout', 'missing', '/project', mockThemeMetadata);

        expect(result.exists).toBe(false);
      });
    });

    describe('data validation', () => {
      it('should find data file in user directory first', () => {
        fs.existsSync.mockImplementation((p) => {
          return p.includes('content/_data');
        });

        const result = validateComponent('data', 'site.js', '/project', mockThemeMetadata);

        expect(result.exists).toBe(true);
        expect(result.source).toBe('user');
      });

      it('should fallback to theme data', () => {
        fs.existsSync.mockImplementation((p) => {
          return p.includes('node_modules') && p.includes('data');
        });

        const result = validateComponent('data', 'site.js', '/project', mockThemeMetadata);

        expect(result.exists).toBe(true);
        expect(result.source).toBe('theme');
      });
    });

    describe('unknown type', () => {
      it('should return exists false for unknown types', () => {
        const result = validateComponent('unknown', 'file', '/project', mockThemeMetadata);

        expect(result.exists).toBe(false);
      });
    });
  });

  describe('logValidation', () => {
    it('should log errors when present', () => {
      const validation = {
        errors: ['Error 1', 'Error 2'],
        warnings: [],
        isValid: false,
      };

      logValidation(validation);

      expect(console.error).toHaveBeenCalled();
    });

    it('should log warnings when present', () => {
      const validation = {
        errors: [],
        warnings: ['Warning 1'],
        isValid: true,
      };

      logValidation(validation);

      expect(console.warn).toHaveBeenCalled();
    });

    it('should log success when valid with no warnings', () => {
      const validation = {
        errors: [],
        warnings: [],
        isValid: true,
      };

      logValidation(validation);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('passed'));
    });

    it('should not call process.exit (library code should never exit)', () => {
      vi.spyOn(process, 'exit').mockImplementation(() => {});

      const validation = {
        errors: ['Critical error'],
        warnings: [],
        isValid: false,
      };

      logValidation(validation);

      expect(process.exit).not.toHaveBeenCalled();
    });
  });
});
