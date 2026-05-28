/** @type {Record<string, unknown>[]} */
const twoObjects = [
  {
    nested: {
      scores: { "500": 5, "2000": 1, "2400": 1 },
      tier: { High: 3, Medium: 8 },
    },
    limits: {
      scores: { max: 6000, min: 6000 },
    },
  },
  {
    nested: {
      scores: { "500": 2, "2000": 5, "2400": 1 },
      tier: { High: 2, Medium: 9 },
    },
    limits: {
      scores: { min: 100, max: 6000 },
    },
  },
];

/** @param {number} [count] */
function manyObjects(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    nested: {
      scores: {
        "500": 5 + (i % 3),
        "2000": 1 + i,
        "2400": 1,
      },
      tier: {
        High: 3 + (i % 2),
        Medium: 8 + i,
      },
    },
    limits: {
      scores: {
        min: 100 * (i + 1),
        max: 6000,
      },
    },
  }));
}

module.exports = { twoObjects, manyObjects };
