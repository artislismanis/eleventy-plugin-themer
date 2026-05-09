export default {
  '*.{js,mjs}': ['eslint --fix', 'prettier --write'],
  '*.scss': ['stylelint --fix', 'prettier --write'],
  '*.{json,md,njk,yml,yaml}': 'prettier --write',
};
