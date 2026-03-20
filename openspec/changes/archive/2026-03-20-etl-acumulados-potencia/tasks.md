## Phase 1: Foundation — Shared Utilities

- [x] 1.1 Add `extractPowerFields(line)` to `microdatos-etl/lib/filter.js` — extract `MARCA_ITV` and `KW_ITV` from a line; return `{ marca, kw }` or `null` if KW_ITV is absent, empty, zero, or non-numeric

- [x] 1.2 Create `microdatos-etl/lib/power-aggregate.js` — export `getPowerRange(kw)` that classifies into `Hasta 11 kW` / `11-35 kW` / `Más de 35 kW` (null for invalid values)

- [x] 1.3 Add CSV path helpers to `lib/power-aggregate.js` — `marcaMonthlyPath(year, month)`, `potenciaMonthlyPath(year, month)`, `marcaAnnualPath(year)`, `potenciaAnnualPath(year)` using `DATA_DIR` from `constants.js`

- [x] 1.4 Create `PowerAggregator` class in `lib/power-aggregate.js` with `add(marca, kw)`, `writeMonthly(year, month)`, `writeAnnual(year)` — use Maps for `marcaCounts` and `potenciaCounts`; `writeAnnual` reads all `acumulado-marca-mensual.csv` for the year to regenerate both annual files

## Phase 2: Core Implementation — ETL Script

- [x] 2.1 Create `microdatos-etl/download-microdatos-potencia.js` — main script mirroring `download-microdatos-mensual.js` pattern: `httpGet` → `extractTxtFromZip` → line-by-line processing

- [x] 2.2 Implement month detection: scan `data/` for `YYYY/MM/` directories containing at least one `DD.csv`, check if `acumulado-potencia-mensual.csv` exists (skip if present) — independent skip per output file

- [x] 2.3 Wire `isMotorcycleRow` (from `lib/filter.js`) → `extractPowerFields` → `PowerAggregator.add()` — skip rows returning null from `extractPowerFields`

- [x] 2.4 Add logging: print "Procesando YYYY/MM", count of valid rows extracted, count of rows omitted (invalid KW_ITV)

## Phase 3: Integration / CI-CD

- [ ] 3.1 Add job/step to `.github/workflows/microdatos-etl.yml` to run `node download-microdatos-potencia.js` after the daily ETL job (sequential `needs:` dependency)

## Phase 4: Verification

- [x] 4.1 Run `node download-microdatos-potencia.js` locally and verify `data/YYYY/MM/acumulado-marca-mensual.csv` and `data/YYYY/MM/acumulado-potencia-mensual.csv` are created with correct columns and counts

- [x] 4.2 Verify `data/YYYY/acumulado-marca-anual.csv` and `data/YYYY/acumulado-potencia-anual.csv` are regenerated after a new month is processed

- [x] 4.3 Verify skip detection: re-running the script does not duplicate data; annual files are still recalculated even when monthly files are skipped

- [x] 4.4 Test boundary values: kw = 11 → "Hasta 11 kW"; kw = 35 → "11-35 kW"; kw = 35.1 → "Más de 35 kW"; kw = empty/0/NaN → row skipped
