## 1. HTML structure

- [x] 1.1 Add a `<div class="period-selector">` container above `.filters` in `dgt-matriculaciones-moto/index.html`, containing the existing year and month `filter-group` divs
- [x] 1.2 Remove `sel-year` and `sel-month` `filter-group` divs from inside `.filters`
- [x] 1.3 Add a `<div class="filter-group">` for `sel-comunidad` (label "Comunidad" + `<select id="sel-comunidad">`) immediately before the `sel-province` filter-group inside `.filters`

## 2. CSS styling

- [x] 2.1 Add `.period-selector` styles: visually distinct from `.filters` (e.g. lighter background, smaller padding, inline with the page title or above the filters card)
- [x] 2.2 Ensure `.filters` layout still looks correct without the year/month groups (flex-wrap handles remaining items)

## 3. CSV parsing fix

- [x] 3.1 Verify `parseCSV()` in `index.html` uses header-name based field access (not numeric index) — update any positional access to use header names so that the new column order (`MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV, COUNT`) is handled correctly

## 4. CCAA filter logic

- [x] 4.1 In `populateDropdowns()`, build a `Map<comunidad, Set<provincia>>` from `rawData` (call it `comunidadProvinciaMap`) and store it in module scope
- [x] 4.2 Populate `sel-comunidad` with sorted unique CCAA values from `rawData`, with "Todas las comunidades" as the first option
- [x] 4.3 Implement `repopulateProvinces(selectedComunidad)`: if `selectedComunidad` is `""`, show all provinces; otherwise show only provinces in that comunidad. Preserve the current province selection if still valid, otherwise reset to `""`
- [x] 4.4 Add `sel-comunidad` change event listener that calls `repopulateProvinces(selComunidad.value)` then `applyFiltersAndRender()`
- [x] 4.5 Extend `getFilters()` to return `comunidad: selComunidad.value`
- [x] 4.6 Extend `applyFilters()` to filter rows by `COMUNIDAD_AUTONOMA` when `comunidad` is set

## 5. Reset button

- [x] 5.1 Update the reset button handler to also reset `sel-comunidad` to `""` and call `repopulateProvinces("")` before re-rendering

## 6. Verification

- [x] 6.1 Load the page, confirm period selector appears above the filters card and year/month are gone from the filters row
- [x] 6.2 Select a comunidad and confirm the province dropdown narrows correctly
- [x] 6.3 Select a comunidad + province and confirm the table/chart updates correctly
- [x] 6.4 Click reset and confirm both CCAA and province selects are cleared
- [x] 6.5 Confirm `CILINDRADA_ITV` values are still parsed correctly (not shifted by the new column)
