/**
 * Generic file processor utility for build optimization plugins
 *
 * Provides consistent error handling, logging, and reporting across all plugins.
 * Follows DRY principle by extracting common file processing patterns.
 */

import path from 'path';

import { glob } from 'glob';
import { logger } from '@eleventy-plugin-themer/core/logger';

/**
 * Process files with consistent error handling and logging
 *
 * @param {Object} options - Processing options
 * @param {string|string[]} options.pattern - Glob pattern(s) for files to process
 * @param {string} options.outputDir - Output directory (for relative path logging)
 * @param {Function} options.processor - Async function to process each file
 *   Signature: async (file) => { message?: string, stats?: object }
 * @param {string} options.taskName - Name of the task (for logging)
 * @param {Function} [options.calculateStats] - Optional function to calculate summary stats
 *   Signature: (results) => { metricName: value, ... }
 * @param {string} [options.errorTip] - Optional tip to show when errors occur
 * @returns {Promise<{success: boolean, processed: number, errors: Array}>}
 *
 * @example
 * await processFiles({
 *   pattern: `./${outputDir}/assets/css/*.css`,
 *   outputDir,
 *   taskName: 'PurgeCSS',
 *   processor: async (file) => {
 *     // Process the file
 *     return { message: ' (50% smaller)' };
 *   },
 *   calculateStats: (results) => ({
 *     'total reduction': '45%'
 *   }),
 * });
 */
export async function processFiles({
  pattern,
  outputDir,
  processor,
  taskName = 'Processing',
  calculateStats,
  errorTip,
}) {
  logger.info(`\n📦 ${taskName}...\n`);

  // Find files to process
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  let files = [];
  for (const p of patterns) {
    const matches = await glob(p);
    files = files.concat(matches);
  }

  // Remove duplicates
  files = [...new Set(files)];

  if (files.length === 0) {
    logger.info(`⚠️  ${taskName}: No files found to process`);
    return { success: true, processed: 0, errors: [] };
  }

  const results = [];
  const errors = [];

  // Process each file
  for (const file of files) {
    try {
      const result = await processor(file);
      results.push({ file, ...(result || {}) });

      const relativePath = path.relative(outputDir, file);
      const message = result?.message || '';
      logger.info(`✓ ${relativePath}${message}`);
    } catch (error) {
      const relativePath = path.relative(outputDir, file);
      errors.push({
        file: relativePath,
        error: error.message,
      });
      logger.error(`✗ ${relativePath}: ${error.message}`);
    }
  }

  // Calculate summary statistics
  let statsStr = '';
  if (calculateStats && results.length > 0) {
    const stats = calculateStats(results);
    if (stats && Object.keys(stats).length > 0) {
      statsStr =
        ', ' +
        Object.entries(stats)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
    }
  }

  // Log summary
  logger.info(
    `\n✓ ${taskName} completed: ${results.length}/${files.length} files${statsStr}${errors.length > 0 ? `, ${errors.length} failed` : ''}\n`,
  );

  // Report errors
  if (errors.length > 0) {
    logger.error(`\n❌ ${taskName} Errors:`);
    errors.forEach(({ file, error }) => {
      logger.error(`   ${file}: ${error}`);
    });

    if (errorTip) {
      logger.error(`\n💡 Tip: ${errorTip}\n`);
    }

    throw new Error(`${taskName} failed for ${errors.length} file(s). See errors above.`);
  }

  return { success: true, processed: results.length, errors: [] };
}
