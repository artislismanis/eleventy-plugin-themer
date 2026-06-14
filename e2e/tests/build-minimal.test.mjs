/**
 * Minimal-consumer build (§9, §5.1-5.3).
 *
 * Proves the smallest valid consumer builds: pages render, the theme cascade
 * resolves layouts, the auto-import wiring produces a hashed main bundle, and
 * the theme stylesheet is emitted. Built once by global-setup.
 */

import path from 'path';

import { describe, it, expect } from 'vitest';

import { fixtureSite } from '../helpers/buildFixture.mjs';
import { walkHtml, readFile, parsePage, listDir } from '../helpers/html.mjs';

const site = fixtureSite('minimal');

describe('minimal consumer build', () => {
  it('emits the expected pages', () => {
    const pages = walkHtml(site)
      .map((p) => path.relative(site, p))
      .sort();
    expect(pages).toContain('index.html');
    expect(pages).toContain(path.join('about', 'index.html'));
  });

  it('every page has a non-empty <title>', () => {
    const empty = walkHtml(site).filter((p) => {
      const t = parsePage(p).querySelector('title');
      return !t || t.text.trim().length === 0;
    });
    expect(empty).toEqual([]);
  });

  it('renders content through the theme layout (header + main + footer)', () => {
    const root = parsePage(path.join(site, 'index.html'));
    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelector('main')).not.toBeNull();
    expect(root.querySelector('footer')).not.toBeNull();
    expect(root.querySelector('main').text).toContain('minimal e2e fixture');
  });

  it('emits a hashed main script bundle (auto-import wiring)', () => {
    const scripts = listDir(path.join(site, 'assets', 'scripts'));
    expect(scripts.some((f) => /^main\.[A-Za-z0-9_-]{6,}\.js$/.test(f))).toBe(true);
  });

  it('emits a hashed CSS bundle from the theme styles', () => {
    const css = listDir(path.join(site, 'assets', 'css'));
    expect(css.some((f) => /\.[A-Za-z0-9_-]{6,}\.css$/.test(f))).toBe(true);
  });

  it('references the bundled module script in the HTML', () => {
    const html = readFile(path.join(site, 'index.html'));
    expect(/<script[^>]+type=["']?module["']?[^>]+src=/i.test(html)).toBe(true);
  });
});
