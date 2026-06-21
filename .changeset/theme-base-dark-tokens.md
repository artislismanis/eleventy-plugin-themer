---
'@eleventy-plugin-themer/theme-base': patch
---

Sync the dark-mode SCSS colour fallbacks with the theme's grayscale + plum palette in `theme.json` (they had drifted to the old blue values), and add a `--hero-gradient` custom property. Fallback-only change — themes that inject the `--theme-dark-*` tokens are unaffected.
