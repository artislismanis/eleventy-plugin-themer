import path from 'path';
import { fileURLToPath } from 'url';

import { configureThemer } from '../_shared/eleventy.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function (eleventyConfig) {
  // Documented consumer pattern (mirrors the starter): exclude drafts from
  // production builds. Draft exclusion is consumer code, not plugin behavior.
  eleventyConfig.addPreprocessor('drafts', '*', (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === 'build') {
      return false;
    }
  });

  const { dir } = await configureThemer(eleventyConfig, { projectRoot: __dirname });
  return {
    dir,
    templateFormats: ['md', 'njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
