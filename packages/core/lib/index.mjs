/**
 * @eleventy-plugin-themer/core
 *
 * Build-agnostic cascade system for Eleventy themes.
 * Works with any build system or no build system at all.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { configureTemplateEngine as _configureTemplateEngine } from './template-loader.mjs';
import { resolveOverridePaths as _resolveOverridePaths } from './defaults.mjs';
import { getThemeRoot } from './cascade/paths.mjs';
import { resolveThemeMetadata } from './cascade/metadata.mjs';
import { resolveResource } from './cascade/resolver.mjs';
import { configureCascade } from './cascade/index.mjs';
import { themeConfigSchema, formatZodIssues } from './schemas.mjs';

/**
 * Register helpers (filters, shortcodes, transforms) with Eleventy.
 * @private
 */
function registerHelpers(eleventyConfig, method, helpers) {
  if (!helpers) return;
  Object.keys(helpers).forEach((name) => {
    eleventyConfig[method](name, helpers[name]);
  });
}

/**
 * Load a user override module from `<overrides>/lib/<basename>.mjs` or `.js`
 * if present, and register its default-exported helpers via `method`.
 * @private
 */
async function loadOverrideHelpers(eleventyConfig, projectRoot, overridesLibDir, basename, method) {
  for (const ext of ['.mjs', '.js']) {
    const filePath = path.join(projectRoot, overridesLibDir, `${basename}${ext}`);
    if (!fs.existsSync(filePath)) continue;
    const mod = await import(pathToFileURL(filePath).href);
    registerHelpers(eleventyConfig, method, mod.default);
    return;
  }
}

/**
 * If the consumer has a theme override file at `<dataPath>/theme.{mjs,js}`,
 * validate it against `themeConfigSchema(themeMetadata)` and throw on failure.
 * @private
 */
async function validateUserThemeConfig(projectRoot, dataPath, themeMetadata) {
  for (const ext of ['.mjs', '.js']) {
    const filePath = path.join(projectRoot, dataPath, `theme${ext}`);
    if (!fs.existsSync(filePath)) continue;

    const mod = await import(pathToFileURL(filePath).href);
    const exported = mod.default;
    const value = typeof exported === 'function' ? await exported() : exported;
    if (!value) return;

    const result = themeConfigSchema(themeMetadata).safeParse(value);
    if (!result.success) {
      const allowed = Object.keys(themeMetadata.config || {}).join(', ') || '(none)';
      throw new Error(
        `Invalid theme configuration at ${filePath}:\n${formatZodIssues(result.error)}\n` +
          `Allowed top-level keys (from theme defaults): ${allowed}`,
      );
    }
    return;
  }
}

// --- Public API (consumed by users and other packages) ---
export { resolveThemeMetadata } from './cascade/metadata.mjs';
export { getAvailableFeatures, resolveFeatureEntryPath } from './cascade/features.mjs';
export { themeConfigSchema, featuresFrontMatterSchema, formatZodIssues } from './schemas.mjs';

// --- Internal API (used by build-vite peer package) ---
export { resolveOverridePaths, DEFAULT_ASSET_ENTRIES } from './defaults.mjs';
export { getThemeRoot, buildPaths } from './cascade/paths.mjs';
export { resolveResource } from './cascade/resolver.mjs';

/**
 * Generate Eleventy dir configuration for a theme with cascade support.
 *
 * @deprecated Prefer passing `input`/`output` directly to `eleventyPluginThemer`,
 *   which now owns directory configuration. Retained for backward compatibility.
 *
 * @param {Object} options
 * @param {string} options.theme - Theme package name.
 * @param {string} options.projectRoot - Project root path.
 * @param {string} options.input - Input directory.
 * @param {string} options.output - Output directory.
 * @returns {{ dir: { input: string, output: string, includes: string } }}
 */
export function generateDirConfig(options = {}) {
  const { theme, projectRoot = process.cwd(), input, output } = options;

  if (!theme) {
    throw new Error('The `generateDirConfig` function requires a `theme` name option.');
  }

  const themeMetadata = resolveThemeMetadata(projectRoot, theme);
  const themeLayoutsPath = path.join(getThemeRoot(projectRoot, themeMetadata.name), 'layouts');
  const relativeLayoutsPath = path.relative(path.join(projectRoot, input), themeLayoutsPath);

  return {
    dir: { input, output, includes: relativeLayoutsPath },
  };
}

