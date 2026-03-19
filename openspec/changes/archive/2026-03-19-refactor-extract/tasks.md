## 1. Create lib/ directory and normalize.js

- [x] 1.1 Create `microdatos-etl/lib/` directory
- [x] 1.2 Extract `BRAND_EXACT`, `BRAND_PREFIX`, `PROVINCE_MAP`, `normalizeModel()`, and `normalizeProvince()` from `microdatos-etl/download-microdatos.js` into `microdatos-etl/lib/normalize.js` and export them via `module.exports`
- [x] 1.3 Replace the duplicated block in `microdatos-etl/download-microdatos.js` with `const { normalizeModel, normalizeProvince } = require('./lib/normalize')`
- [x] 1.4 Replace the duplicated block (including the `// keep in sync` comment) in `microdatos-etl/download-microdatos-mensual.js` with `const { normalizeModel, normalizeProvince } = require('./lib/normalize')`
- [x] 1.5 Verify both scripts parse cleanly: `node --check microdatos-etl/download-microdatos.js && node --check microdatos-etl/download-microdatos-mensual.js`

## 2. Extract fields.js

- [x] 2.1 Extract `FIELDS` array, `FIELD_MAP`, and `getField()` from `microdatos-etl/download-microdatos.js` into `microdatos-etl/lib/fields.js` and export them via `module.exports`
- [x] 2.2 Replace the duplicated block in `microdatos-etl/download-microdatos.js` with `const { FIELDS, FIELD_MAP, getField } = require('./lib/fields')`
- [x] 2.3 Replace the duplicated block in `microdatos-etl/download-microdatos-mensual.js` with `const { FIELDS, FIELD_MAP, getField } = require('./lib/fields')`
- [x] 2.4 Verify both scripts parse cleanly with `node --check`

## 3. Extract aggregate.js

- [x] 3.1 Diff the `writeAggregates` function and path helpers (`monthDir`, `monthlyPath`, `brandMonthlyPath`, `provinciaMonthlyPath`) between both ETL scripts to confirm they are identical or identify any divergence
- [x] 3.2 Reconcile any differences, then extract the unified implementation into `microdatos-etl/lib/aggregate.js` and export all five via `module.exports`
- [x] 3.3 Replace the corresponding block in `microdatos-etl/download-microdatos.js` with `const { writeAggregates, monthDir, monthlyPath, brandMonthlyPath, provinciaMonthlyPath } = require('./lib/aggregate')`
- [x] 3.4 Replace the corresponding block in `microdatos-etl/download-microdatos-mensual.js` with the same require statement
- [x] 3.5 Verify both scripts parse cleanly with `node --check`

## 4. Extract http.js and zip.js

- [x] 4.1 Extract `httpGet(url)` into `microdatos-etl/lib/http.js` and export it via `module.exports`
- [x] 4.2 Extract `extractTxtFromZip(zipBuf)` into `microdatos-etl/lib/zip.js` and export it via `module.exports`
- [x] 4.3 Replace the duplicated blocks in `microdatos-etl/download-microdatos.js` with `require('./lib/http')` and `require('./lib/zip')`
- [x] 4.4 Replace the duplicated blocks in `microdatos-etl/download-microdatos-mensual.js` with the same require statements
- [x] 4.5 Verify both scripts parse cleanly with `node --check`

## 5. Extract filter.js

- [x] 5.1 Extract the row filter predicate as `isMotorcycleRow(record)` and the field extraction logic as `extractRowFields(record)` (including calls to `normalizeModel` and `normalizeProvince`) into `microdatos-etl/lib/filter.js`; import `normalize.js` and `fields.js` within `filter.js`
- [x] 5.2 Update `processTxt` in `microdatos-etl/download-microdatos.js` to use `isMotorcycleRow` and `extractRowFields` from `require('./lib/filter')`; retain the daily accumulation loop (into array)
- [x] 5.3 Update `processTxt` in `microdatos-etl/download-microdatos-mensual.js` to use `isMotorcycleRow` and `extractRowFields` from `require('./lib/filter')`; retain the monthly accumulation loop (into Map)
- [x] 5.4 Verify both scripts parse cleanly with `node --check`

## 6. Extract constants.js

- [x] 6.1 Extract the `DATA_DIR` constant into `microdatos-etl/lib/constants.js` and export it via `module.exports`
- [x] 6.2 Replace `DATA_DIR` definitions in both ETL scripts and in `lib/aggregate.js` (if used there) with `const { DATA_DIR } = require('./lib/constants')` (adjust relative path as needed)
- [x] 6.3 Verify all three files parse cleanly with `node --check`

## 7. Verification and cleanup

- [x] 7.1 Confirm each ETL script is now ~80-100 lines and contains only its unique orchestration and accumulation logic
- [x] 7.2 Confirm the `// keep in sync` comment no longer exists in either ETL script
- [ ] 7.3 Run `microdatos-etl/download-microdatos.js` against a date not yet present in `microdatos-etl/data/` and verify the output CSV matches expectations
- [ ] 7.4 Run `microdatos-etl/download-microdatos-mensual.js` for a completed month and verify the three aggregate CSVs are unchanged compared to the pre-refactor versions
- [ ] 7.5 Commit the changes with a message referencing `refactor-extract`
