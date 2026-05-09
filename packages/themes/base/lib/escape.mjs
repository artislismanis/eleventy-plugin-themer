/**
 * Shared escape helpers for safe HTML output
 *
 * Used by both filters.mjs (Nunjucks filters) and shortcodes.mjs (Eleventy shortcodes).
 * Autoescape is OFF in Nunjucks — these helpers must be applied explicitly.
 */

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeCssValue(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/['";<>(){}]/g, '');
}

export function safeUrl(url) {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return '#';
  }
  return url;
}
