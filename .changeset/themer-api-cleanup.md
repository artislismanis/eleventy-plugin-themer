---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
'@eleventy-plugin-themer/theme-base': minor
---

API consolidation: `eleventyPluginThemer` works via `addPlugin` (use `getThemerDir` helper for dir config when applicable; direct call still required when `dir` must be in the config-function return). New `themerDataSchema` helper as a drop-in `eleventyDataSchema` validator. Auto-watch override directories from inside the plugin. Theme-declared PostCSS plugins via `build.postcss` in `theme.json` and a new `createPostcssConfig` helper (subpath: `@eleventy-plugin-themer/build-vite/postcss`). Internal: shared cascade context between core and vite (`getThemerContext`), extracted `loadModuleFromPath` helper, deduped safelist merge via `mergeStringArrays`, centralized vitest base config, JSDoc typedefs at `@eleventy-plugin-themer/core/types`.

**Stricter validation (breaking for misconfigured projects):** `eleventyPluginThemerVite` now throws when `eleventyPluginThemer` was not registered first (previously warned and re-resolved); register order is required. It also throws on unknown `optimizations` keys (previously silently ignored), so typos like `purgeCS` fail fast with the valid set listed.
