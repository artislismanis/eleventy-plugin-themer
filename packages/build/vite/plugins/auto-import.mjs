/**
 * Vite plugin that auto-imports theme assets into user entry points
 *
 * This eliminates the need for users to manually import theme styles/scripts.
 * The plugin prepends theme imports to the user's main entry file.
 */

import fs from 'fs';
import path from 'path';

import { resolveResource, getThemeRoot } from '@eleventy-plugin-themer/core/internal/api';

/**
 * @param {Object} options - Plugin options
 * @param {string} options.projectRoot - Project root path
 * @param {string} options.themeName - Theme package name
 * @param {string} options.stylesEntry - Theme styles entry filename (e.g., 'main.scss')
 * @param {string} options.scriptsEntry - Theme scripts entry filename (e.g., 'main.js')
 * @param {Object} options.resolvedOverridePaths - Resolved override paths object
 * @returns {Object} Vite plugin
 */
export function themeAutoImportPlugin(options = {}) {
  const { projectRoot, themeName, stylesEntry, scriptsEntry, resolvedOverridePaths } = options;

  if (!projectRoot || !themeName || !resolvedOverridePaths || !stylesEntry || !scriptsEntry) {
    throw new Error(
      'themeAutoImportPlugin requires projectRoot, themeName, resolvedOverridePaths, stylesEntry, and scriptsEntry',
    );
  }

  // Get theme root for direct theme imports (not cascade-resolved)
  const themeRoot = getThemeRoot(projectRoot, themeName);

  return {
    name: 'theme-auto-import',

    transform(code, id) {
      // Resolve the path to the user's main script entry point
      // Use basename because entry paths like 'scripts/main.js' are relative to theme root,
      // but resolveResource already uses resourceType to determine the base directory
      const userMainScript = resolveResource({
        projectRoot,
        themeName,
        resolvedOverridePaths,
        resourceType: 'scripts',
        filename: path.basename(scriptsEntry), // Extract 'main.js' from 'scripts/main.js'
      });

      // Only transform if:
      // 1. User has their own main script (we need to inject theme imports into it)
      // 2. The file being transformed matches the user's main entry point
      if (!userMainScript || userMainScript.source !== 'user' || id !== userMainScript.path) {
        return null;
      }

      // Build direct paths to theme assets (always from theme, not cascade-resolved)
      // This ensures theme scripts/styles are imported even when user has overrides
      // Use the entry paths directly (e.g., 'styles/main.scss') which encode the directory
      const themeStylesPath = path.join(themeRoot, stylesEntry);
      const themeScriptsPath = path.join(themeRoot, scriptsEntry);

      // Check if theme files exist
      const hasThemeStyles = fs.existsSync(themeStylesPath);
      const hasThemeScripts = fs.existsSync(themeScriptsPath);

      // Prepend theme imports (always from theme package, not user overrides)
      const themeImports = [
        `// Auto-imported by theme (${themeName})`,
        hasThemeStyles ? `import '${themeStylesPath}';` : '',
        hasThemeScripts ? `import '${themeScriptsPath}';` : '',
        '',
      ]
        .filter(Boolean)
        .join('\n');

      return {
        code: themeImports + code,
        map: null,
      };
    },
  };
}
