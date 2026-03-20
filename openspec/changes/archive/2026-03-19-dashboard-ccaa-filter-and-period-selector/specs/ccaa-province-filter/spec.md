## ADDED Requirements

### Requirement: Comunidad Autónoma filter select
The dashboard SHALL render a `<select id="sel-comunidad">` filter with a default option "Todas las comunidades" (value `""`), populated with the unique CCAA values present in the loaded data, sorted alphabetically.

The select SHALL appear immediately before the `sel-province` select in the filter panel.

#### Scenario: Populated after data load
- **WHEN** a CSV is successfully loaded
- **THEN** `sel-comunidad` is populated with the unique `COMUNIDAD_AUTONOMA` values from the data, sorted alphabetically, with "Todas las comunidades" as the first option

#### Scenario: No selection means no filter
- **WHEN** `sel-comunidad` value is `""`
- **THEN** no comunidad filter is applied and all rows are eligible

### Requirement: Cascading province dropdown
When a comunidad is selected in `sel-comunidad`, the `sel-province` dropdown SHALL be repopulated to show only the provinces belonging to that comunidad (derived from the loaded data).

When `sel-comunidad` is cleared (set to `""`), `sel-province` SHALL be repopulated with all provinces from the loaded data.

If the currently selected province exists in the new province list, it SHALL remain selected. Otherwise the province selection SHALL be reset to `""`.

#### Scenario: Selecting a comunidad narrows provinces
- **WHEN** the user selects "Cataluña" in `sel-comunidad`
- **THEN** `sel-province` is repopulated with only Barcelona, Girona, Lleida, Tarragona (plus "Todas las provincias")

#### Scenario: Clearing comunidad restores all provinces
- **WHEN** the user clears `sel-comunidad` (selects "Todas las comunidades")
- **THEN** `sel-province` is repopulated with all provinces from the loaded data

#### Scenario: Previously selected province preserved if still available
- **WHEN** the user has "Barcelona" selected in `sel-province` and selects "Cataluña" in `sel-comunidad`
- **THEN** `sel-province` remains set to "Barcelona"

#### Scenario: Previously selected province reset if no longer available
- **WHEN** the user has "Madrid" selected in `sel-province` and selects "Cataluña" in `sel-comunidad`
- **THEN** `sel-province` is reset to `""` (Todas las provincias)

### Requirement: Independent comunidad filter dimension
The `applyFilters` function SHALL filter rows by `COMUNIDAD_AUTONOMA` when a comunidad is selected, independently of the province filter.

A row passes the comunidad filter if no comunidad is selected OR the row's `COMUNIDAD_AUTONOMA` equals the selected value.

#### Scenario: Filtering by comunidad only
- **WHEN** "Andalucía" is selected in `sel-comunidad` and no province is selected
- **THEN** only rows with `COMUNIDAD_AUTONOMA === "Andalucía"` are included in the output

#### Scenario: Filtering by comunidad and provincia together
- **WHEN** "Andalucía" is selected in `sel-comunidad` and "Sevilla" is selected in `sel-province`
- **THEN** only rows with both `COMUNIDAD_AUTONOMA === "Andalucía"` AND `PROVINCIA_VEH === "Sevilla"` are included

### Requirement: Reset clears comunidad and province together
When the reset button is activated, `sel-comunidad` SHALL be reset to `""` and `sel-province` SHALL be repopulated with all provinces and reset to `""`.

#### Scenario: Reset restores both selects
- **WHEN** the user clicks "Limpiar filtros"
- **THEN** `sel-comunidad` is set to `""`
- **AND** `sel-province` is repopulated with all provinces and set to `""`
