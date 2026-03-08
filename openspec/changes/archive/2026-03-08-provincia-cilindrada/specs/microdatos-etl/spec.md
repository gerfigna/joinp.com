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

### Requirement: Province code normalization

The system SHALL normalize `COD_PROVINCIA_VEH` to a human-readable province name using the official DGT mapping.
The normalized value SHALL be used as `PROVINCIA_VEH` in all CSV outputs (daily and aggregates) instead of the raw code.
If a code is not found in the mapping, the raw code SHALL be used as-is.

The mapping is:

| Code | Province |
|------|----------|
| A | Alicante/Alacant |
| AB | Albacete |
| AL | Almería |
| AV | Ávila |
| B | Barcelona |
| BA | Badajoz |
| BI | Bizkaia |
| BU | Burgos |
| C | Coruña (A) |
| CA | Cádiz |
| CC | Cáceres |
| CE | Ceuta |
| CO | Córdoba |
| CR | Ciudad Real |
| CS | Castellón/Castelló |
| CU | Cuenca |
| DS | Desconocido |
| EX | Extranjero |
| GC | Palmas (Las) |
| GI | Girona |
| GR | Granada |
| GU | Guadalajara |
| H | Huelva |
| HU | Huesca |
| IB | Illes Balears |
| J | Jaén |
| L | Lleida |
| LE | León |
| LO | Rioja (La) |
| LU | Lugo |
| M | Madrid |
| MA | Málaga |
| ML | Melilla |
| MU | Murcia |
| NA | Navarra |
| O | Asturias |
| OR | Ourense |
| OU | Ourense |
| P | Palencia |
| PM | Illes Balears |
| PO | Pontevedra |
| S | Cantabria |
| SA | Salamanca |
| SE | Sevilla |
| SG | Segovia |
| SO | Soria |
| SS | Gipuzkoa |
| T | Tarragona |
| TE | Teruel |
| TF | Santa Cruz de Tenerife |
| TO | Toledo |
| V | Valencia/València |
| VA | Valladolid |
| VI | Álava/Araba |
| Z | Zaragoza |
| ZA | Zamora |

#### Scenario: Known province code

- **WHEN** `COD_PROVINCIA_VEH` matches a code in the mapping
- **THEN** `PROVINCIA_VEH` is the corresponding province name

#### Scenario: Unknown province code

- **WHEN** `COD_PROVINCIA_VEH` does not match any code in the mapping
- **THEN** `PROVINCIA_VEH` equals the raw `COD_PROVINCIA_VEH` value

### Requirement: Cilindrada consistency validation

For each `MARCA_ITV` + `MODELO_ITV` combination, the system SHALL use the most frequent `CILINDRADA_ITV` value across all records in a month.
If more than one distinct value exists, the system SHALL log a warning identifying the brand, model, all conflicting values, and the chosen value. Processing SHALL continue normally.

#### Scenario: Consistent cilindrada

- **WHEN** all records for a given `MARCA_ITV` + `MODELO_ITV` have the same `CILINDRADA_ITV`
- **THEN** that value is used in the aggregation

#### Scenario: Inconsistent cilindrada detected

- **WHEN** records for a given `MARCA_ITV` + `MODELO_ITV` have more than one distinct `CILINDRADA_ITV` value
- **THEN** the most frequent value is selected as `CILINDRADA_ITV` for that combination
- **AND** a warning is printed to stderr identifying the brand, model, all conflicting values, and the chosen value
- **AND** processing continues normally

