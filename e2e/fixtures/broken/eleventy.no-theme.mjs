import { eleventyPluginThemer } from '@eleventy-plugin-themer/core';

// Omits the required `theme` option -> core plugin throws immediately.
export default async function (eleventyConfig) {
  await eleventyPluginThemer(eleventyConfig, { projectRoot: import.meta.dirname });
  return {};
}
