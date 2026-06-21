---
'@eleventy-plugin-themer/build-vite': patch
---

Run the `validateLinks` optimization last, regardless of the order keys appear in the consumer's `optimizations` config. Previously, declaring `validateLinks` before `preserveNonHtml` caused false "broken link" failures for links pointing at restored non-HTML files (e.g. `/feed.xml`, `/sitemap.xml`), because validation ran before those files were put back into the output.
