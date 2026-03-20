## Context

El dashboard (`dgt-matriculaciones-moto/index.html`) solo consume `acumulado-marca-modelo-provincia.csv`. Los ficheros `acumulado-marca.csv` y `acumulado-marca-modelo.csv` son generados por el ETL pero nunca leídos por ningún consumidor. Esto genera escritura innecesaria de archivos y两份 de lógica de agregación.

## Goals / Non-Goals

**Goals:**
- Eliminar la escritura de `acumulado-marca.csv` y `acumulado-marca-modelo.csv` en `writeAggregates()`
- Eliminar las funciones helper `monthlyPath()` y `brandMonthlyPath()` de `lib/aggregate.js`
- Actualizar toda la documentación que referencia estos ficheros
- Eliminar los ficheros de datos existentes

**Non-Goals:**
- Cambios en el dashboard o en la lógica de agregación de provincia
- Creación de nuevos agregados
- Back-filling o modificación de datos existentes

## Decisions

### Decision 1: Eliminar bloques de escritura directamente, sin flags

**Elegido:** Eliminar los dos bloques de escritura de `writeAggregates()` directamente.

**Alternativas consideradas:** Añadir un flag `WRITE_UNUSED_CSVS=0` o similar — añade superficie de configuración sin beneficio ya que los ficheros no se consumen.

**Rationale:** Los ficheros no tienen ningún consumidor. Un commit atómico que elimine el código y los ficheros es lo más limpio y sin riesgos.

### Decision 2: Eliminar `monthlyPath()` y `brandMonthlyPath()` completamente

**Elegido:** Eliminar ambas funciones de `lib/aggregate.js`.

**Alternativas consideradas:** Dejarlas como helper privadas sin usar — código muerto que confunde a futuros desarrolladores.

**Rationale:** El alcance del proposal incluye eliminarlas explícitamente. Dejarlas es deuda técnica sin ventajas.

### Decision 3: Eliminar `monthlyPath` del destructuring en `download-microdatos-mensual.js`

**Elegido:** Eliminar `monthlyPath` del destructuring en la línea 43, mantener `monthDir` (todavía usado por `hasDailyData`/`hasMonthlyData`).

**Alternativas consideradas:** Reemplazar `monthlyPath` con `provinciaMonthlyPath` para el chequeo de idempotencia — funcionaría igualmente.

**Rationale:** Más simple eliminar `monthlyPath` completamente; `hasMonthlyData()` también puede eliminarse.

### Decision 4: Commit atómico para eliminación de datos

**Elegido:** El workflow ETL (`microdatos-etl.yml`) se ejecuta en schedule. Eliminar ficheros en un PR y desplegar cambios de código en otro arriesga que el ETL recree los ficheros eliminados entre commits.

**Alternativas consideradas:** Ejecutar el ETL manualmente después del PR, luego abrir un segundo PR solo para eliminación de datos.

**Rationale:** Un único PR atómico con código y datos es la aproximación más segura.

## Data Flow

```
DGT ZIP
  │
  ▼
download-microdatos.js / download-microdatos-mensual.js
  │
  ▼ (processTxt → Map<"MARCA\tMODELO\tPROVINCIA", aggregated>)
writeAggregates(year, month, data)
  │
  ▼ SOLO este fichero se escribe
acumulado-marca-modelo-provincia.csv
  │
  ▼ (fetch at runtime)
dgt-matriculaciones-moto/index.html  ← único consumidor
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `microdatos-etl/lib/aggregate.js` | Modify | Remove `monthlyPath()`, `brandMonthlyPath()`; remove write blocks for `acumulado-marca-modelo.csv` and `acumulado-marca.csv`; keep `provinciaMonthlyPath()` and its write block; update `module.exports` |
| `microdatos-etl/download-microdatos-mensual.js` | Modify | Remove `monthlyPath` from destructuring (line 43); remove `hasMonthlyData()` and its call; clean up header comment |
| `AGENTS.md` | Modify | Remove references to `acumulado-marca-modelo.csv` and `acumulado-marca.csv` from repo structure |
| `openspec/specs/microdatos-etl/spec.md` | Modify | Remove requirements/scenarios referencing the two deleted aggregate files |
| `openspec/config.yaml` | Modify | Remove the two files from the data sources list |
| `README.md` | Modify | Remove entries for the two deleted CSV files |
| `microdatos-etl/data/*/*/acumulado-marca.csv` | Delete | All existing instances (~15 files) |
| `microdatos-etl/data/*/*/acumulado-marca-modelo.csv` | Delete | All existing instances (~15 files) |

## Interfaces / Contracts

No new interfaces. The contract for the remaining aggregate file is unchanged:

```csv
MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT
```

`module.exports` of `lib/aggregate.js` changes from:
```js
{ writeAggregates, monthDir, monthlyPath, brandMonthlyPath, provinciaMonthlyPath }
```
to:
```js
{ writeAggregates, monthDir, provinciaMonthlyPath }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `writeAggregates()` only writes `provinciaMonthlyPath` | Run ETL locally; verify `data/YYYY/MM/` contains exactly 1 aggregate CSV |
| Integration | Full ETL run produces correct data | Compare output with previous run — `acumulado-marca-modelo-provincia.csv` should be byte-identical |
| E2E | Dashboard still renders correctly | Open dashboard in browser; verify charts and tables populate |

No automated test suite exists (per AGENTS.md). Manual verification required.

## Migration / Rollout

1. Open a single PR containing all changes (code + data deletion).
2. Merge PR to `main`.
3. The GitHub Actions ETL workflow will run against the updated code — it will no longer generate the deleted files.
4. No feature flag needed; this is a pure removal with no backwards compatibility concern.
5. Rollback: `git revert` regenerates all data on next ETL run.
