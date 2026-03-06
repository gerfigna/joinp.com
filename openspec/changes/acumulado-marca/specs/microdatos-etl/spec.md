## MODIFIED Requirements

### Requirement: Monthly aggregation by brand and model

The system SHALL maintain a monthly CSV with accumulated counts for `MARCA_ITV` and `MODELO_ITV` combinations.
The monthly output SHALL be stored at `/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo.csv`.
In the same operation, the system SHALL also generate `/microdatos-etl/data/YYYY/MM/acumulado-marca.csv` with counts grouped solely by `MARCA_ITV`.

#### Scenario: Monthly aggregation structure

- **WHEN** the monthly CSV is generated
- **THEN** it includes columns `MARCA_ITV,MODELO_ITV,COUNT`
- **AND** each row represents a unique `MARCA_ITV` + `MODELO_ITV` combination
- **AND** `COUNT` is the total number of records in that month for that combination

#### Scenario: Monthly aggregation ordering

- **WHEN** the monthly CSV is written
- **THEN** rows are sorted alphabetically by `MARCA_ITV`
- **AND** in case of ties, by `MODELO_ITV`

#### Scenario: Monthly brand aggregation generated alongside

- **WHEN** the monthly aggregation by brand and model is generated
- **THEN** `acumulado-marca.csv` is also written for the same month
- **AND** it contains columns `MARCA_ITV,COUNT` sorted alphabetically by `MARCA_ITV`