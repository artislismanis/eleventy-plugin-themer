/**
 * Dev server (§5.10 feature-serve, §19 watch) — L4.
 *
 * Boots `eleventy --serve` once for the dedicated `dev` fixture, then asserts:
 * the homepage serves, the dev-only feature-serve middleware resolves a feature
 * URL through Vite, and editing a watched file triggers a rebuild.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startDevServer } from '../helpers/devServer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.resolve(__dirname, '../fixtures/dev/content/index.njk');
const PORT = 8129;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let server;

beforeAll(async () => {
  server = await startDevServer('dev', { port: PORT });
}, 60000);

afterAll(async () => {
  await server?.stop();
});

describe('dev server', () => {
  it('serves the homepage', async () => {
    const res = await server.get('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('id="watch-marker"');
  });

  it('feature-serve middleware resolves a feature script', async () => {
    // code-highlighting is a theme feature, discovered for the minimal theme.
    const res = await server.get('/code-highlighting.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') || '').toMatch(/javascript|ecmascript/);
    expect((await res.text()).length).toBeGreaterThan(0);
  });
});

describe('watch rebuild', () => {
  // `eleventy --serve` serves in-memory (no _site on disk) and the Vite
  // middleware caches transformed HTML, so neither disk nor a raw HTTP fetch
  // reflects an edit deterministically. The meaningful, stable signal is that
  // the watcher detected the change and triggered a rebuild — asserted via the
  // server log.
  it('triggers a rebuild when a watched content file changes', async () => {
    const original = fs.readFileSync(INDEX, 'utf8');
    const rebuilds = () => (server.log().match(/Wrote \d+ file/g) || []).length;
    const before = rebuilds();
    try {
      fs.writeFileSync(INDEX, original.replace('INITIAL', 'CHANGED-BY-WATCH'));

      let rebuilt = false;
      for (let i = 0; i < 60 && !rebuilt; i++) {
        await delay(250);
        rebuilt = rebuilds() > before;
      }
      expect(rebuilt).toBe(true);
      expect(server.log()).toMatch(/File changed/);
    } finally {
      fs.writeFileSync(INDEX, original);
    }
  }, 30000);
});
