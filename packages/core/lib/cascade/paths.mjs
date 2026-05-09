/**
 * Path construction utilities for the cascade system
 *
 * Provides functions to resolve theme root paths, build user/theme
 * resource paths, and get override path configurations.
 */

import path from 'path';

import { DEFAULT_OVERRIDE_PATHS } from '../defaults.mjs';

/**
 * Default theme resource paths (conventions)
 * These are where resources live in the theme package
 */
const THEME_RESOURCE_PATHS = {
  layouts: 'layouts',
  features: 'features',
  styles: 'styles',
  scripts: 'scripts',
  data: 'data',
  public: 'public',
};

/**
 * Get theme root directory
 *
 * @param {string} projectRoot - Content repo root
 * @param {string} themeName - Theme package name
 * @returns {string} Path to theme package
 */
export function getThemeRoot(projectRoot, themeName) {
  return path.join(projectRoot, 'node_modules', themeName);
}

/**
 * Get override path with fallback to default
 *
 * @param {Object} resolvedOverridePaths - Resolved override paths (from resolveOverridePaths)
 * @param {string} key - Path key (data, features, layouts, etc.)
 * @returns {string} Override path
 */
function getOverridePath(resolvedOverridePaths, key) {
  return resolvedOverridePaths?.[key] || DEFAULT_OVERRIDE_PATHS[key];
}

/**
 * Build full paths for user and theme resources
 *
 * @param {string} projectRoot - Content repo root
 * @param {string} themeName - Theme package name
 * @param {Object} resolvedOverridePaths - Resolved override paths
 * @param {string} resourceType - Type: 'data', 'features', 'layouts', 'public'
 * @param {string} filename - Optional filename to append
 * @returns {Object} Paths object { user, theme, userDir, themeDir }
 */
export function buildPaths(
  projectRoot,
  themeName,
  resolvedOverridePaths,
  resourceType,
  filename = '',
) {
  const userDir = getOverridePath(resolvedOverridePaths, resourceType);
  const themeDir = THEME_RESOURCE_PATHS[resourceType] || resourceType;
  const themeRoot = getThemeRoot(projectRoot, themeName);

  return {
    user: path.join(projectRoot, userDir, filename),
    theme: path.join(themeRoot, themeDir, filename),
    userDir: path.join(projectRoot, userDir),
    themeDir: path.join(themeRoot, themeDir),
  };
}
