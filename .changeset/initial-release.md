---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
'@eleventy-plugin-themer/theme-base': minor
---

Initial pre-release (0.1.0) of the Eleventy theme framework.

**Pre-stable signal:** while on 0.x, breaking changes may land in any minor bump. 1.0.0 will commit to standard SemVer.

### Core (`@eleventy-plugin-themer/core`)

- Build-agnostic cascade system for Eleventy themes
- Public API: `eleventyPluginThemer`, `resolveThemeMetadata`, `getAvailableFeatures`, `resolveResource`, `resolveFeatureEntryPath`, `getThemeRoot`, `buildPaths`, `resolveOverridePaths`, `DEFAULT_ASSET_ENTRIES`
- Schema helpers: `themeConfigSchema`, `featuresFrontMatterSchema`, `formatZodIssues` (zod-based runtime validation with strict-key rejection and prototype-pollution guards)
- Subpath: `./logger` (public), `./internal/safe-keys` (cross-package internal — not part of SemVer surface)
- Layered cascade: data, config, assets, template engine, override resolution

### Build adapter (`@eleventy-plugin-themer/build-vite`)

- Vite integration via `eleventyPluginThemerVite()` with auto-import, `@theme` alias, SCSS preprocessor config
- Production optimisations: PurgeCSS, Critical CSS, HTML minification, link validation, non-HTML preservation
- Three-layer build-hint merge (plugin defaults + theme + consumer)
- Integration sanity check: validates Node, Vite, and `@11ty/eleventy-plugin-vite` versions against declared peer ranges; emits a single banner on success or actionable warnings on mismatch. Never throws. Opt-out via `skipIntegrationCheck: true`.
- Individual optimisation plugins exported for custom pipelines

### Reference theme (`@eleventy-plugin-themer/theme-base`)

- Blog-shaped reference implementation with cascade-aware layouts, partials, styles, and features
- `code-highlighting` feature (Prism with config-driven theme selection)
- Hero / content-grid / content-box shortcodes
- Built-in escape filters: `escapeHtml`, `escapeAttr`, `escapeCssValue`, `escapeJsString`, `safeUrl`, `socialUrl`
- `safeUrl()` uses a strict scheme allowlist (`http`, `https`, `mailto`, `tel`, plus relative URLs); strips control / zero-width / bidi-override chars; rejects `https:\\evil.com` backslash-authority forms; blocks percent-encoded CR/LF in `mailto:`/`tel:`
