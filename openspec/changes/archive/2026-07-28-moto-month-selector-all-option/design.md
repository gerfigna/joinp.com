## Context

`dgt-matriculaciones-moto/app.js` fetches one CSV per year/month selection: `/microdatos-etl/data/{year}/{month}/acumulado-marca-modelo-provincia.csv` (`fetchData()`, `app.js:125-170`). This file is produced monthly by `recalculateMonthly(year, month)` in `microdatos-etl/download-microdatos.js:64-100`, which reads all daily CSVs for that month and calls `writeAggregates()` in `microdatos-etl/lib/aggregate.js:22-51`. There is no yearly equivalent — `microdatos-etl/data/{year}/` only ever contains `01/` .. `12/` subfolders for this dataset, unlike the sibling `acumulado-marca-anual.csv` / `acumulado-potencia-anual.csv` pattern already used by `download-microdatos-mes.js` + `lib/power-aggregate.js` for a different dataset family.

`dgt-matriculaciones-e-moto/app.js` already implements the "Todos" UX for its own (simpler, marca+modelo-only) dataset: a `value="all"` option in the month `<select>` (`populateSelectors()`, `e-moto/app.js:81-85`) that isn't disabled by year changes (`updateMonthOptions()`, `e-moto/app.js:110-114`), and `loadData()` swapping the fetch target to a pre-aggregated annual CSV (`e-moto/app.js:192-206`).

## Goals / Non-Goals

**Goals:**
- Produce a pre-aggregated annual CSV for the moto brand+model+province dataset, so the dashboard can serve "Todos" with a single fetch, matching the performance characteristics of the existing per-month fetch.
- Reuse the existing trigger pattern (recalculate only years with newly processed months) rather than introducing a new always-run step.
- Match the frontend UX and code shape already validated in `dgt-matriculaciones-e-moto`.

**Non-Goals:**
- Not changing `dgt-matriculaciones-e-moto` (already correct).
- Not changing the daily or monthly raw data formats or filters.
- Not building incremental/append-only annual aggregation — the annual file is fully rebuilt from monthly files each time it's regenerated, consistent with how `recalculateMonthly` already fully rewrites its monthly file rather than appending.

## Decisions

**1. New annual aggregator lives in `microdatos-etl/lib/aggregate.js`, not a new file.**
`lib/aggregate.js` already owns `provinciaMonthlyPath()` and `writeAggregates()` for this exact dataset. Adding `provinciaAnnualPath(year)` and `writeAnnualAggregate(year)` there keeps all marca+modelo+provincia logic in one module, mirroring how `lib/power-aggregate.js` owns both monthly and annual logic for its dataset.
- Alternative considered: separate `lib/provincia-aggregate.js`. Rejected — this dataset has no monthly/annual split across files elsewhere in the codebase; splitting here would be inconsistent with the existing module boundary (module boundaries here are per-dataset, not per-granularity).

**2. `writeAnnualAggregate(year)` reads the 12 monthly CSVs, not the raw daily CSVs.**
It lists `01`..`12` subdirectories under `data/{year}/`, reads `acumulado-marca-modelo-provincia.csv` from each existing one, and sums `COUNT` grouped by `MARCA_ITV\tMODELO_ITV\tPROVINCIA_VEH`.
- Alternative considered: re-deriving from daily CSVs like `recalculateMonthly` does. Rejected — the monthly CSVs are already the validated, deduplicated source of truth for this granularity (cilindrada conflicts already resolved per month); re-deriving from daily files would duplicate that resolution logic for no benefit and would be slower (365 files/year vs 12).

