---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
---

**Pre-1.0 API tightening.** Trimmed the public surface ahead of the first stable release; removed exports that were either internal plumbing leaking out or escape hatches no consumer used.

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
