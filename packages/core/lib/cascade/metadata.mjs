/**
 * Theme metadata loading
 *
 * Reads and merges theme metadata from package.json and theme.json.
 */

import fs from 'fs';
import path from 'path';

import { getThemeRoot } from './paths.mjs';

/**
 * Process-wide cache of resolved theme metadata.
 *
 * Within a single Node process, `createThemerProject` (called from
 * `eleventy.config.mjs` and possibly `postcss.config.mjs`) and
 * `eleventyPluginThemer` itself each call `resolveThemeMetadata` once. The
 * cache collapses these to a single set of disk reads per (projectRoot,
 * themeName) pair. Theme metadata is treated as immutable for the lifetime
 * of the process — Eleventy restarts on config changes, so this is safe.
 *
 * Exposed as `_resetThemerMetadataCache` for tests; not part of the public API.
 */
const _metadataCache = new Map();

/**
 * Load and merge theme metadata from package.json and theme.json.
 *
 * Memoized per (projectRoot, themeName) pair — repeat calls within the
 * same process return the cached object.
 *
 * @param {string} projectRoot - The project's root directory.
 * @param {string} themeName - The name of the theme package.
 * @returns {Object} Merged theme metadata.
 */
export function resolveThemeMetadata(projectRoot, themeName) {
  const cacheKey = `${projectRoot}::${themeName}`;
  const cached = _metadataCache.get(cacheKey);
  if (cached) return cached;

  const themeRoot = getThemeRoot(projectRoot, themeName);
  const pkgJsonPath = path.join(themeRoot, 'package.json');
  const themeJsonPath = path.join(themeRoot, 'theme.json');

  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`Theme package.json not found for "${themeName}" at ${pkgJsonPath}`);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const themeJson = fs.existsSync(themeJsonPath)
    ? JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'))
    : {};

  // Merge, with package.json taking precedence for core fields
  const metadata = {
    ...themeJson,
    name: pkgJson.name,
    version: pkgJson.version,
    description: pkgJson.description,
  };

  _metadataCache.set(cacheKey, metadata);
  return metadata;
}

/**
 * Clear the metadata cache. Test-only helper; not part of the public API.
 * @internal
 */
export function _resetThemerMetadataCache() {
  _metadataCache.clear();
}
