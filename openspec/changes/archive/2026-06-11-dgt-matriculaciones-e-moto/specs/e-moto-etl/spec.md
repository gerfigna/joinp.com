## ADDED Requirements

### Requirement: Electric motorcycle row filter
The system SHALL identify electric motorcycle rows in DGT fixed-width records using the following conditions, all of which MUST be true:
- `COD_TIPO = '50'` (motocicleta de 2 ruedas sin sidecar)
- `CLAVE_TRAMITE = '1'` (matriculación ordinaria)
- `IND_NUEVO_USADO = 'N'` (vehículo nuevo)
- `FABRICANTE_ITV ≠ 'ND'` (fabricante identificado)
- `COD_PROPULSION_ITV = '2'` (eléctrico)
- `COD_CLASE_MAT = '0'` (matrícula ordinaria)
- `CATEGORIA_VEHICULO_ELECTRICO = 'BEV'` (vehículo eléctrico de batería puro; excluye HEV, PHEV, REEV)

#### Scenario: Row matches all conditions
- **WHEN** a fixed-width record satisfies all seven filter conditions
- **THEN** `isElectricMotorcycleRow(line)` returns `true`

#### Scenario: Row has non-electric propulsion
- **WHEN** `COD_PROPULSION_ITV` is not `'2'`
- **THEN** `isElectricMotorcycleRow(line)` returns `false`

#### Scenario: Row has non-ordinary registration class
- **WHEN** `COD_CLASE_MAT` is not `'0'`
- **THEN** `isElectricMotorcycleRow(line)` returns `false`

#### Scenario: Row is a hybrid or range-extender (non-BEV)
- **WHEN** `CATEGORIA_VEHICULO_ELECTRICO` is `'HEV'`, `'PHEV'`, `'REEV'`, or any value other than `'BEV'`
- **THEN** `isElectricMotorcycleRow(line)` returns `false`

### Requirement: Electric field extraction
The system SHALL extract 35 source fields plus one calculated field (`TIPO_CARNET`) from each row that passes `isElectricMotorcycleRow`. The output fields SHALL be (in order):
`FEC_MATRICULA, COD_CLASE_MAT, FEC_TRAMITACION, MARCA_ITV, MODELO_ITV, CILINDRADA_ITV, POTENCIA_ITV, NUM_PLAZAS, LOCALIDAD_VEHICULO, COD_PROVINCIA_VEH, COD_PROVINCIA_MAT, FEC_TRAMITE, CODIGO_POSTAL, PERSONA_FISICA_JURIDICA, CODIGO_ITV, SERVICIO, COD_MUNICIPIO_INE_VEH, MUNICIPIO, KW_ITV, TIPO_CARNET, TIPO_ITV, VARIANTE_ITV, VERSION_ITV, MASA_ORDEN_MARCHA_ITV, MASA_MAXIMA_TECNICA_ITV, CATEGORIA_HOMOLOGACION_EUROPEA_ITV, CARROCERIA, CONSUMO_WH_KM_ITV, CLASIFICACION_REGLAMENTO_VEHICULOS_ITV, CATEGORIA_VEHICULO_ELECTRICO, AUTONOMIA_VEHICULO_ELECTRICO, MARCA_VEHICULO_BASE, FABRICANTE_VEHICULO_BASE, TIPO_VEHICULO_BASE, VARIANTE_VEHICULO_BASE, VERSION_VEHICULO_BASE`

`MARCA_ITV` SHALL be normalized via `normalizeBrand()`.

`TIPO_CARNET` is a calculated field derived from `KW_ITV`:
- `'A1'` when `KW_ITV ≤ 11`
- `'A2'` when `11 < KW_ITV ≤ 35`
- `'A'` when `KW_ITV > 35`
- `''` (empty string) when `KW_ITV` is absent, `*******`, or non-numeric

#### Scenario: All fields extracted from valid row
- **WHEN** a row passes `isElectricMotorcycleRow`
- **THEN** `extractElectricFields(line)` returns an object with all 36 fields populated (empty string if the source field is blank)

