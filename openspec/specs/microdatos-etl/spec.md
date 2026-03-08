# Microdata ETL

## Purpose

Automate the daily download of vehicle registration microdata from DGT.

## Requirements

### Requirement: Scheduled daily execution

The system SHALL run a daily scheduled job at 08:00 GMT+0 in GitHub Actions.

#### Scenario: Scheduled execution

- WHEN the time reaches 08:00 GMT+0
- THEN a GitHub Actions workflow runs
- AND the microdata ETL process starts

### Requirement: HTML listing download and parsing

The system SHALL download the HTML from:
`https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html`.
It SHALL then parse the listing inside `ul#listado` to extract `.zip` microdata links.

#### Scenario: ZIP link extraction

- WHEN the HTML contains `<a>` elements inside `#listado`
- THEN the system obtains URLs `https://www.dgt.es/microdatos/.../export_mat_YYYYMMDD.zip`
- AND ignores non-ZIP or duplicate links

### Requirement: Incremental download by date

The system SHALL download only ZIP files whose final CSV does not already exist in `/microdatos-etl/data/YYYY/MM/DD.csv`.

#### Scenario: CSV for date already exists

- WHEN `/microdatos-etl/data/YYYY/MM/DD.csv` exists for a given date
- THEN the system does not download `export_mat_YYYYMMDD.zip` for that date

#### Scenario: CSV for date does not exist

- WHEN `/microdatos-etl/data/YYYY/MM/DD.csv` does not exist for a given date
- THEN the system downloads `export_mat_YYYYMMDD.zip` for that date
- AND processes its contents to generate the output CSV

### Requirement: Decompression and content reading

The system SHALL treat downloaded files as ZIP archives, decompress them, and read the contained TXT file.
The TXT SHALL be interpreted as fixed-width character-column records, following this field structure and length definition:

`FEC_MATRICULA(8), COD_CLASE_MAT(1), FEC_TRAMITACION(8), MARCA_ITV(30), MODELO_ITV(22), COD_PROCEDENCIA_ITV(1), BASTIDOR_ITV(21), COD_TIPO(2), COD_PROPULSION_ITV(1), CILINDRADA_ITV(5), POTENCIA_ITV(6), TARA(6), PESO_MAX(6), NUM_PLAZAS(3), IND_PRECINTO(2), IND_EMBARGO(2), NUM_TRANSMISIONES(2), NUM_TITULARES(2), LOCALIDAD_VEHICULO(24), COD_PROVINCIA_VEH(2), COD_PROVINCIA_MAT(2), CLAVE_TRAMITE(1), FEC_TRAMITE(8), CODIGO_POSTAL(5), FEC_PRIM_MATRICULACION(8), IND_NUEVO_USADO(1), PERSONA_FISICA_JURIDICA(1), CODIGO_ITV(9), SERVICIO(3), COD_MUNICIPIO_INE_VEH(5), MUNICIPIO(30), KW_ITV(7), NUM_PLAZAS_MAX(3), CO2_ITV(5), RENTING(1), COD_TUTELA(1), COD_POSESION(1), IND_BAJA_DEF(1), IND_BAJA_TEMP(1), IND_SUSTRACCION(1), BAJA_TELEMATICA(11), TIPO_ITV(25), VARIANTE_ITV(25), VERSION_ITV(35), FABRICANTE_ITV(70), MASA_ORDEN_MARCHA_ITV(6), MASA_MAXIMA_TECNICA_ITV(6), CATEGORIA_HOMOLOGACION_EUROPEA_ITV(4), CARROCERIA(4), PLAZAS_PIE(3), NIVEL_EMISIONES_EURO_ITV(8), CONSUMO_WH_KM_ITV(4), CLASIFICACION_REGLAMENTO_VEHICULOS_ITV(4), CATEGORIA_VEHICULO_ELECTRICO(4), AUTONOMIA_VEHICULO_ELECTRICO(6), MARCA_VEHICULO_BASE(30), FABRICANTE_VEHICULO_BASE(50), TIPO_VEHICULO_BASE(35), VARIANTE_VEHICULO_BASE(25), VERSION_VEHICULO_BASE(35), DISTANCIA_EJES_12_ITV(4), VIA_ANTERIOR_ITV(4), VIA_POSTERIOR_ITV(4), TIPO_ALIMENTACION_ITV(1), CONTRASENA_HOMOLOGACION_ITV(25), ECO_INNOVACION_ITV(1), REDUCCION_ECO_ITV(4), CODIGO_ECO_ITV(25), FEC_PROCESO(8)`

#### Scenario: ZIP processed successfully

- WHEN a new `export_mat_YYYYMMDD.zip` exists
- THEN the system decompresses it
- AND locates and reads the contained TXT as fixed-width records

