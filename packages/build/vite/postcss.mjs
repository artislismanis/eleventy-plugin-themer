/**
 * Theme-aware PostCSS preset for consumer `postcss.config.mjs` files.
 *
 * Themes can declare a `build.postcss.plugins` array in `theme.json` listing
 * preferred PostCSS plugin packages (with options). Consumers call
 * `createPostcssConfig({ themeMetadata, userPlugins })` from their own
 * `postcss.config.mjs` to get a ready-to-export config that defers to theme
 * defaults but lets the user append project-specific plugins.
 *
 * Example `theme.json`:
 *   "build": {
 *     "postcss": {
 *       "plugins": [
 *         { "package": "postcss-preset-env", "options": { "stage": 3 } },
 *         {
 *           "package": "cssnano",
 *           "options": { "preset": "default" },
 *           "production": true
 *         }
 *       ]
 *     }
 *   }
 *
 * Each plugin entry:
 *   - `package` (string, required): the npm package name to dynamic-import.
 *   - `options` (object, optional): passed to the plugin factory.
 *   - `production` (boolean, optional): if `true`, only loaded when
 *     `process.env.NODE_ENV === 'production'`.
 */

import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * NOTE: PostCSS config files are loaded synchronously at module-import time,
 * before Eleventy's async config function runs — so a consumer's
 * `postcss.config.mjs` cannot read the themer context off `eleventyConfig`
 * (it doesn't exist yet). It therefore re-reads `theme.json` via
 * `resolveThemeMetadata`. Cost: one static-file read per build. The
 * alternative (a side-channel from the plugin) is not worth the complexity.
 *
 * @param {Object} args
 * @param {Object} args.themeMetadata - Output of `resolveThemeMetadata`.
 * @param {string} [args.projectRoot] - Project root used for resolving
 *   theme-declared plugin packages. Defaults to `process.cwd()` (which is
 *   correct when called from a consumer's `postcss.config.mjs`).
 * @param {Array} [args.userPlugins] - Already-instantiated PostCSS plugins to
 *   append after the theme defaults. Use this to add project-specific
 *   plugins or to override theme plugins (PostCSS evaluates in order).
 * @param {boolean} [args.production] - Override env detection (defaults to
 *   `process.env.NODE_ENV === 'production'`).
 * @returns {Promise<{ plugins: Array }>} A PostCSS config object.
 */
export async function createPostcssConfig({
  themeMetadata,
  projectRoot,
  userPlugins = [],
  production,
} = {}) {
  if (!themeMetadata) {
    throw new Error('createPostcssConfig: themeMetadata is required');
  }

  const isProduction =
    typeof production === 'boolean' ? production : process.env.NODE_ENV === 'production';

  const declared = themeMetadata?.build?.postcss?.plugins;
  const themePluginEntries = Array.isArray(declared) ? declared : [];
  if (themePluginEntries.length === 0) {
    return { plugins: [...userPlugins] };
  }

  // Resolve packages relative to the consumer's project root rather than this
  // build-vite file. Plugin packages are dependencies of the consumer, not of
  // build-vite.
  const cwd = projectRoot || process.cwd();
  const requireFromProject = createRequire(path.join(cwd, 'package.json'));

  const themePlugins = [];
  for (const entry of themePluginEntries) {
    if (!entry || typeof entry !== 'object') continue;
    const { package: pkgName, options, production: prodOnly } = entry;
    if (!pkgName || typeof pkgName !== 'string') continue;
    if (prodOnly && !isProduction) continue;

    let resolvedPath;
    try {
      resolvedPath = requireFromProject.resolve(pkgName);
    } catch (cause) {
      throw new Error(
        `createPostcssConfig: PostCSS plugin "${pkgName}" declared by the theme is not ` +
          `installed in the consumer project. Add it to your dependencies.`,
        { cause },
      );
    }

    const mod = await import(pathToFileURL(resolvedPath).href);
    const factory = mod.default ?? mod;
    if (typeof factory !== 'function') {
      throw new Error(
        `createPostcssConfig: PostCSS plugin "${pkgName}" did not export a callable default.`,
      );
    }
    themePlugins.push(options !== undefined ? factory(options) : factory());
  }

  return {
    plugins: [...themePlugins, ...userPlugins],
  };
}
