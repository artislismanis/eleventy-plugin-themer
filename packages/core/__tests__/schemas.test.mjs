import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/cascade/features.mjs', () => ({
  getAvailableFeatures: vi.fn(),
}));

import { getAvailableFeatures } from '../lib/cascade/features.mjs';
import {
  themeConfigSchema,
  featuresFrontMatterSchema,
  formatZodIssues,
  siteDataSchema,
  capabilitiesSchema,
  siteCapabilityWarnings,
} from '../lib/schemas.mjs';

describe('schemas.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('themeConfigSchema', () => {
    const metadata = {
      config: {
        analytics: { id: 'UA-1' },
        codeHighlighting: { prismTheme: 'prism-tomorrow' },
      },
    };

    it('accepts user config with known top-level keys', () => {
      const schema = themeConfigSchema(metadata);
      const result = schema.safeParse({
        analytics: { id: 'UA-2' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects unknown top-level keys (strict)', () => {
      const schema = themeConfigSchema(metadata);
      const result = schema.safeParse({ analytisc: { id: 'typo' } });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
    });

    it('allows arbitrary nested shapes (inner unconstrained)', () => {
      const schema = themeConfigSchema(metadata);
      const result = schema.safeParse({
        analytics: { anything: { goes: [1, 2, 3] } },
      });
      expect(result.success).toBe(true);
    });

    it('handles missing themeMetadata gracefully', () => {
      const schema = themeConfigSchema(undefined);
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ extra: true }).success).toBe(false);
    });

    it('handles themeMetadata without config gracefully', () => {
      const schema = themeConfigSchema({});
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ extra: true }).success).toBe(false);
    });

    it('skips unsafe keys (__proto__, constructor, prototype) when building schema shape', () => {
      // Simulate a theme config delivered via JSON.parse (which produces a
      // real own-property `__proto__`, not a prototype redirect).
      const config = Object.fromEntries([
        ['analytics', { id: 'UA-1' }],
        ['__proto__', { polluted: 'leak' }],
        ['constructor', { polluted: 'leak' }],
        ['prototype', { polluted: 'leak' }],
      ]);

      // Should not throw, should not mutate Object.prototype.
      expect(() => themeConfigSchema({ config })).not.toThrow();
      expect(Object.prototype.polluted).toBeUndefined();
      expect({}.polluted).toBeUndefined();

      // The legitimate key still works.
      const schema = themeConfigSchema({ config });
      expect(schema.safeParse({ analytics: {} }).success).toBe(true);
    });
  });

  describe('featuresFrontMatterSchema', () => {
    it('accepts a single valid feature name', () => {
      getAvailableFeatures.mockReturnValue(
        new Map([
          ['code-highlighting', {}],
          ['gallery', {}],
        ]),
      );
      const schema = featuresFrontMatterSchema('/p', { name: 't' }, {});
      expect(schema.safeParse('gallery').success).toBe(true);
    });

    it('accepts an array of valid feature names', () => {
      getAvailableFeatures.mockReturnValue(
        new Map([
          ['code-highlighting', {}],
          ['gallery', {}],
        ]),
      );
      const schema = featuresFrontMatterSchema('/p', { name: 't' }, {});
      expect(schema.safeParse(['code-highlighting', 'gallery']).success).toBe(true);
    });

    it('rejects unknown feature names with helpful message', () => {
      getAvailableFeatures.mockReturnValue(new Map([['gallery', {}]]));
      const schema = featuresFrontMatterSchema('/p', { name: 't' }, {});
      const result = schema.safeParse('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Available: gallery');
    });

    it('treats empty feature set as permissive (string or string[])', () => {
      getAvailableFeatures.mockReturnValue(new Map());
      const schema = featuresFrontMatterSchema('/p', { name: 't' }, {});
      expect(schema.safeParse('anything').success).toBe(true);
      expect(schema.safeParse(['a', 'b']).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
    });

    it('treats undefined as valid (optional field)', () => {
      getAvailableFeatures.mockReturnValue(new Map([['gallery', {}]]));
      const schema = featuresFrontMatterSchema('/p', { name: 't' }, {});
      expect(schema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('siteDataSchema', () => {
    it('accepts well-formed site data and passes identity fields through', () => {
      const result = siteDataSchema.safeParse({
        title: 'My site',
        url: 'https://example.com/',
        author: { name: 'A', email: 'a@b.c' },
        social: [{ platform: 'github', account: 'octocat' }],
        analytics: { plausible: 'example.com' },
        branding: { favicon: '/favicon.svg' },
        comments: { provider: 'disqus', disqus: { shortname: 'x' } },
        features: { rss: true, search: false },
      });
      expect(result.success).toBe(true);
    });

    it('hard-fails on a malformed social entry (missing platform)', () => {
      const result = siteDataSchema.safeParse({ social: [{ account: 'nobody' }] });
      expect(result.success).toBe(false);
    });

    it('hard-fails when a known key has the wrong type', () => {
      const result = siteDataSchema.safeParse({ social: 'not-an-array' });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown comments provider', () => {
      const result = siteDataSchema.safeParse({ comments: { provider: 'facebook' } });
      expect(result.success).toBe(false);
    });

    it('treats all contract keys as optional', () => {
      expect(siteDataSchema.safeParse({ title: 'only identity' }).success).toBe(true);
    });
  });

  describe('capabilitiesSchema', () => {
    it('accepts a well-formed declaration', () => {
      const result = capabilitiesSchema.safeParse({
        social: { render: 'icons', fallback: 'text' },
        analytics: ['googleAnalytics', 'plausible'],
        comments: ['disqus'],
        search: false,
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-array analytics list', () => {
      expect(capabilitiesSchema.safeParse({ analytics: 'ga' }).success).toBe(false);
    });
  });

  describe('siteCapabilityWarnings', () => {
    const capabilities = {
      social: { render: 'icons', fallback: 'text' },
      analytics: ['plausible'],
      comments: ['disqus'],
      search: false,
    };

    it('returns no warnings when the theme implements everything requested', () => {
      const warnings = siteCapabilityWarnings(
        { analytics: { plausible: 'x' }, comments: { provider: 'disqus' } },
        capabilities,
      );
      expect(warnings).toEqual([]);
    });

    it('warns for an analytics provider the theme does not declare', () => {
      const warnings = siteCapabilityWarnings(
        { analytics: { googleAnalytics: 'G-1' } },
        capabilities,
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('googleAnalytics');
    });

    it('warns for a comments provider the theme does not implement', () => {
      const warnings = siteCapabilityWarnings({ comments: { provider: 'giscus' } }, capabilities);
      expect(warnings[0]).toContain('giscus');
    });

    it('does not warn when comments are off (provider none)', () => {
      expect(siteCapabilityWarnings({ comments: { provider: 'none' } }, capabilities)).toEqual([]);
    });

    it('warns when search is requested but unsupported', () => {
      const warnings = siteCapabilityWarnings({ features: { search: true } }, capabilities);
      expect(warnings[0]).toContain('search');
    });
  });

  describe('formatZodIssues', () => {
    it('formats a single root-level issue', () => {
      const error = {
        issues: [{ path: [], message: 'Required' }],
      };
      expect(formatZodIssues(error)).toBe('  - <root>: Required');
    });

    it('formats nested-path issues', () => {
      const error = {
        issues: [{ path: ['analytics', 'id'], message: 'Expected string' }],
      };
      expect(formatZodIssues(error)).toBe('  - analytics.id: Expected string');
    });

    it('joins multiple issues with newlines', () => {
      const error = {
        issues: [
          { path: ['a'], message: 'first' },
          { path: ['b', 'c'], message: 'second' },
        ],
      };
      expect(formatZodIssues(error)).toBe('  - a: first\n  - b.c: second');
    });
  });
});
