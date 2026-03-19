## Context

`dgt-matriculaciones-moto/index.html` is a single-file vanilla HTML/CSS/JS dashboard (~862 lines). All logic is embedded. The data source is `/microdatos-etl/data/{year}/{month}/acumulado-marca-modelo-provincia.csv`, now with columns `MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV, COUNT`.

Currently the `.filters` flexbox contains year, month, brand, province, and cc range all in one row. Year/month trigger a CSV fetch; the rest filter client-side. There is no comunidad autónoma filter.

## Goals / Non-Goals

**Goals:**
- Visually separate the period selector (año/mes) from the data filters.
- Add a cascading CCAA → provincia filter.
- Fix CSV parsing to match the new column order (COMUNIDAD_AUTONOMA now between PROVINCIA_VEH and CILINDRADA_ITV).

**Non-Goals:**
- Adding a CCAA-level aggregate chart or table.
- Persisting filter state across page loads.
- Changes to the ETL or CSV format.

## Decisions

### Decision 1: Period selector as a separate bar above the filters

**Chosen:** A `<div class="period-selector">` sits above `.filters`, visually styled as a lighter/compact bar sharing the same border-radius language. Year and month selects remain identical in function but live in the new container.

**Rationale:** Year/month drive a network fetch (different action class than client-side filters). Separating them signals this to the user and avoids the "why doesn't resetting filters change the data?" confusion. A top bar is the established pattern for period selectors in analytics dashboards.

**Alternatives considered:**
- Inline badge/tab selector: more work, not justified for just two selects.
- Keep in filters but visually divide with a separator: less clear.

### Decision 2: Cascading CCAA → provincia via client-side map

**Chosen:** On data load, build a `Map<comunidad, Set<provincia>>` from `rawData`. When a CCAA is selected, repopulate the province select with only its provinces. When cleared, restore all provinces.

**Rationale:** The `COMUNIDAD_AUTONOMA` column is already in the CSV — no additional mapping needed. The cascade is pure DOM/state manipulation on already-loaded data, zero extra network calls.

**Alternatives considered:**
- Hardcode a CCAA→province map in JS: brittle, duplicates ETL logic.
- Derive from normalize.js at runtime: would require importing Node module into browser; not feasible in a no-build setup.

### Decision 3: CCAA filter inserted before Provincia in the DOM

**Chosen:** `sel-comunidad` `<select>` appears immediately before `sel-province` in the filter panel.

**Rationale:** Natural left-to-right hierarchy: narrow by community first, then province within it.

### Decision 4: `applyFilters` filters by both CCAA and provincia independently

**Chosen:** Both `comunidad` and `provincia` are independent filter dimensions. A row passes if `(no comunidad selected OR row.COMUNIDAD_AUTONOMA === comunidad) AND (no provincia selected OR row.PROVINCIA_VEH === provincia)`.

**Rationale:** Allows filtering by CCAA alone (without a specific province) or by province alone (without selecting a CCAA first). Cascading only affects what's visible in the province dropdown, not the filter logic itself.

## Risks / Trade-offs

- **CSV column index shift**: The old code parsed `CILINDRADA_ITV` from the column at position 3 (0-indexed). It's now at position 4. Must audit every positional access in `parseCSV` / row mapping. **Mitigation**: switch to header-name based parsing (already supported by `parseCSV` — verify).
- **Province dropdown flicker on CCAA change**: repopulating the province select while a province is selected may clear the selection. **Mitigation**: if the currently selected province still exists in the new list, preserve it; otherwise reset.
- **"Todas" option**: both CCAA and province selects must have a "Todas" first option that is selected by default and means "no filter".
