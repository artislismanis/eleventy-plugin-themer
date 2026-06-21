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
 * Footer *presentation* config (theme-owned). The footer's *data* (start year,
 * repository URL) lives on the site-data contract — see {@link SiteData}.
 *
 * @typedef {Object} ThemeFooterConfig
 * @property {string} [copyright] - Template string; supports `{year}`/`{site.title}`.
 * @property {'left'|'center'|'right'} [alignment]
 * @property {boolean} [showPoweredBy]
 * @property {boolean} [showGitSha]
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
 * Theme-agnostic *data* (social, analytics, branding, comments) belongs to the
 * site, not here — see {@link SiteData}. This type covers presentation only.
 *
 * @typedef {Object} ThemeUserConfig
 * @property {ThemeToggleConfig} [themeToggle]
 * @property {{ light?: ThemeColorPalette, dark?: ThemeColorPalette }} [colors]
 * @property {ThemeTypographyConfig} [typography]
 * @property {ThemeNavigationConfig} [navigation]
 * @property {ThemeCodeHighlightingConfig} [codeHighlighting]
 * @property {ThemeFooterConfig} [footer]
 */

/**
 * A single social link in `site.social`. Provide either `account` (expanded via
 * the platform table by the `socialUrl` filter) or an explicit `url`.
 *
 * @typedef {Object} SiteSocialLink
 * @property {string} platform - Key into the platform table, or 'rss'/custom.
 * @property {string} [account]
 * @property {string} [url]
 * @property {string} [label]
 * @property {string} [icon] - Optional custom icon path (per-link override).
 */

/**
 * The framework-owned site-data contract (`content/_data/site.{mjs,js}`).
 *
 * Holds the theme-swap-invariant facts and capability toggles. Identity fields
 * (title/url/author/…) pass through; the keys below are shape-validated against
 * {@link import('./schemas.mjs').siteDataSchema}.
 *
 * @typedef {Object} SiteData
 * @property {string} [title]
 * @property {string} [url]
 * @property {string} [language]
 * @property {string} [description]
 * @property {{ name?: string, email?: string, url?: string }} [author]
 * @property {number} [startYear] - First year of publication (copyright range).
 * @property {string} [repository] - Source repo URL (footer commit links).
 * @property {string} [feedUrl]
 * @property {SiteSocialLink[]} [social]
 * @property {{ googleAnalytics?: string, plausible?: string }} [analytics]
 * @property {{ logo?: string, logoDark?: string, favicon?: string }} [branding]
 * @property {{ provider?: 'disqus'|'giscus'|'none', disqus?: { shortname?: string }, giscus?: Record<string, string> }} [comments]
 * @property {Record<string, boolean>} [features] - Capability toggles (search, rss, …).
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
