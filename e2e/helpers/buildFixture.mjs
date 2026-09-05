/**
 * Real-build driver for e2e fixtures.
 *
 * Drives the Eleventy CLI in a child process with `cwd` set to the fixture
 * root. CLI + per-process cwd is the parallel-safe choice: Eleventy resolves
 * its input/output dirs relative to cwd, so an in-process programmatic build
 * would force a shared-`process.chdir` bottleneck. Running the binary also
 * mirrors exactly how a consumer builds.
 *
 * `buildFixture` is used both for positive builds (assert on `_site`) and for
 * negative builds (`expectThrow: true` → resolve with the captured stderr so a
 * test can assert the error message and non-zero exit).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

import { fixturesDir, linkFixtureModules } from './linkFixture.mjs';

const execFileAsync = promisify(execFile);
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

export function fixtureRoot(name) {
  return path.join(fixturesDir, name);
}

export function fixtureSite(name) {
  return path.join(fixturesDir, name, '_site');
}

/**
 * Link the fixture and clear prior build artifacts. The vite adapter sets
 * `emptyOutDir:false`, so stale `_site`/`.11ty-vite` would otherwise produce
 * false passes.
 */
export function prepareFixture(name) {
  const root = fixtureRoot(name);
  linkFixtureModules(root);
  fs.rmSync(path.join(root, '_site'), { recursive: true, force: true });
  fs.rmSync(path.join(root, '.11ty-vite'), { recursive: true, force: true });
  return root;
}

export async function buildFixture(name, { env = {}, expectThrow = false, args = [] } = {}) {
  const root = prepareFixture(name);
  try {
    const { stdout, stderr } = await execFileAsync(NPX, ['eleventy', ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      maxBuffer: 32 * 1024 * 1024,
    });
    if (expectThrow) {
      throw new Error(
        `Expected build of "${name}" to fail, but it succeeded.\n${stdout}\n${stderr}`,
      );
    }
    return { ok: true, stdout, stderr, site: path.join(root, '_site') };
  } catch (err) {
    const output = `${err.stdout || ''}\n${err.stderr || ''}`;
    if (expectThrow) {
      return { ok: false, output, stdout: err.stdout || '', stderr: err.stderr || '' };
    }
    throw new Error(`Build of "${name}" failed:\n${output}`, { cause: err });
  }
}
