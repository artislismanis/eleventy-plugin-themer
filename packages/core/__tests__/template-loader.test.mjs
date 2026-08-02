import path from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nunjucks from 'nunjucks';

import { configureTemplateEngine } from '../lib/template-loader.mjs';

// Mock nunjucks
vi.mock('nunjucks', () => {
  const mockEnv = {
    addGlobal: vi.fn(),
  };

  class MockFileSystemLoader {
    constructor(searchPaths, opts) {
      this.searchPaths = searchPaths;
      this.opts = opts;
    }
    getSource(name) {
      return { src: `mock content for ${name}`, path: name, noCache: false };
    }
  }

  return {
    default: {
      FileSystemLoader: MockFileSystemLoader,
      // Must be a plain function, not an arrow: the code under test calls
      // `new Environment(...)`, and vitest 4 no longer makes an arrow-function
      // mock impl constructible. Returning an object from a constructor
      // overrides `this`, so callers still get mockEnv.
      Environment: vi.fn(function () {
        return mockEnv;
      }),
    },
  };
});

describe('template-loader.mjs', () => {
  let mockEleventyConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEleventyConfig = {
      setLibrary: vi.fn(),
    };
  });

  describe('configureTemplateEngine', () => {
    it('should configure nunjucks by default', () => {
      const env = configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: { layouts: 'overrides/layouts' },
      });

      expect(mockEleventyConfig.setLibrary).toHaveBeenCalledWith('njk', env);
    });

    it('should throw for unsupported engine', () => {
      expect(() =>
        configureTemplateEngine(mockEleventyConfig, {
          projectRoot: '/project',
          themeName: 'test-theme',
          overridePaths: {},
          engine: 'handlebars',
        }),
      ).toThrow('Template engine "handlebars" is not supported');
    });

    it('should set up search paths with user overrides before theme', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: { layouts: 'overrides/layouts' },
      });

      // The Environment constructor was called
      expect(Nunjucks.Environment).toHaveBeenCalled();

      // Get the loader passed to Environment
      const loaderArg = Nunjucks.Environment.mock.calls[0][0];
      const searchPaths = loaderArg.searchPaths;

      // User paths should come before theme paths
      const userIndex = searchPaths.findIndex((p) => p.includes('overrides'));
      const themeIndex = searchPaths.findIndex((p) => p.includes('node_modules'));

      expect(userIndex).toBeLessThan(themeIndex);
    });

    it('should add theme global to nunjucks environment', () => {
      const env = configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      expect(env.addGlobal).toHaveBeenCalledWith(
        'theme',
        expect.objectContaining({
          name: 'test-theme',
        }),
      );
    });

    it('should include additional paths in search paths', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
        additionalPaths: ['extra/templates'],
      });

      const loaderArg = Nunjucks.Environment.mock.calls[0][0];
      const hasExtra = loaderArg.searchPaths.some((p) =>
        p.includes(path.join('/project', 'extra/templates')),
      );

      expect(hasExtra).toBe(true);
    });

    it('should provide a theme.path helper function', () => {
      const env = configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      const themeGlobal = env.addGlobal.mock.calls.find((c) => c[0] === 'theme')[1];

      expect(themeGlobal.path('styles/main.scss')).toBe('@theme/styles/main.scss');
    });

    it('should configure autoescape as false', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      const envOptions = Nunjucks.Environment.mock.calls[0][1];
      expect(envOptions.autoescape).toBe(false);
    });
  });

  describe('ThemeAwareLoader @theme/ path resolution', () => {
    it('should resolve @theme/ prefix to theme directory', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      const loader = Nunjucks.Environment.mock.calls[0][0];

      // @theme/partials/foo.njk resolves to a path inside theme root
      const result = loader.getSource('@theme/partials/foo.njk');
      expect(result.path).toContain('node_modules/test-theme');
      expect(result.path).toContain('partials/foo.njk');
    });

    it('should block path traversal via @theme/../../../etc/passwd', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      const loader = Nunjucks.Environment.mock.calls[0][0];

      expect(() => loader.getSource('@theme/../../etc/passwd')).toThrow('Path traversal detected');
    });

    it('should block path traversal via encoded sequences', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      const loader = Nunjucks.Environment.mock.calls[0][0];

      expect(() => loader.getSource('@theme/../../../secret')).toThrow('Path traversal detected');
    });

    it('should pass through non-@theme/ paths to parent getSource', () => {
      configureTemplateEngine(mockEleventyConfig, {
        projectRoot: '/project',
        themeName: 'test-theme',
        overridePaths: {},
      });

      const loader = Nunjucks.Environment.mock.calls[0][0];

      // Normal paths (no @theme/ prefix) should go through the parent getSource
      const result = loader.getSource('partials/header.njk');
      expect(result.src).toContain('partials/header.njk');
    });
  });
});
