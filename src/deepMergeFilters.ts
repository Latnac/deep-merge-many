import { compact, uniq } from 'lodash';

const isObject = function (a: any) {
  return !!a && a.constructor === Object;
};

function customMerge(array: (number | undefined)[], fct: (...values: number[]) => number): number {
  return fct(...compact(array));
}

export function deepMergeFilters(objects: Record<string, unknown>[]): Record<string, unknown> {
  const object = {};
  const keys = uniq([
    ...compact(objects)
      .filter((object) => Object.keys(object).length)
      .flatMap((object) => Object.keys(object)),
  ]);

  for (const key of keys) {
    if (objects.some((object) => isObject(object?.[key]))) {
      if (objects.every((object) => !Object.keys(object?.[key] || {}).length)) {
        Object.assign(object, { [key]: {} });
      } else {
        Object.assign(object, {
          [key]: deepMergeFilters(objects.map((object) => object?.[key]) as Record<string, unknown>[]),
        });
      }
    } else {
      Object.assign(object, {
        [key]: customMerge(
          objects.map((object) => object?.[key]) as (number | undefined)[],
          key === 'min' ? Math.min : Math.max,
        ),
      });
    }
  }

  return object;
}