#### Scenario: TIPO_CARNET calculated correctly
- **WHEN** `KW_ITV` is `11` or less
- **THEN** `TIPO_CARNET` is `'A1'`
- **WHEN** `KW_ITV` is between 11 (exclusive) and 35 (inclusive)
- **THEN** `TIPO_CARNET` is `'A2'`
- **WHEN** `KW_ITV` is greater than 35
- **THEN** `TIPO_CARNET` is `'A'`
- **WHEN** `KW_ITV` is `'*******'` or empty
- **THEN** `TIPO_CARNET` is `''`

### Requirement: CATEGORIA_HOMOLOGACION_EUROPEA_ITV normalisation
The system SHALL normalise the `CATEGORIA_HOMOLOGACION_EUROPEA_ITV` field at extraction time using `normalizeCategoria(cat, clasificacion)`:
- If the raw value starts with `L3E` (case-insensitive), rewrite it as `L3e`.
- If the raw value is empty or contains `*`, AND `CLASIFICACION_REGLAMENTO_VEHICULOS_ITV` starts with `'04'` (codes 0400/0420/0421 — two-wheeled motorcycles), assign `L3e`.
- Otherwise keep the raw value unchanged.

This normalisation is applied before writing the daily CSV and is therefore reflected in all aggregates.

#### Scenario: Asterisk-coded category for a two-wheeled motorcycle
- **WHEN** `CATEGORIA_HOMOLOGACION_EUROPEA_ITV` is `*05` and `CLASIFICACION_REGLAMENTO_VEHICULOS_ITV` is `0400`
- **THEN** the stored value is `L3e`

#### Scenario: L3E casing variant
- **WHEN** the raw field value is `L3E` or `L3E-`
- **THEN** the stored value is `L3e`

### Requirement: Model-level aggregate with power variant and EU category
The system SHALL compute per-month and per-year aggregates at the (MARCA, MODELO, KW_ITV, CATEGORIA_HOMOLOGACION_EUROPEA_ITV) granularity:
- `acumulado-modelo-mensual.csv` — columns: `MARCA_ITV, MODELO_ITV, KW_ITV, CATEGORIA_HOMOLOGACION_EUROPEA_ITV, COUNT`
- `acumulado-modelo-anual.csv` — same columns, summed across months

Each unique combination of (brand, model, power, EU category) is a distinct row. A model available in two power variants appears as two separate rows.

#### Scenario: Same model name, different power
- **WHEN** `SILENCE S02` is registered with both `4.00 kW` and `7.00 kW` in the same month
- **THEN** the monthly aggregate contains two rows: one for `4.00` and one for `7.00`, each with its own COUNT

### Requirement: Date range — 2025 onwards only
The ETL SHALL process dates starting from 2025-01-01 up to and including yesterday (current date minus one day). No data prior to 2025 SHALL be fetched or stored.

#### Scenario: Dates before 2025 are ignored
- **WHEN** the system generates the list of dates to process
- **THEN** no date before 2025-01-01 appears in the list

### Requirement: Single script for initial load and updates
The ETL script SHALL serve both as the initial backfill (first run on an empty `e-data/`) and as the daily incremental update (subsequent runs). Running the script multiple times SHALL be idempotent: it processes only missing dates and skips already-written CSVs.

#### Scenario: First run on empty e-data/
- **WHEN** `e-data/` contains no CSVs
- **THEN** the script processes all dates from 2025-01-01 to yesterday

#### Scenario: Subsequent run after partial data
- **WHEN** some `e-data/YYYY/MM/DD.csv` files already exist
- **THEN** the script skips those dates and processes only the missing ones

