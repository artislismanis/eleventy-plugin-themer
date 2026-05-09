# Eleventy Theme Framework

This guide provides build commands, code style guidelines, architectural patterns, and security conventions for this Eleventy theme framework monorepo.

## Build Commands

### Root Level Commands

```bash
# Run all tests (304 tests, 23 files)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run single test file
npx vitest run packages/core/__tests__/cascade/resolver.test.mjs

# Run tests for specific package
npx vitest run packages/core

# Linting and formatting
npm run lint          # Run all linters (JS + CSS + format check)
npm run lint:js        # ESLint only
npm run lint:css       # Stylelint only
npm run lint:fix       # Auto-fix linting issues
npm run format         # Prettier format
npm run format:check   # Check formatting
```

### Package-Specific Commands

```bash
# Core package
cd packages/core && npm run test

# Vite adapter
cd packages/build/vite && npm run test

# Base theme
cd packages/themes/base && npm run test
```

## Code Style Guidelines

### File Extensions

- **ES Modules**: `.mjs` for all library code
- **Tests**: `.test.mjs` in `__tests__` directories
- **Client-side JS**: `.js` for browser scripts and features
- **Config**: `.mjs` for all config files (ESLint, Prettier, etc.)

### Import Order (ESLint enforced)

```javascript
// 1. Node.js builtins
import fs from 'fs';
import path from 'path';

// 2. External packages
import { describe, it, expect } from 'vitest';
import luxon from 'luxon';

// 3. Internal packages (relative imports)
import { DEFAULT_OVERRIDE_PATHS } from '../defaults.mjs';
import { getThemeRoot } from './cascade/resolver.mjs';
```

### Naming Conventions

- **Functions**: `camelCase` - descriptive verbs (`resolveResource`, `getAvailableFeatures`)
- **Variables**: `camelCase` - descriptive nouns (`themeMetadata`, `overridePaths`)
- **Constants**: `UPPER_SNAKE_CASE` - immutable values (`DEFAULT_OVERRIDE_PATHS`)
- **Classes**: `PascalCase` - generic, technology-agnostic (`ThemeAwareLoader`, not `NunjucksLoader`)
- **Files**: `kebab-case.mjs` for modules, `kebab-case.js` for browser scripts

### Error Handling

```javascript
// Good: Specific error with context
if (!fs.existsSync(pkgJsonPath)) {
  throw new Error(`Theme package.json not found for "${themeName}" at ${pkgJsonPath}`);
}

// Good: Validate inputs early
if (!projectRoot || typeof projectRoot !== 'string') {
  throw new Error('projectRoot must be a non-empty string');
}

// Good: Chain original errors
} catch (cause) {
  throw new Error('Build failed for theme', { cause });
}

// Bad: Generic errors
throw new Error('Failed to load theme');
```

### Testing Patterns

```javascript
describe('resolveResource', () => {
  beforeEach(() => {
    vi.mock('fs');
  });

  it('should resolve user override when it exists', () => {
    // Arrange
    const mockFs = vi.mocked(fs);
    mockFs.existsSync.mockReturnValue(true);

    // Act
    const result = resolveResource(mockOptions);

    // Assert
    expect(result).toBe(expectedPath);
  });
});
```

Testing gotchas:

- When testing prototype pollution, use `Object.hasOwn(result, 'constructor')` instead of `result.constructor === undefined` (the latter resolves via prototype chain)
- Template-loader tests mock `nunjucks` module entirely — the mock returns a `MockFileSystemLoader` class and a mock `Environment` constructor
- The `validate-links` plugin uses a shared `checkResources()` helper for both link and image validation

---

## Security Patterns

### Prototype Pollution Guards

All deep-merge functions guard against prototype pollution. **Always** include this pattern when writing recursive merge/copy logic:

```javascript
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// In any loop over object keys:
for (const key of Object.keys(source)) {
  if (UNSAFE_KEYS.has(key)) continue;
  // ...
}
```

