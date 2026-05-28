const zlib = require("zlib");
const path = require("path");

/** @type {Record<string, string>} */
const BUNDLE_ENTRY = {
  deepMergeMany: `
    const { deepMerge } = require("./dist/index.js");
    module.exports = deepMerge;
  `,
  fastify: `
    const fastifyDeepmerge = require("@fastify/deepmerge");
    module.exports = fastifyDeepmerge({ all: true });
  `,
  tsDeepmerge: `
    const { merge } = require("ts-deepmerge");
    module.exports = merge;
  `,
  deepmerge: `
    module.exports = require("deepmerge");
  `,
  deepMergeLib: `
    const createDeepMerge = require("deep-merge");
    module.exports = createDeepMerge((target, source) => source);
  `,
};

/**
 * @param {string} contents
 */
async function measureBundleSize(contents) {
  const esbuild = require("esbuild");
  const result = await esbuild.build({
    stdin: {
      contents: contents.trim(),
      loader: "js",
      resolveDir: path.join(__dirname, ".."),
    },
    bundle: true,
    minify: true,
    platform: "browser",
    format: "cjs",
    write: false,
  });

  const code = result.outputFiles[0].text;
  const minified = Buffer.byteLength(code, "utf8");
  const gzip = zlib.gzipSync(code, { level: 9 }).length;
  return { minified, gzip };
}

/**
 * @param {{ id: string, label: string }[]} implementations
 */
async function measureAllBundleSizes(implementations) {
  const libraries = [];

  for (const impl of implementations) {
    const entry = BUNDLE_ENTRY[impl.id];
    if (!entry) {
      throw new Error(`No bundle entry for implementation "${impl.id}"`);
    }
    const sizes = await measureBundleSize(entry);
    libraries.push({ id: impl.id, label: impl.label, ...sizes });
  }

  return {
    note: "Minified JS bundled with esbuild (browser target); gzip level 9. Reflects typical client import cost, not npm package tarball size.",
    libraries,
  };
}

/** @param {number} bytes */
function formatBytes(bytes) {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

module.exports = { measureAllBundleSizes, measureBundleSize, formatBytes };
