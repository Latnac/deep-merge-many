# Publishing to npm and GitHub

Releases are automated on **push to `main`**. CI runs tests, then when safeguards pass it:

1. Publishes to **[npmjs.com](https://www.npmjs.com/)** (`registry.npmjs.org`) — Trusted Publishing / OIDC, no `NPM_TOKEN`
2. Creates git tag **`v{version}`** and a **GitHub Release** with generated notes

## Which registry? (important)

| Registry | URL | Our setup |
|----------|-----|-----------|
| **Public npm** (what we use) | `https://registry.npmjs.org` | `npm install deep-merge-many` |
| **GitHub Packages** | `https://npm.pkg.github.com` | Not used — requires `@scope/name` and different auth |

The French doc [Utilisation du registre npm (GitHub Packages)](https://docs.github.com/fr/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) describes **GitHub Packages**, not the public npm registry. Do **not** point `publishConfig.registry` at `npm.pkg.github.com` unless you intentionally want installs from GitHub Packages only.

Our workflow follows GitHub’s guide for **npmjs.org**:

[Publishing Node.js packages → Publishing packages to the npm registry](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages#publishing-packages-to-the-npm-registry)

plus [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC instead of `NPM_TOKEN`).

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
   - **Description:** `Fast deep-merge for many plain objects — born from unioning Algolia facets and facets_stats across parallel search responses.`
   - **Website:** `https://github.com/Latnac/deep-merge-many#readme`
   - **Topics:** `deep-merge`, `algolia`, `merge`, `typescript`, `performance`

No `NPM_TOKEN` repository secret is needed.

### First release (manual — npm has no “create package” button)

npm does **not** let you register an empty package or configure Trusted Publishing **before** the first publish. Your profile shows **0 packages** until something is published once. That is normal.

**Step 1 — Publish `1.0.1` from your machine** (one time):

```bash
cd /path/to/deep-merge-many
pnpm install
pnpm test
pnpm run build
npm login          # npmjs.com account with 2FA
npm publish --access public
```

Confirm: [npmjs.com/package/deep-merge-many](https://www.npmjs.com/package/deep-merge-many) loads and your profile shows **1 package**.

**Step 2 — Enable Trusted Publishing** (only after step 1):

1. Open **[npmjs.com/package/deep-merge-many](https://www.npmjs.com/package/deep-merge-many)** (you must be logged in as the owner).
2. Tab **Settings** (or go directly to [package access/settings](https://www.npmjs.com/package/deep-merge-many/access)).
3. Section **Trusted publishing** → **GitHub Actions**.
4. Set **exactly** (case-sensitive — must match GitHub, not npm username):
   - **Organization or user:** `Latnac` (GitHub owner login, **not** `latnac` from npm)
   - **Repository:** `deep-merge-many`
   - **Workflow filename:** `ci.yml`
   - **Environment:** leave empty
   - **Allowed actions:** `npm publish` only
5. Save.

**Step 3 — CI for later versions** (`1.0.2`, …):

```bash
npm version patch
git push origin main
```

CI will publish via OIDC; you do not need `NPM_TOKEN` after step 2.

### npm Trusted Publishing (fixes OIDC 404 in CI)

If CI fails with:

```text
ERR_PNPM_AUTH_TOKEN_EXCHANGE ... status code 404
PUT .../deep-merge-many - Not found
```

the package usually **does not exist yet**, or **Trusted publishing** (step 2 above) is missing/wrong.

`package.json` repository URL must match GitHub:

`git+https://github.com/Latnac/deep-merge-many.git`

Docs: [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers) · [first publish limitation](https://github.com/npm/cli/issues/8544).

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

## Troubleshooting publish failures

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| `ERR_PNPM_AUTH_TOKEN_EXCHANGE` / OIDC 404 | Trusted publisher not configured or typo in repo/workflow | Re-check npm trusted publisher: `Latnac`, `deep-merge-many`, `ci.yml` |
| `PUT ... Not found` but provenance signed | Often **old npm in CI** or wrong trusted publisher user | CI upgrades npm to 11.6.2+; use `Latnac` not `latnac` on npm |
| `PUT ... Not found` after OIDC warning | Trusted publisher mismatch | Fix trusted publisher, re-run workflow |
| Publish skipped | Version unchanged on push | `npm version patch` and push |
| `Version already published` | That version is on npm | Bump to next version |
| Release step failed | Workflow permissions | GitHub → Actions → **Read and write** |
