/**
 * Zod schemas for runtime validation of theme-related user input.
 *
 * - `themeConfigSchema(themeMetadata)` validates a user's theme override
 *   (typically `content/_data/theme.js`). It is **strict** at the top level —
 *   any key not present in the theme's defaults is rejected as a typo. Inner
 *   shapes are unconstrained so themes can evolve their config freely.
 *
 * - `featuresFrontMatterSchema(projectRoot, themeMetadata, resolvedOverridePaths)`
 *   builds a passthrough schema for the `features` front matter field, validating
 *   names against features actually available (theme + user overrides).
 */

import { z } from 'zod';

import { getAvailableFeatures } from './cascade/features.mjs';

export function themeConfigSchema(themeMetadata) {
  const config = themeMetadata?.config || {};
  const shape = {};
  for (const key of Object.keys(config)) {
    shape[key] = z.unknown().optional();
  }
  return z.object(shape).strict();
}

export function featuresFrontMatterSchema(projectRoot, themeMetadata, resolvedOverridePaths) {
  const features = Array.from(
    getAvailableFeatures(projectRoot, themeMetadata, resolvedOverridePaths).keys(),
  );

  if (features.length === 0) {
    return z.union([z.string(), z.array(z.string())]).optional();
  }

  const message = `Invalid feature. Available: ${features.join(', ')}`;
  const featureEnum = z.enum(features, { errorMap: () => ({ message }) });
  return z.union([featureEnum, z.array(featureEnum)]).optional();
}

/**
 * Format zod issues as a human-readable, multi-line string.
 *
 * @param {import('zod').ZodError} error
 * @returns {string}
 */
export function formatZodIssues(error) {
  return error.issues
    .map((i) => `  - ${i.path.length ? i.path.join('.') : '<root>'}: ${i.message}`)
    .join('\n');
}
