# deep-merge-many

[![CI](https://github.com/Latnac/deep-merge-many/actions/workflows/ci.yml/badge.svg)](https://github.com/Latnac/deep-merge-many/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/deep-merge-many.svg)](https://www.npmjs.com/package/deep-merge-many)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Deep-merge **many** plain objects in one call. Recurses into nested objects; combines numeric leaves with `Math.max`, except keys named `min` which use `Math.min`.

Optimized for merging large batches (10+ objects) in a single pass — see [benchmarks](#benchmarks).

## Why this exists

At **[MOS](https://www.askmos.com)** (student financial aid / scholarships), search runs on **Algolia** with many parallel queries. The product surfaces curated scholarship collections per student profile — state grants, major-specific lists, GPA tiers, deadlines, and more.

[`listSections`](https://github.com/Latnac/apistudentaid/blob/main/src/functions/explore_section/helpers/listSections.ts) builds dozens of `AidProgramCollection` entries, each with its own `searchBodyFilter` (e.g. `awardYears`, `type`, `nextDeadline`, profile facets). Those filters drive separate Algolia searches.

When combining results from **multiple Algolia responses**, facet and range metadata (`filterFacet`, `filterRange`) must be merged so bucket counts reflect the **union** of what each query returned — numeric leaves use max; keys named `min` use min. That logic lived as `deepMergeFilters` in the MOS API ([`searchStudentAidProgram.ts`](https://github.com/Latnac/apistudentaid/blob/main/src/functions/aid/helpers/searchStudentAidProgram.ts), [`deepMergeFilters.ts`](https://github.com/Latnac/apistudentaid/blob/main/src/functions/aid/helpers/deepMergeFilters.ts)).

**deep-merge-many** extracts that pattern into a small, dependency-free library you can reuse anywhere you need the same merge semantics at scale.

```mermaid
flowchart LR
  collections[Many search filters]
  algolia[Parallel Algolia queries]
  facets[filterFacet and filterRange per response]
  merge[deepMerge]
  ui[Unified facet UI]
  collections --> algolia --> facets --> merge --> ui
```

## Behavior

- **Nested plain objects** are merged recursively (arrays and other types are leaves).
- **Numeric leaves** use `Math.max` by default.
- Keys named **`min`** use `Math.min` instead.
- Empty entries, `undefined`, and `{}` are skipped when collecting keys.

## Install

```bash
npm install deep-merge-many
```

## Usage

```ts
import { deepMerge } from "deep-merge-many";

const merged = deepMerge([
  { bounds: { price: { min: 10, max: 100 } }, counts: { a: 3, b: 1 } },
  { bounds: { price: { min: 5, max: 200 } }, counts: { a: 1, b: 5 } },
  // …more pages or chunks
]);
// {
//   bounds: { price: { min: 5, max: 200 } },
//   counts: { a: 3, b: 5 },
// }
```

### Algolia facet / range merge (scholarship search)

After parallel Algolia queries, merge per-response facet counts into one object for the UI:

```ts
import { deepMerge } from "deep-merge-many";

const filterFacet = deepMerge(
  responses.map((r) => r.filterFacet),
) as Record<string, Record<string, number>>;

const filterRange = deepMerge(
  responses.map((r) => r.filterRange),
) as Record<string, Record<string, number>>;
```

The export is `deepMerge` — one function, any number of input objects.

## Development

Requires [pnpm](https://pnpm.io/) 11+ and Node 18+.

```bash
pnpm install
pnpm test
pnpm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests and [PUBLISHING.md](PUBLISHING.md) for npm releases.

## Benchmarks

Multi-object merge throughput (5 → 100 nested objects) vs [@fastify/deepmerge](https://github.com/fastify/deepmerge), [ts-deepmerge](https://www.npmjs.com/package/ts-deepmerge), [deepmerge](https://www.npmjs.com/package/deepmerge), and [deep-merge](https://www.npmjs.com/package/deep-merge).

**deep-merge-many** leads from ~10 objects upward on identical payloads. Other libraries use different merge rules — this measures throughput, not identical output.

![Benchmark: merge throughput vs number of objects](docs/benchmark.png)

```bash
pnpm bench
open benchmark/chart.html
```

Regenerates `benchmark/chart.html`, `docs/benchmark.svg`, and `docs/benchmark.png`.

## License

MIT
