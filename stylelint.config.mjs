/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  overrides: [{ files: ['**/*.scss'], customSyntax: 'postcss-scss' }],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/_site/**',
    '**/coverage/**',
    '**/*.min.css',
  ],
  rules: {
    'selector-not-notation': 'simple',
    'selector-class-pattern': null, // BEM naming
    'no-descending-specificity': null, // Impractical for component styles
    'scss/comment-no-empty': null, // Allow empty comments for visual spacing
  },
};
