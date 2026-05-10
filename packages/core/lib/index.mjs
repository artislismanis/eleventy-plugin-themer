/**
 * @eleventy-plugin-themer/core
 *
 * Build-agnostic cascade system for Eleventy themes.
 * Works with any build system or no build system at all.
 */

import path from 'path';

import { z } from 'zod';

import { configureTemplateEngine as _configureTemplateEngine } from './template-loader.mjs';
import { resolveOverridePaths as _resolveOverridePaths } from './defaults.mjs';
import { getThemeRoot } from './cascade/paths.mjs';
import { resolveThemeMetadata } from './cascade/metadata.mjs';
import { resolveResource } from './cascade/resolver.mjs';
import { getAvailableFeatures } from './cascade/features.mjs';
import { configureCascade } from './cascade/index.mjs';
import { themeConfigSchema, featuresFrontMatterSchema, formatZodIssues } from './schemas.mjs';
import { loadModuleFromPath } from './internal/load-module.mjs';

/**
 * Symbol-keyed property on `eleventyConfig` that carries the shared cascade
 * context written by `eleventyPluginThemer`. Build adapters and helpers read
 * this to avoid re-resolving theme metadata or rediscovering features.
 *
 * Exposed as a non-enumerable property to keep it out of accidental
 * iteration (Eleventy reflects over its config in places).
 *
 * @internal
 */
const THEMER_CONTEXT_KEY = '__themerContext';

/**
 * Read the themer context that `eleventyPluginThemer` stashed on
 * `eleventyConfig`. Returns `undefined` if the plugin has not yet run.
 *
 * @param {Object} eleventyConfig
 * @returns {import('./types.mjs').ThemerContext|undefined}
 */
export function getThemerContext(eleventyConfig) {
  return eleventyConfig?.[THEMER_CONTEXT_KEY];
}

