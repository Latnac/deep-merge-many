# Contributing

Thanks for helping improve **deep-merge-many**.

## Setup

- Node 18+
- [pnpm](https://pnpm.io/) 11+

```bash
pnpm install
pnpm test
pnpm run build
```

## Pull requests

1. Open an issue for large changes when possible.
2. Keep the diff focused — match existing style in `src/deepMergeMany.ts`.
3. Add or update tests in `src/deepMergeMany.test.ts` for behavior changes.
4. Run `pnpm test` and `pnpm run build` before opening a PR.
5. If you change benchmark fixtures or implementations, run `pnpm bench` and commit updated `docs/benchmark.png` and `docs/benchmark-size.png` (and related chart files) when numbers shift meaningfully.

## Releases

Merging to `main` can publish to npm and create a GitHub Release (`v* tag`) when `package.json` **version** increases on that push. Bump with `npm version patch|minor|major` in a dedicated commit before merging. See [PUBLISHING.md](PUBLISHING.md).

## Reporting issues

Include Node version, a minimal input array, expected vs actual output, and whether the case relates to numeric `min`/`max` or nested objects.
