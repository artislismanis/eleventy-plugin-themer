/**
 * Production optimizations (§15, §17) on the full-optims fixture.
 *
 * Built once by global-setup with NODE_ENV=production so cssnano and template
 * caching paths run. Covers minifyHTML, criticalCSS, PurgeCSS (+ site safelist
 * merge), hashed bundles, and the data override (prism theme / default theme).
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect, beforeAll } from 'vitest';

import { fixtureSite } from '../helpers/buildFixture.mjs';
import { walkHtml, readFile, parsePage, listDir } from '../helpers/html.mjs';

const site = fixtureSite('full-optims');

function cssText() {
  const dir = path.join(site, 'assets', 'css');
  const files = listDir(dir).filter((f) => f.endsWith('.css'));
  return files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
}

describe('minifyHTML', () => {
  it('strips inter-tag whitespace on every page', () => {
    const failures = walkHtml(site).filter((p) => {
      const html = readFile(p);
      return /<!doctype html>\s*\n/i.test(html) || /<\/head>\s*\n\s*<body/i.test(html);
    });
    expect(failures).toEqual([]);
  });
});

describe('criticalCSS', () => {
  it('inlines a <style> block in the homepage head', () => {
    const head = parsePage(path.join(site, 'index.html')).querySelector('head');
    expect(head.querySelector('style')).not.toBeNull();
  });
});

describe('hashed bundles', () => {
  it('emits hashed main JS and CSS', () => {
    expect(
      listDir(path.join(site, 'assets', 'scripts')).some((f) =>
        /^main\.[A-Za-z0-9_-]{6,}\.js$/.test(f),
      ),
    ).toBe(true);
    expect(
      listDir(path.join(site, 'assets', 'css')).some((f) => /\.[A-Za-z0-9_-]{6,}\.css$/.test(f)),
    ).toBe(true);
  });
});

describe('PurgeCSS', () => {
  let css;
  beforeAll(() => {
    css = cssText();
  });

  it('removes an unused, non-safelisted class', () => {
    expect(css).not.toContain('e2e-purge-me');
  });

  it('keeps an unused class matched by the site safelist', () => {
    expect(css).toContain('e2e-keep-me');
  });
});

describe('cssnano (production)', () => {
  it('produced comment-free, whitespace-minimized CSS', () => {
    const css = cssText();
    expect(css.length).toBeGreaterThan(0);
    expect(css).not.toMatch(/\/\*[\s\S]*?\*\//); // comments discarded
    expect(css).not.toMatch(/\n\s{2,}/); // no multi-space indentation
  });
});

describe('data override (content/_data/theme.js)', () => {
  it('applies the overridden default theme to <html>', () => {
    const html = readFile(path.join(site, 'index.html'));
    expect(/data-default-theme=["']?dark/i.test(html)).toBe(true);
  });

  it('bundles the Prism theme chosen in theme.js (codeHighlighting reaches the build)', () => {
    // theme.js sets prismTheme 'prism-okaidia' (bg #272822); the default is
    // 'prism-tomorrow'. Presence proves the merged config reached the build.
    expect(cssText()).toContain('#272822');
  });
});
