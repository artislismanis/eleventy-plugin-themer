---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
'@eleventy-plugin-themer/theme-base': minor
---

Unknown `features` in page front matter now fail the build with a clear `Invalid feature. Available: …` message, validated per page. The core plugin registers an Eleventy preprocessor for this; a `_data/eleventyDataSchema.js` (e.g. the `themerDataSchema` re-export) only validates the global data object, so it never saw per-page front matter and an unknown feature previously surfaced as a cryptic downstream Vite "Failed to resolve /<name>.js" error.
