/**
 * Shared JSDoc typedefs for @eleventy-plugin-themer/core.
 *
 * Pure documentation module — re-exporting nothing at runtime.
 * Imported only via `@type` JSDoc references (or by humans for grokking).
 */

/**
 * @typedef {Object} ThemeColorPalette
 * @property {string} [background]
 * @property {string} [surface]
 * @property {string} [primary]
 * @property {string} [secondary]
 * @property {string} [accent]
 * @property {string} [text]
 * @property {string} [textMuted]
 * @property {string} [link]
 * @property {string} [linkHover]
 * @property {string} [border]
 */

/**
 * @typedef {Object} ThemeToggleConfig
 * @property {'auto'|'light'|'dark'} [defaultTheme]
 * @property {boolean} [showToggle]
 */

/**
 * @typedef {Object} ThemeTypographyConfig
 * @property {string} [fontFamily]
 * @property {string} [fontFamilyHeading]
 * @property {string} [fontFamilyMono]
 * @property {string} [fontSize]
 * @property {string} [lineHeight]
 */

/**
 * @typedef {Object} ThemeSocialLink
 * @property {string} platform
 * @property {string} url
 * @property {string} [label]
 */

/**
 * @typedef {Object} ThemeFooterConfig
 * @property {string} [copyright]
 * @property {number|null} [startYear]
 * @property {boolean} [showPoweredBy]
 * @property {boolean} [showGitSha]
 * @property {string} [gitHubRepo]
 */

/**
 * @typedef {Object} ThemeNavigationConfig
 * @property {boolean} [showHomeLink]
 * @property {{ enabled?: boolean, pageSize?: number }} [pagination]
 */

/**
 * @typedef {Object} ThemeCodeHighlightingConfig
 * @property {string} [prismTheme]
 * @property {boolean} [diffHighlight]
 */

/**
 * The shape of a user theme override file (`<data>/theme.{mjs,js}`).
 *
 * Inner shapes are unconstrained — themes can introduce config keys freely.
 * Top-level keys are validated strictly against the active theme's
 * `theme.json#config` defaults at plugin init.
 *
 * @typedef {Object} ThemeUserConfig
 * @property {ThemeToggleConfig} [themeToggle]
 * @property {{ light?: ThemeColorPalette, dark?: ThemeColorPalette }} [colors]
 * @property {ThemeTypographyConfig} [typography]
 * @property {{ default?: string, dark?: string, favicon?: string }} [logos]
 * @property {ThemeSocialLink[]} [social]
 * @property {Record<string, string>} [socialPlatforms]
 * @property {{ googleAnalytics?: string, plausible?: string }} [analytics]
 * @property {Record<string, boolean>} [features]
 * @property {{ enabled?: boolean, provider?: string, [k: string]: unknown }} [comments]
 * @property {ThemeNavigationConfig} [navigation]
 * @property {ThemeCodeHighlightingConfig} [codeHighlighting]
 * @property {ThemeFooterConfig} [footer]
 */

/**
 * Shared cascade context attached to `eleventyConfig.themer` once
 * `eleventyPluginThemer` has run. Build adapters (e.g. build-vite) and
 * consumer helpers read this to avoid re-resolving theme metadata.
 *
 * @typedef {Object} ThemerContext
 * @property {Object} themeMetadata - Output of `resolveThemeMetadata`.
 * @property {Object} resolvedOverridePaths - Output of `resolveOverridePaths`.
 * @property {Map<string, { name: string, source: string, path: string }>} discoveredFeatures
 *   Output of `getAvailableFeatures`.
 * @property {string} projectRoot
 * @property {{ input: string, output: string, includes: string }} [dir]
 *   Computed Eleventy `dir` config (only when `input`/`output` were provided).
 */

export {};
