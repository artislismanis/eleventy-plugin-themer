import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createPostcssConfig } from '../postcss.mjs';

describe('createPostcssConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('throws when themeMetadata is missing', async () => {
    await expect(createPostcssConfig({})).rejects.toThrow(/themeMetadata is required/);
  });

  it('returns empty plugins array when theme declares none', async () => {
    const config = await createPostcssConfig({ themeMetadata: { name: 't' } });
    expect(config).toEqual({ plugins: [] });
  });

  it('appends user plugins after theme plugins', async () => {
    const userA = { id: 'user-a' };
    const config = await createPostcssConfig({
      themeMetadata: { name: 't' },
      userPlugins: [userA],
    });
    expect(config.plugins).toEqual([userA]);
  });

  it('skips production-only plugins outside production', async () => {
    process.env.NODE_ENV = 'development';

    const themeMetadata = {
      name: 't',
      build: {
        postcss: {
          plugins: [
            // We can't easily import a real package; use a synthetic entry
            // that points to a built-in module to verify the production gate.
            { package: 'node:url', production: true },
          ],
        },
      },
    };

    // node:url's default import isn't a function — but production gate skips
    // it before factory resolution, so this should succeed with [] plugins.
    const config = await createPostcssConfig({ themeMetadata });
    expect(config.plugins).toEqual([]);
  });

  it('throws a helpful error when a declared plugin is not installed', async () => {
    const themeMetadata = {
      name: 't',
      build: {
        postcss: {
          plugins: [{ package: 'this-package-definitely-does-not-exist-xyz' }],
        },
      },
    };

    await expect(
      createPostcssConfig({ themeMetadata, production: true, projectRoot: process.cwd() }),
    ).rejects.toThrow(/not installed in the consumer project/);
  });
});
