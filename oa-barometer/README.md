# OA-barometer (v2)

Quarto-based website for the OA-barometer, with design and layout based on
[openscience.no](https://www.openscience.no). Replaces the Drupal-based pages
at openscience.no/oa-barometer.

## Structure

```
_quarto.yml                  Site configuration (navigation, theme, grid)
index.qmd                    Front page (OA-barometeret)
national-overview.qmd        Section page with figure placeholders
sectoral-overview.qmd        Section page with figure placeholders
disciplinary-overview.qmd    Section page with figure placeholders
institutional-overview.qmd   Table page with placeholder
methodology.qmd              Method description (skeleton)
styles/theme.scss            openscience.no theme: colors, fonts, cards, footer
partials/footer.html         Sikt footer (included on every page)
assets/                      Logos, icons and self-hosted fonts
.gitlab-ci.yml               Build + publish to GitLab Pages
```

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

Checklist for the platform team:

1. Is GitLab Pages enabled on Sikt's instance?
2. Can Pages sites be made publicly accessible (without login)?
3. Custom domain (e.g. `barometer.openscience.no`)? Requires DNS + TLS setup.

## To do / next steps

- [ ] Hook up data from the annual OA analytics pipeline
- [ ] Replace figure placeholders with interactive figures (Plotly/OJS)
- [ ] Replace the table placeholder with an interactive table (reactable/DT)
- [ ] Methodology: migrate content from openscience.no
- [ ] Possibly English pages (Quarto has built-in multilingual support via profiles)
