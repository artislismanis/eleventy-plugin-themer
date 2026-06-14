/**
 * Vitest globalSetup for the e2e node-env suites.
 *
 * Builds every positive fixture once, in parallel, before any test runs. Tests
 * then only read the resulting `_site/`. NODE_ENV=production exercises the
 * production-gated paths (cssnano, Nunjucks template caching); the default
 * (non-`--serve`) Eleventy run mode is `build`, so drafts are excluded.
 */

import { buildFixture } from './buildFixture.mjs';

const POSITIVE_FIXTURES = ['minimal', 'full-optims', 'overrides', 'drafts'];

export async function setup() {
  const env = { NODE_ENV: 'production' };
  await Promise.all(POSITIVE_FIXTURES.map((name) => buildFixture(name, { env })));
}
