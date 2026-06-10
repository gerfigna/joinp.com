## ADDED Requirements

### Requirement: Electric motorcycle row detection function
The `microdatos-etl/lib/filter.js` module SHALL export an `isElectricMotorcycleRow(line)` function that returns `true` when all six filter conditions are met: `COD_TIPO='50'`, `CLAVE_TRAMITE='1'`, `IND_NUEVO_USADO='N'`, `FABRICANTE_ITV≠'ND'`, `COD_PROPULSION_ITV='2'`, `COD_CLASE_MAT='0'`.

#### Scenario: Function exported from filter.js
- **WHEN** `require('./lib/filter')` is called
- **THEN** the returned object includes `isElectricMotorcycleRow`

### Requirement: Electric field extraction function
The `microdatos-etl/lib/filter.js` module SHALL export an `extractElectricFields(line)` function that returns an object with the 35 agreed source fields extracted and trimmed from the fixed-width record, plus the calculated `TIPO_CARNET` field (`'A1'` ≤ 11 kW, `'A2'` 11–35 kW, `'A'` > 35 kW, `''` if `KW_ITV` is absent or invalid) — 36 fields total. `MARCA_ITV` SHALL be passed through `normalizeBrand()`.

#### Scenario: Function exported from filter.js
- **WHEN** `require('./lib/filter')` is called
- **THEN** the returned object includes `extractElectricFields`

### Requirement: E_DATA_DIR constant
The `microdatos-etl/lib/constants.js` module SHALL export an `E_DATA_DIR` constant pointing to `microdatos-etl/e-data/` (sibling of the existing `DATA_DIR`).

#### Scenario: Constant exported from constants.js
- **WHEN** `require('./lib/constants')` is called
- **THEN** the returned object includes `E_DATA_DIR` as an absolute path ending in `/e-data`
