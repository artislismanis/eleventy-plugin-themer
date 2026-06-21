/**
 * Social link URL expansion (framework-owned data logic).
 *
 * Expands a `site.social[]` entry into a profile URL using the platform
 * templates (core's `SOCIAL_PLATFORMS` plus any theme extensions). This is the
 * *data* half of social rendering; the *presentation* half (icons, labels,
 * URL-protocol escaping) stays theme-side. Registered as the `socialUrl` filter
 * by `eleventyPluginThemer`, so templates call `social | socialUrl | safeUrl`.
 */

/**
 * @param {{ platform?: string, account?: string, url?: string }} social
 * @param {Record<string, string>} platforms - platform → URL template table.
 * @returns {string} A resolved URL, or '#' when it cannot be expanded.
 */
export function expandSocialUrl(social, platforms = {}) {
  if (!social) return '#';

  // Explicit URL wins over account expansion.
  if (social.url) return social.url;

  const platform = (social.platform || '').toLowerCase();
  const account = social.account || '';
  if (!platform || !account) return '#';

  const template = platforms[platform];
  if (!template) return '#';

  // Mastodon handles are instance-specific: `@user@instance.social`.
  if (platform === 'mastodon' && account.startsWith('@')) {
    const parts = account.slice(1).split('@');
    if (parts.length === 2) {
      return template.replace('{instance}', parts[1]).replace('{user}', parts[0]);
    }
  }

  return template.replace('{account}', account);
}
