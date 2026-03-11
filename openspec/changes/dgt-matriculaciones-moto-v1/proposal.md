## Why

Spain's DGT publishes monthly motorcycle registration microdata, but there's no easy way to explore it visually. This page gives users an interactive dashboard to browse registrations by brand, model, province, and displacement — making market trends immediately visible.

## What Changes

- Create `/dgt-matriculaciones-moto/index.html`: a self-contained static page with a filterable data table and a pie chart showing brand market share
- Filters: year/month selector, brand, province, and displacement range (cilindrada)
- Table: paginated, sortable by any column (ASC/DESC)
- Pie chart (Chart.js): updates in real-time as filters change, showing market share by brand
- Data loaded directly from existing CSV files at `/microdatos-etl/data/{year}/{month}/acumulado-marca-modelo-provincia.csv`

## Capabilities

### New Capabilities
- `matriculaciones-dashboard`: Interactive dashboard page for exploring monthly motorcycle registration data with filters, sortable/paginated table, and a live-updating pie chart

### Modified Capabilities
<!-- none -->

## Impact

- New directory: `/dgt-matriculaciones-moto/`
- New file: `/dgt-matriculaciones-moto/index.html`
- Reads existing CSV files from `/microdatos-etl/data/` — no ETL changes needed
- Adds Chart.js via CDN (no build step)
- No changes to root `index.html` or any existing files