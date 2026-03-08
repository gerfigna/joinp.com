## MODIFIED Requirements

### Requirement: Target field extraction

The system SHALL extract the following fields from each record:
`FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`, `COD_PROVINCIA_VEH`, `CILINDRADA_ITV`.

#### Scenario: Per-record extraction

- **WHEN** a record is parsed successfully
- **THEN** the seven target fields are obtained with leading and trailing spaces trimmed

### Requirement: CSV generation and storage

The system SHALL store resulting records in CSV format with one output per date at:
`/microdatos-etl/data/YYYY/MM/DD.csv`.

#### Scenario: Per-date output write

- **WHEN** processing for a date `YYYYMMDD` finishes
- **THEN** the file `/microdatos-etl/data/YYYY/MM/DD.csv` is created
- **AND** the CSV contains columns `FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV,COD_PROVINCIA_VEH,CILINDRADA_ITV`

### Requirement: Monthly aggregation by brand and model

The system SHALL maintain a monthly CSV with accumulated counts for `MARCA_ITV` and `MODELO_ITV` combinations.
The monthly output SHALL be stored at:
`/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo.csv`.
In the same operation, the system SHALL also generate `/microdatos-etl/data/YYYY/MM/acumulado-marca.csv` with counts grouped solely by `MARCA_ITV`.

#### Scenario: Monthly aggregation structure

- **WHEN** the monthly CSV is generated
- **THEN** it includes columns `MARCA_ITV,MODELO_ITV,CILINDRADA_ITV,COUNT`
- **AND** each row represents a unique `MARCA_ITV` + `MODELO_ITV` combination
- **AND** `COUNT` is the total number of records in that month for that combination
- **AND** `CILINDRADA_ITV` is the validated displacement value for that brand-model combination

#### Scenario: Monthly aggregation ordering

- **WHEN** the monthly CSV is written
- **THEN** rows are sorted alphabetically by `MARCA_ITV`
- **AND** in case of ties, by `MODELO_ITV`

#### Scenario: Monthly brand aggregation generated alongside

- **WHEN** the monthly aggregation by brand and model is generated
- **THEN** `acumulado-marca.csv` is also written for the same month
- **AND** it contains columns `MARCA_ITV,COUNT` sorted alphabetically by `MARCA_ITV`

## ADDED Requirements

### Requirement: Cilindrada consistency validation

For each `MARCA_ITV` + `MODELO_ITV` combination, `CILINDRADA_ITV` SHALL be identical across all records in a month.
If any combination has more than one distinct `CILINDRADA_ITV` value, the system SHALL abort with a descriptive error message indicating the brand, model, and conflicting values.

#### Scenario: Consistent cilindrada

- **WHEN** all records for a given `MARCA_ITV` + `MODELO_ITV` have the same `CILINDRADA_ITV`
- **THEN** the aggregation proceeds normally

#### Scenario: Inconsistent cilindrada detected

- **WHEN** records for a given `MARCA_ITV` + `MODELO_ITV` have more than one distinct `CILINDRADA_ITV` value
- **THEN** the script exits with a non-zero status code
- **AND** an error message is printed identifying the brand, model, and conflicting `CILINDRADA_ITV` values

