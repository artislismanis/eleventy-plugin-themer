/**
 * Drafts (§12) — documented consumer pattern.
 *
 * The drafts preprocessor (consumer code, mirrored from the starter) drops
 * `draft: true` pages when ELEVENTY_RUN_MODE=build. global-setup builds in that
 * mode, so the draft must be absent while published pages remain.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

import { fixtureSite } from '../helpers/buildFixture.mjs';

const site = fixtureSite('drafts');

describe('draft exclusion in production build', () => {
  it('includes the published page', () => {
    expect(fs.existsSync(path.join(site, 'published', 'index.html'))).toBe(true);
  });

  it('excludes the draft page', () => {
    expect(fs.existsSync(path.join(site, 'secret', 'index.html'))).toBe(false);
  });
});
