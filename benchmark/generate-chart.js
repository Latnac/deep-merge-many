const fs = require("fs");
const path = require("path");
const { formatBytes } = require("./measure-size.js");
const {
  OUR_SERIES_ID,
  colorForSeriesId,
  borderColorForSeriesId,
  orderLibrariesLikeSeries,
} = require("./colors.js");

/**
 * @param {{ id: string, label: string, data: { count: number, hz: number }[] }[]} series
 */
function computeVsFastestRatios(series) {
  const ourSeries = series.find((s) => s.id === OUR_SERIES_ID);
  if (!ourSeries) return [];

  return ourSeries.data.map((_, i) => {
    const ranked = series
      .map((s) => ({ id: s.id, label: s.label, hz: s.data[i].hz }))
      .sort((a, b) => b.hz - a.hz);
    const ours = ranked.find((p) => p.id === OUR_SERIES_ID);
    const fastest = ranked[0];

    if (fastest.id === OUR_SERIES_ID) {
      const runnerUp = ranked[1];
      const ratio = ours.hz / runnerUp.hz;
      return {
        count: ourSeries.data[i].count,
        ratio,
        ahead: true,
        compareLabel: runnerUp.label,
        short: `${ratio.toFixed(2)}×`,
        detail: `${ratio.toFixed(2)}× vs ${runnerUp.label} (ahead)`,
      };
    }

    const ratio = ours.hz / fastest.hz;
    return {
      count: ourSeries.data[i].count,
      ratio,
      ahead: false,
      compareLabel: fastest.label,
      short: `${ratio.toFixed(2)}×`,
      detail: `${ratio.toFixed(2)}× vs ${fastest.label} (behind)`,
    };
  });
}

/**
 * @param {{ id: string, label: string, minified: number, gzip: number }[]} libraries
 * @param {{ id: string }[]} series throughput series (defines stable colors per library)
 */
function bundleSizeChartData(libraries, series) {
  const ordered = orderLibrariesLikeSeries(libraries, series);

  return {
    labels: ordered.map((l) => l.label),
    ids: ordered.map((l) => l.id),
    datasets: [
      {
        label: "Gzip (bundled)",
        data: ordered.map((l) => l.gzip),
        minified: ordered.map((l) => l.minified),
        backgroundColor: ordered.map((l) => borderColorForSeriesId(l.id, series)),
        borderColor: ordered.map((l) => borderColorForSeriesId(l.id, series)),
        borderWidth: ordered.map((l) => (l.id === OUR_SERIES_ID ? 2 : 1)),
      },
    ],
  };
}

/**
 * @param {{ meta: object, series: { id: string, label: string, data: { count: number, hz: number }[] }[], bundleSize?: { libraries: { id: string, label: string, minified: number, gzip: number }[] } }} results
 */
