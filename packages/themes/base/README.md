# @eleventy-plugin-themer/theme-base

A blog theme for Eleventy built on `@eleventy-plugin-themer/core`. A port of [eleventy-base-blog](https://github.com/11ty/eleventy-base-blog) with dark mode, configurable styling, and extensible features.

## Features

- **Cascade System** - User files override theme files (layouts, data, assets, features)
- **@theme Alias** - Clean imports in Nunjucks templates: `{% extends "@theme/layouts/base.njk" %}`
- **Dark Mode** - Configurable light/dark toggle with system preference support
- **Extensible Features** - Self-contained feature modules loaded per-page via front matter
- **CSS Custom Properties** - Easy theming via variables for colors, typography, spacing
- **Configurable** - Override theme defaults via `theme.config.mjs`

## Installation

```bash
npm install @eleventy-plugin-themer/core @eleventy-plugin-themer/theme-base @11ty/eleventy-plugin-syntaxhighlight
```

With Vite build optimizations:

```bash
npm install -D @eleventy-plugin-themer/build-vite @11ty/eleventy-plugin-vite
```

## Quick Start

```js
// eleventy.config.mjs
import { eleventyPluginThemer } from '@eleventy-plugin-themer/core';

const THEME_NAME = '@eleventy-plugin-themer/theme-base';

export default async function (eleventyConfig) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const { dir } = await eleventyPluginThemer(eleventyConfig, {
    theme: THEME_NAME,
    projectRoot: __dirname,
    input: 'content',
    output: '_site',
  });

  return { dir };
}
```

See the [eleventy-starter](https://github.com/artislismanis/eleventy-starter) repository for a complete working example.

## Project Structure

```
your-project/
├── eleventy.config.mjs   # Theme + plugin configuration
├── content/              # Your content
│   ├── index.md
│   ├── posts/
│   └── _data/
│       ├── site.js       # Site metadata
│       └── theme.js      # Theme config overrides
├── overrides/            # Customizations
│   ├── layouts/          # Override/extend theme layouts
│   ├── features/         # Custom or overridden features
│   ├── scripts/
│   │   └── main.js       # Your JavaScript entry point
│   └── styles/           # Your styles
└── public/               # Static assets (favicon, etc.)
```

## Theme Configuration

Override theme defaults by creating `theme.config.mjs`:

```js
export default {
  themeToggle: {
    defaultTheme: 'auto', // 'auto', 'light', or 'dark'
    showToggle: true,
  },
  colors: {
    light: {
      background: '#ffffff',
      primary: '#082840',
      accent: '#5f2b48',
      text: '#333333',
      link: '#082840',
      linkVisited: '#17050f',
    },
    dark: {
      background: '#15202b',
      primary: '#1493fb',
      accent: '#6969f7',
      text: '#dad8d8',
      link: '#1493fb',
      linkVisited: '#a6a6f8',
    },
  },
  typography: {
    fontFamily: '-apple-system, system-ui, sans-serif',
    fontFamilyHeading: 'inherit',
    fontFamilyMono: "'Consolas', 'Monaco', monospace",
  },
  logos: {
    default: '',
    dark: '',
    favicon: '/favicon.svg',
  },
  social: [],
  footer: {
    copyright: '{year} {site.title}',
    showPoweredBy: true,
  },
};
```

All config values are deeply merged with the theme's defaults from `theme.json`. Use `null` to explicitly clear a value.

## Customization

### Override Layouts

Replace a theme layout:

```nunjucks
{# overrides/layouts/post.njk - completely replaces theme's post.njk #}
<article>
  <h1>{{ title }}</h1>
  {{ content | safe }}
</article>
```

Extend a theme layout:

```nunjucks
{# overrides/layouts/custom.njk #}
{% extends "@theme/layouts/base.njk" %}

{% block content %}
  <div class="custom">{{ content | safe }}</div>
{% endblock %}
```

### Override Data

Create `content/_data/site.js` to replace theme's site data:

```js
export default {
  title: 'My Blog',
  url: 'https://myblog.com',
  language: 'en',
  author: { name: 'Your Name', email: 'you@example.com' },
};
```

### Override Static Assets

Place files in `public/` to override theme assets:

```
public/
├── favicon.svg       # Overrides theme's favicon
└── logo.png          # Your custom asset
```

## Features

Features are optional functionality modules loaded per-page via front matter.

### Using Features

Add to any page's front matter:

```yaml
---
title: My Post
feature: code-highlighting
---
```

### Available Theme Features

#### code-highlighting

Syntax highlighting powered by PrismJS (via `@11ty/eleventy-plugin-syntaxhighlight`). Includes copy button, optional line numbers, diff highlighting, and custom scrollbar.

**Usage** — add to any page's front matter:

```yaml
---
feature: code-highlighting
---
```

**Configuration** — override in `theme.config.mjs`:

```js
export default {
  codeHighlighting: {
    prismTheme: 'prism-tomorrow', // PrismJS theme name (default)
    diffHighlight: true, // Include diff-highlight plugin (default)
  },
};
```

**Available PrismJS themes:**

| Theme                  | Style                                   |
| ---------------------- | --------------------------------------- |
| `prism`                | Light, minimal (Lea Verou's default)    |
| `prism-coy`            | Light with subtle left border           |
| `prism-solarizedlight` | Light, Solarized palette                |
| `prism-dark`           | Dark, muted tones                       |
| `prism-funky`          | Dark with coloured line backgrounds     |
| `prism-okaidia`        | Dark, Monokai-inspired                  |
| `prism-tomorrow`       | Dark, Tomorrow Night Eighties (default) |
| `prism-twilight`       | Dark, warm greys                        |

**Diff highlighting** — use the `diff-` language prefix with `+`/`-` line markers:

````markdown
```diff-js
+const added = true;
-const removed = false;
 const unchanged = null;
```
````

**CSS custom properties** — enhancements on top of PrismJS (override in your own CSS):

| Property                    | Default                  | Description                   |
| --------------------------- | ------------------------ | ----------------------------- |
| `--code-border-radius`      | `0.5rem`                 | Border radius for code blocks |
| `--code-copy-button-bg`     | `var(--color-surface)`   | Copy button background        |
| `--code-copy-button-fg`     | `var(--color-text)`      | Copy button text colour       |
| `--code-line-number-fg`     | `rgb(255 255 255 / 30%)` | Line number colour            |
| `--code-line-number-width`  | `3rem`                   | Line number column width      |
| `--code-scrollbar-thumb-bg` | `rgb(255 255 255 / 20%)` | Scrollbar thumb colour        |

#### back-to-top

A floating button that appears once the page is scrolled past a threshold and
smooth-scrolls back to the top. Fully self-contained (no template or data
dependencies).

**Usage** — add to any page's front matter:

```yaml
---
feature: back-to-top
---
```

**Customization** — import and call `init()` manually instead of using the
auto-init variant:

```js
import { init, defaultConfig } from '@theme/features/back-to-top/index.js';
init({ ...defaultConfig, threshold: 800 });
```

**CSS custom properties** (override in your own CSS):

| Property               | Default                   | Description          |
| ---------------------- | ------------------------- | -------------------- |
| `--back-to-top-bg`     | `var(--color-primary)`    | Button background    |
| `--back-to-top-fg`     | `var(--color-background)` | Glyph colour         |
| `--back-to-top-size`   | `2.75rem`                 | Button width/height  |
| `--back-to-top-offset` | `1.5rem`                  | Distance from corner |

### Creating Custom Features

Create `overrides/features/my-feature/index.js` (or `index.auto.js` for auto-initialization):

```js
// index.auto.js - auto-initializes when loaded
console.log('My custom feature loaded');
```

If both `index.auto.js` and `index.js` exist in the same directory, the
plugin picks `index.auto.js` first. Use `index.auto.js` for self-running
features and `index.js` for ones the consumer imports and initializes
explicitly.

Then reference in front matter: `feature: my-feature`

### Overriding Theme Features

Create `overrides/features/code-highlighting/index.auto.js` to replace the theme's version.

## Shortcodes

### Hero Section

```nunjucks
{% hero title="Welcome", subtitle="Build beautiful websites", align="center", height="400px" %}
  {% heroButton url="/start", variant="primary" %}Get Started{% endheroButton %}
  {% heroButton url="/learn", variant="secondary" %}Learn More{% endheroButton %}
{% endhero %}
```

| Parameter         | Description                               | Default    |
| ----------------- | ----------------------------------------- | ---------- |
| `title`           | Main heading                              | -          |
| `subtitle`        | Secondary text                            | -          |
| `background`      | Background image URL                      | -          |
| `backgroundColor` | Background color (fallback)               | -          |
| `align`           | Text alignment: `left`, `center`, `right` | `'center'` |
| `height`          | Minimum height                            | `'auto'`   |
| `overlay`         | Dark overlay on background image          | `true`     |

### Content Grid

```nunjucks
{% contentGrid cols=3, gap="1.5rem" %}
  {% box title="Feature 1", link="/about", linkText="Learn More" %}
    Description of feature 1.
  {% endbox %}
{% endcontentGrid %}
```

## Navigation

Uses `@11ty/eleventy-navigation` for menus. Add pages via front matter:

```yaml
---
eleventyNavigation:
  key: About
  order: 2
---
```

Footer navigation uses `parent: footer`. Hierarchical pages get automatic breadcrumbs.

## Security helpers

Nunjucks runs with `autoescape: false` in this framework, so the theme exports a set of escape filters that **must** be applied explicitly to any dynamic value:

| Filter           | Use for                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `escapeHtml`     | Text in HTML body context                                               |
| `escapeAttr`     | Values inside `="…"` attributes                                         |
| `escapeCssValue` | CSS custom-property values (strips quotes, brackets, `;`, `\`, `/* */`) |
| `escapeJsString` | Values inside JS string literals (escapes `</script>`, U+2028/9, etc.)  |
| `safeUrl`        | Values used as `href` / `src`                                           |

`safeUrl()` and the related `socialUrl()` filter use a strict scheme **allowlist** (`http`, `https`, `mailto`, `tel`, plus relative URLs). Everything else returns `#`. The filter also strips control / zero-width / bidi-override chars, rejects `https:\/\/` backslash-authority forms, and blocks percent-encoded CR/LF in `mailto:` / `tel:` (header smuggling).

## Related Packages

- [@eleventy-plugin-themer/core](../../core/README.md) - Build-agnostic cascade system
- [@eleventy-plugin-themer/build-vite](../../build/vite/README.md) - Vite production optimizations

## License

MIT
