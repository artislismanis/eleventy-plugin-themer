/**
 * Zod schemas for runtime validation of theme-related user input.
 *
 * - `themeConfigSchema(themeMetadata)` validates a user's theme override
 *   (typically `theme.config.mjs`). It is **strict** at the top level —
 *   any key not present in the theme's defaults is rejected as a typo. Inner
 *   shapes are unconstrained so themes can evolve their config freely.
 *
 * - `siteDataSchema` is the framework-owned, inner-validated contract for the
 *   theme-agnostic site data (`content/_data/site.{mjs,js}`): social, analytics,
 *   branding, comments, feature toggles. Unlike `themeConfigSchema` it defines
 *   the shape itself; site data is checked *against* it. Unknown top-level keys
 *   (title, url, author, …) pass through untouched.
 *
 * - `capabilitiesSchema` validates a theme's declared `theme.json#capabilities`.
 *
 * - `featuresFrontMatterSchema(projectRoot, themeMetadata, resolvedOverridePaths)`
 *   builds a passthrough schema for the `features` front matter field, validating
 *   names against features actually available (theme + user overrides).
 */

import { z } from 'zod';

import { getAvailableFeatures } from './cascade/features.mjs';
import { UNSAFE_KEYS } from './internal/safe-keys.mjs';

// --- Framework-owned site-data contract (validated against site.{mjs,js}) ---

export const siteSocialSchema = z
  .array(
    z.object({
      platform: z.string(),
      account: z.string().optional(),
      url: z.string().optional(),
      label: z.string().optional(),
      icon: z.string().optional(),
    }),
  )
  .optional();

export const siteAnalyticsSchema = z
  .object({
    googleAnalytics: z.string().optional(),
    plausible: z.string().optional(),
  })
  .optional();

export const siteBrandingSchema = z
  .object({
    logo: z.string().optional(),
    logoDark: z.string().optional(),
    favicon: z.string().optional(),
  })
  .optional();

export const siteCommentsSchema = z
  .object({
    provider: z.enum(['disqus', 'giscus', 'none']).default('none'),
    disqus: z.object({ shortname: z.string() }).optional(),
    giscus: z.record(z.string(), z.string()).optional(),
  })
  .optional();

export const siteFeaturesSchema = z.record(z.string(), z.boolean()).optional();

/**
 * The site-data contract. A plain (non-strict) object: known cross-cutting keys
 * are shape-validated; everything else a site declares (title, url, author, …)
 * is left alone.
 */
export const siteDataSchema = z.object({
  social: siteSocialSchema,
  analytics: siteAnalyticsSchema,
  branding: siteBrandingSchema,
  comments: siteCommentsSchema,
  features: siteFeaturesSchema,
});

/** Theme capability declaration (`theme.json#capabilities`). */
export const capabilitiesSchema = z.object({
  social: z
    .object({
      render: z.string().optional(),
      fallback: z.string().optional(),
    })
    .optional(),
  analytics: z.array(z.string()).optional(),
  comments: z.array(z.string()).optional(),
  search: z.boolean().optional(),
});

/**
 * Compare resolved site data against the active theme's declared capabilities.
 * Returns human-readable warnings for things the site asked for that the theme
 * does not implement — never throws. Valid data the theme *can't* render is
 * skipped with a warning, not dropped silently.
 *
 * @param {Object} site - Resolved `site` global.
 * @param {Object} [capabilities] - `themeMetadata.capabilities`.
 * @returns {string[]}
 */
export function siteCapabilityWarnings(site, capabilities = {}) {
  const warnings = [];

  const declaredAnalytics = capabilities.analytics || [];
  for (const [key, value] of Object.entries(site?.analytics || {})) {
    if (value && !declaredAnalytics.includes(key)) {
      warnings.push(
        `site.analytics.${key} is set but the active theme does not declare analytics support for "${key}" — it will not render.`,
      );
    }
  }

  const provider = site?.comments?.provider;
  if (provider && provider !== 'none') {
    const declaredComments = capabilities.comments || [];
    if (!declaredComments.includes(provider)) {
      warnings.push(
        `site.comments.provider "${provider}" is not implemented by the active theme ` +
          `(declares: ${declaredComments.join(', ') || 'none'}) — comments will not render.`,
      );
    }
  }

  if (site?.features?.search && !capabilities.search) {
    warnings.push(
      'site.features.search is enabled but the active theme does not implement search — it will not render.',
    );
  }

  return warnings;
}

export function themeConfigSchema(themeMetadata) {
  const config = themeMetadata?.config || {};
  const shape = {};
  for (const key of Object.keys(config)) {
    if (UNSAFE_KEYS.has(key)) continue;
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
  const featureEnum = z.enum(features, { error: () => message });
  return z.union([featureEnum, z.array(featureEnum)], { error: () => message }).optional();
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
