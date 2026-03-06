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

### Requirement: Target field extraction

The system SHALL extract the following fields from each record:
`FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`.

#### Scenario: Per-record extraction

- WHEN a record is parsed successfully
- THEN the five target fields are obtained with leading and trailing spaces trimmed

### Requirement: Model normalization by brand

During extraction, the system SHALL normalize `MODELO_ITV` based on `MARCA_ITV` with these rules:

- For `YAMAHA`:
  `GPD125D-A -> NMAX125`, `GPD125-A -> NMAX125`, `YP125R-DA -> XMAX125`, `YP125RA -> XMAX125`
- For `SYM`:
  if `MODELO_ITV` starts with `SYMPHONY 125`, normalize to `SYMPHONY 125`
- For `HONDA`:
  `WW125A -> PCX125`, `WW125S -> PCX125`, `FSH125 -> SH125`, `SH125AD -> SH125`, `NSS125AD -> FORZA125`

#### Scenario: Model mapped

- WHEN a row matches any normalization rule
- THEN `MODELO_ITV` is replaced with the canonical value defined for its brand

#### Scenario: Model not mapped

- WHEN a row matches no normalization rule
- THEN `MODELO_ITV` keeps its original value

### Requirement: CSV generation and storage

The system SHALL store resulting records in CSV format with one output per date at:
`/microdatos-etl/data/YYYY/MM/DD.csv`.

#### Scenario: Per-date output write

- WHEN processing for a date `YYYYMMDD` finishes
- THEN the file `/microdatos-etl/data/YYYY/MM/DD.csv` is created
- AND the CSV contains columns `FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV`

### Requirement: Monthly aggregation by brand and model

The system SHALL maintain a monthly CSV with accumulated counts for `MARCA_ITV` and `MODELO_ITV` combinations.
The monthly output SHALL be stored at:
`/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo.csv`.

#### Scenario: Monthly aggregation structure

- WHEN the monthly CSV is generated
- THEN it includes columns `MARCA_ITV,MODELO_ITV,COUNT`
- AND each row represents a unique `MARCA_ITV` + `MODELO_ITV` combination
- AND `COUNT` is the total number of records in that month for that combination

#### Scenario: Monthly aggregation ordering

- WHEN the monthly CSV is written
- THEN rows are sorted alphabetically by `MARCA_ITV`
- AND in case of ties, by `MODELO_ITV`

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

### Requirement: ETL orchestration across multiple GitHub jobs

The system MAY split end-to-end ETL execution into multiple GitHub Actions jobs.
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
