# @eleventy-plugin-themer/build-vite

Vite integration with production optimizations for Eleventy themes built with `@eleventy-plugin-themer/core`.

## Features

- **Auto-Import** - Automatically imports theme styles and scripts into user entry points
- **Feature Discovery** - Discovers and bundles theme features as Vite entry points
- **PurgeCSS** - Removes unused CSS from production builds
- **Critical CSS** - Inlines critical CSS and async loads the rest (via Critters)
- **HTML Minification** - Minifies HTML output
- **Link Validation** - Validates internal links and images after build
- **Non-HTML Preservation** - Preserves files like RSS feeds and sitemaps
- **Dev Server** - Serves feature scripts during development with HMR

## Installation

```bash
npm install -D @eleventy-plugin-themer/build-vite @11ty/eleventy-plugin-vite
```

Optional peer dependencies (install based on optimizations you enable):

```bash
npm install -D purgecss critters html-minifier-terser node-html-parser glob
```

## Usage

```js
// eleventy.config.mjs
import { eleventyPluginThemer, generateDirConfig } from '@eleventy-plugin-themer/core';
import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';

const THEME_NAME = '@eleventy-plugin-themer/theme-base';

export default async function (eleventyConfig) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Register core theme plugin
  await eleventyConfig.addPlugin(eleventyPluginThemer, {
    theme: THEME_NAME,
    projectRoot: __dirname,
  });

  // Register Vite plugin with optimizations
  await eleventyConfig.addPlugin(eleventyPluginThemerVite, {
    theme: THEME_NAME,
    projectRoot: __dirname,
    optimizations: {
      purgeCSS: true,
      criticalCSS: true,
      minifyHTML: true,
      validateLinks: true,
      preserveNonHtml: {
        extensions: ['xml', 'txt', 'xsl'],
      },
    },
  });

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

## API

### `eleventyPluginThemerVite(eleventyConfig, options)`

Eleventy plugin that wraps `@11ty/eleventy-plugin-vite` with theme-aware configuration.

**Options:**

- `theme` (string, required) - Theme package name
- `projectRoot` (string, required) - Project root path
- `scriptsEntry` (string) - Main scripts entry point (default: `'overrides/scripts/main.js'`)
- `tempFolderName` (string) - Vite temp folder name (default: `'.11ty-vite'`)
- `overridePaths` (Object) - Override paths configuration
- `viteOptions` (Object) - Additional Vite options to merge with theme defaults
- `optimizations` (Object) - Production optimization toggles:
  - `purgeCSS` (boolean | Object) - Remove unused CSS
  - `criticalCSS` (boolean | Object) - Inline critical CSS
  - `minifyHTML` (boolean | Object) - Minify HTML output
  - `validateLinks` (boolean | Object) - Validate internal links
  - `preserveNonHtml` (Object) - Preserve non-HTML files. Provide `{ extensions: ['xml', 'txt'] }`

### `getFeatureEntries(projectRoot, themeMetadata, overridePaths?)`

Returns Vite entry points for the main script and all discovered features. Used internally by `eleventyPluginThemerVite`, but available for advanced use cases.

### Individual Plugins

Optimization plugins can be imported individually for custom build pipelines:

```js
import {
  purgeCSSFiles,
  generateCriticalCSS,
  minifyHTML,
  validateLinks,
  preserveNonHtmlFiles,
} from '@eleventy-plugin-themer/build-vite';
```

All follow the signature `(outputDir, options) => Promise<void>` and throw on failure.

## Logging

Set `THEME_LOG_LEVEL` environment variable to control output verbosity:

```bash
THEME_LOG_LEVEL=silent npx eleventy  # No theme output
THEME_LOG_LEVEL=error npx eleventy   # Errors only
THEME_LOG_LEVEL=warn npx eleventy    # Errors + warnings
THEME_LOG_LEVEL=info npx eleventy    # Default
THEME_LOG_LEVEL=debug npx eleventy   # Verbose
```

## License

MIT
