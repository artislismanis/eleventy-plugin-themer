/**
 * Plugin orchestration utility
 * Maps config keys to plugin functions via explicit registry
 */

import { logger } from '@eleventy-plugin-themer/core/logger';

import {
  purgeCSSFiles,
  generateCriticalCSS,
  minifyHTML,
  validateLinks,
  preserveNonHtmlFiles,
} from '../plugins/index.mjs';

/**
 * Explicit mapping from optimization config keys to plugin functions.
 * Add new plugins here when they are created.
 */
const PLUGIN_REGISTRY = {
  purgeCSS: purgeCSSFiles,
  criticalCSS: generateCriticalCSS,
  minifyHTML: minifyHTML,
  validateLinks: validateLinks,
  preserveNonHtml: preserveNonHtmlFiles,
};

/**
 * Set of valid optimization keys, exposed so consumers (and `eleventyPluginThemerVite`)
 * can fail-fast on typos in user-supplied `optimizations` rather than silently no-op.
 */
export const KNOWN_OPTIMIZATIONS = new Set(Object.keys(PLUGIN_REGISTRY));

/**
 * Run optimization plugins based on configuration
 *
 * All plugins follow a uniform signature: (outputDir, options) => Promise<void>
 * The dirs object is merged into options so plugins can access temp, output, etc.
 *
 * @param {Object} optimizations - Optimization configuration (key: true|false|function|object)
 * @param {Object} dirs - Directory configuration
 * @param {string} dirs.output - Output directory (required)
 * @param {string} [dirs.temp] - Temp directory (optional, passed to plugins via options)
 */
export async function runOptimizations(optimizations, dirs) {
  // validateLinks must run last so it checks the final output — after transforms
  // (purge/critical/minify) and after preserveNonHtml restores files like
  // feed.xml / sitemap.xml. Stable-sort keeps every other optimization in the
  // order the consumer declared them.
  const entries = Object.entries(optimizations).sort(
    ([a], [b]) => (a === 'validateLinks' ? 1 : 0) - (b === 'validateLinks' ? 1 : 0),
  );

  for (const [name, config] of entries) {
    // Skip if optimization is disabled
    if (!config) continue;

    // Custom function provided
    if (typeof config === 'function') {
      await config();
      continue;
    }

    // Built-in plugin
    if (config === true || typeof config === 'object') {
      const pluginFn = PLUGIN_REGISTRY[name];

      if (!pluginFn) {
        logger.warn(
          `⚠️  No plugin found for optimization: "${name}". Available: ${Object.keys(PLUGIN_REGISTRY).join(', ')}`,
        );
        continue;
      }

      // Merge dirs into options so plugins have access to all paths
      const userOptions = typeof config === 'object' ? config : {};
      const options = { ...dirs, ...userOptions };

      await pluginFn(dirs.output, options);
    }
  }
}
