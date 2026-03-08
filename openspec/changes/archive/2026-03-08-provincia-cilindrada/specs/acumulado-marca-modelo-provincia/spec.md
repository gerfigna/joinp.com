## ADDED Requirements

### Requirement: Monthly aggregation by brand, model and province

The system SHALL maintain a monthly CSV with accumulated counts for `MARCA_ITV`, `MODELO_ITV`, and `PROVINCIA_VEH` combinations.
The monthly output SHALL be stored at `/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo-provincia.csv`.
It SHALL be generated in the same operation as `acumulado-marca-modelo.csv`.

#### Scenario: Monthly aggregation structure

- **WHEN** the monthly province CSV is generated
- **THEN** it includes columns `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,CILINDRADA_ITV,COUNT`
- **AND** each row represents a unique `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` combination
- **AND** `COUNT` is the total number of records in that month for that combination
- **AND** `CILINDRADA_ITV` is the validated displacement value for that brand-model combination

#### Scenario: Monthly aggregation ordering

- **WHEN** the monthly province CSV is written
- **THEN** rows are sorted alphabetically by `MARCA_ITV`
- **AND** in case of ties, by `MODELO_ITV`
- **AND** in case of ties, by `PROVINCIA_VEH`


### Requirement: Selective monthly province recalculation

The province aggregate SHALL be recalculated only for months in which new data was incorporated during the same run.

#### Scenario: Month with new data triggers province recalculation

- **WHEN** at least one new day from a specific month is downloaded and processed in the run
- **THEN** `acumulado-marca-modelo-provincia.csv` for that month is recalculated

#### Scenario: Month without new data skips province recalculation

- **WHEN** there are no new days for a specific month in the run
- **THEN** that month's `acumulado-marca-modelo-provincia.csv` is not recalculated
