---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
'@eleventy-plugin-themer/theme-base': minor
---

User `content/_data/theme.js` `codeHighlighting` overrides (e.g. `prismTheme`, `diffHighlight`) now reach the build. Previously the Vite prism plugin read the theme's `theme.json` defaults directly, so a consumer's chosen Prism theme had no effect on the bundled CSS (and an invalid value couldn't be caught). The core plugin now stashes the merged theme config (`theme.json` defaults + `theme.js`) on the shared themer context, and the build adapter uses it when configuring the prism plugin.
