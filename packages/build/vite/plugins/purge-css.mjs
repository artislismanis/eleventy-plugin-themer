import fs from 'fs/promises';

import { PurgeCSS } from 'purgecss';

import { processFiles } from '../utils/file-processor.mjs';
import { GLOB_PATTERNS } from '../utils/constants.mjs';

export async function purgeCSSFiles(outputDir, options = {}) {
  const { safelist: extraSafelist = {} } = options;

  // Default safelist — generic patterns the build plugin always preserves
  // Theme-specific patterns belong in theme.json under build.purgeCSS.safelist
  const defaultSafelist = {
    standard: [/^is-/, /^has-/, /^js-/, /^page-/],
    deep: [],
    greedy: [],
  };

  // Merge theme/user safelist with defaults (strings become RegExp)
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const toRegExp = (v) => (v instanceof RegExp ? v : new RegExp(escapeRegExp(v)));
  const mergedSafelist = {
    standard: [...defaultSafelist.standard, ...(extraSafelist.standard || []).map(toRegExp)],
    deep: [...defaultSafelist.deep, ...(extraSafelist.deep || []).map(toRegExp)],
    greedy: [...defaultSafelist.greedy, ...(extraSafelist.greedy || []).map(toRegExp)],
  };

  // outputDir is guaranteed to be provided by the orchestrator
  return processFiles({
    pattern: GLOB_PATTERNS.css(outputDir),
    outputDir,
    taskName: 'PurgeCSS',
    processor: async (file) => {
      const stat = await fs.stat(file);
      const originalSize = stat.size;

      const results = await new PurgeCSS().purge({
        content: [GLOB_PATTERNS.html(outputDir)],
        css: [file],
        safelist: mergedSafelist,
        defaultExtractor: (content) => {
          const matches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          return matches;
        },
        keyframes: true,
        fontFace: true,
        variables: true,
        rejected: false,
        rejectedCss: false,
      });

      await fs.writeFile(file, results[0].css);

      const newStat = await fs.stat(file);
      const newSize = newStat.size;
      const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);

      return {
        message: ` (${reduction}% smaller)`,
        stats: { originalSize, newSize, reduction },
      };
    },
  });
}
