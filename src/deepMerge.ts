// Plain objects only — arrays and other values are treated as leaves.
const isObject = function (a: any) {
  return !!a && a.constructor === Object;
};

function compact<T>(values: (T | undefined)[]): T[] {
  return values.filter((v): v is T => v !== undefined);
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

function customMerge(array: (number | undefined)[], fct: (...values: number[]) => number): number {
  return fct(...compact(array));
}

/**
 * Deep-merge multiple plain objects into one.
 * Nested objects are merged recursively; numeric leaves use max, except `min` which uses min.
 */
export function deepMerge(objects: Record<string, unknown>[]): Record<string, unknown> {
  const object = {};
  // Union keys from non-empty inputs only — skip undefined entries and {}.
  const keys = uniq([
    ...compact(objects)
      .filter((object) => Object.keys(object).length)
      .flatMap((object) => Object.keys(object)),
  ]);

  for (const key of keys) {
    if (objects.some((object) => isObject(object?.[key]))) {
      // All branches empty → keep the key as an empty object.
      if (objects.every((object) => !Object.keys(object?.[key] || {}).length)) {
        Object.assign(object, { [key]: {} });
      } else {
        Object.assign(object, {
          [key]: deepMerge(objects.map((object) => object?.[key]) as Record<string, unknown>[]),
        });
      }
    } else {
      // Numeric leaves: max by default, min when the key is `min`.
      Object.assign(object, {
        [key]: customMerge(objects.map((object) => object?.[key]) as (number | undefined)[], key === "min" ? Math.min : Math.max),
      });
    }
  }

  return object;
}