**3. `CILINDRADA_ITV` conflicts across months are resolved by count-weighted majority vote, with a warning.**
For a given `MARCA_ITV`+`MODELO_ITV`+`PROVINCIA_VEH` key, different months could in principle carry a different `CILINDRADA_ITV` (e.g. if `recalculateMonthly`'s own per-month majority vote landed differently in two months). The annual aggregator accumulates a `cilindradaCounts` map per key (cilindrada → summed COUNT across months) and picks the entry with the highest total count, printing the same style of `WARN:` message `recalculateMonthly`/`writeAggregates` already print for the analogous within-month conflict.
- Alternative considered: always take the value from the most recent month. Rejected — inconsistent with the existing "most frequent wins" rule (`Cilindrada consistency validation` requirement), and count-weighting is more robust to a single mis-tallied month.

**4. Trigger point: `download-microdatos.js` `main()`, immediately after the existing `recalculateMonthly` loop.**
```js
for (const ym of processedMonths) {
  const [year, month] = ym.split('/');
  recalculateMonthly(year, month);
}

const processedYears = new Set([...processedMonths].map(ym => ym.split('/')[0]));
for (const year of processedYears) {
  writeAnnualAggregate(year);
}
```
This mirrors the `processedYears` pattern already used in `download-microdatos-mes.js:115-134` for the marca/potencia annual files, so a year is only recalculated when it actually had new data in this run — no unnecessary full-year rewrites on every run.
- Alternative considered: recalculate annual aggregates unconditionally every run. Rejected — wasteful (rereads up to 12 files for every year on every run) and inconsistent with the "selective recalculation" principle already established for this pipeline.

**5. Backfill for 2025/2026 is a one-off manual invocation, not a persisted script.**
Since `writeAnnualAggregate(year)` is idempotent and fully rebuilds its output each call, backfilling existing years is just calling it once per existing year (e.g. via a throwaway `node -e "require('./lib/aggregate').writeAnnualAggregate('2025')"` or a temporary script), not a permanent addition to the codebase.

**6. Frontend mirrors `e-moto` exactly: `value="all"` option, never disabled, branch in `fetchData()`.**
`dgt-matriculaciones-moto/app.js`:
- `buildSelectors()` (`app.js:45-67`): prepend a `"Todos"` `<option value="all">` before the numbered months, same position as `e-moto/app.js:81-85`.
- `updateMonthOptions()` (`app.js:69-85`): skip the `disabled` check for the `"all"` option (it should always remain selectable across years), mirroring `e-moto/app.js:110-114`.
- `fetchData()` (`app.js:125-170`): when `selMonth.value === 'all'`, fetch `/microdatos-etl/data/${year}/acumulado-marca-modelo-provincia-anual.csv` instead of the monthly path. Everything downstream (`parseCSV`, `populateDropdowns`, `applyFiltersAndRender`, `aggregateByMarcaModelo`, sort, pagination, chart) is unchanged since the annual CSV has the identical column shape as the monthly one.

## Risks / Trade-offs

- **[Risk]** A year with only partial months processed (e.g. current year mid-year) produces an annual total that only reflects available months, which could be misread as "full year total". → **Mitigation**: this matches the existing, already-shipped behavior of `e-moto`'s "Todos" for the current year; no new risk introduced, and it's an accepted trade-off in the sibling app already.
- **[Risk]** If `writeAnnualAggregate` is called for a year where not all 12 monthly files exist yet (only some months recalculated), the annual file reflects a partial year without any explicit "as of" marker. → **Mitigation**: out of scope for this change; matches existing e-moto behavior and existing dashboard footer metadata (`metadata.json`'s `lastDataDate`) already gives users a sense of data freshness.
- **[Risk]** Rebuilding the full annual file on every triggering run re-reads up to 12 monthly CSVs (~300-400KB each ⇒ up to ~4MB read + reprocessed) each time any month in that year changes. → **Mitigation**: acceptable — this only happens for years with new data in that run (via `processedYears`), and it's an I/O-bound Node script run in CI, not a user-facing latency path.

## Migration Plan

- No data migration for existing monthly/daily files — purely additive.
- Deploy order: (1) ship the ETL change and merge, (2) manually backfill 2025/2026 annual CSVs and commit them, (3) ship the frontend change. Frontend can technically ship before backfill without breaking anything else, but "Todos" would 404 until the backfill lands — sequence backfill before or together with the frontend change.
- Rollback: revert the `app.js` changes (removes the "Todos" option; monthly behavior unaffected) and/or stop calling `writeAnnualAggregate` in `main()` (stops updating the annual CSVs; existing monthly pipeline unaffected either way). The new annual CSV files can be deleted with no effect on any other requirement.

## Open Questions

None outstanding — scope, approach, and behavior were confirmed with the user before this design was written.
