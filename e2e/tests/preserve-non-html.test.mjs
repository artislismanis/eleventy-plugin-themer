/**
 * preserveNonHtml (§13).
 *
 * The vite HTML pipeline only emits HTML from its temp dir; non-HTML outputs
 * (sitemap.xml, robots.txt, feed xsl, …) survive only when the preserveNonHtml
 * optimization copies them across. full-optims enables it for xml/txt/xsl and
 * produces a sitemap + robots file, so their presence proves the pass ran.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

import { fixtureSite } from '../helpers/buildFixture.mjs';

const site = fixtureSite('full-optims');

describe('preserveNonHtml', () => {
  it('keeps the generated sitemap.xml', () => {
    const p = path.join(site, 'sitemap.xml');
    expect(fs.existsSync(p)).toBe(true);
    const xml = fs.readFileSync(p, 'utf8');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('https://example.com/');
  });

  it('keeps the generated robots.txt', () => {
    const p = path.join(site, 'robots.txt');
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, 'utf8')).toMatch(/User-agent:/);
  });
});
