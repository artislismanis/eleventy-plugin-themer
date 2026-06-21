# Themer template contract — v1

Normative spec for the framework ↔ theme ↔ site boundary in
`@eleventy-plugin-themer`. This is the API surface a theme implements and a site
relies on. It is **versioned**: a theme declares the contract version it targets,
and core refuses to load a theme outside its supported range.

> Status: **active (v1)**. Supersedes the design sketch in
> [`../proposals/site-data-contract.md`](../proposals/site-data-contract.md).

## Versioning

- Core exports `THEMER_CONTRACT_VERSION` (currently `1`) and
  `MIN_SUPPORTED_CONTRACT_VERSION`.
- A theme declares `"contractVersion": 1` in `theme.json`.
- On load (`resolveThemeMetadata`): a version outside the supported range is a
  **hard error**; a missing version is a pre-1.0 grace (warn + assume current).
- This is distinct from the theme's package `version` (its product version).
  The contract version changes only when the boundary below changes.

## Three layers, one home per concern

| Layer                | Owns                                                                                                                                                        | Where                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Framework (core)** | the contract: site-data schema, `socialPlatforms` table, `socialUrl` filter, capability schema + warnings, version handshake, conformance, provided globals | `@eleventy-plugin-themer/core`                          |
| **Theme**            | rendering + design system + declared capabilities                                                                                                           | `theme.json`, `layouts/`, `lib/`, `styles/`, `scripts/` |
| **Site**             | theme-agnostic data + capability toggles                                                                                                                    | `content/_data/site.mjs`                                |

**Boundary rule.** A value belongs to the **site** (not the theme) when it is
identity/data, theme-swap invariant, and cross-cutting. Everything about _how_
it renders (colours, typography, layout, footer format) stays theme-side.

## Provided template globals (core guarantees these exist)

- `site` — the site-data contract (below), from `content/_data/site.mjs`.
- `theme` — merged theme presentation config (`theme.json#config` + `theme.config.mjs`).
- `themeMetadata` — resolved theme metadata (name, version, capabilities, …).
- `build` — build metadata (git sha, timestamp); supplied by the theme.

## Site-data contract (`content/_data/site.mjs`)

Validated against `siteDataSchema`. Known keys are shape-checked; identity fields
(`title`, `url`, `author`, …) pass through. **A malformed shape hard-fails the
build.** Use `defineSiteData()` for editor typing.

| Key                                    | Shape                                                                           | Notes                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `social`                               | `[{ platform, account?, url?, label?, icon? }]`                                 | `account` expanded via the platform table by `socialUrl`; explicit `url` wins |
| `analytics`                            | `{ googleAnalytics?, plausible? }`                                              | rendered only if the theme declares the provider                              |
| `branding`                             | `{ logo?, logoDark?, favicon? }`                                                |                                                                               |
| `comments`                             | `{ provider: 'disqus'\|'giscus'\|'none', disqus?: { shortname }, giscus?: {} }` | `none` = off                                                                  |
| `features`                             | `Record<string, boolean>`                                                       | capability toggles (site intent), e.g. `rss`, `search`                        |
| `startYear` / `repository` / `feedUrl` | string/number                                                                   | footer + feed data                                                            |

`socialPlatforms` (platform → URL template) is a **framework default** in core;
themes may extend it via `theme.json#socialPlatforms` but should not redeclare it.

## Theme requirements (minimum spec)

A conforming theme MUST:

1. Declare `"contractVersion"` it targets, and a `"capabilities"` block.
2. Provide the required layouts (currently `base.njk`) — or rely on a site
   override. Enforced at plugin init; a missing required layout is a hard error.
3. Default-export an object from its entry (`filters`/`shortcodes`/`transforms`/`configure`, all optional).
4. Read theme-agnostic data from the `site` global, not `theme`.

### Capability declaration (`theme.json#capabilities`)

```jsonc
{
  "social": { "render": "icons", "fallback": "text" },
  "analytics": ["googleAnalytics", "plausible"],
  "comments": ["disqus"],
  "search": false,
}
```

### Render-or-fallback guarantee

Given valid site data, a theme MUST either render it or apply a documented
fallback — never error, never silently drop:

- **social**: brand icons, falling back to text labels.
- **analytics / comments / search**: if the site requests a provider/capability
  the theme does not declare, core emits a **build warning** (via `core/logger`)
  and the theme skips it. Valid data is never dropped without a warning.

`theme-base` is the executable reference implementation; `core`'s
`conformance.test.mjs` asserts this baseline.
