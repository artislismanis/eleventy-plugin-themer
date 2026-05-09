/**
 * Vite configuration helper for Eleventy themes
 *
 * Provides theme-agnostic Vite configuration with auto-import support
 */

import path from 'path';

import { DEFAULT_ASSET_ENTRIES, getThemeRoot } from '@eleventy-plugin-themer/core';
import { logger } from '@eleventy-plugin-themer/core/logger';

import { themeAutoImportPlugin } from './plugins/auto-import.mjs';
import { featureServePlugin } from './plugins/feature-serve.mjs';
import { prismThemePlugin } from './plugins/prism-theme.mjs';
import { runOptimizations } from './utils/plugin-orchestrator.mjs';
import { getFeaturePathsForBuild } from './utils/features.mjs';
import { deepMergeViteConfig } from './utils/merge-config.mjs';

/**
 * Merge theme build hints into user optimization config.
 * Themes declare build hints (e.g. purgeCSS safelist) in theme.json under "build".
 * These are merged with the user's optimization config so the plugin receives both.
 */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function mergeThemeBuildHints(optimizations, themeBuild) {
  if (!optimizations || !themeBuild) return optimizations;

  const merged = { ...optimizations };

  for (const [pluginName, themeConfig] of Object.entries(themeBuild)) {
    if (UNSAFE_KEYS.has(pluginName)) continue;
    if (!(pluginName in merged) || !merged[pluginName]) continue;

    // Convert `true` to an object so we can merge theme hints into it
    if (merged[pluginName] === true) {
      merged[pluginName] = { ...themeConfig };
    } else if (typeof merged[pluginName] === 'object') {
      // Deep merge safelist arrays when either side has a safelist
      if (themeConfig.safelist || merged[pluginName].safelist) {
        const userSafelist = merged[pluginName].safelist || {};
        const themeSafelist = themeConfig.safelist || {};
        merged[pluginName] = {
          ...merged[pluginName],
          safelist: {
            standard: [...(themeSafelist.standard || []), ...(userSafelist.standard || [])],
            deep: [...(themeSafelist.deep || []), ...(userSafelist.deep || [])],
            greedy: [...(themeSafelist.greedy || []), ...(userSafelist.greedy || [])],
          },
        };
      } else {
        merged[pluginName] = { ...merged[pluginName], ...themeConfig };
      }
    }
  }

  return merged;
}

/**
 * Create Vite configuration for any Eleventy theme
 *
 * This wraps @eleventy-plugin-themer/build-vite with theme-specific features:
 * - Auto-imports theme CSS and JS
 * - @theme alias for imports
 * - SCSS preprocessor configuration with theme paths
 *
 * Works with any theme that exports metadata following the theme.json schema.
 *
 * @param {Object} themeMetadata - Theme metadata from theme.json
 * @param {Object} options - Configuration options
 * @param {string} options.projectRoot - Project root path (required)
 * @param {Object} options.overridePaths - Override paths configuration
 * @param {Object} ...viteOptions - Additional Vite config to merge
 * @returns {Object} Vite configuration object
 *
 * @example
 * import { createThemeViteConfig } from '@eleventy-plugin-themer/build-vite';
 * import { metadata } from '@eleventy-plugin-themer/theme-base';
 *
 * const __dirname = fileURLToPath(new URL('.', import.meta.url));
 *
 * eleventyConfig.addPlugin(EleventyVitePlugin, {
 *   viteOptions: createThemeViteConfig(metadata, {
 *     projectRoot: __dirname,
 *     optimizations: {
 *       purgeCSS: true,
 *       criticalCSS: true,
 *     },
 *   }),
 * });
 */
