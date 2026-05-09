import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the plugins module
vi.mock('../../plugins/index.mjs', () => ({
  purgeCSSFiles: vi.fn(),
  generateCriticalCSS: vi.fn(),
  minifyHTML: vi.fn(),
  validateLinks: vi.fn(),
  preserveNonHtmlFiles: vi.fn(),
  themeAutoImportPlugin: vi.fn(),
  featureServePlugin: vi.fn(),
}));

import { runOptimizations } from '../../utils/plugin-orchestrator.mjs';
import {
  purgeCSSFiles,
  generateCriticalCSS,
  minifyHTML,
  validateLinks,
  preserveNonHtmlFiles,
} from '../../plugins/index.mjs';

describe('plugin-orchestrator', () => {
  const dirs = { output: '_site', temp: '.11ty-vite' };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip disabled optimizations', async () => {
    await runOptimizations({ purgeCSS: false, minifyHTML: false }, dirs);

    expect(purgeCSSFiles).not.toHaveBeenCalled();
    expect(minifyHTML).not.toHaveBeenCalled();
  });

  it('should call plugin with outputDir when enabled with true', async () => {
    await runOptimizations({ purgeCSS: true }, dirs);

    expect(purgeCSSFiles).toHaveBeenCalledWith(
      '_site',
      expect.objectContaining({ output: '_site' }),
    );
  });

  it('should call correct plugin for each config key', async () => {
    await runOptimizations(
      {
        purgeCSS: true,
        criticalCSS: true,
        minifyHTML: true,
        validateLinks: true,
      },
      dirs,
    );

    expect(purgeCSSFiles).toHaveBeenCalled();
    expect(generateCriticalCSS).toHaveBeenCalled();
    expect(minifyHTML).toHaveBeenCalled();
    expect(validateLinks).toHaveBeenCalled();
  });

  it('should merge user options with dirs when config is an object', async () => {
    await runOptimizations({ purgeCSS: { safelist: ['keep-me'] } }, dirs);

    expect(purgeCSSFiles).toHaveBeenCalledWith(
      '_site',
      expect.objectContaining({
        output: '_site',
        temp: '.11ty-vite',
        safelist: ['keep-me'],
      }),
    );
  });

  it('should call custom function when config is a function', async () => {
    const customFn = vi.fn();
    await runOptimizations({ customOptimization: customFn }, dirs);

    expect(customFn).toHaveBeenCalled();
  });

  it('should warn for unknown optimization keys', async () => {
    await runOptimizations({ unknownPlugin: true }, dirs);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('unknownPlugin'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Available:'));
  });

  it('should call preserveNonHtml with tempDir option', async () => {
    await runOptimizations({ preserveNonHtml: { extensions: ['xml', 'txt'] } }, dirs);

    expect(preserveNonHtmlFiles).toHaveBeenCalledWith(
      '_site',
      expect.objectContaining({
        output: '_site',
        temp: '.11ty-vite',
        extensions: ['xml', 'txt'],
      }),
    );
  });

  it('should run plugins sequentially', async () => {
    const order = [];
    purgeCSSFiles.mockImplementation(async () => {
      order.push('purge');
    });
    minifyHTML.mockImplementation(async () => {
      order.push('minify');
    });

    await runOptimizations({ purgeCSS: true, minifyHTML: true }, dirs);

    expect(order).toEqual(['purge', 'minify']);
  });
});