The `UNSAFE_KEYS` constant is centralized at `packages/core/lib/internal/safe-keys.mjs` and exposed cross-package via the `@eleventy-plugin-themer/core/internal/safe-keys` subpath export. All consumers import from there — never redefine.

Files with guards:

- `packages/core/lib/cascade/config.mjs` — `deepMergeConfig()`
- `packages/core/lib/schemas.mjs` — `themeConfigSchema()` (skips unsafe keys when building shape)
- `packages/build/vite/utils/merge-config.mjs` — `deepMergeViteConfig()`
- `packages/build/vite/theme-config.mjs` — `mergeThemeBuildHints()`

### Template Escaping (autoescape is OFF)

Nunjucks runs with `autoescape: false`. All dynamic values in templates **must** use the appropriate escape filter from `packages/themes/base/lib/filters.mjs`:

| Context            | Filter            | Example                                         |
| ------------------ | ----------------- | ----------------------------------------------- |
| HTML content       | `escapeHtml`      | `{{ copyright \| escapeHtml }}`                 |
| HTML attributes    | `escapeAttr`      | `content="{{ desc \| escapeAttr }}"`            |
| CSS values         | `escapeCssValue`  | `{{ color \| escapeCssValue }}`                 |
| JS string literals | `escapeJsString`  | `var id = '{{ gaId \| escapeJsString }}'`       |
| URLs in href/src   | `safeUrl`         | `href="{{ url \| safeUrl }}"`                   |

The `socialUrl()` filter validates URL protocols via the `safeUrl` allowlist (only `http`, `https`, `mailto`, `tel`, plus relative URLs are permitted). It also strips whitespace, control, zero-width and bidi-override chars from the rendered value.

### Vite Config Deep Merge

`deepMergeViteConfig()` explicitly deep-merges these top-level keys: `resolve`, `css`, `build` (including `rollupOptions.input`), and `server`. Other keys use shallow spread. If adding new deep-merge keys, update both the function and its tests.

---

## Architecture Overview

This is a **convention-based theme framework** for Eleventy that enables swappable, maintainable themes through clear separation of concerns and a well-defined specification.

### Package Architecture

```text
┌─────────────────────────────────────────────────┐
│  @eleventy-plugin-themer/core                   │
│  FRAMEWORK SPECIFICATION & IMPLEMENTATION       │
│  - Theme conventions & schema                   │
│  - Cascade resolution algorithm                 │
│  - Integration API for build systems            │
│  - Validation & error handling                  │
└────────────┬────────────────────────────────────┘
             │ provides spec to
             │
     ┌───────┴────────┬──────────────────┐
     │                │                  │
     ▼                ▼                  ▼
┌─────────┐    ┌─────────────┐   ┌──────────────┐
│  Vite   │    │  Webpack    │   │  Future...   │
│ Adapter │    │  Adapter    │   │  Adapters    │
└─────────┘    └─────────────┘   └──────────────┘
     │
     │ uses spec with
     │
     ▼
┌──────────────────────────────────────────────────┐
│  Theme Implementations                           │
│  (follow the spec defined by core)               │
│  - @eleventy-plugin-themer/theme-base            │
│  - @eleventy-plugin-themer/theme-docs            │
│  - etc.                                          │
└──────────────────────────────────────────────────┘
```

### Layered Architecture

```text
┌────────────────────────────────────────┐
│  Presentation Layer (Themes)           │
│  - Layouts, styles, features           │
└────────────┬───────────────────────────┘
             │
┌────────────▼───────────────────────────┐
│  Integration Layer (Build Adapters)    │
│  - Vite, Webpack configuration         │
└────────────┬───────────────────────────┘
             │
┌────────────▼───────────────────────────┐
│  Framework Layer (Core)                │
│  - Specification & implementation      │
└────────────────────────────────────────┘
```

