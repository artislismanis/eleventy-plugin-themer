/**
 * Utilities for resolving page-specific features for Vite builds
 *
 * Provides entry point discovery for features referenced in page front matter.
 * Works with any theme that follows the @eleventy-plugin-themer conventions.
 */

import path from 'path';

import {
  getAvailableFeatures,
  resolveResource,
  DEFAULT_ASSET_ENTRIES,
} from '@eleventy-plugin-themer/core';
import { logger } from '@eleventy-plugin-themer/core/logger';

/**
 * Get feature paths for Vite aliases/serving
 *
 * Returns a Map of feature name to file path, preferring auto-init variants.
 * Used by theme-config.mjs for aliases and feature-serve.mjs for dev serving.
 *
 * This is a thin wrapper around core's getAvailableFeatures() that transforms
 * the output into the format needed by Vite configuration.
 *
 * @param {string} projectRoot - Project root path
 * @param {Object} themeMetadata - Theme metadata from theme.json
 * @returns {Map<string, string>} Map of feature name to absolute file path
 */
export function getFeaturePathsForBuild(projectRoot, themeMetadata, discoveredFeatures) {
  const featurePaths = new Map();

  // Use pre-discovered features if provided, otherwise discover
  if (!discoveredFeatures) {
    logger.warn('discoveredFeatures not provided — calling getAvailableFeatures() redundantly');
  }
  const features = discoveredFeatures || getAvailableFeatures(projectRoot, themeMetadata);

  features.forEach((info, name) => {
    featurePaths.set(name, info.path);
  });

  return featurePaths;
}

/**
 * Get Vite entry points for all features
 *
 * Returns entry points for:
 * - main.js (global entry - always included)
 * - All available features (theme + user, with user overrides taking precedence)
 *
 * Core package handles all cascade logic internally via themeMetadata.
 *
 * @param {string} projectRoot - Project root path
 * @param {Object} themeMetadata - Theme metadata object from theme.json
 * @param {Object} [overridePaths] - Optional override paths (only for edge cases)
 * @returns {Object} Entry points object for Vite build.rollupOptions.input
 *
 * @example
 * // In eleventy.config.mjs
 * import { getFeatureEntries } from '@eleventy-plugin-themer/build-vite';
 * import { metadata } from '@eleventy-plugin-themer/theme-base';
 *
 * const viteOptions = {
 *   build: {
 *     rollupOptions: {
 *       input: getFeatureEntries(__dirname, metadata),
 *     },
 *   },
 * };
 */
export function getFeatureEntries(
  projectRoot,
  themeMetadata,
  resolvedOverridePaths,
  discoveredFeatures,
) {
  // Get the main entry script path from theme metadata or fallback to default
  const mainScriptEntry = themeMetadata.assets?.scripts?.entry || DEFAULT_ASSET_ENTRIES.scripts;

  // Resolve the main entry point using the cascade
  const mainScript = resolveResource({
    projectRoot,
    themeName: themeMetadata.name,
    resolvedOverridePaths,
    resourceType: 'scripts',
    filename: path.basename(mainScriptEntry), // e.g., 'main.js'
    throwOnMissing: true,
  });

  const entries = {
    // Main entry point (always included)
    main: mainScript.path,
  };

  // Use pre-discovered features if provided, otherwise discover
  if (!discoveredFeatures) {
    logger.warn('discoveredFeatures not provided — calling getAvailableFeatures() redundantly');
  }
  const features =
    discoveredFeatures || getAvailableFeatures(projectRoot, themeMetadata, resolvedOverridePaths);

  // Add each feature as an entry point with /name.js pattern
  // This ensures Vite bundles them for production builds
  features.forEach((feature) => {
    // Entry key format: /code-highlighting.js (matches HTML <script src="...">)
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
