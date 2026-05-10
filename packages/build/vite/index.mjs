/**
 * @eleventy-plugin-themer/build-vite
 *
 * Opinionated Vite integration with production optimizations.
 * Build what works for me, adaptable for your needs.
 */

import path from 'path';

import { getThemerContext } from '@eleventy-plugin-themer/core';

import { createThemeViteConfig } from './theme-config.mjs';
import { getFeatureEntries as _getFeatureEntries } from './utils/features.mjs';
import { ASSET_PATHS } from './utils/constants.mjs';
import { runIntegrationCheck } from './utils/integration-check.mjs';
import { KNOWN_OPTIMIZATIONS } from './utils/plugin-orchestrator.mjs';

/**
 * @public
 *
 * Theme-aware Vite configuration with auto-import and optimizations.
 * Exported for users composing their own integration; the standard entry
 * point is `eleventyPluginThemerVite` below.
 */
export { createThemeViteConfig } from './theme-config.mjs';

/**
 * @public
 *
 * Individual Vite plugins exported so consumers building a custom adapter
 * (e.g. for a different theme or build flow) can cherry-pick optimisations
 * without taking the whole `eleventyPluginThemerVite` orchestration.
 */
export {
  themeAutoImportPlugin,
  featureServePlugin,
  purgeCSSFiles,
  generateCriticalCSS,
  minifyHTML,
  validateLinks,
  preserveNonHtmlFiles,
} from './plugins/index.mjs';

/** @public */
export { getFeatureEntries } from './utils/features.mjs';

/**
 * @public
 *
 * PostCSS preset helper. Consumers call `createPostcssConfig` from their own
 * `postcss.config.mjs` to defer to plugins declared in `theme.json#build.postcss`.
 */
export { createPostcssConfig } from './postcss.mjs';

/**
 * Default rollup output options for theme builds.
 *
 * Provides sensible defaults for asset naming and organization.
 * Can be overridden via options.build.rollupOptions.output.
 *
 * @param {Object} options - Configuration options
 * @returns {Object} Rollup output configuration
 */
function createDefaultRollupOutput(_options = {}) {
  return {
    entryFileNames: (chunkInfo) => {
      if (chunkInfo.name === 'main') {
        return `${ASSET_PATHS.scripts}/[name].[hash].js`;
      }
      const cleanName = chunkInfo.name.replace(/^\//, '').replace(/\.js$/, '');
      return `${ASSET_PATHS.scripts}/${cleanName}.[hash].js`;
    },
    chunkFileNames: (chunkInfo) => {
      if (chunkInfo.name === 'main') {
        return `${ASSET_PATHS.scripts}/[name].[hash].js`;
      }
      return `${ASSET_PATHS.scripts}/chunks/[name].[hash].js`;
    },
    assetFileNames: ({ name, type }) => {
      if (type === 'asset' && name?.endsWith('.css')) {
        return `${ASSET_PATHS.css}/[name].[hash][extname]`;
      }
      if (/\.(xml|txt|xsl)$/.test(name ?? '')) {
        return '[name][extname]';
      }
      if (/\.(woff|woff2|eot|ttf|otf)$/.test(name ?? '')) {
        return `${ASSET_PATHS.fonts}/[name].[hash][extname]`;
      }
      if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(name ?? '')) {
        return `${ASSET_PATHS.images}/[name].[hash][extname]`;
      }
      return 'assets/[name].[hash][extname]';
    },
  };
}

/**
 * Eleventy plugin for Vite integration with theme support.
 *
 * This is the recommended way to use @eleventy-plugin-themer/build-vite.
 * It wraps @11ty/eleventy-plugin-vite with theme-aware configuration:
 * 1. Auto-imports theme styles and scripts
 * 2. Discovers and bundles theme features
 * 3. Sets up @theme aliases for imports
 * 4. Applies production optimizations (PurgeCSS, Critical CSS, etc.)
 * 5. Provides sensible rollup output defaults
 *
 * @param {Object} eleventyConfig - Eleventy configuration object (provided by Eleventy)
 * @param {Object} options - Plugin options
 * @param {string} options.theme - The theme package name (required)
 * @param {string} options.projectRoot - Project root path (required)
 * @param {string} [options.scriptsEntry] - Path to main scripts entry (default: 'overrides/scripts/main.js')
 * @param {Object} [options.optimizations] - Production optimizations config
 * @param {boolean} [options.optimizations.purgeCSS] - Enable PurgeCSS
 * @param {boolean} [options.optimizations.criticalCSS] - Enable Critical CSS extraction
 * @param {boolean} [options.optimizations.minifyHTML] - Enable HTML minification
 * @param {boolean} [options.optimizations.validateLinks] - Enable link validation
 * @param {Object} [options.optimizations.preserveNonHtml] - Preserve non-HTML files config
 * @param {Object} [options.overridePaths] - Override paths configuration
 * @param {Object} [options.viteOptions] - Additional Vite options to merge
 * @param {string} [options.tempFolderName='.11ty-vite'] - Temp folder name for Vite
 *
 * @example
 * // In eleventy.config.mjs
 * import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';
 *
 * export default async function(eleventyConfig) {
 *   const __dirname = fileURLToPath(new URL('.', import.meta.url));
 *
 *   eleventyConfig.addPlugin(eleventyPluginThemerVite, {
 *     theme: '@eleventy-plugin-themer/theme-base',
 *     projectRoot: __dirname,
 *     optimizations: {
 *       purgeCSS: true,
 *       criticalCSS: true,
 *       minifyHTML: true,
 *       validateLinks: true,
 *     },
 *   });
 *
 *   return { dir: { input: 'content', output: '_site' } };
 * }
 */
