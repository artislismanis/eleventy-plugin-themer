/**
 * Vite plugin to serve feature scripts in development mode
 *
 * In production, Vite bundles features via rollup entry points.
 * In development, this plugin intercepts /{feature-name}.js requests
 * and serves the corresponding feature file through Vite's transform pipeline.
 */

import fs from 'fs';

import { getFeaturePathsForBuild } from '../utils/features.mjs';

/**
 * @param {Object} options - Plugin options
 * @param {Map<string, {path: string}>} options.discoveredFeatures - Pre-discovered features
 *   from `getAvailableFeatures()`. Required.
 * @returns {Object} Vite plugin
 */
export function featureServePlugin({ discoveredFeatures } = {}) {
  // getFeaturePathsForBuild throws TypeError if discoveredFeatures is missing —
  // surfacing the same contract violation here would just duplicate that.
  const featurePaths = getFeaturePathsForBuild(discoveredFeatures);

  return {
    name: 'feature-serve',
    apply: 'serve', // Only apply in dev mode

    configureServer(server) {
      // Add middleware to intercept feature requests
      server.middlewares.use((req, res, next) => {
        // Match /{feature-name}.js pattern
        const match = req.url?.match(/^\/([a-z0-9-]+)\.js$/i);
        if (!match) {
          return next();
        }

        const featureName = match[1];
        const featurePath = featurePaths.get(featureName);

        if (!featurePath || !fs.existsSync(featurePath)) {
          return next();
        }

        // Transform the request to use Vite's module resolution
        // Prefix with /@fs/ to use Vite's file system serving
        req.url = `/@fs${featurePath}`;
        next();
      });
    },
  };
}
