/**
 * Vite plugins for Eleventy theme development and production
 *
 * All plugins use dynamic imports for optional dependencies.
 * If a dependency is not installed, the plugin skips gracefully.
 */

export { themeAutoImportPlugin } from './auto-import.mjs';
export { featureServePlugin } from './feature-serve.mjs';
export { purgeCSSFiles } from './purge-css.mjs';
export { generateCriticalCSS } from './critical-css.mjs';
export { minifyHTML } from './minify-html.mjs';
export { validateLinks } from './validate-links.mjs';
export { preserveNonHtmlFiles } from './preserve-non-html.mjs';
export { prismThemePlugin } from './prism-theme.mjs';
