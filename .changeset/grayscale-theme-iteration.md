---
'@eleventy-plugin-themer/theme-base': minor
---

Major visual + feature iteration on theme-base:

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
