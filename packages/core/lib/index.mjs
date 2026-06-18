/**
 * @eleventy-plugin-themer/core
 *
 * Build-agnostic cascade system for Eleventy themes.
 * Works with any build system or no build system at all.
 */

import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import { configureTemplateEngine as _configureTemplateEngine } from './template-loader.mjs';
import { resolveOverridePaths as _resolveOverridePaths } from './defaults.mjs';
import { getThemeRoot } from './cascade/paths.mjs';
import { resolveThemeMetadata } from './cascade/metadata.mjs';
import { getAvailableFeatures } from './cascade/features.mjs';
import { configureCascade } from './cascade/index.mjs';
import { deepMergeConfig } from './cascade/config.mjs';
import { themeConfigSchema, featuresFrontMatterSchema, formatZodIssues } from './schemas.mjs';
import { loadModuleFromPath } from './internal/load-module.mjs';
import { getThemerContext, setThemerContext } from './internal/context.mjs';

/** Normalize OS path separators to POSIX (Eleventy layout keys/targets). */
function toPosix(p) {
  return p.split(path.sep).join('/');
}

/**
 * Recursively list files under `dir`, as paths relative to it (POSIX-agnostic
 * raw sep). Returns [] when `dir` is absent. Used to map user layout overrides
 * to layout aliases.
 */
function listLayoutFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listLayoutFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
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

/**
 * Create a project handle that binds `{ theme, projectRoot }` once and exposes
 * pre-bound helpers for the three places consumers normally pass them:
 * `eleventyPluginThemer`, `eleventyPluginThemerVite`, and `createPostcssConfig`.
 *
 * Theme metadata is resolved eagerly so `postcss.config.mjs` can use the
 * project handle without an extra disk read at consumption time.
 *
 * @param {Object} args
 * @param {string} args.theme - Theme package name.
 * @param {string} args.projectRoot - Absolute project root.
 * @returns {{
 *   theme: string,
 *   projectRoot: string,
 *   themeMetadata: Object,
 *   eleventyPlugin: (eleventyConfig: Object, extra?: Object) => Promise<Object>,
 *   viteOptions: (extra?: Object) => Object,
 *   postcssOptions: (extra?: Object) => Object,
 * }}
 *
 * @example
 * // eleventy.config.mjs
 * import { createThemerProject, eleventyPluginThemer } from '@eleventy-plugin-themer/core';
 * import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';
 *
 * const themer = createThemerProject({ theme: THEME_NAME, projectRoot: __dirname });
 *
 * export default async function (eleventyConfig) {
 *   const { dir } = await themer.eleventyPlugin(eleventyConfig, { input: 'content', output: '_site' });
 *   eleventyConfig.addPlugin(eleventyPluginThemerVite, themer.viteOptions({ optimizations: {...} }));
 *   return { dir };
 * }
 *
 * @example
 * // postcss.config.mjs
 * import { createThemerProject } from '@eleventy-plugin-themer/core';
 * import { createPostcssConfig } from '@eleventy-plugin-themer/build-vite/postcss';
 *
 * const themer = createThemerProject({ theme: THEME_NAME, projectRoot: __dirname });
 * export default await createPostcssConfig(themer.postcssOptions());
 */
/**
 * Identity helper that returns its argument typed as `ThemeUserConfig`.
 *
 * Pure ergonomics for the project's `theme.config.mjs`: the JSDoc annotation
 * on the parameter gives editors auto-completion and structural validation
 * without requiring a TypeScript build. At runtime it's just `(c) => c`.
 *
 * @param {import('./types.mjs').ThemeUserConfig} config
 * @returns {import('./types.mjs').ThemeUserConfig}
 *
 * @example
 * // theme.config.mjs
 * import { defineThemeConfig } from '@eleventy-plugin-themer/core';
 * export default defineThemeConfig({
 *   themeToggle: { defaultTheme: 'auto', showToggle: true },
 * });
 */
export function defineThemeConfig(config) {
  return config;
}

export function createThemerProject({ theme, projectRoot } = {}) {
  if (!theme) {
    throw new Error('createThemerProject requires a `theme` option.');
  }
  if (!projectRoot) {
    throw new Error('createThemerProject requires a `projectRoot` option.');
  }

  const themeMetadata = resolveThemeMetadata(projectRoot, theme);

  return {
    theme,
    projectRoot,
    themeMetadata,
    eleventyPlugin: (eleventyConfig, extra = {}) =>
      eleventyPluginThemer(eleventyConfig, { theme, projectRoot, ...extra }),
    viteOptions: (extra = {}) => ({ theme, projectRoot, ...extra }),
    postcssOptions: (extra = {}) => ({ themeMetadata, projectRoot, ...extra }),
  };
}

