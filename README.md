# deep-merge-filters

Deep-merge multiple search-filter objects into one. Built for aggregating Algolia-style facet and range filters across paginated or batched search results.

Originally written for the MOS `apistudentaid` service (`searchStudentAidProgram`).

## Behavior

- **Nested plain objects** are merged recursively.
- **Numeric leaves** use `Math.max` by default.
- Keys named **`min`** use `Math.min` instead.
- Empty entries, `undefined`, and `{}` are ignored when collecting keys.

## Install

```bash
npm install deep-merge-filters
```

Or clone this repo and use the source directly.

## Usage

```ts
import { deepMergeFilters } from 'deep-merge-filters';

const merged = deepMergeFilters([
  { filterRange: { awardAmount: { min: 6000, max: 6000 } } },
  { filterRange: { awardAmount: { min: 100, max: 6000 } } },
]);
// { filterRange: { awardAmount: { min: 100, max: 6000 } } }
```

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
