import { defineThemeConfig } from '@eleventy-plugin-themer/core';

// Data overrides validated against theme.json#config (strict top-level keys).
export default defineThemeConfig({
  themeToggle: { defaultTheme: 'dark', showToggle: true },
  codeHighlighting: { prismTheme: 'prism-okaidia', diffHighlight: true },
  footer: { copyright: '© {year} {site.title}', showPoweredBy: true, showGitSha: false },
});
