## Why

`dgt-matriculaciones-e-moto` already lets users pick "Todos" in the month selector to see year-to-date totals, backed by a pre-aggregated annual CSV. `dgt-matriculaciones-moto` has no equivalent — users can only view one month at a time and have no way to see full-year totals without manually adding up 12 months. This is a gap relative to the sibling dashboard and a real usability limitation for year-over-year analysis.

## What Changes

- Add a new ETL step that aggregates the monthly `acumulado-marca-modelo-provincia.csv` files for a given year into a new annual file `acumulado-marca-modelo-provincia-anual.csv`, summing `COUNT` by `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` (keeping `COMUNIDAD_AUTONOMA` and `CILINDRADA_ITV` per group).
- Trigger this new annual aggregation from `download-microdatos.js`'s `main()`, right after the existing selective monthly recalculation step, for every year that had at least one month recalculated in that run.
- Backfill the annual CSV for existing years already present under `microdatos-etl/data/` (2025 and 2026) so historical "Todos" data is available immediately.
- Add a `"Todos"` option (`value="all"`) to the month `<select>` in `dgt-matriculaciones-moto`, matching the option already present in `dgt-matriculaciones-e-moto`.
- When `"Todos"` is selected, `dgt-matriculaciones-moto` fetches `acumulado-marca-modelo-provincia-anual.csv` for the selected year instead of a single month's CSV; the existing table, brand filter, province filter, displacement filter, sort, pagination, and pie chart all operate on the resulting annual rows unchanged (same row shape as monthly data).
- The `"Todos"` option SHALL remain selectable regardless of which year is chosen (unlike numbered months, which get disabled for months beyond the current one when the current year is selected).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `microdatos-etl`: adds annual aggregation of `acumulado-marca-modelo-provincia.csv` into a new `acumulado-marca-modelo-provincia-anual.csv` per year, triggered alongside the existing selective monthly recalculation. This changes the current "only monthly aggregate" and "only `acumulado-marca-modelo-provincia.csv` is recalculated" requirements.
- `matriculaciones-dashboard`: the year/month selector gains a `"Todos"` option that switches the dashboard's data source to the new annual aggregate CSV for the selected year.

## Impact

- **Affected code**: `microdatos-etl/download-microdatos.js` (main() orchestration), `microdatos-etl/lib/aggregate.js` (new annual aggregation function and path helper), `dgt-matriculaciones-moto/app.js` (`buildSelectors`, `updateMonthOptions`, `fetchData`).
- **Affected data**: new file `microdatos-etl/data/{year}/acumulado-marca-modelo-provincia-anual.csv` per year, generated going forward and backfilled for 2025/2026.
- **No changes** to `dgt-matriculaciones-e-moto` (already has this pattern) or to the daily/monthly raw data pipeline.
- **No breaking changes**: existing monthly behavior, CSV formats, and endpoints are unaffected; this is purely additive.
