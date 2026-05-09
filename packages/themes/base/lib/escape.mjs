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

// Belt-and-braces: strip balanced /* ... */ first, then any stray /* or */
// markers so an unclosed comment can't survive in the output. Then strip
// quote, bracket, semicolon, and backslash chars that could break out of a
// CSS value or assemble a CSS escape sequence.
export function escapeCssValue(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\*|\*\//g, '')
    .replace(/['";<>(){}\\;]/g, '');
}

const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

// Strip whitespace + ASCII/C1 control chars + zero-width and bidi-override
// chars. Used both for scheme detection (so `java\tscript:` can't evade the
// allowlist) AND for the returned value (so bidi/zero-width display tricks
// can't survive into the rendered href).
// eslint-disable-next-line no-control-regex
const URL_INVISIBLE_CHARS = /[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g;

export function safeUrl(url) {
  if (typeof url !== 'string') return '#';
  const stripped = url.replace(URL_INVISIBLE_CHARS, '');
  if (stripped === '') return '#';
  const firstChar = stripped[0];
  if (firstChar === '/' || firstChar === '#' || firstChar === '?' || firstChar === '.') {
    return stripped;
  }
  const colonIdx = stripped.indexOf(':');
  if (colonIdx === -1) return stripped;
  const slashIdx = stripped.indexOf('/');
  if (slashIdx !== -1 && slashIdx < colonIdx) return stripped;
  const scheme = stripped.slice(0, colonIdx + 1).toLowerCase();
  if (!SAFE_URL_SCHEMES.has(scheme)) return '#';
  return stripped;
}
