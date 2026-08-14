# Site data

Aggregated `.csv` files consumed client-side by the interactive figures and the
institution table. Produced by `pipeline/export-site-data.R` from the
`tilstandsrapport` df in the annual OA analytics pipeline
(`nva_oa_barometer_output_v01.R`).

| File | Schema | Status |
|---|---|---|
| `oa_national.csv` | year, status, total | **Real** - transcribed from the published 2025 figures |
| `oa_sector.csv` | year, sector, status, total | **Dummy** - replace via export script |
| `oa_discipline.csv` | year, discipline, status, total | **Dummy** - replace via export script |
| `oa_institutions.csv` | institution, year, status, total | **Dummy** - replace via export script |

`status` values (stacking order): diamant, gull, hybrid, hybrid_avtale,
grønn, deponert, lukket.

`sector` values: UH, Institutt, Helse.
`discipline` values: Realfag og teknologi, Medisin og helsefag,
Samfunnsvitenskap, Humaniora.

The `.csv` files are also published as-is on the site, so visitors can download the
underlying data.
