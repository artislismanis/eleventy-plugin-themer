import fs from 'fs';
import path from 'path';

import { resolveOverridePaths } from './defaults.mjs';
import { getThemeRoot } from './cascade/paths.mjs';
import { resolveResource } from './cascade/resolver.mjs';
import { logger } from './logger.mjs';

/**
 * Validate theme installation and provide helpful errors
 *
 * Checks that the theme is properly installed and configured.
 * Provides warnings for common issues and deprecated patterns.
 *
 * @param {string} projectRoot - Project root path
 * @param {Object} overridePaths - Override paths configuration
 * @returns {Object} Validation result { errors, warnings, isValid }
 *   - errors: Array of error messages (critical issues)
 *   - warnings: Array of warning messages (non-critical)
 *   - isValid: Boolean - true if no errors (warnings are OK)
 *
 * @example
 * // In eleventy.config.mjs (optional - init() calls this automatically)
 * import { validateTheme } from 'eleventy-base-blog-template';
 *
 * const validation = validateTheme(__dirname);
 * if (!validation.isValid) {
 *   console.error('Theme validation failed:', validation.errors);
 *   process.exit(1);
 * }
 */
export function validateTheme(projectRoot, themeMetadata, overridePaths = {}) {
  const errors = [];
  const warnings = [];

  // Get configured paths
  const resolved = resolveOverridePaths(themeMetadata, overridePaths);
  const scriptsPath = resolved.scripts;
  const layoutsPath = resolved.layouts;

  // Check required theme directories exist
  const requiredThemeDirs = ['layouts', 'styles', 'scripts'];
  const themeRoot = getThemeRoot(projectRoot, themeMetadata.name);

  if (!fs.existsSync(themeRoot)) {
    errors.push(
      `Theme package not found at: ${themeRoot}\n` +
        `  Did you run 'npm install ${themeMetadata.name}'?`,
    );
    // Can't continue without theme installed
    return { errors, warnings, isValid: false };
  }

  requiredThemeDirs.forEach((dir) => {
    const fullPath = path.join(themeRoot, dir);
    if (!fs.existsSync(fullPath)) {
      errors.push(
        `Missing required theme directory: ${dir}\n` +
          `  Expected at: ${fullPath}\n` +
          `  This may indicate a corrupted theme installation.`,
      );
    }
  });

  // Check user entry point exists
  const mainEntry = path.join(projectRoot, scriptsPath, 'main.js');
  if (!fs.existsSync(mainEntry)) {
    warnings.push(
      `No entry point found at ${scriptsPath}/main.js\n` +
        `  Create this file to add site-specific JavaScript.\n` +
        `  Example:\n` +
        `    // ${scriptsPath}/main.js\n` +
        `    console.log('Site loaded');\n`,
    );
  }

  // Check layouts directory exists (optional but recommended)
  const userLayoutsPath = path.join(projectRoot, layoutsPath);
  if (!fs.existsSync(userLayoutsPath)) {
    warnings.push(
      `No layouts directory found at ${layoutsPath}/\n` +
        `  Create this directory to override or extend theme layouts.\n` +
        `  Example:\n` +
        `    ${layoutsPath}/post.njk - Override theme's post layout\n` +
        `    {% extends "@theme/layouts/base.njk" %} - Extend theme's base layout`,
    );
  }

  // Validate Nunjucks dependency (peer dependency)
  const nunjucksPath = path.join(projectRoot, 'node_modules', 'nunjucks');
  if (!fs.existsSync(nunjucksPath)) {
    errors.push(
      `Nunjucks not found. This is a required peer dependency.\n` +
        `  Install it with: npm install nunjucks`,
    );
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

/**
 * Log validation results in a friendly format
 *
 * @param {Object} validation - Result from validateTheme()
 * @returns {void}
 */
export function logValidation(validation) {
  if (validation.errors.length > 0) {
    logger.error('\n❌ Theme Validation Errors:\n');
    validation.errors.forEach((error, i) => {
      logger.error(`${i + 1}. ${error}\n`);
    });
  }

  if (validation.warnings.length > 0) {
    logger.warn('\n⚠️  Theme Validation Warnings:\n');
    validation.warnings.forEach((warning, i) => {
      logger.warn(`${i + 1}. ${warning}\n`);
    });
  }

  if (validation.isValid && validation.warnings.length === 0) {
    logger.info('✅ Theme validation passed!');
  }
}

/**
 * Validate a specific component exists
 *
 * @param {string} type - Component type ('layout', 'bundle', 'data')
 * @param {string} name - Component name
 * @param {string} projectRoot - Project root path
 * @param {Object} overridePaths - Override paths configuration
 * @returns {Object} { exists, path, source } or { exists: false }
 */
export function validateComponent(type, name, projectRoot, themeMetadata, overridePaths = {}) {
  const resolved = resolveOverridePaths(themeMetadata, overridePaths);

  // Map component types to resource types and filename transforms
  const typeConfig = {
    layout: { resourceType: 'layouts', filename: `${name}.njk` },
    data: { resourceType: 'data', filename: name },
  };

  const config = typeConfig[type];
  if (!config) {
    return { exists: false };
  }

  const result = resolveResource({
    projectRoot,
    themeName: themeMetadata.name,
    resolvedOverridePaths: resolved,
    resourceType: config.resourceType,
    filename: config.filename,
  });

  if (result) {
    return { exists: true, path: result.path, source: result.source };
  }

  return { exists: false };
}
