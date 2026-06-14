/**
 * HTML/output helpers for reading built fixtures.
 *
 * Uses node-html-parser (already a build-vite dependency, used by the
 * validate-links plugin) for structural assertions; raw string reads remain
 * available for trivial presence/regex checks.
 */

import fs from 'fs';
import path from 'path';

import { parse } from 'node-html-parser';

/** Recursively collect every `.html` file under `dir`. */
export function walkHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

export function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

/** Parse a built HTML file into a queryable node-html-parser root. */
export function parsePage(file) {
  return parse(readFile(file));
}

/** List files under a site subdirectory (non-recursive); [] if absent. */
export function listDir(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}

/**
 * Concatenated source of the module entry scripts a page executes (the
 * `<script type="module" src=…>` under /assets/scripts/). Used to assert which
 * feature code actually runs on a page.
 */
export function entryScriptSource(pageFile, siteDir) {
  return parsePage(pageFile)
    .querySelectorAll('script[type="module"][src]')
    .map((s) => s.getAttribute('src'))
    .filter((src) => src && src.includes('/assets/scripts/'))
    .map((src) => path.join(siteDir, src.replace(/^\//, '')))
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, 'utf8'))
    .join('\n');
}
