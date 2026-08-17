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
#      site_data_folder = "<path to oa-barometer repo>/data"
#    )
#
#  then commit + push the updated data/ folder - GitLab
#  CI rebuilds and republishes the site automatically.
#
#  counting semantics:
#  publications are counted uniquely WITHIN each cell of
#  the national cube. the "Alle" levels are computed as
#  their own deduplicated aggregations - NOT as sums of
#  the finer cells - so a publication with authors from
#  several sectors counts once in each sector cell, but
#  only once in the "Alle" cell. sums across sectors /
#  institutions will therefore exceed the national total;
#  that is expected and documented on the site.
#
#//////////////////////////////////////////////////////#


export_oa_site_data = function(tilstandsrapport, site_data_folder = "./data") {

  fs::dir_create(site_data_folder)


  # display names used on the site (Norwegian)
  sector_labels = c(
    UHI = "UH",
    INSTITUTE = "Institutt",
    HEALTH = "Helse"
  )

  discipline_labels = c(
    "Natural Sciences and Engineering" = "Realfag og teknologi",
    "Health Sciences" = "Medisin og helsefag",
    "Social Science" = "Samfunnsvitenskap",
    "Humanities" = "Humaniora"
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
      sector = recode(nva_inst_sector, !!!sector_labels),
      discipline = recode(npi_academic_discipline, !!!discipline_labels)
    ) %>%
    select(-nva_inst_sector, -npi_academic_discipline) %>%
    distinct()


  # helper: deduplicated count per cell for a given grouping
  count_cells = function(df, ...) {
    df %>%
      select(nva_id, year, status, ...) %>%
      distinct() %>%
      group_by(year, status, ...) %>%
      summarise(total = n_distinct(nva_id), .groups = "drop")
  }


  #################################################
  ### national cube:
  ###   (sector | "Alle") x (discipline | "Alle") x year x status
  ### every cell is exactly deduplicated for its own filter
  ### combination - see counting semantics above

  bind_rows(

    # Alle x Alle (national)
    base %>%
      count_cells() %>%
      mutate(sector = "Alle", discipline = "Alle"),

    # sector x Alle
    base %>%
      filter(!is.na(sector)) %>%
      count_cells(sector) %>%
      mutate(discipline = "Alle"),

    # Alle x discipline
    base %>%
      filter(!is.na(discipline)) %>%
      count_cells(discipline) %>%
      mutate(sector = "Alle"),

    # sector x discipline
    base %>%
      filter(!is.na(sector), !is.na(discipline)) %>%
      count_cells(sector, discipline)

  ) %>%
    select(year, sector, discipline, status, total) %>%
    arrange(year, sector, discipline, status) %>%
    write_csv(paste0(site_data_folder, "/oa_national_cube.csv"))


  #################################################
  ### institutions: institution x year x oa status
  ### (per-institution deduplication - sums across
  ### institutions exceed the national total)

  tilstandsrapport %>%
    select(
      nva_id,
      nva_inst_top_name,
      nva_year_reported,
      calculated_oa_status
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
