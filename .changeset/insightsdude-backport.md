---
'@eleventy-plugin-themer/build-vite': patch
'@eleventy-plugin-themer/core': patch
---

build-vite: default Beasties `criticalCSS` to `pruneSource: false`. Beasties under-detects some rules (`:root` custom-property bridges, id/element/`:has()` selectors) and would delete them from the linked stylesheet without inlining them, silently dropping styles in production (e.g. a customised light palette reverting to theme defaults). Consumers can still opt back in via `optimizations.criticalCSS.pruneSource`.

core: add first-class `wordmark` (`{ text, accent? }`) and `tagline` (`boolean | string`) fields to `siteBrandingSchema`, so themes can render a styled text logo without relying on the non-strict passthrough.
