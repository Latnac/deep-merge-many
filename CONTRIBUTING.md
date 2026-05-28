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
2. Keep the diff focused — match existing style in `src/deepMerge.ts`.
3. Add or update tests in `src/deepMerge.test.ts` for behavior changes.
4. Run `pnpm test` and `pnpm run build` before opening a PR.
5. If you change benchmark fixtures or implementations, run `pnpm bench` and commit updated `docs/benchmark.png` (and related chart files) when numbers shift meaningfully.

## Reporting issues

Include Node version, a minimal input array, expected vs actual output, and whether the case relates to numeric `min`/`max` or nested objects.
