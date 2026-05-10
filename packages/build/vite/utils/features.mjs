/**
 * Utilities for resolving page-specific features for Vite builds
 *
 * Provides entry point discovery for features referenced in page front matter.
 * Works with any theme that follows the @eleventy-plugin-themer conventions.
 */

import path from 'path';

import { getAvailableFeatures, resolveResource } from '@eleventy-plugin-themer/core/internal/api';
import { DEFAULT_ASSET_ENTRIES } from '@eleventy-plugin-themer/core/internal/defaults';
import { logger } from '@eleventy-plugin-themer/core/logger';

/**
 * @internal Get feature paths for Vite aliases/serving.
 *
 * Used inside build-vite by `theme-config.mjs` and `feature-serve.mjs`. Exported
 * for adapter authors building custom Vite integrations on top of build-vite,
 * but not part of the documented public API surface — signature may change
 * without a major version bump.
 *
 * The caller must have already discovered features via `getAvailableFeatures()`
 * and pass the resulting Map — this avoids redundant filesystem scans during
 * plugin init.
 *
 * @param {Map<string, {path: string}>} discoveredFeatures - Required. Output of `getAvailableFeatures()`.
 * @returns {Map<string, string>} Map of feature name to absolute file path.
 */
export function getFeaturePathsForBuild(discoveredFeatures) {
  if (!(discoveredFeatures instanceof Map)) {
    throw new TypeError(
      'getFeaturePathsForBuild: discoveredFeatures (Map) is required. ' +
        'Call getAvailableFeatures() once during plugin init and pass the result.',
    );
  }
  const featurePaths = new Map();
  discoveredFeatures.forEach((info, name) => {
    featurePaths.set(name, info.path);
  });
  return featurePaths;
}

/**
 * Get Vite entry points for all features.
 *
 * Returns entry points for `main.js` plus all available features (theme + user,
 * with user overrides taking precedence). Core handles cascade logic via
 * `themeMetadata`.
 *
 * @param {string} projectRoot - Project root path.
 * @param {Object} themeMetadata - Theme metadata object from `theme.json`.
 * @param {Object} [opts]
 * @param {Object} [opts.resolvedOverridePaths] - Pre-resolved override paths.
 * @param {Map} [opts.discoveredFeatures] - Pre-discovered features. If omitted,
 *   `getAvailableFeatures()` runs once internally.
 * @returns {Object} Entry points object for Vite `build.rollupOptions.input`.
 *
 * @example
 * import { getFeatureEntries } from '@eleventy-plugin-themer/build-vite';
 * import { metadata } from '@eleventy-plugin-themer/theme-base';
 *
 * const input = getFeatureEntries(__dirname, metadata);
 */
export function getFeatureEntries(projectRoot, themeMetadata, opts = {}) {
  const { resolvedOverridePaths, discoveredFeatures } = opts;
  const mainScriptEntry = themeMetadata.assets?.scripts?.entry || DEFAULT_ASSET_ENTRIES.scripts;

  const mainScript = resolveResource({
    projectRoot,
    themeName: themeMetadata.name,
    resolvedOverridePaths,
    resourceType: 'scripts',
    filename: path.basename(mainScriptEntry),
    throwOnMissing: true,
  });

  const entries = {
    main: mainScript.path,
  };

  const features =
    discoveredFeatures || getAvailableFeatures(projectRoot, themeMetadata, resolvedOverridePaths);

  features.forEach((feature) => {
    const entryKey = `/${feature.name}.js`;
    entries[entryKey] = feature.path;
  });

  if (features.size > 0) {
    const featureList = Array.from(features.entries())
      .map(([name, info]) => `${name} (${info.source})`)
      .join(', ');
    logger.info(`✨ Discovered features: ${featureList}`);
    logger.info(`✅ Added ${features.size} feature(s) as Vite entry points`);
  }

  return entries;
}
