// ---------------------------------------------------------------------------
// Client-side chart, input and table helpers for the OA-barometer.
// ---------------------------------------------------------------------------
//
// HOW THIS IS LOADED
// Each explorer page (.qmd) pulls this in from its first OJS cell:
//
//   oa = (new Function("u", "return import(u)"))(
//          new URL("assets/js/oa-chart.js", document.baseURI).href)
//
// The indirect `new Function` wrapper is there because Quarto rewrites a bare
// import(), and the dynamic import keeps everything client-side: there is no
// bundler, no npm install and no build step. Edit this file and reload.
//
// Observable Plot is NOT imported here - the page passes its own `Plot` in as
// the first argument to the drawing helpers. That keeps this module free of
// dependencies and avoids loading a second copy of Plot beside Quarto's.
//
// WHAT LIVES HERE
//   OA_ORDER / OA_COLORS / *_LABELS   data vocabulary + Norwegian display names
//   oaChartCard()                     the stacked bar figure, with header/footer
//   yearRangeInput() / comboboxInput() custom inputs usable as OJS `viewof`
//   pctBarCell()                      a table cell rendered as a mini bar
//   downloadCsv()                     client-side CSV export
//
// CHART LOOK
// The figure deliberately replicates the previous static R plots
// (ggplot2 + bbplot::bbc_style()): horizontal gridlines only, no axis titles,
// top-left legend, a thick baseline at y = 0, and the original R colours - so
// the site and the annual report stay visually consistent.

// The data (data/*.csv, written by pipeline/export-site-data.R) is English and
// ASCII throughout; everything the reader sees is Norwegian. The keys below are
// the data values, and the *_LABELS maps are the only place the two meet - so
// rewording the site never touches the data, and vice versa.

// Category order = stacking order, bottom to top (matches the R factor levels)
export const OA_ORDER = [
  "diamond",
  "gold",
  "hybrid",
  "hybrid_agreement",
  "green",
  "deposited",
  "closed",
];

// Hex equivalents of the R color names used by the pipeline
export const OA_COLORS = {
  diamond: "#00CDCD",           // cyan3
  gold: "#FFD700",              // gold
  hybrid: "#CDAD00",            // gold3
  hybrid_agreement: "#B8860B",  // darkgoldenrod
  green: "#3CB371",             // mediumseagreen
  deposited: "#919191",         // grey57
  closed: "#B3B3B3",            // grey70
};

// Norwegian display labels for the data values above
export const OA_LABELS = {
  diamond: "diamant",
  gold: "gull",
  hybrid: "hybrid",
  hybrid_agreement: "hybrid avtale",
  green: "grønn",
  deposited: "deponert",
  closed: "lukket",
};

export const SECTOR_LABELS = {
  all: "Alle",
  higher_education: "UH",
  institute: "Institutt",
  health: "Helse",
  archives_libraries_museums: "ABM",
  other: "OTHER",
};

export const DISCIPLINE_LABELS = {
  all: "Alle",
  natural_sciences_engineering: "Realfag og teknologi",
  health_sciences: "Medisin og helsefag",
  social_science: "Samfunnsvitenskap",
  humanities: "Humaniora",
};

// Label lookup that falls back to the raw key, so a new level coming out of the
// pipeline shows up on the site (untranslated) instead of rendering as blank
export const labelFor = (labels) => (key) => labels[key] ?? key;

// Norwegian number formatting: comma as the decimal mark, non-breaking space as
// the thousands separator ("16 458", "34,3"). Used for every number the reader
// sees, and for the CSV export so the files open cleanly in a Norwegian Excel.
export const fmtNo = new Intl.NumberFormat("nb-NO");
export const fmtPct1 = new Intl.NumberFormat("nb-NO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// The figure: one stacked bar per year, segments in OA_ORDER.
//
// Internal - callers use oaChartCard() instead, which wraps this in the
// title/source/logo frame.
//
//   Plot        Observable Plot, handed in by the calling page (see header)
//   data        rows of {year, status, total, group?} - straight from the CSVs
//   mode        "abs" = article counts, "pct" = 100 % stacked shares
//   categories  which OA statuses to include (order is ignored; OA_ORDER wins)
//   yearFrom/To inclusive year filter
//   facet       draw one panel per row.group (unused today; kept for the
//               planned comparison page)
//   showLabels  print the value inside each bar segment
//
// Returns a detached SVG element.
// ---------------------------------------------------------------------------
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
  // Intersect with OA_ORDER rather than using `categories` directly: the caller
  // may pass the selection in any order, but stacking order must stay fixed.
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

  // Plot stacks in *input* order, so sorting the rows is what actually pins the
  // segment order - the `cats` array above only decides which ones are drawn.
  rows.sort(
    (a, b) => a.year - b.year || cats.indexOf(a.status) - cats.indexOf(b.status)
  );

  // Optional in-bar labels: walk each stack bottom-up, remembering the running
  // height so a label can be placed at each segment's midpoint. Segments under
  // 3 % of the tallest stack are skipped - the text would not fit and would
  // collide with its neighbours.
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
      tickFormat: labelFor(OA_LABELS),   // English keys in, Norwegian legend out
    },
    ...(facet ? { fx: { label: null, domain: groups } } : {}),
    marks: [
      // tip: true turns the `title` channel below into a hover tooltip
      Plot.barY(rows, {
        x: "year",
        y: "value",
        fill: "status",
        ...(facet ? { fx: "group" } : {}),
        tip: true,
        title: (d) =>
          `${d.year}${d.group ? " · " + d.group : ""}\n` +
          `${labelFor(OA_LABELS)(d.status)}: ` +
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
              // white stroke under dark text = a halo, so labels stay readable
              // on top of any segment colour
              fill: "#222222",
              stroke: "#ffffff",
              strokeWidth: 3,
              fontSize: 11,
              fontWeight: 600,
            }),
          ]
        : []),
      // the thick baseline at y = 0 is a bbplot signature
      Plot.ruleY([0], { stroke: "#222222", strokeWidth: 2 }),
    ],
  });
}