function setThemerContext(eleventyConfig, context) {
  Object.defineProperty(eleventyConfig, THEMER_CONTEXT_KEY, {
    value: context,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

/**
 * Get the Eleventy `dir` config computed by `eleventyPluginThemer`.
 *
 * Eleventy disallows calling `set*Directory()` from inside a plugin and
 * `addPlugin` discards plugin return values, so the plugin stashes its
 * computed `dir` on the shared themer context. Consumers spread it into the
 * config-function return value.
 *
 * @param {Object} eleventyConfig
 * @returns {{ input: string, output: string, includes: string }|undefined}
 *   The computed `dir` object, or `undefined` if `input`/`output` were not
 *   passed to the plugin.
 *
 * @example
 * import { eleventyPluginThemer, getThemerDir } from '@eleventy-plugin-themer/core';
 *
 * export default async function (eleventyConfig) {
 *   eleventyConfig.addPlugin(eleventyPluginThemer, {
 *     theme: '@eleventy-plugin-themer/theme-base',
 *     projectRoot: __dirname,
 *     input: 'content',
 *     output: '_site',
 *   });
 *   return { dir: getThemerDir(eleventyConfig), templateFormats: ['md', 'njk'] };
 * }
 */
export function getThemerDir(eleventyConfig) {
  const ctx = getThemerContext(eleventyConfig);
  if (!ctx) {
    throw new Error(
      'getThemerDir: themer context not found. Ensure `eleventyPluginThemer` is registered ' +
        'before calling getThemerDir.',
    );
  }
  return ctx.dir;
}

/**
 * Drop-in `eleventyDataSchema` validator: validates page front matter against
 * the active theme's available features (plus the standard technical fields:
 * `draft`, `tags`, `date`).
 *
 * Designed to be exported directly from a data file. Eleventy invokes the
 * function with the resolved page data; the helper reads the cached themer
 * context from `data.eleventy.eleventyConfig` (or from `data.themeMetadata`
 * + `data.eleventy.directories.input` as a fallback) to build the schema
 * lazily on first call and reuse it thereafter.
 *
 * @param {Object} data - Eleventy page data (passed by Eleventy).
 * @returns {Promise<void>} Resolves on valid front matter; throws otherwise.
 *
 * @example
 * // content/_data/eleventyDataSchema.js
 * import { themerDataSchema } from '@eleventy-plugin-themer/core';
 * export default themerDataSchema;
 */
let _cachedDataSchema = null;
export async function themerDataSchema(data) {
  if (!_cachedDataSchema) {
    const cfg = data?.eleventy?.eleventyConfig;
    const ctx = cfg ? getThemerContext(cfg) : undefined;

    let featuresSchema;
    if (ctx) {
      featuresSchema = featuresFrontMatterSchema(
        ctx.projectRoot,
        ctx.themeMetadata,
        ctx.resolvedOverridePaths,
      );
    } else if (data?.themeMetadata) {
      // Fallback path: Eleventy does not always populate
      // `data.eleventy.eleventyConfig` at the moment globalData is resolved,
      // so build the schema from the `themeMetadata` global data registered
      // by `eleventyPluginThemer`. Slightly less efficient (rediscovers
      // features) but always works.
      featuresSchema = featuresFrontMatterSchema(process.cwd(), data.themeMetadata);
    } else {
      throw new Error(
        'themerDataSchema: cannot locate themer context or themeMetadata on the data ' +
          'cascade. Ensure `eleventyPluginThemer` is registered.',
      );
    }

    _cachedDataSchema = z.object({
      draft: z.boolean().optional(),
      features: featuresSchema,
      tags: z.array(z.string()).optional(),
      date: z.coerce.date().optional(),
    });
  }

  const result = _cachedDataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid front matter:\n${formatZodIssues(result.error)}`);
  }
}

/**
 * Reset the cached schema (used by tests; not part of the public API).
 * @internal
 */
export function _resetThemerDataSchemaCache() {
  _cachedDataSchema = null;
}

// --- Public API (consumed by users and other packages) ---
export { resolveThemeMetadata } from './cascade/metadata.mjs';
export { getAvailableFeatures } from './cascade/features.mjs';
export { themeConfigSchema, featuresFrontMatterSchema, formatZodIssues } from './schemas.mjs';

// --- Internal API (used by build-vite peer package) ---
export { resolveOverridePaths, DEFAULT_ASSET_ENTRIES } from './defaults.mjs';
export { getThemeRoot } from './cascade/paths.mjs';
export { resolveResource } from './cascade/resolver.mjs';

/**
 * Eleventy plugin for theme integration.
 *
 * Handles:
 * 1. Theme metadata resolution (cached on `eleventyConfig` for the build-vite adapter).
 * 2. Theme helpers registration (filters, shortcodes, paired shortcodes, transforms).
 * 3. Theme-level Eleventy config (markdown library, etc.) via the theme's `configure()` hook.
 * 4. Auto-discovery of user helpers at `<overrides>/lib/{filters,shortcodes}.{mjs,js}`.
 * 5. Template engine configuration with cascade support.
 * 6. Layout alias registration with cascade resolution.
 * 7. Validation of user theme overrides at `<dataPath>/theme.{mjs,js}`.
 * 8. Feature discovery (cached so the build adapter does not redo the work).
 * 9. Watch-target registration for the override directories.
 * 10. Eleventy directory configuration retrieval — call `getThemerDir(eleventyConfig)` from
 *     your config-function return value when you pass `input`/`output`.
 *
 * Works correctly under both invocation styles:
 *   - `eleventyConfig.addPlugin(eleventyPluginThemer, opts)` (recommended; use
 *     `getThemerDir(eleventyConfig)` to retrieve `dir`).
 *   - `await eleventyPluginThemer(eleventyConfig, opts)` (direct call; the
 *     returned object also carries `dir`/metadata so the consumer can spread it
 *     into the config-function return value).
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {Object} options
 * @param {string} options.theme - Theme package name (required)
 * @param {string} options.projectRoot - Project root path (required)
 * @param {string} [options.input] - Input directory; if set, plugin computes `dir`
 * @param {string} [options.output] - Output directory; if set, plugin computes `dir`
 * @param {Object} [options.overridePaths] - Override-paths configuration
 * @returns {Promise<{ themeMetadata: Object, resolvedOverridePaths: Object, discoveredFeatures: Map, dir?: { input: string, output: string, includes: string } }>}
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
  const discoveredFeatures = getAvailableFeatures(
    projectRoot,
    themeMetadata,
    resolvedOverridePaths,
  );

  eleventyConfig.addGlobalData('themeMetadata', themeMetadata);

  // Load theme module and register theme-provided helpers
  const themeModule = await import(theme);
  const themeExports = themeModule.default;

  // Inlined helper registration (was registerHelpers — trivial, 4 call sites)
  if (themeExports.filters) {
    for (const [name, fn] of Object.entries(themeExports.filters)) {
      eleventyConfig.addFilter(name, fn);
    }
  }
  if (themeExports.shortcodes) {
    for (const [name, fn] of Object.entries(themeExports.shortcodes)) {
      eleventyConfig.addShortcode(name, fn);
    }
  }
  if (themeExports.pairedShortcodes) {
    for (const [name, fn] of Object.entries(themeExports.pairedShortcodes)) {
      eleventyConfig.addPairedShortcode(name, fn);
    }
  }
  if (themeExports.transforms) {
    for (const [name, fn] of Object.entries(themeExports.transforms)) {
      eleventyConfig.addTransform(name, fn);
    }
  }

  // Theme-level Eleventy configuration (markdown library, etc.)
  if (typeof themeExports.configure === 'function') {
    themeExports.configure(eleventyConfig);
  }

  // Auto-discover user helpers at <overrides>/lib/{filters,shortcodes}.{mjs,js}
  const overridesLibDir = path.join(projectRoot, resolvedOverridePaths.lib);
  const filtersModule = await loadModuleFromPath(overridesLibDir, 'filters');
  if (filtersModule?.defaultExport) {
    for (const [name, fn] of Object.entries(filtersModule.defaultExport)) {
      eleventyConfig.addFilter(name, fn);
    }
  }
  const shortcodesModule = await loadModuleFromPath(overridesLibDir, 'shortcodes');
  if (shortcodesModule?.defaultExport) {
    for (const [name, fn] of Object.entries(shortcodesModule.defaultExport)) {
      eleventyConfig.addShortcode(name, fn);
    }
  }

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
  const userThemeModule = await loadModuleFromPath(
    path.join(projectRoot, resolvedOverridePaths.data),
    'theme',
  );
  if (userThemeModule) {
    const exported = userThemeModule.defaultExport;
    const value = typeof exported === 'function' ? await exported() : exported;
    if (value) {
      const result = themeConfigSchema(themeMetadata).safeParse(value);
      if (!result.success) {
        const allowed = Object.keys(themeMetadata.config || {}).join(', ') || '(none)';
        throw new Error(
          `Invalid theme configuration at ${userThemeModule.filePath}:\n${formatZodIssues(result.error)}\n` +
            `Allowed top-level keys (from theme defaults): ${allowed}`,
        );
      }
    }
  }

  // Auto-watch override directories so user edits trigger Eleventy rebuilds.
  // Only register watches for directories actually present in resolvedOverridePaths
  // and for keys that are user-editable filesystem locations.
  if (typeof eleventyConfig.addWatchTarget === 'function') {
    const overrideKeys = ['lib', 'layouts', 'features', 'styles', 'scripts', 'data'];
    for (const key of overrideKeys) {
      const rel = resolvedOverridePaths[key];
      if (!rel) continue;
      eleventyConfig.addWatchTarget(`./${rel}/**/*.*`);
    }
  }

  // Compute Eleventy `dir` for consumers that pass `input`/`output`.
  // Eleventy blocks `set*Directory()` inside plugins, so the consumer must
  // spread this into the return value of their config function.
  let dir;
  if (input && output) {
    const themeLayoutsPath = path.join(getThemeRoot(projectRoot, themeMetadata.name), 'layouts');
    const relativeLayoutsPath = path.relative(path.join(projectRoot, input), themeLayoutsPath);
    dir = { input, output, includes: relativeLayoutsPath };
  }

  // Stash the resolved cascade context for downstream consumers
  // (build-vite, getThemerDir, themerDataSchema, etc.).
  setThemerContext(eleventyConfig, {
    themeMetadata,
    resolvedOverridePaths,
    discoveredFeatures,
    projectRoot,
    dir,
  });

  return { themeMetadata, resolvedOverridePaths, discoveredFeatures, dir };
}
