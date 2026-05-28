/**
 * Multi-object merge throughput across increasing batch sizes.
 * Writes benchmark/results.json and benchmark/chart.html.
 */
const fs = require("fs");
const path = require("path");
const Benchmark = require("benchmark");
const { manyObjects } = require("./fixtures.js");
const { implementations } = require("./lib.js");
const { generateChart, generateBenchmarkSvg, generateBundleSizeSvg } = require("./generate-chart.js");
const { measureAllBundleSizes, formatBytes } = require("./measure-size.js");

/** @type {number[]} */
const OBJECT_COUNTS = [5, 10, 25, 50, 100];

const MIN_SAMPLES = 50;

/**
 * @param {Record<string, unknown>[]} objects
 * @param {{ id: string, label: string, run: (objects: Record<string, unknown>[]) => unknown }} impl
 */
function measure(objects, impl) {
  return new Promise((resolve, reject) => {
    const suite = new Benchmark.Suite();
    suite.add(impl.label, () => impl.run(objects));
    suite
      .on("cycle", () => {})
      .on("error", reject)
      .on("complete", function () {
        const target = this[0];
        resolve({
          id: impl.id,
          label: impl.label,
          hz: target.hz,
          meanMs: target.times.period * 1000,
        });
      })
      .run({ async: true, minSamples: MIN_SAMPLES });
  });
}

/**
 * @param {number} count
 */
async function benchObjectCount(count) {
  const objects = manyObjects(count);
  console.log(`\n── ${count} object(s) ──`);

  /** @type {Record<string, { id: string, label: string, hz: number, meanMs: number }>} */
  const libraries = {};

  for (const impl of implementations) {
    const result = await measure(objects, impl);
    libraries[impl.id] = result;
    console.log(`  ${result.label}: ${formatHz(result.hz)} ops/sec (mean ${result.meanMs.toFixed(4)} ms)`);
  }

  const fastest = Object.values(libraries).sort((a, b) => b.hz - a.hz)[0];
  console.log(`  → fastest: ${fastest.label}`);

  return { count, libraries };
}

function formatHz(hz) {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)}M`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)}k`;
  return hz.toFixed(0);
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("Multi-object deep merge benchmark");
  console.log(`Object counts: ${OBJECT_COUNTS.join(", ")}`);
  console.log("Semantics differ across libraries — throughput only.\n");

  const runs = [];
  for (const count of OBJECT_COUNTS) {
    runs.push(await benchObjectCount(count));
  }

  console.log("\n── Bundle size (minified + gzip) ──");
  const bundleSize = await measureAllBundleSizes(implementations);
  for (const lib of bundleSize.libraries) {
    console.log(`  ${lib.label}: ${formatBytes(lib.minified)} minified, ${formatBytes(lib.gzip)} gzip`);
  }

  const results = {
    meta: {
      startedAt,
      finishedAt: new Date().toISOString(),
      objectCounts: OBJECT_COUNTS,
      node: process.version,
      platform: process.platform,
      note: "Throughput (ops/sec) on identical nested payloads; outputs are not equivalent.",
    },
    bundleSize,
    runs,
    series: implementations.map((impl) => ({
      id: impl.id,
      label: impl.label,
      data: runs.map((run) => ({
        count: run.count,
        hz: run.libraries[impl.id].hz,
        meanMs: run.libraries[impl.id].meanMs,
      })),
    })),
  };

  const outDir = path.join(__dirname);
  const resultsPath = path.join(outDir, "results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${resultsPath}`);

  const chartPath = generateChart(results);
  console.log(`Wrote ${chartPath}`);

  const svgPath = generateBenchmarkSvg(results);
  console.log(`Wrote ${svgPath}`);

  const sizeSvgPath = generateBundleSizeSvg(results);
  console.log(`Wrote ${sizeSvgPath}`);

  try {
    const { Resvg } = require("@resvg/resvg-js");
    const docsDir = path.dirname(svgPath);
    for (const [name, file] of [
      ["benchmark.png", svgPath],
      ["benchmark-size.png", sizeSvgPath],
    ]) {
      const pngPath = path.join(docsDir, name);
      const resvg = new Resvg(fs.readFileSync(file), { fitTo: { mode: "width", value: 880 } });
      fs.writeFileSync(pngPath, resvg.render().asPng());
      console.log(`Wrote ${pngPath}`);
    }
  } catch (err) {
    console.warn("Skipping PNG export (install @resvg/resvg-js):", err.message);
  }

  console.log("\nOpen benchmark/chart.html in a browser to view the chart.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
