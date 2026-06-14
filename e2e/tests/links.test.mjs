/**
 * Link validation (§16).
 *
 * The full-optims fixture enables validateLinks and builds successfully (proven
 * by global-setup completing), so internal links resolve and external/anchor
 * links are skipped. The negative direction (a broken link fails the build) is
 * covered in negative.test.mjs to keep the shared positive fixture green.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

import { fixtureSite } from '../helpers/buildFixture.mjs';
import { walkHtml, parsePage } from '../helpers/html.mjs';

const site = fixtureSite('full-optims');

describe('validateLinks (positive)', () => {
  it('all internal anchor targets exist on disk', () => {
    const broken = [];
    for (const page of walkHtml(site)) {
      for (const a of parsePage(page).querySelectorAll('a[href]')) {
        const href = a.getAttribute('href');
        if (!href || /^(https?:|mailto:|tel:|data:|#)/i.test(href)) continue;
        const clean = href.split(/[?#]/)[0];
        const rel = clean.startsWith('/') ? clean.slice(1) : clean;
        const asFile = path.join(site, rel);
        const asIndex = path.join(site, rel, 'index.html');
        if (!fs.existsSync(asFile) && !fs.existsSync(asIndex)) {
          broken.push({ page: path.relative(site, page), href });
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
