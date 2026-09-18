library("tidyverse")


#//////////////////////////////////////////////////////#
#
#  oa barometer @ GitLab Pages (Quarto site)
#    exports the aggregated .csv files consumed by the
#    interactive figures and the institution table
#
#  usage: run at the end of the oa-data pipeline, after
#  the `tilstandsrapport` df has been prepared in
#  nva_oa_barometer_output_v01.R:
#
#    source("./pipeline/export-site-data.R", encoding = "UTF-8")
#    export_oa_site_data(
#      tilstandsrapport,
#      site_data_folder = "<path to this repo's root>/data"
#    )
#
#  then commit + push the updated data/ folder - GitLab
#  CI rebuilds and republishes the site automatically.
#
#  counting semantics:
#  publications are counted uniquely WITHIN each cell of
#  the national cube. the "all" levels are computed as
#  their own deduplicated aggregations - NOT as sums of
#  the finer cells - so a publication with authors from
#  several sectors counts once in each sector cell, but
#  only once in the "all" cell. sums across sectors /
#  institutions will therefore exceed the national total;
#  that is expected and documented on the site.
#
#//////////////////////////////////////////////////////#


# Write the site's two CSVs.
#
#   tilstandsrapport   publication-level df from the annual pipeline. One row
#                      per nva_id x institution x discipline, so it must be
#                      deduplicated per output grain (count_cells does this).
#                      Columns used: nva_id, nva_year_reported,
#                      calculated_oa_status, nva_inst_sector,
#                      npi_academic_discipline, nva_inst_top_name.
#   site_data_folder   this repo's data/ directory.
#
# Writes oa_national_aggregated.csv and oa_institutions.csv, overwriting both.
# Returns nothing - run it for the side effect, then commit the CSVs.
export_oa_site_data = function(tilstandsrapport, site_data_folder = "./data") {

  fs::dir_create(site_data_folder)


  # The exported data is English and ASCII-only throughout: stable keys that
  # never change when wording on the site does, and no a-ring / o-slash / ae to
  # survive a round trip through Excel or a third-party tool. The site holds the
  # Norwegian display labels for these keys in assets/js/oa-chart.js.

  sector_levels = c(
    UHI       = "higher_education",
    INSTITUTE = "institute",
    HEALTH    = "health",
    ABM       = "archives_libraries_museums",
    OTHER     = "other"
  )

  discipline_levels = c(
    "Natural Sciences and Engineering" = "natural_sciences_engineering",
    "Health Sciences"                  = "health_sciences",
    "Social Science"                   = "social_science",
    "Humanities"                       = "humanities"
  )

  # calculated_oa_status arrives from the pipeline in Norwegian
  status_levels = c(
    diamant       = "diamond",
    gull          = "gold",
    hybrid        = "hybrid",
    hybrid_avtale = "hybrid_agreement",
    "grønn"       = "green",
    deponert      = "deposited",
    lukket        = "closed"
  )


  # base publication-level slice: one row per
  # nva_id x sector x discipline (before deduplication per cell)
  base = tilstandsrapport %>%
    select(
      nva_id,
      year = nva_year_reported,
      status = calculated_oa_status,
      nva_inst_sector,
      npi_academic_discipline
    ) %>%
    mutate(
      status = recode(status, !!!status_levels),
      sector = recode(nva_inst_sector, !!!sector_levels),
      discipline = recode(npi_academic_discipline, !!!discipline_levels)
    ) %>%
    select(-nva_inst_sector, -npi_academic_discipline) %>%
    distinct()


  # Deduplicated article count per cell, for whatever grouping is passed in
  # via `...` (nothing = national totals, `sector` = per sector, and so on).
  #
  # The distinct() + n_distinct(nva_id) pair is the whole point: an article
  # with authors at three institutions appears three times in the input, and
  # must still count once within any single cell.
  count_cells = function(df, ...) {
    df %>%
      select(nva_id, year, status, ...) %>%
      distinct() %>%
      group_by(year, status, ...) %>%
      summarise(total = n_distinct(nva_id), .groups = "drop")
  }


  #################################################
  ### national cube:
  ###   (sector | "all") x (discipline | "all") x year x status
  ### every cell is exactly deduplicated for its own filter
  ### combination - see counting semantics above

  bind_rows(

    # all x all (national)
    base %>%
      count_cells() %>%
      mutate(sector = "all", discipline = "all"),

    # sector x all
    base %>%
      filter(!is.na(sector)) %>%
      count_cells(sector) %>%
      mutate(discipline = "all"),

    # all x discipline
    base %>%
      filter(!is.na(discipline)) %>%
      count_cells(discipline) %>%
      mutate(sector = "all"),

    # sector x discipline
    base %>%
      filter(!is.na(sector), !is.na(discipline)) %>%
      count_cells(sector, discipline)

  ) %>%
    select(year, sector, discipline, status, total) %>%
    arrange(year, sector, discipline, status) %>%
    write_csv(paste0(site_data_folder, "/oa_national_aggregated.csv"))


  #################################################
  ### institutions: institution x year x oa status
  ### (per-institution deduplication - sums across
  ### institutions exceed the national total)
  ###
  ### Built straight from tilstandsrapport rather than from `base`, because
  ### this grain needs the institution name, which `base` drops.

  tilstandsrapport %>%
    select(
      nva_id,
      nva_inst_top_name,
      nva_year_reported,
      calculated_oa_status
    ) %>%
    mutate(
      # institution names are proper nouns and stay Norwegian, but they arrive
      # with stray padding - one carried a trailing zero-width space (U+200B),
      # which silently breaks exact-name matching in the site's search box
      nva_inst_top_name = str_squish(str_remove_all(nva_inst_top_name, "\u200b")),
      calculated_oa_status = recode(calculated_oa_status, !!!status_levels)
    ) %>%
    distinct() %>%
    group_by(
      institution = nva_inst_top_name,
      year = nva_year_reported,
      status = calculated_oa_status
    ) %>%
    summarise(total = n_distinct(nva_id), .groups = "drop") %>%
    write_csv(paste0(site_data_folder, "/oa_institutions.csv"))


  invisible(NULL)
}
