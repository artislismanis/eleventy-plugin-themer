# @eleventy-plugin-themer/core

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

- [#5](https://github.com/artislismanis/eleventy-plugin-themer/pull/5) [`19c4029`](https://github.com/artislismanis/eleventy-plugin-themer/commit/19c4029f91822852263523cc811c0910b2fcb8ce) Thanks [@artislismanis](https://github.com/artislismanis)! - **Pre-1.0 API tightening.** Trimmed the public surface ahead of the first stable release; removed exports that were either internal plumbing leaking out or escape hatches no consumer used.

  ### Core (`@eleventy-plugin-themer/core`)

  Moved the following from the main entry to the new `@eleventy-plugin-themer/core/internal/api` subpath (cross-package internal — not part of SemVer surface):
  - `getThemerContext`, `getThemerDir`, `setThemerContext`
  - `getThemeRoot`
  - `resolveResource`
  - `getAvailableFeatures`

  End users on the standard `createThemerProject` / `eleventyPluginThemer` / `themerDataSchema` flow are unaffected. Adapter authors and tests that imported these names will need to switch to the `internal/api` subpath; that subpath is documented as cross-package only and may change without a changelog entry.

  `resolveThemeMetadata` is now memoized per `(projectRoot, themeName)` for the lifetime of the Node process, so repeated calls (e.g. `eleventy.config.mjs` and `postcss.config.mjs` each instantiating `createThemerProject`) collapse to a single set of disk reads.

  ### Build adapter (`@eleventy-plugin-themer/build-vite`)

  Removed the following public exports from the main entry; they were never wired up by the standard consumer pattern (`eleventyPluginThemerVite`) and were carrying surface area without paying for it:
  - `createThemeViteConfig`
  - Individual optimisation plugins: `themeAutoImportPlugin`, `featureServePlugin`, `purgeCSSFiles`, `generateCriticalCSS`, `minifyHTML`, `validateLinks`, `preserveNonHtmlFiles`
  - `getFeatureEntries`
  - `KNOWN_OPTIMIZATIONS`

  The `./plugins` and `./plugins/*` subpath exports are gone from `package.json`; the modules still exist internally but are no longer addressable from outside the package.

- [#3](https://github.com/artislismanis/eleventy-plugin-themer/pull/3) [`7d56d51`](https://github.com/artislismanis/eleventy-plugin-themer/commit/7d56d512003ce068c9650ad1b2be3744fb1e1d78) Thanks [@artislismanis](https://github.com/artislismanis)! - API consolidation: `eleventyPluginThemer` works via `addPlugin` (use `getThemerDir` helper for dir config when applicable; direct call still required when `dir` must be in the config-function return). New `themerDataSchema` helper as a drop-in `eleventyDataSchema` validator. Auto-watch override directories from inside the plugin. Theme-declared PostCSS plugins via `build.postcss` in `theme.json` and a new `createPostcssConfig` helper (subpath: `@eleventy-plugin-themer/build-vite/postcss`). Internal: shared cascade context between core and vite (`getThemerContext`), extracted `loadModuleFromPath` helper, deduped safelist merge via `mergeStringArrays`, centralized vitest base config, JSDoc typedefs at `@eleventy-plugin-themer/core/types`.

  **Stricter validation (breaking for misconfigured projects):** `eleventyPluginThemerVite` now throws when `eleventyPluginThemer` was not registered first (previously warned and re-resolved); register order is required. It also throws on unknown `optimizations` keys (previously silently ignored), so typos like `purgeCS` fail fast with the valid set listed.
