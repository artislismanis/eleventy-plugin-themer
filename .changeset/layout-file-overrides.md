---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
'@eleventy-plugin-themer/theme-base': minor
---

Layout overrides now work: a file at `overrides/layouts/<name>.njk` shadows the same-named theme layout referenced via `layout:`. Eleventy resolves top-level layouts from a single includes directory (the theme's), so the core plugin now registers a layout alias for each override file pointing at its path relative to the theme layouts dir. This is OS-neutral (no symlinks/temp dirs) and reads the live file each build, so override edits hot-reload. Adding a brand-new override layout file mid-`--serve` session still needs a restart (aliases are registered once at config time). Partial overrides (via the template loader) are unchanged. Replaces the previous `theme.json#layouts` alias path, which resolved to absolute paths Eleventy rejected.
