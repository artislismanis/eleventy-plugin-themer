/**
 * Static asset cascade
 *
 * Manages public files (favicon, robots.txt, images) with user override support.
 * Uses per-file override - user files completely replace theme files by name.
 */

import path from 'path';

import { logger } from '../logger.mjs';

import { buildPaths } from './paths.mjs';
import { scanDirectoryRecursive, determineUserSource } from './resolver.mjs';

/**
 * Configure passthrough copy with cascade support
 *
 * Sets up Eleventy's passthrough copy to:
 * 1. Copy theme assets that user hasn't overridden
 * 2. Let user assets take precedence
 *
 * Theme assets are only copied if user doesn't have a file with the same name.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {string} projectRoot - Content repo root
 * @param {Object} themeMetadata - Theme metadata (from resolveThemeMetadata)
 * @param {Object} overridePaths - Override paths configuration
 *
 * @example
 * // In eleventy.config.mjs
 * import { configurePassthroughCopy, resolveThemeMetadata } from '@eleventy-plugin-themer/core';
 * const themeMetadata = resolveThemeMetadata(__dirname, '@eleventy-plugin-themer/theme-base');
 * configurePassthroughCopy(eleventyConfig, __dirname, themeMetadata);
 */
export function configurePassthroughCopy(
  eleventyConfig,
  projectRoot,
  themeMetadata,
  resolvedOverridePaths = {},
) {
  const assets = getAvailableAssets(projectRoot, themeMetadata, resolvedOverridePaths);

  let themeAssetsUsed = 0;
  let userOverrides = 0;

  assets.forEach((info) => {
    if (info.source === 'theme') {
      // Copy theme asset (user hasn't overridden it)
      eleventyConfig.addPassthroughCopy({
        [info.path]: info.name,
      });
      themeAssetsUsed++;
    } else {
      // User file - already handled by Eleventy's normal passthrough
      userOverrides++;
    }
  });

  logger.info(`📁 Using ${themeAssetsUsed} theme assets (override by adding to public/)`);
  if (userOverrides > 0) {
    logger.info(`✨ User overrode ${userOverrides} theme asset(s)`);
  }
}

/**
 * Get all available static assets (theme + user)
 *
 * Returns information about all assets with source tracking.
 * Scans recursively to support nested directories.
 *
 * @param {string} projectRoot - Content repo root
 * @param {Object} themeMetadata - Theme metadata (from resolveThemeMetadata)
 * @param {Object} overridePaths - Override paths configuration
 * @returns {Map<string, Object>} Map of relative path to asset info
 *   Each asset info contains: { name, source, path }
 *   Source is: 'theme', 'user', or 'override'
 *
 * @example
 * import { getAvailableAssets, resolveThemeMetadata } from '@eleventy-plugin-themer/core';
 * const themeMetadata = resolveThemeMetadata(__dirname, '@eleventy-plugin-themer/theme-base');
 * const assets = getAvailableAssets(__dirname, themeMetadata);
 * assets.forEach((info, relativePath) => {
 *   console.log(`${relativePath}: ${info.source}`);
 * });
 */
function getAvailableAssets(projectRoot, themeMetadata, resolvedOverridePaths = {}) {
  const assets = new Map();
  const paths = buildPaths(projectRoot, themeMetadata.name, resolvedOverridePaths, 'public');

  // Scan theme assets (recursive)
  const themeFiles = scanDirectoryRecursive(paths.themeDir);
  themeFiles.forEach((relativePath) => {
    assets.set(relativePath, {
      name: relativePath,
      source: 'theme',
      path: path.join(paths.themeDir, relativePath),
    });
  });

  // Scan user assets (overrides or additions)
  const userFiles = scanDirectoryRecursive(paths.userDir);
  userFiles.forEach((relativePath) => {
    assets.set(relativePath, {
      name: relativePath,
      source: determineUserSource(assets, relativePath),
      path: path.join(paths.userDir, relativePath),
    });
  });

  return assets;
}
