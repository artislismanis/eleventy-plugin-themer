import { describe, it, expect } from 'vitest';

import externalLinks from '../../lib/external-links.mjs';

const wrap = (inner) => `<html><body><main>${inner}</main><footer></footer></body></html>`;

describe('externalLinks transform', () => {
  it('decorates absolute http(s) links inside <main>', () => {
    const out = externalLinks(wrap('<a href="https://example.com">x</a>'), 'page/index.html');

    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('class="external-link"');
  });

  it('leaves relative links alone', () => {
    const html = wrap('<a href="/about">About</a>');
    expect(externalLinks(html, 'index.html')).toBe(html);
  });

  it('does not touch links outside <main> (nav, footer, social)', () => {
    const html =
      '<html><body><main></main><footer><a href="https://x.dev">f</a></footer></body></html>';
    expect(externalLinks(html, 'index.html')).toBe(html);
  });

  it('skips UI links (social, buttons) even inside main', () => {
    const html = wrap('<a href="https://x.dev" class="social-link">s</a>');
    const out = externalLinks(html, 'index.html');
    expect(out).not.toContain('external-link');
    expect(out).not.toContain('target="_blank"');
  });

  it('merges the class into an existing class attribute', () => {
    const out = externalLinks(wrap('<a class="ref" href="https://x.dev">x</a>'), 'index.html');
    expect(out).toContain('class="ref external-link"');
  });

  it('only runs on .html output', () => {
    const html = wrap('<a href="https://x.dev">x</a>');
    expect(externalLinks(html, 'feed.xml')).toBe(html);
  });
});
