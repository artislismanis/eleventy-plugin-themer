/**
 * Lightweight integration sanity check for build-vite consumers.
 *
 * Validates that node, vite, and @11ty/eleventy-plugin-vite are within the
 * versions declared in build-vite's peerDependencies + engines. Emits a single
 * banner on success and warnings on mismatch. **Never throws** — every failure
 * mode (corrupt manifest, unreadable peer package.json) is swallowed to a
 * single debug-style log so the check can never take down a consumer's build.
 *
 * Runs at most once per Node process. The dedupe is intentional: re-init
 * within the same process (e.g. Eleventy `--serve` config reload) is silent
 * because the underlying environment hasn't changed. Tests use
 * `_resetIntegrationCheck()` to opt back in.
 *
 * Opt-out at runtime via `options.skipIntegrationCheck = true` (advanced
 * consumers running a custom build flow).
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { logger } from '@eleventy-plugin-themer/core/logger';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILD_VITE_MANIFEST_PATH = path.resolve(__dirname, '..', 'package.json');

function readBuildViteManifest() {
  return JSON.parse(fs.readFileSync(BUILD_VITE_MANIFEST_PATH, 'utf8'));
}

function readPeerVersion(pkgName) {
  try {
    return require(`${pkgName}/package.json`).version;
  } catch {
    return null;
  }
}

/**
 * @internal Parse a leading major version from a semver-ish string.
 * Accepts `7.3.3`, `v7.3.3`, `7.3.3-beta.1`. Returns null on failure.
 * Anchored regex — no ReDoS.
 */
export function _parseMajor(version) {
  if (typeof version !== 'string') return null;
  const match = version.match(/^v?(\d+)\./);
  return match ? Number(match[1]) : null;
}

/**
 * @internal Extract major numbers from a peerDependencies range string.
 * Handles `^M.x.x` and `^M.x.x || ^N.x.x` forms.
 */
export function _parseAllowedMajors(range) {
  if (typeof range !== 'string') return [];
  return [...range.matchAll(/\^(\d+)\./g)].map((m) => Number(m[1]));
}

/** @internal */
export function _checkNode(manifest, nodeVersion = process.versions.node) {
  const required = manifest.engines?.node;
  const min = typeof required === 'string' ? Number(required.replace(/[^\d]/g, '')) : null;
  const actual = _parseMajor(nodeVersion);
  if (min === null || actual === null) return null;
  if (actual < min) {
    return `Node ${nodeVersion} is below the supported floor (>=${min}). Upgrade Node to avoid undefined behaviour.`;
  }
  return null;
}

/** @internal */
export function _checkPeer(pkgName, manifest, peerLookup = readPeerVersion) {
  const range = manifest.peerDependencies?.[pkgName];
  if (!range) return null;
  const installed = peerLookup(pkgName);
  if (!installed) {
    return `Peer dependency \`${pkgName}\` is not installed. Required: ${range}.`;
  }
  const allowed = _parseAllowedMajors(range);
  const actual = _parseMajor(installed);
  if (allowed.length === 0 || actual === null) return null;
  if (!allowed.includes(actual)) {
    return `\`${pkgName}\` ${installed} is outside the supported range (${range}). Behaviour may be unstable.`;
  }
  return null;
}

let alreadyRan = false;

/**
 * @internal Pure evaluator. Takes injected dependencies; returns
 * `{ version, warnings }` or `null` if the manifest can't be read.
 */
export function _evaluate({
  manifestReader = readBuildViteManifest,
  peerLookup = readPeerVersion,
  nodeVersion = process.versions.node,
} = {}) {
  let manifest;
  try {
    manifest = manifestReader();
  } catch {
    return null;
  }
  const warnings = [
    _checkNode(manifest, nodeVersion),
    _checkPeer('vite', manifest, peerLookup),
    _checkPeer('@11ty/eleventy-plugin-vite', manifest, peerLookup),
  ].filter(Boolean);
  return { version: manifest.version, warnings };
}

export function runIntegrationCheck({ silent = false } = {}) {
  if (alreadyRan) return;
  try {
    const result = _evaluate();
    if (!result) {
      // Manifest unreadable — dedupe so we don't spam, but don't claim OK.
      alreadyRan = true;
      return;
    }
    alreadyRan = true;
    if (silent) return;

    const { version, warnings } = result;
    if (warnings.length === 0) {
      logger.info(`[themer/build-vite ${version}] integration check: OK`);
      return;
    }
    logger.warn(`[themer/build-vite ${version}] integration check: ${warnings.length} warning(s)`);
    for (const w of warnings) logger.warn(`  • ${w}`);
  } catch {
    // Should be unreachable — _evaluate handles its own errors. Belt-and-braces
    // so the docstring's "never throws" promise is genuinely guaranteed.
    alreadyRan = true;
  }
}

/** @internal Test-only: reset the once-per-process dedupe flag. */
export function _resetIntegrationCheck() {
  alreadyRan = false;
}
