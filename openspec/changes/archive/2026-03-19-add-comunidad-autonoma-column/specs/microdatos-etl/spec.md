## MODIFIED Requirements

### Requirement: Daily CSV includes autonomous community column
The ETL SHALL write a `COMUNIDAD_AUTONOMA` column to each daily `DD.csv` file, immediately after `PROVINCIA_VEH`.

The column order SHALL be: `FEC_MATRICULA, COD_CLASE_MAT, FEC_TRAMITACION, MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV`.

The value SHALL be computed by calling `normalizeComunidad(COD_PROVINCIA_VEH)` in `filter.js` at the same point where `normalizeProvince` is called for `PROVINCIA_VEH`.

#### Scenario: Normal registration row has community column
- **WHEN** the ETL processes a raw DGT record with `COD_PROVINCIA_VEH = "B"` (Barcelona)
- **THEN** the written daily CSV row has `PROVINCIA_VEH = "Barcelona"` and `COMUNIDAD_AUTONOMA = "Cataluña"`

#### Scenario: Daily CSV header is correct
- **WHEN** a new daily `DD.csv` file is written
- **THEN** the first line is `FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV`

### Requirement: Province-level aggregate includes autonomous community column
The ETL SHALL write a `COMUNIDAD_AUTONOMA` column to `acumulado-marca-modelo-provincia.csv` for each row, immediately after `PROVINCIA_VEH`.

The column order SHALL be: `MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV, COUNT`.

The value SHALL be read from the `COMUNIDAD_AUTONOMA` column of the daily CSV files during `recalculateMonthly`.

#### Scenario: Aggregate row has community column
- **WHEN** the ETL writes aggregates for a month containing registrations in province `"B"`
- **THEN** each row with `PROVINCIA_VEH = "Barcelona"` has `COMUNIDAD_AUTONOMA = "Cataluña"`

#### Scenario: Aggregate CSV header is correct
- **WHEN** a new `acumulado-marca-modelo-provincia.csv` is written
- **THEN** the first line is `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT`
