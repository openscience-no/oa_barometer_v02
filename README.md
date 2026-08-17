# OA-barometer (v2)

Quarto-based website for the OA-barometer, with design and layout based on
[openscience.no](https://www.openscience.no). Replaces the Drupal-based pages
at openscience.no/oa-barometer.

## Structure

```
_quarto.yml                  Site configuration (navigation, theme, grid)
index.qmd                    Front page (OA-barometeret)
national-overview.qmd        National explorer: one figure + mirrored table,
                             filters for sector/discipline/category/year
institutional-overview.qmd   Institution explorer: search/autocomplete,
                             per-institution figure + mirrored table
methodology.qmd              Method description (skeleton)
styles/theme.scss            openscience.no theme: colors, fonts, cards, footer
partials/footer.html         Sikt footer (included on every page)
assets/                      Logos, icons and self-hosted fonts
assets/js/oa-chart.js        Chart/table/input helpers (Observable Plot, bbplot look)
data/                        Aggregated CSVs consumed client-side (see data/README.md)
pipeline/export-site-data.R  Exports the data/ CSVs from the annual OA pipeline
.gitlab-ci.yml               Build + publish to GitLab Pages
```

## How the figures work

The pages use Observable JS (OJS) cells rendered entirely client-side - no R
or server is needed to build or serve the site. The figures replicate the
bbplot look of the previous static plots (same category colors and stacking
order as `nva_oa_barometer_output_v01.R`) and add interactivity: absolute/
percent toggle, category filtering, a year range slider (NVI reporting year),
hover tooltips and optional in-bar value labels. On each page, the same filter
state drives both the figure and a mirrored table with CSV export.

Counting semantics: the national page reads a pre-aggregated cube where each
(sector | Alle) × (discipline | Alle) cell is exactly deduplicated, so any
single filter combination shows correct unique-publication counts. The
institution page counts publications uniquely per institution. See
`data/README.md`. Side-by-side comparison (sectors/institutions) is
deliberately left out for now - planned as a separate comparison page.

Annual update flow:

1. Run the annual pipeline as usual (produces `tilstandsrapport`).
2. `source("pipeline/export-site-data.R"); export_oa_site_data(tilstandsrapport, "<this repo>/data")`
3. Commit + push. GitLab CI rebuilds and republishes the site.

## Design elements (from openscience.no)

- Colors: gray `#424242`, orange `#F68213`, dark blue `#5E778D`, light blue `#E5EDEF`
- Fonts: Barlow (body text), Merriweather (titles) - self-hosted, no CDN
- Dark header with openscience.no branding (sticky), light blue title banner
  with an orange rule, arrow link cards, dark blue full-width band, dark Sikt footer

## Local preview

```bash
quarto preview    # live-reloading preview
quarto render     # builds to _site/
```

## Publishing

`.gitlab-ci.yml` builds the site with Quarto's official container image and
publishes to GitLab Pages on push to the default branch.

`.github/workflows/publish.yml` does the same for GitHub Pages if the repo is
hosted on GitHub (requires repo Settings -> Pages -> Source: "GitHub
Actions"). The two CI configs coexist; each platform only reads its own.

Checklist for the platform team:

1. Is GitLab Pages enabled on Sikt's instance?
2. Can Pages sites be made publicly accessible (without login)?
3. Custom domain (e.g. `barometer.openscience.no`)? Requires DNS + TLS setup.

## To do / next steps

- [x] Replace dummy data with real exports - done, `data/` now holds real
      pipeline exports (see `data/README.md`)
- [x] Remove the "eksempeldata" notes from the pages
- [ ] Comparison page: side-by-side comparison of sectors/disciplines/
      institutions (removed from the explorer pages for readability)
- [ ] Methodology: content migrated from openscience.no (2023 version) -
      review for NVA-era updates
- [ ] Possibly English pages (Quarto has built-in multilingual support via profiles)
