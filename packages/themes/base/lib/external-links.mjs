/**
 * External-link transform.
 *
 * Marks absolute http(s) links inside the page's <main> with
 * `rel="noopener noreferrer"`, `target="_blank"`, and an `external-link` class
 * (which the theme decorates with a ↗ glyph). Scoped to <main> so navigation,
 * footer, and social links are left alone; UI links (buttons/social) are skipped
 * even inside content.
 *
 * Internal links are relative in this framework, so "absolute http(s)" is a good
 * proxy for "external". A consumer who links to their own site with an absolute
 * URL can add the `no-external` class to opt a link out.
 */

// Anchors carrying any of these classes are left untouched (already external,
// or a UI element that shouldn't get the external treatment).
const SKIP_CLASS =
  /\bclass="[^"]*\b(?:social-link|hero__button|home-link|external-link|no-external)\b/i;

function decorateOpenTag(tag) {
  if (SKIP_CLASS.test(tag)) return tag;

  let out = tag;
  if (!/\srel=/i.test(out)) {
    out = out.replace(/\s*>$/, ' rel="noopener noreferrer">');
  }
  if (!/\starget=/i.test(out)) {
    out = out.replace(/\s*>$/, ' target="_blank">');
  }
  if (/\sclass="/i.test(out)) {
    out = out.replace(/\sclass="([^"]*)"/i, ' class="$1 external-link"');
  } else {
    out = out.replace(/\s*>$/, ' class="external-link">');
  }
  return out;
}

const ANCHOR_RE = /<a\b[^>]*\shref="https?:\/\/[^"]*"[^>]*>/gi;
const MAIN_RE = /(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i;

export default function externalLinks(content, outputPath) {
  if (typeof content !== 'string' || !outputPath || !outputPath.endsWith('.html')) {
    return content;
  }
  return content.replace(MAIN_RE, (_full, open, inner, close) => {
    return open + inner.replace(ANCHOR_RE, decorateOpenTag) + close;
  });
}