### Requirement: Daily ZIP with fallback to monthly ZIP
For each missing date, the system SHALL first attempt to download the daily ZIP (`export_mat_YYYYMMDD.zip`). If the daily ZIP is unavailable (HTTP error or 404), the system SHALL fall back to the monthly ZIP (`export_mensual_mat_YYYYMM.zip`) for that month. The monthly ZIP SHALL be downloaded once per month and its rows split by `FEC_MATRICULA` to produce individual `DD.csv` files for all calendar days found in the file that are still missing.

#### Scenario: Daily ZIP available
- **WHEN** the daily ZIP for a given date is reachable
- **THEN** only that date's rows are extracted and written to `e-data/YYYY/MM/DD.csv`

#### Scenario: Daily ZIP unavailable, monthly fallback succeeds
- **WHEN** the daily ZIP returns a 404 or network error
- **AND** the monthly ZIP for that month is reachable
- **THEN** the monthly ZIP is downloaded once
- **AND** rows are grouped by `FEC_MATRICULA`
- **AND** each group is written to its corresponding `e-data/YYYY/MM/DD.csv` (only for dates still missing)

#### Scenario: Monthly ZIP also unavailable
- **WHEN** both the daily ZIP and the monthly ZIP fail
- **THEN** the system logs the error and continues to the next date without writing a CSV

#### Scenario: Monthly ZIP already covers some days of the month
- **WHEN** some `DD.csv` files for the month already exist before the monthly fallback runs
- **THEN** the monthly ZIP is still downloaded once but only the still-missing days are written; existing CSVs are not overwritten

### Requirement: Daily CSV output
The system SHALL write one CSV file per processed day at `microdatos-etl/e-data/YYYY/MM/DD.csv`. The CSV SHALL include a header row with the 36 field names (35 source fields + `TIPO_CARNET`). Each subsequent row SHALL represent one electric motorcycle registration. Values SHALL be double-quoted.

#### Scenario: Day with electric registrations
- **WHEN** a daily or monthly ZIP contains electric motorcycle rows for a given date
- **THEN** `e-data/YYYY/MM/DD.csv` is created with one row per registration

#### Scenario: Day with no electric registrations
- **WHEN** the source ZIP contains no rows matching `isElectricMotorcycleRow` for a given date
- **THEN** `e-data/YYYY/MM/DD.csv` is created with the header row only (zero data rows)

#### Scenario: CSV already exists (idempotency)
- **WHEN** `e-data/YYYY/MM/DD.csv` already exists
- **THEN** the system skips that date entirely

### Requirement: Monthly aggregates by brand and power band
The system SHALL compute and write monthly aggregate CSVs under `e-data/YYYY/MM/`:
- `acumulado-marca-mensual.csv` — columns: `MARCA_ITV, COUNT`
- `acumulado-potencia-mensual.csv` — columns: `RANGO_POTENCIA, COUNT`

Power bands SHALL follow the same classification as `getPowerRange()`:
- `Hasta 11 kW` (KW_ITV ≤ 11)
- `11-35 kW` (11 < KW_ITV ≤ 35)
- `Más de 35 kW` (KW_ITV > 35)

Rows where `KW_ITV` is absent, `*******`, or non-numeric SHALL be excluded from the power-band aggregate but counted in the brand aggregate.

#### Scenario: Monthly aggregates written after processing
- **WHEN** all day ZIPs for a given month are processed
- **THEN** `acumulado-marca-mensual.csv` and `acumulado-potencia-mensual.csv` reflect the totals for that month

### Requirement: Annual aggregates by brand and power band
The system SHALL compute and write annual aggregate CSVs under `e-data/YYYY/`:
- `acumulado-marca-anual.csv` — columns: `MARCA_ITV, COUNT`
- `acumulado-potencia-anual.csv` — columns: `RANGO_POTENCIA, COUNT`

Annual aggregates SHALL be derived by summing all monthly aggregates for the year.

#### Scenario: Annual aggregates regenerated for affected years
- **WHEN** new data is processed for a given year
- **THEN** `acumulado-marca-anual.csv` and `acumulado-potencia-anual.csv` for that year are rewritten to reflect the updated totals
