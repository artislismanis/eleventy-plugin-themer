/**
 * Theme metadata loading
 *
 * Reads and merges theme metadata from package.json and theme.json.
 */

import fs from 'fs';
import path from 'path';

import { getThemeRoot } from './paths.mjs';

/**
 * Load and merge theme metadata from package.json and theme.json
 *
 * @param {string} projectRoot - The project's root directory.
 * @param {string} themeName - The name of the theme package.
 * @returns {Object} Merged theme metadata.
 */
export function resolveThemeMetadata(projectRoot, themeName) {
  const themeRoot = getThemeRoot(projectRoot, themeName);
  const pkgJsonPath = path.join(themeRoot, 'package.json');
  const themeJsonPath = path.join(themeRoot, 'theme.json');

  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`Theme package.json not found for "${themeName}" at ${pkgJsonPath}`);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const themeJson = fs.existsSync(themeJsonPath)
    ? JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'))
    : {};

  // Merge, with package.json taking precedence for core fields
  const metadata = {
    ...themeJson,
    name: pkgJson.name,
    version: pkgJson.version,
    description: pkgJson.description,
  };

  return metadata;
}
