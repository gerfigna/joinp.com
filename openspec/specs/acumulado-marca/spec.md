# Acumulado Marca

## Purpose

Monthly brand-level aggregation of motorcycle registrations, derived from daily ETL data.

## Requirements

### Requirement: Monthly aggregation by brand

The system SHALL maintain a monthly CSV with accumulated counts per `MARCA_ITV`.
The monthly output SHALL be stored at `/microdatos-etl/data/YYYY/MM/acumulado-marca.csv`.

#### Scenario: Monthly brand aggregation structure

- WHEN the monthly brand CSV is generated
- THEN it includes columns `MARCA_ITV,COUNT`
- AND each row represents a unique `MARCA_ITV` value
- AND `COUNT` is the total number of records in that month for that brand

#### Scenario: Monthly brand aggregation ordering

- WHEN the monthly brand CSV is written
- THEN rows are sorted alphabetically by `MARCA_ITV`

### Requirement: Selective monthly brand recalculation

On each run, the system SHALL recalculate `acumulado-marca.csv` only for months in which new data was incorporated during that same run, using all existing daily CSV files for that month as input.

#### Scenario: Month with new data triggers brand recalculation

- WHEN at least one new day from a specific month is downloaded and processed in the run
- THEN `acumulado-marca.csv` for that month is recalculated
- AND the recalculation reads every existing daily file `/microdatos-etl/data/YYYY/MM/DD.csv` for that month

#### Scenario: Month without new data skips brand recalculation

- WHEN there are no new days for a specific month in the run
- THEN that month's `acumulado-marca.csv` is not recalculated
