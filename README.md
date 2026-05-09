# eleventy-plugin-themer

## What is this?

A framework for the [Eleventy](https://www.11ty.dev/) site generator to keep the words and looks separate. It gives you a simple way to build and swap themes, a flexible system to override settings, and integrations with your build tools.

## Why do I need it?

Eleventy is powerful because it stays out of your way, but that freedom can feel daunting. I created this project to capture my learnings for easy reuse. This is still a work in progress, but I hope my findings help you spark your own ideas.

## How do I get started?

Check the [eleventy-starter](https://github.com/artislismanis/eleventy-starter) repository to see the framework in action. It shows you exactly how to build a working site.

The rest of this README explains how to work with this repository.

## Package Architecture

This monorepo consists of three packages:

- [@eleventy-plugin-themer/core](./packages/core/README.md) - Defines and implements the framework specification. Covers theme conventions, validation, loading, and override management.

- [@eleventy-plugin-themer/build-vite](./packages/build/vite/README.md) - Vite build system integration with production build optimizations (PurgeCSS, Critical CSS, HTML minification, link validation).

- [@eleventy-plugin-themer/theme-base](./packages/themes/base/README.md) - A port of [eleventy-base-blog](https://github.com/11ty/eleventy-base-blog) theme with a few enhancements. Demonstrates the key framework features and best practices. Ready to use out of the box, customisable.

```text
┌────────────────────────────────────────┐
│  Framework 'API'                       │
│  @eleventy-plugin-themer/core          │
└────┬───────────────────────────────────┘
     │ provides spec to
     │
     ▼
┌────────────────────────────────────────┐
│  Build system integrations             │
│  - @eleventy-plugin-themer/build-vite  │
│  - etc.                                │
└────┬───────────────────────────────────┘
     │ uses spec with
     │
     ▼
┌────────────────────────────────────────┐
│  Themes that implement the API spec    │
│  - @eleventy-plugin-themer/theme-base  │
│  - etc.                                │
└────────────────────────────────────────┘
```

## Responsibilities

This framework owns **theming and the contract for build-tool integration**. It does not own your build pipeline.

| Owned by the plugin                                 | Owned by the consumer (e.g. eleventy-starter) |
| --------------------------------------------------- | --------------------------------------------- |
| Theme cascade, resolution, validation               | Choice of build tool (Vite, Webpack, …)       |
| Filter / shortcode / layout registration            | Build-tool config (PostCSS, bundler tweaks)   |
| Markdown rendering (themes own how content renders) | Site content, data files, deployment, infra   |
| Build adapter API (`build-vite`, future…)           | Pinning the adapter version and wiring it up  |

## Directory Layout (in a consumer project)

```text
project/
├── content/             # Eleventy input — markdown, njk, _data/
│   └── _data/           # Site data + theme.js (overrides theme defaults)
├── overrides/           # Theme-shaped customisations (the framework's contract)
│   ├── layouts/         # Override theme layouts by filename
│   ├── styles/          # Override theme styles
│   ├── scripts/         # Entry: scripts/main.js
│   ├── features/        # Override or add JS features
│   └── lib/             # Auto-discovered: filters.mjs, shortcodes.mjs
├── public/              # Static passthrough — favicons, robots.txt, …
└── eleventy.config.mjs
```

`overrides/` is the framework's namespace. `content/_data` and `public/` follow Eleventy's own conventions — they sit alongside `overrides/` rather than under it.

## Development Environment

To get developing you will need some basics like git, Node.js 22 or newer and your favourite code editor.

This project uses Dev Containers to give you a ready-to-use workspace. Simply open the project in VS Code or GitHub Codespaces, and the system handles the setup for you.

You can also launch the Docker container from your terminal using the command below. Just remember: if you want the container to stick around after you leave, delete the --rm flag.

```bash
# Docker Compose
docker compose run --rm dev

# Plain Docker
docker build -t eleventy-plugin-themer-dev -f .devcontainer/Dockerfile .
docker run --rm -it -v "$(pwd):/workspace" eleventy-plugin-themer-dev bash
```

To install the package dependencies and check that everything works as expected:

```bash
npm install && npm test
```

## Toolchain

The project has been set up with basic linting, code formatting, testing and deployment tools:

- [Prettier](https://www.npmjs.com/package/prettier) - Code formatting, includes Nunjucks support via plugin.
- [ESLint](https://www.npmjs.com/package/eslint) - JS linting. Flat config ESLint 9+. Node.js globals for most files, browser globals for scripts/ and features/
- [Stylelint](https://www.npmjs.com/package/stylelint) - SCSS linting with stylelint-config-standard-scss.
- [lint-staged](https://www.npmjs.com/package/lint-staged) + [Husky](https://www.npmjs.com/package/husky) - Pre-commit hooks. Auto-fixes JS/SCSS and formats all files.
- [vitest](https://www.npmjs.com/package/vitest) - Vite-native JS testing
- [Changesets](https://www.npmjs.com/package/@changesets/changelog-github) - package versioning and changelogs.
- [Github Actions](https://github.com/features/actions) + [act](https://github.com/nektos/act) - CI/CD automation

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm test` to verify
4. Create a changeset to document your changes:
   ```bash
   npm run changeset
   ```
5. Commit your changes and the changeset file
6. Open a pull request

## Versioning & Stability

All three packages ship as a linked group via Changesets. Current state is **pre-release**: 0.1.0.

| Range               | What it means                                                                       |
| ------------------- | ----------------------------------------------------------------------------------- |
| **0.x.y** (current) | Pre-stable. Breaking changes allowed in any **minor** bump. Patch = bug fixes only. |
| **1.0.0**           | First stable release. Full SemVer applies from here on.                             |
| **≥1.x.y**          | Standard SemVer.                                                                    |

**What's in the public API:**

- Symbols re-exported from each package's main entry
- Subpath exports listed in `package.json#exports` **without** an `internal/` prefix

**What's not:**

- Anything under an `internal/*` subpath (e.g. `@eleventy-plugin-themer/core/internal/safe-keys`). These exist purely so the linked packages can share constants — they may change in any release without a changelog entry.

Theme-base templates and SCSS structure are part of the spec contract: replacing them is the supported "override" use case, but renaming or restructuring layouts/partials is a breaking change.

## Publishing

Releases are automated via GitHub Actions. The workflow:

1. When PRs with changesets merge to `main`, a "Version Packages" PR is automatically created/updated
2. When the "Version Packages" PR is merged, packages are automatically published to npm

### Required GitHub Secrets

To enable automated publishing, add these secrets to your GitHub repository:

| Secret      | Description                                                                     |
| ----------- | ------------------------------------------------------------------------------- |
| `NPM_TOKEN` | npm automation token with publish access to the `@eleventy-plugin-themer` scope |

#### Creating an npm Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to Access Tokens (click your avatar > Access Tokens)
3. Generate New Token > Granular Access Token
4. Configure:
   - Token name: `github-actions-eleventy-plugin-themer`
   - Expiration: Choose based on your needs
   - Packages: Select "Read and write" for packages matching `@eleventy-plugin-themer/*`
5. Copy the token and add it as `NPM_TOKEN` secret in GitHub

#### Adding Secrets to GitHub

1. Go to your repository on GitHub
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add `NPM_TOKEN` with your npm token value

### Manual Publishing

If needed, you can publish manually:

```bash
# Create a changeset
npm run changeset

# Update versions based on changesets
npm run version

# Publish to npm (requires npm login)
npm run release
```

## License

MIT