export function createThemeViteConfig(themeMetadata, options = {}) {
  const {
    projectRoot,
    resolvedOverridePaths = {},
    plugins = [],
    optimizations,
    dirs,
    discoveredFeatures,
    ...viteOptions
  } = options;

  if (!projectRoot) {
    throw new Error('createThemeViteConfig: projectRoot is required');
  }

  if (!themeMetadata || !themeMetadata.name) {
    throw new Error('createThemeViteConfig: themeMetadata with name is required');
  }

  const themeName = themeMetadata.name;

  const themeRoot = getThemeRoot(projectRoot, themeName);
  const stylesPath = resolvedOverridePaths.styles;
  const scriptsPath = resolvedOverridePaths.scripts;

  // Get theme assets entry points from metadata (or use framework defaults)
  const stylesEntry = themeMetadata.assets?.styles?.entry || DEFAULT_ASSET_ENTRIES.styles;
  const scriptsEntry = themeMetadata.assets?.scripts?.entry || DEFAULT_ASSET_ENTRIES.scripts;

  // Build aliases for feature entry points (using pre-discovered features if available)
  const featurePaths = getFeaturePathsForBuild(projectRoot, themeMetadata, discoveredFeatures);
  const featureAliases = {};
  featurePaths.forEach((featurePath, featureName) => {
    featureAliases[`/${featureName}.js`] = featurePath;
  });

  // Theme-specific plugins
  const themePlugins = [
    // Auto-import theme assets
    themeAutoImportPlugin({
      projectRoot,
      themeName,
      stylesEntry,
      scriptsEntry,
      resolvedOverridePaths,
    }),

    // Serve feature scripts in dev mode (/{feature-name}.js URLs)
    featureServePlugin({
      projectRoot,
      themeMetadata,
      discoveredFeatures,
    }),

    // Config-driven PrismJS theme (virtual:prism-theme module)
    prismThemePlugin(themeMetadata.config?.codeHighlighting),

    // User's additional plugins
    ...plugins,
  ];

  // Merge theme's build hints into optimization config
  // Themes can declare e.g. build.purgeCSS.safelist in theme.json
  const mergedOptimizations = mergeThemeBuildHints(optimizations, themeMetadata.build);

  // Add optimization plugin if optimizations are configured
  if (mergedOptimizations && Object.keys(mergedOptimizations).length > 0) {
    let resolvedViteConfig;
    themePlugins.push({
      name: 'eleventy-themes-optimization',
      apply: 'build',
      configResolved(config) {
        // Store the resolved config for use in closeBundle
        resolvedViteConfig = config;
      },
      async closeBundle() {
        try {
          // Use the final output dir from Vite's resolved config
          const finalDirs = { ...dirs, output: resolvedViteConfig.build.outDir };
          await runOptimizations(mergedOptimizations, finalDirs);
          logger.info('✅ Build optimization complete!\n');
        } catch (error) {
          logger.error('\n❌ Build optimization failed!');
          logger.error(`   ${error.message}\n`);
          throw error;
        }
      },
    });
  }

  // Theme-specific configuration
  const themeConfig = {
    resolve: {
      alias: {
        // @theme alias for JS/TS imports
        '@theme': themeRoot,
        // User overrides aliases
        '/overrides/styles': path.resolve(projectRoot, stylesPath),
        '/overrides/scripts': path.resolve(projectRoot, scriptsPath),
        '/overrides/features': path.resolve(projectRoot, resolvedOverridePaths.features),
        // Feature entry point aliases (e.g., /code-highlighting.js → theme/features/code-highlighting/index.js)
        ...featureAliases,
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',

          // Allow @use '@theme/styles/variables' in SCSS
          includePaths: [
            path.resolve(projectRoot, 'node_modules'),
            path.resolve(projectRoot, stylesPath),
            path.join(themeRoot, 'styles'),
          ],

          // Provide theme name as SCSS variable
          additionalData: `$theme-name: '${themeName}';\n`,
        },
      },
    },

    plugins: themePlugins,
  };

  // Deep merge with user's Vite options
  return deepMergeViteConfig(themeConfig, viteOptions);
}
