import fs from 'fs/promises';

import Critters from 'critters';

import { processFiles } from '../utils/file-processor.mjs';
import { GLOB_PATTERNS } from '../utils/constants.mjs';

export async function generateCriticalCSS(outputDir, options = {}) {
  const critters = new Critters({
    path: outputDir,
    publicPath: '/',
    inlineFonts: true,
    pruneSource: true,
    mergeStylesheets: true,
    compress: true,
    logLevel: 'warn', // Only show warnings/errors from Critters
    ...options,
  });

  return processFiles({
    pattern: GLOB_PATTERNS.html(outputDir),
    outputDir,
    taskName: 'Critical CSS',
    errorTip: 'Check if CSS files exist and are properly linked in HTML',
    processor: async (file) => {
      const html = await fs.readFile(file, 'utf-8');
      const inlined = await critters.process(html);
      await fs.writeFile(file, inlined);
    },
  });
}
