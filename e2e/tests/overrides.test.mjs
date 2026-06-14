/**
 * Override cascade (§3, §5, §6) on the overrides fixture.
 *
 * Covers: a layout-file override and a partial override shadowing their theme
 * counterparts, user lib filters and shortcodes registering, and front-matter
 * feature gating (the user feature's code runs only on the opted-in page).
 */

import path from 'path';

import { describe, it, expect } from 'vitest';

import { fixtureSite } from '../helpers/buildFixture.mjs';
import { parsePage, entryScriptSource } from '../helpers/html.mjs';

const site = fixtureSite('overrides');
const indexMain = () => parsePage(path.join(site, 'index.html')).querySelector('main').text;

describe('layout override (overrides/layouts/<name>.njk)', () => {
  it('shadows the theme layout of the same name', () => {
    // overrides/layouts/home.njk wraps content in a marker; index.njk uses
    // `layout: home.njk`. Resolved via a layout alias to the override file.
    const marker = parsePage(path.join(site, 'index.html')).querySelector(
      '[data-override-marker="home"]',
    );
    expect(marker).not.toBeNull();
  });
});

describe('partial override (Nunjucks loader cascade)', () => {
  it('uses the user partial over the theme partial', () => {
    const footer = parsePage(path.join(site, 'index.html')).querySelector('.powered-by');
    expect(footer.getAttribute('data-override-partial')).toBe('yes');
  });
});

describe('user lib helpers', () => {
  it('registers a user filter', () => {
    expect(indexMain()).toContain('HI'); // "hi" | shout
  });

  it('registers a user shortcode', () => {
    expect(indexMain()).toContain('STAMP-OK'); // {% stamp %}
  });
});

describe('user feature + front-matter gating', () => {
  it('runs the user feature code on the opted-in page', () => {
    expect(entryScriptSource(path.join(site, 'index.html'), site)).toMatch(/dataset\.widget/);
  });

  it('does not run the feature code on a page without features', () => {
    expect(entryScriptSource(path.join(site, 'plain', 'index.html'), site)).not.toMatch(
      /dataset\.widget/,
    );
  });
});
