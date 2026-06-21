/**
 * Conformance: theme-base is the executable reference implementation of the
 * template contract. If this fails, the baseline a site can rely on is broken.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect } from 'vitest';

import { capabilitiesSchema } from '../lib/schemas.mjs';
import { THEMER_CONTRACT_VERSION, MIN_SUPPORTED_CONTRACT_VERSION } from '../lib/defaults.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseRoot = path.resolve(__dirname, '../../themes/base');
const themeJson = JSON.parse(fs.readFileSync(path.join(baseRoot, 'theme.json'), 'utf8'));

const REQUIRED_LAYOUTS = ['base.njk'];

describe('theme-base conformance', () => {
  it('declares a contractVersion this core supports', () => {
    expect(Number.isInteger(themeJson.contractVersion)).toBe(true);
    expect(themeJson.contractVersion).toBeGreaterThanOrEqual(MIN_SUPPORTED_CONTRACT_VERSION);
    expect(themeJson.contractVersion).toBeLessThanOrEqual(THEMER_CONTRACT_VERSION);
  });

  it('declares a valid capabilities block', () => {
    expect(themeJson.capabilities).toBeDefined();
    expect(capabilitiesSchema.safeParse(themeJson.capabilities).success).toBe(true);
  });

  it('guarantees social render-or-fallback (declares a fallback)', () => {
    expect(themeJson.capabilities?.social?.fallback).toBeTruthy();
  });

  it('provides the required layouts', () => {
    for (const layout of REQUIRED_LAYOUTS) {
      expect(fs.existsSync(path.join(baseRoot, 'layouts', layout))).toBe(true);
    }
  });

  it('does not redeclare the framework-owned socialPlatforms table', () => {
    // Themes may *extend* via theme.json#socialPlatforms, but the baseline
    // should rely on the core defaults rather than copying them.
    expect(themeJson.config?.socialPlatforms).toBeUndefined();
  });
});
