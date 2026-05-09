/**
 * Theme configuration cascade
 *
 * Manages theme configuration with deep merge support.
 * Theme provides defaults via theme.json config section,
 * user overrides via content/_data/theme.js
 */

import path from 'path';
import fs from 'fs';

/** Keys that must never be merged to prevent prototype pollution */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep merge configuration objects
 *
 * Merge strategy:
 * - Arrays are replaced (not concatenated)
 * - Objects are deeply merged
 * - null explicitly clears the value
 * - Primitives are overwritten
 *
 * @param {Object} target - Base configuration (theme defaults)
 * @param {Object} source - Override configuration (user values)
 * @returns {Object} Merged configuration
 */
export function deepMergeConfig(target, source) {
  if (!source) return { ...target };
  if (!target) return { ...source };

  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (UNSAFE_KEYS.has(key)) continue;

    const sourceValue = source[key];
    const targetValue = target[key];

    // null explicitly clears the value
    if (sourceValue === null) {
      result[key] = null;
      continue;
    }

    // undefined skips the key
    if (sourceValue === undefined) {
      continue;
    }

    // Arrays are replaced, not merged
    if (Array.isArray(sourceValue)) {
      result[key] = [...sourceValue];
      continue;
    }

    // Objects are deeply merged (but not arrays)
    if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMergeConfig(targetValue, sourceValue);
      continue;
    }

    // Primitives are overwritten
    result[key] = sourceValue;
  }

  return result;
}

/**
 * Load user configuration from content/_data/theme.js
 *
 * @param {string} projectRoot - Path to content repo root
 * @param {Object} overridePaths - Override paths configuration
 * @param {Object} themeMetadata - Theme metadata object
 * @returns {Promise<Object>} User config (empty object if not found)
 */
async function loadUserConfig(projectRoot, resolvedOverridePaths = {}) {
  const dataDir = path.join(projectRoot, resolvedOverridePaths.data || 'content/_data');

  // Check for theme.js or theme.mjs
  const extensions = ['.js', '.mjs'];
  for (const ext of extensions) {
    const configPath = path.join(dataDir, `theme${ext}`);
    if (fs.existsSync(configPath)) {
      try {
        const mod = await import(configPath);
        return mod.default || mod;
      } catch (error) {
        throw new Error(`Failed to load user theme config at ${configPath}: ${error.message}`);
      }
    }
  }

  return {};
}

/**
 * Get merged theme configuration
 *
 * Combines theme defaults with user overrides using deep merge.
 *
 * @param {string} projectRoot - Path to content repo root
 * @param {Object} themeMetadata - Theme metadata object
 * @param {Object} overridePaths - Override paths configuration
 * @returns {Promise<Object>} Merged theme configuration
 */
async function getMergedThemeConfig(projectRoot, themeMetadata, resolvedOverridePaths = {}) {
  // Use config from already-loaded metadata instead of re-reading theme.json
  const themeDefaults = themeMetadata?.config || {};
  const userConfig = await loadUserConfig(projectRoot, resolvedOverridePaths);

  return deepMergeConfig(themeDefaults, userConfig);
}

/**
 * Configure theme config in Eleventy's global data
 *
 * Registers merged theme config as `theme` in global data.
 * Accessible in templates as {{ theme.colors.primary }}, etc.
 *
 * @param {Object} eleventyConfig - Eleventy configuration object
 * @param {string} projectRoot - Path to content repo root
 * @param {Object} themeMetadata - Theme metadata object
 * @param {Object} overridePaths - Override paths configuration
 */
export function configureThemeConfig(
  eleventyConfig,
  projectRoot,
  themeMetadata,
  resolvedOverridePaths = {},
) {
  // Register merged theme config as global data
  // Using a function so it's computed fresh for each build
  eleventyConfig.addGlobalData('theme', async () => {
    return getMergedThemeConfig(projectRoot, themeMetadata, resolvedOverridePaths);
  });
}
