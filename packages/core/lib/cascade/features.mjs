/**
 * Feature cascade
 *
 * Manages JavaScript features with user override support.
 * Page-specific features can be loaded via front matter:
 *   feature: 'code-highlighting'
 *   features: ['code-highlighting', 'gallery']
 */

import path from 'path';
import fs from 'fs';

import { FEATURE_CONVENTIONS, DEFAULT_OVERRIDE_PATHS } from '../defaults.mjs';

import { getThemeRoot } from './paths.mjs';
import { determineUserSource } from './resolver.mjs';

/**
 * Resolve feature entry point path, preferring auto-init variant
 *
 * For production builds, we prefer index.auto.js (auto-initializing) over index.js.
 * This allows features to work without explicit init() calls in HTML.
 *
 * Resolution order for each location:
 * 1. index.auto.js (preferred - auto-initializes on load)
 * 2. index.js (fallback - requires manual initialization)
 *
 * @param {string} featureDir - Directory path containing the feature
 * @returns {string|null} Path to feature entry point, or null if not found
 */
export function resolveFeatureEntryPath(featureDir) {
  const autoPath = path.join(featureDir, FEATURE_CONVENTIONS.autoInit);
  const regularPath = path.join(featureDir, FEATURE_CONVENTIONS.entry);

  if (fs.existsSync(autoPath)) {
    return autoPath;
  }
  if (fs.existsSync(regularPath)) {
    return regularPath;
  }
  return null;
}

/**
 * Get all available features (theme + user)
 *
 * Features are stored in subdirectories with entry points:
 * - Theme: features/code-highlighting/index.auto.js or index.js
 * - User: overrides/features/code-highlighting/index.auto.js or index.js
 *
 * Entry point resolution prefers auto-init variants (index.auto.js) over
 * manual init (index.js) for production builds.
 *
 * @param {string} projectRoot - Content repo root
 * @param {Object} themeMetadata - Theme metadata from theme.json
 * @param {Object} resolvedOverridePaths - Pre-resolved override paths (optional)
 * @returns {Map<string, Object>} Map of feature name to feature info
 *   Each feature info contains: { name, source, path }
 *   Source is: 'theme', 'user', or 'override'
 *
 * @example
 * import { metadata } from '@eleventy-plugin-themer/theme-base';
 * const features = getAvailableFeatures(__dirname, metadata);
 * features.forEach((info, name) => {
 *   console.log(`${name}: ${info.source} (${info.path})`);
 * });
 */
export function getAvailableFeatures(projectRoot, themeMetadata, resolvedOverridePaths = {}) {
  const featuresPath = resolvedOverridePaths.features ?? DEFAULT_OVERRIDE_PATHS.features;
  const features = new Map();

  // Add theme features from themeMetadata (explicit definition)
  if (themeMetadata.themeFeatures && Array.isArray(themeMetadata.themeFeatures)) {
    const themeRoot = getThemeRoot(projectRoot, themeMetadata.name);

    themeMetadata.themeFeatures.forEach((feature) => {
      // Get feature directory from entry path
      const featureDir = path.join(themeRoot, path.dirname(feature.entry));
      // Resolve entry point preferring auto-init variant
      const featurePath = resolveFeatureEntryPath(featureDir);

      if (featurePath) {
        features.set(feature.name, {
          name: feature.name,
          source: 'theme',
          path: featurePath,
        });
      }
    });
  }

  // Check for user feature overrides/additions (subdirectories)
  const userFeaturesDir = path.join(projectRoot, featuresPath);
  if (fs.existsSync(userFeaturesDir)) {
    // Scan for subdirectories
    fs.readdirSync(userFeaturesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .forEach((dirent) => {
        const featureName = dirent.name;
        const featureDir = path.join(userFeaturesDir, featureName);
        // Resolve entry point preferring auto-init variant
        const featurePath = resolveFeatureEntryPath(featureDir);

        if (featurePath) {
          features.set(featureName, {
            name: featureName,
            source: determineUserSource(features, featureName),
            path: featurePath,
          });
        }
      });
  }

  return features;
}
