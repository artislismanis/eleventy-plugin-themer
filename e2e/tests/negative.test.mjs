/**
 * Negative paths (§1, §2.3, §5.9, §11.4, §16) — misconfiguration must fail loud.
 *
 * Each case builds a deliberately-broken fixture and asserts the build fails
 * with the documented message. These also serve as the "assertions bite" proof
 * for the whole e2e layer: if a guard regresses to a silent no-op, the matching
 * case here goes green-when-it-should-fail and `expectThrow` flags it.
 */

import { describe, it, expect } from 'vitest';

import { buildFixture } from '../helpers/buildFixture.mjs';

async function failure(name, opts = {}) {
  const r = await buildFixture(name, { ...opts, expectThrow: true });
  expect(r.ok).toBe(false);
  return r.output;
}

describe('config-level faults (broken fixture, selected by --config)', () => {
  it('rejects an unknown optimization key', async () => {
    const out = await failure('broken', { args: ['--config=eleventy.unknown-opt.mjs'] });
    expect(out).toMatch(/unknown optimization key\(s\): purgeCS/);
    expect(out).toMatch(/Valid keys:/);
  });

  it('throws when the vite adapter runs before the core plugin', async () => {
    const out = await failure('broken', { args: ['--config=eleventy.bad-order.mjs'] });
    expect(out).toMatch(/no themer context found/);
  });

  it('throws when the required theme option is missing', async () => {
    const out = await failure('broken', { args: ['--config=eleventy.no-theme.mjs'] });
    expect(out).toMatch(/requires a `theme` option/);
  });
});

describe('data-level faults', () => {
  it('rejects an unknown top-level theme.js key', async () => {
    const out = await failure('broken-theme-key');
    expect(out).toMatch(/Invalid theme configuration/);
    expect(out).toMatch(/Allowed top-level keys/);
    expect(out).toMatch(/notARealKey/);
  });

  it('rejects an invalid Prism theme set in theme.js', async () => {
    // The merged (theme.json + theme.js) codeHighlighting now reaches the build,
    // so a user's invalid prismTheme fails at the prism-theme vite plugin.
    const out = await failure('broken-prism');
    expect(out).toMatch(/Invalid theme "prism-dracula"/);
    expect(out).toMatch(/Available themes:/);
  });

  it('rejects an unknown feature in front matter with a friendly message', async () => {
    // Validated per-page by the themer preprocessor (a _data eleventyDataSchema
    // only validates global data, so it can't catch per-page front matter).
    const out = await failure('broken-feature');
    expect(out).toMatch(/Invalid feature\. Available:/);
    expect(out).toMatch(/code-highlighting/);
  });

  it('fails the build on a broken internal link', async () => {
    const out = await failure('broken-link');
    expect(out).toMatch(/this-page-does-not-exist/);
  });
});
