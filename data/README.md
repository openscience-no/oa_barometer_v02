# Site data

Aggregated `.csv` files consumed client-side by the interactive figures and
tables. Produced by `pipeline/export-site-data.R` from the `tilstandsrapport`
df in the annual OA analytics pipeline (`nva_oa_barometer_output_v01.R`).

**Language:** column names and category values are English and ASCII-only, so
they survive Excel and third-party tools and stay stable when wording on the
site changes. The Norwegian labels the site displays live in
`assets/js/oa-chart.js` (`OA_LABELS`, `SECTOR_LABELS`, `DISCIPLINE_LABELS`) -
that mapping is the only place the two vocabularies meet. Institution names
are the one exception: they are proper nouns and stay as they are.

| File | Schema | Status |
|---|---|---|
| `oa_national_cube.csv` | year, sector, discipline, status, total | **Real** - exported from the OA pipeline |
| `oa_institutions.csv` | institution, year, status, total | **Real** - exported from the OA pipeline |

## National cube

Grain: `(sector | "all") × (discipline | "all") × year × status`.
Every cell is **exactly deduplicated for its own filter combination** - the
"all" levels are separate deduplicated aggregations, not sums of the finer
cells. A publication with authors from several sectors counts once in each
sector cell but only once in the "all" cell, so sums across sectors exceed
the national total by design. The UI therefore never sums across sector or
discipline levels; it selects exactly one level per dimension.

`sector` values: all, higher_education, institute, health,
archives_libraries_museums, other (the site's sector selector is derived from
the data, so new sector levels appear automatically).
`discipline` values: all, natural_sciences_engineering, health_sciences,
social_science, humanities.
`status` values (stacking order): diamond, gold, hybrid, hybrid_agreement,
green, deposited, closed.

## Institutions

Grain: `institution × year × status`, deduplicated per institution. Sums
across institutions exceed the national total (co-published articles count
once per institution) - expected and documented on the site. Institution
names are proper nouns and stay Norwegian; everything else is English.

The `.csv` files are also published as-is on the site, so visitors can
download the underlying data.