### Requirement: Ephemeral temporary storage for ZIP and TXT artifacts

The system SHALL store downloaded ZIP files and extracted TXT files only in a temporary workspace.
This temporary workspace SHALL be non-persistent between workflow runs.

#### Scenario: Temporary artifact placement

- WHEN a ZIP file is downloaded and its TXT is extracted
- THEN both artifacts are written to a temporary directory
- AND they are not written under `/microdatos-etl/data/`

#### Scenario: No artifact persistence between runs

- WHEN a new workflow run starts
- THEN ZIP and TXT artifacts from previous runs are not available
- AND the run does not depend on persisted temporary artifacts

### Requirement: Record filtering rules

The system SHALL discard records that do not satisfy all these conditions:
`COD_TIPO === "50"`, `CLAVE_TRAMITE === "1"`, `IND_NUEVO_USADO === "N"`, `FABRICANTE_ITV !== "ND"`.
The system SHALL apply these filtering rules at the earliest feasible stage after parsing each record, before downstream transformations and aggregations.

#### Scenario: Record discarded by rules

- WHEN a record fails any of the four rules
- THEN the record is not part of the final output

#### Scenario: Valid record

- WHEN a record satisfies all four rules
- THEN the record can be included in the resulting dataset with the target fields

### Requirement: Target field extraction

The system SHALL extract the following fields from each record:
`FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`, `COD_PROVINCIA_VEH`, `CILINDRADA_ITV`.

#### Scenario: Per-record extraction

- WHEN a record is parsed successfully
- THEN the seven target fields are obtained with leading and trailing spaces trimmed

### Requirement: Model normalization by brand

During extraction, the system SHALL normalize `MODELO_ITV` based on `MARCA_ITV`.
Normalization applies two types of rules, evaluated in order: exact match first, then prefix match.

**Exact rules** (full model string match → canonical):

- For `YAMAHA`:
  `GPD125D-A -> NMAX125`, `GPD125-A -> NMAX125`, `YP125R-DA -> XMAX125`, `YP125RA -> XMAX125`, `WR125-A -> WR125`, `LCG125 -> RayZR 125`
- For `HONDA`:
  `WW125A -> PCX125`, `WW125S -> PCX125`, `FSH125 -> SH Mode 125`, `SH125AD -> SH125i`, `NSS125AD -> FORZA125`, `NSC110 -> VISION 110`, `XL750  -> XL750 Transalp`Ω
- For `APRILIA`:
  `RS 660 FACTORY -> RS 660`, `RSV4 FACTORY -> RSV4`, `TUONO V4 FACTORY -> TUONO V4`, `TUAREG 660 RALLY -> TUAREG 660`
- For `BENELLI`:
  `BKX 125 S -> BN125`, `TRK 702 35KW -> TRK 702`, `TRK 702X -> TRK 702`, `TRK 702X 35KW -> TRK 702`

**Prefix rules** (model starts with prefix → canonical):

- For `YAMAHA`:
  prefix `MTN690` → `MT-07`,
  prefix `MTT890` → `MT-09`,
  prefix `XTZ690` → `XTZ 700 Tenere`,
  prefix `MWS125` → `TRICITY 125`
- For `SYM`: prefix `SYMPHONY 125` → `SYMPHONY 125`
- For `BRIXTON`: prefix `CROSSFIRE 500 ` → `CROSSFIRE 500`
- For `DUCATI`:
  prefix `MULTISTRADA V2 ` → `MULTISTRADA V2`,
  prefix `MULTISTRADA V4 ` → `MULTISTRADA V4`,
  prefix `PANIGALE V2 ` → `PANIGALE V2`,
  prefix `PANIGALE V4 ` → `PANIGALE V4`,
  prefix `STREETFIGHTER ` → `STREETFIGHTER`
- For `HONDA`:
  prefix `CB650RA` → `CB650RA`,
  prefix `CBR1000` → `CBR1000`,
  prefix `CBR500` → `CBR500`,
  prefix `CMX1100` → `CMX1100`,
  prefix `CRF1100` → `CRF1100`,
  prefix `NT1100` → `NT1100`
- For `KTM`:
  prefix `KTM 250 EXC` → `KTM 250 EXC`,
  prefix `KTM 300 EXC` → `KTM 300 EXC`
- For `KYMCO`: prefix `AGILITY S ` → `AGILITY S`

#### Scenario: Model matched by exact rule

- WHEN a row's `MARCA_ITV` and `MODELO_ITV` match an exact rule
- THEN `MODELO_ITV` is replaced with the canonical value for that brand

#### Scenario: Model matched by prefix rule

