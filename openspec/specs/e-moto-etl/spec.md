# Electric Motorcycle ETL Specification

## Purpose

ETL script (`microdatos-etl/download-microdatos-electrica.js`) that downloads DGT daily and monthly ZIPs, filters BEV motorcycle registrations, and writes accumulated CSVs under `microdatos-etl/e-data/`.

## Requirements

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

#### Scenario: Row is a hybrid or range-extender (non-BEV)
- **WHEN** `CATEGORIA_VEHICULO_ELECTRICO` is `'HEV'`, `'PHEV'`, `'REEV'`, or any value other than `'BEV'`
- **THEN** `isElectricMotorcycleRow(line)` returns `false`

### Requirement: Brand exclusion — TALARIA
The system SHALL exclude all rows where `normalizeBrand(MARCA_ITV) === 'TALARIA'`. Records from this brand present inconsistencies in propulsion and electric category fields that make them unreliable for analysis.

#### Scenario: TALARIA row excluded
- **WHEN** a row passes all other filter conditions but `MARCA_ITV` normalizes to `'TALARIA'`
- **THEN** `isElectricMotorcycleRow(line)` returns `false`

### Requirement: Valid KW required
The system SHALL exclude rows where `KW_ITV` is absent, `*******`, zero, or non-numeric.

#### Scenario: Row with invalid KW excluded
- **WHEN** `KW_ITV` is empty, `*******`, `0`, or non-numeric
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

#### Scenario: TIPO_CARNET calculated correctly
- **WHEN** `KW_ITV` is `11` or less → `TIPO_CARNET` is `'A1'`
- **WHEN** `KW_ITV` is between 11 (exclusive) and 35 (inclusive) → `TIPO_CARNET` is `'A2'`
- **WHEN** `KW_ITV` is greater than 35 → `TIPO_CARNET` is `'A'`

### Requirement: CATEGORIA_HOMOLOGACION_EUROPEA_ITV normalisation
The system SHALL normalise the `CATEGORIA_HOMOLOGACION_EUROPEA_ITV` field at extraction time using `normalizeCategoria(cat, clasificacion)`:
- If the raw value starts with `L3E` (case-insensitive), rewrite it as `L3e`.
- If the raw value is empty or contains `*`, AND `CLASIFICACION_REGLAMENTO_VEHICULOS_ITV` starts with `'04'`, assign `L3e`.
- Otherwise keep the raw value unchanged.

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

Each unique combination of (brand, model, power, EU category) is a distinct row.

#### Scenario: Same model name, different power
- **WHEN** `SILENCE S02` is registered with both `4.00 kW` and `7.00 kW` in the same month
- **THEN** the monthly aggregate contains two rows, each with its own COUNT

### Requirement: Date range — 2025 onwards only
The ETL SHALL process dates starting from 2025-01-01 up to and including yesterday. No data prior to 2025 SHALL be fetched or stored.

### Requirement: Single script for initial load and updates
Running the script multiple times SHALL be idempotent: it processes only missing dates and skips already-written CSVs.

#### Scenario: First run on empty e-data/
- **WHEN** `e-data/` contains no CSVs
- **THEN** the script processes all dates from 2025-01-01 to yesterday

#### Scenario: Subsequent run after partial data
- **WHEN** some `e-data/YYYY/MM/DD.csv` files already exist
- **THEN** the script skips those dates and processes only the missing ones

### Requirement: Daily ZIP with fallback to monthly ZIP
For each missing date, the system SHALL first attempt to download the daily ZIP. If unavailable, it SHALL fall back to the monthly ZIP for that month, downloaded once and split by `FEC_MATRICULA`.

#### Scenario: Daily ZIP available
- **WHEN** the daily ZIP for a given date is reachable
- **THEN** only that date's rows are extracted and written to `e-data/YYYY/MM/DD.csv`

#### Scenario: Daily ZIP unavailable, monthly fallback succeeds
- **WHEN** the daily ZIP returns 404 or network error
- **THEN** the monthly ZIP is downloaded once and rows are grouped by `FEC_MATRICULA`; each group is written to its corresponding `DD.csv` (only missing dates)

#### Scenario: Both ZIPs unavailable
- **WHEN** both the daily ZIP and the monthly ZIP fail
- **THEN** the system logs the error and continues to the next date

### Requirement: Monthly aggregates by brand and power band
The system SHALL compute and write monthly aggregate CSVs under `e-data/YYYY/MM/`:
- `acumulado-marca-mensual.csv` — columns: `MARCA_ITV, COUNT`
- `acumulado-potencia-mensual.csv` — columns: `RANGO_POTENCIA, COUNT`

Power bands: `Hasta 11 kW` (≤11), `11-35 kW` (11–35), `Más de 35 kW` (>35).

### Requirement: Annual aggregates by brand and power band
The system SHALL compute and write annual aggregate CSVs under `e-data/YYYY/`:
- `acumulado-marca-anual.csv` — columns: `MARCA_ITV, COUNT`
- `acumulado-potencia-anual.csv` — columns: `RANGO_POTENCIA, COUNT`

Annual aggregates are derived by summing all monthly aggregates for the year.
