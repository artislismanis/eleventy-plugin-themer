# @eleventy-plugin-themer/core

Build-agnostic cascade system for Eleventy themes. Works with any build tool or no build tool at all.

## Features

- **Template Loading** - ThemeAwareLoader with `@theme/` alias for Nunjucks
- **Data Cascade** - User data files override theme defaults via Eleventy's native data cascade
- **Static Assets Cascade** - User assets override theme assets by filename
- **Feature Resolution** - Discover and resolve features from user or theme directories
- **Theme Configuration** - Deep-merged theme config accessible in templates as `{{ theme.* }}`
- **Theme Validation** - Helpful errors with suggested fixes

## Installation

```bash
npm install @eleventy-plugin-themer/core
```

Requires Node.js 22+.

## Usage

### Using a Theme (Content Site)

```js
// eleventy.config.mjs
import { createThemerProject } from '@eleventy-plugin-themer/core';
import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';

const THEME_NAME = '@eleventy-plugin-themer/theme-base';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bind `{ theme, projectRoot }` once and reuse across the Eleventy plugin,
// the Vite adapter, and `postcss.config.mjs`.
const themer = createThemerProject({ theme: THEME_NAME, projectRoot: __dirname });

export default async function (eleventyConfig) {
  // Direct call: returns the computed `dir` so it can be spread into the config-function
  // return value (Eleventy defers `addPlugin` until after the function returns).
  const { dir } = await themer.eleventyPlugin(eleventyConfig, {
    input: 'content',
    output: '_site',
  });

  eleventyConfig.addPlugin(
    eleventyPluginThemerVite,
    themer.viteOptions({ optimizations: { purgeCSS: true } }),
  );

  return { dir };
}
```

You can also call `eleventyPluginThemer(eleventyConfig, { theme, projectRoot, ... })` directly without the project handle — the handle is purely an ergonomic wrapper that removes repetition.

### Why `eleventyDataSchema.js` is a manual step

The plugin can't auto-register `eleventyDataSchema` because Eleventy resolves `_data` files **before** the async config function (and therefore the plugin) finishes. Add a one-line file in your content data directory:

```js
// content/_data/eleventyDataSchema.js
export { themerDataSchema as default } from '@eleventy-plugin-themer/core';
```

`themerDataSchema` reads the cached themer context lazily on first call, so it sees the right theme and feature set regardless of which invocation style you used.

### Override Paths

By default, user overrides are expected at these locations:

| Resource | Default Path         |
| -------- | -------------------- |
| layouts  | `overrides/layouts`  |
| features | `overrides/features` |
| styles   | `overrides/styles`   |
| scripts  | `overrides/scripts`  |
| data     | `content/_data`      |
| public   | `public`             |

Override with custom paths:

```js
await eleventyConfig.addPlugin(eleventyPluginThemer, {
  theme: THEME_NAME,
  projectRoot: __dirname,
  overridePaths: {
    layouts: 'my-layouts',
    data: 'src/_data',
  },
});
```

## Public API

### `createThemerProject({ theme, projectRoot })`

Bind the two values you'd otherwise pass to four different call sites (`eleventyPluginThemer`, `eleventyPluginThemerVite`, `resolveThemeMetadata`, `createPostcssConfig`). Returns a project handle:

| Field / Method                          | Purpose                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `theme`, `projectRoot`, `themeMetadata` | Eagerly-resolved values for ad-hoc use                                                 |
| `eleventyPlugin(eleventyConfig, extra)` | Pre-bound `eleventyPluginThemer` — pass `{ input, output, overridePaths }` if needed   |
| `viteOptions(extra)`                    | Options object for `addPlugin(eleventyPluginThemerVite, ...)` — append `optimizations` |
| `postcssOptions(extra)`                 | Options object for `createPostcssConfig({ ... })` — append `userPlugins`               |

### `defineThemeConfig(config)`

Identity helper for `content/_data/theme.{js,mjs}` that types the argument as `ThemeUserConfig` via JSDoc. No runtime cost; pure editor ergonomics.

```js
import { defineThemeConfig } from '@eleventy-plugin-themer/core';
export default defineThemeConfig({ themeToggle: { defaultTheme: 'auto' } });
```

### `eleventyPluginThemer(eleventyConfig, options)`

