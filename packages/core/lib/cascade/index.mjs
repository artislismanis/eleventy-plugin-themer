/**
 * Unified cascade configuration
 *
 * Single entry point for all cascade systems (data, assets, templates)
 */

import { configureDataCascade } from './data.mjs';
import { configurePassthroughCopy } from './assets.mjs';
import { configureThemeConfig } from './config.mjs';

/**
 * Configure all cascade systems
 *
 * This is a convenience function that sets up:
 * - Data cascade (site.js, navigation.js)
 * - Asset cascade (public files)
 *
 * Template cascade (layouts) is configured separately via configureTemplateEngine.
 * Feature cascade is implicit (handled by Vite entry points).
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {string} projectRoot - Content repo root
 * @param {Object} themeMetadata - Theme metadata (from resolveThemeMetadata)
 * @param {Object} resolvedOverridePaths - Pre-resolved override paths (from resolveOverridePaths)
 *
 * @example
 * // Single call to configure all cascades
 * import { configureCascade, resolveThemeMetadata } from '@eleventy-plugin-themer/core';
 * const themeMetadata = resolveThemeMetadata(__dirname, '@eleventy-plugin-themer/theme-base');
 * configureCascade(eleventyConfig, __dirname, themeMetadata, resolvedOverridePaths);
 */
export function configureCascade(
  eleventyConfig,
  projectRoot,
  themeMetadata,
  resolvedOverridePaths = {},
) {
  // Theme config cascade (colors, typography, etc.)
  configureThemeConfig(eleventyConfig, projectRoot, themeMetadata, resolvedOverridePaths);

  // Data cascade (site.js, navigation.js, etc.)
  configureDataCascade(eleventyConfig, projectRoot, themeMetadata, resolvedOverridePaths);

  // Asset cascade (public files)
  configurePassthroughCopy(eleventyConfig, projectRoot, themeMetadata, resolvedOverridePaths);

  // Note: Template cascade (layouts) is configured via configureTemplateEngine
  // Note: Feature cascade is implicit (Vite handles resolution)
}
