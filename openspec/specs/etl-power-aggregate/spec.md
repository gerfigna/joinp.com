# ETL — Power Aggregation

## Purpose

Nuevo script ETL (`download-microdatos-mes.js`) que descarga ZIPs mensuales de la DGT, extrae `KW_ITV` + `MARCA_ITV`, y genera acumulados mensuales y anuales por marca y por rangos de potencia. Opera de forma independiente del ETL diario existente.

## Requirements

### Requirement: KW_ITV Field Extraction

The system SHALL extract `KW_ITV` (field position 227) and `MARCA_ITV` from each motorcycle record in DGT monthly ZIPs.

`extractPowerFields(row)` in `lib/filter.js` MUST return `{ marca, kw }` or `null` if KW_ITV is absent, empty, zero, or non-numeric.

#### Scenario: Valid KW_ITV extraction

- GIVEN a DGT TXT row with `COD_TIPO = "50"`, `MARCA_ITV = "HONDA"`, and `KW_ITV = "25.5"`
- WHEN `extractPowerFields(row)` is called
- THEN it returns `{ marca: "HONDA", kw: 25.5 }`

#### Scenario: KW_ITV empty or invalid

- GIVEN a DGT TXT row with `KW_ITV` empty or `0`
- WHEN `extractPowerFields(row)` is called
- THEN it returns `null` and the row is excluded from all aggregates

### Requirement: Power Range Classification

The system MUST classify each valid `KW_ITV` value into exactly one of these ranges:

| Range key | Condition |
|-----------|-----------|
| `Hasta 11 kW` | `kw <= 11` |
| `11-35 kW` | `kw > 11` AND `kw <= 35` |
| `Más de 35 kW` | `kw > 35` |

#### Scenario: Boundary — exactly 11 kW

- GIVEN a row with `kw = 11`
- WHEN the power aggregator classifies it
- THEN it is placed in range `Hasta 11 kW`

#### Scenario: Boundary — exactly 35 kW

- GIVEN a row with `kw = 35`
- WHEN the power aggregator classifies it
- THEN it is placed in range `11-35 kW`

#### Scenario: Above highest range

- GIVEN a row with `kw = 50`
- WHEN the power aggregator classifies it
- THEN it is placed in range `Más de 35 kW`

### Requirement: Monthly Brand Accumulation

The system SHALL write `data/YYYY/MM/acumulado-marca-mensual.csv` with columns `MARCA_ITV,COUNT` aggregating all valid motorcycle rows per brand for that month.

#### Scenario: Monthly brand CSV generation

- GIVEN all valid rows for 2025/03 have been extracted
- WHEN `writeMarcaMonthly(year, month, aggregates)` is called
- THEN `data/2025/03/acumulado-marca-mensual.csv` is written with one row per brand and correct COUNT values

### Requirement: Monthly Power Range Accumulation

The system SHALL write `data/YYYY/MM/acumulado-potencia-mensual.csv` with columns `RANGO_POTENCIA,COUNT` aggregating all valid motorcycle rows per power range for that month.

#### Scenario: Monthly power range CSV generation

- GIVEN all valid rows for 2025/03 have been extracted
- WHEN `writePotenciaMonthly(year, month, aggregates)` is called
- THEN `data/2025/03/acumulado-potencia-mensual.csv` is written with exactly 3 rows (one per range) and correct COUNT values

### Requirement: Annual Brand Accumulation

The system SHALL write `data/YYYY/acumulado-marca-anual.csv` with columns `MARCA_ITV,COUNT` aggregating ALL valid motorcycle rows per brand across all months of the year.

The annual file MUST be recalculated from scratch whenever a new monthly file is added for that year.

#### Scenario: Annual brand CSV recalculation

- GIVEN `data/2025/01/` through `data/2025/03/` monthly files exist
- WHEN the ETL processes 2025/04
- THEN `data/2025/acumulado-marca-anual.csv` is regenerated with data from all 4 months

### Requirement: Annual Power Range Accumulation

The system SHALL write `data/YYYY/acumulado-potencia-anual.csv` with columns `RANGO_POTENCIA,COUNT` aggregating ALL valid motorcycle rows per power range across all months of the year.

The annual file MUST be recalculated from scratch whenever a new monthly file is added for that year.

#### Scenario: Annual power range CSV recalculation

- GIVEN `data/2025/01/` through `data/2025/03/` monthly files exist
- WHEN the ETL processes 2025/04
- THEN `data/2025/acumulado-potencia-anual.csv` is regenerated with data from all 4 months

### Requirement: Skip Detection Per Output File

For each of the 4 output files, the system SHALL check existence independently. If a monthly output file already exists, that specific file is skipped. If an annual output file already exists, that specific file is skipped.

The system MUST NOT skip an annual recalculation just because the monthlies already exist — annual files are always regenerated after a new month is processed.

#### Scenario: Monthly file already exists

- GIVEN `data/2025/03/acumulado-marca-mensual.csv` already exists
- WHEN the ETL processes 2025/03
- THEN the monthly CSV is skipped and the script proceeds to annual recalculation

### Requirement: No New Dependencies

The system MUST NOT introduce new npm dependencies beyond the existing `adm-zip`.

### Requirement: Clear Logging

The ETL MUST log at minimum: the month/year being processed, the number of valid rows extracted, and the number of rows skipped due to invalid KW_ITV.

#### Scenario: Logging output

- GIVEN the ETL is processing 2025/03
- WHEN it completes
- THEN console output includes "Procesando 2025/03", count of valid rows, and count of omitted rows (KW_ITV invalid)