Eleventy plugin that handles theme registration. Sets up:

- Theme metadata resolution from `package.json` + `theme.json`
- Filter, shortcode, and paired shortcode registration from the theme module
- Nunjucks template engine with `@theme/` prefix support
- Layout alias registration with cascade resolution
- Theme metadata available as `themeMetadata` global data

**Options:**

- `theme` (string, required) - Theme package name
- `projectRoot` (string, required) - Path to content repo root
- `overridePaths` (Object) - Override paths configuration

**Returns:** `{ themeMetadata, resolvedOverridePaths, discoveredFeatures, dir }`

When `input` and `output` are passed, the returned `dir` is `{ input, output, includes }` ready to spread into the Eleventy config-function return value. The same `dir` is also stashed in the themer context — retrieve it later via `getThemerDir(eleventyConfig)`.

### `resolveThemeMetadata(projectRoot, themeName)`

Load theme metadata by merging `package.json` and `theme.json` from the theme package.

### `getAvailableFeatures(projectRoot, themeMetadata, resolvedOverridePaths?)`

Discover all available features (theme + user) with source tracking.

**Returns:** `Map<string, { name, source, path }>` where source is `'theme'`, `'user'`, or `'override'`

### Schema helpers (zod-based runtime validation)

```js
import {
  themeConfigSchema, // strict-key schema for content/_data/theme.js
  featuresFrontMatterSchema, // validates page front-matter `features` field
  formatZodIssues, // pretty-print zod errors
} from '@eleventy-plugin-themer/core';
```

`themeConfigSchema(themeMetadata)` rejects unknown top-level keys (typo-catching) but is permissive about inner shapes. `featuresFrontMatterSchema(projectRoot, themeMetadata, overridePaths?)` validates feature names against features actually available in the cascade — useful in `eleventyDataSchema.js`.

### Subpath exports

| Subpath                                           | Stability    | Purpose                                                               |
| ------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `@eleventy-plugin-themer/core`                    | public       | Main API                                                              |
| `@eleventy-plugin-themer/core/logger`             | public       | Shared logger (used by build adapters)                                |
| `@eleventy-plugin-themer/core/internal/safe-keys` | **internal** | Cross-package `UNSAFE_KEYS` constant — may change without notice      |
| `@eleventy-plugin-themer/core/internal/defaults`  | **internal** | Framework defaults (`DEFAULT_ASSET_ENTRIES`, etc.) for build adapters |

`internal/*` subpaths are not part of the public SemVer surface. See the root README for the full SemVer policy.

## Creating a Theme

A theme package needs:

1. **`package.json`** - Standard npm package with `name` and `version`
2. **`theme.json`** - Theme metadata (features, assets, config defaults)
3. **`lib/index.mjs`** - Default export with `filters`, `shortcodes`, `pairedShortcodes`
4. **`layouts/`** - Nunjucks layout templates
5. **`styles/`** - SCSS/CSS stylesheets
6. **`scripts/`** - JavaScript entry points
7. **`features/`** - Optional feature subdirectories with `index.js` / `index.auto.js`

### theme.json

```json
{
  "$schema": "../../core/theme.schema.json",
  "themeFeatures": [
    { "name": "code-highlighting", "entry": "features/code-highlighting/index.js" }
  ],
  "assets": {
    "styles": { "entry": "styles/main.scss" },
    "scripts": { "entry": "scripts/main.js" }
  },
  "config": {
    "colors": { "light": { "primary": "#172c51" } },
    "typography": { "fontFamily": "system-ui, sans-serif" }
  }
}
```

The `config` section provides defaults accessible in templates as `{{ theme.colors.light.primary }}`. Users override via `content/_data/theme.js`.

## Cascade Resolution

All resources follow the same priority: **user files win over theme files**.

- Layouts: user's `overrides/layouts/post.njk` overrides theme's `layouts/post.njk`
- Data: user's `content/_data/site.js` overrides theme's `data/site.js`
- Features: user's `overrides/features/code-highlighting/` overrides theme's `features/code-highlighting/`
- Assets: user's `public/favicon.svg` overrides theme's `public/favicon.svg`

See [@eleventy-plugin-themer/theme-base](../themes/base/README.md) for a complete theme example.

## License

MIT
