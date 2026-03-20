## Context

The ETL processes DGT microdata daily. In `filter.js`, `extractRowFields` reads `COD_PROVINCIA_VEH` (a 2-letter code like `"B"`, `"MA"`) and immediately calls `normalizeProvince(code)` to convert it to a human-readable name. This name is stored in the daily `DD.csv` files under `PROVINCIA_VEH`. Later, `recalculateMonthly` reads those daily files and aggregates into `acumulado-marca-modelo-provincia.csv`.

The autonomous community must be derived from the same province code, at the same point in the pipeline — before the code is discarded.

## Goals / Non-Goals

**Goals:**
- Add `PROVINCIA_TO_COMUNIDAD` map and `normalizeComunidad(code)` to `normalize.js`, keyed by province code (parallel to `PROVINCE_MAP`).
- Add `COMUNIDAD_AUTONOMA` column to daily `DD.csv` files (derived at extraction time from `COD_PROVINCIA_VEH`).
- Add `COMUNIDAD_AUTONOMA` column to `acumulado-marca-modelo-provincia.csv`.

**Non-Goals:**
- Back-filling existing daily CSVs or aggregate files.
- Adding community-level standalone aggregate files.
- Changes to the `dgt-matriculaciones-moto/` frontend.

## Decisions

### Decision 1: Key by province code, not normalized name

**Chosen:** `PROVINCIA_TO_COMUNIDAD` uses the same 2-letter codes as `PROVINCE_MAP` (e.g., `"B"` → ``"Cataluña"`).

**Rationale:** The province code is available in `filter.js` when processing raw data, before normalization discards it. Keying by code keeps `PROVINCIA_TO_COMUNIDAD` parallel and consistent with `PROVINCE_MAP`, and `normalizeComunidad` becomes a direct analogue of `normalizeProvince`. Keying by normalized name would require a reverse lookup or a second pass.

**Alternatives considered:**
- Keying by normalized province name: requires looking up code from name (reverse `PROVINCE_MAP`) in aggregate.js — more coupling, two levels of indirection.

### Decision 2: Compute comunidad in `filter.js` alongside province

**Chosen:** `extractRowFields` calls both `normalizeProvince(code)` and `normalizeComunidad(code)` on the same `COD_PROVINCIA_VEH` code, returning both `provincia` and `comunidad`.

**Rationale:** This is the only point in the pipeline where the raw province code is available. Computing here avoids introducing a reverse-lookup step downstream and keeps normalization co-located.

### Decision 3: Add `COMUNIDAD_AUTONOMA` to daily CSV files

**Chosen:** Column order in daily files: `FEC_MATRICULA, COD_CLASE_MAT, FEC_TRAMITACION, MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV`.

**Rationale:** Persisting the community in daily files means `recalculateMonthly` can read it without re-implementing the lookup logic. Avoids coupling `aggregate.js` to `normalize.js`.

### Decision 4: Column order in province aggregate

**Chosen:** `MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV, COUNT`.

**Rationale:** Geographic columns grouped together; `COMUNIDAD_AUTONOMA` is semantically derived from `PROVINCIA_VEH` so adjacency is natural.

## Risks / Trade-offs

- **Daily CSV schema change** → Positional parsers of `DD.csv` files will break. Mitigation: the only known consumer is `recalculateMonthly` itself, which uses named column indices — verify and update.
- **Province aggregate schema change** → Same concern for `acumulado-marca-modelo-provincia.csv`. Mitigation: frontend uses named column parsing.
- **Mapping completeness** → If DGT introduces a new province code not in `PROVINCIA_TO_COMUNIDAD`, `normalizeComunidad` returns the code unchanged and emits a `console.warn`. Same fallback pattern as `normalizeProvince`.
- **Existing data files** → Daily and aggregate CSVs already committed lack the new column. Mitigation: re-run the ETL for past months to regenerate; document this.
