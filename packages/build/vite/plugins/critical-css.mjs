import fs from 'fs/promises';

import Beasties from 'beasties';

import { processFiles } from '../utils/file-processor.mjs';
import { GLOB_PATTERNS } from '../utils/constants.mjs';

export async function generateCriticalCSS(outputDir, options = {}) {
  // beasties is the maintained drop-in fork of the deprecated `critters`.
  // pruneSource stays off: Beasties under-detects some rules (`:root` custom-prop
  // bridges, id/element/`:has()` selectors) and would delete them from the linked
  // stylesheet without inlining them, silently dropping styles in production.
  const beasties = new Beasties({
    path: outputDir,
    publicPath: '/',
    inlineFonts: true,
    pruneSource: false,
    mergeStylesheets: true,
    compress: true,
    logLevel: 'warn',
    ...options,
  });

  return processFiles({
    pattern: GLOB_PATTERNS.html(outputDir),
    outputDir,
    taskName: 'Critical CSS',
    errorTip: 'Check if CSS files exist and are properly linked in HTML',
    processor: async (file) => {
      const html = await fs.readFile(file, 'utf-8');
      const inlined = await beasties.process(html);
      await fs.writeFile(file, inlined);
    },
  });
}