- WHEN a row's `MARCA_ITV` has prefix rules and `MODELO_ITV` starts with a defined prefix
- THEN `MODELO_ITV` is replaced with the canonical value for that prefix

#### Scenario: Exact rule takes precedence over prefix rule

- WHEN a model matches both an exact rule and a prefix rule for the same brand
- THEN the exact rule result is returned

#### Scenario: Model not matched

- WHEN a row matches no exact or prefix rule
- THEN `MODELO_ITV` keeps its original value

#### Scenario: Aprilia factory variant normalized

- WHEN `MARCA_ITV` = `APRILIA` and `MODELO_ITV` = `RS 660 FACTORY`
- THEN `MODELO_ITV` is replaced with `RS 660`

#### Scenario: Ducati color variant normalized

- WHEN `MARCA_ITV` = `DUCATI` and `MODELO_ITV` starts with `MULTISTRADA V4 `
- THEN `MODELO_ITV` is replaced with `MULTISTRADA V4`

#### Scenario: Honda ITV code prefix normalized

- WHEN `MARCA_ITV` = `HONDA` and `MODELO_ITV` starts with `CRF1100`
- THEN `MODELO_ITV` is replaced with `CRF1100`

### Requirement: CSV generation and storage

The system SHALL store resulting records in CSV format with one output per date at:
`/microdatos-etl/data/YYYY/MM/DD.csv`.

#### Scenario: Per-date output write

- WHEN processing for a date `YYYYMMDD` finishes
- THEN the file `/microdatos-etl/data/YYYY/MM/DD.csv` is created
- AND the CSV contains columns `FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV,COD_PROVINCIA_VEH,CILINDRADA_ITV`

### Requirement: Monthly aggregation by brand and model

The system SHALL maintain a monthly CSV with accumulated counts for `MARCA_ITV` and `MODELO_ITV` combinations.
The monthly output SHALL be stored at:
`/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo.csv`.
In the same operation, the system SHALL also generate `/microdatos-etl/data/YYYY/MM/acumulado-marca.csv` with counts grouped solely by `MARCA_ITV`.

#### Scenario: Monthly aggregation structure

- WHEN the monthly CSV is generated
- THEN it includes columns `MARCA_ITV,MODELO_ITV,CILINDRADA_ITV,COUNT`
- AND each row represents a unique `MARCA_ITV` + `MODELO_ITV` combination
- AND `COUNT` is the total number of records in that month for that combination
- AND `CILINDRADA_ITV` is the validated displacement value for that brand-model combination

#### Scenario: Monthly aggregation ordering

- WHEN the monthly CSV is written
- THEN rows are sorted alphabetically by `MARCA_ITV`
- AND in case of ties, by `MODELO_ITV`

#### Scenario: Monthly brand aggregation generated alongside

- WHEN the monthly aggregation by brand and model is generated
- THEN `acumulado-marca.csv` is also written for the same month
- AND it contains columns `MARCA_ITV,COUNT` sorted alphabetically by `MARCA_ITV`

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

### Requirement: Selective monthly recalculation

On each run, the system SHALL recalculate only months for which new data was incorporated during that same run.
For each month selected for recalculation, the system SHALL use all existing daily CSV files in that month as input.

#### Scenario: Month with new data

- WHEN at least one new day from a specific month is downloaded and processed in the run
- THEN `acumulado-marca-modelo.csv` for that month is recalculated
- AND the recalculation reads every existing daily file `/microdatos-etl/data/YYYY/MM/DD.csv` for that month

#### Scenario: Month without new data

- WHEN there are no new days for a specific month in the run
- THEN that month's monthly CSV is not recalculated

### Requirement: ETL orchestration across multiple GitHub jobs

The system SHALL support splitting end-to-end ETL execution into multiple GitHub Actions jobs.
If split, job dependencies SHALL preserve the required execution order and data consistency.

#### Scenario: Multi-job ETL workflow

- WHEN ETL is implemented as multiple jobs
- THEN each downstream job waits for required upstream jobs
- AND the final outputs are equivalent to a single-job execution

### Requirement: Commit generated data artifacts at end of run

At the end of a successful ETL run, the workflow SHALL commit changes under `/microdatos-etl/data/`, including daily extracts and monthly aggregates.

#### Scenario: Data changes detected

- WHEN the run produces additions or modifications in `/microdatos-etl/data/`
- THEN the workflow creates a commit with those data changes

#### Scenario: No data changes detected

- WHEN no files under `/microdatos-etl/data/` changed
- THEN no data commit is created

### Requirement: Script location

The system SHALL place the main ETL script inside the `/microdatos-etl/` directory.

#### Scenario: Repository structure

- WHEN the workflow runs
- THEN the command uses a script in `/microdatos-etl/`
