import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@eleventy-plugin-themer/core/logger';

import {
  runIntegrationCheck,
  _resetIntegrationCheck,
  _evaluate,
  _parseMajor,
  _parseAllowedMajors,
  _checkNode,
  _checkPeer,
} from '../../utils/integration-check.mjs';

vi.mock('@eleventy-plugin-themer/core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const STUB_MANIFEST = {
  version: '9.9.9',
  engines: { node: '>=22' },
  peerDependencies: {
    vite: '^5.0.0 || ^6.0.0 || ^7.0.0',
    '@11ty/eleventy-plugin-vite': '^7.0.0',
  },
};

describe('runIntegrationCheck (orchestrator)', () => {
  beforeEach(() => {
    _resetIntegrationCheck();
    vi.clearAllMocks();
  });
  afterEach(() => {
    _resetIntegrationCheck();
  });

  it('emits an OK banner on a healthy environment', () => {
    runIntegrationCheck();
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/integration check: OK/));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('runs at most once per process', () => {
    runIntegrationCheck();
    runIntegrationCheck();
    runIntegrationCheck();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('is silent when silent: true', () => {
    runIntegrationCheck({ silent: true });
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('exposes a reset hook for tests', () => {
    runIntegrationCheck();
    expect(logger.info).toHaveBeenCalledTimes(1);
    _resetIntegrationCheck();
    runIntegrationCheck();
    expect(logger.info).toHaveBeenCalledTimes(2);
  });
});

describe('_evaluate (pure)', () => {
  it('returns OK with zero warnings when versions match', () => {
    const result = _evaluate({
      manifestReader: () => STUB_MANIFEST,
      peerLookup: (name) => (name === 'vite' ? '7.3.3' : '7.0.0'),
      nodeVersion: '22.5.0',
    });
    expect(result.warnings).toEqual([]);
    expect(result.version).toBe('9.9.9');
  });

  it('warns when node is below the engines floor', () => {
    const result = _evaluate({
      manifestReader: () => STUB_MANIFEST,
      peerLookup: () => '7.0.0',
      nodeVersion: '20.0.0',
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/Node 20\.0\.0 is below the supported floor/);
  });

  it('warns when a peer is not installed', () => {
    const result = _evaluate({
      manifestReader: () => STUB_MANIFEST,
      peerLookup: (name) => (name === 'vite' ? null : '7.0.0'),
      nodeVersion: '22.5.0',
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/Peer dependency `vite` is not installed/);
  });

  it('warns when a peer is outside the supported major range', () => {
    const result = _evaluate({
      manifestReader: () => STUB_MANIFEST,
      peerLookup: (name) => (name === 'vite' ? '4.5.0' : '7.0.0'),
      nodeVersion: '22.5.0',
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/`vite` 4\.5\.0 is outside the supported range/);
  });

  it('returns null when the manifest is unreadable', () => {
    const result = _evaluate({
      manifestReader: () => {
        throw new Error('boom');
      },
    });
    expect(result).toBeNull();
  });

  it('aggregates multiple warnings', () => {
    const result = _evaluate({
      manifestReader: () => STUB_MANIFEST,
      peerLookup: () => null,
      nodeVersion: '20.0.0',
    });
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
  });
});

describe('runIntegrationCheck error handling', () => {
  beforeEach(() => {
    _resetIntegrationCheck();
    vi.clearAllMocks();
  });

  it('does not throw when the manifest is corrupt', () => {
    // Patch the readBuildViteManifest indirectly: rely on _evaluate's
    // try/catch by passing a manifestReader that throws… but
    // runIntegrationCheck doesn't accept overrides. Instead, verify the
    // belt-and-braces wrapper by simulating a logger that throws.
    logger.info.mockImplementation(() => {
      throw new Error('logger blew up');
    });
    expect(() => runIntegrationCheck()).not.toThrow();
  });

  it('flips alreadyRan once, even after a logger throw, preventing retry storms', () => {
    logger.info.mockImplementation(() => {
      throw new Error('logger blew up');
    });
    runIntegrationCheck();
    runIntegrationCheck();
    // Second call hits the alreadyRan early-return before the broken logger.
    expect(logger.info).toHaveBeenCalledTimes(1);
  });
});

describe('pure helpers', () => {
  it('_parseMajor handles common semver shapes', () => {
    expect(_parseMajor('7.3.3')).toBe(7);
    expect(_parseMajor('v22.5.0')).toBe(22);
    expect(_parseMajor('7.3.3-beta.1')).toBe(7);
    expect(_parseMajor('garbage')).toBeNull();
    expect(_parseMajor(null)).toBeNull();
    expect(_parseMajor(7)).toBeNull();
  });

  it('_parseAllowedMajors extracts every ^M from a range', () => {
    expect(_parseAllowedMajors('^7.0.0')).toEqual([7]);
    expect(_parseAllowedMajors('^5.0.0 || ^6.0.0 || ^7.0.0')).toEqual([5, 6, 7]);
    expect(_parseAllowedMajors('')).toEqual([]);
    expect(_parseAllowedMajors(undefined)).toEqual([]);
  });

  it('_checkNode is null when engines.node is missing', () => {
    expect(_checkNode({}, '20.0.0')).toBeNull();
    expect(_checkNode({ engines: {} }, '20.0.0')).toBeNull();
  });

  it('_checkPeer is null when the package is not declared as a peer', () => {
    expect(_checkPeer('not-a-peer', STUB_MANIFEST, () => '1.0.0')).toBeNull();
  });
});
