## Phase 1: ETL Code Modifications

- [x] 1.1 Edit `microdatos-etl/lib/aggregate.js`: remove `monthlyPath()` and `brandMonthlyPath()` helper functions; remove the two write blocks for `acumulado-marca.csv` and `acumulado-marca-modelo.csv`; keep `provinciaMonthlyPath()` and its write block; update `module.exports` to export only `{ writeAggregates, monthDir, provinciaMonthlyPath }`

- [x] 1.2 Edit `microdatos-etl/download-microdatos-mensual.js`: remove `monthlyPath` from the destructuring on line 43; remove the `hasMonthlyData()` function and its call on line 99; clean up the header comment if it mentions the deleted files

## Phase 2: Documentation Updates

- [x] 2.1 Edit `AGENTS.md`: remove `acumulado-marca-modelo.csv` and `acumulado-marca.csv` from the repo structure tree and from the "Monthly aggregation CSVs" list

- [x] 2.2 Edit `openspec/specs/microdatos-etl/spec.md`: remove requirements/scenarios referencing the two deleted aggregate files

- [x] 2.3 Edit `openspec/config.yaml` line 9: remove `acumulado-marca-modelo.csv` and `acumulado-marca.csv` from the data sources list

- [x] 2.4 Edit `README.md` (if exists): remove entries for the two deleted CSV files

## Phase 3: Delete Existing Data Files

- [x] 3.1 Delete all existing `acumulado-marca.csv` files from `microdatos-etl/data/*/*/`

- [x] 3.2 Delete all existing `acumulado-marca-modelo.csv` files from `microdatos-etl/data/*/*/`

## Phase 4: Verification (Manual)

- [ ] 4.1 Run `node download-microdatos.js` locally and verify `data/YYYY/MM/` contains exactly 1 aggregate CSV (`acumulado-marca-modelo-provincia.csv`), not 3

- [ ] 4.2 Open `dgt-matriculaciones-moto/index.html` in browser and verify charts and tables still populate correctly

- [ ] 4.3 Commit all changes in a single atomic commit
