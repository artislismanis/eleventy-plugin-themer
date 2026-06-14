import path from 'path';
import { fileURLToPath } from 'url';

import { configureThemer } from '../_shared/eleventy.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function (eleventyConfig) {
  const { dir } = await configureThemer(eleventyConfig, {
    projectRoot: __dirname,
    optimizations: {
      // Site safelist merges on top of the theme's theme.json safelist.
      purgeCSS: { safelist: { standard: [/^e2e-keep-/] } },
      criticalCSS: true,
      minifyHTML: true,
      validateLinks: true,
      preserveNonHtml: { extensions: ['xml', 'txt', 'xsl'] },
    },
  });

  return {
    dir,
    templateFormats: ['md', 'njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
