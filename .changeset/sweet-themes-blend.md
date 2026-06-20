---
'@eleventy-plugin-themer/theme-base': minor
---

Restyle theme-base to the 11ty eleventy-base-blog neutral palette (light: white background, `#333` text, navy `#082840` links, plum `#5f2b48` hover; dark: `#15202b` background, `#1493fb` links). Adds a `linkVisited` color token (with a wired `a:visited` rule). Adds a self-contained `back-to-top` feature alongside `code-highlighting` to demonstrate multi-feature discovery and the `index.auto.js` opt-in mechanism.

Fixes multi-word theme color tokens (`linkHover`, `textMuted`, `linkVisited`) being ignored when overridden via `theme.js`/`theme.json`. The theme-styles partial now injects custom properties through a new `cssVarKey` filter that camelCase→kebab-cases (and sanitizes) keys, so the emitted variable names (e.g. `--theme-light-link-hover`) match what the SCSS reads. Previously these were emitted without a hyphen and silently fell back to the built-in defaults.
