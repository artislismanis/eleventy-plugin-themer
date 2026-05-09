/**
 * Data file cascade
 *
 * Manages data files (site.js, navigation.js) with user override support.
 * Theme provides defaults via addGlobalData(), user files in _data/ automatically
 * override via Eleventy's native data cascade.
 */

import path from 'path';

import { scanWithCascade } from './resolver.mjs';

/**
 * Configure data cascade with automatic theme defaults
 *
 * Registers theme data files using addGlobalData(). User files in the
 * data directory will automatically override these via Eleventy's native
 * data cascade (directory files > addGlobalData).
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {string} projectRoot - Path to content repo root
 * @param {Object} overridePaths - Override paths configuration
 *
 * @example
 * // In theme's init() function
 * configureDataCascade(eleventyConfig, __dirname, overridePaths);
 *
 * // User overrides by creating content/_data/navigation.js
 * // (automatically takes precedence via Eleventy's data cascade)
 */
export function configureDataCascade(
  eleventyConfig,
  projectRoot,
  themeMetadata,
  resolvedOverridePaths = {},
) {
  const availableData = getAvailableDataFiles(projectRoot, themeMetadata, resolvedOverridePaths);

  availableData.forEach((fileInfo, filename) => {
    // Only register theme data files (not user files or overrides)
    // User files will be picked up by Eleventy's native data directory
    if (fileInfo.source === 'theme') {
      const dataName = path.basename(filename, path.extname(filename));

      eleventyConfig.addGlobalData(dataName, async () => {
        // Import theme data file
        const mod = await import(fileInfo.path);
        return mod.default || mod;
      });
    }
  });
}

/**
 * Get all available data files (theme + user)
 *
 * Returns information about all data files with source tracking.
 *
 * @param {string} projectRoot - Path to content repo root
 * @param {Object} themeMetadata - Theme metadata object
 * @param {Object} overridePaths - Override paths configuration
 * @returns {Map<string, Object>} Map of filename to file info
 *   Each file info contains: { name, source, path }
 *   Source is: 'theme', 'user', or 'override'
 */
function getAvailableDataFiles(projectRoot, themeMetadata, resolvedOverridePaths = {}) {
  return scanWithCascade({
    projectRoot,
    themeName: themeMetadata.name,
    resolvedOverridePaths,
    resourceType: 'data',
    filter: (file) => file.endsWith('.js') || file.endsWith('.json'),
  });
}
