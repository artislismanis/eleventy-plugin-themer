// defaultTheme 'light' so the toggle flips to 'dark' deterministically.
// The copyright carries an injection payload to verify it renders inert.
export default {
  themeToggle: { defaultTheme: 'light', showToggle: true },
  footer: {
    copyright: '<img src=x onerror="window.__xss=1"> (c) {year} {site.title}',
    showPoweredBy: true,
    showGitSha: false,
  },
};