// --- Public API (consumed by users) ---
//
// These are the only symbols promised across minor releases (subject to the
// 0.x policy in CLAUDE.md). The cross-package internal surface
// (getThemerContext, getThemerDir, getThemeRoot, resolveResource,
// getAvailableFeatures) is exposed via the
// `@eleventy-plugin-themer/core/internal/api` subpath instead — see
// `lib/internal/api.mjs`.
export { resolveThemeMetadata } from './cascade/metadata.mjs';
export { themeConfigSchema, featuresFrontMatterSchema, formatZodIssues } from './schemas.mjs';

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

  // Layout overrides: a file in `overrides/layouts` shadows the same-named
  // theme layout. Eleventy resolves a top-level `layout:` from a single
  // includes dir (here, the theme's), so for each override file we register a
  // layout alias pointing at its path *relative to the theme layouts dir*
  // (what Eleventy's getLayoutPath joins against). A relative, forward-slashed
  // target is OS-neutral, needs no temp dir/symlinks/copies, and Eleventy reads
  // the live file each build so edits hot-reload. Partials cascade separately
  // via the template loader.
  if (typeof eleventyConfig.addLayoutAlias === 'function') {
    const themeLayoutsDir = path.join(getThemeRoot(projectRoot, themeMetadata.name), 'layouts');
    const overrideLayoutsDir = path.join(
      projectRoot,
      resolvedOverridePaths.layouts || 'overrides/layouts',
    );
    for (const rel of listLayoutFiles(overrideLayoutsDir)) {
      const overrideFile = path.join(overrideLayoutsDir, rel);
      const targetFromThemeDir = toPosix(path.relative(themeLayoutsDir, overrideFile));
      eleventyConfig.addLayoutAlias(toPosix(rel), targetFromThemeDir);
    }
  }

  // Validate user theme override (fail-fast on typos and shape errors) and
  // capture the value so we can merge it into the build-time config below.
  const themeConfigRel = resolvedOverridePaths.themeConfig || 'theme.config.mjs';
  const userThemeModule = await loadModuleFromPath(
    path.join(projectRoot, path.dirname(themeConfigRel)),
    path.basename(themeConfigRel, path.extname(themeConfigRel)),
  );
  let userThemeConfig;
  if (userThemeModule) {
    const exported = userThemeModule.defaultExport;
    userThemeConfig = typeof exported === 'function' ? await exported() : exported;
    if (userThemeConfig) {
      const result = themeConfigSchema(themeMetadata).safeParse(userThemeConfig);
      if (!result.success) {
        const allowed = Object.keys(themeMetadata.config || {}).join(', ') || '(none)';
        throw new Error(
          `Invalid theme configuration at ${userThemeModule.filePath}:\n${formatZodIssues(result.error)}\n` +
            `Allowed top-level keys (from theme defaults): ${allowed}`,
        );
      }
    }
  }

  // Merged theme config (theme.json defaults + user theme.js). Stashed on the
  // context so build adapters can read build-relevant config (e.g. the Prism
  // theme) that the user overrode — the template-time `theme` global is not
  // visible to the build. Matches the `theme` global produced by the cascade.
  const mergedThemeConfig = deepMergeConfig(themeMetadata.config || {}, userThemeConfig || {});

  // Fail-fast on an unknown front-matter `features` value, per page. A `_data`
  // `eleventyDataSchema` only validates the global data object (once), so it
  // never sees per-page front matter; this preprocessor runs for every
  // template with its merged data and lists the available features on error.
  if (typeof eleventyConfig.addPreprocessor === 'function') {
    const featuresSchema = featuresFrontMatterSchema(
      projectRoot,
      themeMetadata,
      resolvedOverridePaths,
    );
    eleventyConfig.addPreprocessor('themer-features', '*', (data) => {
      const features = data?.features;
      if (features === undefined || features === null) return;
      const result = featuresSchema.safeParse(features);
      if (!result.success) {
        const where = data?.page?.inputPath ?? 'unknown template';
        throw new Error(
          `Invalid theme feature in front matter (${where}):\n${formatZodIssues(result.error)}`,
        );
      }
    });
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
    // The theme config file lives outside the data dir, so watch it explicitly.
    eleventyConfig.addWatchTarget(`./${themeConfigRel}`);
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
    mergedThemeConfig,
    resolvedOverridePaths,
    discoveredFeatures,
    projectRoot,
    dir,
  });

  return { themeMetadata, mergedThemeConfig, resolvedOverridePaths, discoveredFeatures, dir };
}
