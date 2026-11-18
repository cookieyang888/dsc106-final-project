# Beyond the Yearly Average

DSC 106 final project initial prototype, November 18, 2026.

**Team:** David Yang, Nam Ngo, Jun Tao Wang, Eric Che.

An explorable explanation comparing projected warming near four locations, across three emissions pathways and twelve calendar months. Built with D3.js v7, HTML, and CSS. No build step, API key, or external runtime dependency is required; D3 is vendored locally.

## Run locally

From this directory:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Opening `index.html` directly with `file://` will not load the CSV files in most browsers.

## Interactions

- Choose a location and one or more emissions pathways.
- Switch the full timeline between annual anomalies and trailing 20-year averages.
- Brush a period on the timeline; the monthly chart and location table update together.
- Use the numeric year fields or presets as keyboard-accessible alternatives to brushing.
- Select a location in the comparison table; all location-specific views update.
- Hover charts or focus monthly points to inspect values.
- Open the monthly data table in Data & methods, or download the CSVs.
- Reset restores San Diego, all pathways, 2081–2100, and 20-year averages.

## Data and calculations

CMIP6 CESM2 / NCAR, monthly near-surface air temperature (`tas`, Amon), member `r4i1p1f1`, native grid `gn`. Historical baseline: 1985–2014. Scenarios: SSP1-2.6, SSP2-4.5, SSP5-8.5, 2015–2100.

Source catalog: https://storage.googleapis.com/cmip6/cmip6-zarr-consolidated-stores.csv

Exact source stores and versions: `data/source_metadata.json`.

`data/climate_monthly.csv` retains original temperatures in Celsius and source/grid identifiers. Annual means in `data/climate_annual.csv` are weighted by no-leap calendar days. Anomalies subtract the 1985–2014 annual baseline. Trailing averages require 20 complete future years and first appear in 2034. Seasonal changes subtract each calendar month's historical baseline from the same month's average across selected years. The location table averages annual anomalies over those same selected years.

These are coarse nearest-grid-cell outputs from one model member, not observed city temperatures, an ensemble uncertainty range, probabilities, or preindustrial global warming values.

## GitHub Pages

Keep `index.html`, `app.js`, and `style.css` at the repository root. Publish the `main` branch, root folder, in Settings → Pages. `.nojekyll` avoids Jekyll processing. The repository link is in the page footer.

## Prototype rubric

The page includes working D3 visualizations and linked interactions, basic explanatory text and annotations, and two visible prototype writeups of five sentences each: completed work and anticipated design challenges. A publicly accessible repository and deployed GitHub Pages URL complete the submission requirements. Submit the deployed site URL on Gradescope.

## Credits

D3 v7, copyright Mike Bostock, ISC license (license notice retained in `vendor/d3.min.js`).
