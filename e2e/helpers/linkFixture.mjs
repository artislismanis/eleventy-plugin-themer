/**
 * Fixture module linking.
 *
 * `getThemeRoot` (packages/core/lib/cascade/paths.mjs) resolves a theme with a
 * LITERAL `path.join(projectRoot, 'node_modules', themeName)` — it does not
 * walk up the tree. So each fixture's own root must have the theme resolvable
 * at `<fixtureRoot>/node_modules/<theme>`. We satisfy this (and ordinary bare
 * imports) by symlinking `<fixtureRoot>/node_modules` to the repo's hoisted
 * `node_modules`, after making sure the workspace's own scope links exist.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(__dirname, '../..');
export const fixturesDir = path.resolve(__dirname, '../fixtures');

const SCOPE = '@eleventy-plugin-themer';
const WORKSPACE_PACKAGES = {
  core: 'packages/core',
  'build-vite': 'packages/build/vite',
  'theme-base': 'packages/themes/base',
};

function linkType() {
  // Windows needs explicit 'junction' for directory symlinks without admin.
  return process.platform === 'win32' ? 'junction' : 'dir';
}

function ensureSymlink(target, linkPath) {
  try {
    // Resolves through the link; false for a dangling link, true if present.
    if (fs.existsSync(linkPath)) return;
  } catch {
    /* fall through to (re)create */
  }
  fs.rmSync(linkPath, { recursive: true, force: true });
  fs.symlinkSync(target, linkPath, linkType());
}

/**
 * Make sure `node_modules/@eleventy-plugin-themer/{core,build-vite,theme-base}`
 * exist in the repo root, even if `npm install` hasn't linked the workspaces.
 */
export function ensureWorkspaceLinks() {
  const scopeDir = path.join(repoRoot, 'node_modules', SCOPE);
  fs.mkdirSync(scopeDir, { recursive: true });
  for (const [name, rel] of Object.entries(WORKSPACE_PACKAGES)) {
    ensureSymlink(path.join(repoRoot, rel), path.join(scopeDir, name));
  }
}

/**
 * Point a fixture's `node_modules` at the repo's hoisted `node_modules` so the
 * literal `getThemeRoot` join resolves the theme package.
 */
export function linkFixtureModules(fixtureRoot) {
  ensureWorkspaceLinks();
  ensureSymlink(path.join(repoRoot, 'node_modules'), path.join(fixtureRoot, 'node_modules'));
}
