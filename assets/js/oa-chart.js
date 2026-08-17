// Client-side chart and table helpers for the OA-barometer.
//
// Loaded from OJS cells via dynamic import(). The Observable Plot instance is
// passed in from the Quarto/Observable runtime, so this module has no
// dependencies of its own.
//
// The chart replicates the look of the previous static plots
// (ggplot2 + bbplot::bbc_style()): horizontal gridlines only, no axis titles,
// top-left legend, thick baseline at y = 0, and the original R colors.

// Category order = stacking order, bottom to top (matches the R factor levels)
export const OA_ORDER = [
  "diamant",
  "gull",
  "hybrid",
  "hybrid_avtale",
  "grønn",
  "deponert",
  "lukket",
];

// Hex equivalents of the R color names used by the pipeline
export const OA_COLORS = {
  diamant: "#00CDCD",        // cyan3
  gull: "#FFD700",           // gold
  hybrid: "#CDAD00",         // gold3
  hybrid_avtale: "#B8860B",  // darkgoldenrod
  "grønn": "#3CB371",        // mediumseagreen
  deponert: "#919191",       // grey57
  lukket: "#B3B3B3",         // grey70
};

export const fmtNo = new Intl.NumberFormat("nb-NO");
export const fmtPct1 = new Intl.NumberFormat("nb-NO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Build the Plot figure. Rows: {year, status, total, group?}.
function oaPlot(Plot, {
  data,
  mode = "abs",              // "abs" | "pct"
  categories = OA_ORDER,
  yearFrom = -Infinity,
  yearTo = Infinity,
  facet = false,             // facet horizontally by row.group
  showLabels = false,
  width = 900,
  height = 480,
}) {
  const isPct = mode === "pct";
  const cats = OA_ORDER.filter((c) => categories.includes(c));

  const rows = data
    .filter((d) => d.year >= yearFrom && d.year <= yearTo && cats.includes(d.status))
    .map((d) => ({ ...d }));

  // totals per year (and group) -> shares; shares are always computed so the
  // tooltip can show both absolute and percent regardless of mode
  const keyOf = (d) => `${d.group ?? ""}|${d.year}`;
  const totals = new Map();
  for (const d of rows) totals.set(keyOf(d), (totals.get(keyOf(d)) ?? 0) + d.total);
  for (const d of rows) {
    const t = totals.get(keyOf(d));
    d.share = t ? (d.total / t) * 100 : 0;
    d.value = isPct ? d.share : d.total;
  }

  // fixed stacking order: Plot stacks in input order
  rows.sort(
    (a, b) => a.year - b.year || cats.indexOf(a.status) - cats.indexOf(b.status)
  );

  // segment midpoints for optional in-bar value labels
  const maxStack = isPct ? 100 : Math.max(0, ...totals.values());
  const labelRows = [];
  if (showLabels) {
    const cum = new Map();
    for (const d of rows) {
      const k = keyOf(d);
      const y0 = cum.get(k) ?? 0;
      const y1 = y0 + d.value;
      cum.set(k, y1);
      if (d.value >= maxStack * 0.03) labelRows.push({ ...d, yMid: (y0 + y1) / 2 });
    }
  }

  const groups = facet ? [...new Set(rows.map((d) => d.group))] : null;

  // left margin sized to the widest tick label (Plot's 40px default clips
  // five-digit labels like "28 000", which reads as a repeating axis)
  const yMaxLabel = isPct ? "100 %" : fmtNo.format(Math.ceil(maxStack));
  const marginLeft = Math.max(44, 16 + yMaxLabel.length * 7.5);

  return Plot.plot({
    width,
    height,
    marginTop: 10,
    marginLeft,
    style: {
      fontFamily: "Barlow, 'Segoe UI', Arial, sans-serif",
      fontSize: "13px",
      background: "transparent",
    },
    x: {
      type: "band",
      label: null,
      tickFormat: (d) => String(d),
      tickSize: 0,
      paddingInner: 0.25,
    },
    y: {
      label: null,
      grid: true,
      domain: isPct ? [0, 100] : undefined,
      ticks: isPct ? [0, 25, 50, 75, 100] : undefined,
      tickFormat: isPct ? (d) => `${d} %` : (d) => fmtNo.format(d),
      nice: !isPct,
    },
    color: {
      domain: cats,
      range: cats.map((c) => OA_COLORS[c]),
      legend: true,
    },
    ...(facet ? { fx: { label: null, domain: groups } } : {}),
    marks: [
      Plot.barY(rows, {
        x: "year",
        y: "value",
        fill: "status",
        ...(facet ? { fx: "group" } : {}),
        tip: true,
        title: (d) =>
          `${d.year}${d.group ? " · " + d.group : ""}\n${d.status}: ` +
          `${fmtNo.format(d.total)} artikler (${fmtPct1.format(d.share)} %)`,
      }),
      ...(showLabels
        ? [
            Plot.text(labelRows, {
              x: "year",
              y: "yMid",
              ...(facet ? { fx: "group" } : {}),
              text: (d) =>
                isPct ? fmtPct1.format(d.share) : fmtNo.format(d.total),
              fill: "#222222",
              stroke: "#ffffff",
              strokeWidth: 3,
              fontSize: 11,
              fontWeight: 600,
            }),
          ]
        : []),
      Plot.ruleY([0], { stroke: "#222222", strokeWidth: 2 }),
    ],
  });
}

// Chart with bbplot-style header (bold title + subtitle) and a footer with
// source text and the openscience.no logo, like finalise_plot() produced.
export function oaChartCard(Plot, {
  title = "",
  subtitle = "",
  source = "Kilde: Sikt / LÅT",
  logo = "assets/openscience-logo-graa.svg",
  ...plotOpts
}) {
  const card = document.createElement("figure");
  card.className = "oa-chart";

  if (title) {
    const h = document.createElement("div");
    h.className = "oa-chart-title";
    h.textContent = title;
    card.append(h);
  }
  if (subtitle) {
    const s = document.createElement("div");
    s.className = "oa-chart-subtitle";
    s.textContent = subtitle;
    card.append(s);
  }

  card.append(oaPlot(Plot, plotOpts));

  const foot = document.createElement("div");
  foot.className = "oa-chart-footer";
  const src = document.createElement("span");
  src.textContent = source;
  const img = document.createElement("img");
  img.src = logo;
  img.alt = "openscience.no";
  foot.append(src, img);
  card.append(foot);

  return card;
}

// Dual-thumb year range slider (NVI reporting year). Works as an OJS viewof:
// element.value = [from, to], emits bubbling "input" events on change.
export function yearRangeInput({ min, max, value = [min, max], label = "År" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "oa-year-slider";

  const lab = document.createElement("label");
  lab.textContent = label;

  const box = document.createElement("div");
  box.className = "oa-year-sliders";
  const track = document.createElement("div");
  track.className = "oa-year-track";
  const fill = document.createElement("div");
  fill.className = "oa-year-fill";

  const mk = (v) => {
    const r = document.createElement("input");
    r.type = "range";
    r.min = min;
    r.max = max;
    r.step = 1;
    r.value = v;
    return r;
  };
  const lo = mk(value[0]);
  const hi = mk(value[1]);
  box.append(track, fill, lo, hi);

  const readout = document.createElement("span");
  readout.className = "oa-year-readout";

  const pct = (v) => ((v - min) / Math.max(1, max - min)) * 100;
  const update = () => {
    const a = Math.min(+lo.value, +hi.value);
    const b = Math.max(+lo.value, +hi.value);
    fill.style.left = pct(a) + "%";
    fill.style.width = pct(b) - pct(a) + "%";
    readout.textContent = a === b ? String(a) : `${a}–${b}`;
    wrap.value = [a, b];
  };
  // native "input" events bubble from the range inputs to the wrapper, so
  // Observable's viewof listener fires after value has been updated here
  lo.addEventListener("input", update);
  hi.addEventListener("input", update);
  update();

  wrap.append(lab, box, readout);
  return wrap;
}

// Search/autocomplete combobox (input + datalist). Works as an OJS viewof:
// element.value = current text (trimmed), emits bubbling "input" events.
export function comboboxInput({ options, label = "", placeholder = "" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "oa-combobox";

  const lab = document.createElement("label");
  lab.textContent = label;

  const listId = "oa-list-" + Math.random().toString(36).slice(2, 9);
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = placeholder;
  input.setAttribute("list", listId);

  const dl = document.createElement("datalist");
  dl.id = listId;
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o;
    dl.append(opt);
  }

  Object.defineProperty(wrap, "value", {
    get: () => input.value.trim(),
    set: (v) => {
      input.value = v;
    },
  });

  wrap.append(lab, input, dl);
  return wrap;
}

// Table cell for "andel åpen": percent text over a proportional mini-bar
export function pctBarCell(pct) {
  const div = document.createElement("div");
  div.className = "oa-pct-bar";
  const p = Math.max(0, Math.min(100, pct));
  div.style.background = `linear-gradient(to right, #9fd6b8 ${p}%, #eef2f4 ${p}%)`;
  div.textContent = `${fmtPct1.format(pct)} %`;
  return div;
}

// Download rows as a semicolon-separated CSV (Norwegian Excel convention),
// with a BOM so æ/ø/å survive the Excel import.
// columns: [{key, header, value?}] where value is an optional accessor fn.
export function downloadCsv(rows, columns, filename) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [columns.map((c) => esc(c.header ?? c.key)).join(";")];
  for (const r of rows) {
    lines.push(
      columns
        .map((c) => esc(typeof c.value === "function" ? c.value(r) : r[c.key]))
        .join(";")
    );
  }
  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
