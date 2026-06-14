import path from 'path';
import { fileURLToPath } from 'url';

import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Registers the vite adapter WITHOUT registering the core plugin first, so no
// themer context is stashed -> the adapter throws at init.
export default async function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyPluginThemerVite, {
    theme: '@eleventy-plugin-themer/theme-base',
    projectRoot: __dirname,
  });
  return { dir: { input: 'content', output: '_site' }, templateFormats: ['md', 'njk'] };
}
