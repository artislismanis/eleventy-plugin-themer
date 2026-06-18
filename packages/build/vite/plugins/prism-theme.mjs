/**
 * Vite plugin for config-driven PrismJS theme loading
 *
 * Provides a virtual module `virtual:prism-theme` that resolves to
 * the configured PrismJS theme CSS and optional diff-highlight plugin.
 *
 * Theme is configured via theme.json `config.codeHighlighting.prismTheme`.
 * Users override in their `theme.config.mjs`.
 */

const VIRTUAL_MODULE_ID = 'virtual:prism-theme';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

/**
 * Valid PrismJS theme names (bundled with prismjs package)
 */
const VALID_THEMES = new Set([
  'prism',
  'prism-coy',
  'prism-dark',
  'prism-funky',
  'prism-okaidia',
  'prism-solarizedlight',
  'prism-tomorrow',
  'prism-twilight',
]);

/**
 * @param {Object} options
 * @param {string} [options.prismTheme='prism-tomorrow'] - PrismJS theme name (without .css)
 * @param {boolean} [options.diffHighlight=true] - Include diff-highlight plugin CSS
 * @returns {import('vite').Plugin}
 */
export function prismThemePlugin(options = {}) {
  const { prismTheme = 'prism-tomorrow', diffHighlight = true } = options;

  if (!VALID_THEMES.has(prismTheme)) {
    const available = [...VALID_THEMES].join(', ');
    throw new Error(`[prism-theme] Invalid theme "${prismTheme}". Available themes: ${available}`);
  }

  return {
    name: 'eleventy-themes-prism-theme',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        let code = `import 'prismjs/themes/${prismTheme}.css';\n`;
        if (diffHighlight) {
          code += `import 'prismjs/plugins/diff-highlight/prism-diff-highlight.css';\n`;
        }
        return code;
      }
    },
  };
}
