import { describe, it, expect } from 'vitest';

import { mergeStringArrays } from '../../utils/merge-arrays.mjs';

describe('mergeStringArrays', () => {
  it('returns empty array when both inputs are empty/missing', () => {
    expect(mergeStringArrays(undefined, undefined)).toEqual([]);
    expect(mergeStringArrays([], [])).toEqual([]);
  });

  it('preserves theme order at the head', () => {
    expect(mergeStringArrays(['a', 'b'], ['c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dedupes overlapping entries while keeping theme-first order', () => {
    expect(mergeStringArrays(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('tolerates non-array inputs by treating as empty', () => {
    expect(mergeStringArrays(null, ['x'])).toEqual(['x']);
    expect(mergeStringArrays(['x'], 'not-an-array')).toEqual(['x']);
  });
});
