# Changesets

This folder contains changeset files that describe version bumps and changelogs for releases.

## Adding a Changeset

When you make changes that should be released, run:

```bash
npm run changeset
```

This will prompt you to:

1. Select which packages have changed
2. Choose the bump type (major, minor, patch)
3. Write a summary of the changes

The changeset will be saved as a markdown file in this folder.

## Releasing

See the root README for full release instructions.
