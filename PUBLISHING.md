# Publishing to npm and GitHub

Releases are automated on **push to `main`**. CI runs tests, then when safeguards pass it:

1. Publishes to **npm** (Trusted Publishing / OIDC — no `NPM_TOKEN`)
2. Creates git tag **`v{version}`** and a **GitHub Release** with generated notes

## Safeguards (automated)

On each push to `main`, after tests and build succeed:

1. **`package.json` version must be valid semver**
2. **Version must change on that push** — ordinary merges without a version bump do not release
3. **Version must not already exist on npm** — fails if already published
4. **Tag `v{version}` must not already exist on GitHub** — fails if the tag is taken

## Maintainer workflow

1. Bump the version (commit the change):

   ```bash
   npm version patch   # or minor | major
   ```

2. Push to `main`:

   ```bash
   git push origin main
   ```

3. Confirm in [Actions](https://github.com/Latnac/deep-merge-many/actions), [Releases](https://github.com/Latnac/deep-merge-many/releases), and [npm](https://www.npmjs.com/package/deep-merge-many).

Do **not** push version tags manually — CI creates `v1.0.1` etc. after a successful npm publish.

`prepublishOnly` still runs tests and build before publish.

## One-time setup

### GitHub repository

1. Create or open [github.com/Latnac/deep-merge-many](https://github.com/Latnac/deep-merge-many).
2. Set visibility to **Public** (Settings → General → Danger zone / Change visibility) so the package and releases are easy to discover.
3. **Settings → Actions → General → Workflow permissions**: choose **Read and write permissions** (required for `gh release create` with the default `GITHUB_TOKEN`).
4. Optional **About** metadata:
   - **Description:** `Fast deep-merge for many plain objects — born from merging Algolia facet/range metadata across parallel search responses.`
   - **Website:** `https://github.com/Latnac/deep-merge-many#readme`
   - **Topics:** `deep-merge`, `algolia`, `merge`, `typescript`, `performance`

No `NPM_TOKEN` repository secret is needed.

### npm Trusted Publishing

1. Account at [npmjs.com](https://www.npmjs.com/) with **2FA** enabled.
2. Package **deep-merge-many** → **Settings** → **Trusted publishing** (or account-level **Publishing** → **Trusted publishers** before the first publish).
3. Add **GitHub Actions** publisher:
   - **Repository:** `Latnac/deep-merge-many`
   - **Workflow filename:** `ci.yml`
   - **Environment:** leave empty
4. Confirm the name is free: `npm view deep-merge-many` (404 until first publish).

Docs: [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers).

### First release

Trusted Publishing must be configured **before** CI can publish. For a brand-new package you can either:

- Bump version, push to `main`, and let CI publish once Trusted Publishing is linked, or  
- Publish once locally with 2FA (`pnpm publish --access public`), then use CI for all later versions.

## Manual publish (fallback)

```bash
pnpm install
pnpm test
pnpm run build
npm pack --dry-run
pnpm publish --access public
```

Then create the tag and release yourself if CI did not run:

```bash
git tag v1.0.1
git push origin v1.0.1
gh release create v1.0.1 --generate-notes
```

## Verify after release

```bash
npm install deep-merge-many
```

In a scratch project: `import { deepMerge } from "deep-merge-many"`.

## Local dry-run of publish checks

```bash
GITHUB_EVENT_BEFORE="$(git rev-parse HEAD^)" GITHUB_SHA="$(git rev-parse HEAD)" node scripts/check-npm-publish.mjs
```

Without `GITHUB_OUTPUT`, the script prints to stdout and exits 0 (skip) or 1 (block).
