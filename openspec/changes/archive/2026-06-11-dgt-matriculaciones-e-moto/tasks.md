## 1. ETL Library Extensions

- [x] 1.1 Add `E_DATA_DIR` to `microdatos-etl/lib/constants.js` — absolute path pointing to `microdatos-etl/e-data/`
- [x] 1.2 Add `isElectricMotorcycleRow(line)` to `microdatos-etl/lib/filter.js` — checks `COD_TIPO='50'`, `CLAVE_TRAMITE='1'`, `IND_NUEVO_USADO='N'`, `FABRICANTE_ITV≠'ND'`, `COD_PROPULSION_ITV='2'`, `COD_CLASE_MAT='0'`
- [x] 1.3 Add `extractElectricFields(line)` to `microdatos-etl/lib/filter.js` — returns object with the 35 source fields + calculated `TIPO_CARNET` (`'A1'` ≤11 kW, `'A2'` 11–35 kW, `'A'` >35 kW, `''` if KW absent/invalid); `MARCA_ITV` normalized via `normalizeBrand()`
- [x] 1.4 Export both new functions from `microdatos-etl/lib/filter.js` `module.exports`

## 2. Electric ETL Script

- [x] 2.1 Create `microdatos-etl/download-microdatos-electrica.js` — scaffold with imports: `httpGet`, `extractTxtFromZip`, `isElectricMotorcycleRow`, `extractElectricFields`, `E_DATA_DIR`
- [x] 2.2 Implement `allDates()` — returns all `{ year, month, day }` objects from 2025-01-01 to yesterday (inclusive)
- [x] 2.3 Implement `dailyZipUrl(year, month, day)` and `monthlyZipUrl(year, month)` — build DGT download URLs
- [x] 2.4 Implement `processTxt(txt, targetDate)` — iterate lines, apply `isElectricMotorcycleRow`, call `extractElectricFields`; if `targetDate` is set return only rows for that date; if null return `Map<dateStr, rows[]>` grouped by `FEC_MATRICULA`
- [x] 2.5 Implement `writeDailyCsv(filePath, rows)` — write 36-column header + quoted rows; create parent dirs; no-op if file already exists
- [x] 2.6 Implement `processDate(year, month, day, monthlyCache)` — skip if `DD.csv` exists; try daily ZIP; on failure check `monthlyCache` for pre-fetched monthly txt or download monthly ZIP once (store in `monthlyCache`); call `processTxt` in monthly mode and write all still-missing days for that month
- [x] 2.7 Implement `recalculateMonthly(year, month)` — read all `DD.csv` in the month dir, aggregate by `MARCA_ITV` and `TIPO_CARNET`/`KW_ITV` power band, write `acumulado-marca-mensual.csv` and `acumulado-potencia-mensual.csv`
- [x] 2.8 Implement `writeAnnual(year)` — sum all monthly brand and potencia CSVs for the year, write `acumulado-marca-anual.csv` and `acumulado-potencia-anual.csv` under `E_DATA_DIR/YYYY/`
- [x] 2.9 Implement `main()` — call `allDates()`, iterate with a shared `monthlyCache = new Map()`, track affected months/years, call `recalculateMonthly` and `writeAnnual` for each affected period after all dates processed
- [x] 2.10 Smoke-test: `node microdatos-etl/download-microdatos-electrica.js` — verify at least one `e-data/YYYY/MM/DD.csv` is created and monthly/annual aggregates exist

## 3. Navigation Link in Combustion Dashboard

- [x] 3.1 Add `<a href="../dgt-matriculaciones-e-moto/" target="_blank" rel="noopener">` link inside `.tab-nav` in `dgt-matriculaciones-moto/index.html`, adjacent to the "Información" label, styled to match tab labels

## 4. Electric Dashboard — HTML & CSS

- [x] 4.1 Create `dgt-matriculaciones-e-moto/index.html` — page shell with same meta tags and Chart.js CDN as combustion dashboard; tab structure: Datos Mensuales | Evolución | Información
- [x] 4.2 Create `dgt-matriculaciones-e-moto/styles.css` — copy glassmorphism base from `dgt-matriculaciones-moto/styles.css` and adapt for e-moto (accent color, title, etc.)
- [x] 4.3 Add year/month selector UI to Datos Mensuales tab in `index.html`
- [x] 4.4 Add brand table markup (header: Marca, Unidades) to Datos Mensuales tab
- [x] 4.5 Add power band chart canvas to Datos Mensuales tab
- [x] 4.6 Add annual evolution chart canvas to Evolución tab
- [x] 4.7 Add Información tab content (disclaimer, data source, last-update footer)

## 5. Electric Dashboard — JavaScript

- [x] 5.1 Create `dgt-matriculaciones-e-moto/app.js` — base structure, constants for `E_DATA_BASE` path, Chart.js references
- [x] 5.2 Implement year/month selector population — range 2025 → current year, default to most recent month with data
- [x] 5.3 Implement `loadMonthlyData(year, month)` — fetch `acumulado-marca-mensual.csv` and `acumulado-potencia-mensual.csv`, parse CSV, update table and chart
- [x] 5.4 Implement brand table render — sort by COUNT desc, show empty state if no data
- [x] 5.5 Implement power band chart render (bar chart) using Chart.js — show the three bands with counts; empty state if no data
- [x] 5.6 Implement `loadEvolutionData()` — fetch all available `acumulado-marca-anual.csv` files, render annual line/bar chart (top N brands)
- [x] 5.7 Wire up year/month selector `change` event → `loadMonthlyData()`
- [x] 5.8 Wire up tab navigation → lazy-load evolution data on first switch to Evolución tab
- [x] 5.9 Populate footer with last-update date derived from most recent CSV filename
