---
'@eleventy-plugin-themer/core': minor
'@eleventy-plugin-themer/build-vite': minor
'@eleventy-plugin-themer/theme-base': minor
---

Template contract v1: a versioned framework↔theme template API.

- core: `contractVersion` handshake (`THEMER_CONTRACT_VERSION` / `MIN_SUPPORTED_CONTRACT_VERSION`); framework-owned `siteDataSchema` (social/analytics/branding/comments/features) + `capabilitiesSchema` + `siteCapabilityWarnings`; site-data validation preprocessor (hard-fail on shape, warn on theme-unsupported capability); `SOCIAL_PLATFORMS` table + `socialUrl` filter; `defineSiteData()`; minimum-spec conformance (required `base.njk`). Normative spec at `docs/spec/template-contract.md`.
- theme-base: declares `contractVersion` + `capabilities`; reads theme-agnostic data from the `site` global; drops the duplicated `socialPlatforms` table and the `socialUrl` filter (now in core); social text fallback.
- build-vite: tracks the core dep range; no behavioural change.

Linked group → all three release together as 0.4.0.
