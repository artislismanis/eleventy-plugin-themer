/**
 * Theme metadata loading
 *
 * Reads and merges theme metadata from package.json and theme.json.
 */

import fs from 'fs';
import path from 'path';

import { THEMER_CONTRACT_VERSION, MIN_SUPPORTED_CONTRACT_VERSION } from '../defaults.mjs';
import { capabilitiesSchema, formatZodIssues } from '../schemas.mjs';
import { logger } from '../logger.mjs';

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

  assertContractVersion(metadata);
  if (metadata.capabilities) {
    const result = capabilitiesSchema.safeParse(metadata.capabilities);
    if (!result.success) {
      throw new Error(
        `Invalid "capabilities" in theme.json for "${metadata.name}":\n${formatZodIssues(result.error)}`,
      );
    }
  }

  _metadataCache.set(cacheKey, metadata);
  return metadata;
}

/**
 * Enforce the framework ↔ theme template-contract version handshake.
 *
 * A theme declares the contract it targets via `theme.json#contractVersion`.
 * Core refuses a theme outside the supported range. A missing version is a
 * pre-1.0 grace: warn and assume the current contract.
 *
 * @param {Object} metadata - Merged theme metadata.
 */
function assertContractVersion(metadata) {
  const declared = metadata.contractVersion;

  if (declared === undefined) {
    logger.warn(
      `[themer] Theme "${metadata.name}" does not declare a contractVersion in theme.json; ` +
        `assuming v${THEMER_CONTRACT_VERSION}. Add "contractVersion": ${THEMER_CONTRACT_VERSION} to silence this.`,
    );
    return;
  }

  if (!Number.isInteger(declared)) {
    throw new Error(
      `Theme "${metadata.name}" declares a non-integer contractVersion (${JSON.stringify(declared)}).`,
    );
  }

  if (declared < MIN_SUPPORTED_CONTRACT_VERSION || declared > THEMER_CONTRACT_VERSION) {
    throw new Error(
      `Theme "${metadata.name}" targets template contract v${declared}, but this version of ` +
        `@eleventy-plugin-themer/core supports v${MIN_SUPPORTED_CONTRACT_VERSION}–v${THEMER_CONTRACT_VERSION}. ` +
        `Upgrade the theme or core so the versions are compatible.`,
    );
  }
}

/**
 * Clear the metadata cache. Test-only helper; not part of the public API.
 * @internal
 */
export function _resetThemerMetadataCache() {
  _metadataCache.clear();
}
