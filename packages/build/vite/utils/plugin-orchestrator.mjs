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
  for (const [name, config] of Object.entries(optimizations)) {
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
