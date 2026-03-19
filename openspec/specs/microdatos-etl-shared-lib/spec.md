# microdatos-etl-shared-lib Specification

## Purpose
TBD - created by archiving change refactor-extract. Update Purpose after archive.
## Requirements
### Requirement: Shared lib modules exist and are importable

The `microdatos-etl/lib/` directory SHALL contain the following CommonJS modules, each importable via `require()` from the ETL scripts:
`constants.js`, `fields.js`, `normalize.js`, `http.js`, `zip.js`, `filter.js`, `aggregate.js`.

#### Scenario: Module require succeeds

- **WHEN** an ETL script calls `require('./lib/<module>')`
- **THEN** the module loads without error and exports the expected functions and/or constants

### Requirement: constants.js exports DATA_DIR

`lib/constants.js` SHALL export a `DATA_DIR` constant pointing to the ETL data directory.

#### Scenario: DATA_DIR resolves correctly

- **WHEN** `require('./lib/constants')` is called from either ETL script
- **THEN** `DATA_DIR` is an absolute path resolving to `microdatos-etl/data/`

### Requirement: fields.js exports field definitions and lookup

`lib/fields.js` SHALL export:
- `FIELDS`: array of field definition objects (name, start offset, length) matching the DGT fixed-width record format.
- `FIELD_MAP`: object mapping field name to definition.
- `getField(record, name)`: function that extracts and trims a field value from a raw fixed-width record string.

#### Scenario: getField extracts correct substring

- **WHEN** `getField(record, 'MARCA_ITV')` is called with a valid fixed-width record
- **THEN** it returns the trimmed string value at the correct byte offset and length

#### Scenario: FIELD_MAP covers all FIELDS entries

- **WHEN** `FIELDS` is iterated
- **THEN** every entry's `name` is a key in `FIELD_MAP`

### Requirement: normalize.js exports model and province normalization

`lib/normalize.js` SHALL export:
- `normalizeModel(brand, model)`: returns the canonical model name for the given brand, applying exact rules first, then prefix rules; returns the original model if no rule matches.
- `normalizeProvince(code)`: returns the human-readable province name for a DGT province code; returns the raw code if not found in the mapping.

#### Scenario: normalizeModel applies exact rule

- **WHEN** `normalizeModel('YAMAHA', 'MTN320-A')` is called
- **THEN** it returns `'MT-03'`

#### Scenario: normalizeModel applies prefix rule

- **WHEN** `normalizeModel('YAMAHA', 'MTN125-A')` is called
- **THEN** it returns `'MT-125'`

#### Scenario: normalizeModel exact takes precedence over prefix

- **WHEN** `normalizeModel('HONDA', 'CBR650RAC')` is called
- **THEN** it returns `'CBR 650 R'` (exact rule), not a prefix match

#### Scenario: normalizeModel returns original when no rule matches

- **WHEN** `normalizeModel('KAWASAKI', 'Z900')` is called
- **THEN** it returns `'Z900'`

#### Scenario: normalizeProvince returns name for known code

- **WHEN** `normalizeProvince('M')` is called
- **THEN** it returns `'Madrid'`

#### Scenario: normalizeProvince returns raw code for unknown code

- **WHEN** `normalizeProvince('XX')` is called
- **THEN** it returns `'XX'`

### Requirement: http.js exports httpGet

`lib/http.js` SHALL export `httpGet(url)`: returns a Promise resolving to a Buffer containing the full HTTP/HTTPS response body. It SHALL follow redirects.

#### Scenario: httpGet resolves with response body

- **WHEN** `httpGet(url)` is called with a reachable URL
- **THEN** the promise resolves with a Buffer of the response body

#### Scenario: httpGet rejects on HTTP error

- **WHEN** the server returns a non-2xx status code
- **THEN** the promise rejects with an error indicating the status code

### Requirement: zip.js exports extractTxtFromZip

`lib/zip.js` SHALL export `extractTxtFromZip(zipBuf)`: accepts a Buffer containing a ZIP archive, extracts the first `.txt` entry, and returns its contents as a string.

#### Scenario: TXT extracted from ZIP buffer

- **WHEN** `extractTxtFromZip(buf)` is called with a valid ZIP buffer containing a `.txt` file
- **THEN** it returns the text content of that file as a string

### Requirement: filter.js exports row predicate and field extractor

`lib/filter.js` SHALL export:
- `isMotorcycleRow(record)`: returns `true` if the record satisfies all four filter conditions (`COD_TIPO === "50"`, `CLAVE_TRAMITE === "1"`, `IND_NUEVO_USADO === "N"`, `FABRICANTE_ITV !== "ND"`); `false` otherwise.
- `extractRowFields(record)`: returns an object with the seven target fields extracted and trimmed from the record, with province and model already normalized.

#### Scenario: isMotorcycleRow returns true for valid record

- **WHEN** a record has `COD_TIPO=50`, `CLAVE_TRAMITE=1`, `IND_NUEVO_USADO=N`, `FABRICANTE_ITV` not `ND`
- **THEN** `isMotorcycleRow(record)` returns `true`

#### Scenario: isMotorcycleRow returns false if any condition fails

- **WHEN** a record has `COD_TIPO` other than `50`
- **THEN** `isMotorcycleRow(record)` returns `false`

#### Scenario: extractRowFields returns normalized fields

- **WHEN** `extractRowFields(record)` is called on a valid record
- **THEN** it returns an object with keys `FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`, `PROVINCIA_VEH`, `CILINDRADA_ITV`
- **AND** `MODELO_ITV` has been passed through `normalizeModel`
- **AND** `PROVINCIA_VEH` has been passed through `normalizeProvince`

### Requirement: aggregate.js exports writeAggregates and path helpers

`lib/aggregate.js` SHALL export:
- `monthDir(year, month)`: returns the absolute directory path for a given year and month.
- `monthlyPath(year, month)`: returns the absolute path to `acumulado-marca-modelo.csv`.
- `brandMonthlyPath(year, month)`: returns the absolute path to `acumulado-marca.csv`.
- `provinciaMonthlyPath(year, month)`: returns the absolute path to `acumulado-marca-modelo-provincia.csv`.
- `writeAggregates(year, month, rows)`: accepts an array of row objects and writes all three monthly aggregate CSVs for the given year/month, applying cilindrada consistency validation.

#### Scenario: monthlyPath returns correct path

- **WHEN** `monthlyPath('2026', '03')` is called
- **THEN** it returns the absolute path ending in `microdatos-etl/data/2026/03/acumulado-marca-modelo.csv`

#### Scenario: writeAggregates produces all three CSVs

- **WHEN** `writeAggregates(year, month, rows)` is called with a non-empty rows array
- **THEN** `acumulado-marca-modelo.csv`, `acumulado-marca.csv`, and `acumulado-marca-modelo-provincia.csv` are written to the correct month directory

#### Scenario: writeAggregates logs warning on cilindrada conflict

- **WHEN** two rows for the same brand+model combination have different `CILINDRADA_ITV` values
- **THEN** a warning is printed to stderr with the brand, model, all values, and the chosen (most frequent) value
- **AND** the most frequent value is used in the output CSV

