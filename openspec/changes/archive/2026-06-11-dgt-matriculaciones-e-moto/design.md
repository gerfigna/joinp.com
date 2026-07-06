## Context

The existing ETL (`download-microdatos.js`) filters out electric motorcycles by requiring `CILINDRADA_ITV ≠ 0`. The `download-microdatos-mes.js` ETL also applies `isMotorcycleRow()`, inheriting the same exclusion. Electric registration data exists in the DGT daily ZIPs but has never been extracted.

The new ETL follows the same download-and-parse pattern as the existing scripts, reusing all of `lib/` without modification (except adding two functions to `filter.js` and one constant to `constants.js`).

## Goals / Non-Goals

**Goals:**
- Extract electric motorcycle registrations from DGT ZIPs (daily first, monthly fallback) into `e-data/`.
- Produce daily CSVs with 36 fields (35 source + `TIPO_CARNET`) for every processed date.
- Produce monthly and annual aggregates by brand and power band (kW).
- Single script handles both initial backfill and daily incremental update.
- Data scope: 2025-01-01 onwards only.
- Serve a new standalone dashboard from `dgt-matriculaciones-e-moto/` (GitHub Pages static).
- Add a navigation link in the combustion dashboard pointing to the new dashboard.

**Non-Goals:**
- Territorial breakdown (no province/community aggregates in this change).
- Modifying the combustion ETL or its data.
- Any backend, API, or server-side processing.

## Decisions

### ETL filter: COD_PROPULSION_ITV = '2'
Using the propulsion code is the authoritative, unambiguous approach confirmed by the DGT specification document. Alternatives considered:
- Heuristic `CILINDRADA_ITV = '0' AND KW_ITV > 0` — rejected: could capture hybrids or malformed rows.
- `CATEGORIA_VEHICULO_ELECTRICO` non-empty — rejected: secondary/derived field; may be blank for some valid electric motos.

Additional filter `COD_CLASE_MAT = '0'` (Ordinaria) is added to exclude tourist, diplomatic, and historical plates that the combustion ETL does not currently filter.

### 36-field rich CSV per row (not aggregation-only)
Electric motorcycle volume is low (hundreds per month, not thousands). Storing the full record per registration — 35 source fields plus the calculated `TIPO_CARNET` (A1/A2/A license band derived from `KW_ITV`) — enables future analysis (autonomy, homologation category, vehicle base, etc.) without re-downloading ZIPs. Contrast with the combustion ETL which stores only 8 fields because volume (~2000/day) would inflate the repo.

### Date scope: 2025 onwards
No data prior to 2025 will be fetched or stored. The electric motorcycle segment is too small before 2025 to be meaningful, and excluding pre-2025 history keeps `e-data/` lean. The dashboard year selector starts at 2025.

### Single script: unified initial load + incremental update
The same script (`download-microdatos-electrica.js`) runs on every execution: it computes all dates from 2025-01-01 to yesterday, skips any date whose `DD.csv` already exists, and processes the rest. This eliminates the need for a separate backfill script and makes the GitHub Actions step identical for first run and subsequent runs.

### Daily ZIP first, monthly ZIP fallback — split by FEC_MATRICULA
DGT publishes daily ZIPs for business days. Weekends, holidays, and occasional gaps mean some dates won't have a daily ZIP. When the daily download fails, the monthly ZIP is downloaded once for that month, its rows are grouped by `FEC_MATRICULA`, and each group is written as a `DD.csv`. Within a single run, if multiple missing dates belong to the same month, the monthly ZIP is downloaded only once (memoized per month). This avoids redundant HTTP requests while covering all gaps.

The key implication: `processTxt()` must accept a `targetDate` parameter for daily mode (only rows for that day) and a `null`/`undefined` for monthly mode (all rows, grouped by date).

### Reuse PowerAggregator unchanged
`PowerAggregator.writeMonthly()` and `writeAnnual()` write to paths derived from `DATA_DIR` via `monthDir()` in `aggregate.js`. The electric ETL will pass its own output directory (`E_DATA_DIR`) via a new `ElectricAggregator` subclass or by instantiating `PowerAggregator` with an overridden path helper. To avoid modifying `power-aggregate.js`, `download-microdatos-electrica.js` will implement its own lightweight aggregation writing to `E_DATA_DIR` — same CSV format as `PowerAggregator` output, same headers.

### Separate `e-data/` directory under `microdatos-etl/`
Keeps electric data alongside combustion data under the same ETL folder, making the GitHub Pages path consistent: `../microdatos-etl/e-data/...` from the new dashboard. Avoids polluting root with a new top-level data dir.

### Dashboard: same glassmorphism stack as combustion dashboard
Vanilla HTML + CSS + chart.js (already loaded via CDN in the existing dashboard). No new dependencies. The new dashboard is self-contained in `dgt-matriculaciones-e-moto/` and shares the visual language but is independent code.

### Navigation link placement
A plain `<a>` tag added inside the existing `.tab-nav` in `dgt-matriculaciones-moto/index.html`, styled to match the tab labels. Uses `target="_blank" rel="noopener"`. No tab state changes — it's an external link, not a new tab panel.

## Risks / Trade-offs

- **Low initial data volume** → The ETL may produce empty CSVs for days/months with no electric moto registrations. The dashboard must handle empty states gracefully.
- **DGT ZIP availability** → The same risk as the combustion ETL: DGT may not publish a ZIP for every day. Existing error handling in `http.js` covers this.
- **Repo size growth** → Each rich 35-field CSV is larger than the 8-field combustion daily CSV, but volume is low enough (~hundreds of rows/month) that repo growth is negligible.
- **`PowerAggregator` path coupling** → Chosen to replicate aggregation logic inline in the new ETL rather than modify the shared library. Minor duplication, but avoids introducing a breaking change in the existing potencia ETL.

## Migration Plan

1. Add `E_DATA_DIR` to `constants.js` and new functions to `filter.js` (additive, no breakage).
2. Create `download-microdatos-electrica.js` and run it once manually — it self-backfills from 2025-01-01 to yesterday.
3. Add the GitHub Actions step or cron trigger alongside the existing ETL runs (same script, no flags needed).
4. Deploy `dgt-matriculaciones-e-moto/` to `main` — GitHub Pages picks it up automatically.
5. Add nav link to combustion dashboard in the same commit as the new dashboard goes live.
