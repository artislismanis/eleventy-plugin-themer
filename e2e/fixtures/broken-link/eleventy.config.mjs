import path from 'path';
import { fileURLToPath } from 'url';

import { configureThemer } from '../_shared/eleventy.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function (eleventyConfig) {
  const { dir } = await configureThemer(eleventyConfig, {
    projectRoot: __dirname,
    optimizations: { validateLinks: true },
  });
  return { dir, templateFormats: ['md', 'njk'] };
}
