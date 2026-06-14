/**
 * Dev-server driver for L4 tests.
 *
 * Spawns `eleventy --serve` (with the embedded Vite middleware) for a fixture,
 * polls until it answers, and exposes fetch + stop. Uses a dedicated fixture so
 * cleaning its `_site` never races the pre-built positive fixtures other suites
 * read.
 */

import { spawn } from 'child_process';
import path from 'path';

import { repoRoot } from './linkFixture.mjs';
import { prepareFixture } from './buildFixture.mjs';

const ELEVENTY_BIN = path.join(repoRoot, 'node_modules', '.bin', 'eleventy');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReady(base, proc, timeoutMs, logFn) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(`dev server exited early (code ${proc.exitCode}):\n${logFn()}`);
    }
    try {
      const r = await fetch(`${base}/`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await delay(250);
  }
  throw new Error(`dev server not ready within ${timeoutMs}ms:\n${logFn()}`);
}

export async function startDevServer(name, { port, env = {}, timeoutMs = 45000 } = {}) {
  prepareFixture(name);
  const root = path.join(repoRoot, 'e2e', 'fixtures', name);
  const proc = spawn(ELEVENTY_BIN, ['--serve', `--port=${port}`], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let log = '';
  const collect = (d) => (log += d.toString());
  proc.stdout.on('data', collect);
  proc.stderr.on('data', collect);

  const base = `http://localhost:${port}`;
  await waitForReady(base, proc, timeoutMs, () => log);

  return {
    base,
    get: (p) => fetch(base + p),
    async stop() {
      if (proc.exitCode !== null) return;
      proc.kill('SIGTERM');
      await new Promise((resolve) => {
        proc.on('exit', resolve);
        setTimeout(resolve, 4000);
      });
    },
    log: () => log,
  };
}
