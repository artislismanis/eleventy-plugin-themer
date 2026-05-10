/**
 * Vite configuration helper for Eleventy themes
 *
 * Provides theme-agnostic Vite configuration with auto-import support
 */

import path from 'path';

import { DEFAULT_ASSET_ENTRIES, getThemeRoot } from '@eleventy-plugin-themer/core';
import { logger } from '@eleventy-plugin-themer/core/logger';
import { UNSAFE_KEYS } from '@eleventy-plugin-themer/core/internal/safe-keys';

import { themeAutoImportPlugin } from './plugins/auto-import.mjs';
import { featureServePlugin } from './plugins/feature-serve.mjs';
import { prismThemePlugin } from './plugins/prism-theme.mjs';
import { runOptimizations } from './utils/plugin-orchestrator.mjs';
import { getFeaturePathsForBuild } from './utils/features.mjs';
import { deepMergeViteConfig } from './utils/merge-config.mjs';
import { mergeStringArrays } from './utils/merge-arrays.mjs';

/**
 * Merge theme build hints into user optimization config.
 *
 * Themes declare build hints (e.g. PurgeCSS safelist) in `theme.json#build`.
 * These are merged with the user's `optimizations` config so the underlying
 * optimization plugin receives the union.
 *
 * Merge precedence:
 *   - Theme defaults come **first** (preserved at the head of array merges).
 *   - User values **append** (deduped) for safelist arrays so user input
 *     never silently shadows theme requirements, but also can't break
 *     greedy patterns relied on by the theme.
 *   - Object merges put user values **last** (user wins for primitive fields).
 *
 * Unsafe keys (`__proto__`, `constructor`, `prototype`) on `themeBuild` are
 * silently skipped to prevent prototype pollution via parsed JSON.
 *
 * @param {Object} optimizations - User-supplied optimization config.
 * @param {Object} themeBuild - Theme-supplied `build` block from `theme.json`.
 * @returns {Object} Merged optimizations object (new reference).
 */
function mergeThemeBuildHints(optimizations, themeBuild) {
  if (!optimizations || !themeBuild) return optimizations;

  const merged = { ...optimizations };

  for (const [pluginName, themeConfig] of Object.entries(themeBuild)) {
    if (UNSAFE_KEYS.has(pluginName)) continue;
    if (!(pluginName in merged) || !merged[pluginName]) continue;

    if (merged[pluginName] === true) {
      merged[pluginName] = { ...themeConfig };
    } else if (typeof merged[pluginName] === 'object') {
      if (themeConfig.safelist || merged[pluginName].safelist) {
        const userSafelist = merged[pluginName].safelist || {};
        const themeSafelist = themeConfig.safelist || {};
        merged[pluginName] = {
          ...merged[pluginName],
          safelist: {
            standard: mergeStringArrays(themeSafelist.standard, userSafelist.standard),
            deep: mergeStringArrays(themeSafelist.deep, userSafelist.deep),
            greedy: mergeStringArrays(themeSafelist.greedy, userSafelist.greedy),
          },
        };
      } else {
        merged[pluginName] = { ...merged[pluginName], ...themeConfig };
      }
    }
  }

  return merged;
}

function buildFeatureAliases(discoveredFeatures) {
  const featurePaths = getFeaturePathsForBuild(discoveredFeatures);
  const aliases = {};
  featurePaths.forEach((featurePath, featureName) => {
    aliases[`/${featureName}.js`] = featurePath;
  });
  return aliases;
}

function buildResolveAliases({ themeRoot, projectRoot, resolvedOverridePaths, featureAliases }) {
  return {
    '@theme': themeRoot,
    '/overrides/styles': path.resolve(projectRoot, resolvedOverridePaths.styles),
    '/overrides/scripts': path.resolve(projectRoot, resolvedOverridePaths.scripts),
    '/overrides/features': path.resolve(projectRoot, resolvedOverridePaths.features),
    ...featureAliases,
  };
}

