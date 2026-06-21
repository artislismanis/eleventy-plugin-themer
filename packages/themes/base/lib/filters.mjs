import { DateTime } from 'luxon';
import * as simpleIcons from 'simple-icons';

import {
  escapeHtml as _escapeHtml,
  escapeCssValue as _escapeCssValue,
  safeUrl as _safeUrl,
} from './escape.mjs';

// Index every simple-icons brand by its slug once at module load. Each icon
// object exposes { title, slug, hex, path, ... }; we only need slug -> path.
const ICON_BY_SLUG = (() => {
  const map = new Map();
  for (const key of Object.keys(simpleIcons)) {
    const icon = simpleIcons[key];
    if (icon && typeof icon === 'object' && icon.slug && icon.path) {
      map.set(icon.slug, icon.path);
    }
  }
  return map;
})();

// Map a platform name to its simple-icons slug where they differ. Twitter's glyph
// was retired in favour of X, so legacy `twitter` config resolves to the X icon.
const PLATFORM_SLUG_ALIASES = { twitter: 'x' };

// Brands simple-icons has removed at the owner's request but that are common
// enough to ship a fallback glyph for (24x24 viewBox path data).
const SUPPLEMENTAL_ICON_PATHS = {
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
};

// Trusted SVG wrapper: path data comes from simple-icons / our supplemental map
// (never user input). fill=currentColor lets the glyph inherit the link colour.
function buildSocialSvg(path) {
  return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
}

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

  /**
   * Convert a theme config key to a safe CSS custom-property segment:
   * camelCase → kebab-case, lowercased, with any unsafe characters reduced to
   * hyphens. Used when injecting theme color tokens so multi-word keys
   * (linkHover, textMuted, linkVisited) map to the hyphenated var names the
   * SCSS reads (e.g. `--theme-light-link-hover`). Also sanitizes the key to
   * prevent CSS-identifier injection via config keys.
   */
  cssVarKey: function (key) {
    if (typeof key !== 'string') return '';
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  // Note: the `socialUrl` filter (account → profile-URL expansion) is provided
  // by @eleventy-plugin-themer/core, which owns the canonical platform table.
  // Templates pipe its result through `safeUrl` for protocol validation.

  // Inline brand SVG for a social platform (currentColor, accessible). Returns
  // '' when the platform has no known icon, so the template can fall back to text.
  socialIcon: function (platform) {
    if (typeof platform !== 'string' || !platform) return '';
    const key = platform.toLowerCase();
    const slug = PLATFORM_SLUG_ALIASES[key] || key;
    const path = ICON_BY_SLUG.get(slug) || SUPPLEMENTAL_ICON_PATHS[slug];
    return path ? buildSocialSvg(path) : '';
  },

  // Generate display label for social link
  socialLabel: function (social) {
    if (social.label) return social.label;
    // Capitalize platform name
    const platform = social.platform || '';
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  },
};
