/**
 * Preserve Non-HTML Files
 * Copies non-HTML files (XML, TXT, XSL) from Vite temp folder to output
 * Ensures feed files and other static assets are included in build
 */

import fs from 'fs/promises';
import path from 'path';

import { glob } from 'glob';
import { logger } from '@eleventy-plugin-themer/core/logger';

/**
 * Copy non-HTML files from .11ty-vite to _site
 * @param {string} outputDir - Output directory (default: '_site')
 * @param {Object} options - Configuration options
 * @param {string} options.temp - Vite temp directory (required)
 * @param {string[]} options.extensions - File extensions to preserve (default: [])
 */
export async function preserveNonHtmlFiles(outputDir, options = {}) {
  const { temp: tempDir, extensions = [] } = options;

  if (!tempDir) {
    logger.warn('⚠️  preserveNonHtmlFiles: tempDir option is required');
    return;
  }

  if (extensions.length === 0) {
    return;
  }

  logger.info('\n📋 Preserving non-HTML files...\n');

  const pattern = `${tempDir}/**/*.{${extensions.join(',')}}`;
  const files = await glob(pattern);

  if (files.length === 0) {
    logger.info('   No non-HTML files to preserve\n');
    return;
  }

  let copiedCount = 0;

  for (const file of files) {
    const dest = path.join(outputDir, path.relative(tempDir, file));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(file, dest);
    copiedCount++;

    const relativePath = path.relative(outputDir, dest);
    logger.info(`   ✓ ${relativePath}`);
  }

  logger.info(`\n✅ Preserved ${copiedCount} non-HTML file(s)\n`);
}
