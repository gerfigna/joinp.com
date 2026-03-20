## MODIFIED Requirements

### Requirement: Period selector separated from filters
The year and month selects SHALL be rendered in a dedicated `<div class="period-selector">` container that is visually distinct from and positioned above the `.filters` panel.

The `.filters` panel SHALL NOT contain the year or month selects.

#### Scenario: Period selector rendered above filters
- **WHEN** the page loads
- **THEN** a `.period-selector` element is visible above the `.filters` panel
- **AND** it contains `sel-year` and `sel-month`
- **AND** the `.filters` panel does not contain `sel-year` or `sel-month`

#### Scenario: Year/month change still triggers data load
- **WHEN** the user changes `sel-year` or `sel-month`
- **THEN** a new CSV fetch is triggered (same behavior as before)

### Requirement: CSV parsing uses new column order
The dashboard CSV parser SHALL correctly read the column order produced by the current ETL:
`MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV, COUNT`.

Each parsed row object SHALL have properties: `MARCA_ITV`, `MODELO_ITV`, `PROVINCIA_VEH`, `COMUNIDAD_AUTONOMA`, `CILINDRADA_ITV`, `COUNT`.

#### Scenario: COMUNIDAD_AUTONOMA parsed correctly
- **WHEN** a CSV row is `"HONDA","PCX125","Madrid","Comunidad de Madrid","125",42`
- **THEN** the parsed row has `COMUNIDAD_AUTONOMA === "Comunidad de Madrid"` and `CILINDRADA_ITV === "125"` and `COUNT === 42`

#### Scenario: Old positional access replaced
- **WHEN** the CSV is parsed
- **THEN** no row field is accessed by numeric column index — all access is by header name
