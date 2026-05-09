/**
 * Utilities for merging Vite configuration objects
 *
 * Provides deep merge functionality for Vite config, handling nested
 * objects like resolve.alias, css.preprocessorOptions, and plugins arrays.
 */

import { UNSAFE_KEYS } from '@eleventy-plugin-themer/core/internal/safe-keys';

/**
 * Deep merge Vite configuration objects
 *
 * Merges a base theme config with user-provided overrides.
 * Handles special cases for Vite's nested config structure:
 * - resolve.alias: Merged (user aliases override theme)
 * - css.preprocessorOptions.scss: Merged deeply
 * - plugins: Concatenated (theme first, then user)
 *
 * @param {Object} themeConfig - Base theme Vite configuration
 * @param {Object} userConfig - User's Vite configuration overrides
 * @returns {Object} Merged Vite configuration
 *
 * @example
 * const mergedConfig = deepMergeViteConfig(themeConfig, {
 *   resolve: { alias: { '@custom': '/path/to/custom' } },
 *   css: { preprocessorOptions: { scss: { additionalData: '$color: red;' } } },
 * });
 */
export function deepMergeViteConfig(themeConfig, userConfig = {}) {
  // Strip unsafe keys to prevent prototype pollution
  const safeTheme = Object.fromEntries(
    Object.entries(themeConfig).filter(([k]) => !UNSAFE_KEYS.has(k)),
  );
  const safeUser = Object.fromEntries(
    Object.entries(userConfig).filter(([k]) => !UNSAFE_KEYS.has(k)),
  );

  // Extract plugins for special handling (concatenation, not merge)
  const themePlugins = safeTheme.plugins || [];
  const userPlugins = safeUser.plugins || [];

  return {
    ...safeTheme,
    ...safeUser,

    // Deep merge resolve options
    resolve: {
      ...safeTheme.resolve,
      ...(safeUser.resolve || {}),
      alias: {
        ...(safeTheme.resolve?.alias || {}),
        ...(safeUser.resolve?.alias || {}),
      },
    },

    // Deep merge CSS options
    css: {
      ...safeTheme.css,
      ...(safeUser.css || {}),
      preprocessorOptions: {
        ...(safeTheme.css?.preprocessorOptions || {}),
        ...(safeUser.css?.preprocessorOptions || {}),
        scss: {
          ...(safeTheme.css?.preprocessorOptions?.scss || {}),
          ...(safeUser.css?.preprocessorOptions?.scss || {}),
        },
      },
    },

    // Deep merge build options
    build: {
      ...(safeTheme.build || {}),
      ...(safeUser.build || {}),
      rollupOptions: {
        ...(safeTheme.build?.rollupOptions || {}),
        ...(safeUser.build?.rollupOptions || {}),
        input: {
          ...(safeTheme.build?.rollupOptions?.input || {}),
          ...(safeUser.build?.rollupOptions?.input || {}),
        },
      },
    },

    // Deep merge server options
    server: {
      ...(safeTheme.server || {}),
      ...(safeUser.server || {}),
    },

    // Concatenate plugins (theme first, then user)
    plugins: [...themePlugins, ...userPlugins],
  };
}