function validatePluginOptions({ theme, projectRoot, optimizations }) {
  if (!theme) {
    throw new Error(
      'eleventyPluginThemerVite requires a `theme` option specifying the theme package name.',
    );
  }
  if (!projectRoot) {
    throw new Error('eleventyPluginThemerVite requires a `projectRoot` option.');
  }
  if (optimizations && typeof optimizations === 'object') {
    const unknown = Object.keys(optimizations).filter((k) => !KNOWN_OPTIMIZATIONS.has(k));
    if (unknown.length > 0) {
      throw new Error(
        `eleventyPluginThemerVite: unknown optimization key(s): ${unknown.join(', ')}. ` +
          `Valid keys: ${[...KNOWN_OPTIMIZATIONS].join(', ')}.`,
      );
    }
  }
}

async function loadEleventyVitePlugin() {
  try {
    const mod = await import('@11ty/eleventy-plugin-vite');
    return mod.default;
  } catch (cause) {
    throw new Error(
      'eleventyPluginThemerVite requires @11ty/eleventy-plugin-vite to be installed.\n' +
        'Run: npm install @11ty/eleventy-plugin-vite',
      { cause },
    );
  }
}

/**
 * Resolve theme metadata, override paths, and feature discovery for the
 * Vite adapter from the cached themer context populated by
 * `eleventyPluginThemer` (see core/lib/index.mjs).
 *
 * Throws if the core plugin wasn't registered first — registration order is
 * required for correctness (the adapter relies on the core plugin's resolved
 * metadata, override paths, and feature discovery), so a silent fallback
 * masks a real misconfiguration.
 */
function resolveBuildContext({ eleventyConfig }) {
  const cached = getThemerContext(eleventyConfig);
  if (!cached) {
    throw new Error(
      'eleventyPluginThemerVite: no themer context found on eleventyConfig. ' +
        'Register `eleventyPluginThemer` (from @eleventy-plugin-themer/core) before ' +
        'this plugin so it can share resolved metadata, override paths, and discovered features.',
    );
  }
  return {
    themeMetadata: cached.themeMetadata,
    resolvedOverridePaths: cached.resolvedOverridePaths,
    discoveredFeatures: cached.discoveredFeatures,
  };
}

function buildViteOptions(ctx, opts) {
  const { themeMetadata, resolvedOverridePaths, discoveredFeatures, featureEntries } = ctx;
  const { projectRoot, scriptsEntry, optimizations, viteOptions, tempFolderName } = opts;

  return createThemeViteConfig(themeMetadata, {
    projectRoot,
    resolvedOverridePaths,
    optimizations,
    discoveredFeatures,
    dirs: { temp: tempFolderName },
    assetsInclude: ['**/*.xml', '**/*.txt', '**/*.xsl'],
    publicDir: 'public',
    server: {
      mode: 'development',
      middlewareMode: true,
      watch: {
        usePolling: true,
        interval: 100,
        ignored: ['**/_site/**', '**/node_modules/**'],
      },
      hmr: { overlay: true },
    },
    appType: 'custom',
    resolve: {
      alias: {
        '/assets/scripts/main.js': path.resolve(projectRoot, scriptsEntry),
        '/assets/scripts/features': path.resolve(projectRoot, resolvedOverridePaths.features),
      },
    },
    build: {
      mode: 'production',
      sourcemap: 'hidden',
      manifest: true,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          main: path.resolve(projectRoot, scriptsEntry),
          ...featureEntries,
        },
        output: createDefaultRollupOutput(),
      },
      cssCodeSplit: true,
    },
    ...viteOptions,
  });
}

export async function eleventyPluginThemerVite(eleventyConfig, options = {}) {
  const opts = {
    scriptsEntry: 'overrides/scripts/main.js',
    optimizations: {},
    overridePaths: {},
    viteOptions: {},
    tempFolderName: '.11ty-vite',
    ...options,
  };

  validatePluginOptions(opts);
  runIntegrationCheck({ silent: opts.skipIntegrationCheck });
  const EleventyVitePlugin = await loadEleventyVitePlugin();

  const ctx = resolveBuildContext({ eleventyConfig });
  const featureEntries = _getFeatureEntries(opts.projectRoot, ctx.themeMetadata, {
    resolvedOverridePaths: ctx.resolvedOverridePaths,
    discoveredFeatures: ctx.discoveredFeatures,
  });

  const themeViteConfig = buildViteOptions({ ...ctx, featureEntries }, opts);

  eleventyConfig.addPlugin(EleventyVitePlugin, {
    tempFolderName: opts.tempFolderName,
    viteOptions: themeViteConfig,
  });

  return {
    themeMetadata: ctx.themeMetadata,
    featureEntries,
  };
}
