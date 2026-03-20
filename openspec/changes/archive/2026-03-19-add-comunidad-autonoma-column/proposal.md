## Why

The daily data includes province-level registration data but no grouping by autonomous community, making it impossible to analyze regional trends at the community level. Adding a `COMUNIDAD_AUTONOMA` column — derived directly from the province code in the raw DGT data — enables richer geographic analysis without requiring consumers to maintain their own mapping.

## What Changes

- Add a `PROVINCIA_TO_COMUNIDAD` lookup map in `microdatos-etl/lib/normalize.js` keyed by province code (same keys as `PROVINCE_MAP`, e.g. `"B"`, `"MA"`) whose values are the canonical autonomous community name in Spanish.
- Add a `normalizeComunidad(code)` function (analogous to `normalizeProvince(code)`) that returns the autonomous community for a given province code.
- Update `microdatos-etl/lib/filter.js` `extractRowFields` to also compute `comunidad` from the same `COD_PROVINCIA_VEH` code used for `provincia`, and include it in the returned object.
- Update `microdatos-etl/download-microdatos.js` `writeDailyCsv` to include a `COMUNIDAD_AUTONOMA` column (after `PROVINCIA_VEH`) in the daily `DD.csv` files.
- Update `recalculateMonthly` to read the new column and pass it through to the aggregate.
- Update `microdatos-etl/lib/aggregate.js` to emit `COMUNIDAD_AUTONOMA` in `acumulado-marca-modelo-provincia.csv`.

## Capabilities

### New Capabilities

- `comunidad-autonoma-normalization`: Province-code to autonomous community mapping and `normalizeComunidad` function in the ETL shared lib.

### Modified Capabilities

- `microdatos-etl`: Daily CSV files and the province-level aggregate CSV both gain a new `COMUNIDAD_AUTONOMA` column.

## Impact

- `microdatos-etl/lib/normalize.js`: New map and exported function.
- `microdatos-etl/lib/filter.js`: `extractRowFields` returns a new `comunidad` field.
- `microdatos-etl/download-microdatos.js`: Daily CSV header and rows include `COMUNIDAD_AUTONOMA`.
- `microdatos-etl/lib/aggregate.js`: Province-level CSV header and rows include `COMUNIDAD_AUTONOMA`.
- `microdatos-etl/data/**/**/DD.csv` and `acumulado-marca-modelo-provincia.csv`: Schema changes — existing files do not have the new column until regenerated.
