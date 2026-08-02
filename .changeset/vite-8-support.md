---
'@eleventy-plugin-themer/build-vite': minor
---

Support Vite 8 and `@11ty/eleventy-plugin-vite` 8.

Peer ranges widen to `vite: ^5 || ^6 || ^7 || ^8` and
`@11ty/eleventy-plugin-vite: ^7 || ^8` — additive, so Vite 5–7 consumers are
unaffected.

Vite 8 replaces Rollup with Rolldown, which validates `rollupOptions.input`
keys more strictly than Rollup did. Feature entries were keyed as
`/<name>.js` to mirror the dev-server URL that the `feature-serve` plugin
handles, and Rolldown rejects that with
`INVALID_OPTION: Invalid substitution "/<name>.js" for placeholder "[name]"`.
Entry keys are now the plain feature name; `entryFileNames` already stripped
the prefix, so **emitted filenames are unchanged** (`<name>.<hash>.js`) and
dev-server URL handling is untouched.
