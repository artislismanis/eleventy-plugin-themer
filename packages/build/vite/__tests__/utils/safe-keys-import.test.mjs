/**
 * Sanity check: the `@eleventy-plugin-themer/core/internal/safe-keys` subpath
 * resolves cross-package. A regression in core's `package.json#exports` would
 * break the build-vite consumers that import this constant; this test gives
 * us early warning rather than a runtime "module not found" at plugin init.
 */

import { describe, it, expect } from 'vitest';
import { UNSAFE_KEYS } from '@eleventy-plugin-themer/core/internal/safe-keys';

describe('@eleventy-plugin-themer/core/internal/safe-keys subpath', () => {
  it('exports the prototype-pollution guard set', () => {
    expect(UNSAFE_KEYS).toBeInstanceOf(Set);
    expect(UNSAFE_KEYS.has('__proto__')).toBe(true);
    expect(UNSAFE_KEYS.has('constructor')).toBe(true);
    expect(UNSAFE_KEYS.has('prototype')).toBe(true);
  });

  it('does not include common safe keys', () => {
    expect(UNSAFE_KEYS.has('analytics')).toBe(false);
    expect(UNSAFE_KEYS.has('foo')).toBe(false);
  });
});
