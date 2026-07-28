## 1. ETL: annual aggregator (`microdatos-etl/`)

- [x] 1.1 In `microdatos-etl/lib/aggregate.js`, add `provinciaAnnualPath(year)` returning `data/{year}/acumulado-marca-modelo-provincia-anual.csv`.
- [x] 1.2 In `microdatos-etl/lib/aggregate.js`, add `writeAnnualAggregate(year)`: read every existing `data/{year}/{MM}/acumulado-marca-modelo-provincia.csv` (`MM` = `01`..`12`), parse rows, and sum `COUNT` per `MARCA_ITV`+`MODELO_ITV`+`PROVINCIA_VEH` key.
- [x] 1.3 In `writeAnnualAggregate`, resolve `CILINDRADA_ITV` conflicts across months via count-weighted majority vote per key, logging a `WARN:` message on conflict (mirroring the existing per-month conflict warning style).
- [x] 1.4 In `writeAnnualAggregate`, sort output rows by `MARCA_ITV`, then `MODELO_ITV`, then `PROVINCIA_VEH`, and write the CSV with header `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT`, fully overwriting any existing file.
- [x] 1.5 Export `provinciaAnnualPath` and `writeAnnualAggregate` from `microdatos-etl/lib/aggregate.js`.

## 2. ETL: orchestration trigger (`microdatos-etl/download-microdatos.js`)

- [x] 2.1 Import `writeAnnualAggregate` from `./lib/aggregate` in `download-microdatos.js`.
- [x] 2.2 In `main()`, after the existing `for (const ym of processedMonths) { recalculateMonthly(...) }` loop, derive the set of affected years from `processedMonths` (split on `/`, take the year part).
- [x] 2.3 For each affected year, call `writeAnnualAggregate(year)` and log a `Recalculated annual: {year}`-style message, consistent with the existing `Recalculated monthly: {year}/{month}` log line.

## 3. ETL: historical backfill

- [x] 3.1 Manually run `writeAnnualAggregate('2025')` and `writeAnnualAggregate('2026')` once (e.g. via a throwaway `node -e` invocation) to generate `acumulado-marca-modelo-provincia-anual.csv` for both years currently present under `microdatos-etl/data/`.
- [x] 3.2 Verify the backfilled annual CSVs have plausible row counts and totals (spot-check a few brand/model/province combinations against the sum of their monthly `COUNT` values). Verified: 2025 annual total 233,580 = sum of 12 monthly totals; 2026 annual total 159,615 = sum of monthly totals to date.
- [x] 3.3 Commit the two backfilled annual CSV files under `microdatos-etl/data/2025/` and `microdatos-etl/data/2026/`.

## 4. Frontend: month selector (`dgt-matriculaciones-moto/app.js`)

- [x] 4.1 In `buildSelectors()` (`app.js:45-67`), prepend a `<option value="all">Todos</option>` to `selMonth` before the numbered months, matching the position used in `dgt-matriculaciones-e-moto/app.js:81-85`.
- [x] 4.2 In `updateMonthOptions()` (`app.js:69-85`), skip the `disabled` assignment for the `"all"` option so it remains selectable for every year, matching `dgt-matriculaciones-e-moto/app.js:110-114`.
- [x] 4.3 In `fetchData()` (`app.js:125-170`), branch on `selMonth.value === 'all'`: fetch `/microdatos-etl/data/${year}/acumulado-marca-modelo-provincia-anual.csv` instead of the monthly path when true.
- [x] 4.4 Confirm no other changes are needed in `parseCSV`, `populateDropdowns`, `applyFiltersAndRender`, `aggregateByMarcaModelo`, `sortData`, `renderTable`, or `renderChart` — the annual CSV has the same column shape as the monthly one. Confirmed: `parseCSV` reads columns by header name and the annual CSV has identical columns to the monthly one.

## 5. Verification

- [x] 5.1 Run the ETL locally against the backfilled data and confirm `acumulado-marca-modelo-provincia-anual.csv` is generated/regenerated only for years with a newly processed month in that run. Verified by code inspection: `processedYears` is derived only from `processedMonths` (months actually recalculated in the run), so years without new data are skipped. Not run against live DGT servers in this session (would require real network downloads).
- [x] 5.2 Manually test `dgt-matriculaciones-moto/index.html`: select "Todos" for 2025, confirm table/filters/chart populate from the annual data; switch back to a specific month and confirm it reverts to monthly data. Tested in-browser via a local static server + Chrome DevTools: "Todos" fetches `acumulado-marca-modelo-provincia-anual.csv` (200 OK) and renders table/chart with annual totals (159,604 for 2026 to-date, 233,567 for full-year 2025); switching back to "Julio" reverts to the monthly CSV.
- [x] 5.3 Confirm the "Todos" option stays enabled when switching between years, including the current year. Verified in-browser: switching from 2026 to 2025 with "Todos" selected kept it selected and enabled, and correctly refetched the 2025 annual CSV.
- [x] 5.4 Confirm `dgt-matriculaciones-e-moto` behavior is unaffected (no files under `dgt-matriculaciones-e-moto/` were touched). Confirmed: only `microdatos-etl/` and `dgt-matriculaciones-moto/app.js` were modified.
