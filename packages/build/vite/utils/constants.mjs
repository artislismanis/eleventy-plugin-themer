/**
 * Shared constants for build plugins
 *
 * Centralizes glob patterns and asset paths used across multiple plugins.
 */

/**
 * Glob pattern generators for build output files
 */
export const GLOB_PATTERNS = {
  html: (outputDir) => `${outputDir}/**/*.html`,
  css: (outputDir) => `${outputDir}/assets/css/*.css`,
};

/**
 * Asset output paths used in rollup configuration and plugins
 */
export const ASSET_PATHS = {
  scripts: 'assets/scripts',
  css: 'assets/css',
  fonts: 'assets/fonts',
  images: 'assets/images',
};
