import { describe, it, expect } from 'vitest';

import { expandSocialUrl } from '../lib/social.mjs';
import { SOCIAL_PLATFORMS } from '../lib/defaults.mjs';

describe('expandSocialUrl', () => {
  it('returns an explicit url unchanged (protocol safety is the theme safeUrl filter)', () => {
    expect(expandSocialUrl({ url: 'https://custom.com/me' }, SOCIAL_PLATFORMS)).toBe(
      'https://custom.com/me',
    );
  });

  it('prefers url over account', () => {
    expect(
      expandSocialUrl({ platform: 'github', account: 'x', url: '/feed.xml' }, SOCIAL_PLATFORMS),
    ).toBe('/feed.xml');
  });

  it('expands account against the platform table', () => {
    expect(expandSocialUrl({ platform: 'github', account: 'octocat' }, SOCIAL_PLATFORMS)).toBe(
      'https://github.com/octocat',
    );
    expect(expandSocialUrl({ platform: 'youtube', account: 'chan' }, SOCIAL_PLATFORMS)).toBe(
      'https://youtube.com/@chan',
    );
  });

  it('is case-insensitive on platform', () => {
    expect(expandSocialUrl({ platform: 'GitHub', account: 'octocat' }, SOCIAL_PLATFORMS)).toBe(
      'https://github.com/octocat',
    );
  });

  it('handles mastodon @user@instance', () => {
    expect(
      expandSocialUrl({ platform: 'mastodon', account: '@me@fosstodon.org' }, SOCIAL_PLATFORMS),
    ).toBe('https://fosstodon.org/@me');
  });

  it('returns # for unknown platform, missing account, or null input', () => {
    expect(expandSocialUrl({ platform: 'nope', account: 'x' }, SOCIAL_PLATFORMS)).toBe('#');
    expect(expandSocialUrl({ platform: 'github' }, SOCIAL_PLATFORMS)).toBe('#');
    expect(expandSocialUrl(null, SOCIAL_PLATFORMS)).toBe('#');
  });
});
