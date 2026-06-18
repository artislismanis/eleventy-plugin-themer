// Invalid Prism theme via user override — now reaches the build (merged config)
// and fails at the prism-theme vite plugin, listing available themes.
export default {
	codeHighlighting: { prismTheme: 'prism-dracula' },
};
