// Drop-in front-matter validator (re-export). Note: in this Eleventy version a
// _data eleventyDataSchema runs against global data, so a per-page unknown
// feature is caught downstream by Vite (failed asset resolution), not here.
export { themerDataSchema as default } from '@eleventy-plugin-themer/core';
