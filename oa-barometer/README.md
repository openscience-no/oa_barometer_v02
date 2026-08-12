# OA-barometeret (v2)

Quarto-basert nettsted for OA-barometeret, med design og layout basert på
[openscience.no](https://www.openscience.no). Erstatter de Drupal-baserte
sidene på openscience.no/oa-barometer.

## Struktur

```
_quarto.yml              Nettstedskonfigurasjon (navigasjon, tema, grid)
index.qmd                Forside (OA-barometeret)
nasjonal-oversikt.qmd    Seksjonsside med figur-plassholdere
sektoriell-oversikt.qmd  Seksjonsside med figur-plassholdere
disiplinaer-oversikt.qmd Seksjonsside med figur-plassholdere
institusjonell-oversikt.qmd  Tabellside med plassholder
metode.qmd               Metodebeskrivelse (skjelett)
styles/theme.scss        openscience.no-tema: farger, fonter, kort, footer
partials/footer.html     Sikt-footer (inkluderes på alle sider)
assets/                  Logoer, ikoner og selvhostede fonter
.gitlab-ci.yml           Bygg + publisering til GitLab Pages
```

## Designelementer (fra openscience.no)

- Farger: grå `#424242`, oransje `#F68213`, mørk blå `#5E778D`, lys blå `#E5EDEF`
- Fonter: Barlow (brødtekst), Merriweather (titler) – selvhostet, ingen CDN
- Mørk header med openscience.no-logo, lyseblått tittelbånd med oransje strek,
  pil-lenkekort, mørkblått fullbredde-bånd, mørk Sikt-footer

## Lokal forhåndsvisning

```bash
quarto preview    # live-oppdatert forhåndsvisning
quarto render     # bygger til _site/
```

## Publisering

`.gitlab-ci.yml` bygger nettstedet med Quartos offisielle container-image og
publiserer til GitLab Pages ved push til default-branch.

Sjekkliste mot plattformteamet:

1. Er GitLab Pages aktivert på Sikts instans?
2. Kan Pages-sider gjøres offentlig tilgjengelige (uten innlogging)?
3. Eget domene (f.eks. `barometer.openscience.no`)? Krever DNS + TLS-oppsett.

## Gjøremål / neste steg

- [ ] **Bytt ut `assets/sikt-logo-hvit.svg`** – dagens fil er en plassholder,
      hent Sikts offisielle hvite logo (SVG)
- [ ] Riktig e-postadresse i `partials/footer.html` (redaktør openscience.no)
- [ ] Koble på data fra den årlige OA-analysepipelinen
- [ ] Erstatt figur-plassholdere med interaktive figurer (Plotly/OJS)
- [ ] Erstatt tabell-plassholder med interaktiv tabell (reactable/DT)
- [ ] Metodebeskrivelse: flytt innhold fra openscience.no
- [ ] Ev. engelske sider (Quarto har innebygd flerspråksstøtte via profiler)