/**
 * Eleventy plugin for theme integration.
 *
 * Handles:
 * 1. Theme metadata resolution
 * 2. Theme helpers registration (filters, shortcodes, paired shortcodes, transforms)
 * 3. Theme-level Eleventy config (markdown library, etc.) via the theme's `configure()` hook
 * 4. Auto-discovery of user helpers at `<overrides>/lib/{filters,shortcodes}.{mjs,js}`
 * 5. Template engine configuration with cascade support
 * 6. Layout alias registration with cascade resolution
 * 7. Validation of user theme overrides at `<dataPath>/theme.{mjs,js}`
 * 8. Eleventy directory configuration (input/output/includes) when `input`/`output` are provided
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {Object} options
 * @param {string} options.theme - Theme package name (required)
 * @param {string} options.projectRoot - Project root path (required)
 * @param {string} [options.input] - Input directory; if set, plugin sets it on eleventyConfig
 * @param {string} [options.output] - Output directory; if set, plugin sets it on eleventyConfig
 * @param {Object} [options.overridePaths] - Override-paths configuration
 * @returns {Promise<{ themeMetadata: Object, resolvedOverridePaths: Object, dir?: { input: string, output: string, includes: string } }>}
 *
 * @example
 * // Eleventy's `addPlugin` does not return plugin values, so call directly
 * // when you need `dir` for the config-function return value.
 * const { dir } = await eleventyPluginThemer(eleventyConfig, {
 *   theme: '@eleventy-plugin-themer/theme-base',
 *   projectRoot: __dirname,
 *   input: 'content',
 *   output: '_site',
 * });
 * return { dir, templateFormats: ['md', 'njk'] };
 */
export async function eleventyPluginThemer(eleventyConfig, options = {}) {
  const { theme, projectRoot = process.cwd(), overridePaths = {}, input, output } = options;

  if (!theme) {
    throw new Error(
      'eleventyPluginThemer requires a `theme` option specifying the theme package name.',
    );
  }
  if (!projectRoot) {
    throw new Error('eleventyPluginThemer requires a `projectRoot` option.');
  }

  const themeMetadata = resolveThemeMetadata(projectRoot, theme);
  const resolvedOverridePaths = _resolveOverridePaths(themeMetadata, overridePaths);

  eleventyConfig.addGlobalData('themeMetadata', themeMetadata);

  // Load theme module and register theme-provided helpers
  const themeModule = await import(theme);
  const themeExports = themeModule.default;

  registerHelpers(eleventyConfig, 'addFilter', themeExports.filters);
  registerHelpers(eleventyConfig, 'addShortcode', themeExports.shortcodes);
  registerHelpers(eleventyConfig, 'addPairedShortcode', themeExports.pairedShortcodes);
  registerHelpers(eleventyConfig, 'addTransform', themeExports.transforms);

  // Theme-level Eleventy configuration (markdown library, etc.)
  if (typeof themeExports.configure === 'function') {
    themeExports.configure(eleventyConfig);
  }

  // Auto-discover user helpers at <overrides>/lib/{filters,shortcodes}.{mjs,js}
  await loadOverrideHelpers(
    eleventyConfig,
    projectRoot,
    resolvedOverridePaths.lib,
    'filters',
    'addFilter',
  );
  await loadOverrideHelpers(
    eleventyConfig,
    projectRoot,
    resolvedOverridePaths.lib,
    'shortcodes',
    'addShortcode',
  );

  // Cascades (theme config, data, assets) and template engine
  configureCascade(eleventyConfig, projectRoot, themeMetadata, resolvedOverridePaths);
  _configureTemplateEngine(eleventyConfig, {
    projectRoot,
    themeName: themeMetadata.name,
    overridePaths: resolvedOverridePaths,
  });

  // Layout aliases with cascade resolution
  if (themeMetadata.layouts && Array.isArray(themeMetadata.layouts)) {
    themeMetadata.layouts.forEach((layout) => {
      const layoutFilename = path.basename(layout.path);
      const resolvedLayout = resolveResource({
        projectRoot,
        themeName: themeMetadata.name,
        resolvedOverridePaths,
        resourceType: 'layouts',
        filename: layoutFilename,
        throwOnMissing: true,
      });
      eleventyConfig.addLayoutAlias(layout.name, resolvedLayout.path);
    });
  }

  // Validate user theme override (fail-fast on typos and shape errors)
  await validateUserThemeConfig(projectRoot, resolvedOverridePaths.data, themeMetadata);

  // Compute directory config for the consumer to spread into Eleventy's
  // config-function return value. Eleventy blocks set*Directory() inside
  // plugins, so we hand the consumer a ready-made `dir` object instead.
  let dir;
  if (input && output) {
    const themeLayoutsPath = path.join(getThemeRoot(projectRoot, themeMetadata.name), 'layouts');
    const relativeLayoutsPath = path.relative(path.join(projectRoot, input), themeLayoutsPath);
    dir = { input, output, includes: relativeLayoutsPath };
  }

  return { themeMetadata, resolvedOverridePaths, dir };
}
