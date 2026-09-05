---
'@eleventy-plugin-themer/core': patch
---

Attach the original error as `cause` when a user theme config fails to load, so the underlying stack survives instead of being flattened into the message string.
