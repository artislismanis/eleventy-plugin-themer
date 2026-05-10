/**
 * Internal helper: load a module from `<dir>/<basename>.{mjs,js}` if it exists.
 *
 * Iterates the supported extensions, returning the first match's default export
 * along with the resolved file path. Used by both override-helper registration
 * and theme-config validation in `lib/index.mjs`.
 *
 * NOTE: Kept as a tiny extracted helper rather than inlined at each call site.
 * Inlining trades two-line readability for divergence risk on the
 * dynamic-import + extension-iteration pattern. Not part of the public API.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * @param {string} dir - Absolute directory to look in.
 * @param {string} basename - File stem without extension.
 * @returns {Promise<{ filePath: string, defaultExport: any }|null>}
 *   Null if no matching file exists.
 */
export async function loadModuleFromPath(dir, basename) {
  for (const ext of ['.mjs', '.js']) {
    const filePath = path.join(dir, `${basename}${ext}`);
    if (!fs.existsSync(filePath)) continue;
    const mod = await import(pathToFileURL(filePath).href);
    return { filePath, defaultExport: mod.default };
  }
  return null;
}
