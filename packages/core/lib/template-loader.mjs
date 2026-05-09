import path from 'path';

import Nunjucks from 'nunjucks';

import { getThemeRoot, buildPaths } from './cascade/paths.mjs';

/**
 * Creates and configures a Nunjucks environment with a theme-aware loader.
 * This function encapsulates all Nunjucks-specific logic.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {Object} options - Configuration options
 * @returns {Nunjucks.Environment}
 * @private
 */
function _configureNunjucksEngine(eleventyConfig, options) {
  const {
    projectRoot,
    themeName,
    overridePaths: resolvedOverridePaths,
    additionalPaths = [],
  } = options;

  const themeBasePath = getThemeRoot(projectRoot, themeName);

  /**
   * Custom Nunjucks loader that supports @theme/ prefix.
   * Relies on an ordered list of search paths to implement the cascade.
   */
  class ThemeAwareLoader extends Nunjucks.FileSystemLoader {
    constructor(searchPaths, opts) {
      super(searchPaths, opts);
      this.themeBasePath = themeBasePath;
    }

    getSource(name) {
      if (name.startsWith('@theme/')) {
        const themePath = name.replace('@theme/', '');
        const fullPath = path.resolve(this.themeBasePath, themePath);
        // Prevent path traversal outside the theme directory
        if (
          !fullPath.startsWith(this.themeBasePath + path.sep) &&
          fullPath !== this.themeBasePath
        ) {
          throw new Error(`Path traversal detected in @theme/ path: "${themePath}"`);
        }
        return super.getSource(fullPath);
      }
      return super.getSource(name);
    }
  }

  // Dynamically build search paths using cascade resolver logic.
  // The order is critical: user overrides must come before theme defaults.
  const layouts = buildPaths(projectRoot, themeName, resolvedOverridePaths, 'layouts');
  const searchPaths = [
    // User overrides (highest priority)
    layouts.userDir,
    path.join(layouts.userDir, 'partials'),
    ...additionalPaths.map((p) => path.join(projectRoot, p)),
    // Theme fallbacks (lowest priority)
    layouts.themeDir,
    path.join(layouts.themeDir, 'partials'),
  ];

  const loader = new ThemeAwareLoader(searchPaths, {
    noCache: process.env.NODE_ENV !== 'production',
  });

  const nunjucksEnv = new Nunjucks.Environment(loader, {
    autoescape: false,
  });

  nunjucksEnv.addGlobal('theme', {
    name: themeName,
    path: (relativePath) => `@theme/${relativePath}`,
  });

  eleventyConfig.setLibrary('njk', nunjucksEnv);

  return nunjucksEnv;
}

/**
 * Configure template engine with theme support.
 *
 * This is a generic, technology-agnostic public API. It acts as a dispatcher
 * to select the appropriate engine-specific configuration function.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {Object} options - Configuration options
 * @param {string} options.projectRoot - Path to content repo root
 * @param {string} options.themeName - Theme package name
 * @param {Object} options.overridePaths - Content repo override paths
 * @param {string} [options.engine='nunjucks'] - The template engine to configure.
 * @returns {Object} The configured template engine environment.
 */
export function configureTemplateEngine(eleventyConfig, options = {}) {
  const { engine = 'nunjucks' } = options;

  switch (engine) {
    case 'nunjucks':
      return _configureNunjucksEngine(eleventyConfig, options);
    default:
      throw new Error(`Template engine "${engine}" is not supported by the theme framework.`);
  }
}
