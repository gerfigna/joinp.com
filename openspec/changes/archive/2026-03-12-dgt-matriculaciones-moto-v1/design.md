## Context

The ETL pipeline already produces monthly aggregated CSV files at `/microdatos-etl/data/{year}/{month}/acumulado-marca-modelo-provincia.csv`. This file contains one row per brand+model+province+displacement combination with a registration count. The new page reads these files directly from the repo path — no backend, no API, no build step.

The project follows a strict vanilla stack (HTML/CSS/JS, Chart.js via CDN) to match the rest of the repo.

## Goals / Non-Goals

**Goals:**
- Single `index.html` that loads and filters monthly CSV data client-side
- Filterable by year/month, brand, province, and displacement range
- Sortable, paginated table
- Pie chart (Chart.js) showing brand market share, reactive to all active filters
- Discover available months automatically from known data paths

**Non-Goals:**
- Server-side filtering or APIs
- Daily granularity (monthly aggregates are sufficient for v1)
- Map visualizations or time-series charts
- Mobile-first layout (desktop-first for v1)
- Persistence of filter state across sessions

## Decisions

### 1. Data file: `acumulado-marca-modelo-provincia.csv`
Use the brand+model+province+displacement file (not the simpler brand-only or brand+model files) because it supports all the required filter dimensions. The page will aggregate in-memory for the pie chart.

**Alternative considered**: Use multiple CSV files depending on active filters. Rejected — more complexity, same data.

### 2. Client-side CSV fetch + parse
Fetch the CSV via `fetch()` on page load (or when year/month changes). Parse with a lightweight inline parser (split lines/commas, no library needed given simple quoted CSV format).

**Alternative considered**: Pre-process to JSON via ETL. Rejected — adds ETL complexity; CSV files are already small (~50–200KB per month).

### 3. Month discovery via hardcoded range
Build a year/month selector by generating options from a known start date (Jan 2026) up to the current month. Skip fetch errors silently (month not yet available).

**Alternative considered**: Fetch a manifest JSON. Rejected — requires ETL changes; hardcoded range is simpler and correct for v1.

### 4. Chart.js via CDN
Load Chart.js from a CDN `<script>` tag. No npm, no bundler.

### 5. All filtering in-memory
After fetching and parsing the CSV, apply all active filters (brand, province, displacement range) in JS on the raw data array. Re-aggregate and re-render table + chart on every filter change.

### 6. Displacement filter as range inputs (min/max)
Two number inputs for min and max cilindrada (cc). Filter rows where `CILINDRADA_ITV` falls within the range.

### 7. Table columns
Show: Marca, Modelo, Provincia, Cilindrada, Matriculaciones. Sort by any column. Paginate 25 rows per page.

## Risks / Trade-offs

- [Large CSV files in future months] → Mitigation: current files are ~100KB; browser can handle up to ~5MB comfortably. If files grow, revisit.
- [Missing months return 404] → Mitigation: catch fetch errors and mark month as unavailable; don't crash.
- [CDN dependency for Chart.js] → Mitigation: acceptable for a static GitHub Pages project; add a fallback message if Chart.js fails to load.