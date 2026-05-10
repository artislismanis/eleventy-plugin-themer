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
import { eleventyPluginThemer } from '@eleventy-plugin-themer/core';
import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';

const THEME_NAME = '@eleventy-plugin-themer/theme-base';

export default async function (eleventyConfig) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Register core theme plugin (direct call so we can spread `dir` into the return value)
  const { dir } = await eleventyPluginThemer(eleventyConfig, {
    theme: THEME_NAME,
    projectRoot: __dirname,
    input: 'content',
    output: '_site',
  });

  // Register Vite plugin with optimizations
  await eleventyPluginThemerVite(eleventyConfig, {
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

  return { dir };
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

### How `optimizations` merges with `theme.json#build`

A theme can declare build hints in its `theme.json` under `build.*` (currently `build.purgeCSS` and `build.postcss`). These are merged with the consumer's `optimizations` config at plugin init by `mergeThemeBuildHints`:

- **Arrays** (e.g. `purgeCSS.safelist.standard`, `safelist.deep`, `safelist.greedy`): theme entries come **first**, user entries **append** (deduped). Theme entries cannot be silently shadowed by a user typo, and greedy patterns the theme relies on stay at the head of the array.
- **Objects** (non-array): user values **win** (last-spread). Setting `purgeCSS: true` enables the optimisation with the theme's hints; passing `purgeCSS: { safelist: {...} }` extends them per the array rule above.
- **Booleans / primitives**: user value replaces.
- **PostCSS plugins** (`build.postcss.plugins`) follow the same rule: theme-declared plugins run first, user-supplied plugins append. Override a theme plugin by re-declaring an entry with the same `package` name in your project's `postcss.config.mjs`.

Disabling a theme-provided optimisation entirely: set the toggle to `false` in `optimizations` (e.g. `purgeCSS: false`).

### `getFeatureEntries(projectRoot, themeMetadata, opts?)`

Returns Vite entry points for the main script and all discovered features. Used internally by `eleventyPluginThemerVite`, but available for advanced use cases.

```js
import { getFeatureEntries } from '@eleventy-plugin-themer/build-vite';
import { metadata } from '@eleventy-plugin-themer/theme-base';

const input = getFeatureEntries(__dirname, metadata, {
  resolvedOverridePaths, // optional; auto-resolved if absent
  discoveredFeatures, // optional Map; avoids redundant FS scan
});
```

If you've already called `getAvailableFeatures()` at plugin init, pass the resulting Map as `opts.discoveredFeatures` to skip a duplicate filesystem scan.

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

## Integration check

`eleventyPluginThemerVite` runs a one-shot sanity check at plugin init that compares your environment against the package's declared peer ranges:

- Node version vs `engines.node` (>=22)
- `vite` peer version vs the supported major(s)
- `@11ty/eleventy-plugin-vite` peer version vs the supported major(s)

On a healthy environment you'll see one line on startup:

```text
[themer/build-vite 0.1.0] integration check: OK
```

On mismatch you get actionable warnings. The check **never throws** — a corrupt manifest or unreadable peer is logged and skipped so it can't take down your build. Opt out with `skipIntegrationCheck: true` if you're running a custom build flow.

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
