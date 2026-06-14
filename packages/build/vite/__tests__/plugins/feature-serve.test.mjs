import fs from 'fs';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { featureServePlugin } from '../../plugins/feature-serve.mjs';

vi.mock('fs');

const FEATURES = new Map([
  ['widget', { name: 'widget', source: 'user', path: '/abs/features/widget/index.auto.js' }],
]);

/** Build the plugin and capture the registered middleware handler. */
function middlewareFor(features) {
  const plugin = featureServePlugin({ discoveredFeatures: features });
  let handler;
  plugin.configureServer({ middlewares: { use: (fn) => (handler = fn) } });
  return { plugin, handler };
}

describe('featureServePlugin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('throws when discoveredFeatures is not a Map', () => {
    expect(() => featureServePlugin()).toThrow(TypeError);
    expect(() => featureServePlugin({ discoveredFeatures: {} })).toThrow(TypeError);
  });

  it('is a dev-only plugin', () => {
    const { plugin } = middlewareFor(FEATURES);
    expect(plugin.name).toBe('feature-serve');
    expect(plugin.apply).toBe('serve');
  });

  it('rewrites a known feature request to Vite /@fs serving', () => {
    fs.existsSync.mockReturnValue(true);
    const { handler } = middlewareFor(FEATURES);
    const req = { url: '/widget.js' };
    const next = vi.fn();

    handler(req, {}, next);

    expect(req.url).toBe('/@fs/abs/features/widget/index.auto.js');
    expect(next).toHaveBeenCalledOnce();
  });

  it('passes through non-feature requests unchanged', () => {
    const { handler } = middlewareFor(FEATURES);
    const req = { url: '/assets/css/main.css' };
    const next = vi.fn();

    handler(req, {}, next);

    expect(req.url).toBe('/assets/css/main.css');
    expect(next).toHaveBeenCalledOnce();
  });

  it('passes through unknown feature names unchanged', () => {
    const { handler } = middlewareFor(FEATURES);
    const req = { url: '/not-a-feature.js' };
    const next = vi.fn();

    handler(req, {}, next);

    expect(req.url).toBe('/not-a-feature.js');
    expect(next).toHaveBeenCalledOnce();
  });

  it('passes through when the feature file is missing on disk', () => {
    fs.existsSync.mockReturnValue(false);
    const { handler } = middlewareFor(FEATURES);
    const req = { url: '/widget.js' };
    const next = vi.fn();

    handler(req, {}, next);

    expect(req.url).toBe('/widget.js');
    expect(next).toHaveBeenCalledOnce();
  });
});
