## 1. Normalization map and function

- [x] 1.1 Add `PROVINCIA_TO_COMUNIDAD` object to `microdatos-etl/lib/normalize.js`, keyed by 2-letter province code (same keys as `PROVINCE_MAP`), mapping each code to its canonical autonomous community in Spanish
- [x] 1.2 Add `normalizeComunidad(code)` function to `microdatos-etl/lib/normalize.js` that looks up `PROVINCIA_TO_COMUNIDAD` and falls back with a `console.warn` for unknown codes (same pattern as `normalizeProvince`)
- [x] 1.3 Export `PROVINCIA_TO_COMUNIDAD` and `normalizeComunidad` from `microdatos-etl/lib/normalize.js`

## 2. filter.js — compute comunidad at extraction time

- [x] 2.1 Import `normalizeComunidad` in `microdatos-etl/lib/filter.js`
- [x] 2.2 In `extractRowFields`, call `normalizeComunidad(getField(line, 'COD_PROVINCIA_VEH'))` and add `comunidad` to the returned object (computed from the same code used for `provincia`)

## 3. Daily CSV — add column

- [x] 3.1 Update `writeDailyCsv` in `microdatos-etl/download-microdatos.js` to include `COMUNIDAD_AUTONOMA` in the header after `PROVINCIA_VEH`
- [x] 3.2 Update the row-building in `processTxt`/`writeDailyCsv` to include `f.comunidad` in each row after `f.provincia`

## 4. recalculateMonthly — read new column

- [x] 4.1 In `recalculateMonthly` in `microdatos-etl/download-microdatos.js`, read the `COMUNIDAD_AUTONOMA` value from the parsed daily CSV row (new column index after `PROVINCIA_VEH`)
- [x] 4.2 Store `comunidad` alongside `provincia` in the `provinciaCounts` map (or as a parallel structure) so it is available to `writeAggregates`

## 5. aggregate.js — emit column

- [x] 5.1 Update `writeAggregates` in `microdatos-etl/lib/aggregate.js` to accept and use `comunidad` per province row
- [x] 5.2 Update the CSV header line for `acumulado-marca-modelo-provincia.csv` to `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT`
- [x] 5.3 Update each data row in `aggregate.js` to include the `comunidad` value after `provincia`

## 6. Verification

- [x] 6.1 Run the ETL locally for a sample month and confirm the daily `DD.csv` files contain the new `COMUNIDAD_AUTONOMA` column with correct values
- [x] 6.2 Confirm `acumulado-marca-modelo-provincia.csv` contains the new column with correct community values
- [x] 6.3 Confirm no `console.warn` unknown-code warnings are emitted for any standard province code
