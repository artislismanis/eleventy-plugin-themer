/**
 * Shared cascade resolution utilities
 *
 * Provides a unified API for resolving resources with user override support.
 * Used by data files, features, layouts, and static assets.
 */

import fs from 'fs';
import path from 'path';

import { buildPaths } from './paths.mjs';

/**
 * Resolve a single resource with cascade priority (user > theme)
 *
 * @param {Object} options
 * @param {string} options.projectRoot - Content repo root
 * @param {string} options.themeName - Theme package name
 * @param {Object} options.resolvedOverridePaths - Resolved override paths
 * @param {string} options.resourceType - Type: 'data', 'features', 'layouts', 'public'
 * @param {string} options.filename - File to resolve
 * @param {boolean} options.throwOnMissing - Throw error if not found
 * @param {string} options.errorMessage - Custom error message
 * @returns {{ path: string, source: 'user'|'theme' }|null}
 */
export function resolveResource({
  projectRoot,
  themeName,
  resolvedOverridePaths = {},
  resourceType,
  filename,
  throwOnMissing = false,
  errorMessage = null,
}) {
  const paths = buildPaths(projectRoot, themeName, resolvedOverridePaths, resourceType, filename);

  // Check user override first (highest priority)
  if (fs.existsSync(paths.user)) {
    return { path: paths.user, source: 'user' };
  }

  // Fall back to theme
  if (fs.existsSync(paths.theme)) {
    return { path: paths.theme, source: 'theme' };
  }

  // Not found
  if (throwOnMissing) {
    throw new Error(
      errorMessage ||
        `Resource "${filename}" not found in ${resourceType}\n` +
          `Checked:\n  - ${paths.user}\n  - ${paths.theme}`,
    );
  }

  return null;
}

/**
 * Scan directory with optional filter
 *
 * @param {string} dirPath - Directory to scan
 * @param {Function} filter - Filter function for files
 * @returns {string[]} Array of filenames
 */
function scanDirectory(dirPath, filter = () => true) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  try {
    return fs.readdirSync(dirPath).filter(filter);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Scan both user and theme directories, track sources
 *
 * Returns a Map where:
 * - 'theme': File only exists in theme
 * - 'user': File only exists in user directory
 * - 'override': File exists in both (user wins)
 *
 * @param {Object} options
 * @param {string} options.projectRoot - Content repo root
 * @param {string} options.themeName - Theme package name
 * @param {Object} options.resolvedOverridePaths - Resolved override paths
 * @param {string} options.resourceType - 'data', 'features', 'public'
 * @param {Function} options.filter - File filter function
 * @returns {Map<string, { name, source, path }>}
 */
export function scanWithCascade({
  projectRoot,
  themeName,
  resolvedOverridePaths = {},
  resourceType,
  filter = () => true,
}) {
  const items = new Map();
  const paths = buildPaths(projectRoot, themeName, resolvedOverridePaths, resourceType);

  // Scan theme directory first
  scanDirectory(paths.themeDir, filter).forEach((file) => {
    items.set(file, {
      name: file,
      source: 'theme',
      path: path.join(paths.themeDir, file),
    });
  });

  // Scan user directory (overrides or additions)
  scanDirectory(paths.userDir, filter).forEach((file) => {
    items.set(file, {
      name: file,
      source: determineUserSource(items, file),
      path: path.join(paths.userDir, file),
    });
  });

  return items;
}

/**
 * Scan directory recursively
 *
 * Used for static assets which can be nested
 *
 * @param {string} dirPath - Directory to scan
 * @param {string} baseDir - Base directory for relative paths
 * @returns {string[]} Array of relative paths
 */
export function scanDirectoryRecursive(dirPath, baseDir = dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  let files = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        files = files.concat(scanDirectoryRecursive(fullPath, baseDir));
      } else {
        // Return relative path from base
        files.push(path.relative(baseDir, fullPath));
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  return files;
}

/**
 * Determine the source type for a resource in a cascade scan
 *
 * @param {Map} existingItems - Map of already scanned items (typically from theme)
 * @param {string} itemName - Name of the item being added
 * @returns {'override'|'user'} The source type
 */
export function determineUserSource(existingItems, itemName) {
  return existingItems.has(itemName) ? 'override' : 'user';
}
