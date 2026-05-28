# Publishing to npm

Checklist for maintainers releasing **deep-merge-many**.

## Before each release

```bash
pnpm install
pnpm test
pnpm run build
npm pack --dry-run
```

Inspect the tarball: it should contain `dist/`, `README.md`, `LICENSE`, and `package.json` only (no `src/`, tests, or benchmarks).

## First-time npm setup

1. Create an account at [npmjs.com](https://www.npmjs.com/) if needed.
2. Enable **2FA** on the account (recommended).
3. Log in locally: `npm login`
4. Confirm the package name is available: `npm view deep-merge-many` (404 until first publish).

## Version bump and publish

```bash
# patch | minor | major
npm version patch

pnpm publish --access public
```

`prepublishOnly` runs tests and build automatically.

## After publish

1. Push commits and tags: `git push && git push --tags`
2. Create a [GitHub Release](https://github.com/Latnac/deep-merge-many/releases) for the tag (e.g. `v1.0.1`) with a short changelog.
3. Verify install: `npm install deep-merge-many` in a scratch project and `import { deepMerge } from "deep-merge-many"`.

## GitHub repository metadata

Set once in the repo **About** section:

- **Description:** `Fast deep-merge for many plain objects — born from merging Algolia facet filters at MOS.`
- **Website:** `https://github.com/Latnac/deep-merge-many#readme`
- **Topics:** `deep-merge`, `algolia`, `merge`, `typescript`, `performance`

## Optional: automated publish on tag

You can add a workflow on `v*` tags that runs CI and `npm publish` with an `NPM_TOKEN` repository secret. Not required for the first release.