Each layer has clear responsibilities, depends only on layers below, exposes stable interfaces, and can be tested independently.

---

## Core Package

### Role: Framework Specification and Canonical Implementation

Core is **not just a utility package** - it is the **theme framework itself**. It defines:

1. **The Specification** — Theme structure, metadata schema (`theme.json`), cascade resolution order (user-first), feature discovery, resource path conventions.
2. **The Integration API** — The contract that build systems consume, content repositories integrate with, and themes implement against.
3. **The Validation Layer** — Ensures themes conform to spec, metadata is valid, required resources exist.
4. **The Canonical Implementation** — Cascade resolution, feature discovery, resource resolution, template engine configuration.

### Design Principles (Core)

1. **Build System Agnostic** — Zero build system dependencies, pure cascade logic
2. **Single Source of Truth** — ALL cascade logic and convention enforcement lives here
3. **Minimal Surface Area** — Simple, focused API:

   ```javascript
   getAvailableFeatures(projectRoot, themeMetadata, overridePaths?)
   resolveResource({projectRoot, overridePaths, resourceType, filename})
   configureTemplateEngine(eleventyConfig, {projectRoot, themeName, overridePaths})
   ```

4. **Convention over Configuration** — Theme metadata defines defaults, user overrides are optional

### Public API Surface (`@eleventy-plugin-themer/core`)

Re-exported from `lib/index.mjs` for consumer use:

| Symbol | Purpose |
| --- | --- |
| `eleventyPluginThemer` (named export) | Eleventy plugin entry — call via `eleventyConfig.addPlugin(eleventyPluginThemer, opts)` |
| `resolveThemeMetadata` | Read & validate `theme.json` for a theme package |
| `getAvailableFeatures` | Cascade-aware feature discovery |
| `resolveFeatureEntryPath` | Pick `index.auto.js` over `index.js` for a feature dir |
| `resolveResource` | Resolve a single resource via the cascade |
| `getThemeRoot`, `buildPaths` | Path helpers used by build adapters |
| `resolveOverridePaths`, `DEFAULT_ASSET_ENTRIES` | Defaults consumed by build adapters |
| `themeConfigSchema`, `featuresFrontMatterSchema`, `formatZodIssues` | Zod schemas + formatter for consumer-side validation |
| `generateDirConfig` *(deprecated)* | Pre-3.0 dir helper — slated for removal in v4 |

Subpath exports: `./logger`, `./internal/safe-keys` (peer-package internal — not for end users).

### Core Implementation Details

**Plugin Initialization:** `eleventyPluginThemer()` in `packages/core/lib/index.mjs` calls `configureCascade()` to set up the full data/asset/config cascade. If modifying plugin init, ensure cascade setup is preserved.

**Barrel File:** `packages/core/lib/cascade/index.mjs` exports only symbols consumed by `lib/index.mjs` and `build-vite`:

- `configureCascade`, `getAvailableFeatures`, `resolveFeatureEntryPath`, `resolveResource`, `getThemeRoot`, `buildPaths`, `resolveThemeMetadata`

Do not add internal-only helpers to this barrel. Import directly from the source module instead.

**Config Cascade:** `getMergedThemeConfig()` reads theme defaults from `themeMetadata.config` (already loaded in memory), not from disk.

---

## Build Adapters (Vite)

### Role: Build System Integration Layer

Build adapters are **thin wrappers** that:

1. Consume core's API
2. Translate framework concepts into build system concepts
3. Add build-specific optimizations

**DO:**

- Convert framework features into build system entry points
- Configure build system with theme-aware settings
- Add build-specific optimizations (code splitting, tree shaking)
- Provide build system plugins (auto-import, aliases)

**DO NOT:**

