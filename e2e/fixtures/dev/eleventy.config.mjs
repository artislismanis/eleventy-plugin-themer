import path from 'path';
import { fileURLToPath } from 'url';

import { configureThemer } from '../_shared/eleventy.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function (eleventyConfig) {
  const { dir } = await configureThemer(eleventyConfig, { projectRoot: __dirname });

  // Polling watch — reliable under WSL/containers where inotify is flaky.
  eleventyConfig.setChokidarConfig({ usePolling: true, interval: 100 });
  eleventyConfig.addWatchTarget('./content/**/*.*');

  return {
    dir,
    templateFormats: ['md', 'njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
