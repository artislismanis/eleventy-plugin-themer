import { describe, it, expect } from 'vitest';

import filters from '../../lib/filters.mjs';

describe('filters.mjs', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(filters.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('should escape ampersands and quotes', () => {
      expect(filters.escapeHtml('a&b\'c"d')).toBe('a&amp;b&#39;c&quot;d');
    });

    it('should return empty string for non-strings', () => {
      expect(filters.escapeHtml(null)).toBe('');
      expect(filters.escapeHtml(undefined)).toBe('');
      expect(filters.escapeHtml(42)).toBe('');
    });
  });

  describe('escapeAttr', () => {
    it('should escape attribute breakout characters', () => {
      expect(filters.escapeAttr('" onmouseover="alert(1)')).toBe(
        '&quot; onmouseover=&quot;alert(1)',
      );
    });
  });

  describe('escapeCssValue', () => {
    it('should strip CSS breakout characters', () => {
      expect(filters.escapeCssValue('red; } body { display:none } :root {')).toBe(
        'red  body  display:none  :root ',
      );
    });

    it('should strip semicolons preventing sibling-declaration injection', () => {
      expect(filters.escapeCssValue('red; background:url(//evil)')).toBe(
        'red background:url//evil',
      );
    });

    it('should strip backslashes preventing CSS escape sequences', () => {
      expect(filters.escapeCssValue('red\\22 ;')).toBe('red22 ');
    });

    it('should strip CSS comment blocks', () => {
      expect(filters.escapeCssValue('red /* malicious */ ')).toBe('red  ');
    });

    it('should strip unclosed CSS comment markers', () => {
      expect(filters.escapeCssValue('red /* attacker payload')).toBe('red  attacker payload');
      expect(filters.escapeCssValue('red */ surprise')).toBe('red  surprise');
    });

    it('should allow valid CSS values through', () => {
      expect(filters.escapeCssValue('#ff0000')).toBe('#ff0000');
      expect(filters.escapeCssValue('16px')).toBe('16px');
      expect(filters.escapeCssValue('Arial, sans-serif')).toBe('Arial, sans-serif');
    });

    it('should return empty string for non-strings', () => {
      expect(filters.escapeCssValue(null)).toBe('');
      expect(filters.escapeCssValue(42)).toBe('');
    });
  });

  describe('escapeJsString', () => {
    it('should escape JS string breakout characters', () => {
      expect(filters.escapeJsString("'; alert('xss'); '")).toBe("\\'; alert(\\'xss\\'); \\'");
    });

    it('should escape script tag closers', () => {
      expect(filters.escapeJsString('</script>')).toBe('\\x3c/script\\x3e');
    });

    it('should escape U+2028 line separator', () => {
      expect(filters.escapeJsString('a b')).toBe('a\\u2028b');
    });

    it('should escape U+2029 paragraph separator', () => {
      expect(filters.escapeJsString('a b')).toBe('a\\u2029b');
    });

    it('should return empty string for non-strings', () => {
      expect(filters.escapeJsString(null)).toBe('');
    });
  });

  describe('safeUrl', () => {
    it('should allow http and https URLs', () => {
      expect(filters.safeUrl('https://example.com')).toBe('https://example.com');
      expect(filters.safeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow mailto: and tel: URLs', () => {
      expect(filters.safeUrl('mailto:foo@bar.com')).toBe('mailto:foo@bar.com');
      expect(filters.safeUrl('tel:+15551234567')).toBe('tel:+15551234567');
    });

    it('should allow relative URLs', () => {
      expect(filters.safeUrl('/path')).toBe('/path');
      expect(filters.safeUrl('#anchor')).toBe('#anchor');
      expect(filters.safeUrl('?q=1')).toBe('?q=1');
      expect(filters.safeUrl('./foo')).toBe('./foo');
      expect(filters.safeUrl('foo/bar')).toBe('foo/bar');
    });

    it('should block javascript: URLs', () => {
      expect(filters.safeUrl('javascript:alert(1)')).toBe('#');
      expect(filters.safeUrl('JAVASCRIPT:alert(1)')).toBe('#');
    });

    it('should block data: URLs', () => {
      expect(filters.safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('should block vbscript: URLs', () => {
      expect(filters.safeUrl('vbscript:msgbox(1)')).toBe('#');
    });

    it('should block file: URLs', () => {
      expect(filters.safeUrl('file:///etc/passwd')).toBe('#');
    });

    it('should block control-char bypasses', () => {
      expect(filters.safeUrl('java\tscript:alert(1)')).toBe('#');
      expect(filters.safeUrl('java\nscript:alert(1)')).toBe('#');
      expect(filters.safeUrl('  javascript:alert(1)')).toBe('#');
    });

    it('should block zero-width-char bypasses', () => {
      expect(filters.safeUrl('​javascript:alert(1)')).toBe('#');
      expect(filters.safeUrl('java﻿script:alert(1)')).toBe('#');
    });

    it('should return # for non-strings', () => {
      expect(filters.safeUrl(null)).toBe('#');
      expect(filters.safeUrl(undefined)).toBe('#');
    });

    it('should return # for empty / whitespace-only', () => {
      expect(filters.safeUrl('')).toBe('#');
      expect(filters.safeUrl('   ')).toBe('#');
    });

    it('should strip bidi/zero-width chars from valid URLs (display safety)', () => {
      // RTL override embedded in a https URL — must not survive into rendered href.
      expect(filters.safeUrl('https://example.com/‮path')).toBe('https://example.com/path');
      // Zero-width space inside a relative URL.
      expect(filters.safeUrl('/foo​bar')).toBe('/foobar');
    });

    it('should strip CR/LF from mailto: URLs (header injection)', () => {
      expect(filters.safeUrl('mailto:foo@bar\r\nBcc:victim@evil')).toBe(
        'mailto:foo@barBcc:victim@evil',
      );
    });

    it('should reject percent-encoded CRLF in mailto: (decoded header smuggling)', () => {
      expect(filters.safeUrl('mailto:foo@bar%0d%0aBcc:victim')).toBe('#');
      expect(filters.safeUrl('mailto:foo@bar%0aBcc:victim')).toBe('#');
      expect(filters.safeUrl('mailto:foo@bar%0DBcc:victim')).toBe('#');
      expect(filters.safeUrl('tel:+1%0D%0Asubject:smuggle')).toBe('#');
    });

    it('should allow legitimate percent-encoding in mailto:', () => {
      // %20 (space) and %3F (?) are normal mailto encodings, not CR/LF/NUL.
      expect(filters.safeUrl('mailto:foo@bar?subject=hello%20world')).toBe(
        'mailto:foo@bar?subject=hello%20world',
      );
    });

    it('should reject http(s) URLs that use backslash authority', () => {
      // WHATWG URL normalises `\` to `/` for special schemes — would route to
      // evil.com when the consumer expected a path-relative URL.
      expect(filters.safeUrl('https:\\\\evil.com')).toBe('#');
      expect(filters.safeUrl('http:\\\\evil.com')).toBe('#');
      expect(filters.safeUrl('https:\\/\\/evil.com')).toBe('#');
      expect(filters.safeUrl('https://good.com\\evil.com')).toBe('#');
    });

    it('should reject http(s) URLs missing the // authority delimiter', () => {
      expect(filters.safeUrl('https:evil.com')).toBe('#');
      expect(filters.safeUrl('http:evil.com')).toBe('#');
      expect(filters.safeUrl('https:/evil.com')).toBe('#');
    });
  });

  describe('currentYear', () => {
    it('should return current year as number', () => {
      const result = filters.currentYear();
      const expected = new Date().getFullYear();

      expect(result).toBe(expected);
    });
  });

  describe('copyrightYear', () => {
    const currentYear = new Date().getFullYear();

    it('should return current year when no startYear provided', () => {
      const result = filters.copyrightYear();

      expect(result).toBe(currentYear.toString());
    });

    it('should return current year when startYear is not a number', () => {
      expect(filters.copyrightYear('invalid')).toBe(currentYear.toString());
      expect(filters.copyrightYear(null)).toBe(currentYear.toString());
    });

    it('should return current year when startYear equals current year', () => {
      const result = filters.copyrightYear(currentYear);

      expect(result).toBe(currentYear.toString());
    });

    it('should return current year when startYear is greater than current year', () => {
      const result = filters.copyrightYear(currentYear + 1);

      expect(result).toBe(currentYear.toString());
    });

    it('should return range when startYear is earlier than current year', () => {
      const result = filters.copyrightYear(2020);

      expect(result).toBe(`2020-${currentYear}`);
    });
  });

  describe('dateToFormat', () => {
    it('should format date according to format string', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const result = filters.dateToFormat(date, 'yyyy-MM-dd');

      expect(result).toBe('2024-03-15');
    });

    it('should handle different format strings', () => {
      const date = new Date('2024-03-15T12:00:00Z');

      expect(filters.dateToFormat(date, 'MMMM d, yyyy')).toBe('March 15, 2024');
      expect(filters.dateToFormat(date, 'dd/MM/yyyy')).toBe('15/03/2024');
    });
  });

  describe('dateToISO', () => {
    it('should return ISO string without offset', () => {
      const date = new Date('2024-03-15T12:30:45.000Z');
      const result = filters.dateToISO(date);

      // The result should be an ISO-like string without timezone offset
      expect(result).toMatch(/^2024-03-15T12:30:45/);
    });
  });

  describe('filterTagList', () => {
    it('should remove system tags', () => {
      const tags = ['javascript', 'all', 'post', 'nav', 'posts', 'tutorial'];
      const result = filters.filterTagList(tags);

      expect(result).toEqual(['javascript', 'tutorial']);
    });

    it('should return empty array for null/undefined', () => {
      expect(filters.filterTagList(null)).toEqual([]);
      expect(filters.filterTagList(undefined)).toEqual([]);
    });

    it('should return empty array when all tags are system tags', () => {
      const tags = ['all', 'nav', 'post', 'posts'];
      const result = filters.filterTagList(tags);

      expect(result).toEqual([]);
    });
  });

  describe('formatTag', () => {
    it('should lowercase and hyphenate tag with # prefix', () => {
      expect(filters.formatTag('JavaScript')).toBe('#javascript');
      expect(filters.formatTag('Another Tag')).toBe('#another-tag');
      // Multiple spaces are collapsed to single hyphen by the regex
      expect(filters.formatTag('Multiple   Spaces')).toBe('#multiple-spaces');
    });
  });

  describe('getKeys', () => {
    it('should return object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = filters.getKeys(obj);

      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  describe('head', () => {
    const array = [1, 2, 3, 4, 5];

    it('should return first n elements for positive n', () => {
      expect(filters.head(array, 3)).toEqual([1, 2, 3]);
      expect(filters.head(array, 1)).toEqual([1]);
    });

    it('should return last n elements for negative n', () => {
      expect(filters.head(array, -2)).toEqual([4, 5]);
      expect(filters.head(array, -1)).toEqual([5]);
    });

    it('should return empty array for empty/invalid input', () => {
      expect(filters.head([], 3)).toEqual([]);
      expect(filters.head(null, 3)).toEqual([]);
      expect(filters.head(undefined, 3)).toEqual([]);
    });

    it('should handle n larger than array length', () => {
      expect(filters.head(array, 10)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('min', () => {
    it('should return minimum value', () => {
      expect(filters.min(3, 1, 4, 1, 5)).toBe(1);
      expect(filters.min(10, 20)).toBe(10);
      expect(filters.min(5)).toBe(5);
    });
  });

  describe('obfuscate', () => {
    it('should convert string to HTML entities', () => {
      const result = filters.obfuscate('abc');

      expect(result).toBe('&#97;&#98;&#99;');
    });

    it('should handle email addresses', () => {
      const result = filters.obfuscate('a@b');

      expect(result).toBe('&#97;&#64;&#98;');
    });
  });

  describe('sortAlphabetically', () => {
    it('should sort strings alphabetically', () => {
      const result = filters.sortAlphabetically(['banana', 'apple', 'cherry']);

      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should not mutate original array', () => {
      const original = ['b', 'a', 'c'];
      const result = filters.sortAlphabetically(original);

      expect(original).toEqual(['b', 'a', 'c']);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle null/undefined', () => {
      expect(filters.sortAlphabetically(null)).toEqual([]);
      expect(filters.sortAlphabetically(undefined)).toEqual([]);
    });
  });

  describe('safeFeatureName', () => {
    it('should return valid feature names unchanged', () => {
      expect(filters.safeFeatureName('code-highlighting')).toBe('code-highlighting');
      expect(filters.safeFeatureName('gallery')).toBe('gallery');
      expect(filters.safeFeatureName('my-feature-2')).toBe('my-feature-2');
    });

    it('should return empty string for path traversal attempts', () => {
      expect(filters.safeFeatureName('../../etc')).toBe('');
      expect(filters.safeFeatureName('foo/bar')).toBe('');
      expect(filters.safeFeatureName('../secret')).toBe('');
    });

    it('should return empty string for non-strings', () => {
      expect(filters.safeFeatureName(null)).toBe('');
      expect(filters.safeFeatureName(undefined)).toBe('');
      expect(filters.safeFeatureName(42)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(filters.safeFeatureName('')).toBe('');
    });

    it('should reject names with special characters', () => {
      expect(filters.safeFeatureName('feature<script>')).toBe('');
      expect(filters.safeFeatureName('name"with"quotes')).toBe('');
      expect(filters.safeFeatureName('name with spaces')).toBe('');
    });
  });

  describe('cssVarKey', () => {
    it('should kebab-case camelCase keys so they match the SCSS var names', () => {
      expect(filters.cssVarKey('linkHover')).toBe('link-hover');
      expect(filters.cssVarKey('textMuted')).toBe('text-muted');
      expect(filters.cssVarKey('linkVisited')).toBe('link-visited');
    });

    it('should pass single-word keys through lowercased', () => {
      expect(filters.cssVarKey('background')).toBe('background');
      expect(filters.cssVarKey('primary')).toBe('primary');
    });

    it('should sanitize unsafe characters to prevent CSS identifier injection', () => {
      expect(filters.cssVarKey('foo;color:red')).toBe('foo-color-red');
      expect(filters.cssVarKey('a}b{c')).toBe('a-b-c');
      expect(filters.cssVarKey('--leading')).toBe('leading');
    });

    it('should handle non-strings', () => {
      expect(filters.cssVarKey(null)).toBe('');
      expect(filters.cssVarKey(undefined)).toBe('');
      expect(filters.cssVarKey(42)).toBe('');
    });
  });

  describe('socialUrl', () => {
    const platforms = {
      twitter: 'https://twitter.com/{account}',
      x: 'https://x.com/{account}',
      github: 'https://github.com/{account}',
      linkedin: 'https://linkedin.com/in/{account}',
      youtube: 'https://youtube.com/@{account}',
      instagram: 'https://instagram.com/{account}',
      mastodon: 'https://{instance}/@{user}',
      bluesky: 'https://bsky.app/profile/{account}',
    };

    it('should return custom url when provided', () => {
      const result = filters.socialUrl({ url: 'https://custom.com/profile' });

      expect(result).toBe('https://custom.com/profile');
    });

    it('should block javascript: protocol in custom URL', () => {
      const result = filters.socialUrl({ url: 'javascript:alert(1)' });

      expect(result).toBe('#');
    });

    it('should block data: protocol in custom URL', () => {
      const result = filters.socialUrl({ url: 'data:text/html,<script>alert(1)</script>' });

      expect(result).toBe('#');
    });

    it('should generate Twitter URL', () => {
      const result = filters.socialUrl({ platform: 'twitter', account: 'username' }, platforms);

      expect(result).toBe('https://twitter.com/username');
    });

    it('should generate X URL', () => {
      const result = filters.socialUrl({ platform: 'x', account: 'username' }, platforms);

      expect(result).toBe('https://x.com/username');
    });

    it('should generate GitHub URL', () => {
      const result = filters.socialUrl({ platform: 'github', account: 'username' }, platforms);

      expect(result).toBe('https://github.com/username');
    });

    it('should generate LinkedIn URL', () => {
      const result = filters.socialUrl({ platform: 'linkedin', account: 'username' }, platforms);

      expect(result).toBe('https://linkedin.com/in/username');
    });

    it('should generate YouTube URL with @ prefix', () => {
      const result = filters.socialUrl({ platform: 'youtube', account: 'channel' }, platforms);

      expect(result).toBe('https://youtube.com/@channel');
    });

    it('should generate Instagram URL', () => {
      const result = filters.socialUrl({ platform: 'instagram', account: 'username' }, platforms);

      expect(result).toBe('https://instagram.com/username');
    });

    it('should handle Mastodon @user@instance format', () => {
      const result = filters.socialUrl(
        { platform: 'mastodon', account: '@user@mastodon.social' },
        platforms,
      );

      expect(result).toBe('https://mastodon.social/@user');
    });

    it('should return template unchanged for Mastodon without @user@instance format', () => {
      const result = filters.socialUrl(
        { platform: 'mastodon', account: 'just-a-handle' },
        platforms,
      );

      // Template has {instance}/@{user} placeholders, not {account}, so replacement is a no-op
      expect(result).toBe('https://{instance}/@{user}');
    });

    it('should generate Bluesky URL', () => {
      const result = filters.socialUrl(
        { platform: 'bluesky', account: 'user.bsky.social' },
        platforms,
      );

      expect(result).toBe('https://bsky.app/profile/user.bsky.social');
    });

    it('should return # for unknown platform', () => {
      const result = filters.socialUrl({ platform: 'unknown', account: 'user' }, platforms);

      expect(result).toBe('#');
    });

    it('should return # when no platform templates provided', () => {
      const result = filters.socialUrl({ platform: 'github', account: 'user' });

      expect(result).toBe('#');
    });

    it('should handle case-insensitive platform names', () => {
      const result = filters.socialUrl({ platform: 'GitHub', account: 'user' }, platforms);

      expect(result).toBe('https://github.com/user');
    });

    it('should block javascript: URL constructed from template replacement', () => {
      const maliciousPlatforms = { evil: 'javascript:{account}' };
      const result = filters.socialUrl(
        { platform: 'evil', account: 'alert(1)' },
        maliciousPlatforms,
      );

      expect(result).toBe('#');
    });

    it('should block data: URL constructed from template replacement', () => {
      const maliciousPlatforms = { evil: 'data:text/html,{account}' };
      const result = filters.socialUrl(
        { platform: 'evil', account: '<script>alert(1)</script>' },
        maliciousPlatforms,
      );

      expect(result).toBe('#');
    });

    it('should block javascript: URL constructed from mastodon template replacement', () => {
      const maliciousPlatforms = { mastodon: 'javascript:{instance}/@{user}' };
      const result = filters.socialUrl(
        { platform: 'mastodon', account: '@user@evil' },
        maliciousPlatforms,
      );

      expect(result).toBe('#');
    });
  });

  describe('socialLabel', () => {
    it('should return custom label when provided', () => {
      const result = filters.socialLabel({ label: 'My Profile' });

      expect(result).toBe('My Profile');
    });

    it('should capitalize platform name', () => {
      expect(filters.socialLabel({ platform: 'twitter' })).toBe('Twitter');
      expect(filters.socialLabel({ platform: 'github' })).toBe('Github');
    });

    it('should handle empty platform', () => {
      const result = filters.socialLabel({});

      expect(result).toBe('');
    });
  });

  describe('socialIcon', () => {
    it('should return an inline currentColor SVG for a known brand', () => {
      const svg = filters.socialIcon('github');

      expect(svg).toContain('<svg');
      expect(svg).toContain('class="social-icon"');
      expect(svg).toContain('fill="currentColor"');
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).toMatch(/<path d="[^"]+"/);
    });

    it('should be case-insensitive', () => {
      expect(filters.socialIcon('GitHub')).toContain('<svg');
    });

    it('should map legacy twitter to the X icon', () => {
      expect(filters.socialIcon('twitter')).toBe(filters.socialIcon('x'));
    });

    it('should render a supplemental icon for brands simple-icons removed', () => {
      // LinkedIn was removed from simple-icons; the theme ships a fallback glyph.
      expect(filters.socialIcon('linkedin')).toContain('<svg');
    });

    it('should return an empty string for unknown platforms (text fallback)', () => {
      expect(filters.socialIcon('not-a-real-platform')).toBe('');
    });

    it('should handle non-strings', () => {
      expect(filters.socialIcon(null)).toBe('');
      expect(filters.socialIcon(undefined)).toBe('');
      expect(filters.socialIcon(42)).toBe('');
    });
  });
});
