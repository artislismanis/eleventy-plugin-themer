/**
 * Link Validation
 * Validates internal links and images after build
 * Catches broken links before deployment
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

import { glob } from 'glob';
import { parse } from 'node-html-parser';
import { logger } from '@eleventy-plugin-themer/core/logger';

import { GLOB_PATTERNS } from '../utils/constants.mjs';

/**
 * Check resources (links or images) in parsed HTML for broken references
 *
 * @param {Object} root - Parsed HTML root from node-html-parser
 * @param {Object} options
 * @param {string} options.selector - CSS selector (e.g., 'a[href]', 'img[src]')
 * @param {string} options.attribute - Attribute to check (e.g., 'href', 'src')
 * @param {string[]} options.skipPrefixes - URL prefixes to skip
 * @param {string} options.errorType - Error type label (e.g., 'broken-link', 'missing-image')
 * @param {string} options.errorPrefix - Error message prefix
 * @param {string} options.outputDir - Build output directory
 * @param {string} options.baseDir - Directory of the HTML file
 * @param {string} options.relativePath - Relative path of the HTML file
 * @returns {{ count: number, errors: Array }}
 */
function checkResources(root, options) {
  const {
    selector,
    attribute,
    skipPrefixes,
    errorType,
    errorPrefix,
    outputDir,
    baseDir,
    relativePath,
  } = options;

  const elements = root.querySelectorAll(selector);
  const errors = [];
  let count = 0;

  for (const el of elements) {
    const value = el.getAttribute(attribute);
    if (!value || skipPrefixes.some((prefix) => value.startsWith(prefix))) {
      continue;
    }

    count++;

    const cleanValue = value.split('#')[0].split('?')[0];

    let targetPath;
    if (cleanValue.startsWith('/')) {
      targetPath = path.join(outputDir, cleanValue);
    } else {
      targetPath = path.join(baseDir, cleanValue);
    }

    const fileExists = existsSync(targetPath);
    const indexExists = !fileExists && existsSync(path.join(targetPath, 'index.html'));

    if (!fileExists && !indexExists) {
      errors.push({
        file: relativePath,
        type: errorType,
        target: value,
        message: `${errorPrefix}: ${value}`,
      });
    }
  }

  return { count, errors };
}

const LINK_SKIP_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', '#'];
const IMAGE_SKIP_PREFIXES = ['http://', 'https://', 'data:'];

/**
 * Validate links and images in built HTML.
 * Throws an error if validation fails.
 * @param {string} outputDir - Output directory to validate
 * @param {Object} options - Validation options (currently unused but reserved)
 */
export async function validateLinks(outputDir, _options = {}) {
  logger.info('\n🔗 Validating links and images...\n');

  const htmlFiles = await glob(GLOB_PATTERNS.html(outputDir));

  const errors = [];
  let totalLinks = 0;
  let totalImages = 0;

  for (const htmlFile of htmlFiles) {
    try {
      const html = await fs.readFile(htmlFile, 'utf-8');
      const root = parse(html);

      const relativePath = path.relative(outputDir, htmlFile);
      const baseDir = path.dirname(htmlFile);
      const common = { outputDir, baseDir, relativePath };

      const links = checkResources(root, {
        ...common,
        selector: 'a[href]',
        attribute: 'href',
        skipPrefixes: LINK_SKIP_PREFIXES,
        errorType: 'broken-link',
        errorPrefix: 'Broken internal link',
      });

      const images = checkResources(root, {
        ...common,
        selector: 'img[src]',
        attribute: 'src',
        skipPrefixes: IMAGE_SKIP_PREFIXES,
        errorType: 'missing-image',
        errorPrefix: 'Missing image',
      });

      totalLinks += links.count;
      totalImages += images.count;
      errors.push(...links.errors, ...images.errors);
    } catch (error) {
      errors.push({
        file: path.relative(outputDir, htmlFile),
        type: 'parse-error',
        message: `Failed to parse HTML: ${error.message}`,
      });
    }
  }

  // Report results
  if (errors.length > 0) {
    logger.error(`❌ Link validation failed: ${errors.length} errors found\n`);

    const grouped = {
      'broken-link': { icon: '🔗', label: 'Broken Links' },
      'missing-image': { icon: '🖼️ ', label: 'Missing Images' },
      'parse-error': { icon: '⚠️ ', label: 'Parse Errors' },
    };

    for (const [type, { icon, label }] of Object.entries(grouped)) {
      const items = errors.filter((e) => e.type === type);
      if (items.length === 0) continue;

      logger.error(`\n${icon} ${label} (${items.length}):`);
      items.forEach(({ file, target, message }) => {
        logger.error(`   ${file}${target ? ` → ${target}` : `: ${message}`}`);
      });
    }

    logger.error('\n💡 Tip: Fix broken links and missing images before deployment\n');

    throw new Error(`Link validation failed with ${errors.length} error(s). Fix issues above.`);
  }

  logger.info(`✅ Link validation passed: ${totalLinks} links, ${totalImages} images\n`);
}
