# @eleventy-plugin-themer/theme-base

## 0.3.0

### Minor Changes

- [#12](https://github.com/artislismanis/eleventy-plugin-themer/pull/12) [`4b968dc`](https://github.com/artislismanis/eleventy-plugin-themer/commit/4b968dc08b329ec22c80a24cf7dd8a2798a15176) Thanks [@artislismanis](https://github.com/artislismanis)! - Major visual + feature iteration on theme-base:
  - **Grayscale palette with a reddish-plum accent.** Neutral greys in light and dark (rough inverse); links are grayscale and light up to the accent on hover; accent used sparingly (hero CTA, focus). `linkHover` defaults to the accent.
  - **Theme-token CSS variables** now drive the hero gradient, and links/headings use them consistently.
  - **Hero shortcode** restyled: subtle, mode-aware gradient (darker→lighter), heading-scale title/subtitle, theme-coloured text and buttons, consistent solid hover on both CTAs (white reserved for image/overlay heroes).
  - **Brand social icons** via the `simple-icons` package: new `socialIcon` filter inlines a currentColor SVG (with a `twitter`→`x` alias and a supplemental glyph for brands simple-icons removed, e.g. LinkedIn); falls back to a text label. Per-link custom `social.icon` images still win. RSS works as a platform (`{ platform: 'rss', url: '/feed.xml' }`).
  - **Content grid** boxes accept a `span` for unequal layouts (e.g. 2/3 + 1/3 via `cols=3` + spans 2/1).
  - **External links** are marked (`rel`/`target` + an `external-link` class, scoped to `<main>`) by a new `externalLinks` transform and decorated with a Lucide icon (overridable `--external-link-icon`).
  - **Footer** cleanup: unified bottom-row typography, configurable `footer.alignment` (default centre), underlined footer links.
  - **Build metadata in the theme:** a `build` global (git SHA + timestamp) is now provided by the theme, so the footer commit hash works without a consumer data file. Consumers can still override via `content/_data/build.js`.
  - **Configurable feed URL** (`feedUrl`, default `/feed.xml`) used for an absolute `<link rel="alternate">` autodiscovery tag (correct path + avoids bundler inlining).
  - Subtler dark/light toggle (borderless, smaller icon, destination glyph), thicker "highlighter" underline on active/hover nav items.

## 0.2.0

### Minor Changes

- [#10](https://github.com/artislismanis/eleventy-plugin-themer/pull/10) [`35dab5a`](https://github.com/artislismanis/eleventy-plugin-themer/commit/35dab5a1a60e98524fcc4197deda6b228cef0d83) Thanks [@artislismanis](https://github.com/artislismanis)! - Restyle theme-base to the 11ty eleventy-base-blog neutral palette (light: white background, `#333` text, navy `#082840` links, plum `#5f2b48` hover; dark: `#15202b` background, `#1493fb` links). Adds a `linkVisited` color token (with a wired `a:visited` rule). Adds a self-contained `back-to-top` feature alongside `code-highlighting` to demonstrate multi-feature discovery and the `index.auto.js` opt-in mechanism.

  Fixes multi-word theme color tokens (`linkHover`, `textMuted`, `linkVisited`) being ignored when overridden via `theme.js`/`theme.json`. The theme-styles partial now injects custom properties through a new `cssVarKey` filter that camelCase→kebab-cases (and sanitizes) keys, so the emitted variable names (e.g. `--theme-light-link-hover`) match what the SCSS reads. Previously these were emitted without a hyphen and silently fell back to the built-in defaults.

## 0.1.0

### Minor Changes

- [#6](https://github.com/artislismanis/eleventy-plugin-themer/pull/6) [`ce76b07`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ce76b0748182348964479f3d26474bc871e3e9f4) Thanks [@artislismanis](https://github.com/artislismanis)! - User `content/_data/theme.js` `codeHighlighting` overrides (e.g. `prismTheme`, `diffHighlight`) now reach the build. Previously the Vite prism plugin read the theme's `theme.json` defaults directly, so a consumer's chosen Prism theme had no effect on the bundled CSS (and an invalid value couldn't be caught). The core plugin now stashes the merged theme config (`theme.json` defaults + `theme.js`) on the shared themer context, and the build adapter uses it when configuring the prism plugin.

- [#2](https://github.com/artislismanis/eleventy-plugin-themer/pull/2) [`ed23317`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ed23317100ef0c3116e2c0ee2631fb4cff98eb85) Thanks [@artislismanis](https://github.com/artislismanis)! - Initial pre-release (0.1.0) of the Eleventy theme framework.

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

- [#6](https://github.com/artislismanis/eleventy-plugin-themer/pull/6) [`ce76b07`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ce76b0748182348964479f3d26474bc871e3e9f4) Thanks [@artislismanis](https://github.com/artislismanis)! - Layout overrides now work: a file at `overrides/layouts/<name>.njk` shadows the same-named theme layout referenced via `layout:`. Eleventy resolves top-level layouts from a single includes directory (the theme's), so the core plugin now registers a layout alias for each override file pointing at its path relative to the theme layouts dir. This is OS-neutral (no symlinks/temp dirs) and reads the live file each build, so override edits hot-reload. Adding a brand-new override layout file mid-`--serve` session still needs a restart (aliases are registered once at config time). Partial overrides (via the template loader) are unchanged. Replaces the previous `theme.json#layouts` alias path, which resolved to absolute paths Eleventy rejected.

- [#6](https://github.com/artislismanis/eleventy-plugin-themer/pull/6) [`ce76b07`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ce76b0748182348964479f3d26474bc871e3e9f4) Thanks [@artislismanis](https://github.com/artislismanis)! - Unknown `features` in page front matter now fail the build with a clear `Invalid feature. Available: …` message, validated per page. The core plugin registers an Eleventy preprocessor for this; a `_data/eleventyDataSchema.js` (e.g. the `themerDataSchema` re-export) only validates the global data object, so it never saw per-page front matter and an unknown feature previously surfaced as a cryptic downstream Vite "Failed to resolve /<name>.js" error.

- [#3](https://github.com/artislismanis/eleventy-plugin-themer/pull/3) [`7d56d51`](https://github.com/artislismanis/eleventy-plugin-themer/commit/7d56d512003ce068c9650ad1b2be3744fb1e1d78) Thanks [@artislismanis](https://github.com/artislismanis)! - API consolidation: `eleventyPluginThemer` works via `addPlugin` (use `getThemerDir` helper for dir config when applicable; direct call still required when `dir` must be in the config-function return). New `themerDataSchema` helper as a drop-in `eleventyDataSchema` validator. Auto-watch override directories from inside the plugin. Theme-declared PostCSS plugins via `build.postcss` in `theme.json` and a new `createPostcssConfig` helper (subpath: `@eleventy-plugin-themer/build-vite/postcss`). Internal: shared cascade context between core and vite (`getThemerContext`), extracted `loadModuleFromPath` helper, deduped safelist merge via `mergeStringArrays`, centralized vitest base config, JSDoc typedefs at `@eleventy-plugin-themer/core/types`.

  **Stricter validation (breaking for misconfigured projects):** `eleventyPluginThemerVite` now throws when `eleventyPluginThemer` was not registered first (previously warned and re-resolved); register order is required. It also throws on unknown `optimizations` keys (previously silently ignored), so typos like `purgeCS` fail fast with the valid set listed.

### Patch Changes

- Updated dependencies [[`ce76b07`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ce76b0748182348964479f3d26474bc871e3e9f4), [`ed23317`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ed23317100ef0c3116e2c0ee2631fb4cff98eb85), [`ce76b07`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ce76b0748182348964479f3d26474bc871e3e9f4), [`ce76b07`](https://github.com/artislismanis/eleventy-plugin-themer/commit/ce76b0748182348964479f3d26474bc871e3e9f4), [`19c4029`](https://github.com/artislismanis/eleventy-plugin-themer/commit/19c4029f91822852263523cc811c0910b2fcb8ce), [`7d56d51`](https://github.com/artislismanis/eleventy-plugin-themer/commit/7d56d512003ce068c9650ad1b2be3744fb1e1d78)]:
  - @eleventy-plugin-themer/core@0.1.0
