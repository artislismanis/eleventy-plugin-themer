# Proposal: a framework-owned site-data contract + theme capability spec

Status: **Implemented (contract v1).** This draft is kept for design context; the
normative spec lives at [`../spec/template-contract.md`](../spec/template-contract.md).
The shipped design also adds a versioned `contractVersion` handshake and an
enforced minimum-theme spec (required layouts, lib-export shape), and does a clean
cut rather than the dual-read deprecation window sketched below.

Scope: `@eleventy-plugin-themer/core` (schema layer), with downstream changes in themes and consuming sites.

## Problem

The framework validates theme config for **typos**, not for **shape or capability**. From `core/lib/schemas.mjs`:

```js
export function themeConfigSchema(themeMetadata) {
  const config = themeMetadata?.config || {}; // schema is derived FROM the theme
  const shape = {};
  for (const key of Object.keys(config)) {
    if (UNSAFE_KEYS.has(key)) continue;
    shape[key] = z.unknown().optional(); // every key optional, inner shape unchecked
  }
  return z.object(shape).strict(); // only rejects unknown top-level keys
}
```

Consequences, all confirmed by `schemas.test.mjs`:

- The config surface is **defined by each theme**, not by the framework. Two themes can name the same concept differently (`social` vs `socialLinks`) with different shapes.
- **Nothing is required** and **no inner shape is validated** (`it('allows arbitrary nested shapes (inner unconstrained)')`). A theme could declare `colors` as a string, or omit `social` entirely, and validation passes.
- There is **no conformance notion**: nothing answers "does this theme implement the baseline a site can rely on?"
- Cross-cutting _data_ (a site's social handles, analytics IDs, logo, comment shortname) currently lives in `theme.config.mjs` and is read off the `theme` global — so it is **theme-coupled even though it is theme-agnostic by nature**. Swapping themes drops the data.

There is a de-facto baseline in `theme-base` (colors / social / socialPlatforms / analytics / comments / footer / logos), which aurora copies almost verbatim. But it is a **theme**, not a framework contract, and it conflates three different concerns in one `config` blob: identity data, presentation, and capability/lookup tables (`socialPlatforms`).

## Goal

Separate the **data model** (framework-owned, stable, theme-agnostic) from the **rendering/capability layer** (theme-owned, swappable), with a defined fallback when a site asks for something a theme doesn't implement.

Three layers, one home per concern:

| Layer                       | Owns                                                                                                   | Examples                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework (core)**        | The _contract_: canonical site-data schema + capability declaration/fallback + universal lookup tables | `social` / `analytics` / `comments` / `branding` shapes; `socialPlatforms` URL templates; the "render-or-documented-fallback" guarantee |
| **Theme (aurora, base, …)** | The _implementation_: rendering + design system + optional capabilities                                | colours, typography, layouts, styled social icons (or text fallback), declared capabilities                                             |
| **Site (consumer repo)**    | The _data + choices_: theme-agnostic facts and capability toggles                                      | `site.title/url/author`, social handles, analytics IDs, logo/favicon, capability on/off                                                 |

### Non-goals

- Not validating presentation config (colours, typography) against the framework — that stays theme-owned and theme-defined.
- Not building a general plugin/capability marketplace. The capability mechanism is a thin "does the theme implement X? if not, degrade" check — not a runtime negotiation engine.
- Not forcing every site value into one file. `site.js` gains structured sub-keys; it does not absorb presentation config.

## Decision rule (the boundary)

A value belongs to the **framework site-data contract** if all three hold:

1. It is **identity/data**, not rendering config.
2. It is **theme-swap invariant** (true regardless of which theme renders it).
3. It is **cross-cutting** — more than one theme would reasonably want it in the same shape.

By this rule:

- **site → framework-validated data:** social accounts, analytics IDs, comment shortname/provider, logo + favicon paths, author, copyright holder, repo URL, feed URL.
- **framework default (neither site nor theme):** `socialPlatforms` URL templates (twitter = `twitter.com/{account}` is universal knowledge).
- **theme-owned:** colours, typography, layout, code highlighting, optional features, and the _rendering_ of all the site data above.
- **capability toggle (site intent, theme implementation):** search, comments on/off, pagination — the decision is the site's, the implementation is the theme's.

## Proposed design

### 1. Canonical site-data schemas in core

Add real (not `z.unknown()`) schemas for the cross-cutting concerns, exported from core and validated against `site.js` data:

```js
// core/lib/schemas.mjs (sketch)
export const siteSocialSchema = z
  .array(
    z.object({
      platform: z.string(), // key into socialPlatforms, or 'rss'/custom
      account: z.string().optional(), // expanded via socialPlatforms[platform]
      url: z.string().optional(), // explicit url wins over account
      label: z.string().optional(),
    }),
  )
  .optional();

export const siteAnalyticsSchema = z
  .object({
    googleAnalytics: z.string().optional(),
    plausible: z.string().optional(),
  })
  .optional();

export const siteBrandingSchema = z
  .object({
    logo: z.string().optional(),
    logoDark: z.string().optional(),
    favicon: z.string().optional(),
  })
  .optional();

export const siteCommentsSchema = z
  .object({
    provider: z.enum(['disqus', 'giscus', 'none']).default('none'),
    // provider-specific sub-objects validated conditionally
  })
  .optional();
```

These compose into a `siteDataSchema` the plugin runs against the resolved `site` global at build time. Validation is **framework-owned and inverted** relative to today: the framework defines the shape; sites (and themes that ship defaults) are checked _against_ it.

### 2. `socialPlatforms` becomes a framework default

Move the platform→URL-template table out of every theme's `theme.json` and into `core/lib/defaults.mjs` (alongside the existing path/asset/feature conventions). Themes may extend it; they should not have to redeclare it.

### 3. Theme capability declaration

Themes declare what they implement, in `theme.json`:

```jsonc
{
  "capabilities": {
    "social": { "render": "icons", "fallback": "text" },
    "analytics": ["googleAnalytics", "plausible"],
    "comments": ["disqus"],
    "search": false,
  },
}
```

Add a `capabilities` block to `core/theme.schema.json` so it is part of the **framework ↔ theme** contract and validated structurally.

### 4. Render-or-fallback guarantee

The contract states: given valid canonical site data, a theme MUST either render it or apply a documented fallback — never error, never silently drop. Minimum bar for the first slice:

- **social:** styled icons OR text links (the documented fallback).
- **analytics/comments:** if the site supplies an ID for a provider the theme doesn't declare, emit a **build warning** (via `core/logger`), not a crash, and skip it.

A conformance test in core can assert the baseline against `theme-base`, turning base into the executable reference implementation rather than a copied convention.

## Migration path (sequenced — order matters)

Moving data before the theme reads it from its new home **breaks rendering**. Therefore:

1. **core** — add `siteDataSchema` + `socialPlatforms` default + `capabilities` schema. Non-breaking: schemas are additive; `themeConfigSchema` stays for presentation config.
2. **themes (base, aurora)** — read social/analytics/branding from the `site` global with fallback; declare `capabilities`; drop the duplicated `socialPlatforms`. Keep reading the old `theme.*` location for one minor version (deprecation warning) for back-compat.
3. **sites (e.g. insightsdude.uk)** — move `social`/`analytics`/`logos` from `theme.config.mjs` into `site.js`; delete the theme-side copies.
4. **core** — after a deprecation window, themes drop the old read path.

## Backwards compatibility

- `themeConfigSchema` (typo-strict, inner-unconstrained) is retained for genuinely theme-owned presentation config. This proposal _adds_ a parallel data contract; it does not remove the existing one.
- Sites that keep config in `theme.config.mjs` keep working through the deprecation window; they get warnings, not failures.

## Open questions

- **Brand tokens.** Primary/accent colour and base font are the fuzzy edge — arguably brand identity (site) rather than pure presentation (theme). Expose a small `site.brand` token set that themes _may_ consume, or leave fully theme-side? (Lean: defer; theme-side for now.)
- **Where does capability _toggling_ live** — `site.js` (`site.features.search = true`) or stay in `theme.config`? (Lean: site, since it's site intent.)
- **Validation strictness for data** — hard-fail on a bad social shape, or warn-and-skip? (Lean: fail on shape errors in `site.js`, warn on unsupported-by-theme.)

## Minimal first slice (recommended MVP)

Don't build the whole thing speculatively. Ship the smallest piece that proves the model:

1. `siteSocialSchema` + `socialPlatforms` lifted to a core default.
2. aurora reads `site.social` with a text fallback; declares `capabilities.social`.
3. A core conformance test asserting base/aurora render social or fall back.

If that lands cleanly, extend to analytics → comments → branding on the same pattern.
