const fastifyDeepmerge = require("@fastify/deepmerge");
const classicDeepmerge = require("deepmerge");
const createDeepMerge = require("deep-merge");
const { merge: tsDeepmerge } = require("ts-deepmerge");
const { deepMergeMany } = require("../dist/index.js");

const mergeAllFastify = fastifyDeepmerge({ all: true });
const mergePairDeepMerge = createDeepMerge((_target, source) => source);

/** @param {Record<string, unknown>[]} objects */
function mergeManyClassic(objects) {
  return objects.reduce((acc, obj) => classicDeepmerge(acc, obj), {});
}

/** @param {Record<string, unknown>[]} objects */
function mergeManyDeepMergeLib(objects) {
  return objects.reduce((acc, obj) => mergePairDeepMerge(acc, obj), {});
}

/** @type {{ id: string, label: string, run: (objects: Record<string, unknown>[]) => unknown }[]} */
const implementations = [
  { id: "deepMergeMany", label: "deep-merge-many", run: (objects) => deepMergeMany(objects) },
  { id: "fastify", label: "@fastify/deepmerge", run: (objects) => mergeAllFastify(...objects) },
  { id: "tsDeepmerge", label: "ts-deepmerge", run: (objects) => tsDeepmerge(...objects) },
  { id: "deepmerge", label: "deepmerge", run: mergeManyClassic },
  { id: "deepMergeLib", label: "deep-merge", run: mergeManyDeepMergeLib },
];

module.exports = { implementations };
