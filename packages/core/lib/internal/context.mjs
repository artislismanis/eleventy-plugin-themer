/**
 * Themer cascade context — internal plumbing.
 *
 * `eleventyPluginThemer` stashes a single resolved-context object on
 * `eleventyConfig` so peer adapters (build-vite) and helpers
 * (`themerDataSchema`) can avoid redoing theme metadata resolution and
 * feature discovery. Stored on a non-enumerable, symbol-spelled property
 * because Eleventy reflects over its config in a few places and the context
 * shouldn't show up in those iterations.
 *
 * Exposed cross-package via the `@eleventy-plugin-themer/core/internal/api`
 * subpath. Not part of the public API — signature may change between minor
 * releases until 1.0.
 */

const THEMER_CONTEXT_KEY = '__themerContext';

/**
 * Read the themer context that `eleventyPluginThemer` stashed on
 * `eleventyConfig`. Returns `undefined` if the plugin has not yet run.
 *
 * @param {Object} eleventyConfig
 * @returns {import('../types.mjs').ThemerContext|undefined}
 */
export function getThemerContext(eleventyConfig) {
  return eleventyConfig?.[THEMER_CONTEXT_KEY];
}

/**
 * Stash the themer context on `eleventyConfig` (non-enumerable).
 *
 * @param {Object} eleventyConfig
 * @param {import('../types.mjs').ThemerContext} context
 */
export function setThemerContext(eleventyConfig, context) {
  Object.defineProperty(eleventyConfig, THEMER_CONTEXT_KEY, {
    value: context,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

/**
 * Get the Eleventy `dir` config computed by `eleventyPluginThemer`.
 *
 * Eleventy disallows calling `set*Directory()` from inside a plugin and
 * `addPlugin` discards plugin return values, so the plugin stashes its
 * computed `dir` on the shared themer context. Consumers spread it into the
 * config-function return value.
 *
 * @param {Object} eleventyConfig
 * @returns {{ input: string, output: string, includes: string }|undefined}
 */
export function getThemerDir(eleventyConfig) {
  const ctx = getThemerContext(eleventyConfig);
  if (!ctx) {
    throw new Error(
      'getThemerDir: themer context not found. Ensure `eleventyPluginThemer` is registered ' +
        'before calling getThemerDir.',
    );
  }
  return ctx.dir;
}