- Implement cascade logic (core owns this)
- Discover features (core owns this)
- Validate themes (core owns this)
- Know about theme internals (only consume core's API)

### Vite Implementation Details

**Feature Discovery:** Features are discovered once via `getAvailableFeatures()` in `eleventyPluginThemerVite()` and threaded through `discoveredFeatures` to all downstream consumers.

- `getFeaturePathsForBuild(discoveredFeatures)` is a strict internal helper — it `throw`s if `discoveredFeatures` is not a `Map`.
- `getFeatureEntries(projectRoot, themeMetadata, opts?)` is the public adapter API. `opts` carries optional `discoveredFeatures` and `resolvedOverridePaths`; if `discoveredFeatures` is omitted, it falls back to `getAvailableFeatures()` for ergonomic external use.

**Decomposition:** `eleventyPluginThemerVite()` orchestrates `validatePluginOptions`, `loadEleventyVitePlugin`, `resolveBuildContext`, and `buildViteOptions`. `createThemeViteConfig()` orchestrates `buildResolveAliases`, `buildScssConfig`, `buildPluginsArray`, `buildOptimizationPlugin`. Keep these helpers private to their files.

### Design Principles (Build Adapters)

#### Adapter Pattern

```javascript
// Adapt core's framework API into specific build system
// getAvailableFeatures() -> vite.rollupOptions.input
```

#### Dependency Inversion

```javascript
// Depend on core's abstraction, not implementation details
import { getAvailableFeatures } from '@eleventy-plugin-themer/core';

// Don't reimplement core's logic
// fs.readdirSync(featuresDir)... // NO!
```

#### Minimal Parameter Passing

```javascript
// GOOD: Core extracts what it needs; optional context goes in an opts bag
getFeatureEntries(projectRoot, themeMetadata, { discoveredFeatures, resolvedOverridePaths })

// BAD: Positional parameter proliferation
getFeatureEntries(projectRoot, themeName, overridePaths, themeFeatures)
```

---

## Theme Packages

### Role: Content and Presentation Implementation

Themes are **declarative blueprints** that follow the core spec.

### Structure (Defined by Core Spec)

```text
theme/
├── theme.json              # Metadata (spec contract)
├── layouts/                # Template files
├── features/               # Self-contained JS features
│   └── code-highlighting/
│       ├── index.js        # Entry point
│       ├── index.auto.js   # Auto-init variant
│       └── styles.scss     # Feature styles
├── styles/                 # Global styles
├── data/                   # Default data
└── public/                 # Static assets
```

### theme.json Schema (Core Spec)

```json
{
  "name": "@eleventy-plugin-themer/theme-base",
  "version": "1.0.0",
  "cascade": {
    "enabled": true,
    "defaultOverridePaths": {
      "layouts": "overrides/layouts",
      "features": "overrides/features",
      "styles": "overrides/styles",
      "scripts": "overrides/scripts"
    },
    "resolution": "user-first"
  },
  "themeFeatures": [
    {
      "name": "code-highlighting",
      "entry": "features/code-highlighting/index.js"
    }
  ]
}
```

Themes are **data**, not logic. All framework logic lives in core.

---

## API Naming Conventions

### Principle: Technology-Agnostic APIs

Public APIs should use framework terminology, not specific technology names. This enables future extensibility, clearer semantics, and less coupling.

| Concept                | Too Specific           | Generic                        |
| ---------------------- | ---------------------- | ------------------------------ |
| Template configuration | `configureNunjucks()`  | `configureTemplateEngine()`    |
| Build entries          | `getViteEntries()`     | `getFeatureEntries()`          |
| Style compilation      | `compileSCSS()`        | `compileStyles()`              |
| Asset bundling         | `runWebpack()`         | `bundleAssets()`               |

Internal implementation can be specific — public APIs describe WHAT, not HOW:

```javascript
// Public API is generic
export function configureTemplateEngine(eleventyConfig, options) {
  // Internal implementation can be specific
  const nunjucksEnv = new Nunjucks.Environment(loader);
  eleventyConfig.setLibrary('njk', nunjucksEnv);
  return nunjucksEnv;
}
```

Same principle applies to classes:

```javascript
class ThemeAwareLoader { }      // Currently Nunjucks, but name doesn't say so
class BuildManager { }          // Could be Vite, Webpack, etc.
```

---

## Design Principles

### SOLID

| Principle | Application                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| **SRP**   | Each package has one reason to change: Core (conventions evolve), Vite (Vite API changes), Theme (design changes)     |
| **OCP**   | Core spec is stable; adapters extend without modifying; themes extend via overrides                                   |
| **DIP**   | High-level modules depend on Core's abstractions, not filesystem details                                              |
| **ISP**   | Core provides focused interfaces: feature discovery, resource resolution, template config                             |
| **LSP**   | Any theme following the spec can replace another                                                                      |

### DRY: Knowledge Ownership

| Knowledge          | Owner         | Why                      |
| ------------------ | ------------- | ------------------------ |
| Cascade algorithm  | Core          | Framework specification  |
| Feature discovery  | Core          | Convention enforcement   |
| Override resolution| Core          | Single source of truth   |
| Build entry points | Build Adapter | Build system specific    |
| Theme layouts      | Theme         | Content presentation     |

---

## Code Review Checklist

### Architectural Violations to Watch For

1. **Build logic in core** — Core should not know about build systems
2. **Cascade logic outside core** — Build adapters should consume core's API, not reimplement
3. **Theme containing framework logic** — Themes declare features in metadata, not discover them
4. **Parameter proliferation** — Pass `themeMetadata`, let core extract what it needs
5. **Technology-specific public API names** — Use generic, extensible naming
6. **Redundant feature discovery** — Accept `discoveredFeatures` param, don't call `getAvailableFeatures()` again
7. **Missing escape filters** — Any dynamic value in templates needs the appropriate filter (see Security Patterns)
8. **Unguarded deep merge** — Any recursive merge must include `UNSAFE_KEYS` check

---

## Testing Strategy

### Core Package: Tests the Specification

- Cascade resolution follows spec
- Feature discovery finds theme + user features
- Validation catches spec violations
- Works without build system dependencies
- Template engine configuration works

### Build Adapters: Tests the Integration

- Correctly consumes core's API
- Generates valid build system config
- Does NOT test cascade logic (core's job)
- Mocks core for unit tests

### Themes: Tests the Implementation

- Metadata is valid per spec
- Required resources exist
- Features are properly structured
- Does NOT test framework logic

---

## Extension Points

### Adding New Build System Support

```javascript
import { getAvailableFeatures } from '@eleventy-plugin-themer/core';

export function getWebpackEntries(projectRoot, themeMetadata) {
  const features = getAvailableFeatures(projectRoot, themeMetadata);
  const entries = {};
  features.forEach(feature => { entries[feature.name] = feature.path; });
  return entries;
}
```

New adapter = new transformation logic. Core spec doesn't change.

### Adding New Template Engine Support

```javascript
export function configureTemplateEngine(eleventyConfig, options) {
  const engine = options.templateEngine || 'nunjucks';
  if (engine === 'nunjucks') return configureNunjucksEngine(eleventyConfig, options);
  if (engine === 'liquid') return configureLiquidEngine(eleventyConfig, options);
}
```

Generic API name allows for multiple implementations.

---

## Versioning & Stability

All three packages (`core`, `build-vite`, `theme-base`) ship as a linked group via Changesets — they bump together. Current state is **pre-release**: 0.1.0.

**SemVer policy:**

| Version range | What it means |
| --- | --- |
| **0.x.y** (current) | Pre-stable. Breaking changes allowed in any **minor** bump. Patch releases are bug fixes only. Intended for early adopters who track changelog. |
| **1.0.0** | First stable release. Full SemVer applies from here on. |
| **≥1.x.y** | Standard SemVer: `major` = breaking, `minor` = additive, `patch` = bug fix. |

**Stability surface:**

- **Public API** is the symbols re-exported from each package's main entry (`lib/index.mjs` for core, `index.mjs` for build-vite, `lib/index.mjs` for theme-base) plus subpath exports listed in each package.json `exports` field WITHOUT an `internal/` prefix.
- **`./internal/*` subpaths** (e.g. `@eleventy-plugin-themer/core/internal/safe-keys`) are **not** part of the public API. Cross-package internal sharing only — may change in any release without a changelog entry.
- **Theme-base templates and SCSS structure** are part of the spec contract (replacing them is the "override" use case). Renaming or restructuring layouts/partials is a breaking change.

When making changes, decide which bracket the change falls into and add the appropriate changeset (`npx changeset` → choose `minor` for breaking-during-0.x or any additive change, `patch` for bug fixes).

---

## Decision Framework

| Question                                               | Answer                          |
| ------------------------------------------------------ | ------------------------------- |
| Is it about how themes are structured/discovered?      | **Core** (specification)        |
| Is it about integrating with a specific build tool?    | **Build Adapter**               |
| Is it about presenting content?                        | **Theme**                       |
| Does it duplicate existing logic?                      | **Refactor** (DRY violation)    |
| Does it make one package know too much about another?  | **Refactor** (SoC violation)    |
| Does the API name reference specific technology?       | **Rename** to be generic        |

---

## Resolved Issues

These issues were identified and fixed — watch for regressions:

### v3.0.0 Refactor

1. **Prototype pollution** in deep merge functions (SEC-1)
2. **CSS injection** via unescaped config values in `styles.njk` (SEC-2)
3. **URL protocol injection** in `socialUrl()` and `icon.njk` (SEC-3)
4. **Template context escaping** — analytics, disqus, copyright, meta description, git-sha (SEC-4)
5. **Error chaining** in vite adapter catch block (SEC-6)
6. **Dead code** removed from `resolver.mjs` (~120 lines: `createResourceResolver`, `createExistsChecker`, `scanDirectoriesWithCascade`)
7. **Diamond imports** removed from `resolver.mjs` backwards-compat re-exports
8. **Feature discovery** consolidated from 3x calls to 1x in vite adapter init

### Post-3.0.0 Hardening

9. **Dependency CVEs** — vite, fast-uri, liquidjs, picomatch, postcss, yaml, brace-expansion all upgraded via `npm audit fix`
10. **`safeUrl()` allowlist** (SEC-13) — replaced blocklist with allowlist (`http`, `https`, `mailto`, `tel`, relative); strips control / zero-width chars before scheme detection. Now blocks `vbscript:`, `file:`, and obfuscation bypasses
11. **`escapeJsString` U+2028/U+2029** (SEC-14) — escapes JS line/paragraph separators
12. **`escapeCssValue` strict** (SEC-15) — strips `;`, `\`, and `/* … */` to prevent sibling-declaration injection and CSS escape sequences
13. **`UNSAFE_KEYS` centralized** at `core/lib/internal/safe-keys.mjs` (was redefined in 3 places)
14. **`getFeaturePathsForBuild` strict** — throws when `discoveredFeatures` is not a `Map`; no silent fallback
15. **`getFeatureEntries` options-bag** — collapsed positional `(projectRoot, themeMetadata, resolvedOverridePaths, discoveredFeatures)` to `(projectRoot, themeMetadata, opts?)`
16. **Dead code** — removed `validate.mjs` (167 lines, no consumers); demoted `VALID_THEMES` to module-internal
17. **`createThemeViteConfig` / `eleventyPluginThemerVite` decomposed** into named helpers (see Vite Implementation Details)
18. **Schema validation** — `featuresFrontMatterSchema` migrated from zod 3 `errorMap` API to zod 4 `error` callback (the helpful "Available: …" message was silently lost under zod 4)
