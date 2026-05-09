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
import { eleventyPluginThemer, generateDirConfig } from '@eleventy-plugin-themer/core';

const THEME_NAME = '@eleventy-plugin-themer/theme-base';

export default async function (eleventyConfig) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Register theme plugin - handles metadata, helpers, template engine, layout aliases
  await eleventyConfig.addPlugin(eleventyPluginThemer, {
    theme: THEME_NAME,
    projectRoot: __dirname,
  });

  // Use theme's dir configuration with cascade support
  return {
    ...generateDirConfig({
      theme: THEME_NAME,
      projectRoot: __dirname,
      input: 'content',
      output: '_site',
    }),
  };
}
```

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

**Returns:** `{ themeMetadata, resolvedOverridePaths }`

### `generateDirConfig(options)`

Generates Eleventy `dir` configuration for use in the config return value.

**Options:**

- `theme` (string, required) - Theme package name
- `projectRoot` (string) - Project root path
- `input` (string) - Input directory
- `output` (string) - Output directory

**Returns:** `{ dir: { input, output, includes } }`

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

| Subpath                                           | Stability    | Purpose                                                          |
| ------------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `@eleventy-plugin-themer/core`                    | public       | Main API                                                         |
| `@eleventy-plugin-themer/core/logger`             | public       | Shared logger (used by build adapters)                           |
| `@eleventy-plugin-themer/core/internal/safe-keys` | **internal** | Cross-package `UNSAFE_KEYS` constant — may change without notice |

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
