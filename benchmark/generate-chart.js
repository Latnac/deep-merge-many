const fs = require("fs");
const path = require("path");

const CHART_COLORS = [
  { border: "#2563eb", fill: "rgba(37, 99, 235, 0.12)" },
  { border: "#dc2626", fill: "rgba(220, 38, 38, 0.08)" },
  { border: "#16a34a", fill: "rgba(22, 163, 74, 0.08)" },
  { border: "#ca8a04", fill: "rgba(202, 138, 4, 0.08)" },
  { border: "#9333ea", fill: "rgba(147, 51, 234, 0.08)" },
];

const OUR_SERIES_ID = "deepMergeMany";

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
 * @param {{ meta: object, series: { id: string, label: string, data: { count: number, hz: number }[] }[] }} results
 */
function generateChart(results) {
  const labels = results.series[0].data.map((d) => String(d.count));
  const datasets = results.series.map((series, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
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
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
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
    tr.ratio td { font-size: 0.75rem; color: #525252; font-style: italic; }
    tr.ratio td.ahead { color: #15803d; }
    tr.ratio td.behind { color: #b45309; }
  </style>
</head>
<body>
  <main>
    <h1>Multi-object merge benchmark</h1>
    <p class="note">
      Nested plain-object payloads. Libraries use different merge semantics;
      this chart compares throughput only. Regenerate with <code>pnpm bench</code>.
    </p>
    <div class="chart-wrap">
      <canvas id="chart" aria-label="Line chart of merge throughput by object count"></canvas>
    </div>
    <table>
      <thead>
        <tr>
          <th>Library</th>
          ${labels.map((n) => `<th>${n} objs</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${results.series
          .map((series) => {
            const highlight = series.id === "deepMergeMany" ? ' class="highlight"' : "";
            const cells = series.data
              .map((d) => {
                const hz = d.hz;
                const t = hz >= 1e6 ? `${(hz / 1e6).toFixed(2)}M` : hz >= 1e3 ? `${(hz / 1e3).toFixed(1)}k` : hz.toFixed(0);
                return `<td>${t}</td>`;
              })
              .join("");
            return `<tr${highlight}><td>${series.label}</td>${cells}</tr>`;
          })
          .join("")}
        <tr class="ratio">
          <td>deep-merge-many vs fastest rival</td>
          ${vsFastest
            .map((r) => `<td class="${r.ahead ? "ahead" : "behind"}">${r.short} ${r.compareLabel}</td>`)
            .join("")}
        </tr>
      </tbody>
    </table>
  </main>
  <script>
    const chartData = ${JSON.stringify(chartData)};

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
            text: "Source: pnpm bench · ${results.meta.startedAt.slice(0, 10)} · Node ${results.meta.node} · ops/sec (higher is faster) · green/red labels = deep-merge-many vs fastest rival",
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
  </script>
</body>
</html>
`;

  const chartPath = path.join(__dirname, "chart.html");
  fs.writeFileSync(chartPath, html);
  return chartPath;
}

const SVG_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
];

/**
 * @param {{ meta: object, series: { id: string, label: string, data: { count: number, hz: number }[] }[] }} results
 */
function generateBenchmarkSvg(results) {
  const width = 880;
  const height = 420;
  const pad = { top: 48, right: 24, bottom: 56, left: 72 };
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
    .map((series, si) => {
      const color = SVG_COLORS[si % SVG_COLORS.length];
      const strokeWidth = series.id === OUR_SERIES_ID ? 3 : 2;
      const points = series.data.map((d, i) => `${xAt(i)},${yAt(d.hz)}`).join(" ");
      return `<polyline fill="none" stroke="${color}" stroke-width="${strokeWidth}" points="${points}"/>`;
    })
    .join("");

  const legend = results.series
    .map((series, si) => {
      const color = SVG_COLORS[si % SVG_COLORS.length];
      const x = pad.left + si * 160;
      const y = 20;
      return `<rect x="${x}" y="${y - 8}" width="12" height="3" fill="${color}"/>
        <text x="${x + 18}" y="${y}" font-size="12" fill="#171717">${series.label}</text>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${width / 2}" y="28" text-anchor="middle" font-size="16" font-weight="600" fill="#171717">Merge throughput vs number of objects</text>
  ${legend}
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

module.exports = { generateChart, generateBenchmarkSvg, computeVsFastestRatios };