function generateChart(results) {
  const labels = results.series[0].data.map((d) => String(d.count));
  const datasets = results.series.map((series) => {
    const color = colorForSeriesId(series.id, results.series);
    return {
      label: series.label,
      data: series.data.map((d) => Math.round(d.hz)),
      borderColor: color.border,
      backgroundColor: color.fill,
      borderWidth: series.id === "deepMergeMany" ? 3 : 2,
      pointRadius: series.id === "deepMergeMany" ? 5 : 3,
      tension: 0.2,
      fill: false,
    };
  });

  const vsFastest = computeVsFastestRatios(results.series);
  const ourDatasetIndex = results.series.findIndex((s) => s.id === OUR_SERIES_ID);

  const chartData = { labels, datasets, vsFastest, ourDatasetIndex };
  const sizeChartData = results.bundleSize
    ? bundleSizeChartData(results.bundleSize.libraries, results.series)
    : null;

  const sizeTableRows = results.bundleSize
    ? orderLibrariesLikeSeries(results.bundleSize.libraries, results.series).map((lib) => {
          const highlight = lib.id === OUR_SERIES_ID ? ' class="highlight"' : "";
          return `<tr${highlight}><td>${lib.label}</td><td>${formatBytes(lib.minified)}</td><td>${formatBytes(lib.gzip)}</td></tr>`;
        })
        .join("")
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>deep-merge-many benchmark</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 2rem;
      background: #fafafa;
      color: #171717;
    }
    main { max-width: 960px; margin: 0 auto; }
    h1, h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    h2 { margin-top: 2.5rem; }
    p.note {
      margin: 0 0 1.5rem;
      font-size: 0.875rem;
      color: #525252;
      line-height: 1.5;
    }
    .chart-wrap {
      position: relative;
      height: 420px;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 1rem;
    }
    table {
      width: 100%;
      margin-top: 2rem;
      border-collapse: collapse;
      font-size: 0.8125rem;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { padding: 0.5rem 0.75rem; text-align: right; border-bottom: 1px solid #f0f0f0; }
    th:first-child, td:first-child { text-align: left; }
    thead th { background: #f5f5f5; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    tr.highlight td { font-weight: 600; background: #eff6ff; }
    td .cell-hz { display: block; }
    td .cell-ratio {
      display: block;
      margin-top: 0.2rem;
      font-size: 0.6875rem;
      font-weight: 500;
      font-style: italic;
    }
    td .cell-ratio.ahead { color: #15803d; }
    td .cell-ratio.behind { color: #b45309; }
  </style>
</head>
<body>
  <main>
    <h1>Multi-object merge benchmark</h1>
    <p class="note">
      Nested plain-object payloads. Libraries use different merge semantics;
      Throughput and bundle size use different methodologies; see notes below.
      Regenerate with <code>pnpm bench</code>.
    </p>
    <div class="chart-wrap">
      <canvas id="chart" aria-label="Line chart of merge throughput by object count"></canvas>
    </div>
    <table aria-label="Throughput by object count">
      <thead>
        <tr>
          <th>Library</th>
          ${labels.map((n) => `<th>${n} objs</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${results.series
          .map((series) => {
            const highlight = series.id === OUR_SERIES_ID ? ' class="highlight"' : "";
            const cells = series.data
              .map((d, i) => {
                const hz = d.hz;
                const t = hz >= 1e6 ? `${(hz / 1e6).toFixed(2)}M` : hz >= 1e3 ? `${(hz / 1e3).toFixed(1)}k` : hz.toFixed(0);
                if (series.id === OUR_SERIES_ID && vsFastest[i]) {
                  const r = vsFastest[i];
                  return `<td><span class="cell-hz">${t}</span><span class="cell-ratio ${r.ahead ? "ahead" : "behind"}">${r.short} vs ${r.compareLabel}</span></td>`;
                }
                return `<td>${t}</td>`;
              })
              .join("");
            return `<tr${highlight}><td>${series.label}</td>${cells}</tr>`;
          })
          .join("")}
      </tbody>
    </table>
    ${
      sizeChartData
        ? `
    <h2>Bundle size</h2>
    <p class="note">
      Each library entry point bundled with esbuild (browser, minified).
      Gzip at level 9 — typical transfer size, not npm tarball weight.
    </p>
    <div class="chart-wrap" style="height: 280px;">
      <canvas id="sizeChart" aria-label="Horizontal bar chart of bundled library size"></canvas>
    </div>
    <table aria-label="Bundled library size">
      <thead>
        <tr>
          <th>Library</th>
          <th>Minified</th>
          <th>Gzip</th>
        </tr>
      </thead>
      <tbody>
        ${sizeTableRows}
      </tbody>
    </table>`
        : ""
    }
  </main>
  <script>
    const chartData = ${JSON.stringify(chartData)};
    const sizeChartData = ${JSON.stringify(sizeChartData)};

    function formatHz(hz) {
      if (hz >= 1e6) return (hz / 1e6).toFixed(2) + "M";
      if (hz >= 1e3) return (hz / 1e3).toFixed(1) + "k";
      return String(hz);
    }

    const ratioLabelPlugin = {
      id: "ratioLabel",
      afterDatasetsDraw(chart) {
        const { vsFastest, ourDatasetIndex } = chart.config.data;
        if (ourDatasetIndex < 0 || !vsFastest?.length) return;

        const meta = chart.getDatasetMeta(ourDatasetIndex);
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "600 10px system-ui, sans-serif";
        ctx.textAlign = "center";

        meta.data.forEach((point, i) => {
          const r = vsFastest[i];
          if (!r || point.skip) return;
          const { x, y } = point.getProps(["x", "y"], true);
          ctx.fillStyle = r.ahead ? "#15803d" : "#b45309";
          ctx.fillText(r.short, x, y - 10);
        });
        ctx.restore();
      },
    };

    const config = {
      type: "line",
      data: chartData,
      plugins: [ratioLabelPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        layout: { padding: { top: 24 } },
        plugins: {
          title: {
            display: true,
            text: "Merge throughput vs number of objects",
            font: { size: 18, weight: "600" },
            padding: { bottom: 8 },
          },
          subtitle: {
            display: true,
            text: "Source: pnpm bench · ${results.meta.startedAt.slice(0, 10)} · Node ${results.meta.node} · ops/sec (higher is faster)",
            padding: { bottom: 20 },
          },
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                return ctx.dataset.label + ": " + formatHz(ctx.parsed.y) + " ops/sec";
              },
              afterBody(items) {
                if (!items.length || !chartData.vsFastest) return [];
                const r = chartData.vsFastest[items[0].dataIndex];
                return r ? ["", "deep-merge-many: " + r.detail] : [];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Number of objects merged" },
            grid: { display: false },
          },
          y: {
            title: { display: true, text: "Throughput (operations per second)" },
            beginAtZero: true,
            ticks: {
              callback(value) {
                if (value >= 1e6) return value / 1e6 + "M";
                if (value >= 1e3) return value / 1e3 + "k";
                return value;
              },
            },
          },
        },
      },
    };

    new Chart(document.getElementById("chart"), config);

    if (sizeChartData) {
      new Chart(document.getElementById("sizeChart"), {
        type: "bar",
        data: sizeChartData,
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Bundled size (gzip, lower is smaller)",
              font: { size: 16, weight: "600" },
            },
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const i = ctx.dataIndex;
                  const gzip = ctx.parsed.x;
                  const min = sizeChartData.datasets[0].minified[i];
                  return [
                    "gzip: " + gzip.toLocaleString() + " B",
                    "minified: " + min.toLocaleString() + " B",
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: "Bytes (gzip)" },
              beginAtZero: true,
              ticks: {
                callback(value) {
                  if (value >= 1024) return (value / 1024).toFixed(1) + " KB";
                  return value + " B";
                },
              },
            },
          },
        },
      });
    }
  </script>
</body>
</html>
`;

  const chartPath = path.join(__dirname, "chart.html");
  fs.writeFileSync(chartPath, html);
  return chartPath;
}

/** @param {string} s */
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * @param {{ id: string, label: string }[]} series
 * @param {number} width
 * @param {number} startY top of swatch row
 */
function renderSvgLegend(series, width, startY) {
  const fontSize = 11;
  const swatch = { w: 14, h: 3, gap: 6 };
  const itemGap = 20;
  const rowHeight = fontSize + 7;
  const rowGap = rowHeight + 2;
  const maxRowWidth = width - 48;

  const items = series.map((s) => {
    const textWidth = s.label.length * 6.2;
    const itemWidth = swatch.w + swatch.gap + textWidth;
    return {
      label: s.label,
      color: borderColorForSeriesId(s.id, series),
      itemWidth,
      bold: s.id === OUR_SERIES_ID,
    };
  });

  /** @type {typeof items[]} */
  const rows = [];
  let row = [];
  let rowWidth = 0;

  for (const item of items) {
    const extra = row.length ? itemGap : 0;
    if (row.length && rowWidth + extra + item.itemWidth > maxRowWidth) {
      rows.push(row);
      row = [item];
      rowWidth = item.itemWidth;
    } else {
      row.push(item);
      rowWidth += extra + item.itemWidth;
    }
  }
  if (row.length) rows.push(row);

  const parts = [];
  let y = startY;

  for (const rowItems of rows) {
    const totalWidth = rowItems.reduce(
      (sum, item, i) => sum + item.itemWidth + (i > 0 ? itemGap : 0),
      0,
    );
    let x = (width - totalWidth) / 2;

    for (const item of rowItems) {
      const centerY = y + rowHeight / 2;
      const swatchY = centerY - swatch.h / 2;
      parts.push(
        `<rect x="${x}" y="${swatchY}" width="${swatch.w}" height="${swatch.h}" fill="${item.color}" rx="1"/>`,
        `<text x="${x + swatch.w + swatch.gap}" y="${centerY}" dominant-baseline="middle" font-size="${fontSize}" fill="#171717" font-weight="${item.bold ? "600" : "400"}">${escapeXml(item.label)}</text>`,
      );
      x += item.itemWidth + itemGap;
    }
    y += rowGap;
  }

  return { svg: parts.join("\n  "), bottom: y };
}

/**
 * @param {{ meta: object, series: { id: string, label: string, data: { count: number, hz: number }[] }[] }} results
 */
function generateBenchmarkSvg(results) {
  const width = 880;
  const height = 420;
  const titleY = 24;
  const legend = renderSvgLegend(results.series, width, 36);
  const pad = { top: legend.bottom + 10, right: 24, bottom: 56, left: 72 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const labels = results.series[0].data.map((d) => String(d.count));
  const maxHz = Math.max(...results.series.flatMap((s) => s.data.map((d) => d.hz)));

  const xAt = (i) => pad.left + (i / (labels.length - 1)) * plotW;
  const yAt = (hz) => pad.top + plotH - (hz / maxHz) * plotH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = pad.top + plotH * (1 - t);
      const val = maxHz * t;
      const label = val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `${(val / 1e3).toFixed(0)}k` : val.toFixed(0);
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#f0f0f0"/>
        <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#737373">${label}</text>`;
    })
    .join("");

  const xLabels = labels
    .map(
      (label, i) =>
        `<text x="${xAt(i)}" y="${height - pad.bottom + 24}" text-anchor="middle" font-size="12" fill="#525252">${label}</text>`,
    )
    .join("");

  const paths = results.series
    .map((series) => {
      const color = borderColorForSeriesId(series.id, results.series);
      const strokeWidth = series.id === OUR_SERIES_ID ? 3 : 2;
      const points = series.data.map((d, i) => `${xAt(i)},${yAt(d.hz)}`).join(" ");
      return `<polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" points="${points}"/>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${width / 2}" y="${titleY}" text-anchor="middle" font-size="16" font-weight="600" fill="#171717">Merge throughput vs number of objects</text>
  ${legend.svg}
  ${gridLines}
  ${paths}
  ${xLabels}
  <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#525252">Number of objects merged</text>
  <text x="16" y="${height / 2}" text-anchor="middle" font-size="12" fill="#525252" transform="rotate(-90 16 ${height / 2})">ops/sec</text>
</svg>`;

  const docsDir = path.join(__dirname, "..", "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const svgPath = path.join(docsDir, "benchmark.svg");
  fs.writeFileSync(svgPath, svg);
  return svgPath;
}

/**
 * @param {{ bundleSize: { libraries: { id: string, label: string, minified: number, gzip: number }[] } }} results
 */
function generateBundleSizeSvg(results) {
  if (!results.bundleSize) {
    throw new Error("results.bundleSize is required for generateBundleSizeSvg");
  }

  const width = 880;
  const libraries = orderLibrariesLikeSeries(results.bundleSize.libraries, results.series);
  const rowHeight = 36;
  const legend = renderSvgLegend(results.series, width, 36);
  const pad = { top: legend.bottom + 10, right: 80, bottom: 40, left: 200 };
  const plotW = width - pad.left - pad.right;
  const plotH = libraries.length * rowHeight;
  const height = pad.top + plotH + pad.bottom;
  const maxGzip = Math.max(...libraries.map((l) => l.gzip));

  const bars = libraries
    .map((lib, i) => {
      const y = pad.top + i * rowHeight + 8;
      const barW = (lib.gzip / maxGzip) * plotW;
      const color = borderColorForSeriesId(lib.id, results.series);
      const strokeWidth = lib.id === OUR_SERIES_ID ? 2 : 0;
      const labelX = pad.left - 10;
      const barH = 18;
      const barY = y + (rowHeight - barH) / 2;
      const centerY = barY + barH / 2;
      return `<text x="${labelX}" y="${centerY}" text-anchor="end" dominant-baseline="middle" font-size="12" fill="#171717" font-weight="${lib.id === OUR_SERIES_ID ? "600" : "400"}">${escapeXml(lib.label)}</text>
        <rect x="${pad.left}" y="${barY}" width="${barW.toFixed(1)}" height="${barH}" fill="${color}" rx="2" stroke="${color}" stroke-width="${strokeWidth}"/>
        <text x="${pad.left + barW + 6}" y="${centerY}" dominant-baseline="middle" font-size="11" fill="#525252">${formatBytes(lib.gzip)} gzip</text>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${width / 2}" y="24" text-anchor="middle" font-size="16" font-weight="600" fill="#171717">Bundled library size (gzip)</text>
  ${legend.svg}
  ${bars}
  <text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#737373">esbuild bundle · browser · minified · gzip level 9</text>
</svg>`;

  const docsDir = path.join(__dirname, "..", "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const svgPath = path.join(docsDir, "benchmark-size.svg");
  fs.writeFileSync(svgPath, svg);
  return svgPath;
}

module.exports = {
  generateChart,
  generateBenchmarkSvg,
  generateBundleSizeSvg,
  computeVsFastestRatios,
  renderSvgLegend,
  bundleSizeChartData,
};
