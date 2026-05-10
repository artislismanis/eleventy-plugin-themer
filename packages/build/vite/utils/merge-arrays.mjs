/**
 * Tiny helper for merging string arrays from theme defaults and user values.
 *
 * Used by `mergeThemeBuildHints` to combine PurgeCSS safelist entries
 * (`standard`, `deep`, `greedy`). Theme entries always come first so theme
 * authors can rely on stable ordering for any greedy regex matchers; user
 * entries are appended; duplicates are removed.
 */

/**
 * Concatenate two arrays, theme entries first, deduped (preserves first-seen
 * order). Tolerates `undefined`/non-array inputs by treating them as empty.
 *
 * @param {Array<string>|undefined} themeArr
 * @param {Array<string>|undefined} userArr
 * @returns {Array<string>}
 */
export function mergeStringArrays(themeArr, userArr) {
  const theme = Array.isArray(themeArr) ? themeArr : [];
  const user = Array.isArray(userArr) ? userArr : [];
  const seen = new Set();
  const result = [];
  for (const item of theme) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  for (const item of user) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}
