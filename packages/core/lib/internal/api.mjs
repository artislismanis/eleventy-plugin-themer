/**
 * Internal cross-package API.
 *
 * Re-exports helpers consumed by peer packages (build-vite) and by the
 * framework's own tests. Not part of the public API — names and signatures
 * may change between minor releases until 1.0. Reach for these only from
 * inside the monorepo or from advanced consumer tests that intentionally
 * track the framework's internals.
 */

export { getThemerContext, setThemerContext, getThemerDir } from './context.mjs';
export { getThemeRoot } from '../cascade/paths.mjs';
export { resolveResource } from '../cascade/resolver.mjs';
export { getAvailableFeatures } from '../cascade/features.mjs';