// ---------------------------------------------------------------------------
// PUBLIC: the figure as a finished card - bold title, subtitle, the plot, then
// a footer with the source line and the openscience.no logo. Mirrors what
// bbplot's finalise_plot() produced for the static R charts.
//
// Any option not listed here is forwarded to oaPlot() (data, mode, categories,
// yearFrom/To, showLabels, width, height).
//
// Returns a detached <figure>; the OJS cell that calls this returns it and
// Observable inserts it into the page.
// ---------------------------------------------------------------------------
export function oaChartCard(Plot, {
  title = "",
  subtitle = "",
  source = "Kilde: Sikt / LÅT",
  // resolved against this module's own URL (assets/js/), not against the page,
  // so the logo keeps working for pages rendered into a subdirectory
  logo = new URL("../openscience-logo-graa.svg", import.meta.url).href,
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

// ---------------------------------------------------------------------------
// PUBLIC: dual-thumb year range slider over the NVI reporting year.
//
// Usable directly as an OJS input - `viewof natYears = oa.yearRangeInput(...)`
// - because it honours Observable's two-part contract: the element exposes a
// `.value` (here [from, to]) and fires a bubbling "input" event when it
// changes. Built by hand rather than with Inputs.range because Observable has
// no two-ended range input.
//
// Implementation: two overlaid <input type=range> with pointer-events disabled
// except on the thumbs, drawn over a shared track plus a fill div marking the
// selected span. Either thumb may be dragged past the other, so the value is
// always read as [min, max] of the two rather than [lo, hi].
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PUBLIC: search box with autocomplete, backed by a native <datalist>.
//
// Another OJS `viewof` input: `.value` is the trimmed text, and the native
// "input" event bubbles on its own. A datalist (rather than a custom dropdown)
// gives free keyboard handling and filtering, and degrades to a plain text
// field in browsers that do not render suggestions.
//
// Note the value is whatever is typed, not a validated choice - the page
// decides what counts as a match (see `selectedInst` in the institution page).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PUBLIC: table cell for "Andel åpen" - the percentage printed on top of a
// proportional bar, so a column of them reads as a mini chart. The bar is a
// hard-stop linear-gradient rather than a nested element, which keeps it to one
// DOM node per cell in tables that can run to thousands of rows.
// ---------------------------------------------------------------------------
export function pctBarCell(pct) {
  const div = document.createElement("div");
  div.className = "oa-pct-bar";
  const p = Math.max(0, Math.min(100, pct));
  div.style.background = `linear-gradient(to right, #9fd6b8 ${p}%, #eef2f4 ${p}%)`;
  div.textContent = `${fmtPct1.format(pct)} %`;
  return div;
}

// ---------------------------------------------------------------------------
// PUBLIC: export rows as a CSV file, built and downloaded entirely in the
// browser - there is no server to ask.
//
//   rows     array of row objects (the same objects the table renders)
//   columns  [{key, header, value?}] - `header` is the column name written out,
//            `value` an optional accessor for formatting (e.g. Norwegian
//            decimals); without it the raw row[key] is written
//   filename suggested download name
//
// Two Norwegian-Excel conventions matter here and are easy to break:
//   - semicolon separator, because Excel in a nb-NO locale treats comma as the
//     decimal mark and would otherwise put every row in one cell
//   - a UTF-8 BOM, without which Excel guesses the legacy codepage and mangles
//     the a-ring / o-slash / ae in institution names
// ---------------------------------------------------------------------------
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
