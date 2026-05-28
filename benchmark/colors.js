/** @typedef {{ border: string, fill: string }} SeriesColor */

/** @type {SeriesColor[]} */
const PALETTE = [
  { border: "#2563eb", fill: "rgba(37, 99, 235, 0.12)" },
  { border: "#dc2626", fill: "rgba(220, 38, 38, 0.08)" },
  { border: "#16a34a", fill: "rgba(22, 163, 74, 0.08)" },
  { border: "#ca8a04", fill: "rgba(202, 138, 4, 0.08)" },
  { border: "#9333ea", fill: "rgba(147, 51, 234, 0.08)" },
];

const OUR_SERIES_ID = "deepMergeMany";

/**
 * Stable color index: same order as `implementations` in lib.js / `results.series`.
 * @param {string} id
 * @param {{ id: string }[]} series
 */
function seriesColorIndex(id, series) {
  const i = series.findIndex((s) => s.id === id);
  if (i < 0) {
    throw new Error(`Unknown series id "${id}"`);
  }
  return i;
}

/**
 * @param {string} id
 * @param {{ id: string }[]} series
 * @returns {SeriesColor}
 */
function colorForSeriesId(id, series) {
  return PALETTE[seriesColorIndex(id, series) % PALETTE.length];
}

/**
 * @param {string} id
 * @param {{ id: string }[]} series
 */
function borderColorForSeriesId(id, series) {
  return colorForSeriesId(id, series).border;
}

/**
 * Libraries in benchmark series order (matches throughput chart legend).
 * @param {{ id: string, label: string, minified: number, gzip: number }[]} libraries
 * @param {{ id: string, label: string }[]} series
 */
function orderLibrariesLikeSeries(libraries, series) {
  const byId = new Map(libraries.map((lib) => [lib.id, lib]));
  return series.map((s) => {
    const lib = byId.get(s.id);
    if (!lib) {
      throw new Error(`bundleSize missing library "${s.id}"`);
    }
    return lib;
  });
}

module.exports = {
  PALETTE,
  OUR_SERIES_ID,
  colorForSeriesId,
  borderColorForSeriesId,
  seriesColorIndex,
  orderLibrariesLikeSeries,
};
