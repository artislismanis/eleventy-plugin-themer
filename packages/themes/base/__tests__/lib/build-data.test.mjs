import { describe, it, expect } from 'vitest';

import buildData from '../../lib/build-data.mjs';

describe('buildData', () => {
  it('returns git + timestamp metadata', () => {
    const data = buildData();

    expect(data).toHaveProperty('gitSha');
    expect(data).toHaveProperty('gitShaShort');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.gitSha).toBe('string');
    expect(typeof data.gitShaShort).toBe('string');
    expect(data.gitShaShort.length).toBeGreaterThan(0);
  });

  it('derives the short SHA as a prefix of the full SHA when in a git repo', () => {
    const data = buildData();

    // In a non-git environment both fall back to 'unknown'/'dev'.
    if (data.gitSha !== 'unknown') {
      expect(data.gitSha.startsWith(data.gitShaShort)).toBe(true);
      expect(data.gitShaShort).toHaveLength(7);
    }
  });
});
