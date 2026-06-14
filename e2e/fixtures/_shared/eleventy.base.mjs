/**
 * Shared Eleventy config factory for e2e fixtures.
 *
 * Wires the themer core + vite adapter the supported way (direct core call so
 * `dir` is available for the return), plus eleventy-navigation because the
 * theme-base `base.njk` layout uses the `eleventyNavigation` filter. Anything
 * beyond this (RSS, image transform, syntax highlight) is opt-in per fixture.
 */

import { createThemerProject } from '@eleventy-plugin-themer/core';
import { eleventyPluginThemerVite } from '@eleventy-plugin-themer/build-vite';
import EleventyNavigation from '@11ty/eleventy-navigation';

export const THEME_NAME = '@eleventy-plugin-themer/theme-base';

export async function configureThemer(eleventyConfig, { projectRoot, optimizations = {} }) {
  const themer = createThemerProject({ theme: THEME_NAME, projectRoot });

  const { dir } = await themer.eleventyPlugin(eleventyConfig, {
    input: 'content',
    output: '_site',
  });

  eleventyConfig.addPlugin(EleventyNavigation);
  eleventyConfig.addPlugin(eleventyPluginThemerVite, themer.viteOptions({ optimizations }));

  return { dir };
}
