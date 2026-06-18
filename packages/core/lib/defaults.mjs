/**
 * Framework defaults for @eleventy-plugin-themer/core
 *
 * These are the core framework conventions, not theme-specific settings.
 * Themes should not override these - they define how the framework works.
 */

/**
 * Default override paths for user customization
 * These define where the framework looks for user overrides of theme resources
 */
export const DEFAULT_OVERRIDE_PATHS = {
  layouts: 'overrides/layouts',
  features: 'overrides/features',
  styles: 'overrides/styles',
  scripts: 'overrides/scripts',
  lib: 'overrides/lib',
  data: 'content/_data',
  public: 'public',
  // User theme config file (relative to projectRoot). Deliberately OUTSIDE the
  // Eleventy data dir (`data`): a `theme.*` file there would be auto-loaded as a
  // second `theme` global and Eleventy's array-concatenating deep merge would
  // duplicate every array key (social links, etc.) against the merged global we
  // register ourselves.
  themeConfig: 'theme.config.mjs',
};

/**
 * Default asset entry points
 * These are the conventional entry points for theme assets
 */
export const DEFAULT_ASSET_ENTRIES = {
  styles: 'styles/main.scss',
  scripts: 'scripts/main.js',
};

/**
 * Feature conventions
 * These define the standard filenames for features
 */
export const FEATURE_CONVENTIONS = {
  autoInit: 'index.auto.js',
  entry: 'index.js',
};

/**
 * Resolve override paths by merging theme and user configuration over framework defaults.
 *
 * Priority order (lowest to highest):
 * 1. Framework defaults (DEFAULT_OVERRIDE_PATHS)
 * 2. Theme-specific defaults (from themeMetadata.cascade.defaultOverridePaths)
 * 3. User-provided overrides
 *
 * @param {Object} [themeMetadata] - Optional theme metadata object (may contain cascade.defaultOverridePaths).
 * @param {Object} [userOverridePaths] - Optional user-provided override paths.
 * @returns {Object} Resolved override paths.
 */
export function resolveOverridePaths(themeMetadata = {}, userOverridePaths = {}) {
  // Extract theme-specific defaults from cascade config (if present)
  const themeDefaults = themeMetadata?.cascade?.defaultOverridePaths || {};
  return {
    ...DEFAULT_OVERRIDE_PATHS,
    ...themeDefaults,
    ...userOverridePaths,
  };
}