function buildScssConfig({ projectRoot, stylesPath, themeRoot, themeName }) {
  return {
    api: 'modern-compiler',
    includePaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(projectRoot, stylesPath),
      path.join(themeRoot, 'styles'),
    ],
    additionalData: `$theme-name: '${themeName}';\n`,
  };
}

function buildOptimizationPlugin(mergedOptimizations, dirs) {
  let resolvedViteConfig;
  return {
    name: 'eleventy-themes-optimization',
    apply: 'build',
    configResolved(config) {
      resolvedViteConfig = config;
    },
    async closeBundle() {
      try {
        const finalDirs = { ...dirs, output: resolvedViteConfig.build.outDir };
        await runOptimizations(mergedOptimizations, finalDirs);
        logger.info('✅ Build optimization complete!\n');
      } catch (error) {
        logger.error('\n❌ Build optimization failed!');
        logger.error(`   ${error.message}\n`);
        throw error;
      }
    },
  };
}

function buildPluginsArray({
  projectRoot,
  themeName,
  themeMetadata,
  stylesEntry,
  scriptsEntry,
  resolvedOverridePaths,
  discoveredFeatures,
  userPlugins,
  mergedOptimizations,
  dirs,
}) {
  const themePlugins = [
    themeAutoImportPlugin({
      projectRoot,
      themeName,
      stylesEntry,
      scriptsEntry,
      resolvedOverridePaths,
    }),
    featureServePlugin({ discoveredFeatures }),
    prismThemePlugin(themeMetadata.config?.codeHighlighting),
    ...userPlugins,
  ];

  if (mergedOptimizations && Object.keys(mergedOptimizations).length > 0) {
    themePlugins.push(buildOptimizationPlugin(mergedOptimizations, dirs));
  }

  return themePlugins;
}

/**
 * Create Vite configuration for any Eleventy theme.
 *
 * Wraps `@eleventy-plugin-themer/build-vite` with theme-specific features:
 * - Auto-imports theme CSS and JS
 * - `@theme` alias for imports
 * - SCSS preprocessor configuration with theme paths
 *
 * @param {Object} themeMetadata - Theme metadata from `theme.json`.
 * @param {Object} options
 * @param {string} options.projectRoot - Project root path (required).
 * @param {Object} [options.resolvedOverridePaths] - Resolved override paths.
 * @param {Array}  [options.plugins] - Additional Vite plugins to append.
 * @param {Object} [options.optimizations] - Optimization config (purgeCSS, etc.).
 * @param {Object} [options.dirs] - Eleventy dirs config.
 * @param {Map}    [options.discoveredFeatures] - Pre-discovered feature map.
 * @param {...any} [options.viteOptions] - Additional Vite config to deep-merge.
 * @returns {Object} Vite configuration object.
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
  const stylesEntry = themeMetadata.assets?.styles?.entry || DEFAULT_ASSET_ENTRIES.styles;
  const scriptsEntry = themeMetadata.assets?.scripts?.entry || DEFAULT_ASSET_ENTRIES.scripts;

  const featureAliases = buildFeatureAliases(discoveredFeatures);
  const mergedOptimizations = mergeThemeBuildHints(optimizations, themeMetadata.build);

  const themeConfig = {
    resolve: {
      alias: buildResolveAliases({
        themeRoot,
        projectRoot,
        resolvedOverridePaths,
        featureAliases,
      }),
    },
    css: {
      preprocessorOptions: {
        scss: buildScssConfig({
          projectRoot,
          stylesPath: resolvedOverridePaths.styles,
          themeRoot,
          themeName,
        }),
      },
    },
    plugins: buildPluginsArray({
      projectRoot,
      themeName,
      themeMetadata,
      stylesEntry,
      scriptsEntry,
      resolvedOverridePaths,
      discoveredFeatures,
      userPlugins: plugins,
      mergedOptimizations,
      dirs,
    }),
  };

  return deepMergeViteConfig(themeConfig, viteOptions);
}
