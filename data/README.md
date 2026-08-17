# Site data

Aggregated `.csv` files consumed client-side by the interactive figures and
tables. Produced by `pipeline/export-site-data.R` from the `tilstandsrapport`
df in the annual OA analytics pipeline (`nva_oa_barometer_output_v01.R`).

| File | Schema | Status |
|---|---|---|
| `oa_national_cube.csv` | year, sector, discipline, status, total | Alle×Alle cells are **real** (transcribed from the published 2025 figures); sector/discipline cells are **dummy** until the export script is run |
| `oa_institutions.csv` | institution, year, status, total | **Dummy** - replace via export script |

## National cube

Grain: `(sector | "Alle") × (discipline | "Alle") × year × status`.
Every cell is **exactly deduplicated for its own filter combination** - the
"Alle" levels are separate deduplicated aggregations, not sums of the finer
cells. A publication with authors from several sectors counts once in each
sector cell but only once in the "Alle" cell, so sums across sectors exceed
the national total by design. The UI therefore never sums across sector or
discipline levels; it selects exactly one level per dimension.

`sector` values: Alle, UH, Institutt, Helse.
`discipline` values: Alle, Realfag og teknologi, Medisin og helsefag,
Samfunnsvitenskap, Humaniora.
`status` values (stacking order): diamant, gull, hybrid, hybrid_avtale,
grønn, deponert, lukket.

## Institutions

Grain: `institution × year × status`, deduplicated per institution. Sums
across institutions exceed the national total (co-published articles count
once per institution) - expected and documented on the site.

The `.csv` files are also published as-is on the site, so visitors can
download the underlying data.
