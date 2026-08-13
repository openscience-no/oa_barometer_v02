library("tidyverse")


#//////////////////////////////////////////////////////#
#
#  oa barometer @ GitLab Pages (Quarto site)
#    exports the aggregated CSV files consumed by the
#    interactive figures and the institution table
#
#  usage: run at the end of the annual pipeline, after
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


  #################################################
  ### national: year x oa status

  tilstandsrapport %>%
    select(
      nva_id,
      nva_year_reported,
      calculated_oa_status
    ) %>%
    distinct() %>%
    group_by(
      year = nva_year_reported,
      status = calculated_oa_status
    ) %>%
    summarise(total = n_distinct(nva_id), .groups = "drop") %>%
    write_csv(paste0(site_data_folder, "/oa_national.csv"))


  #################################################
  ### sector: year x sector x oa status

  tilstandsrapport %>%
    select(
      nva_id,
      nva_year_reported,
      calculated_oa_status,
      nva_inst_sector
    ) %>%
    distinct() %>%
    filter(
      !is.na(nva_inst_sector),
    ) %>%
    mutate(
      sector = recode(nva_inst_sector, !!!sector_labels)
    ) %>%
    group_by(
      year = nva_year_reported,
      sector,
      status = calculated_oa_status
    ) %>%
    summarise(total = n_distinct(nva_id), .groups = "drop") %>%
    write_csv(paste0(site_data_folder, "/oa_sector.csv"))


  #################################################
  ### discipline: year x npi discipline x oa status

  tilstandsrapport %>%
    select(
      nva_id,
      nva_year_reported,
      calculated_oa_status,
      npi_academic_discipline
    ) %>%
    distinct() %>%
    filter(
      !is.na(npi_academic_discipline),
    ) %>%
    mutate(
      discipline = recode(npi_academic_discipline, !!!discipline_labels)
    ) %>%
    group_by(
      year = nva_year_reported,
      discipline,
      status = calculated_oa_status
    ) %>%
    summarise(total = n_distinct(nva_id), .groups = "drop") %>%
    write_csv(paste0(site_data_folder, "/oa_discipline.csv"))


  #################################################
  ### institutions: institution x year x oa status

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
