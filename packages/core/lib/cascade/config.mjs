/**
 * Theme configuration cascade
 *
 * Manages theme configuration with deep merge support.
 * Theme provides defaults via theme.json config section,
 * user overrides via the project's theme config file (theme.config.mjs).
 */

import path from 'path';
import fs from 'fs';

import { UNSAFE_KEYS } from '../internal/safe-keys.mjs';

/**
 * Deep merge configuration objects.
 *
 * Merge strategy:
 * - Arrays are replaced (not concatenated)
 * - Objects are deeply merged
 * - null explicitly clears the value
 * - Primitives are overwritten
 *
 * NOTE: Distinct from `deepMergeViteConfig` in build-vite by design. This
 * variant is generic (recurse into every plain object); the Vite variant is
 * shallow with explicit deep keys matched to Vite's config shape. Unifying
 * would force one or the other to grow special cases.
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
 * Load user configuration from the project's theme config file
 * (resolvedOverridePaths.themeConfig, default theme.config.mjs).
 *
 * @param {string} projectRoot - Path to content repo root
 * @param {Object} resolvedOverridePaths - Resolved override paths configuration
 * @returns {Promise<Object>} User config (empty object if not found)
 */
async function loadUserConfig(projectRoot, resolvedOverridePaths = {}) {
  const rel = resolvedOverridePaths.themeConfig || 'theme.config.mjs';
  const dir = path.join(projectRoot, path.dirname(rel));
  const base = path.basename(rel, path.extname(rel));

  for (const ext of ['.mjs', '.js']) {
    const configPath = path.join(dir, `${base}${ext}`);
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
