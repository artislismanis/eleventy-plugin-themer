import { DateTime } from 'luxon';

import {
  escapeHtml as _escapeHtml,
  escapeCssValue as _escapeCssValue,
  safeUrl as _safeUrl,
} from './escape.mjs';

export default {
  // Security filters
  escapeHtml: (str) => _escapeHtml(str),
  escapeAttr: (str) => _escapeHtml(str),
  escapeCssValue: (str) => _escapeCssValue(str),
  escapeJsString: function (str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  },
  safeUrl: (url) => _safeUrl(url),

  currentYear: function () {
    return new Date().getFullYear();
  },

  copyrightYear: function (startYear) {
    const currentYear = new Date().getFullYear();
    // If no startYear provided, or it's invalid, just return current year
    if (!startYear || typeof startYear !== 'number' || startYear >= currentYear) {
      return currentYear.toString();
    }
    // Otherwise show range: "2024-2026"
    return `${startYear}-${currentYear}`;
  },

  dateToFormat: function (date, format) {
    return DateTime.fromJSDate(date, { zone: 'utc' }).toFormat(String(format));
  },

  dateToISO: function (date) {
    return DateTime.fromJSDate(date, { zone: 'utc' }).toISO({
      includeOffset: false,
      suppressMilliseconds: true,
    });
  },

  filterTagList(tags) {
    return (tags || []).filter((tag) => ['all', 'nav', 'post', 'posts'].indexOf(tag) === -1);
  },

  /**
   * Format a tag for display: lowercase, hyphenated, with # prefix
   * "Another Tag" → "#another-tag"
   */
  formatTag(tag) {
    return '#' + tag.toLowerCase().replace(/\s+/g, '-');
  },

  getKeys: function (target) {
    return Object.keys(target);
  },

  head: function (array, n) {
    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if (n < 0) {
      return array.slice(n);
    }

    return array.slice(0, n);
  },

  min: function (...numbers) {
    return Math.min.apply(null, numbers);
  },

  obfuscate: function (str) {
    const chars = [];
    for (let i = str.length - 1; i >= 0; i--) {
      chars.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
    }
    return chars.join('');
  },

  // Fixed: was missing return statement and had parameters reversed
  sortAlphabetically: function (strings) {
    return [...(strings || [])].sort((a, b) => a.localeCompare(b));
  },

  /**
   * Validate feature name for safe use in script src attributes.
   * Only allows alphanumeric characters and hyphens.
   */
  safeFeatureName: function (name) {
    if (typeof name !== 'string' || !name) return '';
    return /^[a-z0-9-]+$/i.test(name) ? name : '';
  },

  // Social network URL generator (data-driven via theme.config.socialPlatforms)
  socialUrl: function (social, platformTemplates) {
    // Custom URL takes precedence (with protocol validation)
    if (social.url) return _safeUrl(social.url);

    const platform = (social.platform || '').toLowerCase();
    const account = social.account || '';

    if (!platform || !account) return '#';

    const template = platformTemplates?.[platform];
    if (!template) return '#';

    // Handle mastodon @user@instance.social format
    if (platform === 'mastodon' && account.startsWith('@')) {
      const parts = account.slice(1).split('@');
      if (parts.length === 2) {
        return _safeUrl(template.replace('{instance}', parts[1]).replace('{user}', parts[0]));
      }
    }

    return _safeUrl(template.replace('{account}', account));
  },

  // Generate display label for social link
  socialLabel: function (social) {
    if (social.label) return social.label;
    // Capitalize platform name
    const platform = social.platform || '';
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  },
};
